"use strict";
// Mismo canal que el correo de Soporte; no enviar nada sin opt-in y plantilla aprobada.
const crypto = require('node:crypto');
const C = require('./_whatsapp-core');
const text = (v,n=450)=>C.clean(v,n);
const active = key => String(process.env[key]||'').toLowerCase()==='true';
const yes = x => !!(x&&x.opt_in===true&&!x.opt_out_at);
const LANG=()=>text(process.env.WHATSAPP_TEMPLATE_LANG||'es',30);
const names={
 appointment:'ts_cita_confirmada_v2',received:'ts_equipo_recibido_v2',quote:'ts_cotizacion_disponible_v2',
 status:'ts_estado_reparacion_v2',ready:'ts_equipo_listo_v2',payment:'ts_abono_confirmado_v2',
 debt:'ts_financiamiento_recordatorio_v2',order:'ts_pedido_confirmado_v2'
};
function first(v){return text(v,140).split(/\s+/)[0]||'Cliente'}
function amount(v){return Number(v||0).toFixed(2)}
function due(v){const t=text(v,40);if(!/^\d{4}-\d{2}-\d{2}$/.test(t))return t||'Por confirmar';return `${t.slice(8,10)}/${t.slice(5,7)}/${t.slice(0,4)}`}
function eventId(category,entityId,key,phone){return crypto.createHash('sha256').update([category,entityId,key,C.normalizePhone(phone)].join('|')).digest('hex')}
async function dispatch({category,id,phone,variables,source,event,enabled=true}){
 if(!enabled)return{status:'disabled'};
 const template=names[category];if(!template)return{status:'skipped',reason:'template_unknown'};
 const to=C.normalizePhone(phone);if(!/^\d{10,15}$/.test(to))return{status:'skipped',reason:'invalid_phone'};
 const contact=await C.getContact(to);
 if(!yes(contact))return{status:'skipped',reason:'no_whatsapp_consent'};
 const key=eventId(category,String(id),event,to);
 let claimed=false;
 try{
   await C.sb(C.mainCfg(),'whatsapp_notification_outbox',{
     method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({event_key:key,phone_e164:to,template_name:template,entity_type:source,entity_id:String(id),status:'pending'})
   });claimed=true;
 }catch(e){if(/duplicate key|23505|409/.test(String(e.message||'')))return{status:'duplicate'};return{status:'error',reason:'outbox_unavailable'};}
 try{
   const r=await C.sendTemplate(to,template,LANG(),variables.map(x=>text(x,500)));
   const mid=r?.messages?.[0]?.id;
   if(!mid)throw Error('Meta no confirmó el identificador del mensaje');
   await C.sb(C.mainCfg(),`whatsapp_notification_outbox?event_key=eq.${key}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'sent',provider_message_id:mid,updated_at:new Date().toISOString()})});
   await C.logMessage({wa_message_id:mid,phone_e164:to,direction:'outbound',message_type:'template',template_name:template,status:'sent',source:source,entity_type:source,entity_id:String(id),body_preview:`${category} · ${id}`,payload:{event_key:key,provider:r}});
   return{status:'sent',message_id:mid};
 }catch(e){
   if(claimed)await C.sb(C.mainCfg(),`whatsapp_notification_outbox?event_key=eq.${key}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'failed',last_error:text(e.message,450),updated_at:new Date().toISOString()})}).catch(()=>{});
   return{status:'error',reason:'whatsapp_delivery_failed'};
 }
}
async function serviceUpdate(order,update={}){
 if(!active('WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED'))return{status:'disabled'};
 const id=order?.id||order?.code;if(!id)return{status:'skipped',reason:'missing_order'};
 const status=text(update.status||order.status||'Recibido',150);
 const quote=text(order.quote_status,100);
 let category='status',params=[];
 const name=first(order.client_name),code=text(order.code||id,100),device=text(order.device_model||order.device_type||'Equipo',120);
 if(/cotizaci[oó]n enviada/i.test(status)||(/enviado|enviada/i.test(quote)&&/cotiz/i.test(status))){category='quote';params=[name,code,amount(order.quote_amount)]}
 else if(/^(recibido|en recepci[oó]n)$/i.test(status)){category='received';params=[name,device,code]}
 else if(/listo para entregar/i.test(status)){category='ready';params=[name,device,code]}
 else{params=[name,code,device,status]}
 const detail=text(update.title||update.summary||'',250);
 const event=[category,status,quote,category==='quote'?amount(order.quote_amount):'',detail].join('|');
 return dispatch({category,id,phone:order.client_phone,variables:params,source:'service_order',event});
}
async function appointment(appt){
 if(!active('WHATSAPP_APPOINTMENT_NOTIFICATIONS_ENABLED'))return{status:'disabled'};
 const id=appt?.id;if(!id)return{status:'skipped'};
 return dispatch({category:'appointment',id,phone:appt.client_phone,variables:[first(appt.client_name),due(appt.preferred_date),text(appt.preferred_time,80)],source:'appointment',event:'confirmed'});
}
async function payment(order,paid){
 if(!active('WHATSAPP_PAYMENT_NOTIFICATIONS_ENABLED'))return{status:'disabled'};
 const id=order?.id||order?.code,delta=Number(paid?.delta_usd||0);if(!id||!(delta>0))return{status:'skipped'};
 // Include receipt reference and after-balance to differentiate independent payments.
 const event=`${text(paid.receipt_id||paid.reference||'',150)}|${text(paid.occurred_at||'',40)}|${amount(delta)}|${amount(paid.balance_after)}`;
 // Never claim a new receipt using an unstable key; payment caller must supply unique payment event id.
 if(!paid?.receipt_id)return{status:'skipped',reason:'missing_unique_receipt_id'};
 return dispatch({category:'payment',id,phone:order.client_phone,variables:[first(order.client_name),text(order.code||id),amount(delta),amount(paid.balance_after)],source:'service_payment',event});
}
async function orderUpdate(order){
 if(!active('WHATSAPP_ORDER_NOTIFICATIONS_ENABLED'))return{status:'disabled'};
 const id=order?.id||order?.code;if(!id)return{status:'skipped'};
 const status=text(order.status||'Registrado',150);
 return dispatch({category:'order',id,phone:order.customerPhone,variables:[first(order.customerName),text(order.code||id),amount(order.total),status],source:'store_order',event:status});
}
module.exports={names,first,due,eventId,dispatch,serviceUpdate,appointment,payment,orderUpdate};
