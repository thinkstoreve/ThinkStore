const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
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
    if(!rr.ok)return r(rr.status,{ok:false,error:'No se pudo consultar inventario',details:rows});
    return r(200,{ok:true,variants:rows.map(v=>({...v,available:Math.max(0,Number(v.stock_on_hand||0)-Number(v.stock_reserved||0)),low_stock:Math.max(0,Number(v.stock_on_hand||0)-Number(v.stock_reserved||0))<=Number(v.stock_min||0)}))});
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
    await fetch(`${url}/rest/v1/inventory_movements`,{method:'POST',headers:sh,body:JSON.stringify({variant_id:id,movement_type:'adjustment',quantity:qty,note:String(body.note||'Ajuste administrativo'),actor_user_id:auth.user_id||null})});
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
    return r(200,{ok:true,variant:updated[0]||null});
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

  if(body.action==='apply_import'){
    const rows=normalizeRows(body.rows);
    if(!rows.length)return r(400,{ok:false,error:'No hay filas válidas para importar'});
    if(rows.length>1000)return r(413,{ok:false,error:'Máximo 1000 filas por importación'});
    const rr=await fetch(`${url}/rest/v1/rpc/ts_admin_import_inventory`,{method:'POST',headers:sh,body:JSON.stringify({p_rows:rows})});
    const data=await rr.json().catch(()=>({}));if(!rr.ok)return r(rr.status,{ok:false,error:data?.message||data?.error||'No se pudo importar',details:data});
    return r(200,{ok:true,result:data});
  }
  return r(400,{ok:false,error:'Acción no soportada'});
};
function normalizeRows(rows){
  if(!Array.isArray(rows))return [];
  const seen=new Set(),out=[];
  for(const x of rows){
    const sku=String(x?.sku||'').trim();if(!sku||seen.has(sku.toLowerCase()))continue;seen.add(sku.toLowerCase());
    const num=(v,integer=false)=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);if(!Number.isFinite(n))return null;return integer?Math.trunc(n):Math.round(n*100)/100};
    out.push({sku,product_name:String(x.product_name||'').trim()||sku,model:String(x.model||'').trim()||null,color:String(x.color||'').trim()||null,capacity:String(x.capacity||'').trim()||null,condition:String(x.condition||'').trim()||null,chip:String(x.chip||'').trim()||null,ram:String(x.ram||'').trim()||null,stock_on_hand:num(x.stock_on_hand,true),stock_min:num(x.stock_min,true),price_usd:num(x.price_usd,false)});
  }
  return out;
}
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
