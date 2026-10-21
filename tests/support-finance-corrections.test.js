'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const money=require('../soporte/money-input');
test('importes es-VE reconocen miles con punto, decimales con coma y formato alternativo',()=>{
 for(const [input,expected] of [['1.234,56',1234.56],['1,234.56',1234.56],['78,40',78.4],['0.07',0.07],['1.234',1234],['78.47',78.47]])assert.equal(money.parse(input),expected,input);
 assert.equal(money.display(1234.56),'1.234,56');
 for(const input of ['-12','abc','1,2,3','1.234,5678'])assert.equal(Number.isNaN(money.parse(input)),true,input);
});
test('la migración solo permite corrección atómica de pagos parciales y conserva eventos',()=>{
 const sql=fs.readFileSync(path.join(root,'MIGRACION-SOPORTE-V15.39-ANULACION-ABONOS.sql'),'utf8');
 assert.match(sql,/FOR UPDATE/);assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.service_payment_voids/i);
 assert.match(sql,/latest_id IS DISTINCT FROM p_event_id/);assert.match(sql,/quantity_consumed/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.ts_service_void_partial_payment.*TO service_role/);
 assert.doesNotMatch(sql,/DELETE\s+FROM\s+public\.service_payment_events/i);
 assert.match(sql,/amount_paid=after_paid/);
});
test('la pantalla distingue editar financiación de cobrar y permite anular sólo con administración',()=>{
 const app=fs.readFileSync(path.join(root,'soporte/app.js'),'utf8'),html=fs.readFileSync(path.join(root,'soporte/panel.html'),'utf8');
 assert.match(html,/id="mFinancePlanEditor"/);assert.match(html,/id="mFinInitial"/);assert.match(html,/id="mFinDue"/);
 assert.match(html,/id="mNewPayAmount" type="text"/);assert.match(app,/async function voidManagerPayment/);
 assert.match(app,/\['admin','superadmin'\]/);assert.match(app,/window\.TSMoneyInput\.parse/);
 assert.match(app,/action:'void_payment'/);assert.match(app,/action:'set_financing'/);
});
// Test the authenticated support bridge with a mocked server action.
test('solo administradores pueden solicitar una anulación desde la sesión de Soporte',async()=>{
 const staff=require('../netlify/functions/staff-repairs');const original=staff.manageFinanceFromVerifiedSupport;
 const bridgePath=require.resolve('../netlify/functions/support-record-payment');
 const beforeUrl=process.env.SUPPORT_SUPABASE_URL,beforeKey=process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY,oldFetch=global.fetch;
 process.env.SUPPORT_SUPABASE_URL='https://support.supabase.co';process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='fake';
 let actor;staff.manageFinanceFromVerifiedSupport=async(b,a)=>{actor=a;return{statusCode:200,headers:{},body:JSON.stringify({ok:true,action:b.action})}};
 const make=(role)=>({httpMethod:'POST',headers:{origin:'https://soporte.thinkstore.com.ve',authorization:'Bearer test'},body:JSON.stringify({action:'void_payment',order_id:'22',payment_event_id:'12345678-1234-4234-9234-123456789abc',reason:'Registro erróneo de abono'})});
 try{
  let role='admin';global.fetch=async url=>{if(String(url).endsWith('/auth/v1/user'))return new Response(JSON.stringify({email:'admin@test.example'}));return new Response(JSON.stringify([{rol:role,activo:true}]));};
  delete require.cache[bridgePath];const {handler}=require(bridgePath);
  let reply=await handler(make());assert.equal(reply.statusCode,200,reply.body);assert.equal(actor.email,'admin@test.example');assert.equal(actor.role,'admin');
  role='reception';reply=await handler(make());assert.equal(reply.statusCode,403,reply.body);
 }finally{staff.manageFinanceFromVerifiedSupport=original;global.fetch=oldFetch;delete require.cache[bridgePath];if(beforeUrl===undefined)delete process.env.SUPPORT_SUPABASE_URL;else process.env.SUPPORT_SUPABASE_URL=beforeUrl;if(beforeKey===undefined)delete process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY=beforeKey;}
});
test('anulación de abono crea contramovimiento contable sin borrar eventos ni cerrar inventario',async()=>{
 const auth=require('../netlify/functions/staff-auth-core');
 const beforeAuth=auth.authenticateInternal,beforeConfig=auth.mainConfig;
 auth.authenticateInternal=async()=>({ok:true,role:'admin',email:'admin@thinkstore.com.ve',profile:{is_internal:true,active:true}});
 auth.mainConfig=()=>({url:'https://main.supabase.co',service:'test'});
 const name=require.resolve('../netlify/functions/staff-repairs');delete require.cache[name];
 const {handler}=require(name);const oldFetch=global.fetch,oldUrl=process.env.SUPPORT_SUPABASE_URL,oldKey=process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY;
 process.env.SUPPORT_SUPABASE_URL='https://support.supabase.co';process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='fake';
 const code='TS-SVC-2026-0008',order={id:22,code,payment_status:'Abono parcial',quote_amount:120,amount_paid:78.47};
 const calls=[];
 global.fetch=async(u,opts={})=>{
   const url=new URL(u),body=opts.body?JSON.parse(opts.body):null;calls.push({url:url.href,method:opts.method||'GET',body});let data=[];
   if(url.pathname.endsWith('/service_orders'))data=[{...order}];
   else if(url.pathname.endsWith('/rpc/ts_service_void_partial_payment'))data={ok:true,duplicate:false,order_id:22,event_id:'12345678-1234-4234-9234-123456789abc',reversal_usd:78.4,before:78.47,after:0.07};
   else if(url.pathname.endsWith('/enterprise_petty_cash_bank_movements')){
     if(opts.method==='POST')data=[{id:'r1'}];
     else if(url.searchParams.get('related_petty_movement_id')?.includes('eq.service:'))data=[{id:'original',account_id:'bank1',currency:'VES',amount:68567.20,reference:'111'}];
   }
   else if(url.pathname.endsWith('/service_payment_voids')||url.pathname.endsWith('/service_audit_log'))data=[];
   else throw Error('Unexpected request '+url.pathname);
   return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
   const response=await handler({httpMethod:'POST',headers:{},body:JSON.stringify({action:'void_payment',order_id:22,payment_event_id:'12345678-1234-4234-9234-123456789abc',reason:'Importe equivocado en caja'})});
   assert.equal(response.statusCode,200,response.body);
   const payload=JSON.parse(response.body);assert.equal(payload.ok,true);assert.equal(payload.cash_sync_status,'posted');
   const rpc=calls.find(x=>x.url.includes('ts_service_void_partial_payment'));assert.equal(rpc.body.p_order_code,code);
   const inverse=calls.find(x=>x.url.includes('enterprise_petty_cash_bank_movements')&&x.method==='POST');
   assert.ok(inverse);assert.equal(inverse.body.direction,'out');assert.equal(inverse.body.amount,68567.20);
   assert.equal(inverse.body.currency,'VES');assert.match(inverse.body.related_petty_movement_id,/^service-void:/);
   assert.ok(!calls.some(x=>x.url.includes('service_payment_events')&&['DELETE','PATCH'].includes(x.method)));
 }finally{global.fetch=oldFetch;auth.authenticateInternal=beforeAuth;auth.mainConfig=beforeConfig;delete require.cache[name];if(oldUrl===undefined)delete process.env.SUPPORT_SUPABASE_URL;else process.env.SUPPORT_SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY=oldKey;}
});
