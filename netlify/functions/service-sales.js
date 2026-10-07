'use strict';

const H={
  'Content-Type':'application/json; charset=utf-8',
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization,content-type',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Cache-Control':'no-store'
};
const DEFAULT_PERMS={
  cliente:['cuenta','mis_pedidos','mis_reparaciones','garantias','puntos'],
  vendedor:['dashboard','ventas','cotizaciones','clientes','pagos','preordenes','crm','recomendaciones','staff.access'],
  recepcion:['dashboard','recepcion','clientes','tickets','garantias','citas'],
  soporte:['dashboard','recepcion','clientes','tickets','garantias','citas'],
  tecnico:['dashboard','tecnico','diagnostico','repuestos','pruebas','garantias'],
  logistica:['dashboard','logistica','guias','entregas','pedidos','preordenes'],
  admin:['*'],superadmin:['*']
};
const clean=(v,max=1200)=>String(v??'').trim().slice(0,max);
const normRole=v=>{let r=clean(v).toLowerCase().replace(/[ -]+/g,'_');if(r==='super_admin')r='superadmin';if(r==='administrator'||r==='gerente')r='admin';return r||'cliente'};
const out=(statusCode,body,headers={})=>({statusCode,headers:{...H,...headers},body:typeof body==='string'?body:JSON.stringify(body)});
const svc=k=>({apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'});
const paymentCurrency=method=>{
  const m=clean(method).toLowerCase();
  if(/pago\s*m[oó]vil|punto\s*de\s*venta|\bpos\b|efectivo\s*bs|transferencia\s*bs|bol[ií]var/.test(m))return'VES';
  if(/eur|euro/.test(m))return'EUR';
  if(/usdt|binance|tether/.test(m))return'USDT';
  return'USD';
};
const caracasKey=v=>{
  const d=v?new Date(v):new Date(); if(Number.isNaN(d.getTime()))return'';
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
};
const money=n=>Math.round(Number(n||0)*100)/100;

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:H,body:''};
  if(!['GET','POST'].includes(event.httpMethod))return out(405,{ok:false,error:'Método no permitido'});

  const mainUrl=clean(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL).replace(/\/$/,'');
  const mainKey=clean(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY);
  const supportUrl=clean(process.env.SUPPORT_SUPABASE_URL||process.env.SUPABASE_SUPPORT_URL||process.env.SOPORTE_SUPABASE_URL).replace(/\/$/,'');
  const supportKey=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY||process.env.SUPABASE_SUPPORT_SERVICE_ROLE_KEY||process.env.SOPORTE_SUPABASE_SERVICE_ROLE_KEY);
  if(!mainUrl||!mainKey)return out(500,{ok:false,error:'Supabase principal no está configurado'});
  if(!supportUrl||!supportKey)return out(503,{ok:false,error:'Falta conectar el Supabase de Soporte en Netlify (SUPPORT_SUPABASE_URL y SUPPORT_SUPABASE_SERVICE_ROLE_KEY).'});

  const auth=await authenticate(event,mainUrl,mainKey);
  if(!auth.ok)return out(401,{ok:false,error:'Inicia sesión con una cuenta interna de ThinkStore'});
  if(auth.profile?.is_internal!==true)return out(403,{ok:false,error:'Esta cuenta pertenece a un cliente y no tiene acceso a caja.'});
  const access=await effectiveAccess(auth.profile,mainUrl,mainKey);
  const canOpen=access.permissions.includes('*')||access.permissions.includes('staff.access');
  const canCharge=access.permissions.includes('*')||access.permissions.includes('ventas')||access.permissions.includes('pagos');
  if(!canOpen)return out(403,{ok:false,error:'Tu cuenta no tiene acceso a App Ventas.'});

  if(event.httpMethod==='GET'){
    const action=clean(event.queryStringParameters?.action||'bootstrap').toLowerCase();
    if(action==='note'){
      if(!canCharge)return out(403,{ok:false,error:'Tu rol no puede visualizar notas de entrega de reparaciones.'});
      const code=clean(event.queryStringParameters?.code,120);
      const order=await getSupportOrder(supportUrl,supportKey,code);
      if(!order)return out(404,{ok:false,error:'No encontré esa reparación.'});
      if(!isPaid(order))return out(409,{ok:false,error:'La nota de entrega se habilita cuando la reparación está pagada.'});
      const note=await buildServiceNote(order,supportUrl,supportKey);
      return out(200,{ok:true,code:order.code,html:note.html});
    }
    if(action!=='bootstrap')return out(400,{ok:false,error:'Acción no soportada'});
    try{
      const data=await bootstrapData(mainUrl,mainKey,supportUrl,supportKey,canCharge);
      return out(200,{ok:true,can_charge:canCharge,user:{id:auth.user_id,email:auth.email,name:auth.profile?.full_name||auth.profile?.nombre||auth.email,role:access.base_role},...data});
    }catch(error){
      console.error('service-sales bootstrap',error);
      return out(500,{ok:false,error:error?.message||'No se pudo cargar Servicio Técnico en Ventas'});
    }
  }

  if(!canCharge)return out(403,{ok:false,error:'Tu rol no tiene permiso para registrar cobros.'});
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return out(400,{ok:false,error:'JSON inválido'})}
  const action=clean(body.action).toLowerCase();
  const code=clean(body.code,120).toUpperCase();
  if(!code)return out(400,{ok:false,error:'Código de reparación requerido'});
  const order=await getSupportOrder(supportUrl,supportKey,code);
  if(!order)return out(404,{ok:false,error:'No encontré esa reparación.'});

  if(action==='resend_note'){
    if(!isPaid(order))return out(409,{ok:false,error:'La reparación todavía no está pagada.'});
    const note=await buildServiceNote(order,supportUrl,supportKey);
    const email=await sendDeliveryNote(order,note.html);
    await logSupportNote(supportUrl,supportKey,order,auth,`Nota de entrega reenviada a ${order.client_email||'cliente'}${email.sent?'':' · ERROR: '+email.error}`,'Nota de entrega');
    return out(email.sent?200:502,{ok:email.sent,order:publicOrder(order),email});
  }

  if(!['payment','mark_paid'].includes(action))return out(400,{ok:false,error:'Acción no soportada'});
  const quote=Math.max(0,Number(order.quote_amount||0));
  const before=Math.max(0,Number(order.amount_paid||0));
  const balance=Math.max(0,quote-before);
  if(action==='mark_paid'&&!(quote>0))return out(409,{ok:false,error:'Primero define el valor de la reparación / cotización en Soporte.'});

  let delta=action==='mark_paid'?balance:Math.max(0,Number(body.amount_usd||0));
  if(!(delta>0))return out(400,{ok:false,error:action==='mark_paid'?'La reparación ya está pagada.':'Indica el monto del abono.'});
  if(quote>0)delta=Math.min(delta,balance);
  const next=money(before+delta);
  const paid=quote>0?next+0.0001>=quote:false;
  const method=clean(body.payment_method,120)||clean(order.payment_method,120)||'Efectivo USD';
  const currency=clean(body.currency,12)||paymentCurrency(method);
  const reference=clean(body.reference,220);
  const originalAmount=clean(body.original_amount,80);
  const userNote=clean(body.notes,700);
  const meta=[
    `Caja / App Ventas · ${auth.profile?.full_name||auth.profile?.nombre||auth.email}`,
    `Método: ${method}`,
    `Moneda: ${currency}`,
    originalAmount?`Monto recibido: ${originalAmount} ${currency}`:'',
    reference?`Referencia: ${reference}`:'',
    userNote
  ].filter(Boolean).join(' · ');

  const patch={
    amount_paid:next,
    payment_status:paid?'Cobrado':'Abono parcial',
    payment_method:method,
    payment_notes:meta,
    paid_at:new Date().toISOString()
  };
  const updated=await patchSupportOrder(supportUrl,supportKey,order.id,patch);
  if(!updated)return out(500,{ok:false,error:'No se pudo actualizar el cobro en Servicio Técnico.'});

  await attachPaymentReference(supportUrl,supportKey,order.id,reference,meta);
  await logSupportNote(
    supportUrl,supportKey,updated,auth,
    `${paid?'Pago total':'Abono'} registrado desde App Ventas: $${delta.toFixed(2)} · ${method} · ${currency}${reference?` · Ref. ${reference}`:''}`,
    paid?'Pago':'Abono'
  );
  await auditSupport(supportUrl,supportKey,auth,updated.id,'cashier_payment',{amount_paid:before,payment_status:order.payment_status||'Pendiente'},{amount_paid:next,payment_status:patch.payment_status,payment_method:method,currency,reference});

  let deliveryNoteEmail={skipped:true,reason:'La nota se envía automáticamente al completar el pago.'};
  let html=null;
  if(paid){
    const note=await buildServiceNote(updated,supportUrl,supportKey);
    html=note.html;
    deliveryNoteEmail=await sendDeliveryNote(updated,note.html);
    await logSupportNote(
      supportUrl,supportKey,updated,auth,
      deliveryNoteEmail.sent
        ?`Nota de entrega generada automáticamente al marcar la reparación como pagada y enviada a ${updated.client_email}.`
        :`Nota de entrega generada al marcar la reparación como pagada. Envío de correo pendiente: ${deliveryNoteEmail.error||'sin correo del cliente'}.`,
      'Nota de entrega'
    );
  }

  const refreshed=await bootstrapData(mainUrl,mainKey,supportUrl,supportKey,true);
  return out(200,{
    ok:true,
    order:publicOrder(updated),
    payment:{delta_usd:delta,balance_before:balance,balance_after:Math.max(0,quote-next),paid,method,currency,reference},
    delivery_note_email:deliveryNoteEmail,
    note_html:html,
    metrics:refreshed.metrics,
    methods:refreshed.methods
  });
};

async function authenticate(event,url,service){
  const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');
  if(!token)return{ok:false};
  const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});
  const u=await ur.json().catch(()=>({}));
  if(!ur.ok||!u?.id)return{ok:false};
  const paths=[
    `profiles?select=*&id=eq.${encodeURIComponent(u.id)}&limit=1`,
    u.email?`profiles?select=*&email=eq.${encodeURIComponent(u.email)}&limit=1`:null,
    u.email?`profiles?select=*&correo=eq.${encodeURIComponent(u.email)}&limit=1`:null
  ].filter(Boolean);
  let p=null;
  for(const path of paths){const rr=await fetch(`${url}/rest/v1/${path}`,{headers:svc(service)});if(!rr.ok)continue;const rows=await rr.json().catch(()=>[]);if(rows?.[0]){p=rows[0];break}}
  if(!p||(p.active??p.activo??true)===false)return{ok:false};
  return{ok:true,user_id:u.id,email:u.email||p.email||p.correo||'',profile:p,role:normRole(p.role||p.rol)};
}
async function effectiveAccess(profile,url,service){
  const base=normRole(profile?.role||profile?.rol);
  const over=profile?.permission_overrides&&typeof profile.permission_overrides==='object'?profile.permission_overrides:{};
  let permissions=[...(DEFAULT_PERMS[base]||[])];
  if(profile?.custom_role_key){
    const rr=await fetch(`${url}/rest/v1/ts_roles?select=permissions&role_key=eq.${encodeURIComponent(profile.custom_role_key)}&active=eq.true&limit=1`,{headers:svc(service)});
    const rows=await rr.json().catch(()=>[]);if(Array.isArray(rows?.[0]?.permissions))permissions=rows[0].permissions.map(String);
  }
  if(!permissions.includes('*')){
    const allow=Array.isArray(over.allow)?over.allow.map(String):[],deny=Array.isArray(over.deny)?over.deny.map(String):[];
    permissions=[...new Set([...permissions,...allow])].filter(x=>!deny.includes(x));
  }
  return{base_role:base,permissions};
}
async function rest(url,key,path,options={}){
  const rr=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...svc(key),...(options.headers||{})}});
  const data=await rr.json().catch(()=>null);
  if(!rr.ok){const e=new Error(data?.message||data?.error||`Supabase HTTP ${rr.status}`);e.status=rr.status;throw e}
  return data;
}
async function getSupportOrder(url,key,code){
  if(!code)return null;
  const rows=await rest(url,key,`service_orders?select=*&code=ilike.${encodeURIComponent(code)}&limit=1`).catch(()=>[]);
  return Array.isArray(rows)?rows[0]||null:null;
}
async function patchSupportOrder(url,key,id,payload){
  const rows=await rest(url,key,`service_orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
  return Array.isArray(rows)?rows[0]||null:rows;
}
function isPaid(o){
  const quote=Math.max(0,Number(o?.quote_amount||0)),paid=Math.max(0,Number(o?.amount_paid||0));
  return /cobrado|pagado/i.test(clean(o?.payment_status))||(quote>0&&paid+0.0001>=quote);
}
function publicOrder(o){
  const checklist=o?.reception_checklist&&typeof o.reception_checklist==='object'?o.reception_checklist:{};
  const meta=checklist.__client||{};
  const quote=Math.max(0,Number(o?.quote_amount||0)),paid=Math.max(0,Number(o?.amount_paid||0));
  return{
    id:o?.id,code:o?.code,client_name:o?.client_name||'',client_phone:o?.client_phone||'',client_email:o?.client_email||'',
    client_document:meta.document||'',client_address:meta.address_short||'',client_city:meta.city||'',client_state:meta.state||'',
    device_type:o?.device_type||'',device_model:o?.device_model||'',device_color:o?.device_color||'',serial_imei:o?.serial_imei||'',
    reported_issue:o?.reported_issue||'',status:o?.status||'',quote_amount:quote,quote_currency:o?.quote_currency||'USD',
    quote_repair_details:o?.quote_repair_details||'',payment_status:o?.payment_status||'Pendiente',amount_paid:paid,
    balance:Math.max(0,money(quote-paid)),payment_method:o?.payment_method||'',payment_notes:o?.payment_notes||'',
    warranty_days:Number(o?.warranty_days||0),delivery_method:o?.delivery_method||'',updated_at:o?.updated_at||'',created_at:o?.created_at||'',
    paid_at:o?.paid_at||'',paid:isPaid(o)
  };
}
async function bootstrapData(mainUrl,mainKey,supportUrl,supportKey,canCharge){
  const since=new Date(Date.now()-40*60*60*1000).toISOString();
  const [ordersRaw,eventsRaw,productRaw]=await Promise.all([
    rest(supportUrl,supportKey,'service_orders?select=*&order=updated_at.desc&limit=250').catch(()=>[]),
    rest(supportUrl,supportKey,`service_payment_events?select=*&occurred_at=gte.${encodeURIComponent(since)}&order=occurred_at.desc&limit=500`).catch(()=>[]),
    rest(mainUrl,mainKey,`pedidos?select=codigo,estado,total_usd,metodo_pago,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=500`).catch(()=>[])
  ]);
  const orders=(Array.isArray(ordersRaw)?ordersRaw:[]).map(publicOrder);
  const today=caracasKey(new Date());
  const serviceEvents=(Array.isArray(eventsRaw)?eventsRaw:[]).filter(e=>caracasKey(e.occurred_at)===today&&Number(e.amount_delta||0)>0);
  const productRows=(Array.isArray(productRaw)?productRaw:[]).filter(p=>caracasKey(p.created_at)===today&&/pago verificado|preparando|disponible|enviado|entregado|complet|pagado/i.test(clean(p.estado)));
  const serviceTotal=money(serviceEvents.reduce((s,e)=>s+Number(e.amount_delta||0),0));
  const productTotal=money(productRows.reduce((s,p)=>s+Number(p.total_usd||0),0));
  const methodMap=new Map();
  const pushMethod=(method,amount,kind)=>{
    const key=clean(method)||'Sin definir',row=methodMap.get(key)||{method:key,currency:paymentCurrency(key),product_usd:0,service_usd:0,total_usd:0,count:0};
    if(kind==='service')row.service_usd+=Number(amount||0);else row.product_usd+=Number(amount||0);
    row.total_usd+=Number(amount||0);row.count++;methodMap.set(key,row);
  };
  productRows.forEach(p=>pushMethod(p.metodo_pago,p.total_usd,'product'));
  serviceEvents.forEach(e=>pushMethod(e.payment_method,e.amount_delta,'service'));
  const methods=[...methodMap.values()].map(x=>({...x,product_usd:money(x.product_usd),service_usd:money(x.service_usd),total_usd:money(x.total_usd)})).sort((a,b)=>b.total_usd-a.total_usd);
  return{
    can_charge:canCharge,
    orders,
    events_today:serviceEvents.map(e=>({id:e.id,order_code:e.order_code,event_type:e.event_type,amount_delta:Number(e.amount_delta||0),balance_after:Number(e.balance_after||0),payment_method:e.payment_method||'',reference:e.reference||'',notes:e.notes||'',occurred_at:e.occurred_at})),
    metrics:{
      product_sales_today:productRows.length,
      product_collected_today:productTotal,
      service_payments_today:serviceEvents.length,
      service_collected_today:serviceTotal,
      combined_operations_today:productRows.length+serviceEvents.length,
      combined_total_today:money(productTotal+serviceTotal),
      service_pending_count:orders.filter(o=>o.quote_amount>0&&o.balance>0).length,
      service_pending_usd:money(orders.reduce((s,o)=>s+Number(o.balance||0),0))
    },
    methods
  };
}
async function attachPaymentReference(url,key,orderId,reference,notes){
  try{
    const rows=await rest(url,key,`service_payment_events?select=id&service_order_id=eq.${encodeURIComponent(orderId)}&order=occurred_at.desc&limit=1`);
    const id=rows?.[0]?.id;if(!id)return;
    const payload={};if(reference)payload.reference=reference;if(notes)payload.notes=notes;if(!Object.keys(payload).length)return;
    await rest(url,key,`service_payment_events?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
  }catch(error){console.warn('service payment reference',error?.message||error)}
}
async function logSupportNote(url,key,order,auth,note,type){
  try{
    await rest(url,key,'service_order_notes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({
      order_id:order.id,note,visibility:'internal',author_name:auth.profile?.full_name||auth.profile?.nombre||auth.email||'Ventas',note_type:type||'Caja',status_after:order.status||''
    })});
  }catch(error){console.warn('service note',error?.message||error)}
}
async function auditSupport(url,key,auth,entityId,action,before,after){
  try{
    await rest(url,key,'service_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({
      actor_email:auth.email||'',actor_role:normRole(auth.profile?.role||auth.profile?.rol),action,entity_type:'service_order',entity_id:String(entityId),before_data:before||{},after_data:after||{}
    })});
  }catch(error){console.warn('service audit',error?.message||error)}
}
async function partsForOrder(url,key,code){
  try{
    const [moves,parts]=await Promise.all([
      rest(url,key,`service_part_movements?select=part_id,quantity,created_at,note&order_id=eq.${encodeURIComponent(code)}&quantity=lt.0&order=created_at.asc`),
      rest(url,key,'service_parts?select=id,sku,name,unit_cost,sale_price')
    ]);
    const map=new Map((Array.isArray(parts)?parts:[]).map(p=>[String(p.id),p]));
    return (Array.isArray(moves)?moves:[]).map(m=>({qty:Math.abs(Number(m.quantity||0)),...(map.get(String(m.part_id))||{})})).filter(x=>x.qty>0);
  }catch{return[]}
}
async function buildServiceNote(order,url,key){
  const parts=await partsForOrder(url,key,order.code);
  const checklist=order.reception_checklist&&typeof order.reception_checklist==='object'?order.reception_checklist:{};
  const client=checklist.__client||{};
  const partText=parts.length?parts.map(p=>`${p.qty}× ${p.name||p.sku||'Repuesto'}`).join(', '):'Sin repuestos registrados en la orden';
  const details=[order.quote_repair_details,`Falla reportada: ${order.reported_issue||'No indicada'}`,`Repuestos utilizados: ${partText}`].filter(Boolean).join(' · ');
  const trackingBase=clean(process.env.SUPPORT_PUBLIC_URL||process.env.SOPORTE_PUBLIC_URL||'https://soporte.thinkstore.com.ve').replace(/\/$/,'');
  const payload={
    documentKind:'service',
    trackingUrl:`${trackingBase}/seguimiento.html?orden=${encodeURIComponent(order.code)}`,
    code:order.code,created_at:order.paid_at||order.updated_at||order.created_at,
    customerName:order.client_name,customerEmail:order.client_email,customerPhone:order.client_phone,
    customerDocument:client.document||'',customerAddress:client.address_short||'',customerCity:client.city||'',customerState:client.state||'',
    paymentMethod:order.payment_method||'Por confirmar',
    paymentRef:referenceFromOrder(order),
    status:'Pagado',
    items:[{
      product:`Servicio técnico · ${order.device_model||order.device_type||'Equipo'}`,
      model:order.device_type||'',color:order.device_color||'',qty:1,price:Number(order.quote_amount||order.amount_paid||0),
      warranty_days:Number(order.warranty_days||0),features:details,item_note:`Serial / IMEI: ${order.serial_imei||'No registrado'}`,
      serial_number:order.serial_imei||''
    }],
    subtotal_usd:Number(order.quote_amount||order.amount_paid||0),
    total_usd:Number(order.quote_amount||order.amount_paid||0),
    note:`Orden ${order.code}. ${order.delivery_method?`Entrega: ${order.delivery_method}. `:''}Conserva esta nota como respaldo de la reparación y de la garantía indicada.`
  };
  const html=require('./delivery-note-template').render(payload);
  return{html,payload};
}
function referenceFromOrder(order){
  const text=clean(order.payment_notes||'');
  const m=text.match(/Referencia:\s*([^·]+)/i);return m?clean(m[1],220):'No aplica';
}
async function sendDeliveryNote(order,html){
  const to=clean(order.client_email).toLowerCase();
  if(!to||!to.includes('@'))return{sent:false,error:'La orden no tiene correo de cliente.'};
  const key=clean(process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY);
  if(!key)return{sent:false,error:'Falta RESEND_API_KEY en Netlify.'};
  const from=process.env.FROM_SOPORTE_EMAIL||'ThinkStore Soporte <soporte@thinkstore.com.ve>';
  const replyTo=process.env.REPLY_TO_SUPPORT||'soporte@thinkstore.com.ve';
  try{
    const rr=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({
      from,to:[to],reply_to:replyTo,subject:`Nota de entrega · ${order.code} · ThinkStore`,html
    })});
    const data=await rr.json().catch(()=>({}));
    return rr.ok?{sent:true,id:data.id||null,to}:{sent:false,error:data.message||data.error||`Resend HTTP ${rr.status}`,to};
  }catch(error){return{sent:false,error:error?.message||'No se pudo conectar con Resend',to}}
}
