import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function partFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((name) => name.endsWith('.part'))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((name) => path.join(directory, name));
}

function rebuild(directories, outputFile) {
  const files = directories.flatMap(partFiles);
  if (!files.length) throw new Error(`No source parts found for ${outputFile}`);
  const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('');
  const digest = crypto.createHash('sha256').update(source, 'utf8').digest('hex');
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, source, 'utf8');
  console.log(`Built ${outputFile} from ${files.length} parts (sha256 ${digest}).`);
}

// The generated Worker is a composition root. Domain-neutral Core parts are
// assembled first; optional extension implementation remains under src/extensions.
rebuild(['source-parts/worker'], 'src/index.js');

// Browser Core is kept free of domain-specific extension code. Installed browser
// extensions are appended after the Core bundle and register themselves through
// registerClientExtension().
rebuild(['source-parts/public-app', 'source-parts/extensions/travel-public'], 'public/app.js');
