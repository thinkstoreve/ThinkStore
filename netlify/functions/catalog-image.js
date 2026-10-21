const crypto=require('crypto');
const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'POST,OPTIONS'};
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return {statusCode:200,headers:H,body:''};
  if(event.httpMethod!=='POST')return r(405,{ok:false,error:'Método no permitido'});
  const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const service=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  if(!url||!service)return r(501,{ok:false,error:'Faltan variables de Supabase'});
  const auth=await authorizeAdmin(event,url,service); if(!auth.ok)return r(401,{ok:false,error:'Acceso administrador no autorizado'});
  const cfg=r2Config(); if(!cfg)return r(501,{ok:false,error:'Cloudflare R2 no está configurado. Revisa R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET_NAME y R2_PUBLIC_URL en Netlify.'});
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return r(400,{ok:false,error:'JSON inválido'})}
  const mime=String(body.mime||'').toLowerCase(); if(!['image/jpeg','image/png','image/webp'].includes(mime))return r(400,{ok:false,error:'Formato no permitido. Usa JPG, PNG o WEBP.'});
  const base64=String(body.base64||'').replace(/^data:[^;]+;base64,/,''); if(!base64)return r(400,{ok:false,error:'Imagen requerida'});
  let buf;try{buf=Buffer.from(base64,'base64')}catch{return r(400,{ok:false,error:'Imagen inválida'})}
  if(!buf.length||buf.length>4*1024*1024)return r(413,{ok:false,error:'La imagen optimizada debe pesar máximo 4 MB'});
  const key=slug(body.product_key||body.product_name||'producto');
  const ext=mime==='image/webp'?'webp':mime==='image/png'?'png':'jpg';
  const objectKey=`catalog/${key}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  try{
    const up=await r2Request(cfg,'PUT',objectKey,buf,mime);
    if(!up.ok){const t=await up.text().catch(()=>'');return r(up.status,{ok:false,error:'No se pudo subir la imagen a Cloudflare R2',details:t.slice(0,500)})}
    const image_url=`${cfg.publicUrl}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
    return r(200,{ok:true,image_url,path:`r2:${objectKey}`,object_key:objectKey,bytes:buf.length,format:ext,provider:'cloudflare-r2'});
  }catch(e){return r(500,{ok:false,error:'Error conectando con Cloudflare R2',details:String(e?.message||e)})}
};
function r2Config(){const accountId=String(process.env.R2_ACCOUNT_ID||'').trim(),accessKey=String(process.env.R2_ACCESS_KEY_ID||'').trim(),secretKey=String(process.env.R2_SECRET_ACCESS_KEY||'').trim(),bucket=String(process.env.R2_BUCKET_NAME||'').trim(),publicUrl=String(process.env.R2_PUBLIC_URL||'').trim().replace(/\/$/,'');return accountId&&accessKey&&secretKey&&bucket&&publicUrl?{accountId,accessKey,secretKey,bucket,publicUrl}:null}
async function r2Request(cfg,method,key,body=Buffer.alloc(0),contentType='application/octet-stream'){
  const host=`${cfg.accountId}.r2.cloudflarestorage.com`;
  const encodedKey=key.split('/').map(encodeURIComponent).join('/');
  const canonicalUri=`/${encodeURIComponent(cfg.bucket)}/${encodedKey}`;
  const now=new Date(),amzDate=now.toISOString().replace(/[:-]|\.\d{3}/g,''),dateStamp=amzDate.slice(0,8);
  const payloadHash=crypto.createHash('sha256').update(body).digest('hex');
  const canonicalHeaders=`content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders='content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest=[method,canonicalUri,'',canonicalHeaders,signedHeaders,payloadHash].join('\n');
  const scope=`${dateStamp}/auto/s3/aws4_request`;
  const stringToSign=['AWS4-HMAC-SHA256',amzDate,scope,crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  const kDate=hmac(Buffer.from('AWS4'+cfg.secretKey),dateStamp),kRegion=hmac(kDate,'auto'),kService=hmac(kRegion,'s3'),kSigning=hmac(kService,'aws4_request');
  const signature=hmac(kSigning,stringToSign,'hex');
  const authorization=`AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return fetch(`https://${host}${canonicalUri}`,{method,headers:{'Content-Type':contentType,'Host':host,'x-amz-date':amzDate,'x-amz-content-sha256':payloadHash,'Authorization':authorization},body:method==='GET'||method==='HEAD'?undefined:body});
}
function hmac(key,data,enc){return crypto.createHmac('sha256',key).update(data).digest(enc)}
function slug(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'producto'}
function r(statusCode,body){return{statusCode,headers:H,body:JSON.stringify(body)}}
async function authorizeAdmin(event,url,service){const legacy=String(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']||'').trim();const allowed=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String);if(legacy&&allowed.includes(legacy))return{ok:true,mode:'legacy'};const token=String(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');if(!token)return{ok:false};const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});const u=await ur.json().catch(()=>({}));if(!ur.ok||!u.id)return{ok:false};const pr=await fetch(`${url}/rest/v1/profiles?select=id,role,active&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:{apikey:service,Authorization:`Bearer ${service}`}});const rows=await pr.json().catch(()=>[]),p=rows[0],role=String(p?.role||'').toLowerCase();if(!p||p.active===false||!['admin','super_admin','superadmin','administrator','gerente'].includes(role))return{ok:false};return{ok:true,user_id:u.id,role}}
