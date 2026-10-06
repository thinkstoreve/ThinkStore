const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0'
  }
});

const allPermissions = {
  products:true, stock:true, units:true, furniture:true, suppliers:true,
  locations:true, audit:true, users:true, settings:true
};
const PRIMARY_PARTNER_EMAIL='thinkstore.ve@gmail.com';
const PRIMARY_PARTNER_NAME='Freddy Sedispa';
const clean = (v,max=240) => String(v ?? '').trim().slice(0,max);
const digits = v => clean(v,24).replace(/\D+/g,'');
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));


function isJwtKey(v){return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(v||'').trim())}
function serverHeaders(key,extra={}){const h={apikey:key,...extra};if(isJwtKey(key))h.Authorization=`Bearer ${key}`;return h}

function envValues(env) {
  const base = String(env.THINKSTORE_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const publishable = env.THINKSTORE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  const service = env.THINKSTORE_SUPABASE_SECRET_KEY || env.THINKSTORE_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const resend = env.RESEND_API_KEY || '';
  const appUrl = String(env.INVENTORY_APP_URL || 'https://inventory.thinkstore.com.ve').replace(/\/$/,'');
  const inviteFrom = env.INVENTORY_INVITE_FROM || 'ThinkStore Inventory <noreply@thinkstore.com.ve>';
  const replyTo = env.INVENTORY_REPLY_TO || '';
  return { base, publishable, service, resend, appUrl, inviteFrom, replyTo };
}

async function fetchProfile(env,userId){
  const {base,service}=envValues(env);
  const r=await fetch(`${base}/rest/v1/thinkstore_inventory_users?select=*&user_id=eq.${encodeURIComponent(userId)}&limit=1`,{headers:serverHeaders(service)});
  if(!r.ok)return null;
  return (await r.json())?.[0]||null;
}

async function getRequester(env, authHeader) {
  const {base,publishable}=envValues(env);
  if (!base || !publishable || !authHeader?.startsWith('Bearer ')) return null;
  const userResp = await fetch(`${base}/auth/v1/user`, { headers:{Authorization:authHeader,apikey:publishable} });
  if (!userResp.ok) return null;
  const user = await userResp.json();
  if (!user?.id) return null;
  const email = String(user.email || '').toLowerCase();
  const appRole = String(user.app_metadata?.inventory_role || '').toLowerCase();
  const profile=await fetchProfile(env,user.id).catch(()=>null);
  if (email === PRIMARY_PARTNER_EMAIL || appRole === 'super_admin') {
    const safeProfile=profile||{user_id:user.id,full_name:PRIMARY_PARTNER_NAME,email:user.email,role:'super_admin',active:true};
    if(email===PRIMARY_PARTNER_EMAIL)safeProfile.full_name=PRIMARY_PARTNER_NAME;
    return {user, profile:safeProfile};
  }
  if (!profile?.active || profile.role !== 'super_admin') return null;
  return {user,profile};
}

async function audit(env, requester, action, entityId, details={}) {
  const {base,service}=envValues(env);
  if (!base || !service) return;
  await fetch(`${base}/rest/v1/thinkstore_inventory_audit`, {
    method:'POST',
    headers:serverHeaders(service,{'Content-Type':'application/json','Prefer':'return=minimal'}),
    body:JSON.stringify({
      id:crypto.randomUUID(), workspace_key:'main', actor_user_id:requester.user.id,
      actor_name:requester.profile.full_name || requester.profile.email || requester.user.email || 'Super Admin',
      actor_email:requester.profile.email || requester.user.email || '', action,
      entity_type:'user', entity_id:entityId, details
    })
  }).catch(()=>{});
}

function invitationHtml({fullName,corporateEmail,actionLink,appUrl}) {
  const safeName=escapeHtml(fullName),safeCorporate=escapeHtml(corporateEmail),safeLink=escapeHtml(actionLink),safeLogo=escapeHtml(`${appUrl}/icons/thinkstore-logo.png`);
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111114"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #e5e5e7;border-radius:28px"><tr><td style="padding:42px"><img src="${safeLogo}" width="72" height="72" alt="ThinkStore" style="display:block;border-radius:18px"><div style="margin-top:28px;font-size:12px;letter-spacing:2.4px;text-transform:uppercase;color:#7b7b83;font-weight:800">ThinkStore Inventory</div><h1 style="font-size:34px;margin:12px 0">Bienvenido, Sr. ${safeName}</h1><p style="font-size:18px;line-height:1.6;color:#606068">Tu nuevo panel administrador exclusivo de ThinkStore ya está listo.</p><div style="background:#f7f7f8;border-radius:18px;padding:20px;margin:22px 0"><div style="font-size:12px;text-transform:uppercase;color:#8a8a92;font-weight:700">Correo corporativo de acceso</div><div style="font-size:18px;font-weight:750;margin-top:7px">${safeCorporate}</div></div><p style="font-size:16px;line-height:1.6;color:#4f4f56">Por seguridad no se creó una contraseña temporal. Crea una contraseña personal que solo tú conocerás.</p><a href="${safeLink}" style="display:inline-block;background:#111114;color:#fff;text-decoration:none;padding:15px 24px;border-radius:14px;font-weight:800">Crear mi contraseña</a><p style="font-size:13px;line-height:1.55;color:#888891;margin-top:28px">Panel privado de administración de ThinkStore Inventory.</p></td></tr></table></td></tr></table></body></html>`;
}

function deleteCodeHtml({requesterName,targetName,code,appUrl}){
  const safeRequester=escapeHtml(requesterName||'Administrador'),safeTarget=escapeHtml(targetName||'socio'),safeCode=escapeHtml(code),safeLogo=escapeHtml(`${appUrl}/icons/thinkstore-logo.png`);
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111114"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #e5e5e7;border-radius:28px"><tr><td style="padding:42px"><img src="${safeLogo}" width="68" height="68" alt="ThinkStore" style="display:block;border-radius:18px"><div style="margin-top:26px;font-size:12px;letter-spacing:2.2px;text-transform:uppercase;color:#7b7b83;font-weight:800">ThinkStore Inventory · Seguridad</div><h1 style="font-size:30px;margin:12px 0">Código de verificación</h1><p style="font-size:17px;line-height:1.6;color:#606068">Hola ${safeRequester}. Se solicitó eliminar la cuenta del socio <b>${safeTarget}</b>.</p><div style="font-size:36px;letter-spacing:8px;font-weight:900;text-align:center;background:#f4f4f6;border-radius:18px;padding:22px;margin:24px 0">${safeCode}</div><p style="font-size:15px;line-height:1.6;color:#4f4f56">El código vence en <b>10 minutos</b>. Si no solicitaste esta acción, no compartas el código y no continúes.</p></td></tr></table></td></tr></table></body></html>`;
}

async function sendResend(env,payload){
  const {resend}=envValues(env);if(!resend)throw Object.assign(new Error('INVITE_EMAIL_ENV_MISSING'),{code:'INVITE_EMAIL_ENV_MISSING'});
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const d=await r.json().catch(()=>({}));if(!r.ok){const err=new Error('EMAIL_SEND_FAILED');err.detail=d?.message||d?.error||`RESEND_${r.status}`;throw err}return d;
}

async function sendInvitation(env,{to,fullName,corporateEmail,actionLink}) {
  const {inviteFrom,replyTo,appUrl}=envValues(env);
  const payload={from:inviteFrom,to:[to],subject:`Bienvenido a ThinkStore Inventory, ${fullName}`,html:invitationHtml({fullName,corporateEmail,actionLink,appUrl})};
  if(replyTo)payload.reply_to=replyTo;return sendResend(env,payload);
}

async function sendDeleteCode(env,{to,requesterName,targetName,code}){
  const {inviteFrom,replyTo,appUrl}=envValues(env);
  const payload={from:inviteFrom,to:[to],subject:'Código de seguridad · Eliminar socio en ThinkStore Inventory',html:deleteCodeHtml({requesterName,targetName,code,appUrl})};
  if(replyTo)payload.reply_to=replyTo;return sendResend(env,payload);
}

function maskEmail(email=''){
  const [name,domain]=String(email).split('@');if(!name||!domain)return 'tu correo registrado';
  return `${name.slice(0,Math.min(2,name.length))}${'*'.repeat(Math.max(2,name.length-2))}@${domain}`;
}
async function hmacHex(secret,message){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(secret)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message)));
  return Array.from(sig,b=>b.toString(16).padStart(2,'0')).join('');
}
async function makeDeleteChallenge(service,requesterId,targetId,expires,code){return hmacHex(service,`delete|${requesterId}|${targetId}|${expires}|${code}`)}
function secureCode(){const n=new Uint32Array(1);crypto.getRandomValues(n);return String(n[0]%1000000).padStart(6,'0')}

async function rollbackCreatedPartner(env,userId){
  const {base,service}=envValues(env);
  await fetch(`${base}/rest/v1/thinkstore_inventory_users?user_id=eq.${encodeURIComponent(userId)}`,{method:'DELETE',headers:serverHeaders(service,{'Prefer':'return=minimal'})}).catch(()=>{});
  await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{method:'DELETE',headers:serverHeaders(service)}).catch(()=>{});
}

export async function handle(context) {
  const {base,publishable,service,resend,appUrl}=envValues(context.env);
  if (!base || !publishable || !service) return json({error:'SERVER_ADMIN_ENV_MISSING'},503);
  const authHeader = context.request.headers.get('Authorization') || '';
  const requester = await getRequester(context.env, authHeader);
  if (!requester) return json({error:'SUPER_ADMIN_REQUIRED'},403);

  try {
    if (context.request.method === 'GET') {
      const r = await fetch(`${base}/rest/v1/thinkstore_inventory_users?select=*&order=created_at.asc`, {headers:serverHeaders(service)});
      if (!r.ok) return json({error:'USERS_LIST_FAILED',detail:await r.text()},r.status);
      return json({users:await r.json()});
    }

    const body = await context.request.json().catch(()=>({}));

    if(context.request.method==='POST' && body.action==='request_delete'){
      if(!resend)return json({error:'INVITE_EMAIL_ENV_MISSING'},503);
      const userId=clean(body.user_id,80);if(!userId)return json({error:'USER_ID_REQUIRED'},400);
      if(userId===requester.user.id)return json({error:'CANNOT_DELETE_SELF'},400);
      const target=await fetchProfile(context.env,userId);if(!target)return json({error:'PARTNER_NOT_FOUND'},404);
      if(String(target.email||'').toLowerCase()===PRIMARY_PARTNER_EMAIL)return json({error:'PRIMARY_PARTNER_PROTECTED'},403);
      const destination=String(requester.profile?.invite_email||requester.profile?.email||requester.user.email||'').trim();
      if(!validEmail(destination))return json({error:'VERIFICATION_EMAIL_MISSING'},400);
      const code=secureCode(),expires=Date.now()+10*60*1000,signature=await makeDeleteChallenge(service,requester.user.id,userId,expires,code);
      await sendDeleteCode(context.env,{to:destination,requesterName:requester.profile?.full_name||requester.user.email,targetName:target.full_name||target.email,code});
      await audit(context.env,requester,'Código de verificación solicitado para eliminar socio',userId,{full_name:target.full_name,email:target.email});
      return json({challenge:`${expires}.${signature}`,destination_hint:maskEmail(destination),expires_in:600});
    }

    if (context.request.method === 'POST') {
      const email=clean(body.email,320).toLowerCase(), inviteEmail=clean(body.invite_email,320).toLowerCase();
      const phone=clean(body.phone,40), fullName=clean(body.full_name,180);
      const documentType=clean(body.document_type,1).toUpperCase(), documentNumber=digits(body.document_number), notes=clean(body.personal_notes,1000);
      if(!validEmail(email)) return json({error:'INVALID_EMAIL'},400);
      if(!email.endsWith('@thinkstore.com.ve')) return json({error:'INVALID_CORPORATE_EMAIL'},400);
      if(!validEmail(inviteEmail)) return json({error:'INVALID_INVITE_EMAIL'},400);
      if(!fullName) return json({error:'FULL_NAME_REQUIRED'},400);
      if(!['V','E','J','P'].includes(documentType)) return json({error:'INVALID_DOCUMENT_TYPE'},400);
      if(documentNumber.length<5) return json({error:'INVALID_DOCUMENT_NUMBER'},400);
      if(!resend) return json({error:'INVITE_EMAIL_ENV_MISSING'},503);

      const linkResp=await fetch(`${base}/auth/v1/admin/generate_link`,{
        method:'POST',headers:serverHeaders(service,{'Content-Type':'application/json'}),
        body:JSON.stringify({type:'invite',email,redirect_to:`${appUrl}/setup-password.html`,data:{full_name:fullName,partner:true,document_type:documentType,document_number:documentNumber}})
      });
      const linkBody=await linkResp.json().catch(()=>({}));
      const userId=linkBody?.id,actionLink=linkBody?.action_link;
      if(!linkResp.ok||!userId||!actionLink) return json({error:linkBody?.msg||linkBody?.message||'AUTH_INVITE_LINK_FAILED'},linkResp.status||400);

      try{
        const authUpdate=await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{
          method:'PUT',headers:serverHeaders(service,{'Content-Type':'application/json'}),
          body:JSON.stringify({user_metadata:{full_name:fullName,partner:true,document_type:documentType,document_number:documentNumber},app_metadata:{inventory_role:'super_admin',partner:true}})
        });
        if(!authUpdate.ok)throw new Error('AUTH_USER_UPDATE_FAILED');
        const sentAt=new Date().toISOString();
        const profile={user_id:userId,role:'super_admin',active:true,full_name:fullName,email,invite_email:inviteEmail,invitation_sent_at:sentAt,phone,document_type:documentType,document_number:documentNumber,partner:true,permissions:allPermissions,personal_notes:notes,updated_by:requester.user.id,updated_at:sentAt};
        const prof=await fetch(`${base}/rest/v1/thinkstore_inventory_users`,{method:'POST',headers:serverHeaders(service,{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'}),body:JSON.stringify(profile)});
        if(!prof.ok){const err=new Error('PROFILE_CREATE_FAILED');err.detail=await prof.text();throw err}
        await sendInvitation(context.env,{to:inviteEmail,fullName,corporateEmail:email,actionLink});
        await audit(context.env,requester,'Invitación de socio super admin enviada',userId,{full_name:fullName,email,role:'super_admin'});
        return json({user:profile,invite_sent:true},201);
      }catch(err){
        await rollbackCreatedPartner(context.env,userId);
        return json({error:err?.message||'PARTNER_INVITE_FAILED',detail:err?.detail||''},err?.message==='EMAIL_SEND_FAILED'?502:400);
      }
    }

    if (context.request.method === 'PATCH') {
      const userId=clean(body.user_id,80); if(!userId) return json({error:'USER_ID_REQUIRED'},400);
      const fullName=clean(body.full_name,180), email=clean(body.email,320).toLowerCase(), phone=clean(body.phone,40);
      const documentType=clean(body.document_type,1).toUpperCase(), documentNumber=digits(body.document_number), notes=clean(body.personal_notes,1000), active=body.active!==false;
      if(!fullName||!validEmail(email)) return json({error:'INVALID_PROFILE'},400);
      if(!email.endsWith('@thinkstore.com.ve') && email!==PRIMARY_PARTNER_EMAIL) return json({error:'INVALID_CORPORATE_EMAIL'},400);
      if(!['V','E','J','P'].includes(documentType)||documentNumber.length<5) return json({error:'INVALID_DOCUMENT'},400);
      const avatarUrl=('avatar_url' in body)?clean(body.avatar_url,1000):undefined,avatarKey=('avatar_key' in body)?clean(body.avatar_key,500):undefined;

      const existing=await fetchProfile(context.env,userId);
      const userMetadata={full_name:fullName,partner:true,document_type:documentType,document_number:documentNumber};
      if(avatarUrl!==undefined)userMetadata.avatar_url=avatarUrl;
      const authUpdate=await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{
        method:'PUT',headers:serverHeaders(service,{'Content-Type':'application/json'}),
        body:JSON.stringify({email,user_metadata:userMetadata,app_metadata:{inventory_role:'super_admin',partner:true}})
      });
      if(!authUpdate.ok) return json({error:'AUTH_USER_UPDATE_FAILED',detail:await authUpdate.text()},authUpdate.status);
      const patch={full_name:fullName,email,phone,document_type:documentType,document_number:documentNumber,partner:true,role:'super_admin',active,permissions:allPermissions,personal_notes:notes,updated_by:requester.user.id,updated_at:new Date().toISOString()};
      if(avatarUrl!==undefined)patch.avatar_url=avatarUrl;
      if(avatarKey!==undefined)patch.avatar_key=avatarKey;
      const prof=await fetch(`${base}/rest/v1/thinkstore_inventory_users?user_id=eq.${encodeURIComponent(userId)}`,{
        method:'PATCH',headers:serverHeaders(service,{'Content-Type':'application/json','Prefer':'return=representation'}),body:JSON.stringify(patch)
      });
      if(!prof.ok) return json({error:'PROFILE_UPDATE_FAILED',detail:await prof.text()},prof.status);
      if(existing?.avatar_key && avatarKey!==undefined && avatarKey!==existing.avatar_key && context.env.INVENTORY_MEDIA){await context.env.INVENTORY_MEDIA.delete(existing.avatar_key).catch(()=>{})}
      await audit(context.env,requester,'Socio super admin actualizado',userId,{full_name:fullName,email,active,avatar_updated:avatarUrl!==undefined});
      return json({user:{user_id:userId,...patch}});
    }

    if(context.request.method==='DELETE'){
      if(body.action!=='confirm_delete')return json({error:'INVALID_DELETE_ACTION'},400);
      const userId=clean(body.user_id,80),code=digits(body.code).slice(0,6),challenge=clean(body.challenge,300);
      if(!userId||code.length!==6||!challenge)return json({error:'DELETE_VERIFICATION_REQUIRED'},400);
      if(userId===requester.user.id)return json({error:'CANNOT_DELETE_SELF'},400);
      const target=await fetchProfile(context.env,userId);if(!target)return json({error:'PARTNER_NOT_FOUND'},404);
      if(String(target.email||'').toLowerCase()===PRIMARY_PARTNER_EMAIL)return json({error:'PRIMARY_PARTNER_PROTECTED'},403);
      const [expiresText,signature]=challenge.split('.'),expires=Number(expiresText);
      if(!expires||!signature||Date.now()>expires)return json({error:'DELETE_CODE_EXPIRED'},400);
      const expected=await makeDeleteChallenge(service,requester.user.id,userId,expires,code);
      if(expected!==signature)return json({error:'INVALID_DELETE_CODE'},400);
      const authDelete=await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`,{method:'DELETE',headers:serverHeaders(service)});
      if(!authDelete.ok&&authDelete.status!==404)return json({error:'AUTH_USER_DELETE_FAILED',detail:await authDelete.text()},authDelete.status);
      const profDelete=await fetch(`${base}/rest/v1/thinkstore_inventory_users?user_id=eq.${encodeURIComponent(userId)}`,{method:'DELETE',headers:serverHeaders(service,{'Prefer':'return=minimal'})});
      if(!profDelete.ok)return json({error:'PROFILE_DELETE_FAILED',detail:await profDelete.text()},profDelete.status);
      if(target.avatar_key&&context.env.INVENTORY_MEDIA)await context.env.INVENTORY_MEDIA.delete(target.avatar_key).catch(()=>{});
      await audit(context.env,requester,'Socio eliminado con verificación por correo',userId,{full_name:target.full_name,email:target.email});
      return json({deleted:true,user_id:userId});
    }

    return json({error:'METHOD_NOT_ALLOWED'},405);
  } catch(error) {
    return json({error:error?.message||'ADMIN_USERS_FAILED',detail:error?.detail||''},500);
  }
}

export function onRequestGet(context){ return handle(context); }
export function onRequestPost(context){ return handle(context); }
export function onRequestPatch(context){ return handle(context); }
export function onRequestDelete(context){ return handle(context); }
export function onRequestOptions(){ return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}}); }
export function onRequest(){ return json({error:'METHOD_NOT_ALLOWED'},405); }
