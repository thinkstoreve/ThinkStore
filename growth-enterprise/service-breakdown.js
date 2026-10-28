(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TSServiceBreakdown=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const number=v=>v===null||v===undefined||v===''||typeof v==='boolean'||!Number.isFinite(Number(v))?null:Number(v);
 const round=v=>Math.round((v+Number.EPSILON)*100)/100;
 const total=xs=>xs.every(x=>x!==null)?round(xs.reduce((a,b)=>a+b,0)):null;
 function calculate(row={},settings={}){
  const reconciliation=row.metadata?.payment_reconciliation||{};
  const subtotal=number(row.subtotal_usd),discount=number(row.discount_usd);
  const invoice=number(reconciliation.invoiced_usd)??(subtotal!==null&&discount!==null?round(subtotal-discount):null);
  const paid=number(row.collected_usd),pending=invoice!==null&&paid!==null?Math.max(0,round(invoice-paid)):null;
  const parts=number(row.parts_cost_usd),products=number(row.store_product_cost_usd),direct=number(row.service_direct_cost_usd);
  const commissions=number(row.total_commission_usd),seller=number(row.seller_commission_usd);
  const technician=commissions!==null&&seller!==null?round(commissions-seller):null;
  const costs=total([parts,products,direct]);
  const profit=invoice!==null&&costs!==null&&commissions!==null?round(invoice-costs-commissions):null;
  const cashSurplus=paid!==null&&costs!==null&&commissions!==null?Math.max(0,round(paid-costs-commissions)):null;
  const fullyPaid=pending!==null&&pending<0.005;
  const warnings=[];
  if([invoice,paid,parts,products,direct,technician,seller].some(x=>x===null))warnings.push('Faltan importes en la liquidación. Verifica la orden antes de repartir.');
  if(!row.technician_email&&!row.technician_name)warnings.push('Técnico pendiente de asignar. Su comisión debe conservarse.');
  if(invoice===null||invoice<=0)warnings.push('El total final de la reparación está pendiente de verificar.');
  if([parts,products,direct,technician,seller,paid,pending].some(x=>x!==null&&x<0))warnings.push('Hay importes inconsistentes. Revisa la liquidación.');
  if(invoice!==null&&paid!==null&&paid>invoice+0.011)warnings.push('El cobro supera el total facturado. Revisa los abonos antes de repartir.');
  const globalRule=row.metadata?.commission_model==='gross_total_10pct';
  if(globalRule&&invoice!==null&&technician!==null&&Math.abs(technician-round(invoice*0.10))>0.011)warnings.push('La comisión guardada no coincide con el 10 % global. Revisa antes de repartir.');
  const company=number(settings.company_pct),freddy=number(settings.freddy_pct),nelson=number(settings.nelson_pct);
  const sharesValid=[company,freddy,nelson].every(v=>v!==null&&v>=0&&v<=100)&&Math.abs(company+freddy+nelson-100)<0.001;
  if(!sharesValid)warnings.push('Verifica los porcentajes de empresa y socios: deben sumar 100 %.');
  const ready=fullyPaid&&profit!==null&&sharesValid&&!warnings.length;
  const distributable=ready?Math.max(0,profit):null;
  const companyAmount=distributable===null?null:round(distributable*company/100);
  const freddyAmount=distributable===null?null:round(distributable*freddy/100);
  // Assign the rounding cent to the final share so every cent reconciles.
  const nelsonAmount=distributable===null?null:round(distributable-companyAmount-freddyAmount);
  return {invoice,paid,pending,parts,products,direct,costs,technician,seller,profit,cashSurplus,fullyPaid,ready,globalRule,warnings,distributable,shares:{company:{pct:company,amount:companyAmount},freddy:{pct:freddy,amount:freddyAmount},nelson:{pct:nelson,amount:nelsonAmount}}};
 }
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const usd=v=>v===null?'Por verificar':new Intl.NumberFormat('es-VE',{style:'currency',currency:'USD'}).format(v);
 function render(row,settings){
  const m=calculate(row,settings);
  const tile=(label,value,kind='')=>`<div class="sb-metric ${kind}"><span>${esc(label)}</span><strong>${usd(value)}</strong></div>`;
  const state=m.warnings.length?'Requiere revisión':!m.fullyPaid?'Con saldo pendiente':m.profit<0?'Con pérdida':'Cobro completo';
  return `<section class="service-breakdown" aria-label="Desglose financiero de la reparación"><header class="sb-heading"><div><small>CONTROL POR REPARACIÓN</small><h4>${esc(row.order_code||'Servicio técnico')}</h4></div><span class="sb-state ${m.warnings.length||!m.fullyPaid?'warn':'ok'}">${state}</span></header><div class="sb-metrics">${tile('Total final facturado',m.invoice)}${tile('Cobrado confirmado',m.paid,'blue')}${tile('Saldo pendiente',m.pending,m.pending>0?'amber':'')}</div><div class="sb-ledger"><h5>Costos y comisiones</h5>${[['Costo de repuestos',m.parts],['Costo de productos adicionales',m.products],['Otros costos directos',m.direct],[m.globalRule?'Técnico · 10 % del total':'Técnico · comisión histórica guardada',m.technician],['Comisión de vendedor',m.seller]].map(([label,value])=>`<div><span>${esc(label)}</span><b>${usd(value)}</b></div>`).join('')}</div><div class="sb-profit ${m.profit<0?'loss':''}"><div><small>${m.profit<0?'RESULTADO DE LA REPARACIÓN':'UTILIDAD DE LA REPARACIÓN'}</small><strong>${usd(m.profit)}</strong></div><p>Total final menos costos y comisiones. ${!m.fullyPaid?'El saldo pendiente todavía no es dinero cobrado.':'La revisión semanal puede descontar otros gastos operativos.'}</p></div>${m.warnings.length?`<ul class="sb-warnings">${m.warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<div class="sb-share-heading"><h5>Proyección de reparto</h5><span>${m.ready?'Sobre el resultado de esta reparación':'Pendiente de cobro completo o revisión'}</span></div><div class="sb-shares">${[['company','Empresa'],['freddy','Freddy'],['nelson','Nelson']].map(([key,label])=>`<div><span>${label} ${m.shares[key].pct===null?'':esc(m.shares[key].pct)+' %'}</span><b>${m.shares[key].amount===null?'Pendiente':usd(m.shares[key].amount)}</b></div>`).join('')}</div><p class="sb-note">Proyección informativa. El reparto definitivo se confirma en el cierre semanal después de los gastos operativos; abrir este detalle no mueve dinero.</p></section>`;
 }
 return {calculate,render};
});
