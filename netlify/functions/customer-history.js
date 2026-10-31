'use strict';
const Auth=require('./staff-auth-core'),C=require('./customer-history-core');
const UUID=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const H={'Content-Type':'application/json','Cache-Control':'no-store'};
const out=(statusCode,b)=>({statusCode,headers:H,body:JSON.stringify(b)});
async function rows(conf,path,options={}){const r=await fetch(conf.url.replace(/\/$/,'')+'/rest/v1/'+path,{...options,headers:{...Auth.svc(conf.service),...(options.headers||{})}});const d=await r.json();if(!r.ok||(!Array.isArray(d)&&options.method!=='POST'))throw Error('No se pudo consultar una fuente del historial.');return d;}
async function all(conf,path,max=10000){const result=[];for(let offset=0;offset<max;offset+=500){const page=await rows(conf,path+'&limit=500&offset='+offset);result.push(...page);if(page.length<500)return result;}throw Error('El historial supera el límite de consulta; requiere paginación adicional.');}
async function loadCustomer(conf,b){if(b.customer_id){if(!UUID.test(b.customer_id))return null;let list=await rows(conf,'clientes?select=*&id=eq.'+b.customer_id+'&limit=1');if(list[0])return list[0];list=await rows(conf,'ts_imported_customers?select=*&id=eq.'+b.customer_id+'&limit=1');return list[0]||null;}if(UUID.test(b.order_id||'')){const orders=await rows(conf,'pedidos?select=*&id=eq.'+b.order_id+'&limit=1');const r=orders[0];if(r?.cliente_id)return loadCustomer(conf,{customer_id:r.cliente_id});if(r)return {id:r.id,nombre:r.guest_name,correo:r.guest_email,telefono:r.guest_phone,cedula_rif:r.guest_document,source:'panel_order',order_id:r.id,pos_source:r.pos_source};}return null;}
async function relatedImports(conf,customer){
 const t=C.identity(customer),filters=[];
 if(t.document)filters.push('cedula_rif=ilike.'+encodeURIComponent('*'+t.document+'*'));
 for(const em of t.emails)filters.push('correos=cs.'+encodeURIComponent(JSON.stringify([em])));
 for(const p of t.phones)filters.push('telefonos=cs.'+encodeURIComponent(JSON.stringify(['+'+p])));
 const pages=await Promise.all(filters.map(filter=>rows(conf,'ts_imported_customers?select=*&'+filter+'&order=id.asc&limit=201')));
 if(pages.some(page=>page.length>200))throw Error('Hay demasiadas coincidencias; revisa la identidad del cliente.');
 const result=new Map();for(const r of pages.flat())if(r.id===customer.id||C.matches(customer,r))result.set(r.id,r);
 if(customer.source_key)result.set(customer.id,customer);
 return [...result.values()];
}
exports.handler=async e=>{
 if(e.httpMethod!=='POST')return out(405,{ok:false,error:'Método no permitido.'});
 try{const a=await Auth.authenticateInternal(e);if(!a.ok)return out(401,{ok:false,error:'Inicia sesión para consultar la ficha.'});if(!['admin','superadmin','vendedor','recepcion','soporte'].includes(a.role))return out(403,{ok:false,error:'Tu rol no puede consultar esta ficha.'});
 const conf=Auth.mainConfig();let b;try{b=JSON.parse(e.body||'{}');}catch{return out(400,{ok:false,error:'Solicitud inválida.'});}
 const customer=await loadCustomer(conf,b);if(!customer)return out(404,{ok:false,error:'No se encontró un cliente válido para esta ficha.'});
 if(b.action==='save_origin'){
  if(!['admin','superadmin'].includes(a.role))return out(403,{ok:false,error:'Solo administración puede confirmar el origen.'});
  if(customer.source_key)return out(409,{ok:false,error:'Este registro conserva su origen FileMaker.'});
  if(!['website','panel','web_appointment','unknown'].includes(b.origin)||C.clean(b.evidence).length<10)return out(400,{ok:false,error:'Indica el origen confirmado y una referencia de al menos 10 caracteres.'});
  const row={customer_id:customer.id,origin:b.origin,evidence:C.clean(b.evidence).slice(0,500),recorded_by:a.user_id,recorded_at:new Date().toISOString()};await rows(conf,'ts_customer_origins?on_conflict=customer_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(row)});return out(200,{ok:true,origin:row});
 }
 const warnings=[],origins=await rows(conf,'ts_customer_origins?select=origin,evidence,recorded_at&customer_id=eq.'+customer.id+'&limit=1');
 let legacy=[];try{const related=await relatedImports(conf,customer);if(related.length)legacy=await all(conf,'ts_customer_repair_history?select=id,record_id,device,status,order_code,received_at,received_raw&customer_id=in.('+related.map(r=>r.id).join(',')+')&order=received_at.desc.nullslast,id.asc');}catch{warnings.push('No se pudo consultar el historial de FileMaker.');}
 const support={url:C.clean(process.env.SUPPORT_SUPABASE_URL||'https://tnezvnziqnjxhcwjtcuy.supabase.co'),service:C.clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY)};
 let orders=[],appointments=[];
 if(support.service){const sections=await Promise.allSettled([all(support,'service_orders?select=id,code,client_name,client_email,client_phone,device_type,device_model,status,created_at,delivered_at,reception_checklist&order=id.asc'),all(support,'service_appointments?select=id,client_name,client_email,client_phone,device_type,device_model,preferred_date,preferred_time,status,source&order=id.asc')]);if(sections[0].status==='fulfilled')orders=sections[0].value.filter(r=>C.matches(customer,r));else warnings.push('No se pudo consultar Soporte ThinkStore.');if(sections[1].status==='fulfilled')appointments=sections[1].value.filter(r=>C.matches(customer,r));else warnings.push('No se pudieron consultar las citas.');}else warnings.push('La conexión con Soporte no está disponible.');
 let origin=origins[0]||null;if(!origin&&customer.source==='panel_order'&&customer.pos_source)origin={origin:'panel',evidence:'Venta presencial registrada desde el panel.'};
 return out(200,{ok:true,customer:{id:customer.id,name:customer.nombre||'',email:customer.correo||'',phone:customer.telefono||'',document:customer.cedula_rif||''},can_edit_origin:['admin','superadmin'].includes(a.role)&&!customer.source_key,...C.summarize({customer,origin,legacy,orders,appointments,warnings})});
 }catch{return out(502,{ok:false,error:'No se pudo cargar el historial. Intenta nuevamente.'});}
};
module.exports._test={loadCustomer,relatedImports,all};
