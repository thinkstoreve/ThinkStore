exports.handler=async function(event){
  const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'POST,OPTIONS'};
  const r=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
  if(event.httpMethod==='OPTIONS')return r(200,{ok:true});
  if(event.httpMethod!=='POST')return r(405,{ok:false,error:'Método no permitido'});
  const {getRate}=require('./fx-rate-core');
  const clean=v=>String(v??'').trim(), norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const url=clean(process.env.SUPABASE_URL).replace(/\/$/,''); const service=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!url||!service)return r(501,{ok:false,error:'Faltan variables de Supabase'});
  const sh={apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'};

  async function auth(){
    const legacy=clean(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']||'');
    const allowed=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String);
    if(legacy&&allowed.includes(legacy))return{ok:true,mode:'legacy'};
    const token=clean(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
    if(!token)return{ok:false};
    const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}}); const u=await ur.json().catch(()=>({}));
    if(!ur.ok||!u.id)return{ok:false};
    const pr=await fetch(`${url}/rest/v1/profiles?select=id,role,active&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:sh}); const rows=await pr.json().catch(()=>[]),p=rows[0],role=norm(p?.role);
    if(!p||p.active===false||!['admin','super_admin','superadmin','administrator','gerente','vendedor'].includes(role))return{ok:false};
    return{ok:true,user_id:u.id,email:u.email||'',role};
  }
  const actor=await auth(); if(!actor.ok)return r(401,{ok:false,error:'Acceso no autorizado'});

  let b={}; try{b=JSON.parse(event.body||'{}')}catch{return r(400,{ok:false,error:'JSON inválido'})}
  const guest={
    name:clean(b.customer_name), email:clean(b.customer_email).toLowerCase(), document:clean(b.customer_document),
    phone:clean(b.customer_phone), address:clean(b.customer_address), city:clean(b.customer_city), state:clean(b.customer_state)
  };
  if(!guest.name||!guest.email||!guest.email.includes('@')||!guest.document||!guest.phone||!guest.address)
    return r(400,{ok:false,error:'Completa nombre, correo, cédula/RIF, teléfono y dirección del cliente.'});

  const items=(Array.isArray(b.items)?b.items:[]).map(x=>({
    sku:clean(x.sku),serial:clean(x.serial_number),warranty:Number(x.warranty_days||0),
    price:Number(x.price||0),condition:clean(x.condition),model_code:clean(x.model_code),
    features:clean(x.features),note:clean(x.note),image_url:clean(x.image_url)
  })).filter(x=>x.sku);
  if(!items.length)return r(400,{ok:false,error:'Añade al menos un producto a la venta.'});
  if(items.length>20)return r(413,{ok:false,error:'Máximo 20 productos por venta.'});
  if(items.some(x=>!x.serial||!(x.price>0)))return r(400,{ok:false,error:'Cada equipo debe tener serial y precio de venta.'});
  const serials=items.map(x=>x.serial.toLowerCase()); if(new Set(serials).size!==serials.length)return r(409,{ok:false,error:'Hay seriales repetidos dentro de la venta.'});

  const payment=clean(b.payment_method||'Efectivo USD'), paymentRef=clean(b.payment_ref||'');
  if(!/efectivo/i.test(payment)&&!paymentRef)return r(400,{ok:false,error:'Indica la referencia del pago para este método.'});

  async function req(path,options={}){const rr=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...sh,...(options.headers||{})}});const txt=await rr.text();let d=null;try{d=txt?JSON.parse(txt):null}catch{d=txt};if(!rr.ok){const e=new Error(d?.message||d?.error||d?.details||`Supabase ${rr.status}`);e.data=d;throw e}return d}
  async function first(path){try{const d=await req(path);return Array.isArray(d)?d[0]:null}catch{return null}}

  try{
    // Si el correo ya pertenece a un cliente registrado, se enlaza; si no, la venta queda como invitado sin crear Auth.
    let customer=await first(`clientes?select=*&correo=eq.${encodeURIComponent(guest.email)}&limit=1`);
    if(!customer)customer=await first(`clientes?select=*&email=eq.${encodeURIComponent(guest.email)}&limit=1`);

    const variants=[], reserve=[];
    for(const item of items){
      const v=await first(`inventory_variants?select=*&sku=eq.${encodeURIComponent(item.sku)}&active=eq.true&limit=1`);
      if(!v)throw new Error(`Variante no encontrada: ${item.sku}`);
      const available=Math.max(0,Number(v.stock_on_hand||0)-Number(v.stock_reserved||0));
      if(available<1)throw new Error(`${v.product_name||item.sku} ya no tiene existencia disponible.`);
      const dup=await first(`pedido_items?select=id&numero_serie=eq.${encodeURIComponent(item.serial)}&limit=1`);
      if(dup)throw new Error(`El serial ${item.serial} ya está asociado a otra venta.`);
      variants.push({item,v}); reserve.push({variant_id:v.id,quantity:1});
    }

    const total=Math.round(variants.reduce((n,x)=>n+x.item.price,0)*100)/100;
    let fxQuote=null;
    if(/pago\s*m[oó]vil|punto\s*de\s*venta|^pos$|tarjeta/i.test(payment)){
      const q=await getRate(true); fxQuote={...q,total_usd:total,total_ves:Math.round(total*q.rate*100)/100};
    }

    const cr=await fetch(`${url}/rest/v1/rpc/ts_next_order_code`,{method:'POST',headers:sh,body:'{}'});
    const cd=await cr.json().catch(()=>null); if(!cr.ok)throw new Error(cd?.message||cd?.error||'No se pudo generar el consecutivo del pedido');
    const code=String(cd||'').replace(/^"|"$/g,'').trim(); if(!/^TS-\d{4}-\d{4,}$/.test(code))throw new Error('Supabase devolvió un consecutivo inválido');

    const pedidoPayload={
      codigo:code,cliente_id:customer?.id||null,estado:'Pago por verificar',metodo_pago:payment,referencia_pago:paymentRef,
      total_usd:total,total_bs:fxQuote?.total_ves??null,metodo_envio:clean(b.delivery_method||'Retiro en tienda'),
      empresa_envio:clean(b.shipping_company)||null,order_channel:'presencial',
      guest_name:guest.name,guest_email:guest.email,guest_document:guest.document,guest_phone:guest.phone,
      guest_address:guest.address,guest_city:guest.city||null,guest_state:guest.state||null,sale_note:clean(b.sale_note)||null
    };
    let po;
    try{po=await req('pedidos',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(pedidoPayload)})}
    catch(e){
      if(/order_channel|guest_|sale_note|schema cache|column/i.test(clean(e.message)))
        return r(409,{ok:false,migration_required:true,error:'Falta ejecutar supabase_v13_44_ventas_presenciales.sql antes de usar ventas sin registro.'});
      throw e;
    }
    const pedido=Array.isArray(po)?po[0]:null; if(!pedido?.id)throw new Error('No se pudo crear el pedido');

    try{
      const itemRows=variants.map(({item,v})=>({
        pedido_id:pedido.id,producto:v.product_name,color:v.color,capacidad:v.capacity,cantidad:1,precio_usd:item.price,
        condicion:item.condition||v.condition||'Nuevo',numero_serie:item.serial,garantia_dias:item.warranty||null,
        chip:v.chip||null,ram:v.ram||null,model_code:item.model_code||null,features:item.features||null,
        item_note:item.note||null,image_url:item.image_url||null
      }));
      await req('pedido_items',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(itemRows)});
      const rpc=await fetch(`${url}/rest/v1/rpc/ts_reserve_inventory`,{method:'POST',headers:sh,body:JSON.stringify({p_pedido_id:pedido.id,p_items:reserve,p_minutes:10080})});
      const rd=await rpc.json().catch(()=>({})); if(!rpc.ok)throw new Error(rd?.message||rd?.error||'No se pudo reservar inventario');
      try{await req('admin_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:actor.email||actor.mode||null,action:'pos_sale_created',entity_type:'pedido',entity_id:String(pedido.id),after_data:{codigo:code,channel:'presencial',items:itemRows.length,total_usd:total}})})}catch(_){}
    }catch(e){
      try{await req(`pedidos?id=eq.${encodeURIComponent(pedido.id)}`,{method:'DELETE'})}catch(_){}
      throw e;
    }

    return r(200,{ok:true,fx_quote:fxQuote,pedido:{...pedido,codigo:code},customer:{registered:!!customer,...guest},items:variants.map(x=>({sku:x.v.sku,product_name:x.v.product_name,model:x.v.model,color:x.v.color,capacity:x.v.capacity,condition:x.v.condition})),message:'Venta presencial guardada en espera de confirmación de pago. El stock quedó reservado.'});
  }catch(e){console.error('admin-create-sale',e);return r(500,{ok:false,error:e.message||'No se pudo registrar la venta'})}
}
