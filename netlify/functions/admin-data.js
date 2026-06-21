exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };

  // Compatibilidad: el panel usa el código corto de administrador.
  // Si en Netlify agregas THINKSTORE_ADMIN_CODE, también será aceptada.
  const expectedSecret = process.env.THINKSTORE_ADMIN_SECRET;
  const expectedCode = process.env.THINKSTORE_ADMIN_CODE;
  const provided = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'] || '';
  if (![String(expectedSecret), String(expectedCode)].includes(String(provided))) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Acceso administrador no autorizado' }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 501, headers, body: JSON.stringify({ ok: false, error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Netlify.' }) };
  }

  const api = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
  const baseHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };

  async function get(path) {
    const res = await fetch(api + path, { headers: baseHeaders });
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.message || data.error || `Error leyendo ${path}`);
    return data;
  }

  async function getOptional(paths, fallback=[]) {
    let lastError = null;
    for (const path of paths) {
      try { return await get(path); } catch (e) { lastError = e; }
    }
    console.warn('ThinkStore admin optional query failed:', lastError && lastError.message);
    return fallback;
  }

  try {
    // Clientes se lee SIEMPRE de forma independiente para que el dashboard nunca quede en 1 por fallo de pedidos.
    const clientes = await get('clientes?select=*&order=created_at.desc');

    const pedidos = await getOptional([
      'pedidos?select=*,clientes(*),pedido_items(*),order_status_history(*)&order=created_at.desc',
      'pedidos?select=*,clientes(*),pedido_items(*)&order=created_at.desc',
      'pedidos?select=*&order=created_at.desc',
      'orders?select=*,order_items(*),order_status_history(*)&order=created_at.desc',
      'orders?select=*&order=created_at.desc'
    ], []);

    const comprobantes = await getOptional([
      'comprobantes?select=*&order=created_at.desc'
    ], []);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, clientes, pedidos, comprobantes, refreshed_at: new Date().toISOString() })
    };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message || 'Error interno' }) };
  }
};
