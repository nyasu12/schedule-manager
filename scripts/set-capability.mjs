import { escapeSql, executeSql } from './user-lib.mjs';

const args = process.argv.slice(2).filter((x) => x !== '--remote' && x !== '--local');
const remote = !process.argv.includes('--local');
const [username, capability, mode] = args;

if (!username || !capability || !['allow', 'deny', 'reset'].includes(mode || '')) {
  console.error('使い方: npm run capability:set -- <ID> <capability> <allow|deny|reset> [--local|--remote]');
  console.error('例: npm run capability:set -- editor schedule.memo.edit allow --local');
  process.exit(1);
}

const user = escapeSql(username);
const key = escapeSql(capability);
let sql;
if (mode === 'reset') {
  sql = `DELETE FROM app_user_capabilities_v1 WHERE username='${user}' AND capability='${key}';`;
} else {
  const allowed = mode === 'allow' ? 1 : 0;
  sql = `
INSERT INTO app_user_capabilities_v1(username,capability,allowed,updated_at)
VALUES ('${user}','${key}',${allowed},CURRENT_TIMESTAMP)
ON CONFLICT(username,capability) DO UPDATE SET allowed=excluded.allowed,updated_at=CURRENT_TIMESTAMP;
`;
}
executeSql(sql, remote);
console.log(`\n✅ ${username}: ${capability} -> ${mode}`);
