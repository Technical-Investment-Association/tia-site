// src/js/career.js
import { db } from "./firebaseClient.js";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "firebase/firestore";

/**
 * DOM
 */
const strip = document.getElementById("jobs-strip");

// Simple skeletons while loading (reuse your card class)
function showSkeletons(count = 4) {
  if (!strip) return;
  strip.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const sk = document.createElement("article");
    sk.className = "card min-w-[260px] animate-pulse";
    sk.innerHTML = `
      <div class="h-5 w-2/3 bg-ash-100 rounded"></div>
      <div class="mt-2 h-4 w-1/2 bg-ash-100 rounded"></div>
      <div class="mt-4 h-4 w-28 bg-ash-100 rounded"></div>
    `;
    strip.appendChild(sk);
  }
}

function showEmpty() {
  if (!strip) return;
  strip.innerHTML = `
    <article class="card min-w-[260px]">
      <h3 class="font-semibold text-brand-navy">No open positions</h3>
      <p class="text-sm text-ash-500">Check back soon or follow our channels.</p>
    </article>
  `;
}

function showError(message = "Failed to load jobs.") {
  if (!strip) return;
  strip.innerHTML = `
    <article class="card min-w-[260px]">
      <h3 class="font-semibold text-brand-navy">Error</h3>
      <p class="text-sm text-ash-500">${message}</p>
    </article>
  `;
}

function jobCard(job) {
  const title = job.title ?? "Untitled role";
  const location = job.location ?? "—";
  const type = job.type ?? "—";
  const applyUrl = job.applyUrl ?? "#";

  const article = document.createElement("article");
  article.className = "card min-w-[260px]";

  // Optional: top row for company/tag badges if you want later
  const companyLine = job.company ? `<span class="sr-only">Company</span>` : "";

  article.innerHTML = `
    ${companyLine}
    <h3 class="font-semibold text-brand-navy">${title}</h3>
    <p class="text-sm text-ash-500">${location} · ${type}</p>
    <a class="mt-3 inline-flex text-brand-navy hover:text-nav-brown font-medium"
       href="${applyUrl}" target="_blank" rel="noopener">
      View & apply →
    </a>
  `;

  return article;
}

async function loadJobs() {
  try {
    showSkeletons();

    const base = collection(db, "jobs");
    // Grab most recent 20; adjust as you wish
    const q = query(base, orderBy("postedAt", "desc"), limit(20));
    const snap = await getDocs(q);

    if (snap.empty) {
      showEmpty();
      return;
    }

    // Render
    strip.innerHTML = "";
    snap.docs.forEach((doc) => {
      const data = doc.data();
      strip.appendChild(jobCard(data));
    });
  } catch (err) {
    console.error(err);
    showError(err?.message);
  }
}

// Kick off when DOM is ready; defer+module already helps, but just in case
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadJobs);
} else {
  loadJobs();
}
