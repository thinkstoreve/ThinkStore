'use strict';
const crypto=require('crypto');

function clean(v){return String(v??'').trim()}
function rfc3986(v){return encodeURIComponent(String(v)).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}
function encodeKey(key){return String(key||'').split('/').map(rfc3986).join('/')}
function hmac(key,data,enc){return crypto.createHmac('sha256',key).update(data).digest(enc)}
function sha256(data){return crypto.createHash('sha256').update(data).digest('hex')}

function config(){
  const accountId=clean(process.env.SUPPORT_R2_ACCOUNT_ID||process.env.R2_ACCOUNT_ID);
  const accessKey=clean(process.env.SUPPORT_R2_ACCESS_KEY_ID||process.env.R2_ACCESS_KEY_ID);
  const secretKey=clean(process.env.SUPPORT_R2_SECRET_ACCESS_KEY||process.env.R2_SECRET_ACCESS_KEY);
  const bucket=clean(process.env.SUPPORT_R2_BUCKET_NAME);
  return accountId&&accessKey&&secretKey&&bucket?{accountId,accessKey,secretKey,bucket}:null;
}
function host(cfg){return `${cfg.accountId}.r2.cloudflarestorage.com`}
function canonicalUri(cfg,key){return `/${rfc3986(cfg.bucket)}/${encodeKey(key)}`}
function objectUrl(cfg,key){return `https://${host(cfg)}${canonicalUri(cfg,key)}`}

async function request(cfg,method,key,body=Buffer.alloc(0),contentType='application/octet-stream'){
  const hst=host(cfg),uri=canonicalUri(cfg,key);
  const now=new Date(),amzDate=now.toISOString().replace(/[:-]|\.\d{3}/g,''),dateStamp=amzDate.slice(0,8);
  const payloadHash=sha256(body);
  const canonicalHeaders=`content-type:${contentType}\nhost:${hst}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders='content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest=[method,uri,'',canonicalHeaders,signedHeaders,payloadHash].join('\n');
  const scope=`${dateStamp}/auto/s3/aws4_request`;
  const stringToSign=['AWS4-HMAC-SHA256',amzDate,scope,sha256(canonicalRequest)].join('\n');
  const kDate=hmac(Buffer.from('AWS4'+cfg.secretKey),dateStamp),kRegion=hmac(kDate,'auto'),kService=hmac(kRegion,'s3'),kSigning=hmac(kService,'aws4_request');
  const signature=hmac(kSigning,stringToSign,'hex');
  const authorization=`AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return fetch(`https://${hst}${uri}`,{method,headers:{'Content-Type':contentType,'Host':hst,'x-amz-date':amzDate,'x-amz-content-sha256':payloadHash,'Authorization':authorization},body:['GET','HEAD'].includes(method)?undefined:body});
}

function presignedGet(cfg,key,expires=3600){
  expires=Math.max(60,Math.min(604800,Number(expires)||3600));
  const hst=host(cfg),uri=canonicalUri(cfg,key);
  const now=new Date(),amzDate=now.toISOString().replace(/[:-]|\.\d{3}/g,''),dateStamp=amzDate.slice(0,8);
  const scope=`${dateStamp}/auto/s3/aws4_request`;
  const query={
    'X-Amz-Algorithm':'AWS4-HMAC-SHA256',
    'X-Amz-Credential':`${cfg.accessKey}/${scope}`,
    'X-Amz-Date':amzDate,
    'X-Amz-Expires':String(expires),
    'X-Amz-SignedHeaders':'host'
  };
  const canonicalQuery=Object.keys(query).sort().map(k=>`${rfc3986(k)}=${rfc3986(query[k])}`).join('&');
  const canonicalHeaders=`host:${hst}\n`;
  const canonicalRequest=['GET',uri,canonicalQuery,canonicalHeaders,'host','UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign=['AWS4-HMAC-SHA256',amzDate,scope,sha256(canonicalRequest)].join('\n');
  const kDate=hmac(Buffer.from('AWS4'+cfg.secretKey),dateStamp),kRegion=hmac(kDate,'auto'),kService=hmac(kRegion,'s3'),kSigning=hmac(kService,'aws4_request');
  const signature=hmac(kSigning,stringToSign,'hex');
  return `https://${hst}${uri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function extensionForMime(mime=''){
  const m=clean(mime).toLowerCase();
  return m==='image/webp'?'webp':m==='image/png'?'png':m==='image/gif'?'gif':m==='image/avif'?'avif':m==='image/jpeg'?'jpg':m==='application/pdf'?'pdf':'bin';
}
function objectKeyFor(orderId,mime='image/webp'){
  const safe=clean(orderId).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100)||'order';
  return `support/orders/${safe}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extensionForMime(mime)}`;
}
function keyFromStoragePath(path=''){
  const p=clean(path);return p.startsWith('r2:')?p.slice(3):'';
}
function isR2Path(path=''){return clean(path).startsWith('r2:')}

module.exports={config,request,presignedGet,objectKeyFor,keyFromStoragePath,isR2Path,extensionForMime,objectUrl};
