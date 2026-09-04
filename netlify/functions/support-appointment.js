const { createClient } = require('@supabase/supabase-js');
exports.handler=async(event)=>{
  const headers={'content-type':'application/json','access-control-allow-origin':'*'};
  if(event.httpMethod==='OPTIONS') return {statusCode:204,headers,body:''};
  if(event.httpMethod!=='POST') return {statusCode:405,headers,body:JSON.stringify({error:'method_not_allowed'})};
  try{
    const url=process.env.SUPPORT_SUPABASE_URL;
    const key=process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key) return {statusCode:503,headers,body:JSON.stringify({error:'support_database_not_configured'})};
    const body=JSON.parse(event.body||'{}');
    const required=['name','email','phone','device_type','device_model','service_type','issue','preferred_date','preferred_time'];
    if(required.some(k=>!String(body[k]||'').trim())) return {statusCode:400,headers,body:JSON.stringify({error:'missing_fields'})};
    const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const payload={client_name:String(body.name).trim(),client_email:String(body.email).trim().toLowerCase(),client_phone:String(body.phone).trim(),device_type:String(body.device_type).trim(),device_model:String(body.device_model).trim(),service_type:String(body.service_type).trim(),reported_issue:String(body.issue).trim(),preferred_date:body.preferred_date,preferred_time:String(body.preferred_time).trim(),service_mode:String(body.service_mode||'Presencial').trim(),source:String(body.source||'web').trim(),status:'pendiente_confirmacion'};
    const {data,error}=await sb.from('service_appointments').insert(payload).select('id,status,created_at').single();
    if(error) throw error;
    return {statusCode:200,headers,body:JSON.stringify({ok:true,appointment:data})};
  }catch(e){console.error(e);return {statusCode:500,headers,body:JSON.stringify({error:'appointment_create_failed'})};}
};
