'use strict';
const {quote}=require('../../checkout-policy');
const crypto=require('crypto');
const H={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const clean=v=>String(v??'').trim();
const reply=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
exports.handler=async(event)=>{
 if(event.httpMethod==='OPTIONS')return reply(200,{ok:true});
 const url=clean(process.env.SUPABASE_URL).replace(/\/$/,''),key=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
 if(!url||!key)return reply(503,{ok:false,error:'El servicio de pedidos no está disponible.'});
 const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
 async function sb(path,options={}){const r=await fetch(url+'/rest/v1/'+path,{...options,headers:{...headers,...options.headers}});const data=await r.json().catch(()=>null);if(!r.ok){const e=Error(data?.message||data?.error||'No se pudo guardar el pedido.');e.status=r.status;throw e;}return data;}
 if(event.httpMethod==='GET'){
  let ready=true;try{await sb('pedidos?select=subtotal_usd,discount_type,discount_value,discount_usd,discount_reason&limit=0');}catch{ready=false;}
  return reply(200,{ok:true,discount_storage_ready:ready,verification:'manual',discount_percent:20,discount_methods:['Zelle','Binance','USDT','Efectivo'],binance_pay_id:clean(process.env.THINKSTORE_BINANCE_PAY_ID),usdt_address:clean(process.env.THINKSTORE_USDT_ADDRESS),usdt_network:clean(process.env.THINKSTORE_USDT_NETWORK)});
 }
 if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Método no permitido'});
 let b;try{b=JSON.parse(event.body||'{}');}catch{return reply(400,{ok:false,error:'JSON inválido'});}
 const token=clean(event.headers?.authorization||event.headers?.Authorization).replace(/^Bearer\s+/i,'');
 if(!token)return reply(401,{ok:false,error:'Inicia sesión para guardar tu compra.'});
 const ar=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}}),u=await ar.json().catch(()=>({}));
 if(!ar.ok||!u.id)return reply(401,{ok:false,error:'Tu sesión expiró. Inicia sesión nuevamente.'});
 const requestId=clean(b.request_id);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))return reply(400,{ok:false,error:'Identificador de compra inválido.'});
 let created=null;
 try{
  const previous=await sb('pedidos?select=id,codigo,cliente_id,estado,total_usd,metodo_pago&id=eq.'+encodeURIComponent(requestId)+'&limit=1');
  if(previous?.length){const p=previous[0];if(p.cliente_id!==u.id)return reply(409,{ok:false,error:'Identificador no disponible.'});if(p.estado==='Cancelado')return reply(409,{ok:false,cancelled:true,error:'El intento anterior no se completó. Vuelve a finalizar tu pedido.'});if(p.estado==='Pedido recibido')return reply(409,{ok:false,error:'Tu pedido está terminando de guardarse. Espera unos segundos y vuelve a consultar.',code:p.codigo,retryable:true});return reply(200,{ok:true,reused:true,pedido:p});}
  const method=clean(b.method),delivery=clean(b.delivery);
  if(!['Envío nacional','Retiro en tienda','Delivery local'].includes(delivery))return reply(400,{ok:false,error:'Selecciona envío o retiro.'});
  const requested=Array.isArray(b.items)?b.items:[];quote(requested.map(i=>({...i,price:1})),method);
  const profile=(await sb('clientes?select=id,nombre,correo,telefono,cedula_rif,direccion,ciudad,estado&id=eq.'+u.id+'&limit=1'))?.[0];
  if(!profile?.nombre||!profile?.telefono||!profile?.cedula_rif||!profile?.direccion)return reply(400,{ok:false,error:'Completa tu nombre, teléfono, documento y dirección en tus datos de cliente.'});
  const variants=await sb('inventory_variants?select=id,sku,product_name,model,color,capacity,condition,price_usd,active&active=eq.true&limit=5000');
  const records=await sb('thinkstore_inventory_products?select=id,data&workspace_key=eq.main&limit=5000');
  const commercial=(records||[]).map(r=>r.data||{}),safeItems=[];
  for(const i of requested){
   const id=clean(i.variant_id||i.inventory_variant_id),sku=clean(i.sku||i.case_variant_sku);
   const v=(variants||[]).find(v=>id?String(v.id)===id:sku&&v.sku===sku);
   if(!v)throw Error('Una variante ya no está disponible. Actualiza el carrito.');
   const source=commercial.find(p=>String(p.sku)===String(v.sku));
   if(source&&(source.active===false||source.published===false))throw Error('Un producto fue retirado del catálogo. Actualiza el carrito.');
   const price=Number(v.price_usd||source?.sale_price||0);
   safeItems.push({variant_id:v.id,sku:v.sku,product:v.product_name||source?.product_group||source?.name||i.product,model:v.model||'',color:v.color||'',config:[v.model,v.capacity,v.condition].filter(Boolean).join(' · '),condition:v.condition||'Nuevo',qty:Number(i.qty||1),price,is_preorder:/pre.?order|preorden/i.test(clean(i.condition))});
  }
  const pricing=quote(safeItems,method);
  if(!Number.isFinite(Number(b.expected_total))||Math.abs(Number(b.expected_total)-pricing.total_usd)>.009)return reply(409,{ok:false,price_changed:true,error:'El precio cambió. Revisa el total actualizado antes de continuar.',pricing,items:safeItems});
  let fx=null;if(method==='Pago Móvil'){fx=await require('./fx-rate-core').getRate(true);if(fx.stale)throw Error('No se pudo confirmar la tasa BCV. Intenta nuevamente.');if(Number(b.bcv_rate)!==Number(fx.rate))return reply(409,{ok:false,rate_changed:true,error:'La tasa BCV cambió. Actualiza el monto antes de continuar.'});}
  const code=await sb('rpc/ts_next_order_code',{method:'POST',body:'{}'});if(!/^TS-\d{4}-\d{4,}$/.test(clean(code)))throw Error('No se pudo asignar el número de pedido.');
  const destination=method==='Zelle'?{code:'zelle',name:'Zelle'}:['USDT','Binance'].includes(method)?{code:'binance',name:'Binance'}:method==='Pago Móvil'?{code:'banesco',name:'Banesco'}:{code:null,name:null};
  const row={id:requestId,codigo:code,cliente_id:u.id,estado:'Pedido recibido',metodo_pago:method,referencia_pago:clean(b.reference).slice(0,160),metodo_envio:delivery,empresa_envio:delivery==='Envío nacional'?(['MRW','Zoom','TEALCA'].includes(b.shipping_company)?b.shipping_company:'MRW'):delivery==='Delivery local'?'Delivery ThinkStore':null,payment_destination_code:destination.code,payment_destination_name:destination.name,total_usd:pricing.total_usd,total_bs:fx?Math.round(pricing.total_usd*fx.rate*100)/100:null,subtotal_usd:pricing.subtotal_usd,discount_type:pricing.discount_type,discount_value:pricing.discount_value,discount_usd:pricing.discount_usd,discount_reason:pricing.discount_reason||null};
  try{created=(await sb('pedidos',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)}))?.[0];}catch(e){if(/subtotal_usd|discount_/i.test(e.message))return reply(409,{ok:false,migration_required:true,error:'El comercio debe habilitar los campos de descuento antes de recibir este pedido.'});throw e;}
  if(!created?.id)throw Error('No se pudo crear el pedido.');
  await sb('pedido_items',{method:'POST',body:JSON.stringify(safeItems.map(i=>({pedido_id:created.id,producto:i.product,color:i.color,capacidad:i.config,cantidad:i.qty,precio_usd:i.price,inventory_variant_id:i.is_preorder?null:i.variant_id,sku:i.sku,condicion:i.is_preorder?'Pre-Order':i.condition})))});
  const reserve=safeItems.filter(i=>!i.is_preorder).map(i=>({variant_id:i.variant_id,quantity:i.qty}));
  if(reserve.length)await sb('rpc/ts_reserve_inventory',{method:'POST',body:JSON.stringify({p_pedido_id:created.id,p_items:reserve,p_minutes:60})});
  const status='Pago por verificar';
  await sb('pedidos?id=eq.'+created.id,{method:'PATCH',body:JSON.stringify({estado:status})});
  try{await sb('order_status_history',{method:'POST',body:JSON.stringify({pedido_id:created.id,estado:status,nota:`Compra online registrada. ${pricing.discount_usd?'Descuento 20% '+method+': $'+pricing.discount_usd+'. ':''}Total productos: $${pricing.total_usd}. ${delivery==='Retiro en tienda'?'Retiro sin cargo.':'Envío se coordina y paga por separado.'} Nota de entrega pendiente. Confirmación manual del abono.`})});}catch(e){console.warn('Historial checkout:',e.message);}
  let emailSent=false;
  try{const mail=await require('./send-email').handler({httpMethod:'POST',body:JSON.stringify({to:u.email,subject:'ThinkStore | Pedido '+code+' registrado',department:'pedidos',actionUrl:'https://thinkstore.com.ve/compra-seguimiento.html?code='+encodeURIComponent(code),actionLabel:'Seguir mi pedido',text:`Hola ${profile.nombre},\n\nTu pedido ${code} está guardado.\nProductos: $${pricing.subtotal_usd.toFixed(2)}\nDescuento: $${pricing.discount_usd.toFixed(2)}\nTotal productos: $${pricing.total_usd.toFixed(2)}\nMétodo: ${method}\nEntrega: ${delivery}. El envío se coordina por separado.\n\nEstado: Pago pendiente de verificación. Puedes cerrar la página; te avisaremos al revisar el abono. La nota de entrega queda pendiente hasta confirmar el pago y asignar el producto.`})});emailSent=mail.statusCode===200;}catch(e){console.warn('Correo checkout:',e.message);}
  return reply(200,{ok:true,email_sent:emailSent,pedido:{id:created.id,codigo:code,estado:status,total_usd:pricing.total_usd},pricing,items:safeItems,verification:'manual',delivery_note:'pending'});
 }catch(e){
  if(created?.id){try{await sb('rpc/ts_release_inventory',{method:'POST',body:JSON.stringify({p_pedido_id:created.id,p_reason:'No se pudo completar checkout'})});await sb('pedidos?id=eq.'+created.id,{method:'PATCH',body:JSON.stringify({estado:'Cancelado'})});}catch(cleanup){console.error('Checkout requiere revisión:',created.id,cleanup.message);}}
  return reply(409,{ok:false,error:/stock_insuficiente|variante_no_disponible/.test(e.message)?'Un producto se agotó. Actualiza tu carrito.':e.message,code:created?.codigo||null});
 }
};
