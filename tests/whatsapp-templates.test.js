'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../netlify/functions/_whatsapp-core'),T=require('../netlify/functions/_whatsapp-templates');
test('promoción requiere consentimiento específico y bloquea duplicados',async()=>{
 const original={fetch:global.fetch,get:C.getContact,sb:C.sb,send:C.sendTemplate,log:C.logMessage};let delivered=0,claimed=false;
 global.fetch=async()=>({ok:true,json:async()=>({data:[{name:'promo',language:'es',category:'MARKETING',status:'APPROVED',components:[{type:'BODY',text:'Hola'}]}]})});
 C.getContact=async()=>({opt_in:true,metadata:{}});C.sendTemplate=async()=>{delivered++;return{messages:[{id:'wamid.test'}]}};C.logMessage=async()=>{};
 C.sb=async(_,__,o)=>{if(o.method==='POST'){if(claimed)throw Error('23505 duplicate key');claimed=true;}return[];};
 const b={phone:'04241706142',client_id:'12345678-1234-4234-8234-123456789abc',template:'promo',language:'es',variables:[]};
 try{
 await assert.rejects(T.send(b,{}),/PROMOCIONES/);assert.equal(delivered,0);
 C.getContact=async()=>({metadata:{marketing_opt_in:true}});
 assert.equal((await T.send(b,{})).status,'sent');assert.equal((await T.send(b,{})).status,'duplicate');assert.equal(delivered,1);
 C.getContact=async()=>({opt_out_at:'2026-10-30',metadata:{marketing_opt_in:true}});await assert.rejects(T.send(b,{}),/PROMOCIONES/);
 }finally{global.fetch=original.fetch;C.getContact=original.get;C.sb=original.sb;C.sendTemplate=original.send;C.logMessage=original.log;}
});
test('plantillas sin variables omiten componentes vacíos en la petición a Meta',async()=>{
 const old=global.fetch,env={...process.env};let payload;
 Object.assign(process.env,{WHATSAPP_ACCESS_TOKEN:'test',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_GRAPH_VERSION:'v24.0'});
 global.fetch=async(_,o)=>{payload=JSON.parse(o.body);return{ok:true,json:async()=>({messages:[{id:'test'}]})}};
 try{await C.sendTemplate('584241706142','promo','es',[]);assert.equal(payload.template.components,undefined);}finally{global.fetch=old;process.env=env;}
});
