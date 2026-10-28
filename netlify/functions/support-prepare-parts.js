'use strict';
// Inventory Workshop and Support share service_parts. Never copy costs from the separate store-products table.
const clean=v=>String(v??'').trim();
const validId=v=>/^[0-9]+$/.test(String(v))||/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(v));
const allowedOrigin=v=>!v||/^https:\/\/(?:(?:[a-z0-9-]+\.)?thinkstore\.com\.ve|thinkstoreve\.netlify\.app)$/i.test(v);
function costOf(data){
 const v=data?.unit_cost;
 if(v===null||v===undefined||v==='')throw Error('Falta el costo unitario del repuesto. Guárdalo en Inventory antes de prepararlo.');
 const n=Number(v);if(typeof v==='boolean'||!Number.isFinite(n)||n<0)throw Error('Costo unitario inválido. Guarda un importe numérico válido en Inventory.');
 return Math.round(n*100)/100;
}
exports.costOf=costOf;
exports.handler=async event=>{
 const origin=clean(event.headers?.origin||event.headers?.Origin);
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':allowedOrigin(origin)&&origin?origin:'https://thinkstore.com.ve','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const out=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
 if(!allowedOrigin(origin))return out(403,{ok:false,error:'Origen no autorizado'});
 if(event.httpMethod==='OPTIONS')return out(204,{});
 if(event.httpMethod!=='POST')return out(405,{ok:false,error:'Método no permitido'});
 const base=clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/$/,''),key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY);
 const token=clean(event.headers?.authorization||event.headers?.Authorization).replace(/^Bearer\s+/i,'');
 if(!token)return out(401,{ok:false,error:'Inicia sesión en Soporte.'});
 if(!base||!key)return out(503,{ok:false,error:'Falta configurar la conexión de servidor de Soporte en Netlify.'});
 let b;try{b=JSON.parse(event.body||'{}')}catch{return out(400,{ok:false,error:'Solicitud inválida'});}
 if(!validId(b.order_id)||!Array.isArray(b.parts)||b.parts.length>100||b.parts.some(p=>!validId(p.part_id)||!Number.isInteger(p.quantity)||p.quantity<=0)||new Set(b.parts.map(p=>String(p.part_id))).size!==b.parts.length)return out(400,{ok:false,error:'Orden o lista de repuestos inválida'});
 async function call(url,secret,path,options={},access=secret){
  const res=await fetch(url+path,{...options,signal:AbortSignal.timeout(15000),headers:{apikey:secret,Authorization:'Bearer '+access,'Content-Type':'application/json',...(options.headers||{})}});
  const data=await res.json().catch(()=>null);if(!res.ok)throw Error(data?.message||data?.error||'No se pudo consultar la conexión de inventario');return data;
 }
 try{
  const user=await call(base,key,'/auth/v1/user',{},token);
  if(!user?.email)return out(401,{ok:false,error:'Sesión inválida'});
  const [profile]=await call(base,key,'/rest/v1/service_users?select=*&email=ilike.'+encodeURIComponent(user.email)+'&limit=1');
  const role=clean(profile?.rol||profile?.role).toLowerCase().replace(/[_ -]/g,'');
  if(!profile||profile.activo===false||profile.active===false||!['admin','superadmin','reception','recepcion','technician','tecnico','sales'].includes(role))return out(403,{ok:false,error:'Sin permiso para preparar repuestos'});
  const [order]=await call(base,key,'/rest/v1/service_orders?select=id,code,assigned_technician_email,payment_status,inventory_consumed&id=eq.'+encodeURIComponent(b.order_id)+'&limit=1');
  if(!order)return out(404,{ok:false,error:'Orden no encontrada'});
  if(['technician','tecnico'].includes(role)&&clean(order.assigned_technician_email).toLowerCase()!==user.email.toLowerCase())return out(403,{ok:false,error:'La reparación no está asignada a este técnico'});
  if(order.inventory_consumed||/^(pagado|cobrado|paid)$/i.test(clean(order.payment_status)))return out(409,{ok:false,error:'La orden ya fue cobrada; no se pueden cambiar sus repuestos'});
  for(const item of b.parts){
   const [part]=await call(base,key,'/rest/v1/service_parts?select=id,sku,unit_cost,sale_price&active=eq.true&id=eq.'+encodeURIComponent(item.part_id)+'&limit=1');
   if(!part)throw Error('El repuesto ya no está activo o no existe. Actualiza la lista.');
   costOf(part);
   if(part.sale_price===null||part.sale_price===undefined||!Number.isFinite(Number(part.sale_price))||Number(part.sale_price)<0)throw Error('Falta un precio válido del repuesto. Guárdalo en Inventory antes de prepararlo.');
  }
  // The existing atomic reservation RPC locks rows and snapshots their actual cost.
  // No catalog updates, extra purchases, cash entries or SKU-based duplicates.
  const result=await call(base,key,'/rest/v1/rpc/ts_save_service_order_parts',{method:'POST',body:JSON.stringify({p_order_code:order.code,p_parts:b.parts,p_actor_email:user.email})},token);
  if(result?.ok===false)throw Error(result.error||'No se pudieron reservar los repuestos');
  return out(200,{ok:true,order_code:order.code,reserved_lines:b.parts.length});
 }catch(error){return out(409,{ok:false,error:error.message||'No se pudieron preparar los repuestos'});}
};
