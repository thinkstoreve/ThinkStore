const H={
  'Content-Type':'application/json',
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
const clean=(v,max=600)=>String(v??'').trim().slice(0,max);
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const num=v=>{const n=Number(v||0);return Number.isFinite(n)?n:0};
const money=v=>Math.round((num(v)+Number.EPSILON)*100)/100;
const normRole=v=>{let r=norm(v).replace(/[ -]+/g,'_');if(r==='super_admin')r='superadmin';if(r==='administrator'||r==='gerente')r='admin';return r||'cliente'};
const out=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
const svc=k=>({apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'});
const cleanPerms=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>clean(x,100)).filter(Boolean))];
const cleanOverrides=v=>{let o=v&&typeof v==='object'?v:{};if(typeof v==='string'){try{o=JSON.parse(v)}catch{o={}}}return{allow:cleanPerms(o.allow),deny:cleanPerms(o.deny)}};

async function raw(base,key,path,options={}){
  const r=await fetch(`${base}/rest/v1/${path}`,{...options,headers:{...svc(key),...(options.headers||{})}});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok){const e=new Error(data?.message||data?.error||`HTTP ${r.status}`);e.status=r.status;e.code=data?.code;throw e}
  return data;
}
async function optional(base,key,path){try{return await raw(base,key,path)}catch(e){if(e.status===404||e.code==='42P01'||/does not exist|not found/i.test(e.message))return[];throw e}}
async function authenticate(event,url,service){
  const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');
  if(!token)return{ok:false,error:'Inicia sesión con una cuenta interna de ThinkStore'};
  const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});const u=await ur.json().catch(()=>({}));
  if(!ur.ok||!u?.id)return{ok:false,error:'La sesión no es válida'};
  let p=null;
  for(const path of [`profiles?select=*&id=eq.${encodeURIComponent(u.id)}&limit=1`,u.email?`profiles?select=*&email=ilike.${encodeURIComponent(u.email)}&limit=1`:null,u.email?`profiles?select=*&correo=ilike.${encodeURIComponent(u.email)}&limit=1`:null].filter(Boolean)){
    try{const rows=await raw(url,service,path);if(rows?.[0]){p=rows[0];break}}catch{}
  }
  if(!p||(p.active??p.activo??true)===false||p.is_internal!==true)return{ok:false,error:'Esta cuenta no tiene acceso interno'};
  const role=normRole(p.role||p.rol),over=cleanOverrides(p.permission_overrides);let permissions=[...(DEFAULT_PERMS[role]||[])];
  const customKey=clean(p.custom_role_key);
  if(customKey){try{const rr=await raw(url,service,`ts_roles?select=*&role_key=eq.${encodeURIComponent(customKey)}&active=eq.true&limit=1`);if(rr?.[0])permissions=cleanPerms(rr[0].permissions)}catch{}}
  if(!permissions.includes('*'))permissions=[...new Set([...permissions,...over.allow])].filter(x=>!over.deny.includes(x));
  const allowed=permissions.includes('*')||permissions.some(x=>['staff.access','ventas','pagos','recepcion','tickets'].includes(x));
  return{ok:allowed,error:allowed?'':'Tu cuenta no tiene permiso para registrar cobros',user:u,profile:p,role,permissions};
}
function orderPayload(o={}){
  const quote=money(o.quote_amount),paid=money(o.amount_paid),pending=Math.max(0,money(quote-paid));
  return{id:o.id,code:o.code||String(o.id||''),client_name:o.client_name||'Cliente',client_email:o.client_email||'',client_phone:o.client_phone||'',device_model:o.device_model||'Equipo',device_type:o.device_type||'',service_type:o.service_type||'',status:o.status||'Recibido',quote_amount:quote,quote_currency:o.quote_currency||'USD',amount_paid:paid,pending_amount:pending,payment_status:o.payment_status||'Pendiente',payment_method:o.payment_method||'',payment_notes:o.payment_notes||'',paid_at:o.paid_at||null,updated_at:o.updated_at||o.created_at||null};
}
async function loadOrders(supportUrl,supportKey){
  const rows=await raw(supportUrl,supportKey,'service_orders?select=*&order=updated_at.desc&limit=500');
  const orders=(rows||[]).map(orderPayload);
  const active=orders.filter(o=>!/cancel|rechaz|anulad/.test(norm(o.status)));
  return{orders,metrics:{total:orders.length,open:active.filter(o=>!/entregado|cerrado|completado/.test(norm(o.status))).length,pending:active.filter(o=>o.pending_amount>0).length,pending_amount:money(active.reduce((n,o)=>n+o.pending_amount,0)),collected:money(active.reduce((n,o)=>n+o.amount_paid,0))}};
}
exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:H,body:''};
  const mainUrl=clean(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL).replace(/\/$/,'');
  const mainKey=clean(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY);
  const supportUrl=clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/$/,'');
  const supportKey=clean(process.env.SUPPORT_SUPABASE_SECRET_KEY||process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY);
  if(!mainUrl||!mainKey)return out(501,{ok:false,error:'Falta configurar el Supabase principal'});
  const auth=await authenticate(event,mainUrl,mainKey);if(!auth.ok)return out(403,{ok:false,error:auth.error});
  if(!supportUrl||!supportKey)return out(501,{ok:false,error:'Falta configurar SUPPORT_SUPABASE_URL y SUPPORT_SUPABASE_SERVICE_ROLE_KEY en Netlify'});
  try{
    if(event.httpMethod==='GET'){
      const data=await loadOrders(supportUrl,supportKey);return out(200,{ok:true,...data,generated_at:new Date().toISOString()});
    }
    if(event.httpMethod!=='POST')return out(405,{ok:false,error:'Método no permitido'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return out(400,{ok:false,error:'JSON inválido'})}
    if(clean(body.action)!=='record_payment')return out(400,{ok:false,error:'Acción no soportada'});
    const id=clean(body.order_id,160);if(!id)return out(400,{ok:false,error:'Orden requerida'});
    const rows=await raw(supportUrl,supportKey,`service_orders?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);const order=rows?.[0];
    if(!order)return out(404,{ok:false,error:'No encontré la orden de Servicio Técnico'});
    const amount=money(body.amount_usd);if(!(amount>0))return out(400,{ok:false,error:'Indica un monto mayor que cero'});
    const quote=money(order.quote_amount),oldPaid=money(order.amount_paid),pending=Math.max(0,money(quote-oldPaid));
    if(quote>0&&amount>pending+.009)return out(400,{ok:false,error:`El abono supera el saldo pendiente de $${pending.toFixed(2)}`});
    const method=clean(body.payment_method,120);if(!method)return out(400,{ok:false,error:'Selecciona el método de pago'});
    const reference=clean(body.reference,180),notes=clean(body.notes,500),now=new Date().toISOString(),newPaid=money(oldPaid+amount);
    const paymentStatus=quote>0&&newPaid>=quote-.009?'Cobrado':quote>0?'Abono parcial':'Abono registrado';
    const paymentNote=[notes,reference?`Ref. ${reference}`:''].filter(Boolean).join(' · ')||`Cobro registrado desde ThinkStore Ventas por ${auth.user.email||'usuario interno'}`;
    const patch={amount_paid:newPaid,payment_status:paymentStatus,payment_method:method,payment_notes:paymentNote,paid_at:now,updated_at:now};
    const updated=await raw(supportUrl,supportKey,`service_orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});
    // El trigger ya crea el evento de abono. Enriquecemos ese evento con referencia si la columna existe.
    try{
      const events=await optional(supportUrl,supportKey,`service_payment_events?select=*&service_order_id=eq.${encodeURIComponent(id)}&order=occurred_at.desc&limit=1`);const ev=events?.[0];
      if(ev?.id)await raw(supportUrl,supportKey,`service_payment_events?id=eq.${encodeURIComponent(ev.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({payment_method:method,reference:reference||null,notes:paymentNote})});
    }catch{}
    try{await raw(supportUrl,supportKey,'service_order_notes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:order.id,note:`Pago registrado: $${amount.toFixed(2)} · ${method}${reference?` · Ref. ${reference}`:''}`,visibility:'internal',author_name:auth.profile?.full_name||auth.profile?.nombre||auth.user.email||'ThinkStore Staff',note_type:'Pago',status_after:order.status})})}catch{}
    const data=await loadOrders(supportUrl,supportKey);
    return out(200,{ok:true,order:orderPayload(updated?.[0]||{...order,...patch}),...data,generated_at:new Date().toISOString()});
  }catch(error){console.error('staff-service-payment',error);return out(error.status&&error.status>=400?error.status:500,{ok:false,error:error.message||'No se pudo registrar el cobro'})}
};
