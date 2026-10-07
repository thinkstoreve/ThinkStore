const clean=v=>String(v??'').trim();
const {staffEmail,rows:detailRows,callout,sendResend,panelUrl,appointmentDate,appointmentTime}=require('./support-mail-ui');
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
const WEBHOOK_SECRET="uV0rTyB7yrUdFpR5pI4mOItrtJVpdwzLQYIPkBsTWCSuJrp5";

exports.handler=async event=>{
  if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Método no permitido'});
  if(clean(event.headers?.['x-thinkstore-webhook']||event.headers?.['X-ThinkStore-Webhook'])!==WEBHOOK_SECRET)return reply(401,{ok:false,error:'No autorizado'});

  const url=clean(process.env.SUPPORT_SUPABASE_URL||process.env.SUPABASE_URL).replace(/\/$/,'');
  const key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
  const resend=clean(process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY);
  const to=clean(process.env.SUPPORT_NOTIFICATION_TO||'soporte@thinkstore.com.ve');
  if(!url||!key||!resend)return reply(501,{ok:false,error:'Faltan variables de Soporte/Resend'});

  const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  const req=async(path,options={})=>{
    const r=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...headers,...(options.headers||{})}});
    const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}
    if(!r.ok)throw new Error(d?.message||`HTTP ${r.status}`);
    return d;
  };

  let notificationId='';
  try{
    const body=JSON.parse(event.body||'{}');
    notificationId=clean(body.notification_id);
    if(!notificationId)return reply(400,{ok:false,error:'notification_id requerido'});

    const rows=await req(`support_notifications?select=*&id=eq.${encodeURIComponent(notificationId)}&limit=1`);
    const n=rows?.[0];
    if(!n)return reply(404,{ok:false,error:'Notificación no encontrada'});
    if(n.event_type!=='appointment_new')return reply(200,{ok:true,ignored:true});
    if(n.email_sent_at)return reply(200,{ok:true,already_sent:true});
    if(!n.appointment_id)return reply(422,{ok:false,error:'La notificación no tiene cita asociada'});

    const appts=await req(`service_appointments?select=id,client_name,client_phone,client_email,device_type,device_model,service_type,reported_issue,service_mode,preferred_date,preferred_time,status,created_at&id=eq.${encodeURIComponent(String(n.appointment_id))}&limit=1`);
    const a=appts?.[0];
    if(!a)throw new Error('No se encontró la cita asociada');

    const client=clean(a.client_name)||'Cliente';
    const device=clean(a.device_model)||clean(a.device_type)||'Equipo por confirmar';
    const subject=`Nueva cita web · ${client} · ${device}`;
    const date=appointmentDate(a.preferred_date);
    const time=appointmentTime(a.preferred_time);
    const service=clean(a.service_type)||'Diagnóstico / revisión';
    const mode=clean(a.service_mode)||'Presencial';
    const issue=clean(a.reported_issue)||'Sin detalle adicional';
    const html=staffEmail({eyebrow:'NUEVA CITA WEB',title:'Nueva solicitud de Servicio Técnico',lead:`${client} agendó una cita para ${device}.`,body:
      detailRows([['Fecha',date],['Hora',time],['Servicio',service],['Modalidad',mode],['Teléfono',a.client_phone||''],['Correo',a.client_email||'']])+callout('Motivo de la cita',issue,'blue'),
      ctaLabel:'Abrir citas en Soporte',ctaUrl:panelUrl()});
    const text=`Nueva cita web ThinkStore Soporte\n\nCliente: ${client}\nEquipo: ${device}\nFecha: ${date}\nHora: ${time}\nServicio: ${service}\nModalidad: ${mode}\nTeléfono: ${a.client_phone||'-'}\nCorreo: ${a.client_email||'-'}\nMotivo: ${issue}\n\nPanel: ${panelUrl()}`;
    const ed=await sendResend({to,subject,html,text});
    const now=new Date().toISOString();
    await req(`support_notifications?id=eq.${encodeURIComponent(notificationId)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({email_sent_at:now,email_attempts:Number(n.email_attempts||0)+1,email_last_error:null})});
    return reply(200,{ok:true,sent:true,email_id:ed.id||null});
  }catch(error){
    console.error('support-appointment-email',error);
    if(notificationId){
      try{
        const url=clean(process.env.SUPPORT_SUPABASE_URL||process.env.SUPABASE_URL).replace(/\/$/,'');
        const key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
        if(url&&key)await fetch(`${url}/rest/v1/support_notifications?id=eq.${encodeURIComponent(notificationId)}`,{method:'PATCH',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({email_attempts:1,email_last_error:String(error.message||error).slice(0,500)})});
      }catch(_e){}
    }
    return reply(500,{ok:false,error:error.message||'Error'});
  }
};
