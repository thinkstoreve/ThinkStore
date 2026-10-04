const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(statusCode,body)=>({statusCode,headers:HEADERS,body:JSON.stringify(body)});
const clean=v=>String(v??'').trim();
const encodePath=v=>String(v||'').split('/').map(encodeURIComponent).join('/');
const TERMS_VERSION='TS-REPAIR-2026-10-V1';

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return reply(200,{ok:true});
  if(event.httpMethod!=='POST')return reply(405,{ok:false,error:'Método no permitido'});

  const url=clean(process.env.SUPPORT_SUPABASE_URL||process.env.SUPABASE_URL).replace(/\/$/,'');
  const key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
  if(!url||!key)return reply(501,{ok:false,error:'Portal temporalmente no disponible'});

  const h={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  const req=async(path,options={})=>{
    const r=await fetch(`${url}/rest/v1/${path}`,{...options,headers:{...h,...(options.headers||{})}});
    const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}
    if(!r.ok){const err=new Error(d?.message||`Error ${r.status}`);err.status=r.status;throw err}
    return d;
  };

  const body=JSON.parse(event.body||'{}');
  const action=clean(body.action||'lookup');
  const code=clean(body.code).toUpperCase();
  const token=clean(body.token);
  if(!code)return reply(400,{ok:false,error:'Código de orden requerido'});

  try{
    const rows=await req(`service_orders?select=id,code,client_name,client_email,device_model,status,updated_at,quote_status,quote_amount,quote_currency,quote_repair_details,quote_sent_at,quote_approved_at,quote_terms_accepted_at,quote_terms_version,quote_client_comment,warranty_days,public_token,assigned_technician_email&id=not.is.null&code=ilike.${encodeURIComponent(code)}&limit=1`);
    const o=rows?.[0];
    if(!o)return reply(404,{ok:false,error:'Orden no encontrada'});
    const secure=Boolean(token&&String(o.public_token||'')===token);

    if(action==='reply'){
      if(!secure)return reply(403,{ok:false,error:'Este enlace no está autorizado para responder.'});
      const message=clean(body.message);
      if(!message)return reply(400,{ok:false,error:'Escribe un mensaje.'});
      if(message.length>2000)return reply(400,{ok:false,error:'El mensaje es demasiado largo.'});
      const last=await req(`service_order_messages?select=created_at&order_id=eq.${encodeURIComponent(String(o.id))}&sender_type=eq.client&order=created_at.desc&limit=1`);
      if(last?.[0]?.created_at&&Date.now()-new Date(last[0].created_at).getTime()<5000)return reply(429,{ok:false,error:'Espera unos segundos antes de enviar otro mensaje.'});
      await req('service_order_messages',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:o.id,sender_type:'client',sender_name:o.client_name||'Cliente',message})});
      return reply(200,{ok:true});
    }

    if(action==='approve_quote'){
      if(!secure)return reply(403,{ok:false,error:'Este enlace no está autorizado para aprobar la cotización.'});
      if(o.quote_approved_at||o.status==='Aprobado por cliente'||o.quote_status==='Aprobado'){
        return reply(200,{ok:true,already_approved:true,status:'Aprobado por cliente',approved_at:o.quote_approved_at});
      }
      if(o.status!=='Cotización enviada'&&o.quote_status!=='Enviado'){
        return reply(409,{ok:false,error:'La cotización todavía no está disponible para aprobación.'});
      }
      if(!(Number(o.quote_amount||0)>0)||!clean(o.quote_repair_details)){
        return reply(409,{ok:false,error:'La cotización está incompleta. Comunícate con ThinkStore antes de aprobar.'});
      }
      if(body.accept_terms!==true)return reply(400,{ok:false,error:'Debes aceptar las políticas de reparación para continuar.'});

      const comment=clean(body.comment);
      if(comment.length>1200)return reply(400,{ok:false,error:'El comentario es demasiado largo.'});
      const now=new Date().toISOString();

      if(comment){
        await req('service_order_messages',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:o.id,sender_type:'client',sender_name:o.client_name||'Cliente',message:comment})});
      }

      await req(`service_orders?id=eq.${encodeURIComponent(String(o.id))}`,{
        method:'PATCH',
        headers:{Prefer:'return=minimal'},
        body:JSON.stringify({
          status:'Aprobado por cliente',
          quote_status:'Aprobado',
          quote_approved_at:now,
          quote_terms_accepted_at:now,
          quote_terms_version:TERMS_VERSION,
          quote_client_comment:comment||null,
          updated_at:now
        })
      });

      await req('service_order_notes',{
        method:'POST',
        headers:{Prefer:'return=minimal'},
        body:JSON.stringify({
          order_id:o.id,
          note:'El cliente aprobó la cotización y aceptó las políticas de reparación.',
          visibility:'client',
          author_name:o.client_name||'Cliente',
          note_type:'Aprobación de cotización',
          status_after:'Aprobado por cliente',
          client_title:'Cotización aprobada'
        })
      });

      await req('service_audit_log',{
        method:'POST',
        headers:{Prefer:'return=minimal'},
        body:JSON.stringify({
          actor_email:o.client_email||null,
          actor_role:'client',
          action:'quote_approved_client',
          entity_type:'service_order',
          entity_id:String(o.id),
          before_data:{status:o.status,quote_status:o.quote_status},
          after_data:{status:'Aprobado por cliente',quote_status:'Aprobado',quote_approved_at:now,terms_version:TERMS_VERSION,comment:comment||null}
        })
      });

      return reply(200,{ok:true,status:'Aprobado por cliente',approved_at:now,terms_version:TERMS_VERSION});
    }

    if(action==='submit_feedback'){
      if(!secure)return reply(403,{ok:false,error:'Este enlace no está autorizado para enviar una reseña.'});
      if(o.status!=='Entregado')return reply(409,{ok:false,error:'La reseña estará disponible cuando la orden se marque como entregada.'});
      const rating=Number(body.rating||0);
      const comment=clean(body.comment);
      if(!Number.isInteger(rating)||rating<1||rating>5)return reply(400,{ok:false,error:'Selecciona una puntuación entre 1 y 5.'});
      if(!comment)return reply(400,{ok:false,error:'Escribe un comentario.'});
      if(comment.length>1200)return reply(400,{ok:false,error:'La reseña es demasiado larga.'});
      const prior=await req(`service_feedback?select=id&order_id=eq.${encodeURIComponent(String(o.id))}&limit=1`);
      if(prior?.length)return reply(409,{ok:false,error:'Ya existe una reseña para esta reparación.'});
      await req('service_feedback',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({order_id:o.id,rating,comment,client_name:o.client_name||'Cliente',client_email:o.client_email||null})});
      return reply(200,{ok:true});
    }

    if(!secure){
      return reply(200,{ok:true,secure:false,order:{code:o.code,device_model:o.device_model,status:o.status,updated_at:o.updated_at}});
    }

    const [notes,messages,photos,feedbackRows]=await Promise.all([
      req(`service_order_notes?select=id,note_type,status_after,client_title,note,diagnosis,work_performed,parts_used,tests_performed,client_notes,author_name,created_at&order_id=eq.${encodeURIComponent(String(o.id))}&visibility=eq.client&order=created_at.desc&limit=50`),
      req(`service_order_messages?select=id,sender_type,sender_name,message,created_at&order_id=eq.${encodeURIComponent(String(o.id))}&order=created_at.asc&limit=200`),
      req(`service_order_photos?select=id,storage_path,file_url,label,client_caption,created_at&order_id=eq.${encodeURIComponent(String(o.id))}&visibility=eq.client&order=created_at.desc&limit=30`),
      req(`service_feedback?select=id,rating,comment,created_at&order_id=eq.${encodeURIComponent(String(o.id))}&limit=1`)
    ]);

    const signed=[];
    for(const p of photos||[]){
      let signed_url='';
      if(p.storage_path){
        try{
          const r=await fetch(`${url}/storage/v1/object/sign/service-order-files/${encodePath(p.storage_path)}`,{method:'POST',headers:h,body:JSON.stringify({expiresIn:3600})});
          const d=await r.json().catch(()=>({}));
          const s=d.signedURL||d.signedUrl||'';
          signed_url=s.startsWith('http')?s:s.startsWith('/storage/v1')?`${url}${s}`:s.startsWith('/object/')?`${url}/storage/v1${s}`:s?`${url}/storage/v1/${s.replace(/^\//,'')}`:'';
        }catch(_){}
      }
      if(!signed_url&&p.file_url&&p.file_url!=='private')signed_url=p.file_url;
      if(signed_url)signed.push({...p,signed_url});
    }

    return reply(200,{
      ok:true,
      secure:true,
      terms_version:TERMS_VERSION,
      order:{
        code:o.code,
        client_name:o.client_name,
        device_model:o.device_model,
        status:o.status,
        updated_at:o.updated_at,
        quote_status:o.quote_status,
        quote_amount:o.quote_amount,
        quote_currency:o.quote_currency,
        quote_repair_details:o.quote_repair_details,
        quote_sent_at:o.quote_sent_at,
        quote_approved_at:o.quote_approved_at,
        quote_terms_accepted_at:o.quote_terms_accepted_at,
        quote_terms_version:o.quote_terms_version,
        quote_client_comment:o.quote_client_comment,
        warranty_days:o.warranty_days
      },
      notes:notes||[],
      messages:messages||[],
      photos:signed,
      feedback:feedbackRows?.[0]||null
    });
  }catch(e){
    console.error(e);
    return reply(500,{ok:false,error:'No se pudo procesar el seguimiento en este momento.'});
  }
};
