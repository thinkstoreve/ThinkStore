'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const code=fs.readFileSync(path.join(__dirname,'../netlify/functions/staff-repairs.js'),'utf8');
const start=code.indexOf('async function syncEnterpriseServiceSettlement(');
const end=code.indexOf('\nasync function orderNotes(',start);
assert.ok(start>0 && end>start);
const fnBody=code.slice(start,end);
async function run(paid,oldMetadata={}) {
  const calls=[];
  const deps={
    round:x=>Math.round((Number(x)||0)*100)/100,
    clean:(s,n=400)=>String(s??'').trim().slice(0,n),
    pctOrNull:()=>null,
    mainConf:()=>({url:'https://db.test',key:'test'}),
    storeVariantCost:async()=>0,
    upsertFinanceCommission:async()=>{throw Error('No commissions should be created for test without users')},
    rest:async(conf,table,query,opts={})=>{
      calls.push({table,query,opts});
      if(table==='enterprise_finance_settings')return [{}];
      if(table==='enterprise_service_settlements' && !opts.method) return oldMetadata ? [{id:'previous',metadata:oldMetadata}]:[];
      if(table==='enterprise_service_settlements' && opts.method==='POST')return [JSON.parse(opts.body)];
      throw Error('Unexpected DB call: '+table);
    }
  };
  const fn=Function(...Object.keys(deps),'return ('+fnBody+')')(...Object.values(deps));
  const saved=await fn({code:'TS-DA53AC91',id:17,quote_amount:120,amount_paid:paid,assigned_technician_email:''},[],[],{subtotal_usd:120,invoice_total:120},{role:'superadmin'});
  return {saved,calls};
}
test('Financiación de USD 120 con USD 60 cobrado preserva USD 60 por cobrar',async()=>{
  const old={custom_audit:'preserve',payment_reconciliation:{case:'TS-DA53AC91',reason:'corregido',received_usd:60}};
  const {saved,calls}=await run(60,old);
  assert.equal(saved.collected_usd,60);
  assert.equal(saved.metadata.payment_reconciliation.receivable_usd,60);
  assert.equal(saved.metadata.payment_reconciliation.invoiced_usd,120);
  assert.equal(saved.metadata.custom_audit,'preserve');
  assert.equal(saved.metadata.payment_reconciliation.reason,'corregido');
  assert.equal(calls.filter(x=>x.table==='enterprise_service_settlements' && x.opts.method==='POST').length,1);
});
test('Al confirmar pago completo real, saldo por cobrar se vuelve cero',async()=>{
  const {saved}=await run(120,{payment_reconciliation:{case:'TS-DA53AC91',receivable_usd:60}});
  assert.equal(saved.collected_usd,120);
  assert.equal(saved.metadata.payment_reconciliation.receivable_usd,0);
});
test('Sin pago recibido, nunca declara factura entera cobrada',async()=>{
  const {saved}=await run(0,{});
  assert.equal(saved.collected_usd,0);
  assert.equal(saved.metadata.payment_reconciliation.receivable_usd,120);
});
