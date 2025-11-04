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
const newsList = document.getElementById("newsListInner");

async function loadNews() {
  newsList.innerHTML = `<p class="text-ash-500">Loading news...</p>`;

  try {
    const q = query(collection(db, "news"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      newsList.innerHTML = `<p class="text-ash-500">No news articles available yet.</p>`;
      return;
    }

    newsList.innerHTML = "";

    snapshot.forEach((doc) => {
      const data = doc.data();

      const article = document.createElement("article");
      article.className = "mb-12 rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow";

      const formattedDate = new Date(data.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      article.innerHTML = `
        ${data.imageUrl ? `<img src="${data.imageUrl}" class="rounded-xl mb-4 w-full object-cover max-h-[420px]"/>` : ""}
        <div class="text-sm text-ash-500">${formattedDate}</div>
        <h2 class="text-2xl font-semibold mt-1">${data.header}</h2>
        <p class="mt-3 text-ash-700 line-clamp-3">${data.text}</p>
        <a href="/public/news-article.html?id=${doc.id}" class="mt-3 inline-flex text-brand-navy hover:text-nav-brown font-medium">
          Read more →
        </a>
      `;

      newsList.appendChild(article);
    });
  } catch (error) {
    console.error("Error loading news:", error);
    newsList.innerHTML = `<p class="text-red-600">Error loading news.</p>`;
  }
}

loadNews();
