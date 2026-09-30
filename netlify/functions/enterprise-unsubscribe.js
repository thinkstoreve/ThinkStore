const unsubscribe = require('./lib/enterprise-unsubscribe');
const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function page(statusCode, content) {
  return {statusCode, headers:{'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer', 'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}, body:`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ThinkStore · Preferencias de correo</title><body style="font-family:Arial,sans-serif;max-width:560px;margin:60px auto;padding:24px;line-height:1.6"><h1>ThinkStore</h1>${content}</body></html>`};
}
exports.handler = async event => {
  if (!['GET','POST'].includes(event.httpMethod)) return page(405, '<p>Método no permitido.</p>');
  try {
    const query = event.queryStringParameters || {};
    const email = unsubscribe.normalize(query.email);
    if (!unsubscribe.verify(email, query.token)) return page(400, '<p>El enlace de baja no es válido. Contacta a info@thinkstore.com.ve.</p>');
    // GET only displays confirmation so email security scanners cannot unsubscribe a contact.
    if (event.httpMethod === 'GET') return page(200, `<h2>Comunicaciones empresariales</h2><p>¿Deseas dejar de recibir estas campañas en ${escape(email)}?</p><form method="post" action="${escape('/.netlify/functions/enterprise-unsubscribe?' + new URLSearchParams({email,token:query.token}))}"><button type="submit" style="padding:14px 24px;cursor:pointer">Cancelar suscripción empresarial</button></form>`);
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
    if (!key || !base) return page(503, '<p>No se pudo registrar la baja. Inténtalo de nuevo o escribe a info@thinkstore.com.ve.</p>');
    const res = await fetch(base + '/rest/v1/marketing_enterprise_unsubscribes?on_conflict=email', {method:'POST', headers:{apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal'}, body:JSON.stringify({email, unsubscribed_at:new Date().toISOString()})});
    if (!res.ok) return page(503, '<p>No se pudo registrar la baja. Inténtalo de nuevo o escribe a info@thinkstore.com.ve.</p>');
    return page(200, '<h2>Suscripción cancelada</h2><p>No recibirás más campañas empresariales de ThinkStore en esta dirección. Los mensajes relacionados con tus pedidos y servicios seguirán disponibles.</p>');
  } catch (_) { return page(503, '<p>No se pudo registrar la baja. Inténtalo de nuevo o escribe a info@thinkstore.com.ve.</p>'); }
};
