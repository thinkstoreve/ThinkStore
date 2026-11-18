'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../netlify/functions/_whatsapp-core'),T=require('../netlify/functions/_whatsapp-templates'),M=require('../netlify/functions/_whatsapp-marketing');
const id='98765432-1234-4234-8234-123456789abc',phone='584241706142',actor={user_id:id,role:'admin'};
const rich={name:'ts_promo',language:'es',category:'MARKETING',body:'Hola {{1}}',header:{format:'IMAGE',text:''},footer:'ThinkStore',buttons:[{type:'QUICK_REPLY',text:'Quiero información',url:'',phone_number:''},{type:'QUICK_REPLY',text:'BAJA',url:'',phone_number:''}]};
test('Meta recibe imagen, variable y respuestas rápidas con baja inequívoca',async()=>{
 const old=global.fetch,env={...process.env};let payload;
 Object.assign(process.env,{WHATSAPP_ACCESS_TOKEN:'test',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_GRAPH_VERSION:'v24.0'});
 global.fetch=async(_,o)=>{payload=JSON.parse(o.body);return{ok:true,json:async()=>({messages:[{id:'wamid.test'}]})}};
 try{await C.sendTemplate(phone,rich.name,'es',['Ana'],T.mediaComponents(rich,'https://thinkstore.com.ve/promo.jpg'));const parts=payload.template.components;assert.equal(parts[0].parameters[0].image.link,'https://thinkstore.com.ve/promo.jpg');assert.equal(parts[2].parameters[0].payload,'TS_MARKETING_STOP');assert.equal(parts[3].parameters[0].text,'Ana');assert.throws(()=>T.mediaComponents(rich,''),/imagen/);for(const image of ['http://example.com/a.jpg','https://localhost/x','https://127.0.0.1/x','https://user:pass@example.com/x','javascript:alert(1)'])assert.throws(()=>T.publicImage(image));}finally{global.fetch=old;process.env=env;}
});
test('catálogo permite imagen y botones fijos pero excluye formatos no soportados',async()=>{
 const old=global.fetch;const base={status:'APPROVED',name:'promo',language:'es',category:'MARKETING',components:[{type:'BODY',text:'Hola'},{type:'HEADER',format:'IMAGE'},{type:'BUTTONS',buttons:[{type:'URL',text:'Ver',url:'https://thinkstore.com.ve'}]}]};
 global.fetch=async()=>({ok:true,json:async()=>({data:[base,{...base,name:'dynamic',components:[...base.components.slice(0,2),{type:'BUTTONS',buttons:[{type:'URL',text:'Ver',url:'https://thinkstore.com.ve/{{1}}'}]}]},{...base,name:'video',components:[{type:'BODY',text:'Hola'},{type:'HEADER',format:'VIDEO'}]}]})});
 try{const rows=await T.list();assert.equal(rows.length,1);assert.equal(rows[0].header.format,'IMAGE');assert.equal(rows[0].buttons[0].url,'https://thinkstore.com.ve');}finally{global.fetch=old;}
});
test('solicitud a revisión necesita muestra y valida enlaces y etiquetas',()=>{
 const b={name:'ts_promo',category:'MARKETING',body:'Oferta ThinkStore',examples:[],header:{format:'IMAGE',handle:'4::example'},footer:'ThinkStore',buttons:[{type:'QUICK_REPLY',text:'Quiero información'},{type:'QUICK_REPLY',text:'BAJA'}]};
 assert.equal(T.templatePayload(b).components[0].example.header_handle[0],'4::example');assert.equal(T.templatePayload(b).components[3].buttons[1].text,'BAJA');assert.throws(()=>T.templatePayload({...b,header:{format:'IMAGE'}}),/imagen/);assert.throws(()=>T.templatePayload({...b,buttons:[{type:'URL',text:'Ver',url:'javascript:alert(1)'}]}),/HTTPS/);assert.throws(()=>T.templatePayload({...b,buttons:[{type:'QUICK_REPLY',text:'a'.repeat(26)}]}),/25/);
});
test('campaña congela imagen y botones; JSONB reordenado no cambia su firma',async()=>{
 const old={sb:C.sb,list:T.list,get:C.getContact,send:T.send};let saved,sent;
 T.list=async()=>[rich];C.getContact=async()=>({metadata:{marketing_opt_in:true}});
 C.sb=async(_,path,opt)=>{if(path.startsWith('whatsapp_marketing_campaigns?'))return saved?[saved]:[];if(path.startsWith('whatsapp_contacts?'))return[{phone_e164:phone,name:'Ana',metadata:{marketing_opt_in:true}}];if(path==='whatsapp_marketing_campaigns'){saved=JSON.parse(opt.body);return[saved];}throw Error(path);};T.send=async b=>{sent=b;return{status:'sent'}};
 try{await assert.rejects(M.create({id,name:'Promo',template:rich.name,language:'es',variables:['Ana'],phones:[phone]},actor),/imagen/);await M.create({id,name:'Promo',template:rich.name,language:'es',variables:['Ana'],image:'https://thinkstore.com.ve/one.jpg',phones:[phone]},actor);assert.equal(saved.variables.image,'https://thinkstore.com.ve/one.jpg');const reorder=v=>Array.isArray(v)?v.map(reorder):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).reverse().map(k=>[k,reorder(v[k])])):v;assert.equal(T.fingerprint(rich),T.fingerprint(reorder(rich)));await M.send({id,phone,image:'https://thinkstore.com.ve/two.jpg'},actor);assert.equal(sent.image,'https://thinkstore.com.ve/one.jpg');assert.deepEqual(sent.variables,['Ana']);sent=null;T.list=async()=>[{...rich,buttons:[{type:'QUICK_REPLY',text:'Otro'}]}];await assert.rejects(M.send({id,phone},actor),/cambió/);assert.equal(sent,null);}finally{C.sb=old.sb;T.list=old.list;C.getContact=old.get;T.send=old.send;}
});
test('progreso distingue entregado y leído sin volver a marcarlo pendiente',async()=>{
 const old=C.sb;C.sb=async(_,path)=>{if(path.startsWith('whatsapp_marketing_campaigns?'))return[{id,recipients:[{phone,name:'Ana'}]}];if(path.startsWith('whatsapp_notification_outbox?'))return[{phone_e164:phone,status:'sent',provider_message_id:'wamid.test='}];if(path.startsWith('whatsapp_message_log?'))return[{wa_message_id:'wamid.test=',status:'read'}];if(path.startsWith('whatsapp_contacts?'))return[];throw Error(path);};try{const d=await M.progress(id);assert.equal(d.recipients[0].status,'read');}finally{C.sb=old;}
});
test('carga de muestra valida bytes antes de conectar y usa el manejador de Meta',async()=>{
 const old=global.fetch;let calls=0;global.fetch=async(url,o)=>{calls++;if(calls===1){assert.match(url,/\/app\/uploads\?/);assert.equal(o.method,'POST');return{ok:true,json:async()=>({id:'upload:session?sig=example'})};}assert.equal(o.headers.file_offset,'0');assert.ok(Buffer.isBuffer(o.body));return{ok:true,json:async()=>({h:'4::sample'})};};
 try{await assert.rejects(T.uploadSample({data:'data:image/png;base64,'+Buffer.from('fake').toString('base64')}),/contenido/);assert.equal(calls,0);const bytes=Buffer.from([137,80,78,71,13,10,26,10]);assert.equal((await T.uploadSample({data:'data:image/png;base64,'+bytes.toString('base64')})).handle,'4::sample');assert.equal(calls,2);await assert.rejects(M.handle({action:'marketing_sample_upload'},{...actor,role:'vendedor'}),/administración/);}finally{global.fetch=old;}
});
test('botón de baja revoca autorización y desactiva el asistente',async()=>{
 const W=require('../netlify/functions/whatsapp-webhook'),old={verify:C.verifySignature,seen:C.seenMessage,log:C.logMessage,get:C.getContact,upsert:C.upsertContact,send:C.sendText};let patch,confirmations=0;
 C.verifySignature=()=>true;C.seenMessage=async()=>false;C.logMessage=async()=>{};C.getContact=async()=>({metadata:{marketing_opt_in:true,service_notifications_opt_in:true}});C.upsertContact=async(_,v)=>{patch=v};C.sendText=async()=>{confirmations++;return{messages:[{id:'wamid.confirm'}]}};
 try{const r=await W.handler({httpMethod:'POST',headers:{},body:JSON.stringify({entry:[{changes:[{value:{messages:[{id:'wamid.baja',from:phone,type:'button',button:{text:'Dejar de recibir',payload:'TS_MARKETING_STOP'}}]}}]}]})});assert.equal(r.statusCode,200);assert.equal(patch.metadata.marketing_opt_in,false);assert.equal(patch.metadata.care_assistant.active,false);assert.ok(patch.opt_out_at);assert.equal(confirmations,1);}finally{C.verifySignature=old.verify;C.seenMessage=old.seen;C.logMessage=old.log;C.getContact=old.get;C.upsertContact=old.upsert;C.sendText=old.send;}
});
