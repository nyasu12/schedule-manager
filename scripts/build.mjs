import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const expected = new Map([
  ['src/index.js', 'bc19399cfba91a36cedf857393b2ea70f85eaaf7a71bf568f4fcb705b1995235'],
  ['public/app.js', '5a881ffe03d7b3de89053ea652b2cd39a13c74dfd6f690fa1f35cbf954fa7c2f'],
]);

// A few fragments carry a tiny overlap at their transport boundary. Trim only
// those boundary bytes before reconstruction; the final SHA-256 checks below
// guarantee that the rebuilt files exactly match the sanitized source snapshot.
const publishedTailTrim = new Map([
  ['source-parts/public-app/app-01.part', 5],
  ['source-parts/public-app/app-02.part', 1],
  ['source-parts/public-app/app-03.part', 1],
  ['source-parts/worker/worker-03.part', 1],
  ['source-parts/worker/worker-05.part', 1],
]);

function readPart(partsDirectory, name) {
  const relative = `${partsDirectory}/${name}`;
  const source = fs.readFileSync(path.join(partsDirectory, name), 'utf8');
  const trimCount = publishedTailTrim.get(relative) || 0;
  return trimCount ? source.slice(0, -trimCount) : source;
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
  console.log(`Built ${outputFile} from ${files.length} parts (${digest.slice(0, 12)}…).`);
}

rebuild('source-parts/worker', 'src/index.js');
rebuild('source-parts/public-app', 'public/app.js');
