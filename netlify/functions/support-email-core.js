const clean=v=>String(v??'').trim();
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LOGO='https://soporte.thinkstore.com.ve/assets/thinkstore-logo-white.png';
const PANEL='https://soporte.thinkstore.com.ve/panel.html';

const money=(currency,amount)=>{
  const n=Number(amount||0);
  if(!n)return '—';
  const c=clean(currency)||'USD';
  return `${c} ${n.toFixed(2)}`;
};
const dateText=value=>{
  try{return new Intl.DateTimeFormat('es-VE',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Caracas'}).format(new Date(value||Date.now()))}catch{return clean(value)||''}
};

function shell({eyebrow,title,subtitle,body,buttonLabel='Abrir panel de Soporte',buttonUrl=PANEL}){
  return `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1d1d1f"><div style="padding:32px 14px"><div style="max-width:680px;margin:auto;background:#fff;border:1px solid #e6e7eb;border-radius:30px;overflow:hidden;box-shadow:0 18px 48px rgba(0,0,0,.06)"><div style="background:#08090b;color:#fff;padding:28px 30px"><img src="${LOGO}" alt="ThinkStore" width="190" style="display:block;width:190px;max-width:65%;height:auto;margin:0 0 22px"><div style="font-size:10px;letter-spacing:.16em;font-weight:800;color:#72b7ff;text-transform:uppercase">${esc(eyebrow)}</div><div style="font-size:28px;line-height:1.06;font-weight:800;letter-spacing:-.04em;margin-top:8px">${esc(title)}</div>${subtitle?`<div style="font-size:13px;line-height:1.55;color:#b8bec7;margin-top:8px">${esc(subtitle)}</div>`:''}</div><div style="padding:28px 30px">${body}<div style="text-align:center;margin-top:28px"><a href="${buttonUrl}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;border-radius:999px;padding:14px 24px;font-size:14px;font-weight:750">${esc(buttonLabel)}</a></div><p style="margin:26px 0 0;text-align:center;color:#a1a1a6;font-size:10px;line-height:1.5">ThinkStore Servicio Técnico · Notificación automática para soporte@thinkstore.com.ve</p></div></div></div></body></html>`;
}

const detailTable=rows=>`<div style="margin:20px 0;background:#f7f7f9;border:1px solid #ececf0;border-radius:20px;padding:15px 18px"><table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px">${rows.filter(r=>clean(r[1])).map(([k,v])=>`<tr><td style="padding:7px 0;color:#7b7b80;vertical-align:top">${esc(k)}</td><td style="padding:7px 0;text-align:right;font-weight:700;color:#1d1d1f;vertical-align:top">${esc(v)}</td></tr>`).join('')}</table></div>`;
const messageBox=(label,text)=>clean(text)?`<div style="margin:20px 0"><div style="font-size:10px;letter-spacing:.12em;color:#6e6e73;font-weight:800;text-transform:uppercase;margin-bottom:8px">${esc(label)}</div><div style="background:#f2f2f7;border-radius:20px;padding:16px 18px;font-size:14px;line-height:1.6;color:#24262b;white-space:pre-wrap">${esc(text)}</div></div>`:'';
const repairBox=text=>clean(text)?`<div style="margin:20px 0"><div style="font-size:10px;letter-spacing:.12em;color:#6e6e73;font-weight:800;text-transform:uppercase;margin-bottom:8px">REPARACIÓN PROPUESTA</div><div style="border-left:4px solid #0071e3;background:#f7fbff;border-radius:0 18px 18px 0;padding:15px 17px;font-size:14px;line-height:1.6;color:#24262b">${esc(text)}</div></div>`:'';

async function markNotifications(req,orderId,eventTypes=[]){
  if(!orderId||!eventTypes.length)return;
  const since=new Date(Date.now()-5*60*1000).toISOString();
  const now=new Date().toISOString();
  for(const type of eventTypes){
    try{
      const rows=await req(`support_notifications?select=id,email_attempts&order_id=eq.${encodeURIComponent(String(orderId))}&event_type=eq.${encodeURIComponent(type)}&email_sent_at=is.null&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=2`);
      for(const n of rows||[]){
        await req(`support_notifications?id=eq.${encodeURIComponent(n.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({email_sent_at:now,email_attempts:Number(n.email_attempts||0)+1,email_last_error:null})});
      }
    }catch(e){console.warn('markNotifications',type,e.message)}
  }
}

async function sendClientEvent({eventType,order,message='',rating=0,comment='',req}){
  const resend=clean(process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY);
  const to=clean(process.env.SUPPORT_NOTIFICATION_TO||'soporte@thinkstore.com.ve');
  if(!resend||!order||!to)return {ok:false,skipped:true};

  const client=clean(order.client_name)||'Cliente';
  const code=clean(order.code)||'Orden de servicio';
  const device=clean(order.device_model)||'Equipo';
  const when=dateText(new Date());
  let subject='',html='',text='',types=[eventType];

  if(eventType==='quote_approved'){
    subject=`Cotización aprobada · ${client} · ${code}`;
    html=shell({eyebrow:'COTIZACIÓN APROBADA',title:'El cliente autorizó la reparación',subtitle:`${client} aprobó la cotización de ${device}.`,buttonLabel:'Abrir orden y continuar reparación',body:
      `<div style="font-size:15px;line-height:1.6;color:#4e535b">La reparación ya cuenta con autorización del cliente. Revisa el alcance aprobado antes de continuar.</div>`+
      detailTable([['Cliente',client],['Orden',code],['Equipo',device],['Monto aprobado',money(order.quote_currency,order.quote_amount)],['Fecha de aprobación',when]])+
      repairBox(order.quote_repair_details)+
      messageBox('Comentario del cliente',comment||order.quote_client_comment||'')});
    text=`COTIZACIÓN APROBADA\nCliente: ${client}\nOrden: ${code}\nEquipo: ${device}\nMonto: ${money(order.quote_currency,order.quote_amount)}\nReparación: ${clean(order.quote_repair_details)||'-'}\nComentario: ${clean(comment||order.quote_client_comment)||'-'}\nPanel: ${PANEL}`;
    if(clean(comment))types.push('client_message');
  }else if(eventType==='client_message'){
    subject=`Nuevo mensaje de ${client} · ${code}`;
    html=shell({eyebrow:'MENSAJE DEL CLIENTE',title:'Tienes un nuevo mensaje',subtitle:`${client} escribió desde el seguimiento seguro de ${device}.`,buttonLabel:'Abrir conversación y responder',body:
      detailTable([['Cliente',client],['Orden',code],['Equipo',device],['Estado',order.status||''],['Recibido',when]])+
      messageBox('Mensaje recibido',message)});
    text=`NUEVO MENSAJE DEL CLIENTE\nCliente: ${client}\nOrden: ${code}\nEquipo: ${device}\nMensaje: ${clean(message)}\nPanel: ${PANEL}`;
  }else if(eventType==='client_review'){
    subject=`Nueva reseña ${rating||''}★ · ${client} · ${code}`;
    html=shell({eyebrow:'RESEÑA DEL CLIENTE',title:'Nueva evaluación del servicio',subtitle:`${client} calificó la atención de ${device}.`,buttonLabel:'Abrir orden en Soporte',body:
      detailTable([['Cliente',client],['Orden',code],['Equipo',device],['Calificación',rating?`${rating} de 5 estrellas`:''],['Recibida',when]])+
      messageBox('Comentario de la reseña',comment)});
    text=`NUEVA RESEÑA\nCliente: ${client}\nOrden: ${code}\nEquipo: ${device}\nCalificación: ${rating}/5\nComentario: ${clean(comment)}\nPanel: ${PANEL}`;
  }else return {ok:false,skipped:true};

  const from=clean(process.env.SUPPORT_ALERT_FROM||'ThinkStore Alertas <info@thinkstore.com.ve>');
  const er=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,reply_to:process.env.REPLY_TO_SOPORTE||'soporte@thinkstore.com.ve',subject,html,text})});
  const data=await er.json().catch(()=>({}));
  if(!er.ok)throw new Error(data.message||'No se pudo enviar la alerta de soporte');
  if(typeof req==='function')await markNotifications(req,order.id,types);
  return {ok:true,id:data.id||null};
}

module.exports={sendClientEvent,shell,detailTable,messageBox,repairBox,esc,clean,LOGO,PANEL,dateText,money};
