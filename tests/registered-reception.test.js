'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const customers=require('../netlify/functions/registered-customer');
const canonical={id:'12345678-1234-1234-1234-123456789abc',name:'Registered Client',email:'client@example.test',phone:'+584221234567',document:'V12345678',address:'Registered address',email_verified:true};
customers.handler=async()=>({statusCode:200,headers:{},body:JSON.stringify({ok:true,customer:canonical})});
const {handler}=require('../netlify/functions/registered-reception');
process.env.SUPPORT_SUPABASE_URL='https://support.example.test';
process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='test';
const intake={client_email:canonical.email,device_model:'iPhone',reported_issue:'Screen'};
function fakeOk(value){return{ok:true,json:async()=>value}}

test('recepción crea orden TS-SVC secuencial otorgada por Supabase sin aceptar folio, pagos o financiación del navegador',async()=>{
 const original=global.fetch;let written=null,rpc=0;
 global.fetch=async(u,o={})=>{
  if(String(u).endsWith('/rpc/next_service_order_code')){rpc++;assert.equal(o.method,'POST');return fakeOk('TS-SVC-2026-0008')}
  if(String(u).endsWith('/service_orders')){written=JSON.parse(o.body);return fakeOk([{id:123,...written}])}
  throw Error('Unexpected '+u);
 };
 try{
  const r=await handler({httpMethod:'POST',headers:{},body:JSON.stringify({...intake,code:'TS-EVIL-99999',client_name:'FAKE',amount_paid:999,reception_checklist:{__financing:{enabled:true},__client:{document:'FAKE'}}})});
  assert.equal(r.statusCode,200,r.body);assert.equal(rpc,1);
  assert.equal(written.code,'TS-SVC-2026-0008');assert.equal(written.client_name,canonical.name);
  assert.equal(written.reception_checklist.__client.document,canonical.document);
  assert.equal(written.reception_checklist.__financing,undefined);
  assert.equal(written.amount_paid,undefined);
 }finally{global.fetch=original}
});

test('si falta la migración SQL, avisa y no crea orden ni folio aleatorio',async()=>{
 const original=global.fetch;let inserted=false;
 global.fetch=async(u,o={})=>{
  if(String(u).endsWith('/rpc/next_service_order_code'))return{ok:false,status:404,json:async()=>({code:'PGRST202'})};
  if(String(u).endsWith('/service_orders'))inserted=true;
  throw Error('Unexpected '+u);
 };
 try{
  const r=await handler({httpMethod:'POST',headers:{},body:JSON.stringify(intake)});
  assert.equal(r.statusCode,503);assert.match(JSON.parse(r.body).error,/migración de folios/i);assert.equal(inserted,false);
 }finally{global.fetch=original}
});

test('no permite generar orden si Supabase devuelve código inválido',async()=>{
 const original=global.fetch;let inserted=false;
 global.fetch=async(u)=>{
  if(String(u).endsWith('/rpc/next_service_order_code'))return fakeOk('TS-12345678');
  if(String(u).endsWith('/service_orders'))inserted=true;
  throw Error('Unexpected '+u);
 };
 try{
  const r=await handler({httpMethod:'POST',headers:{},body:JSON.stringify(intake)});
  assert.equal(r.statusCode,503);assert.equal(inserted,false);
 }finally{global.fetch=original}
});

test('editar recepción mantiene código original y no consume nuevo correlativo',async()=>{
 const original=global.fetch;let calledRpc=false;
 global.fetch=async(u,o={})=>{
  if(String(u).includes('/rpc/next_service_order_code')){calledRpc=true;throw Error('no deben generar código al editar')}
  if(String(u).includes('/service_orders?id=eq.123&select='))return fakeOk([{id:123,code:'TS-DA53AC91',updated_at:'2026-10-12T20:00:00Z',reception_checklist:{}}]);
  if(String(u).includes('/service_orders?id=eq.123&updated_at='))return fakeOk([{id:123,code:'TS-DA53AC91',updated_at:'2026-10-12T20:01:00Z'}]);
  throw Error('Unexpected '+u);
 };
 try{
  const r=await handler({httpMethod:'POST',headers:{},body:JSON.stringify({...intake,order_id:'123',expected_updated_at:'2026-10-12T20:00:00Z'})});
  assert.equal(r.statusCode,200,r.body);assert.equal(JSON.parse(r.body).order.code,'TS-DA53AC91');assert.equal(calledRpc,false);
 }finally{global.fetch=original}
});

test('recepción no permite escritura con sesión rechazada',async()=>{
 const original=customers.handler;customers.handler=async()=>({statusCode:403,body:'{}'});
 try{const r=await handler({httpMethod:'POST',headers:{},body:'{}'});assert.equal(r.statusCode,403)}finally{customers.handler=original}
});
