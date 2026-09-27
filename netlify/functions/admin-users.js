const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const ROLE_MAP={cliente:'cliente',vendedor:'vendedor',recepcion:'recepcion',soporte:'soporte',tecnico:'tecnico',logistica:'logistica',admin:'admin',superadmin:'super_admin',super_admin:'super_admin'};
const DEFAULT_PERMS={cliente:['cuenta','mis_pedidos','mis_reparaciones','garantias','puntos'],vendedor:['dashboard','ventas','cotizaciones','clientes','pagos','preordenes','crm','recomendaciones'],recepcion:['dashboard','recepcion','clientes','tickets','garantias','citas'],soporte:['dashboard','recepcion','clientes','tickets','garantias','citas'],tecnico:['dashboard','tecnico','diagnostico','repuestos','pruebas','garantias'],logistica:['dashboard','logistica','guias','entregas','pedidos','preordenes'],admin:['*'],superadmin:['*']};
const INTERNAL_UI_ROLES=['vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin'];
const INTERNAL_DB_ROLES=['vendedor','recepcion','soporte','tecnico','logistica','admin','super_admin'];
const clean=(v,max=320)=>String(v??'').trim().slice(0,max);
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

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
    const allProfiles=await pr.json().catch(()=>[]),roles=await rr.json().catch(()=>[]);
    if(!pr.ok)return out(pr.status,{ok:false,error:'No se pudieron cargar los perfiles',details:allProfiles});
    if(!rr.ok)return out(rr.status,{ok:false,error:'Ejecuta primero SQL V1.6.6 de Roles y Permisos',details:roles});
    const profiles=(Array.isArray(allProfiles)?allProfiles:[]).filter(isInternalProfile);
    return out(200,{ok:true,profiles,roles:Array.isArray(roles)?roles:[],viewer_role:viewer.role,viewer_id:viewer.user_id});
  }

  if(action==='invite'){
    const fullName=clean(body.full_name,180),email=clean(body.email,320).toLowerCase(),requested=String(body.role||'vendedor').trim(),custom=slug(body.custom_role_key||'');
    if(!fullName)return out(400,{ok:false,error:'Escribe el nombre del empleado'});
    if(!validEmail(email))return out(400,{ok:false,error:'Correo inválido'});
    let dbRole=ROLE_MAP[requested]||normalizeDbRole(requested),customRole=null;
    if(custom){
      const rr=await fetch(`${url}/rest/v1/ts_roles?select=*&role_key=eq.${encodeURIComponent(custom)}&active=eq.true&limit=1`,{headers:svc(service)});const rows=await rr.json().catch(()=>[]);customRole=rows?.[0];
      if(!customRole)return out(400,{ok:false,error:'El rol personalizado no existe o está inactivo'});dbRole=customRole.base_role;
    }
    const uiRole=normalizeUiRole(dbRole);
    if(!INTERNAL_UI_ROLES.includes(uiRole))return out(400,{ok:false,error:'Selecciona un rol interno válido'});
    if(viewer.role==='admin'&&['admin','superadmin'].includes(uiRole))return out(403,{ok:false,error:'Un Administrador no puede crear otro Administrador o Super Admin'});
    const resend=process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY;
    if(!resend)return out(503,{ok:false,error:'Falta configurar RESEND_API_KEY en Netlify'});
    const site=(process.env.THINKSTORE_SITE_URL||'https://thinkstore.com.ve').replace(/\/$/,'');
    const redirectTo=`${site}/panel-login.html?view=recovery`;

    const existing=await findProfileByEmail(url,service,email);
    if(existing&&isInternalProfile(existing))return out(409,{ok:false,error:'Ese correo ya pertenece a un usuario interno'});
    if(existing&&!isInternalProfile(existing))return out(409,{ok:false,error:'Ese correo ya está registrado como cliente. Usa otro correo interno o cambia su acceso manualmente.'});

    const linkResp=await fetch(`${url}/auth/v1/admin/generate_link`,{method:'POST',headers:{...svc(service)},body:JSON.stringify({type:'invite',email,redirect_to:redirectTo,data:{full_name:fullName,thinkstore_internal:true,role:uiRole}})});
    const linkBody=await linkResp.json().catch(()=>({}));
    const userId=linkBody?.id,actionLink=linkBody?.action_link;
    if(!linkResp.ok||!userId||!actionLink)return out(linkResp.status||400,{ok:false,error:linkBody?.msg||linkBody?.message||'No se pudo crear la invitación'});

    try{
      const authUpdate=await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{method:'PUT',headers:svc(service),body:JSON.stringify({user_metadata:{full_name:fullName,thinkstore_internal:true},app_metadata:{thinkstore_role:dbRole,thinkstore_internal:true}})});
      if(!authUpdate.ok)throw detailError('No se pudo preparar la cuenta',await authUpdate.text());
      const createdProfile=await createInternalProfile(url,service,{id:userId,email,fullName,dbRole,custom});
      await sendInternalInvitation({resend,to:email,fullName,roleLabel:customRole?.name||roleLabel(uiRole),actionLink,site});
      await auditServer(url,service,viewer,'usuario_interno_invitado',`${fullName} · ${email} · ${customRole?.name||roleLabel(uiRole)}`);
      return out(201,{ok:true,profile:createdProfile,invite_sent:true});
    }catch(err){
      await rollbackInvite(url,service,userId);
      return out(502,{ok:false,error:err?.message||'No se pudo enviar la invitación',details:err?.detail||''});
    }
  }

  if(action==='save_role'){
    if(viewer.role!=='superadmin')return out(403,{ok:false,error:'Solo Super Admin puede crear o editar roles'});
    const key=slug(body.role_key),name=String(body.name||'').trim(),base=normalizeDbRole(body.base_role),permissions=cleanPerms(body.permissions);
    if(!key||!name||!base||normalizeUiRole(base)==='cliente')return out(400,{ok:false,error:'Completa nombre y rol base interno'});
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
    const id=String(body.id||'').trim(),requested=String(body.role||'vendedor').trim(),active=body.active!==false,custom=slug(body.custom_role_key||'');
    if(!id)return out(400,{ok:false,error:'Usuario inválido'});
    const tr=await fetch(`${url}/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,{headers:svc(service)});const targetRows=await tr.json().catch(()=>[]),target=targetRows?.[0];
    if(!target||!isInternalProfile(target))return out(404,{ok:false,error:'El usuario interno no existe'});
    const targetRole=normalizeUiRole(target.role||target.rol);
    if(viewer.role==='admin'&&['admin','superadmin'].includes(targetRole))return out(403,{ok:false,error:'Un Administrador no puede modificar accesos administrativos'});
    let dbRole=ROLE_MAP[requested]||normalizeDbRole(requested),customRole=null;
    if(custom){
      const rr=await fetch(`${url}/rest/v1/ts_roles?select=*&role_key=eq.${encodeURIComponent(custom)}&active=eq.true&limit=1`,{headers:svc(service)});const rows=await rr.json().catch(()=>[]);customRole=rows?.[0];
      if(!customRole)return out(400,{ok:false,error:'El rol personalizado no existe o está inactivo'});dbRole=customRole.base_role;
    }
    const nextUi=normalizeUiRole(dbRole);
    if(!INTERNAL_UI_ROLES.includes(nextUi))return out(400,{ok:false,error:'Rol interno inválido'});
    if(viewer.role==='admin'&&['admin','superadmin'].includes(nextUi))return out(403,{ok:false,error:'Un Administrador no puede asignar roles administrativos'});
    if(id===viewer.user_id && (nextUi!=='superadmin'||active===false||custom))return out(409,{ok:false,error:'Por seguridad no puedes degradar, desactivar ni personalizar tu propia cuenta Super Admin'});
    const overrides=cleanOverrides(body.permission_overrides);
    const patch={role:dbRole,active,custom_role_key:custom||null,permission_overrides:overrides};
    const rr=await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{...svc(service),Prefer:'return=representation'},body:JSON.stringify(patch)});
    const rows=await rr.json().catch(()=>[]);if(!rr.ok)return out(rr.status,{ok:false,error:'No se pudo actualizar el perfil',details:rows});
    await auditServer(url,service,viewer,'acceso_usuario_actualizado',`${target.email||target.correo||target.full_name||id} · ${custom||nextUi}`);
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
function isInternalProfile(p){const r=normalizeUiRole(p?.role||p?.rol||'cliente');return INTERNAL_UI_ROLES.includes(r)||!!p?.custom_role_key}
function roleLabel(r){return({vendedor:'Vendedor',recepcion:'Recepción / Soporte',soporte:'Soporte',tecnico:'Técnico',logistica:'Logística',admin:'Administrador',superadmin:'Socio Administrador'})[normalizeUiRole(r)]||String(r||'Usuario interno')}
async function findProfileByEmail(url,service,email){const paths=[`email=eq.${encodeURIComponent(email)}`,`correo=eq.${encodeURIComponent(email)}`];for(const q of paths){const r=await fetch(`${url}/rest/v1/profiles?select=*&${q}&limit=1`,{headers:svc(service)});if(r.ok){const rows=await r.json().catch(()=>[]);if(rows?.[0])return rows[0];}}return null}
async function authenticate(event,url,service){
  const token=String(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');if(!token)return{ok:false};
  const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});const u=await ur.json().catch(()=>({}));if(!ur.ok||!u.id)return{ok:false};
  const pr=await fetch(`${url}/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:svc(service)});const rows=await pr.json().catch(()=>[]),p=rows?.[0];
  if(!p||(p.active??p.activo??true)===false)return{ok:false};return{ok:true,user_id:u.id,email:u.email||p.email||p.correo||'',role:normalizeUiRole(p.role||p.rol),profile:p};
}
async function effectiveAccess(profile,url,service){
  const base=normalizeUiRole(profile?.role||profile?.rol),over=cleanOverrides(profile?.permission_overrides);let permissions=[...(DEFAULT_PERMS[base]||DEFAULT_PERMS.cliente)],roleName=base,customKey=profile?.custom_role_key||null;
  if(customKey){
    const rr=await fetch(`${url}/rest/v1/ts_roles?select=*&role_key=eq.${encodeURIComponent(customKey)}&active=eq.true&limit=1`,{headers:svc(service)});const rows=await rr.json().catch(()=>[]),r=rows?.[0];
    if(r){permissions=cleanPerms(r.permissions);roleName=r.name||customKey;}
  }
  if(!permissions.includes('*')){permissions=[...new Set([...permissions,...over.allow])].filter(x=>!over.deny.includes(x));}
  return{user_id:profile.id,base_role:base,custom_role_key:customKey,role_name:roleName,permissions,permission_overrides:over};
}
function invitationHtml({fullName,roleLabelText,actionLink,site}){const logo=`${site}/assets/thinkstore-email-logo.jpg`;return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111114"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:34px 16px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #e5e5e7;border-radius:28px;overflow:hidden"><tr><td style="padding:42px"><img src="${esc(logo)}" alt="ThinkStore" style="display:block;width:170px;max-width:60%;height:auto"><div style="margin-top:30px;font-size:12px;letter-spacing:2.2px;text-transform:uppercase;color:#7b7b83;font-weight:800">Panel administrativo ThinkStore</div><h1 style="font-size:34px;line-height:1.12;margin:12px 0;color:#111114">Bienvenido, ${esc(fullName)}</h1><p style="font-size:18px;line-height:1.6;color:#606068;margin:0 0 20px">Has sido invitado al equipo interno de ThinkStore con el rol <b style="color:#111114">${esc(roleLabelText)}</b>.</p><div style="background:#f7f7f8;border-radius:18px;padding:20px;margin:22px 0"><div style="font-size:14px;color:#5f5f67;line-height:1.6">Por seguridad no se creó una contraseña temporal. Usa el botón para establecer una contraseña privada que solo tú conocerás.</div></div><a href="${esc(actionLink)}" style="display:inline-block;background:#111114;color:#fff;text-decoration:none;padding:15px 24px;border-radius:14px;font-weight:800">Crear mi contraseña</a><p style="font-size:13px;line-height:1.6;color:#8a8a92;margin-top:30px">Este acceso es personal e intransferible. Si no esperabas esta invitación, puedes ignorar este correo.</p></td></tr></table></td></tr></table></body></html>`}
async function sendInternalInvitation({resend,to,fullName,roleLabel:roleLabelText,actionLink,site}){const from=process.env.FROM_ACCESS_EMAIL||process.env.FROM_EMAIL||'ThinkStore Accesos <noreply@thinkstore.com.ve>';const replyTo=process.env.REPLY_TO_ACCESS||process.env.REPLY_TO||'soporte@thinkstore.com.ve';const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],reply_to:replyTo,subject:`Bienvenido al Panel ThinkStore · ${roleLabelText}`,html:invitationHtml({fullName,roleLabelText,actionLink,site})})});const d=await r.json().catch(()=>({}));if(!r.ok)throw detailError(d?.message||'No se pudo enviar el correo de invitación',JSON.stringify(d));return d}

async function createInternalProfile(url,service,{id,email,fullName,dbRole,custom}){
  const candidates=[
    {id,email,full_name:fullName,role:dbRole,active:true,custom_role_key:custom||null,permission_overrides:{allow:[],deny:[]}},
    {id,email,nombre:fullName,role:dbRole,active:true,custom_role_key:custom||null,permission_overrides:{allow:[],deny:[]}}
  ];
  let last='';
  for(const profile of candidates){
    const r=await fetch(`${url}/rest/v1/profiles?on_conflict=id`,{method:'POST',headers:{...svc(service),Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(profile)});
    const d=await r.json().catch(()=>[]);if(r.ok)return d?.[0]||profile;last=JSON.stringify(d);
  }
  throw detailError('No se pudo crear el perfil interno',last);
}
async function rollbackInvite(url,service,userId){if(!userId)return;await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,{method:'DELETE',headers:svc(service)}).catch(()=>{});await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{method:'DELETE',headers:svc(service)}).catch(()=>{})}
async function auditServer(url,service,viewer,accion,detalle){const body={actor:viewer.user_id,actor_email:viewer.email||viewer.profile?.email||'',accion,detalle};await fetch(`${url}/rest/v1/audit_log`,{method:'POST',headers:{...svc(service),Prefer:'return=minimal'},body:JSON.stringify(body)}).catch(()=>{})}
function detailError(message,detail=''){const e=new Error(message);e.detail=detail;return e}
