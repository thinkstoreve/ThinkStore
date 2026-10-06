const OLD_PREFIX='thinkstore-enterprise-';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    try{
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith(OLD_PREFIX)).map(k=>caches.delete(k)));
    }catch(e){}
    try{await self.registration.unregister();}catch(e){}
    try{
      const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
      for(const client of clients){
        try{client.navigate('/recovery-v1013.html?from=sw&ts='+Date.now());}catch(e){}
      }
    }catch(e){}
  })());
});
self.addEventListener('fetch',()=>{});
