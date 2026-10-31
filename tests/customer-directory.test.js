'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
test('admin directory preserves registered records and paginates imported contacts',async()=>{
 const old={fetch:global.fetch,key:process.env.SUPABASE_SERVICE_ROLE_KEY,secret:process.env.THINKSTORE_ADMIN_SECRET};
 process.env.SUPABASE_SERVICE_ROLE_KEY='test-key';process.env.THINKSTORE_ADMIN_SECRET='test-secret';
 const calls=[];global.fetch=async url=>{calls.push(url);let rows=[];
  if(url.includes('/clientes?'))rows=[{id:'registered',nombre:'Registered',metodo_envio_preferido:'MRW'}];
  if(url.includes('ts_customer_directory?'))rows=url.includes('offset=0')?Array.from({length:1000},(_,i)=>({id:'i'+i,source:'iCenter / FileMaker'})):[{id:'last',source:'iCenter / FileMaker'}];
  return {ok:true,json:async()=>rows};};
 try{const r=await require('../netlify/functions/admin-data').handler({httpMethod:'GET',headers:{'x-admin-secret':'test-secret'}});const d=JSON.parse(r.body);assert.equal(r.statusCode,200);assert.equal(d.clientes.length,1002);assert.equal(d.clientes[0].metodo_envio_preferido,'MRW');assert(calls.some(x=>x.includes('offset=1000')));}finally{global.fetch=old.fetch;for(const [k,v] of [['SUPABASE_SERVICE_ROLE_KEY',old.key],['THINKSTORE_ADMIN_SECRET',old.secret]])if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
test('directory does not expose customer data without authentication',async()=>{
 const r=await require('../netlify/functions/admin-data').handler({httpMethod:'GET',headers:{}});assert([401,501].includes(r.statusCode));assert(!JSON.parse(r.body).clientes);
});
