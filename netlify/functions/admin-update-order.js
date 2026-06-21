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
    return allStatuses.map((s, i) => {
      const done = i <= pos;
      return `<tr><td style="width:28px;padding:5px 0;color:${done ? '#111111' : '#b5b5b5'};font-weight:bold;">${done ? '●' : '○'}</td><td style="padding:5px 0;color:${done ? '#111111' : '#8a8a8a'};font-size:15px;">${esc(s)}</td></tr>`;
    }).join('');
  }

  function normalizePedido(p) {
    const customer = p.clientes || p.customer || {};
    const items = p.pedido_items || p.items || [];
    return {
      id: p.id,
      code: p.codigo || p.code || code || 'TS-000',
      customerName: customer.nombre || customer.name || p.customer_name || p.nombre || 'cliente',
      customerEmail: customer.correo || customer.email || p.customer_email || p.correo || '',
      status: p.estado || p.status || status,
      guide: p.numero_guia || p.guideNumber || guide || '',
      total: p.total || p.total_usd || p.monto || '',
      shippingCompany: p.empresa_envio || p.shipping_company || p.shippingCompany || '',
      items: Array.isArray(items) ? items : []
    };
  }

  function buildEmail(pedido) {
    const meta = statusMeta[pedido.status] || { icon: '📦', title: 'Actualización de tu pedido', department: 'pedidos' };
    const itemLines = (pedido.items || []).map(i => {
      return `${i.producto || i.product_name || i.product || i.nombre || 'Producto'}${i.color ? ' · ' + i.color : ''}${(i.capacidad || i.capacity) ? ' · ' + (i.capacidad || i.capacity) : ''}`;
    });
    const guideLine = pedido.guide ? `<p style="font-size:16px;line-height:1.7;margin:0 0 18px;"><strong>Número de guía:</strong> ${esc(pedido.guide)}</p>` : '';
    const shippingLine = pedido.shippingCompany ? `<p style="font-size:16px;line-height:1.7;margin:0 0 18px;"><strong>Empresa de envío:</strong> ${esc(pedido.shippingCompany)}</p>` : '';
    const text = `Hola ${pedido.customerName},\n\n${meta.title}.\n\nPedido: ${pedido.code}\nEstado actual: ${pedido.status}\n${pedido.guide ? `Guía: ${pedido.guide}\n` : ''}\nGracias por confiar en ThinkStore.`;

    const html = `
    <div style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111111;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;width:100%;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111111;">
          <tr><td style="padding:24px 32px;border-bottom:1px solid #eeeeee;"><img src="https://thinkstore.com.ve/assets/logo-thinkstore.PNG" alt="ThinkStore" width="140" style="display:block;height:auto;max-width:140px;"></td></tr>
          <tr><td style="padding:38px 36px;">
            <h1 style="font-size:30px;line-height:1.25;margin:0 0 26px;color:#111111;">${esc(meta.icon)} ${esc(meta.title)}</h1>
            <p style="font-size:17px;line-height:1.7;margin:0 0 18px;">Hola <strong>${esc(pedido.customerName)}</strong>,</p>
            <p style="font-size:17px;line-height:1.7;margin:0 0 24px;">Tu pedido <strong>${esc(pedido.code)}</strong> fue actualizado a:</p>
            <div style="background:#f7f7f7;border:1px solid #eeeeee;padding:18px 20px;margin:0 0 26px;"><strong style="font-size:20px;">${esc(pedido.status)}</strong></div>
            ${shippingLine}${guideLine}
            ${itemLines.length ? `<p style="font-size:16px;line-height:1.7;margin:0 0 10px;"><strong>Productos:</strong></p><ul style="font-size:15px;line-height:1.7;margin-top:0;">${itemLines.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : ''}
            <table cellpadding="0" cellspacing="0" width="100%" style="margin:26px 0;border-top:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:14px 0;">${progressHtml(pedido.status)}</table>
            <div style="text-align:center;margin:34px 0 8px;"><a href="https://thinkstore.com.ve/?tracking=${encodeURIComponent(pedido.code)}#estatus" style="background:#000000;color:#ffffff;text-decoration:none;padding:16px 34px;border-radius:8px;font-size:16px;font-weight:bold;display:inline-block;">Ver mi pedido</a></div>
          </td></tr>
          <tr><td style="background:#f7f7f7;padding:24px 36px;border-top:1px solid #eeeeee;font-size:14px;line-height:23px;color:#555555;"><strong style="color:#111111;">ThinkStore</strong><br>Altamira, Caracas - Venezuela<br><a href="https://thinkstore.com.ve" style="color:#111111;text-decoration:underline;">www.thinkstore.com.ve</a></td></tr>
        </table>
      </td></tr></table>
    </div>`;
    return { subject: `${pedido.status} | Pedido ${pedido.code} | ThinkStore`, text, html, department: meta.department };
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

  async function sendStatusEmail(pedido) {
    const RESEND_API_KEY = clean(process.env.RESEND_API_KEY);
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
