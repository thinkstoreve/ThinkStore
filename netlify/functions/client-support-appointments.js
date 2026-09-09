const { createClient } = require('@supabase/supabase-js');
const reply=(statusCode,body)=>({statusCode,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify(body)});
exports.handler=async(event)=>{
  if(event.httpMethod!=='GET') return reply(405,{ok:false,error:'method_not_allowed'});
  try{
    const token=String(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'').trim();
    if(!token) return reply(401,{ok:false,error:'authentication_required'});
    const mainUrl=String(process.env.SUPABASE_URL||'').replace(/\/+$/,'');
    const mainKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supportUrl=String(process.env.SUPPORT_SUPABASE_URL||'').replace(/\/+$/,'');
    const supportKey=process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY;
    if(!mainUrl||!mainKey||!supportUrl||!supportKey) return reply(503,{ok:false,error:'service_not_configured'});
    const main=createClient(mainUrl,mainKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:authData,error:authError}=await main.auth.getUser(token);
    if(authError||!authData?.user?.email) return reply(401,{ok:false,error:'invalid_session'});
    const email=String(authData.user.email).trim().toLowerCase();
    const support=createClient(supportUrl,supportKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await support.from('service_appointments').select('id,client_name,client_email,client_phone,device_type,device_model,service_type,reported_issue,preferred_date,preferred_time,service_mode,status,notes,created_at,updated_at').eq('client_email',email).order('preferred_date',{ascending:false}).order('created_at',{ascending:false}).limit(50);
    if(error) throw error;
    return reply(200,{ok:true,appointments:data||[]});
  }catch(e){console.error(e);return reply(500,{ok:false,error:'appointments_fetch_failed'});}
};
