const { createHmac, timingSafeEqual } = require('node:crypto');
const normalize = email => String(email || '').trim().toLowerCase();
function secret() {
  const value = process.env.MARKETING_UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error('Falta configuración para los enlaces de baja.');
  return value;
}
function sign(email) {
  return createHmac('sha256', secret()).update('thinkstore-enterprise-unsubscribe:' + normalize(email)).digest('hex');
}
function verify(email, token) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalize(email)) || !/^[a-f0-9]{64}$/.test(String(token || ''))) return false;
  return timingSafeEqual(Buffer.from(sign(email), 'hex'), Buffer.from(token, 'hex'));
}
function url(email) {
  return 'https://thinkstore.com.ve/.netlify/functions/enterprise-unsubscribe?' + new URLSearchParams({email:normalize(email), token:sign(email)});
}
module.exports = { normalize, sign, verify, url };
