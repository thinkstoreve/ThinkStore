'use strict';
const {clean,esc,rows,callout,staffEmail,sendResend,panelUrl,dateText,money,emailShell}=require('./support-mail-ui');
const PANEL=panelUrl();
const detailTable=rows;
const messageBox=(label,text)=>callout(label,text,'blue');
const shell=({eyebrow,title,subtitle,body,buttonLabel='Abrir panel de Soporte',buttonUrl=PANEL})=>emailShell({eyebrow,title,lead:subtitle||'',body,ctaLabel:buttonLabel,ctaUrl:buttonUrl});

async function markNotifications(req,orderId,eventTypes=[]){
  if(!orderId||!eventTypes.length)return;
  const since=new Date(Date.now()-5*60*1000).toISOString();
  const now=new Date().toISOString();
  for(const type of eventTypes){
    try{
      const list=await req(`support_notifications?select=id,email_attempts&order_id=eq.${encodeURIComponent(String(orderId))}&event_type=eq.${encodeURIComponent(type)}&email_sent_at=is.null&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=2`);
      for(const n of list||[]){
        await req(`support_notifications?id=eq.${encodeURIComponent(n.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({email_sent_at:now,email_attempts:Number(n.email_attempts||0)+1,email_last_error:null})});
      }
    }catch(e){console.warn('markNotifications',type,e.message)}
  }
}

async function sendClientEvent({eventType,order,message='',rating=0,comment='',req}){
  const to=clean(process.env.SUPPORT_NOTIFICATION_TO||'soporte@thinkstore.com.ve');
  if(!order||!to)return {ok:false,skipped:true};
  const client=clean(order.client_name)||'Cliente';
  const code=clean(order.code)||'Orden de servicio';
  const device=clean(order.device_model)||'Equipo';
  const when=dateText(new Date());
  let subject='',mail=null,types=[eventType],text='';

  if(eventType==='quote_approved'){
    subject=`Cotización aprobada · ${client} · ${code}`;
    mail=staffEmail({eyebrow:'COTIZACIÓN APROBADA',title:'El cliente autorizó la reparación',lead:`${client} aprobó la cotización de ${device}.`,code,body:
      rows([['Cliente',client],['Equipo',device],['Monto aprobado',money(order.quote_currency,order.quote_amount)],['Fecha de aprobación',when]])+
      callout('Reparación autorizada',order.quote_repair_details||'','green')+
      callout('Comentario del cliente',comment||order.quote_client_comment||'','blue'),
      ctaLabel:'Abrir orden y continuar reparación',ctaUrl:panelUrl()});
    text=`Cotización aprobada\nCliente: ${client}\nOrden: ${code}\nEquipo: ${device}\nMonto: ${money(order.quote_currency,order.quote_amount)}\nPanel: ${panelUrl()}`;
    if(clean(comment))types.push('client_message');
  }else if(eventType==='quote_rejected'){
    subject=`Cotización no aprobada · ${client} · ${code}`;
    mail=staffEmail({eyebrow:'COTIZACIÓN NO APROBADA',title:'El cliente no aprobó la cotización',lead:`${client} registró su decisión sobre la reparación de ${device}.`,code,body:
      rows([['Cliente',client],['Equipo',device],['Monto cotizado',money(order.quote_currency,order.quote_amount)],['Fecha',when]])+
      callout('Reparación propuesta',order.quote_repair_details||'','amber')+
      callout('Comentario del cliente',comment||order.quote_client_comment||'','blue'),
      ctaLabel:'Abrir orden y revisar siguientes pasos',ctaUrl:panelUrl()});
    text=`Cotización no aprobada\nCliente: ${client}\nOrden: ${code}\nEquipo: ${device}\nMonto: ${money(order.quote_currency,order.quote_amount)}\nComentario: ${clean(comment||order.quote_client_comment)}\nPanel: ${panelUrl()}`;
  }else if(eventType==='client_message'){
    subject=`Nuevo mensaje de ${client} · ${code}`;
    mail=staffEmail({eyebrow:'MENSAJE DEL CLIENTE',title:'Tienes un nuevo mensaje',lead:`${client} escribió desde el seguimiento seguro de ${device}.`,code,body:
      rows([['Cliente',client],['Equipo',device],['Estado',order.status||''],['Recibido',when]])+callout('Mensaje recibido',message,'blue'),
      ctaLabel:'Abrir conversación y responder',ctaUrl:panelUrl()});
    text=`Nuevo mensaje del cliente\nCliente: ${client}\nOrden: ${code}\nEquipo: ${device}\nMensaje: ${clean(message)}\nPanel: ${panelUrl()}`;
  }else if(eventType==='client_review'){
    subject=`Nueva reseña ${rating||''}★ · ${client} · ${code}`;
    mail=staffEmail({eyebrow:'RESEÑA DEL CLIENTE',title:'Nueva evaluación del servicio',lead:`${client} calificó la atención de ${device}.`,code,body:
      rows([['Cliente',client],['Equipo',device],['Calificación',rating?`${rating} de 5 estrellas`:'' ],['Recibida',when]])+callout('Comentario de la reseña',comment,rating<=2?'amber':'green'),
      ctaLabel:'Abrir orden en Soporte',ctaUrl:panelUrl()});
    text=`Nueva reseña\nCliente: ${client}\nOrden: ${code}\nEquipo: ${device}\nCalificación: ${rating}/5\nComentario: ${clean(comment)}\nPanel: ${panelUrl()}`;
  }else return {ok:false,skipped:true};

  const data=await sendResend({to,subject,html:mail,text});
  if(typeof req==='function')await markNotifications(req,order.id,types);
  return {ok:true,id:data.id||null};
}

module.exports={sendClientEvent,markNotifications,shell,detailTable,messageBox,clean,esc,PANEL};
