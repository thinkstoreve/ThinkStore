'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/support-password-recovery');
const origin='https://soporte.thinkstore.com.ve';
const support='https://tnezvnziqnjxhcwjtcuy.supabase.co';
function call(email='operario@ejemplo.com',site=origin){return handler({httpMethod:'POST',headers:{origin:site},body:JSON.stringify({email})})}
async function stubbed(fn){
  const oldEnv={...process.env},fetchOld=global.fetch;
  process.env.SUPPORT_SUPABASE_URL=support;
  process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='test-secret';
  process.env.RESEND_API_KEY='resend-fake';
  delete process.env.SUPPORT_SUPABASE_SECRET_KEY;
  try{await fn()}finally{global.fetch=fetchOld;process.env=oldEnv}
}
const json=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
test('correo de recuperación: personal autorizado, logo oficial y enlace de un uso',async()=>{
  await stubbed(async()=>{
    let sent=null;const queries=[];
    global.fetch=async(u,opts)=>{
      queries.push(u);
      if(u.includes('/rest/v1/service_users'))return json([{nombre:'Ana García',rol:'technician',activo:true}]);
      if(u.includes('/auth/v1/admin/generate_link')){assert.deepEqual(JSON.parse(opts.body),{type:'recovery',email:'operario@ejemplo.com'});return json({hashed_token:'un-hash-privado'})}
      if(u==='https://api.resend.com/emails'){sent=JSON.parse(opts.body);return json({id:'mocked'})}
      throw Error('Unexpected fetch '+u);
    };
    const r=await call();const body=JSON.parse(r.body);
    assert.equal(r.statusCode,200);assert.equal(body.ok,true);
    assert.equal(r.headers['Access-Control-Allow-Origin'],origin);
    assert.match(sent.from,/soporte@thinkstore\.com\.ve/);
    assert.deepEqual(sent.to,['operario@ejemplo.com']);
    assert.match(sent.html,/thinkstore-logo-oficial-email\.jpg/);
    assert.match(sent.html,/Ana/);
    assert.match(sent.html,/token_hash=un-hash-privado/);
    assert.match(sent.html,/support_recovery=1/);
    assert.match(sent.text,/https:\/\/soporte.thinkstore.com.ve\/panel.html#support_recovery=1/);
    assert.equal(queries.length,3);
  });
});
test('no revela cuentas ausentes y no envía mensaje',async()=>{
 await stubbed(async()=>{
  let sent=0;global.fetch=async u=>{if(u.includes('/service_users'))return json([]);sent++;return json({})};
  const r=await call('otro@ejemplo.com');assert.equal(JSON.parse(r.body).ok,true);assert.equal(sent,0);
 });
});
test('no envía a personal desactivado',async()=>{
 await stubbed(async()=>{
  let sent=0;global.fetch=async u=>{if(u.includes('/service_users'))return json([{rol:'reception',activo:false}]);sent++;return json({})};
  const r=await call('desactivado@ejemplo.com');assert.equal(JSON.parse(r.body).ok,true);assert.equal(sent,0);
 });
});
test('rechaza orígenes externos, métodos inesperados y peticiones mal formadas',async()=>{
 await stubbed(async()=>{
  const denied=await call('x@ejemplo.com','https://desconocido.test');assert.equal(denied.statusCode,403);
  const wrongMethod=await handler({httpMethod:'GET',headers:{origin}});assert.equal(wrongMethod.statusCode,405);
  const bad=await call('malcorreo');assert.equal(bad.statusCode,400);
  const preflight=await handler({httpMethod:'OPTIONS',headers:{origin}});assert.equal(preflight.statusCode,204);
 });
});
test('falta de configuración: error explícito sin consultar base de datos',async()=>{
 await stubbed(async()=>{
  delete process.env.RESEND_API_KEY;delete process.env.RESEND_APY_KEY;
  global.fetch=async()=>{throw Error('No debería solicitar red')};
  const r=await call('faltaconf@ejemplo.com');assert.equal(r.statusCode,503);
 });
});
