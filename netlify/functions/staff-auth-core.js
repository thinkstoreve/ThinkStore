'use strict';

// ThinkStore Main V14.84 · autenticación interna canónica.
// El frontend Staff y estas funciones deben validar SIEMPRE contra el mismo
// proyecto Supabase, aunque Netlify conserve variables antiguas de otro sitio.
const CANONICAL_URL='https://clhnndxsgzqnihhtrout.supabase.co';
const PUBLIC_KEY='sb_publishable_Q7ynhCPp8nMFQywia1LqCQ_6UEAGqRZ';
const INTERNAL=['vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin'];
const clean=v=>String(v??'').trim();
const normRole=v=>{let r=clean(v).toLowerCase().replace(/[ -]+/g,'_');if(r==='super_admin')r='superadmin';if(r==='administrator'||r==='gerente')r='admin';return r||'cliente'};
const svc=k=>({apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'});
const userHeaders=token=>({apikey:PUBLIC_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'});

function mainConfig(){
  return{
    url:CANONICAL_URL,
    publicKey:PUBLIC_KEY,
    service:clean(process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY||process.env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY)
  };
}

async function readRows(url,path,token,service){
  // Primero la sesión real del usuario. Así una service_role vieja no puede
  // invalidar una sesión Auth que sí pertenece al proyecto principal.
  try{
    const r=await fetch(`${url}/rest/v1/${path}`,{headers:userHeaders(token)});
    const d=await r.json().catch(()=>[]);
    if(r.ok&&Array.isArray(d))return d;
  }catch(_){ }
  if(service){
    try{
      const r=await fetch(`${url}/rest/v1/${path}`,{headers:svc(service)});
      const d=await r.json().catch(()=>[]);
      if(r.ok&&Array.isArray(d))return d;
    }catch(_){ }
  }
  return[];
}

function internalFromProfile(p,u){
  if(!p)return false;
  if(u?.app_metadata?.thinkstore_internal===true||u?.user_metadata?.thinkstore_internal===true)return true;
  if(p.is_internal===true)return true;
  if(p.internal_origin||p.internal_invited_at||p.internal_invited_by||p.custom_role_key)return true;
  return INTERNAL.includes(normRole(p.role||p.rol));
}

async function authenticateInternal(event){
  const {url,service}=mainConfig();
  const token=clean(event?.headers?.authorization||event?.headers?.Authorization).replace(/^Bearer\s+/i,'');
  if(!token)return{ok:false,code:'AUTH_MISSING_TOKEN',reason:'La solicitud llegó sin sesión.'};

  let ur,u;
  try{
    ur=await fetch(`${url}/auth/v1/user`,{headers:userHeaders(token)});
    u=await ur.json().catch(()=>({}));
  }catch(e){
    return{ok:false,code:'AUTH_ENDPOINT_UNAVAILABLE',reason:String(e?.message||e||'Auth no disponible')};
  }
  if(!ur.ok||!u?.id)return{ok:false,code:'AUTH_TOKEN_INVALID',reason:String(u?.msg||u?.message||`Auth HTTP ${ur.status}`)};

  const paths=[
    `profiles?select=*&id=eq.${encodeURIComponent(u.id)}&limit=1`,
    `profiles?select=*&user_id=eq.${encodeURIComponent(u.id)}&limit=1`,
    u.email?`profiles?select=*&email=eq.${encodeURIComponent(u.email)}&limit=1`:null,
    u.email?`profiles?select=*&correo=eq.${encodeURIComponent(u.email)}&limit=1`:null
  ].filter(Boolean);
  let profile=null;
  for(const path of paths){const rows=await readRows(url,path,token,service);if(rows[0]){profile=rows[0];break;}}

  // Compatibilidad con el esquema histórico. Se consulta SIEMPRE: si el mismo
  // correo tiene un perfil cliente y además un rol interno activo, prevalece el rol interno.
  let legacy=null;
  if(u.email){
    const rows=await readRows(url,`roles_usuarios?select=*&email=ilike.${encodeURIComponent(u.email)}&limit=1`,token,service);
    legacy=rows[0]||null;
  }

  const legacyRole=normRole(legacy?.rol||legacy?.role);
  const legacyActive=(legacy?.activo??legacy?.active??true)!==false;
  const metadataRole=normRole(u?.app_metadata?.thinkstore_role||u?.user_metadata?.thinkstore_role||u?.app_metadata?.role||u?.user_metadata?.role);
  const metadataInternal=u?.app_metadata?.thinkstore_internal===true||u?.user_metadata?.thinkstore_internal===true;
  const profileRole=normRole(profile?.role||profile?.rol);

  if(profile&&(profile.active??profile.activo??true)===false&&!legacyActive){
    return{ok:false,code:'AUTH_PROFILE_INACTIVE',reason:'La cuenta interna está desactivada.'};
  }

  let role='cliente',internal=false;
  if(legacy&&legacyActive&&INTERNAL.includes(legacyRole)){role=legacyRole;internal=true;}
  else if(profile&&internalFromProfile(profile,u)&&INTERNAL.includes(profileRole)){role=profileRole;internal=true;}
  else if(metadataInternal&&INTERNAL.includes(metadataRole)){role=metadataRole;internal=true;}
  else if(profile&&INTERNAL.includes(profileRole)){role=profileRole;internal=true;}

  if(!internal){
    return{ok:false,code:'AUTH_INTERNAL_NOT_FOUND',reason:'La sesión existe, pero no se encontró un rol interno activo para este correo.'};
  }

  const merged={
    ...(profile||{}),
    id:u.id,
    user_id:u.id,
    email:u.email||profile?.email||profile?.correo||'',
    role,
    active:true,
    is_internal:true,
    full_name:profile?.full_name||profile?.nombre||legacy?.full_name||legacy?.nombre||u?.user_metadata?.full_name||u?.user_metadata?.name||u.email
  };
  return{ok:true,user_id:u.id,email:u.email||merged.email||'',role,profile:merged,auth_user:u,token,url,service};
}

module.exports={CANONICAL_URL,PUBLIC_KEY,INTERNAL,normRole,mainConfig,authenticateInternal,userHeaders,svc};
