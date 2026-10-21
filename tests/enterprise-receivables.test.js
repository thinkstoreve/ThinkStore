const test=require('node:test');
const assert=require('node:assert/strict');
const {storeReceivable,servicePendingAmount}=require('../netlify/functions/enterprise-finance').receivableModel;
test('Reparación de 120 con abono de 60 mantiene exactamente 60 pendientes',()=>{
 assert.equal(servicePendingAmount({quote_amount:120,amount_paid:60,status:'Entregado'}),60);
 assert.equal(servicePendingAmount({quote_amount:120,amount_paid:120}),0);
 assert.equal(servicePendingAmount({quote_amount:120,amount_paid:60,status:'Cancelado'}),0);
});
test('Una venta aprobada parcialmente pagada conserva su crédito',()=>{
 const r=storeReceivable({id:1,total_usd:120,amount_paid:60,payment_decision:'approved'});
 assert.equal(r.pending_usd,60);assert.equal(r.paid_usd,60);
});
test('Los abonos confirmados se suman una vez y no incluyen anulaciones',()=>{
 const o={id:2,total_usd:120,estado:'Pendiente'};
 const r=storeReceivable(o,[{pedido_id:2,status:'confirmed',usd_equivalent:40},{pedido_id:2,status:'confirmed',usd_equivalent:20},{pedido_id:2,status:'void',usd_equivalent:60}]);
 assert.equal(r.pending_usd,60);
});
test('Venta pagada o cancelada y borrador sin deuda no generan saldo ficticio',()=>{
 assert.equal(storeReceivable({id:1,total_usd:120,payment_decision:'approved'}),null);
 assert.equal(storeReceivable({id:1,total_usd:120,estado:'Cancelado'}),null);
 assert.equal(storeReceivable({id:1,total_usd:120,estado:'Borrador'}),null);
});
