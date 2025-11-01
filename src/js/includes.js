// src/js/includes.js
document.addEventListener("DOMContentLoaded", async () => {
    // 1) Inject header/footer (any [data-include] element)
    const targets = [...document.querySelectorAll("[data-include]")];
  
    await Promise.all(
      targets.map(async (el) => {
        const name = el.getAttribute("data-include");
        try {
          // Always fetch from site root: /header.html, /footer.html
          const res = await fetch(`/${name}.html`, { cache: "no-cache" });
          if (!res.ok) throw new Error(`${name}.html returned ${res.status}`);
          const html = await res.text();
          // Replace the placeholder itself
          el.outerHTML = html;
        } catch (err) {
          console.error(`Failed to include ${name}:`, err);
        }
      })
    );
  
    // 2) After injection, query fresh DOM for header elements
    const header = document.querySelector("header");
    const btn = document.getElementById("menuBtn");
    const menu = document.getElementById("mobileMenu");
  
    // --- Mobile menu toggle (safe if elements are missing)
    if (btn && menu) {
      const closeMenu = () => {
        if (!menu.classList.contains("hidden")) {
          menu.classList.add("hidden");
          btn.setAttribute("aria-expanded", "false");
        }
      };
  
      btn.addEventListener("click", () => {
        const open = menu.classList.toggle("hidden") === false;
        btn.setAttribute("aria-expanded", String(open));
      });
  
      // Close when a mobile nav link is clicked
      menu.addEventListener("click", (e) => {
        const a = e.target.closest("a[href]");
        if (a) closeMenu();
      });
  
      // Close on Esc
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMenu();
      });
  
      // Close if viewport grows to md+ (prevents stuck-open state)
      let lastW = window.innerWidth;
      window.addEventListener("resize", () => {
        const w = window.innerWidth;
        if (w >= 768 && lastW < 768) closeMenu();
        lastW = w;
      });
    }
  
    // 3) Highlight current nav link (desktop + mobile)
    // Normalizes paths so /index.html == /
    const normalize = (p) =>
      (p || "/")
        .replace(/[#?].*$/, "")         // strip hash/query
        .replace(/\/index\.html$/, "/")  // index.html -> /
        .replace(/\/+$/, "/");           // collapse trailing slashes
  
    const current = normalize(location.pathname);
  
    const markActive = (root) => {
      if (!root) return;
      root.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute("href");
        if (!href) return;
        const normalized = normalize(href);
  
        if (normalized === current) {
          a.setAttribute("aria-current", "page");
          // Color highlight
          a.classList.add("text-[var(--brand-brown)]");
          // If your underline uses the ::after bar, force it to appear “active”
          a.style.setProperty("--underline-w", "100%");
        }
      });
    };
  
    // Mark in header desktop nav and mobile menu
    markActive(header);
  });
  