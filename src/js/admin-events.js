import { db } from "./firebaseClient.js";
import { requireAdmin, wireSignOut, pruneNullish } from "./admin-common.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, getDocs, getDoc,
  serverTimestamp, Timestamp
} from "firebase/firestore";

const $  = (id) => document.getElementById(id);
const toLocalInputValue = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : (typeof ts === "string" ? new Date(ts) : ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const toTs = (value) => {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : Timestamp.fromMillis(ms);
};

async function loadEvents() {
  const list = $("eventsList");
  list.textContent = "Loading…";
  const q = query(collection(db, "events"), orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  if (snap.empty) { list.textContent = "No events yet."; return; }

  list.innerHTML = snap.docs.map(d => {
    const ev = d.data();
    const id = d.id;
    const when = ev.starts_at?.toDate ? ev.starts_at.toDate().toLocaleString() : "";
    const pub = !!ev.published;

    return `
      <div class="card">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div class="font-semibold text-brand-navy">${ev.title || "(Untitled)"}</div>
            <div class="text-sm meta">${[ev.company, ev.location].filter(Boolean).join(" • ")}${when ? (ev.company||ev.location ? " • " : "") + when : ""}</div>
            ${ev.description ? `<div class="text-sm mt-1">${ev.description}</div>` : ""}
            <div class="text-sm mt-1 ${pub ? "text-green-700" : "text-ash-500"}">
              ${pub ? "Published" : "Draft"}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn-outline" data-action="toggle" data-id="${id}">
              ${pub ? "Unpublish" : "Publish"}
            </button>
            <button class="btn-outline" data-action="edit" data-id="${id}">Edit</button>
            <button class="btn-outline" data-action="delete" data-id="${id}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // actions
  list.querySelectorAll("button[data-action]").forEach(btn => {
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");

    if (action === "toggle") {
      btn.addEventListener("click", async () => {
        const ref = doc(db, "events", id);
        const snap = await getDoc(ref);
        const current = !!snap.data()?.published;
        await updateDoc(ref, { published: !current });
        loadEvents();
      });
    }

    if (action === "delete") {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this event?")) return;
        await deleteDoc(doc(db, "events", id));
        loadEvents();
      });
    }

    if (action === "edit") {
      btn.addEventListener("click", async () => {
        const ref = doc(db, "events", id);
        const snap = await getDoc(ref);
        setEdit({ id, ev: snap.data() });
      });
    }
  });
}

function setEdit(state) {
  const formTitle = $("formTitle");
  const resetBtn  = $("resetFormBtn");
  const saveBtn   = $("saveBtn");
  const form      = $("eventForm");

  if (!state) {
    $("ev_id").value = "";
    formTitle.textContent = "Add event";
    resetBtn.classList.add("hidden");
    saveBtn.textContent = "Save event";
    form.reset();
    return;
  }
  const { id, ev } = state;
  $("ev_id").value = id;
  formTitle.textContent = "Edit event";
  resetBtn.classList.remove("hidden");
  saveBtn.textContent = "Update event";

  $("title").value = ev.title || "";
  $("company").value = ev.company || "";
  $("location").value = ev.location || "";
  $("apply_url").value = ev.apply_url || "";
  $("starts_at").value = toLocalInputValue(ev.starts_at);
  $("ends_at").value   = toLocalInputValue(ev.ends_at);
  $("description").value = ev.description || "";
  $("image_url").value = ev.image_url || "";
  $("published").checked = !!ev.published;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function main() {
  await requireAdmin("/admin-events.html");
  wireSignOut();

  const form = $("eventForm");
  const msg  = $("eventMsg");
  const resetFormBtn = $("resetFormBtn");

  resetFormBtn.addEventListener("click", () => setEdit(null));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Saving…";

    const id = $("ev_id").value || null;
    const payload = pruneNullish({
      title: $("title").value.trim(),
      company: $("company").value.trim(),
      location: $("location").value.trim(),
      apply_url: $("apply_url").value.trim(),
      starts_at: toTs($("starts_at").value),
      ends_at: toTs($("ends_at").value),
      description: $("description").value.trim(),
      image_url: $("image_url").value.trim(),
      published: $("published").checked,
    });

    if (!payload.title || !(payload.starts_at instanceof Timestamp)) {
      msg.textContent = "Title and valid Starts at are required.";
      return;
    }

    try {
      if (!id) {
        await addDoc(collection(db, "events"), { ...payload, created_at: serverTimestamp() });
      } else {
        await updateDoc(doc(db, "events", id), payload);
      }
      msg.textContent = "Saved.";
      setTimeout(() => (msg.textContent = ""), 1200);
      form.reset();
      setEdit(null);
      loadEvents();
    } catch (err) {
      console.error(err);
      msg.textContent = err.message || "Failed to save";
    }
  });

  $("admin-ui").classList.remove("hidden");
  loadEvents();
}

document.addEventListener("DOMContentLoaded", main);
