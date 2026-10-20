const {test,after}=require('node:test');const assert=require('node:assert/strict');const policy=require('../checkout-policy');
test('20% applies to Zelle, Binance, USDT and USD cash, with cents and quantities',()=>{
 for(const method of ['Zelle','Binance','USDT','Efectivo']){const q=policy.quote([{price:100,qty:1}],method);assert.equal(q.total_usd,80);assert.equal(q.discount_usd,20);assert.equal(q.shipping_usd,0);}
 for(const method of ['Pago Móvil','Punto de venta'])assert.equal(policy.quote([{price:100,qty:1}],method).total_usd,100);
 assert.equal(policy.quote([{price:100.01,qty:3}],'USDT').total_usd,240.02);
 assert.throws(()=>policy.quote([{price:0,qty:1}],'Zelle'));assert.throws(()=>policy.quote([{price:2,qty:-1}],'Zelle'));assert.throws(()=>policy.quote([{price:10,qty:1}],'Inventado'));
});
const originalFetch=global.fetch,env={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY};
after(()=>{global.fetch=originalFetch;process.env.SUPABASE_URL=env.url;process.env.SUPABASE_SERVICE_ROLE_KEY=env.key;});
const sendPath=require.resolve('../netlify/functions/send-email');require.cache[sendPath]={id:sendPath,filename:sendPath,loaded:true,exports:{handler:async()=>({statusCode:501,body:'{}'})}};
const {handler}=require('../netlify/functions/checkout-order');const id='12345678-1234-4123-8123-123456789012';
function fixture({reserveFails=false,previous=[],price=100}={}){
 process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';const calls=[];
 global.fetch=async(raw,opt={})=>{const u=new URL(raw),path=u.pathname.replace('/rest/v1/',''),b=opt.body?JSON.parse(opt.body):null;calls.push({path,method:opt.method||'GET',body:b,search:u.search});let data=[];let status=200;
 if(u.pathname==='/auth/v1/user')data={id:'customer',email:'client@example.test'};
 else if(path==='pedidos'&&!opt.method)data=previous;
 else if(path==='clientes')data=[{id:'customer',nombre:'Cliente de prueba',telefono:'0000',cedula_rif:'TEST',direccion:'TEST'}];
 else if(path==='inventory_variants')data=[{id:'variant',sku:'SKU',product_name:'Producto real',price_usd:price,active:true,color:'Negro',condition:'Nuevo'}];
 else if(path==='thinkstore_inventory_products')data=[{data:{sku:'SKU',name:'Producto real',published:true,active:true}}];
 else if(path==='rpc/ts_next_order_code')data='TS-2026-1000';
 else if(path==='pedidos'&&opt.method==='POST')data=[{...b,id,codigo:'TS-2026-1000'}];
 else if(path==='rpc/ts_reserve_inventory'&&reserveFails){status=409;data={message:'stock_insuficiente'};}
 return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 };return calls;
}
const event=(extra={},auth=true)=>({httpMethod:'POST',headers:auth?{authorization:'Bearer session-test'}:{},body:JSON.stringify({request_id:id,method:'Zelle',delivery:'Retiro en tienda',expected_total:80,items:[{variant_id:'variant',sku:'SKU',qty:1,price:.01}],...extra})});
test('server uses inventory price and persists pending status and original subtotal',async()=>{
 const calls=fixture();const response=await handler(event());assert.equal(response.statusCode,200);const d=JSON.parse(response.body);assert.equal(d.pricing.total_usd,80);assert.equal(d.delivery_note,'pending');
 const inserted=calls.find(c=>c.path==='pedidos'&&c.method==='POST').body;assert.equal(inserted.subtotal_usd,100);assert.equal(inserted.discount_usd,20);assert.equal(inserted.total_usd,80);assert.equal(inserted.estado,'Pedido recibido');
 const items=calls.find(c=>c.path==='pedido_items'&&c.method==='POST').body;assert.equal(items[0].precio_usd,100);assert.equal(items[0].producto,'Producto real');
 assert.ok(calls.some(c=>c.method==='PATCH'&&c.body.estado==='Pago por verificar'));assert.ok(!calls.some(c=>c.body?.estado==='Pago verificado'));
});
test('cash USD receives the server discount and stays pending manual collection',async()=>{
 const calls=fixture();const response=await handler(event({method:'Efectivo'}));assert.equal(response.statusCode,200);assert.equal(JSON.parse(response.body).pricing.total_usd,80);
 const order=calls.find(c=>c.path==='pedidos'&&c.method==='POST').body;assert.equal(order.metodo_pago,'Efectivo');assert.equal(order.discount_usd,20);assert.match(order.discount_reason,/efectivo USD/);assert.ok(!calls.some(c=>c.body?.estado==='Pago verificado'));
});
test('price changes and missing authentication do not create orders',async()=>{
 let calls=fixture({price:120});assert.equal((await handler(event())).statusCode,409);assert.ok(!calls.some(c=>c.method==='POST'&&c.path==='pedidos'));
 calls=fixture();assert.equal((await handler(event({},false))).statusCode,401);assert.equal(calls.length,0);
});
test('failed reservation releases stock and cancels the incomplete order',async()=>{
 const calls=fixture({reserveFails:true});assert.equal((await handler(event())).statusCode,409);assert.ok(calls.some(c=>c.path==='rpc/ts_release_inventory'));assert.ok(calls.some(c=>c.method==='PATCH'&&c.body.estado==='Cancelado'));assert.ok(!calls.some(c=>c.method==='PATCH'&&c.body.estado==='Pago por verificar'));
});
test('retry of the same order is idempotent and ownership is enforced',async()=>{
 let calls=fixture({previous:[{id,cliente_id:'customer',codigo:'TS-2026-1000',estado:'Pago por verificar',total_usd:80}]});const d=JSON.parse((await handler(event())).body);assert.equal(d.reused,true);assert.ok(!calls.some(c=>c.method==='POST'));
 calls=fixture({previous:[{id,cliente_id:'someone-else',estado:'Pago por verificar'}]});assert.equal((await handler(event())).statusCode,409);assert.ok(!calls.some(c=>c.method==='POST'));
});
test('preorders do not reserve on-hand stock',async()=>{const calls=fixture();assert.equal((await handler(event({items:[{variant_id:'variant',sku:'SKU',qty:1,condition:'Pre-Order'}]}))).statusCode,200);assert.ok(!calls.some(c=>c.path==='rpc/ts_reserve_inventory'));});
const authPath=require.resolve('../netlify/functions/staff-auth-core');require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{mainConfig:()=>({url:'https://test.supabase.co',service:'test-only'}),authenticateInternal:async()=>({ok:true,role:'admin',profile:{},auth_user:{email:'admin@example.test'}})}};
const whatsappPath=require.resolve('../netlify/functions/_whatsapp-service-events');require.cache[whatsappPath]={id:whatsappPath,filename:whatsappPath,loaded:true,exports:{orderUpdate:async()=>({skipped:true})}};
const admin=require('../netlify/functions/admin-update-order').handler;
function adminFixture(status='Pago por verificar'){
 const calls=[],order={id,codigo:'TS-2026-1000',estado:status,total_usd:80,metodo_pago:'Zelle',cliente_id:'customer',clientes:{nombre:'TEST',correo:'client@example.test'},pedido_items:[]};
 global.fetch=async(raw,opt={})=>{const url=new URL(raw),path=url.pathname.replace('/rest/v1/',''),body=opt.body?JSON.parse(opt.body):null;calls.push({path,method:opt.method||'GET',body});let data=[];if(path==='pedidos')data=opt.method==='PATCH'?[{...order,...body}]:[order];return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});};return calls;
}
test('admin cannot skip payment verification to ship or mark a pending order as paid',async()=>{
 for(const status of ['Pago verificado','Preparando pedido','Enviado','Entregado']){const calls=adminFixture();const r=await admin({httpMethod:'POST',headers:{},body:JSON.stringify({id,status})});assert.equal(r.statusCode,409,status);assert.ok(!calls.some(c=>c.method==='PATCH'));}
});
test('admin can mark manual review without recording a verified payment',async()=>{
 const calls=adminFixture();const r=await admin({httpMethod:'POST',headers:{},body:JSON.stringify({id,status:'Verificando pago'})});assert.equal(r.statusCode,200);assert.ok(calls.some(c=>c.method==='PATCH'&&c.body.estado==='Verificando pago'));assert.ok(!calls.some(c=>c.body?.payment_decision==='approved'));
});
const client=require('../netlify/functions/client-order').handler;
test('client can view only a customer-scoped order and report payment without approving it',async()=>{
 process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';const calls=[];
 global.fetch=async(raw,opt={})=>{const url=new URL(raw),body=opt.body?JSON.parse(opt.body):null;calls.push({url:url.href,method:opt.method||'GET',body});const d=url.pathname==='/auth/v1/user'?{id:'customer'}:!opt.method?[{id,codigo:'TS-2026-1000',estado:'Pago por verificar',pedido_items:[]}]:[];return new Response(JSON.stringify(d),{status:200,headers:{'Content-Type':'application/json'}});};
 const ev=action=>({httpMethod:'POST',headers:{authorization:'Bearer session'},body:JSON.stringify({code:'TS-2026-1000',action,reference:'REF-123'})});
 const viewed=JSON.parse((await client(ev('get_status'))).body);assert.equal(viewed.payment_verified,false);assert.ok(calls.some(c=>c.url.includes('cliente_id=eq.customer')));
 assert.equal((await client(ev('report_payment'))).statusCode,200);assert.ok(calls.some(c=>c.method==='PATCH'&&c.body.estado==='Pago por verificar'));assert.ok(!calls.some(c=>c.body?.estado==='Pago verificado'));
});
