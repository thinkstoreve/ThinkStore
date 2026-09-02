
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
    const rr=await fetch(`${url}/rest/v1/inventory_variants?select=id,sku,product_name,model,color,capacity,stock_on_hand,stock_reserved,stock_sold,stock_min,active&active=eq.true${sku}&order=product_name.asc`,{headers:sh});
    const rows=await rr.json().catch(()=>[]);
    if(!rr.ok)return r(rr.status,{ok:false,error:'No se pudo consultar inventario',details:rows});
    return r(200,{ok:true,variants:rows.map(v=>({...v,available:Math.max(0,(v.stock_on_hand||0)-(v.stock_reserved||0)),low_stock:Math.max(0,(v.stock_on_hand||0)-(v.stock_reserved||0))<=(v.stock_min||0)}))});
  }
  if(event.httpMethod!=='POST')return r(405,{ok:false,error:'Método no permitido'});
  const auth=await authorizeAdmin(event,url,service);
  if(!auth.ok)return r(401,{ok:false,error:'Acceso administrador no autorizado'});
  const body=JSON.parse(event.body||'{}');
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
  return r(400,{ok:false,error:'Acción no soportada'});
};
function r(statusCode,body){return{statusCode,headers:H,body:JSON.stringify(body)}}
async function authorizeAdmin(event,url,service){
  const legacy=String(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']||'').trim();
  const allowed=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String);
  if(legacy&&allowed.includes(legacy))return{ok:true,mode:'legacy'};
  const token=String(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
  if(!token)return{ok:false};
  const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});
  const u=await ur.json().catch(()=>({}));
  if(!ur.ok||!u.id)return{ok:false};
  const pr=await fetch(`${url}/rest/v1/profiles?select=id,role,active&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:{apikey:service,Authorization:`Bearer ${service}`}});
  const rows=await pr.json().catch(()=>[]),p=rows[0],role=String(p?.role||'').toLowerCase();
  if(!p||p.active===false||!['admin','super_admin','superadmin','administrator','gerente'].includes(role))return{ok:false};
  return{ok:true,user_id:u.id,role};
}
