'use strict';
const C=require('./_whatsapp-core');
const {METHODS,cents}=require('./staff-cash-core');
const round=v=>Math.round(v*100)/100;
const same=(a,b)=>String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();
function eventActor(e){return e.actor_email||e.created_by_email||String(e.notes||'').match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\s*$/i)?.[1]||'';}
function paymentEntry(e,email,orders,voids){
 if(!same(eventActor(e),email)||!(Number(e.amount_delta)>0)||voids.has(String(e.id)))return null;
 const method=e.payment_method,currency=METHODS[method];if(!currency)throw Error(`Método de servicio sin clasificar: ${method}`);
 let amount=Number(e.original_amount||0);
 // Legacy atomic payments preserve the original bolívares in their immutable notes.
 if(!(amount>0)&&currency==='VES')amount=Number(String(e.notes||'').match(/Recibido Bs\.\s*([0-9]+(?:\.[0-9]+)?)/i)?.[1]||0);
 if(!(amount>0)&&currency==='USD')amount=Number(e.amount_delta);
 if(!(amount>0))throw Error(`El abono ${e.id} no conserva el monto original en bolívares; requiere conciliación`);
 const order=orders.get(String(e.service_order_id));
 return{kind:'service',type:'service',id:'service:'+e.id,order_id:e.service_order_id,code:order?.code||String(e.service_order_id),method,currency,amount:round(amount),usd_equivalent:Number(e.amount_delta),reference:e.reference||'',at:e.occurred_at,sign:1,concept:'Cobro Servicio Técnico '+(order?.code||e.service_order_id)};
}
function merge(cash,session,entries){
 const unique=[...new Map(entries.map(e=>[e.id,e])).values()];
 for(const e of unique){const m=cash.by_method[e.method];m.in=round(m.in+e.amount);m.net=round(m.net+e.amount);cash.collected_usd=round(cash.collected_usd+e.usd_equivalent);if(e.currency==='VES')cash.collected_ves=round(cash.collected_ves+e.amount);}
 cash.entries.push(...unique);cash.entries.sort((a,b)=>new Date(b.at)-new Date(a.at));
 cash.expected_usd=round(Number(session.opening_usd||0)+cash.by_method['Efectivo USD'].net);
 cash.expected_ves=round(Number(session.opening_ves||0)+cash.by_method['Efectivo Bs'].net);
 cash.difference_usd=session.counted_usd==null?null:round(session.counted_usd-cash.expected_usd);
 cash.difference_ves=session.counted_ves==null?null:round(session.counted_ves-cash.expected_ves);
 cash.service_count=new Set(unique.map(e=>String(e.order_id))).size;
 cash.service_collected_usd=round(unique.reduce((n,e)=>n+e.usd_equivalent,0));return cash;
}
async function addServiceCash(cash,session,{email,start,stop}){
 const cfg=C.supportCfg();if(!cfg.url||!cfg.key){cash.warnings.push('No se pudo consultar los cobros de Servicio Técnico');return cash;}
 try{
 const [events,orders,voidRows]=await Promise.all([
 C.sb(cfg,`service_payment_events?select=*&occurred_at=gte.${encodeURIComponent(start)}&occurred_at=lte.${encodeURIComponent(stop)}&order=occurred_at.asc&limit=1001`),
 C.sb(cfg,'service_orders?select=id,code&limit=5000'),
 C.sb(cfg,'service_payment_voids?select=original_event_id&limit=5000')
 ]);
 if(events.length>=1001||orders.length>=5000||voidRows.length>=5000)throw Error('El historial de servicios supera el límite de consulta');
 const map=new Map(orders.map(o=>[String(o.id),o])),voids=new Set(voidRows.map(v=>String(v.original_event_id))),entries=[];
 for(const e of events){if(!eventActor(e)){cash.warnings.push(`Cobro de servicio ${e.id} sin cajero verificable`);continue;}try{const row=paymentEntry(e,email,map,voids);if(row)entries.push(row);}catch(err){cash.warnings.push(err.message);}}
 const early=entries.filter(e=>new Date(e.at)<new Date(session.opened_at));
 cash.preopening_service_count=early.length;
 return merge(cash,session,entries);
 }catch(e){cash.warnings.push('Servicio Técnico: '+e.message);return cash;}
}
module.exports={eventActor,paymentEntry,merge,addServiceCash};
