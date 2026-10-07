'use strict';
const {css}=require('./delivery-note-template');
const E=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const money=n=>'$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const LOGO='https://thinkstore.com.ve/assets/logo-thinkstore-email-transparent.png';
const dateParts=value=>{const d=new Date(value||Date.now());return{date:d.toLocaleDateString('es-VE',{timeZone:'America/Caracas'}),time:d.toLocaleTimeString('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'})}};
const field=(label,value)=>`<div class="ts-note-row"><b>${E(label)}</b><span>${E(value||'No indicado')}</span></div>`;
const paymentRef=events=>{const e=(events||[]).find(x=>x.event_type==='payment'&&x.reference)||(events||[]).find(x=>x.reference);return e?.reference||'No aplica'};
const paymentMethod=(order,events)=>order?.payment_method||(events||[]).find(x=>x.payment_method)?.payment_method||'Registrado';
const repairText=(order,notes)=>{const rich=(notes||[]).find(n=>String(n.work_performed||'').trim())||(notes||[]).find(n=>String(n.note||'').trim());return rich?.work_performed||order?.technical_notes||order?.quote_repair_details||rich?.note||order?.reported_issue||'Servicio técnico realizado';};
function render({order={},events=[],parts=[],notes=[]}={}){
 const stamp=dateParts(order.paid_at||order.updated_at||Date.now());
 const total=Number(order.quote_amount||0);
 const used=(parts||[]).filter(p=>String(p.status||'').toLowerCase()!=='released');
 const rows=used.length?used.map(p=>`<div class="ts-note-product"><div class="ts-note-product-body"><div class="ts-note-product-head"><strong>${E(p.service_parts?.name||p.part_name||'Repuesto')}</strong><strong>${Number(p.quantity_consumed||p.quantity_reserved||0)} × ${money(p.sale_price_snapshot||0)}</strong></div><div class="ts-note-muted">${E([p.service_parts?.sku,p.service_parts?.category].filter(Boolean).join(' · '))}</div></div></div>`).join(''):'<div>Sin repuestos registrados para esta reparación.</div>';
 const trackingParams=new URLSearchParams({orden:String(order.code||'')});
 if(order.public_token)trackingParams.set('token',String(order.public_token));
 const tracking=`https://soporte.thinkstore.com.ve/seguimiento.html?${trackingParams.toString()}`;
 const qr='https://api.qrserver.com/v1/create-qr-code/?size=120x120&data='+encodeURIComponent(tracking);
 const social=`<div class="ts-note-social"><a href="https://thinkstore.com.ve">thinkstore.com.ve</a><a href="https://www.instagram.com/thinkstore_ve/">@thinkstore_ve</a><a href="https://wa.me/584141032030">+58 414 103 2030</a></div>`;
 return css+`<div class="ts-note-doc"><article class="ts-note-sheet">
   <header class="ts-note-top"><div class="ts-note-brand"><img src="${LOGO}" alt="ThinkStore"><div><div class="ts-note-wordmark">ThinkStore</div><div class="ts-note-slogan">TODO LO QUE DESEAS EN UN MISMO LUGAR</div></div></div><div class="ts-note-number"><small>NÚMERO DE ORDEN</small><strong>${E(order.code||'Por asignar')}</strong><span>Fecha: ${E(stamp.date)}</span><span>Hora: ${E(stamp.time)}</span></div></header>
   <h1 class="ts-note-title">Nota de entrega</h1><p class="ts-note-thanks">Servicio Técnico ThinkStore</p><p class="ts-note-intro">Conserva esta nota como respaldo de la reparación y de la garantía indicada para el servicio.</p>
   <section class="ts-note-section"><h3>Datos del cliente</h3><div class="ts-note-inner ts-note-client"><div>${field('Nombre',order.client_name)}${field('Correo',order.client_email)}${field('Teléfono',order.client_phone)}</div><div>${field('Equipo',order.device_model)}${field('Serial / IMEI',order.serial_imei)}${field('Orden de servicio',order.code)}</div></div></section>
   <section class="ts-note-section"><h3>Reparación realizada</h3><div class="ts-note-inner">${E(repairText(order,notes))}</div></section>
   <section class="ts-note-section"><h3>Repuestos utilizados</h3><div class="ts-note-inner">${rows}</div></section>
   <section class="ts-note-section"><h3>Pago y garantía</h3><div class="ts-note-inner ts-note-client"><div>${field('Total reparación',money(total))}${field('Método de pago',paymentMethod(order,events))}${field('Referencia de pago',paymentRef(events))}</div><div>${field('Garantía',`${Number(order.warranty_days||0)} día(s)`)}${field('Estado técnico',order.status||'En proceso')}</div></div></section>
   <section class="ts-note-section"><h3>Observaciones</h3><div class="ts-note-inner">${E(order.payment_notes||'Sin observaciones adicionales.')}</div></section>
   <section class="ts-note-section"><h3>Política de garantía</h3><div class="ts-note-inner ts-note-policy"><strong>La garantía aplica únicamente a la reparación y repuestos indicados en esta orden durante el plazo especificado.</strong><br>No cubre golpes, humedad, manipulación externa, daños nuevos ni intervenciones de terceros. La evaluación técnica determina la procedencia.<div class="ts-note-policy-note">Conserva esta Nota de Entrega y el número de orden como respaldo.</div></div></section>
   <footer class="ts-note-footer"><div class="ts-note-sign">Gracias por confiar en<b>ThinkStore</b></div>${social}<div class="ts-note-qr"><img src="${qr}" alt="QR de seguimiento"><span>Escanea el QR<br>para consultar<br>tu reparación</span></div></footer>
   <div class="ts-note-bottom">TODO LO QUE DESEAS EN UN MISMO LUGAR</div>
 </article></div>`;
}
module.exports={render};
