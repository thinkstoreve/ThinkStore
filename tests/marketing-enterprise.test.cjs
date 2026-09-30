const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const template = require('../enterprise-template');
const unsub = require('../netlify/functions/lib/enterprise-unsubscribe');
const handler = require('../netlify/functions/send-campaign').handler;
const unsubscribeHandler = require('../netlify/functions/enterprise-unsubscribe').handler;
const env = {THINKSTORE_ADMIN_SECRET:'test-admin',RESEND_API_KEY:'test-key',SUPABASE_URL:'https://supabase.test',SUPABASE_SERVICE_ROLE_KEY:'test-service',FROM_MARKETING_EMAIL:'Legacy <old@example.test>',REPLY_TO_MARKETING:'legacy@example.test'};
Object.assign(process.env, env);
const event = payload => ({httpMethod:'POST',headers:{'x-admin-secret':'test-admin'},body:JSON.stringify(payload)});
function mock({blocked=[],missing=false,resendFail=false}={}){
  const sent=[],history=[],writes=[],requests=[];
  global.fetch=async(url,init={})=>{
    requests.push(url);
    let data=[],ok=true;
    if(url==='https://api.resend.com/emails'){sent.push(JSON.parse(init.body));data=resendFail?{message:'Test failure'}:{id:'test-send'};ok=!resendFail;}
    else if(url.includes('marketing_enterprise_unsubscribes')){
      if(init.method==='POST')writes.push(JSON.parse(init.body));
      if(missing){ok=false;data={message:'missing table'};}else data=blocked.map(email=>({email}));
    }
    else if(url.includes('marketing_campaigns'))history.push(JSON.parse(init.body));
    else if(url.includes('/clientes?'))data=[{id:'1',email:'alice@example.test',nombre_contacto:'Ana <QA>',nombre_empresa:'Empresa & Hijos'},{id:'2',email:'blocked@example.test',nombre:'Blocked'}];
    else if(url.includes('/profiles?'))data=[{id:'1',email:'alice@example.test',nombre:'Ana'}];
    else if(url.includes('/auth/v1/admin/users'))data={users:[{id:'1',email:'alice@example.test'}]};
    return {ok,status:ok?200:503,json:async()=>data};
  };
  return {sent,history,writes,requests};
}
test('template source and generated browser/server HTML stay synchronized',()=>{
  assert.equal(require('../enterprise-template-data'),fs.readFileSync(path.join(__dirname,'../thinkstore_publicidad_empresas_email.html'),'utf8'));
});
test('HTML preserves official logo, escapes contact and company, resolves placeholders',()=>{
  const html=template.render({nombre_contacto:'<img onerror="x">',nombre_empresa:'A & B',unsubscribe_url:'https://example.test/?a=1&b=2'});
  assert.ok(html.includes(template.logo));assert.ok(html.includes('&lt;img onerror=&quot;x&quot;&gt;'));assert.ok(html.includes('A &amp; B'));
  assert.ok(!html.includes('{{'));assert.ok(!html.includes('ventas@thinkstore.com.ve'));
  assert.ok(html.includes('mailto:info@thinkstore.com.ve'));assert.throws(()=>template.render({unsubscribe_url:'javascript:alert(1)'}));
});
test('business send pins sender and reply-to, personalizes and saves template identity',async()=>{
  const m=mock({blocked:['blocked@example.test']});
  const res=await handler(event({templateId:template.id,audience:'registered'}));
  assert.equal(res.statusCode,200);assert.equal(m.sent.length,1);
  const mail=m.sent[0];assert.equal(mail.from,'ThinkStore <ventas@thinkstore.com.ve>');assert.equal(mail.reply_to,'info@thinkstore.com.ve');assert.equal(mail.subject,template.subject);
  assert.ok(mail.html.includes('Ana &lt;QA&gt;'));assert.ok(mail.html.includes('Empresa &amp; Hijos'));assert.ok(!mail.html.includes('{{'));
  assert.ok(mail.html.includes('enterprise-unsubscribe?email=alice'));assert.equal(m.history[0][0].content_json.templateId,template.id);
});
test('manual audience deduplicates and accepts fallback names and custom preheader',async()=>{
  const m=mock();await handler(event({templateId:template.id,audience:'manual',manualEmails:['manual@example.test','MANUAL@example.test'],nombre_contacto:'María',nombre_empresa:'Acme',preheader:'Mensaje de prueba'}));
  assert.equal(m.sent.length,1);assert.ok(m.sent[0].html.includes('María'));assert.ok(m.sent[0].html.includes('Acme'));assert.ok(m.sent[0].html.includes('Mensaje de prueba'));
});
test('test email uses same renderer and never includes selected audience',async()=>{
  const m=mock();await handler(event({templateId:template.id,testEmail:'preview@example.test',audience:'registered'}));
  assert.equal(m.sent.length,1);assert.equal(m.sent[0].to,'preview@example.test');assert.ok(m.sent[0].html.includes(template.logo));
});
test('cannot send business emails when suppression storage is unavailable',async()=>{
  const m=mock({missing:true});const res=await handler(event({templateId:template.id,testEmail:'preview@example.test'}));
  assert.equal(res.statusCode,503);assert.equal(m.sent.length,0);
});
test('fully suppressed manual audience sends nothing',async()=>{
  const m=mock({blocked:['blocked@example.test']});const res=await handler(event({templateId:template.id,audience:'manual',manualEmails:['blocked@example.test']}));
  assert.equal(res.statusCode,400);assert.equal(m.sent.length,0);
});
test('legacy template preserves configured sender and bypasses business storage',async()=>{
  const m=mock({missing:true});const res=await handler(event({testEmail:'legacy@example.test',subject:'Legacy subject'}));
  assert.equal(res.statusCode,200);assert.equal(m.sent[0].from,env.FROM_MARKETING_EMAIL);assert.equal(m.sent[0].reply_to,env.REPLY_TO_MARKETING);
  assert.ok(!m.requests.some(url=>url.includes('marketing_enterprise_unsubscribes')));
});
test('unauthorized request cannot send a campaign',async()=>{
  const m=mock();const res=await handler({...event({templateId:template.id}),headers:{}});assert.equal(res.statusCode,401);assert.equal(m.sent.length,0);
});
test('Resend errors remain visible to the caller',async()=>{
  mock({resendFail:true});const res=await handler(event({templateId:template.id,testEmail:'preview@example.test'}));assert.equal(res.statusCode,502);assert.equal(JSON.parse(res.body).failed,1);
});
test('signed unsubscribe GET confirms, POST persists, tampering fails',async()=>{
  const m=mock();const query={email:'alice@example.test',token:unsub.sign('alice@example.test')};
  let res=await unsubscribeHandler({httpMethod:'GET',queryStringParameters:query});assert.equal(res.statusCode,200);assert.ok(res.body.includes('<form'));assert.equal(m.writes.length,0);
  res=await unsubscribeHandler({httpMethod:'POST',queryStringParameters:query});assert.equal(res.statusCode,200);assert.equal(m.writes[0].email,'alice@example.test');
  res=await unsubscribeHandler({httpMethod:'POST',queryStringParameters:{...query,email:'other@example.test'}});assert.equal(res.statusCode,400);assert.equal(m.writes.length,1);
});
test('unsubscribe storage failure does not claim success',async()=>{
  mock({missing:true});const res=await unsubscribeHandler({httpMethod:'POST',queryStringParameters:{email:'alice@example.test',token:unsub.sign('alice@example.test')}});assert.equal(res.statusCode,503);
});
