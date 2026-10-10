const CACHE='thinkstore-staff-v15-27-0';
const SHELL=['./','./index.html','./app.css?v=15.27.0','./app.js?v=15.27.0','./cash.js?v=15.27.0','./repairs.js?v=15.27.0','./manifest.webmanifest','./icon-192.png','./icon-512.png','../logo-thinkstore.png','../supabase-config.js','../ts-fx.js?v=14.78','../payment-destinations.js?v=15.27','../ts-payment-split.js?v=15.27','../assets/efectivo.svg','../assets/pago-movil.svg','../assets/zelle.svg','../assets/transferencia.svg','../assets/punto-venta.svg','../assets/otros-pagos.svg','../assets/banks/official/bdv.png','../assets/banks/official/banesco.png','../assets/banks/official/bvc.png','../assets/banks/official/pichincha.png','../assets/banks/bnc.svg','../assets/banks/bancamiga.svg','../assets/banks/boa.svg','../assets/banks/chase.svg','../assets/banks/zelle.svg','../assets/banks/binance.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.pathname.startsWith('/.netlify/functions/')||url.hostname.includes('supabase.co'))return;
  event.respondWith(fetch(req).then(res=>{const copy=res.clone();if(url.origin===location.origin)caches.open(CACHE).then(c=>c.put(req,copy));return res}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
});
