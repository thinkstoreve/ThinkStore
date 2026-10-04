const { createClient } = require('@supabase/supabase-js');

const headers={
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store',
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type'
};
const out=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
const clean=v=>String(v??'').trim();
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v));
const phoneOk=v=>clean(v).replace(/\D/g,'').length>=10;

function makeCode(){
  const d=new Date();
  const y=String(d.getUTCFullYear()).slice(-2);
  const m=String(d.getUTCMonth()+1).padStart(2,'0');
  const day=String(d.getUTCDate()).padStart(2,'0');
  const rand=Math.random().toString(36).slice(2,6).toUpperCase();
  return `TS-REG-${y}${m}${day}-${rand}`;
}

async function sendReceiptEmail(body,order){
  const key=clean(process.env.RESEND_API_KEY||process.env.RESEND_APY_KEY);
  if(!key||!body.email)return {sent:false,error:'resend_not_configured'};
  const html=`<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111"><div style="max-width:640px;margin:auto;padding:34px 18px"><div style="background:#fff;border:1px solid #e5e5ea;border-radius:28px;padding:30px"><div style="font-size:12px;letter-spacing:.16em;font-weight:900;color:#0878ff">THINKSTORE · SERVICIO TÉCNICO</div><h1 style="font-size:32px;line-height:1.05;margin:10px 0 12px">Recibimos tu solicitud ✅</h1><p style="color:#6e6e73;line-height:1.55">Hola ${esc(body.name)}, registramos tu solicitud de envío desde <b>${esc(body.region)}</b>. Un técnico continuará la coordinación contigo por WhatsApp.</p><div style="background:#f7f8fa;border-radius:20px;padding:18px;margin:22px 0;line-height:1.65"><b>${esc(body.category)} · ${esc(body.model)}</b><br>${body.serial?`<span>Serial / IMEI: ${esc(body.serial)}</span><br>`:''}<span>${esc(body.issue)}</span><br><span>${esc(body.city)} · ${esc(body.region)}</span></div><p style="color:#6e6e73;line-height:1.55">Código de solicitud: <b>${esc(order.code)}</b>. Conserva este código para cualquier consulta.</p><p style="font-size:12px;color:#8e8e93;margin-top:24px">ThinkStore Servicio Técnico · Caracas</p></div></div></body></html>`;
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.FROM_SUPPORT_EMAIL||'ThinkStore Soporte <soporte@thinkstore.com.ve>',to:clean(body.email).toLowerCase(),reply_to:process.env.REPLY_TO_SUPPORT||'soporte@thinkstore.com.ve',subject:`Solicitud de servicio ${order.code} · ThinkStore`,html})});
  const data=await res.json().catch(()=>({}));
  return res.ok?{sent:true,id:data.id||null}:{sent:false,error:data.message||data.error||`Resend HTTP ${res.status}`};
}

exports.handler=async(event)=>{
  if(event.httpMethod==='OPTIONS')return {statusCode:204,headers,body:''};
  if(event.httpMethod!=='POST')return out(405,{ok:false,error:'method_not_allowed'});
  try{
    const body=JSON.parse(event.body||'{}');
    // Honeypot: bots often fill hidden website field.
    if(clean(body.website))return out(200,{ok:true,ignored:true});
    const required=['region','category','model','issue','name','phone','email','city','address'];
    if(required.some(k=>!clean(body[k])))return out(400,{ok:false,error:'missing_fields'});
    if(!emailOk(body.email))return out(400,{ok:false,error:'invalid_email'});
    if(!phoneOk(body.phone))return out(400,{ok:false,error:'invalid_phone'});
    if(clean(body.issue).length<8)return out(400,{ok:false,error:'issue_too_short'});

    const url=clean(process.env.SUPPORT_SUPABASE_URL).replace(/\/+$/,'');
    const key=clean(process.env.SUPPORT_SUPABASE_SERVICE_ROLE_KEY);
    if(!url||!key)return out(503,{ok:false,error:'support_database_not_configured'});
    const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const code=makeCode();
    const notes=[
      `Solicitud web desde ${clean(body.region)} · ${clean(body.city)}`,
      `Dirección: ${clean(body.address)}`,
      clean(body.serial)?`Serial/IMEI declarado: ${clean(body.serial)}`:'Serial/IMEI no indicado',
      `Origen: envio-regiones.html`
    ].join('\n');
    const payload={
      code,
      client_name:clean(body.name),
      client_phone:clean(body.phone),
      client_email:clean(body.email).toLowerCase(),
      device_type:clean(body.category),
      device_model:clean(body.model),
      serial_imei:clean(body.serial)||null,
      reported_issue:clean(body.issue),
      accessories_received:'Pendiente de recepción física',
      visual_condition:'Pendiente de recepción física',
      priority:'Normal',
      status:'Solicitud web',
      quote_status:'Pendiente',
      delivery_method:`Envío nacional · ${clean(body.region)}`,
      technical_notes:notes,
      reception_checklist:{source:'envio_regiones',region:clean(body.region),city:clean(body.city),address:clean(body.address),request_received:true}
    };
    const {data:order,error}=await sb.from('service_orders').insert(payload).select('id,code,status,created_at').single();
    if(error)throw error;
    try{await sb.from('service_order_notes').insert({order_id:order.id,note:`Solicitud recibida desde la web. Cliente solicita instrucciones para enviar el equipo desde ${clean(body.city)}, ${clean(body.region)}.`,visibility:'internal',author_name:'ThinkStore Web',note_type:'Solicitud desde regiones',status_after:'Solicitud web'});}catch(_){}
    try{await sb.from('service_audit_log').insert({actor_email:'web@thinkstore.com.ve',actor_role:'web',action:'create_region_request',entity_type:'service_order',entity_id:String(order.id),before_data:null,after_data:{code:order.code,source:'envio_regiones',region:clean(body.region),city:clean(body.city)}});}catch(_){}
    let email={sent:false};
    try{email=await sendReceiptEmail(body,order)}catch(e){email={sent:false,error:e.message||String(e)}}
    return out(200,{ok:true,order,email});
  }catch(e){console.error('region-service-request',e);return out(500,{ok:false,error:'region_request_failed',message:e.message||String(e)});}
};
