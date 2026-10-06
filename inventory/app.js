const $ = (s, r=document) => r.querySelector(s)
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0))
const dt = v => v ? new Intl.DateTimeFormat('es-VE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)) : '—'
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`)

const icons = {home:'⌂',products:'▣',stock:'▤',units:'▥',furniture:'▦',scan:'⌗',movements:'⇄',locations:'⌖',suppliers:'♙',purchases:'$',partners:'♟',audit:'◷',settings:'⚙',search:'⌕',refresh:'↻'}
const KEYS={products:'tsi_products',units:'tsi_units',stock:'tsi_stock_balances',movements:'tsi_movements',locations:'tsi_locations',suppliers:'tsi_suppliers',purchases:'tsi_purchases',furniture:'tsi_furniture',lastBackup:'tsi_last_backup_at',lastRestore:'tsi_last_restore_at',restoreSafety:'tsi_restore_safety_backup',remoteVersion:'tsi_remote_version',pendingSync:'tsi_pending_cloud_sync'}
const APP_VERSION='3.2.32'
const BACKUP_FORMAT_VERSION=2
const ONLINE_CONFIG=window.TS_CONFIG||{}
let cloud={client:null,session:null,profile:null,adminUsers:[],auditRows:[],lastUpdate:null,remoteVersion:Number(localStorage.getItem(KEYS.remoteVersion)||0),workspace:ONLINE_CONFIG.WORKSPACE||'main',syncTimer:null,syncing:false,applyingRemote:false,channel:null,lastError:'',lastSyncedAt:null,pendingSave:false,pendingOfflineSync:localStorage.getItem(KEYS.pendingSync)==='1',degraded:false,reconnectTimer:null,reconnectInFlight:false,reconnectAttempt:0,lifecycleHooksInstalled:false,sessionBootInFlight:null,bootstrappedUserId:'',mediaRetryTimer:null,mediaRetryAttempt:0,mediaRetryInFlight:false,remoteReloadTimer:null,remoteReloadInFlight:false,pendingRemoteVersion:0}
function cloudConfigured(){return !!(ONLINE_CONFIG.SUPABASE_URL&&ONLINE_CONFIG.SUPABASE_PUBLISHABLE_KEY&&!String(ONLINE_CONFIG.SUPABASE_URL).includes('PASTE_')&&!String(ONLINE_CONFIG.SUPABASE_PUBLISHABLE_KEY).includes('PASTE_'))}
function setCloudStatus(status,text){const el=$('#cloudStatus');if(!el)return;el.className=`dot ${status==='online'?'':'demo'}`;const label=$('#cloudStatusText');if(label)label.textContent=text||status}
const BRAND_LOGO='./icons/thinkstore-logo.png'
const PRIMARY_PARTNER_EMAIL='thinkstore.ve@gmail.com'
const PRIMARY_PARTNER_NAME='Freddy Sedispa'
function partnerDisplayName(profile={},fallbackEmail=''){
 const email=String(profile?.email||fallbackEmail||'').trim().toLowerCase()
 // La cuenta principal pertenece a Freddy Sedispa. Su correo es la identidad
 // canónica: un full_name histórico/genérico nunca debe reemplazarla.
 if(email===PRIMARY_PARTNER_EMAIL)return PRIMARY_PARTNER_NAME
 const explicit=String(profile?.full_name||'').trim()
 if(explicit)return explicit
 return ''
}
function auditActorName(row={}){
 const email=String(row.actor_email||'').trim().toLowerCase()
 const name=String(row.actor_name||'').trim()
 if(email===PRIMARY_PARTNER_EMAIL && (!name||['usuario','super admin','administrador',PRIMARY_PARTNER_EMAIL].includes(name.toLowerCase())))return PRIMARY_PARTNER_NAME
 return name||'Sistema'
}
function adminDisplayName(){
 const u=cloud.session?.user||{}
 return String(partnerDisplayName(cloud.profile,u.email)||u.user_metadata?.full_name||u.user_metadata?.name||(String(u.email||'').toLowerCase()===PRIMARY_PARTNER_EMAIL?PRIMARY_PARTNER_NAME:'')).trim()
}
function adminInitials(){
 const name=adminDisplayName()
 if(name){const parts=name.split(/\s+/).filter(Boolean);return ((parts[0]?.[0]||'')+(parts[1]?.[0]||parts[0]?.[1]||'')).toUpperCase()}
 return 'SA'
}
function avatarContent(profile={},fallback='SA'){const url=String(profile?.avatar_url||'').trim();return url?`<img src="${esc(url)}" alt="Foto de perfil">`:esc(fallback)}
function currentActorName(){
 return String(partnerDisplayName(cloud.profile,cloud.session?.user?.email)||adminDisplayName()||cloud.session?.user?.email?.split('@')[0]||'Administrador').trim()
}
function currentActorEmail(){return String(cloud.profile?.email||cloud.session?.user?.email||'').trim()}

function corporateEmailFromName(name=''){
 const parts=String(name||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9\s.-]/g,' ').split(/\s+/).filter(Boolean)
 if(!parts.length)return ''
 const first=parts[0].replace(/[^a-z0-9]/g,'')
 const last=(parts.length>1?parts[parts.length-1]:'').replace(/[^a-z0-9]/g,'')
 return `${first}${last?'.'+last:''}@thinkstore.com.ve`
}
function currentActorId(){return cloud.session?.user?.id||''}
function isSuperAdmin(){return cloud.profile?.role==='super_admin'&&cloud.profile?.active!==false}
function canInventoryWrite(){return isSuperAdmin()||cloud.profile?.permissions?.write===true}
function inventoryAccessLabel(){if(isSuperAdmin())return 'Super Admin';if(cloud.profile?.permissions?.write===true)return 'Editor';return 'Solo lectura'}
function actorFields(){return {user_name:currentActorName(),user_email:currentActorEmail(),user_id:currentActorId()}}
function lastUpdateText(){
 const u=cloud.lastUpdate||{};if(!u.at)return 'Sin actualizaciones registradas'
 const email=String(u.email||'').trim().toLowerCase()
 const name=email===PRIMARY_PARTNER_EMAIL?PRIMARY_PARTNER_NAME:(u.name||u.email||'Usuario')
 return `Última actualización del inventario · ${dt(u.at)} · por ${name}`
}
function refreshLastUpdateUI(){const el=$('#lastUpdateLabel');if(el)el.textContent=lastUpdateText()}
const DATA_API_TIMEOUT_MS=2200
function isDataApiUnavailable(err){
 const code=String(err?.code||'').toUpperCase(),msg=String(err?.message||err||'')
 return code==='PGRST002'||code==='TS_DATA_TIMEOUT'||/schema cache|could not query the database|failed to fetch|networkerror|aborted|timeout|timed out|no respondió a tiempo/i.test(msg)
}
function isStockReservationConflict(err){
 const msg=String(err?.message||err||'')
 return /SYNC_STOCK_BELOW_RESERVED|stock físico .* menor que reservado/i.test(msg)
}
async function runDataApi(builder,timeoutMs=DATA_API_TIMEOUT_MS,label='Supabase Data API'){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.max(750,Number(timeoutMs)||DATA_API_TIMEOUT_MS))
 try{
   const request=builder&&typeof builder.abortSignal==='function'?builder.abortSignal(controller.signal):builder
   const result=await request
   if(result?.error)throw result.error
   return result?.data
 }catch(err){
   if(controller.signal.aborted){const timeoutErr=new Error(`${label} no respondió a tiempo`);timeoutErr.code='TS_DATA_TIMEOUT';throw timeoutErr}
   throw err
 }finally{clearTimeout(timer)}
}
function fallbackProfileFromSession(){
 const u=cloud.session?.user||{},email=String(u.email||'').trim().toLowerCase(),meta=u.user_metadata||{},appMeta=u.app_metadata||{}
 const secureRole=String(appMeta.inventory_role||appMeta.role||'').toLowerCase()
 const authorized=email===PRIMARY_PARTNER_EMAIL||secureRole==='super_admin'||secureRole==='admin'
 if(!authorized)throw new Error('La Data API de Supabase está temporalmente no disponible y esta cuenta no tiene autorización de emergencia.')
 return {user_id:u.id,role:secureRole||'super_admin',active:true,full_name:String(meta.full_name||meta.name||(email===PRIMARY_PARTNER_EMAIL?PRIMARY_PARTNER_NAME:'')).trim(),email:u.email||'',phone:u.phone||meta.phone||'',document_type:meta.document_type||'',document_number:meta.document_number||'',avatar_url:meta.avatar_url||'',avatar_key:'',partner:true,permissions:{products:true,stock:true,units:true,furniture:true,suppliers:true,locations:true,audit:true,users:true,settings:true},degraded_profile:true}
}
function markPendingOfflineSync(){cloud.pendingOfflineSync=true;localStorage.setItem(KEYS.pendingSync,'1')}
function clearPendingOfflineSync(){cloud.pendingOfflineSync=false;localStorage.removeItem(KEYS.pendingSync)}
function backgroundSyncAllowed(){return navigator.onLine!==false&&document.visibilityState!=='hidden'}
function recoveryDelayMs(){
 const steps=[60000,120000,300000,600000,900000]
 return steps[Math.min(cloud.reconnectAttempt,steps.length-1)]
}
function scheduleCloudRecovery(delay=null){
 if(!cloud.session)return
 clearTimeout(cloud.reconnectTimer)
 if(!backgroundSyncAllowed())return
 const wait=delay==null?recoveryDelayMs():Math.max(2500,Number(delay)||0)
 cloud.reconnectTimer=setTimeout(()=>tryCloudRecovery(false),wait)
}
function installCloudLifecycleHooks(){
 if(cloud.lifecycleHooksInstalled)return
 cloud.lifecycleHooksInstalled=true
 window.addEventListener('online',()=>{if(cloud.degraded){cloud.reconnectAttempt=0;scheduleCloudRecovery(4000)}})
 window.addEventListener('offline',()=>{clearTimeout(cloud.reconnectTimer);clearTimeout(cloud.mediaRetryTimer);setCloudStatus('offline','Sin conexión · copia local')})
 document.addEventListener('visibilitychange',()=>{
   if(document.visibilityState==='hidden'){clearTimeout(cloud.reconnectTimer);clearTimeout(cloud.mediaRetryTimer);return}
   if(cloud.degraded)scheduleCloudRecovery(6000)
   else if(hasPendingMedia())scheduleMediaRetry(8000)
 })
}
async function fetchRemoteStateRow(timeoutMs=DATA_API_TIMEOUT_MS){
 const data=await runDataApi(cloud.client.rpc('inventory_get_state',{p_workspace:cloud.workspace}),timeoutMs,'Inventario de Supabase')
 return data||{}
}
function profileFromStateRow(row={}){
 const p=row?.profile
 if(!p||!p.user_id||p.active===false)return null
 return p
}
function applyRemoteStateRow(row){
 cloud.remoteVersion=Number(row.version||0);localStorage.setItem(KEYS.remoteVersion,String(cloud.remoteVersion));cloud.lastUpdate=row.last_update||{at:row.updated_at||null};refreshLastUpdateUI()
 const payload=preservePendingLocalMedia(hydrateRemoteMedia(row.payload||{}));cloud.applyingRemote=true
 try{state.products=payload.products||[];state.units=payload.units||[];state.stock=payload.stock||[];state.movements=payload.movements||[];state.locations=payload.locations||[];state.suppliers=payload.suppliers||[];state.purchases=payload.purchases||[];state.furniture=payload.furniture||[];persistLocalOnly();migrate();if($('#content'))renderPage()}finally{cloud.applyingRemote=false}
}
function enterDegradedMode(err,{showNotice=true}={}){
 cloud.degraded=true;cloud.lastError=err?.message||String(err||'Data API no disponible')
 try{cloud.profile=fallbackProfileFromSession()}catch(profileErr){renderLogin(profileErr.message);return false}
 shell();renderPage();setCloudStatus('offline','Modo temporal · copia local')
 if(showNotice)notice('Supabase Data API está temporalmente no disponible. Puedes entrar; los cambios quedarán en este dispositivo hasta recuperar la sincronización.')
 showAdminWelcome();scheduleCloudRecovery();return true
}
async function tryCloudRecovery(manual=false){
 if(!cloud.session||cloud.reconnectInFlight)return false
 if(!manual&&!backgroundSyncAllowed())return false
 cloud.reconnectInFlight=true
 try{
   const row=await fetchRemoteStateRow(2800),profile=profileFromStateRow(row)||await loadCurrentProfile(1600),remoteV=Number(row.version||0),lastKnown=Number(localStorage.getItem(KEYS.remoteVersion)||cloud.remoteVersion||0)
   cloud.profile=profile
   if(cloud.pendingOfflineSync){
     if(remoteV!==lastKnown){
       cloud.degraded=true;setCloudStatus('offline','Cambios locales pendientes · conflicto')
       if(manual)notice('Supabase volvió, pero también hay cambios remotos. No sobrescribí nada; conserva tu respaldo y revisaremos el conflicto.')
       cloud.reconnectAttempt=Math.max(cloud.reconnectAttempt,2);scheduleCloudRecovery(300000);return false
     }
     cloud.remoteVersion=remoteV;await rpcSaveCurrentState();clearPendingOfflineSync()
   }else applyRemoteStateRow(row)
   cloud.degraded=false;cloud.lastError='';cloud.reconnectAttempt=0;subscribeCloud();shell();renderPage();setCloudStatus('online','Sincronizado')
   if(hasPendingMedia())scheduleMediaRetry(5000)
   if(manual)notice('Conexión con Supabase restablecida')
   return true
 }catch(err){
   cloud.lastError=err?.message||String(err);cloud.degraded=true;cloud.reconnectAttempt=Math.min(cloud.reconnectAttempt+1,8)
   if(isStockReservationConflict(err)){
     setCloudStatus('offline','Reserva protegida · requiere conciliación')
     if(manual)notice('Supabase sí responde. La sincronización está detenida porque el stock físico no puede ser menor al reservado. Aplica MIGRACION-INVENTORY-V3.2.25-RESERVAS-STOCK.sql.')
     scheduleCloudRecovery(120000);return false
   }
   setCloudStatus('offline',manual?'Modo temporal · Supabase no responde':`Modo temporal · próximo intento en ${Math.ceil(recoveryDelayMs()/60000)} min`)
   if(manual)notice(`Supabase sigue sin responder: ${cloud.lastError}`)
   scheduleCloudRecovery();return false
 }finally{cloud.reconnectInFlight=false}
}
async function loadCurrentProfile(timeoutMs=DATA_API_TIMEOUT_MS){
 if(!cloud.session)return null
 const data=await runDataApi(cloud.client.from('thinkstore_inventory_users').select('*').eq('user_id',cloud.session.user.id).maybeSingle(),timeoutMs,'Perfil de Inventory')
 if(!data||data.active===false)throw new Error('INVENTORY_ACCESS_DENIED')
 cloud.profile=data;return data
}
async function adminUsersRequest(method='GET',body=null){
 const token=cloud.session?.access_token;if(!token)throw new Error('AUTH_REQUIRED')
 const resp=await fetch(ONLINE_CONFIG.ADMIN_USERS_ENDPOINT||'/api/admin-users',{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined})
 let data={};try{data=await resp.json()}catch{}
 if(!resp.ok)throw new Error(data.error||`ADMIN_USERS_${resp.status}`)
 return data
}
async function loadAdminUsers(){if(!isSuperAdmin())return [];const data=await adminUsersRequest('GET');cloud.adminUsers=data.users||[];return cloud.adminUsers}
async function loadAuditRows(){if(!isSuperAdmin())return [];const {data,error}=await cloud.client.rpc('inventory_get_audit',{p_limit:150});if(error)throw error;cloud.auditRows=Array.isArray(data)?data:[];return cloud.auditRows}
function profileDocument(profile=cloud.profile||{}){return profile.document_type&&profile.document_number?`${profile.document_type}-${profile.document_number}`:'—'}
function profileRoleLabel(profile=cloud.profile||{}){return profile.role==='super_admin'?'Socio · Super Admin':(profile.role||'Administrador')}
function closeProfileMenu(){document.querySelector('.profile-menu')?.remove();document.querySelector('#profileTrigger')?.setAttribute('aria-expanded','false')}
function openMyProfile(){
 const p=cloud.profile||{},u=cloud.session?.user||{},name=currentActorName()||'Administrador'
 closeProfileMenu()
 modal('Mi perfil',`<div class="profile-modal"><div class="profile-modal-head"><div class="profile-modal-avatar">${avatarContent(p,adminInitials())}</div><div><span>Cuenta de socio</span><h3>${esc(name)}</h3><small>${esc(profileRoleLabel(p))}</small></div></div><div class="profile-info-grid"><div><span>Correo</span><b>${esc(p.email||u.email||'—')}</b></div><div><span>Teléfono</span><b>${esc(p.phone||'—')}</b></div><div><span>Cédula / documento</span><b>${esc(profileDocument(p))}</b></div><div><span>Estado</span><b>${p.active===false?'Inactivo':'Activo'}</b></div><div><span>Permisos</span><b>${p.role==='super_admin'?'Todos los permisos':'Según rol'}</b></div><div><span>Último acceso</span><b>${esc(dt(u.last_sign_in_at||new Date().toISOString()))}</b></div>${p.personal_notes?`<div class="span2"><span>Notas</span><b>${esc(p.personal_notes)}</b></div>`:''}</div><div class="profile-modal-actions">${isSuperAdmin()?'<button class="btn ghost" id="editOwnProfile">Editar mis datos</button>':''}<button class="btn danger" id="profileLogout">Cerrar sesión</button></div></div>`)
 if($('#editOwnProfile'))$('#editOwnProfile').onclick=()=>{const snapshot={...p,email:p.email||u.email||''};closeModal();openPartnerForm(snapshot)}
 $('#profileLogout').onclick=()=>{closeModal();cloudLogout()}
}
function toggleProfileMenu(){
 const existing=document.querySelector('.profile-menu');if(existing){closeProfileMenu();return}
 const trigger=$('#profileTrigger');if(!trigger)return
 const p=cloud.profile||{},u=cloud.session?.user||{},name=currentActorName()||'Administrador'
 trigger.setAttribute('aria-expanded','true')
 trigger.insertAdjacentHTML('afterend',`<div class="profile-menu"><div class="profile-menu-user"><div class="profile-menu-avatar">${avatarContent(p,adminInitials())}</div><div><b>${esc(name)}</b><span>${esc(p.email||u.email||'')}</span><small>${esc(profileRoleLabel(p))}</small></div></div><div class="profile-menu-meta"><div><span>Teléfono</span><b>${esc(p.phone||'—')}</b></div><div><span>Documento</span><b>${esc(profileDocument(p))}</b></div></div><button class="profile-menu-action" id="openMyProfile">◉ <span>Mi perfil</span></button><button class="profile-menu-action danger" id="profileMenuLogout">↪ <span>Cerrar sesión</span></button></div>`)
 $('#openMyProfile').onclick=openMyProfile
 $('#profileMenuLogout').onclick=()=>{closeProfileMenu();cloudLogout()}
 setTimeout(()=>document.addEventListener('click',profileOutsideClick,{once:true}),0)
}
function profileOutsideClick(e){if(e.target.closest('.profile-menu')||e.target.closest('#profileTrigger')){setTimeout(()=>document.addEventListener('click',profileOutsideClick,{once:true}),0);return}closeProfileMenu()}
function showAdminWelcome(){
 const u=cloud.session?.user;if(!u)return
 const key=`tsi_admin_welcome_${u.id}_${APP_VERSION}`
 if(sessionStorage.getItem(key))return
 sessionStorage.setItem(key,'1')
 const name=adminDisplayName()
 const email=esc(u.email||'')
 document.body.insertAdjacentHTML('beforeend',`<div class="admin-welcome" id="adminWelcome" role="status" aria-live="polite"><div class="admin-welcome-card"><div class="admin-welcome-orbit"><img src="${BRAND_LOGO}" alt="ThinkStore"></div><span class="admin-welcome-kicker">ThinkStore Inventory</span><h2>${name?`Bienvenido, ${esc(name)}`:'Bienvenido, socio administrador'}</h2><p>Acceso de socios administradores · inventario central sincronizado</p>${email?`<small>${email}</small>`:''}<div class="admin-welcome-line"></div></div></div>`)
 const el=$('#adminWelcome')
 const close=()=>{if(!el)return;el.classList.add('leaving');setTimeout(()=>el.remove(),420)}
 el.onclick=close;setTimeout(close,2800)
}
function renderCloudSetup(){
 $('#app').innerHTML=`<div class="online-gate"><div class="online-gate-card"><div class="gate-logo"><img src="${BRAND_LOGO}" alt="ThinkStore"></div><h1>ThinkStore Inventory Online</h1><p>Esta versión se conecta al Supabase actual de ThinkStore y usa tablas Inventory separadas.</p><div class="gate-code"><b>1.</b> Ejecuta <code>supabase-online.sql</code> en el Supabase actual de ThinkStore.<br><b>2.</b> Edita <code>app/config.js</code> con la URL y Publishable Key de ThinkStore.<br><b>3.</b> Configura las variables R2 en Netlify y publica <b>inventory.thinkstore.com.ve</b>.</div><p class="muted">La Publishable/anon key puede estar en el cliente porque el acceso real queda protegido mediante Auth + RLS.</p></div></div>`
}
function renderLogin(error=''){
 $('#app').innerHTML=`<div class="online-gate"><form class="online-gate-card" id="cloudLogin"><div class="gate-logo"><img src="${BRAND_LOGO}" alt="ThinkStore"></div><span class="gate-kicker">Inventario central</span><h1>Iniciar sesión</h1><p>Usa tu misma cuenta ThinkStore para abrir Inventory.</p>${error?`<div class="gate-error">${esc(error)}</div>`:''}<a class="btn primary big unified-login" href="https://thinkstore.com.ve/sso-entry.html?platform=inventory">Ingresar con ThinkStore</a><div class="login-separator"><span>o acceso directo</span></div><label>Correo<input name="email" type="email" autocomplete="username" required placeholder="usuario@thinkstore.com.ve"></label><label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label><button class="btn ghost big">Entrar con correo y contraseña</button><small class="muted">Tu acceso y permisos se administran desde el Panel ThinkStore.</small></form></div>`
 $('#cloudLogin').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Entrando…';const {data,error}=await cloud.client.auth.signInWithPassword({email:f.email,password:f.password});if(error){const current=(await cloud.client.auth.getSession().catch(()=>({data:{}})))?.data?.session;if(current&&isDataApiUnavailable(error)){cloud.session=current;enterDegradedMode(error);return}renderLogin(error.message);return}cloud.session=data?.session||cloud.session;if(cloud.session){openSessionImmediately();await bootstrapCloudSession(true)}}
}
function cloudSerializableState(){
 const cleanProducts=state.products.map(({image_data,...p})=>p)
 const cleanFurniture=state.furniture.map(({image_data,...x})=>x)
 return {products:cleanProducts,units:state.units,stock:state.stock,movements:state.movements,locations:state.locations,suppliers:state.suppliers,purchases:state.purchases,furniture:cleanFurniture}
}
function dataUrlToBlob(dataUrl){const [meta,data]=String(dataUrl).split(',');const mime=(meta.match(/data:([^;]+)/)||[])[1]||'image/webp';const bin=atob(data);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime})}
async function uploadMediaViaServer(item,folder){
 const token=cloud.session?.access_token;if(!token)throw new Error('AUTH_REQUIRED')
 if(!item?.image_data||!String(item.image_data).startsWith('data:'))return null
 const endpoint=ONLINE_CONFIG.R2_UPLOAD_ENDPOINT||'/api/r2-upload'
 const resp=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({workspace:cloud.workspace,folder,itemId:item.id,dataUrl:item.image_data})})
 let body={};try{body=await resp.json()}catch{}
 if(!resp.ok||!body.publicUrl)throw new Error(body.error||`R2_UPLOAD_${resp.status}`)
 return body
}
async function persistMediaUrl(entityType,itemId,publicUrl){
 const {data,error}=await cloud.client.rpc('inventory_set_media_url',{p_workspace:cloud.workspace,p_entity_type:entityType,p_entity_id:itemId,p_image_url:publicUrl})
 if(error)throw error
 if(data?.version!=null)cloud.remoteVersion=Number(data.version)
 if(data?.updated_at){cloud.lastSyncedAt=data.updated_at;cloud.lastUpdate={at:data.updated_at,user_id:currentActorId(),name:currentActorName(),email:currentActorEmail()};refreshLastUpdateUI()}
 return data
}
async function uploadMediaCollection(items,folder){
 if(!cloud.session)return 0
 let uploaded=0
 const entityType=folder==='furniture'?'furniture':'product'
 for(const item of items){
   if(!item?.id||!item.image_data||!String(item.image_data).startsWith('data:'))continue
   const result=await uploadMediaViaServer(item,folder)
   await persistMediaUrl(entityType,item.id,result.publicUrl)
   item.image_url=result.publicUrl;item.image_data=result.publicUrl;item.image_upload_pending=false;uploaded++
 }
 return uploaded
}
async function syncMediaToCloud(){return (await uploadMediaCollection(state.products,'products'))+(await uploadMediaCollection(state.furniture,'furniture'))}
function scheduleMediaRetry(delayMs){
 if(!cloud.session||!hasPendingMedia()||cloud.degraded||!backgroundSyncAllowed())return
 clearTimeout(cloud.mediaRetryTimer)
 const delay=delayMs??Math.min(15*60*1000,120000*Math.pow(2,Math.min(cloud.mediaRetryAttempt,3)))
 cloud.mediaRetryTimer=setTimeout(()=>retryPendingMedia(false),delay)
}
async function retryPendingMedia(manual=false){
 if(!cloud.session||!hasPendingMedia()||cloud.mediaRetryInFlight)return false
 if(cloud.degraded||(!manual&&!backgroundSyncAllowed())){
   if(manual)notice('Las imágenes se subirán cuando Supabase vuelva a estar disponible.')
   return false
 }
 cloud.mediaRetryInFlight=true
 try{
   if(manual)setCloudStatus('syncing','Subiendo imágenes…')
   const uploaded=await syncMediaToCloud();persistLocalOnly()
   cloud.mediaRetryAttempt=0;cloud.lastError='';setCloudStatus('online',hasPendingMedia()?'Sincronizado · imágenes pendientes':'Sincronizado')
   if(manual&&uploaded>0)notice(`${uploaded} imagen${uploaded===1?'':'es'} subida${uploaded===1?'':'s'} correctamente`)
   if(hasPendingMedia())scheduleMediaRetry()
   return uploaded>0
 }catch(err){
   cloud.lastError=err.message||String(err);cloud.mediaRetryAttempt++
   if(isDataApiUnavailable(err)){cloud.degraded=true;cloud.reconnectAttempt=Math.min(cloud.reconnectAttempt+1,8);setCloudStatus('offline','Modo temporal · imágenes en espera');scheduleCloudRecovery()}
   else setCloudStatus('online','Sincronizado · imágenes pendientes')
   console.warn('R2 pendiente:',cloud.lastError)
   if(manual)notice(`No pude subir las imágenes pendientes: ${cloud.lastError}`)
   if(!cloud.degraded)scheduleMediaRetry()
   return false
 }finally{cloud.mediaRetryInFlight=false}
}
function hasPendingMedia(){return [...state.products,...state.furniture].some(x=>x?.image_data&&String(x.image_data).startsWith('data:'))}
function hydrateRemoteMedia(payload){for(const p of payload.products||[])if(p.image_url&&!p.image_data)p.image_data=p.image_url;for(const x of payload.furniture||[])if(x.image_url&&!x.image_data)x.image_data=x.image_url;return payload}
function preservePendingLocalMedia(payload){
 const pLocal=new Map(state.products.filter(x=>x?.id&&x.image_data&&String(x.image_data).startsWith('data:')).map(x=>[x.id,x.image_data]))
 const fLocal=new Map(state.furniture.filter(x=>x?.id&&x.image_data&&String(x.image_data).startsWith('data:')).map(x=>[x.id,x.image_data]))
 for(const p of payload.products||[])if(!p.image_url&&pLocal.has(p.id)){p.image_data=pLocal.get(p.id);p.image_upload_pending=true}
 for(const x of payload.furniture||[])if(!x.image_url&&fLocal.has(x.id)){x.image_data=fLocal.get(x.id);x.image_upload_pending=true}
 return payload
}
function persistLocalOnly(){const productsForStorage=state.products.map(({image_data,...p})=>p),furnitureForStorage=state.furniture.map(({image_data,...x})=>x);write(KEYS.products,productsForStorage);write(KEYS.units,state.units);write(KEYS.stock,state.stock);write(KEYS.movements,state.movements);write(KEYS.locations,state.locations);write(KEYS.suppliers,state.suppliers);write(KEYS.purchases,state.purchases);write(KEYS.furniture,furnitureForStorage);persistProductImages();persistFurnitureImages()}
function scheduleCloudSave(){
 if(!cloud.session||cloud.applyingRemote)return
 cloud.pendingSave=true;clearTimeout(cloud.syncTimer);cloud.syncTimer=setTimeout(()=>cloudSaveState(),1200)
}
async function rpcSaveCurrentState(){
 const payload=cloudSerializableState()
 const {data,error}=await cloud.client.rpc('inventory_save_state',{p_workspace:cloud.workspace,p_expected_version:cloud.remoteVersion,p_payload:payload})
 if(error)throw error
 cloud.remoteVersion=Number(data);localStorage.setItem(KEYS.remoteVersion,String(cloud.remoteVersion));clearPendingOfflineSync();cloud.lastSyncedAt=new Date().toISOString();cloud.lastUpdate={at:cloud.lastSyncedAt,user_id:currentActorId(),name:currentActorName(),email:currentActorEmail()};refreshLastUpdateUI();return cloud.remoteVersion
}
async function cloudSaveState(){
 if(!cloud.session||cloud.applyingRemote)return false
 if(cloud.degraded){persistLocalOnly();markPendingOfflineSync();setCloudStatus('offline','Guardado local · pendiente sincronizar');scheduleCloudRecovery();return true}
 if(cloud.syncing){cloud.pendingSave=true;return false}
 cloud.syncing=true;cloud.pendingSave=false;setCloudStatus('syncing','Guardando datos…')
 try{
   // Los datos se confirman en Supabase sin depender de Cloudflare R2.
   persistLocalOnly();await rpcSaveCurrentState();cloud.lastError='';setCloudStatus('online',hasPendingMedia()?'Datos guardados · imágenes pendientes':'Sincronizado')
   // Las imágenes se procesan en segundo plano y nunca bloquean ubicaciones, stock o productos.
   if(hasPendingMedia())scheduleMediaRetry(900)
   return true
 }catch(err){
   cloud.lastError=err.message||String(err)
   if(isStockReservationConflict(err)){
     persistLocalOnly();markPendingOfflineSync();cloud.degraded=true
     setCloudStatus('offline','Reserva protegida · pendiente conciliación')
     scheduleCloudRecovery(60000)
     notice('Hay unidades reservadas que no pueden quedar por encima del stock físico. El cambio quedó local; aplica el parche V3.2.25 de reservas y vuelve a sincronizar.')
   }else if(isDataApiUnavailable(err)){persistLocalOnly();markPendingOfflineSync();cloud.degraded=true;setCloudStatus('offline','Guardado local · pendiente sincronizar');scheduleCloudRecovery();notice('Supabase está temporalmente no disponible. El cambio quedó guardado en este dispositivo y se sincronizará al recuperar conexión.')}
   else if(String(err.code)==='40001'||/VERSION_CONFLICT/i.test(cloud.lastError)){await cloudLoadState(true);notice('El inventario cambió en otro dispositivo. Cargué la versión más reciente. Revisa tu último cambio antes de repetirlo.')}
   else{setCloudStatus('offline','Error al guardar');notice(`No se pudo guardar en Supabase: ${cloud.lastError}`)}
   return false
 }finally{
   cloud.syncing=false
   if(cloud.pendingSave){clearTimeout(cloud.syncTimer);cloud.syncTimer=setTimeout(()=>cloudSaveState(),1000)}
 }
}
async function cloudLoadState(fromConflict=false){
 if(!cloud.session)return
 const row=await fetchRemoteStateRow();applyRemoteStateRow(row);cloud.pendingRemoteVersion=0;setCloudStatus('online',hasPendingMedia()?'Sincronizado · imagen pendiente':'Sincronizado')
 if(hasPendingMedia())scheduleMediaRetry(5000)
}
function scheduleRemoteReload(version){
 const v=Number(version||0);if(v<=cloud.remoteVersion)return
 cloud.pendingRemoteVersion=Math.max(cloud.pendingRemoteVersion||0,v)
 clearTimeout(cloud.remoteReloadTimer)
 cloud.remoteReloadTimer=setTimeout(async()=>{
   if(cloud.remoteReloadInFlight||cloud.degraded||!cloud.session||!backgroundSyncAllowed())return
   cloud.remoteReloadInFlight=true
   try{await cloudLoadState();setCloudStatus('online','Actualizado')}
   catch(err){cloud.lastError=err.message||String(err);if(isDataApiUnavailable(err)){cloud.degraded=true;cloud.reconnectAttempt=Math.min(cloud.reconnectAttempt+1,8);setCloudStatus('offline','Modo temporal · copia local');scheduleCloudRecovery()}else setCloudStatus('offline','Sin conexión')}
   finally{cloud.remoteReloadInFlight=false;if(cloud.pendingRemoteVersion>cloud.remoteVersion)scheduleRemoteReload(cloud.pendingRemoteVersion)}
 },1500)
}
function subscribeCloud(){
 if(cloud.channel)cloud.client.removeChannel(cloud.channel)
 cloud.channel=cloud.client.channel(`inventory-${cloud.workspace}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'thinkstore_inventory_meta',filter:`workspace_key=eq.${cloud.workspace}`},payload=>{scheduleRemoteReload(payload?.new?.version)}).subscribe()
}
async function cloudLogout(){const u=cloud.session?.user;if(u)sessionStorage.removeItem(`tsi_admin_welcome_${u.id}_${APP_VERSION}`);cloud.profile=null;cloud.adminUsers=[];cloud.auditRows=[];if(cloud.client)await cloud.client.auth.signOut()}
function openSessionImmediately(){
 if(!cloud.session)return false
 try{
   cloud.profile=fallbackProfileFromSession();cloud.degraded=false;shell();renderPage();setCloudStatus('offline','Comprobando sincronización…');return true
 }catch{return false}
}
async function bootstrapCloudSession(showWelcome=false){
 if(!cloud.session)return false
 if(cloud.sessionBootInFlight)return cloud.sessionBootInFlight
 cloud.sessionBootInFlight=(async()=>{
   try{
     const row=await fetchRemoteStateRow(2400),profile=profileFromStateRow(row)||await loadCurrentProfile(1500)
     cloud.profile=profile;applyRemoteStateRow(row);cloud.pendingRemoteVersion=0;cloud.degraded=false;cloud.reconnectAttempt=0;subscribeCloud();cloud.bootstrappedUserId=cloud.session?.user?.id||'';shell();renderPage();setCloudStatus('online',hasPendingMedia()?'Sincronizado · imagen pendiente':'Sincronizado')
     if(hasPendingMedia())scheduleMediaRetry(5000)
     if(showWelcome)showAdminWelcome()
     return true
   }catch(err){
     if(isDataApiUnavailable(err)){const ok=enterDegradedMode(err,{showNotice:showWelcome});if(ok)cloud.bootstrappedUserId=cloud.session?.user?.id||'';return ok}
     renderLogin(err.message||'No pude abrir el inventario online.');return false
   }
 })()
 try{return await cloud.sessionBootInFlight}finally{cloud.sessionBootInFlight=null}
}
async function initCloud(){
 if(!cloudConfigured()){renderCloudSetup();return false}
 installCloudLifecycleHooks()
 cloud.client=supabase.createClient(ONLINE_CONFIG.SUPABASE_URL,ONLINE_CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
 const {data}=await cloud.client.auth.getSession();cloud.session=data.session||null
 cloud.client.auth.onAuthStateChange((event,session)=>{
   cloud.session=session
   if(!session){
     if(cloud.channel)cloud.client.removeChannel(cloud.channel)
     clearTimeout(cloud.reconnectTimer);clearTimeout(cloud.mediaRetryTimer);clearTimeout(cloud.remoteReloadTimer)
     cloud.degraded=false;cloud.reconnectAttempt=0;cloud.bootstrappedUserId='';renderLogin();return
   }
   if(event==='SIGNED_IN'&&cloud.bootstrappedUserId!==session.user?.id){if(!$('.app-shell'))openSessionImmediately();setTimeout(()=>bootstrapCloudSession(true),0)}
 })
 if(!cloud.session){renderLogin();return false}
 openSessionImmediately()
 return bootstrapCloudSession(false)
}
let notifiedWebVersion='';
async function checkForWebUpdate(){
 // Updates must never reload a working session or discard an open form.
 try{
  const r=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});
  if(!r.ok)return;
  const v=await r.json(),next=String(v.version||'');
  if(!/^\d+\.\d+\.\d+$/.test(next)||next===notifiedWebVersion)return;
  const remote=next.split('.').map(Number),current=APP_VERSION.split('.').map(Number);
  const difference=remote.findIndex((n,i)=>n!==current[i]);
  if(difference<0||remote[difference]<current[difference])return;
  notifiedWebVersion=next;
  notice('Hay una nueva versión de Inventory. Guarda tu trabajo y recarga cuando estés listo.');
 }catch{}
}
const furnitureCategories=['Escritorios / Mesas','Sillas','Gabinetes','Exhibidores','Estanterías / Repisas','Mostradores','Archivadores','Muebles de taller','Mesas de trabajo','Electrónicos','Herramientas de servicio','Otros']
const furnitureConditions=['Nuevo','Excelente','Bueno','Regular','Reparación','Baja']
const statuses=['Disponible','Reservado','Vendido','En tránsito','Preorden','Servicio técnico','Devuelto','Defectuoso','Uso interno','Baja']
const categories=['iPhone','Mac','iPad','AirPods','Watch','Accesorios','Repuestos','Otros']
const bulkCategories=new Set(['Accesorios','Repuestos'])
const accessorySubcategories=['Cases para iPhone','Cases para iPad','Cases para MacBook','Forros para iPhone','Vidrios templados','Cargadores','Cargadores MagSafe','Cables · Original Apple','Cables · Certificados']

const productCategoryMeta={
 'iPhone':{icon:'▯',label:'iPhone'},
 'Mac':{icon:'⌘',label:'Mac'},
 'iPad':{icon:'▭',label:'iPad'},
 'AirPods':{icon:'◉',label:'AirPods'},
 'Watch':{icon:'◌',label:'Apple Watch'},
 'Accesorios':{icon:'＋',label:'Accesorios'},
 'Repuestos':{icon:'⚙',label:'Repuestos'},
 'Otros':{icon:'□',label:'Otros'}
}
function productCategoryOrder(v){const order=['iPhone','Mac','iPad','AirPods','Watch','Accesorios','Repuestos','Otros'];const i=order.indexOf(String(v||''));return i<0?999:i}
function productCategoryIcon(v){return productCategoryMeta[v]?.icon||'□'}
function productCategoryLabel(v){return productCategoryMeta[v]?.label||v||'Otros'}
function productStockState(p){
 const available=productAvailable(p),min=Number(p.min_stock||0)
 if(available<=0)return 'Sin stock'
 if(available<=min)return 'Stock bajo'
 return 'Con stock'
}

const iphoneCompat=[
'iPhone 8 · 4.7"','iPhone 8 Plus · 5.5"','iPhone X · 5.8"','iPhone XS · 5.8"','iPhone XR · 6.1"','iPhone XS Max · 6.5"',
'iPhone 11 · 6.1"','iPhone 11 Pro · 5.8"','iPhone 11 Pro Max · 6.5"','iPhone SE (2.ª/3.ª gen.) · 4.7"',
'iPhone 12 mini · 5.4"','iPhone 12 · 6.1"','iPhone 12 Pro · 6.1"','iPhone 12 Pro Max · 6.7"',
'iPhone 13 mini · 5.4"','iPhone 13 · 6.1"','iPhone 13 Pro · 6.1"','iPhone 13 Pro Max · 6.7"',
'iPhone 14 · 6.1"','iPhone 14 Plus · 6.7"','iPhone 14 Pro · 6.1"','iPhone 14 Pro Max · 6.7"',
'iPhone 15 · 6.1"','iPhone 15 Plus · 6.7"','iPhone 15 Pro · 6.1"','iPhone 15 Pro Max · 6.7"',
'iPhone 16 · 6.1"','iPhone 16 Plus · 6.7"','iPhone 16 Pro · 6.3"','iPhone 16 Pro Max · 6.9"','iPhone 16e · 6.1"',
'iPhone 17 · 6.3"','iPhone Air · 6.5"','iPhone 17 Pro · 6.3"','iPhone 17 Pro Max · 6.9"',
'iPhone 18 Pro · 6.3"','iPhone 18 Pro Max · 6.9"'
]
const ipadCompat=[
'iPad 5.ª/6.ª gen. · 9.7"','iPad 7.ª/8.ª/9.ª gen. · 10.2"','iPad 10.ª gen. · 10.9"','iPad (A16) · 11"',
'iPad mini 4/5 · 7.9"','iPad mini 6/7 · 8.3"','iPad Air 3 · 10.5"','iPad Air 4/5 · 10.9"','iPad Air 11"','iPad Air 13"',
'iPad Pro 9.7"','iPad Pro 10.5"','iPad Pro 11" (1.ª-4.ª gen.)','iPad Pro 11" (M4/M5)','iPad Pro 12.9" (1.ª/2.ª gen.)','iPad Pro 12.9" (3.ª-6.ª gen.)','iPad Pro 13" (M4/M5)'
]
const macbookCompat=[
'MacBook Air 11.6"','MacBook Air 13.3"','MacBook Air 13.6"','MacBook Air 15.3"','MacBook Retina 12"','MacBook Neo 13"',
'MacBook Pro 13.3"','MacBook Pro 14.2"','MacBook Pro 15.4"','MacBook Pro 16" (Intel 2019)','MacBook Pro 16.2" (Apple Silicon)'
]
const cableOriginal=['USB-C a USB-C 1 m · Apple','USB-C a USB-C 2 m · Apple','USB-C 240 W 2 m · Apple','USB-C a Lightning 1 m · Apple','USB-C a Lightning 2 m · Apple','USB-A a Lightning 1 m · Apple','USB-C a MagSafe 3 2 m · Apple','Thunderbolt 4 Pro 1 m · Apple','Thunderbolt 4 Pro 1.8 m · Apple','Thunderbolt 4 Pro 3 m · Apple','Cable magnético Apple Watch USB-C 1 m']
const cableCertified=['USB-C a USB-C · 60 W certificado','USB-C a USB-C · 100 W certificado','USB-C a USB-C · 240 W certificado','USB-C a Lightning · MFi certificado','USB-A a Lightning · MFi certificado','USB-C a USB-A · certificado','USB-C a HDMI · certificado','USB-C multipuerto · certificado']
const chargerOptions=['Adaptador USB-C 20 W','Adaptador USB-C 30 W','Adaptador USB-C 35 W','Adaptador USB-C 67 W','Adaptador USB-C 70 W','Adaptador USB-C 96 W','Adaptador USB-C 140 W','Cargador doble USB-C']
const magsafeChargerOptions=['Cargador MagSafe 1 m','Cargador MagSafe 2 m','Cargador MagSafe 25 W','Cargador MagSafe para iPhone','Base MagSafe 2 en 1','Base MagSafe 3 en 1']
function accessoryCompatOptions(sub){
  if(sub==='Vidrios templados'||sub==='Forros para iPhone'||sub==='Cases para iPhone')return iphoneCompat
  if(sub==='Cases para iPad')return ipadCompat
  if(sub==='Cases para MacBook')return macbookCompat
  if(sub==='Cargadores')return chargerOptions
  if(sub==='Cargadores MagSafe')return magsafeChargerOptions
  if(sub==='Cables · Original Apple')return cableOriginal
  if(sub==='Cables · Certificados')return cableCertified
  return []
}
function stockProductGroup(p){
 const text=[p.name,p.subcategory,p.category,p.compatibility,p.capacity].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 if(p.category==='Repuestos')return 'Repuestos'
 if(/magsafe/.test(text))return 'Cargadores MagSafe'
 if(/vidrio|templado|screen protector|protector de pantalla/.test(text))return 'Vidrios templados'
 if(/case|forro|funda|cover/.test(text))return 'Cases'
 if(/cargador|charger|adaptador.*(20|30|35|67|70|96|140).*w|power adapter/.test(text))return 'Cargadores'
 if(/cable|lightning|usb-c|usb c|thunderbolt/.test(text))return 'Cables'
 return p.category==='Accesorios'?'Otros accesorios':'Otros'
}
const stockProductGroups=['Todos','Cases','Cargadores','Vidrios templados','Cargadores MagSafe','Cables','Otros accesorios','Repuestos']



const siliconeCasePalette=[
 {name:'Negro',hex:'#1d1d1f'},{name:'Blanco',hex:'#f4f4f0'},{name:'Gris',hex:'#929299'},
 {name:'Azul marino',hex:'#273a59'},{name:'Azul',hex:'#527da9'},{name:'Celeste',hex:'#9fc8dc'},
 {name:'Verde',hex:'#789780'},{name:'Verde oliva',hex:'#7b7d4d'},{name:'Rosa',hex:'#d7a4b1'},
 {name:'Fucsia',hex:'#c45287'},{name:'Rojo',hex:'#b74343'},{name:'Morado',hex:'#80678e'},
 {name:'Naranja',hex:'#d97b42'},{name:'Amarillo',hex:'#e2ca68'},{name:'Beige',hex:'#d6c8b7'},
 {name:'Marrón',hex:'#806858'}
]
const productColorMap=Object.fromEntries(siliconeCasePalette.map(x=>[x.name.toLowerCase(),x.hex]))
function cleanVariantModel(value){
 const s=String(value||'').trim()
 return s.includes(' · ')?s.split(' · ')[0].trim():s
}
function productVariantModel(p){
 if(p?.variant_model)return cleanVariantModel(p.variant_model)
 if(p?.compatibility)return cleanVariantModel(p.compatibility)
 return cleanVariantModel(p?.model||'')||'Sin modelo'
}
function productVariantColor(p){return String(p?.variant_color||p?.color||'').trim()||'Sin color'}
function productColorHex(color){
 const key=String(color||'').trim().toLowerCase()
 if(productColorMap[key])return productColorMap[key]
 if(/negro|black|medianoche/.test(key))return '#1d1d1f'
 if(/blanco|white/.test(key))return '#f4f4f0'
 if(/gris|gray|grey|plata/.test(key))return '#929299'
 if(/azul|blue/.test(key))return '#5c82ad'
 if(/verde|green/.test(key))return '#789780'
 if(/rosa|pink/.test(key))return '#d7a4b1'
 if(/rojo|red|borgo/.test(key))return '#b74343'
 if(/morado|purple|violet/.test(key))return '#80678e'
 if(/naranja|orange/.test(key))return '#d97b42'
 if(/amarillo|yellow/.test(key))return '#e2ca68'
 if(/beige|arena|sand/.test(key))return '#d6c8b7'
 if(/marr[oó]n|brown/.test(key))return '#806858'
 if(/transparente|clear/.test(key))return 'linear-gradient(135deg,#fff,#e6edf3)'
 return '#d8d9de'
}
function productColorSwatch(color,title=true){
 const bg=productColorHex(color)
 return `<span class="shopify-color-swatch" ${title?`title="${esc(color)}"`:''} style="background:${bg}"></span>`
}
function shopifyGroupTitle(p){
 const explicit=String(p?.product_group||'').trim()
 if(explicit)return explicit
 const name=String(p?.name||'Producto').trim()
 if(/silicon(?:e)?\s*case/i.test(name))return 'Silicone Case'
 if((p?.subcategory==='Cases para iPhone'||p?.subcategory==='Forros para iPhone')&&/iphone/i.test(name)){
   const stripped=name.replace(/\s*[-/·]?\s*iPhone\s+.*$/i,'').replace(/\s*[-/·]\s*$/,'').trim()
   return stripped||'Cases para iPhone'
 }
 return name
}
function shopifyGroupKey(p){
 return [String(p?.category||'Otros').toLowerCase(),String(p?.subcategory||'').toLowerCase(),shopifyGroupTitle(p).toLowerCase(),String(p?.brand||'').toLowerCase()].join('|')
}
function groupProductsShopify(rows){
 const map=new Map()
 rows.forEach(p=>{
   const key=shopifyGroupKey(p)
   if(!map.has(key))map.set(key,{key,title:shopifyGroupTitle(p),category:p.category||'Otros',subcategory:p.subcategory||'',brand:p.brand||'',variants:[]})
   map.get(key).variants.push(p)
 })
 return [...map.values()].map(g=>{
   g.variants.sort((a,b)=>productVariantModel(a).localeCompare(productVariantModel(b),'es',{numeric:true,sensitivity:'base'})||productVariantColor(a).localeCompare(productVariantColor(b),'es',{numeric:true,sensitivity:'base'}))
   g.models=[...new Set(g.variants.map(productVariantModel))].filter(Boolean)
   g.colors=[...new Set(g.variants.map(productVariantColor))].filter(Boolean)
   g.stock=g.variants.reduce((n,p)=>n+productAvailable(p),0)
   g.prices=g.variants.map(p=>Number(p.sale_price||0)).filter(n=>n>0)
   g.image=g.variants.find(p=>p.image_data)||g.variants[0]
   return g
 }).sort((a,b)=>productCategoryOrder(a.category)-productCategoryOrder(b.category)||a.title.localeCompare(b.title,'es',{numeric:true,sensitivity:'base'}))
}
function shopifyPriceRange(g){
 if(!g.prices.length)return 'Precio por definir'
 const min=Math.min(...g.prices),max=Math.max(...g.prices)
 return min===max?money(min):`${money(min)} – ${money(max)}`
}
function shopifySkuToken(v){
 const s=String(v||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'').slice(0,14)
 return s||'VAR'
}
function siliconeVariantSku(model,color){
 return `TS-ACC-SCASE-${shopifySkuToken(cleanVariantModel(model))}-${shopifySkuToken(color)}`
}
function nextProductBarcodeFromNumber(n){return `TSP-${String(n).padStart(6,'0')}`}

const demoProducts=[
{id:'p1',name:'iPhone 18 Pro Max',category:'iPhone',brand:'Apple',model:'A0001',condition:'Nuevo',capacity:'256 GB',color:'Negro',sku:'TS-IPH-18PM-256-BLK-N',product_barcode:'TSP-000001',tracking_mode:'serialized',min_stock:1,purchase_price:1120,sale_price:1399},
{id:'p2',name:'MacBook Pro 14 M4 Pro',category:'Mac',brand:'Apple',model:'A3112',condition:'Nuevo',capacity:'1 TB',color:'Negro espacial',sku:'TS-MAC-MBP14-M4P-1TB-BLK-N',product_barcode:'TSP-000002',tracking_mode:'serialized',min_stock:1,purchase_price:1750,sale_price:2199},
{id:'p3',name:'AirPods Pro 3',category:'AirPods',brand:'Apple',model:'A0003',condition:'Nuevo',capacity:'—',color:'Blanco',sku:'TS-APD-PRO3-WHT-N',product_barcode:'TSP-000003',tracking_mode:'serialized',min_stock:1,purchase_price:180,sale_price:249},
{id:'p4',name:'Vidrio templado iPhone 17 Pro',category:'Accesorios',subcategory:'Vidrios templados',compatibility:'iPhone 17 Pro · 6.3"',brand:'Genérico',model:'',condition:'Nuevo',capacity:'',color:'Transparente',sku:'TS-ACC-VIDRIO17P',product_barcode:'TSP-000004',tracking_mode:'quantity',min_stock:5,purchase_price:2.5,sale_price:10}
]
const demoUnits=[
{id:'u1',product_id:'p1',barcode_value:'TSU-000001',serial_number:'F2LTEST0001',imei:'351900000000001',imei_2:'',status:'Disponible',location:'Tienda Chacao'},
{id:'u2',product_id:'p1',barcode_value:'TSU-000002',serial_number:'F2LTEST0002',imei:'351900000000002',imei_2:'',status:'Reservado',location:'Tienda Chacao'},
{id:'u3',product_id:'p2',barcode_value:'TSU-000003',serial_number:'C02TEST0003',imei:'',imei_2:'',status:'Disponible',location:'Almacén'},
{id:'u4',product_id:'p3',barcode_value:'TSU-000004',serial_number:'H2YTEST0004',imei:'',imei_2:'',status:'Disponible',location:'Tienda Chacao'}
]
const demoStock=[{id:'sb1',product_id:'p4',location:'Tienda Chacao',quantity:18},{id:'sb2',product_id:'p4',location:'Almacén',quantity:12}]
const demoMovements=[
{id:'m1',unit_barcode:'TSU-000001',type:'Entrada',reason:'Recepción de mercancía',user_name:'Administrador',created_at:new Date(Date.now()-86400000).toISOString()},
{id:'m2',unit_barcode:'TSU-000002',type:'Reserva',reason:'Pedido interno',user_name:'Vendedor',created_at:new Date(Date.now()-3600000).toISOString()},
{id:'m3',product_id:'p4',product_barcode:'TSP-000004',quantity_delta:30,location:'Tienda Chacao / Almacén',type:'Entrada de stock',reason:'Carga inicial de accesorios',user_name:'Administrador',created_at:new Date(Date.now()-1800000).toISOString()}
]
function seed(k,v){if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify(v))}
seed(KEYS.products,[]);seed(KEYS.units,[]);seed(KEYS.stock,[]);seed(KEYS.movements,[])
seed(KEYS.locations,[{id:'l1',name:'Tienda Chacao',type:'Tienda'},{id:'l2',name:'Almacén',type:'Almacén'},{id:'l3',name:'Servicio técnico',type:'Servicio'},{id:'l4',name:'Mercancía en tránsito',type:'Tránsito'}])
seed(KEYS.suppliers,[]);seed(KEYS.furniture,[])
const read=k=>JSON.parse(localStorage.getItem(k)||'[]'), write=(k,v)=>localStorage.setItem(k,JSON.stringify(v))
let state={page:'dashboard',query:'',productCategory:'Todos',productSubcategory:'Todos',productModelFilter:'Todos',productColorFilter:'Todos',productStockFilter:'Todos',stockProductCategory:'Todos',products:read(KEYS.products),units:read(KEYS.units),stock:read(KEYS.stock),movements:read(KEYS.movements),locations:read(KEYS.locations),suppliers:read(KEYS.suppliers),purchases:read(KEYS.purchases),furniture:read(KEYS.furniture)}

let deferredInstallPrompt=null
const IMAGE_DB='thinkstore_inventory_media',IMAGE_STORE='product_images',FURNITURE_IMAGE_STORE='furniture_images'
function openImageDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(IMAGE_DB,2);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(IMAGE_STORE))db.createObjectStore(IMAGE_STORE,{keyPath:'id'});if(!db.objectStoreNames.contains(FURNITURE_IMAGE_STORE))db.createObjectStore(FURNITURE_IMAGE_STORE,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function persistProductImages(){
 try{const db=await openImageDB();const readTx=db.transaction(IMAGE_STORE,'readonly'),readStore=readTx.objectStore(IMAGE_STORE);const keys=await new Promise((res,rej)=>{const r=readStore.getAllKeys();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});const tx=db.transaction(IMAGE_STORE,'readwrite'),store=tx.objectStore(IMAGE_STORE),keep=new Set(state.products.map(p=>p.id));for(const k of keys)if(!keep.has(k))store.delete(k);for(const p of state.products){if(p.image_data)store.put({id:p.id,image_data:p.image_data});else store.delete(p.id)}await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)});db.close()}catch(err){console.warn('No se pudieron guardar imágenes en IndexedDB',err)}
}
async function hydrateProductImages(){
 try{const db=await openImageDB(),tx=db.transaction(IMAGE_STORE,'readonly'),store=tx.objectStore(IMAGE_STORE);const rows=await new Promise((res,rej)=>{const r=store.getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});const map=new Map(rows.map(x=>[x.id,x.image_data]));state.products.forEach(p=>{if(map.has(p.id))p.image_data=map.get(p.id)});db.close()}catch(err){console.warn('No se pudieron cargar imágenes de IndexedDB',err)}
}
async function persistFurnitureImages(){
 try{const db=await openImageDB();const readTx=db.transaction(FURNITURE_IMAGE_STORE,'readonly'),readStore=readTx.objectStore(FURNITURE_IMAGE_STORE);const keys=await new Promise((res,rej)=>{const r=readStore.getAllKeys();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});const tx=db.transaction(FURNITURE_IMAGE_STORE,'readwrite'),store=tx.objectStore(FURNITURE_IMAGE_STORE),keep=new Set(state.furniture.map(x=>x.id));for(const k of keys)if(!keep.has(k))store.delete(k);for(const item of state.furniture){if(item.image_data)store.put({id:item.id,image_data:item.image_data});else store.delete(item.id)}await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)});db.close()}catch(err){console.warn('No se pudieron guardar imágenes de mobiliario',err)}
}
async function hydrateFurnitureImages(){
 try{const db=await openImageDB(),tx=db.transaction(FURNITURE_IMAGE_STORE,'readonly'),store=tx.objectStore(FURNITURE_IMAGE_STORE);const rows=await new Promise((res,rej)=>{const r=store.getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});const map=new Map(rows.map(x=>[x.id,x.image_data]));state.furniture.forEach(item=>{if(map.has(item.id))item.image_data=map.get(item.id)});db.close()}catch(err){console.warn('No se pudieron cargar imágenes de mobiliario',err)}
}
function isStandalone(){return window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function installHelp(){if(isStandalone()){notice('ThinkStore Inventory ya está instalado en este dispositivo');return}if(deferredInstallPrompt){deferredInstallPrompt.prompt();deferredInstallPrompt.userChoice.finally(()=>{deferredInstallPrompt=null;if(state.page==='settings')renderPage()});return}if(isIOS())alert('En iPhone/iPad: abre esta app en Safari, toca Compartir y elige “Añadir a pantalla de inicio”. Después abrirá como una app independiente.');else alert('Para instalar la app, ábrela desde Chrome o Edge mediante HTTPS/localhost y usa “Instalar aplicación” en el menú del navegador.')}
function registerPWA(){
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;if(state.page==='settings')renderPage()});window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;notice('ThinkStore Inventory se instaló correctamente');if(state.page==='settings')renderPage()});
 if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js?v=3.2.26',{updateViaCache:'none'}).then(r=>r.update()).catch(err=>console.warn('Service Worker',err))
}

function reconcileSyncedQuantityStock(){
 let changed=false
 state.products.filter(p=>p.tracking_mode==='quantity'&&p.sync_variant_id).forEach(p=>{
   const rows=state.stock.filter(s=>s.product_id===p.id)
   const localTotal=rows.reduce((n,s)=>n+Math.max(0,Number(s.quantity||0)),0)
   const mirroredOnHand=Math.max(0,Number(p.sync_stock_on_hand||0))
   const reserved=Math.max(0,Number(p.sync_stock_reserved||0))
   const floor=Math.max(reserved,rows.length===0?mirroredOnHand:0)
   if(localTotal>=floor)return
   const missing=floor-localTotal
   let row=rows.find(r=>String(r.location||'').toLowerCase()==='tienda chacao')||rows[0]
   if(!row){
     row={id:`sync-stock-${p.id}`,product_id:p.id,location:'Tienda Chacao',quantity:0,sync_seed:true}
     state.stock.push(row)
   }
   row.quantity=Math.max(0,Number(row.quantity||0))+missing
   changed=true
 })
 return changed
}
function migrate(){
  let changed=false
  let used=state.products.map(p=>Number(String(p.product_barcode||'').replace(/\D/g,''))||0)
  let next=Math.max(0,...used)+1
  state.products.forEach(p=>{
    if(!p.tracking_mode){p.tracking_mode=bulkCategories.has(p.category)?'quantity':'serialized';changed=true}
    if(p.min_stock==null){p.min_stock=p.tracking_mode==='quantity'?5:1;changed=true}
    if(!p.product_barcode){p.product_barcode=`TSP-${String(next++).padStart(6,'0')}`;changed=true}
    if(p.source_barcode==null){p.source_barcode='';changed=true}
  })
  if(reconcileSyncedQuantityStock())changed=true
  if(changed) save()
}

const patterns=['BaBbBb','BbBaBb','BbBbBa','AbAbBc','AbAcBb','AcAbBb','AbBbAc','AbBcAb','AcBbAb','BbAbAc','BbAcAb','BcAbAb','AaBbCb','AbBaCb','AbBbCa','AaCbBb','AbCaBb','AbCbBa','BbCbAa','BbAaCb','BbAbCa','BaCbAb','BbCaAb','CaBaCa','CaAbBb','CbAaBb','CbAbBa','CaBbAb','CbBaAb','CbBbAa','BaBaBc','BaBcBa','BcBaBa','AaAcBc','AcAaBc','AcAcBa','AaBcAc','AcBaAc','AcBcAa','BaAcAc','BcAaAc','BcAcAa','AaBaCc','AaBcCa','AcBaCa','AaCaBc','AaCcBa','AcCaBa','CaCaBa','BaAcCa','BcAaCa','BaCaAc','BaCcAa','BaCaCa','CaAaBc','CaAcBa','CcAaBa','CaBaAc','CaBcAa','CcBaAa','CaDaAa','BbAdAa','DcAaAa','AaAbBd','AaAdBb','AbAaBd','AbAdBa','AdAaBb','AdAbBa','AaBbAd','AaBdAb','AbBaAd','AbBdAa','AdBaAb','AdBbAa','BdAbAa','BbAaAd','DaCaAa','BdAaAb','AcDaAa','AaAbDb','AbAaDb','AbAbDa','AaDbAb','AbDaAb','AbDbAa','DaAbAb','DbAaAb','DbAbAa','BaBaDa','BaDaBa','DaBaBa','AaAaDc','AaAcDa','AcAaDa','AaDaAc','AaDcAa','DaAaAc','DaAcAa','AaCaDa','AaDaCa','CaAaDa','DaAaCa','BaAdAb','BaAbAd','BaAbCb','BcCaAaB']
function code128svg(value,height=58){
  value=String(value||'').replace(/[^\x20-\x7E]/g,'?')
  const codes=[104,...[...value].map(c=>c.charCodeAt(0)-32)]
  let checksum=104; for(let i=1;i<codes.length;i++)checksum+=codes[i]*i
  codes.push(checksum%103,106)
  let x=10,bars=''
  for(const code of codes){for(const ch of patterns[code]){const w=(ch.toLowerCase().charCodeAt(0)-96)*2;if(ch===ch.toUpperCase())bars+=`<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000"/>`;x+=w}}
  const width=x+10
  return `<svg viewBox="0 0 ${width} ${height+18}" xmlns="http://www.w3.org/2000/svg" role="img"><rect width="100%" height="100%" fill="#fff"/>${bars}<text x="${width/2}" y="${height+14}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11">${esc(value)}</text></svg>`
}

const DETECTABLE_BARCODE_FORMATS=['code_128','ean_13','ean_8','upc_a','upc_e','code_39','code_93','codabar','itf']
let activeInlineScannerStops=[]
function stopInlineScanners(){activeInlineScannerStops.forEach(fn=>{try{fn()}catch{}});activeInlineScannerStops=[]}
async function buildBarcodeDetector(){
  if(!('BarcodeDetector' in window)) throw new Error('Este dispositivo no ofrece escaneo nativo por cámara. Puedes escribir el código manualmente o usar un lector USB/Bluetooth.')
  let formats=[]
  if(BarcodeDetector.getSupportedFormats){
    try{const supported=await BarcodeDetector.getSupportedFormats();formats=DETECTABLE_BARCODE_FORMATS.filter(f=>supported.includes(f));if(!formats.length)formats=supported}catch{}
  }
  return formats.length?new BarcodeDetector({formats}):new BarcodeDetector()
}
function attachInlineBarcodeScanner({inputEl,startBtn,stopBtn,videoEl,msgEl,panelEl}){
  let localStream=null,localTimer=null,detector=null
  const stop=()=>{clearInterval(localTimer);localTimer=null;if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}if(videoEl){try{videoEl.pause()}catch{}videoEl.style.display='none';videoEl.srcObject=null}if(stopBtn)stopBtn.style.display='none';if(startBtn){startBtn.disabled=false;startBtn.textContent='Escanear'}if(panelEl)panelEl.style.display='none'}
  activeInlineScannerStops.push(stop)
  startBtn.onclick=async()=>{
    try{
      detector=await buildBarcodeDetector();
      if(panelEl)panelEl.style.display='grid';
      startBtn.disabled=true;startBtn.textContent='Escaneando…';
      if(msgEl)msgEl.textContent='Apunta la cámara al código de barra original del producto.';
      localStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
      videoEl.srcObject=localStream;videoEl.style.display='block';await videoEl.play();
      if(stopBtn)stopBtn.style.display='inline-flex';
      localTimer=setInterval(async()=>{try{const found=await detector.detect(videoEl);const match=found.find(x=>x?.rawValue);if(match?.rawValue){inputEl.value=String(match.rawValue).trim();inputEl.dispatchEvent(new Event('input',{bubbles:true}));if(msgEl)msgEl.textContent=`Código detectado: ${match.rawValue}`;notice(`Código comercial escaneado: ${match.rawValue}`);stop()}}catch{}},320)
    }catch(err){if(msgEl)msgEl.textContent=err.message||'No pude abrir la cámara para escanear.';if(startBtn){startBtn.disabled=false;startBtn.textContent='Escanear'}}
  }
  if(stopBtn)stopBtn.onclick=stop
  return {stop}
}
function normalizeBarcode(value){return String(value||'').trim()}
function productHasSourceBarcode(code,excludeId=''){const q=normalizeBarcode(code).toLowerCase();return !!(q&&state.products.some(p=>p.id!==excludeId&&normalizeBarcode(p.source_barcode).toLowerCase()===q))}

function productThumb(p,size='54px'){
  if(p?.image_data)return `<div class="product-thumb" style="width:${size};height:${size}"><img src="${p.image_data}" alt="${esc(p.name||'Producto')}"></div>`
  return `<div class="product-thumb placeholder brand-placeholder" style="width:${size};height:${size}"><img src="${BRAND_LOGO}" alt="ThinkStore"></div>`
}
function readFileDataURL(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(new Error('No pude leer la imagen seleccionada.'));fr.readAsDataURL(file)})}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('No pude abrir la imagen.'));img.src=src})}
function colorDistance(a,b){const dr=a[0]-b[0],dg=a[1]-b[1],db=a[2]-b[2];return Math.sqrt(dr*dr+dg*dg+db*db)}
function autoRemoveBackground(imageData){
  const {data,width,height}=imageData
  const picks=[[0,0],[width-1,0],[0,height-1],[width-1,height-1],[Math.floor(width/2),0],[0,Math.floor(height/2)],[width-1,Math.floor(height/2)],[Math.floor(width/2),height-1]]
  const bg=[]
  for(const [x,y] of picks){const i=(y*width+x)*4;bg.push([data[i],data[i+1],data[i+2]])}
  const clearT=36,softT=84
  for(let i=0;i<data.length;i+=4){
    if(data[i+3]===0)continue
    const px=[data[i],data[i+1],data[i+2]]
    let dist=Infinity
    for(const c of bg){const d=colorDistance(px,c);if(d<dist)dist=d}
    if(dist<=clearT)data[i+3]=0
    else if(dist<softT)data[i+3]=Math.round(data[i+3]*((dist-clearT)/(softT-clearT)))
  }
}
function trimCanvasTransparency(canvas,pad=18){
  const ctx=canvas.getContext('2d'),{width,height}=canvas
  const data=ctx.getImageData(0,0,width,height).data
  let minX=width,minY=height,maxX=-1,maxY=-1
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=data[(y*width+x)*4+3];if(a>8){if(x<minX)minX=x;if(y<minY)minY=y;if(x>maxX)maxX=x;if(y>maxY)maxY=y}}
  if(maxX<0||maxY<0)return canvas
  const w=maxX-minX+1,h=maxY-minY+1
  const out=document.createElement('canvas');out.width=w+pad*2;out.height=h+pad*2
  const octx=out.getContext('2d');octx.clearRect(0,0,out.width,out.height);octx.drawImage(canvas,minX,minY,w,h,pad,pad,w,h)
  return out
}
async function prepareProductImage(file){
  const src=await readFileDataURL(file)
  const img=await loadImage(src)
  const maxEdge=900,scale=Math.min(maxEdge/img.width,maxEdge/img.height,1)
  const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale))
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,w,h);ctx.drawImage(img,0,0,w,h)
  const frame=ctx.getImageData(0,0,w,h);autoRemoveBackground(frame);ctx.putImageData(frame,0,0)
  const trimmed=trimCanvasTransparency(canvas,16)
  const webp=trimmed.toDataURL('image/webp',0.88);return webp.startsWith('data:image/webp')?webp:trimmed.toDataURL('image/png')
}
async function prepareProfileImage(file){
  const src=await readFileDataURL(file),img=await loadImage(src),side=Math.min(img.width,img.height),sx=Math.max(0,(img.width-side)/2),sy=Math.max(0,(img.height-side)/2)
  const size=512,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size
  const ctx=canvas.getContext('2d');ctx.drawImage(img,sx,sy,side,side,0,0,size,size)
  const webp=canvas.toDataURL('image/webp',0.9);return webp.startsWith('data:image/webp')?webp:canvas.toDataURL('image/jpeg',0.9)
}
function makeSku(f){const clean=v=>String(v||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'').slice(0,12);const cat={iPhone:'IPH',Mac:'MAC',iPad:'IPD',AirPods:'APD',Watch:'WCH',Accesorios:'ACC',Repuestos:'RPT'}[f.category]||'PRD';return ['TS',cat,clean(f.name),clean(f.capacity),clean(f.color),f.condition==='Nuevo'?'N':clean(f.condition)].filter(Boolean).join('-')}
function nextUnitBarcode(){const nums=state.units.map(u=>Number(String(u.barcode_value||'').replace(/\D/g,''))||0);return `TSU-${String(Math.max(0,...nums)+1).padStart(6,'0')}`}
function nextProductBarcode(){const nums=state.products.map(p=>Number(String(p.product_barcode||'').replace(/\D/g,''))||0);return `TSP-${String(Math.max(0,...nums)+1).padStart(6,'0')}`}
function nextFurnitureBarcode(){const nums=state.furniture.map(x=>Number(String(x.asset_code||'').replace(/\D/g,''))||0);return `TSM-${String(Math.max(0,...nums)+1).padStart(6,'0')}`}
function furnitureValue(){return state.furniture.filter(x=>x.condition!=='Baja').reduce((a,x)=>a+Number(x.quantity||1)*Number(x.purchase_price||0),0)}
function furnitureCount(){return state.furniture.filter(x=>x.condition!=='Baja').reduce((a,x)=>a+Number(x.quantity||1),0)}
function productMap(){return Object.fromEntries(state.products.map(p=>[p.id,p]))}
function totalStock(productId){return state.stock.filter(s=>s.product_id===productId).reduce((a,s)=>a+Number(s.quantity||0),0)}
function stockAt(productId,location){return Number(state.stock.find(s=>s.product_id===productId&&s.location===location)?.quantity||0)}
function setStock(productId,location,quantity){let row=state.stock.find(s=>s.product_id===productId&&s.location===location);if(!row){row={id:uid(),product_id:productId,location,quantity:0};state.stock.push(row)}row.quantity=Math.max(0,Number(quantity||0))}
function productAvailable(p){const synced=Number(p?.sync_available);if(p?.sync_variant_id&&Number.isFinite(synced))return Math.max(0,synced);return p.tracking_mode==='quantity'?totalStock(p.id):state.units.filter(u=>u.product_id===p.id&&u.status==='Disponible').length}
function save(){if(!canInventoryWrite()){notice('Tu acceso a Inventory es de solo lectura. Solicita permiso Editor o Admin para modificar datos.');return false}persistLocalOnly();if(cloud.degraded){markPendingOfflineSync();setCloudStatus('offline','Guardado local · pendiente sincronizar');scheduleCloudRecovery()}else scheduleCloudSave();return true}
function snapshotData(){return {products:state.products,units:state.units,stock:state.stock,movements:state.movements,locations:state.locations,suppliers:state.suppliers,purchases:state.purchases,furniture:state.furniture}}
function makeBackupPayload(reason='manual'){return {meta:{app:'ThinkStore Inventory',app_version:APP_VERSION,format_version:BACKUP_FORMAT_VERSION,exported_at:new Date().toISOString(),reason},data:JSON.parse(JSON.stringify(snapshotData()))}}
function safeStamp(d=new Date()){const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`}
function downloadJsonFile(payload,filename){const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function downloadBackup(){const payload=makeBackupPayload('manual');downloadJsonFile(payload,`ThinkStore-Inventory-Backup_${safeStamp()}.json`);localStorage.setItem(KEYS.lastBackup,payload.meta.exported_at);if(state.page==='settings')renderPage();notice('Respaldo completo descargado')}
function validateBackup(raw){
 const data=raw?.data&&typeof raw.data==='object'?raw.data:raw
 const names=['products','units','stock','movements','locations','suppliers']
 if(!data||!names.every(k=>Array.isArray(data[k])))throw new Error('El archivo no contiene una copia completa de ThinkStore Inventory.')
 if(!Array.isArray(data.purchases))data.purchases=[]
 if(!Array.isArray(data.furniture))data.furniture=[]
 const ids=new Set(),productBarcodes=new Set(),unitBarcodes=new Set()
 for(const p of data.products){if(!p||!p.id||!p.name)throw new Error('Hay productos incompletos en el respaldo.');if(ids.has(p.id))throw new Error('El respaldo contiene IDs de producto duplicados.');ids.add(p.id);if(p.product_barcode){if(productBarcodes.has(p.product_barcode))throw new Error('El respaldo contiene códigos TSP duplicados.');productBarcodes.add(p.product_barcode)}}
 for(const u of data.units){if(!u||!u.id||!u.product_id)throw new Error('Hay unidades incompletas en el respaldo.');if(!ids.has(u.product_id))throw new Error('Una unidad apunta a un producto inexistente.');if(u.barcode_value){if(unitBarcodes.has(u.barcode_value))throw new Error('El respaldo contiene códigos TSU duplicados.');unitBarcodes.add(u.barcode_value)}}
 for(const row of data.stock){if(!row||!row.product_id||!ids.has(row.product_id))throw new Error('Hay una línea de stock asociada a un producto inexistente.');const q=Number(row.quantity);if(!Number.isFinite(q)||q<0)throw new Error('El respaldo contiene una cantidad de stock inválida.')}
 const furnitureCodes=new Set();for(const item of data.furniture){if(!item||!item.id||!item.name)throw new Error('Hay muebles incompletos en el respaldo.');if(item.asset_code){if(furnitureCodes.has(item.asset_code))throw new Error('El respaldo contiene códigos TSM duplicados.');furnitureCodes.add(item.asset_code)}}
 return {data,meta:raw?.meta||{}}
}
function applySnapshot(data){state.products=JSON.parse(JSON.stringify(data.products));state.units=JSON.parse(JSON.stringify(data.units));state.stock=JSON.parse(JSON.stringify(data.stock));state.movements=JSON.parse(JSON.stringify(data.movements));state.locations=JSON.parse(JSON.stringify(data.locations));state.suppliers=JSON.parse(JSON.stringify(data.suppliers));state.purchases=JSON.parse(JSON.stringify(data.purchases||[]));state.furniture=JSON.parse(JSON.stringify(data.furniture||[]));state.movements.unshift({id:uid(),type:'Inventario restaurado',reason:'Restauración desde respaldo JSON',...actorFields(),created_at:new Date().toISOString()});save();migrate()}
async function restoreBackupFile(file){
 if(!file)return
 try{
   const parsed=JSON.parse(await file.text());const checked=validateBackup(parsed);const d=checked.data
   const sourceDate=checked.meta?.exported_at?dt(checked.meta.exported_at):'fecha desconocida'
   const ok=confirm(`Se restaurará este respaldo (${sourceDate}).\n\nProductos: ${d.products.length}\nUnidades: ${d.units.length}\nMovimientos: ${d.movements.length}\nUbicaciones: ${d.locations.length}\nProveedores: ${d.suppliers.length}\nCompras: ${d.purchases.length}\nMobiliario: ${d.furniture.length}\n\nLos datos actuales serán reemplazados. Se guardará una copia de seguridad local para poder deshacer la restauración.`)
   if(!ok)return
   localStorage.setItem(KEYS.restoreSafety,JSON.stringify(makeBackupPayload('pre-restore-safety')))
   applySnapshot(d);localStorage.setItem(KEYS.lastRestore,new Date().toISOString());renderPage();notice('Respaldo restaurado correctamente')
 }catch(err){notice(`No se pudo restaurar: ${err.message||'archivo inválido'}`)}
}
function undoLastRestore(){
 const raw=localStorage.getItem(KEYS.restoreSafety);if(!raw){notice('No hay una restauración para deshacer');return}
 try{const checked=validateBackup(JSON.parse(raw));if(!confirm('¿Volver al inventario que existía justo antes de la última restauración?'))return;applySnapshot(checked.data);localStorage.removeItem(KEYS.restoreSafety);localStorage.setItem(KEYS.lastRestore,new Date().toISOString());renderPage();notice('Restauración deshecha')}
 catch(err){notice(`No se pudo deshacer: ${err.message||'copia de seguridad inválida'}`)}
}
function notice(msg){let n=$('.notice');if(n)n.remove();document.body.insertAdjacentHTML('beforeend',`<div class="notice">${esc(msg)}<button aria-label="cerrar">×</button></div>`);$('.notice button').onclick=()=>$('.notice')?.remove();setTimeout(()=>$('.notice')?.remove(),3500)}

function shell(){
 const nav=[['dashboard','Inicio','home'],...((isSuperAdmin()||cloud.profile?.permissions?.stock)?[['service_parts','Repuestos de servicio técnico','stock']]:[]),['products','Productos','products'],['stock','Stock por cantidad','stock'],['units','Unidades','units'],['furniture','Mobiliario','furniture'],['scan','Escanear','scan'],['movements','Movimientos','movements'],['locations','Ubicaciones','locations'],['suppliers','Proveedores','suppliers'],['purchases','Compras','purchases'],...(isSuperAdmin()?[['partners','Socios','partners'],['audit','Auditoría','audit']]:[]),['settings','Configuración','settings']]
 $('#app').innerHTML=`<div class="app-shell">${!canInventoryWrite()?'<div class="inventory-readonly-banner"><b>Modo solo lectura</b><span>Puedes consultar Inventory, pero los cambios requieren permiso Editor o Admin.</span></div>':''}<aside class="sidebar"><div class="logo"><div class="brand-mark"><img src="${BRAND_LOGO}" alt="ThinkStore"></div><span><b>ThinkStore</b><small>Inventory</small></span></div><nav>${nav.map(([id,l,i])=>`<button data-page="${id}" class="${state.page===id?'active':''}"><span class="nav-ico">${icons[i]}</span><span>${l}</span></button>`).join('')}</nav><div class="side-foot"><span class="dot" id="cloudStatus"></span><div><b>Online</b><small id="cloudStatusText">Conectando…</small></div></div></aside><main><header class="topbar"><div class="global-search"><span>${icons.search}</span><input id="globalSearch" value="${esc(state.query)}" placeholder="Buscar código, serial, IMEI, SKU o producto…"></div><div class="last-update" id="lastUpdateLabel">${esc(lastUpdateText())}</div><button class="icon-btn" id="reloadBtn" title="Actualizar">${icons.refresh}</button><button class="profile-trigger" id="profileTrigger" title="Perfil de ${esc(currentActorName())}" aria-haspopup="menu" aria-expanded="false"><span class="avatar">${avatarContent(cloud.profile,adminInitials())}</span><span class="profile-chevron">⌄</span></button></header>${cloud.degraded?`<div class="degraded-banner"><b>Modo temporal</b><span>Supabase Data API no responde. Estás trabajando con la copia de este dispositivo; los cambios quedan pendientes de sincronización.</span><button id="retryCloudNow">Reintentar</button></div>`:''}<section class="content" id="content"></section></main></div>`
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;shell();renderPage()})
 $('#globalSearch').oninput=e=>{state.query=e.target.value;if(['products','units','stock','furniture'].includes(state.page))renderPage()}
 $('#reloadBtn').onclick=async()=>{if(cloud.degraded){await tryCloudRecovery(true);return}try{setCloudStatus('syncing','Actualizando…');await loadCurrentProfile();await cloudLoadState();shell();renderPage();notice('Inventario actualizado desde la nube')}catch(err){if(isDataApiUnavailable(err))enterDegradedMode(err);else notice(`No pude actualizar: ${err.message||err}`)}};if($('#retryCloudNow'))$('#retryCloudNow').onclick=()=>tryCloudRecovery(true)
 $('#profileTrigger').onclick=e=>{e.stopPropagation();toggleProfileMenu()}
}
function head(title,text,action=''){return `<div class="page-head"><div><span>Inventario interno</span><h1>${title}</h1><p>${text}</p></div>${action}</div>`}
function movementSubject(m,pmap){if(m.unit_barcode)return `<code>${esc(m.unit_barcode)}</code>`;if(m.asset_code){const item=state.furniture.find(x=>x.id===m.furniture_id||x.asset_code===m.asset_code);return `<code>${esc(m.asset_code)}</code><small>${esc(item?.name||'Mobiliario')}</small>`}const p=pmap[m.product_id];return `<code>${esc(m.product_barcode||p?.product_barcode||'—')}</code><small>${esc(p?.name||'')}</small>`}

function renderPage(){
 const c=$('#content'),pmap=productMap()
 if(state.page==='service_parts'){window.TSWorkshop.mount(c,{mode:'parts',endpoint:(window.TS_CANONICAL_ORIGIN||location.origin)+'/api/workshop',headers:async()=>{return {Authorization:'Bearer '+(cloud.session?.access_token||'')};}});return}
 if(state.page==='dashboard'){
   const serializedAvailable=state.products.filter(p=>p.tracking_mode!=='quantity').reduce((a,p)=>a+productAvailable(p),0)
   const bulkAvailable=state.products.filter(p=>p.tracking_mode==='quantity').reduce((a,p)=>a+productAvailable(p),0)
   const syncedIds=new Set(state.products.filter(p=>p.sync_variant_id).map(p=>p.id));const reserved=state.products.filter(p=>p.sync_variant_id).reduce((a,p)=>a+Math.max(0,Number(p.sync_stock_reserved||0)),0)+state.units.filter(u=>!syncedIds.has(u.product_id)&&u.status==='Reservado').length
   const service=state.units.filter(u=>u.status==='Servicio técnico').length
   const serializedValue=state.units.filter(u=>!['Vendido','Baja'].includes(u.status)).reduce((a,u)=>a+Number(pmap[u.product_id]?.purchase_price||0),0)
   const bulkValue=state.products.filter(p=>p.tracking_mode==='quantity').reduce((a,p)=>a+totalStock(p.id)*Number(p.purchase_price||0),0)
   const low=state.products.filter(p=>p.tracking_mode==='quantity'&&productAvailable(p)<=Number(p.min_stock||0)).length
   c.innerHTML=head('Inventario','Inventario centralizado y sincronizado en tiempo real para equipos, accesorios y mobiliario.',`<div class="head-actions"><button class="btn ghost" id="newStock">＋ Stock por cantidad</button><button class="btn primary" id="newUnit">＋ Registrar unidad</button></div>`)+
   `<div class="stats-grid"><div class="stat-card"><div class="stat-icon">✓</div><div><span>Disponible</span><strong>${serializedAvailable+bulkAvailable}</strong><small>${serializedAvailable} equipos · ${bulkAvailable} accesorios/repuestos</small></div></div><div class="stat-card"><div class="stat-icon">◫</div><div><span>Reservado</span><strong>${reserved}</strong><small>Unidades serializadas</small></div></div><div class="stat-card"><div class="stat-icon">!</div><div><span>Stock bajo</span><strong>${low}</strong><small>Productos por cantidad</small></div></div><div class="stat-card"><div class="stat-icon">$</div><div><span>Valor en inventario</span><strong>${money(serializedValue+bulkValue)}</strong><small>Costo estimado activo</small></div></div><div class="stat-card"><div class="stat-icon">▦</div><div><span>Mobiliario</span><strong>${furnitureCount()}</strong><small>${money(furnitureValue())} en activos</small></div></div></div>`+
   `<div class="two-col"><div class="panel"><div class="panel-title"><div><span>Actividad</span><h3>Movimientos recientes</h3></div></div><div class="activity-list">${state.movements.slice(0,7).map(m=>`<div class="activity"><div class="activity-icon">⇄</div><div><b>${esc(m.type)}</b><span>${esc(m.unit_barcode||m.product_barcode||m.asset_code||'—')} · ${m.quantity_delta?`${m.quantity_delta>0?'+':''}${m.quantity_delta} · `:''}${esc(m.reason||'')}</span></div><time>${dt(m.created_at)}</time></div>`).join('')||'<div class="empty">Sin movimientos.</div>'}</div></div><div class="panel"><div class="panel-title"><div><span>Resumen</span><h3>Control de inventario</h3></div></div><div class="status-list"><div><span><i class="status-dot s-disponible"></i>Equipos disponibles</span><b>${serializedAvailable}</b></div><div><span><i class="status-dot"></i>Accesorios / repuestos</span><b>${bulkAvailable}</b></div><div><span><i class="status-dot s-reservado"></i>Reservados</span><b>${reserved}</b></div><div><span><i class="status-dot s-servicio-técnico"></i>Servicio técnico</span><b>${service}</b></div><div><span><i class="status-dot s-defectuoso"></i>Productos con stock bajo</span><b>${low}</b></div><div><span><i class="status-dot"></i>Muebles / activos de oficina</span><b>${furnitureCount()}</b></div></div></div></div>`
   $('#newUnit').onclick=openUnitForm;$('#newStock').onclick=()=>openStockMovement()
 }
 if(state.page==='products'){
   const q=state.query.trim().toLowerCase()
   const actualCategories=[...new Set(state.products.map(p=>String(p.category||'Otros').trim()||'Otros'))]
   const orderedCategories=[...categories.filter(x=>actualCategories.includes(x)),...actualCategories.filter(x=>!categories.includes(x)).sort((a,b)=>a.localeCompare(b,'es',{numeric:true,sensitivity:'base'}))]
   if(state.productCategory!=='Todos'&&!orderedCategories.includes(state.productCategory))state.productCategory='Todos'
   const categoryCounts=Object.fromEntries(orderedCategories.map(cat=>[cat,state.products.filter(p=>(p.category||'Otros')===cat).length]))

   const scopedByCategory=state.products.filter(p=>(state.productCategory==='Todos'||(p.category||'Otros')===state.productCategory))
   const allSubcategories=[...new Set(scopedByCategory.filter(p=>p.subcategory).map(p=>p.subcategory))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true,sensitivity:'base'}))
   if(state.productSubcategory!=='Todos'&&!allSubcategories.includes(state.productSubcategory))state.productSubcategory='Todos'

   const scopedBySubcategory=scopedByCategory.filter(p=>state.productSubcategory==='Todos'||p.subcategory===state.productSubcategory)
   const allModels=[...new Set(scopedBySubcategory.map(productVariantModel).filter(x=>x&&x!=='Sin modelo'))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true,sensitivity:'base'}))
   const allColors=[...new Set(scopedBySubcategory.map(productVariantColor).filter(x=>x&&x!=='Sin color'))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true,sensitivity:'base'}))
   if(state.productModelFilter!=='Todos'&&!allModels.includes(state.productModelFilter))state.productModelFilter='Todos'
   if(state.productColorFilter!=='Todos'&&!allColors.includes(state.productColorFilter))state.productColorFilter='Todos'

   const matchesSearch=p=>!q||[p.name,p.product_group,p.sku,p.product_barcode,p.source_barcode,p.category,p.subcategory,p.compatibility,p.variant_model,p.variant_color,p.model,p.capacity,p.color,p.condition].some(v=>String(v||'').toLowerCase().includes(q))
   const matchesCategory=p=>state.productCategory==='Todos'||(p.category||'Otros')===state.productCategory
   const matchesSubcategory=p=>state.productSubcategory==='Todos'||p.subcategory===state.productSubcategory
   const matchesModel=p=>state.productModelFilter==='Todos'||productVariantModel(p)===state.productModelFilter
   const matchesColor=p=>state.productColorFilter==='Todos'||productVariantColor(p)===state.productColorFilter
   const matchesStock=p=>state.productStockFilter==='Todos'||productStockState(p)===state.productStockFilter

   const rows=state.products.filter(p=>matchesSearch(p)&&matchesCategory(p)&&matchesSubcategory(p)&&matchesModel(p)&&matchesColor(p)&&matchesStock(p))
   const groups=groupProductsShopify(rows)
   const totalAvailable=state.products.reduce((n,p)=>n+productAvailable(p),0)
   const lowCount=state.products.filter(p=>productStockState(p)==='Stock bajo').length
   const outCount=state.products.filter(p=>productStockState(p)==='Sin stock').length
   const syncedCount=state.products.filter(p=>p.sync_variant_id).length

   const categoryCards=`<div class="product-category-grid"><button class="product-category-card ${state.productCategory==='Todos'?'active':''}" data-product-category="Todos"><span class="product-cat-icon">▦</span><b>Todos</b><small>${state.products.length}</small></button>${orderedCategories.map(cat=>`<button class="product-category-card ${state.productCategory===cat?'active':''}" data-product-category="${esc(cat)}"><span class="product-cat-icon">${productCategoryIcon(cat)}</span><b>${esc(productCategoryLabel(cat))}</b><small>${categoryCounts[cat]||0}</small></button>`).join('')}</div>`

   const subcategoryBar=state.productCategory==='Accesorios'&&allSubcategories.length?`<div class="product-subcategory-bar shopify-subcategory-bar"><span>Accesorios</span><button class="product-subcategory-chip ${state.productSubcategory==='Todos'?'active':''}" data-product-subcategory="Todos">Todos</button>${allSubcategories.map(x=>`<button class="product-subcategory-chip ${state.productSubcategory===x?'active':''}" data-product-subcategory="${esc(x)}">${esc(x)}</button>`).join('')}</div>`:''

   const activeTitle=state.productCategory==='Todos'?'Todo el catálogo':productCategoryLabel(state.productCategory)
   const filterSummary=[state.productSubcategory!=='Todos'?state.productSubcategory:'',state.productModelFilter!=='Todos'?state.productModelFilter:'',state.productColorFilter!=='Todos'?state.productColorFilter:''].filter(Boolean).join(' · ')

   const groupHtml=groups.map((g,gi)=>{
     const models=g.models,colors=g.colors,previewColors=colors.slice(0,8)
     const variants=g.variants.map(p=>`<div class="shopify-variant-row">
       <div class="shopify-variant-name">${productColorSwatch(productVariantColor(p))}<div><b>${esc(productVariantModel(p))}</b><small>${esc(productVariantColor(p))}${p.condition?' · '+esc(p.condition):''}</small></div></div>
       <div class="shopify-variant-sku"><code>${esc(p.sku||p.product_barcode)}</code><small>${esc(p.product_barcode)}</small></div>
       <div><b>${money(p.sale_price)}</b><small>Costo ${money(p.purchase_price)}</small></div>
       <div class="shopify-stock-cell"><b>${productAvailable(p)}</b><small class="product-stock-state ${productStockState(p).replaceAll(' ','-').toLowerCase()}">${esc(productStockState(p))}</small></div>
       <div class="shopify-variant-actions"><button class="row-btn" data-edit-product="${p.id}">Editar</button>${p.tracking_mode==='quantity'?`<button class="row-btn" data-stock-product="${p.id}">Stock</button>`:`<button class="row-btn" data-unit-product="${p.id}">Unidad</button>`}<button class="row-btn icon-only" title="Etiqueta" data-label-product="${p.id}">▤</button></div>
     </div>`).join('')
     return `<details class="shopify-product-group" ${groups.length<=3||q||state.productModelFilter!=='Todos'||state.productColorFilter!=='Todos'?'open':''}>
       <summary>
         <div class="shopify-product-main">${productThumb(g.image,'64px')}<div><span>${esc(g.subcategory||productCategoryLabel(g.category))}</span><h3>${esc(g.title)}</h3><p>${esc(g.brand||'ThinkStore')} · ${g.variants.length} variante${g.variants.length===1?'':'s'}${g.variants.some(v=>v.sync_variant_id)?' · ✓ ThinkStore Sync':''}</p></div></div>
         <div class="shopify-model-summary"><span>Modelos</span><b>${models.length}</b><small>${esc(models.slice(0,2).join(' · '))}${models.length>2?'…':''}</small></div>
         <div class="shopify-color-summary"><span>Colores</span><div>${previewColors.map(c=>productColorSwatch(c)).join('')}${colors.length>8?`<em>+${colors.length-8}</em>`:''}</div><small>${colors.length} color${colors.length===1?'':'es'}</small></div>
         <div class="shopify-stock-summary"><span>Stock</span><b>${g.stock}</b><small>${shopifyPriceRange(g)}</small></div>
         <i class="shopify-expand">⌄</i>
       </summary>
       <div class="shopify-variants">
         <div class="shopify-variants-head"><span>Modelo / color</span><span>SKU / código</span><span>Precio</span><span>Stock</span><span>Acciones</span></div>
         ${variants}
       </div>
     </details>`
   }).join('')

   c.innerHTML=head('Productos · Catálogo y variantes','Catálogo comercial organizado por producto padre, modelos, colores y variantes. La estructura mantiene sincronización por SKU con ThinkStore y control de stock independiente.',`<div class="head-actions"><button class="btn ghost" id="newSiliconeCases">＋ Silicone Cases</button><button class="btn primary" id="newProduct">＋ Nuevo producto</button></div>`)+
   `<div class="product-summary-grid"><div><span>Productos padre</span><b>${groupProductsShopify(state.products).length}</b><small>Colecciones agrupadas</small></div><div><span>Variantes</span><b>${state.products.length}</b><small>Modelos / colores / capacidades</small></div><div><span>Disponible</span><b>${totalAvailable}</b><small>Unidades totales</small></div><div><span>Stock bajo</span><b>${lowCount}</b><small>Requieren atención</small></div><div><span>ThinkStore Sync</span><b>${syncedCount}</b><small>Variantes enlazadas</small></div></div>`+
   categoryCards+subcategoryBar+
   `<div class="shopify-filter-shell">
      <div class="shopify-filter-title"><b>${esc(activeTitle)}</b><small>${filterSummary?esc(filterSummary)+' · ':''}${groups.length} producto${groups.length===1?'':'s'} · ${rows.length} variante${rows.length===1?'':'s'}</small></div>
      <div class="shopify-filter-grid">
       <label>Modelo<select id="productModelFilter"><option>Todos</option>${allModels.map(x=>`<option ${state.productModelFilter===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
       <label>Color<select id="productColorFilter"><option>Todos</option>${allColors.map(x=>`<option ${state.productColorFilter===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
       <label>Estado<select id="productStockFilter"><option ${state.productStockFilter==='Todos'?'selected':''}>Todos</option><option ${state.productStockFilter==='Con stock'?'selected':''}>Con stock</option><option ${state.productStockFilter==='Stock bajo'?'selected':''}>Stock bajo</option><option ${state.productStockFilter==='Sin stock'?'selected':''}>Sin stock</option></select></label>
       <button type="button" class="shopify-clear-filters" id="clearProductFilters">Limpiar filtros</button>
      </div>
    </div>`+
   `<div class="shopify-product-list">${groupHtml||'<div class="empty shopify-empty">No hay productos que coincidan con estos filtros.</div>'}</div>`

   $('#newProduct').onclick=openProductForm
   $('#newSiliconeCases').onclick=openSiliconeCaseBuilder
   $('#productModelFilter').onchange=e=>{state.productModelFilter=e.target.value;renderPage()}
   $('#productColorFilter').onchange=e=>{state.productColorFilter=e.target.value;renderPage()}
   $('#productStockFilter').onchange=e=>{state.productStockFilter=e.target.value;renderPage()}
   $('#clearProductFilters').onclick=()=>{state.productModelFilter='Todos';state.productColorFilter='Todos';state.productStockFilter='Todos';renderPage()}
   document.querySelectorAll('[data-product-category]').forEach(b=>b.onclick=()=>{state.productCategory=b.dataset.productCategory;state.productSubcategory='Todos';state.productModelFilter='Todos';state.productColorFilter='Todos';renderPage()})
   document.querySelectorAll('[data-product-subcategory]').forEach(b=>b.onclick=()=>{state.productSubcategory=b.dataset.productSubcategory;state.productModelFilter='Todos';state.productColorFilter='Todos';renderPage()})
   document.querySelectorAll('[data-edit-product]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();openAdvancedProductEditor(b.dataset.editProduct)})
   document.querySelectorAll('[data-label-product]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();printProductLabel(state.products.find(p=>p.id===b.dataset.labelProduct))})
   document.querySelectorAll('[data-stock-product]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();openStockMovement(b.dataset.stockProduct)})
   document.querySelectorAll('[data-unit-product]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();openUnitForm(b.dataset.unitProduct)})
 }
 if(state.page==='stock') renderBulkStock(c)
 if(state.page==='furniture') renderFurniture(c)
 if(state.page==='units'){
   const q=state.query.trim().toLowerCase();const rows=state.units.filter(u=>!q||[u.barcode_value,u.serial_number,u.imei,u.imei_2,u.status,u.location,pmap[u.product_id]?.name,pmap[u.product_id]?.sku,pmap[u.product_id]?.product_barcode].some(v=>String(v||'').toLowerCase().includes(q)))
   c.innerHTML=head('Unidades físicas','Equipos y artículos de alto valor controlados individualmente por serial, IMEI y Code 128.',`<button class="btn primary" id="newUnit">＋ Registrar unidad</button>`)+`<div class="table-card"><table><thead><tr><th>Código unidad</th><th>Producto</th><th>Serial / IMEI</th><th>Ubicación</th><th>Estado</th><th></th></tr></thead><tbody>${rows.map(u=>{const p=pmap[u.product_id];return `<tr><td><code>${esc(u.barcode_value)}</code></td><td><b>${esc(p?.name||'—')}</b><small>${esc(p?.capacity||'')} · ${esc(p?.color||'')}</small></td><td>${esc(u.serial_number||'—')}<small>${esc(u.imei||'')}</small></td><td>${esc(u.location||'—')}</td><td><span class="pill">${esc(u.status)}</span></td><td><button class="row-btn" data-open-unit="${u.id}">Abrir</button></td></tr>`}).join('')}</tbody></table></div>`
   $('#newUnit').onclick=()=>openUnitForm();document.querySelectorAll('[data-open-unit]').forEach(b=>b.onclick=()=>openUnitDetail(b.dataset.openUnit))
 }
 if(state.page==='scan'){
   c.innerHTML=head('Escanear producto','Acepta códigos TSP de producto, TSU de unidad, TSM de mobiliario y también códigos originales del fabricante (EAN / UPC / Code 128), además de serial o IMEI.')+`<div class="scanner-card"><video id="camera" playsinline style="width:100%;max-height:380px;border-radius:16px;background:#111;display:none"></video><button class="btn primary big" id="startScan">⌗ Abrir cámara</button><button class="btn danger" id="stopScan" style="display:none">Detener cámara</button><p class="error-note" id="scanMsg"></p><div class="manual-scan"><input id="manualCode" placeholder="TSP / TSU / TSM / código original / serial / IMEI"><button class="btn dark" id="manualFind">Buscar</button></div></div>`
   $('#manualFind').onclick=()=>findAsset($('#manualCode').value);$('#manualCode').onkeydown=e=>{if(e.key==='Enter')findAsset(e.target.value)};$('#startScan').onclick=startScanner;$('#stopScan').onclick=stopScanner
 }
 if(state.page==='movements')c.innerHTML=head('Movimientos','Bitácora operativa con fecha, hora y socio/usuario que realizó cada cambio.')+`<div class="table-card"><table><thead><tr><th>Fecha</th><th>Referencia</th><th>Movimiento</th><th>Cantidad</th><th>Ubicación</th><th>Motivo</th><th>Usuario</th></tr></thead><tbody>${state.movements.map(m=>`<tr><td>${dt(m.created_at)}</td><td>${movementSubject(m,pmap)}</td><td><b>${esc(m.type)}</b></td><td>${m.quantity_delta!=null?`<b class="${m.quantity_delta<0?'qty-negative':'qty-positive'}">${m.quantity_delta>0?'+':''}${m.quantity_delta}</b>`:'—'}</td><td>${esc(m.location||m.to_location||'—')}</td><td>${esc(m.reason||'—')}</td><td>${esc(m.user_name||'Sistema')}</td></tr>`).join('')}</tbody></table></div>`
 if(state.page==='locations')renderLocations(c)
 if(state.page==='suppliers')renderSuppliers(c)
 if(state.page==='purchases')renderPurchases(c)
 if(state.page==='partners'){renderPartners(c)}
 if(state.page==='audit'){renderAudit(c)}
 if(state.page==='settings'){
   const lastBackup=localStorage.getItem(KEYS.lastBackup),lastRestore=localStorage.getItem(KEYS.lastRestore),canUndo=!!localStorage.getItem(KEYS.restoreSafety)
   c.innerHTML=head('Configuración','ThinkStore Inventory Online V3 está conectado al ecosistema de ThinkStore y sincroniza los cambios entre dispositivos.')+`<div class="settings-grid"><div class="panel backup-panel app-install-panel"><div class="app-icon-mini"><img src="${BRAND_LOGO}" alt="ThinkStore"></div><h3>${isStandalone()?'App instalada':'Instalar ThinkStore Inventory'}</h3><p class="muted">Instálala como aplicación independiente. Los datos se sincronizan con Supabase y las mejoras web llegan automáticamente al volver a abrir o actualizar.</p><button class="btn primary" id="installAppBtn">${isStandalone()?'✓ Instalada':'▣ Instalar aplicación'}</button><small class="backup-meta">${isIOS()&&!isStandalone()?'En iPhone/iPad se completa desde Safari → Compartir → Añadir a pantalla de inicio.':'Compatible con navegadores que admiten aplicaciones web instalables.'}</small></div><div class="panel backup-panel"><h3>Respaldo local</h3><p class="muted">Descarga una copia completa de productos, imágenes, unidades, stock, mobiliario, movimientos, ubicaciones y proveedores. Guárdala también en otro disco.</p><button class="btn primary" id="downloadBackup">↓ Descargar respaldo</button><small class="backup-meta">Último respaldo: ${lastBackup?dt(lastBackup):'Aún no registrado'}</small></div><div class="panel backup-panel"><h3>Restaurar inventario</h3><p class="muted">Selecciona un archivo <b>.json</b> creado por ThinkStore Inventory. El sistema valida el archivo antes de reemplazar la información actual.</p><input id="restoreFile" type="file" accept="application/json,.json" hidden><button class="btn dark" id="chooseRestore">↑ Seleccionar respaldo</button><small class="backup-meta">Última restauración: ${lastRestore?dt(lastRestore):'Ninguna'}</small></div><div class="panel backup-panel"><h3>Protección de restauración</h3><p class="muted">Antes de restaurar se conserva automáticamente el inventario anterior en este dispositivo.</p><button class="btn ghost" id="undoRestore" ${canUndo?'':'disabled'}>↶ Deshacer última restauración</button><small class="backup-meta">${canUndo?'Hay una copia previa disponible.':'No hay una copia previa pendiente.'}</small></div><div class="panel"><h3>Última actualización</h3><p class="muted"><b>${esc(cloud.lastUpdate?.name||cloud.lastUpdate?.email||'Sin usuario')}</b><br>${cloud.lastUpdate?.at?dt(cloud.lastUpdate.at):'Aún no registrada'}</p><small class="backup-meta">Cada cambio sincronizado conserva usuario, fecha y hora. Los super admins también disponen de Auditoría.</small></div><div class="panel"><h3>Almacenamiento online</h3><p class="muted">Productos, unidades, stock y movimientos se sincronizan con Supabase. Las imágenes se alojan en Cloudflare R2 y el dispositivo mantiene una copia local temporal para continuidad.</p></div><div class="panel"><h3>Imágenes pendientes</h3><p class="muted">${hasPendingMedia()?'Hay imágenes esperando subir a Cloudflare R2. Los datos del inventario ya están guardados.':'No hay imágenes pendientes.'}</p><button class="btn ghost" id="retryMediaBtn" ${hasPendingMedia()?'':'disabled'}>↻ Reintentar imágenes</button></div><div class="panel"><h3>Dos controles de stock</h3><p class="muted"><b>Equipos:</b> unidad física con TSU + serial/IMEI.<br><b>Accesorios y repuestos:</b> cantidad con un TSP por producto/variante.</p></div><div class="panel"><h3>Códigos</h3><p class="muted"><b>TSP-000001</b> identifica producto/variante.<br><b>TSU-000001</b> identifica una unidad física exacta.<br><b>TSM-000001</b> identifica mobiliario y activos de oficina.</p></div></div><div class="backup-warning"><b>Modo online:</b> Supabase es la fuente central del inventario. La copia local sirve como respaldo temporal; mantén también respaldos JSON periódicos.</div>`
   $('#installAppBtn').onclick=installHelp;$('#downloadBackup').onclick=downloadBackup;$('#chooseRestore').onclick=()=>$('#restoreFile').click();$('#restoreFile').onchange=e=>restoreBackupFile(e.target.files?.[0]);$('#undoRestore').onclick=undoLastRestore;if($('#retryMediaBtn'))$('#retryMediaBtn').onclick=()=>retryPendingMedia(true)
 }
 setTimeout(maybeOpenProductEditorDeepLink,0)
}


async function renderPartners(c){
 if(!isSuperAdmin()){c.innerHTML=head('Socios','Acceso restringido a super administradores.')+'<div class="empty">No autorizado.</div>';return}
 c.innerHTML=head('Socios administradores','Gestiona las cuentas de los socios, sus datos privados y permisos.',`<button class="btn primary" id="newPartner">＋ Crear socio</button>`)+`<div class="panel"><div class="partner-loading">Cargando socios…</div></div>`
 $('#newPartner').onclick=()=>openPartnerForm()
 try{
   const users=await loadAdminUsers()
   c.innerHTML=head('Socios administradores','Solo los super admins pueden consultar y modificar estos datos privados.',`<button class="btn primary" id="newPartner">＋ Crear socio</button>`)+`<div class="partner-grid">${users.map(u=>{const initials=(partnerDisplayName(u,u.email)||u.email||'SA').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase(),canDelete=u.user_id!==currentActorId()&&String(u.email||'').toLowerCase()!==PRIMARY_PARTNER_EMAIL;return `<div class="partner-card"><div class="partner-card-head"><div class="partner-avatar">${avatarContent(u,initials)}</div><div><h3>${esc(partnerDisplayName(u,u.email)||'Sin nombre')}</h3><span>${esc(u.role==='super_admin'?'Socio · Super Admin':u.role)}</span></div><span class="partner-status ${u.active?'active':'inactive'}">${u.active?'Activo':'Inactivo'}</span></div><div class="partner-details"><div><span>Correo corporativo</span><b>${esc(u.email||'—')}</b></div>${u.invite_email?`<div><span>Invitación enviada a</span><b>${esc(u.invite_email)}</b></div>`:''}<div><span>Teléfono</span><b>${esc(u.phone||'—')}</b></div><div><span>Cédula / documento</span><b>${esc(u.document_type&&u.document_number?`${u.document_type}-${u.document_number}`:'—')}</b></div><div><span>Permisos</span><b>${u.role==='super_admin'?'Todos los permisos':'Personalizados'}</b></div></div><div class="partner-actions"><button class="row-btn" data-edit-partner="${u.user_id}">Editar datos</button>${canDelete?`<button class="row-btn danger-row" data-delete-partner="${u.user_id}">Eliminar socio</button>`:''}${u.user_id===currentActorId()?'<span class="you-badge">Tu cuenta</span>':''}</div></div>`}).join('')||'<div class="empty">No hay socios registrados.</div>'}</div><div class="privacy-note">🔒 Cédula, teléfono y datos personales solo son visibles para super administradores. Eliminar un socio requiere un código de seguridad enviado por correo.</div>`
   $('#newPartner').onclick=()=>openPartnerForm();document.querySelectorAll('[data-edit-partner]').forEach(b=>b.onclick=()=>openPartnerForm(users.find(u=>u.user_id===b.dataset.editPartner)));document.querySelectorAll('[data-delete-partner]').forEach(b=>b.onclick=()=>openDeletePartnerDialog(users.find(u=>u.user_id===b.dataset.deletePartner)))
 }catch(err){c.innerHTML=head('Socios administradores','No pude cargar las cuentas.')+`<div class="backup-warning"><b>Error:</b> ${esc(err.message)}${err.message==='SERVER_ADMIN_ENV_MISSING'?'<br>Falta THINKSTORE_SUPABASE_SERVICE_ROLE_KEY en Cloudflare.':''}</div>`}
}
function openDeletePartnerDialog(user){
 if(!isSuperAdmin()||!user)return
 if(user.user_id===currentActorId()||String(user.email||'').toLowerCase()===PRIMARY_PARTNER_EMAIL){notice('Esta cuenta está protegida y no puede eliminarse desde aquí.');return}
 const name=partnerDisplayName(user,user.email)||user.email||'este socio'
 modal('Eliminar socio',`<div class="delete-partner-flow"><div class="danger-confirm-icon">!</div><h3>Eliminar a ${esc(name)}</h3><p>Esta acción eliminará su acceso a ThinkStore Inventory y su perfil administrativo. Antes de continuar enviaremos un código de 6 dígitos a tu correo de seguridad.</p><div class="privacy-note">La cuenta principal de ThinkStore y tu propia sesión están protegidas contra eliminación accidental.</div><div class="form-actions"><button class="btn ghost cancel">Cancelar</button><button class="btn danger" id="requestDeleteCode">Enviar código</button></div></div>`)
 $('.cancel').onclick=closeModal
 $('#requestDeleteCode').onclick=async()=>{const btn=$('#requestDeleteCode');btn.disabled=true;btn.textContent='Enviando…';try{const data=await adminUsersRequest('POST',{action:'request_delete',user_id:user.user_id});openDeleteCodeForm(user,data)}catch(err){btn.disabled=false;btn.textContent='Enviar código';const map={CANNOT_DELETE_SELF:'No puedes eliminar tu propia cuenta.',PRIMARY_PARTNER_PROTECTED:'La cuenta principal de ThinkStore está protegida.',VERIFICATION_EMAIL_MISSING:'Tu cuenta no tiene un correo válido para recibir el código.',INVITE_EMAIL_ENV_MISSING:'Falta configurar RESEND_API_KEY en Cloudflare.',EMAIL_SEND_FAILED:'No se pudo enviar el código por correo.'};notice(map[err.message]||err.message)}}
}
function openDeleteCodeForm(user,challengeData={}){
 const name=partnerDisplayName(user,user.email)||user.email||'socio',hint=challengeData.destination_hint||'tu correo registrado'
 modal('Verificación de seguridad',`<form id="deletePartnerCodeForm" class="stack-form"><div class="verification-code-head"><div class="danger-confirm-icon">✉</div><div><h3>Código enviado</h3><p>Revisa <b>${esc(hint)}</b>. El código vence en 10 minutos.</p></div></div><label>Código de 6 dígitos<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required placeholder="000000"></label><div class="privacy-note">Vas a eliminar definitivamente el acceso de <b>${esc(name)}</b>.</div><div class="form-actions"><button type="button" class="btn ghost cancel">Cancelar</button><button class="btn danger" id="confirmDeletePartner">Verificar y eliminar</button></div></form>`)
 $('.cancel').onclick=closeModal
 const form=$('#deletePartnerCodeForm');form.querySelector('[name="code"]').focus()
 form.onsubmit=async ev=>{ev.preventDefault();const code=String(new FormData(ev.target).get('code')||'').replace(/\D/g,'').slice(0,6);const btn=$('#confirmDeletePartner');btn.disabled=true;btn.textContent='Verificando…';try{await adminUsersRequest('DELETE',{action:'confirm_delete',user_id:user.user_id,code,challenge:challengeData.challenge});cloud.adminUsers=cloud.adminUsers.filter(x=>x.user_id!==user.user_id);state.movements.unshift({id:uid(),type:'Socio eliminado',reason:name,...actorFields(),created_at:new Date().toISOString()});save();closeModal();notice('Socio eliminado correctamente');state.page='partners';renderPage()}catch(err){btn.disabled=false;btn.textContent='Verificar y eliminar';const map={INVALID_DELETE_CODE:'El código ingresado no es correcto.',DELETE_CODE_EXPIRED:'El código venció. Solicita uno nuevo.',DELETE_VERIFICATION_REQUIRED:'Escribe el código de 6 dígitos.',PARTNER_NOT_FOUND:'El socio ya no existe.',PRIMARY_PARTNER_PROTECTED:'La cuenta principal está protegida.'};notice(map[err.message]||err.message)}}
}
function openPartnerForm(editing=null){
 if(!isSuperAdmin())return
 const e=editing||{},initials=(partnerDisplayName(e,e.email)||e.email||'SA').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()
 modal(editing?'Editar socio administrador':'Crear socio administrador',`<form id="partnerForm" class="form-grid"><div class="span2 profile-photo-editor"><div class="profile-photo-preview" id="partnerPhotoPreview">${avatarContent(e,initials)}</div><div><b>Foto de perfil</b><small>${editing?'Puedes reemplazar o quitar la foto del socio.':'Opcional. Se cargará después de crear la cuenta.'}</small><input id="partnerPhotoInput" type="file" accept="image/*">${editing&&e.avatar_url?'<button type="button" class="row-btn" id="removePartnerPhoto">Quitar foto</button>':''}</div></div><label class="span2">Nombre y apellido<input name="full_name" required value="${esc(e.full_name||'')}" placeholder="Nombre completo"></label><label>Correo corporativo<input name="email" type="email" required value="${esc(e.email||'')}" placeholder="nombre.apellido@thinkstore.com.ve"><small class="field-help">Será el usuario de acceso a ThinkStore Inventory.</small></label>${editing?'':`<label>Correo para recibir la invitación<input name="invite_email" type="email" required value="${esc(e.invite_email||'')}" placeholder="correo personal o corporativo"><small class="field-help">Aquí llegará el enlace seguro para crear su contraseña. No tiene que ser el mismo correo corporativo.</small></label>`}<label>Teléfono<input name="phone" value="${esc(e.phone||'')}" placeholder="+58 412 0000000"></label><label>Tipo de documento<select name="document_type">${['V','E','J','P'].map(x=>`<option value="${x}" ${e.document_type===x?'selected':''}>${x}-</option>`).join('')}</select></label><label>Número de documento<input name="document_number" inputmode="numeric" required value="${esc(e.document_number||'')}" placeholder="12345678"></label><label class="span2">Notas personales / administrativas<textarea name="personal_notes" rows="3" placeholder="Opcional">${esc(e.personal_notes||'')}</textarea></label><div class="span2 permission-box"><div><b>Socio · Super Admin</b><small>Acceso total al inventario, stock, equipos, mobiliario, proveedores, ubicaciones, usuarios, auditoría y configuración.</small></div><span>✓ Todos los permisos</span></div>${editing?`<label class="toggle-line span2"><input name="active" type="checkbox" ${e.active!==false?'checked':''}> Cuenta activa</label>`:`<div class="span2 privacy-note">✉️ Al crear el socio se enviará una invitación oficial de ThinkStore. El socio definirá su propia contraseña; el administrador nunca conocerá ni almacenará esa contraseña.</div>`}<div class="form-actions span2"><button type="button" class="btn ghost cancel">Cancelar</button><button class="btn primary" id="savePartnerBtn">${editing?'Guardar cambios':'Crear socio y enviar invitación'}</button></div></form>`)
 $('.cancel').onclick=closeModal
 const form=$('#partnerForm'),nameInput=form.querySelector('[name="full_name"]'),emailInput=form.querySelector('[name="email"]'),inviteInput=form.querySelector('[name="invite_email"]'),photoInput=$('#partnerPhotoInput'),photoPreview=$('#partnerPhotoPreview')
 let profileImageData='',removeProfilePhoto=false
 photoInput.onchange=async()=>{const file=photoInput.files?.[0];if(!file)return;try{profileImageData=await prepareProfileImage(file);removeProfilePhoto=false;photoPreview.innerHTML=`<img src="${profileImageData}" alt="Vista previa">`}catch(err){notice(err.message||'No pude procesar la foto')}}
 if($('#removePartnerPhoto'))$('#removePartnerPhoto').onclick=()=>{profileImageData='';removeProfilePhoto=true;photoPreview.textContent=initials||'SA'}
 if(!editing){
   let emailTouched=false,inviteTouched=false
   emailInput.addEventListener('input',()=>{emailTouched=true})
   inviteInput?.addEventListener('input',()=>{inviteTouched=true})
   const suggest=()=>{const suggested=corporateEmailFromName(nameInput.value);if(!emailTouched&&suggested)emailInput.value=suggested;if(!inviteTouched&&suggested)inviteInput.value=suggested}
   nameInput.addEventListener('input',suggest);suggest()
 }
 form.onsubmit=async ev=>{ev.preventDefault();const f=Object.fromEntries(new FormData(ev.target));delete f.profile_photo;if(editing){f.user_id=e.user_id;f.active=!!ev.target.querySelector('[name="active"]').checked}const btn=$('#savePartnerBtn');btn.disabled=true;btn.textContent=editing?'Guardando…':'Creando y enviando…';try{let data=await adminUsersRequest(editing?'PATCH':'POST',f),targetId=editing?e.user_id:data?.user?.user_id,photoWarning='';if(targetId&&(profileImageData||removeProfilePhoto)){try{if(profileImageData){const upload=await uploadMediaViaServer({id:targetId,image_data:profileImageData},'profiles');const patch={...f,user_id:targetId,active:editing?f.active:true,avatar_url:upload.publicUrl,avatar_key:upload.key};data=await adminUsersRequest('PATCH',patch)}else if(removeProfilePhoto){const patch={...f,user_id:targetId,active:editing?f.active:true,avatar_url:'',avatar_key:''};data=await adminUsersRequest('PATCH',patch)}}catch(photoErr){photoWarning=' La cuenta se guardó, pero no pude actualizar la foto.'}}
 state.movements.unshift({id:uid(),type:editing?'Socio actualizado':'Socio super admin invitado',reason:f.full_name,...actorFields(),created_at:new Date().toISOString()});save();closeModal();notice((editing?'Datos del socio actualizados':`Socio creado. Invitación enviada a ${f.invite_email}`)+photoWarning);if(targetId===currentActorId()){cloud.profile={...cloud.profile,...(data?.user||{}),avatar_url:data?.user?.avatar_url??cloud.profile?.avatar_url};shell()}state.page='partners';renderPage()}catch(err){btn.disabled=false;btn.textContent=editing?'Guardar cambios':'Crear socio y enviar invitación';const map={INVITE_EMAIL_ENV_MISSING:'Falta configurar RESEND_API_KEY en Cloudflare.',INVALID_CORPORATE_EMAIL:'El correo corporativo debe terminar en @thinkstore.com.ve.',INVALID_INVITE_EMAIL:'Escribe un correo válido para recibir la invitación.',EMAIL_SEND_FAILED:'No se pudo enviar el correo. Revisa Resend y vuelve a intentarlo.'};notice(map[err.message]||err.message)}
 }
}
async function renderAudit(c){
 if(!isSuperAdmin()){c.innerHTML=head('Auditoría','Acceso restringido.')+'<div class="empty">No autorizado.</div>';return}
 c.innerHTML=head('Auditoría','Historial de cambios con fecha, hora y socio responsable.')+'<div class="panel"><div class="partner-loading">Cargando auditoría…</div></div>'
 try{const rows=await loadAuditRows();c.innerHTML=head('Auditoría','Registro central de cambios realizado por los administradores y socios.')+`<div class="table-card"><table><thead><tr><th>Fecha y hora</th><th>Socio / usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead><tbody>${rows.map(a=>`<tr><td>${dt(a.created_at)}</td><td><b>${esc(auditActorName(a))}</b><small>${esc(a.actor_email||'')}</small></td><td><b>${esc(a.action||'Actualización')}</b></td><td>${esc(a.entity_type||'—')}<small>${esc(a.entity_id||'')}</small></td><td>${esc(a.details?.reason||a.details?.location||a.details?.full_name||'—')}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">Aún no hay eventos de auditoría.</div></td></tr>'}</tbody></table></div>`}catch(err){c.innerHTML=head('Auditoría','No pude cargar el historial.')+`<div class="backup-warning"><b>Error:</b> ${esc(err.message)}</div>`}
}

function renderBulkStock(c){
 const q=state.query.trim().toLowerCase()
 const quantityProducts=state.products.filter(p=>p.tracking_mode==='quantity')
 const counts=Object.fromEntries(stockProductGroups.map(g=>[g,0]))
 quantityProducts.forEach(p=>{counts.Todos++;const g=stockProductGroup(p);counts[g]=(counts[g]||0)+1})
 const rows=quantityProducts.filter(p=>(state.stockProductCategory==='Todos'||stockProductGroup(p)===state.stockProductCategory)&&(!q||[p.name,p.sku,p.product_barcode,p.subcategory,p.compatibility,p.category,stockProductGroup(p)].some(v=>String(v||'').toLowerCase().includes(q)))).sort((a,b)=>stockProductGroups.indexOf(stockProductGroup(a))-stockProductGroups.indexOf(stockProductGroup(b))||String(a.name||'').localeCompare(String(b.name||''),'es',{numeric:true,sensitivity:'base'})||String(a.compatibility||'').localeCompare(String(b.compatibility||''),'es',{numeric:true,sensitivity:'base'}))
 const cards=`<div class="stock-product-groups">${stockProductGroups.map(g=>`<button class="stock-product-group ${state.stockProductCategory===g?'active':''}" data-stock-group="${esc(g)}"><span>${g==='Cases'?'▱':g==='Cargadores'?'⚡':g==='Vidrios templados'?'◇':g==='Cargadores MagSafe'?'◎':g==='Cables'?'⌁':g==='Repuestos'?'⚙':'▦'}</span><b>${esc(g)}</b><small>${counts[g]||0}</small></button>`).join('')}</div>`
 c.innerHTML=head('Stock de productos','Accesorios y repuestos controlados por cantidad, ahora separados por tipo para gestionar más rápido Cases, Cargadores, Vidrios templados y MagSafe.',`<button class="btn primary" id="newStock">＋ Movimiento de stock</button>`)+cards+`<div class="stock-product-caption"><b>${esc(state.stockProductCategory)}</b><span>${rows.length} referencia${rows.length===1?'':'s'}</span></div><div class="table-card"><table><thead><tr><th>Producto</th><th>Categoría</th><th>Código</th><th>Tienda</th><th>Almacén</th><th>Otros</th><th>Total</th><th>Mínimo</th><th></th></tr></thead><tbody>${rows.map(p=>{const tienda=stockAt(p.id,'Tienda Chacao'),almacen=stockAt(p.id,'Almacén'),otros=totalStock(p.id)-tienda-almacen,total=totalStock(p.id),group=stockProductGroup(p);return `<tr><td><b>${esc(p.name)}</b><small>${esc(p.compatibility||p.subcategory||p.category)}</small></td><td><span class="stock-group-pill">${esc(group)}</span><small>${esc(p.subcategory||'')}</small></td><td><code>${esc(p.product_barcode)}</code><small>${esc(p.sku)}</small></td><td>${tienda}</td><td>${almacen}</td><td>${otros}</td><td><b>${total}</b>${total<=Number(p.min_stock||0)?'<small>⚠ Stock bajo</small>':''}</td><td>${Number(p.min_stock||0)}</td><td><button class="row-btn" data-stock-product="${p.id}">Gestionar</button></td></tr>`}).join('')||'<tr><td colspan="9"><div class="empty">No hay productos en esta categoría.</div></td></tr>'}</tbody></table></div>`
 $('#newStock').onclick=()=>openStockMovement()
 document.querySelectorAll('[data-stock-product]').forEach(b=>b.onclick=()=>openStockMovement(b.dataset.stockProduct))
 document.querySelectorAll('[data-stock-group]').forEach(b=>b.onclick=()=>{state.stockProductCategory=b.dataset.stockGroup;renderPage()})
}

function renderFurniture(c){
 const q=state.query.trim().toLowerCase();const rows=state.furniture.filter(x=>!q||[x.name,x.asset_code,x.category,x.location,x.condition,x.material,x.notes,x.supplier].some(v=>String(v||'').toLowerCase().includes(q)))
 const count=furnitureCount(),value=furnitureValue(),repair=state.furniture.filter(x=>x.condition==='Reparación').reduce((a,x)=>a+Number(x.quantity||1),0)
 c.innerHTML=head('Mobiliario de oficina','Control independiente de muebles, exhibidores y activos físicos de ThinkStore.',`<button class="btn primary" id="newFurniture">＋ Añadir mueble</button>`)+
 `<div class="stats-grid furniture-stats"><div class="stat-card"><div class="stat-icon">▦</div><div><span>Activos registrados</span><strong>${count}</strong><small>Unidades activas</small></div></div><div class="stat-card"><div class="stat-icon">$</div><div><span>Valor mobiliario</span><strong>${money(value)}</strong><small>Costo registrado</small></div></div><div class="stat-card"><div class="stat-icon">!</div><div><span>En reparación</span><strong>${repair}</strong><small>Requieren atención</small></div></div></div>`+
 `<div class="table-card"><table><thead><tr><th>Mueble / activo</th><th>Código</th><th>Categoría</th><th>Ubicación</th><th>Cantidad</th><th>Estado</th><th>Valor</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td><div class="product-line">${x.image_data?`<div class="product-thumb"><img src="${x.image_data}" alt="${esc(x.name)}"></div>`:`<div class="product-thumb placeholder brand-placeholder"><img src="${BRAND_LOGO}" alt="ThinkStore"></div>`}<div><b>${esc(x.name)}</b><small>${esc(x.dimensions||x.material||'Activo de oficina')}</small></div></div></td><td><code>${esc(x.asset_code)}</code><small>${x.purchase_date?esc(x.purchase_date):'Sin fecha'}</small></td><td>${esc(x.category||'Otros')}<small>${esc(x.supplier||'')}</small></td><td>${esc(x.location||'—')}</td><td><b>${Number(x.quantity||1)}</b></td><td><span class="pill">${esc(x.condition||'Bueno')}</span></td><td>${money(Number(x.purchase_price||0)*Number(x.quantity||1))}</td><td><div class="row-actions"><button class="row-btn" data-edit-furniture="${x.id}">Editar</button><button class="row-btn" data-label-furniture="${x.id}">Etiqueta</button></div></td></tr>`).join('')||'<tr><td colspan="8"><div class="empty">Todavía no hay mobiliario registrado. Usa “Añadir mueble” para comenzar.</div></td></tr>'}</tbody></table></div>`
 $('#newFurniture').onclick=()=>openFurnitureForm();document.querySelectorAll('[data-edit-furniture]').forEach(b=>b.onclick=()=>openFurnitureForm(b.dataset.editFurniture));document.querySelectorAll('[data-label-furniture]').forEach(b=>b.onclick=()=>printFurnitureLabel(state.furniture.find(x=>x.id===b.dataset.labelFurniture)))
}
function openFurnitureForm(id=''){
 const editing=state.furniture.find(x=>x.id===id),code=editing?.asset_code||nextFurnitureBarcode(),val=(v='')=>esc(v),supplierOptions=state.suppliers.map(s=>`<option value="${esc(s.name)}" ${editing?.supplier===s.name?'selected':''}>${esc(s.name)}</option>`).join('')
 modal(editing?'Editar mobiliario':'Nuevo mobiliario',`<form id="furnitureForm" class="form-grid"><label class="span2">Nombre / descripción<input name="name" required value="${val(editing?.name)}" placeholder="Ej. Mesa de exhibición central"></label><label>Categoría<select name="category">${furnitureCategories.map(x=>`<option ${editing?.category===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>Cantidad<input name="quantity" type="number" min="1" step="1" value="${Number(editing?.quantity||1)}" required></label><label>Ubicación<select name="location">${state.locations.map(l=>`<option ${editing?.location===l.name?'selected':''}>${esc(l.name)}</option>`).join('')}</select></label><label>Estado<select name="condition">${furnitureConditions.map(x=>`<option ${editing?.condition===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>Dimensiones<input name="dimensions" value="${val(editing?.dimensions)}" placeholder="Ej. 120 × 60 × 90 cm"></label><label>Material<input name="material" value="${val(editing?.material)}" placeholder="MDF, vidrio, aluminio…"></label><label>Precio compra unitario<input name="purchase_price" type="number" min="0" step="0.01" value="${Number(editing?.purchase_price||0)}"></label><label>Fecha de compra<input name="purchase_date" type="date" value="${val(editing?.purchase_date)}"></label><label>Proveedor<select name="supplier"><option value="">Sin proveedor</option>${supplierOptions}<option value="Otro" ${editing?.supplier==='Otro'?'selected':''}>Otro</option></select></label><label>Referencia / factura<input name="reference" value="${val(editing?.reference)}" placeholder="Factura, orden o referencia"></label><label class="span2">Notas<textarea name="notes" rows="3" placeholder="Observaciones, daños, ubicación exacta…">${val(editing?.notes)}</textarea></label><label class="span2">Fotografía<input id="furnitureImageInput" type="file" accept="image/*"><small class="field-help">La foto se adapta y se procesa localmente. Puedes reemplazarla cuando quieras.</small></label><div class="span2 image-upload-panel"><div class="image-preview-box" id="furnitureImagePreview">${editing?.image_data?`<img src="${editing.image_data}" alt="${esc(editing.name)}">`:'<div class="image-preview-placeholder">Sin imagen</div>'}</div><div class="image-upload-info"><b>Vista previa</b><small id="furnitureImageMeta">${editing?.image_data?'Imagen actual cargada.':'Opcional: agrega una foto del mueble o activo.'}</small>${editing?.image_data?'<button type="button" class="row-btn" id="removeFurnitureImage">Quitar imagen</button>':''}</div></div><div class="barcode-preview span2"><span>Código de mobiliario</span><strong>${code}</strong>${code128svg(code,48)}</div><div class="form-actions span2">${editing?'<button type="button" class="btn danger" id="deleteFurniture">Eliminar</button>':''}<button type="button" class="btn ghost cancel">Cancelar</button><button class="btn primary" id="saveFurniture">${editing?'Guardar cambios':'Registrar mueble'}</button></div></form>`)
 let imageData=editing?.image_data||'';const input=$('#furnitureImageInput'),preview=$('#furnitureImagePreview'),meta=$('#furnitureImageMeta'),saveBtn=$('#saveFurniture')
 input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{saveBtn.disabled=true;meta.textContent='Procesando imagen…';imageData=await prepareProductImage(file);preview.innerHTML=`<img src="${imageData}" alt="Vista previa">`;meta.textContent='Imagen lista y adaptada.'}catch(err){notice(err.message||'No pude procesar la imagen')}finally{saveBtn.disabled=false}}
 if($('#removeFurnitureImage'))$('#removeFurnitureImage').onclick=()=>{imageData='';preview.innerHTML='<div class="image-preview-placeholder">Sin imagen</div>';meta.textContent='La imagen se quitará al guardar.'}
 $('.cancel').onclick=closeModal
 if($('#deleteFurniture'))$('#deleteFurniture').onclick=()=>{if(!confirm(`¿Eliminar ${editing.name} del inventario de mobiliario?`))return;state.furniture=state.furniture.filter(x=>x.id!==editing.id);state.movements.unshift({id:uid(),furniture_id:editing.id,asset_code:editing.asset_code,type:'Mobiliario eliminado',reason:editing.name,location:editing.location,...actorFields(),created_at:new Date().toISOString()});save();closeModal();renderPage();notice('Mobiliario eliminado')}
 $('#furnitureForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.quantity=Math.max(1,Math.floor(Number(f.quantity||1)));f.purchase_price=Number(f.purchase_price||0);f.image_data=imageData;f.image_upload_pending=!!(imageData&&String(imageData).startsWith('data:'));f.asset_code=code;if(editing){Object.assign(editing,f,{updated_at:new Date().toISOString()});state.movements.unshift({id:uid(),furniture_id:editing.id,asset_code:code,type:'Mobiliario actualizado',reason:editing.name,location:editing.location,...actorFields(),created_at:new Date().toISOString()})}else{f.id=uid();f.created_at=new Date().toISOString();state.furniture.unshift(f);state.movements.unshift({id:uid(),furniture_id:f.id,asset_code:code,type:'Mobiliario registrado',reason:f.name,location:f.location,...actorFields(),created_at:new Date().toISOString()})}save();closeModal();renderPage();notice(editing?'Mobiliario actualizado':'Mobiliario registrado')}
}
function printFurnitureLabel(item){if(!item)return;const win=window.open('','_blank','width=600,height=560');win.document.write(`<!doctype html><html><head><title>${esc(item.asset_code)}</title><style>body{font-family:Arial;margin:0;padding:12px}.label{width:60mm;border:1px solid #aaa;padding:4mm}.top{display:flex;justify-content:space-between;gap:10px}.ts{font-weight:900;font-size:18px}.name{font-size:11px;text-align:right;max-width:38mm}.meta{font-size:10px;color:#555;margin:4px 0 8px}.row{font-size:9px;display:flex;justify-content:space-between;margin-top:3px}svg{width:100%;height:auto}.thumb{height:30mm;display:flex;justify-content:center;align-items:center;margin-bottom:6px}.thumb img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body><div class="label"><div class="top"><div class="ts">ThinkStore</div><div class="name">${esc(item.name)}</div></div>${item.image_data?`<div class="thumb"><img src="${item.image_data}"></div>`:''}<div class="meta">${esc(item.category||'Mobiliario')} · ${esc(item.location||'')}</div>${code128svg(item.asset_code,52)}<div class="row"><b>${esc(item.asset_code)}</b><span>${esc(item.condition||'')}</span></div></div><script>window.onload=()=>window.print()<\/script></body></html>`);win.document.close()}

function modal(title,body){document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><small>ThinkStore Inventory</small><h2>${title}</h2></div><button class="icon-btn modal-x">×</button></div>${body}</div></div>`);$('.modal-x').onclick=closeModal;$('.modal-backdrop').onclick=e=>{if(e.target.classList.contains('modal-backdrop'))closeModal()}}
function closeModal(){stopInlineScanners();$('.modal-backdrop')?.remove()}


function openSiliconeCaseBuilder(){
 const modelRows=iphoneCompat.slice().reverse()
 const colorRows=siliconeCasePalette
 const locationOptions=state.locations.filter(l=>l.type!=='Servicio')
 modal('Silicone Case · Crear variantes',`
 <form id="siliconeCaseForm" class="shopify-variant-builder">
  <div class="shopify-builder-hero">
   <div><span>PRODUCTO PADRE</span><h3>Silicone Case</h3><p>Crea de una vez todas las combinaciones de modelo × color. Cada combinación tendrá SKU, código TSP y stock independiente.</p></div>
   <div class="shopify-builder-badge">Variantes masivas</div>
  </div>
  <div class="shopify-builder-settings">
   <label>Nombre del producto<input name="product_group" value="Silicone Case" required></label>
   <label>Marca<input name="brand" value="ThinkStore"></label>
   <label>Precio compra USD<input name="purchase_price" type="number" min="0" step="0.01" value="0"></label>
   <label>Precio venta USD<input name="sale_price" type="number" min="0" step="0.01" value="0"></label>
   <label>Stock mínimo por variante<input name="min_stock" type="number" min="0" step="1" value="3"></label>
   <label>Stock inicial por variante<input name="initial_stock" type="number" min="0" step="1" value="0"></label>
   <label class="span2">Ubicación del stock inicial<select name="location">${locationOptions.map(l=>`<option>${esc(l.name)}</option>`).join('')}</select></label>
  </div>
  <div class="shopify-builder-columns">
   <section>
    <div class="shopify-builder-section-head"><div><b>1. Modelos</b><small id="siliconeModelCount">0 seleccionados</small></div><button type="button" id="selectRecentModels">Últimos modelos</button></div>
    <div class="shopify-builder-checklist model-list">${modelRows.map(m=>`<label><input type="checkbox" name="case_model" value="${esc(m)}"><span><b>${esc(cleanVariantModel(m))}</b><small>${esc(m.includes(' · ')?m.split(' · ').slice(1).join(' · '):'')}</small></span></label>`).join('')}</div>
   </section>
   <section>
    <div class="shopify-builder-section-head"><div><b>2. Colores</b><small id="siliconeColorCount">0 seleccionados</small></div><button type="button" id="selectAllColors">Todos</button></div>
    <div class="shopify-builder-colors">${colorRows.map(c=>`<label><input type="checkbox" name="case_color" value="${esc(c.name)}">${productColorSwatch(c.name,false)}<span>${esc(c.name)}</span></label>`).join('')}</div>
    <label class="shopify-custom-colors">Otros colores<input name="custom_colors" placeholder="Ej. Borgoña, Glaciar, Lavanda"><small>Separados por coma. Se crearán como variantes adicionales.</small></label>
   </section>
  </div>
  <div class="shopify-builder-preview">
   <div><span>Variantes a crear</span><b id="siliconeVariantCount">0</b></div>
   <p id="siliconeDuplicateInfo">Selecciona al menos un modelo y un color.</p>
  </div>
  <div class="form-actions">
   <button type="button" class="btn ghost cancel">Cancelar</button>
   <button class="btn primary" id="createSiliconeVariants">Crear variantes</button>
  </div>
 </form>`)
 const form=$('#siliconeCaseForm'),modelInputs=[...form.querySelectorAll('[name="case_model"]')],colorInputs=[...form.querySelectorAll('[name="case_color"]')]
 const custom=form.elements.custom_colors
 const selectedCustom=()=>String(custom.value||'').split(',').map(x=>x.trim()).filter(Boolean)
 const update=()=>{
   const models=modelInputs.filter(x=>x.checked).map(x=>x.value)
   const colors=[...colorInputs.filter(x=>x.checked).map(x=>x.value),...selectedCustom()]
   const uniqueColors=[...new Set(colors.map(x=>x.toLowerCase()))]
   $('#siliconeModelCount').textContent=`${models.length} seleccionado${models.length===1?'':'s'}`
   $('#siliconeColorCount').textContent=`${uniqueColors.length} seleccionado${uniqueColors.length===1?'':'s'}`
   $('#siliconeVariantCount').textContent=String(models.length*uniqueColors.length)
   const existing=models.reduce((n,m)=>n+colors.filter(c=>state.products.some(p=>p.category==='Accesorios'&&p.subcategory==='Cases para iPhone'&&shopifyGroupTitle(p).toLowerCase()==='silicone case'&&productVariantModel(p).toLowerCase()===cleanVariantModel(m).toLowerCase()&&productVariantColor(p).toLowerCase()===c.toLowerCase())).length,0)
   $('#siliconeDuplicateInfo').textContent=models.length&&uniqueColors.length?(existing?`${existing} combinación(es) ya existen y se omitirán.`:'Todas las combinaciones son nuevas.'):'Selecciona al menos un modelo y un color.'
 }
 modelInputs.forEach(x=>x.onchange=update);colorInputs.forEach(x=>x.onchange=update);custom.oninput=update
 $('#selectRecentModels').onclick=()=>{modelInputs.forEach(x=>x.checked=/iPhone (1[5-9]|Air)/i.test(x.value));update()}
 $('#selectAllColors').onclick=()=>{const all=colorInputs.every(x=>x.checked);colorInputs.forEach(x=>x.checked=!all);update()}
 $('.cancel').onclick=closeModal
 form.onsubmit=e=>{
   e.preventDefault()
   const models=modelInputs.filter(x=>x.checked).map(x=>x.value)
   const colors=[...colorInputs.filter(x=>x.checked).map(x=>x.value),...selectedCustom()]
   const finalColors=[...new Map(colors.filter(Boolean).map(x=>[x.toLowerCase(),x])).values()]
   if(!models.length||!finalColors.length){notice('Selecciona al menos un modelo y un color');return}
   const f=Object.fromEntries(new FormData(form)),group=String(f.product_group||'Silicone Case').trim()||'Silicone Case'
   const baseNum=Math.max(0,...state.products.map(p=>Number(String(p.product_barcode||'').replace(/\D/g,''))||0))
   let offset=0,created=0,skipped=0
   const now=new Date().toISOString()
   models.forEach(model=>{
     finalColors.forEach(color=>{
       const modelName=cleanVariantModel(model)
       const exists=state.products.some(p=>p.category==='Accesorios'&&p.subcategory==='Cases para iPhone'&&shopifyGroupTitle(p).toLowerCase()===group.toLowerCase()&&productVariantModel(p).toLowerCase()===modelName.toLowerCase()&&productVariantColor(p).toLowerCase()===color.toLowerCase())
       if(exists){skipped++;return}
       offset++
       const id=uid()
       const product={
         id,name:group,product_group:group,category:'Accesorios',subcategory:'Cases para iPhone',
         compatibility:model,variant_model:modelName,variant_color:color,brand:String(f.brand||'ThinkStore').trim()||'ThinkStore',
         model:modelName,condition:'Nuevo',capacity:'',color,
         sku:siliconeVariantSku(modelName,color),product_barcode:nextProductBarcodeFromNumber(baseNum+offset),
         source_barcode:'',tracking_mode:'quantity',min_stock:Math.max(0,Math.floor(Number(f.min_stock||0))),
         purchase_price:Math.max(0,Number(f.purchase_price||0)),sale_price:Math.max(0,Number(f.sale_price||0)),
         published:true,sort_order:1000,created_at:now,updated_at:now
       }
       state.products.push(product)
       const initial=Math.max(0,Math.floor(Number(f.initial_stock||0)))
       if(initial>0)state.stock.push({id:uid(),product_id:id,location:f.location||'Tienda Chacao',quantity:initial})
       created++
     })
   })
   if(created){
     state.movements.unshift({id:uid(),type:'Variantes creadas',reason:`${group}: ${created} variante(s) por modelo y color${skipped?` · ${skipped} omitidas`:''}`,...actorFields(),created_at:now})
     state.productCategory='Accesorios';state.productSubcategory='Cases para iPhone';state.productModelFilter='Todos';state.productColorFilter='Todos'
     save();closeModal();renderPage();notice(`${created} variante${created===1?'':'s'} de ${group} creada${created===1?'':'s'}${skipped?` · ${skipped} ya existían`:''}`)
   }else notice('No se creó ninguna variante: todas las combinaciones ya existen.')
 }
 update()
}

function openProductForm(){
 const pcode=nextProductBarcode()
 modal('Nuevo producto',`<form id="productForm" class="form-grid"><label class="span2">Nombre<input name="name" required placeholder="Ej. Case transparente / iPhone 18 Pro Max"></label><label>Categoría<select name="category" id="productCategory">${categories.map(x=>`<option>${x}</option>`).join('')}</select></label><label>Marca<input name="brand" value="Apple"></label><label>Control de stock<select name="tracking_mode" id="trackingMode"><option value="serialized">Por unidad / serial</option><option value="quantity">Por cantidad</option></select><small class="field-help">Accesorios y repuestos se asignan automáticamente por cantidad.</small></label><label>Stock mínimo<input name="min_stock" type="number" min="0" value="1"></label><label class="span2">Código de barra original / comercial<div class="inline-scan-field"><input name="source_barcode" id="sourceBarcodeInput" placeholder="EAN / UPC / Code 128 del fabricante"><button type="button" class="btn ghost scan-inline-trigger" id="sourceBarcodeScanBtn">Escanear</button></div><small class="field-help">Guarda el código que trae el producto para encontrarlo luego escaneándolo directamente.</small></label><div class="span2 mini-scan-panel" id="sourceBarcodeScanPanel" style="display:none"><video id="sourceBarcodeVideo" playsinline></video><div class="mini-scan-actions"><button type="button" class="btn ghost" id="sourceBarcodeStopBtn" style="display:none">Detener cámara</button></div><small id="sourceBarcodeMsg">Escanea el código de barra del fabricante.</small></div><label class="span2 accessory-only" style="display:none">Producto padre / colección<input name="product_group" placeholder="Ej. Silicone Case / Vidrio Premium / Cargador USB-C"><small class="field-help">Agrupa variantes por modelo, color o especificación, como en Shopify.</small></label><label class="span2 accessory-only" style="display:none">Subcategoría de accesorio<select name="subcategory" id="accessorySubcategory"><option value="">Selecciona…</option>${accessorySubcategories.map(x=>`<option>${x}</option>`).join('')}</select></label><label class="span2 accessory-only" style="display:none">Modelo / tamaño compatible<select name="compatibility" id="accessoryCompatibility"><option value="">Selecciona una subcategoría…</option></select><small class="field-help">Incluye modelo y pulgadas para evitar confusiones entre cases y vidrios.</small></label><label>Modelo<input name="model" placeholder="Axxxx / referencia"></label><label>Condición<select name="condition"><option>Nuevo</option><option>Renovado</option><option>Usado</option></select></label><label>Capacidad / especificación<input name="capacity" placeholder="256 GB / 240 W / 2 m"></label><label>Color<input name="color" placeholder="Negro / Transparente"></label><label>Precio compra<input name="purchase_price" type="number" step="0.01"></label><label>Proveedor habitual<select name="supplier_id"><option value="">Sin proveedor</option>${state.suppliers.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><label>Precio venta<input name="sale_price" type="number" step="0.01"></label><label class="span2">Imagen del producto<input id="productImageInput" name="image_file" type="file" accept="image/*"><small class="field-help">La imagen se adapta automáticamente, mantiene proporción y se procesa localmente para integrarla con fondo transparente cuando sea posible.</small></label><div class="span2 image-upload-panel"><div class="image-preview-box" id="imagePreviewBox"><div class="image-preview-placeholder">Sin imagen</div></div><div class="image-upload-info"><b>Vista previa</b><small id="imagePreviewMeta">Sube una foto PNG, JPG o WEBP del producto. El sistema la centra, la ajusta y elimina automáticamente fondos planos o claros.</small></div></div><div class="barcode-preview span2"><span>Código del producto / variante</span><strong>${pcode}</strong>${code128svg(pcode,48)}</div><div class="form-actions span2"><button type="button" class="btn ghost cancel">Cancelar</button><button class="btn primary" id="createProductBtn">Crear producto</button></div></form>`)
 const cat=$('#productCategory'),sub=$('#accessorySubcategory'),comp=$('#accessoryCompatibility'),mode=$('#trackingMode'),min=$('[name="min_stock"]'),imageInput=$('#productImageInput'),imageBox=$('#imagePreviewBox'),imageMeta=$('#imagePreviewMeta'),submitBtn=$('#createProductBtn'),sourceInput=$('#sourceBarcodeInput')
 let preparedImageData=''
 attachInlineBarcodeScanner({inputEl:sourceInput,startBtn:$('#sourceBarcodeScanBtn'),stopBtn:$('#sourceBarcodeStopBtn'),videoEl:$('#sourceBarcodeVideo'),msgEl:$('#sourceBarcodeMsg'),panelEl:$('#sourceBarcodeScanPanel')})
 const syncCategory=()=>{const isAcc=cat.value==='Accesorios';document.querySelectorAll('.accessory-only').forEach(x=>x.style.display=isAcc?'flex':'none');if(!isAcc){sub.value='';comp.innerHTML='<option value="">No aplica</option>'}if(bulkCategories.has(cat.value)){mode.value='quantity';min.value=min.value==='1'?'5':min.value}else{mode.value='serialized';if(min.value==='5')min.value='1'}}
 const syncCompat=()=>{const opts=accessoryCompatOptions(sub.value);comp.innerHTML='<option value="">Selecciona…</option>'+opts.map(x=>`<option>${esc(x)}</option>`).join('')+'<option value="Otro / medida manual">Otro / medida manual</option>'}
 const setPreview=(src,msg='Imagen preparada con fondo integrado.')=>{imageBox.innerHTML=src?`<img src="${src}" alt="Vista previa del producto">`:'<div class="image-preview-placeholder">Sin imagen</div>';imageMeta.textContent=msg}
 imageInput.onchange=async()=>{const file=imageInput.files?.[0];if(!file){preparedImageData='';setPreview('', 'Sube una foto PNG, JPG o WEBP del producto. El sistema la centra, la ajusta y elimina automáticamente fondos planos o claros.');return}try{submitBtn.disabled=true;imageMeta.textContent='Procesando imagen…';preparedImageData=await prepareProductImage(file);setPreview(preparedImageData,`Imagen lista: ${file.name}. Se adaptó al cuadro y se aplicó fondo transparente automático.`)}catch(err){preparedImageData='';setPreview('',err.message||'No pude procesar la imagen.')}finally{submitBtn.disabled=false}}
 cat.onchange=syncCategory;sub.onchange=syncCompat;syncCategory()
 $('.cancel').onclick=closeModal;$('#productForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));delete f.image_file;f.source_barcode=normalizeBarcode(f.source_barcode);if(productHasSourceBarcode(f.source_barcode)){notice('Ese código de barra original ya está asignado a otro producto');return}f.id=uid();f.product_barcode=pcode;if(f.category!=='Accesorios'){f.subcategory='';f.compatibility=''}f.image_data=preparedImageData||'';f.image_upload_pending=!!preparedImageData;f.sku=makeSku(f);f.purchase_price=Number(f.purchase_price||0);f.sale_price=Number(f.sale_price||0);f.min_stock=Number(f.min_stock||0);f.created_at=new Date().toISOString();state.products.unshift(f);state.movements.unshift({id:uid(),product_id:f.id,product_barcode:f.product_barcode,type:'Producto creado',reason:`Control ${f.tracking_mode==='quantity'?'por cantidad':'por unidad'}${f.source_barcode?` · código original ${f.source_barcode}`:''}${f.image_data?' · con imagen procesada':''}`,...actorFields(),created_at:new Date().toISOString()});save();closeModal();renderPage();notice('Producto creado con imagen adaptable y código de barras')}
}


let productEditorDeepLinkHandled=false
function normalizeProductCondition(v){
 const s=String(v||'').trim().toLowerCase()
 if(['pre-owned','preowned','pre owned','usado','renovado'].includes(s))return 'Pre-Owned'
 return String(v||'Nuevo')
}
function isPreOwnedInventoryProduct(p){return normalizeProductCondition(p?.condition)==='Pre-Owned'}
function preOwnedNote(grade,battery){
 const g=String(grade||'').trim(),b=Number(battery||0)
 const pieces=[]
 if(g)pieces.push(`Estado estético: ${g}`)
 if(b>0)pieces.push(`Salud de batería: ${Math.round(b)}%`)
 return pieces.join(' · ')
}
function sameCatalogFamily(a,b){
 const ag=String(a?.product_group||'').trim().toLowerCase(),bg=String(b?.product_group||'').trim().toLowerCase()
 if(ag||bg)return ag===bg &&
   String(a?.category||'').trim().toLowerCase()===String(b?.category||'').trim().toLowerCase() &&
   String(a?.subcategory||'').trim().toLowerCase()===String(b?.subcategory||'').trim().toLowerCase()
 return String(a?.name||'').trim().toLowerCase()===String(b?.name||'').trim().toLowerCase() &&
        String(a?.category||'').trim().toLowerCase()===String(b?.category||'').trim().toLowerCase()
}
function relatedProductVariants(p){
 return state.products.filter(x=>sameCatalogFamily(x,p)).sort((a,b)=>String(a.capacity||'').localeCompare(String(b.capacity||''),'es',{numeric:true,sensitivity:'base'})||String(a.color||'').localeCompare(String(b.color||''),'es',{numeric:true,sensitivity:'base'})||String(a.condition||'').localeCompare(String(b.condition||''),'es',{numeric:true,sensitivity:'base'}))
}
function maybeOpenProductEditorDeepLink(){
 if(productEditorDeepLinkHandled||!cloud.session||!state.products.length)return
 const params=new URLSearchParams(location.search),directId=params.get('edit')||'',syncVariant=params.get('variant')||'',productName=params.get('product')||''
 if(!directId&&!syncVariant&&!productName)return
 productEditorDeepLinkHandled=true
 let p=directId?state.products.find(x=>String(x.id)===String(directId)):null
 if(!p&&syncVariant)p=state.products.find(x=>String(x.sync_variant_id||'')===String(syncVariant))
 if(!p&&productName)p=state.products.find(x=>String(x.name||'').trim().toLowerCase()===String(productName).trim().toLowerCase())
 state.page='products';renderPage()
 if(p)setTimeout(()=>openAdvancedProductEditor(p.id),60)
 else setTimeout(()=>notice('No encontré esta variante en Inventory. Revisa que esté sincronizada por SKU con ThinkStore.'),80)
 try{history.replaceState({},'',location.pathname)}catch{}
}
function openAdvancedProductEditor(productId){
 const p=state.products.find(x=>x.id===productId);if(!p)return
 const siblings=relatedProductVariants(p),hasUnits=state.units.some(u=>u.product_id===p.id),hasStock=state.stock.some(r=>r.product_id===p.id&&Number(r.quantity||0)>0),locked=hasUnits||hasStock
 const published=p.published!==false,description=p.catalog_description||p.description||'',sortOrder=Number(p.sort_order??1000),grade=p.cosmetic_grade||'',battery=p.battery_health_pct??'',preNote=p.cosmetic_note||preOwnedNote(grade,battery)
 const categorySelect=categories.map(x=>`<option ${p.category===x?'selected':''}>${x}</option>`).join('')
 const subcategoryField=p.category==='Accesorios'?`<select name="subcategory">${['',...accessorySubcategories].map(x=>`<option value="${esc(x)}" ${p.subcategory===x?'selected':''}>${esc(x||'Selecciona…')}</option>`).join('')}${p.subcategory&&!accessorySubcategories.includes(p.subcategory)?`<option value="${esc(p.subcategory)}" selected>${esc(p.subcategory)}</option>`:''}</select>`:`<input name="subcategory" value="${esc(p.subcategory||'')}">`
 const conditionOptions=['Nuevo','Pre-Owned','Renovado','Usado'].map(x=>`<option value="${x}" ${normalizeProductCondition(p.condition)===x?'selected':''}>${x}</option>`).join('')
 const siblingCards=siblings.map(v=>`<button type="button" class="adv-variant-card ${v.id===p.id?'active':''}" data-open-adv-variant="${v.id}"><b>${esc([v.capacity,v.color,normalizeProductCondition(v.condition)].filter(Boolean).join(' · ')||v.sku)}</b><small>${esc(v.sku)} · ${productAvailable(v)} disponible${v.sync_variant_id?' · Sync':''}</small></button>`).join('')
 const imageHtml=p.image_data?`<img src="${p.image_data}" alt="${esc(p.name)}">`:'<div class="image-preview-placeholder">Sin imagen</div>'
 modal('Editor avanzado · '+p.name,`
 <div class="advanced-editor">
  <div class="adv-editor-top">
   <div><span>ThinkStore Inventory</span><h3>Ficha completa del producto</h3><p>Editor central conectado al Inventory online. Todo lo que guardes aquí entra al mismo estado sincronizado de Supabase.</p></div>
   <span class="adv-sync-badge">${p.sync_variant_id?'✓ ThinkStore Sync':'Inventory'}</span>
  </div>
  <div class="adv-editor-tabs">
   <button type="button" class="adv-tab active" data-adv-tab="ficha">Ficha</button>
   <button type="button" class="adv-tab" data-adv-tab="variante">Variante</button>
   <button type="button" class="adv-tab" data-adv-tab="preowned">Pre-Owned</button>
   <button type="button" class="adv-tab" data-adv-tab="imagenes">Imágenes</button>
   <button type="button" class="adv-tab" data-adv-tab="preview">Vista previa</button>
  </div>
  <form id="advancedProductForm">
   <section class="adv-pane active" data-adv-pane="ficha">
    <div class="adv-section-title"><div><b>Ficha de catálogo</b><small>Nombre, categoría, publicación y descripción comercial.</small></div></div>
    <div class="form-grid">
     <label class="span2">Nombre del producto<input name="name" required value="${esc(p.name)}"></label>
     <label>Categoría<select name="category" id="advCategory" ${locked?'disabled':''}>${categorySelect}</select><small class="field-help">${locked?'Bloqueada mientras exista inventario activo.':''}</small></label>
     <label>Marca<input name="brand" value="${esc(p.brand||'Apple')}"></label>
     <label class="span2">Producto padre / colección<input name="product_group" value="${esc(p.product_group||'')}" placeholder="Ej. Silicone Case"><small class="field-help">Las variantes con el mismo producto padre se muestran agrupadas.</small></label>
     <label class="span2">Subcategoría<div id="advSubcategoryWrap">${subcategoryField}</div></label>
     <label class="span2">Compatibilidad<input name="compatibility" value="${esc(p.compatibility||'')}"></label>
     <label class="span2">Descripción comercial<textarea name="catalog_description" rows="5" placeholder="Descripción que acompañará la ficha del producto.">${esc(description)}</textarea></label>
     <label>Orden de publicación<input name="sort_order" type="number" min="0" step="1" value="${sortOrder}"></label>
     <label class="toggle-line"><input name="published" type="checkbox" ${published?'checked':''}> Publicado en catálogo</label>
    </div>
   </section>
   <section class="adv-pane" data-adv-pane="variante">
    <div class="adv-section-title"><div><b>Variante e inventario</b><small>Capacidad, color, condición, precio y control físico.</small></div><span>${siblings.length} variante${siblings.length===1?'':'s'}</span></div>
    <div class="adv-variant-strip">${siblingCards||'<div class="empty">Sin variantes relacionadas.</div>'}</div>
    <div class="form-grid">
     <label>Modelo<input name="model" value="${esc(p.model||'')}"></label>
     <label>Capacidad / especificación<input name="capacity" value="${esc(p.capacity||'')}"></label>
     <label>Color<input name="color" value="${esc(p.color||'')}"></label>
     <label>Condición<select name="condition" id="advCondition">${conditionOptions}</select></label>
     <label>Control de stock<select name="tracking_mode" ${locked?'disabled':''}><option value="serialized" ${p.tracking_mode==='serialized'?'selected':''}>Por unidad / serial</option><option value="quantity" ${p.tracking_mode==='quantity'?'selected':''}>Por cantidad</option></select><small class="field-help">${locked?'No cambia con inventario activo.':''}</small></label>
     <label>Stock mínimo<input name="min_stock" type="number" min="0" value="${Number(p.min_stock||0)}"></label>
     <label>Precio compra USD<input name="purchase_price" type="number" min="0" step="0.01" value="${Number(p.purchase_price||0)}"></label>
     <label>Precio venta USD<input name="sale_price" type="number" min="0" step="0.01" value="${Number(p.sale_price||0)}"></label>
     <label class="span2">Código original / comercial<div class="inline-scan-field"><input name="source_barcode" id="advSourceBarcode" value="${esc(p.source_barcode||'')}" placeholder="EAN / UPC / Code 128"><button type="button" class="btn ghost" id="advScanBarcode">Escanear</button></div></label>
     <div class="barcode-preview span2"><span>Código ThinkStore</span><strong>${esc(p.product_barcode)}</strong>${code128svg(p.product_barcode,48)}</div>
    </div>
   </section>
   <section class="adv-pane" data-adv-pane="preowned">
    <div class="adv-section-title"><div><b>Condición Pre-Owned</b><small>Estado estético, batería y detalle automático para equipos usados o renovados.</small></div></div>
    <div class="adv-preowned-note" id="advPreownedWarning"></div>
    <div class="form-grid">
     <label>Estado estético<select name="cosmetic_grade" id="advGrade"><option value="">Sin definir</option>${['Excelente','Bueno','Bien'].map(x=>`<option value="${x}" ${grade===x?'selected':''}>${x}</option>`).join('')}</select></label>
     <label>Salud de batería %<input name="battery_health_pct" id="advBattery" type="number" min="0" max="100" step="1" value="${esc(battery)}"></label>
     <label class="span2">Detalle automático<textarea name="cosmetic_note" id="advCosmeticNote" rows="3">${esc(preNote)}</textarea><small class="field-help">Puedes complementar el texto generado automáticamente.</small></label>
    </div>
   </section>
   <section class="adv-pane" data-adv-pane="imagenes">
    <div class="adv-section-title"><div><b>Imagen y color</b><small>Procesamiento limpio, fondo claro y sincronización a Cloudflare R2 mediante Inventory.</small></div></div>
    <div class="adv-image-grid">
     <div class="adv-image-preview" id="advImagePreview">${imageHtml}</div>
     <div class="adv-image-controls">
      <label>Nueva imagen<input id="advProductImage" type="file" accept="image/*"></label>
      <label class="toggle-line"><input id="advApplyColor" type="checkbox" checked> Aplicar también a variantes de <b>${esc(p.color||'este color')}</b></label>
      <small id="advImageMeta">La imagen se adapta al catálogo y se sube a R2 en segundo plano al guardar.</small>
      ${p.image_data?'<button type="button" class="row-btn" id="advRemoveImage">Quitar imagen</button>':''}
     </div>
    </div>
    <div class="adv-color-gallery">${siblings.map(v=>`<div class="adv-color-card">${productThumb(v,'70px')}<div><b>${esc(v.color||'Sin color')}</b><small>${esc(v.capacity||'')} · ${v.image_data?'imagen asignada':'sin imagen propia'}</small></div></div>`).join('')}</div>
   </section>
   <section class="adv-pane" data-adv-pane="preview">
    <div class="adv-section-title"><div><b>Vista previa de publicación</b><small>Referencia visual antes de guardar.</small></div></div>
    <div class="adv-store-preview">
     <div class="adv-store-image" id="advPreviewImage">${imageHtml}</div>
     <div class="adv-store-copy"><span id="advPreviewCategory">${esc(p.category||'ThinkStore')}</span><h2 id="advPreviewName">${esc(p.name)}</h2><b id="advPreviewPrice">${Number(p.sale_price||0)>0?money(p.sale_price):'Precio por definir'}</b><p id="advPreviewDesc">${esc(description||'')}</p><div class="adv-preview-pills" id="advPreviewPills"></div><div class="adv-preview-condition" id="advPreviewCondition"></div></div>
    </div>
   </section>
   <p class="adv-form-status" id="advFormStatus"></p>
   <div class="adv-editor-actions">
    <button type="button" class="btn ghost cancel">Cancelar</button>
    <button type="button" class="btn ghost" id="advQuickStock">${p.tracking_mode==='quantity'?'± Stock':'＋ Unidad'}</button>
    <button class="btn primary" id="advSave">Guardar ficha</button>
   </div>
  </form>
 </div>`)
 const form=$('#advancedProductForm'),saveBtn=$('#advSave'),imageInput=$('#advProductImage'),preview=$('#advImagePreview'),storePreview=$('#advPreviewImage'),imageMeta=$('#advImageMeta')
 let imageData=p.image_data||''
 const updatePreOwned=()=>{
  const isPre=normalizeProductCondition(form.elements.condition.value)==='Pre-Owned'
  $('#advPreownedWarning').innerHTML=isPre?'<div class="privacy-note">Esta variante se publicará como Pre-Owned. Completa estado estético y salud de batería.</div>':'<div class="backup-warning">La condición actual no es Pre-Owned. Estos datos se guardan, pero solo se muestran cuando la variante sea Pre-Owned.</div>'
  const auto=preOwnedNote(form.elements.cosmetic_grade.value,form.elements.battery_health_pct.value)
  if(auto&&!form.elements.cosmetic_note.dataset.manual)form.elements.cosmetic_note.value=auto
  updatePreview()
 }
 const updatePreview=()=>{
  $('#advPreviewName').textContent=form.elements.name.value||p.name
  $('#advPreviewCategory').textContent=form.elements.category?.value||p.category||'ThinkStore'
  $('#advPreviewPrice').textContent=Number(form.elements.sale_price.value||0)>0?money(Number(form.elements.sale_price.value)):'Precio por definir'
  $('#advPreviewDesc').textContent=form.elements.catalog_description.value||''
  $('#advPreviewPills').innerHTML=[form.elements.capacity.value,form.elements.color.value,form.elements.condition.value].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('')
  const txt=normalizeProductCondition(form.elements.condition.value)==='Pre-Owned'?(form.elements.cosmetic_note.value||preOwnedNote(form.elements.cosmetic_grade.value,form.elements.battery_health_pct.value)):''
  $('#advPreviewCondition').textContent=txt
  $('#advPreviewCondition').style.display=txt?'block':'none'
  storePreview.innerHTML=imageData?`<img src="${imageData}" alt="Vista previa">`:'<div class="image-preview-placeholder">Sin imagen</div>'
 }
 document.querySelectorAll('[data-adv-tab]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-adv-tab]').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('[data-adv-pane]').forEach(x=>x.classList.toggle('active',x.dataset.advPane===btn.dataset.advTab));updatePreview()})
 document.querySelectorAll('[data-open-adv-variant]').forEach(btn=>btn.onclick=()=>{closeModal();setTimeout(()=>openAdvancedProductEditor(btn.dataset.openAdvVariant),20)})
 attachInlineBarcodeScanner({inputEl:$('#advSourceBarcode'),startBtn:$('#advScanBarcode'),stopBtn:null,videoEl:null,msgEl:null,panelEl:null})
 imageInput.onchange=async()=>{const file=imageInput.files?.[0];if(!file)return;try{saveBtn.disabled=true;imageMeta.textContent='Procesando imagen…';imageData=await prepareProductImage(file);preview.innerHTML=`<img src="${imageData}" alt="Vista previa">`;imageMeta.textContent='Imagen lista. Se subirá a Cloudflare R2 al guardar.';updatePreview()}catch(err){notice(err.message||'No pude procesar la imagen')}finally{saveBtn.disabled=false}}
 if($('#advRemoveImage'))$('#advRemoveImage').onclick=()=>{imageData='';preview.innerHTML='<div class="image-preview-placeholder">Sin imagen</div>';imageMeta.textContent='La imagen se quitará al guardar.';updatePreview()}
 form.elements.cosmetic_note.oninput=()=>{form.elements.cosmetic_note.dataset.manual='1';updatePreview()}
 ;['name','catalog_description','capacity','color','condition','sale_price','cosmetic_grade','battery_health_pct'].forEach(n=>{const el=form.elements[n];if(el)el.addEventListener('input',n==='condition'||n==='cosmetic_grade'||n==='battery_health_pct'?updatePreOwned:updatePreview);if(el&&el.tagName==='SELECT')el.addEventListener('change',n==='condition'||n==='cosmetic_grade'?updatePreOwned:updatePreview)})
 $('.cancel').onclick=closeModal
 $('#advQuickStock').onclick=()=>{closeModal();setTimeout(()=>p.tracking_mode==='quantity'?openStockMovement(p.id):openUnitForm(p.id),20)}
 updatePreOwned();updatePreview()
 form.onsubmit=e=>{
  e.preventDefault()
  const f=Object.fromEntries(new FormData(form))
  f.source_barcode=normalizeBarcode(f.source_barcode)
  if(productHasSourceBarcode(f.source_barcode,p.id)){notice('Ese código de barra original ya está asignado a otro producto');return}
  if(locked){f.category=p.category;f.tracking_mode=p.tracking_mode}
  f.purchase_price=Number(f.purchase_price||0);f.sale_price=Number(f.sale_price||0);f.min_stock=Number(f.min_stock||0);f.sort_order=Math.max(0,Math.floor(Number(f.sort_order||1000)))
  f.published=!!form.elements.published.checked
  f.battery_health_pct=f.battery_health_pct===''?null:Math.max(0,Math.min(100,Math.round(Number(f.battery_health_pct))))
  f.cosmetic_grade=String(f.cosmetic_grade||'')
  f.cosmetic_note=String(f.cosmetic_note||preOwnedNote(f.cosmetic_grade,f.battery_health_pct)||'')
  f.image_data=imageData;f.image_upload_pending=!!(imageData&&String(imageData).startsWith('data:'))
  f.sku=makeSku(f)
  Object.assign(p,f,{updated_at:new Date().toISOString()})
  if($('#advApplyColor')?.checked&&p.color&&imageData){
   relatedProductVariants(p).filter(v=>v.id!==p.id&&String(v.color||'').trim().toLowerCase()===String(p.color||'').trim().toLowerCase()).forEach(v=>{v.image_data=imageData;v.image_upload_pending=!!String(imageData).startsWith('data:');v.updated_at=new Date().toISOString()})
  }
  state.movements.unshift({id:uid(),product_id:p.id,product_barcode:p.product_barcode,type:'Ficha avanzada actualizada',reason:`${p.name} · ${p.capacity||''} · ${p.color||''}${p.published===false?' · borrador':' · publicado'}`,...actorFields(),created_at:new Date().toISOString()})
  save();closeModal();renderPage();notice('Ficha guardada en ThinkStore Inventory')
 }
}
function openEditProductForm(productId){
 const p=state.products.find(x=>x.id===productId);if(!p)return
 const hasUnits=state.units.some(u=>u.product_id===p.id),hasStock=state.stock.some(r=>r.product_id===p.id&&Number(r.quantity||0)>0),locked=hasUnits||hasStock
 modal('Editar producto',`<form id="editProductForm" class="form-grid"><label class="span2">Nombre<input name="name" required value="${esc(p.name)}"></label><label>Categoría<select name="category" id="editProductCategory" ${locked?'disabled':''}>${categories.map(x=>`<option ${p.category===x?'selected':''}>${x}</option>`).join('')}</select><small class="field-help">${locked?'La categoría queda bloqueada mientras el producto tenga unidades o stock.':''}</small></label><label>Marca<input name="brand" value="${esc(p.brand||'')}"></label><label>Control de stock<select name="tracking_mode" ${locked?'disabled':''}><option value="serialized" ${p.tracking_mode==='serialized'?'selected':''}>Por unidad / serial</option><option value="quantity" ${p.tracking_mode==='quantity'?'selected':''}>Por cantidad</option></select><small class="field-help">${locked?'No se puede cambiar el tipo de control con inventario activo.':''}</small></label><label>Stock mínimo<input name="min_stock" type="number" min="0" value="${Number(p.min_stock||0)}"></label><label class="span2">Código de barra original / comercial<div class="inline-scan-field"><input name="source_barcode" id="editSourceBarcodeInput" value="${esc(p.source_barcode||'')}" placeholder="EAN / UPC / Code 128 del fabricante"><button type="button" class="btn ghost scan-inline-trigger" id="editSourceBarcodeScanBtn">Escanear</button></div><small class="field-help">Puedes modificar o volver a escanear el código original del producto.</small></label><div class="span2 mini-scan-panel" id="editSourceBarcodeScanPanel" style="display:none"><video id="editSourceBarcodeVideo" playsinline></video><div class="mini-scan-actions"><button type="button" class="btn ghost" id="editSourceBarcodeStopBtn" style="display:none">Detener cámara</button></div><small id="editSourceBarcodeMsg">Escanea el código de barra del fabricante.</small></div><label class="span2">Subcategoría${p.category==='Accesorios'?`<select name="subcategory">${['',...accessorySubcategories].map(x=>`<option value="${esc(x)}" ${p.subcategory===x?'selected':''}>${esc(x||'Selecciona…')}</option>`).join('')}${p.subcategory&&!accessorySubcategories.includes(p.subcategory)?`<option value="${esc(p.subcategory)}" selected>${esc(p.subcategory)}</option>`:''}</select>`:`<input name="subcategory" value="${esc(p.subcategory||'')}">`}</label><label class="span2">Compatibilidad<input name="compatibility" value="${esc(p.compatibility||'')}"></label><label>Modelo<input name="model" value="${esc(p.model||'')}"></label><label>Condición<select name="condition">${['Nuevo','Renovado','Usado'].map(x=>`<option ${p.condition===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Capacidad / especificación<input name="capacity" value="${esc(p.capacity||'')}"></label><label>Color<input name="color" value="${esc(p.color||'')}"></label><label>Precio compra<input name="purchase_price" type="number" step="0.01" value="${Number(p.purchase_price||0)}"></label><label>Proveedor habitual<select name="supplier_id"><option value="">Sin proveedor</option>${state.suppliers.map(x=>`<option value="${esc(x.id)}" ${String(p.supplier_id||'')===String(x.id)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label>Precio venta<input name="sale_price" type="number" step="0.01" value="${Number(p.sale_price||0)}"></label><label class="span2">Cambiar imagen<input id="editProductImage" type="file" accept="image/*"></label><div class="span2 image-upload-panel"><div class="image-preview-box" id="editProductPreview">${p.image_data?`<img src="${p.image_data}" alt="${esc(p.name)}">`:'<div class="image-preview-placeholder">Sin imagen</div>'}</div><div class="image-upload-info"><b>Imagen actual</b><small id="editProductImageMeta">Puedes reemplazar o quitar la imagen.</small>${p.image_data?'<button type="button" class="row-btn" id="removeProductImage">Quitar imagen</button>':''}</div></div><div class="barcode-preview span2"><span>Código permanente</span><strong>${esc(p.product_barcode)}</strong>${code128svg(p.product_barcode,48)}</div><div class="form-actions span2"><button type="button" class="btn danger" id="deleteProduct" ${locked?'disabled':''}>Eliminar</button><button type="button" class="btn ghost cancel">Cancelar</button><button class="btn primary" id="saveProductEdit">Guardar cambios</button></div></form>`)
 let imageData=p.image_data||'',imageInput=$('#editProductImage'),preview=$('#editProductPreview'),meta=$('#editProductImageMeta'),saveBtn=$('#saveProductEdit')
 attachInlineBarcodeScanner({inputEl:$('#editSourceBarcodeInput'),startBtn:$('#editSourceBarcodeScanBtn'),stopBtn:$('#editSourceBarcodeStopBtn'),videoEl:$('#editSourceBarcodeVideo'),msgEl:$('#editSourceBarcodeMsg'),panelEl:$('#editSourceBarcodeScanPanel')})
 imageInput.onchange=async()=>{const file=imageInput.files?.[0];if(!file)return;try{saveBtn.disabled=true;meta.textContent='Procesando imagen…';imageData=await prepareProductImage(file);preview.innerHTML=`<img src="${imageData}" alt="Vista previa">`;meta.textContent='Nueva imagen lista.'}catch(err){notice(err.message||'No pude procesar la imagen')}finally{saveBtn.disabled=false}}
 if($('#removeProductImage'))$('#removeProductImage').onclick=()=>{imageData='';preview.innerHTML='<div class="image-preview-placeholder">Sin imagen</div>';meta.textContent='La imagen se quitará al guardar.'}
 $('.cancel').onclick=closeModal
 $('#deleteProduct').onclick=()=>{if(locked){notice('No puedes eliminar un producto con stock o unidades activas');return}if(!confirm(`¿Eliminar ${p.name}?`))return;state.products=state.products.filter(x=>x.id!==p.id);state.movements.unshift({id:uid(),product_id:p.id,product_barcode:p.product_barcode,type:'Producto eliminado',reason:p.name,...actorFields(),created_at:new Date().toISOString()});save();closeModal();renderPage();notice('Producto eliminado')}
 $('#editProductForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.source_barcode=normalizeBarcode(f.source_barcode);if(productHasSourceBarcode(f.source_barcode,p.id)){notice('Ese código de barra original ya está asignado a otro producto');return}if(locked){f.category=p.category;f.tracking_mode=p.tracking_mode}f.purchase_price=Number(f.purchase_price||0);f.sale_price=Number(f.sale_price||0);f.min_stock=Number(f.min_stock||0);f.image_data=imageData;f.image_upload_pending=!!(imageData&&String(imageData).startsWith('data:'));f.sku=makeSku(f);Object.assign(p,f,{updated_at:new Date().toISOString()});state.movements.unshift({id:uid(),product_id:p.id,product_barcode:p.product_barcode,type:'Producto editado',reason:`${p.name}${f.source_barcode?` · código original ${f.source_barcode}`:''}`,...actorFields(),created_at:new Date().toISOString()});save();closeModal();renderPage();notice('Producto actualizado')}
}

function openUnitForm(productId=''){
 const eligible=state.products.filter(p=>p.tracking_mode!=='quantity')
 if(!eligible.length){notice('No hay productos configurados por unidad');return}
 const code=nextUnitBarcode();const selected=eligible.some(p=>p.id===productId)?productId:eligible[0].id
 modal('Registrar unidad',`<form id="unitForm" class="form-grid"><label class="span2">Producto<select name="product_id">${eligible.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)} · ${esc(p.capacity||'')} · ${esc(p.color||'')}</option>`).join('')}</select></label><label>Serial<input name="serial_number" required></label><label>IMEI<input name="imei"></label><label>IMEI 2<input name="imei_2"></label><label>Ubicación<select name="location">${state.locations.map(l=>`<option>${esc(l.name)}</option>`).join('')}</select></label><div class="barcode-preview span2"><span>Código único de esta unidad</span><strong>${code}</strong>${code128svg(code,52)}</div><div class="form-actions span2"><button type="button" class="btn ghost cancel">Cancelar</button><button class="btn primary">Registrar unidad</button></div></form>`)
 $('.cancel').onclick=closeModal;$('#unitForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.units.some(u=>u.serial_number&&u.serial_number.toLowerCase()===f.serial_number.toLowerCase())){notice('Ese serial ya existe');return}if(f.imei&&state.units.some(u=>u.imei===f.imei)){notice('Ese IMEI ya existe');return}Object.assign(f,{id:uid(),barcode_value:code,status:'Disponible',created_at:new Date().toISOString()});state.units.unshift(f);state.movements.unshift({id:uid(),unit_barcode:code,type:'Entrada',reason:'Registro de unidad',location:f.location,...actorFields(),created_at:new Date().toISOString()});save();closeModal();renderPage();notice('Unidad registrada y código generado')}
}

function openStockMovement(productId=''){
 const products=state.products.filter(p=>p.tracking_mode==='quantity')
 if(!products.length){notice('Primero crea un accesorio o repuesto controlado por cantidad');return}
 const selected=products.some(p=>p.id===productId)?productId:products[0].id
 modal('Movimiento de stock',`<form id="stockForm" class="form-grid"><label class="span2">Producto<select name="product_id" id="stockProduct">${products.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)} · ${esc(p.compatibility||p.subcategory||'')}</option>`).join('')}</select></label><label>Ubicación<select name="location" id="stockLocation">${state.locations.filter(l=>l.type!=='Servicio').map(l=>`<option>${esc(l.name)}</option>`).join('')}</select></label><label>Movimiento<select name="operation" id="stockOperation"><option value="in">Entrada</option><option value="out">Salida</option><option value="set">Ajuste / conteo físico</option></select></label><label>Cantidad<input name="quantity" type="number" min="0" step="1" required value="1"></label><label>Motivo<input name="reason" placeholder="Compra, venta, ajuste, uso interno…" required></label><div class="stock-summary span2" id="stockSummary"></div><div class="form-actions span2"><button type="button" class="btn ghost cancel">Cancelar</button><button class="btn primary">Guardar movimiento</button></div></form>`)
 const sync=()=>{const p=state.products.find(x=>x.id===$('#stockProduct').value),loc=$('#stockLocation').value,current=stockAt(p.id,loc),reserved=Math.max(0,Number(p.sync_stock_reserved||0));$('#stockSummary').innerHTML=`<div><span>Producto</span><b>${esc(p.product_barcode)}</b></div><div><span>Stock en ${esc(loc)}</span><b>${current}</b></div><div><span>Stock físico total</span><b>${totalStock(p.id)}</b></div><div><span>Reservado</span><b>${reserved}</b></div>${reserved?`<small class="field-help span2">El stock físico nunca puede quedar por debajo de ${reserved} unidad${reserved===1?'':'es'} reservada${reserved===1?'':'s'}.</small>`:''}${code128svg(p.product_barcode,40)}`}
 $('#stockProduct').onchange=sync;$('#stockLocation').onchange=sync;sync();$('.cancel').onclick=closeModal
 $('#stockForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const p=state.products.find(x=>x.id===f.product_id);const qty=Math.floor(Number(f.quantity||0));const current=stockAt(p.id,f.location);const totalBefore=state.stock.filter(s=>s.product_id===p.id).reduce((n,s)=>n+Math.max(0,Number(s.quantity||0)),0);const reserved=Math.max(0,Number(p.sync_stock_reserved||0));let next=current,delta=0,type='Ajuste de stock';if(f.operation==='in'){if(qty<=0){notice('La cantidad debe ser mayor que cero');return}next=current+qty;delta=qty;type='Entrada de stock'}else if(f.operation==='out'){if(qty<=0){notice('La cantidad debe ser mayor que cero');return}if(qty>current){notice(`No puedes retirar ${qty}; solo hay ${current}`);return}next=current-qty;delta=-qty;type='Salida de stock'}else{next=qty;delta=next-current;type='Ajuste de stock'}const totalAfter=totalBefore-current+next;if(totalAfter<reserved){notice(`No puedes dejar el stock físico en ${totalAfter}: hay ${reserved} unidad${reserved===1?'':'es'} reservada${reserved===1?'':'s'}. Libera/cancela la reserva o mantén al menos ${reserved} en stock.`);return}setStock(p.id,f.location,next);state.movements.unshift({id:uid(),product_id:p.id,product_barcode:p.product_barcode,quantity_delta:delta,stock_after:next,location:f.location,type,reason:f.reason,...actorFields(),created_at:new Date().toISOString()});save();closeModal();renderPage();notice(`${type}: ${delta>0?'+':''}${delta} · stock ${next}`)}
}
function openUnitDetail(id){const u=state.units.find(x=>x.id===id);if(!u)return;const p=productMap()[u.product_id];modal(p?.name||'Unidad',`<div class="unit-detail"><div class="barcode-large">${code128svg(u.barcode_value,62)}</div><div class="detail-grid"><div><span>Código unidad</span><b>${esc(u.barcode_value)}</b></div><div><span>Código producto</span><b>${esc(p?.product_barcode||'—')}</b></div><div><span>Estado</span><b>${esc(u.status)}</b></div><div><span>Serial</span><b>${esc(u.serial_number||'—')}</b></div><div><span>IMEI</span><b>${esc(u.imei||'—')}</b></div><div><span>Ubicación</span><b>${esc(u.location||'—')}</b></div></div><div class="quick-actions"><button class="btn ghost" id="editUnit">Editar / mover</button><button class="btn ghost" id="printLabel">⎙ Etiqueta</button>${['Reservado','Vendido','Servicio técnico','Disponible'].filter(s=>s!==u.status).map(s=>`<button class="btn dark" data-status="${s}">${s}</button>`).join('')}</div></div>`)
 $('#editUnit').onclick=()=>{closeModal();openEditUnitForm(u.id)};$('#printLabel').onclick=()=>printUnitLabel(u,p);document.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{const prev=u.status;u.status=b.dataset.status;state.movements.unshift({id:uid(),unit_barcode:u.barcode_value,type:u.status,reason:`Cambio manual: ${prev} → ${u.status}`,location:u.location,...actorFields(),created_at:new Date().toISOString()});save();closeModal();renderPage();notice(`Estado actualizado a ${u.status}`)})}

function openEditUnitForm(id){const u=state.units.find(x=>x.id===id);if(!u)return;const p=productMap()[u.product_id];modal('Editar unidad',`<form id="editUnitForm" class="form-grid"><div class="span2 barcode-preview"><span>Producto</span><strong>${esc(p?.name||'—')}</strong><small>${esc(u.barcode_value)}</small></div><label>Serial<input name="serial_number" required value="${esc(u.serial_number||'')}"></label><label>IMEI<input name="imei" value="${esc(u.imei||'')}"></label><label>IMEI 2<input name="imei_2" value="${esc(u.imei_2||'')}"></label><label>Ubicación<select name="location">${state.locations.map(l=>`<option ${u.location===l.name?'selected':''}>${esc(l.name)}</option>`).join('')}</select></label><div class="form-actions span2"><button type="button" class="btn ghost cancel">Cancelar</button><button class="btn primary">Guardar cambios</button></div></form>`);$('.cancel').onclick=closeModal;$('#editUnitForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(state.units.some(x=>x.id!==u.id&&x.serial_number&&x.serial_number.toLowerCase()===f.serial_number.toLowerCase())){notice('Ese serial ya existe');return}if(f.imei&&state.units.some(x=>x.id!==u.id&&x.imei===f.imei)){notice('Ese IMEI ya existe');return}const prevLoc=u.location;Object.assign(u,f,{updated_at:new Date().toISOString()});state.movements.unshift({id:uid(),unit_barcode:u.barcode_value,type:'Unidad editada',reason:prevLoc!==u.location?`Movimiento ${prevLoc} → ${u.location}`:'Datos de unidad actualizados',location:u.location,...actorFields(),created_at:new Date().toISOString()});save();closeModal();renderPage();notice('Unidad actualizada')}}

function printUnitLabel(u,p){const win=window.open('','_blank','width=600,height=500');win.document.write(`<!doctype html><html><head><title>${esc(u.barcode_value)}</title><style>body{font-family:Arial;margin:0;padding:12px}.label{width:60mm;border:1px solid #aaa;padding:4mm}.top{display:flex;justify-content:space-between;gap:10px}.ts{font-weight:900;font-size:18px}.name{font-size:12px}.meta{font-size:10px;color:#555;margin:3px 0 8px}.row{font-size:9px;display:flex;justify-content:space-between;margin-top:3px}svg{width:100%;height:auto}</style></head><body><div class="label"><div class="top"><div class="ts">ThinkStore</div><div class="name">${esc(p?.name||'Producto')}</div></div><div class="meta">${esc(p?.capacity||'')} · ${esc(p?.color||'')} · ${esc(p?.condition||'')}</div>${code128svg(u.barcode_value,52)}<div class="row"><b>${esc(u.barcode_value)}</b><span>Serial: ${esc(u.serial_number||'—')}</span></div>${u.imei?`<div class="row"><span>IMEI: ${esc(u.imei)}</span></div>`:''}</div><script>window.onload=()=>window.print()<\/script></body></html>`);win.document.close()}
function printProductLabel(p){if(!p)return;const win=window.open('','_blank','width=600,height=560');win.document.write(`<!doctype html><html><head><title>${esc(p.product_barcode)}</title><style>body{font-family:Arial;margin:0;padding:12px}.label{width:60mm;border:1px solid #aaa;padding:4mm}.top{display:flex;justify-content:space-between;gap:10px}.ts{font-weight:900;font-size:18px}.name{font-size:11px;text-align:right;max-width:38mm}.meta{font-size:10px;color:#555;margin:4px 0 8px}.row{font-size:9px;display:flex;justify-content:space-between;margin-top:3px}svg{width:100%;height:auto}.thumb{display:flex;justify-content:center;align-items:center;height:34mm;margin:0 0 8px;background:linear-gradient(135deg,#fafafa,#f0f0f3);border-radius:8px}.thumb img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body><div class="label"><div class="top"><div class="ts">ThinkStore</div><div class="name">${esc(p.name)}</div></div>${p.image_data?`<div class="thumb"><img src="${p.image_data}" alt="${esc(p.name)}"></div>`:''}<div class="meta">${esc(p.compatibility||p.capacity||'')} · ${esc(p.color||'')} · ${p.tracking_mode==='quantity'?'Stock por cantidad':'Producto serializado'}</div>${code128svg(p.product_barcode,52)}<div class="row"><b>${esc(p.product_barcode)}</b><span>${esc(p.sku)}</span></div></div><script>window.onload=()=>window.print()<\/script></body></html>`);win.document.close()}

function openProductScan(p){const hero=p.image_data?`<div class="product-hero">${productThumb(p,'170px')}</div>`:'';if(p.tracking_mode==='quantity'){modal(p.name,`<div class="unit-detail">${hero}<div class="barcode-large">${code128svg(p.product_barcode,62)}</div><div class="detail-grid"><div><span>Código interno</span><b>${esc(p.product_barcode)}</b></div><div><span>Código original</span><b>${esc(p.source_barcode||'—')}</b></div><div><span>SKU</span><b>${esc(p.sku)}</b></div><div><span>Stock total</span><b>${totalStock(p.id)}</b></div><div><span>Stock mínimo</span><b>${Number(p.min_stock||0)}</b></div><div class="span2"><span>Compatibilidad</span><b>${esc(p.compatibility||p.subcategory||'—')}</b></div></div><div class="quick-actions"><button class="btn ghost" id="printProduct">⎙ Etiqueta</button><button class="btn primary" id="manageProductStock">Gestionar stock</button></div></div>`);$('#printProduct').onclick=()=>printProductLabel(p);$('#manageProductStock').onclick=()=>{closeModal();openStockMovement(p.id)}}else{const available=productAvailable(p);modal(p.name,`<div class="unit-detail">${hero}<div class="barcode-large">${code128svg(p.product_barcode,62)}</div><div class="detail-grid"><div><span>Código interno</span><b>${esc(p.product_barcode)}</b></div><div><span>Código original</span><b>${esc(p.source_barcode||'—')}</b></div><div><span>SKU</span><b>${esc(p.sku)}</b></div><div><span>Unidades disponibles</span><b>${available}</b></div><div><span>Control</span><b>Por unidad / serial</b></div></div><div class="quick-actions"><button class="btn ghost" id="printProduct">⎙ Etiqueta producto</button><button class="btn primary" id="addUnit">＋ Registrar unidad</button></div></div>`);$('#printProduct').onclick=()=>printProductLabel(p);$('#addUnit').onclick=()=>{closeModal();openUnitForm(p.id)}}}
function openFurnitureDetail(id){const item=state.furniture.find(x=>x.id===id);if(!item)return;modal(item.name,`<div class="unit-detail">${item.image_data?`<div class="product-hero"><div class="product-thumb" style="width:170px;height:170px"><img src="${item.image_data}" alt="${esc(item.name)}"></div></div>`:''}<div class="barcode-large">${code128svg(item.asset_code,62)}</div><div class="detail-grid"><div><span>Código</span><b>${esc(item.asset_code)}</b></div><div><span>Categoría</span><b>${esc(item.category||'—')}</b></div><div><span>Ubicación</span><b>${esc(item.location||'—')}</b></div><div><span>Estado</span><b>${esc(item.condition||'—')}</b></div><div><span>Cantidad</span><b>${Number(item.quantity||1)}</b></div><div><span>Valor</span><b>${money(Number(item.purchase_price||0)*Number(item.quantity||1))}</b></div></div><div class="quick-actions"><button class="btn ghost" id="editFurnitureDetail">Editar</button><button class="btn ghost" id="printFurnitureDetail">⎙ Etiqueta</button></div></div>`);$('#editFurnitureDetail').onclick=()=>{closeModal();openFurnitureForm(item.id)};$('#printFurnitureDetail').onclick=()=>printFurnitureLabel(item)}

function findAsset(code){const q=String(code||'').trim().toLowerCase();if(!q){notice('Escribe o escanea un código');return}const u=state.units.find(u=>[u.barcode_value,u.serial_number,u.imei,u.imei_2].some(v=>String(v||'').toLowerCase()===q));if(u){openUnitDetail(u.id);notice('Unidad encontrada');return}const p=state.products.find(p=>[p.product_barcode,p.sku,p.source_barcode].some(v=>String(v||'').toLowerCase()===q));if(p){openProductScan(p);notice('Producto encontrado');return}const item=state.furniture.find(x=>[x.asset_code,x.name,x.reference].some(v=>String(v||'').toLowerCase()===q));if(item){openFurnitureDetail(item.id);notice('Mobiliario encontrado');return}notice(`No encontré “${code}”`)}
let stream=null,scanTimer=null
async function startScanner(){const msg=$('#scanMsg');try{const detector=await buildBarcodeDetector();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});const v=$('#camera');v.srcObject=stream;v.style.display='block';await v.play();$('#startScan').style.display='none';$('#stopScan').style.display='inline-flex';msg.textContent='Escaneando códigos internos y originales…';scanTimer=setInterval(async()=>{try{const found=await detector.detect(v);if(found[0]?.rawValue){stopScanner();findAsset(found[0].rawValue)}}catch{}},350)}catch(e){msg.textContent=e.message||'No pude abrir la cámara. Verifica permisos o utiliza búsqueda manual.'}}
function stopScanner(){clearInterval(scanTimer);scanTimer=null;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}const v=$('#camera');if(v){v.pause();v.style.display='none'}if($('#startScan'))$('#startScan').style.display='inline-flex';if($('#stopScan'))$('#stopScan').style.display='none'}

async function createLocationOnline(location){
 if(!cloud.session)throw new Error('AUTH_REQUIRED')
 const {data,error}=await cloud.client.rpc('inventory_create_location',{p_workspace:cloud.workspace,p_location:location})
 if(error){
   if(error.code==='PGRST202'||/inventory_create_location/i.test(error.message||''))throw new Error('Falta ejecutar supabase-v3.1.6.sql en Supabase')
   throw error
 }
 if(data?.version!=null)cloud.remoteVersion=Number(data.version)
 const updatedAt=data?.updated_at||new Date().toISOString();cloud.lastSyncedAt=updatedAt;cloud.lastUpdate={at:updatedAt,user_id:currentActorId(),name:currentActorName(),email:currentActorEmail()};refreshLastUpdateUI()
 return data
}
function renderLocations(c){
 c.innerHTML=head('Ubicaciones','Controla dónde está físicamente cada unidad y cada cantidad de accesorios.')+`<div class="two-col"><div class="panel"><h3>Nueva ubicación</h3><form class="stack-form" id="locationForm"><label>Nombre<input name="name" required placeholder="Almacén secundario"></label><label>Tipo<select name="type"><option>Tienda</option><option>Almacén</option><option>Servicio</option><option>Tránsito</option></select></label><button class="btn primary" id="saveLocationBtn">Agregar</button><small class="backup-meta" id="locationSaveState"></small></form></div><div class="panel"><h3>Ubicaciones activas</h3><div class="cards-list">${state.locations.map(r=>`<div><span>⌖</span><span><b>${esc(r.name)}</b><small>${esc(r.type)}</small></span></div>`).join('')}</div></div></div>`
 $('#locationForm').onsubmit=async e=>{
   e.preventDefault();const form=e.target;const f=Object.fromEntries(new FormData(form));f.name=String(f.name||'').trim();f.type=String(f.type||'Tienda').trim()
   if(!f.name){notice('Escribe el nombre de la ubicación');return}
   if(state.locations.some(x=>String(x.name||'').trim().toLowerCase()===f.name.toLowerCase())){notice('Ya existe una ubicación con ese nombre');return}
   f.id=uid();f.created_at=new Date().toISOString();const btn=$('#saveLocationBtn'),status=$('#locationSaveState');btn.disabled=true;btn.textContent='Guardando…';if(status)status.textContent='Sincronizando con Supabase…'
   try{
     const result=await createLocationOnline(f)
     const serverLoc=result?.location||f;state.locations.push(serverLoc)
     if(result?.movement)state.movements.unshift(result.movement)
     persistLocalOnly();renderPage();notice('Ubicación guardada y sincronizada')
   }catch(err){if(isDataApiUnavailable(err)){state.locations.push(f);state.movements.unshift({id:uid(),type:'Ubicación creada',reason:f.name,location:f.name,...actorFields(),created_at:new Date().toISOString()});persistLocalOnly();markPendingOfflineSync();cloud.degraded=true;setCloudStatus('offline','Guardado local · pendiente sincronizar');scheduleCloudRecovery();renderPage();notice('Ubicación guardada en este dispositivo; se sincronizará cuando Supabase vuelva.');return}btn.disabled=false;btn.textContent='Agregar';if(status)status.textContent='No se guardó. Revisa el mensaje.';notice(`No se pudo guardar la ubicación: ${err.message||err}`)}
 }
}
function renderSuppliers(c){c.innerHTML=head('Proveedores','Base interna para compras y recepción de mercancía.')+`<div class="two-col"><div class="panel"><h3>Nuevo proveedor</h3><form class="stack-form" id="supplierForm"><label>Proveedor<input name="name" required></label><label>Contacto<input name="contact_name"></label><label>Teléfono<input name="phone"></label><label>Correo<input name="email"></label><button class="btn primary">Guardar proveedor</button></form></div><div class="panel"><h3>Proveedores registrados</h3>${state.suppliers.length?`<div class="cards-list">${state.suppliers.map(r=>`<div><span>♙</span><span><b>${esc(r.name)}</b><small>${esc(r.contact_name||r.phone||r.email||'Sin contacto')}</small></span></div>`).join('')}</div>`:'<div class="empty">Todavía no hay proveedores.</div>'}</div></div>`;$('#supplierForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.id=uid();state.suppliers.push(f);state.movements.unshift({id:uid(),type:'Proveedor creado',reason:f.name,...actorFields(),created_at:new Date().toISOString()});save();renderPage();notice('Proveedor creado')}}


/* ==========================================================
   Inventory V3.2.32 · Compras, costos reales y proveedores
   ========================================================== */
const purchaseMethods=['Zelle','Pago Móvil','Transferencia','Efectivo USD','Efectivo Bs','Punto de Venta','EUR','USDT','Otro']
function purchaseActive(p){return !['void','anulada','cancelada'].includes(String(p?.status||'').toLowerCase())}
function purchasePaid(p){return (p?.payments||[]).reduce((n,x)=>n+Number(x.amount_usd||0),0)}
function purchaseTotal(p){return Number(p?.total_usd||0)}
function purchaseDue(p){return Math.max(0,purchaseTotal(p)-purchasePaid(p))}
function purchaseDate(p){return p?.purchase_date||p?.created_at||''}
function purchaseStatus(p){if(!purchaseActive(p))return 'Anulada';const due=purchaseDue(p),paid=purchasePaid(p);if(due<=0&&purchaseTotal(p)>0)return 'Pagada';if(paid>0)return 'Parcial';return 'Pendiente'}
function productInventoryQty(p){return p?.tracking_mode==='quantity'?totalStock(p.id):state.units.filter(u=>u.product_id===p.id&&!['Vendido','Baja'].includes(u.status)).length}
function renderPurchases(c){
 const active=state.purchases.filter(purchaseActive),total=active.reduce((n,p)=>n+purchaseTotal(p),0),paid=active.reduce((n,p)=>n+purchasePaid(p),0),due=Math.max(0,total-paid)
 const currentMonth=new Date().toISOString().slice(0,7),monthTotal=active.filter(p=>String(purchaseDate(p)).slice(0,7)===currentMonth).reduce((n,p)=>n+purchaseTotal(p),0)
 const rows=[...state.purchases].sort((a,b)=>String(purchaseDate(b)).localeCompare(String(purchaseDate(a)))).map(p=>{const prod=state.products.find(x=>String(x.id)===String(p.product_id));const st=purchaseStatus(p),dueRow=purchaseDue(p);return `<tr><td>${dt(purchaseDate(p))}<small>${esc(p.reference||'Sin referencia')}</small></td><td><b>${esc(p.supplier_name||'Sin proveedor')}</b><small>${esc(p.funded_by==='freddy'?'Pagó Freddy':p.funded_by==='nelson'?'Pagó Nelson':'Pagó empresa')}</small></td><td><b>${esc(prod?.name||p.product_name||'Compra general')}</b><small>${esc(p.sku||prod?.sku||'')} · ${Number(p.quantity||0)} × ${money(p.unit_cost_usd)}</small></td><td>${money(purchaseTotal(p))}<small>Pagado ${money(purchasePaid(p))}</small></td><td><span class="pill">${esc(st)}</span>${dueRow>0&&purchaseActive(p)?`<small>Pendiente ${money(dueRow)}</small>`:''}</td><td><div class="row-actions">${dueRow>0&&purchaseActive(p)?`<button class="row-btn" data-pay-purchase="${esc(p.id)}">Abono</button>`:''}${purchaseActive(p)&&isSuperAdmin()?`<button class="row-btn" data-void-purchase="${esc(p.id)}">Anular</button>`:''}</div></td></tr>`}).join('')
 c.innerHTML=head('Compras','Registro de compras reales conectado a costos, proveedores, socios y Enterprise.',`<button class="btn primary" id="newPurchase">＋ Registrar compra</button>`)+`<div class="stats-grid"><div class="stat-card"><div class="stat-icon">$</div><div><span>Compras acumuladas</span><strong>${money(total)}</strong><small>Registros activos</small></div></div><div class="stat-card"><div class="stat-icon">✓</div><div><span>Pagado</span><strong>${money(paid)}</strong><small>Salida de caja registrada</small></div></div><div class="stat-card"><div class="stat-icon">!</div><div><span>Por pagar</span><strong>${money(due)}</strong><small>Cuentas con proveedores</small></div></div><div class="stat-card"><div class="stat-icon">◫</div><div><span>Mes actual</span><strong>${money(monthTotal)}</strong><small>Compras registradas</small></div></div></div><div class="table-card"><table><thead><tr><th>Fecha / referencia</th><th>Proveedor / financiador</th><th>Producto</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="6"><div class="empty">Todavía no hay compras registradas.</div></td></tr>'}</tbody></table></div>`
 $('#newPurchase').onclick=openPurchaseForm
 document.querySelectorAll('[data-pay-purchase]').forEach(b=>b.onclick=()=>openPurchasePayment(b.dataset.payPurchase))
 document.querySelectorAll('[data-void-purchase]').forEach(b=>b.onclick=()=>voidPurchase(b.dataset.voidPurchase))
}
function openPurchaseForm(){
 if(!state.products.length){notice('Primero registra el producto en Inventory.');return}
 const productOptions=state.products.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.capacity||p.compatibility||'')} · ${esc(p.color||'')} · ${esc(p.sku||'')}</option>`).join('')
 const supplierOptions=state.suppliers.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')
 modal('Registrar compra',`<form id="purchaseForm" class="form-grid"><label class="span2">Producto<select name="product_id" id="purchaseProduct" required>${productOptions}</select></label><label>Proveedor<select name="supplier_id"><option value="">Sin proveedor / compra directa</option>${supplierOptions}</select></label><label>Fecha de compra<input name="purchase_date" type="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>Cantidad<input name="quantity" type="number" min="1" step="1" value="1" required></label><label>Costo unitario USD<input name="unit_cost_usd" id="purchaseUnitCost" type="number" min="0" step="0.01" required></label><label>Flete / envío USD<input name="freight_usd" type="number" min="0" step="0.01" value="0"></label><label>Otros costos USD<input name="other_cost_usd" type="number" min="0" step="0.01" value="0"></label><label>Quién paga<select name="funded_by"><option value="company">Empresa</option><option value="freddy">Freddy Sedispa</option><option value="nelson">Nelson Garzon</option></select></label><label>Método de pago<select name="payment_method">${purchaseMethods.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label><label>Pago inicial USD<input name="initial_payment_usd" type="number" min="0" step="0.01" value="0"></label><label>Vencimiento<input name="due_date" type="date"></label><label>Factura / referencia<input name="reference" placeholder="Factura, orden, Zelle…"></label><label>Ubicación de entrada<select name="location">${state.locations.map(x=>`<option>${esc(x.name)}</option>`).join('')}</select></label><label class="span2"><input name="apply_stock" type="checkbox" value="1" style="width:auto;min-height:auto;margin-right:8px">Aplicar entrada automáticamente al stock por cantidad. Los equipos serializados se registran luego por serial/IMEI.</label><label class="span2">Notas<textarea name="notes" rows="3" placeholder="Condiciones del proveedor, garantía, envío, observaciones…"></textarea></label><div class="form-actions span2"><button type="button" class="btn ghost cancel">Cancelar</button><button class="btn primary">Guardar compra</button></div></form>`)
 const sync=()=>{const p=state.products.find(x=>x.id===$('#purchaseProduct')?.value);if(p&&$('#purchaseUnitCost')&&!$('#purchaseUnitCost').value)$('#purchaseUnitCost').value=Number(p.purchase_price||0).toFixed(2)};$('#purchaseProduct')?.addEventListener('change',sync);sync();$('.cancel').onclick=closeModal
 $('#purchaseForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),prod=state.products.find(x=>x.id===f.product_id);if(!prod)return notice('Producto no encontrado');const qty=Math.max(1,Math.floor(Number(f.quantity||1))),unit=Math.max(0,Number(f.unit_cost_usd||0)),freight=Math.max(0,Number(f.freight_usd||0)),other=Math.max(0,Number(f.other_cost_usd||0)),total=Math.round((qty*unit+freight+other)*100)/100;if(!(total>0))return notice('Indica un costo válido.');let initial=Math.max(0,Math.min(total,Number(f.initial_payment_usd||0)));const supplier=state.suppliers.find(x=>String(x.id)===String(f.supplier_id)),now=new Date().toISOString(),landed=total/qty,currentQty=productInventoryQty(prod),oldCost=Math.max(0,Number(prod.purchase_price||0));prod.purchase_price=Math.round(((currentQty*oldCost+total)/(currentQty+qty))*100)/100;prod.supplier_id=f.supplier_id||prod.supplier_id||'';prod.updated_at=now;const payment=initial>0?{id:uid(),amount_usd:initial,payment_method:f.payment_method||'Sin definir',funded_by:f.funded_by||'company',reference:f.reference||'',occurred_at:now,...actorFields()}:null;const row={id:uid(),purchase_date:f.purchase_date,created_at:now,product_id:prod.id,product_name:prod.name,sku:prod.sku||'',supplier_id:f.supplier_id||'',supplier_name:supplier?.name||'',quantity:qty,unit_cost_usd:unit,freight_usd:freight,other_cost_usd:other,landed_unit_cost_usd:Math.round(landed*100)/100,total_usd:total,funded_by:f.funded_by||'company',payment_method:f.payment_method||'',reference:f.reference||'',due_date:f.due_date||'',notes:f.notes||'',payments:payment?[payment]:[],status:'posted',stock_applied:false,...actorFields()};if(f.apply_stock==='1'&&prod.tracking_mode==='quantity'){const loc=f.location||state.locations[0]?.name||'Tienda Chacao',before=stockAt(prod.id,loc);setStock(prod.id,loc,before+qty);row.stock_applied=true;row.stock_location=loc;state.movements.unshift({id:uid(),purchase_id:row.id,product_id:prod.id,product_barcode:prod.product_barcode,quantity_delta:qty,stock_after:before+qty,location:loc,type:'Entrada por compra',reason:`${supplier?.name||'Proveedor'} · ${f.reference||'sin referencia'}`,...actorFields(),created_at:now})}else{state.movements.unshift({id:uid(),purchase_id:row.id,product_id:prod.id,product_barcode:prod.product_barcode,type:'Compra registrada',reason:`${qty} × ${prod.name} · costo aterrizado ${money(landed)}${prod.tracking_mode!=='quantity'?' · pendiente registrar seriales':''}`,...actorFields(),created_at:now})}state.purchases.unshift(row);save();closeModal();renderPage();notice(`Compra registrada · ${money(total)} · costo promedio ${money(prod.purchase_price)}`)}
}
function openPurchasePayment(id){const p=state.purchases.find(x=>String(x.id)===String(id));if(!p||!purchaseActive(p))return;const due=purchaseDue(p);if(!(due>0))return notice('La compra ya está pagada.');modal('Registrar abono a proveedor',`<form id="purchasePaymentForm" class="form-grid"><div class="span2 barcode-preview"><span>${esc(p.supplier_name||'Proveedor')}</span><strong>Pendiente ${money(due)}</strong><small>${esc(p.reference||p.product_name||'Compra')}</small></div><label>Monto USD<input name="amount_usd" type="number" min="0.01" max="${due}" step="0.01" value="${due.toFixed(2)}" required></label><label>Método<select name="payment_method">${purchaseMethods.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label><label>Quién paga<select name="funded_by"><option value="company">Empresa</option><option value="freddy">Freddy Sedispa</option><option value="nelson">Nelson Garzon</option></select></label><label>Referencia<input name="reference"></label><label class="span2">Nota<input name="note"></label><div class="form-actions span2"><button type="button" class="btn ghost cancel">Cancelar</button><button class="btn primary">Registrar abono</button></div></form>`);$('.cancel').onclick=closeModal;$('#purchasePaymentForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),amount=Math.min(due,Math.max(0,Number(f.amount_usd||0)));if(!(amount>0))return notice('Monto inválido');const now=new Date().toISOString();p.payments=Array.isArray(p.payments)?p.payments:[];p.payments.push({id:uid(),amount_usd:amount,payment_method:f.payment_method||'Sin definir',funded_by:f.funded_by||'company',reference:f.reference||'',note:f.note||'',occurred_at:now,...actorFields()});p.updated_at=now;state.movements.unshift({id:uid(),purchase_id:p.id,type:'Abono a proveedor',reason:`${p.supplier_name||p.product_name||'Compra'} · ${money(amount)} · ${f.funded_by==='freddy'?'Freddy':f.funded_by==='nelson'?'Nelson':'Empresa'}`,...actorFields(),created_at:now});save();closeModal();renderPage();notice(`Abono registrado · pendiente ${money(purchaseDue(p))}`)}}
function voidPurchase(id){const p=state.purchases.find(x=>String(x.id)===String(id));if(!p||!purchaseActive(p))return;if(!confirm(`¿Anular la compra ${p.reference||p.product_name||''}?\n\nEl registro financiero quedará visible. Si la compra aplicó stock, el inventario NO se revertirá automáticamente para evitar alterar unidades ya vendidas o reservadas.`))return;const now=new Date().toISOString();p.status='void';p.voided_at=now;p.voided_by=currentActorEmail();state.movements.unshift({id:uid(),purchase_id:p.id,type:'Compra anulada',reason:p.reference||p.product_name||'Compra',...actorFields(),created_at:now});save();renderPage();notice('Compra anulada; se conserva para auditoría.')}

async function initApp(){try{await navigator.storage?.persist?.()}catch{}await hydrateProductImages();await hydrateFurnitureImages();migrate();registerPWA();const ok=await initCloud();if(ok){if(!$('.app-shell')){shell();renderPage()}setCloudStatus(cloud.degraded?'offline':'online',cloud.degraded?'Modo temporal · copia local':'Sincronizado');checkForWebUpdate();setInterval(checkForWebUpdate,300000)}}
initApp()
