import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(body)});
const cleanPart=(value,fallback='')=>{const v=String(value||fallback).trim().replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'');return v.slice(0,120)};
async function validateSupabaseSession(authHeader){
 const url=process.env.THINKSTORE_SUPABASE_URL||process.env.SUPABASE_URL;const key=process.env.THINKSTORE_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('SUPABASE_SERVER_ENV_MISSING');if(!authHeader?.startsWith('Bearer '))return false;
 const base=url.replace(/\/$/,'');const headers={Authorization:authHeader,apikey:key};const response=await fetch(`${base}/auth/v1/user`,{headers});if(!response.ok)return false;const user=await response.json();if(!user?.id)return false;
 const email=String(user.email||'').toLowerCase(),role=String(user.app_metadata?.inventory_role||'').toLowerCase();if(email==='thinkstore.ve@gmail.com'||role==='super_admin'||role==='admin')return true;const access=await fetch(`${base}/rest/v1/thinkstore_inventory_users?select=user_id,active,role&user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&limit=1`,{headers});if(!access.ok)return false;const rows=await access.json();return Array.isArray(rows)&&rows.length>0;
}
export const handler=async(event)=>{
 if(event.httpMethod!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
 try{
  const authHeader=event.headers?.authorization||event.headers?.Authorization||'';if(!(await validateSupabaseSession(authHeader)))return json(401,{error:'AUTH_REQUIRED'});
  const accountId=process.env.R2_ACCOUNT_ID,accessKeyId=process.env.R2_ACCESS_KEY_ID,secretAccessKey=process.env.R2_SECRET_ACCESS_KEY,bucket=process.env.R2_BUCKET_NAME,publicBase=String(process.env.R2_PUBLIC_BASE_URL||'').replace(/\/$/,'');
  const basePrefix=String(process.env.R2_KEY_PREFIX||'thinkstore/inventory').split('/').map(part=>cleanPart(part)).filter(Boolean).join('/')||'thinkstore/inventory';
  if(!accountId||!accessKeyId||!secretAccessKey||!bucket||!publicBase)return json(503,{error:'R2_SERVER_ENV_MISSING'});
  const body=JSON.parse(event.body||'{}'),workspace=cleanPart(body.workspace||'main','main'),folder=cleanPart(body.folder),itemId=cleanPart(body.itemId),dataUrl=String(body.dataUrl||'');
  if(!new Set(['products','furniture','profiles','service-parts']).has(folder)||!itemId)return json(400,{error:'INVALID_MEDIA_PATH'});
  const match=dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s);if(!match)return json(400,{error:'INVALID_MEDIA_DATA'});
  const mime=match[1],buffer=Buffer.from(match[2],'base64');if(!buffer.length||buffer.length>3.5*1024*1024)return json(400,{error:'INVALID_MEDIA_SIZE'});
  const ext=mime==='image/webp'?'webp':mime==='image/jpeg'?'jpg':'png',key=`${basePrefix}/${workspace}/${folder}/${itemId}.${ext}`;
  const client=new S3Client({region:'auto',endpoint:`https://${accountId}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey}});
  await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:buffer,ContentType:mime,CacheControl:'public, max-age=31536000, immutable'}));
  return json(200,{publicUrl:`${publicBase}/${key}?v=${Date.now()}`,key,size:buffer.length});
 }catch(error){return json(500,{error:error?.message||'R2_UPLOAD_FAILED'})}
};
