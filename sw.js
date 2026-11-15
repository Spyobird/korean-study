// Network-first so updates show up immediately online; cache is the offline fallback.
const CACHE = 'korean-v2';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'srs.js', 'data/lessons-00-survival.js', 'data/lessons-01-08.js', 'data/lessons-09-17.js', 'data/lessons-18-25.js', 'data/lessons-26-33.js', 'data/lessons-34-42.js', 'data/lessons-43-50.js', 'data/lessons-51-58.js', 'data/lessons-59-66.js', 'data/lessons-67-75.js', 'manifest.webmanifest', 'icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
