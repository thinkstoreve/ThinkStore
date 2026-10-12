const C=require('./_whatsapp-core');
const {authenticateInternal}=require('./staff-auth-core');
const out=(s,b)=>({statusCode:s,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'GET,POST,OPTIONS'},body:JSON.stringify(b)});
exports.handler=async(event)=>{if(event.httpMethod==='OPTIONS')return out(200,{ok:true});
 const m=C.mainCfg();let allowed=false;const legacy=C.clean(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']);if(legacy&&[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String).includes(legacy))allowed=true;
 if(!allowed){const a=await authenticateInternal(event);const r=C.norm(a?.role);allowed=!!a?.ok&&/admin|superadmin|gerente/.test(r)}if(!allowed)return out(401,{ok:false,error:'No autorizado'});
 const cfg=C.waCfg();if(event.httpMethod==='GET')return out(200,{ok:true,configured:{access_token:!!cfg.token,phone_number_id:!!cfg.phoneId,verify_token:!!cfg.verifyToken,app_secret:!!cfg.appSecret,graph_version:!!cfg.version,debt_automation:String(process.env.WHATSAPP_DEBT_AUTOMATION_ENABLED||'').toLowerCase()==='true',debt_template:!!process.env.WHATSAPP_DEBT_TEMPLATE_NAME},webhook_url:`${cfg.site}/.netlify/functions/whatsapp-webhook`,official_phone:'+58 424 170 6142'});
 let b={};try{b=JSON.parse(event.body||'{}')}catch{return out(400,{ok:false,error:'JSON inválido'})}if(b.action==='preview_debts'){const rows=await C.debtCandidates();return out(200,{ok:true,count:rows.length,rows:rows.slice(0,100)})}if(b.action==='preview_reply'){return out(200,{ok:true,reply:await C.smartReply(C.clean(b.message,1000))})}return out(400,{ok:false,error:'Acción no soportada'});
};
