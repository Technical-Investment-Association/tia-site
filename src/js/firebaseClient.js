// src/js/firebaseClient.js (ES module)
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FB_API_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FB_APP_ID,
  measurementId:     import.meta.env.VITE_FB_MEASUREMENT_ID
};

// Reuse app if already initialized (dev HMR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export named bindings (what events.js imports)
export const db = getFirestore(app);
// Optional: export app if you need it elsewhere
export { app };

console.log("[firebaseClient] module loaded, db exported", !!db);
