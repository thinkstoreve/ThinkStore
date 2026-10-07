'use strict';
const URL='https://clhnndxsgzqnihhtrout.supabase.co';
const PUBLIC='sb_publishable_Q7ynhCPp8nMFQywia1LqCQ_6UEAGqRZ';
exports.handler=async()=>{
  let supabase=false,status=0;
  try{const r=await fetch(URL+'/auth/v1/settings',{headers:{apikey:PUBLIC},signal:AbortSignal.timeout(2500)});status=r.status;supabase=r.ok}catch(_){ }
  const service=Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY);
  return{statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({ok:true,build:'10.15',supabase_reachable:supabase,supabase_status:status,service_role_configured:service})};
};
