'use strict';
const {css}=require('./delivery-note-template');
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const usd=n=>'USD '+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=v=>{try{return new Date(v||Date.now()).toLocaleString('es-VE',{timeZone:'America/Caracas',dateStyle:'medium',timeStyle:'short'})}catch{return '—'}};
const line=(a,b)=>`<div class="ts-note-row"><b>${esc(a)}</b><span>${esc(b)}</span></div>`;
function render({order={},events=[]}={}){
 const total=Math.max(0,Number(order.quote_amount||0));const paid=Math.max(0,Number(order.amount_paid||0)),due=Math.max(0,Math.round((total-paid)*100)/100);
 if(!(paid>0&&due>0))throw Error('El comprobante provisional requiere un abono confirmado y saldo pendiente.');
 const finance=order.reception_checklist?.__financing||{},history=(events||[]).filter(e=>Number.isFinite(Number(e.amount_delta))&&Number(e.amount_delta)!==0).slice().reverse();
 const rows=history.map(e=>line(`${e.event_type==='reversal'?'Anulación':'Abono'} · ${date(e.occurred_at)} · ${e.payment_method||'Sin método'}`,`${Number(e.amount_delta)<0?'−':''}${usd(Math.abs(Number(e.amount_delta)))}`)).join('');
 return css+`<div class="ts-note-doc"><article class="ts-note-sheet">
  <header class="ts-note-top"><div class="ts-note-brand"><div><div class="ts-note-wordmark">ThinkStore</div><div class="ts-note-slogan">TODO LO QUE DESEAS EN UN MISMO LUGAR</div></div></div><div class="ts-note-number"><small>NÚMERO DE ORDEN</small><strong>${esc(order.code||'')}</strong><span>Emitido: ${esc(date(Date.now()))}</span></div></header>
  <h1 class="ts-note-title">Comprobante provisional de abonos</h1><p class="ts-note-intro"><strong>Pago parcial. No es Nota de Entrega ni constancia de cancelación total.</strong> La Nota de Entrega definitiva se genera únicamente cuando el saldo es cero.</p>
  <section class="ts-note-section"><h3>Cliente y equipo</h3><div class="ts-note-inner ts-note-client"><div>${line('Cliente',order.client_name||'—')}${line('Correo',order.client_email||'—')}${line('Teléfono',order.client_phone||'—')}</div><div>${line('Equipo',order.device_model||'—')}${line('Serial / IMEI',order.serial_imei||'—')}${line('Estado técnico',order.status||'—')}</div></div></section>
  <section class="ts-note-section"><h3>Financiamiento</h3><div class="ts-note-inner ts-note-client"><div>${line('Total reparación',usd(total))}${line('Abonado confirmado',usd(paid))}</div><div>${line('Saldo pendiente',usd(due))}${line('Vencimiento',finance.due_date||'No indicado')}</div></div></section>
  <section class="ts-note-section"><h3>Historial de pagos y anulaciones</h3><div class="ts-note-inner">${rows||'No hay movimientos disponibles.'}</div></section>
  <section class="ts-note-section"><h3>Condición</h3><div class="ts-note-inner">Documento informativo de abonos recibidos. No acredita pago completo ni modifica el estado técnico o de entrega del equipo.</div></section>
  <footer class="ts-note-footer"><div class="ts-note-sign">ThinkStore <b>Servicio Técnico</b></div><div><a href="mailto:soporte@thinkstore.com.ve">soporte@thinkstore.com.ve</a></div></footer></article></div>`;
}
module.exports={render};
