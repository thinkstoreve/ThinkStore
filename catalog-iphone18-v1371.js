
(function(){
  'use strict';

  const baseRender=window.render;
  const modelOrder=[
    {id:'iphone-ultra',label:'iPhone Ultra'},
    {id:'iphone-18-pro',label:'iPhone 18 Pro'},
    {id:'iphone-18-pro-max',label:'iPhone 18 Pro Max'}
  ];
  const colorOrder=[
    {name:'Light Blue',img:'assets/iphone18/colors/iphone18-pro-max-light-blue.jpg',hex:'#8fb7e8'},
    {name:'Dark Cherry',img:'assets/iphone18/colors/iphone18-pro-max-dark-cherry.jpg',hex:'#8a2748'},
    {name:'Dark Gray',img:'assets/iphone18/colors/iphone18-pro-max-dark-gray.jpg',hex:'#414346'},
    {name:'Silver',img:'assets/iphone18/colors/iphone18-pro-max-silver.jpg',hex:'#cfd2d6'}
  ];

  let selectedModel='iphone-18-pro-max';

  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const safe=v=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const money=v=>{const n=Number(v||0);return n>0?'$'+n.toLocaleString('en-US',{maximumFractionDigits:2}):'Consultar'};

  function allProducts(){
    let live=[];
    try{ if(typeof tsCatalogProducts==='function') live=tsCatalogProducts()||[]; }catch(_){}
    let staticRows=[];
    try{ if(typeof PRODUCTS!=='undefined' && Array.isArray(PRODUCTS)) staticRows=PRODUCTS; }catch(_){}
    return {live,staticRows};
  }

  function findProduct(id){
    const {live,staticRows}=allProducts();
    const exact=live.find(p=>String(p.id)===id)||staticRows.find(p=>String(p.id)===id);
    if(exact)return exact;
    const label=modelOrder.find(x=>x.id===id)?.label||id;
    return live.find(p=>norm(p.name)===norm(label))||staticRows.find(p=>norm(p.name)===norm(label))||null;
  }

  function featureIcon(t){
    const n=norm(t);
    if(/a20|chip/.test(n))return'⌁';
    if(/camara|camera|48 mp/.test(n))return'◉';
    if(/pantalla|display|retina/.test(n))return'▣';
    if(/hora|bateria|reproduccion/.test(n))return'▯';
    if(/intelligence|siri|ia/.test(n))return'✦';
    return'✓';
  }

  function compactFeatures(p){
    const f=(p?.features||[]).slice();
    const wanted=[];
    const picks=[
      /a20|chip/i,
      /camara|camera|48 mp/i,
      /hora|bateria|reproduccion|autonomia/i,
      /pantalla|retina|display/i,
      /intelligence|siri|ia/i
    ];
    picks.forEach(rx=>{
      const hit=f.find(x=>rx.test(String(x)));
      if(hit&&!wanted.includes(hit))wanted.push(hit);
    });
    for(const x of f){if(wanted.length>=4)break;if(!wanted.includes(x))wanted.push(x)}
    return wanted.slice(0,4);
  }

  function productPrice(p){
    return Number(p?.price||p?.price_usd||0);
  }

  function colorCard(p,color){
    const id=safe(p?.id||selectedModel);
    const caps=(typeof getConfigs==='function'?getConfigs(p):(p?.storage||[]))||[];
    const specs=compactFeatures(p);
    const price=productPrice(p);
    return `<article class="ts71-color-card">
      <div class="ts71-color-media">
        <span class="ts71-new">Nuevo</span>
        <span class="ts71-fav" aria-hidden="true">♡</span>
        <img src="${esc(color.img)}" alt="${esc((p?.name||'iPhone')+' '+color.name)}" loading="lazy" decoding="async">
      </div>
      <div class="ts71-color-body">
        <h4>${esc(p?.name||modelOrder.find(x=>x.id===selectedModel)?.label||'iPhone')}</h4>
        <div class="ts71-color-name">${esc(color.name)}</div>
        <div class="ts71-capacities">${caps.slice(0,4).map(x=>`<span class="ts71-cap">${esc(x)}</span>`).join('')}</div>
        <div class="ts71-specs">${specs.map(x=>`<div class="ts71-spec"><i>${featureIcon(x)}</i><span>${esc(x)}</span></div>`).join('')}</div>
        <div class="ts71-price">
          <div><small>${price>0?'Desde':'Precio'}</small><strong>${money(price)}</strong></div>
          <span class="ts71-state">Pre-Order</span>
        </div>
        <div class="ts71-actions">
          <button class="primary" onclick="ts71OpenColor('${id}','${safe(color.name)}')">Ver detalles</button>
          <button onclick="ts71OpenColor('${id}','${safe(color.name)}')">Comprar</button>
        </div>
      </div>
    </article>`;
  }

  function showcase(){
    const p=findProduct(selectedModel)||findProduct('iphone-18-pro-max');
    const modelLabel=modelOrder.find(x=>x.id===selectedModel)?.label||p?.name||'iPhone';
    return `<section class="ts71-showcase">
      <div class="ts71-showcase-head">
        <div class="ts71-showcase-title">
          <h3>${esc(modelLabel)}</h3>
          <p>Selecciona modelo, color y capacidad. Las imágenes mantienen el fondo de cada color sin texto incrustado.</p>
        </div>
        <div class="ts71-model-tabs">
          ${modelOrder.map(m=>`<button class="ts71-model-tab ${m.id===selectedModel?'active':''}" onclick="ts71SelectModel('${m.id}')">${esc(m.label)}</button>`).join('')}
        </div>
      </div>
      <div class="ts71-color-grid">${colorOrder.map(c=>colorCard(p,c)).join('')}</div>
      <div class="ts71-color-strip">
        <b>Colores disponibles:</b>
        ${colorOrder.map(c=>`<span class="ts71-color-choice"><i class="ts71-dot" style="background:${c.hex}"></i>${esc(c.name)}</span>`).join('')}
        <span class="ts71-color-choice" style="margin-left:auto;color:#6e6e73">Encuentra el color que va contigo.</span>
      </div>
    </section>`;
  }

  function enhancedRender(){
    const grid=document.getElementById('grid');
    if(!grid){ if(typeof baseRender==='function')baseRender(); return; }

    // First preserve the V13.68 catalog output. This is wrapped below; no bubbles/highlights are touched.
    if(typeof baseRender==='function')baseRender();
    const original=grid.innerHTML;
    const current=(typeof activeCat!=='undefined'?activeCat:'Todos');
    const q=String(document.getElementById('search')?.value||'').trim();

    // Show the iPhone 18 presentation on the main catalog and iPhone searches.
    const show=current==='Todos'||current==='iPhone'||/iphone\s*(18|ultra|pro)/i.test(q);
    if(!show){
      grid.classList.remove('ts71-has-showcase');
      return;
    }

    grid.classList.add('ts71-has-showcase');
    grid.innerHTML=showcase()+`<div class="ts71-original-title">Catálogo completo</div><div class="ts71-original-grid">${original}</div>`;
  }

  window.ts71SelectModel=function(id){
    if(modelOrder.some(x=>x.id===id))selectedModel=id;
    enhancedRender();
    document.querySelector('.ts71-showcase')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  };

  window.ts71OpenColor=function(id,color){
    if(typeof openProduct==='function')openProduct(id);
    setTimeout(()=>{
      try{ if(typeof setColor==='function')setColor(color); }catch(_){}
    },80);
  };

  window.render=enhancedRender;
  try{globalThis.render=enhancedRender}catch(_){}

  document.addEventListener('DOMContentLoaded',()=>setTimeout(enhancedRender,80));
  window.addEventListener('load',()=>setTimeout(enhancedRender,160));
  let n=0;const timer=setInterval(()=>{enhancedRender();if(++n>=4)clearInterval(timer)},1100);
})();
