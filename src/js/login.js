// src/js/login.js
import { auth } from "./firebaseClient.js";
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";

const qs = new URLSearchParams(location.search);
const next = qs.get("next") || "/admin.html";

const emailForm  = document.getElementById("email-form");
const emailInput = document.getElementById("email");
const passInput  = document.getElementById("password");
const emailError = document.getElementById("email-error");
const googleBtn  = document.getElementById("google-btn");
const statusEl   = document.getElementById("login-status");

await setPersistence(auth, browserLocalPersistence);

onAuthStateChanged(auth, (user) => {
  if (user) {
    statusEl.textContent = "Signed in. Redirecting…";
    location.assign(next);
  }
});

emailForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  emailError.classList.add("hidden");
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passInput.value);
  } catch (err) {
    emailError.textContent = err.message || "Sign-in failed";
    emailError.classList.remove("hidden");
  }
});

googleBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    statusEl.textContent = err.message || "Google sign-in failed";
  }
});
