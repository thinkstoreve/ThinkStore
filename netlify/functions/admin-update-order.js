exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };

  const clean = (v) => String(v || '').trim();
  const expectedSecret = clean(process.env.THINKSTORE_ADMIN_SECRET);
  const expectedCode = clean(process.env.THINKSTORE_ADMIN_CODE);
  const provided = clean(event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'] || '');
  if (!provided || ![expectedSecret, expectedCode].filter(Boolean).includes(provided)) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Acceso administrador no autorizado' }) };
  }

  const SUPABASE_URL = clean(process.env.SUPABASE_URL);
  const SUPABASE_SERVICE_ROLE_KEY = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 501, headers, body: JSON.stringify({ ok: false, error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Netlify.' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'JSON inválido' }) }; }

  const id = clean(body.id || body.db_id);
  const code = clean(body.code || body.codigo);
  const status = clean(body.status || body.estado);
  const guide = clean(body.guideNumber || body.numero_guia);
  if (!status) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Estatus requerido' }) };
  if (!id && !code) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'ID o código de pedido requerido' }) };

  const api = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
  const baseHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };

  const esc = (v) => String(v || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  async function sb(path, options={}) {
    const res = await fetch(api + path, { headers: baseHeaders, ...options, headers: { ...baseHeaders, ...(options.headers || {}) } });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (data && (data.message || data.error || data.details)) || `Error Supabase ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function patchPedido() {
    const query = id ? `id=eq.${encodeURIComponent(id)}` : `codigo=eq.${encodeURIComponent(code)}`;

    // Algunas tablas no tienen updated_at. Primero intentamos con updated_at y si falla, repetimos sin esa columna.
    const payloadA = { estado: status, updated_at: new Date().toISOString() };
    if (guide) payloadA.numero_guia = guide;

    try {
      const data = await sb('pedidos?' + query, { method: 'PATCH', body: JSON.stringify(payloadA) });
      return Array.isArray(data) ? data[0] : data;
    } catch (e) {
      const payloadB = { estado: status };
      if (guide) payloadB.numero_guia = guide;
      const data = await sb('pedidos?' + query, { method: 'PATCH', body: JSON.stringify(payloadB) });
      return Array.isArray(data) ? data[0] : data;
    }
  }

  async function readPedido(updated) {
    const updatedId = updated?.id || id;
    const updatedCode = updated?.codigo || code;
    const q = updatedId ? `id=eq.${encodeURIComponent(updatedId)}` : `codigo=eq.${encodeURIComponent(updatedCode)}`;

    // Intento completo con relaciones.
    try {
      const data = await sb(`pedidos?select=*,clientes(*),pedido_items(*)&${q}`);
      if (Array.isArray(data) && data[0]) return data[0];
    } catch (_) {}

    // Fallback simple.
    try {
      const data = await sb(`pedidos?select=*&${q}`);
      if (Array.isArray(data) && data[0]) return data[0];
    } catch (_) {}

    return updated || {};
  }

  async function enrichCliente(pedido) {
    if (pedido.clientes || pedido.customer || !pedido.cliente_id) return pedido;
    try {
      const data = await sb(`clientes?select=*&id=eq.${encodeURIComponent(pedido.cliente_id)}`);
      if (Array.isArray(data) && data[0]) return { ...pedido, clientes: data[0] };
    } catch (_) {}
    return pedido;
  }

  async function readItems(pedido) {
    const pedidoId = pedido?.id || id;
    if (!pedidoId || pedido.pedido_items || pedido.items) return pedido;
    try {
      const data = await sb(`pedido_items?select=*&pedido_id=eq.${encodeURIComponent(pedidoId)}`);
      return { ...pedido, pedido_items: Array.isArray(data) ? data : [] };
    } catch (_) {
      try {
        const data = await sb(`order_items?select=*&pedido_id=eq.${encodeURIComponent(pedidoId)}`);
        return { ...pedido, pedido_items: Array.isArray(data) ? data : [] };
      } catch (_) {}
    }
    return pedido;
  }

  async function insertHistory(updatedId) {
    if (!updatedId) return;
    const candidates = [
      { pedido_id: updatedId, status, note: body.note || 'Actualizado desde dashboard administrador' },
      { order_id: updatedId, status, note: body.note || 'Actualizado desde dashboard administrador' },
      { pedido_id: updatedId, estado: status, nota: body.note || 'Actualizado desde dashboard administrador' }
    ];
    for (const payload of candidates) {
      try {
        await sb('order_status_history', { method:'POST', headers:{ Prefer:'return=minimal' }, body: JSON.stringify(payload) });
        return;
      } catch (_) {}
    }
  }

  const statusMeta = {
    'Pedido recibido': { icon: '🟡', title: 'Hemos recibido tu pedido', department: 'pedidos' },
    'Pago por verificar': { icon: '🟠', title: 'Tu pago está en verificación', department: 'pedidos' },
    'Pago verificado': { icon: '🟢', title: 'Tu pago fue verificado', department: 'pedidos' },
    'Preparando pedido': { icon: '🔵', title: 'Estamos preparando tu pedido', department: 'pedidos' },
    'Comprando proveedor': { icon: '🛒', title: 'Estamos gestionando tu producto', department: 'preordenes' },
    'En tránsito': { icon: '🚚', title: 'Tu producto está en tránsito', department: 'preordenes' },
    'Disponible para entrega': { icon: '🏪', title: 'Tu pedido está disponible para entrega', department: 'pedidos' },
    'Enviado': { icon: '📦', title: 'Tu pedido fue enviado', department: 'pedidos' },
    'Entregado': { icon: '✅', title: 'Tu pedido fue entregado', department: 'pedidos' },
    'Cancelado': { icon: '⚫', title: 'Tu pedido fue cancelado', department: 'soporte' }
  };

  const allStatuses = ['Pedido recibido','Pago por verificar','Pago verificado','Preparando pedido','Comprando proveedor','En tránsito','Disponible para entrega','Enviado','Entregado'];

  function progressHtml(current) {
    const pos = Math.max(0, allStatuses.indexOf(current));
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0;">
        <tr>
          ${allStatuses.map((s, i) => {
            const done = i <= pos;
            const active = i === pos;
            return `
              <td align="center" style="padding:0 2px;vertical-align:top;">
                <div style="height:6px;border-radius:999px;background:${done ? '#ffffff' : 'rgba(255,255,255,.20)'};box-shadow:${active ? '0 0 0 1px rgba(255,255,255,.45)' : 'none'};"></div>
                <div style="font-size:10px;line-height:1.25;color:${done ? '#ffffff' : 'rgba(255,255,255,.45)'};padding-top:9px;min-height:34px;">${esc(s)}</div>
              </td>`;
          }).join('')}
        </tr>
      </table>`;
  }

  function buildEmail(pedido) {
    const meta = statusMeta[pedido.status] || { icon: '📦', title: 'Actualización de tu pedido', department: 'pedidos' };
    const logoUrl = 'https://thinkstore.com.ve/assets/thinkstore-email-logo.jpg';
    const trackingUrl = `https://thinkstore.com.ve/?tracking=${encodeURIComponent(pedido.code)}#estatus`;
    const whatsappUrl = 'https://wa.me/584242142262';
    const itemLines = (pedido.items || []).map(i => {
      return `${i.producto || i.product_name || i.product || i.nombre || 'Producto'}${i.color ? ' · ' + i.color : ''}${(i.capacidad || i.capacity) ? ' · ' + (i.capacidad || i.capacity) : ''}`;
    });
    const itemsHtml = itemLines.length
      ? itemLines.map(x => `<tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.10);font-size:15px;line-height:1.45;color:#f5f5f7;">${esc(x)}</td></tr>`).join('')
      : `<tr><td style="padding:12px 0;font-size:15px;line-height:1.45;color:#f5f5f7;">Producto por confirmar</td></tr>`;

    const guideBox = pedido.guide ? `
      <tr>
        <td style="padding:14px 0 0;">
          <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:15px 16px;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:.10em;color:rgba(255,255,255,.55);margin-bottom:5px;">Número de guía</div>
            <div style="font-size:18px;color:#ffffff;font-weight:700;">${esc(pedido.guide)}</div>
          </div>
        </td>
      </tr>` : '';

    const shippingBox = pedido.shippingCompany ? `
      <tr>
        <td style="padding:14px 0 0;">
          <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:15px 16px;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:.10em;color:rgba(255,255,255,.55);margin-bottom:5px;">Empresa de envío</div>
            <div style="font-size:18px;color:#ffffff;font-weight:700;">${esc(pedido.shippingCompany)}</div>
          </div>
        </td>
      </tr>` : '';

    const text = `Hola ${pedido.customerName},

${meta.title}.

Pedido: ${pedido.code}
Estado actual: ${pedido.status}
${pedido.guide ? `Guía: ${pedido.guide}\n` : ''}${pedido.shippingCompany ? `Empresa de envío: ${pedido.shippingCompany}\n` : ''}
Producto(s):
${itemLines.length ? itemLines.map(x => `- ${x}`).join('\n') : '- Producto por confirmar'}

Puedes revisar el estado de tu pedido en ${trackingUrl}

Gracias por confiar en ThinkStore.`;

    const html = `
    <div style="margin:0;padding:0;background:#050505;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#ffffff;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;border-collapse:separate;border-spacing:0;background:#111114;border:1px solid rgba(255,255,255,.12);border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.45);">
              <tr>
                <td style="background:linear-gradient(145deg,#050505 0%,#17171b 48%,#2a2a31 100%);padding:34px 34px 28px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="left" style="padding-bottom:28px;">
                        <div style="background:#ffffff;border-radius:22px;padding:18px 22px;display:inline-block;">
                          <img src="${esc(logoUrl)}" alt="ThinkStore" width="260" style="display:block;width:260px;max-width:100%;height:auto;border:0;">
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.58);margin-bottom:12px;">Estado de pedido</div>
                        <h1 style="font-size:36px;line-height:1.12;margin:0;color:#ffffff;font-weight:800;">${esc(meta.title)}</h1>
                        <p style="font-size:17px;line-height:1.65;margin:18px 0 0;color:rgba(255,255,255,.76);">Hola <strong style="color:#ffffff;">${esc(pedido.customerName)}</strong>, tu pedido <strong style="color:#ffffff;">${esc(pedido.code)}</strong> fue actualizado.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top:24px;">
                        <div style="display:inline-block;background:#ffffff;color:#000000;border-radius:999px;padding:11px 18px;font-size:15px;font-weight:800;">${esc(meta.icon)} ${esc(pedido.status)}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top:30px;">
                        ${progressHtml(pedido.status)}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:30px 34px 8px;background:#111114;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:0 0 14px;">
                        <div style="background:#1b1b20;border:1px solid rgba(255,255,255,.10);border-radius:20px;padding:20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.50);padding-bottom:8px;">Resumen</td>
                            </tr>
                            <tr>
                              <td style="font-size:16px;line-height:1.75;color:#f5f5f7;">
                                <strong>Pedido:</strong> ${esc(pedido.code)}<br>
                                <strong>Estado actual:</strong> ${esc(pedido.status)}<br>
                                ${pedido.total ? `<strong>Total:</strong> $${esc(pedido.total)}<br>` : ''}
                              </td>
                            </tr>
                            ${shippingBox}
                            ${guideBox}
                          </table>
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:0 0 18px;">
                        <div style="background:#1b1b20;border:1px solid rgba(255,255,255,.10);border-radius:20px;padding:20px;">
                          <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.50);margin-bottom:10px;">Producto(s)</div>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td align="center" style="padding:8px 0 30px;">
                        <a href="${esc(trackingUrl)}" style="display:inline-block;background:#ffffff;color:#000000;text-decoration:none;border-radius:999px;padding:15px 24px;font-size:15px;font-weight:800;margin:4px 6px;">Ver estado del pedido</a>
                        <a href="${esc(whatsappUrl)}" style="display:inline-block;background:#25D366;color:#05130a;text-decoration:none;border-radius:999px;padding:15px 24px;font-size:15px;font-weight:800;margin:4px 6px;">Contactar por WhatsApp</a>
                      </td>
                    </tr>
                  </table>
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
    return { subject: `ThinkStore — ${pedido.status} | ${pedido.code}`, text, html, department: meta.department };
  }

  function fromForDepartment(department) {
    const fallbackFrom = process.env.FROM_EMAIL || 'ThinkStore <onboarding@resend.dev>';
    const map = {
      pedidos: process.env.FROM_PEDIDOS_EMAIL || fallbackFrom,
      preordenes: process.env.FROM_PREORDENES_EMAIL || fallbackFrom,
      soporte: process.env.FROM_SOPORTE_EMAIL || fallbackFrom,
      ventas: process.env.FROM_VENTAS_EMAIL || fallbackFrom
    };
    return map[department] || map.pedidos;
  }

  async 
function normalizePedido(pedido){
  return {
    code: pedido.code || pedido.order_code || pedido.id || 'TS',
    status: pedido.status || 'Actualizado',
    customerName: pedido.customerName || pedido.customer_name || pedido.nombre || 'Cliente',
    customerEmail: pedido.customerEmail || pedido.email || pedido.customer_email || '',
    items: pedido.items || [],
    guide: pedido.guide || pedido.guia || '',
    shippingCompany: pedido.shippingCompany || pedido.shipping_company || ''
  };
}

function sendStatusEmail(pedido) {
    const RESEND_API_KEY = clean(process.env.RESEND_API_KEY || process.env.RESEND_APY_KEY);
    if (!RESEND_API_KEY || !pedido.customerEmail) return { skipped: true, reason: !RESEND_API_KEY ? 'missing_resend_key' : 'missing_customer_email' };
    const email = buildEmail(pedido);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromForDepartment(email.department),
        to: pedido.customerEmail,
        reply_to: process.env.REPLY_TO_EMAIL || 'pedidos@thinkstore.com.ve',
        subject: email.subject,
        text: email.text,
        html: email.html
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { sent: false, error: result.message || result.error || 'Resend no pudo enviar el correo.' };
    return { sent: true, id: result.id || null, department: email.department };
  }

  try {
    const updated = await patchPedido();
    if (!updated) throw new Error('No se encontró el pedido para actualizar.');

    await insertHistory(updated.id || id);

    let fullPedido = await readPedido(updated);
    fullPedido = await enrichCliente(fullPedido);
    fullPedido = await readItems(fullPedido);

    const normalized = normalizePedido(fullPedido);
    const emailResult = await sendStatusEmail(normalized);

    console.log('ThinkStore update-order ok', JSON.stringify({
      code: normalized.code,
      status: normalized.status,
      hasEmail: Boolean(normalized.customerEmail),
      email: emailResult
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, pedido: fullPedido || null, normalized, email: emailResult }) };
  } catch (error) {
    console.error('ThinkStore update-order error', error.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message || 'Error interno' }) };
  }
};
