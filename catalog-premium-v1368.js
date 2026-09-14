
(function(){
  'use strict';
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const safeId=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const money=v=>{const n=Number(v||0);return n>0?'$'+n.toLocaleString('en-US',{maximumFractionDigits:2}):'Consultar'};
  function swatch(name){
    const n=norm(name);
    if(/borgo|vino|wine|burgu/.test(n))return'#8d2948';
    if(/glac|azul claro|light blue/.test(n))return'#a9cef4';
    if(/azul|blue/.test(n))return'#6f9fd3';
    if(/plata|silver|blanco|white/.test(n))return'#e6e7ea';
    if(/negro|black|espacial/.test(n))return'#202225';
    if(/natural/.test(n))return'#c9c1b6';
    if(/desierto|desert/.test(n))return'#d8b59c';
    if(/grafito|graphite|gris|gray/.test(n))return'#666a70';
    if(/verde|green/.test(n))return'#9cc8b0';
    if(/rosa|pink/.test(n))return'#e9b6c8';
    if(/rojo|red/.test(n))return'#c8424d';
    if(/purp|morado|violet/.test(n))return'#9c88d4';
    return'#d6d8dd';
  }
  function icon(t){const n=norm(t);if(/chip|a20|m[1-9]/.test(n))return'⌁';if(/camara|camera|mp/.test(n))return'◉';if(/bateria|hora|reproduccion|autonomia/.test(n))return'▯';if(/pantalla|display|retina|oled/.test(n))return'▣';if(/intelligence|siri|ia/.test(n))return'✦';return'✓'}
  function card(p){
    const colors=Object.keys(p.colors||{});
    const configs=(typeof getConfigs==='function'?getConfigs(p):(p.storage||[]))||[];
    const features=(p.features||[]).slice(0,3);
    const cat=typeof getCat==='function'?getCat(p):(p.category||'Apple');
    const stock=Number(p.inventory_available||0);
    const pre=/pre.?order/i.test(String(p.badge||''))||stock<=0;
    const pid=safeId(p.id);
    const main=typeof asset==='function'?asset(p.main):('assets/'+String(p.main||''));
    return `<article class="tsc-card">
      <div class="tsc-media" role="button" tabindex="0" onclick="openProduct('${pid}')" onkeydown="if(event.key==='Enter')openProduct('${pid}')">
        <span class="tsc-badge ${pre?'preorder':''}">${esc(p.badge||cat)}</span>
        <span class="tsc-heart">♡</span>
        <img loading="lazy" decoding="async" src="${esc(main)}" alt="${esc(p.name)}">
      </div>
      <div class="tsc-body">
        <div class="tsc-colors">${colors.slice(0,5).map(c=>`<span class="tsc-swatch" title="${esc(c)}" style="background:${swatch(c)}"></span>`).join('')}${colors.length>5?`<span class="tsc-more">+${colors.length-5}</span>`:''}</div>
        <h3 class="tsc-name">${esc(p.name)}</h3>
        <p class="tsc-family">${esc(p.family||p.model||cat)}</p>
        <div class="tsc-capacities">${configs.slice(0,4).map(c=>`<span class="tsc-chip">${esc(c)}</span>`).join('')}</div>
        <div class="tsc-features">${features.map(f=>`<div class="tsc-feature"><i>${icon(f)}</i><span>${esc(f)}</span></div>`).join('')}</div>
        <div class="tsc-price-line">
          <div class="tsc-price"><small>${Number(p.price||0)>0?'Desde':'Precio'}</small><strong>${money(p.price)}</strong></div>
          <span class="tsc-stock ${pre?'preorder':''}">${stock>0?`${stock} en stock`:'Pre-Order'}</span>
        </div>
        <div class="tsc-actions">
          <button class="tsc-btn primary" type="button" onclick="openProduct('${pid}')">Ver detalles</button>
          <button class="tsc-btn" type="button" onclick="openProduct('${pid}')">Comprar</button>
        </div>
      </div>
    </article>`;
  }
  function premiumRender(){
    const grid=document.getElementById('grid'); if(!grid)return;
    const q=String(document.getElementById('search')?.value||'').toLowerCase();
    const products=(typeof tsCatalogProducts==='function'?tsCatalogProducts():[]).filter(p=>{
      const cat=typeof getCat==='function'?getCat(p):(p.category||'');
      const cfg=(typeof getConfigs==='function'?getConfigs(p):(p.storage||[]))||[];
      const text=`${p.name||''} ${p.desc||''} ${cat} ${p.family||''} ${Object.keys(p.colors||{}).join(' ')} ${cfg.join(' ')}`.toLowerCase();
      const current=typeof activeCat!=='undefined'?activeCat:'Todos';
      return (current==='Todos'||cat===current||p.family===current)&&text.includes(q);
    });
    grid.classList.add('ts-catalog-grid-v1368');
    grid.innerHTML=products.length?products.map(card).join(''):'<div class="tsc-empty">No encontré productos con esa búsqueda.</div>';
  }
  window.render=premiumRender;
  try{globalThis.render=premiumRender}catch(_){}
  document.addEventListener('DOMContentLoaded',()=>setTimeout(premiumRender,40));
  window.addEventListener('load',()=>setTimeout(premiumRender,120));
  let passes=0;const t=setInterval(()=>{premiumRender();if(++passes>=4)clearInterval(t)},900);
})();
