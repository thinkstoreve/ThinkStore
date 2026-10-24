'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../netlify/functions/_whatsapp-core');
const W=require('../netlify/functions/whatsapp-webhook');
function harness(t,contact={}){
 const keys=['verifySignature','seenMessage','logMessage','getContact','upsertContact','sendText','sb'];
 const old=Object.fromEntries(keys.map(k=>[k,C[k]]));t.after(()=>Object.assign(C,old));
 let state=structuredClone(contact),seq=0;const writes=[],sent=[],logs=[];
 C.verifySignature=()=>true;C.seenMessage=async()=>false;C.logMessage=async x=>logs.push(x);
 C.getContact=async()=>state;C.upsertContact=async(_p,x)=>{state={...state,...x};return state};
 C.sendText=async(_p,text)=>{sent.push(text);return{messages:[{id:'out-'+(++seq)}]}};
 C.sb=async(_c,path,opts)=>{writes.push({path,data:JSON.parse(opts.body)});return[]};
 const post=async value=>W.handler({httpMethod:'POST',headers:{},body:JSON.stringify({entry:[{changes:[{value}]}]})});
 const message=async text=>post({messages:[{id:'in-'+(++seq),from:'584240000000',type:'text',text:{body:text}}]});
 return{writes,sent,logs,message,post,state:()=>state};
}
test('un contacto nuevo queda con atención humana y no recibe un bot automáticamente',async t=>{
 const h=harness(t);assert.equal((await h.message('Hola')).statusCode,200);
 assert.equal(h.sent.length,0);assert.equal(h.writes.length,0);assert.equal(h.state().needs_human,true);
});
for(const type of ['sale','support','appointment','think_care','technical_visit','business','general'])test('el bot asignado registra '+type+' sin orden ni cobro',async t=>{
 const h=harness(t,{needs_human:false,metadata:{care_assistant:{active:true,step:'name',request_type:type,request_id:'f5555555-5555-4555-8555-555555555555',service:'Essential',expires_at:new Date(Date.now()+3600000).toISOString(),data:{}}}});
 for(const text of ['Cliente de prueba','MacBook','Chacao; horario a confirmar','No enciende','sí'])assert.equal(JSON.parse((await h.message(text)).body).ok,true);
 assert.equal(h.writes.length,1);assert.equal(h.writes[0].path,'think_care_requests?on_conflict=id');
 assert.equal(h.writes[0].data.request_type,type);assert.equal(h.writes[0].data.status,'new');
 assert.equal(h.state().metadata.service_notifications_opt_in,true);assert.equal(h.state().needs_human,true);
 assert.match(h.sent.at(-1),/no confirma una cita ni crea una orden o un cobro/);
});
test('una respuesta desde WhatsApp Business se registra como salida y detiene el bot',async t=>{
 const h=harness(t,{last_inbound_at:'2026-10-01T00:00:00Z',metadata:{care_assistant:{active:true}}});
 await h.post({message_echoes:[{id:'echo-1',to:'584240000000',type:'text',text:{body:'Te atiende el asesor'}}]});
 assert.equal(h.logs[0].direction,'outbound');assert.equal(h.logs[0].source,'whatsapp_business_app');
 assert.equal(h.state().metadata.care_assistant.active,false);assert.equal(h.state().needs_human,true);
 assert.equal(h.state().last_inbound_at,'2026-10-01T00:00:00Z');assert.equal(h.sent.length,0);
});
