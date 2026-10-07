'use strict';
const assert=require('node:assert/strict');
const core=require('./netlify/functions/fx-rate-core');
(async()=>{
 const now=Date.parse('2026-10-06T23:00:00Z');
 const active={USD:872.3927,effective_date:'2026-10-06',updated_at:'2026-10-06T21:45:00Z'};
 assert.equal(core.normalize(active,'BCV',now).rate,872.3927);
 assert.equal(core.normalize(active,'BCV',now).effective_date,'2026-10-06');
 assert.throws(()=>core.normalize({...active,USD:0},'BCV',now));
 assert.throws(()=>core.normalize({...active,USD:null},'BCV',now));
 assert.throws(()=>core.normalize({...active,effective_date:'2026-10-07'},'BCV',now),/no está vigente/);
 assert.throws(()=>core.normalize({...active,updated_at:'2026-09-10T00:00:00Z'},'BCV',now));
 assert.throws(()=>core.normalize({...active,effective_date:'2026-02-30'},'BCV',now));
 const originalFetch=global.fetch;
 global.fetch=async()=>({ok:true,json:async()=>({USD:872.3927,effective_date:core.todayCaracas(),updated_at:new Date().toISOString()})});
 try{
 const result=await core.handler({httpMethod:'GET',queryStringParameters:{refresh:'1'}});
 assert.equal(result.statusCode,200);assert.equal(JSON.parse(result.body).rate,872.3927);
 assert.equal(JSON.parse(result.body).stale,false);
 const denied=await core.handler({httpMethod:'POST'});assert.equal(denied.statusCode,405);
 global.fetch=async()=>{throw Error('offline')};
 const fallback=await core.handler({httpMethod:'GET',queryStringParameters:{refresh:'1'}});
 assert.equal(fallback.statusCode,200);assert.equal(JSON.parse(fallback.body).stale,true);
 console.log('PASS: fuente vigente, cambio de fecha, cotización inválida, caché en fallo y endpoint HTTP.');
 }finally{global.fetch=originalFetch}
})().catch(e=>{console.error(e);process.exit(1)});
