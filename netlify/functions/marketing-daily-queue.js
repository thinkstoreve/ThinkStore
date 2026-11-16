'use strict';
const Q=require('./_campaign-queue');
// Netlify only invokes this handler on its UTC schedule, not as a public URL.
exports.handler=async()=>{try{const result=await Q.run(Q.repository(),payload=>require('./send-campaign').sendFromQueue(payload));console.log('Marketing daily queue',JSON.stringify({status:result.status,calls:result.calls||0,nextAttemptAt:result.queue?.nextAttemptAt}));return{statusCode:200,body:JSON.stringify({ok:true,status:result.status})};}catch(e){console.error('Marketing daily queue:',e.message);return{statusCode:500,body:JSON.stringify({ok:false,error:'La cola conservará el lote para el siguiente intento.'})};}};
exports.config={schedule:'10 * * * *'};
