'use strict';
const {sendClientEvent}=require('./support-email-core');
const {statusClientEmail,sendResend}=require('./support-mail-ui');

const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(statusCode,body)=>({statusCode,headers:HEADERS,body:JSON.stringify(body)});
const clean=(v,max=4000)=>String(v??'').trim().slice(0,max);
const digits=v=>clean(v,80).replace(/\D/g,'');
const encodePath=v=>String(v||'').split('/').map(encodeURIComponent).join('/');
const TERMS_VERSION='TS-REPAIR-2026-10-V1';

function maskSerial(value){
  const raw=clean(value,120); if(!raw)return '';
  if(raw.length<=4)return '••••';
  return `${'•'.repeat(Math.min(8,Math.max(4,raw.length-4)))}${raw.slice(-4)}`;
}
function addDays(value,days){
  if(!value||!(Number(days)>0))return null;
  const d=new Date(value); if(Number.isNaN(d.getTime()))return null;
  d.setUTCDate(d.getUTCDate()+Number(days)); return d.toISOString();
}
function clientOrder(o){
  const quote=Math.max(0,Number(o.quote_amount||0));
  const paid=Math.max(0,Number(o.amount_paid||0));
  const delivered=o.delivered_at||(/entreg/i.test(clean(o.status))?o.updated_at:null);
  return {
    code:o.code,
    client_name:o.client_name,
    device_type:o.device_type,
    device_model:o.device_model,
    device_color:o.device_color,
    serial_masked:maskSerial(o.serial_imei),
    reported_issue:o.reported_issue,
    service_mode:o.service_mode,
    status:o.status,
    created_at:o.created_at,
    updated_at:o.updated_at,
    delivered_at:o.delivered_at,
    quote_status:o.quote_status,
    quote_amount:quote,
    quote_currency:o.quote_currency||'USD',
    quote_repair_details:o.quote_repair_details,
    quote_sent_at:o.quote_sent_at,
    quote_approved_at:o.quote_approved_at,
    quote_terms_accepted_at:o.quote_terms_accepted_at,
    quote_terms_version:o.quote_terms_version,
    quote_client_comment:o.quote_client_comment,
    warranty_days:Number(o.warranty_days||0),
    warranty_expires_at:addDays(delivered,Number(o.warranty_days||0)),
    payment_status:o.payment_status||'Pendiente',
    amount_paid:paid,
    balance:Math.max(0,Math.round((quote-paid)*100)/100),
    paid_at:o.paid_at,
    delivery_method:o.delivery_method,
    tracking_company:o.tracking_company,
    tracking_code:o.tracking_code
  };
}
function historyFrom(o,notes=[]){
  const rows=[]; const push=(title,status,at,detail='')=>{if(at)rows.push({title,status,created_at:at,detail})};
  push('Equipo recibido','Recibido',o.created_at,'Orden de servicio creada en ThinkStore.');
  for(const n of notes||[]){
    push(clean(n.client_title)||clean(n.status_after)||clean(n.note_type)||'Actualización',clean(n.status_after),n.created_at,clean(n.note,800));
  }
  push('Cotización enviada','Cotización enviada',o.quote_sent_at,'Cotización disponible para revisión.');
  push('Cotización aprobada','Aprobado por cliente',o.quote_approved_at,'Autorización registrada por el cliente.');
  push('Pago completado','Pago completado',o.paid_at,'Pago registrado en la orden.');
  push('Equipo entregado','Entregado',o.delivered_at,'Servicio finalizado y equipo entregado.');
  const seen=new Set();
  return rows.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).filter(x=>{const k=`${x.title}|${x.created_at}`;if(seen.has(k))return false;seen.add(k);return true}).slice(0,80);
}
async function sendClientStatus(order){
  if(!clean(order?.client_email))return;
  const mail=statusClientEmail(order);
  await sendResend({to:order.client_email,subject:mail.subject,html:mail.html,text:mail.text});
}

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return reply(200,{ok:true});
  if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Método no permitido'});

  const url=clean(process.env.SUPPORT_SUPABASE_URL||process.env.SUPABASE_URL).replace(/\/$/,'');
  const key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!url||!key)return reply(501,{ok:false,error:'Portal temporalmente no disponible'});

  const h={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  const req=async(path,options={})=>{
    const r=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...h,...(options.headers||{})}});
    const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}
    if(!r.ok){const err=new Error(d?.message||`Error ${r.status}`);err.status=r.status;throw err}
    return d;
  };

  let body={};try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{ok:false,error:'Solicitud inválida'})}
  const action=clean(body.action||'lookup');
  const code=clean(body.code,120).toUpperCase();
  const token=clean(body.token,120);
  const phoneLast4=digits(body.phone_last4).slice(-4);
  if(!code&&!token)return reply(400,{ok:false,error:'Código de orden requerido'});

  try{
    const select='id,code,client_name,client_email,client_phone,device_type,device_model,device_color,serial_imei,reported_issue,service_mode,status,created_at,updated_at,delivered_at,quote_status,quote_amount,quote_currency,quote_repair_details,quote_sent_at,quote_approved_at,quote_terms_accepted_at,quote_terms_version,quote_client_comment,warranty_days,public_token,assigned_technician_email,payment_status,amount_paid,paid_at,delivery_method,tracking_company,tracking_code';
    const lookup=code?`code=ilike.${encodeURIComponent(code)}`:`public_token=eq.${encodeURIComponent(token)}`;
    const rows=await req(`service_orders?select=${select}&${lookup}&limit=1`);
    const o=rows?.[0];
    if(!o)return reply(404,{ok:false,error:'Orden no encontrada'});

    const storedLast4=digits(o.client_phone).slice(-4);
    const tokenSecure=Boolean(token&&clean(o.public_token)===token);
    const phoneSecure=Boolean(phoneLast4.length===4&&storedLast4&&phoneLast4===storedLast4);
    const secure=tokenSecure||phoneSecure;
    const verificationMethod=tokenSecure?'qr_token':phoneSecure?'phone_last4':'';

    if(action==='reply'||action==='approve_quote'||action==='reject_quote'||action==='submit_feedback'){
      if(!secure)return reply(403,{ok:false,error:'Confirma el acceso seguro de la orden antes de continuar.'});
    }

    if(action==='reply'){
      const message=clean(body.message,2000);if(!message)return reply(400,{ok:false,error:'Escribe un mensaje.'});
      const last=await req(`service_order_messages?select=created_at&order_id=eq.${encodeURIComponent(String(o.id))}&sender_type=eq.client&order=created_at.desc&limit=1`);
      if(last?.[0]?.created_at&&Date.now()-new Date(last[0].created_at).getTime()<5000)return reply(429,{ok:false,error:'Espera unos segundos antes de enviar otro mensaje.'});
      await req('service_order_messages',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:o.id,sender_type:'client',sender_name:o.client_name||'Cliente',message})});
      try{await sendClientEvent({eventType:'client_message',order:o,message,req})}catch(mailErr){console.error('support email client_message',mailErr)}
      return reply(200,{ok:true});
    }

    if(action==='approve_quote'){
      if(o.quote_approved_at||o.status==='Aprobado por cliente'||o.quote_status==='Aprobado'){
        return reply(200,{ok:true,already_approved:true,status:'Aprobado por cliente',approved_at:o.quote_approved_at});
      }
      if(o.status!=='Cotización enviada'&&o.quote_status!=='Enviado')return reply(409,{ok:false,error:'La cotización todavía no está disponible para aprobación.'});
      if(!(Number(o.quote_amount||0)>0)||!clean(o.quote_repair_details))return reply(409,{ok:false,error:'La cotización está incompleta. Comunícate con ThinkStore antes de aprobar.'});
      if(body.accept_terms!==true)return reply(400,{ok:false,error:'Debes aceptar las políticas de reparación para continuar.'});
      const comment=clean(body.comment,1200);const now=new Date().toISOString();
      if(comment)await req('service_order_messages',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:o.id,sender_type:'client',sender_name:o.client_name||'Cliente',message:comment})});
      const patch={status:'Aprobado por cliente',quote_status:'Aprobado',quote_approved_at:now,quote_terms_accepted_at:now,quote_terms_version:TERMS_VERSION,quote_client_comment:comment||null,updated_at:now};
      await req(`service_orders?id=eq.${encodeURIComponent(String(o.id))}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(patch)});
      await req('service_order_notes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:o.id,note:'El cliente aprobó la cotización y aceptó las políticas de reparación.',visibility:'client',author_name:o.client_name||'Cliente',note_type:'Aprobación de cotización',status_after:'Aprobado por cliente',client_title:'Cotización aprobada'})});
      await req('service_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:o.client_email||null,actor_role:'client',action:'quote_approved_client',entity_type:'service_order',entity_id:String(o.id),before_data:{status:o.status,quote_status:o.quote_status},after_data:{...patch,terms_version:TERMS_VERSION,verification_method:verificationMethod}})});
      const updatedOrder={...o,...patch};
      try{await sendClientEvent({eventType:'quote_approved',order:updatedOrder,comment,req})}catch(mailErr){console.error('support email quote_approved staff',mailErr)}
      try{await sendClientStatus(updatedOrder)}catch(mailErr){console.error('support email quote_approved client',mailErr)}
      return reply(200,{ok:true,status:'Aprobado por cliente',approved_at:now,terms_version:TERMS_VERSION});
    }

    if(action==='reject_quote'){
      if(o.quote_approved_at||o.status==='Aprobado por cliente'||o.quote_status==='Aprobado')return reply(409,{ok:false,error:'Esta cotización ya fue aprobada. Comunícate con ThinkStore si necesitas hacer un cambio.'});
      if(o.status!=='Cotización enviada'&&o.quote_status!=='Enviado'&&o.status!=='No aprobado')return reply(409,{ok:false,error:'No hay una cotización pendiente para rechazar.'});
      const comment=clean(body.comment,1200);const now=new Date().toISOString();
      const patch={status:'No aprobado',quote_status:'No aprobado',quote_client_comment:comment||null,updated_at:now};
      try{
        await req('rpc/ts_save_service_order_parts',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_order_code:o.code,p_parts:[],p_actor_email:o.client_email||'client'})});
      }catch(releaseErr){
        console.warn('No se pudo liberar la reserva por RPC:',releaseErr.message);
        try{await req(`service_order_parts?order_code=eq.${encodeURIComponent(o.code)}&status=eq.reserved`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'released',updated_at:now})})}catch(_){}
      }
      await req(`service_orders?id=eq.${encodeURIComponent(String(o.id))}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({...patch,reserved_parts_cost:0})});
      await req('service_order_notes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:o.id,note:comment?`El cliente no aprobó la cotización. Comentario: ${comment}`:'El cliente decidió no aprobar la cotización.',visibility:'client',author_name:o.client_name||'Cliente',note_type:'Decisión de cotización',status_after:'No aprobado',client_title:'Cotización no aprobada'})});
      try{await req('service_order_notes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:o.id,note:'Los repuestos preparados fueron liberados automáticamente al no aprobarse la cotización.',visibility:'internal',author_name:'Sistema ThinkStore',note_type:'Repuesto',status_after:'No aprobado'})})}catch(_){}
      await req('service_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:o.client_email||null,actor_role:'client',action:'quote_rejected_client',entity_type:'service_order',entity_id:String(o.id),before_data:{status:o.status,quote_status:o.quote_status},after_data:{...patch,verification_method:verificationMethod}})});
      const updatedOrder={...o,...patch};
      try{await sendClientEvent({eventType:'quote_rejected',order:updatedOrder,comment,req})}catch(mailErr){console.error('support email quote_rejected staff',mailErr)}
      try{await sendClientStatus(updatedOrder)}catch(mailErr){console.error('support email quote_rejected client',mailErr)}
      return reply(200,{ok:true,status:'No aprobado'});
    }

    if(action==='submit_feedback'){
      if(o.status!=='Entregado')return reply(409,{ok:false,error:'La reseña estará disponible cuando la orden se marque como entregada.'});
      const rating=Number(body.rating||0);const comment=clean(body.comment,1200);
      if(!Number.isInteger(rating)||rating<1||rating>5)return reply(400,{ok:false,error:'Selecciona una puntuación entre 1 y 5.'});
      if(!comment)return reply(400,{ok:false,error:'Escribe un comentario.'});
      const prior=await req(`service_feedback?select=id&order_id=eq.${encodeURIComponent(String(o.id))}&limit=1`);
      if(prior?.length)return reply(409,{ok:false,error:'Ya existe una reseña para esta reparación.'});
      await req('service_feedback',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:o.id,rating,comment,client_name:o.client_name||'Cliente',client_email:o.client_email||null})});
      try{await sendClientEvent({eventType:'client_review',order:o,rating,comment,req})}catch(mailErr){console.error('support email client_review',mailErr)}
      return reply(200,{ok:true});
    }

    if(!secure){
      if(phoneLast4)return reply(403,{ok:false,error:'No pudimos verificar esos datos. Revisa los últimos 4 dígitos del teléfono registrado.'});
      return reply(200,{ok:true,secure:false,requires_verification:Boolean(storedLast4),order:{code:o.code,device_model:o.device_model,status:o.status,updated_at:o.updated_at}});
    }

    const [notes,messages,photos,feedbackRows]=await Promise.all([
      req(`service_order_notes?select=id,note_type,status_after,client_title,note,diagnosis,work_performed,parts_used,tests_performed,client_notes,author_name,created_at&order_id=eq.${encodeURIComponent(String(o.id))}&visibility=eq.client&order=created_at.desc&limit=80`),
      req(`service_order_messages?select=id,sender_type,sender_name,message,created_at&order_id=eq.${encodeURIComponent(String(o.id))}&order=created_at.asc&limit=300`),
      req(`service_order_photos?select=id,storage_path,file_url,label,client_caption,created_at&order_id=eq.${encodeURIComponent(String(o.id))}&visibility=eq.client&order=created_at.desc&limit=60`),
      req(`service_feedback?select=id,rating,comment,created_at&order_id=eq.${encodeURIComponent(String(o.id))}&limit=1`)
    ]);

    const signed=[];
    for(const p of photos||[]){
      let signed_url='';
      if(p.storage_path){
        try{
          const r=await fetch(`${url}/storage/v1/object/sign/service-order-files/${encodePath(p.storage_path)}`,{method:'POST',headers:h,body:JSON.stringify({expiresIn:3600})});
          const d=await r.json().catch(()=>({}));const s=d.signedURL||d.signedUrl||'';
          signed_url=s.startsWith('http')?s:s.startsWith('/storage/v1')?`${url}${s}`:s.startsWith('/object/')?`${url}/storage/v1${s}`:s?`${url}/storage/v1/${s.replace(/^\//,'')}`:'';
        }catch(_){/* signed photo unavailable */}
      }
      if(!signed_url&&p.file_url&&p.file_url!=='private')signed_url=p.file_url;
      if(signed_url)signed.push({...p,signed_url});
    }

    const publicOrder=clientOrder(o);
    return reply(200,{ok:true,secure:true,verification_method:verificationMethod,terms_version:TERMS_VERSION,order:publicOrder,notes:notes||[],history:historyFrom(o,notes||[]),messages:messages||[],photos:signed,feedback:feedbackRows?.[0]||null});
  }catch(e){
    console.error(e);
    return reply(500,{ok:false,error:'No se pudo procesar el seguimiento en este momento.'});
  }
};
