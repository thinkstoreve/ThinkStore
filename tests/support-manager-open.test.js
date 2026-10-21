const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// Execute the real manager rendering helpers with the minimum DOM surface used
// by the "Gestionar" action. Regression: V15.39 referenced undefined `f`.
const code=fs.readFileSync(path.join(__dirname,'../soporte/app.js'),'utf8');
const start=code.indexOf('  function managerFinancingSnapshot(');
const end=code.indexOf('  let managerPaymentBusy=false;',start);
assert.ok(start!==-1 && end>start);
const helpers=code.slice(start,end);

function render(role,financing){
  const ids=['mFinanceOverview','mFinanceEvents','mPaymentStatus','mAmountPaid','mPaymentMethod','mPaymentNotes','mFinancePlanEditor','mFinInitial','mFinDue'];
  const elements=Object.fromEntries(ids.map(id=>[id,{id,hidden:false,value:'',innerHTML:'',options:[],appendChild(){}}]));
  const document={getElementById(id){return elements[id]||null},createElement(){return {dataset:{}}}};
  const context={document,session:{role},window:{ThinkStoreFinancing:{snapshot:()=>financing},TSMoneyInput:{display:(n)=>String(n)}},orderPaymentState:()=>({key:'partial'}),esc:String,dateText:String};
  vm.createContext(context);
  vm.runInContext(`${helpers}\nthis.renderManagerFinance=renderManagerFinance`,context);
  context.renderManagerFinance({quoteAmount:120,amountPaid:78.47,quoteCurrency:'USD',checklist:{},paymentStatus:'Pendiente'},[],false);
  return elements;
}

test('Gestionar abre para administrador y precarga inicial y vencimiento',()=>{
  const elements=render('admin',{initial_amount:20,due_date:'2026-11-13',initial_paid:20,status:'active'});
  assert.equal(elements.mFinancePlanEditor.hidden,false);
  assert.equal(elements.mFinInitial.value,'20');
  assert.equal(elements.mFinDue.value,'2026-11-13');
  assert.match(elements.mFinanceOverview.innerHTML,/Financiado/);
});

test('Gestionar no falla sin financiación guardada',()=>{
  const elements=render('superadmin',null);
  assert.equal(elements.mFinInitial.value,'0');
  assert.equal(elements.mFinDue.value,'');
});

test('No muestra editor a técnico',()=>{
  const elements=render('technician',null);
  assert.equal(elements.mFinancePlanEditor.hidden,true);
});
