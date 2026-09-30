// Regenerar después de editar la plantilla HTML: node scripts/build-enterprise-template.cjs
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'thinkstore_publicidad_empresas_email.html'), 'utf8');
fs.writeFileSync(path.join(root, 'enterprise-template-data.js'), '/* Generado desde thinkstore_publicidad_empresas_email.html. */\n(function(root){ const html = ' + JSON.stringify(html) + '; if(typeof module === "object" && module.exports) module.exports = html; else root.ThinkStoreEnterpriseHTML = html; })(typeof globalThis !== "undefined" ? globalThis : this);\n');
