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
  const logoUrl = clean(data.logoUrl || 'https://thinkstore.com.ve/assets/logo-thinkstore.PNG');
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
    .replace(/━━━━━━━━━━━━━━━━━━━━━━/g, '<hr style="border:none;border-top:1px solid #eeeeee;margin:24px 0">')
    .replace(/\n/g, '<br>');

  const html = `
  <div style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111111;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111111;max-width:600px;width:100%;">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #eeeeee;">
              ${logoUrl ? `<img src="${esc(logoUrl)}" alt="ThinkStore" width="140" style="display:block;height:auto;max-width:140px;">` : `<strong style="font-size:22px;">ThinkStore</strong>`}
            </td>
          </tr>
          <tr>
            <td style="padding:38px 36px;font-size:17px;line-height:1.75;color:#111111;">
              <div style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#6e6e73;margin-bottom:12px;">${esc(selected.label)}</div>
              ${htmlText}
              <div style="text-align:center;margin:36px 0 10px;">
                <a href="${esc(actionUrl)}" style="background:#000000;color:#ffffff;text-decoration:none;padding:16px 34px;border-radius:8px;font-size:16px;font-weight:bold;display:inline-block;">${esc(actionLabel)}</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f7f7f7;padding:24px 36px;border-top:1px solid #eeeeee;font-size:14px;line-height:23px;color:#555555;">
              <strong style="color:#111111;">ThinkStore</strong><br>
              Altamira, Caracas - Venezuela<br>
              <a href="https://thinkstore.com.ve" style="color:#111111;text-decoration:underline;">www.thinkstore.com.ve</a>
            </td>
          </tr>
        </table>
      </td></tr>
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
