const clean=v=>String(v??'').trim();
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
const WEBHOOK_SECRET="uV0rTyB7yrUdFpR5pI4mOItrtJVpdwzLQYIPkBsTWCSuJrp5";

function formatDate(value){
  if(!value)return 'Por confirmar';
  try{
    return new Intl.DateTimeFormat('es-VE',{day:'2-digit',month:'long',year:'numeric',timeZone:'America/Caracas'}).format(new Date(`${value}T12:00:00-04:00`));
  }catch{return value}
}
function formatTime(value){
  if(!value)return 'Por confirmar';
  const v=String(value).slice(0,5);
  const [h,m]=v.split(':').map(Number);
  if(Number.isNaN(h))return v;
  const hour=((h+11)%12)+1;
  return `${hour}:${String(m||0).padStart(2,'0')} ${h>=12?'p. m.':'a. m.'}`;
}

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
    const panel='https://soporte.thinkstore.com.ve/panel.html';
    const date=formatDate(a.preferred_date);
    const time=formatTime(a.preferred_time);
    const service=clean(a.service_type)||'Diagnóstico / revisión';
    const mode=clean(a.service_mode)||'Presencial';
    const issue=clean(a.reported_issue)||'Sin detalle adicional';

    const html=`<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1d1d1f"><div style="padding:34px 16px"><div style="max-width:660px;margin:auto;background:#fff;border:1px solid #e8e8ed;border-radius:28px;overflow:hidden"><div style="background:#0b0b0d;color:#fff;padding:28px 32px"><div style="font-size:11px;letter-spacing:.15em;font-weight:800;color:#86bfff">NUEVA CITA WEB</div><div style="font-size:27px;font-weight:800;letter-spacing:-.03em;margin-top:8px">ThinkStore Soporte</div></div><div style="padding:30px 32px"><h1 style="font-size:28px;line-height:1.08;letter-spacing:-.04em;margin:0 0 7px">${esc(client)}</h1><p style="margin:0;color:#6e6e73;font-size:15px;line-height:1.55">Acaba de agendar una cita para <b style="color:#1d1d1f">${esc(device)}</b>.</p><div style="margin:24px 0;background:#f7f7f9;border:1px solid #ececf0;border-radius:20px;padding:18px 20px"><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:7px 0;color:#7b7b80">Fecha</td><td style="padding:7px 0;text-align:right;font-weight:700">${esc(date)}</td></tr><tr><td style="padding:7px 0;color:#7b7b80">Hora</td><td style="padding:7px 0;text-align:right;font-weight:700">${esc(time)}</td></tr><tr><td style="padding:7px 0;color:#7b7b80">Servicio</td><td style="padding:7px 0;text-align:right;font-weight:700">${esc(service)}</td></tr><tr><td style="padding:7px 0;color:#7b7b80">Modalidad</td><td style="padding:7px 0;text-align:right;font-weight:700">${esc(mode)}</td></tr></table></div><div style="margin-bottom:20px"><div style="font-size:11px;letter-spacing:.1em;color:#7b7b80;font-weight:800">DETALLE DEL CLIENTE</div><div style="font-size:14px;line-height:1.7;margin-top:7px">${a.client_phone?`Teléfono: <b>${esc(a.client_phone)}</b><br>`:''}${a.client_email?`Correo: <b>${esc(a.client_email)}</b><br>`:''}Motivo: ${esc(issue)}</div></div><div style="text-align:center;margin-top:26px"><a href="${panel}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;border-radius:999px;padding:14px 24px;font-size:14px;font-weight:750">Abrir citas en Soporte</a></div><p style="margin:26px 0 0;text-align:center;color:#a1a1a6;font-size:11px">Notificación enviada automáticamente al generarse la cita.</p></div></div></div></body></html>`;
    const text=`Nueva cita web ThinkStore Soporte

Cliente: ${client}
Equipo: ${device}
Fecha: ${date}
Hora: ${time}
Servicio: ${service}
Modalidad: ${mode}
Teléfono: ${a.client_phone||'-'}
Correo: ${a.client_email||'-'}
Motivo: ${issue}

Panel: ${panel}`;

    const er=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json'},body:JSON.stringify({
      from:process.env.FROM_SOPORTE_EMAIL||process.env.FROM_EMAIL||'ThinkStore Soporte <soporte@thinkstore.com.ve>',
      to,
      reply_to:process.env.REPLY_TO_SOPORTE||'soporte@thinkstore.com.ve',
      subject,html,text
    })});
    const ed=await er.json().catch(()=>({}));
    if(!er.ok)throw new Error(ed.message||'No se pudo enviar el correo');

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
