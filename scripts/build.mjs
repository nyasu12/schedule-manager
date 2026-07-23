import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const expected = new Map([
  ['src/index.js', 'bc19399cfba91a36cedf857393b2ea70f85eaaf7a71bf568f4fcb705b1995235'],
  ['public/app.js', '5a881ffe03d7b3de89053ea652b2cd39a13c74dfd6f690fa1f35cbf954fa7c2f'],
]);

function rebuild(partsDirectory, outputFile) {
  const files = fs.readdirSync(partsDirectory)
    .filter((name) => name.endsWith('.part'))
    .sort((a, b) => a.localeCompare(b, 'en'));
  if (!files.length) throw new Error(`No source parts found in ${partsDirectory}`);
  const source = files.map((name) => fs.readFileSync(path.join(partsDirectory, name), 'utf8')).join('');
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
