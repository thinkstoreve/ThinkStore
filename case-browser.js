(function(root){
 'use strict';
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const model=v=>String(v||'').split(/\s*·\s*/)[0].trim();
 const style=v=>{
  if(v.style)return String(v.style).trim();
  const n=norm(v.name);
  if(/silicon/.test(n))return 'Silicona';
  if(/transparente|clear/.test(n))return 'Transparente';
  if(/cuero|leather/.test(n))return 'Cuero';
  if(/techwoven|tejid/.test(n))return 'Tejido';
  if(/rugged|reforzad/.test(n))return 'Reforzado';
  return String(v.name||'Clásico').trim();
 };
 const unique=values=>[...new Map(values.filter(Boolean).map(x=>[norm(x),x])).values()].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
 function normalize(rows){return rows.filter(v=>v.sku).map(v=>({...v,model:model(v.model)||'Consultar modelo',style:style(v),color:String(v.color||'Único').trim()}));}
 function choose(rows,want={},axis){
  let pool=rows;
  for(const key of (axis==='color'?['model','color','style']:['model','style','color'])){
   const matches=pool.filter(v=>norm(v[key])===norm(want[key]));
   if(matches.length)pool=matches;else if(axis===key)return null;
  }
  return pool.find(v=>v.available>0)||pool[0]||null;
 }
 const api={norm,model,style,unique,normalize,choose};root.TSCaseOptions=api;
 if(typeof module!=='undefined')module.exports=api;
 if(typeof document==='undefined')return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>v>0?'$'+Number(v).toLocaleString('es-VE'):'Consultar';
 const catalog=()=>typeof productsV2==='function'?productsV2():[];
 const all=()=>normalize(catalog().flatMap(p=>p.case_variants||[]));
 let current=null,collectionCurrent=null;
 function imageFor(v){return v.image||(/silicon/.test(norm(v.style||v.name))?'silicone-case-poster.jpg':tsCatalogFallbackImage('Accesorios',v.name));}
 function colorHex(label){const n=norm(label),map={"Medianoche":"#344350","Guayaba brillante":"#fa6d7e","Neblina púrpura":"#746d88","Terracota":"#b46b49","Vainilla":"#fff1da","Azul ancla":"#607580","Lavanda eléctrica":"#ce87bd","Musgo claro":"#929d70","Amarillo neón":"#e8f47c","Púrpura":"#685775","Siena":"#b77543","Rosa suave":"#f4dedd","Transparente":"linear-gradient(135deg,#fff,#e6edf3)","Borgoña":"#8d2948",negro:'#222326',blanco:'#f4f4f0',gris:'#99999e',azul:'#527da9',celeste:'#9fc8dc',verde:'#789780',rosa:'#d7a4b1',fucsia:'#c45287',rojo:'#b74343',morado:'#80678e',naranja:'#d97b42',amarillo:'#e2ca68',beige:'#d6c8b7',borgona:'#8d2948'};if(n.includes('transparente'))return '#edf1f5';if(n==='azul marino')return '#273a59';if(n==='verde oliva')return '#7b7d4d';return Object.entries(map).find(([key])=>norm(key)===n)?.[1]||'#b6b8bd';}
 function picker(box,selected,onChange){
  const rows=all().filter(v=>String(v.parent_id)===String(selected.parent_id)),models=unique(rows.map(v=>v.model));
  const byModel=rows.filter(v=>norm(v.model)===norm(selected.model));
  const styles=unique(byModel.map(v=>v.style));
  const byStyle=byModel.filter(v=>norm(v.style)===norm(selected.style));
  const colors=unique(byModel.map(v=>v.color));
  box.innerHTML=`<div class="ts-case-options"><label>Modelo<select data-case-model aria-label="Modelo del case">${models.map(m=>`<option ${norm(m)===norm(selected.model)?'selected':''}>${esc(m)}</option>`).join('')}</select></label><fieldset><legend>Estilo: <b>${esc(selected.style)}</b></legend><div class="ts-case-styles">${styles.map(s=>`<button type="button" data-case-style="${esc(s)}" aria-pressed="${norm(s)===norm(selected.style)}">${esc(s)}</button>`).join('')}</div></fieldset><fieldset><legend>Color: <b>${esc(selected.color)}</b></legend><div class="ts-case-colors">${colors.map(c=>{const available=byModel.some(v=>norm(v.color)===norm(c)&&v.available>0);return `<button type="button" data-case-color="${esc(c)}" title="${esc(c)}${available?'':' · bajo pedido'}" aria-label="${esc(c)}${available?'':' · bajo pedido'}" aria-pressed="${norm(c)===norm(selected.color)}" class="${available?'':'is-unavailable'}"><i style="background:${colorHex(c)}" aria-hidden="true"></i><span>${esc(c)}</span></button>`;}).join('')}</div></fieldset></div>`;
  box.querySelector('[data-case-model]').onchange=e=>onChange(choose(rows,{...selected,model:e.target.value},'model'));
  box.querySelectorAll('[data-case-style]').forEach(b=>b.onclick=()=>onChange(choose(rows,{...selected,style:b.dataset.caseStyle},'style')));
  box.querySelectorAll('[data-case-color]').forEach(b=>b.onclick=()=>onChange(choose(rows,{...selected,color:b.dataset.caseColor},'color')));
 }
 function select(v){
  if(!v)return;
  const parent=catalog().find(p=>String(p.id)===String(v.parent_id));if(!parent)return;
  current=v;
  const img=imageFor(v),gallery=v.images?.length?v.images:[img];
  selectedProduct={...parent,main:img,gallery,colors:{[v.color]:img},model:v.model,family:v.model,price:v.price,video_url:v.video||'',case_variant_sku:v.sku,case_selection:v,image_reference:!v.image};
  selectedColor=v.color;selectedCondition=v.available>0?v.condition:'Pre-Order';selectedGallery=img;
  selectedConfig={Modelo:v.model,Estilo:v.style};
  drawDetail();
  if(typeof window.tsRefreshConditionState==='function')window.tsRefreshConditionState();
 }
 const originalOpen=window.openProduct;
 window.openProduct=function(id){
  const p=catalog().find(p=>String(p.id)===String(id));
  const result=originalOpen?originalOpen(id):false;
  if(p?.case_variants?.length){const candidates=all().filter(v=>String(v.parent_id)===String(p.id));select(choose(candidates,current||{}));}
  return result;
 };
 window.openProductFromV2=id=>window.openProduct(id);
 const originalDraw=window.drawDetail;
 window.drawDetail=function(){
  const p=typeof selectedProduct!=='undefined'?selectedProduct:null;
  const modal=document.getElementById('modal');if(modal)modal.classList.toggle('ts-case-detail',!!p?.case_selection);
  const result=originalDraw.apply(this,arguments);
  document.querySelectorAll('#colors').forEach(el=>Array.from(el.parentElement.children).filter(child=>child.tagName==='LABEL').forEach(label=>{label.style.display=p?.case_selection?'none':'';}));
  let options=document.getElementById('tsCaseDetailOptions');
  if(!p?.case_selection){options?.remove();return result;}
  if(!options){options=document.createElement('div');options.id='tsCaseDetailOptions';document.getElementById('colors').before(options);}
  picker(options,p.case_selection,select);
  const name=document.getElementById('pname');if(name)name.textContent=p.name;
  const desc=document.getElementById('pdesc');if(desc)desc.textContent=[p.case_selection.model,p.case_selection.style,p.case_selection.color].join(' · ')+(p.image_reference?' · Imagen referencial':'');
  return result;
 };
 function renderCollection(){
  const modal=document.getElementById('categoryModalV2'),box=document.getElementById('categoryModalV2Products');
  if(!modal?.classList.contains('open')||modal.dataset.collection!=='silicone-cases'||!box)return;
  const rows=all().filter(v=>/silicon/.test(norm(v.style||v.name))&&(!v.type||v.type==='Cases para iPhone'));if(!rows.length){box.innerHTML='<p class="ts-v2-empty">Cargando cases publicados…</p>';return;}
  const selection=choose(rows,collectionCurrent||{style:'Silicona'});if(!selection)return;collectionCurrent=selection;
  document.getElementById('categoryModalV2Title').textContent='Encuentra tu case';
  document.getElementById('categoryModalV2Desc').textContent='Elige tu modelo, estilo y color.';
  const p=catalog().find(p=>String(p.id)===String(selection.parent_id));
  box.innerHTML=`<article class="ts-case-shop"><div class="ts-case-photo"><img src="${esc(asset(imageFor(selection)))}" alt="${esc(selection.name+' · '+selection.model+' · '+selection.color)}">${!selection.image?'<small>Imagen referencial</small>':''}</div><div class="ts-case-summary"><span class="ts-case-eyebrow">Cases para iPhone</span><h3>${esc(p?.name||selection.name)}</h3><div id="tsCaseCollectionOptions"></div><strong class="ts-case-price">${money(selection.price)}</strong><p class="ts-case-stock">${selection.available>0?'Disponible · '+selection.available+' unidades':'Disponible bajo pedido'}</p><button type="button" class="btn" data-case-open>Ver producto</button></div></article>`;
  picker(box.querySelector('#tsCaseCollectionOptions'),selection,v=>{collectionCurrent=v;renderCollection();});
  box.querySelector('[data-case-open]').onclick=()=>{window.openProduct(selection.parent_id);select(selection);};
 }
 window.tsRenderSiliconeCollection=renderCollection;window.tsSelectCaseVariant=select;

 window.addEventListener('load',()=>{if(new URLSearchParams(location.search).get('coleccion')==='silicone-cases')renderCollection();});
})(typeof window!=='undefined'?window:globalThis);
