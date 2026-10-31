'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../netlify/functions/customer-history-core');
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const customer={id,nombre:'María Pérez',correo:'maria@example.test',telefono:'+584141234567',cedula_rif:'V-12345678'};
test('history matches normalized identity but never name or shared phone alone',()=>{
 assert(C.matches(customer,{client_name:'MARIA PEREZ',client_phone:'0414-1234567'}));
 assert(C.matches(customer,{client_name:'María Pérez',client_email:'MARIA@example.test'}));
 assert(!C.matches(customer,{client_name:'Otra Persona',client_phone:'0414-1234567'}));
 assert(!C.matches(customer,{client_name:'María Pérez'}));
 assert(!C.matches(customer,{client_name:'María Pérez',client_email:'maria@example.test',reception_checklist:{__client:{document:'87654321'}}}));
 assert(!C.matches({nombre:'Cliente',telefono:'11111'},{client_name:'Cliente',client_phone:'11111'}));
});
test('explicit reception linkage remains stable if a customer changes contact details',()=>{
 assert(C.matches(customer,{client_name:'Nombre anterior',reception_checklist:{__client:{main_customer_id:id}}}));
 assert(!C.matches(customer,{client_name:'Nombre anterior',reception_checklist:{__client:{main_customer_id:other}}}));
});
test('appointments stay separate and delivered is never rewritten as repaired',()=>{
 const result=C.summarize({customer,legacy:[{id:other,device:'MacBook',status:'ENTREGADO',received_at:'2020-05-10'}],orders:[{id,device_model:'iPhone',status:'En diagnóstico',created_at:'2026-10-30',reception_checklist:{__meta:{intake_source:'Recepción directa'}}}],appointments:[{id:'a',device_model:'iPad',source:'web',status:'agendada'}]});
 assert.equal(result.repairs.length,2);assert.equal(result.appointments.length,1);assert.equal(result.repairs[1].status,'ENTREGADO');assert.equal(result.origin.code,'unknown');assert.deepEqual(result.channels.map(x=>x.code).sort(),['filemaker','panel','web_appointment']);
});
test('FileMaker origin is explicit; an old registration has unknown origin',()=>{
 assert.equal(C.summarize({customer:{...customer,source_key:'icenter-1'}}).origin.code,'filemaker');
 assert.equal(C.summarize({customer}).origin.code,'unknown');
 assert.equal(C.summarize({customer,origin:{origin:'website',evidence:'Alta por formulario'}}).origin.label,'Página principal');
});
test('endpoint rejects unauthenticated users before reading private history',async()=>{
 const A=require('../netlify/functions/staff-auth-core'),saved=A.authenticateInternal;A.authenticateInternal=async()=>({ok:false});let fetched=false;const old=global.fetch;global.fetch=async()=>{fetched=true;throw Error('unexpected');};
 try{const r=await require('../netlify/functions/customer-history').handler({httpMethod:'POST',headers:{},body:JSON.stringify({customer_id:id})});assert.equal(r.statusCode,401);assert.equal(fetched,false);}finally{A.authenticateInternal=saved;global.fetch=old;}
});
test('endpoint returns matched repair summaries without codes, notes or financial details',async()=>{
 const A=require('../netlify/functions/staff-auth-core'),saved={auth:A.authenticateInternal,conf:A.mainConfig,fetch:global.fetch,url:process.env.SUPPORT_SUPABASE_URL,key:process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY};A.authenticateInternal=async()=>({ok:true,role:'admin',user_id:other});A.mainConfig=()=>({url:'https://main.test',service:'test'});process.env.SUPPORT_SUPABASE_URL='https://support.test';process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='test';
 global.fetch=async url=>{let rows=[];if(url.includes('/clientes?'))rows=[customer];else if(url.includes('/ts_imported_customers?'))rows=[];else if(url.includes('/service_orders?'))rows=[{id,code:'TS-1',client_name:'Maria Perez',client_phone:'04141234567',device_model:'MacBook',status:'Recibido',device_access_code:'SECRET',technical_notes:'PRIVATE',quote_amount:999},{id:other,client_name:'Otra Persona',client_phone:'04141234567',device_model:'Other'}];else if(url.includes('/service_appointments?'))rows=[{id:'a',client_name:'Maria Perez',client_email:'maria@example.test',device_model:'iPad',source:'web',status:'agendada'}];return {ok:true,json:async()=>rows};};
 try{const r=await require('../netlify/functions/customer-history').handler({httpMethod:'POST',headers:{},body:JSON.stringify({customer_id:id})});assert.equal(r.statusCode,200);const d=JSON.parse(r.body);assert.equal(d.repairs.length,1);assert.equal(d.appointments.length,1);assert.equal(d.origin.code,'unknown');assert(!/SECRET|PRIVATE|quote_amount|device_access_code/.test(r.body));}finally{A.authenticateInternal=saved.auth;A.mainConfig=saved.conf;global.fetch=saved.fetch;for(const [k,v]of [['SUPPORT_SUPABASE_URL',saved.url],['SUPPORT_SUPABASE_SERVICE_ROLE_KEY',saved.key]])if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
