const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'POST,OPTIONS'};
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const reply=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});

exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return reply(200,{ok:true});
  if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Método no permitido'});
  const url=clean(process.env.SUPABASE_URL).replace(/\/$/,'');
  const service=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!url||!service)return reply(501,{ok:false,error:'Faltan variables de Supabase'});
  const sh={apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'};

  async function auth(){
    const legacy=clean(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']||'');
    const allowed=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String);
    if(legacy&&allowed.includes(legacy))return{ok:true,mode:'legacy',email:'admin'};
    const token=clean(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
    if(!token)return{ok:false};
    const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});
    const u=await ur.json().catch(()=>({}));
    if(!ur.ok||!u.id)return{ok:false};
    const pr=await fetch(`${url}/rest/v1/profiles?select=id,role,active&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:sh});
    const rows=await pr.json().catch(()=>[]),p=rows[0],role=norm(p?.role);
    if(!p||p.active===false||!['admin','superadmin','super_admin','administrator','gerente','vendedor','logistica'].includes(role))return{ok:false};
    return{ok:true,user_id:u.id,email:u.email||'',role};
  }
  const actor=await auth();
  if(!actor.ok)return reply(401,{ok:false,error:'Acceso no autorizado'});

  let b={};try{b=JSON.parse(event.body||'{}')}catch{return reply(400,{ok:false,error:'JSON inválido'})}
  async function req(path,options={}){
    const rr=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...sh,...(options.headers||{})}});
    const text=await rr.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
    if(!rr.ok){const e=new Error(data?.message||data?.details||data?.error||`Supabase ${rr.status}`);e.data=data;e.status=rr.status;throw e}
    return data;
  }
  async function findOrder(){
    if(b.pedido_id){
      const rows=await req(`pedidos?select=*,pedido_items(*)&id=eq.${encodeURIComponent(clean(b.pedido_id))}&limit=1`);
      return rows?.[0]||null;
    }
    const code=clean(b.code);
    if(!code)return null;
    let rows=await req(`pedidos?select=*,pedido_items(*)&codigo=eq.${encodeURIComponent(code)}&limit=1`);
    if(!rows?.length)rows=await req(`pedidos?select=*,pedido_items(*)&codigo=ilike.${encodeURIComponent(code)}&limit=1`);
    return rows?.[0]||null;
  }
  const itemName=i=>clean(i?.producto||i?.product_name||i?.product||i?.nombre||'Producto');
  const itemCondition=i=>clean(i?.condicion||i?.condition||'Nuevo');
  const itemQty=i=>Math.max(1,Number(i?.cantidad||i?.qty||1)||1);
  const isPhone=name=>/\biphone\b|smartphone|telefono|teléfono/i.test(clean(name));
  const isPreOwned=v=>/pre.?owned|renovado|reacondicionado|refurbished|renewed/i.test(clean(v));
  async function resolveVariantForItem(item){
    try{
      const product=itemName(item),color=clean(item?.color),capacity=clean(item?.capacidad||item?.capacity||item?.config),condition=itemCondition(item);
      const rows=await req(`inventory_variants?select=id,product_name,color,capacity,condition&product_name=eq.${encodeURIComponent(product)}&active=eq.true&limit=100`);
      const ck=isPreOwned(condition)?'preowned':'nuevo';
      const n=v=>norm(v).replace(/\s+/g,'');
      const match=(rows||[]).find(v=>{
        const vk=isPreOwned(v.condition)?'preowned':/nuevo|new/i.test(clean(v.condition))?'nuevo':norm(v.condition);
        return vk===ck&&(!color||n(v.color)===n(color))&&(!capacity||n(v.capacity)===n(capacity)||n(capacity).includes(n(v.capacity)));
      });
      return match?.id||null;
    }catch(_){return null}
  }
  const unitPublic=u=>({
    id:u.id,variant_id:u.variant_id||null,product_name:u.product_name,model:u.model||'',serial_number:u.serial_number,
    imei:u.imei||'',commercial_condition:u.commercial_condition||'Nuevo',general_condition:u.general_condition||'',
    battery_health_pct:u.battery_health_pct??null,notes:u.notes||'',status:u.status
  });
  async function assignmentsFor(order){
    const a=await req(`order_unit_assignments?select=*&pedido_id=eq.${encodeURIComponent(order.id)}&active=eq.true&order=pedido_item_id.asc,slot_index.asc`);
    const ids=[...new Set((a||[]).map(x=>x.unit_id).filter(Boolean))];
    let units=[];
    if(ids.length)units=await req(`inventory_units?select=*&id=in.(${ids.map(x=>`"${String(x).replace(/"/g,'')}"`).join(',')})`);
    const map=new Map((units||[]).map(u=>[String(u.id),u]));
    return (a||[]).map(x=>({...x,unit:map.get(String(x.unit_id))?unitPublic(map.get(String(x.unit_id))):null}));
  }
  function coverage(order,assignments){
    const items=Array.isArray(order?.pedido_items)?order.pedido_items:[];
    const slots=items.reduce((n,i)=>n+itemQty(i),0);
    const active=(assignments||[]).filter(x=>x.active!==false).length;
    return{required:slots,assigned:active,complete:slots>0&&active>=slots};
  }
  async function invalidateNotes(orderId,reason){
    try{
      await req(`delivery_note_versions?pedido_id=eq.${encodeURIComponent(orderId)}&status=eq.active`,{
        method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'invalidated',invalidated_at:new Date().toISOString(),invalidated_reason:clean(reason)||'Cambio de unidad asignada'})
      });
    }catch(_){}
  }
  async function audit(action,entityId,beforeData,afterData){
    try{
      await req('admin_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({
        actor_email:actor.email||actor.mode||null,action,entity_type:'inventory_unit',entity_id:String(entityId||''),before_data:beforeData||null,after_data:afterData||null
      })});
    }catch(_){}
  }

  const action=clean(b.action);
  try{
    if(action==='summaries'){
      const rows=await req('order_unit_assignments?select=pedido_id,pedido_item_id,slot_index,unit_id,active&active=eq.true&limit=2000');
      const counts={};for(const x of rows||[])counts[String(x.pedido_id)]=(counts[String(x.pedido_id)]||0)+1;
      return reply(200,{ok:true,counts});
    }

    if(action==='units_list'){
      const status=clean(b.status),q=clean(b.q);
      let path='inventory_units?select=*&order=updated_at.desc,created_at.desc&limit=1000';
      if(status)path+=`&status=eq.${encodeURIComponent(status)}`;
      const rows=await req(path);
      const filtered=q?(rows||[]).filter(u=>JSON.stringify(u).toLowerCase().includes(q.toLowerCase())):(rows||[]);
      return reply(200,{ok:true,rows:filtered.map(unitPublic)});
    }

    if(action==='unit_create'){
      const product=clean(b.product_name),serial=clean(b.serial_number),imei=clean(b.imei);
      const condition=isPreOwned(b.commercial_condition)?'Pre-Owned':'Nuevo';
      const general=condition==='Pre-Owned'?clean(b.general_condition):'Nuevo';
      const batteryRaw=b.battery_health_pct,battery=batteryRaw===''||batteryRaw===null||batteryRaw===undefined?null:Number(batteryRaw);
      if(!product||!serial)return reply(400,{ok:false,error:'Producto y serial son obligatorios'});
      if(isPhone(product)&&!imei)return reply(400,{ok:false,error:'El IMEI es obligatorio para teléfonos'});
      if(condition==='Pre-Owned'){
        if(!['Excelente','Bueno','Bien'].includes(general))return reply(400,{ok:false,error:'Selecciona condición general'});
        if(!Number.isInteger(battery)||battery<1||battery>100)return reply(400,{ok:false,error:'La salud de batería debe estar entre 1 y 100%'});
      }
      const row={
        variant_id:clean(b.variant_id)||null,product_name:product,model:clean(b.model)||null,serial_number:serial,imei:imei||null,
        commercial_condition:condition,general_condition:general||null,battery_health_pct:condition==='Pre-Owned'?battery:null,
        notes:clean(b.notes)||null,status:'available',created_by_email:actor.email||actor.mode||null,updated_at:new Date().toISOString()
      };
      const rows=await req('inventory_units',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
      const unit=rows?.[0];await audit('inventory_unit_created',unit?.id||serial,null,row);
      return reply(200,{ok:true,row:unitPublic(unit)});
    }

    if(action==='order_summary'){
      const order=await findOrder();if(!order)return reply(404,{ok:false,error:'Pedido no encontrado'});
      const assignments=await assignmentsFor(order),cov=coverage(order,assignments);
      const available=await req('inventory_units?select=*&status=eq.available&order=product_name.asc,created_at.desc&limit=500');
      return reply(200,{ok:true,order:{id:order.id,code:order.codigo||order.code,estado:order.estado||order.status,items:order.pedido_items||[]},assignments,coverage:cov,available_units:(available||[]).map(unitPublic)});
    }

    if(action==='assign'){
      const order=await findOrder();if(!order)return reply(404,{ok:false,error:'Pedido no encontrado'});
      const status=norm(order.estado||order.status||''),channel=norm(order.order_channel||order.channel||'online');
      const paymentReady=/pago verificado|preparando|comprando proveedor|transito|disponible|enviado|entregado/.test(status)||channel==='presencial';
      if(!paymentReady)return reply(409,{ok:false,payment_required:true,error:'Confirma el pago antes de asignar una unidad física al pedido.'});
      const itemId=clean(b.pedido_item_id),slot=Math.max(1,Number(b.slot_index||1)||1);
      const item=(order.pedido_items||[]).find(i=>String(i.id)===itemId);
      if(!item)return reply(404,{ok:false,error:'Producto del pedido no encontrado'});
      if(slot>itemQty(item))return reply(400,{ok:false,error:'La posición de unidad no corresponde a la cantidad comprada'});

      let unit=null;
      const existingUnitId=clean(b.unit_id);
      if(existingUnitId){
        const rows=await req(`inventory_units?select=*&id=eq.${encodeURIComponent(existingUnitId)}&limit=1`);
        unit=rows?.[0]||null;
        if(!unit)return reply(404,{ok:false,error:'Unidad física no encontrada'});
        if(unit.status!=='available'){
          const active=await req(`order_unit_assignments?select=pedido_id,pedido_item_id,slot_index&unit_id=eq.${encodeURIComponent(unit.id)}&active=eq.true&limit=1`);
          const same=active?.[0]&&String(active[0].pedido_item_id)===itemId&&Number(active[0].slot_index)===slot;
          if(!same)return reply(409,{ok:false,error:'Esta unidad ya está asignada a otro pedido'});
        }
        if(norm(unit.product_name)!==norm(itemName(item)))return reply(409,{ok:false,error:'La unidad seleccionada pertenece a otro producto'});
        const expectedCondition=isPreOwned(itemCondition(item))?'Pre-Owned':'Nuevo';
        if(clean(unit.commercial_condition||'Nuevo')!==expectedCondition)return reply(409,{ok:false,error:'La condición de la unidad no coincide con la variante vendida'});
      }else{
        const product=itemName(item),condition=isPreOwned(itemCondition(item))?'Pre-Owned':'Nuevo';
        const serial=clean(b.serial_number),imei=clean(b.imei),general=condition==='Pre-Owned'?clean(b.general_condition):'Nuevo';
        const batteryRaw=b.battery_health_pct, battery=batteryRaw===''||batteryRaw===null||batteryRaw===undefined?null:Number(batteryRaw);
        if(!serial)return reply(400,{ok:false,error:'El serial es obligatorio'});
        if(isPhone(product)&&!imei)return reply(400,{ok:false,error:'El IMEI es obligatorio para teléfonos'});
        if(condition==='Pre-Owned'){
          if(!['Excelente','Bueno','Bien'].includes(general))return reply(400,{ok:false,error:'Selecciona condición general: Excelente, Bueno o Bien'});
          if(!Number.isInteger(battery)||battery<1||battery>100)return reply(400,{ok:false,error:'La salud de batería Pre-Owned debe estar entre 1 y 100%'});
        }
        const row={
          variant_id:clean(b.variant_id)||await resolveVariantForItem(item),product_name:product,model:clean(b.model)||clean(item.modelo||item.model)||null,
          serial_number:serial,imei:imei||null,commercial_condition:condition,general_condition:general||null,
          battery_health_pct:condition==='Pre-Owned'?battery:null,notes:clean(b.notes)||null,status:'available',
          created_by_email:actor.email||actor.mode||null,updated_at:new Date().toISOString()
        };
        const rows=await req('inventory_units',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
        unit=rows?.[0];
      }

      const previous=await req(`order_unit_assignments?select=*&pedido_item_id=eq.${encodeURIComponent(itemId)}&slot_index=eq.${slot}&active=eq.true&limit=1`);
      if(previous?.[0]&&String(previous[0].unit_id)!==String(unit.id)){
        await req(`order_unit_assignments?id=eq.${encodeURIComponent(previous[0].id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({active:false,released_at:new Date().toISOString(),release_reason:'Reemplazada desde panel ThinkStore'})});
        await req(`inventory_units?id=eq.${encodeURIComponent(previous[0].unit_id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'available',updated_at:new Date().toISOString()})});
      }
      if(!previous?.[0]||String(previous[0].unit_id)!==String(unit.id)){
        await req('order_unit_assignments',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({
          pedido_id:order.id,pedido_item_id:itemId,unit_id:unit.id,slot_index:slot,active:true,assigned_by_email:actor.email||actor.mode||null
        })});
      }
      await req(`inventory_units?id=eq.${encodeURIComponent(unit.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'assigned',updated_at:new Date().toISOString()})});
      await invalidateNotes(order.id,'Unidad física asignada o reemplazada');
      await audit('order_unit_assigned',unit.id,previous?.[0]||null,{pedido_id:order.id,pedido_item_id:itemId,slot_index:slot,serial_number:unit.serial_number,imei:unit.imei||null});

      const assignments=await assignmentsFor(order),cov=coverage(order,assignments);
      return reply(200,{ok:true,unit:unitPublic(unit),assignments,coverage:cov,note_ready:cov.complete});
    }

    if(action==='release'){
      const order=await findOrder();if(!order)return reply(404,{ok:false,error:'Pedido no encontrado'});
      const assignmentId=clean(b.assignment_id);if(!assignmentId)return reply(400,{ok:false,error:'Asignación requerida'});
      const rows=await req(`order_unit_assignments?select=*&id=eq.${encodeURIComponent(assignmentId)}&pedido_id=eq.${encodeURIComponent(order.id)}&active=eq.true&limit=1`);
      const a=rows?.[0];if(!a)return reply(404,{ok:false,error:'Asignación activa no encontrada'});
      await req(`order_unit_assignments?id=eq.${encodeURIComponent(a.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({active:false,released_at:new Date().toISOString(),release_reason:clean(b.reason)||'Liberada desde panel'})});
      await req(`inventory_units?id=eq.${encodeURIComponent(a.unit_id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'available',updated_at:new Date().toISOString()})});
      await invalidateNotes(order.id,'Unidad liberada');
      await audit('order_unit_released',a.unit_id,a,null);
      const assignments=await assignmentsFor(order),cov=coverage(order,assignments);
      return reply(200,{ok:true,assignments,coverage:cov,note_ready:cov.complete});
    }

    return reply(400,{ok:false,error:'Acción no válida'});
  }catch(e){
    const msg=clean(e.message);
    const migration=/inventory_units|order_unit_assignments|delivery_note_versions|relation .* does not exist|schema cache|could not find/i.test(msg);
    const duplicate=/duplicate key|unique constraint/i.test(msg);
    return reply(migration?409:duplicate?409:500,{
      ok:false,migration_required:migration,error:migration?'Ejecuta supabase_v13_63_unidades_fisicas.sql antes de usar asignación de equipos.':duplicate?'El serial o IMEI ya existe, o la unidad ya está asignada.':msg||'Error interno'
    });
  }
};