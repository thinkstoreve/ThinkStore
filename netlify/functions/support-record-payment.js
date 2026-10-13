'use strict';
const {payFromVerifiedSupport}=require('./staff-repairs');
const clean=v=>String(v??'').trim();
const trustedOrigin=origin=>!origin||/^https:\/\/(?:(?:[a-z0-9-]+\.)?thinkstore\.com\.ve|thinkstoreve\.netlify\.app)$/i.test(origin);
const headers=origin=>({'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':trustedOrigin(origin)&&origin?origin:'https://thinkstore.com.ve','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'});
const reply=(statusCode,body,origin)=>({statusCode,headers:headers(origin),body:JSON.stringify(body)});
const validId=id=>/^[0-9]+$/.test(String(id||''))||/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id||''));
const roleAllowed=p=>{
  const r=clean(p?.rol||p?.role).toLowerCase().replace(/[_ -]/g,'');
  if(p?.activo===false||p?.active===false)return false;
  if(['superadmin','admin'].includes(r))return true;
  const permissions=p?.permissions||p?.permisos||{};
  return ['recepcion','reception'].includes(r) && (permissions?.pagos===true||permissions?.payments===true);
};
exports.handler=async event=>{
  const origin=clean(event.headers?.origin||event.headers?.Origin);
  if(!trustedOrigin(origin))return reply(403,{ok:false,error:'Origen no autorizado'},origin);
  if(event.httpMethod==='OPTIONS')return {statusCode:204,headers:headers(origin),body:''};
  if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Método no permitido'},origin);
  const url=clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/$/,'');
  const key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY);
  if(!/^https:\/\/.+\.supabase\.co$/.test(url)||!key)return reply(503,{ok:false,error:'No está configurado Supabase Soporte en el proyecto principal'},origin);
  const token=clean(event.headers?.authorization||event.headers?.Authorization).replace(/^Bearer\s+/i,'');
  if(!token)return reply(401,{ok:false,error:'Inicia sesión en Soporte antes de registrar el abono'},origin);
  let body;
  try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{ok:false,error:'Datos de cobro inválidos'},origin)}
  if(body.action!=='pay'||!validId(body.order_id))return reply(400,{ok:false,error:'Orden o acción no válida'},origin);
  // Never accept actor claims from the browser. Staff validates money, BCV,
  // destination account, stock, receipts and Enterprise using its normal flow.
  try{
    const h={apikey:key,Authorization:'Bearer '+key};
    const auth=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:'Bearer '+token}});
    const user=await auth.json().catch(()=>({}));
    if(!auth.ok||!user?.email)return reply(401,{ok:false,error:'La sesión de Soporte expiró'},origin);
    const prof=await fetch(`${url}/rest/v1/service_users?select=*&email=ilike.${encodeURIComponent(user.email)}&limit=1`,{headers:h});
    if(!prof.ok)throw Error('No se pudieron consultar los permisos de Soporte');
    const profiles=await prof.json();const profile=profiles?.[0];
    if(!roleAllowed(profile))return reply(403,{ok:false,error:'Tu perfil no tiene permiso para cobrar en Soporte'},origin);
    const actor={ok:true,email:user.email,role:'admin',profile:{is_internal:true,active:true,full_name:profile.nombre||user.email}};
    // Reject client-submitted billing or actor fields; allow only Staff's cashier inputs.
    const payment={action:'pay',order_id:body.order_id,method:body.method,amount:body.amount,
      usd_equivalent:body.usd_equivalent,reference:body.reference,note:body.note,
      destination_code:body.destination_code,finalize_no_quote:false};
    const resp=await payFromVerifiedSupport(payment,actor);
    return {...resp,headers:{...(resp.headers||{}),...headers(origin)}};
  }catch(error){console.error('[support-record-payment]',error?.message||error);return reply(503,{ok:false,error:'No se pudo verificar el cobro. Revisa historial y caja antes de intentar de nuevo.'},origin)}
};
