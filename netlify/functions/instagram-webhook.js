'use strict';
const I=require('./_instagram');
exports.handler=async event=>{const c=I.config(),q=event.queryStringParameters||{},headers={'Content-Type':'text/plain','Cache-Control':'no-store'};
 if(event.httpMethod==='GET')return {statusCode:c.verify&&q['hub.mode']==='subscribe'&&q['hub.verify_token']===c.verify?200:403,headers,body:c.verify&&q['hub.verify_token']===c.verify?String(q['hub.challenge']||''):'Forbidden'};
 if(event.httpMethod!=='POST')return {statusCode:405,headers,body:'Method not allowed'};
 const raw=event.isBase64Encoded?Buffer.from(event.body||'','base64'):Buffer.from(event.body||''),signature=event.headers?.['x-hub-signature-256']||event.headers?.['X-Hub-Signature-256'];
 if(raw.length>1024*1024||!I.signature(raw,signature))return {statusCode:403,headers,body:'Forbidden'};
 let payload;try{payload=JSON.parse(raw);}catch{return {statusCode:400,headers,body:'Invalid JSON'};}
 if(payload.object!=='instagram')return {statusCode:400,headers,body:'Invalid object'};
 try{const r=await fetch('https://thinkstore.com.ve/.netlify/functions/instagram-process-background',{method:'POST',headers:{'Content-Type':'application/json','X-Hub-Signature-256':signature},body:raw,signal:AbortSignal.timeout(5000)});return {statusCode:r.status===202?200:503,headers,body:r.status===202?'EVENT_RECEIVED':'Retry later'};}catch{return {statusCode:503,headers,body:'Retry later'};}
};
