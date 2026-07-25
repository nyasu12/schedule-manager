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
  ...walk('public/core').filter((file) => file.endsWith('.js')),
  'public/index.html',
  'source-parts/worker/worker-04.part',
  'source-parts/worker/worker-05.part',
];

const failures = [];
for (const file of coreFiles) {
  const text = read(file);
  for (const [label, pattern] of forbiddenDomainTerms) if (pattern.test(text)) failures.push(`${file}: contains ${label}`);
}

const extensionSource = read('public/extensions/travel.js');
if (!/registerClientExtension\s*\(/.test(extensionSource)) failures.push('Travel browser module does not register through client extension API');
if (!/decorateLocationRow/.test(extensionSource) || !/locationCounts/.test(extensionSource)) failures.push('Travel extension does not own its per-location participant data');

const registry = read('src/extensions/registry.js');
for (const symbol of ['loadExtensionRegistry','sanitizeScheduleExtensions','appendExtensionPersistenceStatements','normalizeFileCategory']) {
  if (!registry.includes(symbol)) failures.push(`extension registry missing ${symbol}`);
}

const migration = read('migrations/0011_platform_architecture.sql');
for (const token of ['app_extensions_v1','app_purpose_extensions_v1','app_custom_fields_v1','app_schedule_custom_values_v1','app_settings_v1','travel_schedule_location_counts_v1','core_organizations_v1','core_locations_v1','core_assignees_v1','core_resources_v1','core_schedules_v1']) {
  if (!migration.includes(token)) failures.push(`platform migration missing ${token}`);
}

const compatibility = read('src/compat/legacy-v04.js');
for (const legacyTable of ['app_companies_v2','app_stores_v2','app_employees_v2','app_cars_v2']) {
  if (!compatibility.includes(legacyTable)) failures.push(`legacy compatibility adapter missing ${legacyTable}`);
}

const index = read('public/index.html');
if (/\/app\.js/.test(index)) failures.push('browser still loads generated public/app.js instead of readable Core sources');
for (const file of ['01-base.js','02-render.js','03-form.js','04-settings.js','05-init.js']) {
  if (!index.includes(`/core/${file}`)) failures.push(`browser index does not load public/core/${file}`);
}
if (!index.includes('/extensions/travel.js')) failures.push('browser index does not load the Travel extension explicitly');

const build = read('scripts/build.mjs');
if (/public\/app\.js/.test(build)) failures.push('build still generates a monolithic browser bundle');

if (failures.length) {
  console.error('Platform architecture boundary check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`platform architecture boundaries: PASS (${coreFiles.length} core files checked)`);
