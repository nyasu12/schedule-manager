const ROLE_DEFAULTS = Object.freeze({
  admin: ['*'],
  manager: [
    'schedule.create',
    'schedule.edit',
    'schedule.delete',
    'schedule.start_time.edit',
    'schedule.memo.edit',
    'file.add',
    'file.read',
    'file.delete',
    'extension.execute',
  ],
  time_editor: ['schedule.start_time.edit'],
});

export function defaultCapabilitiesForRole(role) {
  return [...(ROLE_DEFAULTS[String(role || '')] || [])];
}

export function capabilityAllowed(capabilities, key, role = '') {
  if (role === 'admin') return true;
  const values = capabilities instanceof Set ? capabilities : new Set(capabilities || []);
  return values.has('*') || values.has(key);
}

export function applyCapabilityOverrides(defaults, rows = []) {
  const effective = new Set(defaults || []);
  for (const row of rows || []) {
    const key = String(row?.capability || '').trim();
    if (!key || key === '*') continue;
    if (Number(row?.allowed) === 1) effective.add(key);
    else effective.delete(key);
  }
  return [...effective].sort();
}

export async function resolveUserCapabilities(env, username, role) {
  if (role === 'admin') return ['*'];
  const defaults = defaultCapabilitiesForRole(role);
  const result = await env.DB.prepare(
    'SELECT capability,allowed FROM app_user_capabilities_v1 WHERE username=? ORDER BY capability',
  ).bind(username).all();
  return applyCapabilityOverrides(defaults, result.results || []);
}
