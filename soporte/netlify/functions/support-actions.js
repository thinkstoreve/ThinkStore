'use strict';
const {statusClientEmail,sendResend}=require('./support-mail-ui');
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'},body:JSON.stringify(body)});
const clean=v=>String(v??'').trim();

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return reply(200,{ok:true});
  if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Método no permitido'});
  const url=clean(process.env.SUPPORT_SUPABASE_URL||process.env.SUPABASE_URL).replace(/\/$/,'');
  const key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!url||!key)return reply(501,{ok:false,error:'Faltan las variables de Supabase de Soporte en Netlify'});
  try{
    const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');
    if(!token)return reply(401,{ok:false,error:'Sesión requerida'});
    const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
    const user=await ur.json().catch(()=>({}));
    if(!ur.ok||!user.email)return reply(401,{ok:false,error:'Sesión inválida'});
    const h={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
    const req=async(path,options={})=>{const r=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...h,...(options.headers||{})}});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw new Error(d?.message||`Error ${r.status}`);return d};
    const profiles=await req(`service_users?select=*&email=ilike.${encodeURIComponent(user.email)}&limit=1`);
    const profile=profiles?.[0];
    if(!profile||profile.activo===false)return reply(403,{ok:false,error:'Usuario de soporte no autorizado'});
    const body=JSON.parse(event.body||'{}');
    if(clean(body.action)!=='notify_client')return reply(400,{ok:false,error:'Acción no válida'});
    const rows=await req(`service_orders?select=*&id=eq.${encodeURIComponent(clean(body.order_id))}&limit=1`);
    const o=rows?.[0];
    if(!o)return reply(404,{ok:false,error:'Orden no encontrada'});
    if(!o.client_email)return reply(400,{ok:false,error:'La orden no tiene correo del cliente'});

    const mail=statusClientEmail(o);
    const ed=await sendResend({to:o.client_email,subject:mail.subject,html:mail.html,text:mail.text});
    await req('service_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:user.email,actor_role:profile.rol,action:'notify_client',entity_type:'service_order',entity_id:String(o.id),after_data:{recipient:o.client_email,provider_id:ed.id||null,status:o.status,quote_status:o.quote_status||null}})});
    return reply(200,{ok:true,email:{sent:true,id:ed.id||null,subject:mail.subject}});
  }catch(error){
    console.error('Support actions',error);
    return reply(500,{ok:false,error:error.message||'Error interno'});
  }
};
