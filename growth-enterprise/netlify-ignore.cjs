// Netlify ignore: exit 0 skips a build; exit 1 allows it.
// Fail open: missing Git history or a manual clean rebuild must still deploy.
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const scope = process.argv[2];
const scopes = ['main', 'support', 'enterprise'];
const previous = process.env.CACHED_COMMIT_REF || '';
const current = process.env.COMMIT_REF || '';
const sha = /^[a-f0-9]{7,64}$/i;
if (!scopes.includes(scope) || !sha.test(previous) || !sha.test(current) || previous === current) {
  console.log('Build allowed: first deploy, clean rebuild, or unknown comparison.');
  process.exit(1);
}
try {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {encoding:'utf8'}).trim();
  const changed = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', previous, current, '--'], {
    cwd:root, encoding:'utf8', maxBuffer:16 * 1024 * 1024
  }).split('\0').filter(Boolean);
  const shared = new Set(['package.json', 'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml', '.npmrc', '.nvmrc', '.node-version', 'netlify.toml', 'netlify-ignore.cjs']);
  const relevant = changed.filter(file => {
    const parts = file.split('/');
    const name = path.posix.basename(file);
    if (name === '.DS_Store' || name.startsWith('._') || parts.includes('__MACOSX')) return false;
    // Main redirects /soporte/* to the dedicated support domain.
    // Enterprise is also served under /growth-enterprise/ on Main, so retain it.
    if (scope === 'main') return !file.startsWith('soporte/');
    if (shared.has(file)) return true;
    if (scope === 'support') return file.startsWith('soporte/');
    // Enterprise imports at least one function from root netlify/functions.
    return file.startsWith('growth-enterprise/') || file.startsWith('netlify/functions/');
  });
  console.log(relevant.length ? `Build allowed: ${relevant.length} relevant file(s) for ${scope}.` : `Build skipped: no relevant changes for ${scope}.`);
  process.exit(relevant.length ? 1 : 0);
} catch (_) {
  console.log('Build allowed: Git comparison unavailable.');
  process.exit(1);
}
