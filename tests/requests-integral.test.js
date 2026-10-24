'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const C=require('../netlify/functions/_whatsapp-core');
const N=require('../netlify/functions/_request-notifications');
const W=require('../netlify/functions/_whatsapp-service-events');
const Intake=require('../netlify/functions/_whatsapp-intake');
const Auth=require('../netlify/functions/staff-auth-core');
const id='95f4f326-797b-4cef-a981-5f6a4612cca8';
test('el menú dirige ventas, citas y visitas sin crear una orden',()=>{
 assert.equal(Intake.choose('1'),'sale');assert.equal(Intake.choose('3'),'appointment');assert.equal(Intake.choose('4'),'think_care');assert.equal(Intake.choose('empresa'),'business');assert.equal(Intake.choose('nueve'),null);
 assert.match(Intake.questions('appointment').location,/confirmar la disponibilidad/);
});
test('una cita no puede notificarse sin fecha confirmada',()=>{
 assert.throws(()=>N.params('confirmed',{id,name:'Andrea',status:'new'}),/confirmada/);
 assert.throws(()=>N.params('completed',{id,name:'Andrea',linked_order_id:'1'},{completed:false,summary:'Prueba'}),/finalizada/);
});
test('el recordatorio usa Caracas y no crea cobros ni órdenes',()=>{
 const values=N.params('reminder',{id,name:'Andrea Pérez',status:'scheduled',scheduled_at:'2030-10-25T14:00:00Z'});
 assert.equal(values[0],'Andrea');assert.equal(values[1],'95F4F326');assert.match(values[3],/10:00/);
});
test('plantilla pendiente no envía ni reserva un pago',async()=>{
 const old={get:C.getContact,approved:N.approved,send:C.sendTemplate,sb:C.sb};let calls=0;
 C.getContact=async()=>({opt_in:true});N.approved=async()=>false;C.sendTemplate=C.sb=async()=>{calls++;throw Error('No debe llamarse')};
 try{const result=await W.dispatch({category:'care_received',id,phone:'584120000000',variables:[],source:'think_care_request',event:'test'});assert.equal(result.reason,'template_not_approved');assert.equal(calls,0)}finally{C.getContact=old.get;N.approved=old.approved;C.sendTemplate=old.send;C.sb=old.sb}
});
test('una caída de Meta no interrumpe el registro de un cobro',async()=>{
 const get=C.getContact,approved=N.approved;C.getContact=async()=>({opt_in:true});N.approved=async()=>{throw Error('unavailable')};
 try{const result=await W.dispatch({category:'payment',id,phone:'584120000000',variables:[],source:'service_payment',event:'real-event'});assert.equal(result.reason,'template_status_unavailable')}finally{C.getContact=get;N.approved=approved}
});
test('BAJA bloquea incluso avisos con consentimiento de servicio',async()=>{
 const get=C.getContact;C.getContact=async()=>({opt_in:true,opt_out_at:new Date().toISOString(),metadata:{service_notifications_opt_in:true}});
 try{const r=await W.dispatch({category:'care_received',id,phone:'584120000000',variables:[],source:'think_care_request',event:'test'});assert.equal(r.reason,'no_whatsapp_consent')}finally{C.getContact=get}
});
test('crear una solicitud y reintentar solo escribe en solicitudes, nunca caja o Soporte',async()=>{
 const oldAuth=Auth.authenticateInternal,oldFetch=global.fetch;Auth.authenticateInternal=async()=>({ok:true,user_id:id,email:'staff@example.test',role:'recepcion'});
 delete require.cache[require.resolve('../netlify/functions/requests-inbox')];const api=require('../netlify/functions/requests-inbox');const writes=[];process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY='test';
 global.fetch=async(url,opts)=>{writes.push({url,opts});return{ok:true,json:async()=>[]}};
 const event={httpMethod:'POST',headers:{},body:JSON.stringify({action:'create',client_id:id,name:'Prueba',phone:'584120000000',device:'MacBook',problem:'Consulta',request_type:'think_care'})};
 try{assert.equal((await api.handler(event)).statusCode,201);assert.equal((await api.handler(event)).statusCode,201);assert.equal(writes.length,2);for(const w of writes){assert.match(w.url,/think_care_requests\?on_conflict=id/);assert.match(w.opts.headers.Prefer,/ignore-duplicates/);assert.equal(JSON.parse(w.opts.body)[0].id,id)}}finally{Auth.authenticateInternal=oldAuth;global.fetch=oldFetch;delete process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY;delete require.cache[require.resolve('../netlify/functions/requests-inbox')]}
});
test('un vendedor no puede convertir una solicitud en orden',async()=>{
 const oldAuth=Auth.authenticateInternal;Auth.authenticateInternal=async()=>({ok:true,user_id:id,email:'seller@example.test',role:'vendedor'});delete require.cache[require.resolve('../netlify/functions/requests-inbox')];const api=require('../netlify/functions/requests-inbox');
 try{assert.equal((await api.handler({httpMethod:'POST',headers:{},body:JSON.stringify({action:'convert',id,revision:0,confirmation:'Confirmado'})})).statusCode,403)}finally{Auth.authenticateInternal=oldAuth;delete require.cache[require.resolve('../netlify/functions/requests-inbox')]}
});
test('conversión reintentada recupera el mismo payload y vincula una sola orden',async()=>{
 const oldAuth=Auth.authenticateInternal,oldFetch=global.fetch;Auth.authenticateInternal=async()=>({ok:true,user_id:id,email:'staff@example.test',role:'admin'});delete require.cache[require.resolve('../netlify/functions/requests-inbox')];const api=require('../netlify/functions/requests-inbox');process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY='test';process.env.SUPPORT_SUPABASE_URL='https://support.example.test';process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='test';let saved=false,count=0;
 global.fetch=async(url,opts)=>{let data;const b=JSON.parse(opts.body);if(url.endsWith('rpc/ts_manage_request')){if(b.p_action==='prepare_conversion')data={id,linked_order_id:saved?'27':null,linked_order_code:'TS-SVC-2030-0027',conversion_payload:{request_id:id,customer_approved_at:'2030-01-01',confirmation:'Cliente autorizado'}};else{saved=true;data={linked_order_id:'27'}}}else if(url.endsWith('rpc/ts_order_from_request')){count++;data={id:27,code:'TS-SVC-2030-0027'};}else throw Error('Escritura inesperada: '+url);return{ok:true,json:async()=>data}};
 const event={httpMethod:'POST',headers:{},body:JSON.stringify({action:'convert',id,revision:0,confirmation:'Cliente presente'})};
 try{const a=JSON.parse((await api.handler(event)).body),b=JSON.parse((await api.handler(event)).body);assert.equal(a.order_id,b.order_id);assert.equal(count,1)}finally{Auth.authenticateInternal=oldAuth;global.fetch=oldFetch;for(const k of ['MAIN_SUPABASE_SERVICE_ROLE_KEY','SUPPORT_SUPABASE_URL','SUPPORT_SUPABASE_SERVICE_ROLE_KEY'])delete process.env[k];delete require.cache[require.resolve('../netlify/functions/requests-inbox')]}
});
