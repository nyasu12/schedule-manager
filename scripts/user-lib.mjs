import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const ITERATIONS = 100000;

export function escapeSql(value) {
  return String(value).replaceAll("'", "''");
}

export function makePasswordRecord(password) {
  if (!password || password.length < 4) throw new Error('パスワードは4文字以上にしてください。');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), ITERATIONS, 32, 'sha256').toString('hex');
  return { salt, hash, iterations: ITERATIONS };
}

export function executeSql(sql, remote = true) {
  const tmp = path.join(os.tmpdir(), `schedule-manager-${crypto.randomUUID()}.sql`);
  fs.writeFileSync(tmp, sql, 'utf8');
  // Invoke the locally installed Wrangler through Node directly.
  // This avoids Windows spawnSync('npx.cmd', ..., { shell: false }) EINVAL errors.
  const wranglerCli = path.resolve(process.cwd(), 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  if (!fs.existsSync(wranglerCli)) {
    try { fs.unlinkSync(tmp); } catch {}
    throw new Error('Wrangler が見つかりません。先に npm install を実行してください。');
  }
  const args = [wranglerCli, 'd1', 'execute', 'schedule-manager-db', remote ? '--remote' : '--local', '--file', tmp];
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', shell: false });
  try { fs.unlinkSync(tmp); } catch {}
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
