'use strict';
const C=require('./_whatsapp-core');
const N=require('./_request-notifications');
const names={repaired:'ts_entrega_reparada_opinion_v1',not_repaired:'ts_entrega_sin_reparar_opinion_v1'};
const GOOGLE_REVIEW_URL='https://www.google.com/maps/place/ThinkStore/data=!4m2!3m1!1s0x8c2a5914663bc5b3:0x13c923565c6dd517#lrd=0x8c2a5914663bc5b3:0x13c923565c6dd517,3,,,';
const enabled=()=>String(process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED).toLowerCase()==='true'&&String(process.env.WHATSAPP_REVIEW_NOTIFICATIONS_ENABLED).toLowerCase()!=='false';
const statePath=id=>`service_review_deliveries?order_id=eq.${encodeURIComponent(id)}`;
async function patch(id,values){return C.sb(C.supportCfg(),statePath(id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({...values,updated_at:new Date().toISOString()})});}
async function get(id){const r=await C.sb(C.supportCfg(),statePath(id)+'&select=*&limit=1');return r?.[0]||null;}
function result(row){return row?{status:row.state,reason:row.reason||null,attempts:row.attempts||0,message_id:row.provider_message_id||null}:{status:'not_eligible',reason:'no_new_delivery'};}
async function send(id,{retry=false}={}){
 const row=await get(id);if(!row)return result(null);
 if(!['pending','failed'].includes(row.state)||row.state==='failed'&&!retry)return result(row);
 if(!enabled())return{status:'pending',reason:'automation_disabled'};
 if(Date.now()-new Date(row.created_at).getTime()>7*86400000){await patch(id,{state:'skipped',reason:'delivery_expired'});return{status:'skipped',reason:'delivery_expired'};}
 const orders=await C.sb(C.supportCfg(),`service_orders?select=id,code,status,client_name,client_phone,device_model,delivery_outcome&id=eq.${encodeURIComponent(id)}&limit=1`);
 const o=orders?.[0];
 if(!o||o.status!=='Entregado'||o.delivery_outcome!==row.outcome){await patch(id,{state:'skipped',reason:'delivery_changed'});return{status:'skipped',reason:'delivery_changed'};}
 const phone=C.normalizePhone(o.client_phone),template=names[row.outcome];
 if(!template||!/^\d{10,15}$/.test(phone)){await patch(id,{state:'skipped',reason:'invalid_phone_or_outcome'});return{status:'skipped',reason:'invalid_phone_or_outcome'};}
 const contact=await C.getContact(phone);
 if(!contact||contact.opt_out_at||!(contact.opt_in===true||contact.metadata?.service_notifications_opt_in===true)){
  await patch(id,{state:'skipped',reason:'no_whatsapp_consent'});return{status:'skipped',reason:'no_whatsapp_consent'};
 }
 // No convertir una plantilla de marketing en utilidad ni ignorar su aprobación.
 try{if(!await N.approved(template,'es')){await patch(id,{reason:'template_not_approved'});return{status:row.state,reason:'template_not_approved'};}}
 catch{await patch(id,{reason:'template_status_unavailable'});return{status:row.state,reason:'template_status_unavailable'};}
 const cfg=C.waCfg();if(!cfg.token||!cfg.phoneId||!cfg.version)return{status:'pending',reason:'channel_not_configured'};
 const claim=await C.sb(C.supportCfg(),'rpc/ts_claim_review_delivery',{method:'POST',body:JSON.stringify({p_id:id,p_retry:retry})});
 if(!claim?.length)return result(await get(id));
 const params=[C.clean(o.client_name,140).split(/\s+/)[0]||'Cliente',C.clean(o.device_model||'equipo',120),C.clean(o.code,100)];
 let response,data;
 try{
  response=await fetch(`https://graph.facebook.com/${cfg.version}/${cfg.phoneId}/messages`,{method:'POST',headers:{Authorization:'Bearer '+cfg.token,'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),body:JSON.stringify({messaging_product:'whatsapp',to:phone,type:'template',template:{name:template,language:{code:'es'},components:[{type:'body',parameters:params.map(text=>({type:'text',text}))}]}})});
  data=await response.json();
 }catch{
  // Una respuesta perdida puede haber sido aceptada por Meta: nunca reenviar a ciegas.
  await patch(id,{state:'unknown',reason:'provider_confirmation_unknown'});return{status:'unknown',reason:'provider_confirmation_unknown'};
 }
 const mid=data?.messages?.[0]?.id;
 if(!response.ok||!mid){
  const certain=response.status>=400&&response.status<500&&!!data?.error;
  const state=certain?'failed':'unknown',reason=certain?'provider_rejected':'provider_confirmation_unknown';
  await patch(id,{state,reason});return{status:state,reason};
 }
 await patch(id,{state:'sent',reason:null,provider_message_id:mid});
 await C.logMessage({wa_message_id:mid,phone_e164:phone,direction:'outbound',message_type:'template',template_name:template,status:'sent',source:'service_review',entity_type:'service_order',entity_id:String(id),body_preview:`Entrega ${o.code} · Invitación a compartir la experiencia en Google`,payload:{delivery_outcome:row.outcome}});
 return{status:'sent',message_id:mid};
}
async function batch(){
 if(!enabled())return{status:'disabled'};
 const rows=await C.sb(C.supportCfg(),'service_review_deliveries?select=order_id&state=eq.pending&order=updated_at.asc&limit=5');
 const results=[];for(const row of rows||[]){try{results.push(await send(row.order_id))}catch{results.push({status:'error',reason:'review_processing_failed'})}}
 return{status:'processed',count:results.length,results};
}
module.exports={names,GOOGLE_REVIEW_URL,get,result,send,batch};
