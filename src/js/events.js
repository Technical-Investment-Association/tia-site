// src/js/events.js
import { db } from "./firebaseClient.js";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

const statusEl       = document.getElementById("eventsStatus");
const upcomingGrid   = document.getElementById("upcomingGrid");
const pastGrid       = document.getElementById("pastGrid");
const upcomingCount  = document.getElementById("upcomingCount");
const pastCount      = document.getElementById("pastCount");
const upcomingSkel   = document.getElementById("upcomingSkeleton");
const pastSkel       = document.getElementById("pastSkeleton");

const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const toDate  = (v) => v?.toDate ? v.toDate() : (v ? new Date(v) : null);
const fmtDate = (ts) => { const d = toDate(ts); return d ? dateFmt.format(d) : ""; };
const fmtTime = (ts) => { const d = toDate(ts); return d ? timeFmt.format(d) : ""; };

function renderCard(ev) {
  const start = toDate(ev.starts_at);
  const end   = toDate(ev.ends_at);
  const dateLine = start
    ? `${fmtDate(ev.starts_at)}${fmtTime(ev.starts_at) ? " · " + fmtTime(ev.starts_at) : ""}${end ? " — " + fmtTime(ev.ends_at) : ""}`
    : "";

  const image = ev.image_url
    ? `<img src="${ev.image_url}" alt="" loading="lazy" width="640" height="360" class="aspect-[16/9] w-full object-cover rounded-xl" />`
    : `<div class="aspect-[16/9] rounded-xl bg-surface-2"></div>`;

  const href = `./event.html?id=${ev.id}`;

  return `
    <article class="card card-hover">
      ${image}
      <h3 class="mt-4 font-semibold text-brand-navy">${ev.title || "Untitled event"}</h3>
      <p class="mt-1 text-sm meta">
        ${ev.location ? ev.location + (dateLine ? " · " : "") : ""}${dateLine}
      </p>
      ${ev.description ? `<p class="mt-2 text-sm">${ev.description}</p>` : ""}
      <div class="mt-4">
        <a href="${href}" class="inline-flex items-center gap-1 text-brand-navy hover:text-nav-brown font-medium">More →</a>
      </div>
    </article>
  `;
}

async function loadEvents() {
  // show skeletons
  upcomingSkel?.classList.remove("hidden");
  pastSkel?.classList.remove("hidden");
  statusEl.textContent = "Loading events…";

  try {
    // published == true, ordered by starts_at ascending
    const q = query(
      collection(db, "events"),
      where("published", "==", true),
      orderBy("starts_at", "asc")
    );

    const snap = await getDocs(q);
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const now = new Date();
    const withStart = rows.map(ev => ({ ...ev, _start: toDate(ev.starts_at) }));

    const upcoming = withStart.filter(ev => ev._start && ev._start >= now);
    const past     = withStart.filter(ev => ev._start && ev._start <  now)
                              .sort((a, b) => b._start - a._start);

    upcomingGrid.innerHTML = upcoming.length
      ? upcoming.map(renderCard).join("")
      : `<p class="text-sm text-ash-500">No upcoming events yet.</p>`;

    pastGrid.innerHTML = past.length
      ? past.map(renderCard).join("")
      : `<p class="text-sm text-ash-500">No past events to show.</p>`;

    upcomingCount.textContent = upcoming.length ? `${upcoming.length} upcoming` : "";
    pastCount.textContent     = past.length ? `${past.length} past` : "";
    statusEl.textContent = "";
  } catch (err) {
    console.error(err);
    // Firestore might return an index creation URL—surface it if present
    const link = (err?.message || "").match(/https?:\/\/\S+/)?.[0];
    statusEl.innerHTML = `Couldn’t load events: ${String(err?.message || err).replace(link || "", "")}
      ${link ? `<br/><a class="underline" href="${link}" target="_blank" rel="noopener">Create required index</a>` : ""}`;
  } finally {
    upcomingSkel?.classList.add("hidden");
    pastSkel?.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", loadEvents);
