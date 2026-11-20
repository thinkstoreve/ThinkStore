'use strict';
const C=require('./_whatsapp-core');
function fail(status,message){return Object.assign(new Error(message),{status});}
function config(){
 const base=String(process.env.WATI_API_BASE_URL||'https://live-mt-server.wati.io').replace(/\/$/,'');
 const u=new URL(base);
 if(u.protocol!=='https:'||!/(^|\.)wati\.io$/.test(u.hostname)||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw fail(503,'Revisa WATI_API_BASE_URL: debe ser el origen HTTPS regional de Wati.');
 return {base,token:String(process.env.WATI_API_TOKEN||'').trim(),channel:String(process.env.WATI_CHANNEL_ID||'').trim(),phone:C.normalizePhone(process.env.WATI_CHANNEL_PHONE||'')};
}
async function request(path,options={}){
 const c=config();if(!c.token||!c.channel||!c.phone)throw fail(503,'Falta conectar Wati: configura el token API, el ID del canal y su número +1 en el servidor.');
 const r=await fetch(c.base+path,{...options,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'}});
 const d=await r.json().catch(()=>({}));
 if(!r.ok||d.success===false||d.result===false)throw fail(r.status===429?429:502,r.status===403?'Wati no permite esta operación. Revisa los permisos API y el plan de la cuenta.':r.status===429?'Wati alcanzó su límite de solicitudes. Espera antes de actualizar.':'Wati no confirmó la operación. Revisa su bandeja antes de reenviar.');
 return d;
}
function items(d,key){const a=d?.[key]?.items||d?.[key]||d?.data?.[key]||d?.data?.items||d?.items||d?.data;if(!Array.isArray(a))throw fail(502,'Wati devolvió un formato no reconocido; no se mostrarán datos incompletos.');return a;}
function iso(v){if(typeof v==='number'||/^\d{10,13}$/.test(String(v||'')))v=Number(v)*(String(v).length===10?1000:1);const n=Date.parse(v);return Number.isFinite(n)?new Date(n).toISOString():null;}
function normalizeMessage(m){return {id:String(m.id||m.local_message_id||''),direction:m.owner===true?'outbound':'inbound',body_preview:String(m.text||m.body||m.message?.text||''),message_type:m.type||'text',status:m.status||'accepted',source:'wati',created_at:iso(m.timestamp||m.created)||'1970-01-01T00:00:00.000Z'};}
function target(v){if(!/^[A-Za-z0-9_.:-]{1,180}$/.test(String(v||'')))throw fail(400,'Conversación de Wati inválida.');return String(v);}
async function conversation(id,page=1){
 const c=config(),d=await request('/api/ext/v3/conversations/'+encodeURIComponent(target(id))+'/messages?page_number='+page+'&page_size=100');
 const channel=d.channel_id||d.data?.channel_id;
 if(channel!==c.channel)throw fail(409,'No se pudo verificar que esta conversación pertenece al canal +1 seleccionado.');
 const rows=items(d,'messages').filter(m=>typeof m.owner==='boolean'&&(!m.event_type||m.event_type==='message')).map(normalizeMessage).filter(m=>m.id).sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
 const last=rows.filter(m=>m.direction==='inbound'&&Date.parse(m.created_at)>0).at(-1)?.created_at||null;
 return {ok:true,rows,has_more:rows.length===100,contact:{phone_e164:id,name:d.contact?.name||d.data?.contact?.name||'Cliente de WhatsApp',last_inbound_at:last,needs_human:true,metadata:{wati:true}}};
}
async function handle(b){
 const c=config();
 if(b.action==='inbox_health'){
  const configured=!!(c.token&&c.channel&&c.phone);
  if(!configured)return {ok:true,connection:{ok:false,reason:'Número +1 pendiente de conexión con Wati'},configured:false};
  await request('/api/ext/v3/conversations?page_number=1&page_size=1&channel_type=whatsapp&channel_id='+encodeURIComponent(c.channel));
  return {ok:true,configured:true,connection:{ok:true,phone:'+'+c.phone,name:'ThinkStore · Wati',matches_official:true}};
 }
 if(b.action==='care_contacts'){
  const page=Math.max(1,Math.min(100,Number(b.page)||1));
  const d=await request('/api/ext/v3/conversations?page_number='+page+'&page_size=50&channel_type=whatsapp&channel_id='+encodeURIComponent(c.channel));
  const rows=items(d,'conversations').filter(x=>x.channel_id===c.channel).map(x=>({phone_e164:String(x.id),name:x.contact?.name||x.contact_name||x.name||'Cliente de WhatsApp',display_phone:x.contact?.phone||x.phone||x.whatsapp_number||'',latest_at:iso(x.last_message?.timestamp||x.updated_at||x.last_customer_message_at),last_inbound_at:iso(x.last_customer_message_at),latest_preview:x.last_message?.text||'',unread_count:Number(x.unread_count)||0,needs_human:true,metadata:{wati:true}}));
  return {ok:true,rows,has_more:rows.length===50,page};
 }
 if(b.action==='conversation')return conversation(b.phone,Math.max(1,Number(b.page)||1));
 if(b.action==='mark_read')return {ok:true,changed:0}; // Reading in ThinkStore does not change Wati's read counters.
 if(b.action==='send_reply'){
  const id=target(b.phone),text=String(b.message||'').trim(),clientId=String(b.client_id||'');
  if(!text||text.length>4000||!/^[a-f\d-]{36}$/i.test(clientId))throw fail(400,'Mensaje inválido.');
  const history=await conversation(id),last=Date.parse(history.contact.last_inbound_at||'');
  if(!Number.isFinite(last)||last>Date.now()||Date.now()-last>=86400000)throw fail(409,'La ventana de respuesta está cerrada. Continúa desde Wati con una plantilla aprobada.');
  const key='wati:'+c.channel+':'+clientId,path='whatsapp_message_log?wa_message_id=eq.'+encodeURIComponent(key);
  const reserved=await C.sb(C.mainCfg(),'whatsapp_message_log?on_conflict=wa_message_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({wa_message_id:key,phone_e164:'wati:'+c.channel+':'+id,direction:'outbound',message_type:'text',source:'wati_staff_reply',status:'sending',body_preview:text})});
  if(!reserved?.length)throw fail(409,'Este mensaje ya fue procesado o su envío está pendiente de confirmar. Revisa Wati antes de reenviar.');
  try{
   const d=await request('/api/ext/v3/conversations/messages/text',{method:'POST',body:JSON.stringify({target:id,text,is_bot:false})});
   if(!d.message?.id&&!d.data?.message?.id)throw fail(502,'Wati no devolvió un identificador del mensaje.');
   await C.sb(C.mainCfg(),path,{method:'PATCH',body:JSON.stringify({status:'accepted',payload:{provider_id:d.message?.id||d.data?.message?.id},updated_at:new Date().toISOString()})});
   return {ok:true,status:'accepted'};
  }catch(e){await C.sb(C.mainCfg(),path,{method:'PATCH',body:JSON.stringify({status:'unconfirmed'})}).catch(()=>{});throw fail(502,'Envío sin confirmar. Revisa la bandeja de Wati antes de volver a enviarlo.');}
 }
 throw fail(400,'Esta función se gestiona desde Wati para el canal +1.');
}
module.exports={config,handle,normalizeMessage,items,conversation};
