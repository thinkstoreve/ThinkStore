'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../staff/repairs.js'),'utf8');
const begin=src.indexOf('function financingEditor(o,a){');
const end=src.indexOf('function detail(){',begin);
assert.ok(begin>=0&&end>begin,'la función de financiación debe existir');
const definition=src.slice(begin,end);
function ui(order,account,bill){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return vm.runInNewContext(definition+'financingEditor(order, account)',{order,account,billing:bill,esc});
}
const eligible={quote_amount:100,quote_currency:'USD',reception_checklist:{}};
const balance={budget:100,pending:100,paidOff:false,canceled:false};
test('financiación es visible aunque falte presupuesto',()=>{
 const html=ui({quote_amount:0,quote_currency:'USD'}, {...balance,budget:0}, {pending_extra_count:0});
 assert.match(html,/Reparación financiada/);
 assert.match(html,/confirma el presupuesto/);
 assert.doesNotMatch(html,/id="financeSave"/);
});
test('financiación se puede configurar desde repuesto reservado y presupuestado automáticamente',()=>{
 const html=ui({quote_amount:0,quote_currency:'USD'}, {...balance,budget:40,pending:40}, {pending_extra_count:0,unpriced_part_count:0,auto_from_parts:true,parts_total:40});
 assert.match(html,/Total preparado desde repuestos reservados/);
 assert.match(html,/USD 40.00/);
 assert.match(html,/id="financeSave"/);
});
test('financiación se bloquea si hay repuestos sin precio',()=>{
 const html=ui({quote_amount:0,quote_currency:'USD'}, {...balance,budget:40,pending:40}, {pending_extra_count:0,unpriced_part_count:1,auto_from_parts:true,parts_total:40});
 assert.match(html,/sin precio configurado/);
 assert.doesNotMatch(html,/id="financeSave"/);
});
test('financiación se puede configurar con presupuesto USD confirmado',()=>{
 const html=ui(eligible,balance,{pending_extra_count:0});
 assert.match(html,/id="financeSave"/);
 assert.match(html,/id="financeInitial"/);
 assert.match(html,/id="financeDue"/);
});
test('financiación explica una orden pagada y no permite editar el plan',()=>{
 const html=ui(eligible,{...balance,pending:0,paidOff:true},{pending_extra_count:0});
 assert.match(html,/Reparación financiada/);
 assert.match(html,/saldo pendiente/);
 assert.doesNotMatch(html,/id="financeSave"/);
});
test('financiación espera la carga del servidor antes de habilitar formulario',()=>{
 const html=ui(eligible,balance,null);
 assert.match(html,/Consultando los requisitos/);
 assert.doesNotMatch(html,/id="financeSave"/);
});
test('no permite configurar si hay cargos sin consolidar',()=>{
 const html=ui(eligible,balance,{pending_extra_count:1});
 assert.match(html,/Consolida primero/);
 assert.doesNotMatch(html,/id="financeSave"/);
});
