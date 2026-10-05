const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'POST,OPTIONS'};
const clean=v=>String(v??'').trim(),norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const reply=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return reply(200,{ok:true});
  if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Método no permitido'});
  const url=clean(process.env.SUPABASE_URL).replace(/\/$/,''); const service=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!url||!service)return reply(501,{ok:false,error:'Faltan variables de Supabase'});
  const sh={apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'};

  async function auth(){
    const legacy=clean(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']||'');
    const allowed=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String);
    if(legacy&&allowed.includes(legacy))return{ok:true,mode:'legacy',email:'admin'};
    const token=clean(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
    if(!token)return{ok:false};
    const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}}),u=await ur.json().catch(()=>({}));
    if(!ur.ok||!u.id)return{ok:false};
    const pr=await fetch(`${url}/rest/v1/profiles?select=id,role,active&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:sh}),rows=await pr.json().catch(()=>[]),p=rows[0];
    const role=norm(p?.role);
    if(!p||p.active===false||!['admin','superadmin','super_admin','administrator','gerente','vendedor'].includes(role))return{ok:false};
    return{ok:true,user_id:u.id,email:u.email||'',role};
  }
  const actor=await auth(); if(!actor.ok)return reply(401,{ok:false,error:'Acceso no autorizado'});
  let b={};try{b=JSON.parse(event.body||'{}')}catch{return reply(400,{ok:false,error:'JSON inválido'})}

  async function req(path,options={}){
    const rr=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...sh,...(options.headers||{})}});
    const txt=await rr.text();let d=null;try{d=txt?JSON.parse(txt):null}catch{d=txt}
    if(!rr.ok){const e=new Error(d?.message||d?.error||d?.details||`Supabase ${rr.status}`);e.data=d;throw e}
    return d;
  }
  const action=clean(b.action);
  const manager=actor.mode==='legacy'||['admin','superadmin','super_admin','administrator','gerente'].includes(norm(actor.role||actor.mode));
  if(action==='audit_list'&&!manager)return reply(403,{ok:false,error:'Solo Gerencia, Admin o Super Admin puede consultar la auditoría completa.'});
  if(['cash_closure_list'].includes(action)&&!manager)return reply(403,{ok:false,error:'Solo Gerencia, Admin o Super Admin puede consultar cierres históricos.'});
  try{
    if(action==='audit_list'){
      const limit=Math.min(300,Math.max(1,Number(b.limit||120)));
      const entity=clean(b.entity_type);
      const path=`admin_audit_log?select=*&order=created_at.desc&limit=${limit}${entity?`&entity_type=eq.${encodeURIComponent(entity)}`:''}`;
      return reply(200,{ok:true,rows:await req(path)});
    }
    if(action==='inventory_history'){
      const id=clean(b.variant_id); if(!id)return reply(400,{ok:false,error:'Variante requerida'});
      const rows=await req(`inventory_movements?select=*&variant_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=200`);
      return reply(200,{ok:true,rows});
    }
    if(action==='cash_closure_list'){
      return reply(200,{ok:true,rows:await req('ts_cash_closures?select=*&order=business_date.desc,created_at.desc&limit=90')});
    }
    if(action==='cash_closure_save'){
      const s=b.snapshot||{},business_date=clean(b.business_date);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(business_date))return reply(400,{ok:false,error:'Fecha inválida'});
      const counted=Number(b.counted_cash_usd||0),expected=Number(s.cash||0);
      const row={
        business_date,actor_email:actor.email||actor.mode||null,
        expected_cash_usd:expected,counted_cash_usd:counted,cash_difference_usd:Math.round((counted-expected)*100)/100,
        zelle_usd:Number(s.zelle||0),pago_movil_usd:Number(s.mobile||0),pago_movil_ves:Number(s.mobileBs||0),
        pos_usd:Number(s.pos||0),pos_ves:Number(s.posBs||0),total_confirmed_usd:Number(s.total||0),pending_usd:Number(s.pendingTotal||0),
        confirmed_count:Number(s.paid_count||0),pending_count:Number(s.pending_count||0),cancelled_count:Number(s.cancelled_count||0),
        note:clean(b.note)||null,snapshot:s
      };
      const rows=await req('ts_cash_closures',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
      try{await req('admin_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:actor.email||null,action:'cash_closure_created',entity_type:'cash_closure',entity_id:String(rows?.[0]?.id||business_date),after_data:row})})}catch(_){}
      return reply(200,{ok:true,row:rows?.[0]||row});
    }
    if(action==='crm_list'){
      return reply(200,{ok:true,rows:await req('ts_customer_crm?select=*&order=updated_at.desc&limit=500')});
    }
    if(action==='crm_save'){
      const email=clean(b.email).toLowerCase();if(!email||!email.includes('@'))return reply(400,{ok:false,error:'Correo inválido'});
      const tags=Array.isArray(b.tags)?[...new Set(b.tags.map(clean).filter(Boolean))].slice(0,20):[];
      const row={email,tags,internal_note:clean(b.internal_note)||null,updated_by:actor.email||null,updated_at:new Date().toISOString()};
      await req('ts_customer_crm?on_conflict=email',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(row)});
      try{await req('admin_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:actor.email||null,action:'crm_customer_updated',entity_type:'customer',entity_id:email,after_data:row})})}catch(_){}
      return reply(200,{ok:true,row});
    }
    return reply(400,{ok:false,error:'Acción no válida'});
  }catch(e){
    const migration=/relation .* does not exist|schema cache|could not find/i.test(clean(e.message));
    return reply(migration?409:500,{ok:false,migration_required:migration,error:migration?'Ejecuta supabase_v13_55_operaciones_auditoria.sql antes de usar esta función.':e.message});
  }
};
