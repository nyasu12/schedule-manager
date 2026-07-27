import crypto from 'node:crypto';
import { escapeSql, executeSql, makePasswordRecord } from './user-lib.mjs';

const args = process.argv.slice(2).filter((x) => x !== '--remote' && x !== '--local');
const remote = !process.argv.includes('--local');
const [username, role, password] = args;

if (!username || !role || !password) {
  console.error('使い方: npm run user:set -- <ID> <time_editor|manager|admin> "<パスワード>"');
  process.exit(1);
}
if (!['time_editor','manager','admin'].includes(role)) {
  console.error('権限は time_editor / manager / admin のいずれかを指定してください。');
  process.exit(1);
}
const p = makePasswordRecord(password);
const nonce = crypto.randomBytes(16).toString('hex');
const sql = `
INSERT INTO app_users_v2
(username,password_hash,salt,iterations,role,active,session_nonce,updated_at)
VALUES ('${escapeSql(username)}','${p.hash}','${p.salt}',${p.iterations},'${role}',1,'${nonce}',CURRENT_TIMESTAMP)
ON CONFLICT(username) DO UPDATE SET
  password_hash=excluded.password_hash,
  salt=excluded.salt,
  iterations=excluded.iterations,
  role=excluded.role,
  active=1,
  session_nonce=excluded.session_nonce,
  updated_at=CURRENT_TIMESTAMP;
`;
executeSql(sql, remote);
console.log(`\n✅ ${username} を ${role} 権限で更新しました。既存セッションは失効します。`);
