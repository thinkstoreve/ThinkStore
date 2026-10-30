const C=require('./_whatsapp-core');
const {authenticate:authenticateInternal}=require('./requests-inbox');
const Intake=require('./_whatsapp-intake');
const out=(s,b)=>({statusCode:s,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'GET,POST,OPTIONS'},body:JSON.stringify(b)});
exports.handler=async(event)=>{try{if(event.httpMethod==='OPTIONS')return out(200,{ok:true});
 const m=C.mainCfg();let allowed=false,staff=null;const legacy=C.clean(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']);if(legacy&&[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String).includes(legacy))allowed=true;
 if(!allowed){const a=await authenticateInternal(event);staff=a;const r=C.norm(a?.role);allowed=!!a?.ok&&['admin','superadmin','gerente','vendedor','soporte','recepcion'].includes(r)}if(!allowed)return out(401,{ok:false,error:'No autorizado'});
 const cfg=C.waCfg();if(event.httpMethod==='GET')return out(200,{ok:true,configured:{access_token:!!cfg.token,phone_number_id:!!cfg.phoneId,verify_token:!!cfg.verifyToken,app_secret:!!cfg.appSecret,graph_version:!!cfg.version,debt_automation:String(process.env.WHATSAPP_DEBT_AUTOMATION_ENABLED||'').toLowerCase()==='true',debt_template:!!process.env.WHATSAPP_DEBT_TEMPLATE_NAME,service_notifications:String(process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED||'').toLowerCase()==='true',appointment_notifications:String(process.env.WHATSAPP_APPOINTMENT_NOTIFICATIONS_ENABLED||'').toLowerCase()==='true',payment_notifications:String(process.env.WHATSAPP_PAYMENT_NOTIFICATIONS_ENABLED||'').toLowerCase()==='true',shared_relay_secret:!!process.env.WHATSAPP_EVENTS_SECRET,order_notifications:String(process.env.WHATSAPP_ORDER_NOTIFICATIONS_ENABLED||'').toLowerCase()==='true'},webhook_url:`${cfg.site}/.netlify/functions/whatsapp-webhook`,official_phone:'+58 424 170 6142'});
 let b={};try{b=JSON.parse(event.body||'{}')}catch{return out(400,{ok:false,error:'JSON inválido'})}if(['alerts','mark_read'].includes(b.action)){
 if(!staff?.user_id)return out(401,{ok:false,error:'Inicia sesión para consultar tus notificaciones'});
 if(b.action==='alerts')return out(200,{ok:true,...await C.sb(m,'rpc/ts_whatsapp_alerts',{method:'POST',body:JSON.stringify({p_user:staff.user_id})})});
 const phone=C.normalizePhone(b.phone),ids=b.ids;
 if(!/^\d{8,15}$/.test(phone)||!Array.isArray(ids)||ids.length>100||ids.some(x=>!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(String(x))))return out(400,{ok:false,error:'Lectura inválida'});
 const changed=await C.sb(m,'rpc/ts_whatsapp_mark_read',{method:'POST',body:JSON.stringify({p_user:staff.user_id,p_phone:phone,p_ids:ids})});return out(200,{ok:true,changed});
 }
 if(String(b.action||'').startsWith('marketing_')){try{return out(200,await require('./_whatsapp-marketing').handle(b,staff))}catch(e){return out(e.status||400,{ok:false,error:C.clean(e.message,300)})}}
 if(b.action==='templates')return out(200,{ok:true,templates:await require('./_whatsapp-templates').list()});
 if(b.action==='send_template'){
 let result;try{result=await require('./_whatsapp-templates').send(b,staff)}catch(e){return out(409,{ok:false,error:C.clean(e.message,300)})}
 return out(result.status==='sent'?200:409,{ok:result.status==='sent',result,error:result.status==='duplicate'?'Este envío ya fue procesado. Revisa el historial.':result.status==='unconfirmed'?'Entrega sin confirmar. Revisa Meta antes de reenviar.':undefined});
 }
 if(b.action==='inbox_health'){
 const configured={token:!!cfg.token,phone_id:!!cfg.phoneId,version:!!cfg.version,signature:!!cfg.appSecret,verify_token:!!cfg.verifyToken};
 let connection={ok:false,reason:'Configuración incompleta'};
 if(configured.token&&configured.phone_id&&configured.version){
  try{const r=await fetch(`https://graph.facebook.com/${cfg.version}/${cfg.phoneId}?fields=display_phone_number,verified_name`,{headers:{Authorization:`Bearer ${cfg.token}`}});const d=await r.json();
  connection=r.ok?{ok:true,phone:d.display_phone_number,name:d.verified_name,matches_official:C.normalizePhone(d.display_phone_number)==='584241706142'}:{ok:false,code:d.error?.code,reason:d.error?.code===190?'La credencial de Meta está vencida o no es válida':'Meta no permite consultar el número conectado'};
  }catch{connection={ok:false,reason:'No se pudo consultar la conexión con Meta'};}
 }
 const latest=await C.sb(m,'whatsapp_message_log?select=created_at,direction,source&direction=eq.inbound&order=created_at.desc&limit=1');
 let outbox=false;try{await C.sb(m,'whatsapp_notification_outbox?select=event_key&limit=1');outbox=true}catch{}
 const automation={outbox,service:String(process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED)==='true',appointments:String(process.env.WHATSAPP_APPOINTMENT_NOTIFICATIONS_ENABLED)==='true',payments:String(process.env.WHATSAPP_PAYMENT_NOTIFICATIONS_ENABLED)==='true',orders:String(process.env.WHATSAPP_ORDER_NOTIFICATIONS_ENABLED)==='true'};
 return out(200,{ok:true,configured,connection,automation,last_inbound:latest?.[0]?.created_at||null,webhook_url:`${cfg.site}/.netlify/functions/whatsapp-webhook`});
 }
 if(b.action==='conversation'){
 const phone=C.normalizePhone(b.phone);if(!/^\d{8,15}$/.test(phone))return out(400,{ok:false,error:'Teléfono inválido'});
 let before='';if(b.before_at||b.before_id){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(b.before_at||'')||!Number.isFinite(Date.parse(b.before_at))||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(b.before_id||''))return out(400,{ok:false,error:'Cursor inválido'});const at=b.before_at;before='&or='+encodeURIComponent('(created_at.lt.'+at+',and(created_at.eq.'+at+',id.lt.'+b.before_id+'))');}
 const rows=await C.sb(m,`whatsapp_message_log?select=id,wa_message_id,direction,message_type,status,source,body_preview,created_at&phone_e164=eq.${encodeURIComponent(phone)}${before}&order=created_at.desc,id.desc&limit=100`);
 return out(200,{ok:true,has_more:rows.length===100,rows:rows.reverse(),contact:await C.getContact(phone)});
 }
 if(b.action==='send_reply'){
 const phone=C.normalizePhone(b.phone),text=String(b.message||'').trim(),clientId=String(b.client_id||'');
 if(!/^\d{8,15}$/.test(phone)||!text||text.length>4000||!/^[a-f0-9-]{36}$/i.test(clientId))return out(400,{ok:false,error:'Mensaje o teléfono inválido'});
 const contact=await C.getContact(phone),last=Date.parse(contact?.last_inbound_at||'');
 if(!Number.isFinite(last)||Date.now()-last>=24*60*60*1000)return out(409,{ok:false,error:'Han pasado 24 horas desde el último mensaje recibido. Pide al cliente que vuelva a escribir para responder desde aquí.'});
 if(!cfg.token||!cfg.phoneId||!cfg.version)return out(503,{ok:false,error:'Falta configurar la conexión de WhatsApp con Meta'});
 const key='staff:'+clientId,endpoint=`whatsapp_message_log?wa_message_id=eq.${encodeURIComponent(key)}`;
 const existing=await C.sb(m,`whatsapp_message_log?select=id,status&source=eq.staff_reply&payload->>client_id=eq.${encodeURIComponent(clientId)}&limit=1`);if(existing?.length)return out(409,{ok:false,error:'Este envío ya fue procesado o está en curso. Actualiza la conversación antes de reenviar.'});
 const reserved=await C.sb(m,'whatsapp_message_log?on_conflict=wa_message_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({wa_message_id:key,phone_e164:phone,direction:'outbound',message_type:'text',status:'sending',source:'staff_reply',body_preview:text,payload:{client_id:clientId}})});
 if(!reserved?.length)return out(409,{ok:false,error:'El mensaje ya está en proceso'});
 await C.upsertContact(phone,{needs_human:true,metadata:{...(contact.metadata||{}),care_assistant:{...(contact.metadata?.care_assistant||{}),active:false}}});
 try{const sent=await C.sendText(phone,text),messageId=sent?.messages?.[0]?.id;if(!messageId)throw Error('missing_id');
 await C.sb(m,endpoint,{method:'PATCH',body:JSON.stringify({wa_message_id:messageId,status:'sent',updated_at:new Date().toISOString()})});
 await C.upsertContact(phone,{last_outbound_at:new Date().toISOString()});return out(200,{ok:true});
 }catch{await C.sb(m,endpoint,{method:'PATCH',body:JSON.stringify({status:'unconfirmed',updated_at:new Date().toISOString()})}).catch(()=>{});return out(502,{ok:false,error:'No se pudo confirmar el envío. Revisa WhatsApp y la conexión antes de volver a enviarlo.'});}
 }
 if(b.action==='care_contacts'){
 if(staff?.user_id){const rows=await C.sb(m,'rpc/ts_whatsapp_inbox',{method:'POST',body:JSON.stringify({p_user:staff.user_id})});return out(200,{ok:true,rows});}
 const rows=await C.sb(m,'whatsapp_contacts?select=phone_e164,name,needs_human,last_inbound_at,last_message_preview,metadata&order=last_inbound_at.desc.nullslast&limit=100');
 return out(200,{ok:true,rows});
 }
 if(b.action==='assign_care_bot'||b.action==='assign_human'){
 const phone=C.normalizePhone(b.phone);if(!/^\d{8,15}$/.test(phone))return out(400,{ok:false,error:'Teléfono inválido'});
 const contact=await C.getContact(phone);if(!contact)return out(404,{ok:false,error:'El cliente debe escribir primero por WhatsApp'});
 const metadata={...(contact.metadata||{})};
 if(b.action==='assign_human'){metadata.care_assistant={...(metadata.care_assistant||{}),active:false};await C.upsertContact(phone,{needs_human:true,metadata});return out(200,{ok:true});}
 if(!contact.last_inbound_at||Date.now()-Date.parse(contact.last_inbound_at)>23*60*60*1000)return out(409,{ok:false,error:'El cliente debe escribir de nuevo antes de asignar el asistente'});
 if(metadata.care_assistant?.active)return out(409,{ok:false,error:'El asistente ya está asignado'});
 const service=['Essential','Lab Mobile','Pickup','Business'].includes(b.service)?b.service:'Essential';
 const requestType=b.request_type==='auto'?'auto':Intake.TYPES.includes(b.request_type)?b.request_type:'think_care';
 metadata.care_assistant={active:true,step:requestType==='auto'?'type':'name',request_type:requestType,data:{},service,request_id:require('crypto').randomUUID(),expires_at:new Date(Date.now()+2*60*60*1000).toISOString(),assigned_at:new Date().toISOString()};
 await C.upsertContact(phone,{needs_human:false,metadata});
 try{const reply='Tu asesor de ThinkStore me asignó para ayudarte a registrar una solicitud. Soy el asistente automático. Puedes escribir ASESOR para volver a atención personal. No envíes contraseñas. '+(requestType==='auto'?Intake.menu:Intake.questions(requestType).name);const sent=await C.sendText(phone,reply);await C.logMessage({wa_message_id:sent?.messages?.[0]?.id||null,phone_e164:phone,direction:'outbound',message_type:'text',status:'sent',source:'care_assistant_assignment',body_preview:reply,payload:sent});}
 catch(e){await C.upsertContact(phone,{needs_human:true,metadata:{...metadata,care_assistant:{...metadata.care_assistant,active:false}}});return out(502,{ok:false,error:'No se pudo iniciar el asistente. La conversación sigue en atención humana.'});}
 return out(200,{ok:true});
 }
 if(b.action==='preview_debts'){const a=await authenticateInternal(event);if(!a.ok||!['admin','superadmin'].includes(a.role))return out(403,{ok:false,error:'Solo administración puede consultar financiación'});const rows=await C.debtCandidates();return out(200,{ok:true,count:rows.length,rows:rows.slice(0,100)})}if(b.action==='preview_reply'){return out(200,{ok:true,reply:await C.smartReply(C.clean(b.message,1000))})}return out(400,{ok:false,error:'Acción no soportada'});
}catch(e){console.error('whatsapp-admin',e.message);return out(503,{ok:false,error:'No se pudo actualizar WhatsApp. Reintenta en unos segundos.'});}
};
