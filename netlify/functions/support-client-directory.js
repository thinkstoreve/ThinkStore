'use strict';

const clean=v=>String(v||'').trim();
const MAIN_FALLBACK='https://clhnndxsgzqnihhtrout.supabase.co';
const SUPPORT_FALLBACK='https://tnezvnziqnjxhcwjtcuy.supabase.co';
const ALLOWED_ROLES=new Set(['superadmin','admin','reception','sales']);
const ALLOWED_ORIGINS=[
  /^https:\/\/(?:[a-z0-9-]+\.)*thinkstore\.com\.ve$/i,
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i
];

function cors(event){
  const origin=clean(event?.headers?.origin||event?.headers?.Origin);
  const allowed=origin&&ALLOWED_ORIGINS.some(rx=>rx.test(origin));
  return{
    'Content-Type':'application/json; charset=utf-8',
    'Access-Control-Allow-Origin':allowed?origin:'https://soporte.thinkstore.com.ve',
    'Access-Control-Allow-Headers':'Content-Type, Authorization',
    'Access-Control-Allow-Methods':'GET, OPTIONS',
    'Vary':'Origin',
    'Cache-Control':'no-store'
  };
}
function out(event,status,body){return{statusCode:status,headers:cors(event),body:JSON.stringify(body)}}
function bearer(event){const h=clean(event?.headers?.authorization||event?.headers?.Authorization);return /^Bearer\s+/i.test(h)?h.replace(/^Bearer\s+/i,'').trim():''}
function cfg(){
  return{
    mainUrl:clean(process.env.MAIN_SUPABASE_URL||process.env.THINKSTORE_SUPABASE_URL||process.env.SUPABASE_URL||MAIN_FALLBACK).replace(/\/+$/,''),
    mainKey:clean(process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY||process.env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY),
    supportUrl:clean(process.env.SUPPORT_SUPABASE_URL||SUPPORT_FALLBACK).replace(/\/+$/,''),
    supportKey:clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY)
  };
}
async function readJson(res){const raw=await res.text();try{return raw?JSON.parse(raw):null}catch{return null}}
async function supportUser(token,c){
  const r=await fetch(`${c.supportUrl}/auth/v1/user`,{headers:{apikey:c.supportKey,Authorization:`Bearer ${token}`}});
  if(!r.ok)return null;
  return await readJson(r);
}
async function supportProfile(email,c){
  const url=`${c.supportUrl}/rest/v1/service_users?select=email,nombre,rol,activo&email=eq.${encodeURIComponent(String(email||'').toLowerCase())}&limit=1`;
  const r=await fetch(url,{headers:{apikey:c.supportKey,Authorization:`Bearer ${c.supportKey}`}});
  if(!r.ok)return null;
  const rows=await readJson(r);return Array.isArray(rows)?rows[0]||null:null;
}
function sanitize(row={}){
  return{
    id:row.id||'',
    nombre:row.nombre||row.name||row.full_name||'',
    correo:row.correo||row.email||'',
    telefono:row.telefono||row.phone||'',
    telefono_alterno:row.telefono_alterno||row.phone_alt||'',
    cedula_rif:row.cedula_rif||row.document||row.cedula||row.rif||'',
    direccion:row.direccion||row.address||'',
    ciudad:row.ciudad||row.city||'',
    estado:row.estado||row.state||'',
    empresa:row.empresa||row.company||row.razon_social||'',
    created_at:row.created_at||'',
    updated_at:row.updated_at||''
  };
}

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:cors(event),body:''};
  if(event.httpMethod!=='GET')return out(event,405,{ok:false,error:'Método no permitido.'});
  const c=cfg(),token=bearer(event);
  if(!token)return out(event,401,{ok:false,error:'Sesión de Soporte requerida.'});
  if(!c.mainKey||!c.supportKey)return out(event,503,{ok:false,error:'La conexión segura de clientes no está configurada.'});
  try{
    const user=await supportUser(token,c);
    if(!user?.email)return out(event,401,{ok:false,error:'Sesión de Soporte inválida o expirada.'});
    const profile=await supportProfile(user.email,c);
    const role=String(profile?.rol||'').toLowerCase();
    if(!profile||profile.activo===false||!ALLOWED_ROLES.has(role))return out(event,403,{ok:false,error:'Tu rol no tiene acceso al directorio de clientes.'});

    const r=await fetch(`${c.mainUrl}/rest/v1/clientes?select=*&order=created_at.desc&limit=1000`,{headers:{apikey:c.mainKey,Authorization:`Bearer ${c.mainKey}`}});
    const rows=await readJson(r);
    if(!r.ok)return out(event,502,{ok:false,error:'No se pudo consultar el CRM principal.'});
    const clients=(Array.isArray(rows)?rows:[]).map(sanitize).filter(x=>x.nombre||x.correo||x.telefono||x.cedula_rif);
    return out(event,200,{ok:true,clients,count:clients.length});
  }catch(error){
    console.error('support-client-directory',error);
    return out(event,500,{ok:false,error:'No se pudo cargar el directorio de clientes.'});
  }
};
