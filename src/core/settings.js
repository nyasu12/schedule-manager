const ALLOWED_LOCALES = new Set(['auto','ja','en']);

function trimValue(value, max = 200) {
  return String(value ?? '').trim().slice(0, max);
}

export async function loadAppSettings(env) {
  const result = await env.DB.prepare('SELECT key,value FROM app_settings_v1').all();
  const map = Object.fromEntries((result.results || []).map((row) => [row.key, row.value]));
  return {
    locale: ALLOWED_LOCALES.has(map.locale) ? map.locale : 'auto',
    timezone: map.timezone || 'UTC',
  };
}

export async function saveAppSettings(env, body) {
  const locale = ALLOWED_LOCALES.has(body?.locale) ? body.locale : 'auto';
  const timezone = trimValue(body?.timezone || 'UTC', 100) || 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error('タイムゾーンが正しくありません。IANA形式で入力してください。');
  }
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO app_settings_v1(key,value,updated_at) VALUES('locale',?,CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(locale),
    env.DB.prepare(`INSERT INTO app_settings_v1(key,value,updated_at) VALUES('timezone',?,CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(timezone),
  ]);
  return { locale, timezone };
}
