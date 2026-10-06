const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0'
  }
});

const cleanPart = (value, fallback = '') => {
  const v = String(value || fallback).trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return v.slice(0, 120);
};

function decodeBase64(base64) {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function validateSupabaseSession(env, authHeader) {
  const url = env.THINKSTORE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.THINKSTORE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVER_ENV_MISSING');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const base = String(url).replace(/\/$/, '');
  const headers = { Authorization: authHeader, apikey: key };
  const response = await fetch(`${base}/auth/v1/user`, { headers });
  if (!response.ok) return false;
  const user = await response.json();
  if (!user?.id) return false;

  const email = String(user.email || '').toLowerCase();
  const role = String(user.app_metadata?.inventory_role || '').toLowerCase();
  if (email === 'thinkstore.ve@gmail.com' || role === 'super_admin' || role === 'admin') return true;

  // Fallback para usuarios autorizados en Inventory. Si PostgREST está temporalmente
  // indisponible, no se concede acceso por este camino.
  const access = await fetch(`${base}/rest/v1/thinkstore_inventory_users?select=user_id,active,role&user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&limit=1`, { headers });
  if (!access.ok) return false;
  const rows = await access.json();
  return Array.isArray(rows) && rows.length > 0;
}

export async function onRequestPost(context) {
  try {
    const authHeader = context.request.headers.get('Authorization') || '';
    if (!(await validateSupabaseSession(context.env, authHeader))) return json({ error: 'AUTH_REQUIRED' }, 401);

    const bucket = context.env.INVENTORY_MEDIA;
    const publicBase = String(context.env.R2_PUBLIC_BASE_URL || 'https://media.thinkstore.com.ve').replace(/\/$/, '');
    const basePrefix = String(context.env.R2_KEY_PREFIX || 'thinkstore/inventory')
      .split('/').map(part => cleanPart(part)).filter(Boolean).join('/') || 'thinkstore/inventory';
    if (!bucket) return json({ error: 'R2_BINDING_MISSING' }, 503);

    const body = await context.request.json().catch(() => ({}));
    const workspace = cleanPart(body.workspace || 'main', 'main');
    const folder = cleanPart(body.folder);
    const itemId = cleanPart(body.itemId);
    const dataUrl = String(body.dataUrl || '');

    if (!new Set(['products', 'furniture', 'profiles', 'service-parts']).has(folder) || !itemId) return json({ error: 'INVALID_MEDIA_PATH' }, 400);
    const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s);
    if (!match) return json({ error: 'INVALID_MEDIA_DATA' }, 400);

    const mime = match[1];
    const bytes = decodeBase64(match[2]);
    if (!bytes.length || bytes.length > 3.5 * 1024 * 1024) return json({ error: 'INVALID_MEDIA_SIZE' }, 400);

    const ext = mime === 'image/webp' ? 'webp' : mime === 'image/jpeg' ? 'jpg' : 'png';
    const key = `${basePrefix}/${workspace}/${folder}/${itemId}.${ext}`;
    await bucket.put(key, bytes, {
      httpMetadata: {
        contentType: mime,
        cacheControl: 'public, max-age=31536000, immutable'
      }
    });

    return json({
      publicUrl: `${publicBase}/${key}?v=${Date.now()}`,
      key,
      size: bytes.length,
      provider: 'cloudflare-r2-binding'
    });
  } catch (error) {
    return json({ error: error?.message || 'R2_UPLOAD_FAILED' }, 500);
  }
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

export function onRequest() {
  return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
}
