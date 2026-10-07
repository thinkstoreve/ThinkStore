const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const ROLE_MAP={cliente:'cliente',vendedor:'vendedor',recepcion:'recepcion',soporte:'soporte',tecnico:'tecnico',logistica:'logistica',admin:'admin',superadmin:'superadmin',super_admin:'superadmin'};
const DEFAULT_PERMS={cliente:['cuenta','mis_pedidos','mis_reparaciones','garantias','puntos'],vendedor:['dashboard','ventas','cotizaciones','clientes','pagos','preordenes','crm','recomendaciones','staff.access','platform.staff'],recepcion:['dashboard','recepcion','clientes','tickets','garantias','citas','platform.support'],soporte:['dashboard','recepcion','clientes','tickets','garantias','citas','platform.support'],tecnico:['dashboard','tecnico','diagnostico','repuestos','pruebas','garantias','platform.support'],logistica:['dashboard','logistica','guias','entregas','pedidos','preordenes','platform.support'],admin:['*'],superadmin:['*']};
const PLATFORM_KEYS=['staff','support','inventory','enterprise','marketing','admin'];
const INTERNAL_UI_ROLES=['vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin'];
const INTERNAL_DB_ROLES=['vendedor','recepcion','soporte','tecnico','logistica','admin','superadmin'];
const clean=(v,max=320)=>String(v??'').trim().slice(0,max);
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return{statusCode:204,headers:H,body:''};
  if(event.httpMethod!=='POST')return out(405,{ok:false,error:'Método no permitido'});
  const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY;
  if(!url||!service)return out(500,{ok:false,error:'Supabase Admin no está configurado'});
  const viewer=await authenticate(event,url,service);
  if(!viewer.ok)return out(401,{
    ok:false,
    error:'Sesión no autorizada',
    code:viewer.code||'AUTH_REQUIRED',
    reason:viewer.reason||'',
    server_project_ref:projectRef(url)
  });
  let body={};try{body=JSON.parse(event.body||'{}')}catch(_){return out(400,{ok:false,error:'JSON inválido'})}
  const action=String(body.action||'access').toLowerCase();
  if(action==='access'){
    if(!viewer.internal)return out(403,{ok:false,error:'Esta cuenta es de cliente y no tiene acceso a plataformas internas'});
    return out(200,{ok:true,...await effectiveAccess(viewer.profile,url,service)});
  }
  if(!viewer.internal||!['admin','superadmin'].includes(viewer.role))return out(403,{ok:false,error:'Acceso administrativo no autorizado'});

  if(action==='list'){
    const [pr,rr]=await Promise.all([
      fetch(`${url}/rest/v1/profiles?select=*&order=created_at.desc`,{headers:svc(service)}),
      fetch(`${url}/rest/v1/ts_roles?select=*&order=system.desc,name.asc`,{headers:svc(service)})
    ]);
    const allProfiles=await pr.json().catch(()=>[]),roles=await rr.json().catch(()=>[]);
    if(!pr.ok){
      const msg=String(allProfiles?.message||allProfiles?.error||'');
      if(/column/i.test(msg)&&/is_internal/i.test(msg))return out(409,{ok:false,error:'El esquema de perfiles necesita actualizarse antes de administrar empleados.'});
      return out(pr.status,{ok:false,error:'No se pudieron cargar los usuarios internos',details:allProfiles});
    }
    if(!rr.ok)return out(rr.status,{ok:false,error:'Ejecuta primero SQL V1.6.6 de Roles y Permisos',details:roles});
    const profiles=(Array.isArray(allProfiles)?allProfiles:[]).filter(isInternalProfile);
    return out(200,{ok:true,profiles,roles:Array.isArray(roles)?roles:[],viewer_role:viewer.role,viewer_id:viewer.user_id});
  }

  if(action==='invite'){
    const fullName=clean(body.full_name,180),email=clean(body.email,320).toLowerCase(),requested=String(body.role||'vendedor').trim(),custom=slug(body.custom_role_key||'');
    let permissionOverrides=cleanOverrides(body.permission_overrides);
    if(!fullName)return out(400,{ok:false,error:'Escribe el nombre del empleado'});
    if(!validEmail(email))return out(400,{ok:false,error:'Correo inválido'});
    let dbRole=normalizeUiRole(requested)==='superadmin'?'superadmin':(ROLE_MAP[requested]||normalizeDbRole(requested)),customRole=null;
    if(custom){
      const rr=await fetch(`${url}/rest/v1/ts_roles?select=*&role_key=eq.${encodeURIComponent(custom)}&active=eq.true&limit=1`,{headers:svc(service)});const rows=await rr.json().catch(()=>[]);customRole=rows?.[0];
      if(!customRole)return out(400,{ok:false,error:'El rol personalizado no existe o está inactivo'});dbRole=customRole.base_role;
    }
    const uiRole=normalizeUiRole(dbRole);
    if(!INTERNAL_UI_ROLES.includes(uiRole))return out(400,{ok:false,error:'Selecciona un rol interno válido'});
    if(viewer.role!=='superadmin'&&['admin','superadmin'].includes(uiRole))return out(403,{ok:false,error:'Solo Super Admin puede invitar Administradores o Super Admin'});
    const platformAccess=cleanPlatformAccess(body.platform_access,uiRole);
    permissionOverrides=applyPlatformAccessToOverrides(permissionOverrides,platformAccess,uiRole);
    const resend=process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY;
    if(!resend)return out(503,{ok:false,error:'Falta configurar RESEND_API_KEY en Netlify'});
    const requestOrigin=clean(event.headers.origin||event.headers.Origin||'',500);
    const site=((/^https?:\/\//i.test(requestOrigin)?requestOrigin:'')||process.env.THINKSTORE_SITE_URL||process.env.URL||'https://thinkstore.com.ve').replace(/\/$/,'');
    const redirectTo=`${site}/panel-login.html?view=recovery`;

    const existing=await findProfileByEmail(url,service,email);
    if(existing&&isInternalProfile(existing))return out(409,{ok:false,code:'INTERNAL_USER_EXISTS',error:'Ese correo ya pertenece a un usuario interno'});
    if(existing&&!isInternalProfile(existing)&&body.promote_existing!==true){
      return out(409,{
        ok:false,
        code:'CLIENT_EXISTS_PROMOTABLE',
        error:'Ese correo ya está registrado como cliente. Puedes conservar su misma cuenta y promoverlo a usuario interno.',
        existing_client:true,
        client:{id:existing.id,email:existing.email||existing.correo||email,name:existing.full_name||existing.nombre||fullName}
      });
    }

    // Cliente ya existente: conservar la misma cuenta Auth, pedidos e historial y
    // convertir únicamente su perfil en usuario interno autorizado.
    if(existing&&!isInternalProfile(existing)&&body.promote_existing===true){
      const userId=existing.id;
      if(!userId)return out(409,{ok:false,error:'El cliente existe pero su perfil no tiene un identificador válido'});
      const promotedName=fullName||existing.full_name||existing.nombre||email.split('@')[0];
      try{
        const authUpdate=await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{method:'PUT',headers:svc(service),body:JSON.stringify({user_metadata:{full_name:promotedName,thinkstore_internal:true},app_metadata:{thinkstore_role:dbRole,thinkstore_internal:true,thinkstore_platforms:enabledPlatformKeys(platformAccess),inventory_role:(uiRole==='superadmin'||uiRole==='admin')?'super_admin':(platformAccess.inventory?.enabled?(platformAccess.inventory.role||'viewer'):null)}})});
        if(!authUpdate.ok)throw detailError('No se pudo habilitar la cuenta existente',await authUpdate.text());
        const promotedProfile=await createInternalProfile(url,service,{id:userId,email,fullName:promotedName,dbRole,custom,invitedBy:viewer.user_id,permissionOverrides,schemaHint:viewer.profile,origin:'client_promoted'});
        const sync=await syncPlatformProfiles({url,service,userId,email,fullName:promotedName,uiRole,permissionOverrides});
        const actionLink=`${site}/panel-login.html?invite=${encodeURIComponent(email)}&promoted=1`;
        let inviteSent=true,inviteWarning='';
        try{
          await sendInternalInvitation({resend,to:email,fullName:promotedName,roleLabel:customRole?.name||roleLabel(uiRole),actionLink,site,staffAccess:effectiveStaffAccess(uiRole,permissionOverrides),platforms:platformAccess,existingAccount:true});
        }catch(mailErr){inviteSent=false;inviteWarning=mailErr?.message||'No se pudo enviar el correo';}
        await auditServer(url,service,viewer,'cliente_promovido_usuario_interno',`${promotedName} · ${email} · ${customRole?.name||roleLabel(uiRole)} · ${enabledPlatformKeys(platformAccess).join(', ')}`);
        return out(200,{ok:true,profile:promotedProfile,promoted_existing:true,invite_sent:inviteSent,invite_warning:inviteWarning,platforms:platformAccess,platform_sync:sync});
      }catch(err){
        return out(502,{ok:false,error:err?.message||'No se pudo promover la cuenta existente',details:err?.detail||''});
      }
    }

    // No enviamos `role` en user_metadata durante generate_link. El trigger histórico
    // handle_new_user() copia ese valor directamente a profiles.role y distintas
    // generaciones de ThinkStore usan CHECKs incompatibles (super_admin vs superadmin,
    // recepcion vs soporte). El trigger crea un perfil base seguro y, a continuación,
    // createInternalProfile() aplica el rol solicitado usando el esquema real detectado.
    const linkResp=await fetch(`${url}/auth/v1/admin/generate_link`,{method:'POST',headers:{...svc(service)},body:JSON.stringify({type:'invite',email,redirect_to:redirectTo,data:{full_name:fullName,thinkstore_internal:true}})});
    const linkBody=await linkResp.json().catch(()=>({}));
    const userId=linkBody?.id,actionLink=linkBody?.action_link;
    if(!linkResp.ok||!userId||!actionLink)return out(linkResp.status||400,{ok:false,error:linkBody?.msg||linkBody?.message||'No se pudo crear la invitación'});

    try{
      const authUpdate=await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{method:'PUT',headers:svc(service),body:JSON.stringify({user_metadata:{full_name:fullName,thinkstore_internal:true},app_metadata:{thinkstore_role:dbRole,thinkstore_internal:true,thinkstore_platforms:enabledPlatformKeys(platformAccess),inventory_role:(uiRole==='superadmin'||uiRole==='admin')?'super_admin':(platformAccess.inventory?.enabled?(platformAccess.inventory.role||'viewer'):null)}})});
      if(!authUpdate.ok)throw detailError('No se pudo preparar la cuenta',await authUpdate.text());
      const createdProfile=await createInternalProfile(url,service,{id:userId,email,fullName,dbRole,custom,invitedBy:viewer.user_id,permissionOverrides,schemaHint:viewer.profile});
      const sync=await syncPlatformProfiles({url,service,userId,email,fullName,uiRole,permissionOverrides});
      await sendInternalInvitation({resend,to:email,fullName,roleLabel:customRole?.name||roleLabel(uiRole),actionLink,site,staffAccess:effectiveStaffAccess(uiRole,permissionOverrides),platforms:platformAccess});
      await auditServer(url,service,viewer,'usuario_interno_invitado',`${fullName} · ${email} · ${customRole?.name||roleLabel(uiRole)} · ${enabledPlatformKeys(platformAccess).join(', ')}`);
      return out(201,{ok:true,profile:createdProfile,invite_sent:true,platforms:platformAccess,platform_sync:sync});
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
    let dbRole=ROLE_MAP[requested]||normalizeDbRole(requested),customRole=null;
    if(custom){
      const rr=await fetch(`${url}/rest/v1/ts_roles?select=*&role_key=eq.${encodeURIComponent(custom)}&active=eq.true&limit=1`,{headers:svc(service)});const rows=await rr.json().catch(()=>[]);customRole=rows?.[0];
      if(!customRole)return out(400,{ok:false,error:'El rol personalizado no existe o está inactivo'});dbRole=customRole.base_role;
    }
    const nextUi=normalizeUiRole(dbRole);
    if(!INTERNAL_UI_ROLES.includes(nextUi))return out(400,{ok:false,error:'Rol interno inválido'});
    if(id===viewer.user_id && (nextUi!=='superadmin'||active===false||custom))return out(409,{ok:false,error:'Por seguridad no puedes degradar, desactivar ni personalizar tu propia cuenta Super Admin'});
    // Solo Super Admin puede conceder o modificar niveles Admin / Super Admin.
    // Esto mantiene al Administrador operativo sin permitir escaladas de privilegios.
    if(viewer.role!=='superadmin' && (['admin','superadmin'].includes(nextUi)||['admin','superadmin'].includes(targetRole)))
      return out(403,{ok:false,error:'Solo Super Admin puede administrar cuentas Administrador o Super Admin'});
    let overrides=cleanOverrides(body.permission_overrides);
    const platformAccess=cleanPlatformAccess(body.platform_access,nextUi);
    if(body.platform_access&&typeof body.platform_access==='object')overrides=applyPlatformAccessToOverrides(overrides,platformAccess,nextUi);

    // Compatibilidad de esquema: ThinkStore tuvo perfiles con role/active y también
    // instalaciones históricas con rol/activo. Select=* nos permite detectar en
    // tiempo real qué columnas existen y actualizar únicamente esas columnas.
    const patch=profileUpdatePatch(target,{dbRole,active,custom,overrides});
    const rr=await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{...svc(service),Prefer:'return=representation'},body:JSON.stringify(patch)});
    const rows=await rr.json().catch(()=>[]);
    if(!rr.ok){
      const detail=Array.isArray(rows)?JSON.stringify(rows):String(rows?.message||rows?.error||rows?.details||'');
      return out(rr.status,{ok:false,error:'No se pudo actualizar el perfil',details:rows,reason:detail});
    }
    const updatedProfile=rows?.[0]||{...target,...patch};
    const targetEmail=target.email||target.correo||'';
    const targetName=target.full_name||target.nombre||target.name||targetEmail;
    const sync=await syncPlatformProfiles({url,service,userId:id,email:targetEmail,fullName:targetName,uiRole:nextUi,permissionOverrides:overrides,active});
    await updateAuthPlatformMetadata(url,service,id,nextUi,platformsFromProfile(updatedProfile));
    await auditServer(url,service,viewer,'acceso_usuario_actualizado',`${targetEmail||targetName||id} · ${custom||nextUi} · ${enabledPlatformKeys(platformsFromProfile(updatedProfile)).join(', ')}`);
    return out(200,{ok:true,profile:updatedProfile,platforms:platformsFromProfile(updatedProfile),platform_sync:sync});
  }
  return out(400,{ok:false,error:'Acción no soportada'});
};
function svc(k){return{apikey:k,Authorization:`Bearer ${k}`,'Content-Type':'application/json'}}
function out(statusCode,body){return{statusCode,headers:H,body:JSON.stringify(body)}}
function projectRef(url){try{const h=new URL(String(url||'')).hostname;return h.endsWith('.supabase.co')?h.slice(0,-'.supabase.co'.length):h}catch{return''}}
function slug(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,40)}
function normalizeDbRole(v){const r=String(v||'').toLowerCase().replace(/[ -]+/g,'_');return ROLE_MAP[r]||null}
function normalizeUiRole(v){let r=String(v||'cliente').toLowerCase().replace(/[ -]+/g,'_');if(r==='super_admin')r='superadmin';if(r==='administrator'||r==='gerente')r='admin';return r}
function cleanPerms(v){return [...new Set((Array.isArray(v)?v:[]).map(x=>String(x||'').trim()).filter(Boolean))].slice(0,150)}
function cleanOverrides(v){const o=v&&typeof v==='object'?v:{};return{allow:cleanPerms(o.allow),deny:cleanPerms(o.deny)}}
function hasOwn(o,k){return Boolean(o)&&Object.prototype.hasOwnProperty.call(o,k)}
function dbRoleForProfileColumn(uiRole,column='role'){
  const r=normalizeUiRole(uiRole);
  // Esquema Growth/Enterprise: profiles.role usa super_admin y no posee soporte.
  // Soporte comparte base técnica con recepción; el rol específico de la plataforma
  // sigue guardándose en platform_access / metadata SSO.
  if(column==='role'){
    if(r==='superadmin')return 'super_admin';
    if(r==='soporte')return 'recepcion';
    return r;
  }
  // Esquema histórico ThinkStore V64: profiles.rol usa superadmin y sí admite soporte.
  if(r==='superadmin')return 'superadmin';
  return r;
}
function profileUpdatePatch(target,{dbRole,active,custom,overrides}){
  const patch={};
  // Rol: adaptar al CHECK real según la columna existente.
  if(hasOwn(target,'role'))patch.role=dbRoleForProfileColumn(dbRole,'role');
  if(hasOwn(target,'rol'))patch.rol=dbRoleForProfileColumn(dbRole,'rol');
  if(!hasOwn(target,'role')&&!hasOwn(target,'rol'))patch.role=dbRoleForProfileColumn(dbRole,'role');

  // Estado activo: mismo criterio para active/activo.
  if(hasOwn(target,'active'))patch.active=active;
  if(hasOwn(target,'activo'))patch.activo=active;
  if(!hasOwn(target,'active')&&!hasOwn(target,'activo'))patch.active=active;

  // Columnas modernas opcionales: no rompen instalaciones históricas si aún no existen.
  if(hasOwn(target,'is_internal'))patch.is_internal=true;
  if(hasOwn(target,'custom_role_key'))patch.custom_role_key=custom||null;
  if(hasOwn(target,'permission_overrides'))patch.permission_overrides=overrides;
  if(hasOwn(target,'updated_at'))patch.updated_at=new Date().toISOString();
  return patch;
}
function effectiveStaffAccess(role,overrides={allow:[],deny:[]}){const r=normalizeUiRole(role);if((overrides.deny||[]).includes('staff.access'))return false;if((overrides.allow||[]).includes('staff.access'))return true;return ['vendedor','admin','superadmin'].includes(r)}
function isInternalProfile(p,u=null){
  if(!p)return false;
  const metaInternal=u?.app_metadata?.thinkstore_internal===true||u?.user_metadata?.thinkstore_internal===true;
  if(metaInternal)return true;
  if(p.is_internal===true)return true;
  if(p.internal_origin||p.internal_invited_at||p.internal_invited_by||p.custom_role_key)return true;
  if(p.is_internal===false)return false;
  // Compatibilidad mínima: solo Admin/Super Admin bootstrap sin columna is_internal.
  return ['admin','superadmin'].includes(normalizeUiRole(p.role||p.rol));
}
function roleLabel(r){return({vendedor:'Vendedor',recepcion:'Recepción / Soporte',soporte:'Soporte',tecnico:'Técnico',logistica:'Logística',admin:'Administrador',superadmin:'Super Admin'})[normalizeUiRole(r)]||String(r||'Usuario interno')}
async function findProfileByEmail(url,service,email){const paths=[`email=eq.${encodeURIComponent(email)}`,`correo=eq.${encodeURIComponent(email)}`];for(const q of paths){const r=await fetch(`${url}/rest/v1/profiles?select=*&${q}&limit=1`,{headers:svc(service)});if(r.ok){const rows=await r.json().catch(()=>[]);if(rows?.[0])return rows[0];}}return null}
async function authenticate(event,url,service){
  const token=String(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
  if(!token)return{ok:false,code:'AUTH_MISSING_TOKEN',reason:'La solicitud llegó sin token Bearer.'};

  let ur,u;
  try{
    ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});
    u=await ur.json().catch(()=>({}));
  }catch(e){
    return{ok:false,code:'AUTH_ENDPOINT_UNAVAILABLE',reason:String(e?.message||e||'Auth no disponible')};
  }
  if(!ur.ok||!u.id){
    return{
      ok:false,
      code:'AUTH_TOKEN_INVALID',
      reason:String(u?.msg||u?.message||`Auth HTTP ${ur.status}`)
    };
  }

  const pr=await fetch(`${url}/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:svc(service)});
  const rows=await pr.json().catch(()=>[]);
  if(!pr.ok)return{ok:false,code:'AUTH_PROFILE_LOOKUP_FAILED',reason:String(rows?.message||rows?.error||`Profiles HTTP ${pr.status}`)};
  const p=rows?.[0];
  if(!p)return{ok:false,code:'AUTH_PROFILE_NOT_FOUND',reason:'La sesión es válida pero no existe perfil interno para este usuario.'};
  if((p.active??p.activo??true)===false)return{ok:false,code:'AUTH_PROFILE_INACTIVE',reason:'El perfil interno está desactivado.'};

  return{
    ok:true,
    user_id:u.id,
    email:u.email||p.email||p.correo||'',
    role:normalizeUiRole(p.role||p.rol),
    internal:isInternalProfile(p,u),
    profile:p
  };
}
async function effectiveAccess(profile,url,service){
  const base=normalizeUiRole(profile?.role||profile?.rol),over=cleanOverrides(profile?.permission_overrides);let permissions=[...(DEFAULT_PERMS[base]||DEFAULT_PERMS.cliente)],roleName=base,customKey=profile?.custom_role_key||null;
  if(customKey){
    const rr=await fetch(`${url}/rest/v1/ts_roles?select=*&role_key=eq.${encodeURIComponent(customKey)}&active=eq.true&limit=1`,{headers:svc(service)});const rows=await rr.json().catch(()=>[]),r=rows?.[0];
    if(r){permissions=cleanPerms(r.permissions);roleName=r.name||customKey;}
  }
  if(!permissions.includes('*')){permissions=[...new Set([...permissions,...over.allow])].filter(x=>!over.deny.includes(x));}
  return{user_id:profile.id,base_role:base,custom_role_key:customKey,role_name:roleName,permissions,permission_overrides:over,platforms:platformsFromProfile(profile)};
}
function platformEmailLabel(key){return({staff:'App Ventas',support:'Servicio Técnico',inventory:'Inventory',enterprise:'Enterprise',marketing:'Marketing',admin:'Panel Admin'})[key]||key}
function invitationHtml({fullName,roleLabelText,actionLink,site,staffAccess=false,platforms={},existingAccount=false}){
  const logo=`${site}/assets/thinkstore-email-logo.jpg`;
  const enabled=enabledPlatformKeys(platforms);
  const chips=enabled.map(k=>`<span style="display:inline-block;margin:0 7px 8px 0;padding:8px 12px;border-radius:999px;background:#f2f2f4;color:#111114;font-size:12px;font-weight:800">${esc(platformEmailLabel(k))}</span>`).join('');
  const security=existingAccount
    ? 'Tu cuenta de cliente existente fue habilitada también como cuenta interna. Conservas tu historial, pedidos y la contraseña que ya utilizas.'
    : 'No se creó una contraseña temporal. Tú definirás tu contraseña privada y el administrador nunca podrá verla.';
  const button=existingAccount?'Entrar a ThinkStore':'Crear mi contraseña';
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111114"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:34px 16px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #e5e5e7;border-radius:30px;overflow:hidden"><tr><td style="background:#0b0b0d;padding:30px 42px"><img src="${esc(logo)}" alt="ThinkStore" style="display:block;width:165px;max-width:60%;height:auto;filter:brightness(0) invert(1)"><div style="margin-top:20px;font-size:11px;letter-spacing:2.3px;text-transform:uppercase;color:#9da0a8;font-weight:800">ThinkStore Admin · Acceso unificado</div></td></tr><tr><td style="padding:40px 42px"><h1 style="font-size:34px;line-height:1.1;margin:0 0 12px;color:#111114">Tu acceso a ThinkStore</h1><p style="font-size:17px;line-height:1.6;color:#606068;margin:0 0 20px">Hola <b style="color:#111114">${esc(fullName)}</b>. ${existingAccount?'Tu cuenta existente ahora tiene acceso al equipo interno':'Has sido invitado al equipo interno'} con el rol <b style="color:#111114">${esc(roleLabelText)}</b>.</p><div style="background:#f7f7f8;border-radius:20px;padding:20px;margin:22px 0"><div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#7b7b83;font-weight:800;margin-bottom:12px">Plataformas asignadas</div>${chips||'<span style="color:#777">Acceso interno según permisos asignados.</span>'}<p style="font-size:14px;color:#5f5f67;line-height:1.6;margin:12px 0 0">Usarás <b>un solo correo y una sola contraseña</b> para tus accesos ThinkStore. Desde el Panel podrás abrir las plataformas que tengas autorizadas.</p></div><div style="background:#eef6ff;border:1px solid #d7e9ff;border-radius:18px;padding:17px;margin:20px 0"><b style="display:block;margin-bottom:6px">Seguridad</b><span style="font-size:13px;line-height:1.55;color:#4b5d73">${esc(security)}</span></div><a href="${esc(actionLink)}" style="display:inline-block;background:#111114;color:#fff;text-decoration:none;padding:15px 25px;border-radius:999px;font-weight:800">${button}</a><p style="font-size:13px;line-height:1.6;color:#8a8a92;margin:28px 0 0">Correo enviado por ThinkStore Admin. Si no esperabas esta invitación, puedes ignorarlo.</p></td></tr></table></td></tr></table></body></html>`
}
async function sendInternalInvitation({resend,to,fullName,roleLabel:roleLabelText,actionLink,site,staffAccess=false,platforms={},existingAccount=false}){
  const from=process.env.FROM_ADMIN_EMAIL||process.env.FROM_ACCESS_EMAIL||'ThinkStore Admin <admin@thinkstore.com.ve>';
  const replyTo=process.env.REPLY_TO_ADMIN||process.env.REPLY_TO_ACCESS||'admin@thinkstore.com.ve';
  const enabled=enabledPlatformKeys(platforms).map(platformEmailLabel).join(' · ');
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],reply_to:replyTo,subject:`Tu acceso ThinkStore · ${enabled||roleLabelText}`,html:invitationHtml({fullName,roleLabelText,actionLink,site,staffAccess,platforms,existingAccount})})});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw detailError(d?.message||'No se pudo enviar el correo de invitación',JSON.stringify(d));return d
}

function defaultPlatformEnabled(role,key){
  const r=normalizeUiRole(role);
  if(['admin','superadmin'].includes(r))return true;
  if(key==='staff')return r==='vendedor';
  if(key==='support')return ['recepcion','soporte','tecnico','logistica'].includes(r);
  if(key==='marketing')return false;
  return false;
}
function defaultPlatformRole(role,key){
  const r=normalizeUiRole(role);
  if(['admin','superadmin'].includes(r))return key==='support'?'superadmin':key==='inventory'?'admin':key==='enterprise'?'manager':key==='marketing'?'sender':r;
  if(key==='support')return ({recepcion:'reception',soporte:'reception',tecnico:'technician',logistica:'logistics',vendedor:'reception'})[r]||'reception';
  if(key==='inventory')return 'viewer';
  if(key==='enterprise')return 'viewer';
  if(key==='marketing')return 'viewer';
  if(key==='staff')return 'vendedor';
  return '';
}
function cleanPlatformRole(key,value,baseRole){
  const v=String(value||'').toLowerCase().replace(/[^a-z_]/g,'');
  const allowed={staff:['vendedor'],support:['reception','technician','sales','logistics','admin','superadmin'],inventory:['viewer','editor','admin'],enterprise:['viewer','manager'],marketing:['viewer','sender'],admin:['superadmin']}[key]||[];
  return allowed.includes(v)?v:defaultPlatformRole(baseRole,key);
}
function cleanPlatformAccess(v,baseRole){
  const src=v&&typeof v==='object'?v:{};const out={};const admin=['admin','superadmin'].includes(normalizeUiRole(baseRole));
  for(const key of PLATFORM_KEYS){const item=src[key]&&typeof src[key]==='object'?src[key]:{};out[key]={enabled:admin?true:(item.enabled===undefined?defaultPlatformEnabled(baseRole,key):item.enabled===true),role:cleanPlatformRole(key,item.role,baseRole)};}
  return out;
}
function stripPlatformPerms(list=[]){return cleanPerms(list).filter(k=>!/^platform\./.test(k)&&!/^(staff|support|inventory|enterprise|marketing|admin)\.role\./.test(k)&&k!=='staff.access')}
function applyPlatformAccessToOverrides(overrides,platforms,baseRole){
  const r=normalizeUiRole(baseRole);if(['admin','superadmin'].includes(r))return cleanOverrides(overrides);
  const allow=stripPlatformPerms(overrides.allow),deny=stripPlatformPerms(overrides.deny);
  for(const key of PLATFORM_KEYS){const p=platforms[key]||{enabled:false,role:''};if(p.enabled){allow.push(`platform.${key}`);if(p.role)allow.push(`${key}.role.${p.role}`);if(key==='staff')allow.push('staff.access');if(key==='marketing'){allow.push('marketing');if(p.role==='sender')allow.push('marketing.send')}}else{deny.push(`platform.${key}`);if(key==='staff')deny.push('staff.access')}}
  return{allow:cleanPerms(allow),deny:cleanPerms(deny)};
}
function findRolePermission(overrides,key,fallback){const p=(overrides?.allow||[]).find(x=>x.startsWith(`${key}.role.`));return p?p.slice(`${key}.role.`.length):fallback}
function platformsFromProfile(profile){
  const base=normalizeUiRole(profile?.role||profile?.rol),over=cleanOverrides(profile?.permission_overrides),admin=['admin','superadmin'].includes(base),out={};
  for(const key of PLATFORM_KEYS){let enabled=admin||defaultPlatformEnabled(base,key);if((over.deny||[]).includes(`platform.${key}`))enabled=false;if((over.allow||[]).includes(`platform.${key}`))enabled=true;out[key]={enabled,role:findRolePermission(over,key,defaultPlatformRole(base,key))};}
  return out;
}
function enabledPlatformKeys(platforms={}){return PLATFORM_KEYS.filter(k=>platforms?.[k]?.enabled)}
function inventoryPermissions(role){if(role==='admin')return{products:true,stock:true,units:true,furniture:true,suppliers:true,locations:true,audit:true,users:true,settings:true,write:true};if(role==='editor')return{products:true,stock:true,units:true,furniture:true,suppliers:true,locations:true,audit:false,users:false,settings:false,write:true};return{products:true,stock:true,units:true,furniture:true,suppliers:true,locations:true,audit:false,users:false,settings:false,write:false}}
function supportRoleFor(base,platforms){if(['admin','superadmin'].includes(normalizeUiRole(base)))return'superadmin';const r=platforms?.support?.role||defaultPlatformRole(base,'support');return ['reception','technician','sales','logistics','admin','superadmin'].includes(r)?r:'reception'}
async function syncPlatformProfiles({url,service,userId,email,fullName,uiRole,permissionOverrides,active=true}){
  const profile={id:userId,email,full_name:fullName,role:uiRole,permission_overrides:permissionOverrides,active};const platforms=platformsFromProfile(profile),warnings=[];
  try{
    const inv=platforms.inventory;
    const invDbRole=['admin','superadmin'].includes(normalizeUiRole(uiRole))?'super_admin':(inv.role==='viewer'?'viewer':'admin');
    const invBody={user_id:userId,role:invDbRole,active:Boolean(active&&inv.enabled),full_name:fullName,email,partner:['admin','superadmin'].includes(normalizeUiRole(uiRole)),permissions:inventoryPermissions(inv.role),updated_at:new Date().toISOString()};
    const ir=await fetch(`${url}/rest/v1/thinkstore_inventory_users?on_conflict=user_id`,{method:'POST',headers:{...svc(service),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(invBody)});if(!ir.ok)warnings.push('Inventory: '+await ir.text());
  }catch(e){warnings.push('Inventory: '+String(e?.message||e))}
  try{
    const supportUrl=clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/+$/,'');const supportKey=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPPORT_SUPABASE_SECRET_KEY);
    if(supportUrl&&supportKey&&email){const sr=supportRoleFor(uiRole,platforms),body={email:String(email).toLowerCase(),nombre:fullName||email,rol:sr,activo:Boolean(active&&platforms.support.enabled)};const rr=await fetch(`${supportUrl}/rest/v1/service_users?on_conflict=email`,{method:'POST',headers:{apikey:supportKey,Authorization:`Bearer ${supportKey}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});if(!rr.ok)warnings.push('Soporte: '+await rr.text())}
  }catch(e){warnings.push('Soporte: '+String(e?.message||e))}
  return{ok:warnings.length===0,warnings,platforms};
}
async function updateAuthPlatformMetadata(url,service,userId,uiRole,platforms){try{await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{method:'PUT',headers:svc(service),body:JSON.stringify({app_metadata:{thinkstore_role:uiRole,thinkstore_internal:true,thinkstore_platforms:enabledPlatformKeys(platforms),inventory_role:['admin','superadmin'].includes(normalizeUiRole(uiRole))?'super_admin':(platforms.inventory?.enabled?(platforms.inventory.role||'viewer'):null)}})})}catch{}}

async function createInternalProfile(url,service,{id,email,fullName,dbRole,custom,invitedBy,permissionOverrides,schemaHint=null,origin='panel_invite'}){
  const invitedAt=new Date().toISOString();
  const marker={is_internal:true,internal_origin:origin||'panel_invite',internal_invited_at:invitedAt,internal_invited_by:invitedBy||null};
  const uiRole=normalizeUiRole(dbRole);
  if(!INTERNAL_UI_ROLES.includes(uiRole))throw detailError('Rol interno no válido',String(dbRole||''));

  // La cuenta que ejecuta la invitación vive en la misma tabla profiles, así que su
  // forma nos permite saber si este proyecto usa el esquema moderno role/active o el
  // histórico rol/activo sin alterar constraints.
  const modern=hasOwn(schemaHint,'role')||!hasOwn(schemaHint,'rol');
  const roleColumn=modern?'role':'rol';
  const activeColumn=modern?'active':'activo';
  const storedRole=dbRoleForProfileColumn(uiRole,roleColumn);
  const extended={custom_role_key:custom||null,permission_overrides:permissionOverrides||{allow:[],deny:[]},...marker};

  const nameVariants=modern
    ? [{full_name:fullName},{nombre:fullName}]
    : [{nombre:fullName},{full_name:fullName}];
  const candidates=[];
  for(const namePart of nameVariants){
    candidates.push({id,email,...namePart,[roleColumn]:storedRole,[activeColumn]:true,...extended});
    // Fallback por si aún faltan columnas opcionales de V14.70/V14.71.
    candidates.push({id,email,...namePart,[roleColumn]:storedRole,[activeColumn]:true});
  }

  let last='';
  for(const profile of candidates){
    const r=await fetch(`${url}/rest/v1/profiles?on_conflict=id`,{
      method:'POST',
      headers:{...svc(service),Prefer:'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify(profile)
    });
    const d=await r.json().catch(()=>[]);
    if(r.ok)return d?.[0]||profile;
    last=JSON.stringify(d);
  }
  throw detailError('No se pudo crear el perfil interno',last);
}
async function rollbackInvite(url,service,userId){if(!userId)return;await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,{method:'DELETE',headers:svc(service)}).catch(()=>{});await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{method:'DELETE',headers:svc(service)}).catch(()=>{})}
async function auditServer(url,service,viewer,accion,detalle){const body={actor:viewer.user_id,actor_email:viewer.email||viewer.profile?.email||'',accion,detalle};await fetch(`${url}/rest/v1/audit_log`,{method:'POST',headers:{...svc(service),Prefer:'return=minimal'},body:JSON.stringify(body)}).catch(()=>{})}
function detailError(message,detail=''){const e=new Error(message);e.detail=detail;return e}
