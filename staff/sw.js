const CACHE='thinkstore-staff-v14-4-0';
const SHELL=['./','./index.html','./app.css?v=14.4.0','./app.js?v=14.4.0','./manifest.webmanifest','./icon-192.png','./icon-512.png','../logo-thinkstore.png','../supabase-config.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.pathname.startsWith('/.netlify/functions/')||url.hostname.includes('supabase.co'))return;
  event.respondWith(fetch(req).then(res=>{const copy=res.clone();if(url.origin===location.origin)caches.open(CACHE).then(c=>c.put(req,copy));return res}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
});
