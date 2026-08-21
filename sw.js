/* bloom — service worker
 * Makes the app installable and work offline.
 * Strategy: cache-first for app files and CDN assets.
 */

// Cache version. The deploy workflow rewrites this to a fresh timestamp on
// every push so the service worker always updates and old caches are purged.
const CACHE = 'bloom-v12';

// Files needed to run the app offline.
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './palettes.js',
  './charts.js',
  './viz-time.js',
  './viz-insights.js',
  './supabase-config.js',
  './supabase-auth.js',
  './supabase-sync.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];

// Install: fetch and store the core files.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve app files from cache first, fall back to network, then cache
// the result. API calls (Supabase) always go straight to the network so cloud
// data is never served from a stale cache copy.
self.addEventListener('fetch', (event) => {
  // Only handle GET requests.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isAppAsset = url.origin === self.location.origin || url.hostname === 'cdn.jsdelivr.net';
  if (!isAppAsset) return; // API calls: always network, never cached

  // Navigations: network-first so new deploys are picked up immediately,
  // falling back to the cached page when offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets: serve from cache instantly, refresh it in the background
  // (stale-while-revalidate) so updates propagate without a manual bump.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});