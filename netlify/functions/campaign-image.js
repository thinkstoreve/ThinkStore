'use strict';

exports.handler = async function(event) {
  const headers={
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Headers':'Content-Type, x-admin-secret, Authorization',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Content-Type':'application/json'
  };
  const reply=(status,body)=>({statusCode:status,headers,body:JSON.stringify(body)});
  if(event.httpMethod==='OPTIONS') return reply(200,{ok:true});
  if(event.httpMethod!=='POST') return reply(405,{ok:false,error:'Método no permitido'});

  const clean=v=>String(v||'').trim();
  const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const SUPABASE_URL=clean(process.env.SUPABASE_URL).replace(/\/$/,'');
  const SERVICE=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!SUPABASE_URL||!SERVICE) return reply(501,{ok:false,error:'Faltan variables de Supabase en Netlify.'});

  async function authorized(){
    const secret=clean(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']);
    const valid=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].map(clean).filter(Boolean);
    if(secret&&valid.includes(secret)) return true;
    const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');
    if(!token)return false;
    try{
      const ur=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SERVICE,Authorization:`Bearer ${token}`}});
      const u=await ur.json().catch(()=>({})); if(!ur.ok||!u.id)return false;
      const pr=await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:{apikey:SERVICE,Authorization:`Bearer ${SERVICE}`}});
      const rows=await pr.json().catch(()=>[]),p=Array.isArray(rows)?rows[0]:null;
      return !!(pr.ok&&p&&(p.active??p.activo??true)!==false&&['admin','super_admin','superadmin','administrator','gerente','marketing'].includes(norm(p.role||p.rol)));
    }catch{return false}
  }
  if(!(await authorized())) return reply(401,{ok:false,error:'Acceso administrador no autorizado'});

  let body={}; try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{ok:false,error:'JSON inválido'})}
  const type=clean(body.type).toLowerCase();
  if(!['image/jpeg','image/png','image/webp'].includes(type)) return reply(400,{ok:false,error:'Formato de imagen no permitido.'});
  const data=clean(body.data); const m=data.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/i);
  if(!m) return reply(400,{ok:false,error:'Imagen inválida.'});
  let bytes; try{bytes=Buffer.from(m[2],'base64')}catch{return reply(400,{ok:false,error:'No se pudo leer la imagen.'})}
  if(!bytes.length||bytes.length>5*1024*1024) return reply(400,{ok:false,error:'La imagen debe pesar menos de 5 MB.'});

  const bucket='marketing-campaigns';
  try{
    const br=await fetch(`${SUPABASE_URL}/storage/v1/bucket/${bucket}`,{headers:{apikey:SERVICE,Authorization:`Bearer ${SERVICE}`}});
    if(br.status===404){
      const cr=await fetch(`${SUPABASE_URL}/storage/v1/bucket`,{method:'POST',headers:{apikey:SERVICE,Authorization:`Bearer ${SERVICE}`,'Content-Type':'application/json'},body:JSON.stringify({id:bucket,name:bucket,public:true,file_size_limit:5242880,allowed_mime_types:['image/jpeg','image/png','image/webp']})});
      if(!cr.ok){const d=await cr.json().catch(()=>({}));throw new Error(d.message||d.error||'No se pudo crear el espacio de imágenes.')}
    } else if(!br.ok){const d=await br.json().catch(()=>({}));throw new Error(d.message||d.error||'No se pudo validar el espacio de imágenes.')}
  }catch(e){return reply(502,{ok:false,error:e.message||String(e)})}

  const ext=type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
  const key=`campaign-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const up=await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${key}`,{method:'POST',headers:{apikey:SERVICE,Authorization:`Bearer ${SERVICE}`,'Content-Type':type,'x-upsert':'false'},body:bytes});
  if(!up.ok){const d=await up.json().catch(()=>({}));return reply(502,{ok:false,error:d.message||d.error||'No se pudo subir la imagen.'})}
  return reply(200,{ok:true,url:`${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURIComponent(key)}`});
};
