
const assert=require('node:assert/strict');
const core=require('./netlify/functions/fx-rate-core');
(async()=>{
 const now=new Date().toISOString();
 const q=core.normalize({promedio:100,fechaActualizacion:now},'BCV');
 assert.equal(q.rate,100);
 assert.throws(()=>core.normalize({promedio:0,fechaActualizacion:now},'BCV'));
 assert.throws(()=>core.normalize({promedio:NaN,fechaActualizacion:now},'BCV'));
 const original=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>({fuente:'BCV',promedio:100,fechaActualizacion:now})});
 const result=await core.handler({httpMethod:'GET',queryStringParameters:{refresh:'1'}});
 assert.equal(result.statusCode,200);
 assert.equal(JSON.parse(result.body).rate,100);
 const denied=await core.handler({httpMethod:'POST'});
 assert.equal(denied.statusCode,405);
 global.fetch=original;
 console.log('OK: tasa válida, rechazo de tasa inválida, endpoint y método HTTP.');
})().catch(e=>{console.error(e);process.exit(1)});
