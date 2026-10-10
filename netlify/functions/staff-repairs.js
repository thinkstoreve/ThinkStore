'use strict';
// Read and collect Service Center repairs from ThinkStore Staff.
// Finance source of truth remains the independent SUPABASE de Soporte.
const {authenticateInternal,mainConfig}=require('./staff-auth-core');
const {getRate}=require('./fx-rate-core');
const {account,paymentPlan,canAccessRepairs,round}=require('./staff-repairs-core');
const {render:renderServiceDeliveryNote}=require('./service-delivery-note-template');
const H={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const result=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
const clean=(v,n=400)=>String(v??'').trim().slice(0,n);
const usdText=v=>'$'+Number(v||0).toFixed(2);
const paymentAmountText=p=>`${p?.currency==='VES'?'Bs.':p?.method==='EUR'?'EUR':p?.method==='USDT'?'USDT':p?.method==='Otro'?'Otro':'USD'} ${Number(p?.amount||0).toFixed(2)}`;
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

async function movementParts(conf,code){
  try{
    const [moves,catalog]=await Promise.all([
      rest(conf,'service_part_movements',{select:'id,part_id,quantity,created_at,note',order_id:`eq.${code}`,quantity:'lt.0',order:'created_at.asc',limit:200}),
      rest(conf,'service_parts',{select:'id,sku,name,category,unit_cost,sale_price',limit:5000})
    ]);
    const byId=new Map((catalog||[]).map(p=>[String(p.id),p]));
    const grouped=new Map();
    for(const m of moves||[]){
      const id=String(m.part_id||'');if(!id)continue;
      const p=byId.get(id)||{};const qty=Math.abs(Number(m.quantity||0));if(!qty)continue;
      const prev=grouped.get(id)||{id:`move-${id}`,part_id:id,order_code:code,quantity_reserved:0,quantity_consumed:0,unit_cost_snapshot:Number(p.unit_cost||0),sale_price_snapshot:Number(p.sale_price||0),status:'consumed',service_parts:{name:p.name||'Repuesto',sku:p.sku||'',category:p.category||'',sale_price:Number(p.sale_price||0),unit_cost:Number(p.unit_cost||0)},movement_source:true};
      prev.quantity_consumed+=qty;grouped.set(id,prev);
    }
    return [...grouped.values()];
  }catch(e){console.warn('No se pudieron resolver movimientos de repuestos',e.message);return []}
}
async function orderParts(conf,code){
  let rows=[];
  try{rows=await rest(conf,'service_order_parts',{select:'id,part_id,order_code,quantity_reserved,quantity_consumed,unit_cost_snapshot,sale_price_snapshot,status,service_parts(name,sku,category,sale_price,unit_cost)',order_code:`eq.${code}`,status:'neq.released',order:'created_at.asc',limit:100})||[]}catch(e){console.warn('No se pudo leer repuestos de la orden',e.message)}
  rows=(rows||[]).map(r=>({...r,sale_price_snapshot:Number(r.sale_price_snapshot||0)>0?Number(r.sale_price_snapshot):Number(r.service_parts?.sale_price||0),unit_cost_snapshot:Number(r.unit_cost_snapshot||0)>0?Number(r.unit_cost_snapshot):Number(r.service_parts?.unit_cost||0)}));
  const moves=await movementParts(conf,code);
  if(!rows.length)return moves;
  const ids=new Set(rows.map(r=>String(r.part_id||'')));
  for(const m of moves)if(!ids.has(String(m.part_id||'')))rows.push(m);
  return rows;
}


async function orderExtras(conf,code){
  try{return await rest(conf,'service_order_sale_items',{select:'*',order_code:`eq.${code}`,status:'neq.removed',order:'created_at.asc',limit:200})||[]}
  catch(e){if([400,404].includes(e.status))return[];throw e}
}
function partsTotal(parts=[]){return round(parts.reduce((n,p)=>{const q=Number(p.quantity_consumed||p.quantity_reserved||p.quantity||1),u=Number(p.sale_price_snapshot||p.service_parts?.sale_price||p.sale_price||0);return n+(q>0&&u>0?q*u:0)},0))}
function activeExtras(extras=[]){return extras.filter(x=>x.status!=='removed')}
function discountAmount(type,value,subtotal){
  const safeSubtotal=Math.max(0,round(subtotal||0));
  const safeType=String(type||'usd').toLowerCase()==='percent'?'percent':'usd';
  const safeValue=Math.max(0,Number(value||0));
  const raw=safeType==='percent'?safeSubtotal*Math.min(safeValue,100)/100:Math.min(safeValue,safeSubtotal);
  return round(raw);
}
function billingSummary(order,parts=[],extras=[]){
  const ptotal=partsTotal(parts),active=activeExtras(extras),pendingExtras=active.filter(x=>!x.included_in_quote),extrasPendingTotal=round(pendingExtras.reduce((n,x)=>n+Number(x.quantity||1)*Number(x.unit_price_usd||0),0));
  const storedFinal=Math.max(0,round(order?.quote_amount||0));
  const storedDiscount=Math.max(0,round(order?.discount_usd||0));
  const storedSubtotal=Math.max(0,round(order?.subtotal_usd||0));
  const baseSubtotal=storedSubtotal>0?storedSubtotal:(storedFinal>0?round(storedFinal+storedDiscount):ptotal);
  const subtotal=round(baseSubtotal+extrasPendingTotal);
  const discountType=String(order?.discount_type||'usd').toLowerCase()==='percent'?'percent':'usd';
  const discountValue=Math.max(0,Number(order?.discount_value||0));
  let discount=discountAmount(discountType,discountValue,subtotal);
  if(!(discountValue>0)&&storedDiscount>0)discount=Math.min(storedDiscount,subtotal);
  const invoice=Math.max(0,round(subtotal-discount)),paid=Math.max(0,round(order?.amount_paid||0)),pending=Math.max(0,round(invoice-paid));
  return{parts_total:ptotal,stored_quote:storedFinal,base_total:baseSubtotal,subtotal_usd:subtotal,discount_type:discountType,discount_value:discountValue,discount_usd:discount,discount_reason:clean(order?.discount_reason,160),extras_pending_total:extrasPendingTotal,extras_total:round(active.reduce((n,x)=>n+Number(x.quantity||1)*Number(x.unit_price_usd||0),0)),invoice_total:invoice,paid,pending,auto_from_parts:storedFinal<=0&&storedSubtotal<=0&&ptotal>0,pending_extra_count:pendingExtras.length};
}

async function enrichRepairListBilling(conf,orders=[]){
  const pending=(orders||[]).filter(o=>Number(o?.quote_amount||0)<=0&&!/cancel|rechaz|no aprobado/i.test(String(o?.status||''))&&o?.code).slice(0,240);
  if(!pending.length)return orders;
  const wanted=new Set(pending.map(o=>String(o.code)));
  const partMap=new Map(),extraMap=new Map();
  const chunks=[];for(let i=0;i<pending.length;i+=60)chunks.push(pending.slice(i,i+60).map(o=>String(o.code)).filter(c=>/^[A-Za-z0-9._-]+$/.test(c)));
  try{
    const jobs=[];
    for(const codes of chunks){if(!codes.length)continue;const q=`in.(${codes.join(',')})`;
      jobs.push(rest(conf,'service_order_parts',{select:'order_code,quantity_reserved,quantity_consumed,sale_price_snapshot,status,service_parts(sale_price)',order_code:q,status:'neq.released',limit:5000}).then(rows=>({kind:'parts',rows})));
      jobs.push(rest(conf,'service_order_sale_items',{select:'order_code,quantity,unit_price_usd,status,included_in_quote',order_code:q,status:'neq.removed',limit:5000}).then(rows=>({kind:'extras',rows})).catch(()=>({kind:'extras',rows:[]})));
    }
    const batches=await Promise.all(jobs);
    for(const batch of batches){for(const row of batch.rows||[]){const code=String(row.order_code||'');if(!wanted.has(code))continue;const map=batch.kind==='parts'?partMap:extraMap;if(!map.has(code))map.set(code,[]);map.get(code).push(row)}}
    for(const o of pending){const b=billingSummary(o,partMap.get(String(o.code))||[],extraMap.get(String(o.code))||[]);o.staff_invoice_total=b.invoice_total;o.staff_pending=b.pending;o.staff_paid=b.paid;o.staff_auto_from_parts=b.auto_from_parts;o.staff_parts_total=b.parts_total;}
  }catch(e){console.warn('No se pudo enriquecer cobros pendientes de reparaciones',e.message)}
  return orders;
}
function mainConf(){const m=mainConfig();return{url:clean(m.url).replace(/\/$/,''),key:clean(m.service)}}
async function searchChargeCatalog(conf,q,orderCode=''){
  const term=clean(q,80).toLowerCase();if(term.length<2)return[];
  const out=[];
  try{
    const [rows,reservedRows]=await Promise.all([
      rest(conf,'service_parts',{select:'id,sku,name,category,sale_price,unit_cost,quantity,financial_type,catalog_details',active:'eq.true',limit:5000}),
      rest(conf,'service_order_parts',{select:'part_id,order_code,quantity_reserved,quantity_consumed,status',status:'eq.reserved',limit:5000}).catch(()=>[])
    ]);
    const reservedOther=new Map();
    for(const r of reservedRows||[]){
      if(orderCode&&String(r.order_code||'').toLowerCase()===String(orderCode).toLowerCase())continue;
      const id=String(r.part_id||'');if(!id)continue;
      const qty=Math.max(0,Number(r.quantity_reserved||0)-Number(r.quantity_consumed||0));
      reservedOther.set(id,(reservedOther.get(id)||0)+qty);
    }
    for(const x of rows||[]){
      const meta=x.catalog_details||{},hay=[x.name,x.sku,x.category,meta.description,meta.repair,meta.series,meta.model].join(' ').toLowerCase();
      if(!hay.includes(term))continue;
      const isService=meta.item_type==='service'||meta.stock_managed===false||/servicio|mano de obra|instalaci[oó]n|software|mantenimiento|diagn[oó]stico|microsoldadura/.test([x.category,x.name].join(' ').toLowerCase());
      const price=Number(x.sale_price||0);
      if(isService){
        out.push({source:'support_service',source_id:String(x.id),item_type:/mano de obra|labor/.test(String(x.name||'').toLowerCase())?'labor':'service',name:x.name||'Servicio',sku:x.sku||'',price_usd:price,available:null,image_url:meta.image_url||'',hint:x.category||'Servicio técnico',financial_type:x.financial_type||(/software|office|adobe|ios|macos/i.test([x.category,x.name].join(' '))?'service_software':'service_hardware'),unit_cost_usd:Number(x.unit_cost||0),can_add:price>0});
      }else{
        const available=Math.max(0,Number(x.quantity||0)-Number(reservedOther.get(String(x.id))||0));
        out.push({source:'support_part',source_id:String(x.id),item_type:'part',name:x.name||'Repuesto',sku:x.sku||'',price_usd:price,available,image_url:meta.image_url||'',hint:[x.category,meta.series,meta.model].filter(Boolean).join(' · ')||'Inventario Servicio Técnico',financial_type:'part',unit_cost_usd:Number(x.unit_cost||0),can_add:available>0&&price>0});
      }
      if(out.length>=40)break;
    }
  }catch(e){console.warn('No se pudo buscar inventario de Soporte',e.message)}
  const mc=mainConf();
  if(mc.url&&mc.key){
    try{
      const safe=term.replace(/[,*()]/g,' ');
      const rows=await rest(mc,'inventory_variants',{select:'id,sku,product_name,model,color,capacity,condition,stock_on_hand,stock_reserved,price_usd,active',active:'eq.true',or:`(product_name.ilike.*${safe}*,sku.ilike.*${safe}*,model.ilike.*${safe}*)`,order:'product_name.asc',limit:40});
      for(const v of rows||[]){const available=Math.max(0,Number(v.stock_on_hand||0)-Number(v.stock_reserved||0)),price=Number(v.price_usd||0);out.push({source:'main_inventory',source_id:String(v.id),item_type:'product',name:v.product_name||v.sku||'Producto',sku:v.sku||'',price_usd:price,available,image_url:'',hint:[v.model,v.color,v.capacity,v.condition].filter(Boolean).join(' · '),can_add:available>0&&price>0})}
    }catch(e){console.warn('No se pudo buscar productos del inventario principal',e.message)}
  }
  return out.slice(0,60);
}
async function mainRpc(name,body){const mc=mainConf();if(!mc.url||!mc.key)throw Error('El inventario principal no está configurado en Netlify.');return rest(mc,`rpc/${name}`,{}, {method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)})}

function pctOrNull(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null}
function finType(v,name='',category=''){
  const t=String(v||'').toLowerCase();if(['part','service_hardware','service_software','product'].includes(t))return t;
  const hay=`${name} ${category}`.toLowerCase();if(/software|office|adobe|ios|macos/.test(hay))return 'service_software';if(/servicio|mano de obra|mantenimiento|diagn|microsoldadura|hardware/.test(hay))return 'service_hardware';return 'part';
}
async function storeVariantCost(mc,variantId,sku=''){
  try{
    const vr=await rest(mc,'inventory_variants',{select:'*',id:`eq.${variantId}`,limit:1});const v=vr?.[0]||{};
    for(const k of ['unit_cost_usd','purchase_price','purchase_price_usd','cost_usd','cost']){const n=Number(v[k]);if(Number.isFinite(n)&&n>0)return n}
    let bridge=[];try{bridge=await rest(mc,'thinkstore_inventory_bridge',{select:'inventory_product_id,variant_id,sku',or:`(variant_id.eq.${variantId}${sku?`,sku.eq.${sku}`:''})`,limit:2})}catch(_){}
    const pid=bridge?.[0]?.inventory_product_id;if(pid){const pr=await rest(mc,'thinkstore_inventory_products',{select:'id,data',id:`eq.${pid}`,workspace_key:'eq.main',limit:1});const d=pr?.[0]?.data||{};for(const k of ['purchase_price','purchase_price_usd','unit_cost','cost_usd','cost']){const n=Number(d[k]);if(Number.isFinite(n)&&n>0)return n}}
  }catch(e){console.warn('Costo producto tienda no resuelto',e.message)}
  return 0;
}
async function upsertFinanceCommission(mc,type,amount,order,actor,counterparty,metadata){
  const rows=await rest(mc,'enterprise_finance_entries',{select:'id,status',source_system:'eq.support_auto',source_code:`eq.${order.code}`,entry_type:`eq.${type}`,status:'neq.void',limit:1});
  const row={occurred_at:order.paid_at||new Date().toISOString(),entry_type:type,category:type==='seller_commission'?'Ventas':'Servicio Técnico',description:type==='seller_commission'?`Comisión vendedor · ${order.code}`:`Comisión técnica automática · ${order.code}`,amount_usd:round(amount),currency:'USD',counterparty:counterparty||null,funded_by:'company',source_system:'support_auto',source_id:String(order.id||''),source_code:order.code,status:'pending',metadata,created_by_email:actor.email||null,created_by_name:actor.profile?.full_name||actor.email||'Staff'};
  if(rows?.[0])return rest(mc,'enterprise_finance_entries',{id:`eq.${rows[0].id}`},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({...row,updated_at:new Date().toISOString()})});
  return rest(mc,'enterprise_finance_entries',{}, {method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
}
async function syncEnterpriseServiceSettlement(order,parts,extras,billing,actor){
  const mc=mainConf();if(!mc.url||!mc.key)throw Error('Enterprise no tiene conexión al Supabase principal.');
  const techEmail=clean(order.assigned_technician_email,320).toLowerCase();
  let techProfile=null,sellerProfile=null,settings={};
  try{if(techEmail){const r=await rest(mc,'profiles',{select:'*',email:`ilike.${techEmail}`,limit:1});techProfile=r?.[0]||null}}catch(e){console.warn('Perfil técnico no disponible',e.message)}
  try{const r=await rest(mc,'enterprise_finance_settings',{select:'*',id:'eq.default',limit:1});settings=r?.[0]||{}}catch(e){console.warn('Configuración financiera no disponible',e.message)}
  const sellerEmail=actor.role==='vendedor'?clean(actor.email,320).toLowerCase():'';
  try{if(sellerEmail){const r=await rest(mc,'profiles',{select:'*',email:`ilike.${sellerEmail}`,limit:1});sellerProfile=r?.[0]||actor.profile||null}}catch(_){sellerProfile=actor.profile||null}

  const subtotal=Math.max(0,Number(billing?.subtotal_usd||order.subtotal_usd||order.quote_amount||0));
  const finalTotal=Math.max(0,Number(billing?.invoice_total||order.quote_amount||0));
  const factor=subtotal>0?Math.max(0,Math.min(1,finalTotal/subtotal)):1;
  let partGross=0,partCost=0;
  for(const r of parts||[]){const q=Math.max(0,Number(r.quantity_consumed||r.quantity_reserved||r.quantity||0)),sale=Math.max(0,Number(r.sale_price_snapshot||r.service_parts?.sale_price||0)),cost=Math.max(0,Number(r.unit_cost_snapshot||r.service_parts?.unit_cost||0));partGross+=q*sale;partCost+=q*cost}
  let hardwareGross=0,softwareGross=0,hardwareCost=0,softwareCost=0,productGross=0,productCost=0;
  for(const x of (extras||[]).filter(x=>x.status!=='removed')){
    const q=Math.max(1,Number(x.quantity||1)),gross=q*Math.max(0,Number(x.unit_price_usd||0)),type=finType(x.financial_type,x.name,x.metadata?.category),cost=q*Math.max(0,Number(x.unit_cost_usd||0));
    if(type==='product'||x.source==='main_inventory') {productGross+=gross;productCost+=await storeVariantCost(mc,String(x.source_id||''),x.sku||'')*q}
    else if(type==='service_software'){softwareGross+=gross;softwareCost+=cost}
    else {hardwareGross+=gross;hardwareCost+=cost}
  }
  const represented=partGross+hardwareGross+softwareGross+productGross;
  const baseOther=Math.max(0,subtotal-represented);hardwareGross+=baseOther;
  const partRevenue=round(partGross*factor),hardwareRevenue=round(hardwareGross*factor),softwareRevenue=round(softwareGross*factor),productRevenue=round(productGross*factor);
  const partMargin=Math.max(0,round(partRevenue-partCost));
  const hardwareBase=Math.max(0,round(hardwareRevenue-hardwareCost)),softwareBase=Math.max(0,round(softwareRevenue-softwareCost));
  const productMargin=Math.max(0,round(productRevenue-productCost));
  const partRate=pctOrNull(techProfile?.technician_parts_commission_pct)??pctOrNull(settings.technician_parts_default_pct);
  const serviceBaseRate=pctOrNull(techProfile?.technician_service_commission_pct)??pctOrNull(settings.technician_service_default_pct);
  const hardwareRate=pctOrNull(techProfile?.technician_hardware_commission_pct)??pctOrNull(settings.technician_hardware_default_pct)??serviceBaseRate;
  const softwareRate=pctOrNull(techProfile?.technician_software_commission_pct)??pctOrNull(settings.technician_software_default_pct)??serviceBaseRate;
  const sellerRate=pctOrNull(sellerProfile?.seller_commission_pct)??pctOrNull(settings.seller_default_pct);
  const partCommission=partRate===null?0:round(partMargin*partRate/100),hardwareCommission=hardwareRate===null?0:round(hardwareBase*hardwareRate/100),softwareCommission=softwareRate===null?0:round(softwareBase*softwareRate/100);
  const serviceCommission=round(hardwareCommission+softwareCommission),techCommission=round(partCommission+serviceCommission),sellerCommission=sellerRate===null?0:round(productMargin*sellerRate/100);
  const inventoryRecovery=round(partCost+productCost),directServiceCost=round(hardwareCost+softwareCost),companyProfit=Math.max(0,round(finalTotal-inventoryRecovery-directServiceCost-techCommission-sellerCommission));
  const totalBase=round(partMargin+hardwareBase+softwareBase),effectiveRate=totalBase>0?round(techCommission/totalBase*100):null;
  const settlement={order_code:order.code,service_order_id:String(order.id||''),technician_email:techEmail||null,technician_name:techProfile?.full_name||techProfile?.nombre||techEmail||null,salesperson_email:sellerEmail||null,subtotal_usd:round(subtotal),discount_usd:round(subtotal-finalTotal),collected_usd:round(finalTotal),parts_revenue_usd:partRevenue,parts_cost_usd:round(partCost),parts_margin_usd:partMargin,parts_rate_pct:partRate,parts_commission_usd:partCommission,hardware_service_revenue_usd:hardwareRevenue,software_service_revenue_usd:softwareRevenue,service_direct_cost_usd:directServiceCost,hardware_rate_pct:hardwareRate,software_rate_pct:softwareRate,service_commission_usd:serviceCommission,store_product_revenue_usd:productRevenue,store_product_cost_usd:round(productCost),seller_rate_pct:sellerRate,seller_commission_usd:sellerCommission,inventory_recovery_usd:inventoryRecovery,total_commission_usd:round(techCommission+sellerCommission),company_profit_usd:companyProfit,metadata:{discount_factor:factor,base_other_service_usd:round(baseOther),part_commission_base:partMargin,hardware_commission_base:hardwareBase,software_commission_base:softwareBase,product_margin_usd:productMargin,parts_rate_defined:partRate!==null,service_rate_defined:hardwareRate!==null||softwareRate!==null},settled_at:order.paid_at||new Date().toISOString(),updated_at:new Date().toISOString()};
  const saved=await rest(mc,'enterprise_service_settlements',{on_conflict:'order_code'},{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(settlement)});
  if(techEmail&&techCommission>0){await upsertFinanceCommission(mc,'technician_commission',techCommission,order,actor,techProfile?.full_name||techEmail,{technician_email:techEmail,technician_name:techProfile?.full_name||techProfile?.nombre||techEmail,commission_base:totalBase,rate_pct:effectiveRate,parts_rate_pct:partRate,service_rate_pct:serviceBaseRate,hardware_rate_pct:hardwareRate,software_rate_pct:softwareRate,parts_commission:partCommission,service_commission:serviceCommission,parts_cost:round(partCost),direct_cost:directServiceCost,gross_service_amount:round(partRevenue+hardwareRevenue+softwareRevenue),settlement_model:'v15.21'})}
  if(sellerEmail&&sellerCommission>0){await upsertFinanceCommission(mc,'seller_commission',sellerCommission,order,actor,sellerProfile?.full_name||sellerEmail,{salesperson_email:sellerEmail,commission_base:productMargin,rate_pct:sellerRate,store_product_revenue:productRevenue,store_product_cost:round(productCost),settlement_model:'v15.21'})}
  return saved?.[0]||settlement;
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
  const [events,parts,notes,extras]=await Promise.all([paymentEvents(conf,order.id),orderParts(conf,order.code),orderNotes(conf,order.id),orderExtras(conf,order.code)]);
  return{events,parts,notes,extras,html:renderServiceDeliveryNote({order,events,parts,notes,extras})};
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
        const extras=await orderExtras(conf,order.code);
        const catalogSearch=clean(event.queryStringParameters?.catalog_search,80);
        const catalog=catalogSearch?await searchChargeCatalog(conf,catalogSearch,order.code):[];
        return result(200,{ok:true,order,account:account(order),billing:billingSummary(order,parts,extras),events,parts,extras,notes,catalog,history_available:historyAvailable});
      }
      const data=await ordersList(conf);
      await enrichRepairListBilling(conf,data.orders);
      return result(200,{ok:true,...data,refreshed_at:new Date().toISOString()});
    }
    let b;try{b=JSON.parse(event.body||'{}')}catch{return result(400,{ok:false,error:'Solicitud inválida'})}
    if(!['pay','multi_pay','view_delivery_note','resend_delivery_note','add_charge','remove_charge','update_discount'].includes(b.action))return result(400,{ok:false,error:'Acción no autorizada'});
    const id=clean(b.order_id,50);
    if(!validOrderId(id))return result(400,{ok:false,error:'ID de reparación inválido'});
    let current=await getOrder(conf,id);
    if(!current)return result(404,{ok:false,error:'Reparación no encontrada'});
    if(b.action==='add_charge'){
      const source=clean(b.source,30),sourceId=clean(b.source_id,100),qty=Math.max(1,Math.min(20,Number(b.quantity||1)||1));
      if(!['support_service','support_part','main_inventory'].includes(source)||!sourceId)return result(400,{ok:false,error:'Producto o servicio inválido.'});
      let item=null,reserved=false;
      if(source==='support_part'){
        const selected=(await rest(conf,'service_parts',{select:'id,sku,name,category,sale_price,unit_cost,quantity,catalog_details',id:`eq.${sourceId}`,active:'eq.true',limit:1}))?.[0];
        if(!selected)return result(404,{ok:false,error:'Repuesto no encontrado en el inventario de Servicio Técnico.'});
        if(!(Number(selected.sale_price||0)>0))return result(409,{ok:false,error:'Este repuesto no tiene precio de venta configurado en Inventory.'});
        const currentRows=await rest(conf,'service_order_parts',{select:'part_id,quantity_reserved,quantity_consumed,status',order_code:`eq.${current.code}`,status:'eq.reserved',limit:500});
        const wanted=new Map();
        for(const r of currentRows||[]){const id=String(r.part_id||'');if(id)wanted.set(id,Math.max(1,Number(r.quantity_reserved||0)));}
        wanted.set(String(sourceId),(wanted.get(String(sourceId))||0)+qty);
        try{
          await rest(conf,'rpc/ts_save_service_order_parts',{}, {method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({p_order_code:current.code,p_parts:[...wanted].map(([part_id,quantity])=>({part_id,quantity})),p_actor_email:actor.email||''})});
        }catch(e){
          if(/ts_save_service_order_parts|function|schema cache|does not exist/i.test(String(e.message||'')))return result(409,{ok:false,error:'No está disponible la reserva de repuestos de Servicio Técnico. Verifica que esté aplicada la migración de inventario de Soporte V8.8.8.'});
          throw e;
        }
        const parts=await orderParts(conf,current.code),extras=await orderExtras(conf,current.code);
        return result(200,{ok:true,parts,extras,billing:billingSummary(current,parts,extras),added_kind:'support_part'});
      }
      if(source==='support_service'){
        const rows=await rest(conf,'service_parts',{select:'id,sku,name,category,sale_price,unit_cost,financial_type,catalog_details',id:`eq.${sourceId}`,active:'eq.true',limit:1});const x=rows?.[0];
        if(!x)return result(404,{ok:false,error:'Servicio no encontrado en Inventory.'});const price=Number(x.sale_price||0);if(!(price>0))return result(409,{ok:false,error:'Este servicio no tiene precio de venta configurado en Inventory.'});
        const meta=x.catalog_details||{};item={source,source_id:String(x.id),item_type:/mano de obra|labor/i.test(x.name||'')?'labor':'service',financial_type:x.financial_type||(/software|office|adobe|ios|macos/i.test([x.category,x.name].join(' '))?'service_software':'service_hardware'),sku:x.sku||'',name:x.name||'Servicio',quantity:qty,unit_price_usd:price,unit_cost_usd:Number(x.unit_cost||0),image_url:meta.image_url||'',stock_managed:false,metadata:{category:x.category||'',description:meta.description||''}};
      }else{
        const mc=mainConf();if(!mc.url||!mc.key)return result(503,{ok:false,error:'El inventario principal no está configurado.'});
        const rows=await rest(mc,'inventory_variants',{select:'id,sku,product_name,model,color,capacity,condition,stock_on_hand,stock_reserved,price_usd,active',id:`eq.${sourceId}`,active:'eq.true',limit:1});const v=rows?.[0];
        if(!v)return result(404,{ok:false,error:'Producto no encontrado en Inventory.'});const price=Number(v.price_usd||0),available=Math.max(0,Number(v.stock_on_hand||0)-Number(v.stock_reserved||0));if(!(price>0))return result(409,{ok:false,error:'Este producto no tiene precio configurado.'});
        const existing=(await orderExtras(conf,current.code)).find(x=>x.status==='active'&&x.source==='main_inventory'&&String(x.source_id)===String(sourceId));const targetQty=(existing?Number(existing.quantity||0):0)+qty;
        try{await mainRpc('ts_service_reserve_store_variant',{p_order_code:current.code,p_variant_id:String(v.id),p_quantity:targetQty,p_actor_email:actor.email||''});reserved=true}catch(e){if(/function|schema cache|does not exist/i.test(String(e.message||'')))return result(409,{ok:false,error:'Falta ejecutar MIGRACION-MAIN-V15.17-RESERVA-PRODUCTOS-SERVICIO.sql en el Supabase principal.'});throw e}
        item={source,source_id:String(v.id),item_type:'product',financial_type:'product',sku:v.sku||'',name:v.product_name||'Producto',quantity:targetQty,unit_price_usd:price,unit_cost_usd:0,image_url:'',stock_managed:true,metadata:{model:v.model||'',color:v.color||'',capacity:v.capacity||'',condition:v.condition||'',available_before:available}};
      }
      try{
        const allExtras=await orderExtras(conf,current.code);const existing=allExtras.find(x=>x.status==='active'&&x.source===source&&String(x.source_id)===String(sourceId));
        if(existing&&existing.included_in_quote&&Number(current.amount_paid||0)<=0){
          const oldLine=round(Number(existing.quantity||1)*Number(existing.unit_price_usd||0));const currentBilling=billingSummary(current,await orderParts(conf,current.code),allExtras);const revisedSubtotal=Math.max(0,round(currentBilling.subtotal_usd-oldLine));const revisedDiscount=discountAmount(current.discount_type,current.discount_value,revisedSubtotal);const revisedTotal=Math.max(0,round(revisedSubtotal-revisedDiscount));
          const patchedOrder=await rest(conf,'service_orders',{id:`eq.${current.id}`},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({subtotal_usd:revisedSubtotal,discount_usd:revisedDiscount,quote_amount:revisedTotal})});if(Array.isArray(patchedOrder)&&patchedOrder[0])current=patchedOrder[0];item.included_in_quote=false;
        }
        if(existing){await rest(conf,'service_order_sale_items',{id:`eq.${existing.id}`},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({...item,updated_at:new Date().toISOString()})})}
        else{await rest(conf,'service_order_sale_items',{}, {method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({order_code:current.code,...item,created_by_email:actor.email||''})})}
      }catch(e){if(reserved)try{await mainRpc('ts_service_release_store_variant',{p_order_code:current.code,p_variant_id:sourceId,p_actor_email:actor.email||''})}catch(_){};if([400,404].includes(e.status)||/relation|service_order_sale_items/i.test(String(e.message||'')))return result(409,{ok:false,error:'Falta ejecutar MIGRACION-SOPORTE-V8.8.14-CARGOS-ADICIONALES-VENTAS.sql en el Supabase de Soporte.'});throw e}
      const extras=await orderExtras(conf,current.code),parts=await orderParts(conf,current.code);return result(200,{ok:true,extras,billing:billingSummary(current,parts,extras)});
    }
    if(b.action==='remove_charge'){
      const itemId=clean(b.item_id,100);const rows=await rest(conf,'service_order_sale_items',{select:'*',id:`eq.${itemId}`,order_code:`eq.${current.code}`,limit:1});const item=rows?.[0];if(!item)return result(404,{ok:false,error:'Cargo no encontrado.'});
      if(item.included_in_quote&&Number(current.amount_paid||0)>0)return result(409,{ok:false,error:'Este cargo ya forma parte de un pago registrado y no puede eliminarse. Registra un ajuste si necesitas corregirlo.'});
      if(item.source==='main_inventory'&&item.status==='active'){try{await mainRpc('ts_service_release_store_variant',{p_order_code:current.code,p_variant_id:String(item.source_id),p_actor_email:actor.email||''})}catch(e){console.warn('No se pudo liberar reserva principal',e.message)}}
      await rest(conf,'service_order_sale_items',{id:`eq.${item.id}`},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:'removed',updated_at:new Date().toISOString()})});
      if(item.included_in_quote&&Number(current.amount_paid||0)<=0){
        const before=billingSummary(current,await orderParts(conf,current.code),[...(await orderExtras(conf,current.code)),item]);const line=round(Number(item.quantity||1)*Number(item.unit_price_usd||0));const subtotal=Math.max(0,round(before.subtotal_usd-line));const discount=discountAmount(current.discount_type,current.discount_value,subtotal),total=Math.max(0,round(subtotal-discount));
        try{const patched=await rest(conf,'service_orders',{id:`eq.${current.id}`},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({subtotal_usd:subtotal,discount_usd:discount,quote_amount:total})});if(Array.isArray(patched)&&patched[0])current=patched[0]}catch(e){console.warn('No se pudo recalcular total al quitar cargo',e.message)}
      }
      const extras=await orderExtras(conf,current.code),parts=await orderParts(conf,current.code);return result(200,{ok:true,order:current,extras,billing:billingSummary(current,parts,extras)});
    }
    if(b.action==='update_discount'){
      const acc=account(current);
      if(acc.paidOff||String(current.payment_status||'').toLowerCase()==='pagado')return result(409,{ok:false,error:'La reparación ya está pagada y el descuento quedó cerrado.'});
      const type=clean(b.discount_type,20)==='percent'?'percent':'usd';
      const value=Math.max(0,Number(b.discount_value||0));
      const reason=clean(b.discount_reason,160);
      if(type==='percent'&&value>100)return result(400,{ok:false,error:'El porcentaje de descuento no puede superar 100%.'});
      if(!Number.isFinite(value))return result(400,{ok:false,error:'Indica un descuento válido.'});
      const parts=await orderParts(conf,current.code),extras=await orderExtras(conf,current.code),before=billingSummary(current,parts,extras);
      const subtotal=before.subtotal_usd;
      if(!(subtotal>0))return result(409,{ok:false,error:'Agrega primero un repuesto, servicio o total de reparación antes de aplicar descuento.'});
      const discount=discountAmount(type,value,subtotal),total=Math.max(0,round(subtotal-discount)),paid=Math.max(0,round(current.amount_paid||0));
      if(total+0.001<paid)return result(409,{ok:false,error:`El total con descuento (${total.toFixed(2)}) no puede quedar por debajo de lo ya abonado (${paid.toFixed(2)}).`});
      let patched;
      try{
        patched=await rest(conf,'service_orders',{id:`eq.${id}`},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({subtotal_usd:subtotal,discount_type:type,discount_value:value,discount_usd:discount,discount_reason:reason||null,quote_amount:total,quote_currency:'USD'})});
      }catch(e){if(/subtotal_usd|discount_|schema cache|column/i.test(String(e.message||'')))return result(409,{ok:false,error:'Falta ejecutar MIGRACION-SOPORTE-V8.8.15-DESCUENTOS-APP-VENTAS.sql en el Supabase de Soporte.'});throw e}
      if(!Array.isArray(patched)||!patched[0])return result(409,{ok:false,error:'No pude guardar el descuento.'});
      current=patched[0];
      if(before.pending_extra_count>0)await rest(conf,'service_order_sale_items',{order_code:`eq.${current.code}`,status:'eq.active',included_in_quote:'eq.false'},{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({included_in_quote:true,updated_at:new Date().toISOString()})});
      try{await rest(conf,'service_order_notes',{}, {method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:id,note:value>0?`Descuento ${type==='percent'?value+'%':usdText(discount)} aplicado${reason?' · '+reason:''}`:'Descuento eliminado',visibility:'internal',author_name:actor.email||'Staff',note_type:'Descuento Staff',status_after:current.status})})}catch(e){console.warn('No se pudo registrar el descuento en bitácora',e.message)}
      const finalExtras=await orderExtras(conf,current.code),finalBilling=billingSummary(current,parts,finalExtras);
      return result(200,{ok:true,order:current,billing:finalBilling,extras:finalExtras,parts});
    }
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
    // Calcula el total real: cotización existente o repuestos preparados + cargos adicionales aún no incorporados.
    let billingParts=await orderParts(conf,current.code);const billingExtras=await orderExtras(conf,current.code);let billing=billingSummary(current,billingParts,billingExtras);
    if(billing.invoice_total>0&&(Math.abs(Number(current.quote_amount||0)-billing.invoice_total)>0.001||billing.pending_extra_count>0)){
      let patched;
      try{
        patched=await rest(conf,'service_orders',{id:`eq.${id}`},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({quote_amount:billing.invoice_total,quote_currency:'USD',subtotal_usd:billing.subtotal_usd,discount_type:billing.discount_type,discount_value:billing.discount_value,discount_usd:billing.discount_usd,discount_reason:billing.discount_reason||null})});
      }catch(e){if(/subtotal_usd|discount_|schema cache|column/i.test(String(e.message||'')))return result(409,{ok:false,error:'Falta ejecutar MIGRACION-SOPORTE-V8.8.15-DESCUENTOS-APP-VENTAS.sql en el Supabase de Soporte.'});throw e}
      if(!Array.isArray(patched)||!patched[0])return result(409,{ok:false,error:'No pude actualizar el total automático de la reparación. No se registró el cobro.'});
      current=patched[0];
      if(billing.pending_extra_count>0)await rest(conf,'service_order_sale_items',{order_code:`eq.${current.code}`,status:'eq.active',included_in_quote:'eq.false'},{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({included_in_quote:true,updated_at:new Date().toISOString()})});
      billing=billingSummary(current,billingParts,await orderExtras(conf,current.code));
    }
    if(b.action==='multi_pay'){
      const raw=Array.isArray(b.payments)?b.payments:[];
      if(raw.length<2||raw.length>3)return result(400,{ok:false,error:'El pago combinado admite entre 2 y 3 métodos.'});
      if(account(current).budget<=0)return result(409,{ok:false,error:'Para combinar métodos primero debe existir un total de reparación.'});
      const hasBs=raw.some(x=>['Efectivo Bs','Pago Móvil','Transferencia Bs','Punto de venta Bs'].includes(String(x?.method||'')));
      let bcv=null;if(hasBs)bcv=await getRate(true);
      let simulated={...current},plans=[];
      try{
        for(const line of raw){const p=paymentPlan(simulated,{method:line?.method,amount:line?.amount,usd_equivalent:line?.usd_equivalent,reference:line?.reference,finalize_no_quote:false},bcv);plans.push(p);simulated={...simulated,amount_paid:p.after}}
      }catch(e){return result(400,{ok:false,error:e.message||'Revisa los montos del pago combinado.'})}
      const target=round(Number(current.quote_amount||0)),plannedAfter=round(Number(simulated.amount_paid||0));
      if(Math.abs(plannedAfter-target)>.02)return result(409,{ok:false,error:plannedAfter<target?`El pago combinado está incompleto. Faltan $${round(target-plannedAfter).toFixed(2)}.`:`El pago combinado supera el total en $${round(plannedAfter-target).toFixed(2)}.`});
      const comment=clean(b.note,300);let processed=0,atomicState={},updated=current;const descriptions=[];
      for(let i=0;i<plans.length;i++){
        const p=plans[i],description=`Cobro combinado Staff ${i+1}/${plans.length}: ${p.method} · ${paymentAmountText(p)} · equiv. USD ${p.equivalent.toFixed(2)}${p.rate?` · BCV ${p.rate}, vigencia ${p.bcv_effective_date}`:''}${p.reference?' · Ref. '+p.reference:''}${comment?' · '+comment:''} · ${actor.email}`;
        descriptions.push(description);
        try{
          const atomic=await rest(conf,'rpc/ts_service_record_payment_atomic',{}, {method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
            p_order_code:current.code,p_amount_delta:p.equivalent,p_payment_method:p.method,p_reference:p.reference||null,p_notes:description,p_actor_email:actor.email||'',
            p_currency:p.currency,p_original_amount:p.amount,p_bcv_rate:p.rate||null,p_bcv_effective_date:p.bcv_effective_date||null
          })});
          atomicState=Array.isArray(atomic)?(atomic[0]||{}):(atomic||{});processed++;
          updated=await getOrder(conf,id);if(!updated)throw Error('No se pudo volver a leer la orden después de registrar un tramo del pago.');
        }catch(e){
          if(processed>0)return result(409,{ok:false,partial_payment:true,processed,error:`Se registraron ${processed} de ${plans.length} métodos antes de producirse un error. No repitas el cobro completo: actualiza la orden y cobra solo el saldo restante. Detalle: ${clean(e.message||'error de cobro',220)}`});
          if(e.status===404||/function|rpc|schema cache|does not exist/i.test(String(e.message||'')))return result(409,{ok:false,error:'Falta activar el cierre automático V8.8.8 en el Supabase de Soporte. Ejecuta los 4 SQL antes de cobrar.'});
          throw e;
        }
      }
      if(!atomicState.fully_paid)return result(409,{ok:false,partial_payment:true,processed,error:'Los métodos se registraron, pero la orden aún conserva saldo. Actualiza la reparación antes de intentar otro cobro.'});
      if(String(updated.payment_status||'').toLowerCase()!=='pagado'){
        try{const normalized=await rest(conf,'service_orders',{id:`eq.${id}`},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({payment_status:'Pagado',payment_method:'Pago combinado',paid_at:updated.paid_at||new Date().toISOString()})});if(Array.isArray(normalized)&&normalized[0])updated=normalized[0]}catch(e){console.warn('No se pudo normalizar el estado del pago combinado',e.message)}
      }else{
        try{const normalized=await rest(conf,'service_orders',{id:`eq.${id}`},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({payment_method:'Pago combinado'})});if(Array.isArray(normalized)&&normalized[0])updated=normalized[0]}catch(e){console.warn('No se pudo marcar Pago combinado',e.message)}
      }
      let storeInventory={ok:true,lines:0};
      try{storeInventory=await mainRpc('ts_service_consume_store_variants',{p_order_code:updated.code,p_actor_email:actor.email||''})||storeInventory}catch(e){console.warn('Productos adicionales: no se pudo consumir inventario principal',e.message);storeInventory={ok:false,error:e.message}}
      try{await rest(conf,'service_order_sale_items',{order_code:`eq.${updated.code}`,status:'eq.active'},{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'consumed',updated_at:new Date().toISOString()})})}catch(e){console.warn('No se pudo cerrar cargos adicionales',e.message)}
      let audited=true;try{await rest(conf,'service_order_notes',{}, {method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:id,note:`Pago combinado Staff: ${plans.map(p=>`${p.method} ${paymentAmountText(p)}`).join(' + ')}${comment?' · '+comment:''}`,visibility:'internal',author_name:actor.email||'Staff',note_type:'Cobranza Staff',status_after:updated.status})})}catch(e){audited=false;console.warn('Soporte cobranzas: nota combinada no registrada',e.message)}
      let deliveryNoteEmail={sent:false};try{const note=await deliveryNoteData(conf,updated);deliveryNoteEmail=await sendDeliveryNote(updated,note.html)}catch(e){console.warn('Nota de Entrega de Soporte no enviada',e.message);deliveryNoteEmail={sent:false,error:e.message}}
      const notes=await orderNotes(conf,updated.id);let parts=await orderParts(conf,updated.code);if(!parts.length)parts=parsePartsFallback(notes);const extras=await orderExtras(conf,updated.code);
      let financeSettlement=null,financeWarning='';try{financeSettlement=await syncEnterpriseServiceSettlement(updated,parts,extras,billingSummary(updated,parts,extras),actor)}catch(e){financeWarning=e.message||'No se pudo sincronizar Enterprise';console.warn('Liquidación Enterprise',financeWarning)}
      return result(200,{ok:true,multi_payment:true,payment_lines:plans.map(p=>({method:p.method,currency:p.currency,amount:p.amount,usd_equivalent:p.equivalent,reference:p.reference||''})),order:updated,billing:billingSummary(updated,parts,extras),parts,extras,notes,note_saved:audited,fully_paid:true,inventory:atomicState.inventory||null,store_inventory:storeInventory,delivery_note_ready:true,email_sent:Boolean(deliveryNoteEmail?.sent),delivery_note_email:deliveryNoteEmail,finance_settlement:financeSettlement,finance_warning:financeWarning});
    }
    // A source-verified rate is ALWAYS fetched at checkout on the server.
    const isBs=['Efectivo Bs','Pago Móvil','Transferencia Bs','Punto de venta Bs'].includes(b.method);
    let bcv=null;
    if(isBs)bcv=await getRate(true);
    const p=paymentPlan(current,b,bcv);
    const comment=clean(b.note,300);
    const description=`Cobro Staff: ${p.method} · ${paymentAmountText(p)} · equiv. USD ${p.equivalent.toFixed(2)}${p.rate?` · BCV ${p.rate}, vigencia ${p.bcv_effective_date}`:''}${p.reference?' · Ref. '+p.reference:''}${comment?' · '+comment:''}${p.bootstrap_quote?' · Total final definido al cobrar':''} · ${actor.email}`;
    // Si la orden todavía no tiene cotización, Staff puede fijar el total final en el mismo acto de cobro.
    // Se hace antes del RPC para que el cierre atómico pueda validar el saldo y generar la Nota de Entrega.
    if(p.bootstrap_quote){
      const patched=await rest(conf,'service_orders',{id:`eq.${id}`},{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({quote_amount:p.budget,quote_currency:'USD',subtotal_usd:p.budget,discount_type:'usd',discount_value:0,discount_usd:0,discount_reason:null})});
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
    let storeInventory={ok:true,lines:0};
    if(atomicState.fully_paid){
      try{storeInventory=await mainRpc('ts_service_consume_store_variants',{p_order_code:updated.code,p_actor_email:actor.email||''})||storeInventory}
      catch(e){console.warn('Productos adicionales: no se pudo consumir inventario principal',e.message);storeInventory={ok:false,error:e.message}}
      try{await rest(conf,'service_order_sale_items',{order_code:`eq.${updated.code}`,status:'eq.active'},{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'consumed',updated_at:new Date().toISOString()})})}catch(e){console.warn('No se pudo cerrar cargos adicionales',e.message)}
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
    const extras=await orderExtras(conf,updated.code);
    let financeSettlement=null,financeWarning='';
    if(atomicState.fully_paid){try{financeSettlement=await syncEnterpriseServiceSettlement(updated,parts,extras,billingSummary(updated,parts,extras),actor)}catch(e){financeWarning=e.message||'No se pudo sincronizar Enterprise';console.warn('Liquidación Enterprise',financeWarning)}}
    return result(200,{ok:true,payment:{...p,status:atomicState.fully_paid?'Pagado':(atomicState.payment_status||p.status),pending:Number(atomicState.pending??p.pending)},order:updated,billing:billingSummary(updated,parts,extras),parts,extras,notes,note_saved:audited,fully_paid:Boolean(atomicState.fully_paid),inventory:atomicState.inventory||null,store_inventory:storeInventory,delivery_note_ready:Boolean(atomicState.delivery_note_ready),email_sent:Boolean(deliveryNoteEmail?.sent),delivery_note_email:deliveryNoteEmail,finance_settlement:financeSettlement,finance_warning:financeWarning});
  }catch(e){console.error('[staff-repairs]',e?.message);const code=e?.status>=400&&e.status<500?e.status:500;return result(code,{ok:false,error:clean(e?.message||'No se pudo consultar Soporte')})}
};
