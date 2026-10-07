const {authenticateInternal,mainConfig}=require('./staff-auth-core');
const crypto=require('crypto');
const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().replace(/[ -]+/g,'_');
const svc=k=>({apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'});
const out=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
const ADMIN_ROLES=['admin','superadmin','super_admin','administrator','gerente'];
const STATIC_PLATFORM_URLS={inventory:'https://inventory.thinkstore.com.ve/',enterprise:String(process.env.ENTERPRISE_APP_URL||'https://enterprise.thinkstore.ve').replace(/\/+$/,'')};
const ENTERPRISE_FALLBACK_URL=String(process.env.ENTERPRISE_FALLBACK_URL||'https://enterprise.thinkstore.com.ve').replace(/\/+$/,'');
function trustedMainOrigin(event){
  const fallback=clean(process.env.THINKSTORE_MAIN_URL||'https://thinkstore.com.ve').replace(/\/+$/,'');
  const raw=clean(event.headers.origin||event.headers.Origin||event.headers.referer||event.headers.Referer);
  try{
    const u=new URL(raw);
    const h=u.hostname.toLowerCase();
    if(h==='thinkstore.com.ve'||h==='www.thinkstore.com.ve'||h.endsWith('.netlify.app'))return u.origin;
  }catch{}
  return fallback;
}
function platformUrls(event){
  const base=trustedMainOrigin(event);
  return {staff:`${base}/staff/`,support:`${base}/soporte/panel.html`,inventory:STATIC_PLATFORM_URLS.inventory,enterprise:STATIC_PLATFORM_URLS.enterprise,marketing:`${base}/panel.html#marketing`,admin:`${base}/panel.html`};
}
function normalizeRole(v){const r=norm(v);return r==='super_admin'?'superadmin':(r==='administrator'||r==='gerente'?'admin':r)}
function overrides(p){const o=p?.permission_overrides&&typeof p.permission_overrides==='object'?p.permission_overrides:{};return{allow:Array.isArray(o.allow)?o.allow:[],deny:Array.isArray(o.deny)?o.deny:[]}}
function defaultEnabled(role,key){const r=normalizeRole(role);if(['admin','superadmin'].includes(r))return true;if(key==='staff')return r==='vendedor';if(key==='support')return['recepcion','soporte','tecnico','logistica'].includes(r);return false}
function roleFor(p,key){const base=normalizeRole(p?.role||p?.rol),o=overrides(p),hit=o.allow.find(x=>String(x).startsWith(`${key}.role.`));if(hit)return hit.slice(`${key}.role.`.length);if(['admin','superadmin'].includes(base))return key==='support'?'superadmin':key==='inventory'?'admin':key==='enterprise'?'manager':key==='marketing'?'sender':base;if(key==='support')return({recepcion:'reception',soporte:'reception',tecnico:'technician',logistica:'logistics',vendedor:'reception'})[base]||'reception';return key==='inventory'?'viewer':key==='enterprise'?'viewer':key==='marketing'?'viewer':'vendedor'}
function hasPlatform(p,key){const base=normalizeRole(p?.role||p?.rol),o=overrides(p);if(['admin','superadmin'].includes(base))return true;if(o.deny.includes(`platform.${key}`))return false;if(o.allow.includes(`platform.${key}`))return true;return defaultEnabled(base,key)}
function explicitInternal(p,u){if(!p)return false;if(u?.app_metadata?.thinkstore_internal===true||u?.user_metadata?.thinkstore_internal===true)return true;if(p.is_internal===true)return true;if(p.internal_origin||p.internal_invited_at||p.internal_invited_by||p.custom_role_key)return true;if(p.is_internal===false)return false;return ['admin','superadmin'].includes(normalizeRole(p.role||p.rol))}
async function auth(event,url,key){
  const a=await authenticateInternal(event);
  if(!a.ok)return{ok:false,error:a.reason||'Sesión inválida'};
  return{ok:true,user:a.auth_user,profile:a.profile};
}

async function magicLink(base,key,email,redirectTo){
  const r=await fetch(`${base}/auth/v1/admin/generate_link`,{method:'POST',headers:svc(key),body:JSON.stringify({type:'magiclink',email,redirect_to:redirectTo})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d?.action_link)throw new Error(d?.msg||d?.message||'No se pudo crear el acceso seguro');
  try{
    const action=new URL(d.action_link);
    const encoded=action.searchParams.get('redirect_to')||action.searchParams.get('redirectTo');
    if(encoded){
      const wanted=new URL(redirectTo),got=new URL(encoded);
      if(wanted.origin!==got.origin||wanted.pathname!==got.pathname){
        throw new Error('Supabase no autorizó la URL de destino. Revisa Authentication → URL Configuration → Redirect URLs.');
      }
    }
  }catch(e){
    if(/Supabase no autorizó/.test(String(e?.message||'')))throw e;
  }
  return d.action_link;
}

async function probeEnterprise(target){
  try{
    const base=String(target||'').replace(/\/+$/,'')+'/';
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),2200);
    const r=await fetch(new URL('index.html?health='+Date.now(),base),{method:'GET',redirect:'follow',signal:controller.signal,headers:{'user-agent':'ThinkStore-SSO-Health/2.0','cache-control':'no-cache'}}).finally(()=>clearTimeout(timer));
    if(!r.ok)return false;
    const text=await r.text();
    const hasBuild=/thinkstore-enterprise-build|__THINKSTORE_ENTERPRISE_BUILD__/i.test(text);
    const current=/10\.(?:1[4-9]|[2-9]\d)(?:[-.\"'_<]|$)/i.test(text);
    return hasBuild&&current;
  }catch(_){return false}
}
async function chooseEnterpriseTarget(primary,event){
  const local=trustedMainOrigin(event)+'/growth-enterprise/';
  const candidates=[primary,ENTERPRISE_FALLBACK_URL,local].filter((v,i,a)=>v&&a.indexOf(v)===i);
  for(const target of candidates){if(await probeEnterprise(target))return target;}
  // El Main incluye una copia completa de Enterprise; úsala como último recurso.
  return local;
}

async function directSupportOtpUrl(base,key,email,targetUrl){
  // Soporte integrado en Main: usa token hash de un solo uso para evitar depender
  // de Redirect URLs del proyecto Supabase de Soporte.
  const r=await fetch(`${base}/auth/v1/admin/generate_link`,{
    method:'POST',headers:svc(key),body:JSON.stringify({type:'magiclink',email})
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d?.hashed_token)throw new Error(d?.msg||d?.message||'No se pudo crear el acceso seguro de Soporte');
  const u=new URL(targetUrl);
  u.searchParams.set('sso_token_hash',d.hashed_token);
  u.searchParams.set('sso_type',d.verification_type||'magiclink');
  u.searchParams.set('sso_v','1489');
  return u.toString();
}

async function directOtpUrl(base,key,email,targetUrl){
  // SSO Enterprise V14.82: abre el dominio canónico de Enterprise.
  // Genera un token hash de un solo uso; no depende del redirect_to de Supabase.
  const r=await fetch(`${base}/auth/v1/admin/generate_link`,{
    method:'POST',headers:svc(key),body:JSON.stringify({type:'magiclink',email})
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d?.hashed_token)throw new Error(d?.msg||d?.message||'No se pudo crear el acceso seguro de Enterprise');
  const u=new URL(targetUrl);
  u.searchParams.set('sso_token_hash',d.hashed_token);
  u.searchParams.set('sso_type',d.verification_type||'magiclink');
  u.searchParams.set('sso_v','1484');
  return u.toString();
}

function invPerm(role){if(role==='admin')return{products:true,stock:true,units:true,furniture:true,suppliers:true,locations:true,audit:true,users:true,settings:true,write:true};if(role==='editor')return{products:true,stock:true,units:true,furniture:true,suppliers:true,locations:true,audit:false,users:false,settings:false,write:true};return{products:true,stock:true,units:true,furniture:true,suppliers:true,locations:true,audit:false,users:false,settings:false,write:false}}
async function ensureInventory(url,key,a){const role=roleFor(a.profile,'inventory');const invDbRole=ADMIN_ROLES.includes(norm(a.profile.role||a.profile.rol))?'super_admin':(role==='viewer'?'viewer':'admin');const body={user_id:a.user.id,role:invDbRole,active:true,full_name:a.profile.full_name||a.profile.nombre||a.user.email,email:a.user.email,partner:ADMIN_ROLES.includes(norm(a.profile.role||a.profile.rol)),permissions:invPerm(role),updated_at:new Date().toISOString()};const r=await fetch(`${url}/rest/v1/thinkstore_inventory_users?on_conflict=user_id`,{method:'POST',headers:{...svc(key),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});if(!r.ok)throw new Error('No se pudo preparar Inventory')}
async function ensureSupport(a){const url=clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/+$/,'');const key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY);if(!url||!key)throw new Error('Soporte no está configurado para acceso unificado');const role=ADMIN_ROLES.includes(norm(a.profile.role||a.profile.rol))?'superadmin':roleFor(a.profile,'support');const su={email:String(a.user.email||'').toLowerCase(),nombre:a.profile.full_name||a.profile.nombre||a.user.email,rol:['reception','technician','sales','logistics','admin','superadmin'].includes(role)?role:'reception',activo:true};let r=await fetch(`${url}/rest/v1/service_users?on_conflict=email`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(su)});if(!r.ok)throw new Error('No se pudo preparar el perfil de Soporte');const random=crypto.randomBytes(24).toString('base64url');r=await fetch(`${url}/auth/v1/admin/users`,{method:'POST',headers:svc(key),body:JSON.stringify({email:su.email,password:random,email_confirm:true,user_metadata:{full_name:su.nombre,thinkstore_sso:true}})});if(!r.ok){const t=await r.text();if(!/already|registered|exists|duplicate/i.test(t))throw new Error('No se pudo preparar la sesión de Soporte')}return{url,key}}
exports.handler=async event=>{if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:H,body:''};if(event.httpMethod!=='POST')return out(405,{ok:false,error:'Método no permitido'});const cfg=mainConfig();const mainUrl=cfg.url;const mainKey=cfg.service;if(!mainUrl||!mainKey)return out(500,{ok:false,error:'Supabase principal no configurado'});const a=await auth(event,mainUrl,mainKey);if(!a.ok)return out(401,{ok:false,error:a.error});let body={};try{body=JSON.parse(event.body||'{}')}catch{return out(400,{ok:false,error:'JSON inválido'})}const platform=norm(body.platform),PLATFORM_URLS=platformUrls(event);if(!PLATFORM_URLS[platform])return out(400,{ok:false,error:'Plataforma inválida'});if(!hasPlatform(a.profile,platform))return out(403,{ok:false,error:'Tu cuenta no tiene acceso a esta plataforma'});try{let url=PLATFORM_URLS[platform];if(platform==='staff'||platform==='marketing'||platform==='admin')return out(200,{ok:true,platform,url});if(platform==='inventory'){await ensureInventory(mainUrl,mainKey,a);url=await magicLink(mainUrl,mainKey,a.user.email,PLATFORM_URLS.inventory)}else if(platform==='enterprise'){const target=await chooseEnterpriseTarget(PLATFORM_URLS.enterprise,event);url=await directOtpUrl(mainUrl,mainKey,a.user.email,target)}else if(platform==='support'){const s=await ensureSupport(a);url=await directSupportOtpUrl(s.url,s.key,a.user.email,PLATFORM_URLS.support)}return out(200,{ok:true,platform,url})}catch(e){return out(502,{ok:false,error:e.message||'No se pudo abrir la plataforma'})}};
