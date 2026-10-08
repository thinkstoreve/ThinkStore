'use strict';
const {statusClientEmail,sendResend}=require('./support-mail-ui');
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'},body:JSON.stringify(body)});
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
    const req=async(path,options={})=>{const r=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...h,...(options.headers||{})}});const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}if(!r.ok)throw new Error(d?.message||`Error ${r.status}`);return d};
    const profiles=await req(`service_users?select=*&email=ilike.${encodeURIComponent(user.email)}&limit=1`);
    const profile=profiles?.[0];
    if(!profile||profile.activo===false)return reply(403,{ok:false,error:'Usuario de soporte no autorizado'});
    const body=JSON.parse(event.body||'{}');
    const action=clean(body.action);

    if(action==='payment_states'){
      const rows=await req('service_orders?select=id,payment_status,amount_paid,payment_method,payment_notes,paid_at,quote_amount,quote_currency,updated_at&order=updated_at.desc&limit=5000');
      return reply(200,{ok:true,orders:Array.isArray(rows)?rows:[]});
    }

    if(action==='file_url'||action==='file_data'||action==='file_preview'){
      const storagePath=clean(body.storage_path);
      if(!storagePath)return reply(400,{ok:false,error:'Falta la ruta del archivo'});
      const photoRows=await req(`service_order_photos?select=id,order_id,storage_path,label&storage_path=eq.${encodeURIComponent(storagePath)}&limit=1`);
      if(!photoRows?.[0])return reply(404,{ok:false,error:'Archivo no registrado en esta orden'});
      const encodePath=v=>String(v||'').split('/').map(encodeURIComponent).join('/');
      const encoded=encodePath(storagePath),expectedMime=inferredMime(storagePath);
      const sign=async(transform=null,expiresIn=3600)=>{
        const payload={expiresIn,...(transform?{transform}:{})};
        const sr=await fetch(`${url}/storage/v1/object/sign/service-order-files/${encoded}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const sd=await sr.json().catch(()=>({}));
        const signed=absoluteSigned(url,clean(sd.signedURL||sd.signedUrl));
        if(!sr.ok||!signed){const e=new Error(sd?.message||sd?.error||'No se pudo generar el enlace seguro');e.status=sr.status;throw e}
        return signed;
      };
      if(action==='file_preview'){
        try{
          const signed=await sign({width:1800,height:1800,resize:'contain',quality:84},3600);
          const check=await fetch(signed,{cache:'no-store'});
          const ct=clean((check.headers.get('content-type')||'').split(';')[0]).toLowerCase();
          if(!check.ok||!ct.startsWith('image/')){try{await check.body?.cancel?.()}catch(_){};const e=new Error('La transformación de imagen no está disponible en este proyecto');e.status=409;throw e}
          try{await check.body?.cancel?.()}catch(_){}
          return reply(200,{ok:true,url:signed,preview:true,transformed:true,mime:ct,expires_in:3600});
        }catch(error){return reply(error.status||409,{ok:false,error:error.message||'La vista previa transformada no está disponible'})}
      }
      if(action==='file_data'){
        let fr=await fetch(`${url}/storage/v1/object/authenticated/service-order-files/${encoded}`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
        if(!fr.ok){
          let signed;try{signed=await sign(null,300)}catch(error){return reply(error.status||500,{ok:false,error:error.message||'No se pudo recuperar la imagen'})}
          fr=await fetch(signed);
        }
        if(!fr.ok)return reply(fr.status,{ok:false,error:'No se pudo leer el archivo privado'});
        const ab=await fr.arrayBuffer();
        const bytes=Buffer.from(ab);
        const serverMime=clean((fr.headers.get('content-type')||'').split(';')[0]).toLowerCase();
        const magicMime=sniffImageMime(bytes);
        const mime=magicMime||(serverMime.startsWith('image/')&&!isGenericMime(serverMime)?serverMime:expectedMime)||serverMime||'application/octet-stream';
        if(ab.byteLength>5*1024*1024)return reply(413,{ok:false,error:'La imagen supera 5 MB. Se intentará una vista previa optimizada.',is_image:Boolean(magicMime||mime.startsWith('image/')),mime});
        const dataUrl=`data:${mime};base64,${bytes.toString('base64')}`;
        return reply(200,{ok:true,data_url:dataUrl,mime,size:ab.byteLength,is_image:Boolean(magicMime||mime.startsWith('image/')),detected_by:magicMime?'magic':serverMime.startsWith('image/')?'header':expectedMime?'extension':'unknown',inferred_mime:expectedMime||null});
      }
      const sr=await fetch(`${url}/storage/v1/object/sign/service-order-files/${encoded}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});
      const sd=await sr.json().catch(()=>({}));
      if(!sr.ok)return reply(sr.status,{ok:false,error:sd?.message||sd?.error||'No se pudo generar el enlace seguro'});
      const signed=absoluteSigned(url,clean(sd.signedURL||sd.signedUrl));
      if(!signed)return reply(500,{ok:false,error:'Supabase no devolvió una URL firmada'});
      return reply(200,{ok:true,url:signed,expires_in:3600,inline:true});
    }

    if(action!=='notify_client')return reply(400,{ok:false,error:'Acción no válida'});
    const rows=await req(`service_orders?select=*&id=eq.${encodeURIComponent(clean(body.order_id))}&limit=1`);
    const o=rows?.[0];
    if(!o)return reply(404,{ok:false,error:'Orden no encontrada'});
    if(!o.client_email)return reply(400,{ok:false,error:'La orden no tiene correo del cliente'});

    const mail=statusClientEmail(o);
    const ed=await sendResend({to:o.client_email,subject:mail.subject,html:mail.html,text:mail.text});
    await req('service_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:user.email,actor_role:profile.rol,action:'notify_client',entity_type:'service_order',entity_id:String(o.id),after_data:{recipient:o.client_email,provider_id:ed.id||null,status:o.status,quote_status:o.quote_status||null}})});
    return reply(200,{ok:true,email:{sent:true,id:ed.id||null,subject:mail.subject}});
  }catch(error){
    console.error('Support actions',error);
    return reply(500,{ok:false,error:error.message||'Error interno'});
  }
};
