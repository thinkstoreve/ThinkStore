'use strict';
const crypto=require('crypto');
const {statusClientEmail,repairUpdateEmail,sendResend}=require('./support-mail-ui');
const R2=require('./support-r2');
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'},body:JSON.stringify(body)});
const clean=v=>String(v??'').trim();
const IMAGE_MIME_BY_EXT={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',avif:'image/avif',heic:'image/heic',heif:'image/heif',tif:'image/tiff',tiff:'image/tiff'};
const inferredMime=path=>IMAGE_MIME_BY_EXT[(String(path||'').split('.').pop()||'').toLowerCase()]||'';
const sniffImageMime=buffer=>{
  const b=Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer||[]);
  if(b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return 'image/jpeg';
  if(b.length>=8&&b.slice(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))return 'image/png';
  if(b.length>=12&&b.slice(0,4).toString('ascii')==='RIFF'&&b.slice(8,12).toString('ascii')==='WEBP')return 'image/webp';
  if(b.length>=6&&['GIF87a','GIF89a'].includes(b.slice(0,6).toString('ascii')))return 'image/gif';
  if(b.length>=2&&b[0]===0x42&&b[1]===0x4d)return 'image/bmp';
  if(b.length>=4&&((b[0]===0x49&&b[1]===0x49&&b[2]===0x2a&&b[3]===0x00)||(b[0]===0x4d&&b[1]===0x4d&&b[2]===0x00&&b[3]===0x2a)))return 'image/tiff';
  if(b.length>=12&&b.slice(4,8).toString('ascii')==='ftyp'){
    const brand=b.slice(8,12).toString('ascii').toLowerCase();
    if(['heic','heix','hevc','hevx','heim','heis','mif1','msf1'].includes(brand))return 'image/heic';
    if(['avif','avis'].includes(brand))return 'image/avif';
  }
  return '';
};
const isGenericMime=m=>!m||m==='application/octet-stream'||m==='binary/octet-stream'||m==='application/binary';
const absoluteSigned=(base,raw)=>raw.startsWith('http')?raw:raw.startsWith('/storage/v1')?`${base}${raw}`:raw.startsWith('/object/')||raw.startsWith('/render/')?`${base}/storage/v1${raw}`:raw?`${base}/storage/v1/${raw.replace(/^\//,'')}`:'';
const encodePath=v=>String(v||'').split('/').map(encodeURIComponent).join('/');

const mediaSigningSecret=()=>clean(process.env.SUPPORT_MEDIA_SIGNING_SECRET||process.env.SUPPORT_R2_SECRET_ACCESS_KEY||process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
const mediaProxyUrl=(storagePath,ttl=3600)=>{
  const secret=mediaSigningSecret();if(!secret)return '';
  const exp=Math.floor(Date.now()/1000)+Math.max(60,Math.min(3600,Number(ttl)||3600));
  const p=Buffer.from(clean(storagePath)).toString('base64url');
  const sig=crypto.createHmac('sha256',secret).update(`${p}.${exp}`).digest('hex');
  return `/.netlify/functions/support-media?p=${encodeURIComponent(p)}&e=${exp}&s=${sig}`;
};

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return reply(200,{ok:true});
  if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Método no permitido'});
  const url=clean(process.env.SUPPORT_SUPABASE_URL||process.env.SUPABASE_URL).replace(/\/$/,'');
  const key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!url||!key)return reply(501,{ok:false,error:'Faltan las variables de Supabase de Soporte en Netlify'});
  try{
    const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');
    if(!token)return reply(401,{ok:false,error:'Sesión requerida'});
    const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`}});
    const user=await ur.json().catch(()=>({}));
    if(!ur.ok||!user.email)return reply(401,{ok:false,error:'Sesión inválida'});
    const h={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
    const req=async(path,options={})=>{const r=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...h,...(options.headers||{})}});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok){const e=new Error(d?.message||`Error ${r.status}`);e.status=r.status;throw e}return d};
    const profiles=await req(`service_users?select=*&email=ilike.${encodeURIComponent(user.email)}&limit=1`);
    const profile=profiles?.[0];
    if(!profile||profile.activo===false)return reply(403,{ok:false,error:'Usuario de soporte no autorizado'});
    const body=JSON.parse(event.body||'{}');
    const action=clean(body.action);
    const cfg=R2.config();

    const ensureOrderAccess=async orderId=>{
      const rows=await req(`service_orders?select=id,code,assigned_technician_email&id=eq.${encodeURIComponent(String(orderId))}&limit=1`);
      const order=rows?.[0];if(!order){const e=new Error('Orden no encontrada');e.status=404;throw e}
      if(String(profile.rol||'').toLowerCase()==='technician'){
        const assigned=clean(order.assigned_technician_email).toLowerCase(),mine=clean(user.email).toLowerCase();
        if(assigned&&assigned!==mine){const e=new Error('Esta orden está asignada a otro técnico');e.status=403;throw e}
      }
      return order;
    };
    const fetchSupabaseObject=async storagePath=>{
      const encoded=encodePath(storagePath);
      let fr=await fetch(`${url}/storage/v1/object/authenticated/service-order-files/${encoded}`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
      if(!fr.ok){
        const sr=await fetch(`${url}/storage/v1/object/sign/service-order-files/${encoded}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:300})});
        const sd=await sr.json().catch(()=>({}));const signed=absoluteSigned(url,clean(sd.signedURL||sd.signedUrl));
        if(!sr.ok||!signed){const e=new Error(sd?.message||sd?.error||'No se pudo recuperar la imagen');e.status=sr.status||500;throw e}
        fr=await fetch(signed,{cache:'no-store'});
      }
      if(!fr.ok){const e=new Error('No se pudo leer el archivo privado');e.status=fr.status;throw e}
      const bytes=Buffer.from(await fr.arrayBuffer());
      const serverMime=clean((fr.headers.get('content-type')||'').split(';')[0]).toLowerCase();
      const magicMime=sniffImageMime(bytes);const expected=inferredMime(storagePath);
      const mime=magicMime||(serverMime.startsWith('image/')&&!isGenericMime(serverMime)?serverMime:expected)||serverMime||'application/octet-stream';
      return {bytes,mime,magicMime,serverMime};
    };
    const migratePhotoToR2=async photo=>{
      if(!cfg||!photo||R2.isR2Path(photo.storage_path))return null;
      try{
        const src=await fetchSupabaseObject(photo.storage_path);
        if(!src.bytes.length||src.bytes.length>8*1024*1024||!src.mime.startsWith('image/'))return null;
        let bytes=src.bytes,mime=src.mime;
        if(['image/heic','image/heif'].includes(mime)){
          try{const convert=require('heic-convert');bytes=Buffer.from(await convert({buffer:bytes,format:'JPEG',quality:.9}));mime='image/jpeg'}
          catch(error){console.warn('Legacy HEIC migration skipped',error?.message||error);return null}
        }
        const objectKey=R2.objectKeyFor(photo.order_id,mime);
        const up=await R2.request(cfg,'PUT',objectKey,bytes,mime);
        if(!up.ok)return null;
        const newPath=`r2:${objectKey}`;
        await req(`service_order_photos?id=eq.${encodeURIComponent(String(photo.id))}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({storage_path:newPath,file_url:'private:r2'})});
        return {storage_path:newPath,key:objectKey,mime,bytes};
      }catch(e){console.warn('R2 lazy migration skipped',e?.message||e);return null}
    };
    const resolvePhoto=async storagePath=>{
      let photoRows=await req(`service_order_photos?select=id,order_id,storage_path,file_url,label&storage_path=eq.${encodeURIComponent(storagePath)}&limit=1`);
      let photo=photoRows?.[0];
      if(!photo)return null;
      if(!R2.isR2Path(photo.storage_path)){
        const migrated=await migratePhotoToR2(photo);
        if(migrated)photo={...photo,storage_path:migrated.storage_path,file_url:'private:r2'};
      }
      return photo;
    };

    if(action==='r2_status')return reply(200,{ok:true,enabled:Boolean(cfg),bucket:cfg?.bucket||null,provider:cfg?'cloudflare-r2-private':'supabase-fallback'});

    if(action==='file_upload_r2'){
      if(!cfg)return reply(501,{ok:false,error:'Cloudflare R2 privado de Soporte todavía no está configurado'});
      const orderId=clean(body.order_id);if(!orderId)return reply(400,{ok:false,error:'Falta la orden'});
      await ensureOrderAccess(orderId);
      const declaredMime=clean(body.mime).toLowerCase(),fileName=clean(body.file_name);
      const base64=clean(body.base64).replace(/^data:[^;]+;base64,/i,'');if(!base64)return reply(400,{ok:false,error:'Falta la imagen'});
      let bytes=Buffer.from(base64,'base64');
      if(!bytes.length||bytes.length>5.5*1024*1024)return reply(413,{ok:false,error:'La imagen original debe pesar máximo 5,5 MB'});
      let detected=sniffImageMime(bytes)||inferredMime(fileName)||declaredMime;
      if(!detected.startsWith('image/'))return reply(400,{ok:false,error:'El archivo no parece una imagen válida'});
      let storedMime=detected,converted=false;
      if(['image/heic','image/heif'].includes(detected)){
        try{
          const convert=require('heic-convert');
          bytes=Buffer.from(await convert({buffer:bytes,format:'JPEG',quality:.88}));
          storedMime='image/jpeg';converted=true;
        }catch(error){
          console.error('HEIC conversion failed',error);
          return reply(415,{ok:false,error:'No se pudo convertir la foto HEIC/HEIF. Vuelve a intentar o expórtala como JPG.',details:clean(error?.message).slice(0,240)});
        }
      }
      if(!['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(storedMime))return reply(415,{ok:false,error:'Formato de imagen no compatible. Usa JPG, PNG, WebP o HEIC/HEIF.'});
      if(!bytes.length||bytes.length>8*1024*1024)return reply(413,{ok:false,error:'La imagen convertida supera 8 MB'});
      const objectKey=R2.objectKeyFor(orderId,storedMime);
      const up=await R2.request(cfg,'PUT',objectKey,bytes,storedMime);
      if(!up.ok){const t=await up.text().catch(()=>'');return reply(up.status,{ok:false,error:'No se pudo guardar la imagen en Cloudflare R2',details:t.slice(0,300)})}
      return reply(200,{ok:true,provider:'cloudflare-r2-private',storage_path:`r2:${objectKey}`,object_key:objectKey,mime:storedMime,source_mime:detected,converted,size:bytes.length,url:R2.presignedGet(cfg,objectKey,3600)});
    }

    if(action==='payment_states'){
      const rows=await req('service_orders?select=id,payment_status,amount_paid,payment_method,payment_notes,paid_at,quote_amount,quote_currency,updated_at&order=updated_at.desc&limit=5000');
      return reply(200,{ok:true,orders:Array.isArray(rows)?rows:[]});
    }

    if(action==='file_url'||action==='file_data'||action==='file_preview'){
      const storagePath=clean(body.storage_path);if(!storagePath)return reply(400,{ok:false,error:'Falta la ruta del archivo'});
      const photo=await resolvePhoto(storagePath);if(!photo)return reply(404,{ok:false,error:'Archivo no registrado en esta orden'});
      if(R2.isR2Path(photo.storage_path)){
        if(!cfg)return reply(503,{ok:false,error:'La foto está en R2 pero falta la configuración privada de Cloudflare'});
        const objectKey=R2.keyFromStoragePath(photo.storage_path),mime=inferredMime(objectKey)||'image/jpeg';
        if(action==='file_preview'){
          const proxied=mediaProxyUrl(photo.storage_path,3600);
          if(proxied)return reply(200,{ok:true,url:proxied,preview:true,transformed:false,mime,is_image:true,expires_in:3600,provider:'thinkstore-private-proxy'});
        }
        if(action==='file_data'){
          const fr=await R2.request(cfg,'GET',objectKey,Buffer.alloc(0),'application/octet-stream');
          if(!fr.ok)return reply(fr.status,{ok:false,error:'No se pudo leer la imagen privada de R2'});
          let bytes=Buffer.from(await fr.arrayBuffer());let finalMime=sniffImageMime(bytes)||mime;
          if(['image/heic','image/heif'].includes(finalMime)){
            try{const convert=require('heic-convert');bytes=Buffer.from(await convert({buffer:bytes,format:'JPEG',quality:.9}));finalMime='image/jpeg'}catch(_){}
          }
          if(bytes.length>8*1024*1024)return reply(413,{ok:false,error:'La imagen supera 8 MB',is_image:finalMime.startsWith('image/'),mime:finalMime});
          return reply(200,{ok:true,data_url:`data:${finalMime};base64,${bytes.toString('base64')}`,mime:finalMime,size:bytes.length,is_image:finalMime.startsWith('image/'),provider:'cloudflare-r2-private'});
        }
        const signed=R2.presignedGet(cfg,objectKey,3600);
        return reply(200,{ok:true,url:signed,preview:false,transformed:false,mime,is_image:true,expires_in:3600,provider:'cloudflare-r2-private'});
      }

      const encoded=encodePath(photo.storage_path),expectedMime=inferredMime(photo.storage_path);
      const sign=async(transform=null,expiresIn=3600)=>{
        const payload={expiresIn,...(transform?{transform}:{})};
        const sr=await fetch(`${url}/storage/v1/object/sign/service-order-files/${encoded}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const sd=await sr.json().catch(()=>({}));const signed=absoluteSigned(url,clean(sd.signedURL||sd.signedUrl));
        if(!sr.ok||!signed){const e=new Error(sd?.message||sd?.error||'No se pudo generar el enlace seguro');e.status=sr.status;throw e}return signed;
      };
      if(action==='file_preview'){
        const proxied=mediaProxyUrl(photo.storage_path,3600);
        if(proxied)return reply(200,{ok:true,url:proxied,preview:true,transformed:false,mime:expectedMime||'image/jpeg',is_image:true,expires_in:3600,provider:'thinkstore-private-proxy'});
        try{const signed=await sign(null,3600);return reply(200,{ok:true,url:signed,preview:true,transformed:false,mime:expectedMime||'image/jpeg',expires_in:3600,provider:'supabase'});}catch(error){return reply(error.status||409,{ok:false,error:error.message||'Vista previa no disponible'})}
      }
      if(action==='file_data'){
        const src=await fetchSupabaseObject(photo.storage_path);if(src.bytes.length>8*1024*1024)return reply(413,{ok:false,error:'La imagen supera 8 MB',is_image:src.mime.startsWith('image/'),mime:src.mime});
        return reply(200,{ok:true,data_url:`data:${src.mime};base64,${src.bytes.toString('base64')}`,mime:src.mime,size:src.bytes.length,is_image:src.mime.startsWith('image/'),detected_by:src.magicMime?'magic':'header'});
      }
      const signed=await sign(null,3600);return reply(200,{ok:true,url:signed,expires_in:3600,inline:true,provider:'supabase'});
    }

    if(action==='notify_repair_update'){
      const orderId=clean(body.order_id);if(!orderId)return reply(400,{ok:false,error:'Falta la orden'});
      await ensureOrderAccess(orderId);
      const rows=await req(`service_orders?select=*&id=eq.${encodeURIComponent(orderId)}&limit=1`);
      const o=rows?.[0];if(!o)return reply(404,{ok:false,error:'Orden no encontrada'});if(!o.client_email)return reply(400,{ok:false,error:'La orden no tiene correo del cliente'});
      const update=body.update&&typeof body.update==='object'?body.update:{};
      const mail=repairUpdateEmail(o,{title:clean(update.title),summary:clean(update.summary),diagnosis:clean(update.diagnosis),work_performed:clean(update.work_performed),parts_used:clean(update.parts_used),tests_performed:clean(update.tests_performed),client_notes:clean(update.client_notes),status:clean(update.status),author:clean(update.author)||clean(profile.nombre)||clean(user.email)});
      const ed=await sendResend({to:o.client_email,subject:mail.subject,html:mail.html,text:mail.text});
      await req('service_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:user.email,actor_role:profile.rol,action:'notify_repair_update',entity_type:'service_order',entity_id:String(o.id),after_data:{recipient:o.client_email,provider_id:ed.id||null,title:clean(update.title),status:clean(update.status)||o.status}})});
      return reply(200,{ok:true,email:{sent:true,id:ed.id||null,subject:mail.subject}});
    }
    if(action!=='notify_client')return reply(400,{ok:false,error:'Acción no válida'});
    const rows=await req(`service_orders?select=*&id=eq.${encodeURIComponent(clean(body.order_id))}&limit=1`);
    const o=rows?.[0];if(!o)return reply(404,{ok:false,error:'Orden no encontrada'});if(!o.client_email)return reply(400,{ok:false,error:'La orden no tiene correo del cliente'});
    const mail=statusClientEmail(o);const ed=await sendResend({to:o.client_email,subject:mail.subject,html:mail.html,text:mail.text});
    await req('service_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:user.email,actor_role:profile.rol,action:'notify_client',entity_type:'service_order',entity_id:String(o.id),after_data:{recipient:o.client_email,provider_id:ed.id||null,status:o.status,quote_status:o.quote_status||null}})});
    return reply(200,{ok:true,email:{sent:true,id:ed.id||null,subject:mail.subject}});
  }catch(error){console.error('Support actions',error);return reply(error.status||500,{ok:false,error:error.message||'Error interno'});}
};
