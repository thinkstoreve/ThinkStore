const H={
  'Content-Type':'application/json',
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization,content-type',
  'Access-Control-Allow-Methods':'GET,OPTIONS',
  'Cache-Control':'no-store'
};
const DEFAULT_PERMS={
  cliente:['cuenta','mis_pedidos','mis_reparaciones','garantias','puntos'],
  vendedor:['dashboard','ventas','cotizaciones','clientes','pagos','preordenes','crm','recomendaciones','staff.access'],
  recepcion:['dashboard','recepcion','clientes','tickets','garantias','citas'],
  soporte:['dashboard','recepcion','clientes','tickets','garantias','citas'],
  tecnico:['dashboard','tecnico','diagnostico','repuestos','pruebas','garantias'],
  logistica:['dashboard','logistica','guias','entregas','pedidos','preordenes'],
  admin:['*'],superadmin:['*']
};
const INTERNAL=['vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin'];
const ROLE_LABELS={vendedor:'Vendedor',recepcion:'Recepción / Soporte',soporte:'Soporte',tecnico:'Técnico',logistica:'Logística',admin:'Administrador',superadmin:'Socio Administrador'};
const DEFAULT_CATEGORIES=[
  {name:'iPhone',sort_order:10,active:true},{name:'iPad',sort_order:20,active:true},{name:'Mac',sort_order:30,active:true},
  {name:'MacBook',sort_order:40,active:true},{name:'iMac',sort_order:50,active:true},{name:'Accesorios Apple',sort_order:60,active:true},
  {name:'Audio',sort_order:70,active:true},{name:'Apple Watch',sort_order:80,active:true},{name:'Otro',sort_order:999,active:true}
];
const clean=(v,max=400)=>String(v??'').trim().slice(0,max);
const normRole=v=>{let r=clean(v).toLowerCase().replace(/[ -]+/g,'_');if(r==='super_admin')r='superadmin';if(r==='administrator'||r==='gerente')r='admin';return r||'cliente'};
const cleanPerms=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>clean(x,100)).filter(Boolean))].slice(0,200);
const cleanOverrides=v=>{const o=v&&typeof v==='object'?v:{};return{allow:cleanPerms(o.allow),deny:cleanPerms(o.deny)}};
const isInternalProfile=(p,u=null)=>{
  if(!p)return false;
  const metaInternal=u?.app_metadata?.thinkstore_internal===true||u?.user_metadata?.thinkstore_internal===true;
  if(metaInternal)return true;
  if(p.is_internal===true)return true;
  if(p.internal_origin||p.internal_invited_at||p.internal_invited_by||p.custom_role_key)return true;
  const role=normRole(p.role||p.rol);
  const ov=cleanOverrides(p.permission_overrides);
  if(ov.allow.includes('staff.access')||ov.allow.includes('platform.staff'))return true;
  if(['admin','superadmin'].includes(role))return true;
  if(p.is_internal===false)return false;
  // Compatibilidad con perfiles internos creados antes de existir is_internal.
  return INTERNAL.includes(role);
};
const svc=k=>({apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'});
const out=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});

exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:H,body:''};
  if(event.httpMethod!=='GET')return out(405,{ok:false,error:'Método no permitido'});
  const url=clean(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL).replace(/\/$/,'');
  const service=clean(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY);
  if(!url||!service)return out(500,{ok:false,error:'Supabase no está configurado'});
  const auth=await authenticate(event,url,service);
  if(!auth.ok)return out(401,{ok:false,error:'Inicia sesión con una cuenta interna de ThinkStore'});
  if(!isInternalProfile(auth.profile,auth.auth_user))return out(403,{ok:false,error:'Esta cuenta pertenece a un cliente. ThinkStore Staff es exclusivo para personal interno autorizado.'});
  if(!INTERNAL.includes(auth.role)&&!auth.profile?.custom_role_key)return out(403,{ok:false,error:'Esta app es exclusiva para el equipo interno de ThinkStore'});
  const access=await effectiveAccess(auth.profile,url,service);
  const canOpenStaff=access.permissions.includes('*')||access.permissions.includes('staff.access');
  if(!canOpenStaff)return out(403,{ok:false,error:'Tu cuenta interna no tiene habilitado el acceso a App Ventas. Pide a un Administrador que lo active en Equipo y accesos.'});
  const canSell=access.permissions.includes('*')||access.permissions.includes('ventas');
  const action=clean(event.queryStringParameters?.action||'bootstrap').toLowerCase();
  if(action==='me')return out(200,{ok:true,user:userPayload(auth,access),can_sell:canSell});
  if(action==='scan'){if(!canSell)return out(403,{ok:false,error:'Tu rol no tiene permiso de ventas'});const code=clean(event.queryStringParameters?.code||'',160);if(!code)return out(400,{ok:false,error:'Código requerido'});try{const found=await lookupBarcode(code,url,service);return found?out(200,{ok:true,code,...found}):out(404,{ok:false,error:`No encontré el código ${code}`})}catch(error){console.error('staff-pos scan',error);return out(500,{ok:false,error:error?.message||'No se pudo consultar el código'})}}
  if(action!=='bootstrap')return out(400,{ok:false,error:'Acción no soportada'});

  try{
    const [catalogBundle,salesBundle]=await Promise.all([
      canSell?loadCatalog(url,service):Promise.resolve({variants:[],catalog_products:[],catalog_images:[],catalog_categories:DEFAULT_CATEGORIES}),
      canSell?loadSales(url,service,auth,access):Promise.resolve({recent:[],metrics:{today_sales:0,today_total:0,pending:0,attribution_ready:true}})
    ]);
    return out(200,{
    ok:true,
    user:userPayload(auth,access),
    can_sell:canSell,
    ...catalogBundle,
    recent_sales:salesBundle.recent,
    metrics:salesBundle.metrics,
    generated_at:new Date().toISOString()
    });
  }catch(error){
    console.error('staff-pos',error);
    return out(500,{ok:false,error:error?.message||'No se pudo cargar ThinkStore Staff'});
  }
};

async function authenticate(event,url,service){
  const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');
  if(!token)return{ok:false};
  const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});
  const u=await ur.json().catch(()=>({}));
  if(!ur.ok||!u?.id)return{ok:false};
  const paths=[
    `profiles?select=*&id=eq.${encodeURIComponent(u.id)}&limit=1`,
    u.email?`profiles?select=*&email=eq.${encodeURIComponent(u.email)}&limit=1`:null,
    u.email?`profiles?select=*&correo=eq.${encodeURIComponent(u.email)}&limit=1`:null
  ].filter(Boolean);
  let p=null;
  for(const path of paths){
    const pr=await fetch(`${url}/rest/v1/${path}`,{headers:svc(service)});if(!pr.ok)continue;const rows=await pr.json().catch(()=>[]);if(rows?.[0]){p=rows[0];break;}
  }
  if(!p||(p.active??p.activo??true)===false)return{ok:false};
  return{ok:true,user_id:u.id,email:u.email||p.email||p.correo||'',role:normRole(p.role||p.rol),profile:p,auth_user:u};
}

async function effectiveAccess(profile,url,service){
  const base=normRole(profile?.role||profile?.rol),over=cleanOverrides(profile?.permission_overrides);
  let permissions=[...(DEFAULT_PERMS[base]||[])],roleName=ROLE_LABELS[base]||base,customKey=profile?.custom_role_key||null;
  if(customKey){
    const rr=await fetch(`${url}/rest/v1/ts_roles?select=*&role_key=eq.${encodeURIComponent(customKey)}&active=eq.true&limit=1`,{headers:svc(service)});
    const rows=await rr.json().catch(()=>[]),r=rows?.[0];
    if(r){permissions=cleanPerms(r.permissions);roleName=r.name||roleName;}
  }
  if(!permissions.includes('*'))permissions=[...new Set([...permissions,...over.allow])].filter(x=>!over.deny.includes(x));
  return{base_role:base,role_name:roleName,custom_role_key:customKey,permissions,permission_overrides:over};
}

function userPayload(auth,access){
  const p=auth.profile||{};
  return{
    id:auth.user_id,
    name:p.full_name||p.nombre||p.name||auth.auth_user?.user_metadata?.full_name||auth.email.split('@')[0]||'Usuario',
    email:auth.email,
    role:access.base_role,
    role_name:access.role_name,
    custom_role_key:access.custom_role_key,
    permissions:access.permissions,
    avatar_url:p.avatar_url||p.photo_url||p.foto_url||''
  };
}

async function restRows(url,service,table,params={}){
  const u=new URL(`${url}/rest/v1/${table}`);for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null)u.searchParams.set(k,String(v));
  const rr=await fetch(u,{headers:svc(service)});const data=await rr.json().catch(()=>[]);if(!rr.ok)return[];return Array.isArray(data)?data:[];
}
async function jsonExact(url,service,table,field,code){return (await restRows(url,service,table,{select:'id,data',workspace_key:'eq.main',[`data->>${field}`]:`ilike.${code}`,limit:1}))[0]||null}
async function linkedVariant(url,service,productId,productData={}){
  const hinted=clean(productData?.sync_variant_id||'');
  if(hinted){const row=(await restRows(url,service,'inventory_variants',{select:'*',id:`eq.${hinted}`,active:'eq.true',limit:1}))[0];if(row)return{...row,available:Math.max(0,Number(row.stock_on_hand||0)-Number(row.stock_reserved||0))}}
  const link=(await restRows(url,service,'thinkstore_inventory_bridge',{select:'variant_id,sku',workspace_key:'eq.main',inventory_product_id:`eq.${productId}`,limit:1}))[0];
  if(link?.variant_id){const row=(await restRows(url,service,'inventory_variants',{select:'*',id:`eq.${link.variant_id}`,active:'eq.true',limit:1}))[0];if(row)return{...row,available:Math.max(0,Number(row.stock_on_hand||0)-Number(row.stock_reserved||0))}}
  const sku=clean(productData?.sku||link?.sku||'');if(sku){const row=(await restRows(url,service,'inventory_variants',{select:'*',sku:`ilike.${sku}`,active:'eq.true',limit:1}))[0];if(row)return{...row,available:Math.max(0,Number(row.stock_on_hand||0)-Number(row.stock_reserved||0))}}
  return null;
}
async function lookupBarcode(code,url,service){
  const normalized=clean(code,160);
  // 1) Etiqueta/unidad de Inventory Central: TSU, serial o IMEI.
  let unit=null;
  for(const field of ['barcode_value','serial_number','imei','imei_2']){unit=await jsonExact(url,service,'thinkstore_inventory_units',field,normalized);if(unit)break}
  if(unit){
    const d=unit.data||{},productId=clean(d.product_id||'');let product=null,variant=null;
    if(productId){product=(await restRows(url,service,'thinkstore_inventory_products',{select:'id,data',workspace_key:'eq.main',id:`eq.${productId}`,limit:1}))[0]||null;variant=await linkedVariant(url,service,productId,product?.data||{})}
    return{kind:'unit',unit:{id:unit.id,barcode_value:d.barcode_value||'',serial_number:d.serial_number||'',imei:d.imei||'',imei_2:d.imei_2||'',status:d.status||'',location:d.location||'',general_condition:d.general_condition||'',battery_health_pct:d.battery_health_pct??null},product:product?.data||null,variant};
  }
  // 2) Unidad de inventario comercial por serial / IMEI.
  for(const [field,val] of [['serial_number',normalized],['imei',normalized]]){
    const rows=await restRows(url,service,'inventory_units',{select:'*',[field]:`ilike.${val}`,limit:1});if(rows[0]){const u=rows[0],vr=(await restRows(url,service,'inventory_variants',{select:'*',id:`eq.${u.variant_id}`,active:'eq.true',limit:1}))[0]||null;return{kind:'unit',unit:{id:u.id,barcode_value:'',serial_number:u.serial_number||'',imei:u.imei||'',status:u.status||'',general_condition:u.general_condition||'',battery_health_pct:u.battery_health_pct??null},product:null,variant:vr?{...vr,available:Math.max(0,Number(vr.stock_on_hand||0)-Number(vr.stock_reserved||0))}:null}}
  }
  // 3) Etiqueta de producto de Inventory Central: TSP, código original o SKU.
  let product=null;
  for(const field of ['product_barcode','source_barcode','sku']){product=await jsonExact(url,service,'thinkstore_inventory_products',field,normalized);if(product)break}
  if(product){const d=product.data||{};return{kind:'product',product:d,variant:await linkedVariant(url,service,product.id,d)}}
  // 4) SKU comercial directo.
  const vr=(await restRows(url,service,'inventory_variants',{select:'*',sku:`ilike.${normalized}`,active:'eq.true',limit:1}))[0]||null;
  if(vr)return{kind:'product',product:null,variant:{...vr,available:Math.max(0,Number(vr.stock_on_hand||0)-Number(vr.stock_reserved||0))}};
  return null;
}

async function loadCatalog(url,service){
  const sh=svc(service);
  const base='id,sku,product_name,model,color,capacity,condition,chip,ram,stock_on_hand,stock_reserved,stock_sold,stock_min,price_usd,active';
  let vr=await fetch(`${url}/rest/v1/inventory_variants?select=${base},cosmetic_grade,battery_health_pct,cosmetic_note&active=eq.true&order=product_name.asc`,{headers:sh});
  let variants=await vr.json().catch(()=>[]);
  if(!vr.ok){
    vr=await fetch(`${url}/rest/v1/inventory_variants?select=${base}&active=eq.true&order=product_name.asc`,{headers:sh});
    variants=await vr.json().catch(()=>[]);
  }
  if(!vr.ok)throw new Error(variants?.message||'No se pudo cargar el inventario');
  let catalog=[],images=[],categories=DEFAULT_CATEGORIES;
  try{
    const [cr,ir,catr]=await Promise.all([
      fetch(`${url}/rest/v1/catalog_products?select=*&order=sort_order.asc,product_name.asc`,{headers:sh}),
      fetch(`${url}/rest/v1/catalog_product_images?select=*&order=product_key.asc,sort_order.asc`,{headers:sh}),
      fetch(`${url}/rest/v1/catalog_categories?select=*&order=sort_order.asc,name.asc`,{headers:sh})
    ]);
    if(cr.ok)catalog=await cr.json().catch(()=>[]);
    if(ir.ok)images=await ir.json().catch(()=>[]);
    if(catr.ok){const rows=await catr.json().catch(()=>[]);if(Array.isArray(rows)&&rows.length)categories=rows;}
  }catch(_){ }
  return{
    variants:(Array.isArray(variants)?variants:[]).map(v=>({...v,available:Math.max(0,Number(v.stock_on_hand||0)-Number(v.stock_reserved||0))})),
    catalog_products:Array.isArray(catalog)?catalog:[],catalog_images:Array.isArray(images)?images:[],catalog_categories:Array.isArray(categories)?categories:DEFAULT_CATEGORIES
  };
}

async function loadSales(url,service,auth,access){
  const sh=svc(service),isManager=['admin','superadmin'].includes(access.base_role)||access.permissions.includes('*');
  const today=new Date();today.setHours(0,0,0,0);const from=today.toISOString();
  const filter=isManager?'':`&salesperson_user_id=eq.${encodeURIComponent(auth.user_id)}`;
  const select='id,codigo,estado,total_usd,metodo_pago,created_at,guest_name,guest_email,order_channel,salesperson_user_id,salesperson_email,salesperson_name,pos_source';
  let recent=[],todayRows=[];
  let migrated=true;
  try{
    const [rr,tr]=await Promise.all([
      fetch(`${url}/rest/v1/pedidos?select=${select}&order_channel=eq.presencial${filter}&order=created_at.desc&limit=25`,{headers:sh}),
      fetch(`${url}/rest/v1/pedidos?select=${select}&order_channel=eq.presencial${filter}&created_at=gte.${encodeURIComponent(from)}&order=created_at.desc&limit=250`,{headers:sh})
    ]);
    if(!rr.ok||!tr.ok)throw new Error('staff sale fields unavailable');
    recent=await rr.json().catch(()=>[]);todayRows=await tr.json().catch(()=>[]);
  }catch(_){
    migrated=false;
    // Sin las columnas de atribución no mostramos ventas de otros empleados a un vendedor.
    if(isManager){
      const fallback='id,codigo,estado,total_usd,metodo_pago,created_at,guest_name,guest_email,order_channel';
      const rr=await fetch(`${url}/rest/v1/pedidos?select=${fallback}&order_channel=eq.presencial&order=created_at.desc&limit=25`,{headers:sh});
      if(rr.ok)recent=await rr.json().catch(()=>[]);
      const tr=await fetch(`${url}/rest/v1/pedidos?select=${fallback}&order_channel=eq.presencial&created_at=gte.${encodeURIComponent(from)}&order=created_at.desc&limit=250`,{headers:sh});
      if(tr.ok)todayRows=await tr.json().catch(()=>[]);
    }
  }
  const rows=Array.isArray(todayRows)?todayRows:[];
  const cancelled=s=>/cancel|rechaz/i.test(String(s||''));
  const active=rows.filter(x=>!cancelled(x.estado));
  return{
    recent:Array.isArray(recent)?recent:[],
    metrics:{
      today_sales:active.length,
      today_total:Math.round(active.reduce((n,x)=>n+Number(x.total_usd||0),0)*100)/100,
      pending:rows.filter(x=>/pago por verificar|pago recibido/i.test(String(x.estado||''))).length,
      attribution_ready:migrated
    }
  };
}
