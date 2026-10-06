// ThinkStore Inventory V3.2.26 - Cloudflare Pages workshop + full technical catalog
// Self-contained to avoid Pages bundling/import issues with CommonJS shared modules.
// Shared server implementation for main Admin, Inventory and Support. No client-supplied roles.
const clean=v=>String(v??'').trim();
const EXPECTED_SUPPORT_URL='https://tnezvnziqnjxhcwjtcuy.supabase.co';
const EXPECTED_SUPPORT_REF='tnezvnziqnjxhcwjtcuy';
const normalizeSupabaseUrl=v=>{
  let u=clean(v).replace(/\/+$/,'');
  u=u.replace(/\/rest\/v1(?:\/.*)?$/i,'');
  return u.replace(/\/+$/,'');
};
const projectRef=v=>{
  try{
    const h=new URL(normalizeSupabaseUrl(v)).hostname;
    return h.endsWith('.supabase.co')?h.slice(0,-'.supabase.co'.length):h;
  }catch{return '';}
};
const uuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||''));
const orderId=v=>uuid(v)||(typeof v==='number'?Number.isSafeInteger(v)&&v>0:typeof v==='string'&&/^[1-9][0-9]*$/.test(v)&&BigInt(v)<=9223372036854775807n);
const money=v=>v!==null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0&&Math.abs(Number(v)*100-Math.round(Number(v)*100))<1e-7;
const reply=(status,body)=>({status,body});
const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const DEVICE_ORDER=['iPhone','Mac','iPad','Apple Watch','AirPods','Audio','General','Otro'];
const deviceRank=v=>{const i=DEVICE_ORDER.indexOf(String(v||''));return i===-1?999:i;};
const qualityRank=v=>{const order=['Estándar','Original','AAA','OEM','Premium','Reacondicionado','Servicio'];const i=order.indexOf(String(v||''));return i===-1?999:i;};
const sortCatalogItems=(a,b)=>deviceRank(a.device_category)-deviceRank(b.device_category)||String(a.repair||'').localeCompare(String(b.repair||''),'es',{numeric:true,sensitivity:'base'})||qualityRank(a.quality)-qualityRank(b.quality)||String(a.model||a.compatibility||'').localeCompare(String(b.model||b.compatibility||''),'es',{numeric:true,sensitivity:'base'})||String(a.name||'').localeCompare(String(b.name||''),'es',{numeric:true,sensitivity:'base'});
const discountMeta=(price,m={})=>{const pct=Math.max(0,Math.min(95,Math.round(Number(m.discount_percent||0)||0)));const finalPrice=price===null?null:Number(price);let original=Number(m.original_price_usd||0)||0;if(pct>0&&finalPrice!==null&&original<=finalPrice)original=Math.round((finalPrice/(1-pct/100))*100)/100;if(pct<=0)original=0;return {discount_percent:pct,original_price_usd:original,compare_price_usd:original,discount_badge:pct>0?`-${pct}%`:null};};
async function handle({method,headers={},body={},action},env,source){
 if(!['GET','POST'].includes(method))return reply(405,{ok:false,error:'Método no permitido'});
 const configuredSupportUrl=normalizeSupabaseUrl(env.SUPPORT_SUPABASE_URL||(source==='support'?env.SUPABASE_URL:''));
 const configuredSupportRef=projectRef(configuredSupportUrl);
 const url=(configuredSupportRef===EXPECTED_SUPPORT_REF)?configuredSupportUrl:EXPECTED_SUPPORT_URL;
 const key=clean(env.SUPPORT_SUPABASE_SECRET_KEY||env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||(source==='support'?(env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY):''));
 if(!key){return reply(501,{ok:false,error:'Falta configurar SUPPORT_SUPABASE_SECRET_KEY (o SUPPORT_SUPABASE_SERVICE_ROLE_KEY) en producción.'});}
 const isJwtKey=v=>/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(clean(v));
 const request=async(base,secret,path,options={})=>{const serverHeaders={apikey:secret,'Content-Type':'application/json'};if(isJwtKey(secret))serverHeaders.Authorization=`Bearer ${secret}`;const r=await fetch(`${base}${path}`,{...options,headers:{...serverHeaders,...options.headers}});const data=await r.json().catch(()=>null);if(!r.ok){const detail=data?.message||data?.msg||data?.error_description||data?.error||`HTTP ${r.status}`;const err=new Error(detail);err.status=r.status;err.path=path;throw err}return data;};
 const rest=(path,options)=>request(url,key,'/rest/v1/'+path,options);
 const all=async path=>{let rows=[];for(let offset=0;offset<100000;offset+=1000){const batch=await rest(path+`${path.includes('?')?'&':'?'}limit=1000&offset=${offset}`);if(!Array.isArray(batch))throw Error('Respuesta de datos inválida');rows.push(...batch);if(batch.length<1000)return rows;}throw Error('Demasiados registros para esta consulta; acota el período.');};
 try{
  if(source==='public'){
   if(method!=='GET')return reply(405,{ok:false,error:'Solo lectura'});
   const rows=await all('service_parts?select=id,sku,name,category,compatible_models,quantity,sale_price,catalog_details&active=eq.true&published=eq.true&order=category.asc,name.asc,sku.asc');
   const items=rows.map(p=>{const m=p.catalog_details||{},discount=discountMeta(p.sale_price,m);return {id:p.id,sku:p.sku,name:p.name,device_category:p.category||'Otro',model:m.model||p.compatible_models||'',series:m.series||'',model_type:m.model_type||'',color:m.color||'',repair:m.repair||'',quality:m.quality||'',price_usd:p.sale_price,available:p.quantity,catalog_only:p.sale_price===null,compatibility:p.compatible_models||'',image_url:m.image_url||'',description:m.description||'',warranty:m.warranty||'',repair_time:m.repair_time||'',service_modes:m.service_modes||['Normal'],inventory_group:m.inventory_group||'',item_type:m.item_type||'part',...discount};}).sort(sortCatalogItems);
   return reply(200,{ok:true,source:'support_service_parts',items});
  }
  const auth=headers.authorization||headers.Authorization||'';
  if(!/^Bearer\s+\S+$/i.test(auth))return reply(401,{ok:false,error:'Inicia sesión para continuar.'});
  const identityUrl=source==='support'?url:normalizeSupabaseUrl(env.THINKSTORE_SUPABASE_URL||env.SUPABASE_URL);
  const identityServiceKey=source==='support'?key:clean(env.THINKSTORE_SUPABASE_SECRET_KEY||env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY);
  const identityPublicKey=source==='support'
    ? clean(env.SUPPORT_SUPABASE_PUBLISHABLE_KEY||env.SUPPORT_SUPABASE_ANON_KEY||'')
    : clean(env.THINKSTORE_SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY||'');
  if(!identityUrl||!identityServiceKey)return reply(501,{ok:false,error:'Falta configurar el proyecto de autenticación de esta aplicación.'});

  // Valida la sesión con publishable/anon + Bearer del usuario.
  // La clave privada queda reservada para consultas de servidor.
  const authApiKey=identityPublicKey||identityServiceKey;
  let user;
  try{
    user=await request(identityUrl,authApiKey,'/auth/v1/user',{headers:{Authorization:auth}});
  }catch(err){
    return reply(401,{ok:false,error:'Sesión inválida o vencida.',detail:err?.message||''});
  }
  if(!user?.id||!user?.email)return reply(401,{ok:false,error:'Sesión inválida.'});
  const profilePath=source==='support'?`service_users?email=eq.${encodeURIComponent(user.email.toLowerCase())}`:source==='inventory'?`thinkstore_inventory_users?user_id=eq.${encodeURIComponent(user.id)}`:`profiles?id=eq.${encodeURIComponent(user.id)}`;
  const profiles=await request(identityUrl,identityServiceKey,'/rest/v1/'+profilePath+'&select=*&limit=1');const p=profiles?.[0];
  if(!p||p.active===false||p.activo===false)return reply(403,{ok:false,error:'Cuenta no autorizada.'});
  const role=p.rol||p.role,admin=['admin','superadmin','super_admin','administrator','gerente'].includes(role);
  const allowedModule=module=>admin||(!Array.isArray(p.permissions)||p.permissions.includes(module));
  const partAccess=source==='support'?['reception','technician','sales'].includes(role)&&allowedModule('parts'):source==='inventory'&&p.permissions?.stock===true;
  const financeAccess=source==='support'&&['reception','sales'].includes(role)&&allowedModule('finance');
  action=method==='GET'?(action||'parts'):body.action;

  if(action==='diagnostics'){
    let serviceParts={ok:false,status:null,message:null};
    try{
      const probe=await rest('service_parts?select=id&limit=1');
      serviceParts={ok:true,status:200,message:Array.isArray(probe)?'service_parts disponible':'respuesta inesperada'};
    }catch(err){
      serviceParts={ok:false,status:err?.status||null,message:err?.message||'Error'};
    }
    return reply(200,{
      ok:true,
      backend_version:'3.2.26',
      expected_support_project_ref:EXPECTED_SUPPORT_REF,
      configured_support_project_ref:configuredSupportRef||null,
      effective_support_project_ref:projectRef(url)||null,
      pinned_to_expected_project:projectRef(url)===EXPECTED_SUPPORT_REF,
      support_key_configured:Boolean(key),
      service_parts:serviceParts
    });
  }
  const partAction=['parts','save_part','stock'].includes(action);
  if(!admin&&!(partAction?(partAccess||(action==='parts'&&financeAccess)):financeAccess))return reply(403,{ok:false,error:'Tu rol no permite esta operación.'});
  if(source==='inventory'&&!partAction)return reply(403,{ok:false,error:'Esta pestaña solo gestiona repuestos técnicos.'});
  if(action==='parts'){const parts=await all('service_parts?select=*&active=eq.true&order=category.asc,name.asc,sku.asc');return reply(200,{ok:true,backend_version:'3.2.26',parts,meta:{active:parts.length,published:parts.filter(p=>p.published===true).length,with_stock:parts.filter(p=>Number(p.quantity)>0).length,with_price:parts.filter(p=>p.sale_price!==null).length}});}
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
   const discount=Math.max(0,Math.min(95,Math.round(Number(m.discount_percent||0)||0)));
   const row={id:v.id,sku:clean(v.sku).slice(0,100),name:clean(v.name).slice(0,240),category:clean(v.category).slice(0,80),compatible_models:clean(v.compatible_models).slice(0,400),minimum_stock:Number(v.minimum_stock),unit_cost:v.unit_cost===null?null:Number(v.unit_cost),sale_price:v.sale_price===null?null:Number(v.sale_price),location:clean(v.location).slice(0,120),active:v.active!==false,published:v.published===true,catalog_details:{model:clean(m.model).slice(0,120),series:clean(m.series).slice(0,120),model_type:clean(m.model_type).slice(0,80),color:clean(m.color).slice(0,80),repair:clean(m.repair).slice(0,120),quality:clean(m.quality).slice(0,80),image_url:clean(m.image_url).slice(0,1500),description:clean(m.description).slice(0,2000),warranty:clean(m.warranty).slice(0,300),repair_time:clean(m.repair_time).slice(0,200),original_price_usd:m.original_price_usd===null||m.original_price_usd===''?null:Number(m.original_price_usd||0),discount_percent:discount,item_type:clean(m.item_type||'part').slice(0,20),inventory_group:clean(m.inventory_group).slice(0,120),service_group:clean(m.service_group).slice(0,120),stock_managed:m.stock_managed!==false,service_modes:['Normal','Delivery','Priority']}};
   const exists=await rest(`service_parts?id=eq.${v.id}&select=id`);
   await rest(exists?.length?`service_parts?id=eq.${v.id}`:'service_parts',{method:exists?.length?'PATCH':'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(row)});
   await rest('service_audit_log',{method:'POST',body:JSON.stringify({actor_email:actor,action:'workshop_save_part',entity_type:'service_part',entity_id:v.id,after_data:row})});
   return reply(200,{ok:true});
  }
  if(action==='stock'){
   if(!uuid(body.id)||!uuid(body.request_id)||!Number.isInteger(body.delta)||body.delta===0||!clean(body.note))return reply(400,{ok:false,error:'Indica repuesto, cantidad entera y motivo.'});
   const target=await rest(`service_parts?id=eq.${body.id}&select=id,name,catalog_details&limit=1`);
   if(target?.[0]?.catalog_details?.item_type==='service'||target?.[0]?.catalog_details?.stock_managed===false)return reply(400,{ok:false,error:'Los servicios no manejan movimientos de stock.'});
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
 }catch(error){
  const safePath=error?.path?String(error.path).split('?')[0]:'';
  const where=safePath?` [${safePath}]`:'';
  if(Number(error?.status)===404 && /service_parts/i.test(safePath)){
    return reply(400,{
      ok:false,
      error:'No se completó la operación: HTTP 404'+where,
      hint:'Inventory está fijado al proyecto ThinkStore-Soporte correcto. Si persiste el 404, revisa únicamente la clave privada SUPPORT_SUPABASE_*.',
      support_project_ref:projectRef(url),
      expected_support_project_ref:EXPECTED_SUPPORT_REF
    });
  }
  return reply(400,{ok:false,error:'No se completó la operación: '+error.message+where});
}
}


export async function onRequest({request,env}){
  let body={};
  if(request.method==='POST'){
    try{body=await request.json();}
    catch{return new Response(JSON.stringify({ok:false,error:'JSON inválido'}),{status:400,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
  }
  const result=await handle({
    method:request.method,
    headers:Object.fromEntries(request.headers),
    body,
    action:new URL(request.url).searchParams.get('action')
  },env,'inventory');
  return new Response(JSON.stringify(result.body),{status:result.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store, no-cache, must-revalidate','X-ThinkStore-Inventory-Version':'3.2.26'}});
}
