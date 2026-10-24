'use strict';
const {authorizeManager}=require('./enterprise-finance');
const M=require('../../growth-enterprise/payment-schedule-model');
const clean=(v,n=1000)=>String(v??'').trim().slice(0,n);
const uuid=v=>/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(String(v||''));
function goal(b){if(clean(b.name,101).length<3||clean(b.name,101).length>100||!['cash_usd','collected_usd','profit_usd'].includes(b.metric)||!/^20[0-9]{2}-Q[1-4]$/.test(b.quarter)||!['proposed','active','archived'].includes(b.status))throw Error('Revisa nombre, indicador, trimestre y estado.');const target=M.amount(b.target);if(!target)throw Error('Indica un objetivo mayor a cero.');return{name:clean(b.name,100),metric:b.metric,quarter:b.quarter,target,status:b.status,notes:clean(b.notes)};}
function recurring(b){if(clean(b.title,161).length<3||clean(b.title,161).length>160||!M.categories[b.category]||!['USD','VES'].includes(b.currency))throw Error('Revisa concepto, categoría y moneda.');const amount=b.amount===''||b.amount===null?null:M.amount(b.amount),day=b.due_day===''||b.due_day===null?null:Number(b.due_day),days=Number(b.remind_days);if(amount===null&&b.amount!==''&&b.amount!==null||day!==null&&(!Number.isInteger(day)||day<1||day>31)||!Number.isInteger(days)||days<0||days>30||typeof b.active!=='boolean'||b.active&&(!amount||!day))throw Error('Para activar, completa importe y día de vencimiento; revisa la anticipación.');return{title:clean(b.title,160),category:b.category,counterparty:clean(b.counterparty,160),amount,currency:b.currency,due_day:day,remind_days:days,active:b.active,notes:clean(b.notes)};}
exports.handler=async e=>{
 const out=(statusCode,b)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(b)});
 if(!['GET','POST'].includes(e.httpMethod))return out(405,{ok:false,error:'Método no permitido'});
 const url='https://clhnndxsgzqnihhtrout.supabase.co',key=clean(process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY,1000);if(!key)return out(503,{ok:false,error:'Servidor no configurado'});
 try{
 const a=await authorizeManager({...e,headers:e.headers||{}},url,key);if(!a.ok)return out(403,{ok:false,error:a.error});
 async function db(path,method='GET',body){const r=await fetch(url+'/rest/v1/'+path,{method,signal:AbortSignal.timeout(15000),headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation,resolution=ignore-duplicates'},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json().catch(()=>null);if(!r.ok)throw Error(d?.message||'Planificación no disponible');return d;}
 if(e.httpMethod==='GET'){const [goals,templates]=await Promise.all([db('enterprise_goals?order=created_at.asc&limit=200'),db('enterprise_recurring_templates?order=created_at.asc&limit=200')]);return out(200,{ok:true,goals,templates});}
 let b;try{b=JSON.parse(e.body||'{}')}catch{return out(400,{ok:false,error:'Datos inválidos'})}
 if(b.action==='generate'){if(!/^20[0-9]{2}-\d{2}-01$/.test(b.month||''))return out(400,{ok:false,error:'Mes inválido'});const created=await db('rpc/enterprise_generate_month','POST',{p_month:b.month,p_actor:a.user.email});return out(200,{ok:true,created});}
 if(!uuid(b.id)||!['goal','recurring'].includes(b.entity)||!['create','update'].includes(b.action))return out(400,{ok:false,error:'Operación inválida'});
 const table=b.entity==='goal'?'enterprise_goals':'enterprise_recurring_templates',payload={...(b.entity==='goal'?goal(b):recurring(b)),actor_email:a.user.email,updated_at:new Date().toISOString()};
 if(b.action==='create'){const existing=await db(table+'?id=eq.'+b.id+'&select=id');if(existing.length)return out(200,{ok:true,duplicate:true});await db(table,'POST',{...payload,id:b.id});}
 else{if(!Number.isInteger(b.revision))throw Error('Versión inválida');const rows=await db(table+'?id=eq.'+b.id+'&revision=eq.'+b.revision,'PATCH',{...payload,revision:b.revision+1});if(!rows.length)return out(409,{ok:false,error:'El registro cambió; actualiza y reintenta'});}
 return out(200,{ok:true});
 }catch(err){return out(400,{ok:false,error:clean(err.message,250)});}
};
exports._test={goal,recurring};
