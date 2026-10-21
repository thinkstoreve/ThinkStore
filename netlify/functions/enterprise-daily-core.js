'use strict';
const n=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Math.round(Number(v)*100)/100;
const money=v=>Math.round((v+Number.EPSILON)*100)/100;
const sum=(rows,fn)=>money(rows.reduce((a,r)=>a+(fn(r)||0),0));
const key=v=>String(v??'');
const day=v=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));}catch{return '';}};
const cancelled=o=>/cancel|anulad|rechaz|no aprobado/i.test(key(o.estado||o.status));
const active=o=>!['void','removed','released','cancelled'].includes(key(o.status).toLowerCase());
const cents=v=>Math.round(v*100);
function supportBreakdown(order,parts,extras,settlement,health){
 const total=n(order.quote_amount),currency=key(order.quote_currency||'USD').toUpperCase();
 const allParts=parts.filter(p=>key(p.order_code)===key(order.code)&&active(p));
 const allExtras=extras.filter(p=>key(p.order_code)===key(order.code)&&active(p)&&p.included_in_quote===true);
 const details=allParts.map(p=>{const qty=n(p.quantity_consumed)>0?n(p.quantity_consumed):n(p.quantity_reserved);return {id:p.id,type:'part',name:p.service_parts?.name||p.part_name||'Repuesto',quantity:qty,unit_price:n(p.sale_price_snapshot),unit_cost:n(p.unit_cost_snapshot),source:'service_order_parts'};}).concat(allExtras.map(p=>({id:p.id,type:p.item_type==='part'?'part':p.item_type==='product'?'product':'service',name:p.name||'Servicio',quantity:n(p.quantity),unit_price:n(p.unit_price_usd),unit_cost:n(p.unit_cost_usd),source:'service_order_sale_items'})));
 const matching=currency==='USD'&&settlement&&total!==null&&n(settlement.metadata?.payment_reconciliation?.invoiced_usd)===total&&(!order.updated_at||(settlement.updated_at&&new Date(settlement.updated_at)>=new Date(order.updated_at)));
 if(matching){return {parts:n(settlement.parts_revenue_usd),services:n(settlement.hardware_service_revenue_usd)!==null&&n(settlement.software_service_revenue_usd)!==null?money(n(settlement.hardware_service_revenue_usd)+n(settlement.software_service_revenue_usd)):null,products:n(settlement.store_product_revenue_usd),cost:n(settlement.parts_cost_usd)!==null&&n(settlement.store_product_cost_usd)!==null&&n(settlement.service_direct_cost_usd)!==null?money(n(settlement.parts_cost_usd)+n(settlement.store_product_cost_usd)+n(settlement.service_direct_cost_usd)):null,commission:n(settlement.total_commission_usd),details,source:'enterprise_service_settlements',currency};}
 if(!health.parts||!health.extras||currency!=='USD'||total===null||details.some(x=>!(x.quantity>0)||x.unit_price===null))return {parts:null,services:null,products:null,cost:null,commission:null,details,source:'incomplete',currency};
 const subtotal=n(order.subtotal_usd),discount=n(order.discount_usd)||0;
 // Do not invent a discount factor when the saved subtotal is inconsistent.
 if((discount>0&&(!(subtotal>0)||cents(subtotal-discount)!==cents(total)))||sum(details,x=>x.quantity*x.unit_price)>(subtotal??total)+.005)return {parts:null,services:null,products:null,cost:null,commission:null,details,source:'incomplete',currency};
 const grossParts=sum(details.filter(x=>x.type==='part'),x=>x.quantity*x.unit_price),grossProducts=sum(details.filter(x=>x.type==='product'),x=>x.quantity*x.unit_price),base=subtotal??total;
 const weights=[grossParts,grossProducts,Math.max(0,money(base-grossParts-grossProducts))];
 const raw=weights.map(v=>base>0?v/base*cents(total):0),allocated=raw.map(Math.floor);
 let remaining=cents(total)-allocated.reduce((n,v)=>n+v,0);
 const priority=raw.map((v,i)=>({i,f:v-allocated[i]})).sort((a,b)=>b.f-a.f);
 for(let i=0;i<remaining;i++)allocated[priority[i%priority.length].i]++;
 return {parts:allocated[0]/100,products:allocated[1]/100,services:allocated[2]/100,cost:null,commission:null,details,source:'order_components',currency};
}
function customer(o){const c=o.clientes||{};return {name:o.guest_name||o.client_name||o.customer_name||o.nombre_cliente||c.nombre||'',phone:o.guest_phone||o.client_phone||c.telefono||'',email:o.guest_email||o.client_email||c.correo||'',document:o.guest_document||c.cedula_rif||''};}
const orderCode=o=>o.codigo||o.numero_pedido||o.order_code||'VEN-'+key(o.id).replace(/-/g,'').slice(0,10).toUpperCase();
function buildDaily(data,date){
 const health=data.health||{},warnings=[...(data.warnings||[])],rows=[],seen=new Set();
 const add=r=>{if(!r.id||seen.has(r.id)||!Number.isFinite(r.amount_usd))return;seen.add(r.id);rows.push(r);};
 const store=data.orders||[],payments=data.payments||[],support=data.supportOrders||[],events=data.events||[],settlements=data.settlements||[];
 const bySupport=new Map(support.map(o=>[key(o.id),o]));
 const sourceRows=[];
 for(const o of store){
  // Cancelling a document does not erase a confirmed cash receipt.

  const all=payments.filter(p=>key(p.pedido_id)===key(o.id)&&p.status==='confirmed');
  const daily=all.filter(p=>day(p.confirmed_at||p.created_at)===date);
  const total=n(o.total_usd),items=(data.items||[]).filter(i=>key(i.pedido_id)===key(o.id));
  const cost=items.length&&items.every(i=>n(i.cost_total_usd)!==null||(n(i.unit_cost_usd)!==null&&n(i.cantidad)>0))?sum(items,i=>n(i.cost_total_usd)??(n(i.unit_cost_usd)*n(i.cantidad))):null;
  daily.forEach(p=>{const value=n(p.usd_equivalent??p.amount_usd);if(value!==null)add({id:'sale:'+p.id,source:'Ventas',order_id:o.id,code:orderCode(o),...customer(o),method:p.method||o.metodo_pago||'Sin definir',currency:p.currency||null,original_amount:n(p.amount),amount_usd:value,occurred_at:p.confirmed_at||p.created_at,reference:p.reference||'',direction:'in'});else warnings.push('Pago de venta '+p.id+' sin equivalente USD registrado.');});
  const hasLegacy=!all.length&&day(o.payment_decision_at||o.paid_at)===date&&(o.payment_decision==='approved'||/pagad|pago verificado|entregado/i.test(key(o.estado||o.status)));
  if(hasLegacy){const explicit=n(o.paid_usd??o.amount_paid??o.monto_pagado);if(explicit!==null){add({id:'sale-legacy:'+o.id,source:'Ventas',order_id:o.id,code:orderCode(o),...customer(o),method:o.metodo_pago||'Sin definir',currency:null,original_amount:null,amount_usd:explicit,occurred_at:o.payment_decision_at||o.paid_at,direction:'in',legacy:true});warnings.push('Venta '+orderCode(o)+': el cobro histórico no tiene transacciones individuales para consultar.');}else warnings.push('Venta '+orderCode(o)+': figura aprobada, pero falta el importe del pago confirmado. Revisa sus pagos antes de incluirla en caja.');}
  if(daily.length||hasLegacy||day(o.created_at)===date){const paid=n(o.paid_usd??o.amount_paid??o.monto_pagado)??(all.length?sum(all,p=>n(p.usd_equivalent??p.amount_usd)):null);sourceRows.push({source:'Ventas',order_id:o.id,code:orderCode(o),...customer(o),total,paid,pending:cancelled(o)?0:total!==null&&paid!==null?Math.max(0,money(total-paid)):null,parts:0,products:total,services:0,cost,commission:null,details:items.map(i=>({name:i.product_name||i.nombre||i.name||i.sku||'Producto',quantity:i.cantidad,unit_cost:n(i.unit_cost_usd),unit_price:n(i.precio_unitario??i.precio_usd),source:'pedido_items'})),source_detail:'pedido_items',status:o.estado||o.status||'',method:o.metodo_pago||'',reference:o.referencia_pago||'',created_at:o.created_at,actor:o.salesperson_name||o.salesperson_email||''});}
 }
 for(const event of events){
  if(!active(event)||day(event.occurred_at||event.created_at)!==date)continue;
  const o=bySupport.get(key(event.service_order_id)),v=n(event.amount_delta);
  if(v===null){warnings.push('Abono de servicio '+event.id+' sin importe verificable.');continue;}
  add({id:'support:'+event.id,source:'Servicio Técnico',order_id:event.service_order_id,code:o?.code||key(event.service_order_id),name:o?.client_name||'',method:event.payment_method||'Sin definir',currency:event.currency||null,original_amount:n(event.original_amount),amount_usd:Math.abs(v),direction:v<0?'out':'in',occurred_at:event.occurred_at||event.created_at,reference:event.reference||'',reversal:v<0});
 }
 for(const o of support){
  const hasDaily=events.some(e=>key(e.service_order_id)===key(o.id)&&day(e.occurred_at||e.created_at)===date);
  if(!hasDaily&&day(o.created_at)!==date)continue;
  const nativeCurrency=key(o.quote_currency||'USD').toUpperCase(),total=nativeCurrency==='USD'?n(o.quote_amount):null,paid=nativeCurrency==='USD'?n(o.amount_paid):null,t=settlements.find(t=>key(t.order_code)===key(o.code)),b=supportBreakdown(o,data.parts||[],data.extras||[],t,health);
  sourceRows.push({source:'Servicio Técnico',order_id:o.id,code:o.code,...customer(o),model:o.device_model||'',status:o.status,total,paid,pending:cancelled(o)?0:total!==null&&paid!==null?Math.max(0,money(total-paid)):null,parts:b.parts,services:b.services,products:b.products,cost:b.cost,commission:b.commission,details:b.details,source_detail:b.source,gross_margin:total!==null&&b.cost!==null?money(total-b.cost):null,financing:o.reception_checklist?.__financing||null,currency:b.currency});
 }
 for(const o of support){if(n(o.amount_paid)>0&&day(o.paid_at)===date&&!events.some(e=>key(e.service_order_id)===key(o.id))){warnings.push('Orden '+o.code+': saldo abonado sin historial de eventos; no se atribuye todo el acumulado al día.');}}
 if(Object.values(health).some(v=>v===false))warnings.push('Hay fuentes sin consultar; los subtotales disponibles no garantizan cobertura completa del día.');
 const collected=sum(rows.filter(x=>x.direction==='in'),x=>x.amount_usd),refunds=sum(rows.filter(x=>x.direction==='out'),x=>x.amount_usd);
 const documents=sourceRows.map(o=>({...o,collected_today:sum(rows.filter(r=>r.source===o.source&&key(r.order_id)===key(o.order_id)&&r.direction==='in'),r=>r.amount_usd),margin:o.total!==null&&o.cost!==null&&o.commission!==null?money(o.total-o.cost-o.commission):null}));
 return {date,generated_at:new Date().toISOString(),collections:{total:collected,store:sum(rows.filter(r=>r.source==='Ventas'&&r.direction==='in'),r=>r.amount_usd),support:sum(rows.filter(r=>r.source==='Servicio Técnico'&&r.direction==='in'),r=>r.amount_usd),refunds},documents,movements:rows.sort((a,b)=>key(b.occurred_at).localeCompare(key(a.occurred_at))),health,warnings:[...new Set(warnings)],notice:'Los importes de repuestos y servicios corresponden al documento completo. Un abono no se reparte arbitrariamente entre sus líneas. El margen del documento no es utilidad distribuida.'};
}
module.exports={buildDaily,supportBreakdown,day};
