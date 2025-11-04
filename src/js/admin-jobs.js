import { db } from "./firebaseClient.js";
import { requireAdmin, wireSignOut, pruneNullish } from "./admin-common.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, getDocs, getDoc,
  serverTimestamp
} from "firebase/firestore";

const $ = (id) => document.getElementById(id);

async function loadJobs() {
  const list = $("jobsList");
  list.textContent = "Loading…";

  const q = query(collection(db, "jobs"), orderBy("posted_at", "desc"));
  const snap = await getDocs(q);
  if (snap.empty) { list.textContent = "No jobs yet."; return; }

  list.innerHTML = snap.docs.map(d => {
    const j = d.data();
    const id = d.id;
    const meta = [j.company, j.type, j.location, j.remote ? "Remote" : ""].filter(Boolean).join(" • ");
    return `
      <div class="card">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div class="font-semibold text-brand-navy">${j.title || "(Untitled)"} </div>
            <div class="text-sm meta">${meta}</div>
            ${j.description ? `<div class="text-sm mt-1">${j.description}</div>` : ""}
          </div>
          <div class="flex items-center gap-2">
            <button class="btn-outline" data-action="edit" data-id="${id}">Edit</button>
            <button class="btn-outline" data-action="delete" data-id="${id}">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("button[data-action]").forEach(btn => {
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");

    if (action === "delete") {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this job?")) return;
        await deleteDoc(doc(db, "jobs", id));
        loadJobs();
      });
    }

    if (action === "edit") {
      btn.addEventListener("click", async () => {
        const ref = doc(db, "jobs", id);
        const snap = await getDoc(ref);
        setEdit({ id, j: snap.data() });
      });
    }
  });
}

function setEdit(state) {
  const formTitle = $("formTitle");
  const resetBtn  = $("resetFormBtn");
  const saveBtn   = $("saveBtn");
  const form      = $("jobForm");

  if (!state) {
    $("job_id").value = "";
    formTitle.textContent = "Add job";
    resetBtn?.classList.add("hidden");
    saveBtn.textContent = "Save job";
    form.reset();
    return;
  }
  const { id, j } = state;
  $("job_id").value = id;
  formTitle.textContent = "Edit job";
  resetBtn?.classList.remove("hidden");
  saveBtn.textContent = "Update job";

  $("title").value = j.title || "";
  $("company").value = j.company || "";
  $("location").value = j.location || "";
  $("type").value = j.type || "Internship";
  $("remote").checked = !!j.remote;
  $("apply_url").value = j.apply_url || j.applyUrl || "";
  $("description").value = j.description || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function main() {
  await requireAdmin("/admin-jobs.html");
  wireSignOut();

  const form = $("jobForm");
  const msg  = $("jobMsg");
  const resetFormBtn = $("resetFormBtn");

  resetFormBtn?.addEventListener("click", () => setEdit(null));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Saving…";

    const id = $("job_id").value || null;
    const base = pruneNullish({
      title: $("title").value.trim(),
      company: $("company").value.trim(),
      location: $("location").value.trim(),
      type: $("type").value,
      remote: $("remote").checked,
      description: $("description").value.trim(),
      apply_url: $("apply_url").value.trim(),
      posted_at: serverTimestamp(),
    });

    if (!base.title || !base.location || !base.type || !base.apply_url) {
      msg.textContent = "Title, type, location and Apply URL are required.";
      return;
    }

    const payload = { ...base, applyUrl: base.apply_url, postedAt: base.posted_at };

    try {
      if (!id) {
        await addDoc(collection(db, "jobs"), payload);
      } else {
        await updateDoc(doc(db, "jobs", id), payload);
      }
      msg.textContent = "Saved.";
      setTimeout(() => (msg.textContent = ""), 1200);
      form.reset();
      setEdit(null);
      loadJobs();
    } catch (err) {
      console.error(err);
      msg.textContent = err.message || "Failed to save";
    }
  });

  $("admin-ui").classList.remove("hidden");
  loadJobs();
}

document.addEventListener("DOMContentLoaded", main);
