const C=require('./_whatsapp-core');
const {authenticateInternal}=require('./staff-auth-core');
const out=(s,b)=>({statusCode:s,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'GET,POST,OPTIONS'},body:JSON.stringify(b)});
exports.handler=async(event)=>{if(event.httpMethod==='OPTIONS')return out(200,{ok:true});
 const m=C.mainCfg();let allowed=false;const legacy=C.clean(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']);if(legacy&&[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String).includes(legacy))allowed=true;
 if(!allowed){const a=await authenticateInternal(event);const r=C.norm(a?.role);allowed=!!a?.ok&&/admin|superadmin|gerente/.test(r)}if(!allowed)return out(401,{ok:false,error:'No autorizado'});
 const cfg=C.waCfg();if(event.httpMethod==='GET')return out(200,{ok:true,configured:{access_token:!!cfg.token,phone_number_id:!!cfg.phoneId,verify_token:!!cfg.verifyToken,app_secret:!!cfg.appSecret,graph_version:!!cfg.version,debt_automation:String(process.env.WHATSAPP_DEBT_AUTOMATION_ENABLED||'').toLowerCase()==='true',debt_template:!!process.env.WHATSAPP_DEBT_TEMPLATE_NAME,service_notifications:String(process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED||'').toLowerCase()==='true',appointment_notifications:String(process.env.WHATSAPP_APPOINTMENT_NOTIFICATIONS_ENABLED||'').toLowerCase()==='true',payment_notifications:String(process.env.WHATSAPP_PAYMENT_NOTIFICATIONS_ENABLED||'').toLowerCase()==='true',shared_relay_secret:!!process.env.WHATSAPP_EVENTS_SECRET,order_notifications:String(process.env.WHATSAPP_ORDER_NOTIFICATIONS_ENABLED||'').toLowerCase()==='true'},webhook_url:`${cfg.site}/.netlify/functions/whatsapp-webhook`,official_phone:'+58 424 170 6142'});
 let b={};try{b=JSON.parse(event.body||'{}')}catch{return out(400,{ok:false,error:'JSON inválido'})}if(b.action==='care_contacts'){
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
 metadata.care_assistant={active:true,step:'name',data:{},service,request_id:require('crypto').randomUUID(),expires_at:new Date(Date.now()+2*60*60*1000).toISOString(),assigned_at:new Date().toISOString()};
 await C.upsertContact(phone,{needs_human:false,metadata});
 try{const reply='Tu asesor de Think Care me asignó para ayudarte a registrar la solicitud. Soy el asistente automático. Puedes escribir ASESOR en cualquier momento para volver a atención personal. No envíes contraseñas. ¿Cuál es tu nombre y apellido?';const sent=await C.sendText(phone,reply);await C.logMessage({wa_message_id:sent?.messages?.[0]?.id||null,phone_e164:phone,direction:'outbound',message_type:'text',status:'sent',source:'care_assistant_assignment',body_preview:reply,payload:sent});}
 catch(e){await C.upsertContact(phone,{needs_human:true,metadata:{...metadata,care_assistant:{...metadata.care_assistant,active:false}}});return out(502,{ok:false,error:'No se pudo iniciar el asistente. La conversación sigue en atención humana.'});}
 return out(200,{ok:true});
 }
 if(b.action==='preview_debts'){const rows=await C.debtCandidates();return out(200,{ok:true,count:rows.length,rows:rows.slice(0,100)})}if(b.action==='preview_reply'){return out(200,{ok:true,reply:await C.smartReply(C.clean(b.message,1000))})}return out(400,{ok:false,error:'Acción no soportada'});
};
