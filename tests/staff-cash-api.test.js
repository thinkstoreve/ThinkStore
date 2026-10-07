'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const originalFetch=global.fetch;
const originalURL=process.env.SUPABASE_URL;
const originalKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const POS=require('../netlify/functions/staff-pos');
const realAuth=POS.resolveCashAccess;
let actor,scenario,actions;
POS.resolveCashAccess=async()=>actor;
process.env.SUPABASE_URL='https://fake.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='testing-only';
const {handler}=require('../netlify/functions/staff-cash');
const id='a1111111-1111-4111-a111-111111111111', owner='b1111111-1111-4111-a111-111111111111';
const session={id,user_id:owner,status:'open',business_date:'2026-10-06',opened_at:'2026-10-06T17:00:00Z',opening_usd:10,opening_ves:0,counted_usd:null,counted_ves:null,verified_methods:[]};
const order={id:'c1111111-1111-4111-a111-111111111111',codigo:'TS100',payment_decision:'approved',payment_decision_at:'2026-10-06T21:30:00Z',metodo_pago:'Pago mixto',total_usd:100};
const lines=[{pedido_id:order.id,method:'Efectivo USD',currency:'USD',amount:40,usd_equivalent:40,confirmed_at:'2026-10-06T21:30:00Z'}, {pedido_id:order.id,method:'Pago Móvil',currency:'VES',amount:3000,usd_equivalent:60,confirmed_at:'2026-10-06T21:30:00Z'}];
const makeFetch=()=>async(raw,options={})=>{
const url=new URL(raw),table=url.pathname.split('/rest/v1/')[1]||'';let value;
if(table==='ts_staff_cash_sessions')value=url.searchParams.get('select')==='closing_snapshot'?[{closing_snapshot:scenario.closedSnapshot||null}]:scenario.sessions;
else if(table==='profiles')value=[{id:owner,full_name:'Vendedor de prueba'}];
else if(table==='pedidos')value=scenario.orders;
else if(table==='ts_order_payments')value=scenario.lines;
else if(table==='ts_staff_cash_movements')value=scenario.movements;
else if(table==='rpc/ts_staff_cash_action'){actions.push(JSON.parse(options.body));value={id,status:'closed'};}
else throw Error('ruta inesperada '+url.pathname);
return{ok:true,status:200,json:async()=>value};
};
function init(){actor={user_id:owner,is_manager:false,role:'vendedor'};scenario={sessions:[session],orders:[order],lines,movements:[]};actions=[];global.fetch=makeFetch()}
async function post(body){return handler({httpMethod:'POST',headers:{authorization:'Bearer testing'},body:JSON.stringify(body)})}
async function get(sessionId){return handler({httpMethod:'GET',headers:{authorization:'Bearer testing'},queryStringParameters:sessionId?{session_id:sessionId}:{}})}
test.beforeEach(init);
test.after(()=>{global.fetch=originalFetch;POS.resolveCashAccess=realAuth;process.env.SUPABASE_URL=originalURL;process.env.SUPABASE_SERVICE_ROLE_KEY=originalKey});
test('GET usa abonos reales sin duplicar venta',async()=>{
const r=await get();assert.equal(r.statusCode,200);const body=JSON.parse(r.body);assert.equal(body.cash.sale_count,1);assert.equal(body.cash.sold_usd,100);assert.equal(body.cash.collected_ves,3000);assert.equal(body.cash.expected_usd,50);assert.equal(body.cash.entries.length,2);
});
test('GET y POST rechazan usuario sin permiso',async()=>{actor=null;assert.equal((await get()).statusCode,403);assert.equal((await post({action:'open',opening_usd:0,opening_ves:0})).statusCode,403)});
test('un vendedor no modifica la caja de otro',async()=>{actor.user_id='d1111111-1111-4111-a111-111111111111';const r=await post({action:'movement',session_id:id,type:'ingreso',direction:'in',method:'Efectivo USD',amount:20,concept:'Fondo adicional'});assert.equal(r.statusCode,403);assert.equal(actions.length,0)});
test('reapertura solamente admin',async()=>{const r=await post({action:'reopen',session_id:id,reason:'Revisión de diferencia'});assert.equal(r.statusCode,403);assert.equal(actions.length,0)});
test('bloquea cierre cuando falta verificación de abono electrónico',async()=>{const r=await post({action:'close',session_id:id,counted_usd:50,counted_ves:0,verified_methods:[]});assert.equal(r.statusCode,409);assert.match(JSON.parse(r.body).error,/Valida los métodos/);assert.equal(actions.length,0)});
test('cierra con medios verificados y snapshot individual',async()=>{const r=await post({action:'close',session_id:id,counted_usd:50,counted_ves:0,verified_methods:['Pago Móvil']});assert.equal(r.statusCode,200);assert.equal(actions.length,1);assert.equal(actions[0].p_action,'close');assert.equal(actions[0].p_data.snapshot.sale_count,1);assert.equal(actions[0].p_data.snapshot.entries.length,2)});
test('retira solamente efectivo disponible',async()=>{const r=await post({action:'movement',session_id:id,type:'gasto',direction:'out',method:'Efectivo USD',amount:51,concept:'Compra de materiales'});assert.equal(r.statusCode,409);assert.match(JSON.parse(r.body).error,/supera el efectivo/);assert.equal(actions.length,0)});

test('cierre con diferencia exige observación antes de escribir',async()=>{const r=await post({action:'close',session_id:id,counted_usd:48,counted_ves:0,verified_methods:['Pago Móvil']});assert.equal(r.statusCode,400);assert.equal(actions.length,0)});
test('administrador autorizado reabre cierre con motivo auditado',async()=>{scenario.sessions=[{...session,status:'closed',closed_at:'2026-10-06T23:00:00Z'}];actor.is_manager=true;const r=await post({action:'reopen',session_id:id,reason:'Rectificar arqueo'});assert.equal(r.statusCode,200);assert.equal(actions[0].p_action,'reopen');assert.equal(actions[0].p_data.reason,'Rectificar arqueo')});
test('caja cerrada conserva el snapshot histórico aunque cambien los pedidos',async()=>{scenario.sessions=[{...session,status:'closed',closed_at:'2026-10-06T23:00:00Z'}];scenario.orders=[];scenario.lines=[];scenario.closedSnapshot={entries:[{kind:'sale',code:'TS100',amount:3000}],by_method:{},sale_count:1,sold_usd:100,expected_usd:50,expected_ves:0,warnings:[]};const r=await get();assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).cash.sold_usd,100)});
