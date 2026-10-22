// Service Worker: hält alle Dateien der App im Cache, damit sie ohne Netz läuft.
// Bei jeder Änderung an der App VERSION erhöhen (gleich der Version in package.json),
// sonst bekommen installierte Apps die neuen Dateien nicht.
const VERSION = '0.3.0';
const CACHE = `tabellenbuch-${VERSION}`;

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/icon.svg',
  './src/app.js',
  './src/core/dom.js',
  './src/core/favorites.js',
  './src/core/i18n.js',
  './src/core/inchinput.js',
  './src/core/registry.js',
  './src/core/search.js',
  './src/core/share.js',
  './src/core/store.js',
  './src/core/units.js',
  './src/i18n/en.js',
  './src/styles.css',
  './src/modules/allgemeintoleranzen/calc.js',
  './src/modules/allgemeintoleranzen/data.js',
  './src/modules/allgemeintoleranzen/index.js',
  './src/modules/biegen/calc.js',
  './src/modules/biegen/data.js',
  './src/modules/biegen/index.js',
  './src/modules/einheiten/calc.js',
  './src/modules/einheiten/data.js',
  './src/modules/einheiten/index.js',
  './src/modules/formlage/calc.js',
  './src/modules/formlage/data.js',
  './src/modules/formlage/index.js',
  './src/modules/fotomessung/calc.js',
  './src/modules/fotomessung/index.js',
  './src/modules/gewicht/calc.js',
  './src/modules/gewicht/data.js',
  './src/modules/gewicht/index.js',
  './src/modules/gewinde/calc.js',
  './src/modules/gewinde/data.js',
  './src/modules/gewinde/index.js',
  './src/modules/gewindefraesen/calc.js',
  './src/modules/gewindefraesen/index.js',
  './src/modules/haerte/calc.js',
  './src/modules/haerte/data.js',
  './src/modules/haerte/index.js',
  './src/modules/kegel/calc.js',
  './src/modules/kegel/data.js',
  './src/modules/kegel/index.js',
  './src/modules/kosten/calc.js',
  './src/modules/kosten/index.js',
  './src/modules/normteile/calc.js',
  './src/modules/normteile/data.js',
  './src/modules/normteile/index.js',
  './src/modules/passungen/calc.js',
  './src/modules/passungen/data.js',
  './src/modules/passungen/index.js',
  './src/modules/quiz/calc.js',
  './src/modules/quiz/index.js',
  './src/modules/rauheit/calc.js',
  './src/modules/rauheit/data.js',
  './src/modules/rauheit/index.js',
  './src/modules/schnittdaten/calc.js',
  './src/modules/schnittdaten/index.js',
  './src/modules/schnittwerte/calc.js',
  './src/modules/schnittwerte/data.js',
  './src/modules/schnittwerte/index.js',
  './src/modules/schrauben/calc.js',
  './src/modules/schrauben/data.js',
  './src/modules/schrauben/index.js',
  './src/modules/senkungen/calc.js',
  './src/modules/senkungen/data.js',
  './src/modules/senkungen/index.js',
  './src/modules/toleranzketten/calc.js',
  './src/modules/toleranzketten/index.js',
  './src/modules/werkstoffe/calc.js',
  './src/modules/werkstoffe/data.js',
  './src/modules/werkstoffe/index.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tabellenbuch-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Zuerst Cache, dann Netz. Seitenaufrufe (auch mit #-Route) liefern immer die App-Shell.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((r) => r || fetch(req)));
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
