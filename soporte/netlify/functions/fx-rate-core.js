// ThinkStore V14.78: one authoritative, effective-date-aware BCV USD/VES quote.
// Prices remain in USD. Data comes from an unofficial mirror of BCV's official publication.
'use strict';
const CACHE_MS=60*1000;
const MAX_AGE_MS=7*24*60*60*1000; // holidays and weekends
const SOURCES=[
  ['BCV (bcv.today)','https://bcv.today/api/v1/rate.json'],
  ['BCV (espejo)','https://cdn.jsdelivr.net/gh/grupoclip/bcv-api/api/v1/rate.json']
];
let cache=null, pending=null;
const valid=n=>{n=Number(n);return Number.isFinite(n)&&n>0&&n<1e9?n:null};
function todayCaracas(now=Date.now()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
function normalize(data,source,now=Date.now()){
  const rate=valid(data?.USD);
  const rawDate=data?.effective_date;
  const updated=data?.updated_at;
  const effective=typeof rawDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(rawDate)?rawDate:null;
  const timestamp=Date.parse(updated||'');
  if(!rate||!effective||!Number.isFinite(timestamp))throw Error('Respuesta BCV incompleta');
  if(new Date(effective+'T12:00:00Z').toISOString().slice(0,10)!==effective)throw Error('Fecha BCV inválida');
  if(effective>todayCaracas(now))throw Error('La tasa anunciada todavía no está vigente');
  if(timestamp>now+15*60*1000||now-timestamp>MAX_AGE_MS)throw Error('La fuente BCV está desactualizada');
  return {rate,source,currency:'VES',base:'USD',effective_date:effective,source_date:new Date(timestamp).toISOString()};
}
async function request(url){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),6500);
  try{
    const res=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json','Cache-Control':'no-cache'}});
    if(!res.ok)throw Error('Proveedor HTTP '+res.status);
    return await res.json();
  }finally{clearTimeout(timeout)}
}
async function retrieve(){
  let error;
  for(const [source,url] of SOURCES){
    try{return normalize(await request(url),source)}catch(e){error=e}
  }
  throw error||Error('Sin proveedores disponibles');
}
async function getRate(force=false){
  if(!force&&cache&&Date.now()-cache.checked_at_ms<CACHE_MS)return cache.quote;
  if(pending)return pending;
  pending=retrieve().then(q=>{
    const checked_at_ms=Date.now();
    const quote={...q,checked_at:new Date(checked_at_ms).toISOString(),stale:false};
    cache={quote,checked_at_ms};return quote;
  }).catch(e=>{
    if(cache&&Date.now()-cache.checked_at_ms<=MAX_AGE_MS){
      return {...cache.quote,stale:true,warning:'No se pudo verificar la tasa vigente. No se deben confirmar nuevos cobros en Bs.'};
    }
    throw e;
  }).finally(()=>{pending=null});
  return pending;
}
const headers={'Content-Type':'application/json','Cache-Control':'no-store, max-age=0','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,OPTIONS'};
async function handler(event){
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers,body:''};
  if(event.httpMethod!=='GET')return{statusCode:405,headers,body:JSON.stringify({ok:false,error:'Método no permitido'})};
  try{
    const q=await getRate(event.queryStringParameters?.refresh==='1');
    return{statusCode:200,headers,body:JSON.stringify({ok:true,...q})};
  }catch(e){
    return{statusCode:503,headers,body:JSON.stringify({ok:false,error:'Tasa BCV no disponible. No se calculará ni confirmará un nuevo cobro en bolívares.'})};
  }
}
module.exports={handler,getRate,normalize,todayCaracas};
