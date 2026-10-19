'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {handler}=require('../netlify/functions/admin-create-sale');
const {selectedCustomer}=require('../netlify/functions/pos-customer-core');
const search=require('../staff/sale-search');
const id='12345678-1234-1234-1234-123456789abc';
const customer={id,nombre:'Cliente CRM manual',correo:'manual@example.test',telefono:'04141234567',cedula_rif:'V12345678',direccion:'Caracas Chacao',ciudad:'Caracas',estado:'Miranda'};
const base={customer_name:'Compra presencial',customer_email:'walkin@example.test',customer_document:'V12345678',customer_phone:'04141234567',customer_address:'Caracas Chacao',items:[{product_name:'Cable USB-C',is_preorder:false,variant_id:id,sku:'CABLE-01',price:20}],payment_method:'Efectivo USD'};
function response(data,status=200){return{ok:status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)}}
async function sale(body){
 const oldFetch=global.fetch,oldSecret=process.env.THINKSTORE_ADMIN_SECRET,oldService=process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY;
 process.env.THINKSTORE_ADMIN_SECRET='unit-test-secret';process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY='unit-test-service';
 const writes=[];let authReads=0;
 global.fetch=async(url,o={})=>{
  const u=String(url);if(u.includes('/auth/')){authReads++;throw Error('POS must not require customer Auth');}
  if(u.includes('/clientes?'))return response([customer]);
  if(u.includes('/inventory_variants?'))return response([{id,sku:'CABLE-01',product_name:'Cable USB-C',stock_on_hand:2,stock_reserved:0,price_usd:20}]);
  if(u.endsWith('/rpc/ts_next_order_code'))return response('TS-2026-9999');
  if(o.method==='POST'){writes.push({url:u,body:JSON.parse(o.body)});if(u.endsWith('/pedidos'))return response([{id:'order-test',codigo:'TS-2026-9999'}]);if(u.endsWith('/pedido_items'))return response([{id:'item-test'}]);return response({ok:true});}
  throw Error('Unexpected '+u);
 };
 try{const r=await handler({httpMethod:'POST',headers:{'x-admin-secret':'unit-test-secret'},body:JSON.stringify(body)});return{r,writes,authReads};}
 finally{global.fetch=oldFetch;if(oldSecret===undefined)delete process.env.THINKSTORE_ADMIN_SECRET;else process.env.THINKSTORE_ADMIN_SECRET=oldSecret;if(oldService===undefined)delete process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY;else process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY=oldService;}
}
test('walk-in sale works without an Auth account and still reserves stock',async()=>{
 const {r,writes,authReads}=await sale(base);assert.equal(r.statusCode,200,r.body);assert.equal(authReads,0);
 const order=writes.find(x=>x.url.endsWith('/pedidos')).body;assert.equal(order.cliente_id,null);assert.equal(order.guest_name,base.customer_name);assert.equal(order.total_usd,20);assert.equal(order.estado,'Pago por verificar');
 assert.deepEqual(writes.find(x=>x.url.endsWith('/rpc/ts_reserve_inventory')).body.p_items,[{variant_id:id,quantity:1}]);assert.equal(JSON.parse(r.body).customer.registered,false);
});
test('explicit CRM selection links a manual customer without email verification and keeps purchase data',async()=>{
 const {r,writes,authReads}=await sale({...base,customer_id:id,customer_email:customer.correo,customer_address:'Otra dirección de entrega'});assert.equal(r.statusCode,200,r.body);assert.equal(authReads,0);const order=writes.find(x=>x.url.endsWith('/pedidos')).body;assert.equal(order.cliente_id,id);assert.equal(order.guest_address,'Otra dirección de entrega');
});
test('a mismatched selected customer fails before creating an order',async()=>{
 const {r,writes}=await sale({...base,customer_id:id});assert.notEqual(r.statusCode,200);assert.equal(writes.length,0);assert.match(JSON.parse(r.body).error,/seleccionado cambió/);
});
test('missing selection makes no customer database request',async()=>{
 const old=global.fetch;global.fetch=()=>{throw Error('Should not fetch')};try{assert.equal(await selectedCustomer({},null,'new@example.test'),null);}finally{global.fetch=old;}
});
test('product search combines tokens, accents, storage and SKU in any order',()=>{
 const v={sku:'APL-18-BLK-256',color:'Negro',capacity:'256GB',condition:'Renovado',chip:'A20'};
 assert.equal(search.matches('256 GB negro 18','iPhone 18','iPhone',v),true);
 assert.equal(search.matches('APL-18-BLK-256','iPhone 18','iPhone',v),true);
 assert.equal(search.matches('renovádo A20','iPhone 18','iPhone',v),true);
 assert.equal(search.matches('negro 512GB','iPhone 18','iPhone',v),false);
});
test('variant search cannot combine color from one variant with capacity from another',()=>{
 const vs=[{color:'Negro',capacity:'128GB'},{color:'Blanco',capacity:'256GB'}];assert.equal(vs.filter(v=>search.matches('negro 256GB','iPhone 18','iPhone',v)).length,0);
});
test('customer lookup rejects unauthenticated callers',async()=>{
 const old=process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY;process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY='test';try{const r=await require('../netlify/functions/staff-customers').handler({httpMethod:'GET',headers:{},queryStringParameters:{q:'cliente'}});assert.equal(r.statusCode,403);}finally{if(old===undefined)delete process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY;else process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY=old;}
});
test('authorized CRM search returns manual records without querying customer Auth',async()=>{
 const old=global.fetch,oldKey=process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY;process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY='test-service';let path='';
 global.fetch=async(u)=>{const url=String(u);if(url.endsWith('/auth/v1/user'))return response({id:'staff-id',email:'seller@example.test'});if(url.includes('/profiles?'))return response([{id:'staff-id',role:'vendedor',is_internal:true,active:true}]);if(url.includes('/roles_usuarios?'))return response([]);if(url.includes('/clientes?')){path=url;return response([customer]);}throw Error('Unexpected '+url);};
 try{const r=await require('../netlify/functions/staff-customers').handler({httpMethod:'GET',headers:{authorization:'Bearer staff-token'},queryStringParameters:{q:'manual@example.test'}});assert.equal(r.statusCode,200,r.body);assert.equal(JSON.parse(r.body).customers[0].id,id);assert.match(path,/limit=21/);assert.match(path,/manual%40example.test/);}finally{global.fetch=old;if(oldKey===undefined)delete process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY;else process.env.MAIN_SUPABASE_SERVICE_ROLE_KEY=oldKey;}
});
