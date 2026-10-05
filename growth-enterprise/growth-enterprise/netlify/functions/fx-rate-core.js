// ThinkStore FX: USD remains the source of truth.
const CACHE_MS=30*60*1000;
const MAX_AGE_MS=7*24*60*60*1000;
let cache=null;
let pending=null;
function valid(n){n=Number(n);return Number.isFinite(n)&&n>0&&n<1000000000?n:null}
function normalize(d,source){
  const rate=valid(d.tasa??d.promedio??d.venta);
  const raw=d.fechaActualizacion??d.fecha;
  const date=new Date(raw);
  if(!rate||!raw||!Number.isFinite(date.getTime()))throw Error('Respuesta de tasa inválida');
  if(date.getTime()>Date.now()+86400000)throw Error('Fecha de tasa inválida');
  return {rate,source,source_date:date.toISOString(),currency:'VES',base:'USD'};
}
async function request(url,headers={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6500);
  try{
    const r=await fetch(url,{headers,signal:controller.signal});
    if(!r.ok)throw Error('Proveedor HTTP '+r.status);
    return await r.json();
  }finally{clearTimeout(timer)}
}
async function retrieve(){
  const sources=[];
  if(process.env.BCV_API_KEY)sources.push(async()=>normalize(await request('https://bcvapi.cc/api/v1/dolar',{Authorization:process.env.BCV_API_KEY}),'BCV API'));
  sources.push(async()=>normalize(await request('https://ve.dolarapi.com/v1/dolares/oficial'),'DolarApi / BCV'));
  let last;
  for(const source of sources){
    try{
      const quote=await source();
      if(Date.now()-Date.parse(quote.source_date)>MAX_AGE_MS)throw Error('Cotización demasiado antigua');
      return quote;
    }catch(e){last=e}
  }
  throw last||Error('No hay cotización disponible');
}
async function getRate(force=false){
  if(!force&&cache&&Date.now()-cache.fetched<CACHE_MS)return cache.quote;
  if(pending)return pending;
  pending=retrieve().then(quote=>{cache={quote,fetched:Date.now()};return quote}).catch(e=>{
    if(cache&&Date.now()-Date.parse(cache.quote.source_date)<=MAX_AGE_MS)
      return {...cache.quote,stale:true,warning:'No se pudo actualizar; se muestra la última tasa conocida.'};
    throw e;
  }).finally(()=>{pending=null});
  return pending;
}
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,OPTIONS'};
async function handler(event){
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers,body:''};
  if(event.httpMethod!=='GET')return{statusCode:405,headers,body:JSON.stringify({ok:false,error:'Método no permitido'})};
  try{
    const quote=await getRate(event.queryStringParameters?.refresh==='1');
    return{statusCode:200,headers,body:JSON.stringify({ok:true,...quote})};
  }catch(e){
    return{statusCode:503,headers,body:JSON.stringify({ok:false,error:'No se pudo consultar la tasa oficial. No se calculará un monto en bolívares.'})};
  }
}
module.exports={handler,getRate,normalize};
