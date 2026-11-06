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
test('Soporte carga cotizador antes del formulario y conserva fecha y caducidad',async()=>{
 const vm=require('node:vm'),html=fs.readFileSync(path.join(root,'soporte/panel.html'),'utf8'),code=fs.readFileSync(path.join(root,'soporte/ts-fx.js'),'utf8');
 assert.ok(html.indexOf('src="ts-fx.js?v=15.45-bcv-abonos"')<html.indexOf('src="app.js?v=15.45-bcv-abonos"'));
 assert.ok(html.includes('src="ts-fx.js?v=15.45-bcv-abonos"'));
 const window={dispatchEvent(){},addEventListener(){}},document={readyState:'loading',addEventListener(){},querySelectorAll(){return[];}};
 let calls=0;const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const payload={ok:true,rate:123.456,effective_date:day,source_date:new Date().toISOString(),checked_at:new Date().toISOString(),stale:false};
 vm.runInNewContext(code,{window,document,Intl,Date,CustomEvent:function(){},fetch:async()=>{calls++;if(calls>1)throw Error('network');return{ok:true,json:async()=>payload}}});
 await window.ThinkStoreFX.refresh(true);const quote=window.ThinkStoreFX.snapshot(25);assert.equal(quote.total_ves,3086.4);assert.equal(quote.effective_date,day);assert.equal(quote.stale,false);
 await assert.rejects(window.ThinkStoreFX.refresh(true),/network/);assert.equal(window.ThinkStoreFX.snapshot(1).stale,true);
 const shared=require('../netlify/functions/fx-rate-core'),support=require('../soporte/netlify/functions/fx-rate-core');assert.deepEqual(support.normalize({USD:123,effective_date:day,updated_at:new Date().toISOString()},'test'),shared.normalize({USD:123,effective_date:day,updated_at:new Date().toISOString()},'test'));
});
