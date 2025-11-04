import { db } from "./firebaseClient.js";
import { requireAdmin, wireSignOut, pruneNullish } from "./admin-common.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, orderBy, getDocs, getDoc
} from "firebase/firestore";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "firebase/storage";

const $ = (id) => document.getElementById(id);
const storage = getStorage();

/** ---------- Rendering ---------- */
async function loadNews() {
  const list = $("newsList");
  list.textContent = "Loading…";

  const q = query(collection(db, "news"), orderBy("date", "desc"));
  const snap = await getDocs(q);
  if (snap.empty) { list.textContent = "No news articles yet."; return; }

  list.innerHTML = snap.docs.map(d => {
    const n = d.data();
    const id = d.id;
    const dateLabel = n.date ? new Date(n.date).toLocaleDateString() : "";
    const img = n.imageUrl ? `<img src="${n.imageUrl}" class="h-16 w-24 object-cover rounded-lg border" alt="">` : "";

    return `
      <div class="card">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div class="flex items-start gap-3">
            ${img}
            <div>
              <div class="font-semibold text-brand-navy">${n.header || "(Untitled article)"}</div>
              <div class="text-sm text-ash-500">${dateLabel}</div>
              ${n.text ? `<div class="text-sm mt-1 line-clamp-2">${escapeHtml(n.text)}</div>` : ""}
            </div>
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
        if (!confirm("Delete this article?")) return;
        await deleteDoc(doc(db, "news", id));
        loadNews();
      });
    }

    if (action === "edit") {
      btn.addEventListener("click", async () => {
        const refDoc = doc(db, "news", id);
        const snap = await getDoc(refDoc);
        setEdit({ id, n: snap.data() });
      });
    }
  });
}

/** ---------- Form state ---------- */
function setEdit(state) {
  const formTitle = $("formTitle");
  const resetBtn  = $("resetFormBtn");
  const saveBtn   = $("saveBtn");
  const form      = $("newsForm");

  if (!state) {
    $("news_id").value = "";
    formTitle.textContent = "Add article";
    resetBtn?.classList.add("hidden");
    saveBtn.textContent = "Save article";
    form.reset();
    hidePreview();
    return;
  }

  const { id, n } = state;
  $("news_id").value = id;
  formTitle.textContent = "Edit article";
  resetBtn?.classList.remove("hidden");
  saveBtn.textContent = "Update article";

  $("header").value = n.header || "";
  $("text").value = n.text || "";
  $("date").value = n.date || "";

  if (n.imageUrl) showPreview(n.imageUrl); else hidePreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** ---------- Main ---------- */
async function main() {
  await requireAdmin("/admin-news.html");
  wireSignOut();

  const form = $("newsForm");
  const msg  = $("newsMsg");
  const resetFormBtn = $("resetFormBtn");
  const photoInput = $("photo");

  // Image preview on choose
  photoInput.addEventListener("change", () => {
    const f = photoInput.files?.[0];
    if (f) showPreview(URL.createObjectURL(f)); else hidePreview();
  });

  resetFormBtn?.addEventListener("click", () => setEdit(null));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Saving…";

    const id = $("news_id").value || null;

    // Required fields
    const base = pruneNullish({
      header: $("header").value.trim(),
      text: $("text").value.trim(),
      date: $("date").value.trim(), // YYYY-MM-DD
    });

    if (!base.header || !base.text || !base.date) {
      msg.textContent = "Header, text, and date are required.";
      return;
    }

    // Optional image upload
    const file = $("photo").files[0];
    let imageUrl = "";

    try {
      if (file) {
        const fileRef = ref(storage, `news/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        imageUrl = await getDownloadURL(fileRef);
      }

      // Build payload (keep old image on edit if none uploaded)
      const payload = { ...base };
      if (id) {
        if (imageUrl) {
          payload.imageUrl = imageUrl;
        } else {
          const oldSnap = await getDoc(doc(db, "news", id));
          payload.imageUrl = (oldSnap.exists() && oldSnap.data().imageUrl) || "";
        }
        await updateDoc(doc(db, "news", id), payload);
      } else {
        if (imageUrl) payload.imageUrl = imageUrl;
        await addDoc(collection(db, "news"), payload);
      }

      msg.textContent = "Saved.";
      setTimeout(() => (msg.textContent = ""), 1200);
      form.reset();
      setEdit(null);
      loadNews();
    } catch (err) {
      console.error(err);
      msg.textContent = err.message || "Failed to save.";
    }
  });

  $("admin-ui").classList.remove("hidden");
  loadNews();
}

document.addEventListener("DOMContentLoaded", main);

/** ---------- Utils ---------- */
function showPreview(src) {
  const wrap = $("photoPreviewWrap");
  const img = $("photoPreview");
  img.src = src;
  wrap.classList.remove("hidden");
}
function hidePreview() {
  const wrap = $("photoPreviewWrap");
  const img = $("photoPreview");
  img.src = "";
  wrap.classList.add("hidden");
}
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
