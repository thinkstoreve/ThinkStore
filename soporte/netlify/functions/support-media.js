'use strict';
const crypto=require('crypto');
const R2=require('./support-r2');
const clean=v=>String(v??'').trim();
const encodePath=v=>String(v||'').split('/').map(encodeURIComponent).join('/');
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
function signingSecret(){return clean(process.env.SUPPORT_MEDIA_SIGNING_SECRET||process.env.SUPPORT_R2_SECRET_ACCESS_KEY||process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY)}
function safeEqual(a,b){try{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)}catch{return false}}
function response(statusCode,body='',headers={}){return{statusCode,headers:{'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff',...headers},body,isBase64Encoded:true}}
exports.handler=async event=>{
  if(event.httpMethod!=='GET')return{statusCode:405,body:'Method not allowed'};
  try{
    const p=clean(event.queryStringParameters?.p),e=Number(event.queryStringParameters?.e||0),s=clean(event.queryStringParameters?.s),secret=signingSecret();
    if(!p||!e||!s||!secret)return{statusCode:403,body:'Forbidden'};
    if(e<Math.floor(Date.now()/1000)||e>Math.floor(Date.now()/1000)+3700)return{statusCode:403,body:'Expired'};
    const expected=crypto.createHmac('sha256',secret).update(`${p}.${e}`).digest('hex');
    if(!safeEqual(s,expected))return{statusCode:403,body:'Forbidden'};
    const storagePath=Buffer.from(p,'base64url').toString('utf8');
    let bytes,mime='';
    if(R2.isR2Path(storagePath)){
      const cfg=R2.config();if(!cfg)return{statusCode:503,body:'R2 not configured'};
      const key=R2.keyFromStoragePath(storagePath);
      const fr=await R2.request(cfg,'GET',key,Buffer.alloc(0),'application/octet-stream');
      if(!fr.ok)return{statusCode:fr.status,body:'Unable to load image'};
      bytes=Buffer.from(await fr.arrayBuffer());mime=sniffImageMime(bytes)||inferredMime(key)||clean(fr.headers.get('content-type'))||'application/octet-stream';
    }else{
      const url=clean(process.env.SUPPORT_SUPABASE_URL||process.env.SUPABASE_URL).replace(/\/$/,'');
      const key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
      if(!url||!key)return{statusCode:503,body:'Storage not configured'};
      const encoded=encodePath(storagePath);
      const fr=await fetch(`${url}/storage/v1/object/authenticated/service-order-files/${encoded}`,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
      if(!fr.ok)return{statusCode:fr.status,body:'Unable to load image'};
      bytes=Buffer.from(await fr.arrayBuffer());mime=sniffImageMime(bytes)||clean((fr.headers.get('content-type')||'').split(';')[0])||inferredMime(storagePath)||'application/octet-stream';
    }
    if(!bytes?.length)return{statusCode:404,body:'Image unavailable'};
    if(bytes.length>9*1024*1024)return{statusCode:413,body:'Image too large'};
    if(['image/heic','image/heif'].includes(mime)){
      const convert=require('heic-convert');bytes=Buffer.from(await convert({buffer:bytes,format:'JPEG',quality:.9}));mime='image/jpeg';
    }
    if(!mime.startsWith('image/'))return{statusCode:415,body:'Not an image'};
    return response(200,bytes.toString('base64'),{'Content-Type':mime,'Content-Disposition':'inline'});
  }catch(error){console.error('support-media',error);return{statusCode:500,body:'Unable to load image'}}
};
