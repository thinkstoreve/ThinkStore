'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {serviceProfit}=require('../netlify/functions/enterprise-funds-core');
const order={id:15,code:'TS-SVC-2026-0015',quote_amount:90,quote_currency:'USD',amount_paid:70,status:'En reparación'};
const event={id:'p1',service_order_id:15,amount_delta:70,occurred_at:'2026-10-28T15:00:00-04:00'};
const settlement={order_code:order.code,service_order_id:15,subtotal_usd:120,discount_usd:30,collected_usd:90,parts_cost_usd:35,store_product_cost_usd:0,service_direct_cost_usd:0,total_commission_usd:9};
test('abono 70 de factura 90 permanece en caja y no se convierte en utilidad ni reparto',()=>{const x=serviceProfit([order],[],[event]);assert.equal(x.profit,0);assert.equal(x.held,70);});
test('pago final libera 46 de utilidad completa aunque el anticipo venga de otra semana',()=>{const x=serviceProfit([{...order,amount_paid:90}],[settlement],[{...event,amount_delta:20}]);assert.equal(x.profit,46);assert.equal(x.held,0);});
test('liquidación parcial o sin costos no reconoce utilidad y una pérdida se conserva',()=>{assert.equal(serviceProfit([order],[settlement],[event]).profit,0);assert.equal(serviceProfit([{...order,amount_paid:90}],[{...settlement,parts_cost_usd:null}],[event]).profit,0);assert.equal(serviceProfit([{...order,amount_paid:90}],[{...settlement,parts_cost_usd:85}],[event]).profit,-4);});
test('liquidaciones duplicadas no duplican utilidad y anulaciones sin conciliar bloquean reparto',()=>{assert.equal(serviceProfit([{...order,amount_paid:90}],[settlement,settlement],[]).profit,46);assert.equal(serviceProfit([order],[],[{...event,amount_delta:-70}]).blocked,true);});
async function call(name){
 const before={...process.env},old=global.fetch;
 process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY='main-server-test';process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='support-test';process.env.SUPPORT_SUPABASE_URL='https://support.test';
 global.fetch=async u=>{const url=new URL(u);let data=[];
  if(url.pathname==='/auth/v1/user')data={id:'admin',email:'admin@test.invalid'};
  else if(url.pathname.endsWith('/profiles'))data=[{id:'admin',role:'superadmin',active:true}];
  else if(url.pathname.endsWith('/service_orders'))data=[order];
  else if(url.pathname.endsWith('/service_payment_events'))data=[event];
  return new Response(JSON.stringify(data),{status:200});
 };
 try{return await require('../netlify/functions/'+name).handler({httpMethod:'GET',headers:{authorization:'Bearer session'},queryStringParameters:{date:'2026-10-28'}});}
 finally{global.fetch=old;for(const k of Object.keys(process.env))if(!(k in before))delete process.env[k];Object.assign(process.env,before);}
}
test('endpoint financiero separa 70 recibido, 70 retenido y 0 repartible',async()=>{const r=await call('enterprise-finance');assert.equal(r.statusCode,200,r.body);const d=JSON.parse(r.body);assert.equal(d.collections.support,70);assert.equal(d.result.service_receipts_held,70);assert.equal(d.result.distributable,0);assert.equal(d.result.company,0);});
test('resumen semanal admite alias MAIN y no falla por variables inexistentes',async()=>{const r=await call('enterprise-summary');assert.equal(r.statusCode,200,r.body);const d=JSON.parse(r.body);assert.equal(d.global.distributable_profit,0);assert.ok(!r.body.includes('server-test'));assert.equal(require('../growth-enterprise/netlify/functions/enterprise-summary').handler,require('../netlify/functions/enterprise-summary').handler);});
