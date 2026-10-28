'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {handler,costOf}=require('../netlify/functions/support-prepare-parts');
const id='12345678-1234-4234-9234-123456789abc';
async function run({role='admin',assigned='tech@test.invalid',duplicate=false,noCost=false,invalid=false}={}){
 const env={...process.env},oldFetch=global.fetch,calls=[];
 process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY='main-secret';process.env.SUPPORT_SUPABASE_URL='https://support.supabase.co';process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY='support-secret';
 global.fetch=async(u,o={})=>{
  const url=new URL(u);calls.push({url,method:o.method||'GET',body:o.body?JSON.parse(o.body):null,headers:o.headers});let data=[];
  if(url.pathname.endsWith('/auth/v1/user'))return new Response(JSON.stringify(invalid?{}:{email:'tech@test.invalid'}),{status:invalid?401:200});
  if(url.pathname.endsWith('/service_users'))data=[{rol:role,activo:true}];
  else if(url.pathname.endsWith('/service_orders'))data=[{id:22,code:'TS1',assigned_technician_email:assigned}];
  else if(url.pathname.endsWith('/service_parts'))data=o.method==='PATCH'?null:[{id,sku:'BAT-1'}];
  else if(url.pathname.endsWith('/thinkstore_inventory_products')){const p={id:'inv1',data:{sku:'BAT-1',...(noCost?{}:{purchase_price:40})}};data=duplicate?[p,p]:[p];}
  else if(url.pathname.endsWith('/rpc/ts_save_service_order_parts'))data={ok:true};
  else throw Error('Unexpected '+url);
  return new Response(data===null?'':JSON.stringify(data));
 };
 try{return {response:await handler({httpMethod:'POST',headers:{origin:'https://soporte.thinkstore.com.ve',authorization:'Bearer session'},body:JSON.stringify({order_id:22,parts:[{part_id:id,quantity:1}]})}),calls};}
 finally{global.fetch=oldFetch;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);}
}
test('costo explícito válido y cero; rechaza costo ausente o inválido',()=>{assert.equal(costOf({purchase_price:40}),40);assert.equal(costOf({purchase_price:0,unit_cost:20}),0);assert.throws(()=>costOf({}),/Falta/);assert.throws(()=>costOf({purchase_price:'40,50'}),/inválido/);});
test('copia costo Inventory y reserva con identidad real sin duplicar gastos',async()=>{
 const {response,calls}=await run();assert.equal(response.statusCode,200,response.body);
 const writes=calls.filter(c=>['POST','PATCH'].includes(c.method));assert.equal(writes.length,2);assert.equal(writes[0].body.unit_cost,40);assert.equal(writes[1].body.p_actor_email,'tech@test.invalid');assert.equal(writes[1].headers.Authorization,'Bearer session');assert.ok(!response.body.includes('secret'));assert.ok(!response.body.includes('unit_cost'));
});
test('costo faltante o SKU duplicado detienen reserva antes de escribir',async()=>{for(const opt of [{noCost:true},{duplicate:true}]){const {response,calls}=await run(opt);assert.equal(response.statusCode,409,response.body);assert.equal(calls.filter(c=>['POST','PATCH'].includes(c.method)).length,0);}});
test('técnico sin asignación y sesión inválida no modifican costos ni reservas',async()=>{for(const opt of [{role:'technician',assigned:'other@test.invalid'},{invalid:true}]){const {response,calls}=await run(opt);assert.ok(response.statusCode>=400);assert.equal(calls.filter(c=>['POST','PATCH'].includes(c.method)).length,0);}});
