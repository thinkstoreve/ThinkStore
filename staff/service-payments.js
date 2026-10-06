(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>'$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const sb=window.__THINKSTORE_STAFF_SUPABASE__;
const state={loaded:false,loading:false,orders:[],metrics:{},query:'',selected:null,method:'Efectivo USD'};

async function headers(json=false){const h={};const {data}=await sb.auth.getSession();const t=data?.session?.access_token;if(t)h.Authorization='Bearer '+t;if(json)h['Content-Type']='application/json';return h}
function toast(text,ms=3200){const el=$('toast');if(!el)return;el.textContent=text;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,ms)}
function show(id,on=true){const el=typeof id==='string'?$(id):id;if(el)el.classList.toggle('hidden',!on)}
function fmtDate(v){if(!v)return '—';try{return new Date(v).toLocaleString('es-VE',{timeZone:'America/Caracas',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}catch{return String(v)}}
function methodCurrency(method){const s=norm(method);if(/pago movil|punto de venta|efectivo bs|transferencia bs|bolivar|\bves\b/.test(s))return 'VES';if(/eur|euro/.test(s))return 'EUR';if(/usdt|tether/.test(s))return 'USDT';if(/otro|sin definir/.test(s))return 'N/D';return 'USD'}
function statusTone(o){if(Number(o.pending_amount||0)<=0&&Number(o.amount_paid||0)>0)return 'paid';if(Number(o.amount_paid||0)>0)return 'partial';return 'pending'}
function setNotice(text='',error=false){const box=$('serviceConnectionNotice');if(!box)return;if(!text){show(box,false);return}show(box,true);box.classList.toggle('error',error);box.innerHTML=`<b>${error?'No se pudo conectar':'Servicio Técnico conectado'}</b><span>${esc(text)}</span>`}

async function load(force=false){
  if(!sb||state.loading)return;
  if(state.loaded&&!force){render();return}
  state.loading=true;setNotice('Cargando órdenes reales y saldos de Soporte…',false);
  try{
    const r=await fetch('/.netlify/functions/staff-service-payment',{headers:await headers(),cache:'no-store'}),d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw Error(d.error||'No se pudo cargar Servicio Técnico');
    state.orders=d.orders||[];state.metrics=d.metrics||{};state.loaded=true;setNotice('',false);render();
  }catch(e){setNotice(e.message||String(e),true);$('serviceOrdersList').innerHTML='<div class="empty-state">No fue posible cargar las órdenes de Soporte. Revisa la conexión indicada arriba.</div>'}
  finally{state.loading=false}
}
function render(){
  const m=state.metrics||{};
  $('serviceMetricOpen').textContent=Number(m.open||0);
  $('serviceMetricPending').textContent=money(m.pending_amount||0);
  $('serviceMetricPendingCount').textContent=`${Number(m.pending||0)} orden${Number(m.pending||0)===1?'':'es'} pendiente${Number(m.pending||0)===1?'':'s'}`;
  $('serviceMetricCollected').textContent=money(m.collected||0);
  const q=norm(state.query),rows=(state.orders||[]).filter(o=>!q||norm([o.code,o.client_name,o.device_model,o.status,o.payment_method].join(' ')).includes(q));
  const box=$('serviceOrdersList');
  if(!rows.length){box.innerHTML='<div class="empty-state">No hay órdenes que coincidan con la búsqueda.</div>';return}
  box.innerHTML=rows.slice(0,200).map(o=>{
    const pending=Number(o.pending_amount||0),paid=Number(o.amount_paid||0),tone=statusTone(o),canPay=pending>0||Number(o.quote_amount||0)<=0;
    return `<article class="service-order-row">
      <div class="service-order-main"><div class="service-order-code"><b>${esc(o.code||'Orden')}</b><span class="service-pay-status ${tone}">${esc(o.payment_status||'Pendiente')}</span></div><strong>${esc(o.client_name||'Cliente')}</strong><small>${esc(o.device_model||'Equipo')} · ${esc(o.status||'Recibido')} · ${fmtDate(o.updated_at)}</small></div>
      <div class="service-order-money"><span>Presupuesto</span><b>${esc(o.quote_currency||'USD')} ${Number(o.quote_amount||0).toFixed(2)}</b><small>Pagado ${money(paid)} · Pendiente ${money(pending)}</small></div>
      <div class="service-order-method"><span>Método</span><b>${esc(o.payment_method||'Sin registrar')}</b><small>${esc(methodCurrency(o.payment_method||'USD'))}</small></div>
      <button class="service-pay-button" type="button" data-service-pay="${esc(String(o.id))}" ${canPay?'':'disabled'}>${pending>0?'Registrar abono':paid>0?'Pagado':'Registrar cobro'}</button>
    </article>`
  }).join('');
  box.querySelectorAll('[data-service-pay]').forEach(b=>b.addEventListener('click',()=>openPayment(b.dataset.servicePay)));
}
function openPayment(id){
  const o=state.orders.find(x=>String(x.id)===String(id));if(!o)return;
  state.selected=o;state.method='Efectivo USD';
  $('servicePaymentOrderSummary').innerHTML=`<div><span>Orden</span><b>${esc(o.code)}</b></div><div><span>Cliente</span><b>${esc(o.client_name)}</b></div><div><span>Equipo</span><b>${esc(o.device_model)}</b></div><div><span>Presupuesto</span><b>${esc(o.quote_currency||'USD')} ${Number(o.quote_amount||0).toFixed(2)}</b></div><div><span>Pagado</span><b>${money(o.amount_paid)}</b></div><div class="due"><span>Pendiente</span><b>${money(o.pending_amount)}</b></div>`;
  $('servicePaymentAmount').value=Number(o.pending_amount||0)>0?Number(o.pending_amount).toFixed(2):'';
  $('servicePaymentAmount').max=Number(o.pending_amount||0)>0?Number(o.pending_amount).toFixed(2):'';
  $('servicePaymentReference').value='';$('servicePaymentNotes').value='';
  document.querySelectorAll('[data-service-method]').forEach(b=>b.classList.toggle('active',b.dataset.serviceMethod===state.method));
  updateFx();
  const modal=$('servicePaymentModal');modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
}
function closePayment(){const m=$('servicePaymentModal');m?.classList.remove('open');m?.setAttribute('aria-hidden','true');document.body.style.overflow='';state.selected=null}
async function updateFx(){
  const box=$('servicePaymentFx');if(!box)return;const currency=methodCurrency(state.method),amount=Number($('servicePaymentAmount')?.value||0);
  if(currency!=='VES'||!(amount>0)){show(box,false);return}
  show(box,true);box.textContent='Consultando tasa oficial…';
  try{if(!window.ThinkStoreFX)throw Error();await window.ThinkStoreFX.refresh();const q=window.ThinkStoreFX.snapshot(amount);box.textContent=q?`${money(amount)} base × ${q.rate} = ${window.ThinkStoreFX.ves(q.total_ves)} · ${q.source}`:'Tasa no disponible'}catch{box.textContent='No se pudo consultar la tasa oficial en este momento.'}
}
async function submit(e){
  e.preventDefault();if(!state.selected)return;
  const amount=Number($('servicePaymentAmount').value||0);if(!(amount>0))return toast('Indica el monto recibido');
  const button=$('confirmServicePayment');button.disabled=true;button.textContent='Registrando…';
  try{
    const payload={action:'record_payment',order_id:state.selected.id,amount_usd:amount,payment_method:state.method,reference:$('servicePaymentReference').value.trim(),notes:$('servicePaymentNotes').value.trim()};
    const r=await fetch('/.netlify/functions/staff-service-payment',{method:'POST',headers:await headers(true),body:JSON.stringify(payload)}),d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw Error(d.error||'No se pudo registrar el cobro');
    state.orders=d.orders||state.orders;state.metrics=d.metrics||state.metrics;state.loaded=true;closePayment();render();toast(`Cobro registrado en ${d.order?.code||'Servicio Técnico'}`,4200);
  }catch(err){toast(err.message||'No se pudo registrar el cobro',5000)}
  finally{button.disabled=false;button.textContent='Registrar cobro'}
}
function wire(){
  document.addEventListener('click',e=>{const nav=e.target.closest('[data-view="service"]');if(nav)setTimeout(()=>load(false),30)});
  $('refreshServicePayments')?.addEventListener('click',()=>load(true));
  $('servicePaymentSearch')?.addEventListener('input',e=>{state.query=e.target.value;render()});
  $('servicePaymentChoices')?.addEventListener('click',e=>{const b=e.target.closest('[data-service-method]');if(!b)return;state.method=b.dataset.serviceMethod;document.querySelectorAll('[data-service-method]').forEach(x=>x.classList.toggle('active',x===b));updateFx()});
  $('servicePaymentAmount')?.addEventListener('input',updateFx);
  $('servicePaymentForm')?.addEventListener('submit',submit);
  $('closeServicePayment')?.addEventListener('click',closePayment);$('cancelServicePayment')?.addEventListener('click',closePayment);document.querySelector('[data-close-service-payment]')?.addEventListener('click',closePayment);
  if(location.hash==='#service')setTimeout(()=>load(false),140);
}
wire();
window.ThinkStoreServicePayments={refresh:()=>load(true)};
})();
