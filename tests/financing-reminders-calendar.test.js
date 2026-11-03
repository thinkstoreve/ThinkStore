const {test}=require('node:test');const a=require('node:assert/strict');
const R=require('../netlify/functions/whatsapp-debt-reminders');const C=require('../netlify/functions/_whatsapp-core');
test('dos días y mismo día según Caracas, incluso cerca de medianoche UTC',()=>{
 a.equal(R.stageFor('2026-11-04',new Date('2026-11-02T13:00:00Z')),'before_2_days');
 a.equal(R.stageFor('2026-11-02',new Date('2026-11-03T03:59:59Z')),'due_today');
 a.equal(R.stageFor('2026-11-02',new Date('2026-11-03T04:00:00Z')),null);
 a.equal(R.stageFor('2026-11-03',new Date('2026-11-02T13:00:00Z')),null);
 a.equal(R.stageFor('2026-02-30'),null);
});
test('claim duplicado no envía; email y WhatsApp usan claves distintas',async()=>{
 const old=C.sb,keys=new Set();let sends=0;C.sb=async(_,p,o)=>{if(p==='whatsapp_notification_outbox'){const k=JSON.parse(o.body).event_key;if(keys.has(k))throw Error('23505 duplicate key');keys.add(k);}};
 try{const c={entity_type:'service_order',entity_id:'1',due_date:'2026-11-02',phone:'584121234567',email:'test@example.com'};
 const send=async()=>{sends++;return 'provider-id'};
 a.equal(await R.once(c,'due_today','email',send),'sent');a.equal(await R.once(c,'due_today','email',send),'duplicate');
 a.equal(await R.once(c,'due_today','whatsapp',send),'sent');a.equal(sends,2);
 }finally{C.sb=old;}
});
test('omite pagados y cancelados, conserva saldo parcial real',async()=>{
 const old=C.sb;C.sb=async()=>{const o={id:1,client_email:'test@example.com',quote_amount:120,amount_paid:60,reception_checklist:{__financing:{enabled:true,due_date:'2026-11-02'}}};return[o,{...o,id:2,amount_paid:120},{...o,id:3,status:'Cancelado'},{...o,id:4,payment_status:'paid'},{...o,id:5,reception_checklist:{}}];};
 try{const rows=await R.candidates();a.equal(rows.length,1);a.equal(rows[0].balance,60);}finally{C.sb=old;}
});
test('HTTP no permite disparar avisos públicos',async()=>{a.equal((await R.handler({httpMethod:'GET'})).statusCode,405);});
test('POST interno de Netlify procesa candidatos en vez de salir con 405',async()=>{const old=C.sb,flag=process.env.WHATSAPP_DEBT_AUTOMATION_ENABLED;let reads=0;process.env.WHATSAPP_DEBT_AUTOMATION_ENABLED='true';C.sb=async()=>{reads++;return [];};try{const r=await R.handler({httpMethod:'POST',body:JSON.stringify({next_run:'2026-11-04T13:00:00Z'})});a.equal(r.statusCode,200);a.equal(reads,1);a.equal(JSON.parse(r.body).enabled,true);}finally{C.sb=old;if(flag===undefined)delete process.env.WHATSAPP_DEBT_AUTOMATION_ENABLED;else process.env.WHATSAPP_DEBT_AUTOMATION_ENABLED=flag;}});
