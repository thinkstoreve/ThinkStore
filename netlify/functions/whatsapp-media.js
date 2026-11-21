'use strict';
const C=require('./_whatsapp-core'),{authenticate}=require('./requests-inbox');
const out=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
const LIMIT=3*1024*1024;
function mediaType(type,bytes){
 if(type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return'image';
 if(type==='image/png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'image';
 if(type==='application/pdf'&&bytes.subarray(0,5).toString()==='%PDF-')return'document';
 if(type==='audio/ogg'&&bytes.subarray(0,4).toString()==='OggS')return'audio';
 if(type==='audio/mpeg'&&(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===255&&(bytes[1]&224)===224))return'audio';
 if(['video/mp4','audio/mp4'].includes(type)&&bytes.subarray(4,8).toString()==='ftyp')return type==='video/mp4'?'video':'audio';
 return null;
}
exports.mediaType=mediaType;
const handle=async event=>{
 let endpoint,attempted=false;
 try{
  if(event.httpMethod!=='POST')return out(405,{ok:false,error:'Método no permitido.'});
  const u=await authenticate(event);if(!u.ok||!u.user_id||!['admin','superadmin','gerente','vendedor','soporte','recepcion'].includes(C.norm(u.role)))return out(401,{ok:false,error:'Inicia sesión con una cuenta del equipo.'});
  if((event.body||'').length>LIMIT*1.38)return out(413,{ok:false,error:'El archivo supera 3 MB.'});
  let b;try{b=JSON.parse(event.body||'{}');}catch{return out(400,{ok:false,error:'Solicitud inválida.'});}
  if(C.channel()==='meta-us'&&require('./_whatsapp-channels').missing().length)return out(409,{ok:false,error:'El número +1 está pendiente de conectar con Meta.'});
  const phone=C.normalizePhone(b.phone),client=String(b.client_id||'');if(!/^\d{8,15}$/.test(phone)||!/^[a-f0-9-]{36}$/i.test(client))return out(400,{ok:false,error:'Conversación inválida.'});
  const c=await C.getContact(phone),last=Date.parse(c?.last_inbound_at||''),age=Date.now()-last;
  if(!Number.isFinite(age)||age<0||age>=86400000)return out(409,{ok:false,error:'El cliente debe escribir de nuevo para recibir archivos dentro de la ventana de atención.'});
  if(typeof b.data!=='string'||!b.data||b.data.length>Math.ceil(LIMIT/3)*4||(b.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(b.data)))return out(400,{ok:false,error:'Archivo inválido.'});
  const bytes=Buffer.from(b.data,'base64'),mime=String(b.mime||'').split(';')[0],type=mediaType(mime,bytes);if(!type||!bytes.length||bytes.length>LIMIT)return out(400,{ok:false,error:'Usa JPG, PNG, PDF, MP3, OGG o MP4 de hasta 3 MB.'});
  const cfg=C.waCfg();if(!cfg.token||!cfg.phoneId||!cfg.version)return out(503,{ok:false,error:'Falta configurar el canal de WhatsApp.'});
  const name=C.clean(b.name,100).replace(/[\\/\x00-\x1f]/g,'_')||'archivo',caption=type==='audio'?'':C.clean(b.caption,1000),key='staff-media:'+u.user_id+':'+client;
  endpoint='whatsapp_message_log?wa_message_id=eq.'+encodeURIComponent(key);
  const claimed=await C.sb(C.mainCfg(),'whatsapp_message_log?on_conflict=wa_message_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({wa_message_id:key,phone_e164:phone,direction:'outbound',message_type:type,source:'staff_media',status:'sending',body_preview:'['+({image:'Imagen',document:'Documento',audio:'Audio',video:'Video'}[type])+'] '+name+(caption?' · '+caption:''),payload:{client_id:client}})});
  if(!claimed?.length)return out(409,{ok:false,error:'Este archivo ya fue procesado o sigue en curso. Revisa el historial antes de reenviar.'});
  const form=new FormData();form.append('messaging_product','whatsapp');form.append('type',mime);form.append('file',new Blob([bytes],{type:mime}),name);
  const base='https://graph.facebook.com/'+cfg.version;
  const upload=await fetch(base+'/'+cfg.phoneId+'/media',{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+cfg.token},body:form});const media=await upload.json().catch(()=>({}));
  if(!upload.ok||!/^\d+$/.test(String(media.id||'')))throw Error('No se pudo subir el archivo a WhatsApp.');
  await C.upsertContact(phone,{needs_human:true,metadata:{...(c.metadata||{}),care_assistant:{...(c.metadata?.care_assistant||{}),active:false}}});
  const content={id:media.id,...(caption?{caption}:{}),...(type==='document'?{filename:name}:{})};attempted=true;
  const response=await fetch(base+'/'+cfg.phoneId+'/messages',{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+cfg.token,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:phone,type,[type]:content})});const d=await response.json().catch(()=>({}));
  if(!response.ok||!d.messages?.[0]?.id)throw Error('No se pudo confirmar el envío del archivo.');
  await C.sb(C.mainCfg(),endpoint,{method:'PATCH',body:JSON.stringify({wa_message_id:d.messages[0].id,status:'sent',payload:{client_id:client,media_id:media.id,mime,filename:name},updated_at:new Date().toISOString()})});
  return out(200,{ok:true,status:'accepted'});
 }catch(e){if(endpoint)await C.sb(C.mainCfg(),endpoint,{method:'PATCH',body:JSON.stringify({status:attempted?'unconfirmed':'failed',updated_at:new Date().toISOString()})}).catch(()=>{});return out(503,{ok:false,error:attempted?'Envío sin confirmar. Revisa el historial antes de reenviar este archivo.':'No se pudo preparar el archivo. Revisa la conexión de WhatsApp y vuelve a seleccionar el archivo.'});}
};

exports.handler=async event=>{try{return await C.withChannel(C.requestChannel(event),()=>handle(event));}catch(e){return out(e.status||503,{ok:false,error:e.status?e.message:'No se pudo abrir el canal de WhatsApp.'});}};
