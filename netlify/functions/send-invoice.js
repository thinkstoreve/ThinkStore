
exports.handler = async function(event){
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, x-admin-secret','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
  if(event.httpMethod==='OPTIONS') return {statusCode:200,headers,body:JSON.stringify({ok:true})};
  if(event.httpMethod!=='POST') return {statusCode:405,headers,body:JSON.stringify({ok:false,error:'Método no permitido'})};
  const provided=String(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']||'').trim();
  const ok=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String).includes(provided);
  if(!ok) return {statusCode:401,headers,body:JSON.stringify({ok:false,error:'Acceso administrador no autorizado'})};
  const RESEND_API_KEY=process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY;
  if(!RESEND_API_KEY) return {statusCode:501,headers,body:JSON.stringify({ok:false,error:'Falta RESEND_API_KEY'})};
  let body={}; try{body=JSON.parse(event.body||'{}')}catch(e){return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'JSON inválido'})}}
  const o=body.order||{}; const code=String(body.code||o.codigo||o.code||o.id||'TS').trim();
  const cliente=o.clientes||o.cliente||{}; const to=String(cliente.correo||cliente.email||o.email||o.correo||body.email||'').trim();
  if(!to) return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'El pedido no tiene correo de cliente'})};
  const name=String(cliente.nombre||o.nombre||'Cliente');
  const total=o.total_usd||o.total||0;
  const html=`<div style="font-family:Arial,sans-serif;background:#f5f5f7;padding:28px"><div style="max-width:640px;margin:auto;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #e5e5e5"><div style="padding:26px"><img src="https://thinkstore.com.ve/assets/thinkstore-email-logo.jpg" style="width:190px"><h1>Nota de entrega ThinkStore</h1><p>Hola ${name}, adjuntamos los datos de tu pedido.</p><div style="background:#f5f5f7;border-radius:18px;padding:18px"><b>Pedido:</b> ${code}<br><b>Estado:</b> ${o.estado||o.status||'Pago verificado'}<br><b>Total:</b> $${Number(total||0).toFixed(2)}</div><p style="text-align:center;margin-top:28px"><a href="https://thinkstore.com.ve/#seguimiento" style="background:#111;color:#fff;text-decoration:none;border-radius:999px;padding:14px 24px;font-weight:700">Ver seguimiento</a></p></div></div></div>`;
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.FROM_PEDIDOS_EMAIL||'ThinkStore Pedidos <pedidos@thinkstore.com.ve>',to,reply_to:process.env.REPLY_TO_PEDIDOS||'pedidos@thinkstore.com.ve',subject:`Nota de entrega ThinkStore - ${code}`,html})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) return {statusCode:500,headers,body:JSON.stringify({ok:false,error:data.message||'Resend rechazó el envío'})};
  return {statusCode:200,headers,body:JSON.stringify({ok:true,id:data.id})};
};
