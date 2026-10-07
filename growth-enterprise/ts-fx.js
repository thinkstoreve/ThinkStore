/* ThinkStore V14.78 — BCV oficial con vigencia, refresco automático y cobros seguros. */
(function(g){
'use strict';
const VES=/pago\s*m[oó]vil|punto\s*de\s*venta|^pos$|tarjeta/i;
const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
const ves=n=>new Intl.NumberFormat('es-VE',{style:'currency',currency:'VES'}).format(Number(n)||0);
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const period=60000;
let quote=null,pending=null;
const needsVES=method=>VES.test(String(method||''));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const trusted=()=>!!(quote&&quote.rate>0&&!quote.stale&&Date.now()-quote.loaded<2*period&&quote.effective_date<=today());
function snapshot(amount){
  if(!quote||!(quote.rate>0))return null;
  return{total_usd:round(amount),total_ves:round(amount*quote.rate),rate:quote.rate,source:quote.source,source_date:quote.source_date,effective_date:quote.effective_date,checked_at:quote.checked_at,stale:!trusted()};
}
function displayDate(effective){
  if(!effective)return 'Fecha BCV no disponible';
  const [y,m,d]=effective.split('-');return `${d}/${m}/${y}`;
}
function rateLabel(){
  const snapshotQuote=snapshot(1);
  if(!snapshotQuote)return 'BCV no disponible';
  return `1 USD = ${new Intl.NumberFormat('es-VE',{minimumFractionDigits:2,maximumFractionDigits:4}).format(snapshotQuote.rate)} Bs`;
}
function renderBadge(){
  for(const el of document.querySelectorAll('[data-ts-fx-rate]')){
    el.textContent=rateLabel();
    el.closest('[data-ts-bcv]')?.classList.toggle('ts-bcv-stale',!trusted());
  }
  for(const el of document.querySelectorAll('[data-ts-fx-date]')){
    el.textContent=quote?`${trusted()?'Vigente':'Sin verificar'} · ${displayDate(quote.effective_date)}`:'Esperando cotización…';
  }
}
function broadcast(){
  renderBadge();
  g.dispatchEvent(new CustomEvent('thinkstore:fx-updated',{detail:{quote:snapshot(1),available:trusted()}}));
}
async function refresh(force=false){
  if(!force&&trusted()&&Date.now()-quote.loaded<55000)return quote;
  if(pending)return pending;
  pending=fetch('/.netlify/functions/exchange-rate'+(force?'?refresh=1':''),{cache:'no-store'})
   .then(async r=>{const d=await r.json();if(!r.ok||!d.ok||!(Number(d.rate)>0))throw Error(d.error||'Tasa BCV no disponible');
     quote={...d,loaded:Date.now()};broadcast();return quote})
   .catch(e=>{if(quote){quote={...quote,stale:true};broadcast()}throw e})
   .finally(()=>{pending=null});
  return pending;
}
async function requireFresh(){
  await refresh(true);
  if(!trusted())throw Error('La tasa BCV no está verificada. Intenta nuevamente antes de cobrar en Bs.');
  return quote;
}
function status(s){return s?.stale?' · ⚠ Tasa no verificada; no cobrar en Bs.':''}
function render(element,amount,method){
  if(!element)return;
  const display=needsVES(method);element.hidden=!display;
  if(!display)return;
  const s=snapshot(amount);
  element.textContent=s?`${usd(s.total_usd)} × ${new Intl.NumberFormat('es-VE',{maximumFractionDigits:4}).format(s.rate)} = ${ves(s.total_ves)} · ${s.source} · Vigente ${displayDate(s.effective_date)}${status(s)}`:'Consultando tasa BCV vigente…';
}
function box(id,after){let el=document.getElementById(id);if(!el){el=document.createElement('div');el.id=id;el.className='ts-fx-quote';el.hidden=true;after?.insertAdjacentElement('afterend',el)}return el}
function setupStyles(){
  if(document.getElementById('ts-fx-style'))return;
  const s=document.createElement('style');s.id='ts-fx-style';
  s.textContent='.ts-fx-quote{margin:12px 0;padding:13px 15px;border:1px solid #dce1e8;border-radius:14px;background:#f5f7fa;color:#303642;font:500 13px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.ts-fx-quote[hidden]{display:none!important}.ts-fx-error{color:#9a3412}.ts-fx-quote button{cursor:pointer;margin-left:8px;border:1px solid #d1d5db;border-radius:8px;background:white;padding:5px 9px}.ts-bcv-stale{color:#b45309!important}';
  document.head.appendChild(s);
}
async function show(element,amount,method){
  setupStyles();render(element,amount,method);
  if(!needsVES(method))return;
  try{await refresh();render(element,amount,method);element.classList.remove('ts-fx-error')}
  catch(e){render(element,amount,method);element.classList.add('ts-fx-error');if(!quote)element.textContent='No se puede verificar la tasa BCV. No cobrar en bolívares.'}
}
function init(){
  setupStyles();renderBadge();
  const payment=document.getElementById('paymentDetailsCard');
  if(payment){const el=box('tsFxCheckout',payment);
    const update=()=>{const list=(typeof g.tsCartItems==='function'?g.tsCartItems():[]);return show(el,(Array.isArray(list)?list:[]).reduce((sum,i)=>sum+Number(i.price||0)*Number(i.qty||1),0),document.getElementById('payMethod')?.value)};
    document.getElementById('payMethod')?.addEventListener('change',update);
    g.addEventListener('ts:cart-updated',update);
    g.addEventListener('thinkstore:fx-updated',()=>render(el,(typeof g.tsCartItems==='function'?g.tsCartItems():[]).reduce((sum,i)=>sum+Number(i.price||0)*Number(i.qty||1),0),document.getElementById('payMethod')?.value));
    g.tsFxCheckoutUpdate=update;
  }
  const sale=document.getElementById('salePayment');
  if(sale){const el=box('tsFxSale',document.getElementById('salePrice'));const update=()=>show(el,Number(document.getElementById('salePrice')?.value||0),sale.value);
    sale.addEventListener('change',update);document.getElementById('salePrice')?.addEventListener('input',update);
    g.addEventListener('thinkstore:fx-updated',()=>render(el,Number(document.getElementById('salePrice')?.value||0),sale.value));g.tsFxSaleUpdate=update;
  }
  // One poll per active tab, immediately on return. Changes are reflected in every subscriber.
  refresh().catch(()=>renderBadge());
  setInterval(()=>{if(!document.hidden)refresh(true).catch(()=>renderBadge())},period);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true).catch(()=>renderBadge())});
  g.addEventListener('online',()=>refresh(true).catch(()=>renderBadge()));
}
function mountCalculator(id,parent){
  if(!parent)return;const existing=document.getElementById(id);if(existing)return existing;
  const section=document.createElement('section');section.className='ts-fx-quote';section.id=id;
  section.innerHTML='<strong>Conversión de cobro · BCV</strong><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px"><label style="flex:1;min-width:130px">Monto USD<input data-fx-amount type="number" min="0" step="0.01" placeholder="0.00" style="display:block;width:100%;box-sizing:border-box;margin-top:5px"></label><label style="flex:1;min-width:150px">Método de pago<select data-fx-method style="display:block;width:100%;box-sizing:border-box;margin-top:5px"><option value="USD">Dólares</option><option>Pago Móvil</option><option>Punto de venta</option><option>Zelle</option><option>Efectivo USD</option></select></label></div><div data-fx-result style="margin-top:10px" aria-live="polite"></div><small>La tasa y el monto se actualizan automáticamente. Solo se aplican a cobros nuevos.</small>';
  parent.prepend(section);const amount=section.querySelector('[data-fx-amount]'),method=section.querySelector('[data-fx-method]'),result=section.querySelector('[data-fx-result]');
  const renderCalc=()=>{if(!needsVES(method.value)){result.textContent=usd(amount.value);return}const s=snapshot(Number(amount.value||0));result.textContent=s?`${usd(s.total_usd)} × ${s.rate} = ${ves(s.total_ves)} · Vigente ${displayDate(s.effective_date)}${status(s)}`:'Consultando tasa BCV…'};
  const update=async()=>{renderCalc();if(needsVES(method.value))try{await refresh();renderCalc()}catch{renderCalc()}};
  amount.addEventListener('input',update);method.addEventListener('change',update);g.addEventListener('thinkstore:fx-updated',renderCalc);
  return section;
}
g.ThinkStoreFX={refresh,requireFresh,snapshot,show,needsVES,usd,ves,round,box,init,mountCalculator,get quote(){return quote},get verified(){return trusted()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
