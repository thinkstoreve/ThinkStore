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
  const subject = clean(payload.subject || 'Novedades ThinkStore');
  const title = clean(payload.title || 'Nuevas ofertas disponibles');
  const subtitle = clean(payload.subtitle || 'Descubre productos Apple, accesorios y preórdenes exclusivas en ThinkStore.');
  const message = clean(payload.message || 'Tenemos novedades para ti. Revisa nuestro catálogo y consulta disponibilidad.');
  const productName = clean(payload.productName || 'Producto destacado ThinkStore');
  const productDetails = clean(payload.productDetails || 'Disponibilidad, garantía y asesoría especializada.');
  const offer = clean(payload.offer || 'Consulta precio y disponibilidad');
  const actionUrl = clean(payload.actionUrl || 'https://thinkstore.com.ve');
  const actionLabel = clean(payload.actionLabel || 'Ver promoción');
  const audience = clean(payload.audience || 'all');
  const testEmail = clean(payload.testEmail || '');
  const crmTag = clean(payload.crmTag || '');
  const logoUrl = clean(payload.logoUrl || 'https://thinkstore.com.ve/assets/thinkstore-email-logo.jpg');
  const bannerUrl = clean(payload.bannerUrl || '');
  const bannerFit = ['cover','contain'].includes(clean(payload.bannerFit)) ? clean(payload.bannerFit) : 'cover';
  const bannerPosition = clean(payload.bannerPosition || '50% 50%').replace(/[^0-9% .-]/g,'').slice(0,32) || '50% 50%';

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
  const sourceCounts = { registered:0, direct_sales:0, newsletter:0 };
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
      else recipients = regValid.concat(direct, newsletterRecipients); // all_contacts
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

  function htmlFor(name) {
    const banner = bannerUrl ? `<img src="${esc(bannerUrl)}" alt="Promoción ThinkStore" style="width:100%;max-height:260px;object-fit:${esc(bannerFit)};object-position:${esc(bannerPosition)};border-radius:24px;border:0;margin:0 0 26px;display:block;">` : '';
    return `
    <div style="margin:0;padding:0;background:#050505;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#ffffff;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:28px 12px;">
        <tr><td align="center">
          <table role="presentation" width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%;background:#111114;border:1px solid rgba(255,255,255,.12);border-radius:30px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.45);">
            <tr><td style="background:linear-gradient(145deg,#050505 0%,#18181d 55%,#2c2c35 100%);padding:34px 34px 32px;">
              <div style="background:#ffffff;border-radius:22px;padding:16px 20px;display:inline-block;margin-bottom:28px;">
                <img src="${esc(logoUrl)}" alt="ThinkStore" width="240" style="display:block;width:240px;max-width:100%;height:auto;border:0;">
              </div>
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.58);margin-bottom:12px;">Promoción exclusiva</div>
              <h1 style="font-size:38px;line-height:1.08;margin:0 0 12px;color:#ffffff;font-weight:800;">${esc(title)}</h1>
              <p style="font-size:17px;line-height:1.65;margin:0;color:rgba(255,255,255,.76);">${esc(subtitle)}</p>
            </td></tr>
            <tr><td style="padding:34px;background:#111114;">
              ${banner}
              <p style="font-size:17px;line-height:1.75;margin:0 0 24px;color:#f5f5f7;">Hola ${esc(name)},</p>
              <div style="background:#1b1b20;border:1px solid rgba(255,255,255,.10);border-radius:24px;padding:24px;margin-bottom:26px;color:#f5f5f7;font-size:17px;line-height:1.75;">
                ${esc(message).replace(/\n/g, '<br>')}
              </div>
              <div style="background:#f5f5f7;color:#111111;border-radius:24px;padding:24px;margin-bottom:28px;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:.16em;color:#6e6e73;margin-bottom:10px;">Producto destacado</div>
                <h2 style="font-size:28px;line-height:1.2;margin:0 0 10px;color:#111111;">${esc(productName)}</h2>
                <p style="font-size:16px;line-height:1.65;margin:0 0 16px;color:#333333;">${esc(productDetails)}</p>
                <div style="display:inline-block;background:#111111;color:#ffffff;border-radius:999px;padding:10px 18px;font-size:15px;font-weight:800;">${esc(offer)}</div>
              </div>
              <div style="text-align:center;margin:34px 0 8px;">
                <a href="${esc(actionUrl)}" style="display:inline-block;background:#ffffff;color:#000000;text-decoration:none;border-radius:999px;padding:16px 30px;font-size:16px;font-weight:800;">${esc(actionLabel)}</a>
              </div>
              <div style="display:grid;gap:10px;margin-top:28px;color:rgba(255,255,255,.70);font-size:14px;line-height:1.6;">
                <div>✅ Tienda física en Altamira</div>
                <div>✅ Envíos por MRW, Zoom y Tealca</div>
                <div>✅ Equipos Apple, accesorios y preórdenes</div>
                <div>✅ Atención especializada ThinkStore</div>
              </div>
            </td></tr>
            <tr><td style="background:#0b0b0d;border-top:1px solid rgba(255,255,255,.10);padding:24px 34px;font-size:13px;line-height:1.7;color:rgba(255,255,255,.58);">
              <strong style="color:#ffffff;">ThinkStore</strong><br>
              Altamira, Caracas · Venezuela<br>
              <a href="https://thinkstore.com.ve" style="color:#ffffff;text-decoration:underline;">www.thinkstore.com.ve</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </div>`;
  }

  const from = process.env.FROM_MARKETING_EMAIL || process.env.FROM_VENTAS_EMAIL || 'ThinkStore Promociones <ventas@thinkstore.com.ve>';
  const replyTo = process.env.REPLY_TO_MARKETING || process.env.REPLY_TO_VENTAS || 'ventas@thinkstore.com.ve';
  let sent = 0, failed = 0, errors = [];
  async function sendOne(r) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to: r.email, reply_to: replyTo, subject,
          html: htmlFor(r.nombre),
          text: `${title}\n\n${subtitle}\n\n${message}\n\n${productName}\n${productDetails}\n${offer}\n\n${actionUrl}`
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
    content_json: { message, productName, productDetails, offer, actionUrl, actionLabel, bannerFit, bannerPosition },
    created_at: new Date().toISOString()
  }]);

  return { statusCode: sent > 0 ? 200 : 502, headers, body: JSON.stringify({ ok: sent > 0, total: recipients.length, sent, failed, sources:sourceCounts, errors: errors.slice(0, 8), error: sent > 0 ? null : (errors[0] || 'Resend no aceptó ningún correo') }) };
};
