'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const auth=require('../netlify/functions/staff-auth-core');
auth.authenticateInternal=async()=>({ok:true,role:'admin',email:'staff@example.test',profile:{is_internal:true,active:true}});
const {handler}=require('../netlify/functions/staff-repairs');
const oldEnv=[process.env.SUPPORT_SUPABASE_URL,process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY];
process.env.SUPPORT_SUPABASE_URL='https://test.supabase.co';
process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='test';
const order={id:'123',code:'TS-SVC-2026-0008',quote_amount:120,quote_currency:'USD',amount_paid:60,subtotal_usd:120,discount_value:0,discount_usd:0,reception_checklist:{__financing:{enabled:true,initial_amount:60,due_date:'2026-11-02'}}};
async function simulate({receiptAck=null,repeat=false}={}){
 const logs=[],old=global.fetch;
 global.fetch=async(url,init={})=>{
  const u=new URL(url);logs.push({path:u.pathname,method:init.method||'GET'});
  let rows=[];
  if(u.pathname.endsWith('/service_orders'))rows=[order];
  else if(u.pathname.endsWith('/service_order_parts'))rows=[{id:'a',part_id:'a',status:'consumed',quantity_consumed:1,sale_price_snapshot:50},{id:'b',part_id:'b',status:'consumed',quantity_consumed:1,sale_price_snapshot:70}];
  else if(u.pathname.endsWith('/service_payment_events'))rows=repeat?[{id:'r1',amount_delta:60,payment_method:'Efectivo USD',event_type:'payment',occurred_at:new Date().toISOString()}]:[];
  else if(u.pathname.endsWith('/service_part_movements')||u.pathname.endsWith('/service_parts')||u.pathname.endsWith('/service_order_sale_items'))rows=[];
  else throw Error('Unexpected request '+u.pathname);
  return new Response(JSON.stringify(rows),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try {
  const result=await handler({httpMethod:'POST',headers:{},body:JSON.stringify({action:'pay',order_id:'123',method:'Efectivo USD',amount:60,payment_intent:'manual_abono',expected_paid:60,receipt_ack_usd:receiptAck})});
  return {result,logs};
 }finally{global.fetch=old;}
}
test('si falta confirmación de dinero recibido rechaza pago antes del RPC',async()=>{
 const {result,logs}=await simulate({receiptAck:null});
 assert.equal(result.statusCode,409,result.body);
 assert.match(result.body,/confirma expresamente/);
 assert.equal(logs.some(x=>x.path.includes('/rpc/')),false);
});
test('si hay pago idéntico reciente bloquea otro cobro antes del RPC',async()=>{
 const {result,logs}=await simulate({receiptAck:'RECIBIDO 60.00',repeat:true});
 assert.equal(result.statusCode,409,result.body);
 assert.match(result.body,/abono reciente/);
 assert.equal(logs.some(x=>x.path.includes('/rpc/')),false);
});
