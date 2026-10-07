'use strict';
const H={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const reply=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
const clean=(v,n=2000)=>String(v??'').trim().slice(0,n);
const validToken=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));
function conf(){return{url:clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/$/,''),key:clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY)}}
async function rest(c,path,options={}){const r=await fetch(`${c.url}/rest/v1/${path}`,{...options,headers:{apikey:c.key,Authorization:`Bearer ${c.key}`,'Content-Type':'application/json',...(options.headers||{})}});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw Error(d?.message||`Soporte respondió ${r.status}`);return d}
async function orderByToken(c,token){const rows=await rest(c,`service_orders?select=id,code,client_name,device_model,serial_imei,status,updated_at,quote_amount,quote_currency,quote_status,quote_repair_details,warranty_days,public_token&public_token=eq.${encodeURIComponent(token)}&limit=1`);return rows?.[0]||null}
exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:H,body:''};
  if(!['GET','POST'].includes(event.httpMethod))return reply(405,{ok:false,error:'Método no permitido'});
  const c=conf();if(!c.url||!c.key)return reply(503,{ok:false,error:'Portal de seguimiento no configurado'});
  try{
    let token=clean(event.queryStringParameters?.token,80),body={};
    if(event.httpMethod==='POST'){try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{ok:false,error:'Solicitud inválida'})}token=clean(body.token,80)}
    if(!validToken(token))return reply(400,{ok:false,error:'Enlace de seguimiento inválido'});
    const order=await orderByToken(c,token);if(!order)return reply(404,{ok:false,error:'No encontramos esta orden'});
    if(event.httpMethod==='POST'){
      if(clean(body.action)!=='send_message')return reply(400,{ok:false,error:'Acción no válida'});
      const message=clean(body.message,2000);if(!message)return reply(400,{ok:false,error:'Escribe un mensaje'});
      const sender=clean(body.sender_name,120)||order.client_name||'Cliente';
      await rest(c,'service_order_messages',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:order.id,sender_type:'client',sender_name:sender,message,created_by_email:null})});
      return reply(200,{ok:true});
    }
    let messages=[],notes=[];
    try{messages=await rest(c,`service_order_messages?select=id,sender_type,sender_name,message,created_at&order_id=eq.${encodeURIComponent(order.id)}&order=created_at.asc&limit=300`)||[]}catch(e){console.warn('Portal mensajes',e.message)}
    try{notes=await rest(c,`service_order_notes?select=id,client_title,diagnosis,work_performed,parts_used,tests_performed,client_notes,note,created_at&order_id=eq.${encodeURIComponent(order.id)}&visibility=eq.client&order=created_at.desc&limit=100`)||[]}catch(e){console.warn('Portal bitácora',e.message)}
    return reply(200,{ok:true,order,messages,notes});
  }catch(e){console.error('[support-client-portal]',e.message);return reply(500,{ok:false,error:'No se pudo consultar el seguimiento'})}
};
