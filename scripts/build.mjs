import fs from 'node:fs';
import path from 'node:path';

function partFiles(directory) {
  return fs.readdirSync(directory)
    .filter((name) => name.endsWith('.part'))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function rebuildWorker() {
  const directory = 'source-parts/worker';
  const files = partFiles(directory);
  if (!files.length) throw new Error(`No Worker source parts found in ${directory}`);
  const source = files.map((name) => fs.readFileSync(path.join(directory, name), 'utf8')).join('');
  fs.mkdirSync('src', { recursive: true });
  fs.writeFileSync('src/index.js', source, 'utf8');
  console.log(`Built src/index.js from ${files.length} Worker parts.`);
}

// The Worker remains assembled from ordered fragments because it is one deployment
// entrypoint. Browser Core and extensions are committed directly under public/ so
// GitHub readers can inspect the architectural boundary without generated bundles.
rebuildWorker();
