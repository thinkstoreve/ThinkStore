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
function publicImage(value){
 const link=String(value||'').trim();let u;try{u=new URL(link)}catch{throw Error('Indica una imagen pública con enlace HTTPS')}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname==='localhost'||u.hostname.endsWith('.local')||!/[a-z]/i.test(u.hostname)||u.hostname.includes(':')||link.length>2000)throw Error('Indica una imagen pública con enlace HTTPS');return link;
}
function supported(t){return t.components?.every(c=>{if(['BODY','FOOTER'].includes(c.type))return true;if(c.type==='HEADER')return c.format==='IMAGE'||(c.format==='TEXT'&&!/{{/.test(c.text||''));if(c.type==='BUTTONS')return c.buttons?.length<=3&&c.buttons.every(b=>['QUICK_REPLY','URL','PHONE_NUMBER'].includes(b.type)&&!/{{/.test(b.url||''));return false;});}
function definition(t){if(!t.components)return t;const c=t.components;return{name:t.name,language:t.language,category:t.category,body:t.body||c.find(x=>x.type==='BODY')?.text||'',header:c.find(x=>x.type==='HEADER')?{format:c.find(x=>x.type==='HEADER').format,text:c.find(x=>x.type==='HEADER').text||''}:null,footer:c.find(x=>x.type==='FOOTER')?.text||'',buttons:(c.find(x=>x.type==='BUTTONS')?.buttons||[]).map(b=>({type:b.type,text:b.text,url:b.url||'',phone_number:b.phone_number||''}))};}
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const fingerprint=t=>JSON.stringify(canonical(definition(t)));
async function list(){return(await catalog()).filter(t=>t.status==='APPROVED'&&['UTILITY','MARKETING'].includes(t.category)&&supported(t)).map(definition);}
function mediaComponents(t,image){const d=t.components?definition(t):t,parts=[];if(d.header?.format==='IMAGE')parts.push({type:'header',parameters:[{type:'image',image:{link:publicImage(image)}}]});for(const [i,b] of(d.buttons||[]).entries())if(b.type==='QUICK_REPLY')parts.push({type:'button',sub_type:'quick_reply',index:String(i),parameters:[{type:'payload',payload:/^(baja|dejar de recibir|no recibir promociones)$/i.test(b.text.trim())?'TS_MARKETING_STOP':'TS_PROMO_INFO_'+i}]});return parts;}
function templatePayload(b){
 const name=C.clean(b.name,100),body=String(b.body||'').trim(),category=b.category;
 if(!/^[a-z][a-z0-9_]{2,99}$/.test(name))throw Error('Usa un nombre de 3 a 100 caracteres: minúsculas, números y guion bajo');
 if(!['MARKETING','UTILITY'].includes(category)||!body||body.length>1024)throw Error('Selecciona una categoría e indica un mensaje de hasta 1.024 caracteres');
 const indices=[...body.matchAll(/{{(\d+)}}/g)].map(m=>+m[1]),count=Math.max(0,...indices);
 if(count>10||indices.some(i=>i<1)||Array.from({length:count},(_,i)=>i+1).some(i=>!indices.includes(i))||/{{|}}/.test(body.replace(/{{\d+}}/g,'')))throw Error('Usa variables consecutivas: {{1}}, {{2}}… (máximo 10)');
 const examples=b.examples||[];if(!Array.isArray(examples)||examples.length!==count||examples.some(v=>typeof v!=='string'||!v.trim()||v.length>200))throw Error('Completa un ejemplo ficticio para cada variable');
 const component={type:'BODY',text:body};if(count)component.example={body_text:[examples.map(v=>v.trim())]};
 const components=[];
 if(b.header?.format==='IMAGE'){if(typeof b.header.handle!=='string'||!/^\d+::/.test(b.header.handle)||b.header.handle.length>5000)throw Error('Sube una imagen de ejemplo antes de solicitar revisión');components.push({type:'HEADER',format:'IMAGE',example:{header_handle:[b.header.handle]}});}
 components.push(component);
 if(b.footer){if(typeof b.footer!=='string'||b.footer.length>60||/[{}]/.test(b.footer))throw Error('El pie admite hasta 60 caracteres sin variables');components.push({type:'FOOTER',text:b.footer.trim()});}
 if(b.buttons!==undefined&&!Array.isArray(b.buttons))throw Error('Los botones deben ser una lista');
 if(b.buttons?.length){
  if(b.buttons.length>3)throw Error('Usa hasta tres respuestas rápidas o un enlace y una llamada');
  const buttons=b.buttons.map(x=>{const text=String(x.text||'').trim();if(!text||text.length>25)throw Error('Cada botón necesita un título de hasta 25 caracteres');
   if(x.type==='QUICK_REPLY')return{type:x.type,text};
   if(x.type==='URL'){const url=publicImage(x.url);if(/[{}]/.test(url))throw Error('El enlace del botón debe ser fijo');return{type:x.type,text,url};}
   if(x.type==='PHONE_NUMBER'){const raw=String(x.phone_number||'').trim();if(!/^\+?[\d\s().-]+$/.test(raw))throw Error('Indica un teléfono internacional válido para llamar');const phone=C.normalizePhone(raw);if(!/^[1-9]\d{7,14}$/.test(phone))throw Error('Indica un teléfono internacional válido para llamar');return{type:x.type,text,phone_number:'+'+phone};}
   throw Error('Tipo de botón no compatible');
  });
  if(new Set(buttons.map(b=>b.text.toLowerCase())).size!==buttons.length)throw Error('Usa títulos diferentes para los botones');
  const quick=buttons.filter(b=>b.type==='QUICK_REPLY').length;
  if(quick&&quick!==buttons.length)throw Error('Elige respuestas rápidas o botones de enlace y llamada');
  if(!quick&&(buttons.length>2||buttons.filter(b=>b.type==='URL').length>1||buttons.filter(b=>b.type==='PHONE_NUMBER').length>1))throw Error('Usa como máximo un enlace y una llamada en esta plantilla');
  components.push({type:'BUTTONS',buttons});
 }

 return{name,language:'es',category,components};
}
async function uploadSample(b){
 const match=String(b.data||'').match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/);if(!match)throw Error('Sube una imagen JPG o PNG');const bytes=Buffer.from(match[2],'base64');if(!bytes.length||bytes.length>4*1024*1024)throw Error('La imagen debe pesar hasta 4 MB');const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if((match[1]==='image/png'&&!png)||(match[1]==='image/jpeg'&&!jpeg))throw Error('El contenido no corresponde a una imagen JPG o PNG');
 const c=C.waCfg(),base='https://graph.facebook.com/'+c.version+'/',query=new URLSearchParams({file_length:String(bytes.length),file_type:match[1],file_name:png?'thinkstore.png':'thinkstore.jpg'});
 const r=await fetch(base+'app/uploads?'+query,{method:'POST',headers:{Authorization:'Bearer '+c.token},signal:AbortSignal.timeout(10000)}),session=await r.json();if(!r.ok||!/^upload:[a-zA-Z0-9_?=&:./+%\-]+$/.test(session.id||''))throw Error('Meta no pudo preparar la imagen de muestra. Revisa los permisos de la aplicación.');
 const result=await fetch(base+session.id,{method:'POST',headers:{Authorization:'OAuth '+c.token,file_offset:'0','Content-Type':match[1]},body:bytes,signal:AbortSignal.timeout(10000)}),d=await result.json();if(!result.ok||typeof d.h!=='string')throw Error('Meta no pudo recibir la imagen de muestra');return{handle:d.h};
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
 const extra=mediaComponents(t,b.image);
 const contact=await C.getContact(phone),marketing=t.category==='MARKETING';
 if(!contact||contact.opt_out_at||!(marketing?contact.metadata?.marketing_opt_in===true:(contact.opt_in===true||contact.metadata?.service_notifications_opt_in===true)))throw Error(marketing?'El cliente debe autorizar promociones escribiendo PROMOCIONES por WhatsApp.':'El cliente no tiene autorización de avisos registrada.');
 const key=crypto.createHash('sha256').update('manual|'+b.client_id).digest('hex'),cfg=C.mainCfg();
 try{await C.sb(cfg,'whatsapp_notification_outbox',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({event_key:key,phone_e164:phone,template_name:t.name,entity_type:context.campaignId?'marketing_campaign':marketing?'marketing':'manual_template',entity_id:context.campaignId||b.client_id,status:'pending'})});}
 catch(e){if(/duplicate key|23505|409/.test(e.message))return{status:'duplicate'};throw Error('No se pudo reservar el envío. Comprueba la migración de avisos.');}
 const endpoint='whatsapp_notification_outbox?event_key=eq.'+key;
 let sent;try{sent=await C.sendTemplate(phone,t.name,t.language,values,extra);if(!sent?.messages?.[0]?.id)throw Error('missing_message_id');}
 catch{await C.sb(cfg,endpoint,{method:'PATCH',body:JSON.stringify({status:'failed',last_error:'Entrega sin confirmar; revisar Meta antes de reenviar',updated_at:new Date().toISOString()})}).catch(()=>{});return{status:'unconfirmed'};}
 const mid=sent.messages[0].id,preview=t.body.replace(/{{(\d+)}}/g,(_,i)=>values[Number(i)-1]);
 await C.sb(cfg,endpoint,{method:'PATCH',body:JSON.stringify({status:'sent',provider_message_id:mid,updated_at:new Date().toISOString()})}).catch(()=>{});
 await C.logMessage({wa_message_id:mid,phone_e164:phone,direction:'outbound',message_type:'template',template_name:t.name,status:'sent',source:marketing?'staff_marketing':'staff_template',body_preview:preview,payload:{actor:actor?.user_id||null,client_id:b.client_id}});
 return{status:'sent',message_id:mid};
}
module.exports={uploadSample,list,send,catalog,createTemplate,templatePayload,definition,fingerprint,publicImage,mediaComponents};
