exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };

  // Acepta la clave privada de Netlify y el código corto del panel.
  // Esto evita que el dashboard pueda leer datos pero falle al cambiar estados.
  const expectedSecret = process.env.THINKSTORE_ADMIN_SECRET || 'THINK2026';
  const expectedCode = process.env.THINKSTORE_ADMIN_CODE || 'THINK2026';
  const provided = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'] || '';
  if (![String(expectedSecret), String(expectedCode)].includes(String(provided))) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Acceso administrador no autorizado' }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 501, headers, body: JSON.stringify({ ok: false, error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Netlify.' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'JSON inválido' }) }; }

  const id = String(body.id || body.db_id || '').trim();
  const code = String(body.code || body.codigo || '').trim();
  const status = String(body.status || body.estado || '').trim();
  const guide = String(body.guideNumber || body.numero_guia || '').trim();
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

  const allStatuses = ['Pedido recibido','Pago verificado','Preparando pedido','Comprando proveedor','En tránsito','Disponible para entrega','Enviado','Entregado'];
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
    const map = {
      pedidos: process.env.FROM_PEDIDOS_EMAIL || 'ThinkStore Pedidos <pedidos@thinkstore.com.ve>',
      preordenes: process.env.FROM_PREORDENES_EMAIL || 'ThinkStore Preórdenes <preordenes@thinkstore.com.ve>',
      soporte: process.env.FROM_SOPORTE_EMAIL || 'ThinkStore Soporte <soporte@thinkstore.com.ve>',
      ventas: process.env.FROM_VENTAS_EMAIL || 'ThinkStore Ventas <ventas@thinkstore.com.ve>'
    };
    return map[department] || map.pedidos;
  }

  async function sendStatusEmail(pedido) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY || !pedido.customerEmail) return { skipped: true, reason: !RESEND_API_KEY ? 'missing_resend_key' : 'missing_customer_email' };
    const email = buildEmail(pedido);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromForDepartment(email.department),
        to: pedido.customerEmail,
        reply_to: email.department === 'preordenes' ? 'preordenes@thinkstore.com.ve' : (email.department === 'soporte' ? 'soporte@thinkstore.com.ve' : 'pedidos@thinkstore.com.ve'),
        subject: email.subject,
        text: email.text,
        html: email.html
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Pedido actualizado, pero Resend no pudo enviar el correo.');
    return { sent: true, id: result.id || null, department: email.department };
  }

  try {
    const query = id ? `id=eq.${encodeURIComponent(id)}` : `codigo=eq.${encodeURIComponent(code)}`;
    const payload = { estado: status, updated_at: new Date().toISOString() };
    if (guide) payload.numero_guia = guide;

    const res = await fetch(api + 'pedidos?' + query, { method: 'PATCH', headers: baseHeaders, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.message || data.error || 'No se pudo actualizar el pedido');

    const updated = Array.isArray(data) ? data[0] : data;
    const updatedId = updated?.id || id;

    if (updatedId) {
      await fetch(api + 'order_status_history', {
        method: 'POST',
        headers: { ...baseHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ order_id: updatedId, status, note: body.note || 'Actualizado desde dashboard administrador' })
      }).catch(() => null);
    }

    let fullPedido = updated || {};
    if (updatedId) {
      const read = await fetch(api + `pedidos?select=*,clientes(*),pedido_items(*)&id=eq.${encodeURIComponent(updatedId)}`, { headers: baseHeaders });
      const readData = await read.json().catch(() => []);
      if (read.ok && Array.isArray(readData) && readData[0]) fullPedido = readData[0];
    }

    const normalized = normalizePedido(fullPedido);
    let emailResult = { skipped: true };
    try { emailResult = await sendStatusEmail(normalized); }
    catch (emailError) { emailResult = { sent: false, error: emailError.message || 'No se pudo enviar correo' }; }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, pedido: fullPedido || null, normalized, email: emailResult }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message || 'Error interno' }) };
  }
};
