"use strict";
const crypto=require('node:crypto'), C=require('./_whatsapp-core');
const UUID=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
async function list(){
 const c=C.waCfg(),id=process.env.WHATSAPP_BUSINESS_ACCOUNT_ID||'1394432156184316';let url=`https://graph.facebook.com/${c.version}/${id}/message_templates?fields=name,status,language,category,components&limit=100`,rows=[];
 for(let page=0;url&&page<5;page++){
  const r=await fetch(url,{headers:{Authorization:'Bearer '+c.token},signal:AbortSignal.timeout(10000)}),d=await r.json();
  if(!r.ok)throw Error('No se pudieron consultar las plantillas en Meta');
  rows.push(...(d.data||[]));const next=d.paging?.next;url=next&&new URL(next).origin==='https://graph.facebook.com'?next:null;
 }
 return rows.filter(t=>t.status==='APPROVED'&&['UTILITY','MARKETING'].includes(t.category)&&t.components?.every(c=>c.type==='FOOTER'||c.type==='BODY'||(c.type==='HEADER'&&c.format==='TEXT'&&!/{{/.test(c.text||'')))).map(t=>({name:t.name,language:t.language,category:t.category,body:t.components.find(c=>c.type==='BODY')?.text||''}));
}
async function send(b,actor){
 const phone=C.normalizePhone(b.phone);if(!/^\d{10,15}$/.test(phone)||!UUID.test(b.client_id||''))throw Error('Teléfono o referencia de envío inválidos');
 const t=(await list()).find(t=>t.name===b.template&&t.language===b.language);if(!t)throw Error('La plantilla no está aprobada o requiere otro tipo de contenido');
 const values=b.variables;if(!Array.isArray(values))throw Error('Completa los datos de la plantilla');
 const indices=[...t.body.matchAll(/{{(\d+)}}/g)].map(m=>Number(m[1])),count=Math.max(0,...indices);
 if(values.length!==count||values.some(v=>typeof v!=='string'||!v.trim()||v.length>500))throw Error('Completa todas las variables (máximo 500 caracteres por dato)');
 const contact=await C.getContact(phone),marketing=t.category==='MARKETING';
 if(!contact||contact.opt_out_at||!(marketing?contact.metadata?.marketing_opt_in===true:(contact.opt_in===true||contact.metadata?.service_notifications_opt_in===true)))throw Error(marketing?'El cliente debe autorizar promociones escribiendo PROMOCIONES por WhatsApp.':'El cliente no tiene autorización de avisos registrada.');
 const key=crypto.createHash('sha256').update('manual|'+b.client_id).digest('hex'),cfg=C.mainCfg();
 try{await C.sb(cfg,'whatsapp_notification_outbox',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({event_key:key,phone_e164:phone,template_name:t.name,entity_type:marketing?'marketing':'manual_template',entity_id:b.client_id,status:'pending'})});}
 catch(e){if(/duplicate key|23505|409/.test(e.message))return{status:'duplicate'};throw Error('No se pudo reservar el envío. Comprueba la migración de avisos.');}
 const endpoint='whatsapp_notification_outbox?event_key=eq.'+key;
 let sent;try{sent=await C.sendTemplate(phone,t.name,t.language,values);if(!sent?.messages?.[0]?.id)throw Error('missing_message_id');}
 catch{await C.sb(cfg,endpoint,{method:'PATCH',body:JSON.stringify({status:'failed',last_error:'Entrega sin confirmar; revisar Meta antes de reenviar',updated_at:new Date().toISOString()})}).catch(()=>{});return{status:'unconfirmed'};}
 const mid=sent.messages[0].id,preview=t.body.replace(/{{(\d+)}}/g,(_,i)=>values[Number(i)-1]);
 await C.sb(cfg,endpoint,{method:'PATCH',body:JSON.stringify({status:'sent',provider_message_id:mid,updated_at:new Date().toISOString()})}).catch(()=>{});
 await C.logMessage({wa_message_id:mid,phone_e164:phone,direction:'outbound',message_type:'template',template_name:t.name,status:'sent',source:marketing?'staff_marketing':'staff_template',body_preview:preview,payload:{actor:actor?.user_id||null,client_id:b.client_id}});
 return{status:'sent',message_id:mid};
}
module.exports={list,send};
