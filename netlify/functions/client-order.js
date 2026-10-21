exports.handler = async function(event) {
  const headers={
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Headers':'Content-Type, Authorization',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Content-Type':'application/json',
    'Cache-Control':'no-store'
  };
  const reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
  if(event.httpMethod==='OPTIONS') return reply(200,{ok:true});
  if(event.httpMethod!=='POST') return reply(405,{ok:false,error:'Método no permitido'});

  const clean=v=>String(v??'').trim();
  const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const cfg=require('./staff-auth-core').mainConfig();
  const SUPABASE_URL=cfg.url;
  const SERVICE=process.env.SUPABASE_SERVICE_ROLE_KEY||cfg.service;
  if(!SUPABASE_URL||!SERVICE)return reply(501,{ok:false,error:'La integración de pedidos no está configurada.'});

  let body={};try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{ok:false,error:'JSON inválido'})}
  const token=clean(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
  if(!token)return reply(401,{ok:false,error:'Sesión requerida'});

  const userRes=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SERVICE,Authorization:`Bearer ${token}`}});
  const authUser=await userRes.json().catch(()=>({}));
  if(!userRes.ok||!authUser?.id)return reply(401,{ok:false,error:'Tu sesión expiró. Inicia sesión nuevamente.'});

  const baseHeaders={apikey:SERVICE,Authorization:`Bearer ${SERVICE}`,'Content-Type':'application/json'};
  async function sb(path,options={}){
    const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:{...baseHeaders,...(options.headers||{})}});
    const txt=await res.text();let data=null;try{data=txt?JSON.parse(txt):null}catch{data=txt}
    if(!res.ok){const err=new Error(data?.message||data?.error||data?.details||`Error Supabase ${res.status}`);err.data=data;throw err}
    return data;
  }
  async function first(path){const d=await sb(path);return Array.isArray(d)?d[0]:null}

  const code=clean(body.code);
  if(!code)return reply(400,{ok:false,error:'Falta el número de pedido.'});
  let order;
  try{
    order=await first(`pedidos?select=*,clientes(*),pedido_items(*)&codigo=eq.${encodeURIComponent(code)}&cliente_id=eq.${encodeURIComponent(authUser.id)}&limit=1`);
  }catch(e){return reply(500,{ok:false,error:e.message})}
  if(!order)return reply(404,{ok:false,error:'Pedido no encontrado en tu cuenta.'});

  const status=clean(order.estado||'Pedido recibido');
  const statusNorm=norm(status);
  const approved=/pago verificado|preparando|comprando proveedor|transito|disponible|enviado|entregado/.test(statusNorm);
  const canChangeDelivery=()=>{
    if(/entregado|cancelado|enviado|disponible|pago rechazado/.test(statusNorm))return false;
    if(/transito/.test(statusNorm)&&clean(order.numero_guia))return false;
    return true;
  };

  if(body.action==='cancel_order'){
    try{
      const result=await sb('rpc/ts_client_cancel_order',{method:'POST',body:JSON.stringify({p_order_id:order.id,p_customer_id:authUser.id,p_reason:clean(body.reason).slice(0,500)})});
      return reply(200,{ok:true,...result});
    }catch(e){return reply(409,{ok:false,error:/ts_client_cancel_order|schema cache/i.test(e.message)?'La cancelación está temporalmente pendiente de activación. Contacta con ThinkStore.':e.message});}
  }
  if(body.action==='get_status'){
    const fields=['id','codigo','estado','metodo_pago','referencia_pago','metodo_envio','empresa_envio','numero_guia','total_usd','total_bs','subtotal_usd','discount_usd','discount_value','discount_reason','created_at','updated_at'];
    const safe=Object.fromEntries(fields.map(k=>[k,order[k]??null]));
    safe.items=(order.pedido_items||[]).map(i=>({producto:i.producto,color:i.color,capacidad:i.capacidad,cantidad:i.cantidad,precio_usd:i.precio_usd}));
    return reply(200,{ok:true,pedido:safe,payment_verified:approved,note_pending:!approved});
  }
  if(body.action==='report_payment'){
    if(approved||order.payment_decision_locked===true||/cancelado|rechazado|entregado/.test(statusNorm))return reply(409,{ok:false,error:'Este pago ya está en una etapa protegida. Contacta con ThinkStore para corregirlo.'});
    const reference=clean(body.reference);if(reference.length<3||reference.length>160)return reply(400,{ok:false,error:'Escribe una referencia válida de 3 a 160 caracteres.'});
    try{
      await sb('pedidos?id=eq.'+encodeURIComponent(order.id)+'&cliente_id=eq.'+encodeURIComponent(authUser.id),{method:'PATCH',body:JSON.stringify({referencia_pago:reference,estado:'Pago por verificar'})});
      try{await sb('order_status_history',{method:'POST',body:JSON.stringify({pedido_id:order.id,estado:'Pago por verificar',nota:'El cliente reportó el pago. Pendiente de comprobar el abono desde Administración.'})});}catch(_){}
      return reply(200,{ok:true,message:'Pago reportado. ThinkStore revisará el abono.'});
    }catch(e){return reply(500,{ok:false,error:e.message});}
  }

  if(body.action==='update_delivery'){
    if(!canChangeDelivery())return reply(409,{ok:false,error:'La modalidad de entrega ya no puede modificarse porque el envío fue asignado o alcanzó una etapa final.'});
    const method=clean(body.delivery_method);
    const company=clean(body.shipping_company);
    const allowed=['Retiro en tienda','Delivery Caracas','Envío nacional'];
    if(!allowed.includes(method))return reply(400,{ok:false,error:'Modalidad de entrega no válida.'});
    if(method==='Envío nacional'&&!['MRW','Zoom','TEALCA'].includes(company))return reply(400,{ok:false,error:'Selecciona MRW, Zoom o TEALCA.'});
    const payload={metodo_envio:method,empresa_envio:method==='Envío nacional'?company:(method==='Delivery Caracas'?'Delivery ThinkStore':null)};
    try{
      const updated=await sb(`pedidos?id=eq.${encodeURIComponent(order.id)}&cliente_id=eq.${encodeURIComponent(authUser.id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
      try{await sb('order_status_history',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({pedido_id:order.id,estado:status,nota:`Cliente actualizó modalidad de entrega a ${method}${payload.empresa_envio?` · ${payload.empresa_envio}`:''}.`})})}catch(_){}
      return reply(200,{ok:true,pedido:Array.isArray(updated)?updated[0]:updated});
    }catch(e){return reply(500,{ok:false,error:e.message})}
  }

  if(body.action==='view_delivery_note'){
    if(!approved)return reply(409,{ok:false,error:'La nota de entrega estará disponible cuando el pago haya sido aprobado y el equipo físico esté asignado.'});
    try{
      const assignments=await sb(`order_unit_assignments?select=*&pedido_id=eq.${encodeURIComponent(order.id)}&active=eq.true&order=pedido_item_id.asc,slot_index.asc`)||[];
      const ids=[...new Set(assignments.map(a=>a.unit_id).filter(Boolean))];
      let units=[];
      if(ids.length)units=await sb(`inventory_units?select=*&id=in.(${ids.map(x=>`"${String(x).replace(/"/g,'')}"`).join(',')})`)||[];
      const unitMap=new Map(units.map(u=>[String(u.id),u]));
      const byItem=new Map();
      assignments.forEach(a=>{
        const k=String(a.pedido_item_id||'');if(!byItem.has(k))byItem.set(k,[]);
        const u=unitMap.get(String(a.unit_id))||{};
        byItem.get(k).push({slot_index:Number(a.slot_index||1),serial_number:u.serial_number||'',imei:u.imei||'',commercial_condition:u.commercial_condition||'',general_condition:u.general_condition||'',battery_health_pct:u.battery_health_pct??null,unit_notes:u.notes||''});
      });
      const items=Array.isArray(order.pedido_items)?order.pedido_items:[];
      const required=items.reduce((n,i)=>n+Math.max(1,Number(i.cantidad||i.qty||1)||1),0);
      if(required<1||assignments.length<required)return reply(409,{ok:false,note_locked:true,error:`Tu equipo todavía está pendiente de asignación (${assignments.length}/${required}). La nota se habilitará cuando ThinkStore registre el serial/IMEI correspondiente.`});
      order.pedido_items=items.map(i=>({...i,assigned_units:(byItem.get(String(i.id))||[]).sort((a,b)=>a.slot_index-b.slot_index)}));
      try{
        const missing=order.pedido_items.filter(i=>!i.image_url&&!i.image);
        if(missing.length){
          const products=await sb('catalog_products?select=product_name,product_key,image_url&limit=2000');
          const pictures=await sb('catalog_product_images?select=product_key,image_url,is_primary,sort_order&order=sort_order.asc&limit=3000');
          const key=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
          const imageByKey=new Map();for(const im of pictures||[])if(im.image_url&&(!imageByKey.has(im.product_key)||im.is_primary))imageByKey.set(im.product_key,im.image_url);
          const byName=new Map();for(const p of products||[])byName.set(key(p.product_name),imageByKey.get(p.product_key)||p.image_url||'');
          order.pedido_items=order.pedido_items.map(i=>({...i,image_url:i.image_url||i.image||byName.get(key(i.producto||i.product_name||i.nombre))||''}));
        }
      }catch(err){console.warn('Imagen nota cliente',err.message)}
      const html=require('./delivery-note-template').render(order);
      return reply(200,{ok:true,html,coverage:{required,assigned:assignments.length,complete:true}});
    }catch(e){
      if(/order_unit_assignments|inventory_units|relation .* does not exist|schema cache/i.test(clean(e.message)))return reply(409,{ok:false,migration_required:true,error:'La asignación física todavía no está habilitada en el sistema.'});
      return reply(500,{ok:false,error:e.message});
    }
  }

  return reply(400,{ok:false,error:'Acción no válida'});
};
