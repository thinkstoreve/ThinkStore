'use strict';
// Two transactional reminders, evaluated by calendar date in Caracas.
const crypto=require('node:crypto');
const C=require('./_whatsapp-core');
const Mail=require('./support-mail-ui');
const {validDate}=require('../../repair-financing');
function stageFor(due,now=new Date()){
 if(!validDate(due))return null;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const days=Math.round((Date.parse(due+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
 return days===2?'before_2_days':days===0?'due_today':null;
}
function copy(c,stage){
 const first=C.clean(c.name).split(/\s+/)[0]||'cliente';
 const date=c.due_date.split('-').reverse().join('/');
 return {subject:stage==='due_today'?'Hoy es tu fecha de pago · ThinkStore':'Tu próximo pago está cerca · ThinkStore',
 text:`¡Hola, ${first}! 👋 Esperamos que estés muy bien.\n\n${stage==='due_today'?'Hoy es la fecha acordada para tu pago':'Te recordamos con cariño que faltan 2 días para tu pago'} de la orden ${c.code} en ThinkStore.\n\nSaldo pendiente: USD ${Number(c.balance).toFixed(2)}\nFecha de pago: ${date}\n\nPuedes responder a este mensaje para consultar los métodos de pago o enviarnos tu comprobante. Si ya pagaste, gracias; avísanos para verificarlo y actualizar tu saldo. 💛\n\n¡Gracias por confiar en ThinkStore!`};
}
async function candidates(){
 // Do not turn a quote into a debt: only explicitly financed service orders.
 const rows=await C.sb(C.supportCfg(),'service_orders?select=id,code,client_name,client_phone,client_email,device_model,status,quote_status,quote_amount,quote_currency,amount_paid,payment_status,reception_checklist&limit=2500');
 return (rows||[]).filter(o=>o.reception_checklist?.__financing?.enabled===true&&validDate(o.reception_checklist.__financing.due_date)&&String(o.quote_currency||'USD')==='USD'&&Number(o.quote_amount)-Number(o.amount_paid||0)>0.009&&!/cancel|rechaz|anulad|no aprobado/i.test([o.status,o.quote_status].join(' '))&&!/^(paid|pagado)$/i.test(o.payment_status||''))
 .map(o=>({entity_type:'service_order',entity_id:String(o.id),code:o.code||String(o.id),name:o.client_name||'Cliente',phone:C.normalizePhone(o.client_phone),email:C.clean(o.client_email),balance:Math.round((Number(o.quote_amount)-Number(o.amount_paid||0))*100)/100,due_date:o.reception_checklist.__financing.due_date}));
}
async function once(c,stage,channel,send){
 const destination=channel==='email'?c.email.toLowerCase():c.phone;
 const key=crypto.createHash('sha256').update(['financing',c.entity_type,c.entity_id,c.due_date,stage,channel,destination].join('|')).digest('hex');
 const path=`whatsapp_notification_outbox?event_key=eq.${key}`;
 try{await C.sb(C.mainCfg(),'whatsapp_notification_outbox',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({event_key:key,phone_e164:c.phone||'email',template_name:channel==='email'?'financing_email':C.clean(process.env.WHATSAPP_DEBT_TEMPLATE_NAME||'ts_financiamiento_recordatorio_v2'),entity_type:c.entity_type,entity_id:c.entity_id,status:'pending'})});}
 catch(e){if(/duplicate key|23505|409/i.test(e.message))return 'duplicate';throw e;}
 // A durable unique claim prevents concurrent invocations and uncertain deliveries from repeating.
 try{const id=await send(key);if(!id)throw Error('El proveedor no confirmó el envío');
 await C.sb(C.mainCfg(),path,{method:'PATCH',body:JSON.stringify({status:'sent',provider_message_id:id,updated_at:new Date().toISOString()})});
 return 'sent';
 }catch(e){await C.sb(C.mainCfg(),path,{method:'PATCH',body:JSON.stringify({status:'failed',last_error:C.clean(e.message,450),updated_at:new Date().toISOString()})}).catch(()=>{});throw e;}
}
async function email(c,message,key){
 const token=C.clean(process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY);if(!token)throw Error('Falta configurar Resend');
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:C.clean(process.env.FROM_SOPORTE_EMAIL||process.env.FROM_SUPPORT_EMAIL||'ThinkStore Servicio Técnico <soporte@thinkstore.com.ve>'),to:[c.email],reply_to:C.clean(process.env.REPLY_TO_SOPORTE||process.env.REPLY_TO_SUPPORT||'soporte@thinkstore.com.ve'),subject:message.subject,text:message.text,html:Mail.emailShell({title:message.subject,lead:'Un recordatorio para ayudarte a organizar tu pago.',body:message.text.split('\n\n').map(p=>`<p>${Mail.esc(p).replace(/\n/g,'<br>')}</p>`).join(''),footerNote:'Recordatorio de tu reparación financiada en ThinkStore.'})})});
 const d=await r.json();if(!r.ok)throw Error(d.message||'No se pudo enviar el correo');return d.id;
}
exports.handler=async(event={})=>{
 // Netlify invokes scheduled Lambda handlers with POST. Production schedules are not URL-invocable.
 if(event.httpMethod&&event.httpMethod!=='POST')return {statusCode:405,body:'Scheduled function only'};
 const enabled=String(process.env.WHATSAPP_DEBT_AUTOMATION_ENABLED||'').toLowerCase()==='true';
 if(!enabled)return{statusCode:200,body:JSON.stringify({ok:true,enabled:false})};
 const result={ok:true,enabled:true,whatsapp:0,email:0,duplicates:0,skipped:0,errors:[]};
 try{
 const list=await candidates();let processed=0;
 for(const c of list){const stage=stageFor(c.due_date);if(!stage)continue;if(processed++>=Number(process.env.WHATSAPP_DEBT_DAILY_LIMIT||25))break;
 const message=copy(c,stage);
 for(const channel of ['email','whatsapp'])try{
 if(channel==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)){result.skipped++;continue;}
 let contact=null;
 if(channel==='whatsapp'){
 contact=await C.getContact(c.phone);
 if(!/^\d{10,15}$/.test(c.phone)||!contact||contact.opt_out_at||!(contact.opt_in===true||contact.metadata?.service_notifications_opt_in===true)){result.skipped++;continue;}
 const approved=await require('./_request-notifications').approved(C.clean(process.env.WHATSAPP_DEBT_TEMPLATE_NAME||'ts_financiamiento_recordatorio_v2'),C.clean(process.env.WHATSAPP_TEMPLATE_LANG||'es'));
 if(!approved){result.errors.push({code:c.code,channel,error:'Plantilla de utilidad no aprobada'});continue;}
 }
 const status=await once(c,stage,channel,async key=>{
 if(channel==='email')return email(c,message,key);
 const template=C.clean(process.env.WHATSAPP_DEBT_TEMPLATE_NAME||'ts_financiamiento_recordatorio_v2');
 const r=await C.sendTemplate(c.phone,template,C.clean(process.env.WHATSAPP_TEMPLATE_LANG||'es'),[C.clean(c.name).split(/\s+/)[0]||'Cliente',c.code,c.balance.toFixed(2),c.due_date.split('-').reverse().join('/')]);
 const id=r?.messages?.[0]?.id;if(id)await C.logMessage({wa_message_id:id,phone_e164:c.phone,direction:'outbound',message_type:'template',template_name:template,status:'sent',source:'debt_reminder',entity_type:c.entity_type,entity_id:c.entity_id,body_preview:`${stage} · ${c.code} · USD ${c.balance.toFixed(2)}`,payload:{stage,event_key:key,provider:r}});return id;
 });if(status==='sent')result[channel]++;else result.duplicates++;
 }catch(e){result.errors.push({code:c.code,channel,error:C.clean(e.message,300)});}
 }
 }catch(e){result.errors.push({error:C.clean(e.message,300)});}
 result.ok=result.errors.length===0;console.log('Financing reminders',JSON.stringify(result));
 return{statusCode:result.ok?200:500,body:JSON.stringify(result)};
};
exports.stageFor=stageFor;exports.copy=copy;exports.candidates=candidates;exports.once=once;
