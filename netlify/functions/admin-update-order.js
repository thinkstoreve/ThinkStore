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
  if(!['resend_delivery_note','view_delivery_note','payment_decision','unlock_payment_decision','delete_order'].includes(action)&&!nextStatus)return reply(400,{ok:false,error:'Estatus requerido'});

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
      id:p?.id,code:p?.codigo||p?.code||'TS',status:p?.estado||p?.status||'',created_at:p?.created_at||p?.fecha||'',note:p?.nota||p?.note||'',
      customerName:c.nombre||c.name||c.full_name||p?.guest_name||'Cliente',customerEmail:c.correo||c.email||p?.guest_email||'',customerPhone:c.telefono||c.phone||p?.guest_phone||'',
      customerDocument:c.cedula_rif||c.document||p?.guest_document||'',customerAddress:c.direccion||c.address||p?.guest_address||'',customerCity:c.ciudad||c.city||p?.guest_city||'',customerState:c.estado||c.state||p?.guest_state||'',
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
    return `<div class="ts-note-doc" style="margin:0;background:#f5f5f7;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1d1f"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:14px 8px"><tr><td align="center"><table role="presentation" width="680" class="ts-note-card" style="max-width:680px;width:100%;background:#fff;border:1px solid #e5e5ea;border-radius:16px;overflow:hidden"><tr><td class="ts-note-head" style="padding:16px 22px 13px;border-bottom:1px solid #e5e5ea"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td valign="middle"><img class="ts-note-logo" src="https://thinkstore.com.ve/logo-thinkstore.png" alt="" width="32" height="32" style="display:block;width:32px;height:32px;object-fit:contain;border:0"></td><td valign="middle" style="padding-left:8px"><span class="ts-note-wordmark" style="display:block;color:#111;font-size:20px;line-height:1;font-weight:800;letter-spacing:-.4px">ThinkStore</span></td></tr></table><h1 class="ts-note-title" style="color:#1d1d1f;margin:13px 0 3px;font-size:23px;line-height:1.15;font-weight:760;letter-spacing:-.35px">${esc(title)}</h1><div class="ts-note-subtitle" style="color:#6e6e73;font-size:12px">${esc(subtitle)}</div></td></tr><tr><td class="ts-note-content" style="padding:16px 22px">${content}${buttonUrl?`<div class="ts-note-action" style="text-align:center;margin:18px 0 2px"><a href="${esc(buttonUrl)}" style="background:#1d1d1f;color:#fff;text-decoration:none;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:700">Ver pedido</a></div>`:''}</td></tr><tr><td class="ts-note-footer" style="background:#f5f5f7;padding:12px;text-align:center;color:#6e6e73;font-size:10px;line-height:1.45"><b style="color:#1d1d1f">ThinkStore</b> · Altamira, Caracas · Venezuela<br>ventas@thinkstore.com.ve</td></tr></table></td></tr></table></div>`;
  }
  function deliveryNoteEmail(p){
    const html=require('./delivery-note-template').render(p);
    const text=`NOTA DE ENTREGA THINKSTORE\nGracias por tu compra, ${p.customerName}.\nPedido: ${p.code}\nCliente: ${p.customerName}\nDocumento: ${p.customerDocument||'No indicado'}\nCorreo: ${p.customerEmail}\nTeléfono: ${p.customerPhone}\nPago: ${p.paymentMethod||'Por confirmar'}\nReferencia: ${p.paymentRef||'No aplica'}\nEstado: ${p.status}\n\n${p.items.map((i,n)=>`${n+1}. ${itemName(i)} | ${[i.color,i.capacidad||i.capacity,i.chip,i.ram,i.model_code].filter(Boolean).join(' · ')} | ${itemCondition(i)} | Serie: ${itemSerial(i)}${itemWarranty(i)?` | Garantía: ${itemWarranty(i)} días`:''} | ${itemQty(i)} x ${money(itemPrice(i))}`).join('\n')}\n\nTotal: ${p.total>0?money(p.total):'A confirmar'}\nSeguimiento: ${trackingUrl(p)}`;
    return{subject:`ThinkStore — Gracias por tu compra | ${p.code}`,text,html,department:'pedidos'};
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

  function paymentLockInfo(p){
    const explicit=norm(p?.payment_decision||'');
    if(explicit)return{decision:explicit,locked:p?.payment_decision_locked===true};
    const st=norm(p?.estado||'');
    if(st.includes('rechaz'))return{decision:'rejected',locked:true,legacy:true};
    if(/pago verificado|preparando|transito|enviado|entregado|disponible/.test(st))return{decision:'approved',locked:true,legacy:true};
    return{decision:'',locked:false};
  }
  function managerRoleAllowed(){
    return auth.mode==='legacy'||['admin','super_admin','superadmin','administrator','gerente'].includes(norm(auth.role));
  }
  async function auditPayment(found,actionName,beforeData,afterData){
    try{await sb('admin_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:auth.email||auth.mode||null,action:actionName,entity_type:'pedido',entity_id:String(found.id),before_data:beforeData||{},after_data:afterData||{}})})}catch(_){ }
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

    if(action==='delete_order'){
      if(!managerRoleAllowed())return reply(403,{ok:false,error:'Solo Gerencia, Admin o Super Admin puede eliminar pedidos.'});
      const status=norm(found.estado||'');
      const lock=paymentLockInfo(found);
      const guide=clean(found.numero_guia||'');
      const advanced=/pago verificado|preparando|comprando proveedor|transito|enviado|disponible|entregado|completado/.test(status);
      if(lock.decision==='approved'||advanced||guide){
        return reply(409,{ok:false,protected:true,error:'Este pedido ya avanzó a una etapa protegida. No puede eliminarse; usa Cancelado y conserva el historial.'});
      }
      const suppliedCode=clean(body.confirmCode||body.confirm_code).toUpperCase();
      const realCode=clean(found.codigo||'').toUpperCase();
      if(!suppliedCode||suppliedCode!==realCode)return reply(400,{ok:false,error:'Confirma el número exacto del pedido para eliminarlo.'});

      // Primero deja el registro en un estado seguro. Si algo posterior falla,
      // la orden no queda activa con stock liberado.
      if(!status.includes('cancel')){
        try{await updatePedido(found,{estado:'Cancelado'})}catch(e){return reply(500,{ok:false,error:'No se pudo cancelar el pedido antes de eliminarlo: '+e.message})}
      }

      const p=normalized(await fullPedido({...found,estado:'Cancelado'}));
      const inventory=await inventoryTransition(p,'Cancelado');
      if(inventory?.ok===false){
        return reply(409,{ok:false,inventory,error:'No se eliminó el pedido porque no se pudo liberar el stock reservado. '+(inventory.error||'')});
      }

      // Auditoría persistente antes del borrado. No depende de la FK del pedido.
      try{await sb('admin_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:auth.email||auth.mode||null,action:'delete_abandoned_order',entity_type:'pedido',entity_id:String(found.id),before_data:{codigo:found.codigo,estado:found.estado,total_usd:found.total_usd,cliente_id:found.cliente_id},after_data:{deleted:true,inventory_released:true,reason:clean(body.reason)||'Pedido no concretado'}})})}catch(_){ }

      // Limpiar registros auxiliares conocidos que pueden tener FK sin cascade.
      for(const table of ['order_status_history','email_delivery_log']){
        try{await sb(`${table}?pedido_id=eq.${encodeURIComponent(found.id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}})}catch(_){ }
      }

      try{
        await sb(`pedidos?id=eq.${encodeURIComponent(found.id)}`,{method:'DELETE',headers:{Prefer:'return=representation'}});
      }catch(e){
        return reply(500,{ok:false,inventory,error:'El stock fue liberado y el pedido quedó Cancelado, pero no pudo eliminarse. '+e.message});
      }
      return reply(200,{ok:true,deleted:true,code:realCode,inventory,message:'Pedido eliminado y stock reservado devuelto a disponible.'});
    }

    if(action==='unlock_payment_decision'){
      if(!managerRoleAllowed())return reply(403,{ok:false,error:'Solo Gerencia o Super Admin puede desbloquear una decisión de pago.'});
      const supplied=clean(body.managerCode);
      const expected=clean(process.env.THINKSTORE_MANAGER_CODE||process.env.THINKSTORE_ADMIN_CODE);
      if(!expected)return reply(501,{ok:false,error:'Configura THINKSTORE_MANAGER_CODE en Netlify para habilitar desbloqueos.'});
      if(!supplied||supplied!==expected)return reply(403,{ok:false,error:'Código de gerente incorrecto.'});
      const reason=clean(body.reason); if(reason.length<5)return reply(400,{ok:false,error:'El motivo del desbloqueo es obligatorio.'});
      const info=paymentLockInfo(found); if(!info.locked)return reply(409,{ok:false,error:'La decisión de pago ya está desbloqueada.'});
      const payload={payment_decision_locked:false,payment_unlocked_at:new Date().toISOString(),payment_unlocked_by:auth.email||auth.user_id||auth.mode||'gerencia',payment_unlock_reason:reason};
      let updated;
      try{updated=await updatePedido(found,payload)}catch(e){
        if(/payment_decision_locked|payment_unlocked|schema cache|column/i.test(clean(e.message)))return reply(409,{ok:false,migration_required:true,error:'Falta aplicar supabase_v12_payment_lock.sql en Supabase antes de usar el desbloqueo.'});
        throw e;
      }
      await auditPayment(found,'unlock_payment_decision',{decision:info.decision,locked:true},{decision:info.decision,locked:false,reason});
      try{await sb('order_status_history',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({pedido_id:found.id,estado:clean(found.estado)||'Pago',nota:`Decisión de pago desbloqueada por Gerencia. Motivo: ${reason}`})})}catch(_){ }
      return reply(200,{ok:true,unlocked:true,pedido:Array.isArray(updated)?updated[0]:updated});
    }

    if(action==='payment_decision'){
      const info=paymentLockInfo(found); if(info.locked)return reply(409,{ok:false,locked:true,error:'La decisión de pago está bloqueada. Solicita a Gerencia el desbloqueo antes de cambiarla.'});
      const approved=body.approved===true||clean(body.approved)==='true';
      const decision=approved?'approved':'rejected'; const status=approved?'Pago verificado':'Pago rechazado';
      const now=new Date().toISOString();
      const payload={estado:status,payment_decision:decision,payment_decision_locked:true,payment_decision_at:now,payment_decision_by:auth.email||auth.user_id||auth.mode||'panel'};
      let updated;
      try{updated=await updatePedido(found,payload)}catch(e){
        if(/payment_decision|schema cache|column/i.test(clean(e.message)))return reply(409,{ok:false,migration_required:true,error:'Falta aplicar supabase_v12_payment_lock.sql en Supabase antes de aprobar o rechazar pagos.'});
        throw e;
      }
      try{await sb('order_status_history',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({pedido_id:found.id,estado:status,nota:approved?'Comprobante revisado y aprobado. Decisión bloqueada.':'Comprobante rechazado. Decisión bloqueada.'})})}catch(_){ }
      await auditPayment(found,approved?'payment_approved_locked':'payment_rejected_locked',{estado:found.estado||'',decision:info.decision||null,locked:false},{estado:status,decision,locked:true});
      const changed=Array.isArray(updated)?updated[0]:found;
      const p=normalized(await fullPedido(changed));
      const statusResult=await send(statusEmail(p),p.customerEmail); await logEmail(p,'estado',statusResult);
      let noteResult={skipped:true}; if(approved){noteResult=await send(deliveryNoteEmail(p),p.customerEmail); await logEmail(p,'nota_entrega',noteResult)}
      const inventory=await inventoryTransition(p,status);
      return reply(200,{ok:true,pedido:changed,normalized:p,email:statusResult,deliveryNoteEmail:noteResult,inventory,payment:{decision,locked:true}});
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
    const lock=paymentLockInfo(found); const target=norm(nextStatus);
    if(lock.locked){
      if(lock.decision==='approved' && (target.includes('rechaz')||target.includes('por verificar')||target.includes('pago recibido'))){
        return reply(409,{ok:false,locked:true,error:'El pago ya fue aprobado y la decisión está protegida. Gerencia debe desbloquearla antes de revertirla.'});
      }
      if(lock.decision==='rejected' && !target.includes('rechaz')&&!target.includes('cancel')){
        return reply(409,{ok:false,locked:true,error:'El pago fue rechazado y la decisión está protegida. Gerencia debe desbloquearla antes de continuar el pedido.'});
      }
    }
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
