const Queue = require('./_campaign-queue');
const Delivery = require('./_campaign-delivery');
const CampaignCards = require('../../campaign-card-model');
async function handle(event,trusted=false) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };

  const cleanAuth = (v) => String(v || '').trim();
  const normalizeRole = (v) => cleanAuth(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const SUPABASE_URL = cleanAuth(process.env.SUPABASE_URL).replace(/\/$/, '');
  const SUPABASE_SERVICE_ROLE_KEY = cleanAuth(process.env.SUPABASE_SERVICE_ROLE_KEY);

  async function authorizeAdmin() {
    try {
      const provided = cleanAuth(event.headers['x-admin-secret'] || event.headers['X-Admin-Secret']);
      const legacySecrets = [process.env.THINKSTORE_ADMIN_SECRET, process.env.THINKSTORE_ADMIN_CODE]
        .map(cleanAuth).filter(Boolean);
      if (provided && legacySecrets.includes(provided)) return true;

      const token = cleanAuth(event.headers.authorization || event.headers.Authorization).replace(/^Bearer\s+/i, '');
      if (!token || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
      const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` }
      });
      const authUser = await userResponse.json().catch(() => ({}));
      if (!userResponse.ok || !authUser.id) return false;
      const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${encodeURIComponent(authUser.id)}&limit=1`, {
        headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
      });
      const profiles = await profileResponse.json().catch(() => []);
      const profile = Array.isArray(profiles) ? profiles[0] : null;
      const role = normalizeRole(profile?.role || profile?.rol);
      const active = (profile?.active ?? profile?.activo ?? true) !== false;
      return Boolean(profileResponse.ok && profile && active && ['admin','super_admin','superadmin','administrator','gerente','marketing'].includes(role));
    } catch (error) {
      console.error('ThinkStore campaign authorization:', error);
      return false;
    }
  }

  if (!trusted && !(await authorizeAdmin())) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Acceso administrador no autorizado' }) };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.RESEND_APY_KEY;
  if (!RESEND_API_KEY) return { statusCode: 501, headers, body: JSON.stringify({ ok: false, error: 'Falta RESEND_API_KEY en Netlify.' }) };
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 501, headers, body: JSON.stringify({ ok: false, error: 'Faltan variables de Supabase en Netlify.' }) };

  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch(e) { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'JSON inválido' }) }; }

  const clean = (v) => String(v || '').trim();
  const from = process.env.FROM_MARKETING_EMAIL || process.env.FROM_INFO_EMAIL || 'ThinkStore <info@thinkstore.com.ve>';
  const replyTo = process.env.REPLY_TO_MARKETING || process.env.REPLY_TO_INFO || 'info@thinkstore.com.ve';
  if(['queue_adopt','queue_list','queue_pause','queue_resume'].includes(payload.action)){
    try{const repo=Queue.repository();let queue;
      if(payload.action==='queue_list')return {statusCode:200,headers,body:JSON.stringify({ok:true,queues:(await repo.list()).map(Queue.summary),schedule:'10 * * * *',timezone:'UTC',dailyLimit:100})};
      if(payload.action==='queue_adopt'){const prepared=Delivery.unseal(payload.deliveryToken,SUPABASE_SERVICE_ROLE_KEY,{adopt:true}),cleanPayload={...payload};delete cleanPayload.queueExclude;queue=await Queue.create(repo,prepared,cleanPayload,from,{offset:payload.deliveryOffset||0,alreadySent:Array.isArray(payload.queueExclude)?payload.queueExclude:[]});await Queue.run(repo,p=>exports.sendFromQueue(p),{maxCalls:2,maxMillis:16000});queue=Queue.summary(await repo.get(queue.id));}
      else {queue=await Queue.change(repo,payload.queueId,payload.action==='queue_pause');if(payload.action==='queue_resume'){await Queue.run(repo,p=>exports.sendFromQueue(p),{maxCalls:2,maxMillis:16000});queue=Queue.summary(await repo.get(queue.id));}}
      return {statusCode:200,headers,body:JSON.stringify({ok:true,queue})};
    }catch(e){return {statusCode:400,headers,body:JSON.stringify({ok:false,error:e.message})};}
  }

  if(payload.action==='diagnostics'){try{return {statusCode:200,headers,body:JSON.stringify({ok:true,diagnostics:await Delivery.diagnostics(RESEND_API_KEY,from,replyTo)})}}catch(e){return {statusCode:502,headers,body:JSON.stringify({ok:false,error:e.message})}}}
  const subject = clean(payload.subject || 'Preventa iPhone 18 | ThinkStore');
  const title = clean(payload.title || 'El nuevo iPhone 18 llega a ThinkStore');
  const subtitle = clean(payload.subtitle || 'Sé de los primeros en reservarlo. Preventa de lanzamiento con atención personalizada.');
  const message = clean(payload.message || 'La nueva generación de iPhone ya está en preventa en ThinkStore. Reserva tu iPhone 18 Pro o iPhone 18 Pro Max y asegura tu unidad antes de la disponibilidad general.');
  const productName = clean(payload.productName || 'iPhone 18 Pro / Pro Max');
  const productDetails = clean(payload.productDetails || 'Elige tu acabado y capacidad. Te acompañamos durante todo el proceso de reserva.');
  const offer = clean(payload.offer || 'Preventa abierta · Unidades limitadas');
  const pricePro = clean(payload.pricePro || '');
  const priceProMax = clean(payload.priceProMax || '');
  const actionUrl = clean(payload.actionUrl || 'https://thinkstore.com.ve');
  const actionLabel = clean(payload.actionLabel || 'Reservar iPhone 18');
  const audience = clean(payload.audience || 'all');
  const testEmail = clean(payload.testEmail || '');
  const crmTag = clean(payload.crmTag || '');
  const logoUrl = clean(payload.logoUrl || 'https://thinkstore.com.ve/assets/thinkstore-email-logo.jpg');
  const bannerUrl = clean(payload.bannerUrl || '');
  const bannerFit = ['cover','contain'].includes(clean(payload.bannerFit)) ? clean(payload.bannerFit) : 'cover';
  const bannerPosition = clean(payload.bannerPosition || '50% 50%').replace(/[^0-9% .-]/g,'').slice(0,32) || '50% 50%';
  const kicker = clean(payload.kicker || 'CAMPAÑA THINKSTORE');
  const badge = clean(payload.badge || '');
  const preheader = clean(payload.preheader || '');
  const secondaryActionUrl = clean(payload.secondaryActionUrl || '');
  const secondaryActionLabel = clean(payload.secondaryActionLabel || '');
  const manualEmails = Array.isArray(payload.manualEmails) ? payload.manualEmails.map(clean).filter(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)).slice(0,500) : [];
  const campaignStyle = clean(payload.campaignStyle || 'premium').toLowerCase();
  const occasion = clean(payload.occasion || '').toLowerCase();
  const isServiceCampaign = campaignStyle === 'service' || occasion === 'servicio';
  const priceCards = Array.isArray(payload.priceCards) ? payload.priceCards.slice(0,2).map(c=>({...c,imageUrl:CampaignCards.normalize(c).imageUrl})) : CampaignCards.defaults(isServiceCampaign).map((c,i)=>({...c,...([pricePro,priceProMax][i]?{mode:'text',text:[pricePro,priceProMax][i]}:{})}));
  for(const c of priceCards){if(c.mode==='price'&&(CampaignCards.amount(c.price)===null||Number(c.discount)<0||Number(c.discount)>100))return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'Precio o descuento inválido en tarjeta.'})};}

  const api = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
  const baseHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };

  async function supabaseGet(path) {
    const res = await fetch(api + path, { headers: baseHeaders });
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.message || data.error || 'No se pudo leer Supabase');
    return data;
  }

  async function supabaseInsert(path, rows) {
    try {
      await fetch(api + path, { method: 'POST', headers: { ...baseHeaders, Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
    } catch (_) {}
  }

  let recipients=[],sourceCounts={},delivery=null,deliveryChunk=null,warnings=[];
  try {
    if(testEmail){if(!Delivery.valid(testEmail))throw Error('El correo de prueba no es válido');recipients=[{email:testEmail,nombre:'Prueba ThinkStore',source:'test'}];}
    else if(payload.action==='batch'||payload.action==='inspect'){
      delivery=Delivery.unseal(payload.deliveryToken,SUPABASE_SERVICE_ROLE_KEY);
      if(!trusted&&payload.action==='batch'){const queued=await supabaseGet('marketing_campaigns?select=id,content_json&id=eq.'+Delivery.historyId(delivery.jobId,'daily-state')+'&limit=1');if(queued?.length)throw Error('Esta campaña está en la cola automática. Usa sus controles para consultar o pausar el envío.');}
      deliveryChunk=Delivery.chunk(delivery,payload,from);recipients=deliveryChunk.recipients;sourceCounts=delivery.sources;warnings=delivery.warnings||[];
      if(payload.action==='inspect'){const invalid=delivery.recipients.filter(r=>!Delivery.valid(r.email));return {statusCode:200,headers,body:JSON.stringify({ok:true,total:delivery.recipients.length,offset:deliveryChunk.offset,batchCount:recipients.length,invalidCount:invalid.length,invalidInBatch:recipients.filter(r=>!Delivery.valid(r.email)).map(r=>r.email),invalidExamples:invalid.slice(0,20).map(r=>r.email),providerCalled:false})};}
    }else{
      const getAuth=async()=>{const rows=[];for(let page=1;page<=50;page++){const r=await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000&page=${page}`,{headers:baseHeaders}),d=await r.json();if(!r.ok)throw Error('No se pudieron consultar las cuentas registradas');const users=Array.isArray(d)?d:d.users||[];rows.push(...users);if(users.length<1000)return rows;}throw Error('La fuente supera 50.000 cuentas');};
      const result=await Delivery.audience(supabaseGet,getAuth,payload);
      if(!result.recipients.length)throw Error('No hay destinatarios válidos en esta selección');
      if(payload.action!=='preview')return {statusCode:400,headers,body:JSON.stringify({ok:false,error:'Comprueba primero la audiencia desde el editor actualizado; las campañas se envían en lotes de 100.'})};
      const prepared=Delivery.snapshot(result,payload,from);
      return {statusCode:200,headers,body:JSON.stringify({ok:true,total:result.recipients.length,sources:result.sources,warnings:result.warnings,batchSize:100,batches:Math.ceil(result.recipients.length/100),expiresAt:prepared.expiresAt,deliveryToken:Delivery.seal(prepared,SUPABASE_SERVICE_ROLE_KEY),sender:from})};
    }
  }catch(error){return {statusCode:400,headers,body:JSON.stringify({ok:false,error:error.message||'No se pudieron preparar los destinatarios'})};}

  const esc = (v) => String(v || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function serviceHtmlFor(name) {
    const hero = bannerUrl || 'https://thinkstore.com.ve/assets/marketing/servicio-tecnico-macbook-battery.jpg';
    const repairPrice = pricePro || '9,99';
    const reviewPrice = priceProMax || 'Revisión gratuita';
    const serviceUrl = actionUrl || 'https://thinkstore.com.ve/servicio-tecnico.html';
    const serviceLabel = actionLabel || 'Consultar servicio técnico';
    const agendaUrl = 'https://thinkstore.com.ve/agenda-soporte.html';
    const whatsappUrl = secondaryActionUrl || 'https://wa.me/584241706142';
    const whatsappLabel = secondaryActionLabel || 'Escribir por WhatsApp';
    return `
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>` : ''}
    <style>@media only screen and (max-width:620px){.ts-wrap{width:100%!important}.ts-pad{padding-left:20px!important;padding-right:20px!important}.ts-hero td,.ts-two td,.ts-features td{display:block!important;width:100%!important}.ts-hero-img{padding-top:0!important}.ts-two .ts-cell{padding:6px 0!important}.ts-features td{padding:8px 0!important}.ts-btn{display:block!important;width:auto!important;text-align:center!important;margin:8px 0!important}}</style>
    <div style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1d1f;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 10px;"><tr><td align="center">
        <table role="presentation" class="ts-wrap" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;background:#fff;border:1px solid #e7e7ea;border-radius:28px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.07);">
          <tr><td class="ts-pad" style="padding:24px 30px 20px;background:#fff;border-bottom:1px solid #efeff2;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td valign="middle"><img src="${esc(logoUrl)}" alt="ThinkStore" width="160" style="display:block;width:160px;max-width:70%;height:auto;border:0;"></td>
              <td align="right" valign="middle" style="font-size:13px;color:#515154;font-weight:700;">Servicio Técnico<br><span style="font-size:11px;color:#86868b;font-weight:500;">Expertos en dispositivos Apple</span></td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:0;background:#fff;">
            <table role="presentation" class="ts-hero" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td class="ts-pad" width="52%" valign="middle" style="padding:34px 18px 32px 30px;">
                <div style="font-size:10px;letter-spacing:.20em;font-weight:800;color:#6e6e73;text-transform:uppercase;margin-bottom:14px;">${esc(kicker || 'SERVICIO TÉCNICO')}</div>
                <h1 style="font-size:39px;line-height:1.02;letter-spacing:-.045em;margin:0 0 16px;color:#111;font-weight:800;">${esc(title || 'Tu Apple, siempre contigo')}</h1>
                <p style="font-size:16px;line-height:1.55;margin:0;color:#515154;">${esc(subtitle || 'Revisiones gratuitas, diagnóstico, reparación y soporte especializado para iPhone, iPad y Mac.')}</p>
              </td>
              <td class="ts-hero-img" width="48%" valign="middle" style="padding:20px 24px 20px 0;">
                <img src="${esc(hero)}" alt="Servicio técnico ThinkStore" width="300" style="display:block;width:100%;max-width:300px;height:auto;border:0;border-radius:18px;object-fit:cover;">
              </td>
            </tr></table>
          </td></tr>
          <tr><td class="ts-pad" style="padding:0 30px 26px;background:#fff;">
            <table role="presentation" class="ts-features" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #efeff2;border-bottom:1px solid #efeff2;"><tr>
              <td width="33.33%" style="padding:15px 8px 15px 0;font-size:12px;color:#3a3a3c;"><b style="color:#111;">✓ Técnicos certificados</b></td>
              <td width="33.33%" style="padding:15px 8px;font-size:12px;color:#3a3a3c;"><b style="color:#111;">⚙ Repuestos de calidad</b></td>
              <td width="33.33%" style="padding:15px 0 15px 8px;font-size:12px;color:#3a3a3c;"><b style="color:#111;">◷ Servicio rápido y confiable</b></td>
            </tr></table>
          </td></tr>
          <tr><td class="ts-pad" style="padding:26px 30px 34px;background:#fff;">
            <div style="background:#f5f5f7;border:1px solid #ececef;border-radius:26px;padding:24px;">
              <h2 style="font-size:30px;line-height:1.08;letter-spacing:-.035em;margin:0 0 8px;color:#111;">${esc(productName || 'Servicio Técnico Apple')}</h2>
              <p style="font-size:15px;line-height:1.55;margin:0 0 16px;color:#515154;">${esc(productDetails || 'Pantallas, baterías, cámaras, carga, software, microsoldadura y más.')}</p>
              <div style="display:inline-block;background:#fff;border:1px solid #d9d9de;border-radius:999px;padding:9px 14px;font-size:13px;font-weight:800;color:#1d1d1f;">${esc(offer || 'Diagnóstico y reparación · Agenda disponible')}</div>
              <div style="font-size:10px;letter-spacing:.16em;color:#86868b;font-weight:800;text-transform:uppercase;margin:22px 0 11px;">PRECIOS</div>
              ${CampaignCards.table(priceCards)}
            </div>
            <div style="text-align:center;margin:24px 0 10px;">
              <a class="ts-btn" href="${esc(serviceUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;border-radius:999px;padding:14px 22px;font-size:14px;font-weight:800;margin:5px;">${esc(serviceLabel)} →</a>
              <a class="ts-btn" href="${agendaUrl}" style="display:inline-block;background:#fff;color:#111;text-decoration:none;border:1px solid #d5d5da;border-radius:999px;padding:14px 22px;font-size:14px;font-weight:800;margin:5px;">Agenda tu cita</a>
              <br><a class="ts-btn" href="${esc(whatsappUrl)}" style="display:inline-block;background:#fff;color:#111;text-decoration:none;border:1px solid #d5d5da;border-radius:999px;padding:12px 20px;font-size:13px;font-weight:800;margin:7px 5px 0;">${esc(whatsappLabel)}</a>
            </div>
            <p style="font-size:14px;line-height:1.65;color:#515154;margin:22px 0 0;">Hola ${esc(name)}, ${esc(message)}</p>
            <table role="presentation" class="ts-features" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eeeeef;margin-top:24px;"><tr>
              <td width="25%" valign="top" style="padding:18px 6px 0 0;font-size:11px;color:#6e6e73;"><b style="display:block;color:#111;font-size:12px;margin-bottom:3px;">✓ Diagnóstico profesional</b>Sin costo inicial</td>
              <td width="25%" valign="top" style="padding:18px 6px 0;font-size:11px;color:#6e6e73;"><b style="display:block;color:#111;font-size:12px;margin-bottom:3px;">☆ Repuestos premium</b>Máxima calidad</td>
              <td width="25%" valign="top" style="padding:18px 6px 0;font-size:11px;color:#6e6e73;"><b style="display:block;color:#111;font-size:12px;margin-bottom:3px;">◷ Previa cita</b>Atención personalizada</td>
              <td width="25%" valign="top" style="padding:18px 0 0 6px;font-size:11px;color:#6e6e73;"><b style="display:block;color:#111;font-size:12px;margin-bottom:3px;">◎ Soporte especializado</b>iPhone, iPad y Mac</td>
            </tr></table>
          </td></tr>
          <tr><td class="ts-pad" style="padding:22px 30px;background:#fafafa;border-top:1px solid #eeeeef;">
            <table role="presentation" width="100%"><tr><td style="font-size:12px;color:#86868b;"><strong style="color:#111;font-size:14px;">ThinkStore</strong><br>Servicio Técnico Apple · Confianza. Experiencia. Resultados.</td><td align="right" style="font-size:11px;color:#86868b;">Chacao, Caracas<br><a href="https://thinkstore.com.ve" style="color:#1d1d1f;text-decoration:none;">thinkstore.com.ve</a></td></tr></table>
          </td></tr>
        </table>
      </td></tr></table>
    </div>`;
  }

  function htmlFor(name) {
    if (isServiceCampaign) return serviceHtmlFor(name);
    const banner = bannerUrl ? `<div style="margin:0 0 28px;text-align:center;"><img src="${esc(bannerUrl)}" alt="iPhone 18 · Preventa ThinkStore" style="display:block;width:100%;max-width:100%;height:auto;border:0;margin:0 auto;background:transparent;"></div>` : '';
    const priceHtml = CampaignCards.table(priceCards);
    return `
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>` : ''}
    <div style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1d1f;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:28px 12px;">
        <tr><td align="center">
          <table role="presentation" width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%;background:#ffffff;border:1px solid #e7e7ea;border-radius:30px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.08);">
            <tr><td align="center" style="padding:34px 34px 14px;background:#ffffff;">
              <img src="${esc(logoUrl)}" alt="ThinkStore" width="188" style="display:block;width:188px;max-width:62%;height:auto;border:0;margin:0 auto 28px;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:#0878ff;font-weight:800;margin-bottom:14px;">${esc(kicker)}</div>${badge?`<div style="display:inline-block;background:#eef6ff;color:#0878ff;border:1px solid #cfe3ff;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:800;margin-bottom:14px;">${esc(badge)}</div>`:''}
              <h1 style="font-size:42px;line-height:1.06;letter-spacing:-.035em;margin:0 auto 14px;color:#1d1d1f;font-weight:800;max-width:560px;">${esc(title)}</h1>
              <p style="font-size:17px;line-height:1.6;margin:0 auto;color:#6e6e73;max-width:540px;">${esc(subtitle)}</p>
            </td></tr>
            <tr><td style="padding:28px 34px 36px;background:#ffffff;">
              ${banner}
              <p style="font-size:16px;line-height:1.7;margin:0 0 14px;color:#1d1d1f;">Hola ${esc(name)},</p>
              <p style="font-size:16px;line-height:1.72;margin:0 0 26px;color:#3a3a3c;">${esc(message).replace(/\n/g, '<br>')}</p>
              <div style="background:#f5f5f7;color:#1d1d1f;border:1px solid #ececef;border-radius:24px;padding:26px;margin-bottom:28px;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:.17em;color:#86868b;font-weight:800;margin-bottom:12px;">Preventa abierta</div>
                <h2 style="font-size:29px;line-height:1.18;letter-spacing:-.025em;margin:0 0 10px;color:#1d1d1f;">${esc(productName)}</h2>
                <p style="font-size:15px;line-height:1.65;margin:0 0 18px;color:#515154;">${esc(productDetails)}</p>
                <div style="display:inline-block;background:#ffffff;color:#1d1d1f;border:1px solid #d9d9de;border-radius:999px;padding:10px 16px;font-size:14px;font-weight:800;">${esc(offer)}</div>
                ${priceHtml}
              </div>
              <div style="text-align:center;margin:30px 0 30px;">
                <a href="${esc(actionUrl)}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;border-radius:999px;padding:15px 30px;font-size:16px;font-weight:800;">${esc(actionLabel)}</a>
                ${secondaryActionLabel&&secondaryActionUrl?`<br><a href="${esc(secondaryActionUrl)}" style="display:inline-block;margin-top:12px;color:#1d1d1f;text-decoration:none;border:1px solid #d5d5da;border-radius:999px;padding:12px 22px;font-size:14px;font-weight:800;">${esc(secondaryActionLabel)}</a>`:''}
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eeeeef;padding-top:22px;">
                <tr><td style="font-size:13px;line-height:1.8;color:#6e6e73;">
                  <strong style="color:#1d1d1f;">Compra con acompañamiento ThinkStore</strong><br>
                  Asesoría personalizada · Retiro en Chacao por previa cita · Envíos nacionales por MRW, Zoom y Tealca
                </td></tr>
              </table>
            </td></tr>
            <tr><td align="center" style="background:#fafafa;border-top:1px solid #eeeeef;padding:24px 34px;font-size:12px;line-height:1.7;color:#86868b;">
              <strong style="color:#1d1d1f;">ThinkStore</strong> · Chacao, Caracas<br>
              <a href="https://thinkstore.com.ve" style="color:#1d1d1f;text-decoration:none;">thinkstore.com.ve</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </div>`;
  }

  const unsubscribe=email=>'mailto:'+replyTo+'?subject='+encodeURIComponent('Baja de promociones ThinkStore')+'&body='+encodeURIComponent('Solicito no recibir promociones en: '+email);
  function mailFor(r){const mail={
          from, to: r.email, reply_to: replyTo, subject,
          html: htmlFor(r.nombre) + `<div style="font:12px/1.6 Arial,sans-serif;color:#6e6e73;text-align:center;padding:18px">Recibes comunicaciones de ThinkStore. <a href="${esc(unsubscribe(r.email))}">Solicitar baja de promociones</a>.<br>Las alertas dependen de la configuración de tu correo.</div>`,
          text: isServiceCampaign
            ? `${title}

${subtitle}

${message}

${productName}
${productDetails}
${offer}
${priceCards.map(c=>{const n=CampaignCards.normalize(c);return `${n.label}: ${n.prefix} ${n.display}${n.original?' (antes '+n.original+', descuento '+n.discount+'%)':''} · ${n.note}`}).join('\n')}

Consultar servicio técnico: ${actionUrl || 'https://thinkstore.com.ve/servicio-tecnico.html'}
Agenda tu cita: https://thinkstore.com.ve/agenda-soporte.html${secondaryActionLabel&&secondaryActionUrl?`
${secondaryActionLabel}: ${secondaryActionUrl}`:''}`
            : `${title}

${subtitle}

${message}

${productName}
${productDetails}
${offer}
${priceCards.map(c=>{const n=CampaignCards.normalize(c);return `${n.label}: ${n.display}${n.original?' (antes '+n.original+', descuento '+n.discount+'%)':''}`}).join('\n')}

${actionUrl}${secondaryActionLabel&&secondaryActionUrl?`
${secondaryActionLabel}: ${secondaryActionUrl}`:''}`
        };mail.headers={'List-Unsubscribe':'<'+unsubscribe(r.email)+'>'};return mail;}
  const suppressed=new Set(delivery?.suppressed||[]);const consumed=recipients.length,skippedRecipients=recipients.filter(r=>!Delivery.valid(r.email)||suppressed.has(r.email)).map(r=>r.email);recipients=recipients.filter(r=>Delivery.valid(r.email)&&!suppressed.has(r.email));
  let sent=0,failed=0,errors=[],providerIds=[],replayed=false,quota={daily:null,monthly:null};
  try{
    if(recipients.length){
    const batch=!!deliveryChunk;
    const response=await fetch(batch?'https://api.resend.com/emails/batch':'https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:'Bearer '+RESEND_API_KEY,'Content-Type':'application/json',...(batch?{'Idempotency-Key':deliveryChunk.idempotencyKey}:{})},
      body:JSON.stringify(batch?recipients.map(mailFor):mailFor(recipients[0])),signal:AbortSignal.timeout(trusted?8000:15000)
    });
    const result=await response.json().catch(()=>({}));quota={daily:Queue.quotaNumber(response.headers?.get?.('x-resend-daily-quota')),monthly:Queue.quotaNumber(response.headers?.get?.('x-resend-monthly-quota'))};
    if(!response.ok){const error=result.message||result.error||`Resend HTTP ${response.status}`;return {statusCode:response.status>=400&&response.status<500?response.status:502,headers,body:JSON.stringify({ok:false,error,providerError:result.name||'',quota,retryAfter:Number(response.headers?.get?.('retry-after')||3),sent:0,failed:0,nextOffset:deliveryChunk?.offset||0})};}
    providerIds=batch?(result.data||[]).map(x=>x.id).filter(Boolean):[result.id].filter(Boolean);
    if(providerIds.length!==recipients.length)throw Error('El proveedor respondió sin confirmar todos los identificadores. Reanuda el mismo lote para comprobarlo.');
    sent=providerIds.length;replayed=response.headers?.get?.('idempotent-replayed')==='true';
    }
  }catch(error){return {statusCode:502,headers,body:JSON.stringify({ok:false,error:error.message||'No se pudo confirmar la respuesta de Resend; reanuda el mismo lote.',nextOffset:deliveryChunk?.offset||0,sent:0,failed:0})};}
  const offset=deliveryChunk?.offset||0,total=delivery?delivery.recipients.length:recipients.length,nextOffset=offset+consumed;
  const history={subject,title,subtitle,audience,recipients_count:consumed,sent_count:sent,failed_count:failed,banner_url:bannerUrl||null,
    content_json:{priceCards,message,productName,productDetails,offer,pricePro,priceProMax,actionUrl,actionLabel,secondaryActionUrl,secondaryActionLabel,kicker,badge,preheader,bannerFit,bannerPosition,campaignStyle,occasion,manualCount:manualEmails.length,deliveryStatus:sent?'accepted':'skipped_invalid',providerIds,skippedRecipients,...(delivery?{jobId:delivery.jobId,batchOffset:offset,campaignTotal:total}:{})},created_at:new Date().toISOString()};
  if(delivery){history.id=Delivery.historyId(delivery.jobId,offset);try{const h=await fetch(api+'marketing_campaigns?on_conflict=id',{method:'POST',headers:{...baseHeaders,Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify([history]),signal:AbortSignal.timeout(5000)});if(!h.ok)warnings.push('El proveedor aceptó el lote, pero no se pudo registrar en el historial.')}catch{warnings.push('El proveedor aceptó el lote, pero el historial no respondió.');}}
  else await supabaseInsert('marketing_campaigns',[history]);
  return {statusCode:200,headers,body:JSON.stringify({ok:true,total,sent,accepted:sent,quota,skipped:skippedRecipients.length,skippedRecipients,processed:consumed,failed,sources:sourceCounts,errors,providerIds,replayed,warnings,nextOffset,done:nextOffset>=total,deliveryStatus:sent?'accepted':'skipped_invalid'})};
};

exports.handler=event=>handle(event,false);
exports.sendFromQueue=async payload=>{const r=await handle({httpMethod:'POST',headers:{},body:JSON.stringify(payload)},true);return {httpStatus:r.statusCode,...JSON.parse(r.body)};};
