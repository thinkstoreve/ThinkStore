'use strict';

const clean=(v,max=4000)=>String(v??'').trim().slice(0,max);
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function siteRoot(){
  return clean(process.env.THINKSTORE_PUBLIC_URL||'https://thinkstore.com.ve').replace(/\/$/,'');
}
function supportRoot(){
  const explicit=clean(process.env.SUPPORT_PUBLIC_URL||process.env.SOPORTE_PUBLIC_URL);
  return (explicit||`${siteRoot()}/soporte`).replace(/\/$/,'');
}
function logoUrl(){return `${supportRoot()}/assets/thinkstore-logo-white.png`;}
function panelUrl(){return `${supportRoot()}/panel.html`;}
function clientPanelUrl(){return `${siteRoot()}/panel.html#mis_reparaciones`;}
function trackingUrl(order={}){
  const q=new URLSearchParams();
  if(clean(order.code))q.set('orden',clean(order.code));
  if(clean(order.public_token))q.set('token',clean(order.public_token));
  return `${supportRoot()}/seguimiento.html?${q.toString()}`;
}
function deviceLabel(type,model){
  const t=clean(type),m=clean(model);
  if(!t)return m||'Equipo';
  if(!m)return t;
  return m.toLowerCase().includes(t.toLowerCase())?m:`${t} ${m}`;
}
function money(currency,amount){
  const n=Number(amount||0); if(!Number.isFinite(n))return '—';
  const c=clean(currency)||'USD';
  if(c==='VES')return `Bs. ${n.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  return `${c} ${n.toFixed(2)}`;
}
function dateText(value,withTime=true){
  if(!value)return '';
  try{return new Intl.DateTimeFormat('es-VE',withTime?{dateStyle:'medium',timeStyle:'short',timeZone:'America/Caracas'}:{dateStyle:'long',timeZone:'America/Caracas'}).format(new Date(value))}catch{return clean(value)}
}
function appointmentDate(value){
  if(!value)return 'Por confirmar';
  try{return new Intl.DateTimeFormat('es-VE',{day:'2-digit',month:'long',year:'numeric',timeZone:'America/Caracas'}).format(new Date(`${value}T12:00:00-04:00`))}catch{return clean(value)}
}
function appointmentTime(value){
  if(!value)return 'Por confirmar';
  const v=String(value).slice(0,5); const [h,m]=v.split(':').map(Number); if(Number.isNaN(h))return v;
  return `${((h+11)%12)+1}:${String(m||0).padStart(2,'0')} ${h>=12?'p. m.':'a. m.'}`;
}

function rows(items=[]){
  const usable=items.filter(([,v])=>clean(v)); if(!usable.length)return '';
  return `<div class="ts-card"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${usable.map(([k,v])=>`<tr><td class="ts-k">${esc(k)}</td><td class="ts-v">${esc(v)}</td></tr>`).join('')}</table></div>`;
}
function callout(title,text,tone='blue'){
  if(!clean(text))return '';
  const bg=tone==='green'?'#f1fbf5':tone==='amber'?'#fff9ed':'#f3f8ff';
  const border=tone==='green'?'#c9ebd5':tone==='amber'?'#f1dfb2':'#d8e9ff';
  const color=tone==='green'?'#166534':tone==='amber'?'#8a5b00':'#174f8f';
  return `<div style="margin:20px 0;background:${bg};border:1px solid ${border};border-radius:18px;padding:16px 18px"><div style="font-size:11px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:${color};margin-bottom:7px">${esc(title)}</div><div style="font-size:14px;line-height:1.6;color:#292b30;white-space:pre-wrap">${esc(text)}</div></div>`;
}
function paragraph(text){return clean(text)?`<p class="ts-p">${esc(text)}</p>`:'';}
function badge(text,tone='blue'){
  const bg=tone==='green'?'#eaf8ef':tone==='amber'?'#fff5da':'#eaf3ff';
  const fg=tone==='green'?'#176a38':tone==='amber'?'#8a5b00':'#195ca5';
  return `<span style="display:inline-block;background:${bg};color:${fg};border-radius:999px;padding:7px 11px;font-size:11px;font-weight:800;letter-spacing:.02em">${esc(text)}</span>`;
}
function statusPresentation(status){
  const s=clean(status).toLowerCase();
  if(/cotiz/.test(s))return{eyebrow:'COTIZACIÓN',title:'Tu cotización está lista',lead:'Revisa el trabajo propuesto, el monto y las condiciones antes de aprobar.',cta:'Revisar y aprobar cotización',tone:'blue'};
  if(/no aprobado|rechaz|declin/.test(s))return{eyebrow:'DECISIÓN REGISTRADA',title:'Hemos recibido tu decisión',lead:'La cotización no fue aprobada. Nuestro equipo revisará los siguientes pasos contigo.',cta:'Ver seguimiento',tone:'amber'};
  if(/aprob/.test(s))return{eyebrow:'REPARACIÓN AUTORIZADA',title:'Cotización aprobada',lead:'Ya recibimos tu autorización. Tu equipo puede continuar al proceso de reparación.',cta:'Ver seguimiento',tone:'green'};
  if(/diagnóstico disponible|diagnostico disponible|diagnóstico complet|diagnostico complet/.test(s))return{eyebrow:'DIAGNÓSTICO LISTO',title:'Diagnóstico de tu equipo disponible',lead:'El diagnóstico técnico ya está publicado y puedes revisarlo desde tu seguimiento seguro.',cta:'Ver diagnóstico',tone:'blue'};
  if(/diagn/.test(s))return{eyebrow:'DIAGNÓSTICO',title:'Estamos revisando tu equipo',lead:'Nuestro equipo técnico está verificando la falla y documentando el diagnóstico.',cta:'Ver seguimiento',tone:'blue'};
  if(/repar/.test(s))return{eyebrow:'EN REPARACIÓN',title:'Tu equipo está en reparación',lead:'El servicio técnico está avanzando con el trabajo autorizado.',cta:'Ver seguimiento',tone:'blue'};
  if(/repuesto|pieza|espera/.test(s))return{eyebrow:'ACTUALIZACIÓN',title:'Estamos esperando un repuesto',lead:'Tu orden sigue activa. Te avisaremos en cuanto podamos continuar con la reparación.',cta:'Ver seguimiento',tone:'amber'};
  if(/listo/.test(s))return{eyebrow:'EQUIPO LISTO',title:'Tu equipo está listo para entregar',lead:'La reparación finalizó. Revisa el seguimiento y coordina la entrega con nuestro equipo.',cta:'Ver seguimiento',tone:'green'};
  if(/entreg/.test(s))return{eyebrow:'SERVICIO COMPLETADO',title:'Tu servicio fue completado',lead:'Gracias por confiar tu equipo a ThinkStore Servicio Técnico.',cta:'Ver historial de reparación',tone:'green'};
  if(/recib|ingres|recep/.test(s))return{eyebrow:'EQUIPO RECIBIDO',title:'Recibimos tu equipo',lead:'La orden ya está registrada y puedes seguir cada actualización desde tu enlace seguro.',cta:'Ver seguimiento',tone:'blue'};
  return{eyebrow:'ACTUALIZACIÓN DE SERVICIO',title:'Tu reparación tiene una actualización',lead:'Hay nueva información disponible sobre tu orden de Servicio Técnico.',cta:'Ver seguimiento',tone:'blue'};
}

function emailShell({preheader='',eyebrow='SERVICIO TÉCNICO',title,lead='',body='',ctaLabel='',ctaUrl='',code='',footerNote=''}){
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  @media(max-width:620px){.ts-wrap{padding:18px 10px!important}.ts-main{padding:28px 20px!important}.ts-head{padding:24px 20px!important}.ts-title{font-size:29px!important}.ts-v{font-size:13px!important;max-width:190px!important}.ts-btn{display:block!important;text-align:center!important;width:auto!important}.ts-logo{width:170px!important}}
  </style></head><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1d1d1f"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div><div class="ts-wrap" style="padding:34px 14px"><div style="max-width:660px;margin:0 auto;background:#fff;border:1px solid #e8e8ed;border-radius:28px;overflow:hidden;box-shadow:0 14px 42px rgba(0,0,0,.055)"><div class="ts-head" style="background:#0b0b0d;color:#fff;padding:28px 32px"><img class="ts-logo" src="${logoUrl()}" alt="ThinkStore" width="190" style="display:block;width:190px;max-width:70%;height:auto;margin:0 0 22px"><div style="font-size:10px;letter-spacing:.16em;font-weight:800;color:#85bfff;text-transform:uppercase">${esc(eyebrow)}</div><div class="ts-title" style="font-size:31px;line-height:1.08;font-weight:800;letter-spacing:-.04em;margin-top:8px">${esc(title)}</div>${code?`<div style="margin-top:12px;font-size:12px;color:#aab0b8">Orden ${esc(code)}</div>`:''}</div><div class="ts-main" style="padding:34px 32px">${lead?`<p class="ts-p" style="margin:0 0 20px;color:#5f6368;font-size:15px;line-height:1.65">${esc(lead)}</p>`:''}${body}${ctaLabel&&ctaUrl?`<div style="margin:28px 0 8px;text-align:center"><a class="ts-btn" href="${ctaUrl}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;border-radius:999px;padding:14px 24px;font-size:14px;font-weight:800">${esc(ctaLabel)}</a></div>`:''}<div style="border-top:1px solid #ededf0;margin-top:30px;padding-top:20px;text-align:center"><div style="font-size:11px;line-height:1.6;color:#8e8e93">${footerNote?esc(footerNote):'ThinkStore Servicio Técnico · Puedes responder este correo si necesitas ayuda.'}</div><div style="font-size:10px;color:#b0b0b5;margin-top:7px">soporte@thinkstore.com.ve · thinkstore.com.ve</div></div></div></div></div></body></html>`;
}

function appointmentClientEmail(body={},appointment={}){
  const client=clean(body.name)||'Cliente';
  const device=deviceLabel(body.device_type,body.device_model);
  const date=appointmentDate(body.preferred_date),time=appointmentTime(body.preferred_time);
  const html=emailShell({preheader:`Tu cita de Servicio Técnico quedó registrada para ${date}.`,eyebrow:'CITA CONFIRMADA',title:'Tu cita está confirmada',lead:`Hola ${client}. Tu solicitud fue registrada correctamente y ya aparece en nuestra agenda de Servicio Técnico.`,body:
    rows([['Equipo',device],['Servicio',body.service_type],['Fecha',date],['Hora',time],['Modalidad',body.service_mode||'Presencial']])+callout('Motivo de la cita',body.issue||'')+paragraph('Si necesitamos ajustar el horario o solicitar información adicional, te contactaremos antes de la cita.'),ctaLabel:'Ver mis reparaciones',ctaUrl:clientPanelUrl(),code:appointment?.id||'',footerNote:'Si necesitas cambiar algún dato de la cita, responde directamente a este correo.'});
  return{subject:`Cita confirmada · ${device} · ThinkStore`,html,text:`Cita confirmada ThinkStore\n\nHola ${client}.\nEquipo: ${device}\nServicio: ${clean(body.service_type)}\nFecha: ${date}\nHora: ${time}\nModalidad: ${clean(body.service_mode||'Presencial')}\n\nVer mi cuenta: ${clientPanelUrl()}\n\nSoporte: soporte@thinkstore.com.ve`};
}

function statusClientEmail(order={}){
  const isQuote=/cotiz/i.test(`${order.status||''} ${order.quote_status||''}`)||/^enviado$/i.test(clean(order.quote_status));
  const p=isQuote?statusPresentation('Cotización enviada'):statusPresentation(order.status||order.quote_status);
  const url=trackingUrl(order);
  let body=rows([['Equipo',order.device_model||order.device_type],['Estado',order.status],['Orden',order.code],['Garantía',order.warranty_days?`${order.warranty_days} días`:'' ]]);
  if(isQuote){body+=rows([['Monto',money(order.quote_currency,order.quote_amount)]])+callout('Reparación propuesta',order.quote_repair_details||'');}
  else if(order.quote_repair_details)body+=callout('Trabajo registrado',order.quote_repair_details,'blue');
  body+=paragraph('Desde el seguimiento seguro puedes revisar la bitácora, fotografías y mensajes de nuestro equipo técnico.');
  return{subject:isQuote?`Cotización lista · ${order.code} · ThinkStore`:`${p.title} · ${order.code} · ThinkStore`,html:emailShell({preheader:`${p.title} · Orden ${clean(order.code)}`,eyebrow:p.eyebrow,title:p.title,lead:`Hola ${clean(order.client_name)||'Cliente'}. ${p.lead}`,body,ctaLabel:p.cta,ctaUrl:url,code:order.code}),text:`ThinkStore Servicio Técnico\n\n${p.title}\nOrden: ${clean(order.code)}\nEquipo: ${clean(order.device_model||order.device_type)}\nEstado: ${clean(order.status)}${isQuote?`\nMonto: ${money(order.quote_currency,order.quote_amount)}\nReparación: ${clean(order.quote_repair_details)}`:''}\n\nSeguimiento: ${url}\n\nsoporte@thinkstore.com.ve`};
}

function regionReceiptEmail(body={},order={}){
  const client=clean(body.name)||'Cliente';
  const device=deviceLabel(body.category,body.model);
  const html=emailShell({preheader:`Recibimos tu solicitud ${clean(order.code)}.`,eyebrow:'SOLICITUD RECIBIDA',title:'Recibimos tu solicitud de servicio',lead:`Hola ${client}. Registramos tu solicitud desde ${clean(body.city)}, ${clean(body.region)}. Nuestro equipo continuará la coordinación contigo.`,body:rows([['Equipo',device],['Serial / IMEI',body.serial],['Ciudad',body.city],['Estado / región',body.region],['Código',order.code]])+callout('Falla reportada',body.issue||'')+paragraph('Conserva el código de solicitud. Te servirá como referencia cuando nuestro equipo coordine el envío o la recepción del equipo.'),code:order.code,footerNote:'Si necesitas agregar información antes de enviar el equipo, responde directamente a este correo.'});
  return{subject:`Solicitud recibida · ${order.code} · ThinkStore`,html,text:`Solicitud recibida ThinkStore\n\nHola ${client}.\nCódigo: ${clean(order.code)}\nEquipo: ${device}\nCiudad: ${clean(body.city)} · ${clean(body.region)}\nFalla: ${clean(body.issue)}\n\nSoporte: soporte@thinkstore.com.ve`};
}

function staffEmail({eyebrow,title,lead='',body='',ctaLabel='Abrir Soporte',ctaUrl=panelUrl(),code=''}){
  return emailShell({preheader:title,eyebrow,title,lead,body,ctaLabel,ctaUrl,code,footerNote:'Notificación interna de ThinkStore Servicio Técnico.'});
}

async function sendResend({to,subject,html,text='',from,replyTo}){
  const key=clean(process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY); if(!key)throw new Error('Falta RESEND_API_KEY');
  const sender=clean(from||process.env.FROM_SOPORTE_EMAIL||process.env.FROM_SUPPORT_EMAIL||'ThinkStore Servicio Técnico <soporte@thinkstore.com.ve>');
  const reply=clean(replyTo||process.env.REPLY_TO_SOPORTE||process.env.REPLY_TO_SUPPORT||'soporte@thinkstore.com.ve');
  const recipients=Array.isArray(to)?to:[to];
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:sender,to:recipients.map(v=>clean(v)).filter(Boolean),reply_to:reply,subject,html,text})});
  const data=await r.json().catch(()=>({})); if(!r.ok)throw new Error(data.message||data.error||`Resend HTTP ${r.status}`); return data;
}

module.exports={clean,esc,siteRoot,supportRoot,logoUrl,panelUrl,clientPanelUrl,trackingUrl,deviceLabel,money,dateText,appointmentDate,appointmentTime,rows,callout,paragraph,badge,statusPresentation,emailShell,appointmentClientEmail,statusClientEmail,regionReceiptEmail,staffEmail,sendResend};
