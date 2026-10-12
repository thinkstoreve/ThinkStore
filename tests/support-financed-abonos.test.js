'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const id='12345678-1234-4234-8234-123456789abc';
const row={id,code:'TS-SVC-2026-0010',quote_amount:120,quote_currency:'USD',amount_paid:40,payment_status:'Abono parcial',payment_method:'Zelle',payment_notes:'Ref. 101',paid_at:null,updated_at:'2026-10-12T18:30:00Z',assigned_technician_email:'staff@example.test',reception_checklist:{__financing:{enabled:true,initial_amount:40,due_date:'2026-10-30'}}};
const event={id:'payment-1',event_type:'payment',amount_delta:40,balance_after:80,payment_method:'Zelle',reference:'101',occurred_at:'2026-10-12T18:30:00Z'};
async function callHandler(handler,{role='admin',missingHistory=false,invalidId=false}={}){
 const old=global.fetch;const originalEnv={url:process.env.SUPPORT_SUPABASE_URL,key:process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY};
 process.env.SUPPORT_SUPABASE_URL='https://support.example.test';process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='sample';
 const seen=[];
 global.fetch=async(url,options={})=>{
  const u=new URL(url);seen.push({path:u.pathname,method:options.method||'GET'});
  if(u.pathname==='/auth/v1/user')return new Response(JSON.stringify({email:'staff@example.test'}),{status:200});
  if(u.pathname.endsWith('/service_users'))return new Response(JSON.stringify([{rol:role,activo:true}]),{status:200});
  if(u.pathname.endsWith('/service_orders'))return new Response(JSON.stringify([row]),{status:200});
  if(u.pathname.endsWith('/service_payment_events'))return new Response(JSON.stringify(missingHistory?{message:'service_payment_events does not exist'}:[event]),{status:missingHistory?404:200});
  throw Error('Unexpected request '+u.pathname);
 };
 try{return {result:await handler({httpMethod:'POST',headers:{authorization:'Bearer example'},body:JSON.stringify({action:'payment_detail',order_id:invalidId?'bad':id})}),seen};}
 finally{global.fetch=old;if(originalEnv.url===undefined)delete process.env.SUPPORT_SUPABASE_URL;else process.env.SUPPORT_SUPABASE_URL=originalEnv.url;if(originalEnv.key===undefined)delete process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY=originalEnv.key;}
}
for(const mod of ['netlify/functions/support-actions','soporte/netlify/functions/support-actions']){
 test(`${mod}: muestra abono real con método y referencia y no escribe en BD`,async()=>{
  const {handler}=require('../'+mod);const {result,seen}=await callHandler(handler);const json=JSON.parse(result.body);
  assert.equal(result.statusCode,200,JSON.stringify(json));assert.equal(json.order.amount_paid,40);assert.equal(json.order.reception_checklist.__financing.enabled,true);assert.equal(json.events[0].payment_method,'Zelle');assert.equal(json.events[0].amount_delta,40);assert.equal(json.history_available,true);
  assert.ok(seen.every(x=>x.method==='GET'),'payment_detail must remain read only');
 });
 test(`${mod}: si no hay historial devuelve advertencia, nunca inventa pagos`,async()=>{
  const {result}=await callHandler(require('../'+mod).handler,{missingHistory:true});const json=JSON.parse(result.body);
  assert.equal(result.statusCode,200);assert.equal(json.history_available,false);assert.deepEqual(json.events,[]);
 });
 test(`${mod}: rechaza identificador de orden inválido`,async()=>{
  const {result,seen}=await callHandler(require('../'+mod).handler,{invalidId:true});assert.equal(result.statusCode,400);assert.ok(!seen.some(x=>/service_orders|service_payment_events/.test(x.path)));
 });
}
test('Soporte presenta plan de financiación, saldo e historial en ventana Gestionar',()=>{
 const html=fs.readFileSync(path.join(base,'soporte/panel.html'),'utf8');const js=fs.readFileSync(path.join(base,'soporte/app.js'),'utf8');
 assert.match(html,/mFinancePaymentSummary/);assert.match(html,/mFinanceEvents/);assert.match(js,/action:'payment_detail'/);assert.match(js,/Condición de pago: Financiado/);assert.match(js,/No hay abonos confirmados/);
 assert.match(html,/mAmountPaid" type="number" disabled/);assert.match(js,/openCashierForOrder/);
});
test('Staff abre la orden solicitada desde Soporte sin alterarla',()=>{
 const app=fs.readFileSync(path.join(base,'staff/repairs.js'),'utf8');assert.match(app,/URLSearchParams\(window.location.search\)\.get\('service_order'\)/);assert.match(app,/open\(target.id\)/);
});
