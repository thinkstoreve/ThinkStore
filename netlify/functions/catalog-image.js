const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'POST,OPTIONS'};
exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return {statusCode:200,headers:H,body:''};
  if(event.httpMethod!=='POST')return r(405,{ok:false,error:'Método no permitido'});
  const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const service=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
  if(!url||!service)return r(501,{ok:false,error:'Faltan variables de Supabase'});
  const auth=await authorizeAdmin(event,url,service);
  if(!auth.ok)return r(401,{ok:false,error:'Acceso administrador no autorizado'});
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return r(400,{ok:false,error:'JSON inválido'})}
  const mime=String(body.mime||'').toLowerCase();
  const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  if(!allowed[mime])return r(400,{ok:false,error:'Formato no permitido. Usa JPG, PNG o WEBP.'});
  const base64=String(body.base64||'').replace(/^data:[^;]+;base64,/, '');
  if(!base64)return r(400,{ok:false,error:'Imagen requerida'});
  let buf;try{buf=Buffer.from(base64,'base64')}catch{return r(400,{ok:false,error:'Imagen inválida'})}
  if(!buf.length||buf.length>4*1024*1024)return r(413,{ok:false,error:'La imagen debe pesar máximo 4 MB'});
  const key=slug(body.product_key||body.product_name||'producto');
  const file=`${key}-${Date.now()}.${allowed[mime]}`;
  const path=`catalog-products/${file}`;
  const up=await fetch(`${url}/storage/v1/object/${path}`,{method:'POST',headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':mime,'x-upsert':'true'},body:buf});
  const data=await up.json().catch(()=>({}));
  if(!up.ok)return r(up.status,{ok:false,error:data?.message||data?.error||'No se pudo subir la imagen'});
  const public_url=`${url}/storage/v1/object/public/${path}`;
  return r(200,{ok:true,image_url:public_url,path});
};
function slug(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'producto'}
function r(statusCode,body){return{statusCode,headers:H,body:JSON.stringify(body)}}
async function authorizeAdmin(event,url,service){
  const legacy=String(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']||'').trim();
  const allowed=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String);
  if(legacy&&allowed.includes(legacy))return{ok:true,mode:'legacy'};
  const token=String(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');if(!token)return{ok:false};
  const ur=await fetch(`${url}/auth/v1/user`,{headers:{apikey:service,Authorization:`Bearer ${token}`}});const u=await ur.json().catch(()=>({}));if(!ur.ok||!u.id)return{ok:false};
  const pr=await fetch(`${url}/rest/v1/profiles?select=id,role,active&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:{apikey:service,Authorization:`Bearer ${service}`}});const rows=await pr.json().catch(()=>[]),p=rows[0],role=String(p?.role||'').toLowerCase();
  if(!p||p.active===false||!['admin','super_admin','superadmin','administrator','gerente'].includes(role))return{ok:false};return{ok:true,user_id:u.id,role};
}
