import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Browser source is kept under a fixed integrity digest. Worker source changes more
// frequently and is rebuilt deterministically from version-controlled parts before
// the CI syntax check, so it is not coupled to a manually maintained whole-file hash.
const expected = new Map([
  ['public/app.js', '80dfe63ff515e2382474e7bc71e5503d06f70dea5551013567b52c0f236d4c49'],
]);

function readPart(partsDirectory, name) {
  return fs.readFileSync(path.join(partsDirectory, name), 'utf8');
}

function rebuild(partsDirectory, outputFile) {
  const files = fs.readdirSync(partsDirectory)
    .filter((name) => name.endsWith('.part'))
    .sort((a, b) => a.localeCompare(b, 'en'));
  if (!files.length) throw new Error(`No source parts found in ${partsDirectory}`);
  const source = files.map((name) => readPart(partsDirectory, name)).join('');
  const digest = crypto.createHash('sha256').update(source, 'utf8').digest('hex');
  const wanted = expected.get(outputFile);
  if (wanted && digest !== wanted) {
    throw new Error(`Source integrity check failed for ${outputFile}: expected ${wanted}, got ${digest}`);
  }
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, source, 'utf8');
  console.log(`Built ${outputFile} from ${files.length} parts (sha256 ${digest}).`);
}

rebuild('source-parts/worker', 'src/index.js');
rebuild('source-parts/public-app', 'public/app.js');
