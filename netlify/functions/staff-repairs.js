'use strict';
// Read and collect Service Center repairs from ThinkStore Staff.
// Finance source of truth remains the independent SUPABASE de Soporte.
const {authenticateInternal}=require('./staff-auth-core');
const {getRate}=require('./fx-rate-core');
const {account,paymentPlan,canAccessRepairs,round}=require('./staff-repairs-core');
const {render:renderServiceDeliveryNote}=require('./service-delivery-note-template');
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
const FIELDS='*';
async function ordersList(conf){
  const orders=[];const chunk=350;const max=1750;
  for(let offset=0;offset<max;offset+=chunk){
    const rows=await rest(conf,'service_orders',{select:FIELDS,order:'created_at.desc',limit:chunk,offset});
    orders.push(...rows);if(rows.length<chunk)break;
  }
  return{orders,partial:orders.length>=max};
}
async function getOrder(conf,id){const rows=await rest(conf,'service_orders',{select:FIELDS,id:`eq.${id}`,limit:1});return rows?.[0]||null;}

async function orderParts(conf,code){
  try{return await rest(conf,'service_order_parts',{select:'id,order_code,quantity_reserved,quantity_consumed,unit_cost_snapshot,sale_price_snapshot,status,service_parts(name,sku,category)',order_code:`eq.${code}`,status:'neq.released',order:'created_at.asc',limit:100})||[]}catch(e){console.warn('No se pudo leer repuestos de la orden',e.message);return []}
}

async function orderNotes(conf,id){
  try{return await rest(conf,'service_order_notes',{select:'id,note,note_type,work_performed,diagnosis,parts_used,client_notes,visibility,created_at',order_id:`eq.${id}`,order:'created_at.desc',limit:100})||[]}catch(e){console.warn('No se pudo leer detalle técnico de la orden',e.message);return []}
}
async function paymentEvents(conf,id){
  try{return await rest(conf,'service_payment_events',{select:'id,event_type,amount_delta,balance_after,payment_method,reference,notes,occurred_at',service_order_id:`eq.${id}`,order:'occurred_at.desc',limit:100})||[]}catch(e){console.warn('No se pudo leer historial de pagos',e.message);return []}
}

function parsePartsFallback(notes){
  const out=[];
  for(const note of (notes||[])){
    const raw=note?.parts_used;
    if(!raw)continue;
    if(Array.isArray(raw)){
      raw.forEach((item,idx)=>{if(!item)return;out.push({part_name:String(item.name||item.part_name||item.descripcion||'Repuesto').trim(),sku:String(item.sku||'').trim(),quantity_reserved:Number(item.qty||item.quantity||1)||1,sale_price_snapshot:Number(item.sale_price||item.price||item.unit_price||0)||0,status:'consumed',note_source:true,id:`note-${note.id||idx}`});});
      continue;
    }
    try{
      const parsed=typeof raw==='string'?JSON.parse(raw):raw;
      const arr=Array.isArray(parsed)?parsed:[parsed];
      arr.forEach((item,idx)=>{if(!item)return;out.push({part_name:String(item.name||item.part_name||item.descripcion||'Repuesto').trim(),sku:String(item.sku||'').trim(),quantity_reserved:Number(item.qty||item.quantity||1)||1,sale_price_snapshot:Number(item.sale_price||item.price||item.unit_price||0)||0,status:'consumed',note_source:true,id:`note-${note.id||idx}`});});
    }catch(_){
      String(raw).split(/\n|,|;/).map(x=>x.trim()).filter(Boolean).forEach((name,idx)=>out.push({part_name:name,sku:'',quantity_reserved:1,sale_price_snapshot:0,status:'consumed',note_source:true,id:`note-${note.id||idx}`}));
    }
  }
  return out;
}
async function deliveryNoteData(conf,order){
  const [events,parts,notes]=await Promise.all([paymentEvents(conf,order.id),orderParts(conf,order.code),orderNotes(conf,order.id)]);
  return{events,parts,notes,html:renderServiceDeliveryNote({order,events,parts,notes})};
}
async function sendDeliveryNote(order,html){
  if(!order?.client_email)return{sent:false,reason:'no_email'};
  const resend=clean(process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY);
  if(!resend)return{sent:false,reason:'missing_resend'};
  const er=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json'},body:JSON.stringify({
    from:process.env.FROM_SOPORTE_EMAIL||'ThinkStore Soporte <soporte@thinkstore.com.ve>',
    to:order.client_email,
    reply_to:process.env.REPLY_TO_SOPORTE||'soporte@thinkstore.com.ve',
    subject:`Nota de Entrega · ${order.code} · ThinkStore`,
    html:`<div style="background:#f5f5f7;padding:18px">${html}</div>`
  })});
  const data=await er.json().catch(()=>({}));
  if(!er.ok)throw Error(clean(data?.message||'No se pudo enviar la Nota de Entrega'));
  return{sent:true,id:data?.id||null};
}
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
        const notes=await orderNotes(conf,order.id);
        let parts=await orderParts(conf,order.code);
        if(!parts.length)parts=parsePartsFallback(notes);
        return result(200,{ok:true,order,account:account(order),events,parts,notes,history_available:historyAvailable});
      }
      const data=await ordersList(conf);
      return result(200,{ok:true,...data,refreshed_at:new Date().toISOString()});
    }
    let b;try{b=JSON.parse(event.body||'{}')}catch{return result(400,{ok:false,error:'Solicitud inválida'})}
    if(!['pay','view_delivery_note','resend_delivery_note'].includes(b.action))return result(400,{ok:false,error:'Acción no autorizada'});
    const id=clean(b.order_id,50);
    if(!validOrderId(id))return result(400,{ok:false,error:'ID de reparación inválido'});
    let current=await getOrder(conf,id);
    if(!current)return result(404,{ok:false,error:'Reparación no encontrada'});
    if(['view_delivery_note','resend_delivery_note'].includes(b.action)){
      const acc=account(current);
      if(!acc.paidOff)return result(409,{ok:false,error:'La Nota de Entrega se habilita cuando la reparación está completamente pagada.'});
      const note=await deliveryNoteData(conf,current);
      if(b.action==='view_delivery_note')return result(200,{ok:true,html:note.html});
      if(!current.client_email)return result(409,{ok:false,error:'La orden no tiene correo del cliente. La Nota de Entrega sigue disponible para visualizar o imprimir.'});
      const email=await sendDeliveryNote(current,note.html);
      return result(200,{ok:true,email});
    }
    // Enterprise relies on this immutable payment-event trail. Never charge silently without it.
    try { await rest(conf,'service_payment_events',{select:'id',limit:1}); }
    catch(e){if([400,404].includes(e.status))return result(409,{ok:false,error:'Falta activar el historial de abonos en el Supabase de Soporte (MIGRACION-SOPORTE-V8.8.5-HISTORIAL-ABONOS-ENTERPRISE.sql). No se registró ningún cobro.'});throw e;}
    // A source-verified rate is ALWAYS fetched at checkout on the server.
    const isBs=['Efectivo Bs','Pago Móvil','Transferencia Bs','Punto de venta Bs'].includes(b.method);
    let bcv=null;
    if(isBs)bcv=await getRate(true);
    const p=paymentPlan(current,b,bcv);
    const comment=clean(b.note,300);
    const description=`Cobro Staff: ${p.method} · ${p.currency==='VES'?'Bs.':'USD'} ${p.amount.toFixed(2)} · equiv. USD ${p.equivalent.toFixed(2)}${p.rate?` · BCV ${p.rate}, vigencia ${p.bcv_effective_date}`:''}${p.reference?' · Ref. '+p.reference:''}${comment?' · '+comment:''}${p.bootstrap_quote?' · Total final definido al cobrar':''} · ${actor.email}`;
    // Si la orden todavía no tiene cotización, Staff puede fijar el total final en el mismo acto de cobro.
    // Se hace antes del RPC para que el cierre atómico pueda validar el saldo y generar la Nota de Entrega.
    if(p.bootstrap_quote){
      const patched=await rest(conf,'service_orders',{id:`eq.${id}`},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({quote_amount:p.budget,quote_currency:'USD'})});
      if(!Array.isArray(patched)||!patched.length)return result(409,{ok:false,error:'No pude definir el total final de la reparación. No se registró el cobro.'});
      current=patched[0];
    }
    // V8.8.8: el pago se confirma dentro del Supabase de Soporte junto al consumo de repuestos.
    // Si al completar el saldo falta stock, el RPC falla y NO modifica el cobro.
    let atomic;
    try{
      atomic=await rest(conf,'rpc/ts_service_record_payment_atomic',{}, {method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
        p_order_code:current.code,p_amount_delta:p.equivalent,p_payment_method:p.method,p_reference:p.reference||null,p_notes:description,p_actor_email:actor.email||'',
        p_currency:p.currency,p_original_amount:p.amount,p_bcv_rate:p.rate||null,p_bcv_effective_date:p.bcv_effective_date||null
      })});
    }catch(e){
      if(e.status===404||/function|rpc|schema cache|does not exist/i.test(String(e.message||'')))return result(409,{ok:false,error:'Falta activar el cierre automático V8.8.8 en el Supabase de Soporte. Ejecuta los 4 SQL antes de cobrar.'});
      throw e;
    }
    const atomicState=Array.isArray(atomic)?(atomic[0]||{}):(atomic||{});
    let updated=await getOrder(conf,id);
    if(!updated)return result(409,{ok:false,error:'El pago se procesó, pero no pude volver a leer la orden. Revisa Soporte antes de repetir el cobro.'});
    // V15.10: PostgREST puede devolver el RPC como objeto o arreglo de una fila.
    // Normalizamos ambas formas para que App Ventas marque siempre “Pagado” al cerrar el saldo.
    if(atomicState.fully_paid&&String(updated.payment_status||'').toLowerCase()!=='pagado'){
      try{
        const normalized=await rest(conf,'service_orders',{id:`eq.${id}`},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({payment_status:'Pagado',paid_at:updated.paid_at||new Date().toISOString()})});
        if(Array.isArray(normalized)&&normalized[0])updated=normalized[0];
      }catch(e){console.warn('No se pudo normalizar el estado Pagado',e.message)}
    }
    // El trigger service_payment_events registra el delta de manera auditable.
    let audited=true;
    try{await rest(conf,'service_order_notes',{}, {method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:id,note:description,visibility:'internal',author_name:actor.email||'Staff',note_type:'Cobranza Staff',status_after:current.status})})}catch(e){audited=false;console.warn('Soporte cobranzas: nota de bitácora no registrada',e.message)}
    let deliveryNoteEmail={sent:false};
    if(atomicState.fully_paid){
      try{
        const note=await deliveryNoteData(conf,updated);
        deliveryNoteEmail=await sendDeliveryNote(updated,note.html);
      }catch(e){console.warn('Nota de Entrega de Soporte no enviada',e.message);deliveryNoteEmail={sent:false,error:e.message}}
    }
    const notes=await orderNotes(conf,updated.id);
    let parts=await orderParts(conf,updated.code);
    if(!parts.length)parts=parsePartsFallback(notes);
    return result(200,{ok:true,payment:{...p,status:atomicState.fully_paid?'Pagado':(atomicState.payment_status||p.status),pending:Number(atomicState.pending??p.pending)},order:updated,parts,notes,note_saved:audited,fully_paid:Boolean(atomicState.fully_paid),inventory:atomicState.inventory||null,delivery_note_ready:Boolean(atomicState.delivery_note_ready),email_sent:Boolean(deliveryNoteEmail?.sent),delivery_note_email:deliveryNoteEmail});
  }catch(e){console.error('[staff-repairs]',e?.message);const code=e?.status>=400&&e.status<500?e.status:500;return result(code,{ok:false,error:clean(e?.message||'No se pudo consultar Soporte')})}
};
