'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/registered-reception');
const intake={client_name:'Cliente presencial',client_phone:'+584221234567',client_email:'client@example.test',device_model:'iPhone',reported_issue:'Pantalla'};
const ok=value=>({ok:true,status:200,json:async()=>value});
async function run(body,db,{role='admin',auth=true,assigned='staff@test.invalid'}={}){
 const previous=global.fetch,env={...process.env},writes=[];
 process.env.SUPPORT_SUPABASE_URL='https://support.example.test';process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='test';
 global.fetch=async(u,o={})=>{
  const url=new URL(u);if(url.pathname==='/auth/v1/user')return auth?ok({email:'staff@test.invalid'}):{ok:false,status:401};
  if(url.pathname.endsWith('/service_users'))return ok([{rol:role,activo:true}]);
  if(['POST','PATCH','DELETE'].includes(o.method))writes.push({url,body:o.body?JSON.parse(o.body):null});
  return db(String(u),o,url,assigned);
 };
 try{return {response:await handler({httpMethod:'POST',headers:{authorization:'Bearer session'},body:JSON.stringify(body)}),writes};}
 finally{global.fetch=previous;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);}
}
test('recepción autenticada crea folio secuencial y descarta cobros y financiación enviados por navegador',async()=>{
 let written,rpc=0;
 const {response}=await run({...intake,code:'TS-EVIL',amount_paid:999,reception_checklist:{__financing:{enabled:true}}},async(u,o)=>{
  if(u.endsWith('/rpc/next_service_order_code')){rpc++;assert.equal(o.method,'POST');return ok('TS-SVC-2026-0008');}
  if(u.endsWith('/service_orders')){written=JSON.parse(o.body);return ok([{id:123,...written}]);}
  throw Error('Unexpected '+u);
 });
 assert.equal(response.statusCode,200,response.body);assert.equal(rpc,1);assert.equal(written.code,'TS-SVC-2026-0008');assert.equal(written.client_name,intake.client_name);assert.equal(written.reception_checklist.__financing,undefined);assert.equal(written.amount_paid,undefined);
});
test('migración de folios ausente no crea orden ni código aleatorio',async()=>{
 const {response,writes}=await run(intake,async u=>{if(u.endsWith('/rpc/next_service_order_code'))return {ok:false,status:404,json:async()=>({code:'PGRST202'})};throw Error('Unexpected '+u);});
 assert.equal(response.statusCode,503);assert.match(JSON.parse(response.body).error,/migración de folios/i);assert.ok(writes.every(x=>!x.url.pathname.endsWith('/service_orders')));
});
test('rechaza código inválido devuelto por Supabase sin insertar orden',async()=>{
 const {response,writes}=await run(intake,async u=>{if(u.endsWith('/rpc/next_service_order_code'))return ok('TS-INVALID');throw Error('Unexpected '+u);});assert.equal(response.statusCode,503);assert.ok(writes.every(x=>!x.url.pathname.endsWith('/service_orders')));
});
test('editar recepción preserva folio y financiación existentes con control de concurrencia',async()=>{
 let patch;const previous={id:123,code:'TS-OLD',updated_at:'2026-10-12T20:00:00Z',reception_checklist:{__financing:{enabled:true}}};
 const {response,writes}=await run({...intake,order_id:'123',expected_updated_at:previous.updated_at},async(u,o)=>{
  if(o.method==='PATCH'){patch=JSON.parse(o.body);return ok([{...previous,...patch}]);}
  if(u.includes('/service_orders?id=eq.123&select='))return ok([previous]);throw Error('Unexpected '+u);
 });assert.equal(response.statusCode,200,response.body);assert.equal(JSON.parse(response.body).order.code,'TS-OLD');assert.equal(patch.code,undefined);assert.equal(patch.reception_checklist.__financing.enabled,true);assert.ok(writes.every(x=>!x.url.pathname.includes('/rpc/')));
});
test('sesión inválida no puede consultar perfil ni escribir recepción',async()=>{const {response,writes}=await run({},()=>{throw Error('No debe consultar datos')},{auth:false});assert.equal(response.statusCode,401);assert.equal(writes.length,0);});
test('técnico puede leer clave de su orden pero no crear recepciones ni consultar otra orden',async()=>{
 const db=async u=>{if(u.includes('/service_orders?'))return ok([{id:123,assigned_technician_email:'staff@test.invalid',reception_checklist:{}}]);throw Error('Unexpected '+u);};
 const own=await run({action:'read_device_access',order_id:'123'},db,{role:'technician'});assert.equal(own.response.statusCode,200,own.response.body);assert.equal(own.writes.length,0);
 const create=await run(intake,db,{role:'technician'});assert.equal(create.response.statusCode,403);assert.equal(create.writes.length,0);
 const other=await run({action:'read_device_access',order_id:'123'},async()=>ok([{id:123,assigned_technician_email:'other@test.invalid'}]),{role:'technician'});assert.equal(other.response.statusCode,403);
});
