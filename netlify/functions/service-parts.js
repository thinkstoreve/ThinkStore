const {handle}=require('../../soporte/netlify/functions/lib/workshop-core.cjs');
exports.handler=async event=>{const r=await handle({method:event.httpMethod},process.env,'public');return {statusCode:r.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(r.body)};};
