// Reconstruct supplied photos and the lightweight Think Care presentation.
// SHA-256 protects against incomplete text uploads; originals remain intact.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
for (const name of fs.readdirSync(__dirname).filter(n => /^(part|webp)-\d+\.json$/.test(n)).sort()) {
  const files = JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
  for (const [relative, entry] of Object.entries(files)) {
    if (relative === 'service-cards.js' && fs.existsSync(path.join(root, relative))) continue;
    if (!/^(assets\/service-cards\/[\w.-]+|service-cards\.(js|css))$/.test(relative)) throw Error('Unexpected media path');
    const bytes = Buffer.from(entry.base64, 'base64');
    if (crypto.createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw Error('Incomplete upload: ' + relative);
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, bytes);
  }
}
const index = path.join(root, 'index.html');
let html = fs.readFileSync(index, 'utf8').replaceAll('service-cards.css?v=20261102-2','service-cards.css?v=20261102-2').replaceAll('service-cards.js?v=20261102-2','service-cards.js?v=20261102-2');
if (!html.includes('/service-cards.js?v=20261102-2')) {
  html = html.replace('</head>', '<link rel="stylesheet" href="/service-cards.css?v=20261102-2"><script src="/service-cards.js?v=20261102-2" defer></script></head>');
}
fs.writeFileSync(index, html);
console.log('Service galleries and Think Care media verified.');
