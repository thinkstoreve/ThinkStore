(function(){
  const INVENTORY_VERSION='3.2.32';
  const CANONICAL_ORIGIN=location.origin;
  window.TS_CANONICAL_ORIGIN=CANONICAL_ORIGIN;
  const isLocal=/^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
  if(location.protocol!=='file:'&&!isLocal&&location.origin!==CANONICAL_ORIGIN){
    location.replace(CANONICAL_ORIGIN+location.pathname+location.search+location.hash);
    return;
  }
  const resetKey='tsi_cache_reset_3_2_18';
  async function resetOldRuntimeOnce(){
    if(location.protocol==='file:'||sessionStorage.getItem(resetKey)==='1')return false;
    sessionStorage.setItem(resetKey,'1');
    try{
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r=>r.unregister()));
      }
      if('caches' in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>/^thinkstore-inventory-/i.test(k)).map(k=>caches.delete(k)));
      }
      const u=new URL(location.href);u.searchParams.set('_inventory_v',INVENTORY_VERSION);
      location.replace(u.toString());
      return true;
    }catch(e){console.warn('Inventory runtime reset',e);return false;}
  }
  const app=document.getElementById('app');
  let started=false;
  if(app)app.innerHTML=`<div style="min-height:100vh;display:grid;place-items:center;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"><div style="text-align:center;color:#111"><img src="./icons/thinkstore-logo.png" alt="ThinkStore" style="width:74px;height:74px;border-radius:18px;margin-bottom:18px"><div style="font-size:18px;font-weight:750">ThinkStore Inventory</div><div style="margin-top:8px;color:#777;font-size:14px">Abriendo inventario…</div></div></div>`;

  function showFatal(title,detail){
    if(started)return;
    if(!app)return;
    app.innerHTML=`<div style="min-height:100vh;display:grid;place-items:center;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px"><div style="max-width:620px;background:#fff;border:1px solid #ddd;border-radius:24px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.08)"><h1 style="margin:0 0 14px;font-size:28px">ThinkStore Inventory</h1><p style="font-size:18px;margin:0 0 12px"><b>${title}</b></p><p style="color:#666;line-height:1.55;margin:0 0 18px">${String(detail||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</p><button onclick="location.reload()" style="border:0;border-radius:12px;background:#111;color:#fff;padding:12px 18px;font-weight:700;cursor:pointer">Reintentar</button><p style="color:#888;font-size:13px;margin:16px 0 0">Si continúa, usa una recarga forzada: Cmd+Shift+R en Mac o Ctrl+Shift+R en Windows.</p></div></div>`;
  }
  window.addEventListener('error',e=>{ if(!started) showFatal('La aplicación no pudo iniciar.', e.message||'Error de JavaScript durante el arranque.'); });
  window.addEventListener('unhandledrejection',e=>{ if(!started) showFatal('La aplicación no pudo iniciar.', e.reason?.message||String(e.reason||'Error inesperado.')); });
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo cargar '+src));document.head.appendChild(s)})}
  async function boot(){
    if(await resetOldRuntimeOnce())return;
    const cdns=[
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
      'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js'
    ];
    let ok=!!window.supabase;
    for(const src of cdns){if(ok)break;try{await loadScript(src);ok=!!window.supabase}catch{}}
    if(!ok){showFatal('No pude cargar el cliente de Supabase.','Revisa tu conexión a Internet y vuelve a intentarlo.');return}
    try{await loadScript('./app.js?v=3.2.32');started=true}catch(err){showFatal('No pude cargar ThinkStore Inventory.',err.message)}
  }
  setTimeout(()=>{if(!started && !document.querySelector('.login-shell,.app-shell')) showFatal('El arranque está tardando demasiado.','La aplicación no respondió. Pulsa Reintentar.')},7000);
  boot();
})();
