'use strict';
const R2=require('./support-r2');
const clean=v=>String(v??'').trim();
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'},body:JSON.stringify(body)});
const IMAGE_MIME_BY_EXT={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',avif:'image/avif',heic:'image/heic',heif:'image/heif',tif:'image/tiff',tiff:'image/tiff'};
const inferredMime=path=>IMAGE_MIME_BY_EXT[(String(path||'').split('.').pop()||'').toLowerCase()]||'';
function sniffImageMime(buffer){
  const b=Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer||[]);
  if(b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)return 'image/jpeg';
  if(b.length>=8&&b.slice(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))return 'image/png';
  if(b.length>=12&&b.slice(0,4).toString('ascii')==='RIFF'&&b.slice(8,12).toString('ascii')==='WEBP')return 'image/webp';
  if(b.length>=6&&['GIF87a','GIF89a'].includes(b.slice(0,6).toString('ascii')))return 'image/gif';
  if(b.length>=2&&b[0]===0x42&&b[1]===0x4d)return 'image/bmp';
  if(b.length>=12&&b.slice(4,8).toString('ascii')==='ftyp'){
    const brand=b.slice(8,12).toString('ascii').toLowerCase();
    if(['heic','heix','hevc','hevx','heim','heis','mif1','msf1'].includes(brand))return 'image/heic';
    if(['avif','avis'].includes(brand))return 'image/avif';
  }
  return '';
}

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return reply(200,{ok:true});
  if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Método no permitido'});
  const supabaseUrl=clean(process.env.SUPPORT_SUPABASE_URL||process.env.SUPABASE_URL).replace(/\/$/,'');
  const serviceKey=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
  const cfg=R2.config();
  if(!supabaseUrl||!serviceKey)return reply(501,{ok:false,error:'Faltan las variables de Supabase de Soporte en Netlify'});
  if(!cfg)return reply(501,{ok:false,error:'Cloudflare R2 privado de Servicio Técnico no está configurado'});
  try{
    const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');
    if(!token)return reply(401,{ok:false,error:'Sesión requerida'});
    const ur=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:serviceKey,Authorization:`Bearer ${token}`}});
    const user=await ur.json().catch(()=>({}));
    if(!ur.ok||!user.email)return reply(401,{ok:false,error:'Sesión inválida'});
    const h={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'};
    const req=async(path,options={})=>{const r=await fetch(`${supabaseUrl}/rest/v1/${path}`,{...options,headers:{...h,...(options.headers||{})}});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok){const e=new Error(d?.message||`Error ${r.status}`);e.status=r.status;throw e}return d};
    const profiles=await req(`service_users?select=*&email=ilike.${encodeURIComponent(user.email)}&limit=1`);
    const profile=profiles?.[0];
    if(!profile||profile.activo===false)return reply(403,{ok:false,error:'Usuario de servicio técnico no autorizado'});

    const body=JSON.parse(event.body||'{}');
    const orderId=clean(body.order_id);
    if(!orderId)return reply(400,{ok:false,error:'Falta la orden'});
    const orders=await req(`service_orders?select=id,assigned_technician_email&id=eq.${encodeURIComponent(orderId)}&limit=1`);
    const order=orders?.[0];
    if(!order)return reply(404,{ok:false,error:'Orden no encontrada'});
    if(clean(profile.rol).toLowerCase()==='technician'){
      const assigned=clean(order.assigned_technician_email).toLowerCase();
      if(assigned&&assigned!==clean(user.email).toLowerCase())return reply(403,{ok:false,error:'Esta orden está asignada a otro técnico'});
    }

    const fileName=clean(body.file_name)||'imagen';
    const declaredMime=clean(body.mime).toLowerCase();
    const base64=clean(body.base64).replace(/^data:[^;]+;base64,/i,'');
    if(!base64)return reply(400,{ok:false,error:'Falta la imagen'});
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
        return reply(415,{ok:false,error:'No se pudo convertir la foto HEIC/HEIF. Intenta nuevamente o expórtala como JPG.',details:clean(error?.message).slice(0,220)});
      }
    }
    if(!['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(storedMime))return reply(415,{ok:false,error:'Formato no compatible. Usa JPG, PNG, WebP o HEIC/HEIF.'});
    const objectKey=R2.objectKeyFor(orderId,storedMime);
    const up=await R2.request(cfg,'PUT',objectKey,bytes,storedMime);
    if(!up.ok){const details=(await up.text().catch(()=>'' )).slice(0,300);return reply(up.status,{ok:false,error:'Cloudflare R2 rechazó la carga',details})}
    return reply(200,{ok:true,provider:'cloudflare-r2-private',storage_path:`r2:${objectKey}`,object_key:objectKey,mime:storedMime,source_mime:detected,converted,size:bytes.length});
  }catch(error){
    console.error('support-r2-upload',error);
    return reply(error.status||500,{ok:false,error:error.message||'No se pudo subir la imagen'});
  }
};
