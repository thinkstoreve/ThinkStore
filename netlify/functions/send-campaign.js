exports.handler = async function(event) {
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

  if (!(await authorizeAdmin())) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Acceso administrador no autorizado' }) };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.RESEND_APY_KEY;
  if (!RESEND_API_KEY) return { statusCode: 501, headers, body: JSON.stringify({ ok: false, error: 'Falta RESEND_API_KEY en Netlify.' }) };
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 501, headers, body: JSON.stringify({ ok: false, error: 'Faltan variables de Supabase en Netlify.' }) };

  let payload = {};
  try { payload = JSON.parse(event.body || '{}'); } catch(e) { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'JSON inválido' }) }; }

  const clean = (v) => String(v || '').trim();
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
  const isServiceCampaign = campaignStyle === 'service' || occasion === 'servicio' || /servicio\s+t[eé]cnico/i.test(productName);

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

  let recipients = [];
  const sourceCounts = { registered:0, direct_sales:0, newsletter:0, manual:0 };
  try {
    if (testEmail) {
      recipients = [{ email: testEmail, nombre: 'Prueba ThinkStore', source:'test' }];
    } else {
      const registered = [];
      // 1) clientes: perfiles comerciales ya existentes.
      try {
        const clientes = await supabaseGet('clientes?select=*');
        registered.push(...(clientes || []).map(c => ({ id:c.id, email: clean(c.correo || c.email), nombre: clean(c.nombre || c.name || c.full_name || 'Cliente'), source:'registered' })));
      } catch (e) { console.warn('Campañas: clientes', e.message || e); }
      // 2) profiles: asegura incluir usuarios registrados aunque aún no tengan fila en clientes.
      try {
        const profiles = await supabaseGet('profiles?select=*');
        registered.push(...(profiles || []).map(c => ({ id:c.id, email: clean(c.correo || c.email), nombre: clean(c.nombre || c.full_name || c.name || 'Cliente'), source:'registered' })));
      } catch (e) { console.warn('Campañas: profiles', e.message || e); }
      // 3) Supabase Auth: fuente definitiva de cuentas registradas, incluso si su perfil comercial está incompleto.
      try {
        const ar = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000&page=1`, { headers:{apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${SUPABASE_SERVICE_ROLE_KEY}`} });
        const aj = await ar.json().catch(()=>({}));
        if(ar.ok){
          const authUsers = Array.isArray(aj?.users)?aj.users:Array.isArray(aj)?aj:[];
          registered.push(...authUsers.map(u=>({id:u.id,email:clean(u.email),nombre:clean(u.user_metadata?.full_name||u.user_metadata?.name||'Cliente'),source:'registered'})));
        }
      } catch (e) { console.warn('Campañas: auth users', e.message || e); }
      const regValid = registered.filter(c => c.email && c.email.includes('@'));
      sourceCounts.registered = new Set(regValid.map(c=>c.email.toLowerCase())).size;

      // 3) ventas presenciales / directas: el cliente puede no tener cuenta Auth.
      let direct = [];
      try {
        const pedidos = await supabaseGet('pedidos?select=*');
        direct = (pedidos || []).map(o => ({
          id:o.id,
          email: clean(o.guest_email || o.customer_email || o.email),
          nombre: clean(o.guest_name || o.customer_name || 'Cliente ThinkStore'),
          source:'direct_sales',
          client_id:o.cliente_id
        })).filter(c => c.email && c.email.includes('@'));
        sourceCounts.direct_sales = new Set(direct.map(c=>c.email.toLowerCase())).size;

        if (audience === 'buyers') {
          const buyerIds = new Set((pedidos || []).map(o => String(o.cliente_id || '')).filter(Boolean));
          const buyerEmails = new Set(direct.map(x=>x.email.toLowerCase()));
          recipients = regValid.filter(c => buyerIds.has(String(c.id || '')) || buyerEmails.has(c.email.toLowerCase())).concat(direct);
        }
      } catch (e) { if(audience==='direct_sales'||audience==='buyers') throw e; console.warn('Campañas: ventas directas', e.message || e); }

      // 4) suscriptores web con consentimiento explícito.
      let newsletterRecipients = [];
      try {
        const subscribers = await supabaseGet('newsletter_subscribers?select=email,status&status=eq.subscribed');
        newsletterRecipients = (subscribers || []).map(n => ({ email: clean(n.email), nombre: 'Cliente ThinkStore', source:'newsletter' })).filter(n => n.email && n.email.includes('@'));
        sourceCounts.newsletter = new Set(newsletterRecipients.map(n=>n.email.toLowerCase())).size;
      } catch (newsletterError) {
        if (audience === 'newsletter') throw newsletterError;
        console.warn('ThinkStore Newsletter aún no activado:', newsletterError.message || newsletterError);
      }

      if (audience === 'registered') recipients = regValid;
      else if (audience === 'direct_sales') recipients = direct;
      else if (audience === 'newsletter') recipients = newsletterRecipients;
      else if (audience === 'buyers') { /* ya armado arriba */ }
      else if (audience === 'crm_tag') {
        if(!crmTag) throw new Error('Selecciona una etiqueta CRM.');
        const crmRows = await supabaseGet('ts_customer_crm?select=email,tags');
        const wanted = crmTag.toLowerCase();
        const allowed = new Set((crmRows||[]).filter(x=>Array.isArray(x.tags)&&x.tags.some(t=>clean(t).toLowerCase()===wanted)).map(x=>clean(x.email).toLowerCase()).filter(Boolean));
        recipients = regValid.concat(direct,newsletterRecipients).filter(x=>allowed.has(x.email.toLowerCase()));
      }
      else if (audience === 'manual') recipients = [];
      else recipients = regValid.concat(direct, newsletterRecipients); // all_contacts

      if (manualEmails.length) {
        const manualRows = manualEmails.map(email => ({ email, nombre:'Contacto ThinkStore', source:'manual' }));
        sourceCounts.manual = manualRows.length;
        recipients = recipients.concat(manualRows);
      }
    }
  } catch (error) {
    return { statusCode: 502, headers, body: JSON.stringify({ ok:false, error:`No se pudieron cargar los destinatarios: ${error.message || error}` }) };
  }

  recipients = Array.from(new Map(recipients.map(r => [r.email.toLowerCase(), r])).values());
  if (recipients.length > 2000) return { statusCode:400, headers, body:JSON.stringify({ok:false,error:'La audiencia supera 2.000 destinatarios. Divide la campaña en segmentos.'}) };
  if (!recipients.length) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'No hay destinatarios válidos.' }) };

  const esc = (v) => String(v || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function serviceHtmlFor(name) {
    const hero = bannerUrl || 'https://thinkstore.com.ve/assets/marketing/servicio-tecnico-macbook-battery.jpg';
    const iphoneCard = 'https://thinkstore.com.ve/assets/featured_iphone_card_premium.png';
    const macCard = 'https://thinkstore.com.ve/assets/featured_macbook_card_premium.png';
    const repairPrice = pricePro || '9,99';
    const reviewPrice = priceProMax || 'Revisión gratuita';
    const serviceUrl = actionUrl || 'https://thinkstore.com.ve/servicio-tecnico.html';
    const serviceLabel = actionLabel || 'Consultar servicio técnico';
    const agendaUrl = 'https://thinkstore.com.ve/agenda-soporte.html';
    const whatsappUrl = secondaryActionUrl || 'https://wa.me/584120142898';
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
              <table role="presentation" class="ts-two" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td class="ts-cell" width="50%" valign="top" style="padding:0 6px 0 0;">
                  <div style="min-height:190px;background:#fff;border:1px solid #e0e0e5;border-radius:20px;padding:18px;position:relative;overflow:hidden;">
                    <div style="font-size:10px;letter-spacing:.13em;font-weight:800;color:#6e6e73;text-transform:uppercase;">REPARACIONES</div>
                    <div style="font-size:12px;color:#6e6e73;font-weight:700;margin-top:9px;">Desde</div>
                    <div style="font-size:37px;line-height:1;font-weight:800;letter-spacing:-.045em;color:#111;margin-top:4px;">${esc(repairPrice)}</div>
                    <div style="font-size:12px;color:#86868b;margin-top:8px;">A partir de</div>
                    <img src="${iphoneCard}" alt="Reparaciones iPhone" width="112" style="display:block;width:112px;height:auto;margin:10px 0 0 auto;border:0;">
                  </div>
                </td>
                <td class="ts-cell" width="50%" valign="top" style="padding:0 0 0 6px;">
                  <div style="min-height:190px;background:#fff;border:1px solid #e0e0e5;border-radius:20px;padding:18px;position:relative;overflow:hidden;">
                    <div style="font-size:10px;letter-spacing:.13em;font-weight:800;color:#6e6e73;text-transform:uppercase;">REVISIONES</div>
                    <div style="font-size:12px;color:#6e6e73;font-weight:700;margin-top:9px;">Desde</div>
                    <div style="font-size:32px;line-height:1.02;font-weight:800;letter-spacing:-.04em;color:#111;margin-top:4px;">${esc(reviewPrice)}</div>
                    <div style="font-size:12px;color:#86868b;margin-top:8px;">Sin costo inicial</div>
                    <img src="${macCard}" alt="Revisión MacBook" width="112" style="display:block;width:112px;height:auto;margin:10px 0 0 auto;border:0;">
                  </div>
                </td>
              </tr></table>
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
    const priceCells = [];
    if (pricePro) priceCells.push(`<td valign="top" style="width:${priceProMax?'50%':'100%'};padding:${priceProMax?'0 6px 0 0':'0'};"><div style="background:linear-gradient(180deg,#ffffff 0%,#fbfbfd 100%);border:1px solid #e6e6eb;border-radius:22px;padding:18px 18px 16px;box-shadow:0 10px 24px rgba(0,0,0,.04);"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#86868b;font-weight:800;margin-bottom:7px;">iPhone 18 Pro</div><div style="font-size:12px;line-height:1.2;color:#6e6e73;font-weight:700;margin-bottom:4px;">Desde</div><div style="font-size:34px;line-height:1;letter-spacing:-.045em;color:#1d1d1f;font-weight:800;">${esc(pricePro)}</div><div style="font-size:12px;line-height:1.45;color:#86868b;margin-top:8px;">Precio preventa</div></div></td>`);
    if (priceProMax) priceCells.push(`<td valign="top" style="width:${pricePro?'50%':'100%'};padding:${pricePro?'0 0 0 6px':'0'};"><div style="background:linear-gradient(180deg,#ffffff 0%,#fbfbfd 100%);border:1px solid #e6e6eb;border-radius:22px;padding:18px 18px 16px;box-shadow:0 10px 24px rgba(0,0,0,.04);"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#86868b;font-weight:800;margin-bottom:7px;">iPhone 18 Pro Max</div><div style="font-size:12px;line-height:1.2;color:#6e6e73;font-weight:700;margin-bottom:4px;">Desde</div><div style="font-size:34px;line-height:1;letter-spacing:-.045em;color:#1d1d1f;font-weight:800;">${esc(priceProMax)}</div><div style="font-size:12px;line-height:1.45;color:#86868b;margin-top:8px;">Precio preventa</div></div></td>`);
    const priceHtml = priceCells.length ? `<div style="font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:#86868b;font-weight:800;margin:22px 0 12px;">Precio preventa</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${priceCells.join('')}</tr></table>` : '';
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
                  Asesoría personalizada · Retiro en Chacao · Envíos nacionales por MRW, Zoom y Tealca
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

  const from = process.env.FROM_MARKETING_EMAIL || process.env.FROM_INFO_EMAIL || 'ThinkStore <info@thinkstore.com.ve>';
  const replyTo = process.env.REPLY_TO_MARKETING || process.env.REPLY_TO_INFO || 'info@thinkstore.com.ve';
  let sent = 0, failed = 0, errors = [];
  async function sendOne(r) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to: r.email, reply_to: replyTo, subject,
          html: htmlFor(r.nombre),
          text: isServiceCampaign
            ? `${title}

${subtitle}

${message}

${productName}
${productDetails}
${offer}
Reparaciones desde: ${pricePro || '9,99'}
Revisiones: ${priceProMax || 'Revisión gratuita'}

Consultar servicio técnico: ${actionUrl || 'https://thinkstore.com.ve/servicio-tecnico.html'}
Agenda tu cita: https://thinkstore.com.ve/agenda-soporte.html${secondaryActionLabel&&secondaryActionUrl?`
${secondaryActionLabel}: ${secondaryActionUrl}`:''}`
            : `${title}

${subtitle}

${message}

${productName}
${productDetails}
${offer}${pricePro?`
Opción 1: ${pricePro}`:''}${priceProMax?`
Opción 2: ${priceProMax}`:''}

${actionUrl}${secondaryActionLabel&&secondaryActionUrl?`
${secondaryActionLabel}: ${secondaryActionUrl}`:''}`
        })
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) sent++; else { failed++; errors.push(`${r.email}: ${result.message || result.error || `Resend HTTP ${response.status}`}`); }
    } catch (error) { failed++; errors.push(`${r.email}: ${error.message || 'No fue posible conectar con Resend'}`); }
  }
  // Concurrencia moderada: más rápido sin disparar cientos de solicitudes simultáneas.
  for (let i=0;i<recipients.length;i+=5) await Promise.all(recipients.slice(i,i+5).map(sendOne));

  await supabaseInsert('marketing_campaigns', [{
    subject, title, subtitle, audience,
    recipients_count: recipients.length, sent_count: sent, failed_count: failed,
    banner_url: bannerUrl || null,
    content_json: { message, productName, productDetails, offer, pricePro, priceProMax, actionUrl, actionLabel, secondaryActionUrl, secondaryActionLabel, kicker, badge, preheader, bannerFit, bannerPosition, campaignStyle, occasion, manualCount: manualEmails.length },
    created_at: new Date().toISOString()
  }]);

  return { statusCode: sent > 0 ? 200 : 502, headers, body: JSON.stringify({ ok: sent > 0, total: recipients.length, sent, failed, sources:sourceCounts, errors: errors.slice(0, 8), error: sent > 0 ? null : (errors[0] || 'Resend no aceptó ningún correo') }) };
};
