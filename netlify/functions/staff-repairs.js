'use strict';
// Read and collect Service Center repairs from ThinkStore Staff.
// Finance source of truth remains the independent SUPABASE de Soporte.
const {authenticateInternal}=require('./staff-auth-core');
const {getRate}=require('./fx-rate-core');
const {account,paymentPlan,canAccessRepairs,round}=require('./staff-repairs-core');
const H={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const result=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
const clean=(v,n=400)=>String(v??'').trim().slice(0,n);
const validOrderId=v=>/^[0-9]+$/.test(String(v||''))||/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
function supportConfig(){return{
  url:clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/$/,''),
  key:clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY)
}}
async function rest(conf,table,query={},options={}){
  const url=new URL(conf.url+'/rest/v1/'+table);
  Object.entries(query).forEach(([k,v])=>{if(v!==null&&v!==undefined)url.searchParams.set(k,String(v))});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),13500);
  try{
    const r=await fetch(url,{...options,signal:controller.signal,headers:{apikey:conf.key,Authorization:'Bearer '+conf.key,'Content-Type':'application/json',...(options.headers||{})}});
    const body=await r.json().catch(()=>null);
    if(!r.ok){const e=Error(clean(body?.message||body?.error||`Soporte respondió ${r.status}`));e.status=r.status;throw e;}
    return body;
  }finally{clearTimeout(timer)}
}
const FIELDS='id,code,client_name,client_phone,client_email,device_model,device_type,serial_imei,reported_issue,status,quote_amount,quote_currency,quote_status,payment_status,amount_paid,payment_method,payment_notes,paid_at,created_at,updated_at,delivered_at,warranty_days,delivery_method';
async function ordersList(conf){
  const orders=[];const chunk=350;const max=1750;
  for(let offset=0;offset<max;offset+=chunk){
    const rows=await rest(conf,'service_orders',{select:FIELDS,order:'created_at.desc',limit:chunk,offset});
    orders.push(...rows);if(rows.length<chunk)break;
  }
  return{orders,partial:orders.length>=max};
}
async function getOrder(conf,id){const rows=await rest(conf,'service_orders',{select:FIELDS,id:`eq.${id}`,limit:1});return rows?.[0]||null;}
exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:H,body:''};
  if(!['GET','POST'].includes(event.httpMethod))return result(405,{ok:false,error:'Método no permitido'});
  const actor=await authenticateInternal(event);
  if(!canAccessRepairs(actor,event.httpMethod==='POST'))return result(403,{ok:false,error:'Esta cuenta no tiene permisos para gestionar cobros de reparaciones.'});
  const conf=supportConfig();
  if(!conf.url||!conf.key||!/^https:\/\/.+\.supabase\.co$/.test(conf.url))return result(503,{ok:false,error:'Falta configurar SUPPORT_SUPABASE_URL y SUPPORT_SUPABASE_SERVICE_ROLE_KEY en Netlify Main. Comprueba el Supabase independiente de Soporte.'});
  try{
    if(event.httpMethod==='GET'){
      const selectedId=clean(event.queryStringParameters?.order_id,50);
      if(selectedId){
        if(!validOrderId(selectedId))return result(400,{ok:false,error:'Orden inválida'});
        const order=await getOrder(conf,selectedId);
        if(!order)return result(404,{ok:false,error:'Orden no encontrada'});
        let events=[],historyAvailable=true;
        try{events=await rest(conf,'service_payment_events',{select:'id,event_type,amount_delta,balance_after,payment_method,reference,notes,occurred_at',service_order_id:`eq.${selectedId}`,order:'occurred_at.desc',limit:100})}catch(e){if([404,400].includes(e.status))historyAvailable=false;else throw e;}
        return result(200,{ok:true,order,account:account(order),events,history_available:historyAvailable});
      }
      const data=await ordersList(conf);
      return result(200,{ok:true,...data,refreshed_at:new Date().toISOString()});
    }
    let b;try{b=JSON.parse(event.body||'{}')}catch{return result(400,{ok:false,error:'Solicitud inválida'})}
    if(b.action!=='pay')return result(400,{ok:false,error:'Acción no autorizada'});
    const id=clean(b.order_id,50);
    if(!validOrderId(id))return result(400,{ok:false,error:'ID de reparación inválido'});
    const current=await getOrder(conf,id);
    if(!current)return result(404,{ok:false,error:'Reparación no encontrada'});
    // Enterprise relies on this immutable payment-event trail. Never charge silently without it.
    try { await rest(conf,'service_payment_events',{select:'id',limit:1}); }
    catch(e){if([400,404].includes(e.status))return result(409,{ok:false,error:'Falta activar el historial de abonos en el Supabase de Soporte (MIGRACION-SOPORTE-V8.8.5-HISTORIAL-ABONOS-ENTERPRISE.sql). No se registró ningún cobro.'});throw e;}
    // A source-verified rate is ALWAYS fetched at checkout on the server.
    const isBs=['Efectivo Bs','Pago Móvil','Transferencia Bs','Punto de venta Bs'].includes(b.method);
    let bcv=null;
    if(isBs)bcv=await getRate(true);
    const p=paymentPlan(current,b,bcv);
    const comment=clean(b.note,300);
    const description=`Cobro Staff: ${p.method} · ${p.currency==='VES'?'Bs.':'USD'} ${p.amount.toFixed(2)} · equiv. USD ${p.equivalent.toFixed(2)}${p.rate?` · BCV ${p.rate}, vigencia ${p.bcv_effective_date}`:''}${p.reference?' · Ref. '+p.reference:''}${comment?' · '+comment:''} · ${actor.email}`;
    // V8.8.8: el pago se confirma dentro del Supabase de Soporte junto al consumo de repuestos.
    // Si al completar el saldo falta stock, el RPC falla y NO modifica el cobro.
    let atomic;
    try{
      atomic=await rest(conf,'rpc/ts_service_record_payment_atomic',{}, {method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
        p_order_code:current.code,p_amount_delta:p.equivalent,p_payment_method:p.method,p_reference:p.reference||null,p_notes:description,p_actor_email:actor.email||'',
        p_currency:p.currency,p_original_amount:p.amount,p_bcv_rate:p.rate||null,p_bcv_effective_date:p.bcv_effective_date||null
      })});
    }catch(e){
      if([400,404].includes(e.status)||/function|rpc|schema cache/i.test(String(e.message||'')))return result(409,{ok:false,error:'Falta activar el cierre automático V8.8.8 en el Supabase de Soporte. Ejecuta los 4 SQL antes de cobrar.'});
      throw e;
    }
    const updated=await getOrder(conf,id);
    if(!updated)return result(409,{ok:false,error:'El pago se procesó, pero no pude volver a leer la orden. Revisa Soporte antes de repetir el cobro.'});
    // El trigger service_payment_events registra el delta de manera auditable.
    let audited=true;
    try{await rest(conf,'service_order_notes',{}, {method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:id,note:description,visibility:'internal',author_name:actor.email||'Staff',note_type:'Cobranza Staff',status_after:current.status})})}catch(e){audited=false;console.warn('Soporte cobranzas: nota de bitácora no registrada',e.message)}
    let emailSent=false;
    if(atomic?.fully_paid&&updated.client_email&&process.env.RESEND_API_KEY){
      try{const tracking=`https://thinkstore.com.ve/soporte/seguimiento.html?orden=${encodeURIComponent(updated.code)}`;const er=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.FROM_SOPORTE_EMAIL||'ThinkStore Soporte <soporte@thinkstore.com.ve>',to:updated.client_email,reply_to:process.env.REPLY_TO_SOPORTE||'soporte@thinkstore.com.ve',subject:`Pago recibido · ${updated.code} · ThinkStore`,html:`<div style="font-family:-apple-system,BlinkMacSystemFont,Arial;color:#1d1d1f;max-width:620px;margin:auto;padding:28px"><h2>Pago recibido</h2><p>Hola <b>${clean(updated.client_name,120)}</b>, el pago de la reparación <b>${clean(updated.code,80)}</b> fue completado correctamente.</p><p>Equipo: <b>${clean(updated.device_model,140)}</b></p><p>La reparación mantiene su estado técnico <b>${clean(updated.status,80)}</b>; el cobro no cambia automáticamente el equipo a listo para entregar.</p><p><a href="${tracking}">Consultar seguimiento</a></p></div>`})});emailSent=er.ok}catch(e){console.warn('Correo de pago de Soporte no enviado',e.message)}}
    return result(200,{ok:true,payment:{...p,status:atomic?.payment_status||p.status,pending:Number(atomic?.pending??p.pending)},order:updated,note_saved:audited,fully_paid:Boolean(atomic?.fully_paid),inventory:atomic?.inventory||null,delivery_note_ready:Boolean(atomic?.delivery_note_ready),email_sent:emailSent});
  }catch(e){console.error('[staff-repairs]',e?.message);const code=e?.status>=400&&e.status<500?e.status:500;return result(code,{ok:false,error:clean(e?.message||'No se pudo consultar Soporte')})}
};
