const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../growth-enterprise/enterprise-workspace-model');
test('missing money stays unknown instead of becoming a zero receipt',()=>{
 const rows=M.sales({sales_ledger:{records:[{id:'a',total_usd:100,collected_usd:null},{id:'b',total_usd:50,collected_usd:20}]}});
 assert.equal(rows[0].collected,null);assert.deepEqual(M.total(rows,'collected'),{amount:20,unknown:1,count:2});
 assert.deepEqual(M.total(rows,'amount'),{amount:150,unknown:0,count:2});
});
test('cash movements never synthesize receipts from sales or accrued expenses',()=>{
 const d={sales_ledger:{records:[{id:'sale',total_usd:100}]},expenses:{rows:[{id:'expense',amount_usd:30}]}};
 assert.deepEqual(M.movements(d),[]);
 d.movement_ledger={records:[{source:'Soporte',source_id:'payment-a',direction:'in',method:'USDT',amount_usd:40},{source:'Soporte',source_id:'payment-b',direction:'in',method:'USDT',amount_usd:40},{source:'Enterprise',direction:'out',amount_usd:5}]};
 const rows=M.movements(d);assert.equal(rows.length,3);assert.equal(M.total(rows.filter(r=>r.direction==='in'),'amount').amount,80);assert.equal(M.total(rows.filter(r=>r.direction==='out'),'amount').amount,5);
 assert.notEqual(rows[0].key,rows[1].key);
});
test('queries combine source method direction and Caracas calendar boundaries',()=>{
 const rows=M.movements({movement_ledger:{records:[{source:'Soporte',method:'USDT',direction:'in',reference:'Reparación TS-12',occurred_at:'2026-10-20T02:00:00Z',amount_usd:99.95},{source:'Tienda',method:'Zelle',direction:'in',occurred_at:'2026-10-20T05:00:00Z',amount_usd:10}]}});
 const filtered=M.filter(rows,{from:'2026-10-19',to:'2026-10-19',source:'Soporte',method:'USDT',direction:'in',query:'reparacion'});
 assert.equal(filtered.length,1);assert.equal(M.total(filtered,'amount').amount,99.95);
 assert.equal(M.filter(rows,{direction:'out'}).length,0);
});
test('expense totals keep cents and can be traced to the original entry',()=>{
 const rows=M.expenses({expenses:{rows:[{id:'g1',amount_usd:0.1,description:'Transporte'},{id:'g2',amount_usd:0.2,reference:'Factura-2',funded_by:'freddy'}]}});
 assert.equal(M.total(rows,'amount').amount,0.3);assert.equal(rows[1].code,'Factura-2');assert.equal(rows[1].id,'g2');assert.equal(rows[1].funded_by,'freddy');
});
test('account totals separate currencies and ignore inactive accounts',()=>{
 const d={petty_cash:{banking:{connected:true,accounts:[{id:'a',currency:'USD',balance:0.1},{id:'b',currency:'USD',balance:0.2},{id:'c',currency:'VES',balance:500},{id:'d',currency:'USD',balance:900,active:false}]}}};
 assert.equal(M.accountTotal(d,'USD').amount,0.3);assert.equal(M.accountTotal(d,'VES').amount,500);assert.equal(M.accounts(d).length,3);
});
test('unknown or disconnected balances cannot look like verified zeros',()=>{
 assert.equal(M.accountTotal(null,'USD').amount,null);
 const d={petty_cash:{banking:{connected:true,accounts:[{id:'a',currency:'USD',balance:null},{id:'b',currency:'USD',balance:10}]}}};
 assert.equal(M.accountTotal(d,'USD').amount,null);assert.equal(M.accountTotal(d,'USD').unknown,1);assert.equal(M.accountTotal(d,'VES').amount,null);
 d.petty_cash.banking.connected=false;assert.equal(M.accountTotal(d,'USD').amount,null);
});
test('calculator accepts decimal comma and converts both directions without movements',()=>{
 assert.equal(M.converted('12,5',880,'usd'),11000);assert.equal(M.converted(11000,880,'ves'),12.5);assert.equal(M.converted(-1,880),null);assert.equal(M.converted('texto',880),null);assert.equal(M.converted(25,null),null);
});
