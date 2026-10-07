const H={
  'Content-Type':'application/json',
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization,content-type',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Cache-Control':'no-store'
};
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const num=v=>{const n=Number(v||0);return Number.isFinite(n)?n:0};
const money=v=>Math.round((num(v)+Number.EPSILON)*100)/100;
const out=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
const svc=k=>({apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'});
const safeDate=v=>{const d=new Date(v||'');return Number.isNaN(d.getTime())?null:d};

function caracasKey(value=new Date()){
  const d=value instanceof Date?value:new Date(value||'');
  if(Number.isNaN(d.getTime()))return '';
  try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
  catch{return d.toISOString().slice(0,10)}
}
function weekRange(seed){
  const key=/^\d{4}-\d{2}-\d{2}$/.test(clean(seed))?clean(seed):caracasKey();
  const anchor=new Date(key+'T12:00:00-04:00');
  const shift=(anchor.getUTCDay()+6)%7;
  const monday=new Date(anchor);monday.setUTCDate(monday.getUTCDate()-shift);
  const sunday=new Date(monday);sunday.setUTCDate(sunday.getUTCDate()+6);
  const start=caracasKey(monday),end=caracasKey(sunday);
  return {start,end,startIso:`${start}T00:00:00-04:00`,endIso:`${end}T23:59:59.999-04:00`};
}
function inRange(value,range){const d=safeDate(value);return d&&d>=new Date(range.startIso)&&d<=new Date(range.endIso)}
function paymentApproved(o){const decision=norm(o.payment_decision),st=norm(o.estado||o.status);return decision==='approved'||/pago verificado|preparando pedido|comprando proveedor|transito|disponible para|enviado|entregado|completado/.test(st)}
function orderCancelled(o){return /cancel|rechaz|anulad/.test(norm(o.estado||o.status))}
function orderPending(o){return !orderCancelled(o)&&!paymentApproved(o)&&/pago por verificar|pago recibido|pendiente/.test(norm(o.estado||o.status))}
function orderPaidDate(o){return o.payment_decision_at||o.updated_at||o.created_at||''}
function serviceCancelled(o){return /cancel|no aprobado|rechaz/.test(norm(o.status))}
function servicePendingAmount(o){return serviceCancelled(o)?0:Math.max(0,num(o.quote_amount)-num(o.amount_paid))}
function isOperatingExpenseType(t){return ['expense','refund','fee','warranty_cost'].includes(t)}
function isCashExpenseType(t){return ['expense','purchase','refund','fee','warranty_cost'].includes(t)}
function dataRow(r){const d=r?.data&&typeof r.data==='object'&&!Array.isArray(r.data)?r.data:r||{};return{...d,id:d.id??r?.id,workspace_key:r?.workspace_key??d.workspace_key}}
function arr(v){if(Array.isArray(v))return v;if(typeof v==='string'){try{const x=JSON.parse(v);return Array.isArray(x)?x:[]}catch{return []}}return []}
function hasNum(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))}
function parseOverrides(profile={}){let o=profile?.permission_overrides||{};if(typeof o==='string'){try{o=JSON.parse(o)}catch{o={}}}return{allow:Array.isArray(o.allow)?o.allow:[],deny:Array.isArray(o.deny)?o.deny:[]}}
function enterpriseAccess(profile={}){const role=norm(profile?.role||profile?.rol).replace(/\s+/g,'_'),active=(profile?.active??profile?.activo??true)!==false;if(!profile||!active)return{ok:false,role:'viewer',admin:false};const admin=['admin','super_admin','superadmin','administrator','gerente'].includes(role);const o=parseOverrides(profile);const allowed=admin||(!o.deny.includes('platform.enterprise')&&o.allow.includes('platform.enterprise'));const erole=admin||o.allow.includes('enterprise.role.manager')?'manager':'viewer';return{ok:allowed,role:erole,admin}}

async function req(base,key,path,options={}){
  const r=await fetch(`${base}/rest/v1/${path}`,{...options,headers:{...svc(key),...(options.headers||{})}});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok){const e=new Error(data?.message||data?.error||`HTTP ${r.status}`);e.status=r.status;e.code=data?.code;throw e}
  return data;
}
async function optionalReq(base,key,path){try{return await req(base,key,path)}catch(e){if(e.status===404||e.code==='42P01'||/does not exist|not found/i.test(e.message))return [];throw e}}
async function authManager(event,base,key){
  const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');
  if(!token)return{ok:false,error:'Sesión Enterprise requerida'};
  const r=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
  const user=await r.json().catch(()=>({}));if(!r.ok||!user?.id)return{ok:false,error:'Sesión Enterprise inválida'};
  let profile=null;
  for(const path of [`profiles?select=*&id=eq.${encodeURIComponent(user.id)}&limit=1`,user.email?`roles_usuarios?select=*&email=ilike.${encodeURIComponent(user.email)}&limit=1`:null].filter(Boolean)){
    try{const rows=await req(base,key,path);if(rows?.[0]){profile=rows[0];break}}catch{}
  }
  const access=enterpriseAccess(profile);
  if(!access.ok||access.role!=='manager')return{ok:false,error:'Enterprise requiere permiso Manager para administrar finanzas'};
  return{ok:true,user,profile,access};
}
function actorName(auth){return clean(auth?.profile?.full_name||auth?.profile?.nombre||auth?.user?.user_metadata?.full_name||auth?.user?.user_metadata?.name||auth?.user?.email||'Administrador')}
function normalizeMethod(v){const s=clean(v)||'Sin definir';return s.replace(/pago movil/i,'Pago Móvil').replace(/^zelle$/i,'Zelle').replace(/efectivo usd/i,'Efectivo USD').replace(/efectivo bs/i,'Efectivo Bs')}
function addMethod(map,method,amount,source){const key=normalizeMethod(method);if(!map[key])map[key]={method:key,amount:0,count:0,sources:{}};map[key].amount=money(map[key].amount+num(amount));map[key].count+=1;map[key].sources[source]=(map[key].sources[source]||0)+1}
function entryDate(e){return e.occurred_at||e.created_at}
function entryActive(e){return norm(e.status)!=='void'}
function sum(rows,fn){return money((rows||[]).reduce((n,r)=>n+num(fn(r)),0))}
function staffMovementUsd(m){
  if(hasNum(m?.usd_equivalent))return Math.max(0,num(m.usd_equivalent));
  if(clean(m?.currency).toUpperCase()==='USD')return Math.max(0,num(m.amount));
  return 0;
}
function pettyMethod(m){return clean(m?.currency).toUpperCase()==='VES'?'Caja Chica Bs':'Caja Chica USD'}
function movementSigned(row,valueFn=m=>m.amount){return (clean(row?.direction)==='out'?-1:1)*Math.max(0,num(valueFn(row)))}

async function buildSummary({mainUrl,mainKey,supportUrl,supportKey,range}){
  const errors=[];
  let orders=[],orderItems=[],receipts=[],entries=[],settings=[],audits=[],reconciliations=[],orderPayments=[],staffCashSessions=[],staffCashMovements=[],pettyAccounts=[],pettyMovements=[],pettyAudits=[];
  let invProductsRaw=[],invSuppliersRaw=[],invPurchasesRaw=[],invStockRaw=[],invUnitsRaw=[],invBridge=[];
  let supportOrders=[],supportEvents=[],supportParts=[],supportPartMoves=[];
  try{orders=await req(mainUrl,mainKey,'pedidos?select=*&order=created_at.desc&limit=5000')}catch(e){errors.push('ventas: '+e.message)}
  try{orderItems=await optionalReq(mainUrl,mainKey,'pedido_items?select=*&limit=10000')}catch(e){errors.push('líneas de venta: '+e.message)}
  try{receipts=await optionalReq(mainUrl,mainKey,'comprobantes?select=*&order=created_at.desc&limit=5000')}catch(e){errors.push('comprobantes: '+e.message)}
  try{entries=await optionalReq(mainUrl,mainKey,'enterprise_finance_entries?select=*&order=occurred_at.desc&limit=5000')}catch(e){errors.push('finanzas: '+e.message)}
  try{settings=await optionalReq(mainUrl,mainKey,'enterprise_finance_settings?select=*&id=eq.default&limit=1')}catch(e){errors.push('configuración financiera: '+e.message)}
  try{audits=await optionalReq(mainUrl,mainKey,'enterprise_weekly_audits?select=*&order=week_start.desc&limit=20')}catch(e){errors.push('auditorías: '+e.message)}
  try{reconciliations=await optionalReq(mainUrl,mainKey,'enterprise_reconciliations?select=*&order=period_start.desc&limit=30')}catch(e){errors.push('conciliaciones: '+e.message)}
  try{orderPayments=await optionalReq(mainUrl,mainKey,'ts_order_payments?select=*&status=eq.confirmed&order=confirmed_at.desc&limit=10000')}catch(e){errors.push('pagos mixtos: '+e.message)}
  try{staffCashSessions=await optionalReq(mainUrl,mainKey,'ts_staff_cash_sessions?select=*&order=opened_at.desc&limit=1500')}catch(e){errors.push('caja Staff: '+e.message)}
  try{staffCashMovements=await optionalReq(mainUrl,mainKey,'ts_staff_cash_movements?select=*&order=created_at.desc&limit=10000')}catch(e){errors.push('movimientos Caja Staff: '+e.message)}
  try{pettyAccounts=await optionalReq(mainUrl,mainKey,'enterprise_petty_cash_accounts?select=*&active=eq.true&order=created_at.asc&limit=20')}catch(e){errors.push('Caja Chica: '+e.message)}
  try{pettyMovements=await optionalReq(mainUrl,mainKey,'enterprise_petty_cash_movements?select=*&order=occurred_at.desc&limit=10000')}catch(e){errors.push('movimientos Caja Chica: '+e.message)}
  try{pettyAudits=await optionalReq(mainUrl,mainKey,'enterprise_petty_cash_audit?select=*&order=created_at.desc&limit=100')}catch(e){errors.push('auditoría Caja Chica: '+e.message)}

  // Inventory Central: misma fuente operativa del stock; Enterprise solo lee para contabilidad y auditoría.
  try{invProductsRaw=await optionalReq(mainUrl,mainKey,'thinkstore_inventory_products?select=*&workspace_key=eq.main&limit=5000')}catch(e){errors.push('inventory productos: '+e.message)}
  try{invSuppliersRaw=await optionalReq(mainUrl,mainKey,'thinkstore_inventory_suppliers?select=*&workspace_key=eq.main&limit=2500')}catch(e){errors.push('inventory proveedores: '+e.message)}
  try{invPurchasesRaw=await optionalReq(mainUrl,mainKey,'thinkstore_inventory_purchases?select=*&workspace_key=eq.main&limit=5000')}catch(e){errors.push('inventory compras: '+e.message)}
  try{invStockRaw=await optionalReq(mainUrl,mainKey,'thinkstore_inventory_stock?select=*&workspace_key=eq.main&limit=10000')}catch(e){errors.push('inventory stock: '+e.message)}
  try{invUnitsRaw=await optionalReq(mainUrl,mainKey,'thinkstore_inventory_units?select=*&workspace_key=eq.main&limit=10000')}catch(e){errors.push('inventory unidades: '+e.message)}
  try{invBridge=await optionalReq(mainUrl,mainKey,'thinkstore_inventory_bridge?select=*&workspace_key=eq.main&limit=5000')}catch(e){errors.push('inventory bridge: '+e.message)}

  if(supportUrl&&supportKey){
    try{supportOrders=await optionalReq(supportUrl,supportKey,'service_orders?select=*&order=created_at.desc&limit=5000')}catch(e){errors.push('soporte: '+e.message)}
    try{supportEvents=await optionalReq(supportUrl,supportKey,'service_payment_events?select=*&order=occurred_at.desc&limit=5000')}catch(e){errors.push('abonos soporte: '+e.message)}
    try{supportParts=await optionalReq(supportUrl,supportKey,'service_parts?select=*&limit=5000')}catch(e){errors.push('repuestos soporte: '+e.message)}
    try{supportPartMoves=await optionalReq(supportUrl,supportKey,'service_part_movements?select=*&order=created_at.desc&limit=10000')}catch(e){errors.push('consumo repuestos: '+e.message)}
  }else errors.push('soporte: faltan variables SUPPORT_SUPABASE_*');

  const invProducts=invProductsRaw.map(dataRow),invSuppliers=invSuppliersRaw.map(dataRow),invPurchases=invPurchasesRaw.map(dataRow),invStock=invStockRaw.map(dataRow),invUnits=invUnitsRaw.map(dataRow);
  const productMap=new Map(invProducts.map(p=>[String(p.id),p]));
  const supplierMap=new Map(invSuppliers.map(x=>[String(x.id),x]));
  const bridgeByVariant=new Map(),bridgeBySku=new Map();
  invBridge.forEach(b=>{if(b.variant_id)bridgeByVariant.set(String(b.variant_id),b);if(b.sku)bridgeBySku.set(norm(b.sku),b)});

  const cfg=settings?.[0]||{company_share_pct:50,freddy_share_pct:25,nelson_share_pct:25,technician_default_pct:50};
  const weekEntries=entries.filter(e=>entryActive(e)&&inRange(entryDate(e),range));
  const activeEntries=entries.filter(entryActive);
  const paidSales=orders.filter(o=>paymentApproved(o)&&inRange(orderPaidDate(o),range));
  const pendingSales=orders.filter(orderPending);
  const paidOrderIds=new Set(paidSales.map(o=>String(o.id)));
  const paidItems=orderItems.filter(i=>paidOrderIds.has(String(i.pedido_id)));
  const shopCollected=sum(paidSales,o=>o.total_usd);

  // Pagos mixtos: Enterprise usa cada abono real para métodos/conciliación,
  // pero conserva el total del pedido para ingresos y evita duplicar ventas.
  const weekOrderPayments=orderPayments.filter(p=>norm(p.status)==='confirmed'&&paidOrderIds.has(String(p.pedido_id))&&inRange(p.confirmed_at||p.created_at,range));
  const paymentsByOrder=new Map();
  weekOrderPayments.forEach(p=>{const k=String(p.pedido_id);if(!paymentsByOrder.has(k))paymentsByOrder.set(k,[]);paymentsByOrder.get(k).push(p)});

  // Caja Staff: movimientos no derivados de una venta (gastos, ingresos, retiros, ajustes).
  const activeStaffMovements=staffCashMovements.filter(m=>norm(m.status)!=='void');
  const weekStaffMovements=activeStaffMovements.filter(m=>inRange(m.created_at,range));
  const unconvertedStaffVes=weekStaffMovements.filter(m=>clean(m.currency).toUpperCase()==='VES'&&!hasNum(m.usd_equivalent));
  if(unconvertedStaffVes.length)errors.push(`Caja Staff: ${unconvertedStaffVes.length} movimiento(s) VES histórico(s) sin equivalencia USD; se muestran pero no alteran la utilidad hasta registrar tasa histórica.`);
  const staffOtherIncome=sum(weekStaffMovements.filter(m=>m.type==='ingreso'&&m.direction==='in'),staffMovementUsd);
  const staffOperatingExpenses=sum(weekStaffMovements.filter(m=>['gasto','devolucion'].includes(m.type)&&m.direction==='out'),staffMovementUsd);

  // Caja Chica: movimientos propios, sin convertir una reposición de fondos en gasto.
  const activePetty=pettyMovements.filter(m=>norm(m.status)!=='void');
  const weekPetty=activePetty.filter(m=>inRange(m.occurred_at||m.created_at,range));
  const pettyExpense=sum(weekPetty.filter(m=>m.movement_type==='expense'&&m.direction==='out'),m=>m.usd_equivalent);
  const pettyRefund=sum(weekPetty.filter(m=>m.movement_type==='refund'&&m.direction==='in'),m=>m.usd_equivalent);
  const pettyOperatingNet=money(pettyExpense-pettyRefund);
  const pettyFundedByPartner=partner=>sum(activePetty.filter(m=>m.movement_type==='fund'&&m.funded_by===partner),m=>m.usd_equivalent);
  const pettyFundedByPartnerWeek=sum(weekPetty.filter(m=>m.movement_type==='fund'&&['freddy','nelson'].includes(clean(m.funded_by))),m=>m.usd_equivalent);

  // Costo de mercancía vendida. Prioridad: snapshot histórico de la línea; fallback al costo actual de Inventory.
  let costedLines=0,missingCostLines=0;
  const itemCost=i=>{
    const qty=Math.max(1,num(i.cantidad)||1);
    if(hasNum(i.cost_total_usd)){costedLines++;return Math.max(0,num(i.cost_total_usd))}
    if(hasNum(i.unit_cost_usd)){costedLines++;return Math.max(0,num(i.unit_cost_usd))*qty}
    let pid=clean(i.inventory_product_id),bridge=null;
    if(!pid&&i.inventory_variant_id)bridge=bridgeByVariant.get(String(i.inventory_variant_id));
    if(!bridge&&i.sku)bridge=bridgeBySku.get(norm(i.sku));
    if(!pid&&bridge)pid=clean(bridge.inventory_product_id);
    let p=pid?productMap.get(String(pid)):null;
    if(!p&&i.sku)p=invProducts.find(x=>norm(x.sku)===norm(i.sku));
    if(p&&hasNum(p.purchase_price)){costedLines++;return Math.max(0,num(p.purchase_price))*qty}
    missingCostLines++;return 0;
  };
  const storeCogs=money(paidItems.reduce((n,i)=>n+itemCost(i),0));
  const storeGrossMargin=money(shopCollected-storeCogs);
  const storeGrossMarginPct=shopCollected>0?money(storeGrossMargin/shopCollected*100):0;

  // Valor actual del inventario a costo.
  const stockByProduct=new Map();invStock.forEach(s=>stockByProduct.set(String(s.product_id),num(stockByProduct.get(String(s.product_id)))+Math.max(0,num(s.quantity))));
  const unitsByProduct=new Map();invUnits.filter(u=>!['vendido','baja'].includes(norm(u.status))).forEach(u=>unitsByProduct.set(String(u.product_id),(unitsByProduct.get(String(u.product_id))||0)+1));
  const inventoryValue=money(invProducts.reduce((total,p)=>{const qty=norm(p.tracking_mode)==='quantity'?(stockByProduct.get(String(p.id))||0):(unitsByProduct.get(String(p.id))||0);return total+qty*Math.max(0,num(p.purchase_price))},0));

  // Compras de Inventory: son adquisición de activo/mercancía. Afectan caja y cuentas por pagar, pero NO se descuentan nuevamente como gasto al calcular utilidad; el P&L usa COGS.
  const activePurchases=invPurchases.filter(p=>norm(p.status)!=='void');
  const purchasePayments=[];
  activePurchases.forEach(p=>arr(p.payments).forEach(pay=>purchasePayments.push({...pay,purchase_id:p.id,product_id:p.product_id,product_name:p.product_name,supplier_id:p.supplier_id,supplier_name:p.supplier_name,purchase_total:num(p.total_usd)})));
  const weekPurchasePayments=purchasePayments.filter(p=>inRange(p.occurred_at||p.created_at,range));
  const weekPurchases=activePurchases.filter(p=>inRange(p.purchase_date?`${p.purchase_date}T12:00:00-04:00`:p.created_at,range));
  const purchaseValueWeek=sum(weekPurchases,p=>p.total_usd);
  const purchaseCashWeek=sum(weekPurchasePayments,p=>p.amount_usd);
  const supplierPayable=money(activePurchases.reduce((n,p)=>n+Math.max(0,num(p.total_usd)-sum(arr(p.payments),x=>x.amount_usd)),0));
  const payablePurchases=activePurchases.map(p=>{const paid=sum(arr(p.payments),x=>x.amount_usd),pending=Math.max(0,money(num(p.total_usd)-paid));return{...p,paid_usd:paid,pending_usd:pending,supplier_name:p.supplier_name||supplierMap.get(String(p.supplier_id))?.name||''}}).filter(p=>p.pending_usd>0).sort((a,b)=>b.pending_usd-a.pending_usd);

  let supportCollected=0;
  const weekSupportEvents=supportEvents.filter(e=>inRange(e.occurred_at||e.created_at,range));
  if(weekSupportEvents.length){supportCollected=sum(weekSupportEvents,e=>e.amount_delta)}
  else supportCollected=sum(supportOrders.filter(o=>num(o.amount_paid)>0&&inRange(o.paid_at||o.updated_at||o.created_at,range)),o=>o.amount_paid);
  const supportPendingRows=supportOrders.filter(o=>servicePendingAmount(o)>0);
  const supportPending=sum(supportPendingRows,servicePendingAmount);

  // Costos reales de repuestos consumidos en Soporte.
  const supportPartMap=new Map(supportParts.map(p=>[String(p.id),p]));
  const consumedMove=m=>num(m.quantity)<0||/consumo|salida|utiliz|instalad/.test(norm(m.movement_type));
  const realPartsByOrder=new Map();
  supportPartMoves.filter(consumedMove).forEach(m=>{const p=supportPartMap.get(String(m.part_id)),cost=Math.abs(num(m.quantity))*Math.max(0,num(p?.unit_cost));if(m.order_id){const key=String(m.order_id);realPartsByOrder.set(key,money((realPartsByOrder.get(key)||0)+cost))}});
  const weekConsumedMoves=supportPartMoves.filter(m=>consumedMove(m)&&inRange(m.created_at,range));
  const supportPartsActual=sum(weekConsumedMoves,m=>Math.abs(num(m.quantity))*Math.max(0,num(supportPartMap.get(String(m.part_id))?.unit_cost)));

  const otherIncome=money(sum(weekEntries.filter(e=>e.entry_type==='other_income'||e.entry_type==='receivable_collection'),e=>e.amount_usd)+staffOtherIncome);
  const operatingExpenses=money(sum(weekEntries.filter(e=>isOperatingExpenseType(e.entry_type)),e=>e.amount_usd)+staffOperatingExpenses+pettyOperatingNet);
  const manualPurchaseCash=sum(weekEntries.filter(e=>e.entry_type==='purchase'),e=>e.amount_usd);
  const techAccrued=sum(weekEntries.filter(e=>e.entry_type==='technician_commission'),e=>e.amount_usd);
  const commissionEntries=weekEntries.filter(e=>e.entry_type==='technician_commission');
  const supportDirectCosts=sum(commissionEntries,e=>e.metadata?.direct_cost);
  const supportPartsFallback=sum(commissionEntries.filter(e=>{
    const sid=String(e.source_id||'');const code=String(e.source_code||'');return !(realPartsByOrder.get(sid)||realPartsByOrder.get(code));
  }),e=>e.metadata?.parts_cost);
  const supportPartsCost=money(supportPartsActual+supportPartsFallback);

  const distributableRaw=money(shopCollected-storeCogs+supportCollected-supportPartsCost-supportDirectCosts+otherIncome-operatingExpenses-techAccrued);
  const distributable=Math.max(0,distributableRaw);
  const grossCollected=money(shopCollected+supportCollected+otherIncome);

  const shareCompany=money(distributable*num(cfg.company_share_pct)/100);
  const shareFreddy=money(distributable*num(cfg.freddy_share_pct)/100);
  const shareNelson=money(distributable*num(cfg.nelson_share_pct)/100);

  const purchaseFundedAll=partner=>sum(purchasePayments.filter(p=>clean(p.funded_by)===partner),p=>p.amount_usd);
  const partnerBalance=partner=>{
    const lent=sum(activeEntries.filter(e=>e.entry_type==='partner_advance'&&e.partner_key===partner),e=>e.amount_usd);
    const fundedManual=sum(activeEntries.filter(e=>isCashExpenseType(e.entry_type)&&e.funded_by===partner),e=>e.amount_usd);
    const fundedPurchases=purchaseFundedAll(partner);
    const fundedPetty=pettyFundedByPartner(partner);
    const repaid=sum(activeEntries.filter(e=>e.entry_type==='partner_repayment'&&e.partner_key===partner),e=>e.amount_usd);
    return{partner,advances:lent,company_expenses_paid:fundedManual,inventory_purchases_paid:fundedPurchases,petty_cash_funded:fundedPetty,repaid,balance:money(lent+fundedManual+fundedPurchases+fundedPetty-repaid)};
  };
  const partners={freddy:partnerBalance('freddy'),nelson:partnerBalance('nelson')};

  const manualReceivables=activeEntries.filter(e=>e.entry_type==='receivable');
  const linkedCollections=new Map();
  activeEntries.filter(e=>e.entry_type==='receivable_collection'&&e.related_entry_id).forEach(e=>linkedCollections.set(e.related_entry_id,money((linkedCollections.get(e.related_entry_id)||0)+num(e.amount_usd))));
  const manualReceivableRows=manualReceivables.map(e=>({...e,collected_usd:linkedCollections.get(e.id)||0,pending_usd:Math.max(0,money(num(e.amount_usd)-(linkedCollections.get(e.id)||0)))})).filter(e=>e.pending_usd>0);
  const manualPending=sum(manualReceivableRows,e=>e.pending_usd);
  const pendingTotal=money(sum(pendingSales,o=>o.total_usd)+supportPending+manualPending);

  const commissions=activeEntries.filter(e=>e.entry_type==='technician_commission');
  const techPayments=new Map();
  activeEntries.filter(e=>e.entry_type==='technician_payment'&&e.related_entry_id).forEach(e=>techPayments.set(e.related_entry_id,money((techPayments.get(e.related_entry_id)||0)+num(e.amount_usd))));
  const commissionRows=commissions.map(e=>({...e,paid_usd:techPayments.get(e.id)||0,pending_usd:Math.max(0,money(num(e.amount_usd)-(techPayments.get(e.id)||0)))}));
  const techPending=sum(commissionRows,e=>e.pending_usd);

  const methodMap={};
  paidSales.forEach(o=>{
    const lines=paymentsByOrder.get(String(o.id))||[];
    if(lines.length)lines.forEach(p=>addMethod(methodMap,p.method,num(p.usd_equivalent),'Tienda · pago mixto'));
    else addMethod(methodMap,o.metodo_pago||o.payment_method,o.total_usd,'Tienda');
  });
  if(weekSupportEvents.length){weekSupportEvents.filter(e=>num(e.amount_delta)!==0).forEach(e=>addMethod(methodMap,e.payment_method,e.amount_delta,'Servicio Técnico'))}
  else{supportOrders.filter(o=>num(o.amount_paid)>0&&inRange(o.paid_at||o.updated_at||o.created_at,range)).forEach(o=>addMethod(methodMap,o.payment_method,o.amount_paid,'Servicio Técnico'))}
  weekEntries.filter(e=>['other_income','receivable_collection'].includes(e.entry_type)).forEach(e=>addMethod(methodMap,e.payment_method,e.amount_usd,'Enterprise'));
  weekStaffMovements.filter(m=>m.type==='ingreso'&&m.direction==='in'&&staffMovementUsd(m)>0).forEach(m=>addMethod(methodMap,m.method,staffMovementUsd(m),'Caja Staff'));
  const paymentMethods=Object.values(methodMap).sort((a,b)=>b.amount-a.amount);
  const purchaseMethodMap={};weekPurchasePayments.forEach(p=>addMethod(purchaseMethodMap,p.payment_method,p.amount_usd,'Compras Inventory'));
  const purchasePaymentMethods=Object.values(purchaseMethodMap).sort((a,b)=>b.amount-a.amount);

  // V10.9 · Conciliación: movimiento esperado por método.
  // Solo se resta dinero realmente pagado por la empresa; si pagó Freddy/Nelson,
  // queda como deuda con el socio y no altera la caja de ThinkStore hasta el reembolso.
  const reconMap={};
  const reconLine=method=>{const k=normalizeMethod(method);if(!reconMap[k])reconMap[k]={method:k,inflow:0,outflow:0,in_count:0,out_count:0,sources:{}};return reconMap[k]};
  const reconIn=(method,amount,source)=>{const x=reconLine(method);x.inflow=money(x.inflow+num(amount));x.in_count++;x.sources[source]=(x.sources[source]||0)+1};
  const reconOut=(method,amount,source)=>{const x=reconLine(method);x.outflow=money(x.outflow+num(amount));x.out_count++;x.sources[source]=(x.sources[source]||0)+1};
  paidSales.forEach(o=>{
    const lines=paymentsByOrder.get(String(o.id))||[];
    if(lines.length)lines.forEach(p=>reconIn(p.method,num(p.usd_equivalent),'Tienda · pago mixto'));
    else reconIn(o.metodo_pago||o.payment_method,o.total_usd,'Tienda');
  });
  if(weekSupportEvents.length){weekSupportEvents.forEach(e=>{const a=num(e.amount_delta);if(a>0)reconIn(e.payment_method,a,'Servicio Técnico');else if(a<0)reconOut(e.payment_method,Math.abs(a),'Reverso Servicio Técnico')})}
  else{supportOrders.filter(o=>num(o.amount_paid)>0&&inRange(o.paid_at||o.updated_at||o.created_at,range)).forEach(o=>reconIn(o.payment_method,o.amount_paid,'Servicio Técnico'))}
  weekEntries.filter(e=>e.entry_type==='other_income'||e.entry_type==='receivable_collection').forEach(e=>reconIn(e.payment_method,e.amount_usd,'Enterprise'));
  weekEntries.filter(e=>e.entry_type==='partner_advance').forEach(e=>reconIn(e.payment_method,e.amount_usd,'Aporte socio'));
  weekEntries.filter(e=>isCashExpenseType(e.entry_type)&&clean(e.funded_by||'company')==='company').forEach(e=>reconOut(e.payment_method,e.amount_usd,'Gasto Enterprise'));
  weekPurchasePayments.filter(p=>clean(p.funded_by||'company')==='company').forEach(p=>reconOut(p.payment_method,p.amount_usd,'Compras Inventory'));
  weekEntries.filter(e=>e.entry_type==='partner_repayment').forEach(e=>reconOut(e.payment_method,e.amount_usd,'Devolución socio'));
  weekEntries.filter(e=>e.entry_type==='technician_payment').forEach(e=>reconOut(e.payment_method,e.amount_usd,'Pago técnico'));

  // Movimientos de Caja Staff ajenos a ventas: entradas/salidas reales por método.
  weekStaffMovements.forEach(m=>{
    const usd=staffMovementUsd(m);if(!(usd>0))return;
    if(m.direction==='in')reconIn(m.method,usd,'Caja Staff');
    else reconOut(m.method,usd,'Caja Staff');
  });

  // Caja Chica: la reposición es transferencia interna; el gasto sale desde la propia Caja Chica.
  weekPetty.forEach(m=>{
    const usd=num(m.usd_equivalent);if(!(usd>0))return;
    const petty=pettyMethod(m);
    if(m.movement_type==='fund'){
      if(clean(m.funded_by||'company')==='company'&&m.source_payment_method)reconOut(m.source_payment_method,usd,'Fondeo Caja Chica');
      reconIn(petty,usd,m.funded_by==='company'?'Caja Chica':'Aporte socio Caja Chica');
    }else if(m.direction==='in')reconIn(petty,usd,'Caja Chica');
    else reconOut(petty,usd,'Caja Chica');
  });

  const previousRecon=[...reconciliations].filter(r=>r.status==='closed'&&String(r.period_end||'')<range.start).sort((a,b)=>String(b.period_end).localeCompare(String(a.period_end)))[0]||null;
  const previousActual=previousRecon?.actual&&typeof previousRecon.actual==='object'?previousRecon.actual:{};
  const currentRecon=reconciliations.find(r=>String(r.period_start)===range.start&&String(r.period_end)===range.end&&String(r.period_type||'weekly')==='weekly')||null;
  const currentActual=currentRecon?.actual&&typeof currentRecon.actual==='object'?currentRecon.actual:{};
  const reconMethods=new Set([...Object.keys(reconMap),...Object.keys(previousActual),...Object.keys(currentActual)]);
  const reconciliationLines=[...reconMethods].sort().map(method=>{
    const x=reconMap[method]||{method,inflow:0,outflow:0,in_count:0,out_count:0,sources:{}};
    const saved=currentActual[method]||{};const prev=previousActual[method]||{};
    const opening=hasNum(saved.opening_balance)?num(saved.opening_balance):(hasNum(prev.actual_closing)?num(prev.actual_closing):0);
    const expectedClosing=money(opening+num(x.inflow)-num(x.outflow));
    const actualClosing=hasNum(saved.actual_closing)?num(saved.actual_closing):null;
    return{...x,opening_balance:money(opening),expected_closing:expectedClosing,actual_closing:actualClosing,difference:actualClosing===null?null:money(actualClosing-expectedClosing),notes:clean(saved.notes)};
  });
  const reconExpectedTotal=money(reconciliationLines.reduce((n,x)=>n+num(x.expected_closing),0));
  const reconActualKnown=reconciliationLines.filter(x=>x.actual_closing!==null);
  const reconActualTotal=money(reconActualKnown.reduce((n,x)=>n+num(x.actual_closing),0));
  const reconDifferenceTotal=reconActualKnown.length===reconciliationLines.length&&reconciliationLines.length?money(reconActualTotal-reconExpectedTotal):null;

  const staffAdjustmentIn=sum(weekStaffMovements.filter(m=>m.type==='ajuste'&&m.direction==='in'),staffMovementUsd);
  const staffAdjustmentOut=sum(weekStaffMovements.filter(m=>m.type==='ajuste'&&m.direction==='out'),staffMovementUsd);
  const pettyAdjustmentIn=sum(weekPetty.filter(m=>m.movement_type==='adjustment'&&m.direction==='in'),m=>m.usd_equivalent);
  const pettyAdjustmentOut=sum(weekPetty.filter(m=>m.movement_type==='adjustment'&&m.direction==='out'),m=>m.usd_equivalent);
  const cashIn=money(grossCollected+sum(weekEntries.filter(e=>e.entry_type==='partner_advance'),e=>e.amount_usd)+pettyFundedByPartnerWeek+pettyRefund+pettyAdjustmentIn+staffAdjustmentIn);
  const companyManualCash=sum(weekEntries.filter(e=>isCashExpenseType(e.entry_type)&&e.funded_by==='company'),e=>e.amount_usd);
  const companyInventoryCash=sum(weekPurchasePayments.filter(p=>clean(p.funded_by||'company')==='company'),p=>p.amount_usd);
  const repayments=sum(weekEntries.filter(e=>e.entry_type==='partner_repayment'),e=>e.amount_usd);
  const techPaid=sum(weekEntries.filter(e=>e.entry_type==='technician_payment'),e=>e.amount_usd);
  const cashOut=money(companyManualCash+companyInventoryCash+repayments+techPaid+staffOperatingExpenses+pettyExpense+pettyAdjustmentOut+staffAdjustmentOut);

  const pettyBalanceUsd=money(activePetty.filter(m=>clean(m.currency).toUpperCase()==='USD').reduce((n,m)=>n+movementSigned(m,x=>x.amount),0));
  const pettyBalanceVes=money(activePetty.filter(m=>clean(m.currency).toUpperCase()==='VES').reduce((n,m)=>n+movementSigned(m,x=>x.amount),0));
  const pettyAccount=pettyAccounts.find(a=>a.slug==='main')||pettyAccounts[0]||null;
  const staffOpenSessions=staffCashSessions.filter(x=>x.status==='open');
  const staffClosedWeek=staffCashSessions.filter(x=>x.status==='closed'&&inRange(x.closed_at||x.updated_at||x.opened_at,range));

  const enrichedSupport=supportOrders.slice(0,250).map(o=>({id:o.id,code:o.code,client_name:o.client_name,device_model:o.device_model,service_type:o.service_type,quote_amount:num(o.quote_amount),amount_paid:num(o.amount_paid),payment_method:o.payment_method,assigned_technician_email:o.assigned_technician_email,status:o.status,created_at:o.created_at,updated_at:o.updated_at,parts_cost:money(realPartsByOrder.get(String(o.id))||realPartsByOrder.get(String(o.code))||0)}));
  const pnlCosts=money(storeCogs+supportPartsCost+supportDirectCosts+operatingExpenses+techAccrued);
  const costCoverage=paidItems.length?money(costedLines/paidItems.length*100):100;

  return{
    ok:true,generated_at:new Date().toISOString(),timezone:'America/Caracas',period:{start:range.start,end:range.end},
    settings:{company_pct:num(cfg.company_share_pct)||50,freddy_pct:num(cfg.freddy_share_pct)||25,nelson_pct:num(cfg.nelson_share_pct)||25,technician_pct:num(cfg.technician_default_pct)||50},
    collections:{shop:shopCollected,support:supportCollected,other:otherIncome,gross:grossCollected},
    outflows:{
      operating_expenses:operatingExpenses,store_cogs:storeCogs,support_parts:supportPartsCost,support_direct:supportDirectCosts,
      technician_commissions:techAccrued,expenses_and_purchases:money(operatingExpenses+storeCogs+supportPartsCost+supportDirectCosts),
      inventory_purchase_cash:purchaseCashWeek,inventory_purchase_value:purchaseValueWeek,manual_purchase_cash:manualPurchaseCash,total:pnlCosts
    },
    result:{net:distributableRaw,distributable,company:shareCompany,freddy:shareFreddy,nelson:shareNelson,loss_carry:distributableRaw<0?Math.abs(distributableRaw):0},
    cash:{in:cashIn,out:cashOut,net:money(cashIn-cashOut),inventory_purchases_paid:purchaseCashWeek},
    partners,receivables:{store:sum(pendingSales,o=>o.total_usd),support:supportPending,manual:manualPending,total:pendingTotal,manual_rows:manualReceivableRows.slice(0,100)},
    technicians:{accrued_week:techAccrued,pending_total:techPending,commissions:commissionRows.slice(0,100)},
    inventory:{
      connected:invProductsRaw.length>0||invBridge.length>0,value:inventoryValue,cogs_week:storeCogs,gross_margin_week:storeGrossMargin,gross_margin_pct:storeGrossMarginPct,
      purchase_value_week:purchaseValueWeek,purchase_cash_week:purchaseCashWeek,supplier_payable:supplierPayable,products_count:invProducts.length,supplier_count:invSuppliers.length,
      cost_coverage_pct:costCoverage,costed_lines:costedLines,missing_cost_lines:missingCostLines,purchases:activePurchases.slice(0,100),payables:payablePurchases.slice(0,100),suppliers:invSuppliers.slice(0,100)
    },
    payment_methods:paymentMethods,purchase_payment_methods:purchasePaymentMethods,
    mixed_payments:{connected:Array.isArray(orderPayments),lines_week:weekOrderPayments.slice(0,500),count_week:weekOrderPayments.length},
    staff_cash:{
      connected:Array.isArray(staffCashSessions)&&Array.isArray(staffCashMovements),
      open_sessions:staffOpenSessions.length,closed_week:staffClosedWeek.length,
      sessions:staffCashSessions.slice(0,100),movements_week:weekStaffMovements.slice(0,250),
      other_income_week:staffOtherIncome,operating_expenses_week:staffOperatingExpenses,
      unconverted_ves:unconvertedStaffVes.length
    },
    petty_cash:{
      connected:Array.isArray(pettyAccounts)&&Array.isArray(pettyMovements),account:pettyAccount,
      balance_usd:pettyBalanceUsd,balance_ves:pettyBalanceVes,
      spent_week:pettyExpense,refunds_week:pettyRefund,net_expense_week:pettyOperatingNet,
      funded_week:sum(weekPetty.filter(m=>m.movement_type==='fund'),m=>m.usd_equivalent),
      movements:activePetty.slice(0,250),audits:pettyAudits.slice(0,50)
    },
    reconciliation:{
      current:currentRecon,previous:previousRecon,lines:reconciliationLines,
      totals:{expected:reconExpectedTotal,actual:reconActualTotal,difference:reconDifferenceTotal,completed:reconActualKnown.length===reconciliationLines.length&&reconciliationLines.length>0},
      history:reconciliations.slice(0,20)
    },
    entries:weekEntries.slice(0,200),support_orders:enrichedSupport,audits:audits.slice(0,20),
    quality:{
      finance_tables_ready:Array.isArray(settings)&&settings.length>0,
      support_payment_events:weekSupportEvents.length>0||supportEvents.length>0,
      inventory_connected:invProductsRaw.length>0||invBridge.length>0,
      inventory_purchases_table:Array.isArray(invPurchasesRaw),inventory_cost_coverage_pct:costCoverage,
      support_parts_connected:supportParts.length>0||supportPartMoves.length>0,
      reconciliation_table:Array.isArray(reconciliations),
      mixed_payments_table:Array.isArray(orderPayments),staff_cash_table:Array.isArray(staffCashSessions),
      petty_cash_table:Array.isArray(pettyAccounts),staff_cash_unconverted_ves:unconvertedStaffVes.length,errors
    }
  };
}
async function insertEntry(mainUrl,mainKey,auth,body){
  const allowed=['expense','purchase','refund','fee','warranty_cost','other_income','receivable','receivable_collection','partner_advance','partner_repayment','technician_commission','technician_payment','cash_adjustment'];
  const type=clean(body.entry_type);
  if(!allowed.includes(type))throw Object.assign(new Error('Tipo de movimiento no permitido'),{status:400});
  let amount=money(body.amount_usd);if(amount<0)amount=Math.abs(amount);if(!(amount>0))throw Object.assign(new Error('Indica un monto mayor que cero'),{status:400});
  const row={
    occurred_at:body.occurred_at||new Date().toISOString(),entry_type:type,category:clean(body.category)||null,
    description:clean(body.description)||type,amount_usd:amount,
    original_amount:body.original_amount===undefined||body.original_amount===null?null:money(body.original_amount),
    currency:(clean(body.currency)||'USD').toUpperCase().slice(0,10),exchange_rate:body.exchange_rate?num(body.exchange_rate):null,
    payment_method:clean(body.payment_method)||null,reference:clean(body.reference)||null,counterparty:clean(body.counterparty)||null,
    partner_key:['freddy','nelson'].includes(clean(body.partner_key))?clean(body.partner_key):null,
    funded_by:['company','freddy','nelson'].includes(clean(body.funded_by))?clean(body.funded_by):'company',
    source_system:clean(body.source_system)||'manual',source_id:clean(body.source_id)||null,source_code:clean(body.source_code)||null,
    related_entry_id:clean(body.related_entry_id)||null,status:clean(body.status)||'posted',notes:clean(body.notes)||null,
    metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{},created_by_email:auth.user.email||null,created_by_name:actorName(auth)
  };
  const data=await req(mainUrl,mainKey,'enterprise_finance_entries',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
  return data?.[0]||row;
}

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:H,body:''};
  const mainUrl=clean(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL).replace(/\/$/,'');
  const mainKey=clean(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY);
  const supportUrl=clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/$/,'');
  const supportKey=clean(process.env.SUPPORT_SUPABASE_SECRET_KEY||process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY);
  if(!mainUrl||!mainKey)return out(501,{ok:false,error:'Falta configurar el Supabase principal en Enterprise'});
  const auth=await authManager(event,mainUrl,mainKey);if(!auth.ok)return out(403,{ok:false,error:auth.error});
  const range=weekRange(event.queryStringParameters?.week||event.queryStringParameters?.date);

  try{
    if(event.httpMethod==='GET')return out(200,await buildSummary({mainUrl,mainKey,supportUrl,supportKey,range}));
    if(event.httpMethod!=='POST')return out(405,{ok:false,error:'Método no permitido'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return out(400,{ok:false,error:'JSON inválido'})}
    const action=clean(body.action);

    if(action==='petty_cash_movement'){
      const payload={
        account_id:clean(body.account_id)||null,
        movement_type:clean(body.movement_type),
        direction:clean(body.direction),
        currency:clean(body.currency).toUpperCase(),
        amount:money(body.amount),
        usd_equivalent:money(body.usd_equivalent),
        bcv_rate:body.bcv_rate?num(body.bcv_rate):null,
        bcv_effective_date:clean(body.bcv_effective_date)||null,
        bcv_source:clean(body.bcv_source)||null,
        bcv_checked_at:clean(body.bcv_checked_at)||null,
        category:clean(body.category)||null,
        vendor:clean(body.vendor)||null,
        description:clean(body.description),
        source_payment_method:clean(body.source_payment_method)||null,
        reference:clean(body.reference)||null,
        receipt_url:clean(body.receipt_url)||null,
        funded_by:['company','freddy','nelson'].includes(clean(body.funded_by))?clean(body.funded_by):'company',
        occurred_at:clean(body.occurred_at)||null
      };
      if(!(payload.amount>0))return out(400,{ok:false,error:'Indica un monto de Caja Chica mayor que cero'});
      if(payload.currency==='USD'){payload.usd_equivalent=payload.amount;payload.bcv_rate=null;payload.bcv_effective_date=null;payload.bcv_source=null;payload.bcv_checked_at=null}
      if(payload.currency==='VES'&&(!(payload.bcv_rate>0)||!(payload.usd_equivalent>0)||!payload.bcv_effective_date))return out(400,{ok:false,error:'Caja Chica en bolívares requiere tasa BCV vigente e histórica'});
      const data=await req(mainUrl,mainKey,'rpc/ts_enterprise_petty_cash_action',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_actor:auth.user.id,p_actor_email:auth.user.email||'',p_action:'movement',p_data:payload})});
      return out(200,{ok:true,movement:data,summary:await buildSummary({mainUrl,mainKey,supportUrl,supportKey,range})});
    }
    if(action==='petty_cash_void'){
      const id=clean(body.id),reason=clean(body.reason);
      if(!id||reason.length<5)return out(400,{ok:false,error:'Indica el movimiento y el motivo de anulación'});
      const data=await req(mainUrl,mainKey,'rpc/ts_enterprise_petty_cash_action',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_actor:auth.user.id,p_actor_email:auth.user.email||'',p_action:'void',p_data:{id,reason}})});
      return out(200,{ok:true,movement:data,summary:await buildSummary({mainUrl,mainKey,supportUrl,supportKey,range})});
    }
    if(action==='petty_cash_account'){
      const data=await req(mainUrl,mainKey,'rpc/ts_enterprise_petty_cash_action',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_actor:auth.user.id,p_actor_email:auth.user.email||'',p_action:'account',p_data:{account_id:clean(body.account_id)||null,custodian_name:clean(body.custodian_name),custodian_email:clean(body.custodian_email),target_usd:money(body.target_usd),target_ves:money(body.target_ves)}})});
      return out(200,{ok:true,account:data,summary:await buildSummary({mainUrl,mainKey,supportUrl,supportKey,range})});
    }

    if(action==='create_entry'){
      const entry=await insertEntry(mainUrl,mainKey,auth,body);
      return out(200,{ok:true,entry,summary:await buildSummary({mainUrl,mainKey,supportUrl,supportKey,range})});
    }
    if(action==='create_technician_commission'){
      const gross=money(body.gross_service_amount),parts=money(body.parts_cost),direct=money(body.direct_cost),rate=Math.min(100,Math.max(0,num(body.rate_pct||50)));
      const base=Math.max(0,money(gross-parts-direct)),commission=money(base*rate/100);
      if(!(gross>0))return out(400,{ok:false,error:'Indica el valor cobrado del servicio'});
      if(!(commission>0))return out(400,{ok:false,error:'La base neta del servicio no genera comisión'});
      const entry=await insertEntry(mainUrl,mainKey,auth,{
        entry_type:'technician_commission',amount_usd:commission,description:clean(body.description)||`Comisión técnica ${clean(body.source_code)||''}`,
        category:'Servicio Técnico',counterparty:clean(body.technician_name||body.technician_email)||'Técnico',source_system:'support',source_id:clean(body.service_order_id),source_code:clean(body.source_code),funded_by:'company',status:'pending',
        metadata:{technician_email:clean(body.technician_email),technician_name:clean(body.technician_name),service_type:clean(body.service_type),gross_service_amount:gross,parts_cost:parts,direct_cost:direct,commission_base:base,rate_pct:rate}
      });
      return out(200,{ok:true,entry,calculation:{gross,parts,direct,base,rate,commission},summary:await buildSummary({mainUrl,mainKey,supportUrl,supportKey,range})});
    }
    if(action==='settle_technician_commission'){
      const id=clean(body.commission_id);if(!id)return out(400,{ok:false,error:'Comisión requerida'});
      const rows=await req(mainUrl,mainKey,`enterprise_finance_entries?select=*&id=eq.${encodeURIComponent(id)}&entry_type=eq.technician_commission&limit=1`);const c=rows?.[0];if(!c)return out(404,{ok:false,error:'Comisión no encontrada'});
      const paidRows=await req(mainUrl,mainKey,`enterprise_finance_entries?select=amount_usd&related_entry_id=eq.${encodeURIComponent(id)}&entry_type=eq.technician_payment&status=neq.void`);const already=sum(paidRows,e=>e.amount_usd);const due=Math.max(0,money(num(c.amount_usd)-already));const amount=Math.min(due,money(body.amount_usd||due));if(!(amount>0))return out(400,{ok:false,error:'La comisión ya está pagada'});
      const entry=await insertEntry(mainUrl,mainKey,auth,{entry_type:'technician_payment',amount_usd:amount,description:`Pago comisión · ${c.source_code||c.counterparty||'Servicio Técnico'}`,counterparty:c.counterparty,related_entry_id:id,payment_method:body.payment_method,reference:body.reference,funded_by:'company',status:'paid',metadata:{technician_email:c.metadata?.technician_email||null}});
      return out(200,{ok:true,entry,summary:await buildSummary({mainUrl,mainKey,supportUrl,supportKey,range})});
    }
    if(action==='collect_receivable'){
      const id=clean(body.receivable_id);if(!id)return out(400,{ok:false,error:'Cuenta por cobrar requerida'});
      const rows=await req(mainUrl,mainKey,`enterprise_finance_entries?select=*&id=eq.${encodeURIComponent(id)}&entry_type=eq.receivable&limit=1`);const r=rows?.[0];if(!r)return out(404,{ok:false,error:'Cuenta por cobrar no encontrada'});
      const cols=await req(mainUrl,mainKey,`enterprise_finance_entries?select=amount_usd&related_entry_id=eq.${encodeURIComponent(id)}&entry_type=eq.receivable_collection&status=neq.void`);const already=sum(cols,e=>e.amount_usd),due=Math.max(0,money(num(r.amount_usd)-already));const amount=Math.min(due,money(body.amount_usd||due));if(!(amount>0))return out(400,{ok:false,error:'La cuenta por cobrar ya está saldada'});
      const entry=await insertEntry(mainUrl,mainKey,auth,{entry_type:'receivable_collection',amount_usd:amount,description:`Cobro · ${r.description}`,counterparty:r.counterparty,related_entry_id:id,payment_method:body.payment_method,reference:body.reference,source_system:r.source_system||'manual',source_id:r.source_id,status:'paid'});
      return out(200,{ok:true,entry,summary:await buildSummary({mainUrl,mainKey,supportUrl,supportKey,range})});
    }
    if(action==='void_entry'){
      const id=clean(body.id);if(!id)return out(400,{ok:false,error:'Movimiento requerido'});
      const data=await req(mainUrl,mainKey,`enterprise_finance_entries?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'void',notes:clean(body.notes)||'Anulado desde Enterprise'})});
      return out(200,{ok:true,entry:data?.[0]||null,summary:await buildSummary({mainUrl,mainKey,supportUrl,supportKey,range})});
    }
    if(action==='save_reconciliation'){
      const summary=await buildSummary({mainUrl,mainKey,supportUrl,supportKey,range});
      const lines=Array.isArray(body.lines)?body.lines:[];
      const expectedByMethod={};const actualByMethod={};const diffByMethod={};
      for(const base of summary.reconciliation?.lines||[]){
        const method=normalizeMethod(base.method);const input=lines.find(x=>normalizeMethod(x.method)===method)||{};
        const opening=hasNum(input.opening_balance)?money(input.opening_balance):money(base.opening_balance);
        const actualClosing=hasNum(input.actual_closing)?money(input.actual_closing):null;
        const expectedClosing=money(opening+num(base.inflow)-num(base.outflow));
        expectedByMethod[method]={method,inflow:money(base.inflow),outflow:money(base.outflow),opening_balance:opening,expected_closing:expectedClosing,in_count:num(base.in_count),out_count:num(base.out_count),sources:base.sources||{}};
        actualByMethod[method]={opening_balance:opening,actual_closing:actualClosing,notes:clean(input.notes)};
        diffByMethod[method]={difference:actualClosing===null?null:money(actualClosing-expectedClosing)};
      }
      const expectedTotal=money(Object.values(expectedByMethod).reduce((n,x)=>n+num(x.expected_closing),0));
      const actualVals=Object.values(actualByMethod);const complete=actualVals.length>0&&actualVals.every(x=>x.actual_closing!==null);
      const actualTotal=money(actualVals.reduce((n,x)=>n+num(x.actual_closing),0));
      const differenceTotal=complete?money(actualTotal-expectedTotal):0;
      const status=body.close===true?'closed':'review';
      const row={period_type:'weekly',period_start:range.start,period_end:range.end,status,expected:expectedByMethod,actual:actualByMethod,differences:diffByMethod,total_expected:expectedTotal,total_actual:actualTotal,total_difference:differenceTotal,notes:clean(body.notes)||null,created_by_email:auth.user.email||null,created_by_name:actorName(auth),closed_at:status==='closed'?new Date().toISOString():null};
      const existing=await optionalReq(mainUrl,mainKey,`enterprise_reconciliations?select=*&period_type=eq.weekly&period_start=eq.${range.start}&period_end=eq.${range.end}&limit=1`);
      let reconciliation;
      if(existing?.[0]){
        if(existing[0].status==='closed'&&body.reopen!==true)return out(409,{ok:false,error:'La conciliación semanal ya está cerrada. Para modificarla debe reabrirse de forma explícita.'});
        const d=await req(mainUrl,mainKey,`enterprise_reconciliations?id=eq.${encodeURIComponent(existing[0].id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});reconciliation=d?.[0];
      }else{const d=await req(mainUrl,mainKey,'enterprise_reconciliations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});reconciliation=d?.[0]}
      return out(200,{ok:true,reconciliation,summary:await buildSummary({mainUrl,mainKey,supportUrl,supportKey,range})});
    }
    if(action==='close_week'){
      const summary=await buildSummary({mainUrl,mainKey,supportUrl,supportKey,range});
      const existing=await optionalReq(mainUrl,mainKey,`enterprise_weekly_audits?select=*&week_start=eq.${range.start}&week_end=eq.${range.end}&limit=1`);
      if(existing?.[0]?.status==='closed')return out(409,{ok:false,error:'Esta semana ya fue cerrada. No se sobreescribe una auditoría cerrada.',audit:existing[0]});
      const row={week_start:range.start,week_end:range.end,status:'closed',gross_collected:summary.collections.gross,total_outflows:summary.outflows.total,distributable_profit:summary.result.distributable,company_share:summary.result.company,freddy_share:summary.result.freddy,nelson_share:summary.result.nelson,snapshot:summary,notes:clean(body.notes)||null,created_by_email:auth.user.email||null,closed_at:new Date().toISOString()};
      let audit;
      if(existing?.[0]){
        const d=await req(mainUrl,mainKey,`enterprise_weekly_audits?id=eq.${encodeURIComponent(existing[0].id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});audit=d?.[0];
      }else{
        const d=await req(mainUrl,mainKey,'enterprise_weekly_audits',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});audit=d?.[0];
      }
      return out(200,{ok:true,audit,summary});
    }
    return out(400,{ok:false,error:'Acción no reconocida'});
  }catch(error){
    console.error('Enterprise finance',error);
    const status=error.status&&error.status>=400&&error.status<600?error.status:500;
    return out(status,{ok:false,error:error.message||'Error interno'});
  }
};
