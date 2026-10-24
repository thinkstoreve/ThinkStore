'use strict';
const C=require('./_whatsapp-core');
const names={received:'tc_solicitud_recibida_v1',confirmed:'tc_visita_confirmada_v1',reminder:'tc_recordatorio_visita_v1',assigned:'tc_tecnico_asignado_v1',en_route:'tc_tecnico_en_camino_v1',rescheduled:'tc_visita_reprogramada_v1',completed:'tc_visita_finalizada_v1'};
let cache={until:0,rows:[]};
async function templates(){
 if(cache.until>Date.now())return cache.rows;
 const cfg=C.waCfg(),id=String(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID||'1394432156184316');
 const r=await fetch(`https://graph.facebook.com/${cfg.version}/${id}/message_templates?fields=name,status,language,category&limit=100`,{headers:{Authorization:'Bearer '+cfg.token},signal:AbortSignal.timeout(10000)});
 const d=await r.json();if(!r.ok)throw Error('No se pudo verificar la aprobación de plantillas en Meta');
 cache={until:Date.now()+60000,rows:d.data||[]};return cache.rows;
}
async function approved(name,language='es'){return (await templates()).some(t=>t.name===name&&t.language===language&&t.status==='APPROVED'&&t.category==='UTILITY')}
function params(stage,r,extra={}){
 const ref=String(r.id).slice(0,8).toUpperCase(),name=String(r.name).trim().split(/\s+/)[0];
 if(stage==='received')return[name,ref,r.device];
 if(['confirmed','reminder','rescheduled'].includes(stage)){
  if(r.status!=='scheduled'||!r.scheduled_at)throw Error('Primero guarda una cita confirmada con fecha y hora');
  const d=new Date(r.scheduled_at);if(!Number.isFinite(d.getTime())||d.getTime()<Date.now())throw Error('La fecha de la visita ya pasó');
  const base=[name,ref,d.toLocaleDateString('es-VE',{timeZone:'America/Caracas'}),d.toLocaleTimeString('es-VE',{timeZone:'America/Caracas',hour:'2-digit',minute:'2-digit'})];return stage==='confirmed'?[...base,r.location]:base;
 }
 if(stage==='assigned'){if(!r.assigned_email||!extra.technician)throw Error('Primero asigna un técnico activo');return[name,ref,extra.technician]}
 if(stage==='en_route'){if(!r.assigned_email||!extra.technician||!extra.eta)throw Error('Indica técnico y hora estimada de llegada');return[name,extra.technician,ref,extra.eta]}
 if(stage==='completed'){if(!r.linked_order_id||!extra.completed||!extra.summary)throw Error('La orden debe estar finalizada en Soporte. Indica el resumen real del trabajo');return[name,ref,r.device,extra.summary]}
 throw Error('Actualización no disponible');
}
async function notify(stage,r,extra={}){
 if(!['think_care','technical_visit','business'].includes(r.request_type))throw Error('Estas plantillas corresponden a visitas Think Care');
 const name=names[stage];if(!name)throw Error('Plantilla inválida');
 const variables=params(stage,r,extra),contact=await C.getContact(r.phone);
 if(!contact||contact.opt_out_at||!(contact.opt_in===true||contact.metadata?.service_notifications_opt_in===true))return{status:'skipped',reason:'El cliente debe autorizar los avisos de WhatsApp. No se envió el mensaje.'};
 if(!await approved(name))return{status:'skipped',reason:'La plantilla aún no está aprobada como utilidad en Meta. No se envió el mensaje.'};
 const Events=require('./_whatsapp-service-events');
 return Events.dispatch({category:'care_'+stage,id:r.id,phone:r.phone,variables,source:'think_care_request',event:stage+'|'+r.revision+'|'+String(extra.eta||'')});
}
module.exports={names,templates,approved,params,notify};
