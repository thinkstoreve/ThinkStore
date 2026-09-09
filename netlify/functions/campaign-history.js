exports.handler=async function(event){
  const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'GET,OPTIONS'};
  const reply=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
  if(event.httpMethod==='OPTIONS')return reply(200,{ok:true});
  if(event.httpMethod!=='GET')return reply(405,{ok:false,error:'Método no permitido'});
  const clean=v=>String(v||'').trim(),norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const url=clean(process.env.SUPABASE_URL).replace(/\/$/,'');const key=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!url||!key)return reply(501,{ok:false,error:'Faltan variables de Supabase'});
  const sh={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  async function auth(){
    const legacy=clean(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']||'');
    const allowed=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String);
    if(legacy&&allowed.includes(legacy))return true;
    const token=clean(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
    if(!token)return false;
    const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
    const u=await ur.json().catch(()=>({}));if(!ur.ok||!u.id)return false;
    const pr=await fetch(`${url}/rest/v1/profiles?select=role,active&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:sh});
    const rows=await pr.json().catch(()=>[]),p=rows[0],role=norm(p?.role);
    return !!p&&p.active!==false&&['admin','super_admin','superadmin','administrator','gerente'].includes(role);
  }
  if(!await auth())return reply(401,{ok:false,error:'Acceso no autorizado'});
  try{
    const r=await fetch(`${url}/rest/v1/marketing_campaigns?select=*&order=created_at.desc&limit=50`,{headers:sh});
    const d=await r.json().catch(()=>[]);
    if(!r.ok){
      const msg=d?.message||d?.error||'No se pudo leer historial';
      if(/marketing_campaigns|relation|schema cache/i.test(msg))return reply(200,{ok:true,rows:[],migration_required:true});
      throw new Error(msg);
    }
    return reply(200,{ok:true,rows:Array.isArray(d)?d:[]});
  }catch(e){return reply(500,{ok:false,error:e.message||'No se pudo cargar historial'})}
}