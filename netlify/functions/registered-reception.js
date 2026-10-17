'use strict';
// Reception authorizes staff on the server. Customer contact details may originate
// from a web appointment, prior service order or in-person intake.
const {createCipheriv,createHash,randomBytes}=require('node:crypto');
const {randomUUID}=require('node:crypto');
exports.handler=async e=>{
 let b;try{b=JSON.parse(e.body||'{}')}catch{b={}}
 const H={'Content-Type':'application/json','Cache-Control':'no-store'};
 const out=(s,data)=>({statusCode:s,headers:H,body:JSON.stringify(data)});
 if(e.httpMethod==='OPTIONS')return out(204,{});
 if(e.httpMethod!=='POST')return out(405,{ok:false,error:'Método no permitido.'});
 try{
  const url=String(process.env.SUPPORT_SUPABASE_URL||'').replace(/\/$/,''),key=process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY;
  const bearer=e.headers?.authorization||e.headers?.Authorization||'';
  if(!url||!key||!/^Bearer /i.test(bearer))return out(401,{ok:false,error:'Inicia sesión en Soporte.'});
  const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:bearer}});
  if(!auth.ok)return out(401,{ok:false,error:'Sesión inválida.'});
  const user=await auth.json();
  const staff=await fetch(url+'/rest/v1/service_users?select=rol,activo&email=eq.'+encodeURIComponent(user.email||'')+'&limit=1',{headers:{apikey:key,Authorization:'Bearer '+key}});
  if(!staff.ok)return out(403,{ok:false,error:'No se pudieron verificar permisos de Soporte.'});
  const [profile]=await staff.json();
  if(!profile||profile.activo===false||!['superadmin','admin','reception','sales'].includes(profile.rol))return out(403,{ok:false,error:'No tienes permiso para registrar ingresos.'});
  const c={name:String(b.client_name||'').trim().slice(0,200),phone:String(b.client_phone||'').trim().slice(0,60),email:String(b.client_email||'').trim().slice(0,254)||null};
  if(!c.name||!c.phone)return out(400,{ok:false,error:'Indica nombre y teléfono del cliente.'});
  const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'};
  const id=String(b.order_id||'');if(id&&!/^(?:\d+|[0-9a-f-]{36})$/i.test(id))return out(400,{ok:false,error:'Orden inválida.'});
  let previous=null;
  if(id){const r=await fetch(url+'/rest/v1/service_orders?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1',{headers});if(!r.ok)throw Error('No se pudo consultar la orden.');previous=(await r.json())[0];if(!previous)return out(404,{ok:false,error:'Orden no encontrada.'});if(previous.updated_at!==b.expected_updated_at)return out(409,{ok:false,error:'La orden cambió. Actualiza antes de guardar la recepción.'});}
  const data={};
  for(const field of ['device_type','device_model','device_color','serial_imei','priority','reported_issue','accessories_received','visual_condition','technical_notes','service_mode'])data[field]=String(b[field]||'').trim().slice(0,4000)||null;
  if(!data.device_model||!data.reported_issue)return out(400,{ok:false,error:'Indica el equipo y la falla reportada.'});
  const checklist=b.reception_checklist&&typeof b.reception_checklist==='object'&&!Array.isArray(b.reception_checklist)?{...b.reception_checklist}:{};
  delete checklist.__financing;
  delete checklist.__device_access_sealed;
  if(previous?.reception_checklist?.__financing)checklist.__financing=previous.reception_checklist.__financing;
  // No crear perfiles web ni exponer la clave en el seguimiento público.
  const clientMeta=checklist.__client&&typeof checklist.__client==='object'?checklist.__client:{};
  checklist.__client={...clientMeta,name:c.name,phone:c.phone,email:c.email};
  const secret=process.env.SUPPORT_DEVICE_ACCESS_SECRET||key;
  const pin=String(b.device_access_code||'');
  if(pin){
   if(pin.length>128)return out(400,{ok:false,error:'Clave demasiado larga.'});
   const iv=randomBytes(12),k=createHash('sha256').update('thinkstore-support-device-access-v1:'+secret).digest();
   const cipher=createCipheriv('aes-256-gcm',k,iv),encrypted=Buffer.concat([cipher.update(pin,'utf8'),cipher.final()]);
   checklist.__device_access_sealed={v:1,iv:iv.toString('base64'),data:encrypted.toString('base64'),tag:cipher.getAuthTag().toString('base64')};
  }else if(previous?.reception_checklist?.__device_access_sealed){checklist.__device_access_sealed=previous.reception_checklist.__device_access_sealed;}
  Object.assign(data,{client_name:c.name,client_phone:c.phone,client_email:c.email,reception_checklist:checklist,password_received:b.password_received===true||Boolean(checklist.__device_access_sealed),signatures:b.signatures&&typeof b.signatures==='object'?b.signatures:{}});
  if(!id){
   // La numeración se reserva atómicamente en Supabase; nunca se acepta desde el navegador.
   // Ante falta de migración, detener la recepción en vez de usar códigos aleatorios.
   const seq=await fetch(url+'/rest/v1/rpc/next_service_order_code',{
    method:'POST',headers,body:'{}'
   });
   if(!seq.ok)return out(503,{ok:false,error:'Numeración de órdenes no disponible. Ejecuta la migración de folios V15.37.4 en Supabase Soporte y vuelve a intentar. No se creó ninguna orden.'});
   const assignedCode=await seq.json();
   if(typeof assignedCode!=='string'||!/^TS-SVC-\d{4}-\d{4,}$/.test(assignedCode))
    return out(503,{ok:false,error:'Supabase no devolvió un número de orden válido. No se creó ninguna orden.'});
   Object.assign(data,{code:assignedCode,status:'Recibido',quote_status:'Pendiente',public_token:randomUUID()});
  }
  const suffix=id?'?id=eq.'+encodeURIComponent(id)+'&updated_at=eq.'+encodeURIComponent(previous.updated_at):'';
  const r=await fetch(url+'/rest/v1/service_orders'+suffix,{method:id?'PATCH':'POST',headers,body:JSON.stringify(data)});
  if(!r.ok)throw Error('No se pudo guardar la recepción. No se ha confirmado el registro.');
  const saved=(await r.json())[0];if(!saved)return out(409,{ok:false,error:'La orden cambió. Actualiza y vuelve a intentar.'});
  return out(200,{ok:true,order:saved});
 }catch(err){return out(409,{ok:false,error:err.message})}
};
