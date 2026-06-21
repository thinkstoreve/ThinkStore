exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };

<<<<<<< HEAD
  const clean = (v) => String(v ?? '').trim();
=======
  const clean = (v) => String(v || '').trim();
>>>>>>> 99e347dc4cca18d53eaa989144a131a9cd3f3276
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

  let body = {};
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'JSON inválido' }) }; }

<<<<<<< HEAD
  const incomingId = clean(body.id || body.db_id || body.pedido_id);
  const incomingCode = clean(body.code || body.codigo || body.order_code);
  const status = clean(body.status || body.estado);
  const guide = clean(body.guideNumber || body.numero_guia || body.guide);
=======
  const id = clean(body.id || body.db_id);
  const code = clean(body.code || body.codigo);
  const status = clean(body.status || body.estado);
  const guide = clean(body.guideNumber || body.numero_guia);
>>>>>>> 99e347dc4cca18d53eaa989144a131a9cd3f3276
  if (!status) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Estatus requerido' }) };
  if (!incomingId && !incomingCode) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'ID o código de pedido requerido' }) };

  const api = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
  const baseHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };

  const esc = (v) => String(v || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

<<<<<<< HEAD
  const norm = (v) => clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  async function sb(path, options={}) {
    const res = await fetch(api + path, { ...options, headers: { ...baseHeaders, ...(options.headers || {}) } });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const msg = (data && (data.message || data.error || data.details)) || `Error Supabase ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function getOne(path) {
    try {
      const data = await sb(path);
      return Array.isArray(data) ? data[0] : null;
    } catch (_) { return null; }
  }

  async function findPedido() {
    const searches = [];
    if (incomingId) searches.push(`pedidos?select=*&id=eq.${encodeURIComponent(incomingId)}&limit=1`);
    if (incomingCode) {
      searches.push(`pedidos?select=*&codigo=eq.${encodeURIComponent(incomingCode)}&limit=1`);
      searches.push(`pedidos?select=*&codigo=ilike.${encodeURIComponent(incomingCode)}&limit=1`);
      searches.push(`pedidos?select=*&codigo=ilike.${encodeURIComponent('%' + incomingCode + '%')}&limit=1`);
    }
    for (const path of searches) {
      const found = await getOne(path);
      if (found) return found;
    }
    return null;
  }

  async function patchPedido(found) {
    const payloads = [];
    const base = { estado: status };
    if (guide) base.numero_guia = guide;
    payloads.push({ ...base, updated_at: new Date().toISOString() });
    payloads.push(base);

    const filters = [];
    const add = (f) => { if (f && !filters.includes(f)) filters.push(f); };
    add(found?.id ? `id=eq.${encodeURIComponent(found.id)}` : '');
    add(incomingId ? `id=eq.${encodeURIComponent(incomingId)}` : '');
    add(found?.codigo ? `codigo=eq.${encodeURIComponent(found.codigo)}` : '');
    add(incomingCode ? `codigo=eq.${encodeURIComponent(incomingCode)}` : '');
    add(incomingCode ? `codigo=ilike.${encodeURIComponent(incomingCode)}` : '');
    add(incomingCode ? `codigo=ilike.${encodeURIComponent('%' + incomingCode + '%')}` : '');

    let lastError = null;
    for (const filter of filters) {
      for (const payload of payloads) {
        try {
          const data = await sb(`pedidos?${filter}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(payload)
          });
          if (Array.isArray(data) && data[0]) return data[0];
        } catch (e) { lastError = e; }
      }
    }
    if (lastError) throw lastError;
    return null;
  }

  async function readPedido(pedido) {
    const pid = pedido?.id || incomingId;
    const code = pedido?.codigo || incomingCode;
    const paths = [];
    if (pid) {
      paths.push(`pedidos?select=*,clientes(*),pedido_items(*)&id=eq.${encodeURIComponent(pid)}&limit=1`);
      paths.push(`pedidos?select=*&id=eq.${encodeURIComponent(pid)}&limit=1`);
    }
    if (code) {
      paths.push(`pedidos?select=*,clientes(*),pedido_items(*)&codigo=eq.${encodeURIComponent(code)}&limit=1`);
      paths.push(`pedidos?select=*&codigo=eq.${encodeURIComponent(code)}&limit=1`);
      paths.push(`pedidos?select=*&codigo=ilike.${encodeURIComponent('%' + code + '%')}&limit=1`);
    }
    for (const path of paths) {
      const data = await getOne(path);
      if (data) return data;
    }
    return pedido || {};
  }

  async function enrichPedido(pedido) {
    let out = pedido || {};
    if (!out.clientes && out.cliente_id) {
      try {
        const c = await sb(`clientes?select=*&id=eq.${encodeURIComponent(out.cliente_id)}&limit=1`);
        if (Array.isArray(c) && c[0]) out = { ...out, clientes: c[0] };
      } catch (_) {}
    }
    if (!out.pedido_items && out.id) {
      try {
        const items = await sb(`pedido_items?select=*&pedido_id=eq.${encodeURIComponent(out.id)}`);
        out = { ...out, pedido_items: Array.isArray(items) ? items : [] };
      } catch (_) {}
    }
    return out;
  }

  async function insertHistory(pedido) {
    if (!pedido?.id) return;
    const candidates = [
      { pedido_id: pedido.id, estado: status, nota: body.note || 'Actualizado desde dashboard ThinkStore' },
      { pedido_id: pedido.id, status, note: body.note || 'Actualizado desde dashboard ThinkStore' },
      { order_id: pedido.id, status, note: body.note || 'Actualizado desde dashboard ThinkStore' }
    ];
    for (const payload of candidates) {
      try { await sb('order_status_history', { method:'POST', headers:{ Prefer:'return=minimal' }, body: JSON.stringify(payload) }); return; } catch (_) {}
    }
  }

  const statusMeta = {
    'Pedido recibido': { icon: '📦', title: 'Pedido recibido', department: 'pedidos' },
    'Pago por verificar': { icon: '💳', title: 'Pago por verificar', department: 'pedidos' },
    'Pago recibido': { icon: '💳', title: 'Pago recibido', department: 'pedidos' },
    'Pago verificado': { icon: '✅', title: 'Pago verificado', department: 'pedidos' },
    'Preparando pedido': { icon: '⚙️', title: 'Preparando pedido', department: 'pedidos' },
    'En preparación': { icon: '⚙️', title: 'Preparando pedido', department: 'pedidos' },
    'Comprando proveedor': { icon: '🛒', title: 'Compra con proveedor', department: 'preordenes' },
    'En tránsito': { icon: '🚚', title: 'En tránsito', department: 'preordenes' },
    'Disponible para entrega': { icon: '🏪', title: 'Disponible para entrega', department: 'pedidos' },
    'Disponible para retiro': { icon: '🏪', title: 'Disponible para retiro', department: 'pedidos' },
    'Enviado': { icon: '📦', title: 'Pedido enviado', department: 'pedidos' },
    'Entregado': { icon: '✅', title: 'Pedido entregado', department: 'pedidos' },
    'Cancelado': { icon: '⚫', title: 'Pedido cancelado', department: 'soporte' }
  };
  const flow = ['Pedido recibido','Pago por verificar','Pago recibido','Pago verificado','Preparando pedido','En tránsito','Disponible para entrega','Entregado'];

  function normalizePedido(p) {
    const c = p.clientes || p.customer || {};
    const items = p.pedido_items || p.items || [];
    return {
      id: p.id || incomingId,
      code: p.codigo || p.code || p.order_code || incomingCode || 'TS',
      status: p.estado || p.status || status,
      customerName: c.nombre || c.name || p.nombre || 'Cliente',
      customerEmail: c.correo || c.email || p.correo || p.email || body.email || '',
      customerPhone: c.telefono || c.phone || '',
      customerDocument: c.cedula_rif || c.document || c.id || '',
      customerAddress: c.direccion || c.address || '',
      customerCity: c.ciudad || c.city || '',
      customerState: c.estado || c.state || '',
      items: Array.isArray(items) ? items : [],
      total: p.total_usd || p.total || '',
      paymentMethod: p.metodo_pago || p.payment || '',
      guide: p.numero_guia || p.guide || guide || '',
      shippingCompany: p.empresa_envio || p.shippingCompany || ''
    };
=======
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
>>>>>>> 99e347dc4cca18d53eaa989144a131a9cd3f3276
  }

  function progressHtml(current) {
    let pos = flow.indexOf(current);
    if (current === 'En preparación') pos = flow.indexOf('Preparando pedido');
    pos = Math.max(0, pos);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${flow.map((s,i)=>`<td style="padding:0 3px;text-align:center;vertical-align:top"><div style="height:7px;border-radius:999px;background:${i<=pos?'#fff':'rgba(255,255,255,.20)'}"></div><div style="font-size:10px;line-height:1.25;color:${i<=pos?'#fff':'rgba(255,255,255,.45)'};padding-top:8px">${esc(s)}</div></td>`).join('')}</tr></table>`;
  }

  function itemLines(pedido) {
    return (pedido.items || []).map(i => `${i.producto || i.product_name || i.product || i.nombre || 'Producto'}${i.color ? ' · '+i.color : ''}${(i.capacidad || i.capacity) ? ' · '+(i.capacidad || i.capacity) : ''}${i.cantidad ? ' × '+i.cantidad : ''}`);
  }

  function emailShell({label,title,subtitle,content,buttonUrl,buttonLabel}) {
    const logoUrl = 'https://thinkstore.com.ve/assets/thinkstore-email-logo.jpg';
    return `<div style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1d1f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:28px 12px;"><tr><td align="center">
    <table role="presentation" width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%;background:#ffffff;border-radius:30px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.16);">
      <tr><td style="background:linear-gradient(145deg,#030303 0%,#16161a 55%,#2c2c33 100%);padding:34px 32px 38px;text-align:center;">
        <div style="display:inline-block;background:#fff;border-radius:24px;padding:18px 26px;margin-bottom:24px;"><img src="${esc(logoUrl)}" alt="ThinkStore" width="360" style="display:block;width:360px;max-width:100%;height:auto;border:0;"></div>
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.55);margin-bottom:10px;">${esc(label)}</div>
        <div style="font-size:40px;line-height:1.1;font-weight:800;color:#fff;margin:0;">${title}</div>
        ${subtitle ? `<div style="font-size:18px;color:rgba(255,255,255,.72);margin-top:12px;">${subtitle}</div>` : ''}
      </td></tr>
      <tr><td style="padding:30px 34px;background:#ffffff;">${content}${buttonUrl ? `<div style="text-align:center;padding:10px 0 24px;"><a href="${esc(buttonUrl)}" style="display:inline-block;background:#111114;color:#fff;text-decoration:none;border-radius:999px;padding:15px 24px;font-size:15px;font-weight:800;">${esc(buttonLabel || 'Ver en ThinkStore')}</a></div>` : ''}</td></tr>
      <tr><td style="background:#f5f5f7;border-top:1px solid #e3e3ea;padding:22px 34px;font-size:13px;line-height:1.7;color:#6e6e73;text-align:center;"><strong style="color:#1d1d1f;">ThinkStore</strong><br>Altamira, Caracas · Venezuela<br><a href="https://thinkstore.com.ve" style="color:#1d1d1f;text-decoration:underline;">www.thinkstore.com.ve</a></td></tr>
    </table>
  </td></tr></table>
</div>`;
  }

  function buildEmail(pedido) {
<<<<<<< HEAD
    const meta = statusMeta[pedido.status] || { icon:'📦', title:'Actualización de tu pedido', department:'pedidos' };
    const trackingUrl = `https://thinkstore.com.ve/?tracking=${encodeURIComponent(pedido.code)}#estatus`;
    const lines = itemLines(pedido);
    const itemsHtml = lines.length ? lines.map(x=>`<tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.10);font-size:15px;color:#f5f5f7">${esc(x)}</td></tr>`).join('') : `<tr><td style="padding:12px 0;font-size:15px;color:#f5f5f7">Producto por confirmar</td></tr>`;
    const content = `<div style="background:#f2f2f7;border:1px solid #e3e3ea;border-radius:22px;padding:24px;margin-bottom:18px;font-size:18px;line-height:1.65;color:#1d1d1f;">Hola <strong>${esc(pedido.customerName)}</strong>,<br><br>Tu pedido <strong>${esc(pedido.code)}</strong> fue actualizado.<br>Estado actual: <strong>${esc(pedido.status)}</strong></div><div style="background:#111114;border-radius:22px;padding:22px;margin-bottom:18px;color:#fff;"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.55);margin-bottom:10px;">Producto(s)</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table></div><div style="margin:24px 0 0;">${progressHtml(pedido.status)}</div>`;
    const html = emailShell({ label:'Pedidos ThinkStore', title:`${meta.icon} ${esc(meta.title)}`, subtitle:`Pedido ${esc(pedido.code)}`, content, buttonUrl:trackingUrl, buttonLabel:'Ver estado del pedido' });
    const text = `Hola ${pedido.customerName},\n\nTu pedido ${pedido.code} fue actualizado.\n\nEstado actual: ${pedido.status}\n\nProducto(s):\n${lines.length ? lines.map(x=>'- '+x).join('\n') : '- Producto por confirmar'}\n\nVer estado: ${trackingUrl}\n\nThinkStore`;
    return { subject: `ThinkStore — ${pedido.status} | ${pedido.code}`, text, html, department: meta.department };
  }

  function buildDeliveryNoteEmail(pedido) {
    const trackingUrl = `https://thinkstore.com.ve/?tracking=${encodeURIComponent(pedido.code)}#estatus`;
    const lines = itemLines(pedido);
    const rows = lines.length ? lines.map((x,i)=>`<tr><td style="padding:13px 0;border-bottom:1px solid #ececf1;font-size:15px;">${i+1}. ${esc(x)}</td></tr>`).join('') : `<tr><td style="padding:13px 0;font-size:15px;">Producto por confirmar</td></tr>`;
    const content = `<div style="border:1px solid #e3e3ea;border-radius:24px;overflow:hidden;margin-bottom:20px;"><div style="background:#111114;color:#fff;padding:18px 22px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;">Nota de entrega</div><div style="padding:22px;background:#fff;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:16px;line-height:1.7;color:#1d1d1f;"><tr><td><strong>Pedido</strong></td><td align="right">${esc(pedido.code)}</td></tr><tr><td><strong>Cliente</strong></td><td align="right">${esc(pedido.customerName)}</td></tr><tr><td><strong>Correo</strong></td><td align="right">${esc(pedido.customerEmail)}</td></tr><tr><td><strong>Teléfono</strong></td><td align="right">${esc(pedido.customerPhone)}</td></tr><tr><td><strong>Método de pago</strong></td><td align="right">${esc(pedido.paymentMethod || 'Por confirmar')}</td></tr><tr><td><strong>Estado</strong></td><td align="right">${esc(pedido.status)}</td></tr></table></div></div><div style="background:#f2f2f7;border-radius:22px;padding:22px;margin-bottom:20px;"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#6e6e73;margin-bottom:10px;">Producto(s)</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></div><div style="font-size:14px;line-height:1.7;color:#6e6e73;text-align:center;margin-bottom:10px;">Esta nota confirma que tu pago fue recibido y tu pedido entra en proceso de preparación. Conserva este correo como respaldo.</div>`;
    const html = emailShell({ label:'Nota de entrega ThinkStore', title:'Nota de entrega', subtitle:`Pedido ${esc(pedido.code)}`, content, buttonUrl:trackingUrl, buttonLabel:'Ver estado del pedido' });
    const text = `Nota de entrega ThinkStore\n\nPedido: ${pedido.code}\nCliente: ${pedido.customerName}\nCorreo: ${pedido.customerEmail}\nTeléfono: ${pedido.customerPhone}\nMétodo de pago: ${pedido.paymentMethod || 'Por confirmar'}\nEstado: ${pedido.status}\n\nProducto(s):\n${lines.length ? lines.map(x=>'- '+x).join('\n') : '- Producto por confirmar'}\n\nVer estado: ${trackingUrl}\n\nThinkStore`;
    return { subject: `ThinkStore — Nota de entrega | ${pedido.code}`, text, html, department:'pedidos' };
  }

  function fromForDepartment(department) {
    const fallbackFrom = process.env.FROM_EMAIL || 'ThinkStore Pedidos <onboarding@resend.dev>';
=======
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
>>>>>>> 99e347dc4cca18d53eaa989144a131a9cd3f3276
    const map = {
      pedidos: process.env.FROM_PEDIDOS_EMAIL || fallbackFrom,
      preordenes: process.env.FROM_PREORDENES_EMAIL || fallbackFrom,
      soporte: process.env.FROM_SOPORTE_EMAIL || fallbackFrom,
      ventas: process.env.FROM_VENTAS_EMAIL || fallbackFrom
    };
    return map[department] || map.pedidos;
  }

<<<<<<< HEAD
  async function sendResendEmail(email) {
    const RESEND_API_KEY = clean(process.env.RESEND_API_KEY || process.env.RESEND_APY_KEY);
    if (!RESEND_API_KEY || !email.to) return { skipped: true, reason: !RESEND_API_KEY ? 'missing_resend_key' : 'missing_customer_email' };
=======
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
>>>>>>> 99e347dc4cca18d53eaa989144a131a9cd3f3276
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
<<<<<<< HEAD
        from: fromForDepartment(email.department || 'pedidos'),
        to: email.to,
        reply_to: process.env.REPLY_TO_EMAIL || process.env.REPLY_TO_PEDIDOS || 'pedidos@thinkstore.com.ve',
=======
        from: fromForDepartment(email.department),
        to: pedido.customerEmail,
        reply_to: process.env.REPLY_TO_EMAIL || 'pedidos@thinkstore.com.ve',
>>>>>>> 99e347dc4cca18d53eaa989144a131a9cd3f3276
        subject: email.subject,
        text: email.text,
        html: email.html
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { sent: false, error: result.message || result.error || 'Resend no pudo enviar el correo.' };
<<<<<<< HEAD
    return { sent: true, id: result.id || null, department: email.department || 'pedidos' };
  }

  async function sendStatusEmail(pedido) {
    const email = buildEmail(pedido);
    return await sendResendEmail({ ...email, to: pedido.customerEmail });
  }

  function shouldSendDeliveryNote(st) {
    const s = norm(st);
    return s.includes('pago recibido') || s.includes('pago verificado') || s.includes('pago confirmado');
  }

  async function sendDeliveryNoteEmail(pedido) {
    if (!shouldSendDeliveryNote(pedido.status)) return { skipped: true, reason: 'status_not_payment_received' };
    const email = buildDeliveryNoteEmail(pedido);
    return await sendResendEmail({ ...email, to: pedido.customerEmail });
  }

  try {
    const found = await findPedido();
    const updated = await patchPedido(found);
    if (!updated) {
      return { statusCode: 404, headers, body: JSON.stringify({ ok:false, error:`No actualizado. No se encontró pedido con ${incomingId ? 'id '+incomingId : 'código '+incomingCode}` }) };
    }
    await insertHistory(updated);
    let fullPedido = await readPedido(updated);
    fullPedido = await enrichPedido(fullPedido);
    const normalized = normalizePedido(fullPedido);
    const emailResult = await sendStatusEmail(normalized);
    const deliveryNoteEmail = await sendDeliveryNoteEmail(normalized);
    console.log('ThinkStore update-order ok', JSON.stringify({ code: normalized.code, status: normalized.status, hasEmail: Boolean(normalized.customerEmail), email: emailResult, deliveryNoteEmail }));
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, pedido: fullPedido || null, normalized, email: emailResult, deliveryNoteEmail }) };
=======
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
>>>>>>> 99e347dc4cca18d53eaa989144a131a9cd3f3276
  } catch (error) {
    console.error('ThinkStore update-order error', error.message || error);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message || 'Error interno' }) };
  }
};
