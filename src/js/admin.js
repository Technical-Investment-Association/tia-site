// src/js/admin.js
import { db, auth } from "./firebaseClient.js";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const ADMIN_UID = "c5xbzFiAW5Ok5POmZqKLgd5nv4w1";

// DOM
const gate = document.getElementById("gate");
const adminUI = document.getElementById("admin-ui");
const userInfo = document.getElementById("user-info");
const signoutBtn = document.getElementById("signout-btn");

const eventForm = document.getElementById("event-form");
const eventMsg = document.getElementById("event-msg");

const jobForm = document.getElementById("job-form");
const jobMsg = document.getElementById("job-msg");

// Gate
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.assign(`/login.html?next=${encodeURIComponent("/admin.html")}`);
    return;
  }
  if (user.uid !== ADMIN_UID) {
    gate.innerHTML = `<p class="text-red-700">Access denied. You are signed in, but not an admin.</p>
      <a class="underline" href="/login.html">Switch account</a>`;
    return;
  }
  gate.classList.add("hidden");
  adminUI.classList.remove("hidden");
  userInfo.textContent = `${user.email || "Admin"} • ${user.uid}`;
});

signoutBtn?.addEventListener("click", () => signOut(auth));

// Helpers
function toTimestampLocal(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : Timestamp.fromMillis(ms);
}

function pruneNullish(obj) {
  Object.keys(obj).forEach((k) => {
    if (obj[k] === null || obj[k] === undefined || obj[k] === "") {
      delete obj[k];
    }
  });
  return obj;
}

// Create Event
eventForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  eventMsg.textContent = "Saving…";

  const data = new FormData(eventForm);
  const payload = {
    title: data.get("title")?.toString().trim(),
    starts_at: toTimestampLocal(data.get("starts_at")),
    published: data.get("published") === "on",

    // Optionals: include only if non-empty; pruneNullish will remove empty ones
    ends_at: toTimestampLocal(data.get("ends_at")),
    date_only: data.get("date_only")?.toString().trim(),
    start_time: data.get("start_time")?.toString().trim(),
    end_time: data.get("end_time")?.toString().trim(),
    location: data.get("location")?.toString().trim(),
    description: data.get("description")?.toString().trim(),
    apply_url: data.get("apply_url")?.toString().trim(),
    company: data.get("company")?.toString().trim(),
    reg_status: data.get("reg_status")?.toString(),
    reg_start_at: toTimestampLocal(data.get("reg_start_at")),
    reg_end_at: toTimestampLocal(data.get("reg_end_at")),
    image_url: data.get("image_url")?.toString().trim(),

    created_at: serverTimestamp(),
  };

  pruneNullish(payload);

  // Minimal validation (must match rules)
  if (!payload.title || !(payload.starts_at instanceof Timestamp) || typeof payload.published !== "boolean") {
    eventMsg.textContent = "Title, valid Starts at, and Published are required.";
    return;
  }

  try {
    await addDoc(collection(db, "events"), payload);
    eventMsg.textContent = "Event created";
    eventForm.reset();
  } catch (err) {
    console.error(err);
    eventMsg.textContent = `${err.message || "Failed to create event"}`;
  }
});

// Create Job
jobForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  jobMsg.textContent = "Saving…";

  const data = new FormData(jobForm);
  const base = {
    title: data.get("title")?.toString().trim(),
    company: (data.get("company") || "").toString().trim() || null,
    location: data.get("location")?.toString().trim(),
    type: data.get("type")?.toString(),
    remote: data.get("remote") === "on",
    description: (data.get("description") || "").toString().trim() || null,
    apply_url: data.get("apply_url")?.toString().trim(),
    posted_at: serverTimestamp(),
  };

  // Required per rules
  if (!base.title || !base.location || !base.type || !base.apply_url) {
    jobMsg.textContent = "Title, type, location and Apply URL are required.";
    return;
  }

  const payload = { ...base, applyUrl: base.apply_url, postedAt: base.posted_at };

  try {
    await addDoc(collection(db, "jobs"), payload);
    jobMsg.textContent = "Job created";
    jobForm.reset();
  } catch (err) {
    console.error(err);
    jobMsg.textContent = `${err.message || "Failed to create job"}`;
  }
});
