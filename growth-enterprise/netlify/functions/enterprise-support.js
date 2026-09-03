const json=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization, x-admin-secret','Access-Control-Allow-Methods':'GET, POST, OPTIONS'},body:JSON.stringify(body)});
const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

exports.handler=async function(event){
  if(event.httpMethod==='OPTIONS')return json(200,{ok:true});
  if(!['GET','POST'].includes(event.httpMethod))return json(405,{ok:false,error:'Método no permitido'});
  const mainUrl=clean(process.env.SUPABASE_URL).replace(/\/$/,'');
  const mainKey=clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supportUrl=clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/$/,'');
  const supportKey=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY);
  if(!mainUrl||!mainKey)return json(501,{ok:false,error:'Faltan variables del Supabase principal'});
  if(!supportUrl||!supportKey)return json(501,{ok:false,error:'Configura SUPPORT_SUPABASE_URL y SUPPORT_SUPABASE_SERVICE_ROLE_KEY en Enterprise'});

  async function authorize(){
    const legacy=clean(event.headers['x-admin-secret']||event.headers['X-Admin-Secret']);
    const allowed=[process.env.THINKSTORE_ADMIN_SECRET,process.env.THINKSTORE_ADMIN_CODE].map(clean).filter(Boolean);
    if(legacy&&allowed.includes(legacy))return{ok:true,role:'superadmin'};
    const token=clean(event.headers.authorization||event.headers.Authorization).replace(/^Bearer\s+/i,'');
    if(!token)return{ok:false};
    const ur=await fetch(`${mainUrl}/auth/v1/user`,{headers:{apikey:mainKey,Authorization:`Bearer ${token}`}});
    const user=await ur.json().catch(()=>({}));if(!ur.ok||!user.id)return{ok:false};
    const headers={apikey:mainKey,Authorization:`Bearer ${mainKey}`};
    let profile=null;
    const pr=await fetch(`${mainUrl}/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(user.id)}&limit=1`,{headers});
    const pa=await pr.json().catch(()=>[]);if(pr.ok)profile=pa[0]||null;
    if(!profile&&user.email){const rr=await fetch(`${mainUrl}/rest/v1/roles_usuarios?select=*&email=ilike.${encodeURIComponent(user.email)}&limit=1`,{headers});const ra=await rr.json().catch(()=>[]);if(rr.ok)profile=ra[0]||null}
    const role=norm(profile?.role||profile?.rol),active=(profile?.active??profile?.activo??true)!==false;
    return{ok:Boolean(profile&&active&&['admin','super_admin','superadmin','administrator','gerente'].includes(role)),user,role};
  }

  try{
    const auth=await authorize();if(!auth.ok)return json(401,{ok:false,error:'Acceso Enterprise no autorizado'});
    const h={apikey:supportKey,Authorization:`Bearer ${supportKey}`,'Content-Type':'application/json'};
    const request=async(path,options={})=>{const res=await fetch(`${supportUrl}/rest/v1/${path}`,{...options,headers:{...h,...(options.headers||{})}});const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}if(!res.ok)throw new Error(data?.message||data?.error||`Error Soporte ${res.status}`);return data};
    if(event.httpMethod==='GET'){
      const [orders,notes,users,photos,audit,parts,partMovements]=await Promise.all([
        request('service_orders?select=*&order=created_at.desc&limit=500'),
        request('service_order_notes?select=*&order=created_at.desc&limit=500'),
        request('service_users?select=id,email,nombre,rol,activo,created_at&order=created_at.desc&limit=200'),
        request('service_order_photos?select=*&order=created_at.desc&limit=500').catch(()=>[]),
        request('service_audit_log?select=*&order=created_at.desc&limit=300').catch(()=>[]),
        request('service_parts?select=*&order=name.asc&limit=1000').catch(()=>[]),
        request('service_part_movements?select=*&order=created_at.desc&limit=500').catch(()=>[])
      ]);
      return json(200,{ok:true,source:'support_supabase',orders:orders||[],notes:notes||[],users:users||[],photos:photos||[],audit:audit||[],parts:parts||[],part_movements:partMovements||[],refreshed_at:new Date().toISOString()});
    }
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{ok:false,error:'JSON inválido'})}
    const action=clean(body.action),id=clean(body.id||body.order_id),status=clean(body.status),note=clean(body.note);
    if(!id)return json(400,{ok:false,error:'Orden requerida'});
    const existing=await request(`service_orders?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);const order=existing?.[0];
    if(!order)return json(404,{ok:false,error:'Orden de soporte no encontrada'});
    const writeAudit=async(action,beforeData,afterData)=>request('service_audit_log',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({actor_email:auth.user?.email||'Enterprise',actor_role:auth.role||'admin',action,entity_type:'service_order',entity_id:String(id),before_data:beforeData||null,after_data:afterData||null})}).catch(()=>null);
    if(action==='update_status'){
      if(!status)return json(400,{ok:false,error:'Estado requerido'});
      const updated=await request(`service_orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status})});
      await request('service_order_notes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:id,note:note||`Estado actualizado desde Enterprise: ${order.status} → ${status}`,visibility:'internal',author_name:auth.user?.email||'Enterprise',note_type:'Cambio de estado Enterprise',status_after:status})});
      await writeAudit('update_status',{status:order.status},{status});
      return json(200,{ok:true,order:updated?.[0]||order});
    }
    if(action==='add_note'){
      if(!note)return json(400,{ok:false,error:'Escribe la nota de bitácora'});
      await request('service_order_notes',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({order_id:id,note,visibility:body.visibility==='client'?'client':'internal',author_name:auth.user?.email||'Enterprise',note_type:clean(body.note_type)||'Seguimiento Enterprise',status_after:status||order.status})});
      if(status&&status!==order.status)await request(`service_orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status})});
      await writeAudit('add_note',null,{note,status:status||order.status});
      return json(200,{ok:true});
    }
    if(action==='update_details'){
      const allowed=['assigned_technician_email','quote_amount','quote_status','warranty_days','delivery_method','tracking_company','tracking_code','technical_notes'];const changes={};allowed.forEach(k=>{if(Object.prototype.hasOwnProperty.call(body,k))changes[k]=body[k]??null});if(!Object.keys(changes).length)return json(400,{ok:false,error:'No hay cambios válidos'});
      const updated=await request(`service_orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(changes)});await request('service_order_notes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:id,note:'Datos operativos actualizados desde Enterprise.',visibility:'internal',author_name:auth.user?.email||'Enterprise',note_type:'Gestión Enterprise',status_after:order.status})});await writeAudit('update_details',order,changes);return json(200,{ok:true,order:updated?.[0]||{...order,...changes}});
    }
    if(action==='notify_client'){
      if(!order.client_email)return json(400,{ok:false,error:'La orden no tiene correo del cliente'});const resend=clean(process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY);if(!resend)return json(501,{ok:false,error:'Falta RESEND_API_KEY'});const tracking=`https://soporte.thinkstore.com.ve/?orden=${encodeURIComponent(order.code)}`;const subject=`ThinkStore Soporte — ${order.status} | ${order.code}`;const html=`<div style="background:#f5f5f7;padding:30px;font-family:Arial"><div style="max-width:650px;margin:auto;background:white;border-radius:24px;overflow:hidden"><div style="background:#09090c;color:white;padding:28px;text-align:center"><h1>ThinkStore Soporte</h1><p>${esc(order.code)}</p></div><div style="padding:28px"><p>Hola <b>${esc(order.client_name)}</b>,</p><p>Tu equipo <b>${esc(order.device_model)}</b> está en estado <b>${esc(order.status)}</b>.</p><p><a href="${tracking}">Consultar orden</a></p></div></div></div>`;const er=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.FROM_SOPORTE_EMAIL||process.env.FROM_EMAIL||'ThinkStore Soporte <soporte@thinkstore.com.ve>',to:order.client_email,reply_to:process.env.REPLY_TO_SOPORTE||'soporte@thinkstore.com.ve',subject,html})});const ed=await er.json().catch(()=>({}));if(!er.ok)throw new Error(ed.message||'Error enviando correo');await writeAudit('notify_client',null,{recipient:order.client_email,provider_id:ed.id||null});return json(200,{ok:true,email:{sent:true,id:ed.id||null}});
    }
    return json(400,{ok:false,error:'Acción de soporte no válida'});
  }catch(error){console.error('ThinkStore Enterprise Support',error);return json(500,{ok:false,error:error.message||'Error interno de soporte'})}
};
