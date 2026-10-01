const {handle}=require('../../soporte/netlify/functions/lib/workshop-core.cjs');
exports.handler=async event=>{
 let body={};try{body=JSON.parse(event.body||'{}')}catch{return {statusCode:400,body:JSON.stringify({ok:false,error:'JSON inválido'})};}
 const r=await handle({method:event.httpMethod,headers:event.headers,body,action:event.queryStringParameters?.action},process.env,'admin');
 return {statusCode:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(r.body)};
};
