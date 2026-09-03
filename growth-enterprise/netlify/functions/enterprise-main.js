const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'POST, OPTIONS'},body:JSON.stringify(body)});
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return json(200,{ok:true});
  if(event.httpMethod!=='POST')return json(405,{ok:false,error:'Método no permitido'});
  const url=clean(process.env.SUPABASE_URL).replace(/\/$/,'');
  const key=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!url||!key)return json(501,{ok:false,error:'Faltan variables del Supabase principal'});
  const adminHeaders={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  try{
    const legacy=clean(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']);
    const allowed=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].map(clean).filter(Boolean);
    let authorized=legacy&&allowed.includes(legacy),actorEmail=authorized?'acceso-legacy':null;
    if(!authorized){
      const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');
      if(!token)return json(401,{ok:false,error:'Sesión Enterprise requerida'});
      const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});const user=await ur.json().catch(()=>({}));
      if(!ur.ok||!user.id)return json(401,{ok:false,error:'Sesión Enterprise inválida'});
      actorEmail=user.email||user.id;
      let profile=null;
      const pr=await fetch(`${url}/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(user.id)}&limit=1`,{headers:adminHeaders});const pa=await pr.json().catch(()=>[]);if(pr.ok)profile=pa[0]||null;
      if(!profile&&user.email){const rr=await fetch(`${url}/rest/v1/roles_usuarios?select=*&email=ilike.${encodeURIComponent(user.email)}&limit=1`,{headers:adminHeaders});const ra=await rr.json().catch(()=>[]);if(rr.ok)profile=ra[0]||null}
      const role=norm(profile?.role||profile?.rol),active=(profile?.active??profile?.activo??true)!==false;
      authorized=Boolean(profile&&active&&['admin','super_admin','superadmin','administrator','gerente'].includes(role));
    }
    if(!authorized)return json(403,{ok:false,error:'Acceso administrador no autorizado'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{ok:false,error:'JSON inválido'})}
    if(clean(body.action)!=='update_client')return json(400,{ok:false,error:'Acción no válida'});
    const email=clean(body.email).toLowerCase();if(!email)return json(400,{ok:false,error:'Correo del cliente requerido'});
    const found=await fetch(`${url}/rest/v1/clientes?select=*&correo=ilike.${encodeURIComponent(email)}&limit=1`,{headers:adminHeaders});
    const rows=await found.json().catch(()=>[]);if(!found.ok)throw new Error(rows?.message||'No se pudo consultar clientes');
    const client=rows[0];if(!client)return json(404,{ok:false,error:'Cliente no encontrado en Supabase'});
    const changes={};if(body.nombre!==undefined)changes.nombre=clean(body.nombre);if(body.telefono!==undefined)changes.telefono=clean(body.telefono);
    const updated=await fetch(`${url}/rest/v1/clientes?id=eq.${encodeURIComponent(client.id)}`,{method:'PATCH',headers:{...adminHeaders,Prefer:'return=representation'},body:JSON.stringify(changes)});
    const result=await updated.json().catch(()=>[]);if(!updated.ok)throw new Error(result?.message||'No se pudo actualizar el cliente');
    await fetch(`${url}/rest/v1/admin_audit_log`,{method:'POST',headers:{...adminHeaders,Prefer:'return=minimal'},body:JSON.stringify({actor_email:actorEmail,action:'enterprise_update_client',entity_type:'cliente',entity_id:String(client.id),before_data:{nombre:client.nombre,telefono:client.telefono,correo:client.correo},after_data:changes})}).catch(()=>null);
    return json(200,{ok:true,client:result[0]||{...client,...changes}});
  }catch(error){console.error('ThinkStore Enterprise Main',error);return json(500,{ok:false,error:error.message||'Error interno'})}
};
