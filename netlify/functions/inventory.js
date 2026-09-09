const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const DEFAULT_CATEGORIES=[
  {name:'iPhone',description:'iPhone y sus variantes.',sort_order:10,active:true},
  {name:'iPad',description:'iPad y accesorios específicos.',sort_order:20,active:true},
  {name:'Mac',description:'Equipos Mac de escritorio y portátiles.',sort_order:30,active:true},
  {name:'MacBook',description:'MacBook Air, MacBook Pro y portátiles Apple.',sort_order:40,active:true},
  {name:'iMac',description:'Equipos iMac y configuraciones disponibles.',sort_order:50,active:true},
  {name:'Accesorios Apple',description:'Cables, cargadores, cases, vidrios y otros.',sort_order:60,active:true},
  {name:'Audio',description:'AirPods, audífonos y productos de audio.',sort_order:70,active:true},
  {name:'Otro',description:'Productos que no pertenecen a las categorías anteriores.',sort_order:999,active:true}
];
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return {statusCode:200,headers:H,body:''};
  const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const service=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  if(!url||!service)return r(501,{ok:false,error:'Faltan variables de Supabase'});
  const sh={apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'};
  if(event.httpMethod==='GET'){
    const q=event.queryStringParameters||{};
    const sku=q.sku?`&sku=eq.${encodeURIComponent(q.sku)}`:'';
    const rr=await fetch(`${url}/rest/v1/inventory_variants?select=id,sku,product_name,model,color,capacity,condition,chip,ram,stock_on_hand,stock_reserved,stock_sold,stock_min,price_usd,active&active=eq.true${sku}&order=product_name.asc`,{headers:sh});
    const rows=await rr.json().catch(()=>[]);
    if(!rr.ok){const detail=String(rows?.message||rows?.details||rows?.hint||'').slice(0,240);return r(rr.status,{ok:false,error:'No se pudo consultar inventario'+(detail?': '+detail:'')});}
    let catalog=[],catalogImages=[],catalogCategories=DEFAULT_CATEGORIES.map((x,i)=>({id:`default-${i}`,...x,is_default:true}));
    try{
      const cr=await fetch(`${url}/rest/v1/catalog_products?select=id,product_key,product_name,category,description,image_url,published,sort_order,created_at,updated_at&order=sort_order.asc,product_name.asc`,{headers:sh});
      if(cr.ok)catalog=await cr.json().catch(()=>[]);
      const ir=await fetch(`${url}/rest/v1/catalog_product_images?select=id,product_key,image_url,storage_path,sort_order,is_primary,created_at&order=product_key.asc,sort_order.asc`,{headers:sh});
      if(ir.ok)catalogImages=await ir.json().catch(()=>[]);
      const catr=await fetch(`${url}/rest/v1/catalog_categories?select=id,name,description,sort_order,active,created_at,updated_at&order=sort_order.asc,name.asc`,{headers:sh});
      if(catr.ok){
        const loaded=await catr.json().catch(()=>[]);
        if(Array.isArray(loaded)&&loaded.length)catalogCategories=loaded;
      }
    }catch(_e){}
    return r(200,{ok:true,variants:rows.map(v=>({...v,available:Math.max(0,Number(v.stock_on_hand||0)-Number(v.stock_reserved||0)),low_stock:Math.max(0,Number(v.stock_on_hand||0)-Number(v.stock_reserved||0))<=Number(v.stock_min||0)})),catalog_products:catalog,catalog_images:catalogImages,catalog_categories:catalogCategories});
  }
  if(event.httpMethod!=='POST')return r(405,{ok:false,error:'Método no permitido'});
  const auth=await authorizeAdmin(event,url,service);
  if(!auth.ok)return r(401,{ok:false,error:'Acceso administrador no autorizado'});
  let body={}; try{body=JSON.parse(event.body||'{}')}catch{return r(400,{ok:false,error:'JSON inválido'})}

  if(body.action==='adjust'){
    const id=body.variant_id,qty=Number(body.quantity||0);
    if(!id||!Number.isFinite(qty)||qty===0)return r(400,{ok:false,error:'Ajuste inválido'});
    const fr=await fetch(`${url}/rest/v1/inventory_variants?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,{headers:sh});
    const rows=await fr.json().catch(()=>[]),v=rows[0];
    if(!v)return r(404,{ok:false,error:'Variante no encontrada'});
    const next=Math.max(0,Number(v.stock_on_hand||0)+qty);
    if(next<Number(v.stock_reserved||0))return r(409,{ok:false,error:'El ajuste dejaría el stock por debajo de lo reservado'});
    const ur=await fetch(`${url}/rest/v1/inventory_variants?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{...sh,Prefer:'return=representation'},body:JSON.stringify({stock_on_hand:next})});
    const updated=await ur.json().catch(()=>[]);
    if(!ur.ok)return r(ur.status,{ok:false,error:'No se pudo ajustar inventario',details:updated});
    await fetch(`${url}/rest/v1/inventory_movements`,{method:'POST',headers:sh,body:JSON.stringify({variant_id:id,movement_type:'adjustment',quantity:qty,note:String(body.note||'Ajuste administrativo'),actor_user_id:auth.user_id||null,actor_email:auth.email||null,metadata:{sku:v.sku,product_name:v.product_name,before_stock:Number(v.stock_on_hand||0),after_stock:next}})});
    try{await fetch(`${url}/rest/v1/admin_audit_log`,{method:'POST',headers:sh,body:JSON.stringify({actor_email:auth.email||null,action:'inventory_adjusted',entity_type:'inventory_variant',entity_id:String(id),before_data:{stock_on_hand:Number(v.stock_on_hand||0)},after_data:{stock_on_hand:next,quantity:qty,sku:v.sku,product_name:v.product_name}})})}catch(_){}
    return r(200,{ok:true,variant:updated[0]||null});
  }

  if(body.action==='set'){
    const id=String(body.variant_id||'').trim();
    if(!id)return r(400,{ok:false,error:'Variante requerida'});
    const fr=await fetch(`${url}/rest/v1/inventory_variants?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,{headers:sh});
    const rows=await fr.json().catch(()=>[]),v=rows[0];
    if(!v)return r(404,{ok:false,error:'Variante no encontrada'});
    const patch={};
    if(body.stock_on_hand!==undefined&&body.stock_on_hand!==null){const n=Number(body.stock_on_hand);if(!Number.isInteger(n)||n<0)return r(400,{ok:false,error:'Stock físico inválido'});if(n<Number(v.stock_reserved||0))return r(409,{ok:false,error:'Stock físico menor que el stock reservado'});patch.stock_on_hand=n;}
    if(body.stock_min!==undefined&&body.stock_min!==null){const n=Number(body.stock_min);if(!Number.isInteger(n)||n<0)return r(400,{ok:false,error:'Stock mínimo inválido'});patch.stock_min=n;}
    if(body.price_usd!==undefined&&body.price_usd!==null){const n=Number(body.price_usd);if(!Number.isFinite(n)||n<0)return r(400,{ok:false,error:'Precio inválido'});patch.price_usd=Math.round(n*100)/100;}
    if(!Object.keys(patch).length)return r(400,{ok:false,error:'No hay cambios para guardar'});
    const ur=await fetch(`${url}/rest/v1/inventory_variants?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{...sh,Prefer:'return=representation'},body:JSON.stringify(patch)});
    const updated=await ur.json().catch(()=>[]);if(!ur.ok)return r(ur.status,{ok:false,error:'No se pudo actualizar',details:updated});
    const after=updated[0]||{...v,...patch};
    if(patch.stock_on_hand!==undefined&&Number(patch.stock_on_hand)!==Number(v.stock_on_hand||0)){
      const delta=Number(patch.stock_on_hand)-Number(v.stock_on_hand||0);
      try{await fetch(`${url}/rest/v1/inventory_movements`,{method:'POST',headers:sh,body:JSON.stringify({variant_id:id,movement_type:'manual_set',quantity:delta,note:String(body.note||'Edición manual de inventario'),actor_user_id:auth.user_id||null,actor_email:auth.email||null,metadata:{sku:v.sku,product_name:v.product_name,before_stock:Number(v.stock_on_hand||0),after_stock:Number(patch.stock_on_hand)}})})}catch(_){}
    }
    try{await fetch(`${url}/rest/v1/admin_audit_log`,{method:'POST',headers:sh,body:JSON.stringify({actor_email:auth.email||null,action:'inventory_variant_updated',entity_type:'inventory_variant',entity_id:String(id),before_data:{stock_on_hand:v.stock_on_hand,stock_min:v.stock_min,price_usd:v.price_usd,sku:v.sku,product_name:v.product_name},after_data:{stock_on_hand:after.stock_on_hand,stock_min:after.stock_min,price_usd:after.price_usd,sku:v.sku,product_name:v.product_name}})})}catch(_){}
    return r(200,{ok:true,variant:after});
  }

  if(body.action==='preview_import'){
    const incoming=normalizeRows(body.rows);
    if(!incoming.length)return r(400,{ok:false,error:'El Excel no contiene filas válidas'});
    const rr=await fetch(`${url}/rest/v1/inventory_variants?select=id,sku,product_name,stock_on_hand,stock_reserved,stock_min,price_usd&order=product_name.asc`,{headers:sh});
    const existing=await rr.json().catch(()=>[]);if(!rr.ok)return r(rr.status,{ok:false,error:'No se pudo validar inventario'});
    const map=new Map(existing.map(v=>[String(v.sku||'').toLowerCase(),v]));
    const preview=[];let creates=0,updates=0,unchanged=0,errors=0;
    for(const row of incoming){
      const old=map.get(row.sku.toLowerCase());
      if(row.stock_on_hand!=null&&row.stock_on_hand<0){errors++;preview.push({...row,status:'error',error:'Stock negativo'});continue}
      if(old&&row.stock_on_hand!=null&&row.stock_on_hand<Number(old.stock_reserved||0)){errors++;preview.push({...row,status:'error',error:`Stock ${row.stock_on_hand} menor que reservado ${old.stock_reserved||0}`});continue}
      if(!old){creates++;preview.push({...row,status:'crear',old_stock:null,old_price:null});continue}
      const changed=(row.stock_on_hand!=null&&row.stock_on_hand!==Number(old.stock_on_hand||0))||(row.stock_min!=null&&row.stock_min!==Number(old.stock_min||0))||(row.price_usd!=null&&Number(row.price_usd)!==Number(old.price_usd||0));
      if(changed){updates++;preview.push({...row,status:'actualizar',old_stock:Number(old.stock_on_hand||0),old_price:old.price_usd==null?null:Number(old.price_usd)});}else{unchanged++;}
    }
    return r(200,{ok:true,summary:{rows:incoming.length,creates,updates,unchanged,errors},preview:preview.slice(0,200)});
  }

  if(body.action==='save_catalog_product'){
    const product_name=String(body.product_name||'').trim();
    const product_key=slug(body.product_key||product_name);
    const category=String(body.category||'').trim();
    const description=String(body.description||'').trim()||null;
    const image_url=String(body.image_url||'').trim()||null;
    const published=body.published===true;
    const sort_order=Number.isFinite(Number(body.sort_order))?Math.trunc(Number(body.sort_order)):1000;
    if(!product_name||!product_key)return r(400,{ok:false,error:'Producto requerido'});
    if(!category)return r(400,{ok:false,error:'Categoría requerida'});
    if(category.length>80)return r(400,{ok:false,error:'Categoría demasiado larga'});
    if(published&&!image_url)return r(409,{ok:false,error:'Sube una imagen correcta antes de publicar el producto'});
    const payload={product_key,product_name,category,description,image_url,published,sort_order,updated_at:new Date().toISOString()};
    const ur=await fetch(`${url}/rest/v1/catalog_products?on_conflict=product_key`,{method:'POST',headers:{...sh,Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
    const out=await ur.json().catch(()=>[]);
    if(!ur.ok)return r(ur.status,{ok:false,error:'No se pudo guardar la publicación',details:out});
    return r(200,{ok:true,catalog_product:out[0]||payload});
  }


  if(body.action==='save_category'){
    const name=String(body.name||'').trim(),original=String(body.original_name||'').trim(),description=String(body.description||'').trim()||null;
    const sort_order=Number.isFinite(Number(body.sort_order))?Math.trunc(Number(body.sort_order)):1000;
    const active=body.active!==false;
    if(!name)return r(400,{ok:false,error:'Nombre de categoría requerido'});
    if(name.length>80)return r(400,{ok:false,error:'Nombre de categoría demasiado largo'});
    const payload={name,description,sort_order,active,updated_at:new Date().toISOString()};
    let cr,out;
    if(original&&original!==name){
      const dup=await fetch(`${url}/rest/v1/catalog_categories?select=id&name=eq.${encodeURIComponent(name)}&limit=1`,{headers:sh});
      const dupRows=await dup.json().catch(()=>[]);
      if(dup.ok&&Array.isArray(dupRows)&&dupRows.length)return r(409,{ok:false,error:'Ya existe una categoría con ese nombre'});
      cr=await fetch(`${url}/rest/v1/catalog_categories?name=eq.${encodeURIComponent(original)}`,{method:'PATCH',headers:{...sh,Prefer:'return=representation'},body:JSON.stringify(payload)});
      out=await cr.json().catch(()=>[]);
      if(cr.ok){
        await fetch(`${url}/rest/v1/catalog_products?category=eq.${encodeURIComponent(original)}`,{method:'PATCH',headers:sh,body:JSON.stringify({category:name,updated_at:new Date().toISOString()})});
      }
    }else{
      cr=await fetch(`${url}/rest/v1/catalog_categories?on_conflict=name`,{method:'POST',headers:{...sh,Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
      out=await cr.json().catch(()=>[]);
    }
    if(!cr.ok){
      const msg=JSON.stringify(out||{});
      if(/catalog_categories|schema cache|relation/i.test(msg))return r(409,{ok:false,migration_required:true,error:'Falta ejecutar supabase_v13_48_catalogo_categorias.sql'});
      return r(cr.status,{ok:false,error:'No se pudo guardar la categoría',details:out});
    }
    return r(200,{ok:true,category:out[0]||payload});
  }

  if(body.action==='delete_category'){
    const name=String(body.name||'').trim();
    if(!name)return r(400,{ok:false,error:'Categoría requerida'});
    const used=await fetch(`${url}/rest/v1/catalog_products?select=id&category=eq.${encodeURIComponent(name)}&limit=1`,{headers:sh});
    const usedRows=await used.json().catch(()=>[]);
    if(used.ok&&Array.isArray(usedRows)&&usedRows.length)return r(409,{ok:false,error:'No puedes eliminar una categoría que todavía tiene productos. Mueve esos productos primero.'});
    const dr=await fetch(`${url}/rest/v1/catalog_categories?name=eq.${encodeURIComponent(name)}`,{method:'DELETE',headers:sh});
    if(!dr.ok)return r(dr.status,{ok:false,error:'No se pudo eliminar la categoría'});
    return r(200,{ok:true});
  }

  if(body.action==='set_product_price'){
    const product_name=String(body.product_name||'').trim();
    const price=Number(body.price_usd);
    if(!product_name||!Number.isFinite(price)||price<0)return r(400,{ok:false,error:'Producto o precio inválido'});
    const ur=await fetch(`${url}/rest/v1/inventory_variants?product_name=eq.${encodeURIComponent(product_name)}`,{method:'PATCH',headers:{...sh,Prefer:'return=representation'},body:JSON.stringify({price_usd:Math.round(price*100)/100})});
    const out=await ur.json().catch(()=>[]);
    if(!ur.ok)return r(ur.status,{ok:false,error:'No se pudo actualizar el precio del producto',details:out});
    return r(200,{ok:true,updated:Array.isArray(out)?out.length:0,variants:out});
  }

  if(body.action==='create_product'){
    const product_name=String(body.product_name||'').trim();
    const category=String(body.category||'').trim();
    const description=String(body.description||'').trim()||null;
    const price=Number(body.price_usd||0),stock=Number(body.stock_on_hand||0);
    const condition=String(body.condition||'Nuevo').trim()||'Nuevo';
    const image_url=String(body.image_url||'').trim()||null;
    const product_key=slug(body.product_key||product_name);
    let sku=String(body.sku||'').trim();
    if(!product_name||!category)return r(400,{ok:false,error:'Nombre y categoría son obligatorios'});
    if(!Number.isFinite(price)||price<0)return r(400,{ok:false,error:'Precio inválido'});
    if(!Number.isInteger(stock)||stock<0)return r(400,{ok:false,error:'Stock inválido'});
    if(!sku)sku=`${product_key}-${Date.now().toString(36)}`.slice(0,72);
    const dup=await fetch(`${url}/rest/v1/inventory_variants?select=id&sku=eq.${encodeURIComponent(sku)}&limit=1`,{headers:sh});
    const dupRows=await dup.json().catch(()=>[]);
    if(dup.ok&&Array.isArray(dupRows)&&dupRows.length)return r(409,{ok:false,error:'Ese SKU ya existe'});
    const variant={sku,product_name,condition,stock_on_hand:stock,stock_reserved:0,stock_sold:0,stock_min:0,price_usd:Math.round(price*100)/100,active:true};
    const vr=await fetch(`${url}/rest/v1/inventory_variants`,{method:'POST',headers:{...sh,Prefer:'return=representation'},body:JSON.stringify(variant)});
    const vout=await vr.json().catch(()=>[]);
    if(!vr.ok)return r(vr.status,{ok:false,error:'No se pudo crear el producto en inventario',details:vout});
    const cp={product_key,product_name,category,description,image_url,published:false,sort_order:1000,updated_at:new Date().toISOString()};
    const cr=await fetch(`${url}/rest/v1/catalog_products?on_conflict=product_key`,{method:'POST',headers:{...sh,Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(cp)});
    const cout=await cr.json().catch(()=>[]);
    if(!cr.ok){
      try{await fetch(`${url}/rest/v1/inventory_variants?sku=eq.${encodeURIComponent(sku)}`,{method:'DELETE',headers:sh})}catch(_){}
      return r(cr.status,{ok:false,error:'No se pudo crear la ficha del catálogo',details:cout});
    }
    return r(200,{ok:true,variant:vout[0]||variant,catalog_product:cout[0]||cp});
  }

  if(body.action==='save_catalog_gallery'){
    const product_key=slug(body.product_key||'');
    const items=Array.isArray(body.images)?body.images:[];
    if(!product_key)return r(400,{ok:false,error:'Producto requerido'});
    if(items.length>12)return r(413,{ok:false,error:'Máximo 12 imágenes por producto'});
    const clean=items.map((x,i)=>({product_key,image_url:String(x.image_url||'').trim(),storage_path:String(x.storage_path||'').trim()||null,sort_order:i,is_primary:!!x.is_primary})).filter(x=>x.image_url);
    if(clean.length&&!clean.some(x=>x.is_primary))clean[0].is_primary=true;
    if(clean.filter(x=>x.is_primary).length>1){let seen=false;clean.forEach(x=>{if(x.is_primary&&!seen){seen=true}else if(x.is_primary)x.is_primary=false})}
    const oldr=await fetch(`${url}/rest/v1/catalog_product_images?select=storage_path&product_key=eq.${encodeURIComponent(product_key)}`,{headers:sh});
    const oldRows=await oldr.json().catch(()=>[]);
    const dr=await fetch(`${url}/rest/v1/catalog_product_images?product_key=eq.${encodeURIComponent(product_key)}`,{method:'DELETE',headers:sh});
    if(!dr.ok)return r(dr.status,{ok:false,error:'No se pudo actualizar la galería'});
    if(clean.length){
      const ar=await fetch(`${url}/rest/v1/catalog_product_images`,{method:'POST',headers:{...sh,Prefer:'return=representation'},body:JSON.stringify(clean)});
      const out=await ar.json().catch(()=>[]); if(!ar.ok)return r(ar.status,{ok:false,error:'No se pudo guardar la galería',details:out});
      const primary=clean.find(x=>x.is_primary)||clean[0];
      await fetch(`${url}/rest/v1/catalog_products?product_key=eq.${encodeURIComponent(product_key)}`,{method:'PATCH',headers:sh,body:JSON.stringify({image_url:primary.image_url,updated_at:new Date().toISOString()})});
      await cleanupCatalogMedia(oldRows,clean);
      return r(200,{ok:true,images:out});
    }
    await cleanupCatalogMedia(oldRows,clean);
    return r(200,{ok:true,images:[]});
  }

  if(body.action==='apply_import'){
    const rows=normalizeRows(body.rows);
    if(!rows.length)return r(400,{ok:false,error:'No hay filas válidas para importar'});
    if(rows.length>1000)return r(413,{ok:false,error:'Máximo 1000 filas por importación'});
    const rr=await fetch(`${url}/rest/v1/rpc/ts_admin_import_inventory`,{method:'POST',headers:sh,body:JSON.stringify({p_rows:rows})});
    const data=await rr.json().catch(()=>({}));if(!rr.ok)return r(rr.status,{ok:false,error:data?.message||data?.error||'No se pudo importar',details:data});
    // Todo producto nuevo importado se registra también como borrador editorial.
    // Nunca sobreescribe una ficha ya existente: imagen, descripción y publicación quedan intactas.
    const byProduct=new Map();
    for(const row of rows){
      const name=String(row.product_name||'').trim(); if(!name)continue;
      let category=String(row.category||'').trim();
      if(!category) category=inferCategory(name);
      const key=slug(name); if(!byProduct.has(key))byProduct.set(key,{product_key:key,product_name:name,category,description:null,image_url:null,published:false,sort_order:1000,updated_at:new Date().toISOString()});
    }
    let drafts_created=0;
    if(byProduct.size){
      const payload=[...byProduct.values()];
      const cr=await fetch(`${url}/rest/v1/catalog_products?on_conflict=product_key`,{method:'POST',headers:{...sh,Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(payload)});
      const created=await cr.json().catch(()=>[]);
      if(cr.ok&&Array.isArray(created))drafts_created=created.length;
    }
    return r(200,{ok:true,result:data,drafts_created});
  }
  return r(400,{ok:false,error:'Acción no soportada'});
};
function normalizeRows(rows){
  if(!Array.isArray(rows))return [];
  const seen=new Set(),out=[];
  for(const x of rows){
    const sku=String(x?.sku||'').trim();if(!sku||seen.has(sku.toLowerCase()))continue;seen.add(sku.toLowerCase());
    const num=(v,integer=false)=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);if(!Number.isFinite(n))return null;return integer?Math.trunc(n):Math.round(n*100)/100};
    out.push({sku,product_name:String(x.product_name||'').trim()||sku,category:String(x.category||'').trim()||null,model:String(x.model||'').trim()||null,color:String(x.color||'').trim()||null,capacity:String(x.capacity||'').trim()||null,condition:String(x.condition||'').trim()||null,chip:String(x.chip||'').trim()||null,ram:String(x.ram||'').trim()||null,stock_on_hand:num(x.stock_on_hand,true),stock_min:num(x.stock_min,true),price_usd:num(x.price_usd,false)});
  }
  return out;
}
function inferCategory(name){const n=String(name||'');return /iphone/i.test(n)?'iPhone':/ipad/i.test(n)?'iPad':/macbook/i.test(n)?'MacBook':/imac/i.test(n)?'iMac':/airpod|audio|audifono|audífono|beats/i.test(n)?'Audio':/cable|cargador|case|forro|vidrio|magsafe|pencil|mouse|keyboard|airtag/i.test(n)?'Accesorios Apple':/\bmac\b|mac mini|mac pro/i.test(n)?'Mac':'Otro'}
function slug(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'producto'}
function r(statusCode,body){return{statusCode,headers:H,body:JSON.stringify(body)}}
async function authorizeAdmin(event,url,service){
  const legacy=String(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']||'').trim();
  const allowed=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String);
  if(legacy&&allowed.includes(legacy))return{ok:true,mode:'legacy'};
  const token=String(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
  if(!token)return{ok:false};
  const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});
  const u=await ur.json().catch(()=>({}));if(!ur.ok||!u.id)return{ok:false};
  const pr=await fetch(`${url}/rest/v1/profiles?select=id,role,active&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:{apikey:service,Authorization:`Bearer ${service}`}});
  const rows=await pr.json().catch(()=>[]),p=rows[0],role=String(p?.role||'').toLowerCase();
  if(!p||p.active===false||!['admin','super_admin','superadmin','administrator','gerente'].includes(role))return{ok:false};
  return{ok:true,user_id:u.id,role};
}

async function cleanupCatalogMedia(oldRows,clean){
  try{
    const keep=new Set((clean||[]).map(x=>String(x.storage_path||'')));
    const keys=(oldRows||[]).map(x=>String(x.storage_path||'')).filter(x=>x.startsWith('r2:')&&!keep.has(x)).map(x=>x.slice(3));
    const cfg=r2Config(); if(!cfg||!keys.length)return;
    for(const key of keys){try{await r2Delete(cfg,key)}catch(_e){}}
  }catch(_){/* limpieza multimedia no bloquea el guardado */}
}
function r2Config(){const accountId=String(process.env.R2_ACCOUNT_ID||'').trim(),accessKey=String(process.env.R2_ACCESS_KEY_ID||'').trim(),secretKey=String(process.env.R2_SECRET_ACCESS_KEY||'').trim(),bucket=String(process.env.R2_BUCKET_NAME||'').trim();return accountId&&accessKey&&secretKey&&bucket?{accountId,accessKey,secretKey,bucket}:null}
async function r2Delete(cfg,key){
  const crypto=require('crypto'),host=`${cfg.accountId}.r2.cloudflarestorage.com`,encodedKey=key.split('/').map(encodeURIComponent).join('/'),canonicalUri=`/${encodeURIComponent(cfg.bucket)}/${encodedKey}`;
  const now=new Date(),amzDate=now.toISOString().replace(/[:-]|\.\d{3}/g,''),dateStamp=amzDate.slice(0,8),payloadHash=crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex'),contentType='application/octet-stream';
  const canonicalHeaders=`content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`,signedHeaders='content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest=['DELETE',canonicalUri,'',canonicalHeaders,signedHeaders,payloadHash].join('\n'),scope=`${dateStamp}/auto/s3/aws4_request`,stringToSign=['AWS4-HMAC-SHA256',amzDate,scope,crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  const hm=(k,d,e)=>crypto.createHmac('sha256',k).update(d).digest(e),kDate=hm(Buffer.from('AWS4'+cfg.secretKey),dateStamp),kRegion=hm(kDate,'auto'),kService=hm(kRegion,'s3'),kSigning=hm(kService,'aws4_request'),signature=hm(kSigning,stringToSign,'hex');
  return fetch(`https://${host}${canonicalUri}`,{method:'DELETE',headers:{'Content-Type':contentType,'Host':host,'x-amz-date':amzDate,'x-amz-content-sha256':payloadHash,'Authorization':`AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`}});
}
