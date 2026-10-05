/* ThinkStore V13.40 — conversion only, USD remains the base currency. */
(function(g){
'use strict';
const VES=/pago\s*m[oó]vil|punto\s*de\s*venta|^pos$|tarjeta/i;
const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
const ves=n=>new Intl.NumberFormat('es-VE',{style:'currency',currency:'VES'}).format(Number(n)||0);
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
let quote=null,pending=null;
function needsVES(method){return VES.test(String(method||''))}
async function refresh(force=false){
 if(!force&&quote&&Date.now()-quote.loaded<30*60*1000)return quote;
 if(pending)return pending;
 pending=fetch('/.netlify/functions/exchange-rate'+(force?'?refresh=1':''),{cache:'no-store'})
 .then(async r=>{const d=await r.json();if(!r.ok||!d.ok||!(Number(d.rate)>0))throw Error(d.error||'Tasa no disponible');quote={...d,loaded:Date.now()};return quote})
 .finally(()=>{pending=null});
 return pending;
}
function snapshot(amount){
 if(!quote||!(quote.rate>0))return null;
 return {total_usd:round(amount),total_ves:round(amount*quote.rate),rate:quote.rate,source:quote.source,source_date:quote.source_date,stale:!!quote.stale};
}
function render(element,amount,method){
 if(!element)return;
 const display=needsVES(method);
 element.hidden=!display;
 if(!display)return;
 const s=snapshot(amount);
 element.textContent=s?`${usd(s.total_usd)} × ${new Intl.NumberFormat('es-VE',{maximumFractionDigits:4}).format(s.rate)} = ${ves(s.total_ves)} · ${s.source} · ${new Date(s.source_date).toLocaleDateString('es-VE',{timeZone:'America/Caracas'})}${s.stale?' · Última tasa conocida':''}`:'Consultando tasa oficial BCV…';
}
function box(id,after){
 let el=document.getElementById(id);
 if(!el){el=document.createElement('div');el.id=id;el.className='ts-fx-quote';el.hidden=true;after?.insertAdjacentElement('afterend',el)}
 return el;
}
function setupStyles(){
 if(document.getElementById('ts-fx-style'))return;
 const s=document.createElement('style');s.id='ts-fx-style';
 s.textContent='.ts-fx-quote{margin:12px 0;padding:13px 15px;border:1px solid #dce1e8;border-radius:14px;background:#f5f7fa;color:#303642;font:500 13px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.ts-fx-quote[hidden]{display:none!important}.ts-fx-quote strong{font-weight:750}.ts-fx-error{color:#9a3412}.ts-fx-quote button{cursor:pointer;margin-left:8px;border:1px solid #d1d5db;border-radius:8px;background:white;padding:5px 9px}';
 document.head.appendChild(s);
}
async function show(element,amount,method){
 setupStyles();render(element,amount,method);
 if(!needsVES(method))return;
 try{await refresh();render(element,amount,method)}
 catch(e){element.textContent='No se pudo consultar la tasa. El monto en bolívares no está disponible.';element.classList.add('ts-fx-error')}
}
function init(){
 setupStyles();
 const payment=document.getElementById('paymentDetailsCard');
 if(payment){
  const el=box('tsFxCheckout',payment);
  const update=()=>{const list=(typeof g.tsCartItems==='function'?g.tsCartItems():[]);return show(el,(Array.isArray(list)?list:[]).reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||1),0),document.getElementById('payMethod')?.value)};
  document.getElementById('payMethod')?.addEventListener('change',update);
  g.addEventListener('ts:cart-updated',update);
  g.tsFxCheckoutUpdate=update;
  // The cart is mutable; refresh the quote on checkout opening, not on catalog rendering.
 }
 const sale=document.getElementById('salePayment');
 if(sale){
  const el=box('tsFxSale',document.getElementById('salePrice'));
  const update=()=>show(el,Number(document.getElementById('salePrice')?.value||0),sale.value);
  sale.addEventListener('change',update);
  document.getElementById('salePrice')?.addEventListener('input',update);
  g.tsFxSaleUpdate=update;
 }
}

function mountCalculator(id,parent){
 if(!parent)return;
 const existing=document.getElementById(id);
 if(existing)return existing;
 const section=document.createElement('section');
 section.className='ts-fx-quote';
 section.id=id;
 section.innerHTML='<strong>Conversión de cobro · BCV</strong><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px"><label style="flex:1;min-width:130px">Monto USD<input data-fx-amount type="number" min="0" step="0.01" placeholder="0.00" style="display:block;width:100%;box-sizing:border-box;margin-top:5px"></label><label style="flex:1;min-width:150px">Método de pago<select data-fx-method style="display:block;width:100%;box-sizing:border-box;margin-top:5px"><option value="USD">Dólares</option><option>Pago Móvil</option><option>Punto de venta</option><option>Zelle</option><option>Efectivo USD</option></select></label></div><div data-fx-result style="margin-top:10px" aria-live="polite"></div><small>Referencia de cobro; no confirma pagos ni cambia los precios guardados.</small>';
 parent.prepend(section);
 const amount=section.querySelector('[data-fx-amount]');
 const method=section.querySelector('[data-fx-method]');
 const result=section.querySelector('[data-fx-result]');
 const update=async()=>{if(!needsVES(method.value)){result.textContent=usd(amount.value);return}result.textContent='Consultando tasa…';try{await refresh();const s=snapshot(Number(amount.value||0));result.textContent=s?`${usd(s.total_usd)} × ${s.rate} = ${ves(s.total_ves)} · ${s.source} · ${new Date(s.source_date).toLocaleDateString('es-VE',{timeZone:'America/Caracas'})}`:'Tasa no disponible'}catch(e){result.textContent='Tasa no disponible. No se calculará un monto en bolívares.'}};
 amount.addEventListener('input',update);method.addEventListener('change',update);
 return section;
}

g.ThinkStoreFX={refresh,snapshot,show,needsVES,usd,ves,round,box,init,mountCalculator,get quote(){return quote}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
