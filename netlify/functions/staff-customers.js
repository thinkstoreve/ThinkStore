'use strict';
const {mainConfig}=require('./staff-auth-core');
const {resolveCashAccess}=require('./staff-pos');
const {normalize}=require('./registered-customer-core');
const H={'Content-Type':'application/json','Cache-Control':'no-store'};
const out=(statusCode,b)=>({statusCode,headers:H,body:JSON.stringify(b)});
exports.handler=async e=>{
 if(e.httpMethod!=='GET')return out(405,{ok:false,error:'Método no permitido.'});
 try{
  const {url,service}=mainConfig();if(!service)return out(503,{ok:false,error:'Consulta de clientes no disponible.'});
  const access=await resolveCashAccess(e,url,service);if(!access)return out(403,{ok:false,error:'Necesitas acceso a Ventas para consultar clientes.'});
  // No raw PostgREST syntax, wildcards or delimiters supplied by the caller.
  const q=String(e.queryStringParameters?.q||'').trim().slice(0,100).replace(/[^\p{L}\p{N}\s@._+\-]/gu,'').replace(/[%*(),\\"]/g,'').trim();
  if(q.length<3)return out(400,{ok:false,error:'Escribe al menos 3 caracteres del nombre, correo o cédula.'});
  const term=encodeURIComponent(q),cols='id,nombre,correo,telefono,cedula_rif,direccion,ciudad,estado';
  const path=`clientes?select=${cols}&or=(nombre.ilike.*${term}*,correo.ilike.*${term}*,cedula_rif.ilike.*${term}*,telefono.ilike.*${term}*)&order=nombre.asc&limit=21`;
  const r=await fetch(url+'/rest/v1/'+path,{headers:{apikey:service,Authorization:'Bearer '+service}});if(!r.ok)throw Error('No se pudo consultar la lista de clientes.');
  const rows=await r.json();if(!Array.isArray(rows))throw Error('Respuesta de clientes inválida.');
  return out(200,{ok:true,customers:rows.slice(0,20).map(normalize),has_more:rows.length>20});
 }catch(err){return out(502,{ok:false,error:err.message||'No se pudo consultar clientes.'});}
};
