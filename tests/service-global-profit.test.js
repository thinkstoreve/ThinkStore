'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../netlify/functions/staff-repairs.js'),'utf8');
const body=code.slice(code.indexOf('async function syncEnterpriseServiceSettlement('),code.indexOf('\nasync function orderNotes('));
async function settle({total=100,subtotal=100,cost=40,paid=total,tech='tech@test.invalid'}={}){
 const commissions=[];
 const deps={round:v=>Math.round((Number(v)||0)*100)/100,clean:v=>String(v??'').trim(),pctOrNull:v=>v==null?null:Number(v),mainConf:()=>({url:'https://test',key:'test'}),storeVariantCost:async()=>0,upsertFinanceCommission:async(...args)=>commissions.push(args),rest:async(c,table,q,opts={})=>{
  if(table==='profiles')return [{technician_parts_commission_pct:90,technician_service_commission_pct:60}];
  if(table==='enterprise_finance_settings')return [{technician_parts_default_pct:70}];
  if(table==='enterprise_service_settlements')return opts.method==='POST'?[JSON.parse(opts.body)]:[];
  throw Error('Unexpected '+table);
 }};
 const fn=Function(...Object.keys(deps),'return ('+body+')')(...Object.values(deps));
 const saved=await fn({id:1,code:'SVC1',quote_amount:total,amount_paid:paid,assigned_technician_email:tech},[{quantity_reserved:1,sale_price_snapshot:subtotal,unit_cost_snapshot:cost,service_parts:{unit_cost:999}}],[],{subtotal_usd:subtotal,invoice_total:total},{role:'admin'});
 return {saved,commissions};
}
test('100 cobrado - 40 repuesto - 10 técnico = 50, incluso con reglas anteriores',async()=>{
 const {saved,commissions}=await settle();assert.equal(saved.total_commission_usd,10);assert.equal(saved.parts_cost_usd,40);assert.equal(saved.company_profit_usd,50);assert.equal(commissions.length,1);assert.equal(commissions[0][2],10);assert.equal(saved.metadata.commission_base_usd,100);
});
test('10% se calcula sobre total después de descuento y conserva costo histórico',async()=>{
 const {saved}=await settle({total:80});assert.equal(saved.total_commission_usd,8);assert.equal(saved.parts_cost_usd,40);assert.equal(saved.company_profit_usd,32);
});
test('costo cero explícito se conserva y una pérdida no se convierte en ganancia',async()=>{
 assert.equal((await settle({cost:0})).saved.parts_cost_usd,0);
 assert.equal((await settle({cost:95})).saved.company_profit_usd,-5);
});
test('abono parcial no crea comisión pagadera ni declara factura cobrada',async()=>{
 const {saved,commissions}=await settle({paid:50});assert.equal(saved.collected_usd,50);assert.equal(saved.metadata.payment_reconciliation.receivable_usd,50);assert.equal(commissions.length,0);
});
test('reserva el 10% aunque falte asignar técnico',async()=>{const {commissions}=await settle({tech:''});assert.equal(commissions.length,1);assert.equal(commissions[0][5],'Técnico por asignar');});
