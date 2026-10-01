const support=require('../../soporte/netlify/functions/support-actions');
exports.handler=async event=>{
  if(!process.env.SUPPORT_SUPABASE_URL||!process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY)return {statusCode:501,headers:{'Content-Type':'application/json'},body:JSON.stringify({ok:false,error:'Configura SUPPORT_SUPABASE_URL y SUPPORT_SUPABASE_SERVICE_ROLE_KEY del proyecto de Soporte en este sitio.'})};
  return support.handler(event);
};
