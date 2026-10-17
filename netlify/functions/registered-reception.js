'use strict';
// Reception always resolves identity on the server; client-provided contact fields
// and financial metadata cannot replace the registered customer's data.
const customers=require('./registered-customer');
const {randomUUID}=require('node:crypto');
exports.handler=async e=>{
 let b;try{b=JSON.parse(e.body||'{}')}catch{b={}}
 const verified=await customers.handler({...e,body:JSON.stringify({source:'support',email:b.client_email})});
 if(e.httpMethod==='OPTIONS'||verified.statusCode!==200)return verified;
 const out=(s,data)=>({...verified,statusCode:s,body:JSON.stringify(data)});
 try{
  const c=JSON.parse(verified.body).customer;
  const url=String(process.env.SUPPORT_SUPABASE_URL||'').replace(/\/$/,''),key=process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY;
  const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'};
  const id=String(b.order_id||'');if(id&&!/^(?:\d+|[0-9a-f-]{36})$/i.test(id))return out(400,{ok:false,error:'Orden inválida.'});
  let previous=null;
  if(id){const r=await fetch(url+'/rest/v1/service_orders?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1',{headers});if(!r.ok)throw Error('No se pudo consultar la orden.');previous=(await r.json())[0];if(!previous)return out(404,{ok:false,error:'Orden no encontrada.'});if(previous.updated_at!==b.expected_updated_at)return out(409,{ok:false,error:'La orden cambió. Actualiza antes de guardar la recepción.'});}
  const data={};
  for(const field of ['device_type','device_model','device_color','serial_imei','priority','reported_issue','accessories_received','visual_condition','technical_notes','service_mode'])data[field]=String(b[field]||'').trim().slice(0,4000)||null;
  if(!data.device_model||!data.reported_issue)return out(400,{ok:false,error:'Indica el equipo y la falla reportada.'});
  const checklist=b.reception_checklist&&typeof b.reception_checklist==='object'&&!Array.isArray(b.reception_checklist)?{...b.reception_checklist}:{};
  delete checklist.__financing;
  if(previous?.reception_checklist?.__financing)checklist.__financing=previous.reception_checklist.__financing;
  checklist.__client={...c,registered_id:c.id,address_short:c.address};
  Object.assign(data,{client_name:c.name,client_phone:c.phone,client_email:c.email,reception_checklist:checklist,password_received:b.password_received===true,signatures:b.signatures&&typeof b.signatures==='object'?b.signatures:{}});
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
