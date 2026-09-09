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
    sku:clean(x.sku),variant_id:clean(x.variant_id),product_name:clean(x.product_name),is_preorder:x.is_preorder===true,
    serial:clean(x.serial_number),warranty:Number(x.warranty_days||0),price:Number(x.price||0),
    condition:clean(x.condition),model_code:clean(x.model_code),features:clean(x.features),note:clean(x.note),
    image_url:clean(x.image_url),color:clean(x.color),capacity:clean(x.capacity),model:clean(x.model),chip:clean(x.chip),ram:clean(x.ram),
    imei:clean(x.imei),general_condition:clean(x.general_condition),battery_health_pct:x.battery_health_pct===null||x.battery_health_pct===''||x.battery_health_pct===undefined?null:Number(x.battery_health_pct)
  })).filter(x=>x.sku||x.variant_id||x.product_name);
  if(!items.length)return r(400,{ok:false,error:'Añade al menos un producto a la venta.'});
  if(items.length>20)return r(413,{ok:false,error:'Máximo 20 productos por venta.'});
  if(items.some(x=>!(x.price>0)))return r(400,{ok:false,error:'Cada producto debe tener un precio de venta válido.'});
  const serials=items.map(x=>x.serial.toLowerCase()).filter(Boolean);
  if(new Set(serials).size!==serials.length)return r(409,{ok:false,error:'Hay seriales repetidos dentro de la venta.'});

  for(const item of items){
    if(item.serial&&/\biphone\b|smartphone|telefono|teléfono/i.test(item.product_name)&&!item.imei)
      return r(400,{ok:false,error:`El IMEI es obligatorio si asignas ahora el serial de ${item.product_name}.`});
    const pre=/pre.?owned|renovado|reacondicionado|refurbished|renewed/i.test(item.condition);
    if(item.serial&&pre){
      if(!['Excelente','Bueno','Bien'].includes(item.general_condition))return r(400,{ok:false,error:`Selecciona la condición general de ${item.product_name}.`});
      const batteryApplies=/\biphone\b|\bipad\b|macbook|apple watch|\bwatch\b/i.test(item.product_name);
      if(batteryApplies&&(!Number.isInteger(item.battery_health_pct)||item.battery_health_pct<1||item.battery_health_pct>100))return r(400,{ok:false,error:`La salud de batería de ${item.product_name} debe estar entre 1 y 100%.`});
    }
  }

  const payment=clean(b.payment_method||'Efectivo USD'), paymentRef=clean(b.payment_ref||'');
  if(!/efectivo/i.test(payment)&&!paymentRef)return r(400,{ok:false,error:'Indica la referencia del pago para este método.'});

  const discountType=clean(b.discount_type||'usd')==='percent'?'percent':'usd';
  const discountValue=Math.max(0,Number(b.discount_value||0));
  const discountReason=clean(b.discount_reason||'').slice(0,160);

  async function req(path,options={}){const rr=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...sh,...(options.headers||{})}});const txt=await rr.text();let d=null;try{d=txt?JSON.parse(txt):null}catch{d=txt};if(!rr.ok){const e=new Error(d?.message||d?.error||d?.details||`Supabase ${rr.status}`);e.data=d;throw e}return d}
  async function first(path){try{const d=await req(path);return Array.isArray(d)?d[0]:null}catch{return null}}

  try{
    // Si el correo ya pertenece a un cliente registrado, se enlaza; si no, la venta queda como invitado sin crear Auth.
    let customer=await first(`clientes?select=*&correo=eq.${encodeURIComponent(guest.email)}&limit=1`);
    if(!customer)customer=await first(`clientes?select=*&email=eq.${encodeURIComponent(guest.email)}&limit=1`);

    const variants=[], reserve=[];
    for(const item of items){
      let v=null;
      if(item.variant_id)v=await first(`inventory_variants?select=*&id=eq.${encodeURIComponent(item.variant_id)}&active=eq.true&limit=1`);
      if(!v&&item.sku)v=await first(`inventory_variants?select=*&sku=eq.${encodeURIComponent(item.sku)}&active=eq.true&limit=1`);
      if(!item.is_preorder){
        if(!v)throw new Error(`Selecciona una variante real para vender desde stock: ${item.product_name||item.sku||'Producto'}`);
        const available=Math.max(0,Number(v.stock_on_hand||0)-Number(v.stock_reserved||0));
        if(available<1)throw new Error(`${v.product_name||item.product_name||item.sku} ya no tiene existencia disponible. Puedes registrarlo como Pre-Order.`);
        reserve.push({variant_id:v.id,quantity:1});
      }
      if(item.serial){
        const dup=await first(`pedido_items?select=id&numero_serie=eq.${encodeURIComponent(item.serial)}&limit=1`);
        if(dup)throw new Error(`El serial ${item.serial} ya está asociado a otra venta.`);
      }
      variants.push({item,v});
    }

    const subtotal=Math.round(variants.reduce((n,x)=>n+x.item.price,0)*100)/100;
    const discountRaw=discountType==='percent'?subtotal*Math.min(discountValue,100)/100:Math.min(discountValue,subtotal);
    const discountUsd=Math.round(discountRaw*100)/100;
    const total=Math.round((subtotal-discountUsd)*100)/100;
    if(total<0)throw new Error('El descuento no puede superar el subtotal.');
    let fxQuote=null;
    if(/pago\s*m[oó]vil|punto\s*de\s*venta|^pos$|tarjeta/i.test(payment)){
      const q=await getRate(true); fxQuote={...q,total_usd:total,total_ves:Math.round(total*q.rate*100)/100};
    }

    const cr=await fetch(`${url}/rest/v1/rpc/ts_next_order_code`,{method:'POST',headers:sh,body:'{}'});
    const cd=await cr.json().catch(()=>null); if(!cr.ok)throw new Error(cd?.message||cd?.error||'No se pudo generar el consecutivo del pedido');
    const code=String(cd||'').replace(/^"|"$/g,'').trim(); if(!/^TS-\d{4}-\d{4,}$/.test(code))throw new Error('Supabase devolvió un consecutivo inválido');

    const pedidoPayload={
      codigo:code,cliente_id:customer?.id||null,estado:'Pago por verificar',metodo_pago:payment,referencia_pago:paymentRef,
      subtotal_usd:subtotal,discount_type:discountType,discount_value:discountValue,discount_usd:discountUsd,discount_reason:discountReason||null,
      total_usd:total,total_bs:fxQuote?.total_ves??null,metodo_envio:clean(b.delivery_method||'Retiro en tienda'),
      empresa_envio:clean(b.shipping_company)||null,order_channel:'presencial',
      guest_name:guest.name,guest_email:guest.email,guest_document:guest.document,guest_phone:guest.phone,
      guest_address:guest.address,guest_city:guest.city||null,guest_state:guest.state||null,sale_note:clean(b.sale_note)||null
    };
    let po;
    try{po=await req('pedidos',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(pedidoPayload)})}
    catch(e){
      if(/subtotal_usd|discount_|schema cache|column/i.test(clean(e.message)))
        return r(409,{ok:false,migration_required:true,error:'Falta ejecutar supabase_v13_65_descuentos_venta_presencial.sql antes de usar descuentos.'});
      if(/order_channel|guest_|sale_note/i.test(clean(e.message)))
        return r(409,{ok:false,migration_required:true,error:'Falta ejecutar supabase_v13_44_ventas_presenciales.sql antes de usar ventas sin registro.'});
      throw e;
    }
    const pedido=Array.isArray(po)?po[0]:null; if(!pedido?.id)throw new Error('No se pudo crear el pedido');

    try{
      const itemRows=variants.map(({item,v})=>({
        pedido_id:pedido.id,producto:v?.product_name||item.product_name,color:v?.color||item.color||null,capacidad:v?.capacity||item.capacity||null,cantidad:1,precio_usd:item.price,
        condicion:item.is_preorder?'Pre-Order':(item.condition||v?.condition||'Nuevo'),numero_serie:item.serial||null,garantia_dias:item.warranty||null,
        chip:v?.chip||item.chip||null,ram:v?.ram||item.ram||null,model_code:item.model_code||item.model||v?.model||null,features:item.features||null,
        item_note:item.note||null,image_url:item.image_url||null
      }));
      const insertedItems=await req('pedido_items',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(itemRows)});
      for(let i=0;i<variants.length;i++){
        const item=variants[i].item,v=variants[i].v,row=Array.isArray(insertedItems)?insertedItems[i]:null;
        if(!item.serial||!row?.id)continue;
        try{
          const condition=/pre.?owned|renovado|reacondicionado|refurbished|renewed/i.test(item.condition)?'Pre-Owned':'Nuevo';
          let unit=await first(`inventory_units?select=*&serial_number=ilike.${encodeURIComponent(item.serial)}&limit=1`);
          if(unit&&unit.status!=='available')throw new Error(`El serial ${item.serial} ya está asignado o vendido.`);
          if(!unit){
            const created=await req('inventory_units',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
              variant_id:v?.id||item.variant_id||null,product_name:v?.product_name||item.product_name,model:item.model_code||item.model||v?.model||null,
              serial_number:item.serial,imei:item.imei||null,commercial_condition:condition,
              general_condition:condition==='Pre-Owned'?item.general_condition:'Nuevo',
              battery_health_pct:condition==='Pre-Owned'?item.battery_health_pct:null,notes:item.note||null,status:'available',
              created_by_email:actor.email||actor.mode||null,updated_at:new Date().toISOString()
            })});
            unit=Array.isArray(created)?created[0]:created;
          }
          await req('order_unit_assignments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
            pedido_id:pedido.id,pedido_item_id:row.id,unit_id:unit.id,slot_index:1,active:true,assigned_by_email:actor.email||actor.mode||null
          })});
          await req(`inventory_units?id=eq.${encodeURIComponent(unit.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'assigned',updated_at:new Date().toISOString()})});
        }catch(unitErr){
          if(/inventory_units|order_unit_assignments|schema cache|relation .* does not exist/i.test(clean(unitErr.message)))
            throw new Error('Falta ejecutar supabase_v13_63_unidades_fisicas.sql antes de registrar seriales directamente en la venta.');
          throw unitErr;
        }
      }
      if(reserve.length){
        const rpc=await fetch(`${url}/rest/v1/rpc/ts_reserve_inventory`,{method:'POST',headers:sh,body:JSON.stringify({p_pedido_id:pedido.id,p_items:reserve,p_minutes:10080})});
        const rd=await rpc.json().catch(()=>({})); if(!rpc.ok)throw new Error(rd?.message||rd?.error||'No se pudo reservar inventario');
      }
      try{await req('admin_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:actor.email||actor.mode||null,action:'pos_sale_created',entity_type:'pedido',entity_id:String(pedido.id),after_data:{codigo:code,channel:'presencial',items:itemRows.length,subtotal_usd:subtotal,discount_usd:discountUsd,discount_type:discountType,discount_value:discountValue,discount_reason:discountReason||null,total_usd:total}})})}catch(_){}
    }catch(e){
      try{await req(`pedidos?id=eq.${encodeURIComponent(pedido.id)}`,{method:'DELETE'})}catch(_){}
      throw e;
    }

    return r(200,{ok:true,fx_quote:fxQuote,pricing:{subtotal_usd:subtotal,discount_type:discountType,discount_value:discountValue,discount_usd:discountUsd,discount_reason:discountReason,total_usd:total},pedido:{...pedido,codigo:code},customer:{registered:!!customer,...guest},items:variants.map(x=>({sku:x.v?.sku||x.item.sku||'',product_name:x.v?.product_name||x.item.product_name,model:x.v?.model||x.item.model||'',color:x.v?.color||x.item.color||'',capacity:x.v?.capacity||x.item.capacity||'',condition:x.item.is_preorder?'Pre-Order':(x.v?.condition||x.item.condition||'Nuevo'),is_preorder:x.item.is_preorder})),message:'Venta presencial guardada en espera de confirmación de pago. El stock se reservó únicamente para los productos vendidos desde existencia; las Pre-Orders no consumen stock.'});
  }catch(e){console.error('admin-create-sale',e);return r(500,{ok:false,error:e.message||'No se pudo registrar la venta'})}
}
