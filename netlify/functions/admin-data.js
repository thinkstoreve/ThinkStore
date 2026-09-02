exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 501, headers, body: JSON.stringify({ ok: false, error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Netlify.' }) };
  }

  const clean = (v) => String(v ?? '').trim();
  async function authorizeAdmin() {
    const expectedSecret = clean(process.env.THINKSTORE_ADMIN_SECRET);
    const expectedCode = clean(process.env.THINKSTORE_ADMIN_CODE);
    const provided = clean(event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'] || '');
    if (provided && [expectedSecret, expectedCode].filter(Boolean).includes(provided)) return { ok:true, mode:'legacy_secret' };

    const token = clean(event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return { ok:false };
    try {
      const userRes = await fetch(SUPABASE_URL.replace(/\/$/,'') + '/auth/v1/user', { headers:{ apikey:SUPABASE_SERVICE_ROLE_KEY, Authorization:`Bearer ${token}` } });
      const u = await userRes.json().catch(()=>({}));
      if (!userRes.ok || !u?.id) return { ok:false };
      const profileRes = await fetch(SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/profiles?select=id,role,active&id=eq.' + encodeURIComponent(u.id) + '&limit=1', { headers:{ apikey:SUPABASE_SERVICE_ROLE_KEY, Authorization:`Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
      const arr = await profileRes.json().catch(()=>[]);
      const profile = Array.isArray(arr) ? arr[0] : null;
      const r = clean(profile?.role).toLowerCase();
      if (!profileRes.ok || !profile || profile.active === false || !['admin','super_admin','superadmin','administrator','gerente'].includes(r)) return { ok:false };
      return { ok:true, mode:'supabase_jwt', user_id:u.id, role:r };
    } catch (_) { return { ok:false }; }
  }
  const authz = await authorizeAdmin();
  if (!authz.ok) return { statusCode:401, headers, body:JSON.stringify({ok:false,error:'Acceso administrador no autorizado'}) };

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

  async function signReceiptPath(filePath) {
    const raw = String(filePath || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;

    const storageBase = SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/sign/comprobantes/';
    const encodedPath = raw.split('/').map(encodeURIComponent).join('/');
    try {
      const res = await fetch(storageBase + encodedPath, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({ expiresIn: 900 })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || 'No se pudo firmar el comprobante');
      const signed = data.signedURL || data.signedUrl || data.url || '';
      if (!signed) return '';
      return /^https?:\/\//i.test(signed)
        ? signed
        : SUPABASE_URL.replace(/\/$/, '') + '/storage/v1' + (signed.startsWith('/') ? signed : '/' + signed);
    } catch (e) {
      console.warn('ThinkStore comprobante signed URL:', raw, e && e.message);
      return '';
    }
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

    const comprobantesRaw = await getOptional([
      'comprobantes?select=*&order=created_at.desc'
    ], []);

    const comprobantes = await Promise.all((comprobantesRaw || []).map(async (c) => ({
      ...c,
      signed_url: await signReceiptPath(c.url_archivo)
    })));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, clientes, pedidos, comprobantes, refreshed_at: new Date().toISOString() })
    };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message || 'Error interno' }) };
  }
};
