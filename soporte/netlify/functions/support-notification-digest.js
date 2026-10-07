const {shell,detailTable,messageBox,clean,esc,PANEL}=require('./support-email-core');
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const meta=t=>({appointment_new:['Cita web','Nueva cita recibida'],appointment_updated:['Cita web','Cita actualizada'],client_message:['Mensaje del cliente','Nuevo mensaje'],client_review:['Reseña del cliente','Nueva reseña'],quote_approved:['Cotización aprobada','Cliente autorizó reparación'],order_ready:['Equipo listo','Listo para entregar'],order_status:['Cambio de estado','Estado actualizado']}[t]||['Soporte','Nueva notificación']);

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
    const instantGraceMs=120000;
    const pending=(rows||[]).filter(n=>!(n.event_type==='appointment_new'&&Date.now()-new Date(n.created_at).getTime()<instantGraceMs));
    if(!pending.length)return reply(200,{ok:true,sent:0});

    const cards=pending.map(n=>{
      const [group,label]=meta(n.event_type); const md=n.metadata||{};
      const client=md.client_name||''; const order=md.order_code||''; const device=md.device_model||'';
      return `<div style="padding:18px 0;border-bottom:1px solid #ececf0"><div style="font-size:10px;font-weight:800;letter-spacing:.11em;color:#1478dc;text-transform:uppercase">${esc(group)}</div><div style="font-size:17px;font-weight:780;color:#1d1d1f;margin-top:5px">${esc(n.title||label)}</div>${(client||order||device)?detailTable([['Cliente',client],['Orden',order],['Equipo',device]]):''}${messageBox(n.event_type==='client_message'?'Mensaje':'Detalle',n.message||'')}<div style="font-size:10px;color:#a1a1a6;margin-top:8px">${esc(new Date(n.created_at).toLocaleString('es-VE',{timeZone:'America/Caracas'}))}</div></div>`;
    }).join('');

    const subject=`ThinkStore Soporte · ${pending.length} alerta${pending.length===1?'':'s'} pendiente${pending.length===1?'':'s'}`;
    const html=shell({eyebrow:'RESUMEN DE RESPALDO',title:`${pending.length} novedad${pending.length===1?'':'es'} pendiente${pending.length===1?'':'s'}`,subtitle:'Eventos que no pudieron confirmarse por correo instantáneo o que requieren seguimiento.',buttonLabel:'Abrir Centro de Notificaciones',body:cards});
    const text=pending.map(n=>`- ${n.title||meta(n.event_type)[1]}: ${n.message||''}`).join('\n');
    const from=clean(process.env.SUPPORT_ALERT_FROM||process.env.FROM_SOPORTE_EMAIL||'ThinkStore Servicio Técnico <soporte@thinkstore.com.ve>');
    const er=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,reply_to:process.env.REPLY_TO_SOPORTE||'soporte@thinkstore.com.ve',subject,html,text})});
    const ed=await er.json().catch(()=>({}));if(!er.ok)throw new Error(ed.message||'No se pudo enviar el correo');
    const now=new Date().toISOString();
    for(const n of pending)await req(`support_notifications?id=eq.${encodeURIComponent(n.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({email_sent_at:now,email_attempts:Number(n.email_attempts||0)+1,email_last_error:null})});
    return reply(200,{ok:true,sent:pending.length,email_id:ed.id||null});
  }catch(error){console.error('support-notification-digest',error);return reply(500,{ok:false,error:error.message||'Error'})}
};
