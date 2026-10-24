'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../growth-enterprise/payment-schedule-model');const {handler}=require('../netlify/functions/enterprise-schedules');
const id='12345678-1234-1234-1234-123456789abc';
const planned={id,title:'Alquiler',category:'rent',amount:100,currency:'USD',due_date:'2026-10-25',remind_days:3,status:'planned',updated_at:'2026-10-20T10:00:00+00:00'};
const response=(data,status=200)=>({ok:status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)});
async function run(body,{method='POST',row=planned,authorized=true,exists=false}={}){
 const old=global.fetch,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';const calls=[];
 global.fetch=async(u,o={})=>{u=String(u);calls.push({url:u,method:o.method||'GET',body:o.body?JSON.parse(o.body):null});if(u.endsWith('/auth/v1/user'))return response(authorized?{id:'manager-id',email:'manager@example.test'}:{},authorized?200:401);if(u.includes('/profiles?'))return response([{role:'admin',active:true,full_name:'Manager'}]);if(u.includes('/enterprise_payment_schedule?select=id'))return response(exists?[{id}]:[]);if(u.includes('/enterprise_payment_schedule?'))return response(row?[row]:[]);if(u.endsWith('/enterprise_payment_schedule'))return response([{...body,id}]);if(u.endsWith('/rpc/enterprise_pay_scheduled'))return response({entry_id:'expense-id',already_paid:false});throw Error('Unexpected request '+u);};
 try{const result=await handler({httpMethod:method,headers:{authorization:'Bearer test-token'},body:body?JSON.stringify(body):undefined});return{result,data:JSON.parse(result.body),calls};}finally{global.fetch=old;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;}
}
test('Caracas deadline classification distinguishes overdue, today and lead time',()=>{
 assert.equal(M.today(new Date('2026-10-21T02:00:00Z')),'2026-10-20');
 assert.equal(M.status({...planned,due_date:'2026-10-19'},'2026-10-20'),'overdue');assert.equal(M.status({...planned,due_date:'2026-10-20'},'2026-10-20'),'today');assert.equal(M.status({...planned,due_date:'2026-10-23'},'2026-10-20'),'upcoming');assert.equal(M.status(planned,'2026-10-20'),'scheduled');
 assert.equal(M.status({...planned,status:'paid',expense:{status:'void'}},'2026-10-20'),'review');assert.equal(M.status({...planned,status:'cancelled'},'2026-10-20'),'archived');
});
test('schedule validation handles leap dates, decimal commas and invalid amounts',()=>{
 assert.equal(M.date('2026-02-30'),false);assert.equal(M.date('2026-99-01'),false);assert.equal(M.date('2028-02-29'),true);assert.equal(M.validate({...planned,amount:'12,50'}).amount,12.5);assert.throws(()=>M.validate({...planned,remind_days:99}));assert.throws(()=>M.validate({...planned,amount:-10}));
});
test('unauthorized callers cannot query or change reminders',async()=>{const r=await run({action:'create',id},{authorized:false});assert.equal(r.result.statusCode,403);assert.equal(r.calls.some(c=>c.url.includes('/rest/v1/')),false);});
test('planning a bill never creates an expense or cash movement',async()=>{
 const r=await run({...planned,action:'create'});assert.equal(r.result.statusCode,200,r.result.body);const writes=r.calls.filter(c=>c.method==='POST');assert.equal(writes.length,1);assert.match(writes[0].url,/enterprise_payment_schedule$/);assert.equal(writes[0].body.status,undefined);assert.equal(r.calls.some(c=>c.url.includes('/enterprise_finance_entries')),false);
});
test('retrying the same reminder id is idempotent',async()=>{const r=await run({...planned,action:'create'},{exists:true});assert.equal(r.data.already_exists,true);assert.equal(r.calls.some(c=>c.method==='POST'),false);});
test('payment records actual amount and actor through one atomic RPC',async()=>{
 const r=await run({id,action:'pay',updated_at:planned.updated_at,settled:true,amount:'95,50',currency:'USD',payment_method:'Zelle',reference:'PAY123',funded_by:'freddy',paid_on:M.today()});assert.equal(r.result.statusCode,200,r.result.body);const writes=r.calls.filter(c=>c.method==='POST');assert.equal(writes.length,1);assert.match(writes[0].url,/rpc\/enterprise_pay_scheduled$/);assert.equal(writes[0].body.p_payment.amount_usd,95.5);assert.equal(writes[0].body.p_payment.funded_by,'freddy');assert.equal(writes[0].body.p_payment.created_by_email,'manager@example.test');
});
test('paid reminders cannot create another expense on retry',async()=>{const r=await run({id,action:'pay'},{row:{...planned,status:'paid',paid_entry_id:'existing-expense'}});assert.equal(r.data.already_paid,true);assert.equal(r.calls.some(c=>c.method==='POST'),false);});
test('Inventory supplier obligations do not become duplicate manual expenses',async()=>{const r=await run({id,action:'pay'},{row:{...planned,category:'supplier'}});assert.equal(r.result.statusCode,409);assert.equal(r.calls.some(c=>c.method==='POST'),false);});
test('changed schedules and unconfirmed settlement cannot post payments',async()=>{const a=await run({id,action:'pay',updated_at:'old',settled:true});assert.equal(a.result.statusCode,409);assert.equal(a.calls.some(c=>c.method==='POST'),false);const b=await run({id,action:'pay',updated_at:planned.updated_at});assert.equal(b.result.statusCode,400);assert.equal(b.calls.some(c=>c.method==='POST'),false);});

test('pago de empresa exige cuenta y transmite su ID en la misma operación',async()=>{
 const payment={id,action:'pay',updated_at:planned.updated_at,settled:true,amount:'25',currency:'USD',payment_method:'Efectivo USD',funded_by:'company',paid_on:M.today()};
 const denied=await run(payment);assert.equal(denied.result.statusCode,400);assert.equal(denied.calls.some(c=>c.method==='POST'),false);
 const accepted=await run({...payment,bank_account_id:id});assert.equal(accepted.result.statusCode,200);assert.equal(accepted.calls.find(c=>c.url.endsWith('/rpc/enterprise_pay_scheduled')).body.p_payment.bank_account_id,id);
});
