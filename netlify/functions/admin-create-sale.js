exports.handler=async function(event){
  const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'POST,OPTIONS'};
  const r=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
  if(event.httpMethod==='OPTIONS')return r(200,{ok:true});
  if(event.httpMethod!=='POST')return r(405,{ok:false,error:'Método no permitido'});
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
    return{ok:true,user_id:u.id,role};
  }
  if(!(await auth()).ok)return r(401,{ok:false,error:'Acceso no autorizado'});

  let b={}; try{b=JSON.parse(event.body||'{}')}catch{return r(400,{ok:false,error:'JSON inválido'})}
  const email=clean(b.customer_email).toLowerCase(), sku=clean(b.sku), serial=clean(b.serial_number), price=Number(b.price||0), warranty=Number(b.warranty_days||0), payment=clean(b.payment_method||'Efectivo'), paymentRef=clean(b.payment_ref||'');
  if(!email||!email.includes('@'))return r(400,{ok:false,error:'Correo del cliente requerido'});
  if(!sku)return r(400,{ok:false,error:'Selecciona una variante de inventario'});
  if(!serial)return r(400,{ok:false,error:'Número de serie requerido'});
  if(!(price>0))return r(400,{ok:false,error:'Precio de venta requerido'});

  async function req(path,options={}){const rr=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...sh,...(options.headers||{})}});const txt=await rr.text();let d=null;try{d=txt?JSON.parse(txt):null}catch{d=txt};if(!rr.ok){const e=new Error(d?.message||d?.error||d?.details||`Supabase ${rr.status}`);e.data=d;throw e}return d}
  async function first(path){try{const d=await req(path);return Array.isArray(d)?d[0]:null}catch{return null}}

  try{
    let customer=await first(`clientes?select=*&correo=eq.${encodeURIComponent(email)}&limit=1`);
    if(!customer)customer=await first(`clientes?select=*&email=eq.${encodeURIComponent(email)}&limit=1`);
    if(!customer)return r(409,{ok:false,error:'El cliente debe estar registrado en ThinkStore antes de crear una venta manual.'});

    const v=await first(`inventory_variants?select=*&sku=eq.${encodeURIComponent(sku)}&active=eq.true&limit=1`);
    if(!v)return r(404,{ok:false,error:'Variante de inventario no encontrada'});
    const available=Math.max(0,Number(v.stock_on_hand||0)-Number(v.stock_reserved||0));
    if(available<1)return r(409,{ok:false,error:'Esta variante no tiene existencia disponible.'});

    const dup=await first(`pedido_items?select=id&numero_serie=eq.${encodeURIComponent(serial)}&limit=1`);
    if(dup)return r(409,{ok:false,error:'Ese número de serie ya está asociado a otra venta.'});

    // Consecutivo único y progresivo generado por Supabase (mismo flujo que la tienda).
    const cr=await fetch(`${url}/rest/v1/rpc/ts_next_order_code`,{method:'POST',headers:sh,body:'{}'});
    const cd=await cr.json().catch(()=>null);
    if(!cr.ok)throw new Error(cd?.message||cd?.error||'No se pudo generar el consecutivo del pedido');
    const code=String(cd||'').replace(/^"|"$/g,'').trim();
    if(!/^TS-\d{4}-\d{4,}$/.test(code))throw new Error('Supabase devolvió un consecutivo inválido');
    const po=await req('pedidos',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({codigo:code,cliente_id:customer.id,estado:'Pago verificado',metodo_pago:payment,referencia_pago:paymentRef,total_usd:price,metodo_envio:clean(b.delivery_method||'Retiro en tienda')})});
    const pedido=Array.isArray(po)?po[0]:null; if(!pedido?.id)throw new Error('No se pudo crear el pedido');

    try{
      await req('pedido_items',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({pedido_id:pedido.id,producto:v.product_name,color:v.color,capacidad:v.capacity,cantidad:1,precio_usd:price,condicion:v.condition||b.condition||'Renovado',numero_serie:serial,garantia_dias:warranty||null,chip:v.chip||b.chip||null,ram:v.ram||b.ram||null})});
      const rpc=await fetch(`${url}/rest/v1/rpc/ts_reserve_inventory`,{method:'POST',headers:sh,body:JSON.stringify({p_pedido_id:pedido.id,p_items:[{variant_id:v.id,quantity:1}],p_minutes:10080})});
      const rd=await rpc.json().catch(()=>({})); if(!rpc.ok)throw new Error(rd?.message||rd?.error||'No se pudo reservar inventario');
    }catch(e){
      try{await req(`pedidos?id=eq.${encodeURIComponent(pedido.id)}`,{method:'DELETE'})}catch(_){ }
      throw e;
    }

    return r(200,{ok:true,pedido:{...pedido,codigo:code},variant:{id:v.id,sku:v.sku,product_name:v.product_name,model:v.model,color:v.color,capacity:v.capacity,condition:v.condition},message:'Venta creada y stock reservado. La nota de entrega se enviará/reemitirá desde el pedido.'});
  }catch(e){console.error('admin-create-sale',e);return r(500,{ok:false,error:e.message||'No se pudo registrar la venta'})}
}
