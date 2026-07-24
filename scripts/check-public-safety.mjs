import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const forbiddenTrackedPaths = new Set([
  '.dev.vars',
  '.env',
  'wrangler.jsonc',
]);

const tokenPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['OpenAI-style API key', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Cloudflare Workers deployment URL', /https:\/\/[A-Za-z0-9.-]+\.workers\.dev\b/i],
];

const secretNames = new Set([
  'AUTH_SECRET',
  'GOOGLE_VISION_API_KEY',
  'FLIGHTAWARE_API_KEY',
  'OPENAI_API_KEY',
]);

function isPlaceholder(value) {
  const clean = String(value).trim().replace(/^['"]|['"]$/g, '');
  if (!clean) return true;
  return /^(?:replace|example|your[_-]|<)/i.test(clean);
}

const findings = [];

for (const path of tracked) {
  if (forbiddenTrackedPaths.has(path)) {
    findings.push(`${path}: local/production configuration must not be tracked`);
    continue;
  }

  const stat = fs.statSync(path);
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) continue;
  const buffer = fs.readFileSync(path);
  if (buffer.includes(0)) continue;
  const text = buffer.toString('utf8');

  for (const [label, regex] of tokenPatterns) {
    if (regex.test(text)) findings.push(`${path}: possible ${label}`);
  }

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || !secretNames.has(match[1])) continue;
    if (!isPlaceholder(match[2])) findings.push(`${path}: ${match[1]} contains a non-placeholder value`);
  }

  for (const match of text.matchAll(/"database_id"\s*:\s*"([^"]+)"/g)) {
    if (!isPlaceholder(match[1])) findings.push(`${path}: database_id contains a non-placeholder value`);
  }

  if (path.startsWith('migrations/') && path.endsWith('.sql') && /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+app_(?:companies|stores|employees|cars)_v2[\s\S]{0,300}?VALUES\s*\(/i.test(text)) {
    findings.push(`${path}: public migrations must not seed organization/assignee/resource master data`);
  }
}

if (findings.length) {
  console.error('Public repository safety check failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Public repository safety check passed (${tracked.length} tracked files scanned).`);
