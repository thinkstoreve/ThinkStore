'use strict';
const C=require('./_whatsapp-core');
const {authenticate}=require('./requests-inbox');
const out=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
const roles=['admin','superadmin','gerente','vendedor','soporte','recepcion'];
exports.handler=async event=>{
 try{
  if(event.httpMethod!=='POST')return out(405,{ok:false,error:'Método no permitido'});
  const user=await authenticate(event);
  if(!user.ok||!roles.includes(C.norm(user.role))||!user.user_id)return out(401,{ok:false,error:'Inicia sesión con una cuenta del equipo.'});
  let b;try{b=JSON.parse(event.body||'{}');}catch{return out(400,{ok:false,error:'JSON inválido'});}
  if(b.channel==='wati'&&['care_contacts','conversation','inbox_health','send_reply','mark_read'].includes(b.action))return out(200,await require('./_wati-inbox').handle(b));
  if(!['meta','wati'].includes(b.channel))return out(400,{ok:false,error:'Canal inválido'});
  const AI=require('./_whatsapp-ai');
  const admin=['admin','superadmin'].includes(C.norm(user.role));
  if(b.action==='start_chat'){
   const phone=String(b.phone||'');if(!/^[1-9]\d{7,14}$/.test(phone))return out(400,{ok:false,error:'Indica un número internacional válido.'});
   const rows=await C.sb(C.mainCfg(),'whatsapp_contacts?phone_e164=eq.'+encodeURIComponent(phone)+'&select=*&limit=1');
   const contact=rows?.[0]||await C.upsertContact(phone,{name:C.clean(b.name,160)||'Cliente',opt_in:false,needs_human:true,metadata:{workspace:{status:'open',created_by:user.user_id,origin:'manual_chat'}}});
   return out(200,{ok:true,phone,contact});
  }
  if(b.action==='conversation_update'){
   const phone=C.normalizePhone(b.phone);if(!/^\d{8,15}$/.test(phone))return out(400,{ok:false,error:'Teléfono inválido.'});
   const c=await C.getContact(phone);if(!c)return out(404,{ok:false,error:'Conversación no encontrada.'});
   const w={...(c.metadata?.workspace||{})};
   if(b.status!==undefined){if(!['open','pending','closed'].includes(b.status))return out(400,{ok:false,error:'Estado inválido.'});w.status=b.status;}
   if(b.priority!==undefined)w.priority=b.priority===true;
   if(b.tags!==undefined){if(!Array.isArray(b.tags)||b.tags.length>8)return out(400,{ok:false,error:'Usa hasta ocho etiquetas.'});w.tags=[...new Set(b.tags.map(t=>C.clean(t,30)).filter(Boolean))];}
   if(b.assignment==='me')w.assigned_to=user.user_id;
   if(b.assignment==='release'){
    if(w.assigned_to&&w.assigned_to!==user.user_id&&!admin)return out(403,{ok:false,error:'Solo el responsable o administración puede liberar este chat.'});
    w.assigned_to=null;
   }
   w.updated_at=new Date().toISOString();const takeover=b.assignment==='me'||b.status==='closed';await C.upsertContact(phone,{...(takeover?{needs_human:true}:{}),metadata:{...(c.metadata||{}),...(takeover?{care_assistant:{...(c.metadata?.care_assistant||{}),active:false}}:{}),workspace:w}});return out(200,{ok:true,workspace:w});
  }
  if(b.action==='ai_settings')return out(200,{ok:true,...await AI.settings(),admin});
  if(b.action==='save_ai_settings'){
   if(!admin)return out(403,{ok:false,error:'Solo administración puede activar respuestas automáticas.'});
   if(b.enabled===true&&(!process.env.OPENAI_API_KEY||!process.env.WHATSAPP_APP_SECRET))return out(409,{ok:false,error:'Configura OPENAI_API_KEY y la firma WHATSAPP_APP_SECRET en el servidor antes de activar la IA.'});
   await AI.save(AI.SETTINGS,{enabled:b.enabled===true,instructions:C.clean(b.instructions,1800)});return out(200,{ok:true});
  }
  if(b.action==='resume_ai'){
   if(!admin)return out(403,{ok:false,error:'Solo administración puede asignar la IA automática.'});
   const phone=C.normalizePhone(b.phone),c=await C.getContact(phone),cfg=await AI.settings();
   if(!cfg.enabled||!cfg.ready||!c||c.opt_out_at||!/^\d{8,15}$/.test(phone))return out(409,{ok:false,error:'Activa la IA y selecciona una conversación habilitada.'});
   await C.upsertContact(phone,{needs_human:false,metadata:{...(c.metadata||{}),ai_assistant:{active:true},care_assistant:{...(c.metadata?.care_assistant||{}),active:false}}});return out(200,{ok:true});
  }
  if(b.action==='library_list'){
   const rows=await C.sb(C.mainCfg(),'whatsapp_message_log?source=eq.workspace_template&direction=eq.internal&status=eq.saved&select=payload&order=updated_at.desc&limit=100');return out(200,{ok:true,templates:(rows||[]).map(r=>r.payload).filter(t=>t?.id&&t.title&&t.text)});
  }
  if(['library_upsert','library_delete'].includes(b.action)){
   const t=b.template||{},id=C.clean(t.id,80);if(!/^[a-f0-9-]{36}$/i.test(id))return out(400,{ok:false,error:'ID de plantilla inválido.'});
   const title=C.clean(t.title,100),text=C.clean(t.text,3500);if(b.action==='library_upsert'&&(!title||!text))return out(400,{ok:false,error:'Completa título y mensaje.'});
   await C.sb(C.mainCfg(),'whatsapp_message_log?on_conflict=wa_message_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({wa_message_id:'workspace-template:'+id,phone_e164:'workspace:meta',direction:'internal',message_type:'template',status:b.action==='library_delete'?'deleted':'saved',source:'workspace_template',payload:{id,title,text,author:user.user_id},updated_at:new Date().toISOString()})});return out(200,{ok:true,template:{id,title,text}});
  }
  if(b.action==='library_generate'){
   const topic=C.clean(b.topic,1200);if(!topic)return out(400,{ok:false,error:'Indica el tema de la plantilla.'});
   const reply=await AI.generate([{direction:'inbound',body_preview:topic}],'Crea una plantilla reutilizable para este tema. No inventes promociones ni precios; usa [precio] o [modelo] si faltan. Solo devuelve el texto de la plantilla.');return out(200,{ok:true,reply});
  }
  if(['suggest','summarize'].includes(b.action)){
   if(!process.env.OPENAI_API_KEY)return out(503,{ok:false,error:'La IA necesita configurar OPENAI_API_KEY en el servidor.'});
   const messages=(Array.isArray(b.messages)?b.messages:[]).filter(m=>['inbound','outbound'].includes(m.direction)&&typeof m.body_preview==='string').slice(-12);
   if(!messages.some(m=>m.direction==='inbound'))return out(400,{ok:false,error:'Selecciona una conversación con mensajes del cliente.'});
   const summary=b.action==='summarize';
   const instructions=summary?'Resume la conversación para el equipo en español: motivo, datos confirmados y siguiente paso. No respondas al cliente. No inventes información ni incluyas contraseñas o datos de pago.':('Propón un borrador para que un asesor lo revise antes de enviarlo. No envíes nada. Tono: '+({brief:'breve y directo',warm:'cercano y profesional',formal:'formal y claro'}[b.tone]||'cercano y profesional'));
   return out(200,{ok:true,reply:await AI.generate(messages,instructions)});
  }
  if(['notes','save_note','draft','save_draft'].includes(b.action)){
   const phone=String(b.phone||'');if(!/^[A-Za-z0-9_.:-]{1,180}$/.test(phone))return out(400,{ok:false,error:'Conversación inválida'});
   const isDraft=b.action.includes('draft'),key=(isDraft?'workspace-draft:'+user.user_id:'workspace-note')+':'+b.channel+':'+phone;
   if(b.action==='notes'||b.action==='draft'){
    const rows=await C.sb(C.mainCfg(),'whatsapp_message_log?wa_message_id=eq.'+encodeURIComponent(key)+'&select=body_preview,updated_at,payload&limit=1');
    return out(200,{ok:true,text:rows?.[0]?.body_preview||'',updated_at:rows?.[0]?.updated_at||null,client_id:isDraft?rows?.[0]?.payload?.client_id||null:undefined});
   }
   const text=C.clean(b.text,isDraft?4000:6000);
   await C.sb(C.mainCfg(),'whatsapp_message_log?on_conflict=wa_message_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({wa_message_id:key,phone_e164:'workspace:'+b.channel+':'+phone,direction:'internal',message_type:isDraft?'draft':'note',status:'saved',source:'workspace_'+(isDraft?'draft':'note'),body_preview:text,payload:{author:user.user_id,...(isDraft?{client_id:/^[a-f\d-]{36}$/i.test(String(b.client_id||''))?b.client_id:null}:{})},updated_at:new Date().toISOString()})});
   return out(200,{ok:true});
  }
  return out(400,{ok:false,error:'Acción no soportada'});
 }catch(e){return out(e.status||503,{ok:false,error:e.status?e.message:'No se pudo actualizar la bandeja. Reintenta en unos segundos.',...(e.reason?{reason:e.reason,retry_after:e.retryAfter||null}:{})});}
};
