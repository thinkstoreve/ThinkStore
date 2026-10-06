import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify(body)
});

const cleanPart = (value, fallback = '') => {
  const v = String(value || fallback).trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return v.slice(0, 120);
};

async function validateSupabaseSession(authHeader) {
  const url = process.env.THINKSTORE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.THINKSTORE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVER_ENV_MISSING');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const base = url.replace(/\/$/, '');
  const headers = { Authorization: authHeader, apikey: key };
  const response = await fetch(`${base}/auth/v1/user`, { headers });
  if (!response.ok) return false;
  const user = await response.json();
  if (!user?.id) return false;
  const access = await fetch(`${base}/rest/v1/thinkstore_inventory_users?select=user_id,active&user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&limit=1`, { headers });
  if (!access.ok) return false;
  const rows = await access.json();
  return Array.isArray(rows) && rows.length > 0;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    if (!(await validateSupabaseSession(authHeader))) return json(401, { error: 'AUTH_REQUIRED' });

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;
    const publicBase = String(process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
    const basePrefix = String(process.env.R2_KEY_PREFIX || 'thinkstore/inventory').split('/').map(part => cleanPart(part)).filter(Boolean).join('/') || 'thinkstore/inventory';
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
      return json(503, { error: 'R2_SERVER_ENV_MISSING' });
    }

    const body = JSON.parse(event.body || '{}');
    const workspace = cleanPart(body.workspace || 'main', 'main');
    const folder = cleanPart(body.folder);
    const itemId = cleanPart(body.itemId);
    const mime = String(body.mime || '').toLowerCase();
    const size = Number(body.size || 0);
    const allowedFolders = new Set(['products', 'furniture']);
    const allowedMime = new Set(['image/png', 'image/jpeg', 'image/webp']);

    if (!allowedFolders.has(folder) || !itemId) return json(400, { error: 'INVALID_MEDIA_PATH' });
    if (!allowedMime.has(mime)) return json(400, { error: 'INVALID_MEDIA_TYPE' });
    if (!Number.isFinite(size) || size <= 0 || size > 5 * 1024 * 1024) return json(400, { error: 'INVALID_MEDIA_SIZE' });

    const ext = mime === 'image/webp' ? 'webp' : mime === 'image/jpeg' ? 'jpg' : 'png';
    const key = `${basePrefix}/${workspace}/${folder}/${itemId}.${ext}`;
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey }
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mime,
      CacheControl: 'public, max-age=31536000, immutable'
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 120 });
    const publicUrl = `${publicBase}/${key}?v=${Date.now()}`;

    return json(200, { uploadUrl, publicUrl, key, expiresIn: 120 });
  } catch (error) {
    return json(500, { error: error?.message || 'R2_UPLOAD_URL_FAILED' });
  }
};
