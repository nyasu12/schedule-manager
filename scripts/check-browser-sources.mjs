import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const files = [
  ...fs.readdirSync('public/core').filter((name) => name.endsWith('.js')).sort().map((name) => path.join('public/core', name)),
  ...fs.readdirSync('public/extensions').filter((name) => name.endsWith('.js')).sort().map((name) => path.join('public/extensions', name)),
];

if (!files.length) throw new Error('No browser JavaScript sources found');
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`browser source syntax: PASS (${files.length} files)`);
