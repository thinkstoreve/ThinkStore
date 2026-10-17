'use strict';

const {clean,siteRoot,verificationEmail,recoveryEmail,welcomeEmail,newCustomerInternalEmail}=require('./account-mail-ui');
const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const CANONICAL_URL='https://clhnndxsgzqnihhtrout.supabase.co';
const PUBLIC_KEY='sb_publishable_Q7ynhCPp8nMFQywia1LqCQ_6UEAGqRZ';
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v).toLowerCase());
const out=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
const svc=k=>({apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'});
const userHeaders=token=>({apikey:PUBLIC_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'});
function cfg(){return{url:clean(process.env.MAIN_SUPABASE_URL||process.env.THINKSTORE_SUPABASE_URL||process.env.SUPABASE_URL||CANONICAL_URL).replace(/\/$/,''),service:clean(process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY||process.env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY),resend:clean(process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY)}}
function sender(){return process.env.FROM_INFO_EMAIL||'ThinkStore Cuenta <info@thinkstore.com.ve>'}
function replyInfo(){return process.env.REPLY_TO_INFO||process.env.REPLY_TO_MARKETING||'info@thinkstore.com.ve'}
async function sendResend({key,to,subject,html,text,replyTo}){
  const recipients=(Array.isArray(to)?to:[to]).map(v=>clean(v).toLowerCase()).filter(validEmail);
  if(!recipients.length)throw Error('Destinatario inválido');
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:sender(),to:recipients,reply_to:clean(replyTo||replyInfo()),subject,html,text})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.message||data.error||`Resend HTTP ${r.status}`);
  return data;
}
async function generateLink(url,service,payload){
  const r=await fetch(`${url}/auth/v1/admin/generate_link`,{method:'POST',headers:svc(service),body:JSON.stringify(payload)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(data.msg||data.message||data.error_description||data.error||`Auth HTTP ${r.status}`);e.status=r.status;throw e;}
  const props=data.properties||data;
  return{raw:data,user:data.user||null,actionLink:clean(props.action_link||data.action_link),redirectTo:clean(props.redirect_to||data.redirect_to)};
}
async function upsertCustomer(url,service,userId,c){
  if(!userId)return;
  const record={id:userId,nombre:c.name,correo:c.email,telefono:c.phone,cedula_rif:c.idNumber,estado:c.state,ciudad:c.city,direccion:c.address};
  const r=await fetch(`${url}/rest/v1/clientes?on_conflict=id`,{method:'POST',headers:{...svc(service),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(record)});
  if(!r.ok){const t=await r.text().catch(()=> '');console.warn('ThinkStore clientes upsert:',t||r.status);}
}
async function signup(body,conf){
  const email=clean(body.email).toLowerCase(),password=String(body.password||''),name=clean(body.name,180),phone=clean(body.phone,80),idNumber=clean(body.idNumber||body.id_number,80),state=clean(body.state,120),city=clean(body.city,120),address=clean(body.address,320);
  if(!validEmail(email))return out(400,{ok:false,error:'Correo inválido'});
  if(password.length<6)return out(400,{ok:false,error:'La contraseña debe tener al menos 6 caracteres'});
  if(name.length<2)return out(400,{ok:false,error:'Escribe tu nombre y apellido'});
  const site=siteRoot();
  let link;
  try{link=await generateLink(conf.url,conf.service,{type:'signup',email,password,data:{name,phone,thinkstore_internal:false},redirect_to:`${site}/login.html?verified=1&welcome=1`});}
  catch(err){const msg=String(err.message||'');if(/already|registered|exists/i.test(msg))return out(409,{ok:false,code:'ACCOUNT_EXISTS',error:'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.'});return out(err.status||502,{ok:false,error:'No pudimos preparar la verificación de la cuenta.'});}
  if(!link.actionLink)return out(502,{ok:false,error:'No se pudo generar el enlace de verificación.'});
  const customer={name,email,phone,idNumber,state,city,address,createdAt:new Date().toLocaleString('es-VE',{timeZone:'America/Caracas'})};
  await upsertCustomer(conf.url,conf.service,link.user?.id,customer);
  let verificationSent=false,internalSent=false,warnings=[];
  try{const m=verificationEmail({name,email,actionLink:link.actionLink});await sendResend({key:conf.resend,to:email,...m});verificationSent=true;}catch(e){warnings.push(`Verificación: ${e.message}`);}
  try{const m=newCustomerInternalEmail(customer);await sendResend({key:conf.resend,to:process.env.INFO_INBOX_EMAIL||'info@thinkstore.com.ve',replyTo:email,...m});internalSent=true;}catch(e){warnings.push(`Aviso interno: ${e.message}`);}
  return out(verificationSent?200:502,{ok:verificationSent,user_id:link.user?.id||null,email,verification_sent:verificationSent,internal_notification_sent:internalSent,warnings,error:verificationSent?null:'La cuenta quedó creada, pero el correo de verificación no pudo enviarse. Usa Reenviar.'});
}
async function resendVerification(body,conf){
  const email=clean(body.email).toLowerCase(),password=String(body.password||'');
  if(!validEmail(email))return out(400,{ok:false,error:'Correo inválido'});
  try{
    const payload={type:'signup',email,redirect_to:`${siteRoot()}/login.html?verified=1&welcome=1`};
    if(password.length>=6)payload.password=password;
    const link=await generateLink(conf.url,conf.service,payload);
    if(!link.actionLink)throw Error('No se recibió un enlace');
    const name=clean(link.user?.user_metadata?.name||link.user?.user_metadata?.full_name||email.split('@')[0]);
    const m=verificationEmail({name,email,actionLink:link.actionLink});
    await sendResend({key:conf.resend,to:email,...m});
  }catch(err){return out(502,{ok:false,error:'No pudimos reenviar el correo de verificación. Si ya verificaste tu cuenta, intenta iniciar sesión.'});}
  return out(200,{ok:true,message:'Correo de verificación reenviado.'});
}
async function recovery(body,conf){
  const email=clean(body.email).toLowerCase();
  if(!validEmail(email))return out(400,{ok:false,error:'Correo inválido'});
  try{
    const link=await generateLink(conf.url,conf.service,{type:'recovery',email,redirect_to:`${siteRoot()}/login.html?view=recovery`});
    if(link.actionLink){const name=clean(link.user?.user_metadata?.name||link.user?.user_metadata?.full_name||email.split('@')[0]);const m=recoveryEmail({name,email,actionLink:link.actionLink});await sendResend({key:conf.resend,to:email,...m});}
  }catch(err){console.warn('ThinkStore recovery:',String(err?.message||err));}
  // Respuesta genérica para no revelar si existe o no la cuenta.
  return out(200,{ok:true,message:'Si existe una cuenta con ese correo, recibirás un enlace seguro.'});
}
async function welcome(event,conf){
  const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');
  if(!token)return out(401,{ok:false,error:'Sesión requerida'});
  const ur=await fetch(`${conf.url}/auth/v1/user`,{headers:userHeaders(token)});const user=await ur.json().catch(()=>({}));
  if(!ur.ok||!user?.id)return out(401,{ok:false,error:'Sesión inválida'});
  if(!user.email_confirmed_at)return out(409,{ok:false,error:'El correo aún no está verificado'});
  const meta=user.user_metadata||{};
  if(meta.thinkstore_welcome_email_sent_at)return out(200,{ok:true,already_sent:true});
  const name=clean(meta.name||meta.full_name||user.email?.split('@')[0]||'Cliente');
  const m=welcomeEmail({name,accountUrl:`${siteRoot()}/panel.html`});
  await sendResend({key:conf.resend,to:user.email,...m});
  const updated={...meta,thinkstore_welcome_email_sent_at:new Date().toISOString()};
  const pr=await fetch(`${conf.url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`,{method:'PUT',headers:svc(conf.service),body:JSON.stringify({user_metadata:updated})});
  if(!pr.ok)console.warn('ThinkStore welcome marker:',await pr.text().catch(()=>''));
  return out(200,{ok:true,sent:true,name});
}

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:H,body:''};
  if(event.httpMethod!=='POST')return out(405,{ok:false,error:'Método no permitido'});
  const conf=cfg();
  if(!conf.service)return out(503,{ok:false,error:'Falta configurar la clave de servicio de Supabase en Netlify'});
  if(!conf.resend)return out(503,{ok:false,error:'Falta configurar RESEND_API_KEY en Netlify'});
  let body={};try{body=JSON.parse(event.body||'{}')}catch(_){return out(400,{ok:false,error:'JSON inválido'})}
  const action=clean(body.action||'').toLowerCase();
  if(action==='signup')return signup(body,conf);
  if(action==='resend_verification')return resendVerification(body,conf);
  if(action==='recovery')return recovery(body,conf);
  if(action==='welcome')return welcome(event,conf);
  return out(400,{ok:false,error:'Acción inválida'});
};
