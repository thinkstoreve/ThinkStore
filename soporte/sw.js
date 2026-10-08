const CACHE="thinkstore-support-v8-8-19-r1524a";
const CORE=["./panel.html", "./index.html", "./styles.css?v=15.24.1", "./app.js?v=15.24.1", "./offline-runtime.js", "./manifest.webmanifest", "./offline.html", "./favicon-192.png", "./favicon-512.png", "./assets/thinkstore-logo-white.png"];
const OFFLINE="./offline.html";
const NAV_ONLY=null;
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(async c=>{for(const u of CORE){try{const r=await fetch(u,{cache:'reload'});if(r.ok||r.type==='opaque')await c.put(u,r.clone())}catch{}}}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('thinkstore-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
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
