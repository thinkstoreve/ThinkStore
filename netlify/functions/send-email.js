exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };

  const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.RESEND_APY_KEY;
  if (!RESEND_API_KEY) {
    return { statusCode: 501, headers, body: JSON.stringify({ ok: false, error: 'Falta configurar RESEND_API_KEY o RESEND_APY_KEY en Netlify.' }) };
  }

  let data;
  try { data = JSON.parse(event.body || '{}'); }
  catch (error) { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'JSON inválido' }) }; }

  const clean = (v) => String(v || '').trim();
  const to = clean(data.to);
  const subject = clean(data.subject || 'ThinkStore');
  const text = clean(data.text || data.message || '');
  const department = clean(data.department || data.channel || data.type || 'pedidos').toLowerCase();
  const logoUrl = clean(data.logoUrl || 'https://thinkstore.com.ve/assets/thinkstore-email-logo.jpg');
  const actionUrl = clean(data.actionUrl || data.trackingUrl || 'https://thinkstore.com.ve');
  const actionLabel = clean(data.actionLabel || 'Ver en ThinkStore');

  if (!to || !to.includes('@')) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Correo del cliente inválido.' }) };
  if (!text) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Mensaje vacío.' }) };

  const departments = {
    pedidos: {
      from: process.env.FROM_PEDIDOS_EMAIL || 'ThinkStore Pedidos <pedidos@thinkstore.com.ve>',
      replyTo: process.env.REPLY_TO_PEDIDOS || 'pedidos@thinkstore.com.ve',
      label: 'Pedidos ThinkStore'
    },
    preordenes: {
      from: process.env.FROM_PREORDENES_EMAIL || 'ThinkStore Preórdenes <preordenes@thinkstore.com.ve>',
      replyTo: process.env.REPLY_TO_PREORDENES || 'preordenes@thinkstore.com.ve',
      label: 'Preórdenes ThinkStore'
    },
    soporte: {
      from: process.env.FROM_SOPORTE_EMAIL || 'ThinkStore Soporte <soporte@thinkstore.com.ve>',
      replyTo: process.env.REPLY_TO_SOPORTE || 'soporte@thinkstore.com.ve',
      label: 'Soporte ThinkStore'
    },
    ventas: {
      from: process.env.FROM_VENTAS_EMAIL || process.env.FROM_EMAIL || 'ThinkStore Ventas <ventas@thinkstore.com.ve>',
      replyTo: process.env.REPLY_TO_VENTAS || process.env.REPLY_TO || 'ventas@thinkstore.com.ve',
      label: 'Ventas ThinkStore'
    }
  };
  const selected = departments[department] || departments.pedidos;

  const esc = (v) => String(v || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const htmlText = esc(text)
    .replace(/━━━━━━━━━━━━━━━━━━━━━━/g, '<hr style="border:none;border-top:1px solid rgba(255,255,255,.12);margin:24px 0">')
    .replace(/\n/g, '<br>');

  const html = `
  <div style="margin:0;padding:0;background:#050505;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#111114;border:1px solid rgba(255,255,255,.12);border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.45);">
            <tr>
              <td style="background:linear-gradient(145deg,#050505 0%,#17171b 50%,#2a2a31 100%);padding:34px 34px 28px;">
                <div style="background:#ffffff;border-radius:22px;padding:18px 22px;display:inline-block;margin-bottom:28px;">
                  <img src="${esc(logoUrl)}" alt="ThinkStore" width="260" style="display:block;width:260px;max-width:100%;height:auto;border:0;">
                </div>
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.58);margin-bottom:12px;">${esc(selected.label)}</div>
                <h1 style="font-size:34px;line-height:1.15;margin:0;color:#ffffff;font-weight:800;">Actualización ThinkStore</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 34px;background:#111114;">
                <div style="background:#1b1b20;border:1px solid rgba(255,255,255,.10);border-radius:20px;padding:22px;font-size:17px;line-height:1.75;color:#f5f5f7;">
                  ${htmlText}
                </div>
                <div style="text-align:center;margin:30px 0 4px;">
                  <a href="${esc(actionUrl)}" style="display:inline-block;background:#ffffff;color:#000000;text-decoration:none;border-radius:999px;padding:15px 26px;font-size:15px;font-weight:800;">${esc(actionLabel)}</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#0b0b0d;border-top:1px solid rgba(255,255,255,.10);padding:24px 34px;font-size:13px;line-height:1.7;color:rgba(255,255,255,.58);">
                <strong style="color:#ffffff;">ThinkStore</strong><br>
                Altamira, Caracas · Venezuela<br>
                <a href="https://thinkstore.com.ve" style="color:#ffffff;text-decoration:underline;">www.thinkstore.com.ve</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: selected.from,
        to,
        reply_to: selected.replyTo,
        subject,
        text,
        html
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { statusCode: response.status, headers, body: JSON.stringify({ ok: false, error: result.message || 'Error enviando correo.' }) };
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: result.id || null, department, from: selected.from }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message || 'Error interno.' }) };
  }
};
