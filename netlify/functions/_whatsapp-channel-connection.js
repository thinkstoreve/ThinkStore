'use strict';
const C=require('./_whatsapp-core');
const APP='1316000427204759';
async function request(path,body){const c=C.waCfg();const r=await fetch('https://graph.facebook.com/'+c.version+'/'+path,{method:body?'POST':'GET',signal:AbortSignal.timeout(12000),headers:{Authorization:'Bearer '+c.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(d.error?.code===190?'La credencial de Meta no es válida o venció.':'Meta no autoriza a esta aplicación a consultar o conectar la cuenta del +1.'),{status:409});return d;}
function ownCallback(value,path){try{const u=new URL(value);return ['https://thinkstore.com.ve','https://thinkstoreve.netlify.app'].includes(u.origin)&&u.pathname==='/.netlify/functions/'+path&&!u.search&&!u.hash;}catch{return false;}}
async function inspect(){
 if(C.channel()!=='meta-us')return null;
 const c=C.waCfg();if(!c.token||!c.version||!c.wabaId)return {ready:false,can_connect:false,reason:'Falta configurar la conexión privada de Meta.'};
 try{
  const debug=await request('debug_token?input_token='+encodeURIComponent(c.token));if(debug.data?.is_valid!==true||String(debug.data.app_id)!==APP)return {ready:false,can_connect:false,reason:'La credencial debe ser válida y pertenecer a la aplicación ThinkStore Mensajería.'};
  const phone=await request(c.phoneId+'?fields=display_phone_number,webhook_configuration');if(C.normalizePhone(phone.display_phone_number)!==c.expectedPhone)return {ready:false,can_connect:false,reason:'El remitente configurado no coincide con el número +1.'};
  const numbers=await request(c.wabaId+'/phone_numbers?fields=id&limit=100');if(!(numbers.data||[]).some(x=>String(x.id)===c.phoneId))return {ready:false,can_connect:false,reason:'La cuenta de mensajes configurada no incluye el número +1.'};
  const d=await request(c.wabaId+'/subscribed_apps'),own=(d.data||[]).find(x=>String(x.whatsapp_business_api_data?.id||x.id)===APP),webhook=phone.webhook_configuration||{},effective=webhook.phone_number||own?.override_callback_uri||webhook.whatsapp_business_account||webhook.application;
  const ready=!!own&&(ownCallback(effective,'whatsapp-us-webhook')||(c.sharedApp&&ownCallback(effective,'whatsapp-webhook')));
  return {ready,can_connect:true,subscribed:!!own,reason:ready?'Recepción de mensajes conectada.':'Falta autorizar la recepción del +1 en ThinkStore.'};
 }catch(e){return {ready:false,can_connect:false,reason:e.status?e.message:'No se pudo comprobar la recepción del canal en Meta.'};}
}
async function connect(){
 if(C.channel()!=='meta-us')throw Object.assign(Error('Selecciona el canal +1.'),{status:400});
 if(require('./_whatsapp-channels').missing().length)throw Object.assign(Error('Completa la configuración del canal +1 antes de autorizarlo.'),{status:409});
 const c=C.waCfg(),state=await inspect();if(!state.can_connect)throw Object.assign(Error(state.reason),{status:409});
 if(state.ready)return state;
 const d=await request(c.wabaId+'/subscribed_apps',c.sharedApp?{}:{override_callback_uri:'https://thinkstore.com.ve/.netlify/functions/'+c.webhook,verify_token:c.verifyToken});
 if(d.success!==true)throw Object.assign(Error('Meta no confirmó la conexión. Revisa la autorización antes de reintentar.'),{status:409});
 const verified=await inspect();if(!verified.ready)throw Object.assign(Error('Solicitud aceptada por Meta; falta confirmar la recepción. Comprueba el estado antes de repetir.'),{status:409});
 return verified;
}
module.exports={inspect,connect};
