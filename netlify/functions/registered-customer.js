'use strict';
const {authenticateInternal,mainConfig}=require('./staff-auth-core');
const {load}=require('./registered-customer-core');
const H={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
exports.handler=async e=>{
 const origin=e.headers?.origin||'';
 const headers={...H,...(/^https:\/\/(?:[a-z0-9-]+\.)?thinkstore\.com\.ve$/.test(origin)?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{})};
 const out=(s,b)=>({statusCode:s,headers,body:JSON.stringify(b)});
 if(e.httpMethod==='OPTIONS')return out(204,{});
 if(e.httpMethod!=='POST')return out(405,{ok:false});
 try{
  let b;try{b=JSON.parse(e.body||'{}')}catch{return out(400,{ok:false,error:'Solicitud inválida'})}
  let allowed=false;
  if(b.source==='support'){
   const url=String(process.env.SUPPORT_SUPABASE_URL||'').replace(/\/$/,''),key=process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY;
   const bearer=e.headers?.authorization||e.headers?.Authorization||'';
   if(!url||!key||!/^Bearer /i.test(bearer))return out(401,{ok:false,error:'Inicia sesión en Soporte.'});
   const u=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:bearer}});
   if(u.ok){const user=await u.json();const r=await fetch(url+'/rest/v1/service_users?select=rol,activo&email=eq.'+encodeURIComponent(user.email||'')+'&limit=1',{headers:{apikey:key,Authorization:'Bearer '+key}});if(r.ok){const [p]=await r.json();allowed=p?.activo!==false&&['superadmin','admin','reception','sales'].includes(p?.rol);}}
  }else{const a=await authenticateInternal(e);allowed=a.ok&&a.profile?.is_internal===true&&['admin','superadmin','vendedor','gerente','recepcion','soporte'].includes(a.role);}
  if(!allowed)return out(403,{ok:false,error:'No tienes permiso para consultar clientes.'});
  const m=mainConfig();const customer=await load({url:m.url,key:m.service},b.email);
  return out(200,{ok:true,customer});
 }catch(err){return out(409,{ok:false,error:err.message})}
};
