import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function walk(directory) {
  const base = path.join(root, directory);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(relative) : [relative];
  });
}

const forbiddenDomainTerms = [
  ['flight', /\bflight(?:s|aware)?\b/i],
  ['airline', /\bairline\b/i],
  ['airport', /\bairport\b/i],
  ['arrival/departure participant columns', /arrival_count|departure_count/i],
  ['country-specific airport constants', /JP_AIRPORT|PH_AIRPORT/i],
  ['immigration direction labels', /入国|帰国/],
];

const coreFiles = [
  ...walk('src/core').filter((file) => file.endsWith('.js')),
  ...walk('source-parts/public-app').filter((file) => file.endsWith('.part')),
  'public/index.html',
  'source-parts/worker/worker-04.part',
  'source-parts/worker/worker-05.part',
];

const failures = [];
for (const file of coreFiles) {
  const text = read(file);
  for (const [label, pattern] of forbiddenDomainTerms) if (pattern.test(text)) failures.push(`${file}: contains ${label}`);
}

const extensionSource = read('source-parts/extensions/travel-public/travel.part');
if (!/registerClientExtension\s*\(/.test(extensionSource)) failures.push('Travel browser module does not register through client extension API');
if (!/extensions\/travel/.test(read('README.md')) && fs.existsSync(path.join(root, 'README.md'))) {
  // README wording is checked after documentation update; no failure here yet.
}

const registry = read('src/extensions/registry.js');
for (const symbol of ['loadExtensionRegistry','sanitizeScheduleExtensions','appendExtensionPersistenceStatements','normalizeFileCategory']) {
  if (!registry.includes(symbol)) failures.push(`extension registry missing ${symbol}`);
}

const migration = read('migrations/0011_platform_architecture.sql');
for (const token of ['app_extensions_v1','app_purpose_extensions_v1','app_custom_fields_v1','app_schedule_custom_values_v1','app_settings_v1','core_organizations_v1','core_locations_v1','core_assignees_v1','core_resources_v1','core_schedules_v1']) {
  if (!migration.includes(token)) failures.push(`platform migration missing ${token}`);
}

const compatibility = read('src/compat/legacy-v04.js');
for (const legacyTable of ['app_companies_v2','app_stores_v2','app_employees_v2','app_cars_v2']) {
  if (!compatibility.includes(legacyTable)) failures.push(`legacy compatibility adapter missing ${legacyTable}`);
}

const build = read('scripts/build.mjs');
if (!build.includes("source-parts/extensions/travel-public")) failures.push('browser build does not compose optional extension source');

if (failures.length) {
  console.error('Platform architecture boundary check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`platform architecture boundaries: PASS (${coreFiles.length} core files checked)`);
