'use strict';
const C=require('./_whatsapp-core'),Webhook=require('./whatsapp-webhook');
exports.handler=event=>C.withChannel('meta-us',async()=>{
 const c=C.waCfg();if(!c.phoneId||!c.appSecret||!c.verifyToken)return {statusCode:503,headers:{'Content-Type':'application/json'},body:JSON.stringify({ok:false,error:'Canal pendiente de configuración'})};
 if(event.httpMethod==='POST'&&!c.enabled)return {statusCode:503,body:JSON.stringify({ok:false,error:'Canal pendiente de activación'})};
 return Webhook.handler(event);
});
