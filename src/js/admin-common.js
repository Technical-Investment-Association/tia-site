// src/js/admin-common.js
import { auth } from "./firebaseClient.js";
import { onAuthStateChanged, signOut } from "firebase/auth";

export const ADMIN_UID = "c5xbzFiAW5Ok5POmZqKLgd5nv4w1";

/**
 * Gate the page: only allow signed-in admin. Otherwise redirect to login.
 * @param {string} nextPath - where to redirect back after login (usually the current page)
 * @returns {Promise<firebase.User>}
 */
export function requireAdmin(nextPath = location.pathname) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      const gate = document.getElementById("gate");
      const adminUI = document.getElementById("admin-ui");
      const userInfo = document.getElementById("user-info");

      if (!user) {
        location.assign(`/login.html?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      if (user.uid !== ADMIN_UID) {
        gate.innerHTML = `
          <div class="card">
            <p class="text-red-700 font-medium">Access denied.</p>
            <p class="text-sm mt-1">You are signed in but not an admin.</p>
            <a class="underline mt-2 inline-block" href="/login.html">Switch account</a>
          </div>`;
        return;
      }
      // ok
      gate.classList.add("hidden");
      adminUI.classList.remove("hidden");
      if (userInfo) userInfo.textContent = `${user.email || "Admin"} • ${user.uid}`;
      resolve(user);
    });
  });
}

export function wireSignOut(btnId = "signout-btn") {
  const btn = document.getElementById(btnId);
  if (btn) btn.addEventListener("click", () => signOut(auth));
}

/** Small helper */
export const pruneNullish = (obj) => {
  Object.keys(obj).forEach((k) => {
    if (obj[k] === null || obj[k] === undefined || obj[k] === "") delete obj[k];
  });
  return obj;
};
