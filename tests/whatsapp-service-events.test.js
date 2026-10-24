'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../netlify/functions/_whatsapp-core');
const W=require('../netlify/functions/_whatsapp-service-events');
const N=require('../netlify/functions/_request-notifications');
const relay=require('../netlify/functions/whatsapp-service-relay');
const defs=JSON.parse(fs.readFileSync(path.join(__dirname,'../WHATSAPP-META-PLANTILLAS-V15.38.json'),'utf8'));
const order={id:25,code:'TS-SVC-2026-0012',client_name:'Andrea Prueba',client_phone:'04121234567',device_model:'iPhone 14',status:'Recibido'};
test('ocho plantillas Meta: nombres únicos, categoría utilidad y variables alineadas',()=>{
  assert.equal(defs.length,8);
  assert.equal(new Set(defs.map(t=>t.name)).size,8);
  defs.forEach(t=>{
    assert.equal(t.category,'UTILITY');assert.equal(t.language,'es');
    const b=t.components[0],count=(b.text.match(/\{\{[0-9]+\}\}/g)||[]).length;
    assert.equal(count,b.example.body_text[0].length,t.name);
    assert.match(t.name,/^[a-z0-9_]+$/);
  });
});
test('avisos de reparación no llaman WhatsApp mientras estén desactivados',async()=>{
  process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED='false';
  const result=await W.serviceUpdate(order);assert.equal(result.status,'disabled');
});
test('no hay envío sin consentimiento registrado',async()=>{
  process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED='true';
  const oldGet=C.getContact,oldSend=C.sendTemplate;let calls=0;
  C.getContact=async()=>({opt_in:false});C.sendTemplate=async()=>{calls++;throw Error('bad')};
  try{const r=await W.serviceUpdate(order);assert.equal(r.reason,'no_whatsapp_consent');assert.equal(calls,0)}
  finally{C.getContact=oldGet;C.sendTemplate=oldSend;delete process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED}
});
test('se acepta una sola notificación por evento, con datos canonizados',async()=>{
  const oldGet=C.getContact,oldSend=C.sendTemplate,oldSb=C.sb,oldLog=C.logMessage;
  const oldApproved=N.approved;N.approved=async()=>true;
  let count=0,sent=0;
  C.getContact=async()=>({opt_in:true,opt_out_at:null});
  C.sb=async(_cfg,endpoint,opts)=>{
    if(opts.method==='POST'){
      if(count++)throw Error('duplicate key value violates unique constraint (23505)');
      return [];
    }
    return[];
  };
  C.sendTemplate=async (_phone,template,lang,params)=>{sent++;assert.equal(template,'ts_equipo_recibido_v2');assert.equal(lang,'es');assert.deepEqual(params,['Andrea','iPhone 14','TS-SVC-2026-0012']);return {messages:[{id:'wamid.test'}]}};
  C.logMessage=async()=>[];
  process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED='true';
  try{
    const a=await W.serviceUpdate(order),b=await W.serviceUpdate(order);
    assert.equal(a.status,'sent');assert.equal(b.status,'duplicate');assert.equal(sent,1);
  }finally{N.approved=oldApproved;C.getContact=oldGet;C.sendTemplate=oldSend;C.sb=oldSb;C.logMessage=oldLog;delete process.env.WHATSAPP_SERVICE_NOTIFICATIONS_ENABLED}
});
test('abono requiere ID de un evento real antes de notificar',async()=>{
  process.env.WHATSAPP_PAYMENT_NOTIFICATIONS_ENABLED='true';
  try{const r=await W.payment(order,{delta_usd:30,balance_after:90});assert.equal(r.reason,'missing_unique_receipt_id')}
  finally{delete process.env.WHATSAPP_PAYMENT_NOTIFICATIONS_ENABLED}
});
test('endpoint interno rechaza un relay sin clave',async()=>{
  process.env.WHATSAPP_EVENTS_SECRET='some-long-secret';
  try{
    const r=await relay.handler({httpMethod:'POST',headers:{authorization:'Bearer incorrect'},body:'{"action":"service_update","id":"25"}'});
    assert.equal(r.statusCode,403);
  }finally{delete process.env.WHATSAPP_EVENTS_SECRET}
});
