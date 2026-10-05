exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  const reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
  if(event.httpMethod==='OPTIONS') return reply(200,{ok:true});
  if(event.httpMethod!=='POST') return reply(405,{ok:false,error:'Método no permitido'});

  const clean=v=>String(v??'').trim();
  const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const SUPABASE_URL=clean(process.env.SUPABASE_URL).replace(/\/$/,'');
  const SERVICE=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!SUPABASE_URL||!SERVICE)return reply(501,{ok:false,error:'Faltan variables de Supabase en Netlify.'});

  async function authorize(){
    const provided=clean(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']||'');
    const allowed=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].filter(Boolean).map(String);
    if(provided&&allowed.includes(provided))return{ok:true,mode:'legacy'};
    const token=clean(event.headers.authorization||event.headers.Authorization||'').replace(/^Bearer\s+/i,'');
    if(!token)return{ok:false};
    const ur=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SERVICE,Authorization:`Bearer ${token}`}});
    const u=await ur.json().catch(()=>({})); if(!ur.ok||!u.id)return{ok:false};
    const h={apikey:SERVICE,Authorization:`Bearer ${SERVICE}`};
    const pr=await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,role,active&id=eq.${encodeURIComponent(u.id)}&limit=1`,{headers:h});
    const rows=await pr.json().catch(()=>[]); const p=rows[0]||null; const r=norm(p?.role);
    if(!p||p.active===false||!['admin','super_admin','superadmin','administrator','gerente','vendedor'].includes(r))return{ok:false};
    return{ok:true,user_id:u.id,email:u.email||'',role:r};
  }
  const auth=await authorize(); if(!auth.ok)return reply(401,{ok:false,error:'Acceso no autorizado'});

  let body={}; try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{ok:false,error:'JSON inválido'})}
  const receiptId=clean(body.receiptId||body.id), pedidoId=clean(body.pedidoId||body.pedido_id);
  if(!receiptId&&!pedidoId)return reply(400,{ok:false,error:'Comprobante requerido'});
  const baseHeaders={apikey:SERVICE,Authorization:`Bearer ${SERVICE}`,'Content-Type':'application/json'};
  const filter=receiptId?`id=eq.${encodeURIComponent(receiptId)}`:`pedido_id=eq.${encodeURIComponent(pedidoId)}`;
  const rr=await fetch(`${SUPABASE_URL}/rest/v1/comprobantes?select=id,pedido_id,url_archivo&${filter}&order=created_at.desc&limit=1`,{headers:baseHeaders});
  const rows=await rr.json().catch(()=>[]); if(!rr.ok)return reply(502,{ok:false,error:'No se pudo consultar el comprobante'});
  const receipt=rows[0]; if(!receipt)return reply(404,{ok:false,error:'Comprobante no encontrado'});

  function extractStoragePath(value){
    const raw=clean(value); if(!raw)return'';
    if(!/^https?:\/\//i.test(raw))return raw.replace(/^\/+/, '');
    try{
      const u=new URL(raw);
      const marker='/storage/v1/object/';
      const i=u.pathname.indexOf(marker); if(i<0)return'';
      let rest=u.pathname.slice(i+marker.length);
      rest=rest.replace(/^(sign|public|authenticated)\//,'');
      if(rest.startsWith('comprobantes/'))rest=rest.slice('comprobantes/'.length);
      return rest.split('/').map(seg=>decodeURIComponent(seg)).join('/');
    }catch{return''}
  }
  const path=extractStoragePath(receipt.url_archivo);
  if(!path)return reply(422,{ok:false,error:'El comprobante no tiene una ruta válida en Storage.'});
  const encoded=path.split('/').map(encodeURIComponent).join('/');
  const sr=await fetch(`${SUPABASE_URL}/storage/v1/object/sign/comprobantes/${encoded}`,{
    method:'POST',headers:baseHeaders,body:JSON.stringify({expiresIn:600})
  });
  const sd=await sr.json().catch(()=>({}));
  if(!sr.ok)return reply(502,{ok:false,error:sd.message||sd.error||'No se pudo generar el enlace del comprobante'});
  const signed=sd.signedURL||sd.signedUrl||sd.url||'';
  const signedUrl=/^https?:\/\//i.test(signed)?signed:`${SUPABASE_URL}/storage/v1${signed.startsWith('/')?'':'/'}${signed}`;
  return reply(200,{ok:true,signedUrl,expiresIn:600});
};
