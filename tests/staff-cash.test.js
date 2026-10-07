'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {ledger}=require('../netlify/functions/staff-cash-core');
const open={opening_usd:20,opening_ves:400,counted_usd:55,counted_ves:3400};
const time='2026-10-06T22:00:00.000Z';
const orders=[
{id:'a',codigo:'TS-100',total_usd:100,metodo_pago:'Pago mixto',payment_decision:'approved',payment_decision_at:time},
{id:'b',codigo:'TS-101',total_usd:15,metodo_pago:'Zelle',payment_decision:'approved',payment_decision_at:time}
];
const lines=[
{pedido_id:'a',method:'Efectivo USD',currency:'USD',amount:40,usd_equivalent:40,confirmed_at:time},
{pedido_id:'a',method:'Pago Móvil',currency:'VES',amount:3000,usd_equivalent:60,confirmed_at:time}
];
const movements=[
{id:'m1',type:'gasto',direction:'out',currency:'USD',method:'Efectivo USD',amount:5,concept:'Suministros',created_at:time},
{id:'m2',type:'ingreso',direction:'in',currency:'VES',method:'Efectivo Bs',amount:150,concept:'Fondo adicional',created_at:time}
];
test('cuenta cada venta una vez y cada abono mixto por su método',()=>{
const r=ledger(open,orders,lines,movements);
assert.equal(r.sale_count,2);assert.equal(r.sold_usd,115);assert.equal(r.collected_usd,115);assert.equal(r.collected_ves,3000);
assert.equal(r.by_method['Efectivo USD'].net,35);assert.equal(r.by_method['Pago Móvil'].net,3000);
assert.equal(r.by_method.Zelle.net,15);assert.equal(r.expected_usd,55);assert.equal(r.expected_ves,550);
assert.equal(r.difference_usd,0);assert.equal(r.difference_ves,2850);assert.deepEqual(r.warnings,[]);
});
test('rechaza lectura con abonos faltantes / discrepancia',()=>{
const r=ledger(open,orders,lines.slice(0,1),movements);
assert.equal(r.sold_usd,115);assert.match(r.warnings.join(),/no coinciden/i);
});
test('ventas pendientes y rechazadas no afectan la caja',()=>{
const r=ledger(open,[...orders,{id:'p',metodo_pago:'Zelle',payment_decision:'pending',total_usd:100,payment_decision_at:time}],lines,movements);
assert.equal(r.sale_count,2);
});
test('ajuste negativo reduce el saldo de método',()=>{
const r=ledger(open,[],[],[{id:'x',type:'ajuste',direction:'out',method:'Efectivo USD',currency:'USD',amount:10,concept:'Corrección',created_at:time}]);
assert.equal(r.expected_usd,10);
});
test('no convierte al tipo actual cobros históricos en bolívares',()=>{
const r=ledger(open,[{id:'b2',codigo:'TS-102',total_usd:10,total_bs:500,bcv_rate:50,metodo_pago:'Pago Móvil',payment_decision:'approved',payment_decision_at:time}],[],[]);
assert.equal(r.collected_ves,500);assert.equal(r.collected_usd,10);assert.equal(r.by_method['Pago Móvil'].net,500);
});
test('bloquea cobros en bolívares sin tasa almacenada',()=>{
const r=ledger(open,[{id:'b2',codigo:'TS-102',total_usd:10,total_bs:null,bcv_rate:null,metodo_pago:'Pago Móvil',payment_decision:'approved',payment_decision_at:time}],[],[]);
assert.equal(r.sale_count,0);assert.match(r.warnings.join(),/BCV/i);
});
