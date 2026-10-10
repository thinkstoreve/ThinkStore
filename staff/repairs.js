/* ThinkStore V15.27 — App Ventas · pagos combinados hasta 3 métodos + cálculo automático del saldo. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const usd=v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const ves=v=>'Bs. '+Number(v||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt=(v,o)=>String(o?.quote_currency||'USD').toUpperCase()==='USD'?usd(v):ves(v);
const date=v=>{try{return v?new Date(v).toLocaleString('es-VE',{timeZone:'America/Caracas',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}catch{return '—'}};
const PAYMENT_GROUPS=[
  {id:'cash',label:'Efectivo',hint:'USD / Bs',icon:'../assets/efectivo.svg',methods:['Efectivo USD','Efectivo Bs']},
  {id:'mobile',label:'Pago Móvil',hint:'Bolívares',icon:'../assets/pago-movil.svg',methods:['Pago Móvil']},
  {id:'zelle',label:'Zelle',hint:'USD',icon:'../assets/zelle.svg',methods:['Zelle']},
  {id:'transfer',label:'Transferencia',hint:'USD / Bs',icon:'../assets/transferencia.svg',methods:['Transferencia USD','Transferencia Bs']},
  {id:'pos',label:'Punto de venta',hint:'Bolívares',icon:'../assets/punto-venta.svg',methods:['Punto de venta Bs']},
  {id:'other',label:'Otros',hint:'USDT / EUR',icon:'../assets/otros-pagos.svg',methods:['USDT','EUR','Otro']}
];
const IS_BS=new Set(['Efectivo Bs','Pago Móvil','Transferencia Bs','Punto de venta Bs']);
const CUSTOM_EQ=new Set(['EUR','Otro']);
const NEEDS_REF=new Set(['Pago Móvil','Zelle','Transferencia USD','Transferencia Bs','Punto de venta Bs','USDT']);
let getToken=null,orders=[],active=null,events=[],parts=[],extras=[],billing=null,catalog=[],filter='pending',query='',loading=false,initialized=false,user=null,selectedMethod='Efectivo USD',paymentSelections=[],catalogTimer=null;
const MAX_PAYMENT_METHODS=3;
const account=o=>{const budget=round(o?.staff_invoice_total??o?.quote_amount??0),paid=round(o?.staff_paid??o?.amount_paid??0),pending=o?.staff_pending!==undefined&&o?.staff_pending!==null?Math.max(0,round(o.staff_pending)):Math.max(0,round(budget-paid)),canceled=/cancel|rechaz|no aprobado/i.test(String(o?.status||''));return{budget,paid,pending,canceled,paidOff:budget>0&&pending<=0&&!canceled,partial:paid>0&&pending>0}};
const detailAccount=o=>{const base=account(o);if(!billing)return base;const budget=round(billing.invoice_total||0),paid=round(billing.paid??o?.amount_paid??0),pending=Math.max(0,round(billing.pending??budget-paid));return{...base,budget,paid,pending,paidOff:budget>0&&pending<=0&&!base.canceled,partial:paid>0&&pending>0}};
function reflectBilling(order,bill){const id=order?.id||active?.id;if(!id)return;const row=orders.find(o=>String(o.id)===String(id));if(row&&order)Object.assign(row,order);if(row&&bill){row.staff_invoice_total=Number(bill.invoice_total||0);row.staff_pending=Number(bill.pending||0);row.staff_paid=Number(bill.paid||0);row.staff_auto_from_parts=!!bill.auto_from_parts;row.staff_parts_total=Number(bill.parts_total||0)}if(active&&String(active.id)===String(id)&&order&&active!==order)Object.assign(active,order);}
const setText=(id,value)=>{if($(id))$(id).textContent=value};
function notice(msg){const el=$('repairsNotice');if(!el)return;el.textContent=msg||'';el.classList.toggle('hidden',!msg)}
async function api(method='GET',payload=null,query=''){
  const token=await getToken?.();if(!token)throw Error('Tu sesión de Staff expiró. Vuelve a iniciar sesión.');
  const url='/.netlify/functions/staff-repairs'+query;
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),25000);
  try{const res=await fetch(url,{method,headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{}),cache:'no-store',signal:ctrl.signal});const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok)throw Error(data.error||`Error de Soporte (${res.status})`);return data}
  catch(e){if(e.name==='AbortError')throw Error('Soporte tardó demasiado en responder. Reintenta la consulta; no repitas un pago sin comprobar el saldo.');throw e}finally{clearTimeout(timer)}
}
function summaries(){
  const viable=orders.filter(o=>!account(o).canceled&&String(o.quote_currency||'USD').toUpperCase()==='USD');
  const due=viable.filter(o=>account(o).pending>0),paid=viable.filter(o=>account(o).paidOff),partial=viable.filter(o=>account(o).partial);
  setText('repairsPendingTotal',usd(due.reduce((n,o)=>n+account(o).pending,0)));setText('repairsPendingCount',`${due.length} órdenes`);
  setText('repairsPartialTotal',usd(partial.reduce((n,o)=>n+account(o).paid,0)));setText('repairsPartialCount',`${partial.length} con abono`);
  setText('repairsPaidTotal',usd(paid.reduce((n,o)=>n+account(o).paid,0)));setText('repairsPaidCount',`${paid.length} pagadas`);setText('repairsAllCount',orders.length);
}
function row(o){
  const a=account(o),paid=a.paidOff;
  const status=paid?'Pagado':a.partial?'Abono parcial':a.canceled?'Cancelado':'Pendiente';
  const amount=paid?`Total ${fmt(a.paid,o)}`:a.budget>0?`Saldo ${fmt(a.pending,o)}`:'Sin presupuesto';
  return `<article class="sale-row repair-classic-row" data-repair-row="${esc(o.id)}">
    <div class="sale-main"><b>${esc(o.code||'Sin código')}</b><span>${esc(o.client_name||'Sin cliente')} · ${date(o.created_at)}</span></div>
    <div class="sale-detail"><b>${esc(o.device_model||'Equipo sin modelo')}</b><span>${esc(o.status||'Sin estado')} · ${esc(o.serial_imei||'Sin serial')}</span></div>
    <div class="repair-classic-end"><div><b>${esc(amount)}</b><span class="sale-status ${paid?'repair-paid':a.partial?'repair-partial':''}">${esc(status)}</span></div><button class="text-action" data-repair-open="${esc(o.id)}" type="button">${paid?'Ver':'Cobrar'} →</button></div>
  </article>`;
}
function render(){
  summaries();const term=query.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const visible=orders.filter(o=>{const a=account(o);if(filter==='pending'&&(a.paidOff||a.canceled))return false;if(filter==='paid'&&!a.paidOff)return false;const hay=[o.code,o.client_name,o.client_phone,o.device_model,o.serial_imei,o.status].join(' ').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');return !term||hay.includes(term)});
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
function partRows(){
  if(!parts.length)return '<div class="repair-no-parts">No hay repuestos asociados a esta orden.</div>';
  const total=parts.reduce((n,p)=>{const qty=Number(p.quantity_consumed||p.quantity_reserved||p.quantity||1),unit=Number(p.sale_price_snapshot||p.service_parts?.sale_price||p.sale_price||0);return n+(unit>0?qty*unit:0)},0);
  const priced=parts.filter(p=>Number(p.sale_price_snapshot||p.service_parts?.sale_price||p.sale_price||0)>0).length;
  return `<div class="repair-parts-list">${parts.map(p=>{
    const name=p.service_parts?.name||p.part_name||p.name||'Repuesto';
    const qty=Number(p.quantity_consumed||p.quantity_reserved||p.quantity||1);
    const unit=Number(p.sale_price_snapshot||p.service_parts?.sale_price||p.sale_price||0);
    const subtotal=qty*unit;
    const status=p.status==='consumed'?'Consumido':p.status==='reserved'?'Reservado':(p.movement_source?'Consumido':p.note_source?'Reportado por técnico':'Asociado');
    return `<div><span><b>${esc(name)}</b><small>${esc(p.service_parts?.sku||p.sku||'')} ${status?`· ${esc(status)}`:''} · Cant. ${esc(qty)}${unit>0?` · Precio ${usd(unit)}`:' · Precio no configurado'}</small></span><b>${unit>0?usd(subtotal):'Sin precio'}</b></div>`
  }).join('')}</div><div class="repair-parts-total"><span>Total repuestos${priced<parts.length?' · parcial':''}</span><b>${usd(total)}</b></div>`
}


function extraRows(){
  const activeExtras=(extras||[]).filter(x=>x.status!=='removed');
  if(!activeExtras.length)return '<div class="repair-no-parts">No hay mano de obra, servicios ni productos adicionales.</div>';
  return `<div class="repair-extra-list">${activeExtras.map(x=>{const q=Number(x.quantity||1),u=Number(x.unit_price_usd||0),total=q*u;const label=x.item_type==='labor'?'Mano de obra':x.item_type==='product'?'Producto de tienda':'Servicio';const state=x.status==='consumed'?'Cobrado':x.included_in_quote?'Incluido en total':x.source==='main_inventory'?'Reservado':'Pendiente';const removable=!x.included_in_quote&&x.status==='active';return `<div class="repair-extra-row"><div class="repair-extra-main"><span class="repair-extra-icon">${x.item_type==='product'?'▣':x.item_type==='labor'?'⌁':'＋'}</span><span><b>${esc(x.name||label)}</b><small>${esc([label,x.sku,state].filter(Boolean).join(' · '))} · Cant. ${q} · ${usd(u)}</small></span></div><div class="repair-extra-end"><b>${usd(total)}</b>${removable?`<button type="button" class="repair-extra-remove" data-extra-remove="${esc(x.id)}" title="Quitar">×</button>`:''}</div></div>`}).join('')}</div>`
}
function catalogRows(){
  if(!catalog.length)return '<div class="repair-catalog-empty">Escribe al menos 2 letras para buscar mano de obra, servicios o productos del inventario.</div>';
  return catalog.map(x=>`<button type="button" class="repair-catalog-row" data-charge-source="${esc(x.source)}" data-charge-id="${esc(x.source_id)}" ${x.can_add?'':'disabled'}><span class="repair-catalog-kind ${x.item_type==='part'?'is-part':''}">${x.item_type==='product'?'Producto tienda':x.item_type==='part'?'Repuesto ST':x.item_type==='labor'?'Mano de obra':'Servicio'}</span><span class="repair-catalog-copy"><b>${esc(x.name)}</b><small>${esc([x.sku,x.hint].filter(Boolean).join(' · '))}${x.available!==null&&x.available!==undefined?` · ${x.available} disponible(s)`:''}</small></span><span class="repair-catalog-price">${x.price_usd>0?usd(x.price_usd):'Sin precio'}</span></button>`).join('')
}

function historyRows(){return events.length?events.map(e=>`<div class="repair-history-row"><span><b>${esc(e.event_type==='payment'?'Pago / abono':e.event_type||'Movimiento')}</b><small>${date(e.occurred_at)} · ${esc(e.payment_method||'')}</small></span><b>${usd(e.amount_delta)}</b></div>`).join(''):'<div class="repair-no-parts">Sin movimientos previos.</div>'}
function paymentGroupForMethod(method){return PAYMENT_GROUPS.find(g=>g.methods.includes(method))||PAYMENT_GROUPS[0]}
function payRegistry(){return window.ThinkStorePaymentDestinations||null}
function paymentDestinationRule(method){return payRegistry()?.rule?.(method)||{allowed:[],defaultCode:null,currency:IS_BS.has(method)?'VES':'USD'}}
function normalizeRepairDestination(method,code){return payRegistry()?.normalize?.(method,code)||''}
function destinationInfo(code){return payRegistry()?.byCode?.(code)||null}
function newPaymentSelection(group,method){const m=method||group.methods[0];return{groupId:group.id,method:m,amount:'',reference:'',usdEquivalent:'',destinationCode:normalizeRepairDestination(m,'')}}
function resetPaymentSelections(){const g=PAYMENT_GROUPS[0];paymentSelections=[newPaymentSelection(g,'Efectivo USD')];selectedMethod='Efectivo USD'}
function syncPrimaryMethod(){selectedMethod=paymentSelections[0]?.method||'Efectivo USD'}
function subMethodLabel(m){if(m==='Efectivo USD'||m==='Transferencia USD')return 'USD';if(m==='Efectivo Bs'||m==='Transferencia Bs')return 'Bolívares';return m}
function methodChoices(){return PAYMENT_GROUPS.map(g=>{const on=paymentSelections.some(x=>x.groupId===g.id);return `<button type="button" class="choice repair-method-choice ${on?'active':''}" data-repair-group="${esc(g.id)}" aria-pressed="${on?'true':'false'}"><span class="repair-method-logo"><img src="${esc(g.icon)}" alt=""></span><span class="repair-method-copy"><b>${esc(g.label)}</b><small>${esc(g.hint)}</small></span><span class="repair-method-check">✓</span></button>`}).join('')}
function paymentUnit(method){return IS_BS.has(method)?'Bs.':method==='EUR'?'EUR':method==='USDT'?'USDT':method==='Otro'?'Otro':'USD'}
function lineEquivalent(line,rate){const amount=Number(line.amount||0);if(!(amount>0))return 0;if(IS_BS.has(line.method))return rate&&rate>0?round(amount/rate):0;if(CUSTOM_EQ.has(line.method))return Math.max(0,round(Number(line.usdEquivalent||0)));return round(amount)}
function paymentLineRows(){
  const a=detailAccount(active),multi=paymentSelections.length>1&&a.budget>0,last=paymentSelections.length-1;
  return paymentSelections.map((line,i)=>{
    const g=PAYMENT_GROUPS.find(x=>x.id===line.groupId)||paymentGroupForMethod(line.method),auto=multi&&i===last,custom=CUSTOM_EQ.has(line.method),autoNative=auto&&!custom,needsRef=NEEDS_REF.has(line.method);
    const methodControl=g.methods.length>1?`<select data-pay-line-method="${i}">${g.methods.map(m=>`<option value="${esc(m)}" ${m===line.method?'selected':''}>${esc(subMethodLabel(m))}</option>`).join('')}</select>`:`<strong>${esc(line.method)}</strong>`;
    const allowed=payRegistry()?.allowed?.(line.method)||[];
    const destination=normalizeRepairDestination(line.method,line.destinationCode);line.destinationCode=destination;
    const destinationField=allowed.length?`<label class="repair-bank-destination">Cuenta destino<select data-pay-line-destination="${i}"><option value="">Seleccionar cuenta…</option>${allowed.map(d=>`<option value="${esc(d.code)}" ${d.code===destination?'selected':''}>${esc(d.name)}</option>`).join('')}</select>${destinationInfo(destination)?`<small>${esc(destinationInfo(destination).name)}</small>`:''}</label>`:'';
    return `<div class="repair-split-line ${auto?'is-auto':''}" data-pay-line="${i}">
      <div class="repair-split-line-head"><div><small>Método ${i+1}</small>${methodControl}</div>${auto?'<span class="repair-auto-pill">Resto automático</span>':''}${paymentSelections.length>1?`<button type="button" class="repair-split-remove" data-pay-line-remove="${i}" aria-label="Quitar método">×</button>`:''}</div>
      <div class="repair-split-fields ${allowed.length?'has-destination':''}">
        <label>Monto recibido <small>${esc(paymentUnit(line.method))}</small><input data-pay-line-amount="${i}" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0,00" value="${esc(line.amount)}" ${autoNative?'readonly':''}></label>
        ${destinationField}
        ${custom?`<label>Equivalente USD<input data-pay-line-usd="${i}" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0,00" value="${esc(line.usdEquivalent)}" ${auto?'readonly':''}></label>`:''}
        ${needsRef?`<label class="${custom?'':'repair-split-wide'}">Referencia<input data-pay-line-ref="${i}" maxlength="100" placeholder="Número de operación" value="${esc(line.reference)}"></label>`:''}
      </div>
    </div>`
  }).join('')
}
function paymentPreviewRate(){const q=window.ThinkStoreFX?.snapshot(1);return q&&Number(q.rate)>0&&!q.stale?q:null}
function updateSplitCalculations(){
  if(!active)return{paid:0,remaining:0,valid:false,rate:null};
  const a=detailAccount(active),due=Math.max(0,round(a.pending)),multi=paymentSelections.length>1&&a.budget>0,last=paymentSelections.length-1,q=paymentPreviewRate(),rate=Number(q?.rate||0)||null;
  let paidBeforeAuto=0;
  paymentSelections.forEach((line,i)=>{if(!(multi&&i===last))paidBeforeAuto=round(paidBeforeAuto+lineEquivalent(line,rate))});
  if(multi&&paymentSelections[last]){
    const line=paymentSelections[last],remaining=Math.max(0,round(due-paidBeforeAuto));
    if(CUSTOM_EQ.has(line.method))line.usdEquivalent=remaining>0?remaining.toFixed(2):'';
    else if(IS_BS.has(line.method))line.amount=rate&&remaining>0?round(remaining*rate).toFixed(2):'';
    else line.amount=remaining>0?remaining.toFixed(2):'';
    const amountEl=document.querySelector(`[data-pay-line-amount="${last}"]`);if(amountEl&&!CUSTOM_EQ.has(line.method))amountEl.value=line.amount;
    const usdEl=document.querySelector(`[data-pay-line-usd="${last}"]`);if(usdEl&&CUSTOM_EQ.has(line.method))usdEl.value=line.usdEquivalent;
  }
  let paid=0;for(const line of paymentSelections)paid=round(paid+lineEquivalent(line,rate));
  const remaining=round(due-paid),hasBs=paymentSelections.some(x=>IS_BS.has(x.method));
  const sum=$('repairSplitSummary');if(sum){sum.className='repair-split-summary'+(remaining<-.009?' warn':Math.abs(remaining)<=.009&&paymentSelections.length>1?' ok':'');sum.innerHTML=`<span>Distribuido <b>${usd(paid)}</b></span><span>Restante <b>${usd(Math.max(0,remaining))}</b></span>`+(remaining<-.009?'<small>El pago supera el saldo pendiente.</small>':'')}
  const bcv=$('repairsBcvBox');if(bcv){bcv.classList.toggle('hidden',!hasBs);if(hasBs)bcv.textContent=q?`BCV: 1 USD = ${ves(q.rate)} · Vigente ${q.effective_date}`:'Tasa BCV no disponible o sin verificar. Actualízala antes de cobrar en bolívares.'}
  const single=paymentSelections.length===1,line=paymentSelections[0],amount=Number(line?.amount||0),customOk=!CUSTOM_EQ.has(line?.method)||Number(line?.usdEquivalent||0)>0,refOk=!NEEDS_REF.has(line?.method)||String(line?.reference||'').trim().length>=3,destinationOk=!(payRegistry()?.needsDestination?.(line?.method))||!!normalizeRepairDestination(line?.method,line?.destinationCode);
  const allPositive=paymentSelections.every((x,i)=>{if(multi&&i===last&&!CUSTOM_EQ.has(x.method))return Number(x.amount||0)>0;return Number(x.amount||0)>0&&(!CUSTOM_EQ.has(x.method)||Number(x.usdEquivalent||0)>0)});
  const refsOk=paymentSelections.every(x=>!NEEDS_REF.has(x.method)||String(x.reference||'').trim().length>=3);
  const destinationsOk=paymentSelections.every(x=>!(payRegistry()?.needsDestination?.(x.method))||!!normalizeRepairDestination(x.method,x.destinationCode));
  const combinedValid=multi&&allPositive&&refsOk&&destinationsOk&&Math.abs(remaining)<=.02&&(!hasBs||!!rate);
  const save=$('repairsPaySave');if(save){save.classList.toggle('hidden',!single);save.disabled=single?!(amount>0&&customOk&&refOk&&destinationOk):true}
  const charge=$('repairsMarkPaid');if(charge){if(a.budget<=0){charge.disabled=!(single&&amount>0&&customOk&&refOk&&destinationOk);charge.textContent=amount>0?`Cobrar ${IS_BS.has(line?.method)?ves(amount):line?.method==='EUR'?`EUR ${amount.toFixed(2)}`:line?.method==='USDT'?`${amount.toFixed(2)} USDT`:usd(amount)}`:'Indica el monto para cobrar'}else if(multi){charge.disabled=!combinedValid;charge.textContent=`Cobrar saldo con ${paymentSelections.length} métodos`}else{charge.disabled=a.pending<=0;charge.textContent=a.pending>0?`Cobrar saldo ${fmt(a.pending,active)}`:'Saldo completado'}}
  return{paid,remaining,valid:multi?combinedValid:(amount>0&&customOk&&refOk&&destinationOk),rate,q}
}
function refreshPaymentMethodControls(){
  document.querySelectorAll('[data-repair-group]').forEach(b=>{const on=paymentSelections.some(x=>x.groupId===b.dataset.repairGroup);b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false')});
  const lines=$('repairPaymentLines');if(lines)lines.innerHTML=paymentLineRows();syncPrimaryMethod();updatePaymentUi();
}

function discountState(){
  const subtotal=Number(billing?.subtotal_usd||0),type=String(billing?.discount_type||active?.discount_type||'percent')==='usd'?'usd':'percent',value=Number(billing?.discount_value??active?.discount_value??0),amount=Number(billing?.discount_usd??active?.discount_usd??0),reason=String(billing?.discount_reason??active?.discount_reason??'');
  return{subtotal,type,value,amount,reason};
}
function discountEditor(){
  const d=discountState(),has=d.amount>0;
  return `<div class="repair-discount-box"><div class="repair-discount-head"><div><b>Descuento</b><small>Opcional · queda registrado en la reparación y Nota de Entrega</small></div>${has?`<span class="repair-discount-pill">− ${usd(d.amount)}</span>`:''}</div><div class="repair-discount-grid"><label>Tipo<select id="repairDiscountType"><option value="percent" ${d.type==='percent'?'selected':''}>Porcentaje %</option><option value="usd" ${d.type==='usd'?'selected':''}>Monto USD</option></select></label><label>Valor<input id="repairDiscountValue" type="number" min="0" ${d.type==='percent'?'max="100"':''} step="0.01" value="${esc(d.value||'')}" placeholder="0,00" inputmode="decimal"></label><label class="repair-discount-reason">Motivo<input id="repairDiscountReason" maxlength="160" value="${esc(d.reason)}" placeholder="Ej. Cliente frecuente (opcional)"></label></div><div class="repair-discount-preview" id="repairDiscountPreview"></div><div class="repair-discount-actions"><button type="button" class="secondary" id="repairDiscountApply">Aplicar descuento</button>${has?'<button type="button" class="repair-discount-remove" id="repairDiscountRemove">Quitar descuento</button>':''}</div></div>`;
}
function updateDiscountPreview(){
  const box=$('repairDiscountPreview');if(!box)return;const d=discountState(),subtotal=Number(d.subtotal||detailAccount(active).budget||0),type=$('repairDiscountType')?.value||d.type,value=Math.max(0,Number($('repairDiscountValue')?.value||0));const amount=type==='percent'?round(subtotal*Math.min(value,100)/100):Math.min(round(value),subtotal),total=Math.max(0,round(subtotal-amount));box.textContent=subtotal>0?`Vista previa: ${usd(subtotal)} − ${usd(amount)} = ${usd(total)}`:'El descuento se habilita cuando exista un total para la reparación.';
}

function detail(){
  const o=active;if(!o)return;const a=detailAccount(o);$('repairsModalTitle').textContent=`${o.code||'Orden'} · ${o.client_name||'Cliente'}`;
  const paid=a.paidOff;
  $('repairsModalBody').innerHTML=`
    <div class="repair-order-overview">
      <div><small>Cliente</small><b>${esc(o.client_name||'—')}</b><span>${esc(o.client_phone||'')}</span></div>
      <div><small>Equipo</small><b>${esc(o.device_model||'—')}</b><span>${esc(o.serial_imei||'Sin serial / IMEI')}</span></div>
      <div><small>Estado técnico</small><b>${esc(o.status||'—')}</b><span>${esc(o.reported_issue||'Servicio técnico')}</span></div>
    </div>
    <div class="checkout-summary repair-payment-summary">
      <div><span>Subtotal</span><b>${Number(billing?.subtotal_usd||0)>0?usd(billing.subtotal_usd):(a.budget>0?fmt(a.budget,o):'Por definir')}</b></div>
      <div class="repair-summary-discount"><span>Descuento${billing?.discount_type==='percent'&&Number(billing?.discount_value||0)>0?` (${Number(billing.discount_value)}%)`:''}</span><b>${Number(billing?.discount_usd||0)>0?'− '+usd(billing.discount_usd):usd(0)}</b></div>
      <div><span>Total a cobrar</span><b>${a.budget>0?fmt(a.budget,o):'Por definir'}</b></div>
      <div><span>Abonado</span><b>${fmt(a.paid,o)}</b></div>
      <div class="grand"><span>Saldo pendiente</span><b>${a.budget>0?fmt(a.pending,o):'Por definir'}</b></div>
    </div>
    ${billing?.auto_from_parts?`<div class="repair-auto-total">El total se calculó automáticamente desde los repuestos preparados. Puedes sumar mano de obra, servicios o productos antes de cobrar.</div>`:''}
    <div class="form-section repair-form-section"><div class="repair-section-title"><h3>Repuestos</h3><small>Usados por el técnico para esta reparación</small></div>${partRows()}</div>
    <div class="form-section repair-form-section repair-extras-section"><div class="repair-section-title"><h3>Cargos adicionales</h3><small>Mano de obra, servicios o productos de tienda</small></div>${extraRows()}${!paid?`<button type="button" class="secondary repair-add-charge" id="repairsAddCharge">＋ Añadir servicio o producto</button><div class="repair-catalog-panel hidden" id="repairCatalogPanel"><div class="repair-catalog-search"><input id="repairCatalogSearch" placeholder="Buscar pantalla, batería, mano de obra, case, cargador…" autocomplete="off"><button type="button" id="repairCatalogClose">Cerrar</button></div><div id="repairCatalogResults" class="repair-catalog-results">${catalogRows()}</div><p class="repair-catalog-note">Los repuestos de Servicio Técnico y los productos de tienda se reservan al agregarlos. El stock se descuenta únicamente al completar el pago.</p></div>`:''}</div>
    <div class="form-section repair-form-section"><div class="repair-section-title"><h3>Historial de pagos</h3><small>Cada abono queda ligado a la reparación</small></div><div id="repairsEvents" class="repair-history-list">${historyRows()}</div></div>
    ${paid?`<div class="form-section repair-paid-panel"><div><div><h3>Reparación pagada</h3><p>El saldo está completo. La Nota de Entrega está disponible sin cambiar el estado técnico del equipo.</p></div></div><div class="repair-final-actions"><button class="primary" id="repairsDeliveryNote" type="button">Ver / imprimir Nota de Entrega</button><button class="secondary" id="repairsResendDeliveryNote" type="button">Reenviar al correo</button><button class="secondary" id="repairsOpenTechnical" type="button">Abrir Servicio Técnico ↗</button></div></div>`:`
    <form id="repairsPayForm" class="form-section repair-payment-form">
      <div class="repair-section-title"><h3>Registrar pago</h3><small>${a.budget>0?'Elige el método y confirma el cobro':'Indica el total final y confirma el cobro'}</small></div>
      ${a.budget<=0?'<div class="repair-no-quote-hint"><b>Esta orden aún no tiene un total definido.</b><span>Escribe el monto recibido y ThinkStore lo guardará como total final al cobrar.</span></div>':''}
      ${a.budget>0?discountEditor():''}
      <div class="repair-multi-hint"><b>Pago combinado</b><span>Selecciona hasta 3 métodos. Escribe el primer monto —y el segundo si eliges 3— y ThinkStore calcula automáticamente el saldo del último método.</span></div>
      <div class="choice-grid repair-method-grid" id="repairMethodChoices">${methodChoices()}</div>
      <div id="repairPaymentLines" class="repair-split-lines">${paymentLineRows()}</div>
      <div id="repairSplitSummary" class="repair-split-summary" role="status" aria-live="polite"></div>
      <div id="repairsBcvBox" class="fx-box hidden"></div>
      <div class="form-grid repair-pay-fields"><label class="span2">Observación<textarea id="repairsPayNote" maxlength="300" placeholder="Observación opcional"></textarea></label></div>
      ${a.budget>0?`<div class="repair-payment-actions"><button class="secondary repair-action-btn" id="repairsPaySave" type="submit">Registrar abono</button><button class="primary repair-action-btn repair-charge-btn" id="repairsMarkPaid" type="button">Cobrar saldo</button></div>`:`<div class="repair-payment-actions single"><button class="primary repair-action-btn repair-charge-btn" id="repairsMarkPaid" type="button">Indica el monto para cobrar</button></div>`}
      <p class="repair-payment-foot">El pago final consume los repuestos reservados en la misma operación. Si la orden queda pagada, la Nota de Entrega se crea automáticamente y se envía al cliente.</p>
    </form>
    <div class="repair-final-actions"><button class="secondary" id="repairsOpenTechnical" type="button">Abrir Servicio Técnico ↗</button></div>`}`;
  bindDetail();updatePaymentUi();
}
function bindDetail(){
  $('repairMethodChoices')?.addEventListener('click',e=>{const b=e.target.closest('[data-repair-group]');if(!b)return;const g=PAYMENT_GROUPS.find(x=>x.id===b.dataset.repairGroup);if(!g)return;const a=detailAccount(active),idx=paymentSelections.findIndex(x=>x.groupId===g.id);if(a.budget<=0){paymentSelections=[newPaymentSelection(g,g.methods[0])]}else if(idx>=0){if(paymentSelections.length>1)paymentSelections.splice(idx,1)}else{if(paymentSelections.length>=MAX_PAYMENT_METHODS)return alert('Puedes combinar hasta 3 métodos de pago.');paymentSelections.push(newPaymentSelection(g,g.methods[0]))}b.classList.remove('tap-pop');void b.offsetWidth;b.classList.add('tap-pop');setTimeout(()=>b.classList.remove('tap-pop'),190);if(paymentSelections.some(x=>IS_BS.has(x.method)))window.ThinkStoreFX?.refresh?.().catch(()=>{});refreshPaymentMethodControls()});
  $('repairPaymentLines')?.addEventListener('input',e=>{const i=Number(e.target.dataset.payLineAmount??e.target.dataset.payLineUsd??e.target.dataset.payLineRef);if(!Number.isInteger(i)||!paymentSelections[i])return;const line=paymentSelections[i];if(e.target.matches('[data-pay-line-amount]'))line.amount=e.target.value;if(e.target.matches('[data-pay-line-usd]'))line.usdEquivalent=e.target.value;if(e.target.matches('[data-pay-line-ref]'))line.reference=e.target.value;updatePaymentUi()});
  $('repairPaymentLines')?.addEventListener('change',e=>{
    if(e.target.matches('[data-pay-line-method]')){const i=Number(e.target.dataset.payLineMethod),line=paymentSelections[i];if(!line)return;line.method=e.target.value;line.amount='';line.reference='';line.usdEquivalent='';line.destinationCode=normalizeRepairDestination(line.method,'');syncPrimaryMethod();if(IS_BS.has(line.method))window.ThinkStoreFX?.refresh?.().catch(()=>{});refreshPaymentMethodControls();return}
    if(e.target.matches('[data-pay-line-destination]')){const i=Number(e.target.dataset.payLineDestination),line=paymentSelections[i];if(!line)return;line.destinationCode=normalizeRepairDestination(line.method,e.target.value);updatePaymentUi()}
  });
  $('repairPaymentLines')?.addEventListener('click',e=>{const b=e.target.closest('[data-pay-line-remove]');if(!b||paymentSelections.length<=1)return;paymentSelections.splice(Number(b.dataset.payLineRemove),1);refreshPaymentMethodControls()});
  $('repairsPayForm')?.addEventListener('submit',e=>savePayment(e,detailAccount(active).budget<=0));$('repairsMarkPaid')?.addEventListener('click',e=>savePayment(e,true));
  $('repairsAddCharge')?.addEventListener('click',()=>{$('repairCatalogPanel')?.classList.remove('hidden');setTimeout(()=>$('repairCatalogSearch')?.focus(),50)});
  $('repairCatalogClose')?.addEventListener('click',()=>{$('repairCatalogPanel')?.classList.add('hidden')});
  $('repairCatalogSearch')?.addEventListener('input',e=>{clearTimeout(catalogTimer);catalogTimer=setTimeout(()=>searchCatalog(e.target.value),260)});
  $('repairCatalogResults')?.addEventListener('click',e=>{const b=e.target.closest('[data-charge-source]');if(b&&!b.disabled)addCharge(b.dataset.chargeSource,b.dataset.chargeId)});
  document.querySelectorAll('[data-extra-remove]').forEach(b=>b.addEventListener('click',()=>removeCharge(b.dataset.extraRemove)));
  $('repairDiscountType')?.addEventListener('change',()=>{const input=$('repairDiscountValue');if(input)input.max=$('repairDiscountType').value==='percent'?'100':'';updateDiscountPreview()});
  $('repairDiscountValue')?.addEventListener('input',updateDiscountPreview);$('repairDiscountReason')?.addEventListener('input',updateDiscountPreview);
  $('repairDiscountApply')?.addEventListener('click',()=>applyDiscount(false));$('repairDiscountRemove')?.addEventListener('click',()=>applyDiscount(true));updateDiscountPreview();
  $('repairsDeliveryNote')?.addEventListener('click',printDelivery);$('repairsResendDeliveryNote')?.addEventListener('click',resendDelivery);$('repairsOpenTechnical')?.addEventListener('click',()=>window.location.href='../sso-entry.html?platform=support');
}

async function open(id){
  const original=orders.find(o=>String(o.id)===String(id));if(!original)return;active=original;events=[];parts=[];extras=[];billing=null;catalog=[];resetPaymentSelections();detail();
  const modal=$('repairsModal');modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  try{const d=await api('GET',null,'?order_id='+encodeURIComponent(id));if(String(active?.id)!==String(id))return;active=d.order;events=d.events||[];parts=d.parts||[];extras=d.extras||[];billing=d.billing||null;reflectBilling(active,billing);render();detail()}
  catch(e){notice('No se pudo cargar el detalle completo: '+e.message)}
}
function close(){const m=$('repairsModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.style.overflow='';active=null;events=[];parts=[];extras=[];billing=null;catalog=[];paymentSelections=[]}
function updatePaymentUi(){if(!active)return;updateSplitCalculations()}

async function fullAmountForMethod(){
  const line=paymentSelections[0];if(!line)throw Error('Selecciona un método de pago.');selectedMethod=line.method;const a=detailAccount(active),due=a.pending,entered=Number(line.amount||0);
  if(a.budget<=0){
    if(!(entered>0))throw Error('Indica el monto recibido para definir el total final de esta reparación.');
    if(IS_BS.has(selectedMethod)){await window.ThinkStoreFX?.requireFresh();return{amount:entered,usd_equivalent:null,bootstrap:true}}
    if(CUSTOM_EQ.has(selectedMethod)){const eq=Number(line.usdEquivalent||0);if(!(eq>0))throw Error('Indica el equivalente aplicado en USD.');return{amount:entered,usd_equivalent:eq,bootstrap:true}}
    return{amount:entered,usd_equivalent:null,bootstrap:true};
  }
  if(due<=0)throw Error('La orden ya no tiene saldo pendiente.');
  if(IS_BS.has(selectedMethod)){const q=await window.ThinkStoreFX?.requireFresh();return{amount:round(due*q.rate),usd_equivalent:null,bootstrap:false}}
  if(CUSTOM_EQ.has(selectedMethod))return{amount:entered,usd_equivalent:due,bootstrap:false};
  return{amount:due,usd_equivalent:null,bootstrap:false};
}

async function saveCombinedPayment(e){
  e?.preventDefault?.();if(!active)return;const a=detailAccount(active);if(a.budget<=0)return alert('Para combinar métodos primero debe existir un total de reparación.');if(paymentSelections.length<2||paymentSelections.length>MAX_PAYMENT_METHODS)return alert('Selecciona entre 2 y 3 métodos de pago.');
  if(paymentSelections.some(x=>IS_BS.has(x.method))){try{await window.ThinkStoreFX?.requireFresh()}catch(err){return alert(err.message||'No está disponible la tasa BCV.')}}
  const calc=updateSplitCalculations();if(!calc.valid)return alert(calc.remaining>0.02?`Faltan ${usd(calc.remaining)} por distribuir.`:calc.remaining<-.02?'Los montos superan el saldo pendiente.':'Completa los montos y referencias de cada método.');
  const payments=paymentSelections.map(line=>{const code=normalizeRepairDestination(line.method,line.destinationCode),d=destinationInfo(code);return{method:line.method,amount:Number(line.amount||0),usd_equivalent:CUSTOM_EQ.has(line.method)?Number(line.usdEquivalent||0):null,reference:String(line.reference||'').trim(),destination_code:code||null,destination_name:d?.name||null}});
  for(const p of payments){if(!(p.amount>0))return alert(`Indica el monto recibido en ${p.method}.`);if(CUSTOM_EQ.has(p.method)&&!(p.usd_equivalent>0))return alert(`Indica el equivalente USD para ${p.method}.`);if(NEEDS_REF.has(p.method)&&p.reference.length<3)return alert(`Indica la referencia de ${p.method}.`)}
  const note=$('repairsPayNote')?.value.trim()||'';const detail=payments.map(p=>`${p.method}: ${IS_BS.has(p.method)?ves(p.amount):p.method==='EUR'?`EUR ${p.amount.toFixed(2)}`:p.method==='USDT'?`${p.amount.toFixed(2)} USDT`:p.method==='Otro'?`Otro ${p.amount.toFixed(2)}`:usd(p.amount)}`).join(' + ');
  if(!confirm(`¿Confirmar pago combinado para ${active.code}?\n\n${detail}\n\nTotal aplicado: ${usd(a.pending)}`))return;
  const btn=$('repairsMarkPaid');if(btn){btn.classList.add('is-loading');btn.disabled=true;btn.textContent='Cobrando pago combinado…'}
  const id=active.id;
  try{
    const res=await api('POST',{action:'multi_pay',order_id:id,payments,note});await load(true);const latest=await api('GET',null,'?order_id='+encodeURIComponent(id));active=latest.order;events=latest.events||[];parts=latest.parts||[];extras=latest.extras||[];billing=latest.billing||null;resetPaymentSelections();detail();
    const deliveryMsg=res.email_sent?'Se creó la Nota de Entrega y fue enviada al cliente.':'Se creó la Nota de Entrega.';const invMsg=res.store_inventory?.ok===false?' IMPORTANTE: revisa el producto adicional en Inventory porque no se pudo cerrar su salida de stock.':'';const bankMsg=res.bank_warnings?.length?` IMPORTANTE: ${res.bank_warnings.join(' · ')}`:'';alert(`Pago combinado registrado correctamente. La reparación quedó Pagada. ${deliveryMsg}${invMsg}${bankMsg}`)
  }catch(err){alert(err.message||'No se pudo registrar el pago combinado.');try{await load(true);const latest=await api('GET',null,'?order_id='+encodeURIComponent(id));active=latest.order;events=latest.events||[];parts=latest.parts||[];extras=latest.extras||[];billing=latest.billing||null;detail()}catch(_){detail()}}
}

async function savePayment(e,markPaid){
  e?.preventDefault?.();if(!active)return;if(paymentSelections.length>1)return saveCombinedPayment(e);const id=active.id,line=paymentSelections[0];if(!line)return alert('Selecciona un método de pago.');selectedMethod=line.method;
  let amount=Number(line.amount||0),usdEquivalent=CUSTOM_EQ.has(selectedMethod)?Number(line.usdEquivalent||0):null;let finalizeNoQuote=false;
  if(markPaid){try{const f=await fullAmountForMethod();amount=f.amount;finalizeNoQuote=!!f.bootstrap;if(f.usd_equivalent)usdEquivalent=f.usd_equivalent;line.amount=Number(amount).toFixed(2);if(CUSTOM_EQ.has(selectedMethod)&&!finalizeNoQuote)line.usdEquivalent=detailAccount(active).pending.toFixed(2);refreshPaymentMethodControls();if(!finalizeNoQuote&&CUSTOM_EQ.has(selectedMethod)&&!(amount>0))return alert(`Indica cuánto recibiste en ${selectedMethod}; el saldo USD ya quedó preparado.`)}catch(err){return alert(err.message||'No se pudo calcular el saldo.')}}
  const reference=String(line.reference||'').trim(),note=$('repairsPayNote')?.value.trim()||'';
  const destinationCode=normalizeRepairDestination(selectedMethod,line.destinationCode),destination=destinationInfo(destinationCode);
  if(!Number.isFinite(amount)||amount<=0)return alert('Indica un monto válido.');if(CUSTOM_EQ.has(selectedMethod)&&(!Number.isFinite(usdEquivalent)||usdEquivalent<=0))return alert('Indica el equivalente aplicado en USD.');if(NEEDS_REF.has(selectedMethod)&&reference.length<3)return alert('Indica la referencia de la transacción.');if(payRegistry()?.needsDestination?.(selectedMethod)&&!destinationCode)return alert(`Selecciona la cuenta destino para ${selectedMethod}.`);
  if(IS_BS.has(selectedMethod)){try{await window.ThinkStoreFX?.requireFresh()}catch(err){return alert(err.message||'No está disponible la tasa BCV.')}}
  const label=finalizeNoQuote?'cobrar este monto como total final':markPaid?'cobrar el saldo total':'registrar este abono';if(!confirm(`¿Confirmar ${label} mediante ${selectedMethod} para la orden ${active.code}?`))return;
  const btn=markPaid?$('repairsMarkPaid'):$('repairsPaySave');if(btn){btn.classList.add('is-loading');btn.disabled=true;btn.textContent=markPaid?'Cobrando…':'Registrando…'}
  try{
    const res=await api('POST',{action:'pay',order_id:id,method:selectedMethod,amount,usd_equivalent:usdEquivalent,reference,note,finalize_no_quote:finalizeNoQuote,destination_code:destinationCode||null,destination_name:destination?.name||null});await load(true);const latest=await api('GET',null,'?order_id='+encodeURIComponent(id));active=latest.order;events=latest.events||[];parts=latest.parts||[];extras=latest.extras||[];billing=latest.billing||null;resetPaymentSelections();detail();
    if(res.fully_paid){const deliveryMsg=res.email_sent?'Se creó la Nota de Entrega y fue enviada al cliente.':'Se creó la Nota de Entrega.';const invMsg=res.store_inventory?.ok===false?' IMPORTANTE: revisa el producto adicional en Inventory porque no se pudo cerrar su salida de stock.':'';const bankMsg=res.bank_warning?` IMPORTANTE: ${res.bank_warning}`:'';alert(finalizeNoQuote?`Cobro completado. El monto quedó guardado como total final. ${deliveryMsg}${invMsg}${bankMsg}`:`Pago completado. La reparación quedó Pagada. ${deliveryMsg}${invMsg}${bankMsg}`)}else alert('Abono registrado correctamente.');
  }catch(err){alert(err.message||'No se pudo registrar el pago.');detail()}
}


async function applyDiscount(remove=false){
  if(!active)return;const type=remove?'usd':($('repairDiscountType')?.value||'percent'),value=remove?0:Number($('repairDiscountValue')?.value||0),reason=remove?'':($('repairDiscountReason')?.value.trim()||'');
  if(!remove&&(!Number.isFinite(value)||value<0))return alert('Indica un descuento válido.');if(!remove&&type==='percent'&&value>100)return alert('El porcentaje no puede superar 100%.');
  const btn=remove?$('repairDiscountRemove'):$('repairDiscountApply');if(btn){btn.disabled=true;btn.classList.add('is-loading')}
  try{const res=await api('POST',{action:'update_discount',order_id:active.id,discount_type:type,discount_value:value,discount_reason:reason});active=res.order||active;billing=res.billing||billing;extras=res.extras||extras;parts=res.parts||parts;reflectBilling(active,billing);render();detail();alert(remove?'Descuento eliminado.':'Descuento aplicado al total de la reparación.')}catch(e){alert(e.message||'No se pudo aplicar el descuento.');if(btn){btn.disabled=false;btn.classList.remove('is-loading')}}
}

async function searchCatalog(value){
  if(!active)return;const term=String(value||'').trim();const box=$('repairCatalogResults');if(term.length<2){catalog=[];if(box)box.innerHTML=catalogRows();return}
  if(box)box.innerHTML='<div class="repair-catalog-empty">Buscando en Inventory…</div>';
  try{const d=await api('GET',null,'?order_id='+encodeURIComponent(active.id)+'&catalog_search='+encodeURIComponent(term));catalog=d.catalog||[];if(box)box.innerHTML=catalogRows()}
  catch(e){if(box)box.innerHTML=`<div class="repair-catalog-empty">${esc(e.message||'No se pudo buscar.')}</div>`}
}
async function addCharge(source,sourceId){
  if(!active)return;try{const res=await api('POST',{action:'add_charge',order_id:active.id,source,source_id:sourceId,quantity:1});extras=res.extras||extras;parts=res.parts||parts;billing=res.billing||billing;catalog=[];reflectBilling(res.order||active,billing);render();detail();alert(res.added_kind==='support_part'?'Repuesto reservado desde el inventario de Servicio Técnico. El pendiente por cobrar ya quedó actualizado.':'Cargo añadido a la reparación. El pendiente por cobrar ya quedó actualizado.')}
  catch(e){alert(e.message||'No se pudo añadir el cargo.')}
}
async function removeCharge(itemId){
  if(!active||!confirm('¿Quitar este cargo de la reparación?'))return;try{const res=await api('POST',{action:'remove_charge',order_id:active.id,item_id:itemId});extras=res.extras||[];billing=res.billing||billing;reflectBilling(res.order||active,billing);render();detail()}
  catch(e){alert(e.message||'No se pudo quitar el cargo.')}
}

async function deliveryNoteAction(action){
  if(!active)throw Error('No hay una reparación seleccionada.');
  return api('POST',{action,order_id:active.id});
}
async function printDelivery(){
  if(!active)return;const a=detailAccount(active);
  if(!a.paidOff){alert('La Nota de Entrega se habilita cuando el saldo está completamente pagado.');return}
  const w=window.open('about:blank','_blank','width=900,height=1100');
  if(!w){alert('Permite ventanas emergentes para ver la Nota de Entrega.');return}
  w.document.write('<p style="font-family:-apple-system,BlinkMacSystemFont,Arial;padding:30px">Cargando Nota de Entrega…</p>');
  try{
    const data=await deliveryNoteAction('view_delivery_note');
    w.document.open();
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Nota de Entrega ${esc(active.code||'')}</title><style>.ts-printbar{position:sticky;top:0;z-index:20;padding:10px;text-align:center;background:rgba(255,255,255,.96);border-bottom:1px solid #e5e5ea}.ts-printbar button{border:0;border-radius:999px;background:#111;color:#fff;padding:10px 17px;font-weight:800;cursor:pointer}@media print{.ts-printbar{display:none}}</style></head><body style="margin:0"><div class="ts-printbar"><button onclick="window.print()">Imprimir / PDF</button></div>${data.html||''}</body></html>`);
    w.document.close();
  }catch(err){
    w.document.open();w.document.write(`<p style="font-family:-apple-system,BlinkMacSystemFont,Arial;padding:30px">${esc(err.message||'No se pudo generar la Nota de Entrega.')}</p>`);w.document.close();
  }
}
async function resendDelivery(){
  if(!active)return;
  if(!active.client_email){alert('La orden no tiene correo del cliente. Puedes visualizar o imprimir la Nota de Entrega.');return}
  if(!confirm(`¿Reenviar la Nota de Entrega de ${active.code} a ${active.client_email}?`))return;
  const btn=$('repairsResendDeliveryNote');if(btn){btn.disabled=true;btn.textContent='Enviando…'}
  try{await deliveryNoteAction('resend_delivery_note');alert('Nota de Entrega reenviada correctamente al correo del cliente.')}
  catch(err){alert(err.message||'No se pudo reenviar la Nota de Entrega.')}
  finally{if(btn){btn.disabled=false;btn.textContent='Reenviar al correo'}}
}
function init(){
  window.addEventListener('thinkstore:fx-updated',()=>{if(active&&paymentSelections.some(x=>IS_BS.has(x.method)))updatePaymentUi()});
  $('repairsRefresh')?.addEventListener('click',()=>load(true));$('repairsOpenSupport')?.addEventListener('click',()=>location.href='../sso-entry.html?platform=support');$('repairsSearch')?.addEventListener('input',e=>{query=e.target.value;render()});
  document.querySelectorAll('[data-repair-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.repairFilter;render()}));$('repairsList')?.addEventListener('click',e=>{const id=e.target.closest('[data-repair-open]')?.dataset.repairOpen;if(id)open(id)});$('repairsClose')?.addEventListener('click',close);$('repairsBackdrop')?.addEventListener('click',close);window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('repairsModal')?.classList.contains('open'))close()});
}
window.ThinkStoreRepairs={load,setAuth:fn=>{getToken=fn;initialized=false},setUser:u=>{user=u},reset:()=>{orders=[];active=null;events=[];parts=[];extras=[];billing=null;catalog=[];initialized=false;getToken=null;notice('');close()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
