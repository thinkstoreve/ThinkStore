'use strict';

const {authenticateInternal,mainConfig,svc}=require('./staff-auth-core');

const H={
  'Content-Type':'application/json',
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization,content-type',
  'Access-Control-Allow-Methods':'GET,OPTIONS',
  'Cache-Control':'no-store'
};
const out=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const num=v=>{const n=Number(v||0);return Number.isFinite(n)?n:0};
const money=v=>Math.round((num(v)+Number.EPSILON)*100)/100;
const same=(a,b)=>norm(a)===norm(b);
const paidSale=o=>{
  const decision=norm(o.payment_decision),st=norm(o.estado||o.status);
  return decision==='approved'||/pago verificado|preparando|comprando proveedor|transito|disponible|enviado|entregado|completado/.test(st);
};
const rejectedSale=o=>/cancel|rechaz|anulad/.test(norm(o.estado||o.status))||norm(o.payment_decision)==='rejected';
const paidService=o=>/pagado|cobrado/.test(norm(o.payment_status))||(num(o.quote_amount)>0&&num(o.amount_paid)>=num(o.quote_amount));
const serviceRepaired=o=>/listo para entregar|entregado|reparado|completado|finalizado/.test(norm(o.status));
const serviceNotRepaired=o=>/no reparado|sin reparacion|irreparable|no reparable/.test(norm(o.status));
const serviceApproved=o=>Boolean(o.quote_approved_at)||/aprobado/.test(norm(o.quote_status))||/aprobado por cliente/.test(norm(o.status));
const serviceNotApproved=o=>/no aprobado|rechazado|rechaz/.test(norm(o.quote_status))||/no aprobado|rechaz/.test(norm(o.status));
const serviceOpen=o=>!serviceRepaired(o)&&!serviceNotRepaired(o)&&!serviceNotApproved(o)&&!/cancel/.test(norm(o.status));
const when=o=>o.payment_decision_at||o.paid_at||o.updated_at||o.created_at||'';

async function rows(base,key,path){
  const r=await fetch(`${base}/rest/v1/${path}`,{headers:svc(key)});
  const text=await r.text();let data=[];try{data=text?JSON.parse(text):[]}catch{data=[]}
  if(!r.ok)throw new Error(data?.message||data?.error||`HTTP ${r.status}`);
  return Array.isArray(data)?data:[];
}
async function optional(base,key,path){try{return await rows(base,key,path)}catch(e){if(/does not exist|not found|42P01/i.test(String(e.message||'')))return[];throw e}}
function commissionMeta(entry){let m=entry?.metadata||{};if(typeof m==='string'){try{m=JSON.parse(m)}catch{m={}}}return m&&typeof m==='object'?m:{}}
function commissionFor(entries,email,type){
  const matches=(entries||[]).filter(e=>{
    if(norm(e.status)==='void')return false;
    const meta=commissionMeta(e);
    if(type==='technician')return e.entry_type==='technician_commission'&&same(meta.technician_email,email);
    return ['seller_commission','sales_commission','vendor_commission'].includes(clean(e.entry_type))&&same(meta.salesperson_email||meta.seller_email,email);
  });
  return{
    generated:money(matches.reduce((n,e)=>n+num(e.amount_usd),0)),
    entries:matches.length,
    rate_pct:matches.length?num(commissionMeta(matches[0]).rate_pct||0):null,
    parts_rate_pct:matches.length?(commissionMeta(matches[0]).parts_rate_pct??null):null,
    service_rate_pct:matches.length?(commissionMeta(matches[0]).service_rate_pct??commissionMeta(matches[0]).rate_pct??null):null,
    base:money(matches.reduce((n,e)=>n+num(commissionMeta(e).commission_base||0),0))
  };
}
function profileRate(profile,type){
  const keys=type==='technician'
    ?['technician_service_commission_pct','technician_commission_pct','tech_commission_pct','commission_pct','commission_rate_pct']
    :['seller_commission_pct','sales_commission_pct','commission_pct','commission_rate_pct'];
  for(const k of keys){if(profile&&profile[k]!==undefined&&profile[k]!==null&&profile[k]!==''){const v=num(profile[k]);if(v>=0&&v<=100)return v}}
  return null;
}

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:H,body:''};
  if(event.httpMethod!=='GET')return out(405,{ok:false,error:'Método no permitido'});
  try{
    const auth=await authenticateInternal(event);
    if(!auth.ok)return out(401,{ok:false,error:auth.reason||'Sesión interna requerida',code:auth.code||'AUTH_FAILED'});
    const role=auth.role;
    const {url:mainUrl,service:mainKey}=mainConfig();
    if(!mainKey)return out(500,{ok:false,error:'Supabase principal no está configurado'});
    const supportUrl=clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/$/,'');
    const supportKey=clean(process.env.SUPPORT_SUPABASE_SECRET_KEY||process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY);
    const profile=auth.profile||{};
    const email=clean(auth.email||profile.email||profile.correo);
    const userId=clean(auth.user_id);
    const finance=await optional(mainUrl,mainKey,'enterprise_finance_entries?select=*&status=neq.void&order=occurred_at.desc&limit=3000');

    if(role==='tecnico'){
      if(!supportUrl||!supportKey)return out(200,{ok:true,role,email,warning:'Soporte no está conectado',metrics:{assigned:0,repaired:0,not_repaired:0,approved:0,not_approved:0,paid:0,open:0,collected:0},orders:[],commission:{generated:0,entries:0,rate_pct:profileRate(profile,'technician'),base:0}});
      const [all,allOrderParts,allParts,allNotes]=await Promise.all([
        rows(supportUrl,supportKey,'service_orders?select=*&order=updated_at.desc&limit=3000'),
        optional(supportUrl,supportKey,'service_order_parts?select=*&order=created_at.desc&limit=5000'),
        optional(supportUrl,supportKey,'service_parts?select=*&order=name.asc&limit=5000'),
        optional(supportUrl,supportKey,'service_order_notes?select=*&order=created_at.desc&limit=5000')
      ]);
      const mine=all.filter(o=>same(o.assigned_technician_email,email));
      const mineIds=new Set(mine.map(o=>String(o.id)));
      const mineCodes=new Set(mine.map(o=>norm(o.code)));
      const partMap=new Map((allParts||[]).map(p=>[String(p.id),p]));
      const parts=(allOrderParts||[]).filter(r=>mineIds.has(String(r.service_order_id))||mineCodes.has(norm(r.order_code))).map(r=>{const p=partMap.get(String(r.part_id))||{};return{
        id:r.id,order_id:r.service_order_id||null,order_code:r.order_code||'',part_id:r.part_id,
        name:p.name||r.part_name||'Repuesto',sku:p.sku||'',category:p.category||'',status:r.status||'',
        quantity_reserved:num(r.quantity_reserved||r.quantity||0),quantity_consumed:num(r.quantity_consumed||0),
        unit_price:num(r.sale_price_snapshot||p.sale_price||0),image_url:p.image_url||p.photo_url||''
      }});
      const diagnostics=(allNotes||[]).filter(n=>mineIds.has(String(n.order_id))).map(n=>({
        id:n.id,order_id:n.order_id,note_type:n.note_type||'',status_after:n.status_after||'',note:n.note||'',
        diagnosis:n.diagnosis||'',work_performed:n.work_performed||'',parts_used:n.parts_used||'',tests_performed:n.tests_performed||'',created_at:n.created_at||''
      })).filter(n=>/diagn|repar|prueba|tecnic/i.test(`${n.note_type} ${n.status_after} ${n.diagnosis} ${n.work_performed} ${n.tests_performed}`)).slice(0,80);
      const commission=commissionFor(finance,email,'technician');
      const configuredRate=profileRate(profile,'technician');
      if(commission.rate_pct===null)commission.rate_pct=configuredRate;
      if(commission.parts_rate_pct===null)commission.parts_rate_pct=profile.technician_parts_commission_pct??null;
      if(commission.service_rate_pct===null)commission.service_rate_pct=profile.technician_service_commission_pct??configuredRate;
      if(!commission.base)commission.base=money(mine.filter(paidService).reduce((n,o)=>n+Math.max(0,num(o.amount_paid||o.quote_amount)),0));
      return out(200,{ok:true,role,email,generated_at:new Date().toISOString(),metrics:{
        assigned:mine.length,
        repaired:mine.filter(serviceRepaired).length,
        not_repaired:mine.filter(serviceNotRepaired).length,
        approved:mine.filter(serviceApproved).length,
        not_approved:mine.filter(serviceNotApproved).length,
        paid:mine.filter(paidService).length,
        open:mine.filter(serviceOpen).length,
        collected:money(mine.filter(paidService).reduce((n,o)=>n+Math.max(0,num(o.amount_paid||o.quote_amount)),0))
      },commission,
      parts,
      diagnostics,
      orders:mine.slice(0,100).map(o=>({id:o.id,code:o.code,client_name:o.client_name,client_phone:o.client_phone||'',device_model:o.device_model,device_type:o.device_type||'',serial_imei:o.serial_imei||'',status:o.status,quote_status:o.quote_status,payment_status:o.payment_status,quote_amount:num(o.quote_amount),amount_paid:num(o.amount_paid),warranty_days:num(o.warranty_days),quote_repair_details:o.quote_repair_details||'',technical_notes:o.technical_notes||'',updated_at:o.updated_at,created_at:o.created_at}))});
    }

    if(role==='vendedor'){
      const all=await rows(mainUrl,mainKey,'pedidos?select=*&order=created_at.desc&limit=5000');
      const mine=all.filter(o=>String(o.salesperson_user_id||'')===userId||same(o.salesperson_email,email));
      const active=mine.filter(o=>!rejectedSale(o));
      const paid=mine.filter(paidSale),pending=active.filter(o=>!paidSale(o));
      const commission=commissionFor(finance,email,'seller');
      const configuredRate=profileRate(profile,'seller');
      if(commission.rate_pct===null)commission.rate_pct=configuredRate;
      commission.base=money(paid.reduce((n,o)=>n+num(o.total_usd),0));
      if(commission.entries===0&&commission.rate_pct!==null)commission.generated=money(commission.base*commission.rate_pct/100);
      return out(200,{ok:true,role,email,generated_at:new Date().toISOString(),metrics:{
        sales:mine.length,
        paid:paid.length,
        pending:pending.length,
        cancelled:mine.filter(rejectedSale).length,
        sold_amount:money(active.reduce((n,o)=>n+num(o.total_usd),0)),
        collected:money(paid.reduce((n,o)=>n+num(o.total_usd),0))
      },commission,orders:mine.slice(0,30).map(o=>({id:o.id,code:o.codigo||o.code||o.id,status:o.estado||o.status,total_usd:num(o.total_usd),payment_decision:o.payment_decision,customer:o.guest_name||o.client_name||o.nombre_cliente||'',created_at:o.created_at,updated_at:o.updated_at}))});
    }

    if(role==='recepcion'||role==='soporte'){
      if(!supportUrl||!supportKey)return out(200,{ok:true,role,email,warning:'Soporte no está conectado',metrics:{received:0,in_progress:0,ready:0,delivered:0,paid:0},orders:[]});
      const all=await rows(supportUrl,supportKey,'service_orders?select=*&order=updated_at.desc&limit=3000');
      const mine=all.filter(o=>same(o.created_by_email,email)||same(o.received_by_email,email));
      return out(200,{ok:true,role,email,generated_at:new Date().toISOString(),metrics:{
        received:mine.length,
        in_progress:mine.filter(o=>/diagnostico|diagnóstico|reparacion|reparación|esperando repuesto|cotizacion|cotización|aprobado/.test(norm(o.status))).length,
        ready:mine.filter(o=>/listo para entregar|^listo$/.test(norm(o.status))).length,
        delivered:mine.filter(o=>/entregado/.test(norm(o.status))).length,
        paid:mine.filter(paidService).length,
        collected:money(mine.filter(paidService).reduce((n,o)=>n+Math.max(0,num(o.amount_paid||o.quote_amount)),0))
      },orders:mine.slice(0,30).map(o=>({id:o.id,code:o.code,client_name:o.client_name,device_model:o.device_model,status:o.status,payment_status:o.payment_status,updated_at:o.updated_at,created_at:o.created_at}))});
    }

    if(role==='logistica'){
      const all=await rows(mainUrl,mainKey,'pedidos?select=*&order=updated_at.desc&limit=3000');
      const mine=all.filter(o=>same(o.logistics_email||o.assigned_logistics_email,email));
      return out(200,{ok:true,role,email,generated_at:new Date().toISOString(),metrics:{assigned:mine.length,ready:mine.filter(o=>/disponible|listo/.test(norm(o.estado||o.status))).length,shipped:mine.filter(o=>/enviado|transito/.test(norm(o.estado||o.status))).length,delivered:mine.filter(o=>/entregado/.test(norm(o.estado||o.status))).length},orders:mine.slice(0,30)});
    }

    return out(200,{ok:true,role,email,metrics:{},orders:[],commission:{generated:0,entries:0,rate_pct:null,base:0}});
  }catch(error){
    console.error('ThinkStore role-dashboard',error);
    return out(500,{ok:false,error:error?.message||'No se pudo cargar el dashboard personal'});
  }
};
