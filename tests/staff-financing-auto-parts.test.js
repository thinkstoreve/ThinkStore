'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const auth=require('../netlify/functions/staff-auth-core');
auth.authenticateInternal=async()=>({ok:true,role:'admin',email:'staff@example.test',profile:{is_internal:true,role:'admin'}});
auth.mainConfig=()=>({url:'https://main.example.test',service:'test'});
const clients=require('../netlify/functions/registered-customer-core');
clients.load=async()=>({id:'12345678-1234-1234-1234-123456789abc',name:'Test Customer',email:'client@example.test',phone:'+584221234567',document:'V12345678',address:'Test address',email_verified:true});
const {handler}=require('../netlify/functions/staff-repairs');
process.env.SUPPORT_SUPABASE_URL='https://support.supabase.co';
process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='test';
function scenario({parts=[{part_id:'p1',quantity_reserved:1,sale_price_snapshot:40,status:'reserved'}],extras=[],conflict=false,quote=0,paid=0}={}){
 const row={id:'123',code:'TEST',client_email:'client@example.test',quote_amount:quote,quote_currency:'USD',amount_paid:paid,status:'En reparación',updated_at:'2026-10-12T00:00:00Z',reception_checklist:{screen:{checked:true}}};
 const writes=[];
 const fetcher=async(url,options={})=>{
  const u=new URL(url); let data=[];
  if(u.pathname.endsWith('/service_orders')){
   if(options.method==='PATCH'){
    writes.push({query:u.searchParams,body:JSON.parse(options.body)});
    data=conflict?[]:[{...row,...JSON.parse(options.body)}];
   }else data=[row];
  }else if(u.pathname.endsWith('/service_order_parts'))data=parts;
  else if(u.pathname.endsWith('/service_order_sale_items'))data=extras;
  return {ok:true,status:200,json:async()=>data};
 };
 return {writes,fetcher};
}
const call=()=>handler({httpMethod:'POST',headers:{},body:JSON.stringify({action:'set_financing',order_id:'123',initial_amount:10,due_date:'2099-12-31'})});
test('financia un único repuesto reservado $40, fija presupuesto y NO cobra ni consume inventario',async()=>{
 const s=scenario(),prev=global.fetch;global.fetch=s.fetcher;
 try{
  const r=await call();assert.equal(r.statusCode,200,r.body);
  assert.equal(s.writes.length,1,'only one update to service_orders');
  assert.equal(s.writes[0].body.quote_amount,40);
  assert.equal(s.writes[0].body.subtotal_usd,40);
  assert.equal(s.writes[0].body.reception_checklist.__financing.initial_amount,10);
  assert.equal(s.writes[0].body.reception_checklist.__financing.due_date,'2099-12-31');
  assert.equal(s.writes[0].body.amount_paid,undefined);
  assert.equal(s.writes[0].body.payment_status,undefined);
  assert.equal(s.writes[0].body.quote_status,undefined);
  assert.equal(s.writes[0].query.get('updated_at'),'eq.2026-10-12T00:00:00Z');
  assert.equal(JSON.parse(r.body).financing.balance,40);
 }finally{global.fetch=prev}
});
test('rechaza financiar con repuesto sin precio',async()=>{
 const s=scenario({parts:[{part_id:'p1',quantity_reserved:1,sale_price_snapshot:0,status:'reserved'}]}),prev=global.fetch;global.fetch=s.fetcher;
 try{const r=await call();assert.equal(r.statusCode,409,r.body);assert.match(r.body,/repuestos sin precio/);assert.equal(s.writes.length,0)}finally{global.fetch=prev}
});
test('rechaza financiar si hay cargos de venta adicionales pendientes',async()=>{
 const s=scenario({extras:[{status:'active',quantity:1,unit_price_usd:15,included_in_quote:false}]}),prev=global.fetch;global.fetch=s.fetcher;
 try{const r=await call();assert.equal(r.statusCode,409,r.body);assert.match(r.body,/Consolida/);assert.equal(s.writes.length,0)}finally{global.fetch=prev}
});
test('no permite el plan sin presupuesto ni repuestos preparados',async()=>{
 const s=scenario({parts:[]}),prev=global.fetch;global.fetch=s.fetcher;
 try{const r=await call();assert.equal(r.statusCode,409,r.body);assert.equal(s.writes.length,0)}finally{global.fetch=prev}
});
test('rechaza escritura si la orden cambió durante la confirmación',async()=>{
 const s=scenario({conflict:true}),prev=global.fetch;global.fetch=s.fetcher;
 try{const r=await call();assert.equal(r.statusCode,409,r.body);assert.equal(s.writes.length,1)}finally{global.fetch=prev}
});
