'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const C=require('../netlify/functions/_whatsapp-core'),N=require('../netlify/functions/_request-notifications'),R=require('../netlify/functions/_whatsapp-reviews'),D=require('../soporte/delivery-model');
async function fixture(run,{outcome='repaired',consent=true,approved=true,state='pending'}={}){
 const save={sb:C.sb,get:C.getContact,wa:C.waCfg,log:C.logMessage,approved:N.approved,fetch:global.fetch,env:process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED};
 let row={order_id:12,outcome,state,created_at:new Date().toISOString(),attempts:0},calls=0;const bodies=[];
 const order={id:12,code:'TS-SVC-TEST',client_name:'Andrea Prueba',client_phone:'04121234567',device_model:'iPhone 14',status:'Entregado',delivery_outcome:outcome};
 C.sb=async(_,path,opt={})=>{
  if(path.startsWith('service_orders?'))return[order];
  if(path==='rpc/ts_claim_review_delivery'){const body=JSON.parse(opt.body);if(row.state!=='pending'&&!(body.p_retry&&row.state==='failed'&&row.attempts<3))return[];row.state='processing';row.attempts++;return[{...row}]}
  if(path.startsWith('service_review_deliveries?')){if(opt.method==='PATCH'){Object.assign(row,JSON.parse(opt.body));return null}return[{...row}]}
  throw Error('unexpected '+path);
 };
 C.getContact=async()=>({opt_in:consent});N.approved=async()=>approved;C.waCfg=()=>({token:'test',version:'v25.0',phoneId:'test'});C.logMessage=async()=>null;
 global.fetch=async(_,opt)=>{calls++;bodies.push(JSON.parse(opt.body));return{ok:true,status:200,json:async()=>({messages:[{id:'wamid.test'}]})}};
 process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED='true';
 try{await run({get row(){return row},order,bodies,get calls(){return calls},clear(){row=null}})}finally{C.sb=save.sb;C.getContact=save.get;C.waCfg=save.wa;C.logMessage=save.log;N.approved=save.approved;global.fetch=save.fetch;if(save.env===undefined)delete process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED;else process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED=save.env;}
}
test('ambas entregas conservan Entregado con un resultado técnico explícito',()=>{assert.deepEqual(D.change(D.repaired),{status:'Entregado',delivery_outcome:'repaired'});assert.deepEqual(D.change(D.notRepaired),{status:'Entregado',delivery_outcome:'not_repaired'});assert.equal(D.label({status:'Entregado',delivery_outcome:'not_repaired'}),D.notRepaired);assert.doesNotMatch(D.description({status:'Entregado'}),/fue reparado/)});
test('una invitación por orden, también con llamadas simultáneas',()=>fixture(async f=>{const results=await Promise.all([R.send(12),R.send(12)]);assert.equal(f.calls,1);assert.equal(f.row.state,'sent');assert.equal(results.filter(x=>x.status==='sent').length>=1,true);await R.send(12,{retry:true});assert.equal(f.calls,1);assert.equal(f.bodies[0].template.name,R.names.repaired)}));
test('sin reparar usa su propia plantilla y también invita a opinar',()=>fixture(async f=>{await R.send(12);assert.equal(f.bodies[0].template.name,R.names.not_repaired)},{outcome:'not_repaired'}));
test('sin consentimiento no contacta al cliente',()=>fixture(async f=>{const r=await R.send(12);assert.equal(r.reason,'no_whatsapp_consent');assert.equal(f.calls,0)},{consent:false}));
test('plantilla pendiente no consume intento y queda en espera',()=>fixture(async f=>{const r=await R.send(12);assert.equal(r.reason,'template_not_approved');assert.equal(f.calls,0);assert.equal(f.row.state,'pending');assert.equal(f.row.attempts,0)},{approved:false}));
test('una entrega histórica nunca se envía ni se reintenta',()=>fixture(async f=>{assert.equal((await R.send(12,{retry:true})).status,'excluded');assert.equal(f.calls,0)},{state:'excluded'}));
test('reabrir o cambiar resultado cancela la invitación pendiente',()=>fixture(async f=>{f.order.status='En reparación';assert.equal((await R.send(12)).reason,'delivery_changed');assert.equal(f.calls,0)}));
test('respuesta de red incierta bloquea reenvíos',()=>fixture(async f=>{global.fetch=async()=>{throw Error('timeout')};assert.equal((await R.send(12)).status,'unknown');await R.send(12,{retry:true});assert.equal(f.row.attempts,1)}));
test('rechazo explícito permite reintento manual limitado, nunca automático',()=>fixture(async f=>{global.fetch=async()=>({ok:false,status:400,json:async()=>({error:{code:132000}})});assert.equal((await R.send(12)).status,'failed');await R.send(12);assert.equal(f.row.attempts,1);await R.send(12,{retry:true});await R.send(12,{retry:true});await R.send(12,{retry:true});assert.equal(f.row.attempts,3)}));
test('la entrega de más de siete días no genera mensajes tardíos',()=>fixture(async f=>{f.row.created_at='2026-01-01T00:00:00Z';assert.equal((await R.send(12)).reason,'delivery_expired');assert.equal(f.calls,0)}));
test('no confirma enviado si se pierde la escritura posterior a Meta',()=>fixture(async f=>{const sb=C.sb;C.sb=async(c,p,o)=>{if(o?.method==='PATCH'&&JSON.parse(o.body).state==='sent')throw Error('DB offline');return sb(c,p,o)};await assert.rejects(()=>R.send(12));assert.equal(f.row.state,'processing');await R.send(12,{retry:true});assert.equal(f.calls,1)}));
