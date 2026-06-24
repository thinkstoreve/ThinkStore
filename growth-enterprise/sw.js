const CACHE = 'thinkstore-enterprise-v9-5-pwa';
const ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/install.html',
  '/offline.html',
  '/reset-password.html',
  '/styles.css',
  '/app.js',
  '/dashboard.js',
  '/reset-password.js',
  '/supabase.js',
  '/support-config.js',
  '/manifest.webmanifest',
  '/assets/thinkstore-logo-white.png',
  '/assets/thinkstore-logo-black.png',
  '/assets/app-icon-192.png',
  '/assets/app-icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/auth/') || url.pathname.includes('/rest/v1/')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone)).catch(() => null);
          return response;
        })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone)).catch(() => null);
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
