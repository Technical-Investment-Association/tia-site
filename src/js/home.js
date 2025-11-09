import { db } from "./firebaseClient.js";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

/* ---------- Helpers ---------- */
const toDate = (v) => (v && v.toDate) ? v.toDate() : (v ? new Date(v) : null);
const fmtShortDayMonth = (v) => {
  const d = toDate(v);
  return d ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(d) : "";
};
const fmtFullDate = (v) => {
  const d = toDate(v);
  return d ? new Intl.DateTimeFormat(undefined, { year:"numeric", month:"long", day:"numeric" }).format(d) : "";
};
const escapeHtml = (s = "") => String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

/* ---------- DOM ---------- */
const eventsStatus = document.getElementById("homeEventsStatus");
const track        = document.getElementById("cardTrack");
const btnPrev      = document.getElementById("btnPrev");
const btnNext      = document.getElementById("btnNext");

const newsList   = document.getElementById("newsList");
const newsStatus = document.getElementById("newsStatus");

const jobTrack   = document.getElementById("jobTrack");
const jobsStatus = document.getElementById("jobsStatus");
const jobPrev    = document.getElementById("jobPrev");
const jobNext    = document.getElementById("jobNext");

/* ----- Responsive helpers for EVENTS ----- */
const isDesktop = () => window.matchMedia("(min-width: 768px)").matches; // Tailwind md breakpoint
let visibleCount = isDesktop() ? 3 : 1;

function updateVisibleCountAndRerender() {
  const next = isDesktop() ? 3 : 1;
  if (next !== visibleCount) {
    visibleCount = next;
    renderEvents(); // re-render with new window size
  }
}

// simple debounce so we don't spam renders while resizing
let _rz;
window.addEventListener("resize", () => {
  clearTimeout(_rz);
  _rz = setTimeout(updateVisibleCountAndRerender, 120);
});


/* =========================================
   EVENTS — windowed carousel over ALL items
   ========================================= */
let events = [];
let evIndex = 0;

function eventCard(ev) {
  const title   = ev.title || "Untitled event";
  const company = ev.company || "";
  const dateStr = fmtShortDayMonth(ev.starts_at);
  const loc     = ev.location ? ` · ${ev.location}` : "";
  const description = ev.description?.trim() || "";
  const image   = ev.image_url
    ? `<img src="${ev.image_url}" alt="Poster for ${escapeHtml(title)}" loading="lazy" width="640" height="360" class="aspect-[16/9] w-full object-cover rounded-xl"/>`
    : `<div class="aspect-[16/9] rounded-xl bg-surface-2"></div>`;

  return `
    <div class="w-full max-w-full md:max-w-md">
      <article class="card card-hover flex flex-col">
        ${image}
        <div class="mt-4 flex-1 flex flex-col">
          <h3 class="font-semibold text-brand-navy h-6 overflow-hidden text-ellipsis whitespace-nowrap">
            ${escapeHtml(title)}
          </h3>
          <p class="text-sm text-ash-600 h-5 overflow-hidden text-ellipsis whitespace-nowrap">
            ${escapeHtml(company)}
          </p>
          <p class="mt-1 text-sm meta h-5 overflow-hidden text-ellipsis whitespace-nowrap">
            ${escapeHtml(dateStr + loc)}
          </p>
          <div class="mt-4 pt-2 border-t">
            <button class="toggle-description-btn text-brand-navy hover:text-nav-brown font-medium">
              More <span aria-hidden="true">→</span>
            </button>
            <div class="event-description hidden mt-2 text-sm text-ash-700">${description}</div>
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderEvents() {
  if (!events.length) {
    track.innerHTML = `<div class="text-sm text-ash-500 py-6">No upcoming events yet. Check back soon.</div>`;
    btnPrev.disabled = btnNext.disabled = true;
    return;
  }
  btnPrev.disabled = btnNext.disabled = (events.length < 2);

  const count = Math.min(visibleCount, events.length);
  const idxs = Array.from({ length: count }, (_, i) => (evIndex + i) % events.length);
  track.innerHTML = idxs.map(i => eventCard(events[i])).join("");

  // expand/collapse handlers (unchanged)
  document.querySelectorAll(".toggle-description-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const allDescriptions = document.querySelectorAll(".event-description");
      const allButtons = document.querySelectorAll(".toggle-description-btn");
      const desc = btn.nextElementSibling;
      const isOpening = desc.classList.contains("hidden");
      allDescriptions.forEach((d) => d.classList.add("hidden"));
      allButtons.forEach((b) => { b.innerHTML = 'More <span aria-hidden="true">→</span>'; });
      if (isOpening) {
        desc.classList.remove("hidden");
        btn.innerHTML = 'Less <span aria-hidden="true">↑</span>';
      }
    });
  });
}


async function loadEvents() {
  eventsStatus.textContent = "Loading…";
  try {
    const q = query(
      collection(db, "events"),
      where("published", "==", true),
      orderBy("starts_at", "asc"),
      limit(50)
    );
    const snap = await getDocs(q);
    const now = new Date();
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Only upcoming
    events = docs.filter(ev => {
      const s = toDate(ev.starts_at);
      return s && s >= now;
    });
    evIndex = 0;
    renderEvents();
    eventsStatus.textContent = "";
  } catch (err) {
    console.error(err);
    eventsStatus.textContent = `Couldn't load events: ${err.message}`;
  }
}

btnPrev?.addEventListener("click", () => {
  if (!events.length) return;
  evIndex = (evIndex - 1 + events.length) % events.length;
  renderEvents();
});
btnNext?.addEventListener("click", () => {
  if (!events.length) return;
  evIndex = (evIndex + 1) % events.length;
  renderEvents();
});

/* =========================
   NEWS — latest 3, no images
   ========================= */
async function loadNews() {
  newsStatus.textContent = "Loading…";
  try {
    // Expect: header (string), text (string), date (YYYY-MM-DD string), optional imageUrl
    const q = query(collection(db, "news"), orderBy("date", "desc"), limit(3));
    const snap = await getDocs(q);
    const arts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!arts.length) {
      newsList.innerHTML = `
        <div class="py-2 text-sm text-ash-500">No news yet. Check back soon.</div>
      `;
      newsStatus.textContent = "";
      return;
    }

    newsList.innerHTML = arts.map((a) => {
      const when  = a.date ? fmtFullDate(a.date) : "";
      const title = a.header || "Untitled";
      const href  = `./news-article.html?id=${a.id}`;

      return `
        <article class="py-6">
          <div class="text-xs text-ash-500 h-4 overflow-hidden text-ellipsis whitespace-nowrap">
            ${escapeHtml(when)}
          </div>
          <h3 class="mt-1 font-semibold text-brand-navy h-7 overflow-hidden text-ellipsis whitespace-nowrap">
            ${escapeHtml(title)}
          </h3>
          ${
            a.text
              ? `<p class="mt-2 text-sm text-ash-700">
                   ${escapeHtml(a.text)}
                 </p>`
              : ``
          }
          <div class="mt-3">
            <a href="${href}" class="inline-flex items-center gap-1 text-brand-navy hover:text-nav-brown font-medium">
              Read more →
            </a>
          </div>
        </article>
      `;
    }).join("");

    newsStatus.textContent = "";
  } catch (err) {
    console.error(err);
    newsStatus.textContent = `Couldn't load news: ${err.message}`;
  }
}


/* =========================================
   JOBS — 3-up window scrolling over ALL
   ========================================= */
let jobs = [];
let jx = 0;

function jobCard(j) {
  const title   = j.title || "Role";
  const company = j.company || "";
  const posted  = j.posted_at ? fmtFullDate(j.posted_at) : "";
  const meta    = `${j.location ? `${j.location} · ` : ""}${j.type || ""}` +
                  `${(j.location || j.type) ? " · " : ""}${posted ? `Posted ${posted}` : ""}`;
  const logo = j.logo_url
    ? `<img src="${j.logo_url}" alt="" loading="lazy" width="40" height="40" class="h-10 w-10 rounded bg-white object-cover ring-1 ring-black/5"/>`
    : `<div class="h-10 w-10 rounded bg-surface-2 ring-1 ring-black/5"></div>`;
  const applyHref = j.apply_url || `./job.html?id=${j.id}`;

  return `
    <div class="min-w-[260px] max-w-sm flex-1">
      <article class="card card-hover h-full flex flex-col">
        <div class="flex items-center gap-3">
          ${logo}
          <div class="min-w-0">
            <h3 class="font-semibold text-brand-navy truncate h-6">${escapeHtml(title)}</h3>
            <p class="text-sm text-ash-600 truncate h-5">${escapeHtml(company)}</p>
          </div>
        </div>
        <p class="mt-2 text-sm meta h-5 overflow-hidden text-ellipsis whitespace-nowrap">
          ${escapeHtml(meta)}
        </p>
        <div class="mt-4 pt-2 border-t h-10 flex items-center" style="border-color: var(--line);">
          <a href="${applyHref}" class="inline-flex items-center gap-1 text-brand-navy hover:text-nav-brown font-medium">View & apply →</a>
        </div>
      </article>
    </div>
  `;
}

function renderJobs() {
  if (!jobs.length) {
    jobTrack.innerHTML = `<div class="text-sm text-ash-500 py-6">No positions right now.</div>`;
    jobPrev.disabled = jobNext.disabled = true;
    return;
  }
  jobPrev.disabled = jobNext.disabled = (jobs.length < 2);

  const count = Math.min(3, jobs.length);
  const idxs = Array.from({ length: count }, (_, i) => (jx + i) % jobs.length);
  jobTrack.innerHTML = idxs.map(i => jobCard(jobs[i])).join("");
}

async function loadJobs() {
  jobsStatus.textContent = "Loading…";
  try {
    const q = query(collection(db, "jobs"), orderBy("posted_at", "desc"), limit(24));
    const snap = await getDocs(q);
    jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    jx = 0;
    renderJobs();
    jobsStatus.textContent = "";
  } catch (err) {
    console.error(err);
    jobsStatus.textContent = `Couldn't load jobs: ${err.message}`;
  }
}

jobPrev?.addEventListener("click", () => { if (!jobs.length) return; jx = (jx - 1 + jobs.length) % jobs.length; renderJobs(); });
jobNext?.addEventListener("click", () => { if (!jobs.length) return; jx = (jx + 1) % jobs.length; renderJobs(); });

/* ---------- Init ---------- */
window.addEventListener("DOMContentLoaded", () => {
  loadEvents();
  loadNews();
  loadJobs();
});
