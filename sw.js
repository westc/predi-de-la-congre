// Keeps the app usable with weak or no signal:
// - the page and its files come from the network when possible, otherwise from the cache;
// - map libraries and map tiles already seen are kept, so the map still shows offline.
// Data from the Sheet is not handled here: the page keeps its own copy (see setDB in index.html).

const APP = 'app-v1'; // bump to drop the old cached copy of the page files
const TILES = 'tiles';
const MAX_TILES = 2000;
const SHELL = [
  './', 'manzanas.js', 'manifest.webmanifest', 'icons/icon-192.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.css',
  'https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.min.js',
];
const TILE_HOSTS = ['tile.openstreetmap.org', 'server.arcgisonline.com'];
const LIB_HOSTS = ['unpkg.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP)
    .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('app-') && k !== APP).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return; // calls to the Sheet are POSTs and always go to the network
  if (url.origin === location.origin) e.respondWith(networkFirst(req, url));
  else if (TILE_HOSTS.includes(url.hostname)) e.respondWith(tile(req));
  else if (LIB_HOSTS.includes(url.hostname)) e.respondWith(cacheFirst(req));
});

async function networkFirst(req, url) {
  const cache = await caches.open(APP);
  const key = url.origin + url.pathname; // ?api=… and ?salida=… all share one copy of the page
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch (err) {
    return (await cache.match(key)) || (req.mode === 'navigate' && await cache.match('./')) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(APP);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

let trimming = false;
async function tile(req) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) { // only CORS tiles: opaque ones would eat the storage quota
    await cache.put(req, res.clone());
    if (!trimming) {
      trimming = true;
      cache.keys().then(keys => Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_TILES)).map(k => cache.delete(k))))
        .finally(() => { trimming = false; });
    }
  }
  return res;
}
