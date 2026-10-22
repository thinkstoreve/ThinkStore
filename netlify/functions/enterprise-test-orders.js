'use strict';
const {authorizeManager}=require('./enterprise-finance');
const {mainConfig}=require('./staff-auth-core');
const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
const out=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
exports.handler=async event=>{
 if(!['GET','POST'].includes(event.httpMethod))return out(405,{ok:false,error:'Método no permitido'});
 const {url,service:key}=mainConfig();if(!key)return out(503,{ok:false,error:'Falta la configuración del servidor'});
 try{
  const auth=await authorizeManager(event,url,key);
  if(!auth.ok||!auth.access?.admin)return out(403,{ok:false,error:'Solo administradores pueden eliminar o restaurar ventas de prueba.'});
  const call=async(path,options={})=>{const r=await fetch(url+'/rest/v1/'+path,{...options,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'}});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.message||'No se pudo completar la acción');e.status=r.status;e.code=d.code;throw e}return d};
  if(event.httpMethod==='GET'){
   const rows=await call('ts_test_order_archive?select=order_id,code,reason,status,deleted_at,restored_at&status=eq.deleted&order=deleted_at.desc&limit=100');return out(200,{ok:true,archives:rows});
  }
  let b;try{b=JSON.parse(event.body||'{}')}catch{return out(400,{ok:false,error:'Datos inválidos'})}
  if(!/^[0-9a-f-]{36}$/i.test(b.id||'')||!['preview','delete','restore'].includes(b.action))return out(400,{ok:false,error:'Selecciona una orden y una acción válidas.'});
  const reason=String(b.reason||'').trim().slice(0,500),confirm=String(b.confirm||'').trim();
  if(b.action!=='preview'&&(reason.length<10||b.test_only!==true||!confirm))return out(400,{ok:false,error:'Indica el motivo, escribe la confirmación y declara que es una prueba sin dinero real.'});
  const d=await call('rpc/ts_test_order_action',{method:'POST',body:JSON.stringify({p_id:b.id,p_mode:b.action,p_actor:auth.user.id,p_email:auth.user.email,p_reason:reason,p_confirm:confirm})});return out(200,d);
 }catch(e){return out(e.code==='PGRST202'||e.code==='42P01'?409:400,{ok:false,error:e.code==='PGRST202'||e.code==='42P01'?'Falta activar la migración V15.44 de ventas de prueba.':e.message})}
};
