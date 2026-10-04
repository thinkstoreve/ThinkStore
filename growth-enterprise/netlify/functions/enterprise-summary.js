const H={
  'Content-Type':'application/json',
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization,content-type',
  'Access-Control-Allow-Methods':'GET,OPTIONS',
  'Cache-Control':'no-store'
};
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const num=v=>{const n=Number(v||0);return Number.isFinite(n)?n:0};
const out=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
const svc=k=>({apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'});

function caracasKey(value=new Date()){
  const d=value instanceof Date?value:new Date(value||'');
  if(Number.isNaN(d.getTime()))return '';
  try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
  catch{return d.toISOString().slice(0,10)}
}
function weekKeys(){
  const today=caracasKey(),anchor=new Date(today+'T12:00:00-04:00'),shift=(anchor.getUTCDay()+6)%7;
  const monday=new Date(anchor);monday.setUTCDate(monday.getUTCDate()-shift);
  return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setUTCDate(d.getUTCDate()+i);return caracasKey(d)});
}
function paymentApproved(o){
  const decision=norm(o.payment_decision),st=norm(o.estado||o.status);
  return decision==='approved'||/pago verificado|preparando pedido|comprando proveedor|transito|disponible para|enviado|entregado|completado/.test(st);
}
function orderCancelled(o){return /cancel|rechaz|anulad/.test(norm(o.estado||o.status))}
function orderPending(o){return /pago por verificar|pago recibido|pendiente/.test(norm(o.estado||o.status))&&!paymentApproved(o)&&!orderCancelled(o)}
function orderPaidDate(o){return o.payment_decision_at||o.updated_at||o.created_at||''}
function orderChannel(o){return norm(o.order_channel||o.channel)==='presencial'?'presencial':'online'}
function orderDelivery(o){return /delivery|domicilio/.test(norm(o.metodo_envio||o.delivery_method||''))}
function serviceCancelled(o){return /cancel|no aprobado|rechaz/.test(norm(o.status))}
function serviceAtHome(o){return /domicilio|delivery|a casa|home/.test(norm([o.service_mode,o.delivery_method,o.technical_notes].join(' ')))}
function servicePaid(o){return num(o.amount_paid)>0||/cobrado|pagado|abono/.test(norm(o.payment_status))}
function servicePaidDate(o){return o.paid_at||((servicePaid(o))?(o.updated_at||o.created_at):'')}
function serviceDeliveredDate(o){return o.delivered_at||(/entregado/.test(norm(o.status))?(o.updated_at||o.created_at):'')}
function servicePendingAmount(o){return serviceCancelled(o)?0:Math.max(0,num(o.quote_amount)-num(o.amount_paid))}
function isAdminRole(v){return ['admin','superadmin','super_admin','administrator','gerente'].includes(norm(v).replace(/\s+/g,'_'))}

async function rest(base,key,path){
  const r=await fetch(`${base}/rest/v1/${path}`,{headers:svc(key)});
  const t=await r.text();let d=[];try{d=t?JSON.parse(t):[]}catch{d=[]}
  if(!r.ok){const e=new Error(d?.message||d?.error||`HTTP ${r.status}`);e.status=r.status;throw e}
  return Array.isArray(d)?d:[];
}
function parseOverrides(profile={}){let o=profile?.permission_overrides||{};if(typeof o==='string'){try{o=JSON.parse(o)}catch{o={}}}return{allow:Array.isArray(o.allow)?o.allow:[],deny:Array.isArray(o.deny)?o.deny:[]}}
function enterpriseAccess(profile={}){const role=norm(profile?.role||profile?.rol).replace(/\s+/g,'_'),active=(profile?.active??profile?.activo??true)!==false;if(!profile||!active)return{ok:false,role:'viewer',admin:false};const admin=['admin','super_admin','superadmin','administrator','gerente'].includes(role);const o=parseOverrides(profile);const allowed=admin||(!o.deny.includes('platform.enterprise')&&o.allow.includes('platform.enterprise'));const erole=admin||o.allow.includes('enterprise.role.manager')?'manager':'viewer';return{ok:allowed,role:erole,admin}}

async function authAdmin(event,base,key){
  const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');
  if(!token)return{ok:false,error:'Sesión requerida'};
  const r=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
  const u=await r.json().catch(()=>({}));if(!r.ok||!u?.id)return{ok:false,error:'Sesión inválida'};
  let profile=null;
  for(const path of [
    `profiles?select=*&id=eq.${encodeURIComponent(u.id)}&limit=1`,
    u.email?`roles_usuarios?select=*&email=ilike.${encodeURIComponent(u.email)}&limit=1`:null
  ].filter(Boolean)){
    try{const rows=await rest(base,key,path);if(rows[0]){profile=rows[0];break}}catch{}
  }
  const access=enterpriseAccess(profile);
  const role=profile?.role||profile?.rol||'';
  return{ok:access.ok,user:u,profile,role,enterprise_role:access.role,is_full_admin:access.admin,error:'Acceso Enterprise no autorizado'};
}

exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:H,body:''};
  if(event.httpMethod!=='GET')return out(405,{ok:false,error:'Método no permitido'});

  const mainUrl=clean(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL).replace(/\/$/,'');
  const mainKey=clean(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY);
  const supportUrl=clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/$/,'');
  const supportKey=clean(process.env.SUPPORT_SUPABASE_SECRET_KEY||process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY);
  if(!mainUrl||!mainKey)return out(501,{ok:false,error:'Falta configurar el Supabase principal en Enterprise.'});
  const auth=await authAdmin(event,mainUrl,mainKey);if(!auth.ok)return out(403,{ok:false,error:auth.error});

  const keys=weekKeys(),weekSet=new Set(keys),today=caracasKey();
  let mainOrders=[],supportOrders=[],appointments=[],supportConnected=false,paymentReady=true,errors=[];
  try{mainOrders=await rest(mainUrl,mainKey,'pedidos?select=*&order=created_at.desc&limit=2500')}catch(e){errors.push('ventas: '+e.message)}
  if(supportUrl&&supportKey){
    try{
      supportOrders=await rest(supportUrl,supportKey,'service_orders?select=*&order=created_at.desc&limit=2500');
      appointments=await rest(supportUrl,supportKey,'service_appointments?select=*&order=created_at.desc&limit=2500').catch(()=>[]);
      supportConnected=true;
      paymentReady=supportOrders.length===0||supportOrders.every(o=>Object.prototype.hasOwnProperty.call(o,'payment_status'));
    }catch(e){errors.push('soporte: '+e.message)}
  }else errors.push('soporte: faltan SUPPORT_SUPABASE_URL / SUPPORT_SUPABASE_*');

  const salesCreated=mainOrders.filter(o=>weekSet.has(caracasKey(o.created_at))&&!orderCancelled(o));
  const paidSales=mainOrders.filter(o=>paymentApproved(o)&&weekSet.has(caracasKey(orderPaidDate(o))));
  const pendingSales=mainOrders.filter(orderPending);
  const online=salesCreated.filter(o=>orderChannel(o)==='online');
  const presencial=salesCreated.filter(o=>orderChannel(o)==='presencial');
  const onlineRevenue=online.reduce((n,o)=>n+num(o.total_usd),0);
  const presencialRevenue=presencial.reduce((n,o)=>n+num(o.total_usd),0);
  const shopCollected=paidSales.reduce((n,o)=>n+num(o.total_usd),0);

  const received=supportOrders.filter(o=>weekSet.has(caracasKey(o.created_at)));
  const collected=supportOrders.filter(o=>servicePaid(o)&&weekSet.has(caracasKey(servicePaidDate(o))));
  const delivered=supportOrders.filter(o=>/entregado/.test(norm(o.status))&&weekSet.has(caracasKey(serviceDeliveredDate(o))));
  const ready=received.filter(o=>/listo para entregar|^listo$/.test(norm(o.status)));
  const pendingCollection=received.filter(o=>servicePendingAmount(o)>0);
  const toDeliver=received.filter(o=>!serviceCancelled(o)&&!/entregado/.test(norm(o.status)));
  const homeServices=received.filter(serviceAtHome);
  const supportCollected=collected.reduce((n,o)=>n+num(o.amount_paid),0);
  const supportPending=pendingCollection.reduce((n,o)=>n+servicePendingAmount(o),0);

  const weekAppointments=appointments.filter(a=>weekSet.has(String(a.preferred_date||caracasKey(a.created_at))));
  const homeAppointments=weekAppointments.filter(a=>/domicilio|delivery|a casa|home/.test(norm(a.service_mode)));

  const globalCollected=shopCollected+supportCollected;
  const daily=keys.map(key=>{
    const created=mainOrders.filter(o=>caracasKey(o.created_at)===key&&!orderCancelled(o));
    const paid=mainOrders.filter(o=>paymentApproved(o)&&caracasKey(orderPaidDate(o))===key);
    const sReceived=supportOrders.filter(o=>caracasKey(o.created_at)===key);
    const sPaid=supportOrders.filter(o=>servicePaid(o)&&caracasKey(servicePaidDate(o))===key);
    const sDelivered=supportOrders.filter(o=>/entregado/.test(norm(o.status))&&caracasKey(serviceDeliveredDate(o))===key);
    const appts=appointments.filter(a=>String(a.preferred_date||caracasKey(a.created_at))===key);
    return{
      date:key,
      online_sales:created.filter(o=>orderChannel(o)==='online').length,
      online_amount:created.filter(o=>orderChannel(o)==='online').reduce((n,o)=>n+num(o.total_usd),0),
      presencial_sales:created.filter(o=>orderChannel(o)==='presencial').length,
      presencial_amount:created.filter(o=>orderChannel(o)==='presencial').reduce((n,o)=>n+num(o.total_usd),0),
      shop_collected:paid.reduce((n,o)=>n+num(o.total_usd),0),
      service_received:sReceived.length,
      service_collected:sPaid.reduce((n,o)=>n+num(o.amount_paid),0),
      service_delivered:sDelivered.length,
      appointments:appts.length,
      home_appointments:appts.filter(a=>/domicilio|delivery|a casa|home/.test(norm(a.service_mode))).length,
      global_collected:paid.reduce((n,o)=>n+num(o.total_usd),0)+sPaid.reduce((n,o)=>n+num(o.amount_paid),0)
    };
  });

  return out(200,{
    ok:true,
    generated_at:new Date().toISOString(),
    timezone:'America/Caracas',
    period:{start:keys[0],end:keys[6],today},
    data_quality:{support_connected:supportConnected,support_payment_ready:paymentReady,errors},
    sales:{
      registered:salesCreated.length,
      registered_amount:salesCreated.reduce((n,o)=>n+num(o.total_usd),0),
      collected_count:paidSales.length,
      collected_amount:shopCollected,
      pending_count:pendingSales.length,
      pending_amount:pendingSales.reduce((n,o)=>n+num(o.total_usd),0),
      online_count:online.length,online_amount:onlineRevenue,
      presencial_count:presencial.length,presencial_amount:presencialRevenue,
      delivery_count:salesCreated.filter(orderDelivery).length
    },
    support:{
      received:received.length,
      quoted_amount:received.reduce((n,o)=>n+num(o.quote_amount),0),
      collected_count:collected.length,
      collected_amount:supportCollected,
      pending_collection_count:pendingCollection.length,
      pending_collection_amount:supportPending,
      ready:ready.length,
      delivered:delivered.length,
      to_deliver:toDeliver.length,
      home_services:homeServices.length
    },
    appointments:{
      total:weekAppointments.length,
      home:homeAppointments.length,
      store:Math.max(0,weekAppointments.length-homeAppointments.length),
      pending:weekAppointments.filter(a=>/pendiente|agendada|confirmada/.test(norm(a.status))).length
    },
    global:{
      collected_amount:globalCollected,
      registered_amount:salesCreated.reduce((n,o)=>n+num(o.total_usd),0)+received.reduce((n,o)=>n+num(o.quote_amount),0),
      company_50:globalCollected*.50,
      partner_a_25:globalCollected*.25,
      partner_b_25:globalCollected*.25
    },
    daily
  });
};
