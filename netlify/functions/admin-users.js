const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const ROLE_MAP={cliente:'cliente',vendedor:'vendedor',recepcion:'recepcion',soporte:'soporte',tecnico:'tecnico',logistica:'logistica',admin:'admin',superadmin:'super_admin',super_admin:'super_admin'};
const DEFAULT_PERMS={cliente:['cuenta','mis_pedidos','mis_reparaciones','garantias','puntos'],vendedor:['dashboard','ventas','cotizaciones','clientes','pagos','preordenes','crm','recomendaciones'],recepcion:['dashboard','recepcion','clientes','tickets','garantias','citas'],soporte:['dashboard','recepcion','clientes','tickets','garantias','citas'],tecnico:['dashboard','tecnico','diagnostico','repuestos','pruebas','garantias'],logistica:['dashboard','logistica','guias','entregas','pedidos','preordenes'],admin:['*'],superadmin:['*']};
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:H,body:''};
  if(event.httpMethod!=='POST')return out(405,{ok:false,error:'Método no permitido'});
  const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY;
  if(!url||!service)return out(500,{ok:false,error:'Supabase Admin no está configurado'});
  const viewer=await authenticate(event,url,service);if(!viewer.ok)return out(401,{ok:false,error:'Sesión no autorizada'});
  let body={};try{body=JSON.parse(event.body||'{}')}catch(_){return out(400,{ok:false,error:'JSON inválido'})}
  const action=String(body.action||'access').toLowerCase();
  if(action==='access')return out(200,{ok:true,...await effectiveAccess(viewer.profile,url,service)});
  if(!['admin','superadmin'].includes(viewer.role))return out(403,{ok:false,error:'Acceso administrativo no autorizado'});

  if(action==='list'){
    const [pr,rr]=await Promise.all([
      fetch(`${url}/rest/v1/profiles?select=*&order=created_at.desc`,{headers:svc(service)}),
      fetch(`${url}/rest/v1/ts_roles?select=*&order=system.desc,name.asc`,{headers:svc(service)})
    ]);
    const profiles=await pr.json().catch(()=>[]),roles=await rr.json().catch(()=>[]);
    if(!pr.ok)return out(pr.status,{ok:false,error:'No se pudieron cargar los perfiles',details:profiles});
    if(!rr.ok)return out(rr.status,{ok:false,error:'Ejecuta primero SQL V1.6.6 de Roles y Permisos',details:roles});
    return out(200,{ok:true,profiles:Array.isArray(profiles)?profiles:[],roles:Array.isArray(roles)?roles:[],viewer_role:viewer.role,viewer_id:viewer.user_id});
  }
  if(action==='save_role'){
    if(viewer.role!=='superadmin')return out(403,{ok:false,error:'Solo Super Admin puede crear o editar roles'});
    const key=slug(body.role_key),name=String(body.name||'').trim(),base=normalizeDbRole(body.base_role),permissions=cleanPerms(body.permissions);
    if(!key||!name||!base)return out(400,{ok:false,error:'Completa nombre y rol base'});
    const existing=await fetch(`${url}/rest/v1/ts_roles?select=system&role_key=eq.${encodeURIComponent(key)}&limit=1`,{headers:svc(service)}).then(r=>r.json()).catch(()=>[]);
    if(existing?.[0]?.system)return out(409,{ok:false,error:'Los roles del sistema no se pueden sobrescribir. Crea un rol personalizado.'});
    const rr=await fetch(`${url}/rest/v1/ts_roles?on_conflict=role_key`,{method:'POST',headers:{...svc(service),Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({role_key:key,name,base_role:base,permissions,system:false,active:body.active!==false,updated_at:new Date().toISOString()})});
    const rows=await rr.json().catch(()=>[]);if(!rr.ok)return out(rr.status,{ok:false,error:'No se pudo guardar el rol',details:rows});
    return out(200,{ok:true,role:rows?.[0]||null});
  }
  if(action==='delete_role'){
    if(viewer.role!=='superadmin')return out(403,{ok:false,error:'Solo Super Admin puede eliminar roles'});
    const key=slug(body.role_key);if(!key)return out(400,{ok:false,error:'Rol inválido'});
    const ex=await fetch(`${url}/rest/v1/ts_roles?select=system&role_key=eq.${encodeURIComponent(key)}&limit=1`,{headers:svc(service)}).then(r=>r.json()).catch(()=>[]);
    if(ex?.[0]?.system)return out(409,{ok:false,error:'No se puede eliminar un rol del sistema'});
    const rr=await fetch(`${url}/rest/v1/ts_roles?role_key=eq.${encodeURIComponent(key)}`,{method:'DELETE',headers:svc(service)});if(!rr.ok)return out(rr.status,{ok:false,error:'No se pudo eliminar el rol'});
    return out(200,{ok:true});
  }
  if(action==='update'){
    if(viewer.role!=='superadmin')return out(403,{ok:false,error:'Solo Super Admin puede cambiar roles, permisos o estados'});
    const id=String(body.id||'').trim(),requested=String(body.role||'cliente').trim(),active=body.active!==false,custom=slug(body.custom_role_key||'');
    if(!id)return out(400,{ok:false,error:'Usuario inválido'});
    let dbRole=ROLE_MAP[requested]||normalizeDbRole(requested),customRole=null;
    if(custom){
      const rr=await fetch(`${url}/rest/v1/ts_roles?select=*&role_key=eq.${encodeURIComponent(custom)}&active=eq.true&limit=1`,{headers:svc(service)});const rows=await rr.json().catch(()=>[]);customRole=rows?.[0];
      if(!customRole)return out(400,{ok:false,error:'El rol personalizado no existe o está inactivo'});dbRole=customRole.base_role;
    }
    if(!dbRole)return out(400,{ok:false,error:'Rol base inválido'});
    if(id===viewer.user_id && (dbRole!=='super_admin'||active===false||custom))return out(409,{ok:false,error:'Por seguridad no puedes degradar, desactivar ni personalizar tu propia cuenta Super Admin'});
    const overrides=cleanOverrides(body.permission_overrides);
    const patch={role:dbRole,active,custom_role_key:custom||null,permission_overrides:overrides};
    const rr=await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{...svc(service),Prefer:'return=representation'},body:JSON.stringify(patch)});
    const rows=await rr.json().catch(()=>[]);if(!rr.ok)return out(rr.status,{ok:false,error:'No se pudo actualizar el perfil',details:rows});
    return out(200,{ok:true,profile:rows?.[0]||null});
  }
  return out(400,{ok:false,error:'Acción no soportada'});
};
function svc(k){return{apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'}}
function out(statusCode,body){return{statusCode,headers:H,body:JSON.stringify(body)}}
function slug(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40)}
function normalizeDbRole(v){const r=String(v||'').toLowerCase().replace(/[ -]+/g,'_');return ROLE_MAP[r]||null}
function normalizeUiRole(v){let r=String(v||'cliente').toLowerCase().replace(/[ -]+/g,'_');if(r==='super_admin')r='superadmin';if(r==='administrator'||r==='gerente')r='admin';return r}
function cleanPerms(v){return [...new Set((Array.isArray(v)?v:[]).map(x=>String(x||'').trim()).filter(Boolean))].slice(0,150)}
function cleanOverrides(v){const o=v&&typeof v==='object'?v:{};return{allow:cleanPerms(o.allow),deny:cleanPerms(o.deny)}}
async function authenticate(event,url,service){
  const token=String(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');if(!token)return{ok:false};
  const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});const u=await ur.json().catch(()=>({}));if(!ur.ok||!u.id)return{ok:false};
  const pr=await fetch(`${url}/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:svc(service)});const rows=await pr.json().catch(()=>[]),p=rows?.[0];
  if(!p||p.active===false)return{ok:false};return{ok:true,user_id:u.id,role:normalizeUiRole(p.role),profile:p};
}
async function effectiveAccess(profile,url,service){
  const base=normalizeUiRole(profile?.role),over=cleanOverrides(profile?.permission_overrides);let permissions=[...(DEFAULT_PERMS[base]||DEFAULT_PERMS.cliente)],roleName=base,customKey=profile?.custom_role_key||null;
  if(customKey){
    const rr=await fetch(`${url}/rest/v1/ts_roles?select=*&role_key=eq.${encodeURIComponent(customKey)}&active=eq.true&limit=1`,{headers:svc(service)});const rows=await rr.json().catch(()=>[]),r=rows?.[0];
    if(r){permissions=cleanPerms(r.permissions);roleName=r.name||customKey;}
  }
  if(!permissions.includes('*')){permissions=[...new Set([...permissions,...over.allow])].filter(x=>!over.deny.includes(x));}
  return{user_id:profile.id,base_role:base,custom_role_key:customKey,role_name:roleName,permissions,permission_overrides:over};
}
