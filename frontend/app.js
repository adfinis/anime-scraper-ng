/* Anime Scraper NG - plain JS frontend. */

// Pick the backend with ?backend=python or ?backend=node
const BACKENDS = {
  python: "http://localhost:8000",
  node: "http://localhost:8001",
};
const DEFAULT_BACKEND = "python";

const requestedBackend = new URLSearchParams(location.search).get("backend");
const backend = Object.hasOwn(BACKENDS, requestedBackend)
  ? requestedBackend
  : DEFAULT_BACKEND;
const API_URL = BACKENDS[backend];
const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

const searchInput = document.getElementById("search");
const grid = document.getElementById("grid");
const totalLabel = document.getElementById("total");
const statusMsg = document.getElementById("status");
const loadMoreTrigger = document.getElementById("load-more-trigger");

let query = "";
let page = 1;
let hasMore = true;
let loading = false;

function card(anime) {
  const rating = anime.rating ? anime.rating.toFixed(2) : "N/A";
  const el = document.createElement("article");
  el.className = "overflow-hidden rounded-lg bg-slate-800 shadow";
  el.innerHTML = `
    <img
      src="${anime.image}"
      alt="${anime.title}"
      loading="lazy"
      class="aspect-[2/3] w-full object-cover"
    />
    <div class="p-3">
      <h2 class="truncate text-sm font-semibold" title="${anime.title}">${anime.title}</h2>
      <p class="mt-1 text-xs text-amber-400">&#9733; ${rating}</p>
    </div>
  `;
  return el;
}

function render(animes) {
  for (const anime of animes) {
    grid.appendChild(card(anime));
  }
}

async function fetchAnimes() {
  const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
  if (query) params.set("q", query);

  const response = await fetch(`${API_URL}/api/animes?${params}`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

async function loadMore() {
  loading = true;
  statusMsg.textContent = "Loading...";

  try {
    const data = await fetchAnimes();
    render(data.results);
    totalLabel.textContent = `Showing ${grid.children.length} of ${data.total} animes`;
    hasMore = data.has_more;
    statusMsg.textContent = hasMore
      ? ""
      : grid.children.length
        ? "That's everything."
        : "No animes found.";
  } catch (error) {
    console.error(error);
    statusMsg.textContent = "Something went wrong while loading animes.";
    hasMore = false;
  } finally {
    loading = false;
  }
}

function resetAndLoad() {
  grid.replaceChildren();
  hasMore = true;
  loadMore();
}

searchInput.addEventListener("input", (event) => {
  const searchTerm = event.target.value.trim();
  let debounceTimer;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    query = searchTerm;
    resetAndLoad();
  }, DEBOUNCE_MS);
});

new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !loading && hasMore) {
    loadMore();
  }
}).observe(loadMoreTrigger);

loadMore();
