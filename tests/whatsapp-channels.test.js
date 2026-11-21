'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../netlify/functions/_whatsapp-core'),Channels=require('../netlify/functions/_whatsapp-channels');
const Auth=require('../netlify/functions/requests-inbox'),oldAuth=Auth.authenticate;
Auth.authenticate=async event=>event.headers.authorization==='Bearer valid'?{ok:true,user_id:'11111111-1111-4111-8111-111111111111',role:'vendedor'}:{ok:false};
for(const name of ['whatsapp-admin','whatsapp-workspace','whatsapp-media'])delete require.cache[require.resolve('../netlify/functions/'+name)];
const Admin=require('../netlify/functions/whatsapp-admin'),Workspace=require('../netlify/functions/whatsapp-workspace'),Media=require('../netlify/functions/whatsapp-media'),US=require('../netlify/functions/whatsapp-us-webhook');Auth.authenticate=oldAuth;
const post=b=>({httpMethod:'POST',headers:{authorization:'Bearer valid'},body:JSON.stringify(b)});
async function env(fn){const values={WHATSAPP_ACCESS_TOKEN:'ve-test',WHATSAPP_PHONE_NUMBER_ID:'ve-id',WHATSAPP_APP_SECRET:'ve-secret',WHATSAPP_VERIFY_TOKEN:'ve-verify',WHATSAPP_GRAPH_VERSION:'v27.0',WHATSAPP_US_ACCESS_TOKEN:'us-test',WHATSAPP_US_PHONE_NUMBER_ID:'1370682272805383',WHATSAPP_US_APP_SECRET:'us-secret',WHATSAPP_US_VERIFY_TOKEN:'us-verify',WHATSAPP_US_GRAPH_VERSION:'v27.0',WHATSAPP_US_BUSINESS_ACCOUNT_ID:'1604603670987071',WHATSAPP_US_ENABLED:'true',SUPABASE_URL:'https://db.example',SUPABASE_SERVICE_ROLE_KEY:'test-db'};const before=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]])),fetch=global.fetch;Object.assign(process.env,values);try{return await fn();}finally{global.fetch=fetch;for(const k of Object.keys(values))if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}}
const response=x=>({ok:true,status:200,text:async()=>JSON.stringify(x),json:async()=>x});
test('concurrent channels keep independent Meta credentials and database paths',()=>env(async()=>{
 const urls=[];global.fetch=async(url,options)=>{urls.push({url,body:options.body});return response([]);};
 await Promise.all(['meta','meta-us'].map(channel=>C.withChannel(channel,async()=>{await Promise.resolve();assert.equal(C.waCfg().token,channel==='meta'?'ve-test':'us-test');await C.upsertContact('584240000000',{name:channel});await C.sb(C.mainCfg(),'rpc/ts_whatsapp_inbox',{method:'POST',body:'{}'});})));
 assert.equal(urls.filter(x=>x.url.includes('/whatsapp_contacts?')).length,1);assert.equal(urls.filter(x=>x.url.includes('/whatsapp_us_contacts?')).length,1);
 assert.ok(urls.some(x=>x.url.endsWith('/rpc/ts_whatsapp_us_inbox')));assert.equal(C.channel(),'meta');assert.equal(process.env.WHATSAPP_ACCESS_TOKEN,'ve-test');
}));
test('US channel never inherits primary credentials and remains closed until explicitly enabled',()=>env(async()=>{
 for(const key of ['ACCESS_TOKEN','PHONE_NUMBER_ID','APP_SECRET','VERIFY_TOKEN','BUSINESS_ACCOUNT_ID'])delete process.env['WHATSAPP_US_'+key];
 await C.withChannel('meta-us',async()=>{assert.equal(C.waCfg().token,'');assert.equal(C.waCfg().phoneId,'');assert.equal(C.waCfg().appSecret,'');});
 global.fetch=async()=>{throw Error('must not contact a provider');};
 for(const api of [Admin,Workspace,Media]){const r=await api.handler(post({channel:'meta-us',action:'start_chat',phone:'584240000000'}));assert.equal(r.statusCode,409);}
}));
test('channel credentials are used only for the selected sender and templates account',()=>env(async()=>{
 const calls=[];global.fetch=async(url,options)=>{calls.push({url,auth:options.headers.Authorization,body:options.body&&JSON.parse(options.body)});return response({messages:[{id:'accepted'}],data:[]});};
 await C.withChannel('meta-us',async()=>{await C.sendText('584240000000','Hola');await require('../netlify/functions/_whatsapp-templates').list();});
 assert.match(calls[0].url,/1370682272805383\/messages$/);assert.equal(calls[0].auth,'Bearer us-test');assert.match(calls[1].url,/1604603670987071\/message_templates/);
 assert.equal(C.waCfg().token,'ve-test');
}));
test('US credentials configured for another phone cannot enable staff actions',()=>env(async()=>{
 process.env.WHATSAPP_US_PHONE_NUMBER_ID='wrong-phone';global.fetch=async()=>{throw Error('must not send');};const r=await Admin.handler(post({channel:'meta-us',action:'send_reply',phone:'584240000000',message:'Hola'}));assert.equal(r.statusCode,409);
}));
test('authentication and invalid channel guards run before accessing contacts',()=>env(async()=>{
 let calls=0;global.fetch=async()=>{calls++;throw Error('must not query');};
 const unknown=await Workspace.handler(post({channel:'arbitrary'}));assert.equal(unknown.statusCode,400);
 const denied=await Admin.handler({...post({channel:'meta-us',action:'care_contacts'}),headers:{authorization:'Bearer invalid'}});assert.equal(denied.statusCode,401);assert.equal(calls,0);
}));
test('US verification uses its own token and signature and ignores events for another destination',()=>env(async()=>{
 const query={'hub.mode':'subscribe','hub.verify_token':'us-verify','hub.challenge':'challenge'};
 assert.equal((await US.handler({httpMethod:'GET',queryStringParameters:query})).statusCode,200);
 assert.equal((await US.handler({httpMethod:'GET',queryStringParameters:{...query,'hub.verify_token':'ve-verify'}})).statusCode,403);
 const body=JSON.stringify({entry:[{changes:[{value:{metadata:{phone_number_id:'ve-id'},messages:[{id:'m1',from:'584240000000',type:'text',text:{body:'Hola'}}]}}]}]});
 const signature=secret=>'sha256='+crypto.createHmac('sha256',secret).update(body).digest('hex');
 assert.equal((await US.handler({httpMethod:'POST',body,headers:{'x-hub-signature-256':signature('ve-secret')}})).statusCode,401);
 let calls=0;global.fetch=async()=>{calls++;throw Error('must not process another phone');};
 assert.equal((await US.handler({httpMethod:'POST',body,headers:{'x-hub-signature-256':signature('us-secret')}})).statusCode,200);assert.equal(calls,0);
}));
test('US staff reads, internal drafts and outbox are routed to independent storage',()=>env(async()=>{
 const paths=['whatsapp_message_log?phone_e164=eq.584240000000','whatsapp_staff_reads','whatsapp_notification_outbox?event_key=eq.test','rpc/ts_whatsapp_mark_read','rpc/ts_whatsapp_alerts'];
 await C.withChannel('meta-us',async()=>{const calls=[];global.fetch=async url=>{calls.push(url);return response([]);};for(const path of paths)await C.sb(C.mainCfg(),path);assert.ok(calls.every(url=>url.includes('whatsapp_us_')));});
 assert.equal(Channels.databasePath('whatsapp_message_log'),'whatsapp_message_log');
}));
test('a signed inbound US message is recorded only in the US inbox and does not start an unsolicited bot',()=>env(async()=>{
 const calls=[];global.fetch=async(url,opt={})=>{calls.push({url,row:opt.body&&JSON.parse(opt.body)});return response([]);};
 const body=JSON.stringify({entry:[{changes:[{value:{metadata:{phone_number_id:'1370682272805383'},contacts:[{wa_id:'584240000000',profile:{name:'Prueba'}}],messages:[{id:'us-inbound',from:'584240000000',timestamp:String(Math.floor(Date.now()/1000)),type:'text',text:{body:'Hola'}}]}}]}]});
 const signature='sha256='+crypto.createHmac('sha256','us-secret').update(body).digest('hex');
 const r=await US.handler({httpMethod:'POST',body,headers:{'x-hub-signature-256':signature}});assert.equal(r.statusCode,200);
 assert.ok(calls.some(c=>c.url.includes('/whatsapp_us_message_log?')&&c.row?.direction==='inbound'&&c.row.body_preview==='Hola'));
 assert.ok(calls.some(c=>c.url.includes('/whatsapp_us_contacts?')&&c.row?.needs_human===true));
 assert.ok(calls.every(c=>c.url.startsWith('https://db.example/rest/v1/whatsapp_us_')));assert.equal(C.channel(),'meta');
}));
