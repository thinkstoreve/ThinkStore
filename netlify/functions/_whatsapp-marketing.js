'use strict';
const crypto=require('node:crypto'),C=require('./_whatsapp-core'),T=require('./_whatsapp-templates');
const UUID=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const allowed=a=>['admin','superadmin','gerente','vendedor'].includes(C.norm(a?.role));
const authorized=c=>!!c&&!c.opt_out_at&&c.metadata?.marketing_opt_in===true;
const req=(path,method='GET',body)=>C.sb(C.mainCfg(),path,{method,...(body===undefined?{}:{headers:{Prefer:'return=representation'},body:JSON.stringify(body)})});
function sendId(id,phone){const h=crypto.createHash('sha256').update(id+'|'+phone).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
const fields='id,name,template_name,language,body,variables,recipients,created_at,created_by';
async function get(id){if(!UUID.test(id||''))throw Error('Campaña inválida');const rows=await req('whatsapp_marketing_campaigns?select='+fields+'&id=eq.'+id+'&limit=1');if(!rows?.[0])throw Error('No se encontró la campaña');return rows[0];}
async function progress(id){const campaign=await get(id),rows=await req('whatsapp_notification_outbox?select=phone_e164,status,provider_message_id,last_error,created_at&entity_type=eq.marketing_campaign&entity_id=eq.'+id+'&limit=250');const byPhone=new Map((rows||[]).map(r=>[r.phone_e164,r]));const phones=campaign.recipients.map(c=>c.phone);const contacts=await req('whatsapp_contacts?select=phone_e164,opt_out_at,metadata&phone_e164=in.('+phones.join(',')+')&limit=250');const current=new Map((contacts||[]).map(c=>[c.phone_e164,c]));return{campaign,recipients:campaign.recipients.map(c=>({...c,...(byPhone.get(c.phone)||{status:authorized(current.get(c.phone))?'ready':'skipped'})}))};}
async function consent(b,a){
 const phone=C.normalizePhone(b.phone),grant=b.granted===true;if(!/^\d{10,15}$/.test(phone)||typeof b.granted!=='boolean')throw Error('Indica un teléfono válido y la autorización');
 const source=C.clean(b.source,40),evidence=C.clean(b.evidence,500),at=new Date(b.obtained_at),now=new Date();
 if(!['in_person','form','whatsapp','document'].includes(source)||evidence.length<10||!Number.isFinite(at.getTime())||at>now)throw Error('Indica la fuente, fecha y evidencia real de la autorización o baja');
 const current=await C.getContact(phone),metadata={...(current?.metadata||{})};
 // Record evidence before activating the contact; a failed audit never grants permission.
 await req('whatsapp_marketing_consents','POST',{phone_e164:phone,granted:grant,source,evidence,obtained_at:at.toISOString(),recorded_by:a.user_id,recorded_at:now.toISOString()});
 metadata.marketing_opt_in=grant;metadata.marketing_opt_in_source=source;metadata.marketing_opt_in_at=grant?at.toISOString():metadata.marketing_opt_in_at;metadata.marketing_revoked_at=grant?null:now.toISOString();
 if(grant&&current?.opt_out_at)metadata.service_notifications_opt_in=false;
 await C.upsertContact(phone,{name:C.clean(b.name||current?.name||'Cliente',160),metadata,...(grant?{opt_out_at:null}:{})});return{ok:true};
}
async function create(b,a){
 if(!UUID.test(b.id||'')||!C.clean(b.name,120)||!Array.isArray(b.phones)||!b.phones.length||b.phones.length>250)throw Error('Indica un nombre y entre 1 y 250 destinatarios');
 const existing=await req('whatsapp_marketing_campaigns?select='+fields+'&id=eq.'+b.id+'&limit=1');if(existing?.[0])return{ok:true,campaign:existing[0],already_created:true};
 const t=(await T.list()).find(t=>t.category==='MARKETING'&&t.name===b.template&&t.language===b.language);if(!t)throw Error('Selecciona una plantilla de marketing aprobada');
 const count=Math.max(0,...[...t.body.matchAll(/{{(\d+)}}/g)].map(m=>Number(m[1]))),values=b.variables;
 if(!Array.isArray(values)||values.length!==count||values.some(v=>typeof v!=='string'||!v.trim()||v.length>500))throw Error('Completa las variables de la plantilla');
 const phones=[...new Set(b.phones.map(C.normalizePhone))];if(phones.some(p=>!/^\d{10,15}$/.test(p)))throw Error('Hay teléfonos inválidos');
 const contacts=await req('whatsapp_contacts?select=phone_e164,name,opt_out_at,metadata&phone_e164=in.('+phones.join(',')+')&limit=250'),map=new Map((contacts||[]).map(c=>[c.phone_e164,c]));
 if(phones.some(p=>!authorized(map.get(p))))throw Error('Uno o más destinatarios no tienen autorización promocional vigente. Actualiza la lista.');
 const row={id:b.id,name:C.clean(b.name,120),template_name:t.name,language:t.language,body:t.body,variables:values.map(v=>v.trim()),recipients:phones.map(phone=>({phone,name:C.clean(map.get(phone).name||'Cliente',160)})),created_by:a.user_id};
 const saved=await req('whatsapp_marketing_campaigns','POST',row);return{ok:true,campaign:saved?.[0]||row};
}
async function send(b,a){
 const campaign=await get(b.id),phone=C.normalizePhone(b.phone);if(!campaign.recipients.some(c=>c.phone===phone))throw Error('El destinatario no pertenece a esta campaña');
 const t=(await T.list()).find(t=>t.category==='MARKETING'&&t.name===campaign.template_name&&t.language===campaign.language);
 if(!t||t.body!==campaign.body)throw Error('La plantilla cambió o ya no está aprobada. Prepara una nueva campaña.');
 if(!authorized(await C.getContact(phone)))return{ok:true,result:{status:'skipped',reason:'Autorización revocada o no disponible'}};
 const result=await T.send({phone,template:campaign.template_name,language:campaign.language,variables:campaign.variables,client_id:sendId(campaign.id,phone)},a,{campaignId:campaign.id,template:t});
 return{ok:true,result};
}
async function handle(b,a){
 if(!allowed(a)||!a?.user_id){const e=Error('Inicia sesión como administrador o vendedor para gestionar marketing');e.status=403;throw e;}
 switch(b.action){
 case 'marketing_contacts':{const rows=await req('whatsapp_contacts?select=phone_e164,name,opt_out_at,metadata&order=name.asc.nullslast&limit=1001');return{ok:true,partial:rows.length>1000,contacts:rows.slice(0,1000).map(c=>({phone:c.phone_e164,name:c.name||'Cliente',authorized:authorized(c),source:c.metadata?.marketing_opt_in_source||null,obtained_at:c.metadata?.marketing_opt_in_at||null}))};}
 case 'marketing_consent':return consent(b,a);
 case 'marketing_create':return create(b,a);
 case 'marketing_progress':return{ok:true,...await progress(b.id)};
 case 'marketing_send':return send(b,a);
 case 'marketing_history':return{ok:true,campaigns:await req('whatsapp_marketing_campaigns?select='+fields+'&order=created_at.desc&limit=30')};
 default:throw Error('Acción de marketing inválida');
 }
}
module.exports={handle,authorized,sendId,create,consent,send,progress};
