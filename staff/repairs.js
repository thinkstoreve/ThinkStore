/* ThinkStore V14.89 — App Ventas · Servicio / Cobros y abonos restaurado. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const usd=v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const ves=v=>'Bs. '+Number(v||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt=(v,o)=>String(o?.quote_currency||'USD').toUpperCase()==='USD'?usd(v):ves(v);
const date=v=>{try{return v?new Date(v).toLocaleString('es-VE',{timeZone:'America/Caracas',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}catch{return '—'}};
const METHODS=['Efectivo USD','Efectivo Bs','Pago Móvil','Zelle','Transferencia USD','Transferencia Bs','Punto de venta Bs'];
const IS_BS=new Set(['Efectivo Bs','Pago Móvil','Transferencia Bs','Punto de venta Bs']);
let getToken=null,orders=[],active=null,events=[],filter='pending',query='',loading=false,initialized=false,user=null;
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
function summaries(){const viable=orders.filter(o=>!account(o).canceled&&String(o.quote_currency||'USD').toUpperCase()==='USD');const due=viable.filter(o=>account(o).pending>0),paid=viable.filter(o=>account(o).paidOff),partial=viable.filter(o=>account(o).partial);
  setText('repairsPendingTotal',usd(due.reduce((n,o)=>n+account(o).pending,0)));
  setText('repairsPendingCount',`${due.length} órdenes`);
  setText('repairsPaidTotal',usd(paid.reduce((n,o)=>n+account(o).paid,0)));
  setText('repairsPaidCount',`${paid.length} órdenes`);
  setText('repairsPartialTotal',usd(partial.reduce((n,o)=>n+account(o).paid,0)));
  setText('repairsPartialCount',`${partial.length} orden(es) con abono`);
  setText('repairsAllCount',orders.length);
}
function row(o){const a=account(o);const paid=a.paidOff;return `<article class="repairs-row" data-repair-row="${esc(o.id)}">
  <div><b>${esc(o.code||'Sin código')}</b><small>${esc(o.client_name||'Sin cliente')} · ${date(o.created_at)}</small></div>
  <div class="repairs-device"><b>${esc(o.device_model||'Equipo sin modelo')}</b><small>${esc(o.status||'Sin estado')} · ${esc(o.quote_status||'Cotización pendiente')}</small></div>
  <div class="repairs-total"><span class="repairs-pill ${paid?'paid':a.partial?'partial':''}">${paid?'Cobrado':a.partial?'Abonado':a.canceled?'Cancelado':'Por cobrar'}</span><small>${paid?`Cobrado ${fmt(a.paid,o)}`:a.budget>0?`Pendiente ${fmt(a.pending,o)}`:'Sin cotización'}</small></div>
  <div class="repairs-action"><button class="secondary service-pay-open" data-repair-open="${esc(o.id)}" type="button">${paid?'Ver cobro':'Cobrar / abonar'} →</button></div></article>`}
function render(){summaries();$('repairsList').innerHTML='';const term=query.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const visible=orders.filter(o=>{const a=account(o);if(filter==='pending'&&(a.pending<=0||a.canceled))return false;if(filter==='paid'&&!a.paidOff)return false;const hay=[o.code,o.client_name,o.client_phone,o.device_model,o.serial_imei,o.status].join(' ').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');return !term||hay.includes(term)});
 $('repairsList').innerHTML=visible.length?visible.map(row).join(''):'<div class="repairs-empty">No hay reparaciones que coincidan con este filtro.</div>';
 document.querySelectorAll('[data-repair-filter]').forEach(b=>b.classList.toggle('active',b.dataset.repairFilter===filter));
}
async function load(force=false){if(loading)return;if(!getToken)return notice('Inicia sesión en Staff para consultar reparaciones.');if(initialized&&!force){render();return}loading=true;notice('Consultando las reparaciones del panel de Soporte…');$('repairsRefresh').disabled=true;
 try{const d=await api('GET');orders=d.orders||[];initialized=true;render();const foreign=orders.filter(o=>String(o.quote_currency||'USD').toUpperCase()!=='USD').length;notice([d.partial?'Se muestra el historial más reciente. Consulta Soporte si necesitas órdenes más antiguas.':'',foreign?`${foreign} cotización(es) en moneda diferente a USD no se incluyen en los totales USD. Esas órdenes se revisan en Soporte.`:''].filter(Boolean).join(' '))}
 catch(e){notice(e.message);if(!initialized)$('repairsList').innerHTML='<div class="repairs-empty">No se pudieron cargar las órdenes desde Soporte. No se muestran datos de prueba.</div>'}
 finally{loading=false;$('repairsRefresh').disabled=false}
}
function detail(){const o=active;if(!o)return;const a=account(o);$('repairsModalTitle').textContent=`${o.code||'Orden'} · ${o.client_name||'Cliente'}`;
 $('repairsModalBody').innerHTML=`<div class="repairs-meta">
 <div><b>Cliente</b>${esc(o.client_name||'—')}<small>${esc(o.client_phone||'')}</small></div><div><b>Equipo</b>${esc(o.device_model||'—')}<small>${esc(o.serial_imei||'Sin serial')}</small></div>
 <div><b>Estado</b>${esc(o.status||'—')}</div><div><b>Presupuesto</b>${esc(o.quote_status||'Pendiente')}</div></div>
 <div class="repairs-summary"><div><small>Presupuesto</small><b>${fmt(a.budget,o)}</b></div><div><small>Abonado</small><b>${fmt(a.paid,o)}</b></div><div><small>Pendiente</small><b>${fmt(a.pending,o)}</b></div></div>
 <div class="repairs-pay-hint">Los pagos se guardan en la misma orden de Soporte y su historial se refleja en Enterprise. Para emitir la nota de entrega, la reparación debe estar totalmente pagada y lista para entregar.</div>
 <hr class="repairs-divider">
 <div><h3>Historial de cobros</h3><div id="repairsEvents" class="repairs-history">Cargando historial…</div></div>
 <hr class="repairs-divider">
 <form id="repairsPayForm" class="repairs-pay-form">
   <h3>Registrar cobro o abono</h3>
   <div class="repairs-pay-grid"><label>Método<select id="repairsPayMethod">${METHODS.map(m=>`<option>${esc(m)}</option>`).join('')}</select></label>
   <label>Monto recibido <small id="repairsPayUnit">USD</small><input id="repairsPayAmount" type="number" min="0.01" step="0.01" placeholder="0,00" required></label></div>
   <div id="repairsBcvBox" class="repairs-pay-hint hidden">Consultando BCV…</div>
   <label>Referencia (obligatoria para pagos bancarios)<input id="repairsPayReference" maxlength="100" placeholder="N.º de operación"></label>
   <label>Observación (opcional)<textarea id="repairsPayNote" maxlength="300" placeholder="Observaciones del abono"></textarea></label>
   <div class="repairs-pay-actions"><button class="primary" id="repairsPaySave" type="submit" ${a.canceled||a.pending<=0||a.budget<=0||String(o.quote_currency||'USD').toUpperCase()!=='USD'?'disabled':''}>Registrar cobro / abono</button><button class="secondary" id="repairsFillBalance" type="button" ${a.canceled||a.pending<=0?'disabled':''}>Completar saldo</button></div>
 </form>
 <div class="repairs-print-actions"><button class="secondary" id="repairsDeliveryNote" type="button" ${!(a.paidOff&&/listo|entregado/i.test(o.status||''))?'disabled':''}>Imprimir nota de entrega</button><button class="secondary" id="repairsOpenTechnical" type="button">Abrir en Servicio Técnico ↗</button></div>
 ${!(a.paidOff&&/listo|entregado/i.test(o.status||''))?'<p class="repairs-pay-hint">La nota se habilita después de cobrar el total y marcar el equipo como listo o entregado en Soporte.</p>':''}`;
 $('repairsPayMethod').addEventListener('change',updateBCV);
 $('repairsPayAmount').addEventListener('input',updateBCV);
 $('repairsFillBalance').addEventListener('click',fillBalance);
 $('repairsPayForm').addEventListener('submit',savePayment);
 $('repairsDeliveryNote').addEventListener('click',printDelivery);
 $('repairsOpenTechnical').addEventListener('click',()=>window.location.href='../sso-entry.html?platform=support');
 updateBCV();
}
async function open(id){const original=orders.find(o=>o.id===id);if(!original)return;active=original;events=[];detail();const modal=$('repairsModal');modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
 try{const d=await api('GET',null,'?order_id='+encodeURIComponent(id));if(active?.id!==id)return;active=d.order;events=d.events||[];detail();$('repairsEvents').innerHTML=d.history_available?events.length?events.map(e=>`<div><b>${esc(e.event_type||'Abono')}</b> · ${usd(e.amount_delta)} · ${date(e.occurred_at)} · ${esc(e.payment_method||'')}</div>`).join(''):'Sin movimientos previos.': 'Historial detallado aún no disponible; se muestran los importes reales de la orden.';
 }catch(e){$('repairsEvents').textContent='No se pudo cargar el historial: '+e.message}
}
function close(){const m=$('repairsModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.style.overflow='';active=null;events=[]}
function updateBCV(){if(!active)return;const method=$('repairsPayMethod')?.value||'Efectivo USD';const isBs=IS_BS.has(method);$('repairsPayUnit').textContent=isBs?'Bs.':'USD';$('repairsPayReference').required=!method.startsWith('Efectivo');$('repairsBcvBox').classList.toggle('hidden',!isBs);
 if(isBs){const quote=window.ThinkStoreFX?.snapshot(1);const n=Number($('repairsPayAmount').value||0);$('repairsBcvBox').textContent=quote?`${ves(n)} ≈ ${usd(round(n/quote.rate))} · BCV ${quote.rate} · ${quote.effective_date}${quote.stale?' · SIN VERIFICAR':''}`:'Tasa BCV no disponible. No se permitirá registrar pagos en Bs. hasta verificarla.';}
}
function fillBalance(){if(!active)return;if(String(active.quote_currency||'USD').toUpperCase()!=='USD')return;const due=account(active).pending;if(due<=0)return;const method=$('repairsPayMethod').value;const q=window.ThinkStoreFX?.snapshot(1);if(IS_BS.has(method)&&(!q||q.stale)){updateBCV();return}const amount=IS_BS.has(method)?round(due*q.rate):due;$('repairsPayAmount').value=amount.toFixed(2);updateBCV()}
async function savePayment(e){e.preventDefault();if(!active)return;const id=active.id;
 const method=$('repairsPayMethod').value,amount=Number($('repairsPayAmount').value),reference=$('repairsPayReference').value.trim(),note=$('repairsPayNote').value.trim();
 if(!Number.isFinite(amount)||amount<=0)return alert('Indica un monto válido.');
 if(IS_BS.has(method)){try{await window.ThinkStoreFX?.requireFresh();}catch(e){return alert(e.message||'No está disponible la tasa BCV.')}}
 if(!confirm(`¿Confirmar cobro de ${IS_BS.has(method)?ves(amount):usd(amount)} mediante ${method} para la orden ${active.code}?`))return;
 const btn=$('repairsPaySave');btn.disabled=true;btn.textContent='Registrando…';
 try{const res=await api('POST',{action:'pay',order_id:id,method,amount,reference,note});await load(true);if(!res.note_saved)notice('Cobro registrado; no se pudo agregar la anotación a la bitácora. Revísala desde Soporte.');
 const latest=await api('GET',null,'?order_id='+encodeURIComponent(id));active=latest.order;events=latest.events||[];detail();$('repairsEvents').innerHTML=events.length?events.map(e=>`<div><b>${esc(e.event_type||'Abono')}</b> · ${usd(e.amount_delta)} · ${date(e.occurred_at)} · ${esc(e.payment_method||'')}</div>`).join(''):'Pago guardado. Historial detallado no disponible.';window.alert((res.fully_paid?'Pago completado. Repuestos reservados consumidos y orden marcada ✓ Cobrado.':'Abono registrado correctamente en Soporte.')+'\nImporte aplicado: '+usd(res.payment?.equivalent||0)+(res.fully_paid&&!res.email_sent?'\nEl cobro quedó guardado; el correo al cliente no pudo confirmarse.':''));
 }catch(err){window.alert(err.message||'No se pudo registrar el cobro.');btn.disabled=false;btn.textContent='Registrar cobro / abono';}
}
function printDelivery(){if(!active)return;const o=active,a=account(o);if(!a.paidOff||!/listo|entregado/i.test(o.status||'')){alert('Confirma el pago y el estado listo para entregar antes de imprimir.');return}
 const d=window.open('','_blank','width=800,height=1000');if(!d){alert('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para ThinkStore.');return}
 const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Nota de entrega · ${esc(o.code)}</title><style>*{box-sizing:border-box}body{margin:0;padding:42px;font:14px/1.5 -apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#17191c}.head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:24px}.brand{display:flex;align-items:center;gap:15px}.brand img{width:56px;height:56px;object-fit:contain}.brand h1{margin:0;font-size:26px}.small{color:#777;font-size:12px}.title{text-align:center;margin:32px 0;font-size:22px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px 22px}.cell{border-bottom:1px solid #eee;padding-bottom:10px}.cell span{display:block;color:#757b80;font-size:12px}.cell strong{font-size:15px}.pay{border:1px solid #ddd;border-radius:16px;margin:28px 0;padding:18px;display:flex;justify-content:space-between}.sign{display:flex;gap:60px;margin-top:75px}.sign>div{flex:1;text-align:center;border-top:1px solid #666;padding-top:10px}footer{margin-top:45px;color:#666;font-size:11px}@media print{body{padding:22px}}</style></head><body><header class="head"><div class="brand"><img src="${location.origin}/logo-thinkstore.png" alt=""><div><h1>ThinkStore</h1><div class="small">Servicio Técnico · Chacao, Caracas</div></div></div><div class="small">${date(new Date().toISOString())}<br>Orden ${esc(o.code)}</div></header><h2 class="title">Nota de entrega · Servicio Técnico</h2><div class="grid"><div class="cell"><span>Cliente</span><strong>${esc(o.client_name)}</strong></div><div class="cell"><span>Teléfono</span><strong>${esc(o.client_phone)}</strong></div><div class="cell"><span>Equipo</span><strong>${esc(o.device_model)}</strong></div><div class="cell"><span>Serial / IMEI</span><strong>${esc(o.serial_imei||'No registrado')}</strong></div><div class="cell"><span>Servicio / falla reportada</span><strong>${esc(o.reported_issue||'Servicio técnico')}</strong></div><div class="cell"><span>Estado de la reparación</span><strong>${esc(o.status)}</strong></div><div class="cell"><span>Garantía del servicio</span><strong>${Number(o.warranty_days||0)} día(s)</strong></div><div class="cell"><span>Forma de entrega</span><strong>${esc(o.delivery_method||'Retiro en tienda')}</strong></div></div><div class="pay"><div><div class="small">Total cobrado</div><strong>${fmt(a.paid,o)}</strong></div><div><div class="small">Saldo pendiente</div><strong>${fmt(a.pending,o)}</strong></div></div><p>El cliente recibe el equipo descrito y confirma la entrega de los accesorios detallados en la orden de servicio.</p><section class="sign"><div>Entregado por ThinkStore</div><div>Recibido conforme · Cliente</div></section><footer>Documento emitido desde ThinkStore Staff. El registro de la orden y sus cobros permanece en Soporte y Enterprise. La impresión no cambia automáticamente el estado de entrega.</footer></body></html>`;
 d.document.open();d.document.write(html);d.document.close();d.addEventListener('load',()=>d.print(),{once:true});
}
function init(){if($('repairsRefresh'))$('repairsRefresh').addEventListener('click',()=>load(true));if($('repairsOpenSupport'))$('repairsOpenSupport').addEventListener('click',()=>location.href='../sso-entry.html?platform=support');if($('repairsSearch'))$('repairsSearch').addEventListener('input',e=>{query=e.target.value;render()});document.querySelectorAll('[data-repair-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.repairFilter;render()}));$('repairsList')?.addEventListener('click',e=>{const id=e.target.closest('[data-repair-open]')?.dataset.repairOpen;if(id)open(id)});$('repairsClose')?.addEventListener('click',close);$('repairsBackdrop')?.addEventListener('click',close);window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('repairsModal')?.classList.contains('open'))close()})}
window.ThinkStoreRepairs={load,setAuth:fn=>{getToken=fn;initialized=false},setUser:u=>{user=u},reset:()=>{orders=[];active=null;events=[];initialized=false;getToken=null;notice('');close()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
