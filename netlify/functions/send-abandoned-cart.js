
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
  const email=String(body.email||'').trim(); if(!email) return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'Correo requerido'})};
  const cart=Array.isArray(body.cart)?body.cart:[];
  const items=cart.length?cart.map(i=>`<li>${String(i.name||i.producto||i.product||'Producto ThinkStore')}</li>`).join(''):'<li>Productos guardados en tu carrito ThinkStore</li>';
  const html=`<div style="font-family:Arial,sans-serif;background:#050505;padding:28px"><div style="max-width:620px;margin:auto;background:#fff;border-radius:26px;overflow:hidden"><div style="padding:28px;background:#111;color:#fff"><img src="https://thinkstore.com.ve/assets/thinkstore-email-logo.jpg" style="width:180px;background:#fff;border-radius:16px;padding:10px"><h1>Tu carrito te espera</h1><p>Guardamos estos productos para ti.</p></div><div style="padding:28px;color:#111"><ul>${items}</ul><p>Puedes completar tu compra cuando quieras.</p><p style="text-align:center"><a href="https://thinkstore.com.ve" style="background:#111;color:#fff;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:700">Volver a ThinkStore</a></p></div></div></div>`;
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.FROM_MARKETING_EMAIL||'ThinkStore <ventas@thinkstore.com.ve>',to:email,subject:'Tu carrito ThinkStore te espera',html})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) return {statusCode:500,headers,body:JSON.stringify({ok:false,error:data.message||'Resend rechazó el envío'})};
  return {statusCode:200,headers,body:JSON.stringify({ok:true,id:data.id})};
};
