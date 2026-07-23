import fs from 'node:fs';
import path from 'node:path';

function rebuild(partsDirectory, outputFile) {
  const files = fs.readdirSync(partsDirectory)
    .filter((name) => name.endsWith('.part'))
    .sort((a, b) => a.localeCompare(b, 'en'));
  if (!files.length) throw new Error(`No source parts found in ${partsDirectory}`);
  const source = files.map((name) => fs.readFileSync(path.join(partsDirectory, name), 'utf8')).join('');
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, source, 'utf8');
  console.log(`Built ${outputFile} from ${files.length} parts.`);
}

rebuild('source-parts/worker', 'src/index.js');
rebuild('source-parts/public-app', 'public/app.js');
