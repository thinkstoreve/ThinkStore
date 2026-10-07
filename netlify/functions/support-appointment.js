const { createClient } = require('@supabase/supabase-js');

const json=(statusCode,body)=>({statusCode,headers:{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'content-type,authorization'},body:JSON.stringify(body)});
const {appointmentClientEmail,sendResend}=require('./support-mail-ui');

async function sendAppointmentEmail(body,appointment){
  const mail=appointmentClientEmail(body,appointment);
  try{
    const data=await sendResend({to:String(body.email||'').trim().toLowerCase(),subject:mail.subject,html:mail.html,text:mail.text});
    return {sent:true,id:data.id||null};
  }catch(error){return {sent:false,error:error.message||String(error)}}
}


exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS') return json(204,{});
  if(event.httpMethod!=='POST') return json(405,{error:'method_not_allowed'});
  try{
    const url=String(process.env.SUPPORT_SUPABASE_URL||'').replace(/\/+$/,'');
    const key=process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key) return json(503,{error:'support_database_not_configured'});
    const body=JSON.parse(event.body||'{}');
    const required=['name','email','phone','device_type','device_model','service_type','issue','preferred_date','preferred_time'];
    if(required.some(k=>!String(body[k]||'').trim())) return json(400,{error:'missing_fields'});
    const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const payload={client_name:String(body.name).trim(),client_email:String(body.email).trim().toLowerCase(),client_phone:String(body.phone).trim(),device_type:String(body.device_type).trim(),device_model:String(body.device_model).trim(),service_type:String(body.service_type).trim(),reported_issue:String(body.issue).trim(),preferred_date:body.preferred_date,preferred_time:String(body.preferred_time).trim(),service_mode:String(body.service_mode||'Presencial').trim(),source:String(body.source||'web').trim(),status:'agendada'};
    const {data,error}=await sb.from('service_appointments').insert(payload).select('id,status,created_at,preferred_date,preferred_time').single();
    if(error) throw error;
    let email={sent:false};
    try{email=await sendAppointmentEmail(body,data)}catch(e){console.error('Appointment email:',e);email={sent:false,error:e.message||String(e)}}
    return json(200,{ok:true,appointment:data,email});
  }catch(e){console.error(e);return json(500,{error:'appointment_create_failed'});}
};
