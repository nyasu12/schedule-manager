import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

execFileSync(process.execPath, ['scripts/build.mjs'], { stdio: 'inherit' });

const packagePath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.scripts.dev = 'wrangler dev';
pkg.scripts.deploy = 'wrangler deploy';
delete pkg.scripts.build;
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

const ignorePath = '.gitignore';
const removeIgnore = new Set([
  '# Generated from source-parts by npm run build',
  'src/index.js',
  'public/app.js',
]);
const ignore = fs.readFileSync(ignorePath, 'utf8').split(/\r?\n/).filter((line) => !removeIgnore.has(line));
fs.writeFileSync(ignorePath, `${ignore.filter((line, i, a) => line || i < a.length - 1).join('\n').replace(/\n+$/,'')}\n`, 'utf8');

const readmePath = 'README.md';
let readme = fs.readFileSync(readmePath, 'utf8');
const start = readme.indexOf('## Source layout');
const end = readme.indexOf('## Setup', start);
if (start >= 0 && end > start) {
  const sourceLayout = `## Source layout\n\nThe main application sources are committed directly for easy portfolio review:\n\n\`\`\`text\nsrc/index.js          Cloudflare Worker / API\npublic/app.js         Browser application\npublic/index.html     Main UI markup\npublic/styles.css     UI styles\nmigrations/           D1 schema and migrations\nscripts/              User-management utilities\n\`\`\`\n\n`;
  readme = readme.slice(0, start) + sourceLayout + readme.slice(end);
}
readme = readme.replace(
  /GitHub Actions .*?source files were materialized\./s,
  'GitHub Actions runs JavaScript syntax checks for both the Cloudflare Worker and browser application on every pull request. The public snapshot was validated against the SHA-256 hashes of the sanitized source before the source files were materialized.'
);
fs.writeFileSync(readmePath, readme, 'utf8');

const ci = `name: CI\n\non:\n  push:\n    branches: [main]\n  pull_request:\n\npermissions:\n  contents: read\n\njobs:\n  syntax-check:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout\n        uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n\n      - name: Check Worker syntax\n        run: node --check src/index.js\n\n      - name: Check browser app syntax\n        run: node --check public/app.js\n`;
fs.writeFileSync('.github/workflows/ci.yml', ci, 'utf8');

fs.rmSync('source-parts', { recursive: true, force: true });
fs.rmSync('scripts/build.mjs', { force: true });
fs.rmSync('.github/workflows/materialize-source.yml', { force: true });
fs.rmSync('scripts/materialize.mjs', { force: true });

console.log('Materialized readable source layout.');
