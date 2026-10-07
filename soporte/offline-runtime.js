/* ThinkStore Offline Runtime V1
   - Cachea lecturas REST/Functions por usuario.
   - Encola POST/PATCH/PUT/DELETE cuando no hay conexión.
   - Reintenta en orden al volver Internet.
   - Parchea caché REST para reflejar cambios locales básicos.
*/
(()=>{
  if(window.ThinkStoreOffline)return;
  const cfg=window.THINKSTORE_OFFLINE_CONFIG||{};
  const APP=cfg.app||document.documentElement.dataset.app||location.hostname||'thinkstore';
  const DB_NAME='thinkstore-offline-'+String(APP).toLowerCase().replace(/[^a-z0-9_-]+/g,'-');
  const DB_VERSION=1;
  const NATIVE_FETCH=window.fetch.bind(window);
  let dbPromise=null,tokenProvider=null,syncing=false,lastOnline=navigator.onLine,indicatorCompactTimer=null;
  const uuidTables=new Set(['service_orders','service_order_notes','service_order_photos','service_part_movements','service_parts','service_audit_log','service_appointments']);
  const now=()=>new Date().toISOString();

  function openDb(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains('cache'))db.createObjectStore('cache',{keyPath:'key'});
        if(!db.objectStoreNames.contains('queue'))db.createObjectStore('queue',{keyPath:'id',autoIncrement:true});
        if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'key'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
    return dbPromise;
  }
  async function tx(store,mode,fn){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tr=db.transaction(store,mode),os=tr.objectStore(store);
      let val;
      try{val=fn(os,tr)}catch(e){reject(e);return}
      tr.oncomplete=()=>resolve(val);tr.onerror=()=>reject(tr.error);tr.onabort=()=>reject(tr.error);
    });
  }
  async function reqValue(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function put(store,value){return tx(store,'readwrite',os=>os.put(value))}
  async function del(store,key){return tx(store,'readwrite',os=>os.delete(key))}
  async function get(store,key){const db=await openDb();const tr=db.transaction(store,'readonly');return reqValue(tr.objectStore(store).get(key))}
  async function all(store){const db=await openDb();const tr=db.transaction(store,'readonly');return reqValue(tr.objectStore(store).getAll())}

  function headersObj(headers){
    const o={};for(const [k,v] of headers.entries())if(!['host','content-length'].includes(k.toLowerCase()))o[k]=v;return o;
  }
  function jwtSub(auth=''){
    try{
      const token=String(auth).replace(/^Bearer\s+/i,'');const parts=token.split('.');
      if(parts.length<2)return '';
      const raw=parts[1].replace(/-/g,'+').replace(/_/g,'/');
      const pad=raw+'='.repeat((4-raw.length%4)%4);
      return JSON.parse(atob(pad)).sub||'';
    }catch{return ''}
  }
  function userKey(req){
    const sub=jwtSub(req.headers.get('authorization')||'');
    return sub||localStorage.getItem('thinkstore_offline_user')||'anon';
  }
  function cacheKey(req){return userKey(req)+'|'+req.url}
  function isAuth(url){return /\/auth\/v1\//i.test(url)}
  function isRealtime(url){return /realtime\/v1|websocket/i.test(url)}
  function isReadLikeStorage(url,method){return /\/storage\/v1\/object\/sign\//i.test(url)||method==='GET'}
  function isQueueable(req){
    if(!['POST','PATCH','PUT','DELETE'].includes(req.method))return false;
    const u=req.url;
    if(isAuth(u)||isRealtime(u))return false;
    if(/\/storage\/v1\//i.test(u)&&isReadLikeStorage(u,req.method))return false;
    return /supabase\.co\/(rest|storage)\/v1\//i.test(u)||new URL(u).origin===location.origin;
  }
  function isCacheable(req){
    if(!['GET','HEAD'].includes(req.method)||isAuth(req.url)||isRealtime(req.url))return false;
    return /supabase\.co\/rest\/v1\//i.test(req.url)||new URL(req.url).origin===location.origin;
  }
  async function cacheResponse(req,res){
    try{
      const blob=await res.clone().blob();
      await put('cache',{key:cacheKey(req),url:req.url,user:userKey(req),status:res.status,statusText:res.statusText,headers:[...res.headers.entries()],body:blob,updated_at:now()});
    }catch{}
  }
  async function cachedResponse(req){
    const row=await get('cache',cacheKey(req)).catch(()=>null);
    if(!row)return null;
    return new Response(row.body,{status:row.status||200,statusText:row.statusText||'OK',headers:new Headers(row.headers||[['content-type','application/json']])});
  }
  function tableFromUrl(url){
    try{const u=new URL(url),m=u.pathname.match(/\/rest\/v1\/([^/?]+)/);return m?decodeURIComponent(m[1]):''}catch{return ''}
  }
  function idFilter(url){
    try{
      const u=new URL(url),raw=u.searchParams.get('id')||'';
      const m=raw.match(/^eq\.(.+)$/);return m?decodeURIComponent(m[1]):'';
    }catch{return ''}
  }
  async function bodyFromRequest(req){
    if(['GET','HEAD'].includes(req.method))return null;
    try{return await req.clone().blob()}catch{return null}
  }
  async function parseBlobJson(blob){
    if(!blob)return null;
    try{const txt=await blob.text();return txt?JSON.parse(txt):null}catch{return null}
  }
  async function patchCachedRest(item,payload){
    const table=tableFromUrl(item.url);if(!table)return;
    const id=idFilter(item.url);
    const rows=await all('cache').catch(()=>[]);
    for(const row of rows){
      if(row.user!==item.user||!row.url.includes('/rest/v1/'+table))continue;
      const current=await parseBlobJson(row.body);
      if(!Array.isArray(current))continue;
      let changed=false,next=current;
      if(item.method==='POST'){
        const inserts=Array.isArray(payload)?payload:[payload];
        for(const obj of inserts.filter(Boolean)){
          const key=obj?.id||obj?.code||obj?.email||'';
          const exists=key&&next.some(x=>String(x.id||x.code||x.email)===String(key));
          if(!exists){next=[obj,...next];changed=true}
        }
      }else if(item.method==='PATCH'&&id){
        next=next.map(x=>{if(String(x.id)===String(id)){changed=true;return {...x,...payload}}return x});
      }else if(item.method==='DELETE'&&id){
        const before=next.length;next=next.filter(x=>String(x.id)!==String(id));changed=next.length!==before;
      }
      if(changed){
        row.body=new Blob([JSON.stringify(next)],{type:'application/json'});row.updated_at=now();await put('cache',row);
      }
    }
  }
  async function queuedSynthetic(req,item){
    let payload=await parseBlobJson(item.body);
    const table=tableFromUrl(req.url);
    if(req.method==='POST'&&payload&&uuidTables.has(table)){
      const assign=o=>{if(o&&typeof o==='object'&&!o.id)o.id=crypto.randomUUID();return o};
      payload=Array.isArray(payload)?payload.map(assign):assign(payload);
      item.body=new Blob([JSON.stringify(payload)],{type:'application/json'});
      item.generated_payload=payload;
    }
    await patchCachedRest(item,payload);
    const accept=req.headers.get('accept')||'',prefer=req.headers.get('prefer')||'';
    let result={ok:true,offline:true,queued:true};
    if(/\/rest\/v1\//i.test(req.url)){
      if(req.method==='DELETE')result=/object\+json/i.test(accept)?{}:[];
      else if(/object\+json/i.test(accept))result=Array.isArray(payload)?(payload[0]||{}):(payload||{});
      else if(/return=representation/i.test(prefer))result=Array.isArray(payload)?payload:[payload||{}];
      else result=[];
    }else if(/\/storage\/v1\/object\//i.test(req.url)){
      result={Key:new URL(req.url).pathname.split('/object/')[1]||'',offline:true,queued:true};
    }
    return new Response(JSON.stringify(result),{status:200,headers:{'content-type':'application/json','x-thinkstore-offline':'queued'}});
  }
  async function queueRequest(req){
    const body=await bodyFromRequest(req);
    const item={url:req.url,method:req.method,headers:headersObj(req.headers),body,user:userKey(req),created_at:now(),attempts:0};
    const response=await queuedSynthetic(req,item);
    await tx('queue','readwrite',os=>os.add(item));
    await updateIndicator();
    window.dispatchEvent(new CustomEvent('thinkstore:offline-queued',{detail:{url:req.url,method:req.method}}));
    return response;
  }
  async function fetchOffline(input,init){
    let req;
    try{req=input instanceof Request?new Request(input,init):new Request(input,init)}catch{return NATIVE_FETCH(input,init)}
    if(req.method==='GET'||req.method==='HEAD'){
      if(navigator.onLine){
        try{
          const res=await NATIVE_FETCH(req.clone());
          if(res.ok&&isCacheable(req))cacheResponse(req,res);
          return res;
        }catch(e){
          const hit=isCacheable(req)?await cachedResponse(req):null;if(hit)return hit;throw e;
        }
      }
      const hit=isCacheable(req)?await cachedResponse(req):null;if(hit)return hit;
      return NATIVE_FETCH(req);
    }
    if(!isQueueable(req))return NATIVE_FETCH(req);
    if(navigator.onLine){
      try{return await NATIVE_FETCH(req.clone())}
      catch{return queueRequest(req)}
    }
    return queueRequest(req);
  }
  async function currentToken(){
    try{return tokenProvider?await tokenProvider():''}catch{return ''}
  }
  async function sync(){
    if(syncing||!navigator.onLine)return;
    syncing=true;await updateIndicator(true);
    try{
      const rows=(await all('queue').catch(()=>[])).sort((a,b)=>a.id-b.id);
      for(const item of rows){
        const headers=new Headers(item.headers||{});
        const token=await currentToken();if(token)headers.set('authorization','Bearer '+token);
        try{
          const res=await NATIVE_FETCH(item.url,{method:item.method,headers,body:['GET','HEAD'].includes(item.method)?undefined:item.body});
          if(res.ok){await del('queue',item.id);continue}
          if([401,403].includes(res.status))break;
          item.attempts=(item.attempts||0)+1;item.last_error='HTTP '+res.status;await put('queue',item);break;
        }catch(e){item.attempts=(item.attempts||0)+1;item.last_error=String(e?.message||e);await put('queue',item);break}
      }
    }finally{
      syncing=false;await updateIndicator();
      window.dispatchEvent(new CustomEvent('thinkstore:offline-sync'));
    }
  }
  function installUi(){
    if(document.getElementById('tsOfflineIndicator'))return;
    const el=document.createElement('div');el.id='tsOfflineIndicator';el.innerHTML='<span class="ts-offline-dot"></span><b></b><button type="button" hidden>Instalar</button>';
    const style=document.createElement('style');style.textContent=`
      #tsOfflineIndicator{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:99999;display:flex;align-items:center;gap:7px;background:rgba(20,20,23,.92);color:#fff;border:1px solid #ffffff22;border-radius:999px;padding:8px 11px;font:700 11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 10px 30px #0003;backdrop-filter:blur(18px);max-width:calc(100vw - 24px)}
      #tsOfflineIndicator.online{background:rgba(22,95,52,.92)}#tsOfflineIndicator.offline{background:rgba(122,72,0,.94)}#tsOfflineIndicator.syncing{background:rgba(24,76,131,.94)}
      #tsOfflineIndicator .ts-offline-dot{width:7px;height:7px;border-radius:50%;background:#6ee7a0}#tsOfflineIndicator.offline .ts-offline-dot{background:#ffbd59}#tsOfflineIndicator.syncing .ts-offline-dot{background:#7db8ff}
      #tsOfflineIndicator button{border:0;border-radius:999px;padding:4px 7px;background:#fff;color:#111;font:800 10px inherit}
      #tsOfflineIndicator.compact{width:30px;height:30px;padding:0;gap:0;justify-content:center;opacity:.82;cursor:pointer;transition:width .22s ease,padding .22s ease,opacity .22s ease,transform .22s ease}
      #tsOfflineIndicator.compact b,#tsOfflineIndicator.compact button{display:none!important}
      #tsOfflineIndicator.compact .ts-offline-dot{width:8px;height:8px;box-shadow:0 0 0 4px rgba(255,255,255,.08)}
      #tsOfflineIndicator.compact:hover{opacity:1;transform:scale(1.04)}
      @media(max-width:600px){#tsOfflineIndicator{left:10px;right:10px;bottom:max(8px,env(safe-area-inset-bottom));justify-content:center}#tsOfflineIndicator.compact{left:auto;right:max(10px,env(safe-area-inset-right));width:30px}}
    `;
    document.head.appendChild(style);document.body.appendChild(el);
    if(APP==='support')el.addEventListener('click',()=>{if(!el.classList.contains('compact'))return;el.classList.remove('compact');scheduleIndicatorCompact(3000)});
  }
  function scheduleIndicatorCompact(delay=2400){
    if(APP!=='support')return;
    clearTimeout(indicatorCompactTimer);
    indicatorCompactTimer=setTimeout(()=>{
      const el=document.getElementById('tsOfflineIndicator');
      if(el&&navigator.onLine&&!syncing&&el.classList.contains('online'))el.classList.add('compact');
    },delay);
  }
  async function queueCount(){return (await all('queue').catch(()=>[])).length}
  async function updateIndicator(isSync=false){
    if(!document.body)return;
    installUi();const el=document.getElementById('tsOfflineIndicator'),b=el?.querySelector('b');if(!el||!b)return;
    clearTimeout(indicatorCompactTimer);el.classList.remove('compact');
    const count=await queueCount();
    el.classList.remove('online','offline','syncing');
    if(isSync){el.classList.add('syncing');b.textContent='Sincronizando cambios…';return}
    if(!navigator.onLine){el.classList.add('offline');b.textContent=count?`Sin conexión · ${count} cambio${count===1?'':'s'} pendiente${count===1?'':'s'}`:'Sin conexión · modo local';}
    else if(count){el.classList.add('syncing');b.textContent=`Online · ${count} cambio${count===1?'':'s'} por sincronizar`;}
    else{el.classList.add('online');b.textContent='Online · sincronizado';scheduleIndicatorCompact();}
  }

  let installPrompt=null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;setTimeout(()=>{installUi();const btn=document.querySelector('#tsOfflineIndicator button');if(btn){btn.hidden=false;btn.onclick=async()=>{await installPrompt.prompt();installPrompt=null;btn.hidden=true}}},0)});
  window.addEventListener('online',()=>{lastOnline=true;updateIndicator();setTimeout(sync,500)});
  window.addEventListener('offline',()=>{lastOnline=false;updateIndicator()});
  document.addEventListener('DOMContentLoaded',()=>{updateIndicator();if(navigator.onLine)setTimeout(sync,1200)});

  window.ThinkStoreOffline={
    fetch:fetchOffline,
    nativeFetch:NATIVE_FETCH,
    sync,
    setTokenProvider(fn){tokenProvider=fn},
    pending:queueCount,
    status:updateIndicator,
    saveSnapshot:async(key,data)=>put('meta',{key:'snapshot:'+key,data,updated_at:now()}),
    loadSnapshot:async key=>(await get('meta','snapshot:'+key).catch(()=>null))?.data||null
  };
  window.fetch=fetchOffline;
})();
