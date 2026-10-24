'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../netlify/functions/enterprise-planning')._test;
const {quarterRange}=require('../netlify/functions/enterprise-finance');
test('trimestres usan límites completos y Caracas',()=>{assert.deepEqual(quarterRange('2026-Q4'),{start:'2026-10-01',end:'2026-12-31',startIso:'2026-10-01T00:00:00-04:00',endIso:'2026-12-31T23:59:59.999-04:00'});assert.equal(quarterRange('2028-Q1').end,'2028-03-31');assert.equal(quarterRange('2026-Q5'),null);});
test('metas aceptan solo indicadores de contabilidad y no un ahorro declarado',()=>{const g={name:'Reserva operativa',metric:'cash_usd',quarter:'2026-Q4',target:'500,00',status:'proposed'};assert.equal(P.goal(g).target,500);assert.throws(()=>P.goal({...g,metric:'saved'}));assert.throws(()=>P.goal({...g,target:-1}));assert.throws(()=>P.goal({...g,quarter:'2026-Q0'}));});
test('una plantilla incompleta permanece borrador y no puede activarse',()=>{const t={title:'Internet',category:'service',currency:'USD',amount:'',due_day:'',remind_days:3,active:false};assert.equal(P.recurring(t).amount,null);assert.throws(()=>P.recurring({...t,active:true}));assert.equal(P.recurring({...t,amount:'20',due_day:31,active:true}).due_day,31);assert.throws(()=>P.recurring({...t,amount:'0',due_day:1,active:true}));});
