const { createClient } = require('@supabase/supabase-js');

const json=(statusCode,body)=>({statusCode,headers:{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'content-type,authorization'},body:JSON.stringify(body)});
const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

async function sendAppointmentEmail(body,appointment){
  const key=process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY;
  if(!key) return {sent:false,error:'resend_not_configured'};
  const when=`${body.preferred_date} · ${String(body.preferred_time||'').slice(0,5)}`;
  const html=`<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111"><div style="max-width:620px;margin:0 auto;padding:34px 18px"><div style="background:#fff;border:1px solid #e5e5ea;border-radius:28px;padding:30px"><div style="font-size:13px;letter-spacing:.15em;font-weight:800;color:#55708f">SOPORTE THINK</div><h1 style="font-size:32px;line-height:1.05;margin:10px 0 12px">Tu cita quedó agendada ✅</h1><p style="color:#6e6e73;line-height:1.55">Hola ${esc(body.name)}, recibimos tu solicitud y la cita quedó registrada automáticamente. No necesitas esperar una confirmación adicional para asistir.</p><div style="background:#f7f7f8;border-radius:20px;padding:18px;margin:22px 0;line-height:1.7"><b>${esc(body.device_type)} ${esc(body.device_model)}</b><br><span>${esc(body.service_type)}</span><br><span>${esc(body.issue)}</span><br><b>${esc(when)}</b><br><span>${esc(body.service_mode||'Presencial')}</span></div><p style="color:#6e6e73;line-height:1.55">Si necesitamos ajustar el horario o solicitar información adicional, Soporte Think se comunicará contigo.</p><a href="https://thinkstore.com.ve/panel.html#mis_reparaciones" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;border-radius:999px;padding:13px 20px;font-weight:800">Ver mi cita</a><p style="font-size:12px;color:#8e8e93;margin-top:24px">Código de solicitud: ${esc(appointment?.id||'')}</p></div></div></body></html>`;
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.FROM_SUPPORT_EMAIL||'Soporte Think <soporte@thinkstore.com.ve>',to:String(body.email||'').trim().toLowerCase(),reply_to:process.env.REPLY_TO_SUPPORT||'contacto@thinkstore.com.ve',subject:`Cita agendada · ${body.device_type} ${body.device_model} · ThinkStore`,html})});
  const data=await res.json().catch(()=>({}));
  return res.ok?{sent:true,id:data.id||null}:{sent:false,error:data.message||data.error||`Resend HTTP ${res.status}`};
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
