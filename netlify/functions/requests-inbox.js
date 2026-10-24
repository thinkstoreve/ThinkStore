'use strict';
const {randomUUID}=require('node:crypto');
const {authenticateInternal,mainConfig}=require('./staff-auth-core');
const C=require('./_whatsapp-core');
const TYPES=['think_care','sale','support','appointment','technical_visit','business','general'];
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const s=(v,n=150)=>String(v??'').trim().slice(0,n);
function supportConfig(){return {url:s(process.env.SUPPORT_SUPABASE_URL,200).replace(/\/$/,''),service:s(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY,500)}}
async function db(conf,path,method='GET',body){
 if(!conf.url||!conf.service)throw Error('Falta configurar el servidor de '+(conf.url?'Supabase':'Soporte'));
 const r=await fetch(conf.url+'/rest/v1/'+path,{method,signal:AbortSignal.timeout(12000),headers:{apikey:conf.service,Authorization:'Bearer '+conf.service,'Content-Type':'application/json',Prefer:(path.startsWith('think_care_requests?on_conflict=')?'resolution=ignore-duplicates,':'')+'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json().catch(()=>null);if(!r.ok){const e=Error(s(data?.message||data?.error||'Base de datos no disponible',250));e.status=r.status;throw e}return data;
}
async function auth(event){
 const main=await authenticateInternal(event);if(main.ok)return main;
 const conf=supportConfig(),token=s(event.headers?.authorization||event.headers?.Authorization,5000);
 if(!conf.service||!token.startsWith('Bearer '))return main;
 const r=await fetch(conf.url+'/auth/v1/user',{headers:{apikey:conf.service,Authorization:token},signal:AbortSignal.timeout(10000)});if(!r.ok)return main;
 const u=await r.json();if(!u.id||!u.email)return main;
 const rows=await db(conf,'service_users?select=rol,activo&email=eq.'+encodeURIComponent(u.email)+'&limit=1'),p=rows?.[0];
 const roles={superadmin:'superadmin',admin:'admin',reception:'recepcion',sales:'vendedor',technician:'tecnico'};
 return p&&p.activo!==false&&roles[p.rol]?{ok:true,user_id:u.id,email:u.email,role:roles[p.rol]}:main;
}
async function manage(a,b,action,data){return db(mainConfig(),'rpc/ts_manage_request','POST',{p_id:b.id,p_revision:b.revision,p_actor:a.user_id,p_email:a.email,p_action:action,p_data:data})}
exports.handler=async event=>{
 const origin=s(event.headers?.origin||event.headers?.Origin,200),trusted=['https://thinkstore.com.ve','https://www.thinkstore.com.ve','https://soporte.thinkstore.com.ve'];
 const headers={'Content-Type':'application/json','Cache-Control':'no-store',Vary:'Origin',...(trusted.includes(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}:{})};
 const out=(statusCode,b)=>({statusCode,headers,body:JSON.stringify(b)});
 if(origin&&!trusted.includes(origin))return out(403,{error:'Origen no permitido'});
 if(event.httpMethod==='OPTIONS')return out(204,{});
 if(!['GET','POST'].includes(event.httpMethod))return out(405,{error:'Método no permitido'});
 try{
  const a=await auth(event);if(!a.ok)return out(401,{error:'Inicia sesión en App Ventas, Administración o Soporte'});
  if(!['admin','superadmin','vendedor','recepcion','soporte','tecnico','logistica'].includes(a.role))return out(403,{error:'Rol sin acceso'});
  const canManage=['admin','superadmin','vendedor','recepcion','soporte'].includes(a.role),canConvert=['admin','superadmin','recepcion','soporte'].includes(a.role);
  const q=event.queryStringParameters||{},main=mainConfig();
  if(event.httpMethod==='GET'){
   if(q.mode==='count'){
    const rows=await db(main,'think_care_requests?select=id,status,updated_at&status=in.(new,contacted,quoted)&order=created_at.desc&limit=1000');
    return out(200,{ok:true,pending:rows.length,new_count:rows.filter(x=>x.status==='new').length,latest:rows[0]?.id||null});
   }
   if(q.id){if(!UUID.test(q.id))return out(400,{error:'Referencia inválida'});const history=await db(main,'thinkstore_request_events?request_id=eq.'+q.id+'&order=created_at.desc&limit=100');return out(200,{ok:true,history})}
   const rows=await db(main,'think_care_requests?select=*&order=created_at.desc&limit=500');
   let staff=[],support_error=null;
   try{staff=await db(supportConfig(),'service_users?select=email,nombre,rol&activo=eq.true&rol=in.(technician,admin,superadmin)&limit=200')}catch{support_error='No se pudo consultar Soporte. La conversión y los cobros requieren esa conexión.'}
   let orders=[];const ids=rows.map(x=>x.linked_order_id).filter(x=>/^\d+$/.test(x||''));
   if(ids.length)try{orders=await db(supportConfig(),'service_orders?select=id,code,status,quote_amount,amount_paid,payment_status,inventory_consumed,direct_parts_cost&thinkstore_request_id=in.('+rows.filter(x=>x.linked_order_id).map(x=>x.id).join(',')+')&limit=500')}catch{support_error='No se pudieron consultar los importes actuales de Soporte';}
   const byId=new Map(orders.map(o=>[String(o.id),o]));
   return out(200,{ok:true,rows:rows.map(r=>({...r,conversion_payload:undefined,order:byId.get(r.linked_order_id)||null})),staff,can_manage:canManage,can_convert:canConvert,support_error,partial:rows.length===500});
  }
  if(!canManage)return out(403,{error:'Tu rol tiene acceso de consulta'});
  let b;try{b=JSON.parse(event.body||'{}')}catch{return out(400,{error:'Datos inválidos'})}
  if(b.action==='create'){
   if(!TYPES.includes(b.request_type)||!UUID.test(b.client_id||'')||!s(b.name,100)||!/^\+?[\d\s()-]{8,30}$/.test(b.phone||'')||!s(b.device,100)||!s(b.problem,1500))return out(400,{error:'Completa nombre, teléfono, tipo, equipo o producto y descripción'});
   const row={id:b.client_id,intake_key:b.client_id,name:s(b.name,100),phone:s(b.phone,30),email:s(b.email,200)||null,device:s(b.device,100),request_type:b.request_type,service:['Essential','Lab Mobile','Pickup','Business'].includes(b.service)?b.service:'Essential',location:s(b.location,150)||'Pendiente de confirmar',problem:s(b.problem,1500),source:'internal-'+a.role,status:'new'};
   await db(main,'think_care_requests?on_conflict=id','POST',[row]);return out(201,{ok:true,id:row.id});
  }
  if(!UUID.test(b.id||'')||!Number.isInteger(b.revision))return out(400,{error:'Referencia o versión inválida'});
  if(b.action==='notify'){
   const rows=await db(main,'think_care_requests?id=eq.'+b.id+'&limit=1'),r=rows[0];if(!r)return out(404,{error:'Solicitud no encontrada'});if(r.revision!==b.revision)return out(409,{error:'Actualiza la solicitud antes de enviar'});if(r.status==='cancelled')return out(409,{error:'La solicitud está cancelada'});
   let technician='',completed=false;if(r.assigned_email){const u=await db(supportConfig(),'service_users?select=nombre&email=eq.'+encodeURIComponent(r.assigned_email)+'&activo=eq.true&limit=1');technician=u[0]?.nombre||r.assigned_email;}
   if(r.linked_order_id){const o=await db(supportConfig(),'service_orders?select=status&id=eq.'+encodeURIComponent(r.linked_order_id)+'&limit=1');completed=/^(entregado|finalizado|completado)$/i.test(o[0]?.status||'');}
   const result=await require('./_request-notifications').notify(b.stage,r,{technician,completed,eta:s(b.eta,80),summary:s(b.summary,500)});
   return out(result.status==='sent'?200:409,{ok:result.status==='sent',result,error:result.status==='sent'?undefined:result.reason||'No se confirmó el envío. Revisa el historial antes de reintentar.'});
  }
  if(b.action==='update'){
   const data={status:b.status,note:s(b.note,1200),quote_details:s(b.quote_details,1500),quote_amount:b.quote_amount===''?null:b.quote_amount,assigned_email:s(b.assigned_email,200).toLowerCase(),scheduled_at:b.scheduled_at||null,confirmation:s(b.confirmation,1200)};
   if(data.quote_amount!==null&&(!Number.isFinite(Number(data.quote_amount))||Number(data.quote_amount)<0||Number(data.quote_amount)>1000000||Math.abs(Math.round(Number(data.quote_amount)*100)-Number(data.quote_amount)*100)>0.00001))return out(400,{error:'Cotización inválida; usa como máximo dos decimales'});
   if(data.status==='scheduled'&&(!Number.isFinite(Date.parse(data.scheduled_at))||Date.parse(data.scheduled_at)<Date.now()-300000))return out(400,{error:'Selecciona fecha y hora futuras'});
   if(data.assigned_email){const staff=await db(supportConfig(),'service_users?select=email&activo=eq.true&email=eq.'+encodeURIComponent(data.assigned_email)+'&rol=in.(technician,admin,superadmin)&limit=1');if(!staff.length)return out(400,{error:'Selecciona un técnico activo de Soporte'})}
   const row=await manage(a,b,'update',data);return out(200,{ok:true,row});
  }
  if(b.action==='approve'){const row=await manage(a,b,'approve',{evidence:s(b.evidence,1200)});return out(200,{ok:true,row})}
  if(b.action==='convert'){
   if(!canConvert)return out(403,{error:'La conversión requiere Recepción, Soporte o Administración'});
   const r=await manage(a,b,'prepare_conversion',{confirmation:s(b.confirmation,1200)});
   if(r.linked_order_id)return out(200,{ok:true,order_id:r.linked_order_id,order_code:r.linked_order_code,duplicate:true});
   // Dos transacciones locales. La clave única en Soporte permite recuperar un fallo entre ambas sin duplicar.
   const o=await db(supportConfig(),'rpc/ts_order_from_request','POST',{p_data:r.conversion_payload});
   await manage(a,b,'finish_conversion',{order_id:String(o.id),order_code:o.code});
   return out(200,{ok:true,order_id:String(o.id),order_code:o.code});
  }
  return out(400,{error:'Acción no disponible'});
 }catch(e){console.error('requests-inbox',s(e.message,250));return out(e.status===400?400:409,{error:s(e.message,250)||'No se pudo completar la operación. Actualiza y vuelve a intentar.'})}
};
exports._test={UUID,TYPES,auth,db};
exports.authenticate=auth;
