const H={
  'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,OPTIONS','Cache-Control':'no-store'
};
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const num=v=>{const n=Number(v||0);return Number.isFinite(n)?n:0};
const money=v=>Math.round((num(v)+Number.EPSILON)*100)/100;
const out=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
const svc=k=>({apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'});
function caracasKey(value=new Date()){const d=value instanceof Date?value:new Date(value||'');if(Number.isNaN(d.getTime()))return '';try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}catch{return d.toISOString().slice(0,10)}}
function weekKeys(){const today=caracasKey(),anchor=new Date(today+'T12:00:00-04:00'),shift=(anchor.getUTCDay()+6)%7;const monday=new Date(anchor);monday.setUTCDate(monday.getUTCDate()-shift);return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setUTCDate(d.getUTCDate()+i);return caracasKey(d)})}
function paymentApproved(o){const decision=norm(o.payment_decision),st=norm(o.estado||o.status);return decision==='approved'||/pago verificado|preparando pedido|comprando proveedor|transito|disponible para|enviado|entregado|completado/.test(st)}
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
async function rest(base,key,path){const r=await fetch(`${base}/rest/v1/${path}`,{headers:svc(key)});const t=await r.text();let d=[];try{d=t?JSON.parse(t):[]}catch{d=[]}if(!r.ok){const e=new Error(d?.message||d?.error||`HTTP ${r.status}`);e.status=r.status;e.code=d?.code;throw e}return Array.isArray(d)?d:[]}
async function optional(base,key,path){try{return await rest(base,key,path)}catch(e){if(e.status===404||e.code==='42P01'||/does not exist|not found/i.test(e.message))return [];throw e}}
function parseOverrides(profile={}){let o=profile?.permission_overrides||{};if(typeof o==='string'){try{o=JSON.parse(o)}catch{o={}}}return{allow:Array.isArray(o.allow)?o.allow:[],deny:Array.isArray(o.deny)?o.deny:[]}}
function enterpriseAccess(profile={}){const role=norm(profile?.role||profile?.rol).replace(/\s+/g,'_'),active=(profile?.active??profile?.activo??true)!==false;if(!profile||!active)return{ok:false,role:'viewer',admin:false};const admin=['admin','super_admin','superadmin','administrator','gerente'].includes(role);const o=parseOverrides(profile);const allowed=admin||(!o.deny.includes('platform.enterprise')&&o.allow.includes('platform.enterprise'));const erole=admin||o.allow.includes('enterprise.role.manager')?'manager':'viewer';return{ok:allowed,role:erole,admin}}
async function authAdmin(event,base,key){const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');if(!token)return{ok:false,error:'Sesión requerida'};const r=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});const u=await r.json().catch(()=>({}));if(!r.ok||!u?.id)return{ok:false,error:'Sesión inválida'};let profile=null;for(const path of [`profiles?select=*&id=eq.${encodeURIComponent(u.id)}&limit=1`,u.email?`roles_usuarios?select=*&email=ilike.${encodeURIComponent(u.email)}&limit=1`:null].filter(Boolean)){try{const rows=await rest(base,key,path);if(rows[0]){profile=rows[0];break}}catch{}}const access=enterpriseAccess(profile);return{ok:access.ok,user:u,profile,enterprise_role:access.role,is_full_admin:access.admin,error:'Acceso Enterprise no autorizado'}}
const sum=(rows,fn)=>money((rows||[]).reduce((n,r)=>n+num(fn(r)),0));
const operatingExpenseType=t=>['expense','refund','fee','warranty_cost'].includes(t);
const dataRow=r=>{const d=r?.data&&typeof r.data==='object'&&!Array.isArray(r.data)?r.data:r||{};return{...d,id:d.id??r?.id}};
const hasNum=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));

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
  let mainOrders=[],orderItems=[],supportOrders=[],appointments=[],supportEvents=[],financeEntries=[],settings=[],supportConnected=false,paymentReady=true,errors=[];
  let invProductsRaw=[],invBridge=[],supportParts=[],supportPartMoves=[];
  try{mainOrders=await rest(mainUrl,mainKey,'pedidos?select=*&order=created_at.desc&limit=2500')}catch(e){errors.push('ventas: '+e.message)}
  try{orderItems=await optional(mainUrl,mainKey,'pedido_items?select=*&limit=10000')}catch(e){errors.push('líneas de venta: '+e.message)}
  try{invProductsRaw=await optional(mainUrl,mainKey,'thinkstore_inventory_products?select=*&workspace_key=eq.main&limit=5000')}catch(e){errors.push('inventory: '+e.message)}
  try{invBridge=await optional(mainUrl,mainKey,'thinkstore_inventory_bridge?select=*&workspace_key=eq.main&limit=5000')}catch(e){errors.push('inventory bridge: '+e.message)}
  try{financeEntries=await optional(mainUrl,mainKey,'enterprise_finance_entries?select=*&status=neq.void&order=occurred_at.desc&limit=3000')}catch(e){errors.push('finanzas: '+e.message)}
  try{settings=await optional(mainUrl,mainKey,'enterprise_finance_settings?select=*&id=eq.default&limit=1')}catch(e){errors.push('configuración financiera: '+e.message)}
  if(supportUrl&&supportKey){try{supportOrders=await rest(supportUrl,supportKey,'service_orders?select=*&order=created_at.desc&limit=2500');appointments=await optional(supportUrl,supportKey,'service_appointments?select=*&order=created_at.desc&limit=2500');supportEvents=await optional(supportUrl,supportKey,'service_payment_events?select=*&order=occurred_at.desc&limit=3000');supportParts=await optional(supportUrl,supportKey,'service_parts?select=*&limit=5000');supportPartMoves=await optional(supportUrl,supportKey,'service_part_movements?select=*&order=created_at.desc&limit=10000');supportConnected=true;paymentReady=supportOrders.length===0||supportOrders.every(o=>Object.prototype.hasOwnProperty.call(o,'payment_status'))}catch(e){errors.push('soporte: '+e.message)}}else errors.push('soporte: faltan SUPPORT_SUPABASE_URL / SUPPORT_SUPABASE_*');

  const salesCreated=mainOrders.filter(o=>weekSet.has(caracasKey(o.created_at))&&!orderCancelled(o));
  const paidSales=mainOrders.filter(o=>paymentApproved(o)&&weekSet.has(caracasKey(orderPaidDate(o))));
  const pendingSales=mainOrders.filter(orderPending);
  const invProducts=invProductsRaw.map(dataRow),productMap=new Map(invProducts.map(p=>[String(p.id),p]));
  const bridgeVariant=new Map(),bridgeSku=new Map();invBridge.forEach(b=>{if(b.variant_id)bridgeVariant.set(String(b.variant_id),b);if(b.sku)bridgeSku.set(norm(b.sku),b)});
  const costOfItem=i=>{const qty=Math.max(1,num(i.cantidad)||1);if(hasNum(i.cost_total_usd))return Math.max(0,num(i.cost_total_usd));if(hasNum(i.unit_cost_usd))return Math.max(0,num(i.unit_cost_usd))*qty;let pid=clean(i.inventory_product_id),b=null;if(!pid&&i.inventory_variant_id)b=bridgeVariant.get(String(i.inventory_variant_id));if(!b&&i.sku)b=bridgeSku.get(norm(i.sku));if(!pid&&b)pid=clean(b.inventory_product_id);let p=pid?productMap.get(pid):null;if(!p&&i.sku)p=invProducts.find(x=>norm(x.sku)===norm(i.sku));return p&&hasNum(p.purchase_price)?Math.max(0,num(p.purchase_price))*qty:0};
  const paidIds=new Set(paidSales.map(o=>String(o.id))),paidItems=orderItems.filter(i=>paidIds.has(String(i.pedido_id))),storeCogs=sum(paidItems,costOfItem);
  const partMap=new Map(supportParts.map(p=>[String(p.id),p]));
  const consumed=m=>num(m.quantity)<0||/consumo|salida|utiliz|instalad/.test(norm(m.movement_type));
  const supportPartsWeek=sum(supportPartMoves.filter(m=>consumed(m)&&weekSet.has(caracasKey(m.created_at))),m=>Math.abs(num(m.quantity))*Math.max(0,num(partMap.get(String(m.part_id))?.unit_cost)));
  const online=salesCreated.filter(o=>orderChannel(o)==='online'),presencial=salesCreated.filter(o=>orderChannel(o)==='presencial');
  const onlineRevenue=sum(online,o=>o.total_usd),presencialRevenue=sum(presencial,o=>o.total_usd),shopCollected=sum(paidSales,o=>o.total_usd);
  const received=supportOrders.filter(o=>weekSet.has(caracasKey(o.created_at)));
  const delivered=supportOrders.filter(o=>/entregado/.test(norm(o.status))&&weekSet.has(caracasKey(serviceDeliveredDate(o))));
  const ready=received.filter(o=>/listo para entregar|^listo$/.test(norm(o.status))),pendingCollection=supportOrders.filter(o=>servicePendingAmount(o)>0),toDeliver=received.filter(o=>!serviceCancelled(o)&&!/entregado/.test(norm(o.status))),homeServices=received.filter(serviceAtHome);
  const weekSupportEvents=supportEvents.filter(e=>weekSet.has(caracasKey(e.occurred_at||e.created_at)));
  const fallbackCollected=supportOrders.filter(o=>servicePaid(o)&&weekSet.has(caracasKey(servicePaidDate(o))));
  const supportCollected=weekSupportEvents.length?sum(weekSupportEvents,e=>e.amount_delta):sum(fallbackCollected,o=>o.amount_paid);
  const supportPending=sum(pendingCollection,servicePendingAmount);
  const weekAppointments=appointments.filter(a=>weekSet.has(String(a.preferred_date||caracasKey(a.created_at)))),homeAppointments=weekAppointments.filter(a=>/domicilio|delivery|a casa|home/.test(norm(a.service_mode)));
  const weekFinance=financeEntries.filter(e=>weekSet.has(caracasKey(e.occurred_at||e.created_at)));
  const otherIncome=sum(weekFinance.filter(e=>['other_income','receivable_collection'].includes(e.entry_type)),e=>e.amount_usd);
  const financeOutflows=sum(weekFinance.filter(e=>operatingExpenseType(e.entry_type)),e=>e.amount_usd);
  const techCommissions=sum(weekFinance.filter(e=>e.entry_type==='technician_commission'),e=>e.amount_usd);
  const supportDirectCosts=sum(weekFinance.filter(e=>e.entry_type==='technician_commission'),e=>e.metadata?.direct_cost);
  const globalCollected=money(shopCollected+supportCollected+otherIncome);
  const netResult=money(globalCollected-storeCogs-supportPartsWeek-supportDirectCosts-financeOutflows-techCommissions),distributable=Math.max(0,netResult);
  const cfg=settings[0]||{company_share_pct:50,freddy_share_pct:25,nelson_share_pct:25};
  const companyShare=money(distributable*num(cfg.company_share_pct||50)/100),freddyShare=money(distributable*num(cfg.freddy_share_pct||25)/100),nelsonShare=money(distributable*num(cfg.nelson_share_pct||25)/100);

  const daily=keys.map(key=>{
    const created=mainOrders.filter(o=>caracasKey(o.created_at)===key&&!orderCancelled(o)),paid=mainOrders.filter(o=>paymentApproved(o)&&caracasKey(orderPaidDate(o))===key);
    const paidDayIds=new Set(paid.map(o=>String(o.id))),dayCogs=sum(orderItems.filter(i=>paidDayIds.has(String(i.pedido_id))),costOfItem);
    const sReceived=supportOrders.filter(o=>caracasKey(o.created_at)===key),sPaidEvents=supportEvents.filter(e=>caracasKey(e.occurred_at||e.created_at)===key),sPaidFallback=supportOrders.filter(o=>servicePaid(o)&&caracasKey(servicePaidDate(o))===key),sDelivered=supportOrders.filter(o=>/entregado/.test(norm(o.status))&&caracasKey(serviceDeliveredDate(o))===key),appts=appointments.filter(a=>String(a.preferred_date||caracasKey(a.created_at))===key),manual=financeEntries.filter(e=>caracasKey(e.occurred_at||e.created_at)===key&&e.status!=='void');
    const supportDay=sPaidEvents.length?sum(sPaidEvents,e=>e.amount_delta):sum(sPaidFallback,o=>o.amount_paid),partsDay=sum(supportPartMoves.filter(m=>consumed(m)&&caracasKey(m.created_at)===key),m=>Math.abs(num(m.quantity))*Math.max(0,num(partMap.get(String(m.part_id))?.unit_cost))),otherDay=sum(manual.filter(e=>['other_income','receivable_collection'].includes(e.entry_type)),e=>e.amount_usd),operDay=sum(manual.filter(e=>operatingExpenseType(e.entry_type)),e=>e.amount_usd),techDay=sum(manual.filter(e=>e.entry_type==='technician_commission'),e=>e.amount_usd),directDay=sum(manual.filter(e=>e.entry_type==='technician_commission'),e=>e.metadata?.direct_cost),outDay=money(dayCogs+partsDay+operDay+techDay+directDay);
    return{date:key,online_sales:created.filter(o=>orderChannel(o)==='online').length,online_amount:sum(created.filter(o=>orderChannel(o)==='online'),o=>o.total_usd),presencial_sales:created.filter(o=>orderChannel(o)==='presencial').length,presencial_amount:sum(created.filter(o=>orderChannel(o)==='presencial'),o=>o.total_usd),shop_collected:sum(paid,o=>o.total_usd),store_cogs:dayCogs,service_received:sReceived.length,service_collected:supportDay,service_parts_cost:partsDay,service_delivered:sDelivered.length,appointments:appts.length,home_appointments:appts.filter(a=>/domicilio|delivery|a casa|home/.test(norm(a.service_mode))).length,global_collected:money(sum(paid,o=>o.total_usd)+supportDay+otherDay),outflows:outDay,net:money(sum(paid,o=>o.total_usd)+supportDay+otherDay-outDay)}
  });

  return out(200,{ok:true,generated_at:new Date().toISOString(),timezone:'America/Caracas',period:{start:keys[0],end:keys[6],today},data_quality:{support_connected:supportConnected,support_payment_ready:paymentReady,support_payment_events:supportEvents.length>0,finance_ready:settings.length>0,inventory_connected:invProductsRaw.length>0,support_parts_connected:supportParts.length>0||supportPartMoves.length>0,errors},sales:{registered:salesCreated.length,registered_amount:sum(salesCreated,o=>o.total_usd),collected_count:paidSales.length,collected_amount:shopCollected,pending_count:pendingSales.length,pending_amount:sum(pendingSales,o=>o.total_usd),online_count:online.length,online_amount:onlineRevenue,presencial_count:presencial.length,presencial_amount:presencialRevenue,delivery_count:salesCreated.filter(orderDelivery).length},support:{received:received.length,quoted_amount:sum(received,o=>o.quote_amount),collected_count:weekSupportEvents.length||fallbackCollected.length,collected_amount:supportCollected,pending_collection_count:pendingCollection.length,pending_collection_amount:supportPending,ready:ready.length,delivered:delivered.length,to_deliver:toDeliver.length,home_services:homeServices.length},appointments:{total:weekAppointments.length,home:homeAppointments.length,store:Math.max(0,weekAppointments.length-homeAppointments.length),pending:weekAppointments.filter(a=>/pendiente|agendada|confirmada/.test(norm(a.status))).length},global:{collected_amount:globalCollected,registered_amount:money(sum(salesCreated,o=>o.total_usd)+sum(received,o=>o.quote_amount)),store_cogs:storeCogs,support_parts_cost:supportPartsWeek,support_direct_costs:supportDirectCosts,operating_outflows:financeOutflows,technician_commissions:techCommissions,net_result:netResult,distributable_profit:distributable,company_50:companyShare,partner_a_25:freddyShare,partner_b_25:nelsonShare,company_pct:num(cfg.company_share_pct||50),partner_a_pct:num(cfg.freddy_share_pct||25),partner_b_pct:num(cfg.nelson_share_pct||25)},daily});
};
