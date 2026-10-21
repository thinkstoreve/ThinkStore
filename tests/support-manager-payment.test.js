'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const staff=require('../netlify/functions/staff-repairs');
const originalPay=staff.payFromVerifiedSupport;
const bridgePath=require.resolve('../netlify/functions/support-record-payment');
const makeEvent=(body={},token='abc',origin='https://soporte.thinkstore.com.ve')=>({httpMethod:'POST',headers:{authorization:token?'Bearer '+token:'',origin},body:JSON.stringify({action:'pay',order_id:'22',method:'Zelle',amount:10,reference:'abc123',destination_code:'zelle',...body})});
async function setupFetch(role='admin'){
 global.fetch=async(url)=>{
  if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify({email:'test@thinkstore.com.ve'}),{status:200});
  if(url.includes('/service_users?'))return new Response(JSON.stringify([{rol:role,activo:true,nombre:'Testing User'}]),{status:200});
  throw Error('Unexpected request '+url);
 };
}
test('Soporte valida identidad, permisos y delega al mismo cobro Staff',async()=>{
 const oldFetch=global.fetch;const oldUrl=process.env.SUPPORT_SUPABASE_URL,oldKey=process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY;
 process.env.SUPPORT_SUPABASE_URL='https://support.supabase.co';process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='fake-service-key';
 let request=null,actor=null;
 staff.payFromVerifiedSupport=async(b,a)=>{request=b;actor=a;return{statusCode:200,headers:{},body:JSON.stringify({ok:true,payment:{after:10}})}};
 delete require.cache[bridgePath];const bridge=require(bridgePath);
 try{
   await setupFetch('admin');
   const r=await bridge.handler(makeEvent());
   assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).ok,true);
   assert.equal(request.action,'pay');assert.equal(request.order_id,'22');assert.equal(request.method,'Zelle');
   assert.equal(request.amount,10);assert.equal(request.destination_code,'zelle');
   assert.equal(actor.email,'test@thinkstore.com.ve');assert.equal(actor.profile.is_internal,true);
   const technician=await (async()=>{await setupFetch('technician');return bridge.handler(makeEvent())})();
   assert.equal(technician.statusCode,403);
   const absent=await bridge.handler(makeEvent({},''));assert.equal(absent.statusCode,401);
   const origin=await bridge.handler(makeEvent({},'abc','https://malicious.example'));assert.equal(origin.statusCode,403);
   assert.equal(JSON.parse(origin.body).ok,false);
 }finally{
   global.fetch=oldFetch;staff.payFromVerifiedSupport=originalPay;delete require.cache[bridgePath];
   if(oldUrl===undefined)delete process.env.SUPPORT_SUPABASE_URL;else process.env.SUPPORT_SUPABASE_URL=oldUrl;
   if(oldKey===undefined)delete process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY=oldKey;
 }
});
test('Soporte presenta formulario real y no escribe montos manualmente en Guardar cambios',()=>{
 const html=fs.readFileSync(path.join(root,'soporte/panel.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'soporte/app.js'),'utf8');
 const staff=fs.readFileSync(path.join(root,'netlify/functions/staff-repairs.js'),'utf8');
 assert.match(html,/id="mNewPayMethod"/);assert.match(html,/id="mNewPayAmount"/);
 assert.match(html,/TSService\.recordManagerPayment\(\)/);
 assert.match(app,/support-record-payment/);assert.match(app,/action:'payment_detail'/);
 assert.match(app,/!newEvent/);assert.match(app,/managerPaymentBusy/);
 assert.match(staff,/payFromVerifiedSupport/);assert.match(staff,/ts_service_record_payment_atomic/);
 const save=app.split('async function saveOrderManager(e)')[1].split('async function sendQuoteToClient')[0];
 assert.doesNotMatch(save,/amount_paid\s*:/);
});
