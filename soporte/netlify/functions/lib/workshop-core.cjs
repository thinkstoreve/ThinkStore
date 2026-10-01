// Shared server implementation for main Admin, Inventory and Support. No client-supplied roles.
const clean=v=>String(v??'').trim();
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''));
const orderId=v=>uuid(v)||(typeof v==='number'?Number.isSafeInteger(v)&&v>0:typeof v==='string'&&/^[1-9][0-9]*$/.test(v)&&BigInt(v)<=9223372036854775807n);
const money=v=>v!==null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0&&Math.abs(Number(v)*100-Math.round(Number(v)*100))<1e-7;
const reply=(status,body)=>({status,body});
async function handle({method,headers={},body={},action},env,source){
 if(!['GET','POST'].includes(method))return reply(405,{ok:false,error:'Método no permitido'});
 const url=clean(env.SUPPORT_SUPABASE_URL||(source==='support'?env.SUPABASE_URL:'')).replace(/\/$/,'');
 const key=clean(env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||(source==='support'?env.SUPABASE_SERVICE_ROLE_KEY:''));
 if(!url||!key)return reply(501,{ok:false,error:'Configura el proyecto Supabase de Soporte: SUPPORT_SUPABASE_URL y SUPPORT_SUPABASE_SERVICE_ROLE_KEY.'});
 const request=async(base,secret,path,options={})=>{const r=await fetch(`${base}${path}`,{...options,headers:{apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':'application/json',...options.headers}});const data=await r.json().catch(()=>null);if(!r.ok)throw Error(data?.message||data?.msg||`Error ${r.status}`);return data;};
 const rest=(path,options)=>request(url,key,'/rest/v1/'+path,options);
 const all=async path=>{let rows=[];for(let offset=0;offset<100000;offset+=1000){const batch=await rest(path+`${path.includes('?')?'&':'?'}limit=1000&offset=${offset}`);if(!Array.isArray(batch))throw Error('Respuesta de datos inválida');rows.push(...batch);if(batch.length<1000)return rows;}throw Error('Demasiados registros para esta consulta; acota el período.');};
 try{
  if(source==='public'){
   if(method!=='GET')return reply(405,{ok:false,error:'Solo lectura'});
   const rows=await all('service_parts?select=id,sku,name,category,compatible_models,quantity,sale_price,catalog_details&active=eq.true&published=eq.true&order=sku.asc');
   return reply(200,{ok:true,source:'support_service_parts',items:rows.map(p=>{const m=p.catalog_details||{};return {id:p.id,sku:p.sku,name:p.name,device_category:p.category||'Otro',model:m.model||p.compatible_models||'',series:m.series||'',model_type:m.model_type||'',repair:m.repair||'',quality:m.quality||'',price_usd:p.sale_price,available:p.quantity,catalog_only:p.sale_price===null,compatibility:p.compatible_models||'',image_url:m.image_url||'',description:m.description||'',warranty:m.warranty||'',repair_time:m.repair_time||'',service_modes:m.service_modes||['Normal']};})});
  }
  const auth=headers.authorization||headers.Authorization||'';
  if(!/^Bearer\s+\S+$/i.test(auth))return reply(401,{ok:false,error:'Inicia sesión para continuar.'});
  const identityUrl=source==='support'?url:clean(env.THINKSTORE_SUPABASE_URL||env.SUPABASE_URL).replace(/\/$/,'');
  const identityKey=source==='support'?key:clean(env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SERVICE_ROLE_KEY);
  if(!identityUrl||!identityKey)return reply(501,{ok:false,error:'Falta configurar el proyecto de autenticación de esta aplicación.'});
  let user;try{user=await request(identityUrl,identityKey,'/auth/v1/user',{headers:{Authorization:auth}});}catch{return reply(401,{ok:false,error:'Sesión inválida o vencida.'});}
  if(!user?.id||!user?.email)return reply(401,{ok:false,error:'Sesión inválida.'});
  const profilePath=source==='support'?`service_users?email=eq.${encodeURIComponent(user.email.toLowerCase())}`:source==='inventory'?`thinkstore_inventory_users?user_id=eq.${encodeURIComponent(user.id)}`:`profiles?id=eq.${encodeURIComponent(user.id)}`;
  const profiles=await request(identityUrl,identityKey,'/rest/v1/'+profilePath+'&select=*&limit=1');const p=profiles?.[0];
  if(!p||p.active===false||p.activo===false)return reply(403,{ok:false,error:'Cuenta no autorizada.'});
  const role=p.rol||p.role,admin=['admin','superadmin','super_admin','administrator','gerente'].includes(role);
  const allowedModule=module=>admin||(!Array.isArray(p.permissions)||p.permissions.includes(module));
  const partAccess=source==='support'?['reception','technician','sales'].includes(role)&&allowedModule('parts'):source==='inventory'&&p.permissions?.stock===true;
  const financeAccess=source==='support'&&['reception','sales'].includes(role)&&allowedModule('finance');
  action=method==='GET'?(action||'parts'):body.action;
  const partAction=['parts','save_part','stock'].includes(action);
  if(!admin&&!(partAction?(partAccess||(action==='parts'&&financeAccess)):financeAccess))return reply(403,{ok:false,error:'Tu rol no permite esta operación.'});
  if(source==='inventory'&&!partAction)return reply(403,{ok:false,error:'Esta pestaña solo gestiona repuestos técnicos.'});
  if(action==='parts')return reply(200,{ok:true,parts:await all('service_parts?select=*&order=sku.asc')});
  if(action==='finance'){
   const [quotes,lines,payments]=await Promise.all([all('service_workshop_quotes?select=*&order=quoted_at.desc,id.asc'),all('service_workshop_lines?select=*&order=id.asc'),all('service_workshop_payments?select=*&order=paid_at.desc,id.asc')]);
   const activeOrderIds=new Set(quotes.filter(q=>q.state!=='cancelled').map(q=>q.order_id));const old=await all('service_orders?select=id,code,client_name,quote_amount,quote_currency&order=id.asc');
   return reply(200,{ok:true,quotes,lines,payments,orders:old.map(o=>({id:o.id,code:o.code,client:o.client_name})),legacy_quotes:old.filter(o=>Number(o.quote_amount)>0&&!activeOrderIds.has(o.id)),can_report:admin});
  }
  if(method!=='POST')return reply(405,{ok:false,error:'Usa POST para guardar.'});
  const actor=user.email.toLowerCase();
  if(action==='save_part'){
   const v=body.part||{};if(!clean(v.sku)||!clean(v.name)||!uuid(v.id)||!Number.isInteger(Number(v.minimum_stock))||Number(v.minimum_stock)<0|| (v.unit_cost!==null&&!money(v.unit_cost))||(v.sale_price!==null&&!money(v.sale_price)))return reply(400,{ok:false,error:'Revisa SKU, nombre, mínimo, costo y precio.'});
   const m=v.catalog_details||{};if(m.image_url&&!/^https:\/\//i.test(m.image_url))return reply(400,{ok:false,error:'La imagen debe ser una URL HTTPS.'});
   const row={id:v.id,sku:clean(v.sku).slice(0,100),name:clean(v.name).slice(0,240),category:clean(v.category).slice(0,80),compatible_models:clean(v.compatible_models).slice(0,400),minimum_stock:Number(v.minimum_stock),unit_cost:v.unit_cost===null?null:Number(v.unit_cost),sale_price:v.sale_price===null?null:Number(v.sale_price),location:clean(v.location).slice(0,120),active:v.active!==false,published:v.published===true,catalog_details:{model:clean(m.model).slice(0,120),series:clean(m.series).slice(0,120),model_type:clean(m.model_type).slice(0,80),repair:clean(m.repair).slice(0,120),quality:clean(m.quality).slice(0,80),image_url:clean(m.image_url).slice(0,1500),description:clean(m.description).slice(0,2000),warranty:clean(m.warranty).slice(0,300),repair_time:clean(m.repair_time).slice(0,200),service_modes:['Normal','Delivery','Priority']}};
   const exists=await rest(`service_parts?id=eq.${v.id}&select=id`);
   await rest(exists?.length?`service_parts?id=eq.${v.id}`:'service_parts',{method:exists?.length?'PATCH':'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(row)});
   await rest('service_audit_log',{method:'POST',body:JSON.stringify({actor_email:actor,action:'workshop_save_part',entity_type:'service_part',entity_id:v.id,after_data:row})});
   return reply(200,{ok:true});
  }
  if(action==='stock'){
   if(!uuid(body.id)||!uuid(body.request_id)||!Number.isInteger(body.delta)||body.delta===0||!clean(body.note))return reply(400,{ok:false,error:'Indica repuesto, cantidad entera y motivo.'});
   const balance=await rest('rpc/workshop_adjust_stock',{method:'POST',body:JSON.stringify({p_request_id:body.request_id,p_id:body.id,p_delta:body.delta,p_note:clean(body.note),p_actor:actor})});return reply(200,{ok:true,balance});
  }
  if(action==='quote'){
   if(!uuid(body.id)||(body.order_id&&!orderId(body.order_id))||!Array.isArray(body.lines)||!body.lines.length||body.lines.some(l=>!['labor','part','service'].includes(l.kind)||!Number.isInteger(l.quantity)||l.quantity<=0||!money(l.unit_price)||!money(l.unit_cost)||(l.kind==='part'&&!uuid(l.part_id))))return reply(400,{ok:false,error:'Datos de cotización inválidos.'});
   const id=await rest('rpc/workshop_create_quote',{method:'POST',body:JSON.stringify({p_id:body.id,p_order_id:body.order_id||null,p_client:clean(body.client),p_lines:body.lines,p_actor:actor})});return reply(200,{ok:true,id});
  }
  if(action==='payment'){
   if(!uuid(body.id)||!uuid(body.quote_id)||!money(body.amount)||Number(body.amount)<=0)return reply(400,{ok:false,error:'Cobro inválido.'});
   const id=await rest('rpc/workshop_payment',{method:'POST',body:JSON.stringify({p_id:body.id,p_quote_id:body.quote_id,p_amount:body.amount,p_paid_at:body.paid_at,p_method:clean(body.method),p_reference:clean(body.reference),p_currency:body.currency,p_original:body.original_amount,p_rate:body.rate,p_actor:actor})});return reply(200,{ok:true,id});
  }
  if(action==='cancel_quote'){
   if(!admin)return reply(403,{ok:false,error:'Solo administración puede anular cotizaciones.'});
   if(!uuid(body.id))return reply(400,{ok:false,error:'Cotización inválida.'});
   await rest('rpc/workshop_cancel_quote',{method:'POST',body:JSON.stringify({p_id:body.id,p_actor:actor})});return reply(200,{ok:true});
  }
  return reply(400,{ok:false,error:'Acción no válida.'});
 }catch(error){return reply(400,{ok:false,error:'No se completó la operación: '+error.message});}
}
module.exports={handle};
