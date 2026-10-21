'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {render}=require('../netlify/functions/service-payment-receipt-template');
test('recibo provisional: conserva abonado, saldo y vencimiento sin fingir pago completo',()=>{
  const html=render({order:{code:'TS-DEMO',client_name:'Cliente',quote_amount:120,amount_paid:60,device_model:'iPhone',reception_checklist:{__financing:{due_date:'2026-11-02'}}},events:[{event_type:'payment',amount_delta:60,payment_method:'Efectivo USD',occurred_at:'2026-10-13T15:32:41Z'}]});
  assert.match(html,/Comprobante provisional de abonos/);assert.match(html,/No es Nota de Entrega/);assert.match(html,/USD 60\.00/);assert.match(html,/2026-11-02/);assert.match(html,/Efectivo USD/);
});
test('comprobante de abono no se puede generar sin abono válido y deuda restante',()=>{
  assert.throws(()=>render({order:{quote_amount:120,amount_paid:120}}),/requiere un abono confirmado/);
});
test('el servidor mantiene la nota definitiva bloqueada si hay deuda',()=>{
  const src=read('netlify/functions/staff-repairs.js');
  assert.match(src,/if\(b\.action==='view_payment_receipt'\)/);
  assert.match(src,/if\(!acc\.paidOff\)return result\(409/);
  assert.match(src,/if\(atomicState\.fully_paid\)\{\s*try\{\s*const note=await deliveryNoteData/);
  assert.match(src,/renderServicePaymentReceipt/);
});
test('la UI valida pagos con coma y nunca rellena por sí sola el saldo',()=>{
  const src=read('staff/repairs.js'),snippet=src.match(/function readMoney\(value\)\{[\s\S]*?\n\}/)?.[0];assert.ok(snippet);
  const readMoney=vm.runInNewContext(snippet+'\nreadMoney');
  assert.equal(readMoney('20,00'),20);assert.equal(readMoney('1.234,56'),1234.56);assert.equal(readMoney('1,234.56'),1234.56);assert.equal(readMoney(''),0);
  assert.match(src,/newPaymentSelection\(g,'Efectivo USD'\)/);assert.match(src,/return alert\('Escribe primero la cantidad/);assert.match(src,/Ver \/ imprimir comprobante de abonos/);
});
test('la Nota de Entrega final incluye abonado y saldo',()=>{
 const src=read('netlify/functions/service-delivery-note-template.js');assert.match(src,/Total abonado/);assert.match(src,/Saldo pendiente/);assert.match(src,/Fecha de cancelación/);
});
