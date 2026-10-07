/* ThinkStore V14.90 — App Ventas · Reparaciones (interfaz clásica restaurada). */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const usd=v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const ves=v=>'Bs. '+Number(v||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt=(v,o)=>String(o?.quote_currency||'USD').toUpperCase()==='USD'?usd(v):ves(v);
const date=v=>{try{return v?new Date(v).toLocaleString('es-VE',{timeZone:'America/Caracas',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}catch{return '—'}};
const METHODS=['Efectivo USD','Efectivo Bs','Pago Móvil','Zelle','Transferencia USD','Transferencia Bs','Punto de venta Bs','EUR','USDT','Otro'];
const IS_BS=new Set(['Efectivo Bs','Pago Móvil','Transferencia Bs','Punto de venta Bs']);
const CUSTOM_EQ=new Set(['EUR','Otro']);
const NEEDS_REF=new Set(['Pago Móvil','Zelle','Transferencia USD','Transferencia Bs','Punto de venta Bs','USDT']);
let getToken=null,orders=[],active=null,events=[],parts=[],filter='pending',query='',loading=false,initialized=false,user=null,selectedMethod='Efectivo USD';
const account=o=>{const budget=round(o?.quote_amount||0),paid=round(o?.amount_paid||0),pending=Math.max(0,round(budget-paid)),canceled=/cancel|rechaz|no aprobado/i.test(String(o?.status||''));return{budget,paid,pending,canceled,paidOff:budget>0&&pending<=0&&!canceled,partial:paid>0&&pending>0}};
const setText=(id,value)=>{if($(id))$(id).textContent=value};
function notice(msg){const el=$('repairsNotice');if(!el)return;el.textContent=msg||'';el.classList.toggle('hidden',!msg)}
async function api(method='GET',payload=null,query=''){
  const token=await getToken?.();if(!token)throw Error('Tu sesión de Staff expiró. Vuelve a iniciar sesión.');
  const url='/.netlify/functions/staff-repairs'+query;
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),25000);
  try{const res=await fetch(url,{method,headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{}),cache:'no-store',signal:ctrl.signal});const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok)throw Error(data.error||`Error de Soporte (${res.status})`);return data}
  catch(e){if(e.name==='AbortError')throw Error('Soporte tardó demasiado en responder. Reintenta la consulta; no repitas un cobro sin comprobar el saldo.');throw e}finally{clearTimeout(timer)}
}
function summaries(){
  const viable=orders.filter(o=>!account(o).canceled&&String(o.quote_currency||'USD').toUpperCase()==='USD');
  const due=viable.filter(o=>account(o).pending>0),paid=viable.filter(o=>account(o).paidOff),partial=viable.filter(o=>account(o).partial);
  setText('repairsPendingTotal',usd(due.reduce((n,o)=>n+account(o).pending,0)));setText('repairsPendingCount',`${due.length} órdenes`);
  setText('repairsPartialTotal',usd(partial.reduce((n,o)=>n+account(o).paid,0)));setText('repairsPartialCount',`${partial.length} con abono`);
  setText('repairsPaidTotal',usd(paid.reduce((n,o)=>n+account(o).paid,0)));setText('repairsPaidCount',`${paid.length} cobradas`);setText('repairsAllCount',orders.length);
}
function row(o){
  const a=account(o),paid=a.paidOff;
  const status=paid?'Cobrado':a.partial?'Abono parcial':a.canceled?'Cancelado':'Pendiente';
  const amount=paid?`Total ${fmt(a.paid,o)}`:a.budget>0?`Saldo ${fmt(a.pending,o)}`:'Sin presupuesto';
  return `<article class="sale-row repair-classic-row" data-repair-row="${esc(o.id)}">
    <div class="sale-main"><b>${esc(o.code||'Sin código')}</b><span>${esc(o.client_name||'Sin cliente')} · ${date(o.created_at)}</span></div>
    <div class="sale-detail"><b>${esc(o.device_model||'Equipo sin modelo')}</b><span>${esc(o.status||'Sin estado')} · ${esc(o.serial_imei||'Sin serial')}</span></div>
    <div class="repair-classic-end"><div><b>${esc(amount)}</b><span class="sale-status ${paid?'repair-paid':a.partial?'repair-partial':''}">${esc(status)}</span></div><button class="text-action" data-repair-open="${esc(o.id)}" type="button">${paid?'Ver':'Cobrar'} →</button></div>
  </article>`;
}
function render(){
  summaries();const term=query.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const visible=orders.filter(o=>{const a=account(o);if(filter==='pending'&&(a.pending<=0||a.canceled))return false;if(filter==='paid'&&!a.paidOff)return false;const hay=[o.code,o.client_name,o.client_phone,o.device_model,o.serial_imei,o.status].join(' ').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');return !term||hay.includes(term)});
  $('repairsList').innerHTML=visible.length?visible.map(row).join(''):'<div class="empty-state">No hay reparaciones que coincidan con este filtro.</div>';
  document.querySelectorAll('[data-repair-filter]').forEach(b=>b.classList.toggle('active',b.dataset.repairFilter===filter));
}
async function load(force=false){
  if(loading)return;if(!getToken)return notice('Inicia sesión en Staff para consultar reparaciones.');if(initialized&&!force){render();return}
  loading=true;notice('Consultando reparaciones…');if($('repairsRefresh'))$('repairsRefresh').disabled=true;
  try{const d=await api('GET');orders=d.orders||[];initialized=true;render();const foreign=orders.filter(o=>String(o.quote_currency||'USD').toUpperCase()!=='USD').length;notice([d.partial?'Se muestra el historial más reciente.':'',foreign?`${foreign} cotización(es) en otra moneda requieren revisión desde Soporte.`:''].filter(Boolean).join(' '))}
  catch(e){notice(e.message);if(!initialized)$('repairsList').innerHTML='<div class="empty-state">No se pudieron cargar las reparaciones desde Soporte.</div>'}
  finally{loading=false;if($('repairsRefresh'))$('repairsRefresh').disabled=false}
}
function partRows(){if(!parts.length)return '<div class="repair-no-parts">No hay repuestos asociados a esta orden.</div>';return `<div class="repair-parts-list">${parts.map(p=>{const name=p.service_parts?.name||p.part_name||'Repuesto';const qty=Number(p.quantity_consumed||p.quantity_reserved||0);return `<div><span><b>${esc(name)}</b><small>${esc(p.service_parts?.sku||'')} ${p.status==='consumed'?'· Consumido':'· Reservado'}</small></span><b>${qty} × ${usd(p.sale_price_snapshot||0)}</b></div>`}).join('')}</div>`}
function historyRows(){return events.length?events.map(e=>`<div class="repair-history-row"><span><b>${esc(e.event_type==='payment'?'Pago / abono':e.event_type||'Movimiento')}</b><small>${date(e.occurred_at)} · ${esc(e.payment_method||'')}</small></span><b>${usd(e.amount_delta)}</b></div>`).join(''):'<div class="repair-no-parts">Sin movimientos previos.</div>'}
function methodChoices(){return METHODS.map(m=>`<button type="button" class="choice repair-method-choice ${m===selectedMethod?'active':''}" data-repair-method="${esc(m)}"><b>${esc(m)}</b></button>`).join('')}
function detail(){
  const o=active;if(!o)return;const a=account(o);$('repairsModalTitle').textContent=`${o.code||'Orden'} · ${o.client_name||'Cliente'}`;
  const paid=a.paidOff;
  $('repairsModalBody').innerHTML=`
    <div class="repair-order-overview">
      <div><small>Cliente</small><b>${esc(o.client_name||'—')}</b><span>${esc(o.client_phone||'')}</span></div>
      <div><small>Equipo</small><b>${esc(o.device_model||'—')}</b><span>${esc(o.serial_imei||'Sin serial / IMEI')}</span></div>
      <div><small>Estado técnico</small><b>${esc(o.status||'—')}</b><span>${esc(o.reported_issue||'Servicio técnico')}</span></div>
    </div>
    <div class="checkout-summary repair-payment-summary">
      <div><span>Total reparación</span><b>${fmt(a.budget,o)}</b></div>
      <div><span>Abonado</span><b>${fmt(a.paid,o)}</b></div>
      <div class="grand"><span>Saldo pendiente</span><b>${fmt(a.pending,o)}</b></div>
    </div>
    <div class="form-section repair-form-section"><div class="repair-section-title"><h3>Repuestos</h3><small>Reservados o consumidos en esta orden</small></div>${partRows()}</div>
    <div class="form-section repair-form-section"><div class="repair-section-title"><h3>Historial de pagos</h3><small>Cada abono queda ligado a la reparación</small></div><div id="repairsEvents" class="repair-history-list">${historyRows()}</div></div>
    ${paid?`<div class="form-section repair-paid-panel"><div><span class="repair-check">✓</span><div><h3>Reparación cobrada</h3><p>El saldo está completo. La Nota de Entrega está disponible sin cambiar el estado técnico del equipo.</p></div></div><div class="repair-final-actions"><button class="primary" id="repairsDeliveryNote" type="button">Ver / imprimir Nota de Entrega</button><button class="secondary" id="repairsOpenTechnical" type="button">Abrir Servicio Técnico ↗</button></div></div>`:`
    <form id="repairsPayForm" class="form-section repair-payment-form">
      <div class="repair-section-title"><h3>Registrar pago</h3><small>Abono parcial o pago total</small></div>
      <div class="choice-grid repair-method-grid" id="repairMethodChoices">${methodChoices()}</div>
      <div class="form-grid repair-pay-fields">
        <label>Monto recibido <small id="repairsPayUnit">USD</small><input id="repairsPayAmount" type="number" min="0.01" step="0.01" placeholder="0,00" required inputmode="decimal"></label>
        <label id="repairsCustomUsdWrap" class="hidden">Equivalente aplicado en USD<input id="repairsCustomUsd" type="number" min="0.01" step="0.01" placeholder="0,00" inputmode="decimal"></label>
        <label id="repairsPayRefWrap">Referencia<input id="repairsPayReference" maxlength="100" placeholder="Número de operación"></label>
        <label class="span2">Observación<textarea id="repairsPayNote" maxlength="300" placeholder="Observación opcional"></textarea></label>
      </div>
      <div id="repairsBcvBox" class="fx-box hidden"></div>
      <div class="repair-payment-actions"><button class="secondary" id="repairsPaySave" type="submit">Registrar abono</button><button class="primary" id="repairsMarkPaid" type="button">Marcar pagado + Nota de Entrega</button></div>
      <p class="repair-payment-foot">El pago final consume los repuestos reservados en la misma operación. Si el stock no alcanza, el cobro no se confirma.</p>
    </form>
    <div class="repair-final-actions"><button class="secondary" id="repairsOpenTechnical" type="button">Abrir Servicio Técnico ↗</button></div>`}`;
  bindDetail();updatePaymentUi();
}
function bindDetail(){
  document.querySelectorAll('[data-repair-method]').forEach(b=>b.addEventListener('click',()=>{selectedMethod=b.dataset.repairMethod;document.querySelectorAll('[data-repair-method]').forEach(x=>x.classList.toggle('active',x.dataset.repairMethod===selectedMethod));updatePaymentUi()}));
  $('repairsPayAmount')?.addEventListener('input',updatePaymentUi);$('repairsCustomUsd')?.addEventListener('input',updatePaymentUi);
  $('repairsPayForm')?.addEventListener('submit',e=>savePayment(e,false));$('repairsMarkPaid')?.addEventListener('click',e=>savePayment(e,true));
  $('repairsDeliveryNote')?.addEventListener('click',printDelivery);$('repairsOpenTechnical')?.addEventListener('click',()=>window.location.href='../sso-entry.html?platform=support');
}
async function open(id){
  const original=orders.find(o=>String(o.id)===String(id));if(!original)return;active=original;events=[];parts=[];selectedMethod='Efectivo USD';detail();
  const modal=$('repairsModal');modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  try{const d=await api('GET',null,'?order_id='+encodeURIComponent(id));if(String(active?.id)!==String(id))return;active=d.order;events=d.events||[];parts=d.parts||[];detail()}
  catch(e){notice('No se pudo cargar el detalle completo: '+e.message)}
}
function close(){const m=$('repairsModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.style.overflow='';active=null;events=[];parts=[]}
function updatePaymentUi(){
  if(!active||!$('repairsPayAmount'))return;const method=selectedMethod;const isBs=IS_BS.has(method),custom=CUSTOM_EQ.has(method);const amount=Number($('repairsPayAmount').value||0);
  $('repairsPayUnit').textContent=isBs?'Bs.':method==='EUR'?'EUR':method==='USDT'?'USDT':'USD';
  $('repairsCustomUsdWrap')?.classList.toggle('hidden',!custom);if($('repairsCustomUsd'))$('repairsCustomUsd').required=custom;
  const refWrap=$('repairsPayRefWrap');if(refWrap)refWrap.classList.toggle('hidden',!NEEDS_REF.has(method));if($('repairsPayReference'))$('repairsPayReference').required=NEEDS_REF.has(method);
  $('repairsBcvBox')?.classList.toggle('hidden',!isBs);
  if(isBs){const q=window.ThinkStoreFX?.snapshot(1);$('repairsBcvBox').textContent=q?`${ves(amount)} ≈ ${usd(round(amount/q.rate))} · BCV ${q.rate} · ${q.effective_date}${q.stale?' · SIN VERIFICAR':''}`:'Tasa BCV no disponible. No se permitirá cobrar en bolívares hasta verificarla.'}
}
async function fullAmountForMethod(){
  const due=account(active).pending;if(due<=0)return null;if(IS_BS.has(selectedMethod)){const q=await window.ThinkStoreFX?.requireFresh();return{amount:round(due*q.rate),usd_equivalent:null}}
  if(CUSTOM_EQ.has(selectedMethod))return{amount:Number($('repairsPayAmount')?.value||0),usd_equivalent:due};
  return{amount:due,usd_equivalent:null};
}
async function savePayment(e,markPaid){
  e?.preventDefault?.();if(!active)return;const id=active.id;
  let amount=Number($('repairsPayAmount')?.value||0),usdEquivalent=CUSTOM_EQ.has(selectedMethod)?Number($('repairsCustomUsd')?.value||0):null;
  if(markPaid){try{const f=await fullAmountForMethod();if(!f)return;amount=f.amount;if(f.usd_equivalent)usdEquivalent=f.usd_equivalent;if(IS_BS.has(selectedMethod)||!CUSTOM_EQ.has(selectedMethod))$('repairsPayAmount').value=Number(amount).toFixed(2);if(CUSTOM_EQ.has(selectedMethod)){$('repairsCustomUsd').value=account(active).pending.toFixed(2);if(!(amount>0))return alert(`Indica cuánto recibiste en ${selectedMethod}; el saldo USD ya quedó preparado.`)}}catch(err){return alert(err.message||'No se pudo calcular el saldo.')}}
  const reference=$('repairsPayReference')?.value.trim()||'',note=$('repairsPayNote')?.value.trim()||'';
  if(!Number.isFinite(amount)||amount<=0)return alert('Indica un monto válido.');if(CUSTOM_EQ.has(selectedMethod)&&(!Number.isFinite(usdEquivalent)||usdEquivalent<=0))return alert('Indica el equivalente aplicado en USD.');
  if(IS_BS.has(selectedMethod)){try{await window.ThinkStoreFX?.requireFresh()}catch(err){return alert(err.message||'No está disponible la tasa BCV.')}}
  const label=markPaid?'marcar la reparación como pagada':'registrar este abono';if(!confirm(`¿Confirmar ${label} mediante ${selectedMethod} para la orden ${active.code}?`))return;
  const btn=markPaid?$('repairsMarkPaid'):$('repairsPaySave');if(btn){btn.disabled=true;btn.textContent=markPaid?'Cobrando…':'Registrando…'}
  try{
    const res=await api('POST',{action:'pay',order_id:id,method:selectedMethod,amount,usd_equivalent:usdEquivalent,reference,note});await load(true);
    const latest=await api('GET',null,'?order_id='+encodeURIComponent(id));active=latest.order;events=latest.events||[];parts=latest.parts||[];detail();
    if(res.fully_paid)alert('Pago completado. La reparación quedó ✓ Cobrado, los repuestos reservados fueron consumidos y la Nota de Entrega está disponible.');else alert('Abono registrado correctamente.');
  }catch(err){alert(err.message||'No se pudo registrar el pago.');detail()}
}
function deliveryHtml(o){
  const a=account(o);const last=events.find(e=>e.event_type==='payment')||events[0]||{};const partsHtml=parts.length?parts.map(p=>`<tr><td>${esc(p.service_parts?.name||p.part_name||'Repuesto')}</td><td>${Number(p.quantity_consumed||p.quantity_reserved||0)}</td><td>${usd(p.sale_price_snapshot||0)}</td></tr>`).join(''):'<tr><td colspan="3">Sin repuestos registrados</td></tr>';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Nota de Entrega ${esc(o.code)}</title><style>*{box-sizing:border-box}body{margin:0;background:#fff;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.page{width:210mm;min-height:297mm;margin:auto;padding:18mm}.head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #dedee2;padding-bottom:18px}.brand{display:flex;gap:14px;align-items:center}.brand img{width:54px;height:54px;object-fit:contain}.brand h1{font-size:24px;margin:0}.muted{color:#73777d;font-size:12px}.title{margin:28px 0 18px}.title h2{font-size:28px;margin:0 0 5px}.pill{display:inline-block;border-radius:999px;background:#edf8f2;color:#13704e;padding:7px 10px;font-size:11px;font-weight:800}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.card{background:#f5f5f7;border-radius:14px;padding:14px}.card small{display:block;color:#777;margin-bottom:5px}.card b{font-size:14px}.section{margin-top:20px}.section h3{font-size:15px;margin:0 0 10px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:10px;border-bottom:1px solid #ececef}th{color:#777}.total{margin-top:22px;background:#f5f5f7;border-radius:16px;padding:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.total small{display:block;color:#777}.total b{font-size:18px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-top:70px}.sign div{text-align:center;border-top:1px solid #777;padding-top:9px;font-size:12px}.foot{margin-top:36px;color:#777;font-size:10px;line-height:1.5}.printbar{position:fixed;top:10px;right:10px}.printbar button{border:0;background:#111;color:#fff;border-radius:999px;padding:10px 15px;font-weight:800}@media print{.printbar{display:none}.page{margin:0}}</style></head><body><div class="printbar"><button onclick="window.print()">Imprimir / PDF</button></div><div class="page"><header class="head"><div class="brand"><img src="${location.origin}/logo-thinkstore.png"><div><h1>ThinkStore</h1><div class="muted">Servicio Técnico · Chacao, Caracas</div></div></div><div><span class="pill">✓ Cobrado</span><div class="muted" style="margin-top:7px;text-align:right">${esc(o.code)}<br>${date(new Date().toISOString())}</div></div></header><div class="title"><h2>Nota de Entrega</h2><div class="muted">Servicio Técnico ThinkStore</div></div><div class="grid"><div class="card"><small>Cliente</small><b>${esc(o.client_name||'—')}</b><div class="muted">${esc(o.client_phone||'')}</div></div><div class="card"><small>Equipo</small><b>${esc(o.device_model||'—')}</b><div class="muted">${esc(o.serial_imei||'Sin serial / IMEI')}</div></div><div class="card"><small>Reparación / diagnóstico</small><b>${esc(o.reported_issue||'Servicio técnico')}</b></div><div class="card"><small>Garantía</small><b>${Number(o.warranty_days||0)} día(s)</b></div></div><section class="section"><h3>Repuestos utilizados</h3><table><thead><tr><th>Repuesto</th><th>Cant.</th><th>Valor</th></tr></thead><tbody>${partsHtml}</tbody></table></section><div class="total"><div><small>Total reparación</small><b>${fmt(a.budget,o)}</b></div><div><small>Método</small><b>${esc(o.payment_method||last.payment_method||'Registrado')}</b></div><div><small>Referencia</small><b>${esc(last.reference||'—')}</b></div></div><p class="foot">La reparación permanece vinculada a la orden ${esc(o.code)}. La emisión de esta Nota de Entrega no modifica por sí sola el estado técnico ni registra una entrega física del equipo.</p><div class="sign"><div>Entregado por ThinkStore</div><div>Recibido conforme · Cliente</div></div></div></body></html>`;
}
function printDelivery(){if(!active)return;const a=account(active);if(!a.paidOff){alert('La Nota de Entrega se habilita cuando el saldo está completamente pagado.');return}const w=window.open('','_blank','width=900,height=1100');if(!w){alert('Permite ventanas emergentes para ver la Nota de Entrega.');return}w.document.open();w.document.write(deliveryHtml(active));w.document.close()}
function init(){
  $('repairsRefresh')?.addEventListener('click',()=>load(true));$('repairsOpenSupport')?.addEventListener('click',()=>location.href='../sso-entry.html?platform=support');$('repairsSearch')?.addEventListener('input',e=>{query=e.target.value;render()});
  document.querySelectorAll('[data-repair-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.repairFilter;render()}));$('repairsList')?.addEventListener('click',e=>{const id=e.target.closest('[data-repair-open]')?.dataset.repairOpen;if(id)open(id)});$('repairsClose')?.addEventListener('click',close);$('repairsBackdrop')?.addEventListener('click',close);window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('repairsModal')?.classList.contains('open'))close()});
}
window.ThinkStoreRepairs={load,setAuth:fn=>{getToken=fn;initialized=false},setUser:u=>{user=u},reset:()=>{orders=[];active=null;events=[];parts=[];initialized=false;getToken=null;notice('');close()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
