"use strict";
const crypto=require('node:crypto'), C=require('./_whatsapp-core');
const UUID=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
async function catalog(){
 const c=C.waCfg(),id=process.env.WHATSAPP_BUSINESS_ACCOUNT_ID||'1394432156184316';let url=`https://graph.facebook.com/${c.version}/${id}/message_templates?fields=name,status,language,category,components&limit=100`,rows=[];
 for(let page=0;url&&page<5;page++){
  const r=await fetch(url,{headers:{Authorization:'Bearer '+c.token},signal:AbortSignal.timeout(10000)}),d=await r.json();
  if(!r.ok)throw Error('No se pudieron consultar las plantillas en Meta');
  rows.push(...(d.data||[]));const next=d.paging?.next;url=next&&new URL(next).origin==='https://graph.facebook.com'?next:null;
 }
 return rows.map(t=>({...t,body:t.components?.find(c=>c.type==='BODY')?.text||''}));
}
async function list(){
 return (await catalog()).filter(t=>t.status==='APPROVED'&&['UTILITY','MARKETING'].includes(t.category)&&t.components?.every(c=>c.type==='FOOTER'||c.type==='BODY'||(c.type==='HEADER'&&c.format==='TEXT'&&!/{{/.test(c.text||'')))).map(t=>({name:t.name,language:t.language,category:t.category,body:t.components.find(c=>c.type==='BODY')?.text||''}));
}
function templatePayload(b){
 const name=C.clean(b.name,100),body=String(b.body||'').trim(),category=b.category;
 if(!/^[a-z][a-z0-9_]{2,99}$/.test(name))throw Error('Usa un nombre de 3 a 100 caracteres: minúsculas, números y guion bajo');
 if(!['MARKETING','UTILITY'].includes(category)||!body||body.length>1024)throw Error('Selecciona una categoría e indica un mensaje de hasta 1.024 caracteres');
 const indices=[...body.matchAll(/{{(\d+)}}/g)].map(m=>+m[1]),count=Math.max(0,...indices);
 if(count>10||indices.some(i=>i<1)||Array.from({length:count},(_,i)=>i+1).some(i=>!indices.includes(i))||/{{|}}/.test(body.replace(/{{\d+}}/g,'')))throw Error('Usa variables consecutivas: {{1}}, {{2}}… (máximo 10)');
 const examples=b.examples||[];if(!Array.isArray(examples)||examples.length!==count||examples.some(v=>typeof v!=='string'||!v.trim()||v.length>200))throw Error('Completa un ejemplo ficticio para cada variable');
 const component={type:'BODY',text:body};if(count)component.example={body_text:[examples.map(v=>v.trim())]};
 return{name,language:'es',category,components:[component]};
}
async function createTemplate(b){
 const payload=templatePayload(b),c=C.waCfg(),id=process.env.WHATSAPP_BUSINESS_ACCOUNT_ID||'1394432156184316';
 const r=await fetch(`https://graph.facebook.com/${c.version}/${id}/message_templates`,{method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
 const d=await r.json();if(!r.ok)throw Error('Meta no aceptó la plantilla. '+C.clean(d.error?.error_user_msg||d.error?.message||'Revisa el nombre y el contenido antes de reintentar.',250));return{id:d.id,name:payload.name,status:d.status||'PENDING'};
}
async function send(b,actor,context={}){
 const phone=C.normalizePhone(b.phone);if(!/^\d{10,15}$/.test(phone)||!UUID.test(b.client_id||''))throw Error('Teléfono o referencia de envío inválidos');
 const t=context.template||(await list()).find(t=>t.name===b.template&&t.language===b.language);if(!t)throw Error('La plantilla no está aprobada o requiere otro tipo de contenido');
 const values=b.variables;if(!Array.isArray(values))throw Error('Completa los datos de la plantilla');
 const indices=[...t.body.matchAll(/{{(\d+)}}/g)].map(m=>Number(m[1])),count=Math.max(0,...indices);
 if(values.length!==count||values.some(v=>typeof v!=='string'||!v.trim()||v.length>500))throw Error('Completa todas las variables (máximo 500 caracteres por dato)');
 const contact=await C.getContact(phone),marketing=t.category==='MARKETING';
 if(!contact||contact.opt_out_at||!(marketing?contact.metadata?.marketing_opt_in===true:(contact.opt_in===true||contact.metadata?.service_notifications_opt_in===true)))throw Error(marketing?'El cliente debe autorizar promociones escribiendo PROMOCIONES por WhatsApp.':'El cliente no tiene autorización de avisos registrada.');
 const key=crypto.createHash('sha256').update('manual|'+b.client_id).digest('hex'),cfg=C.mainCfg();
 try{await C.sb(cfg,'whatsapp_notification_outbox',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({event_key:key,phone_e164:phone,template_name:t.name,entity_type:context.campaignId?'marketing_campaign':marketing?'marketing':'manual_template',entity_id:context.campaignId||b.client_id,status:'pending'})});}
 catch(e){if(/duplicate key|23505|409/.test(e.message))return{status:'duplicate'};throw Error('No se pudo reservar el envío. Comprueba la migración de avisos.');}
 const endpoint='whatsapp_notification_outbox?event_key=eq.'+key;
 let sent;try{sent=await C.sendTemplate(phone,t.name,t.language,values);if(!sent?.messages?.[0]?.id)throw Error('missing_message_id');}
 catch{await C.sb(cfg,endpoint,{method:'PATCH',body:JSON.stringify({status:'failed',last_error:'Entrega sin confirmar; revisar Meta antes de reenviar',updated_at:new Date().toISOString()})}).catch(()=>{});return{status:'unconfirmed'};}
 const mid=sent.messages[0].id,preview=t.body.replace(/{{(\d+)}}/g,(_,i)=>values[Number(i)-1]);
 await C.sb(cfg,endpoint,{method:'PATCH',body:JSON.stringify({status:'sent',provider_message_id:mid,updated_at:new Date().toISOString()})}).catch(()=>{});
 await C.logMessage({wa_message_id:mid,phone_e164:phone,direction:'outbound',message_type:'template',template_name:t.name,status:'sent',source:marketing?'staff_marketing':'staff_template',body_preview:preview,payload:{actor:actor?.user_id||null,client_id:b.client_id}});
 return{status:'sent',message_id:mid};
}
module.exports={list,send,catalog,createTemplate,templatePayload};
