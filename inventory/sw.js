const CACHE="thinkstore-inventory-v3-2-32-main-1491";
const CORE=["./", "./index.html", "./setup-password.html", "./styles.css", "./app.js?v=3.2.32", "./workshop/finance.js?v=3.2.32", "./workshop/workshop.js?v=3.2.32", "./workshop/workshop.css?v=3.2.32", "./boot.js?v=3.2.32", "./config.js?v=3.2.32", "./manifest.webmanifest", "./version.json", "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-192.png", "./icons/maskable-512.png", "./icons/thinkstore-logo.png"];
const OFFLINE="./index.html";
const NAV_ONLY=null;
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(async c=>{for(const u of CORE){try{const r=await fetch(u,{cache:'reload'});if(r.ok||r.type==='opaque')await c.put(u,r.clone())}catch{}}}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('thinkstore-inventory-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(/supabase\.co\/(rest|auth|storage|realtime)\/v1/i.test(event.request.url)||url.pathname.includes('/.netlify/functions/')||url.pathname.startsWith('/api/'))return;
  if(event.request.mode==='navigate'){
    if(NAV_ONLY&&!NAV_ONLY.some(x=>url.pathname.endsWith(x)))return;
    event.respondWith(fetch(event.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(event.request,r.clone()));return r}).catch(async()=>await caches.match(event.request)||await caches.match(OFFLINE)||await caches.match(CORE[0])));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>{
    const network=fetch(event.request).then(r=>{if(r.ok||r.type==='opaque')caches.open(CACHE).then(c=>c.put(event.request,r.clone()));return r}).catch(()=>cached);
    return cached||network;
  }));
});
