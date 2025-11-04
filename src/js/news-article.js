import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- Firebase config ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const articleCard = document.getElementById("articleCard");

// Get ?id=... from URL
const params = new URLSearchParams(window.location.search);
const articleId = params.get("id");

if (!articleId) {
  articleCard.innerHTML = `<div class="p-6"><p class="text-red-600">Article not found.</p></div>`;
} else {
  loadArticle(articleId);
}

async function loadArticle(id) {
  try {
    const ref = doc(db, "news", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      articleCard.innerHTML = `<div class="p-6"><p class="text-red-600">Article not found.</p></div>`;
      return;
    }

    const data = snap.data();
    const formattedDate = new Date(data.date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    articleCard.innerHTML = `
      ${data.imageUrl ? `<img src="${data.imageUrl}" class="w-full rounded-t-2xl object-cover max-h-[420px]" />` : ""}
      <div class="p-6">
        <div class="text-xs uppercase tracking-wide text-ash-500">${formattedDate}</div>
        <h1 class="mt-1 text-3xl font-semibold">${data.header}</h1>
        <div class="prose prose-gray max-w-none mt-4 whitespace-pre-line text-ash-700">
          ${data.text}
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error loading article:", error);
    articleCard.innerHTML = `<div class="p-6"><p class="text-red-600">Error loading article.</p></div>`;
  }
}
