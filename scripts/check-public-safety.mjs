import fs from 'node:fs';
import pathModule from 'node:path';
import { execFileSync } from 'node:child_process';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const forbiddenTrackedPaths = new Set([
  '.dev.vars',
  '.env',
  'wrangler.jsonc',
  'api_key.txt',
  'secrets.txt',
  'credentials.json',
]);

const forbiddenExtensions = new Set([
  '.pem',
  '.p12',
  '.pfx',
  '.key',
]);

const tokenPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['OpenAI-style API key', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Slack webhook', /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]{20,}/i],
  ['DeepL Free API key', /\b[0-9a-f]{8}-[0-9a-f-]{20,}:fx\b/i],
  ['Cloudflare Workers deployment URL', /https:\/\/[A-Za-z0-9.-]+\.workers\.dev\b/i],
];

const secretNames = new Set([
  'AUTH_SECRET',
  'GOOGLE_VISION_API_KEY',
  'FLIGHTAWARE_API_KEY',
  'OPENAI_API_KEY',
  'DEEPL_AUTH_KEY',
  'DEEPL_API_KEY',
  'CLOUDFLARE_API_TOKEN',
  'CF_API_TOKEN',
  'CLOUDFLARE_API_KEY',
  'SLACK_WEBHOOK_URL',
]);

function isPlaceholder(value) {
  const clean = String(value).trim().replace(/^[\'"]|[\'"]$/g, '');
  if (!clean) return true;
  return /^(?:replace|example|your[_-]|<|sk-\.\.\.|\.\.\.)/i.test(clean);
}

function isAllowedExamplePath(filePath) {
  return /(?:^|\/)(?:\.env|\.dev\.vars)\.example$/i.test(filePath)
    || /(?:^|\/)wrangler\.example\.jsonc$/i.test(filePath);
}

const findings = [];

for (const filePath of tracked) {
  const normalized = filePath.replace(/\\/g, '/');
  const basename = pathModule.posix.basename(normalized);
  const ext = pathModule.posix.extname(normalized).toLowerCase();

  if (forbiddenTrackedPaths.has(normalized)) {
    findings.push(`${normalized}: local/production configuration must not be tracked`);
    continue;
  }

  if (!isAllowedExamplePath(normalized) && /(?:^|\/)(?:\.env|\.dev\.vars)(?:\..+)?$/i.test(normalized)) {
    findings.push(`${normalized}: local environment file must not be tracked`);
    continue;
  }

  if (forbiddenExtensions.has(ext)) {
    findings.push(`${normalized}: credential/private-key file type must not be tracked`);
    continue;
  }

  if (/service[-_ ]?account/i.test(basename) && ext === '.json') {
    findings.push(`${normalized}: possible service-account credential file`);
    continue;
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) continue;
  const buffer = fs.readFileSync(filePath);
  if (buffer.includes(0)) continue;
  const text = buffer.toString('utf8');

  for (const [label, regex] of tokenPatterns) {
    if (regex.test(text)) findings.push(`${normalized}: possible ${label}`);
  }

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || !secretNames.has(match[1])) continue;
    if (!isPlaceholder(match[2])) findings.push(`${normalized}: ${match[1]} contains a non-placeholder value`);
  }

  for (const match of text.matchAll(/"database_id"\s*:\s*"([^"]+)"/g)) {
    if (!isPlaceholder(match[1])) findings.push(`${normalized}: database_id contains a non-placeholder value`);
  }

  if (/"private_key"\s*:\s*"-----BEGIN\s+PRIVATE\s+KEY-----/i.test(text)) {
    findings.push(`${normalized}: possible embedded service-account private key`);
  }

  if (normalized.startsWith('migrations/') && normalized.endsWith('.sql') && /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+app_(?:companies|stores|employees|cars)_v2[\s\S]{0,300}?VALUES\s*\(/i.test(text)) {
    findings.push(`${normalized}: public migrations must not seed organization/assignee/resource master data`);
  }
}

if (findings.length) {
  console.error('Public repository safety check failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Public repository safety check passed (${tracked.length} tracked files scanned).`);
