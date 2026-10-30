'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../netlify/functions/_whatsapp-core'),T=require('../netlify/functions/_whatsapp-templates'),M=require('../netlify/functions/_whatsapp-marketing');
const actor={user_id:'12345678-1234-4234-8234-123456789abc',role:'admin'},id='98765432-1234-4234-8234-123456789abc';
test('marketing exige sesión y rol autorizado',async()=>{for(const a of [null,{role:'admin'},{role:'tecnico',user_id:actor.user_id}])await assert.rejects(M.handle({action:'marketing_history'},a),/administrador o vendedor/);});
test('consentimiento de servicio no se convierte en autorización de marketing y BAJA bloquea',()=>{assert.equal(M.authorized({opt_in:true}),false);assert.equal(M.authorized({metadata:{marketing_opt_in:true}}),true);assert.equal(M.authorized({opt_out_at:'2026-10-30',metadata:{marketing_opt_in:true}}),false);assert.equal(M.sendId(id,'584241706142'),M.sendId(id,'584241706142'));assert.notEqual(M.sendId(id,'584241706142'),M.sendId(id,'584121234567'));});
test('evidencia se audita antes de conceder permiso, sin reactivar avisos de servicio',async()=>{
 const originals={sb:C.sb,get:C.getContact,upsert:C.upsertContact};let audit=false,writes=0;
 C.getContact=async()=>({opt_in:false,opt_out_at:'2026-10-20',metadata:{service_notifications_opt_in:true}});
 C.sb=async(_,path,opt)=>{assert.equal(path,'whatsapp_marketing_consents');const b=JSON.parse(opt.body);assert.equal(b.recorded_by,actor.user_id);audit=true;return[]};
 C.upsertContact=async(_,p)=>{assert.equal(audit,true);assert.equal(p.metadata.marketing_opt_in,true);assert.equal(p.metadata.service_notifications_opt_in,false);writes++};
 const b={phone:'04241706142',granted:true,source:'in_person',obtained_at:'2026-01-01T12:00:00Z',evidence:'El cliente aceptó recibir promociones en atención presencial.'};
 try{await M.consent(b,actor);assert.equal(writes,1);C.sb=async()=>{throw Error('audit_failed')};await assert.rejects(M.consent(b,actor),/audit_failed/);assert.equal(writes,1);await assert.rejects(M.consent({...b,evidence:''},actor),/evidencia/);}finally{C.sb=originals.sb;C.getContact=originals.get;C.upsertContact=originals.upsert;}
});
test('campaña elimina teléfonos repetidos y rechaza contactos no autorizados',async()=>{
 const oldSb=C.sb,oldList=T.list;let saved;
 const contact={phone_e164:'584241706142',name:'Cliente',metadata:{marketing_opt_in:true}};
 T.list=async()=>[{name:'promo',language:'es',category:'MARKETING',body:'Revisión gratis'}];
 C.sb=async(_,path,opt)=>{if(path.startsWith('whatsapp_marketing_campaigns?'))return[];if(path.startsWith('whatsapp_contacts?'))return[contact];if(path==='whatsapp_marketing_campaigns'){saved=JSON.parse(opt.body);return[saved]}throw Error(path)};
 const b={id,name:'Campaña',template:'promo',language:'es',variables:[],phones:['04241706142','584241706142']};
 try{await M.create(b,actor);assert.equal(saved.recipients.length,1);assert.deepEqual(saved.variables,[]);contact.metadata.marketing_opt_in=false;await assert.rejects(M.create(b,actor),/autorización/);await assert.rejects(M.create({...b,phones:Array(251).fill('04241706142')},actor),/250/);}finally{C.sb=oldSb;T.list=oldList;}
});
test('envío usa audiencia guardada, vuelve a comprobar BAJA y detecta cambios de plantilla',async()=>{
 const original={sb:C.sb,get:C.getContact,list:T.list,send:T.send};let calls=0;
 const row={id,name:'Campaña',template_name:'promo',language:'es',body:'Revisión gratis',variables:[],recipients:[{phone:'584241706142',name:'Cliente'}]};
 C.sb=async()=>[row];T.list=async()=>[{name:'promo',language:'es',category:'MARKETING',body:'Revisión gratis'}];C.getContact=async()=>({opt_out_at:'2026-10-30',metadata:{marketing_opt_in:true}});T.send=async(b,a,context)=>{calls++;assert.equal(context.campaignId,id);assert.equal(b.client_id,M.sendId(id,b.phone));return{status:'sent'}};
 try{assert.equal((await M.send({id,phone:'04241706142'},actor)).result.status,'skipped');assert.equal(calls,0);await assert.rejects(M.send({id,phone:'04121234567'},actor),/no pertenece/);C.getContact=async()=>({metadata:{marketing_opt_in:true}});await M.send({id,phone:'04241706142'},actor);assert.equal(calls,1);T.list=async()=>[{name:'promo',language:'es',category:'MARKETING',body:'Otro mensaje'}];await assert.rejects(M.send({id,phone:'04241706142'},actor),/cambió/);assert.equal(calls,1);}finally{C.sb=original.sb;C.getContact=original.get;T.list=original.list;T.send=original.send;}
});
