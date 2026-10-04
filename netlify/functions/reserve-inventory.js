
const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST,OPTIONS'};
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:200,headers:H,body:''};
  if(event.httpMethod!=='POST')return r(405,{ok:false,error:'Método no permitido'});
  const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const service=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  if(!url||!service)return r(501,{ok:false,error:'Faltan variables de Supabase'});
  const token=String(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
  if(!token)return r(401,{ok:false,error:'Sesión requerida'});
  const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});
  const user=await ur.json().catch(()=>({}));
  if(!ur.ok||!user.id)return r(401,{ok:false,error:'Sesión inválida'});
  const body=JSON.parse(event.body||'{}');
  if(!body.pedido_id||!Array.isArray(body.items)||!body.items.length)return r(400,{ok:false,error:'Datos de reserva incompletos'});
  const pr=await fetch(`${url}/rest/v1/pedidos?select=id,cliente_id&id=eq.${encodeURIComponent(body.pedido_id)}&limit=1`,{headers:{apikey:service,Authorization:`Bearer ${service}`}});
  const orders=await pr.json().catch(()=>[]),order=orders[0];
  if(!order||String(order.cliente_id)!==String(user.id))return r(403,{ok:false,error:'Pedido no autorizado'});
  const rpc=await fetch(`${url}/rest/v1/rpc/ts_reserve_inventory`,{method:'POST',headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'},body:JSON.stringify({p_pedido_id:body.pedido_id,p_items:body.items,p_minutes:60})});
  const data=await rpc.json().catch(()=>({}));
  if(!rpc.ok){
    const text=JSON.stringify(data);
    const msg=text.includes('stock_insuficiente')?'Una de las variantes acaba de quedarse sin existencia. Actualiza el carrito.':text.includes('variante_no_disponible')?'Una variante seleccionada ya no está disponible.':'No se pudo reservar el inventario.';
    return r(409,{ok:false,error:msg,details:data});
  }
  return r(200,{ok:true,result:data});
};
function r(statusCode,body){return{statusCode,headers:H,body:JSON.stringify(body)}}
