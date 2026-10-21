'use strict';
const {authorizeManager}=require('./enterprise-finance');
const {buildDaily,day}=require('./enterprise-daily-core');
const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
const out=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
exports.handler=async event=>{
 if(event.httpMethod!=='GET')return out(405,{ok:false,error:'Consulta de solo lectura.'});
 const url='https://clhnndxsgzqnihhtrout.supabase.co',key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY;
 const support=(process.env.SUPPORT_SUPABASE_URL||'').replace(/\/$/,''),supportKey=process.env.SUPPORT_SUPABASE_SECRET_KEY||process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return out(503,{ok:false,error:'Finanzas no está configurado.'});
 try{
  const auth=await authorizeManager({...event,headers:event.headers||{}},url,key);if(!auth.ok)return out(403,{ok:false,error:auth.error});
  const date=event.queryStringParameters?.date||day(new Date());
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)return out(400,{ok:false,error:'Fecha inválida.'});
  const warnings=[],health={};
  async function get(name,base,secret,path,limit){if(!base||!secret){health[name]=false;warnings.push('Fuente no configurada: '+name);return [];}try{const r=await fetch(base+'/rest/v1/'+path,{headers:{apikey:secret,Authorization:'Bearer '+secret},signal:AbortSignal.timeout(10000)});const rows=await r.json();if(!r.ok||!Array.isArray(rows))throw Error('No disponible');health[name]=true;if(rows.length>=limit)warnings.push('Fuente '+name+' alcanzó el límite de consulta; puede faltar historial.');return rows;}catch{health[name]=false;warnings.push('No se pudo consultar '+name+'.');return [];}}
  const tasks=[['orders',url,key,'pedidos?select=*,clientes(nombre,correo,telefono,cedula_rif)&order=created_at.desc&limit=5000',5000],['items',url,key,'pedido_items?select=*&limit=10000',10000],['payments',url,key,'ts_order_payments?select=*&status=eq.confirmed&order=confirmed_at.desc&limit=10000',10000],['settlements',url,key,'enterprise_service_settlements?select=*&order=settled_at.desc&limit=3000',3000],['supportOrders',support,supportKey,'service_orders?select=*&order=created_at.desc&limit=5000',5000],['events',support,supportKey,'service_payment_events?select=*&order=occurred_at.desc&limit=10000',10000],['parts',support,supportKey,'service_order_parts?select=*,service_parts(name)&status=neq.released&limit=10000',10000],['extras',support,supportKey,'service_order_sale_items?select=*&status=neq.removed&limit=10000',10000]];
  const results=await Promise.all(tasks.map(t=>get(...t))),data={health,warnings};tasks.forEach((t,i)=>data[t[0]]=results[i]);
  return out(200,{ok:true,...buildDaily(data,date)});
 }catch{return out(503,{ok:false,error:'No se pudo consultar el resumen diario.'});}
};
