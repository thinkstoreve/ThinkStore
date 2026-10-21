'use strict';

// ThinkStore Soporte: recuperación independiente del proyecto Supabase principal.
// Se despliega en Main (Netlify Functions) y atiende al frontend de soporte.thinkstore.com.ve.
const {emailShell,sendResend}=require('./support-mail-ui');
const SUPPORT_CANONICAL='https://tnezvnziqnjxhcwjtcuy.supabase.co';
const SUPPORT_ORIGIN='https://soporte.thinkstore.com.ve';
const ALLOWED_ROLES=new Set(['superadmin','admin','reception','technician','sales','logistics']);
const GENERIC='Si el correo pertenece a una cuenta activa de Soporte, recibirás un enlace seguro.';
const attempts=new Map(); // Protección complementaria por instancia; activar rate limit en Netlify/WAF en producción.
const clean=v=>String(v??'').trim();
const validEmail=e=>e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const svc=key=>({apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'});
const getHeaders=origin=>({
  'Content-Type':'application/json',
  'Cache-Control':'no-store',
  'Access-Control-Allow-Origin':origin||SUPPORT_ORIGIN,
  'Vary':'Origin',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type'
});
function response(statusCode,body,origin){return{statusCode,headers:getHeaders(origin),body:JSON.stringify(body)}}
function accepted(origin){
  const allowed=[SUPPORT_ORIGIN,'https://thinkstore.com.ve','https://www.thinkstore.com.ve'];
  const extra=clean(process.env.SUPPORT_PUBLIC_URL||process.env.SOPORTE_PUBLIC_URL);
  if(extra){try{const u=new URL(extra);if(u.protocol==='https:')allowed.push(u.origin)}catch(_){}}
  return allowed.includes(origin);
}
function recoveryEmail({email,name,url}){
  const firstname=clean(name).split(/\s+/)[0]||'equipo';
  const body=`<div style="background:#f3f8ff;border:1px solid #d8e9ff;border-radius:18px;padding:17px 20px;color:#232832;font-size:14px;line-height:1.7"><strong>Cuenta de Soporte</strong><br>${escapeHtml(email)}</div><p style="color:#6d7480;font-size:13px;line-height:1.65;margin:20px 0 0">Este enlace es personal y de un solo uso. Si no solicitaste el cambio, ignora este mensaje. ThinkStore nunca te solicitará tu contraseña por correo.</p>`;
  const html=emailShell({preheader:'Recuperación segura de tu acceso a Soporte ThinkStore.',eyebrow:'SEGURIDAD · PERSONAL AUTORIZADO',title:'Restablece tu contraseña',lead:`Hola ${firstname}. Recibimos una solicitud para actualizar la contraseña de tu cuenta de Servicio Técnico.`,body,brandLogoUrl:`${SUPPORT_ORIGIN}/assets/thinkstore-logo-oficial-email.jpg`,ctaLabel:'Crear nueva contraseña',ctaUrl:url,footerNote:'Correo de seguridad de ThinkStore · Servicio Técnico. Si no solicitaste el cambio, no necesitas realizar ninguna acción.'});
  return{subject:'Restablecer contraseña · ThinkStore Soporte',html,text:`Hola ${firstname}.\n\nPara restablecer tu contraseña de Soporte, abre este enlace de un solo uso: ${url}\n\nSi no lo solicitaste, ignora este mensaje.\n\nThinkStore · soporte@thinkstore.com.ve`};
}
function escapeHtml(v){return clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function getProfile(url,key,email){
  const r=await fetch(`${url}/rest/v1/service_users?select=nombre,rol,activo&email=eq.${encodeURIComponent(email)}&limit=1`,{headers:svc(key)});
  if(!r.ok)throw Error(`Perfil Soporte HTTP ${r.status}`);
  const rows=await r.json();return Array.isArray(rows)?rows[0]||null:null;
}
async function getHash(url,key,email){
  const r=await fetch(`${url}/auth/v1/admin/generate_link`,{method:'POST',headers:svc(key),body:JSON.stringify({type:'recovery',email})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(`Generación recovery HTTP ${r.status}`);
  const hash=clean(data.hashed_token||data.properties?.hashed_token);
  if(!hash)throw Error('No se recibió token de recuperación');
  return hash;
}
exports.handler=async event=>{
  const origin=clean(event.headers?.origin||event.headers?.Origin);
  if(origin&&!accepted(origin))return response(403,{ok:false,error:'Origen no autorizado'},SUPPORT_ORIGIN);
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:getHeaders(origin||SUPPORT_ORIGIN),body:''};
  if(event.httpMethod!=='POST')return response(405,{ok:false,error:'Método no permitido'},origin||SUPPORT_ORIGIN);
  const url=clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/+$/,'')||SUPPORT_CANONICAL;
  const key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY);
  const mailKey=clean(process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY);
  if(!key||!mailKey||url!==SUPPORT_CANONICAL){
    console.error('Soporte recovery: faltan credenciales o el proyecto Supabase no coincide');
    return response(503,{ok:false,error:'Servicio de recuperación temporalmente no disponible.'},origin||SUPPORT_ORIGIN);
  }
  let data;try{data=JSON.parse(event.body||'{}')}catch(_){return response(400,{ok:false,error:'Solicitud inválida'},origin||SUPPORT_ORIGIN)}
  const email=clean(data.email).toLowerCase();
  if(!validEmail(email))return response(400,{ok:false,error:'Correo electrónico inválido'},origin||SUPPORT_ORIGIN);
  const now=Date.now();
  // Anti-repetición en la misma instancia: no sustituye los límites del WAF en producción.
  for(const [k,v] of attempts){if(now-v>120000)attempts.delete(k)}
  if(attempts.has(email))return response(200,{ok:true,message:GENERIC},origin||SUPPORT_ORIGIN);
  attempts.set(email,now);
  try{
    const profile=await getProfile(url,key,email);
    if(profile&&profile.activo!==false&&ALLOWED_ROLES.has(clean(profile.rol).toLowerCase())){
      const hash=await getHash(url,key,email);
      // Fragmento #; el token no aparece en la petición HTTP, ni necesita Redirect URLs de Supabase.
      const link=`${SUPPORT_ORIGIN}/panel.html#support_recovery=1&token_hash=${encodeURIComponent(hash)}&type=recovery`;
      const message=recoveryEmail({email,name:profile.nombre||'',url:link});
      await sendResend({to:email,...message});
    }
  }catch(err){console.error('Soporte recovery:',err?.message||err)}
  // Nunca revelar a una persona externa si un correo o rol existe en service_users.
  return response(200,{ok:true,message:GENERIC},origin||SUPPORT_ORIGIN);
};
