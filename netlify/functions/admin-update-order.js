exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  const reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
  if(event.httpMethod==='OPTIONS') return reply(200,{ok:true});
  if(event.httpMethod!=='POST') return reply(405,{ok:false,error:'Método no permitido'});

  const clean=v=>String(v??'').trim();
  const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const SUPABASE_URL=clean(process.env.SUPABASE_URL).replace(/\/$/,'');
  const SERVICE=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!SUPABASE_URL||!SERVICE) return reply(501,{ok:false,error:'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Netlify.'});

  let body={};
  try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{ok:false,error:'JSON inválido'})}

  async function authorizeAdmin(){
    const provided=clean(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']||'');
    const allowed=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String);
    if(provided&&allowed.includes(provided)) return {ok:true,mode:'legacy'};
    const token=clean(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
    if(!token)return{ok:false};
    const ur=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SERVICE,Authorization:`Bearer ${token}`}});
    const u=await ur.json().catch(()=>({}));
    if(!ur.ok||!u.id)return{ok:false};
    const serviceHeaders={apikey:SERVICE,Authorization:`Bearer ${SERVICE}`};
    const pr=await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,role,active&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:serviceHeaders});
    const rows=await pr.json().catch(()=>[]);let p=rows[0]||null;
    if(!p&&u.email){
      const rr=await fetch(`${SUPABASE_URL}/rest/v1/roles_usuarios?select=id,rol,activo&email=ilike.${encodeURIComponent(u.email)}&limit=1`,{headers:serviceHeaders});
      const roleRows=await rr.json().catch(()=>[]);const rp=roleRows[0];if(rp)p={id:rp.id,role:rp.rol,active:rp.activo};
    }
    const r=norm(p?.role);
    if(!p||p.active===false||!['admin','super_admin','superadmin','administrator','gerente','vendedor'].includes(r))return{ok:false};
    return{ok:true,user_id:u.id,email:u.email||'',role:r};
  }
  const auth=await authorizeAdmin();
  if(!auth.ok)return reply(401,{ok:false,error:'Acceso administrador no autorizado'});

  const baseHeaders={apikey:SERVICE,Authorization:`Bearer ${SERVICE}`,'Content-Type':'application/json'};
  async function sb(path,options={}){
    const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:{...baseHeaders,...(options.headers||{})}});
    const txt=await res.text(); let data=null; try{data=txt?JSON.parse(txt):null}catch{data=txt}
    if(!res.ok){const e=new Error(data?.message||data?.error||data?.details||`Error Supabase ${res.status}`);e.data=data;throw e}
    return data;
  }
  async function first(path){try{const d=await sb(path);return Array.isArray(d)?d[0]:null}catch{return null}}

  const incomingId=clean(body.id||body.db_id||body.pedido_id);
  const incomingCode=clean(body.code||body.codigo||body.order_code);
  const action=clean(body.action);
  const nextStatus=clean(body.status||body.estado);
  const guide=clean(body.guideNumber||body.numero_guia||body.guide);
  if(!incomingId&&!incomingCode)return reply(400,{ok:false,error:'ID o código de pedido requerido'});
  if(!['resend_delivery_note','view_delivery_note'].includes(action)&&!nextStatus)return reply(400,{ok:false,error:'Estatus requerido'});

  async function findPedido(){
    const qs=[];
    if(incomingId)qs.push(`pedidos?select=*&id=eq.${encodeURIComponent(incomingId)}&limit=1`);
    if(incomingCode){
      qs.push(`pedidos?select=*&codigo=eq.${encodeURIComponent(incomingCode)}&limit=1`);
      qs.push(`pedidos?select=*&codigo=ilike.${encodeURIComponent(incomingCode)}&limit=1`);
    }
    for(const q of qs){const p=await first(q);if(p)return p}
    return null;
  }
  async function fullPedido(p){
    if(!p)return null;
    let out={...p};
    const loaded=await first(`pedidos?select=*,clientes(*),pedido_items(*)&id=eq.${encodeURIComponent(p.id)}&limit=1`);
    if(loaded)out=loaded;
    if(!out.clientes&&out.cliente_id){const c=await first(`clientes?select=*&id=eq.${encodeURIComponent(out.cliente_id)}&limit=1`);if(c)out.clientes=c}
    if(!out.pedido_items&&out.id){try{out.pedido_items=await sb(`pedido_items?select=*&pedido_id=eq.${encodeURIComponent(out.id)}`)||[]}catch{out.pedido_items=[]}}
    return out;
  }
  function normalized(p){
    const c=p?.clientes||p?.customer||{};
    const items=p?.pedido_items||p?.items||[];
    return {
      id:p?.id,code:p?.codigo||p?.code||'TS',status:p?.estado||p?.status||'',
      customerName:c.nombre||c.name||c.full_name||'Cliente',customerEmail:c.correo||c.email||'',customerPhone:c.telefono||c.phone||'',
      customerDocument:c.cedula_rif||c.document||'',customerAddress:c.direccion||c.address||'',customerCity:c.ciudad||c.city||'',customerState:c.estado||c.state||'',
      paymentMethod:p?.metodo_pago||p?.payment||'',paymentRef:p?.referencia_pago||p?.paymentRef||'',guide:p?.numero_guia||p?.guide||'',shippingCompany:p?.empresa_envio||'',
      total:Number(p?.total_usd||p?.total||0),items:Array.isArray(items)?items:[]
    };
  }
  function itemName(i){return i.producto||i.product_name||i.product||i.nombre||'Producto'}
  function itemCondition(i){return i.condicion||i.condition||'Por confirmar'}
  function itemSerial(i){return i.numero_serie||i.serial_number||i.serial||'Por registrar'}
  function itemWarranty(i){return Number(i.garantia_dias||i.warranty_days||0)||0}
  function itemPrice(i){return Number(i.precio_usd||i.price||0)||0}
  function itemQty(i){return Number(i.cantidad||i.qty||1)||1}
  function money(v){return '$'+Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function trackingUrl(p){return `https://thinkstore.com.ve/?tracking=${encodeURIComponent(p.code)}#estatus`}

  function shell(title,subtitle,content,buttonUrl){
    return `<div style="margin:0;background:#f5f5f7;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1d1f"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="680" style="max-width:680px;width:100%;background:#fff;border-radius:28px;overflow:hidden"><tr><td style="background:#08080c;padding:30px;text-align:center"><img src="https://thinkstore.com.ve/assets/thinkstore-email-logo.jpg" alt="ThinkStore" width="260" style="max-width:90%;background:#fff;border-radius:18px;padding:12px"><h1 style="color:#fff;margin:22px 0 4px;font-size:34px">${esc(title)}</h1><div style="color:#b7b7bd">${esc(subtitle)}</div></td></tr><tr><td style="padding:30px">${content}${buttonUrl?`<div style="text-align:center;margin:28px 0 4px"><a href="${esc(buttonUrl)}" style="background:#111;color:#fff;text-decoration:none;border-radius:999px;padding:14px 24px;font-weight:800">Ver pedido</a></div>`:''}</td></tr><tr><td style="background:#f5f5f7;padding:20px;text-align:center;color:#6e6e73;font-size:13px"><b style="color:#111">ThinkStore</b><br>Altamira, Caracas · Venezuela<br>ventas@thinkstore.com.ve</td></tr></table></td></tr></table></div>`;
  }
  function deliveryNoteEmail(p){
    const rows=p.items.map((i,idx)=>{
      const sub=[i.color,i.capacidad||i.capacity,i.chip,i.ram].filter(Boolean).join(' · ');
      const warranty=itemWarranty(i);
      return `<tr><td style="padding:15px 0;border-bottom:1px solid #ececf1"><b>${idx+1}. ${esc(itemName(i))}</b><br><span style="color:#6e6e73">${esc(sub)}</span><br><span>Condición: <b>${esc(itemCondition(i))}</b></span><br><span>Número de serie: <b>${esc(itemSerial(i))}</b></span>${warranty?`<br><span>Garantía: <b>${warranty} días</b></span>`:''}</td><td align="right" style="padding:15px 0;border-bottom:1px solid #ececf1;white-space:nowrap">${itemQty(i)} × ${money(itemPrice(i))}</td></tr>`
    }).join('')||'<tr><td>Producto por confirmar</td></tr>';
    const content=`<div style="border:1px solid #e3e3ea;border-radius:20px;padding:20px;margin-bottom:18px"><table width="100%" cellpadding="4" style="font-size:15px"><tr><td><b>Nota / pedido</b></td><td align="right">${esc(p.code)}</td></tr><tr><td><b>Cliente</b></td><td align="right">${esc(p.customerName)}</td></tr><tr><td><b>Documento</b></td><td align="right">${esc(p.customerDocument||'No indicado')}</td></tr><tr><td><b>Correo</b></td><td align="right">${esc(p.customerEmail)}</td></tr><tr><td><b>Teléfono</b></td><td align="right">${esc(p.customerPhone)}</td></tr><tr><td><b>Pago</b></td><td align="right">${esc(p.paymentMethod||'Por confirmar')}</td></tr><tr><td><b>Referencia</b></td><td align="right">${esc(p.paymentRef||'No indicada')}</td></tr><tr><td><b>Estado</b></td><td align="right">${esc(p.status)}</td></tr></table></div><div style="border:1px solid #e3e3ea;border-radius:20px;padding:20px;margin-bottom:18px"><h3 style="margin-top:0">Detalle del equipo</h3><table width="100%" cellpadding="0" cellspacing="0">${rows}</table><div style="text-align:right;font-size:20px;font-weight:800;margin-top:18px">Total: ${p.total>0?money(p.total):'A confirmar'}</div></div><div style="font-size:13px;line-height:1.6;color:#6e6e73">Conserva este correo como respaldo de tu compra. La garantía corresponde a la indicada para cada equipo en esta nota.</div>`;
    const html=shell('Nota de entrega',`Pedido ${p.code}`,content,trackingUrl(p));
    const text=`NOTA DE ENTREGA THINKSTORE\nPedido: ${p.code}\nCliente: ${p.customerName}\nDocumento: ${p.customerDocument||'No indicado'}\nCorreo: ${p.customerEmail}\nTeléfono: ${p.customerPhone}\nPago: ${p.paymentMethod||'Por confirmar'}\nReferencia: ${p.paymentRef||'No indicada'}\nEstado: ${p.status}\n\n${p.items.map((i,n)=>`${n+1}. ${itemName(i)} | ${[i.color,i.capacidad||i.capacity,i.chip,i.ram].filter(Boolean).join(' · ')} | ${itemCondition(i)} | Serie: ${itemSerial(i)}${itemWarranty(i)?` | Garantía: ${itemWarranty(i)} días`:''} | ${itemQty(i)} x ${money(itemPrice(i))}`).join('\n')}\n\nTotal: ${p.total>0?money(p.total):'A confirmar'}\nSeguimiento: ${trackingUrl(p)}`;
    return{subject:`ThinkStore — Nota de entrega | ${p.code}`,text,html,department:'pedidos'};
  }
  function statusEmail(p){
    const content=`<div style="background:#f5f5f7;border-radius:20px;padding:22px;font-size:17px;line-height:1.6">Hola <b>${esc(p.customerName)}</b>,<br><br>Tu pedido <b>${esc(p.code)}</b> fue actualizado.<br>Estado actual: <b>${esc(p.status)}</b>.</div>`;
    return{subject:`ThinkStore — ${p.status} | ${p.code}`,text:`Hola ${p.customerName},\n\nTu pedido ${p.code} fue actualizado.\nEstado: ${p.status}\n\n${trackingUrl(p)}\n\nThinkStore`,html:shell('Actualización ThinkStore',`Pedido ${p.code}`,content,trackingUrl(p)),department:'pedidos'};
  }
  async function send(email,to){
    const key=clean(process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY);
    if(!key)return{sent:false,error:'Falta RESEND_API_KEY'};
    if(!to)return{sent:false,error:'Cliente sin correo'};
    const from=process.env.FROM_PEDIDOS_EMAIL||process.env.FROM_EMAIL||'ThinkStore Pedidos <pedidos@thinkstore.com.ve>';
    const rr=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,reply_to:process.env.REPLY_TO_PEDIDOS||'pedidos@thinkstore.com.ve',subject:email.subject,text:email.text,html:email.html})});
    const d=await rr.json().catch(()=>({}));
    return rr.ok?{sent:true,id:d.id||null}:{sent:false,error:d.message||d.error||'Error enviando correo'};
  }
  async function logEmail(p,kind,result){
    try{await sb('email_delivery_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({pedido_id:p.id||null,pedido_codigo:p.code||null,tipo:kind,destinatario:p.customerEmail||null,estado:result?.sent?'enviado':'fallido',provider_id:result?.id||null,error:result?.error||null})})}catch(_){ }
  }
  async function inventoryTransition(p,status){
    const n=norm(status);
    let rpc='',args={};
    // Acepta variantes como "Entregado", "Pedido entregado" o etiquetas visuales.
    if(n.includes('entreg')){rpc='ts_finalize_inventory_sale';args={p_pedido_id:p.id}}
    else if(n.includes('cancel')||n.includes('rechaz')){rpc='ts_release_inventory';args={p_pedido_id:p.id,p_reason:`Liberación por estado: ${status}`}}
    if(!rpc||!p.id)return{skipped:true};
    try{
      const result=await sb(`rpc/${rpc}`,{method:'POST',body:JSON.stringify(args)});
      return{ok:true,rpc,result};
    }catch(e){
      console.error('ThinkStore inventory transition',rpc,p.id,e);
      return{ok:false,rpc,error:e.message};
    }
  }

  async function updatePedido(found,payload){
    const path=`pedidos?id=eq.${encodeURIComponent(found.id)}`;
    const options={method:'PATCH',headers:{Prefer:'return=representation'}};
    try{
      return await sb(path,{...options,body:JSON.stringify({...payload,updated_at:new Date().toISOString()})});
    }catch(error){
      // Algunas instalaciones antiguas de ThinkStore no tienen updated_at en pedidos.
      // No debe impedir el cambio de estado ni el correo transaccional.
      if(!/updated_at|schema cache|column/i.test(clean(error?.message))) throw error;
      console.warn('ThinkStore pedidos sin updated_at; reintentando actualización compatible.');
      return await sb(path,{...options,body:JSON.stringify(payload)});
    }
  }

  try{
    const found=await findPedido();
    if(!found)return reply(404,{ok:false,error:'Pedido no encontrado'});

    const currentStatus=norm(found.estado||'');
    const isClosed=currentStatus.includes('entreg');
    // V1.5.6: una venta entregada queda inmutable. Solo se permiten acciones de lectura/reenvío.
    if(isClosed && !['resend_delivery_note','view_delivery_note'].includes(action)){
      return reply(409,{ok:false,locked:true,error:'Venta cerrada: este pedido ya fue entregado y es de solo lectura.'});
    }

    if(action==='view_delivery_note'){
      const p=normalized(await fullPedido(found));
      const note=deliveryNoteEmail(p);
      return reply(200,{ok:true,pedido:p,html:note.html,text:note.text,subject:note.subject});
    }
    if(action==='resend_delivery_note'){
      const p=normalized(await fullPedido(found));
      const r=await send(deliveryNoteEmail(p),p.customerEmail); await logEmail(p,'nota_entrega_reenvio',r);
      return reply(r.sent?200:502,{ok:r.sent,pedido:p,email:r});
    }

    const before=clean(found.estado);
    const payload={estado:nextStatus}; if(guide)payload.numero_guia=guide;
    const updated=await updatePedido(found,payload);
    const changed=Array.isArray(updated)?updated[0]:found;
    try{await sb('order_status_history',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({pedido_id:found.id,estado:nextStatus,nota:body.note||'Actualizado desde panel ThinkStore'})})}catch(_){ }
    try{await sb('admin_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:auth.email||auth.mode||null,action:'update_order_status',entity_type:'pedido',entity_id:String(found.id),before_data:{estado:before},after_data:{estado:nextStatus,numero_guia:guide||null}})})}catch(_){ }
    const p=normalized(await fullPedido(changed));
    const statusResult=await send(statusEmail(p),p.customerEmail); await logEmail(p,'estado',statusResult);
    let noteResult={skipped:true};
    if(norm(nextStatus)==='pago verificado' && norm(before)!=='pago verificado'){
      noteResult=await send(deliveryNoteEmail(p),p.customerEmail); await logEmail(p,'nota_entrega',noteResult);
    }
    const inventory=await inventoryTransition(p,nextStatus);
    return reply(200,{ok:true,pedido:changed,normalized:p,email:statusResult,deliveryNoteEmail:noteResult,inventory});
  }catch(e){
    console.error('ThinkStore admin-update-order',e);
    return reply(500,{ok:false,error:e.message||'Error interno'});
  }
};
