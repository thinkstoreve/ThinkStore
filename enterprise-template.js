(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./enterprise-template-data'));
  else root.ThinkStoreEnterprise = factory(root.ThinkStoreEnterpriseHTML);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(html) {
  const id = 'empresas-soporte-apple';
  const subject = 'Soporte técnico Apple para tu empresa | ThinkStore';
  const preheader = 'Soporte técnico Apple para empresas: atención prioritaria, recepción coordinada y diagnóstico por lote.';
  const logo = 'https://thinkstore.com.ve/assets/logo-thinkstore-email-transparent.png';
  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function values(input = {}) {
    const unsubscribe = String(input.unsubscribe_url || '');
    if (!/^https:\/\//i.test(unsubscribe)) throw new Error('Falta un enlace HTTPS de baja válido.');
    return {
      nombre_contacto: String(input.nombre_contacto || 'equipo').trim() || 'equipo',
      nombre_empresa: String(input.nombre_empresa || 'tu empresa').trim() || 'tu empresa',
      unsubscribe_url: unsubscribe,
      preheader: String(input.preheader || preheader)
    };
  }
  function render(input) {
    const data = values(input);
    return html.replace(/\{\{(nombre_contacto|nombre_empresa|unsubscribe_url|preheader)\}\}/g, (_, key) => escape(data[key]));
  }
  function text(input) {
    const v = values(input);
    return `${v.preheader}\n\nHola ${v.nombre_contacto},\nSi en ${v.nombre_empresa} utilizan equipos Apple, ThinkStore puede ayudarte a centralizar el soporte técnico.\n\nAtención prioritaria · Recepción coordinada · Diagnóstico por lote · Seguimiento técnico\n\nSolicitar atención empresarial: info@thinkstore.com.ve\nhttps://thinkstore.com.ve/\n\nCancelar comunicaciones empresariales: ${v.unsubscribe_url}`;
  }
  return { id, subject, preheader, logo, render, text };
});
