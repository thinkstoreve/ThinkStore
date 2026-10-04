const clean=v=>String(v??'').trim();
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const meta=t=>({appointment_new:['Cita web','Nueva cita recibida'],appointment_updated:['Cita web','Cita actualizada'],client_message:['Mensaje','Nuevo mensaje del cliente'],client_review:['Reseña','Nueva reseña del cliente'],quote_approved:['Cotización','Cotización aprobada'],order_ready:['Estado','Equipo listo para entregar'],order_status:['Estado','Cambio de estado']}[t]||['Soporte','Nueva notificación']);
exports.handler=async()=>{
  const url=clean(process.env.SUPPORT_SUPABASE_URL||process.env.SUPABASE_URL).replace(/\/$/,'');
  const key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
  const resend=clean(process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY);
  const to=clean(process.env.SUPPORT_NOTIFICATION_TO||'soporte@thinkstore.com.ve');
  if(!url||!key||!resend)return reply(501,{ok:false,error:'Faltan variables de Soporte/Resend'});
  const h={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  const req=async(path,options={})=>{const r=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...h,...(options.headers||{})}});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw new Error(d?.message||`HTTP ${r.status}`);return d};
  try{
    const rows=await req('support_notifications?select=*&email_sent_at=is.null&order=created_at.asc&limit=40');
    if(!rows?.length)return reply(200,{ok:true,sent:0});
    const cards=rows.map(n=>{const [group,label]=meta(n.event_type);return `<div style="padding:16px 0;border-bottom:1px solid #ececf0"><div style="font-size:10px;font-weight:800;letter-spacing:.08em;color:#1478dc;text-transform:uppercase">${esc(group)}</div><div style="font-size:16px;font-weight:750;color:#1d1d1f;margin-top:4px">${esc(n.title||label)}</div><div style="font-size:13px;line-height:1.55;color:#65676d;margin-top:5px">${esc(n.message||'')}</div><div style="font-size:10px;color:#a1a1a6;margin-top:7px">${esc(new Date(n.created_at).toLocaleString('es-VE'))}</div></div>`}).join('');
    const subject=`ThinkStore Soporte · ${rows.length} notificación${rows.length===1?'':'es'} nueva${rows.length===1?'':'s'}`;
    const panel='https://soporte.thinkstore.com.ve/panel.html';
    const html=`<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1d1d1f"><div style="padding:34px 16px"><div style="max-width:650px;margin:auto;background:#fff;border:1px solid #e8e8ed;border-radius:26px;overflow:hidden"><div style="background:#0b0b0d;color:#fff;padding:26px 30px"><div style="font-size:24px;font-weight:800">ThinkStore Soporte</div><div style="font-size:12px;color:#b7bbc2;margin-top:5px">Centro de notificaciones</div></div><div style="padding:28px 30px"><h1 style="font-size:25px;letter-spacing:-.03em;margin:0 0 4px">${rows.length} novedad${rows.length===1?'':'es'} pendiente${rows.length===1?'':'s'}</h1><p style="font-size:13px;color:#777;margin:0 0 12px">Citas, mensajes, reseñas y cambios de estado registrados en Servicio Técnico.</p>${cards}<div style="text-align:center;margin-top:24px"><a href="${panel}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;border-radius:999px;padding:13px 20px;font-size:13px;font-weight:750">Abrir panel de Soporte</a></div></div></div></div></body></html>`;
    const text=rows.map(n=>`- ${n.title||meta(n.event_type)[1]}: ${n.message||''}`).join('\n');
    const er=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.FROM_SOPORTE_EMAIL||process.env.FROM_EMAIL||'ThinkStore Soporte <soporte@thinkstore.com.ve>',to,reply_to:process.env.REPLY_TO_SOPORTE||'soporte@thinkstore.com.ve',subject,html,text})});
    const ed=await er.json().catch(()=>({}));if(!er.ok)throw new Error(ed.message||'No se pudo enviar el correo');
    const now=new Date().toISOString();
    for(const n of rows)await req(`support_notifications?id=eq.${encodeURIComponent(n.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({email_sent_at:now,email_attempts:Number(n.email_attempts||0)+1,email_last_error:null})});
    return reply(200,{ok:true,sent:rows.length,email_id:ed.id||null});
  }catch(error){console.error('support-notification-digest',error);return reply(500,{ok:false,error:error.message||'Error'})}
};