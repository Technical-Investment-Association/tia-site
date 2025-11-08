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

// Formatters
const dateOnlyFmt = new Intl.DateTimeFormat(undefined, {
  day: "2-digit",
  month: "short",
});

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const fmtDateOnly = (ts) => {
  const d = toDate(ts);
  return d ? dateOnlyFmt.format(d) : "";
};

function renderCard(ev) {
  const imgHtml = ev.image_url
    ? `<img src="${ev.image_url}" alt="" loading="lazy" width="640" height="360"
             class="aspect-[16/9] w-full object-cover rounded-xl" />`
    : `<div class="aspect-[16/9] rounded-xl bg-surface-2"></div>`;

  const title = ev.title || "Untitled event";
  const company = (ev.company || "").trim();
  const dateText = fmtDateOnly(ev.starts_at);
  const place = (ev.location || "").trim();
  const metaLine = dateText ? `${dateText}${place ? ` · ${place}` : ""}` : place;
  const description = ev.description?.trim() || "";

  return `
    <article class="card card-hover flex flex-col">
      ${imgHtml}
      <h3 class="mt-4 font-semibold text-brand-navy">${title}</h3>
      ${company ? `<div class="mt-1 text-sm meta">${company}</div>` : ""}
      <div class="mt-1 text-sm meta">${metaLine || ""}</div>
      <div class="mt-3">
        <button class="toggle-description-btn text-brand-navy hover:text-nav-brown font-medium">
          More <span aria-hidden>→</span>
        </button>
        <div class="event-description hidden mt-2 text-sm text-ash-700">${description}</div>
      </div>
    </article>
  `;
}

async function loadEvents() {
  upcomingSkel?.classList.remove("hidden");
  pastSkel?.classList.remove("hidden");
  statusEl.textContent = "Loading events…";

  try {
    const q = query(
      collection(db, "events"),
      where("published", "==", true),
      orderBy("starts_at", "asc")
    );

    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const now = new Date();
    const withStart = rows.map((ev) => ({ ...ev, _start: toDate(ev.starts_at) }));

    const upcoming = withStart.filter((ev) => ev._start && ev._start >= now);
    const past = withStart
      .filter((ev) => ev._start && ev._start < now)
      .sort((a, b) => b._start - a._start);

    upcomingGrid.innerHTML = upcoming.length
  ? upcoming.map(renderCard).join("")
  : `<p class="text-sm text-ash-500">No upcoming events yet.</p>`;
upcomingGrid.style.alignItems = "start";

// Add toggle logic for "More" buttons
document.querySelectorAll(".toggle-description-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const allDescriptions = document.querySelectorAll(".event-description");
    const allButtons = document.querySelectorAll(".toggle-description-btn");

    const desc = btn.nextElementSibling;
    const isOpening = desc.classList.contains("hidden");

    // Collapse all descriptions
    allDescriptions.forEach((d) => d.classList.add("hidden"));
    allButtons.forEach((b) => {
      b.innerHTML = 'More <span aria-hidden="true">→</span>';
    });

    // If this one was opening, show it
    if (isOpening) {
      desc.classList.remove("hidden");
      btn.innerHTML = 'Less <span aria-hidden="true">↑</span>';
    }
  });
});

    pastGrid.innerHTML = past.length
  ? past.map(renderCard).join("")
  : `<p class="text-sm text-ash-500">No past events to show.</p>`;
// Prevent stretching in past events too
pastGrid.style.alignItems = "start";

    upcomingCount.textContent = upcoming.length ? `${upcoming.length} upcoming` : "";
    pastCount.textContent = past.length ? `${past.length} past` : "";
    statusEl.textContent = "";
  } catch (err) {
    console.error(err);
    const link = (err?.message || "").match(/https?:\/\/\S+/)?.[0];
    statusEl.innerHTML = `Couldn’t load events: ${String(err?.message || err).replace(link || "", "")}
      ${link ? `<br/><a class="underline" href="${link}" target="_blank" rel="noopener">Create required index</a>` : ""}`;
  } finally {
    upcomingSkel?.classList.add("hidden");
    pastSkel?.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", loadEvents);
