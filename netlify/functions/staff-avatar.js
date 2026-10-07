/** ThinkStore Staff V14.77 — private, self-service profile photos. */
const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const BUCKET='staff-profile-photos';
const r=(statusCode,body)=>({statusCode,headers:H,body:JSON.stringify(body)});
const serviceHeaders=secret=>({apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':'application/json'});
const isValidUUID=v=>/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v||'');
const normalizeRole=v=>{const k=String(v||'').toLowerCase().replace(/[ -]+/g,'_');return k==='super_admin'?'superadmin':(['administrator','gerente'].includes(k)?'admin':k)};
const storagePath=path=>path.split('/').map(encodeURIComponent).join('/');

async function authorizedUser(event,url,secret){
  const token=String(event.headers?.authorization||event.headers?.Authorization||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)return null;
  const auth=await fetch(`${url}/auth/v1/user`,{headers:{apikey:secret,Authorization:`Bearer ${token}`}});
  if(!auth.ok)return null;
  const user=await auth.json().catch(()=>({}));
  if(!isValidUUID(user.id))return null;
  const q=`${url}/rest/v1/profiles?select=id,role,is_internal,active,staff_avatar_path&id=eq.${encodeURIComponent(user.id)}&limit=1`;
  const rowsRes=await fetch(q,{headers:serviceHeaders(secret)});
  if(!rowsRes.ok)return null;
  const rows=await rowsRes.json().catch(()=>[]),p=rows[0];
  if(!p||p.id!==user.id||p.active===false||p.is_internal!==true||!['vendedor','admin','superadmin'].includes(normalizeRole(p.role)))return null;
  return {id:user.id,profile:p};
}
function allowedImage(bytes,mime){
  if(mime==='image/jpeg')return bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  if(mime==='image/webp')return bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  return false;
}
async function signAvatar(url,secret,path){
  const res=await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${storagePath(path)}`,{method:'POST',headers:serviceHeaders(secret),body:JSON.stringify({expiresIn:604800})});
  if(!res.ok)throw Error('No se pudo autorizar la foto privada');
  const data=await res.json(),s=data.signedURL||data.signedUrl;
  if(!s)throw Error('El almacenamiento no entregó el enlace de la foto');
  return s.startsWith('http')?s:`${url}/storage/v1${s.startsWith('/')?'':'/'}${s}`;
}
async function patchPath(url,secret,id,path){
  const res=await fetch(`${url}/rest/v1/profiles?id=eq.${id}`,{method:'PATCH',headers:{...serviceHeaders(secret),'Prefer':'return=representation'},body:JSON.stringify({staff_avatar_path:path})});
  const rows=await res.json().catch(()=>[]);
  if(!res.ok||!Array.isArray(rows)||rows.length!==1)throw Error('No se pudo vincular la foto al perfil. Ejecuta la migración V14.77 si aún no se ha aplicado.');
}
async function deleteOld(url,secret,id,path){
  if(!path||!path.startsWith(`${id}/`))return;
  try{
    const res=await fetch(`${url}/storage/v1/object/${BUCKET}`,{method:'DELETE',headers:serviceHeaders(secret),body:JSON.stringify({prefixes:[path]})});
    if(!res.ok)console.warn('Staff photo cleanup skipped',res.status);
  }catch(e){console.warn('Staff photo cleanup deferred',e)}
}
exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return {statusCode:204,headers:H,body:''};
  if(event.httpMethod!=='POST')return r(405,{ok:false,error:'Método no permitido'});
  const url=String(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||'').trim().replace(/\/$/,''),secret=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'').trim();
  if(!url||!secret)return r(503,{ok:false,error:'Falta configurar Supabase en Netlify'});
  let user;try{user=await authorizedUser(event,url,secret)}catch(e){console.error('staff-avatar auth',e);return r(502,{ok:false,error:'No se pudo verificar el usuario en Supabase'})}
  if(!user)return r(403,{ok:false,error:'Solo el vendedor o administrador autorizado puede cambiar su foto'});
  if((event.body||'').length>610000)return r(413,{ok:false,error:'La foto es demasiado grande. Usa una imagen más ligera.'});
  let body;try{body=JSON.parse(event.body||'{}')}catch{return r(400,{ok:false,error:'Solicitud inválida'})}
  const prior=user.profile.staff_avatar_path||'';
  if(body.action==='remove'){
    try{await patchPath(url,secret,user.id,null)}catch(e){return r(500,{ok:false,error:e.message})}
    await deleteOld(url,secret,user.id,prior);
    return r(200,{ok:true,user_id:user.id,staff_avatar_path:'',avatar_url:''});
  }
  if(body.action!=='upload')return r(400,{ok:false,error:'Acción inválida'});
  const mime=body.mime,encoded=body.base64;
  if(!['image/webp','image/jpeg'].includes(mime)||typeof encoded!=='string'||!encoded||encoded.length>560000||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return r(400,{ok:false,error:'El archivo optimizado debe ser JPG o WEBP'});
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.length<80||bytes.length>400*1024||!allowedImage(bytes,mime))return r(400,{ok:false,error:'El contenido no es una foto JPG/WEBP válida o es demasiado grande'});
  const ext=mime==='image/webp'?'webp':'jpg',path=`${user.id}/photo-${Date.now()}-${require('crypto').randomBytes(5).toString('hex')}.${ext}`;
  try{
    const put=await fetch(`${url}/storage/v1/object/${BUCKET}/${storagePath(path)}`,{method:'POST',headers:{apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':mime,'x-upsert':'false','Cache-Control':'3600'},body:bytes});
    if(!put.ok){console.error('staff-avatar storage:',put.status,(await put.text().catch(()=>'' )).slice(0,180));return r(502,{ok:false,error:'No se pudo guardar la foto en Supabase Storage. Verifica la migración V14.77.'})}
    let avatarUrl;
    try{avatarUrl=await signAvatar(url,secret,path);await patchPath(url,secret,user.id,path)}catch(e){await deleteOld(url,secret,user.id,path);throw e}
    await deleteOld(url,secret,user.id,prior);
    return r(200,{ok:true,user_id:user.id,avatar_url:avatarUrl,staff_avatar_path:path});
  }catch(e){console.error('staff-avatar upload',e);return r(500,{ok:false,error:e.message||'No se pudo subir la foto'})}
};
