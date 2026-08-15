// Code Forge service worker. Two independent jobs:
//
// 1. Permanently cache the Kokoro TTS download (the CDN script + Hugging
//    Face model weight files) so the ~90MB one-time cost happens once per
//    browser, not once per visit — this is what actually fixes "Listen
//    takes minutes to load every time". Those URLs are version-pinned
//    (kokoro-js@1.2.1, a fixed model id) so caching them forever is safe.
//
// 2. Cache the app shell (our own HTML/CSS/JS) for offline use, via
//    stale-while-revalidate rather than cache-first. This project already
//    hit a real stale-cache bug once during dev (Python's http.server
//    sends no cache headers, old JS kept being served after edits) — SWR
//    serves the cached shell instantly but always re-fetches in the
//    background to refresh the cache, so it self-heals within one reload
//    instead of getting permanently stuck the way a pure cache-first
//    strategy would.
const CACHE_VERSION = 'codeforge-v2';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const MODEL_CACHE = `${CACHE_VERSION}-model`;
const CONTENT_CACHE = `${CACHE_VERSION}-content`;

const SHELL_PATHS = [
  'index.html',
  'library.html',
  'quests.html',
  'certificate.html',
  'app/lesson.html',
  'app/css/win98.css',
  'app/css/win98-window.css',
  'app/css/accessibility.css',
  'app/css/site.css',
  'app/css/home.css',
  'app/css/layout.css',
  'app/css/shell.css',
  'app/css/editor.css',
  'app/css/video-player.css',
  'app/css/screens.css',
  'app/css/paperclip.css',
  'app/css/certificate.css',
  'app/js/app.js',
  'app/js/accessibility.js',
  'app/js/achievements.js',
  'app/js/lesson-search.js',
  'app/js/certificate.js',
  'app/js/quest-certificates.js',
  'app/js/home.js',
  'app/js/progress-store.js',
  'app/js/tts.js',
  'app/js/tts-worker.js',
  'app/js/youtube-player.js',
  'app/js/course-drawer.js',
  'app/js/panel-resizer.js',
  'app/js/win98-window.js',
  'app/js/runner-client.js',
  'app/js/grading.js',
  'app/js/lesson-loader.js',
  'app/js/paperclip/state.js',
  'app/js/paperclip/context.js',
  'app/js/paperclip/api.js',
  'app/js/paperclip/ui.js',
  'app/js/paperclip/client.js',
];
const SHELL_URLS = SHELL_PATHS.map((p) => new URL(p, self.location.href).pathname);

// Hugging Face serves large model files via LFS, which redirects through
// varying CDN subdomains (cdn-lfs.huggingface.co, cdn-lfs-us-1.hf.co, ...)
// — matching by suffix instead of an exact host list is what keeps this
// working across whichever redirect target HF happens to use.
function isModelHost(hostname) {
  return (
    hostname === 'cdn.jsdelivr.net' ||
    hostname === 'huggingface.co' ||
    hostname.endsWith('.huggingface.co') ||
    hostname.endsWith('.hf.co')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_PATHS))
      .catch(() => {}) // a missing/renamed path shouldn't block install
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await networkPromise) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (isModelHost(url.hostname)) {
    event.respondWith(cacheFirst(request, MODEL_CACHE));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes('/content/') && url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request, CONTENT_CACHE));
    return;
  }
  if (SHELL_URLS.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});
