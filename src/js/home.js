import { db } from "./firebaseClient.js";
import {
  collection, query, where, orderBy, limit, getDocs
} from "firebase/firestore";

// Helpers
const dateFmt = new Intl.DateTimeFormat(undefined, { weekday:"short", day:"2-digit", month:"short", year:"numeric" });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour:"2-digit", minute:"2-digit" });
const toDate  = (v) => (v && v.toDate) ? v.toDate() : (v ? new Date(v) : null);
const fmtDate = (ts) => { const d = toDate(ts); return d ? dateFmt.format(d) : ""; };
const fmtTime = (ts) => { const d = toDate(ts); return d ? timeFmt.format(d) : ""; };

// ---- DOM
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

// =========================
// EVENTS (carousel)
// =========================
let events = [];
let idx = 0;

function renderEvents() {
  if (!events.length) {
    track.innerHTML = `<div class="text-sm text-ash-500 py-6">No upcoming events yet. Check back soon.</div>`;
    btnPrev.disabled = btnNext.disabled = true;
    return;
  }
  btnPrev.disabled = btnNext.disabled = (events.length < 2);

  const center = idx % events.length;
  const prev   = (center - 1 + events.length) % events.length;
  const next   = (center + 1) % events.length;
  const order  = (events.length === 1) ? [center] : (events.length === 2 ? [center, next] : [prev, center, next]);

  track.innerHTML = order.map(i => {
    const ev = events[i];
    const start = toDate(ev.starts_at);
    const end   = toDate(ev.ends_at);
    const line  = start
      ? `${fmtDate(ev.starts_at)}${fmtTime(ev.starts_at) ? " · " + fmtTime(ev.starts_at) : ""}${end ? " — " + fmtTime(ev.ends_at) : ""}`
      : "";
    const image = ev.image_url
      ? `<img src="${ev.image_url}" alt="Poster for ${ev.title || 'event'}" loading="lazy" width="640" height="360" class="aspect-[16/9] w-full object-cover rounded-xl"/>`
      : `<div class="aspect-[16/9] rounded-xl bg-surface-2"></div>`;

    return `
      <div class="w-full max-w-sm md:max-w-md transition-transform duration-200">
        <article class="card card-hover">
          ${image}
          <h3 class="mt-4 font-semibold text-brand-navy">${ev.title || "Untitled event"}</h3>
          <p class="mt-1 text-sm meta">${ev.location ? ev.location + (line ? " · " : "") : ""}${line}</p>
          ${ev.description ? `<p class="mt-2 text-sm">${ev.description}</p>` : ""}
          <div class="mt-4">
            <a href="./event.html?id=${ev.id}" class="inline-flex items-center gap-1 text-brand-navy hover:text-nav-brown font-medium">More →</a>
          </div>
        </article>
      </div>
    `;
  }).join("");
}

async function loadEvents() {
  eventsStatus.textContent = "Loading…";
  try {
    const q = query(
      collection(db, "events"),
      where("published", "==", true),
      orderBy("created_at", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    const now = new Date();
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    events = docs.filter(ev => {
      const s = toDate(ev.starts_at);
      return s && s >= now;
    }).slice(0, 3);
    idx = 0;
    renderEvents();
    eventsStatus.textContent = "";
  } catch (err) {
    console.error(err);
    eventsStatus.textContent = `Couldn't load events: ${err.message}`;
  }
}

btnPrev?.addEventListener("click", () => { if (!events.length) return; idx = (idx - 1 + events.length) % events.length; renderEvents(); });
btnNext?.addEventListener("click", () => { if (!events.length) return; idx = (idx + 1) % events.length; renderEvents(); });

// =========================
// NEWS (3 latest)
// =========================
async function loadNews() {
  newsStatus.textContent = "Loading…";
  try {
    const q = query(
      collection(db, "news"),
      where("published", "==", true),
      orderBy("created_at", "desc"),
      limit(3)
    );
    const snap = await getDocs(q);
    const arts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!arts.length) {
      newsList.innerHTML = `<div class="text-sm text-ash-500 py-2">No news yet. Check back soon.</div>`;
      newsStatus.textContent = "";
      return;
    }

    newsList.innerHTML = arts.map(a => {
      const img = a.image_url
        ? `<img src="${a.image_url}" alt="" loading="lazy" width="640" height="360" class="aspect-[16/9] w-full object-cover rounded-xl"/>`
        : `<div class="aspect-[16/9] rounded-xl bg-surface-2"></div>`;
      const when = a.created_at ? fmtDate(a.created_at) : "";
      const href = a.slug ? `./article/${a.slug}` : `./article.html?id=${a.id}`;

      return `
        <article class="card card-hover">
          ${img}
          <div class="mt-4">
            <span class="text-xs text-ash-500">${when}</span>
            <h3 class="mt-1 font-semibold text-brand-navy">${a.title || "Untitled"}</h3>
            ${a.summary ? `<p class="mt-2 text-sm">${a.summary}</p>` : ""}
          </div>
          <div class="mt-4">
            <a href="${href}" class="inline-flex items-center gap-1 text-brand-navy hover:text-nav-brown font-medium">Read more →</a>
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

// =========================
/** JOBS (carousel, simple “window” of up to 3) */
// =========================
let jobs = [];
let jx = 0;

function renderJobs() {
  if (!jobs.length) {
    jobTrack.innerHTML = `<div class="text-sm text-ash-500 py-6">No positions right now.</div>`;
    jobPrev.disabled = jobNext.disabled = true;
    return;
  }
  jobPrev.disabled = jobNext.disabled = (jobs.length < 2);

  const visible = [];
  const n = Math.min(3, jobs.length);
  for (let k = 0; k < n; k++) visible.push((jx + k) % jobs.length);

  jobTrack.innerHTML = visible.map(i => {
    const j = jobs[i];
    const posted = j.created_at ? fmtDate(j.created_at) : "";
    const closes = j.closes_at ? fmtDate(j.closes_at) : "";
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
              <h3 class="font-semibold text-brand-navy truncate">${j.title || "Role"}</h3>
              <p class="text-sm text-ash-600 truncate">${j.company || ""}</p>
            </div>
          </div>
          <p class="mt-2 text-sm meta">
            ${j.location ? `${j.location} · ` : ""}${j.type || ""}${(j.location || j.type) ? " · " : ""}${posted ? `Posted ${posted}` : ""}
          </p>
          ${closes ? `<p class="mt-1 text-xs text-ash-500">Closes ${closes}</p>` : ""}
          <div class="mt-4 pt-2 border-t" style="border-color: var(--line);">
            <a href="${applyHref}" class="inline-flex items-center gap-1 text-brand-navy hover:text-nav-brown font-medium">View & apply →</a>
          </div>
        </article>
      </div>
    `;
  }).join("");
}

async function loadJobs() {
  jobsStatus.textContent = "Loading…";
  try {
    const q = query(
      collection(db, "jobs"),
      where("published", "==", true),
      orderBy("created_at", "desc"),
      limit(12)
    );
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

// Init
window.addEventListener("DOMContentLoaded", () => {
  loadEvents();
  loadNews();
  loadJobs();
});
