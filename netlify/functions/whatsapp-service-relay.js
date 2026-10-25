"use strict";
const crypto=require('node:crypto');
const C=require('./_whatsapp-core');
const W=require('./_whatsapp-service-events');
const Reviews=require('./_whatsapp-reviews');
const reply=(s,body)=>({statusCode:s,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
function validSecret(a,b){if(!a||!b)return false;const x=crypto.createHash('sha256').update(String(a)).digest(),y=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(x,y)}
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'method_not_allowed'});
 const supplied=String(event.headers?.authorization||event.headers?.Authorization||'').replace(/^Bearer\s+/i,'');
 if(!validSecret(supplied,process.env.WHATSAPP_EVENTS_SECRET))return reply(403,{ok:false,error:'forbidden'});
 let b;try{b=JSON.parse(event.body||'{}')}catch{return reply(400,{ok:false,error:'invalid_json'})}
 const action=String(b.action||''),id=String(b.id||'');
 if(action!=='review_batch'&&!/^[a-z0-9-]{1,80}$/i.test(id))return reply(400,{ok:false,error:'invalid_id'});
 try{
   const cfg=C.supportCfg();
   if(action==='review_batch')return reply(200,{ok:true,whatsapp:await Reviews.batch()});
   if(action==='review_status')return reply(200,{ok:true,whatsapp:Reviews.result(await Reviews.get(id))});
   if(action==='review_send')return reply(200,{ok:true,whatsapp:await Reviews.send(id,{retry:b.retry===true})});
   if(action==='appointment'){
     const rows=await C.sb(cfg,`service_appointments?select=id,client_name,client_phone,preferred_date,preferred_time&id=eq.${encodeURIComponent(id)}&limit=1`);
     if(!rows?.[0])return reply(404,{ok:false,error:'appointment_missing'});
     return reply(200,{ok:true,whatsapp:await W.appointment(rows[0])});
   }
   if(action==='service_update'){
     const rows=await C.sb(cfg,`service_orders?select=id,code,client_name,client_phone,device_model,device_type,status,quote_status,quote_amount&id=eq.${encodeURIComponent(id)}&limit=1`);
     if(!rows?.[0])return reply(404,{ok:false,error:'order_missing'});
     // The API derives name, number and current status from Supabase (never trusts the caller).
     const update=b.update&&typeof b.update==='object'?{title:C.clean(b.update.title,100),summary:C.clean(b.update.summary,100)}:{};
     return reply(200,{ok:true,whatsapp:await W.serviceUpdate(rows[0],update)});
   }
   return reply(400,{ok:false,error:'unsupported_action'});
 }catch(e){console.error('WhatsApp relay',e.message);return reply(502,{ok:false,error:'relay_failed'})}
};
