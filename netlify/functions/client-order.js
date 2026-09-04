exports.handler = async function(event) {
  const headers={
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Headers':'Content-Type, Authorization',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Content-Type':'application/json'
  };
  const reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
  if(event.httpMethod==='OPTIONS') return reply(200,{ok:true});
  if(event.httpMethod!=='POST') return reply(405,{ok:false,error:'Método no permitido'});

  const clean=v=>String(v??'').trim();
  const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const SUPABASE_URL=clean(process.env.SUPABASE_URL).replace(/\/$/,'');
  const SERVICE=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
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
    if(!approved)return reply(409,{ok:false,error:'La nota de entrega estará disponible cuando el pedido haya sido aprobado.'});
    const c=order.clientes||{};
    const items=order.pedido_items||[];
    const total=Number(order.total_usd||0);
    const money=n=>`$${Number(n||0).toFixed(2)}`;
    const itemRows=items.map((i,idx)=>`<tr><td style="padding:10px;border-bottom:1px solid #eee">${idx+1}</td><td style="padding:10px;border-bottom:1px solid #eee"><b>${esc(i.producto||'Producto')}</b><br><small>${esc([i.color,i.capacidad].filter(Boolean).join(' · '))}</small></td><td style="padding:10px;border-bottom:1px solid #eee;text-align:center">${Number(i.cantidad||1)}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${money(i.precio_usd)}</td></tr>`).join('');
    const html=`<div style="max-width:820px;margin:28px auto;padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111"><div style="display:flex;justify-content:space-between;gap:20px;align-items:flex-start"><div><h1 style="margin:0 0 6px">ThinkStore</h1><div style="color:#666">Nota de entrega</div></div><div style="text-align:right"><b>${esc(order.codigo)}</b><br><small>${esc(new Date(order.created_at||Date.now()).toLocaleDateString('es-VE'))}</small></div></div><hr style="border:0;border-top:1px solid #ddd;margin:24px 0"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f7f7f8;border-radius:18px;padding:18px"><div><small>Cliente</small><br><b>${esc(c.nombre||'Cliente')}</b></div><div><small>Correo</small><br><b>${esc(c.correo||authUser.email||'')}</b></div><div><small>Teléfono</small><br><b>${esc(c.telefono||'—')}</b></div><div><small>Entrega</small><br><b>${esc([order.metodo_envio,order.empresa_envio].filter(Boolean).join(' · ')||'Por coordinar')}</b></div></div><table style="width:100%;border-collapse:collapse;margin-top:22px"><thead><tr><th style="text-align:left;padding:10px">#</th><th style="text-align:left;padding:10px">Producto</th><th style="padding:10px">Cant.</th><th style="text-align:right;padding:10px">Precio</th></tr></thead><tbody>${itemRows||'<tr><td colspan="4" style="padding:16px">Sin artículos visibles.</td></tr>'}</tbody></table><div style="text-align:right;font-size:22px;font-weight:800;margin-top:20px">Total: ${total>0?money(total):'Por confirmar'}</div><div style="margin-top:28px;padding:16px;border-radius:16px;background:#eef6ff"><b>Estado:</b> ${esc(status)}<br><small>Documento emitido digitalmente desde tu cuenta ThinkStore.</small></div></div>`;
    return reply(200,{ok:true,html});
  }

  return reply(400,{ok:false,error:'Acción no válida'});
};
