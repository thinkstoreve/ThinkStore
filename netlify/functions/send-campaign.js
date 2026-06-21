exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };

  const expectedSecret = process.env.THINKSTORE_ADMIN_SECRET;
  const expectedCode = process.env.THINKSTORE_ADMIN_CODE;
  const provided = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'] || '';
  if (![String(expectedSecret || ''), String(expectedCode || '')].includes(String(provided || ''))) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Acceso administrador no autorizado' }) };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.RESEND_APY_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
  const logoUrl = clean(payload.logoUrl || 'https://thinkstore.com.ve/assets/thinkstore-email-logo.jpg');
  const bannerUrl = clean(payload.bannerUrl || '');

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
  if (testEmail) {
    recipients = [{ email: testEmail, nombre: 'Prueba ThinkStore' }];
  } else {
    const clientes = await supabaseGet('clientes?select=id,nombre,correo,email,created_at');
    recipients = clientes
      .map(c => ({ email: clean(c.correo || c.email), nombre: clean(c.nombre || 'Cliente') }))
      .filter(c => c.email && c.email.includes('@'));

    if (audience === 'buyers') {
      const pedidos = await supabaseGet('pedidos?select=cliente_id');
      const buyerIds = new Set((pedidos || []).map(p => String(p.cliente_id || '')).filter(Boolean));
      const clientesFull = await supabaseGet('clientes?select=id,nombre,correo,email');
      recipients = clientesFull
        .filter(c => buyerIds.has(String(c.id || '')))
        .map(c => ({ email: clean(c.correo || c.email), nombre: clean(c.nombre || 'Cliente') }))
        .filter(c => c.email && c.email.includes('@'));
    }
  }

  recipients = Array.from(new Map(recipients.map(r => [r.email.toLowerCase(), r])).values()).slice(0, 250);
  if (!recipients.length) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'No hay destinatarios válidos.' }) };

  const esc = (v) => String(v || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function htmlFor(name) {
    const banner = bannerUrl ? `<img src="${esc(bannerUrl)}" alt="Promoción ThinkStore" style="width:100%;max-height:260px;object-fit:cover;border-radius:24px;border:0;margin:0 0 26px;display:block;">` : '';
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

  for (const r of recipients) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: r.email,
        reply_to: replyTo,
        subject,
        html: htmlFor(r.nombre),
        text: `${title}\n\n${subtitle}\n\n${message}\n\n${productName}\n${productDetails}\n${offer}\n\n${actionUrl}`
      })
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) sent++; else { failed++; errors.push(`${r.email}: ${result.message || response.status}`); }
  }

  await supabaseInsert('marketing_campaigns', [{
    subject, title, audience, recipients_count: recipients.length, sent_count: sent, failed_count: failed, created_at: new Date().toISOString()
  }]);

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, total: recipients.length, sent, failed, errors: errors.slice(0, 8) }) };
};
