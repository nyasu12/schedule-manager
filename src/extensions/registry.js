import {
  appendTravelPersistenceStatements,
  attachTravelFlights,
  attachTravelLocationCounts,
  loadTravelFlightRows,
  loadTravelLocationCountRows,
  sanitizeTravelFlights,
  sanitizeTravelLocationCounts,
} from './travel/server.js';

const modules = new Map([
  ['travel', {
    id: 'travel',
    async loadScheduleData(env) {
      const [flights, locationCounts] = await Promise.all([
        loadTravelFlightRows(env),
        loadTravelLocationCountRows(env),
      ]);
      return { flights, locationCounts };
    },
    attachScheduleData(bySchedule, enabledPurposeIds, data) {
      attachTravelFlights(bySchedule, enabledPurposeIds, data?.flights || []);
      attachTravelLocationCounts(bySchedule, enabledPurposeIds, data?.locationCounts || []);
    },
    sanitizePayload(body) {
      const travel = body?.extensions?.travel || {};
      return {
        flights: sanitizeTravelFlights(travel.flights ?? body?.flights),
        locationCounts: sanitizeTravelLocationCounts(travel.locationCounts ?? body?.locations ?? body?.stores),
      };
    },
    appendPersistence(env, statements, scheduleId, payload) {
      appendTravelPersistenceStatements(env, statements, scheduleId, payload?.flights || [], payload?.locationCounts || []);
    },
    decoratePurpose(purpose, config) {
      return {
        ...purpose,
        enableTravel: true,
        requireFlight: config?.requireFlight === true,
      };
    },
    supportsFileCategory(category) {
      return ['face','ticket','itinerary','arrival_itinerary','departure_itinerary'].includes(category);
    },
  }],
]);

function parseConfig(value, fallback = {}) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export async function loadExtensionRegistry(env) {
  const [extensionsResult, purposeResult] = await Promise.all([
    env.DB.prepare('SELECT id,name,version,installed,sort_order,config_json FROM app_extensions_v1 ORDER BY sort_order,id').all(),
    env.DB.prepare('SELECT purpose_id,extension_id,enabled,config_json FROM app_purpose_extensions_v1').all(),
  ]);
  const extensions = (extensionsResult.results || []).map((row) => ({
    id: row.id,
    name: row.name,
    version: row.version,
    installed: row.installed !== 0,
    sortOrder: Number(row.sort_order || 0),
    config: parseConfig(row.config_json),
  }));
  const purposeExtensions = (purposeResult.results || []).map((row) => ({
    purposeId: row.purpose_id,
    extensionId: row.extension_id,
    enabled: row.enabled !== 0,
    config: parseConfig(row.config_json),
  }));
  return { extensions, purposeExtensions };
}

export async function loadExtensionScheduleData(env) {
  const data = {};
  for (const [id, module] of modules) data[id] = await module.loadScheduleData(env);
  return data;
}

export function decoratePurposes(purposes, registry) {
  const byPurpose = new Map();
  for (const row of registry?.purposeExtensions || []) {
    if (!row.enabled) continue;
    if (!byPurpose.has(row.purposeId)) byPurpose.set(row.purposeId, []);
    byPurpose.get(row.purposeId).push(row);
  }
  return (purposes || []).map((purpose) => {
    let out = { ...purpose, extensions: [] };
    for (const row of byPurpose.get(purpose.id) || []) {
      const module = modules.get(row.extensionId);
      if (!module) continue;
      out.extensions.push({ id: row.extensionId, config: row.config });
      if (module.decoratePurpose) out = module.decoratePurpose(out, row.config);
    }
    return out;
  });
}

export function attachScheduleExtensions(bySchedule, purposes, registry, extensionData) {
  const enabledByExtension = new Map();
  for (const row of registry?.purposeExtensions || []) {
    if (!row.enabled || !modules.has(row.extensionId)) continue;
    if (!enabledByExtension.has(row.extensionId)) enabledByExtension.set(row.extensionId, new Set());
    enabledByExtension.get(row.extensionId).add(row.purposeId);
  }
  for (const [extensionId, enabledPurposeIds] of enabledByExtension) {
    modules.get(extensionId)?.attachScheduleData?.(bySchedule, enabledPurposeIds, extensionData?.[extensionId]);
  }
  for (const schedule of bySchedule.values()) {
    if (!schedule.extensions) schedule.extensions = {};
    const purposeRows = (registry?.purposeExtensions || []).filter((row) => row.purposeId === schedule.purposeId && row.enabled);
    for (const row of purposeRows) {
      if (!schedule.extensions[row.extensionId]) schedule.extensions[row.extensionId] = {};
    }
  }
}

export async function sanitizeScheduleExtensions(env, purposeId, body) {
  const result = await env.DB.prepare('SELECT extension_id,config_json FROM app_purpose_extensions_v1 WHERE purpose_id=? AND enabled=1').bind(purposeId).all();
  const payloads = {};
  for (const row of result.results || []) {
    const module = modules.get(row.extension_id);
    if (!module) continue;
    payloads[row.extension_id] = module.sanitizePayload?.(body, parseConfig(row.config_json)) || {};
  }
  return payloads;
}

export function appendExtensionPersistenceStatements(env, statements, scheduleId, payloads) {
  for (const [id, module] of modules) {
    module.appendPersistence?.(env, statements, scheduleId, payloads?.[id] || {});
  }
}

export function normalizeFileCategory(value) {
  const category = String(value || '').trim();
  if (category === 'attachment') return category;
  for (const module of modules.values()) if (module.supportsFileCategory?.(category)) return category;
  return '';
}

export async function savePurposeExtensions(env, purposeId, requested = []) {
  const installed = await env.DB.prepare('SELECT id FROM app_extensions_v1 WHERE installed=1').all();
  const known = new Set((installed.results || []).map((x) => x.id));
  const rows = Array.isArray(requested) ? requested : [];
  for (const extensionId of known) {
    const request = rows.find((x) => x?.id === extensionId);
    const enabled = request?.enabled === true ? 1 : 0;
    const config = request?.config && typeof request.config === 'object' ? request.config : {};
    await env.DB.prepare(`INSERT INTO app_purpose_extensions_v1(purpose_id,extension_id,enabled,config_json)
      VALUES(?,?,?,?) ON CONFLICT(purpose_id,extension_id) DO UPDATE SET enabled=excluded.enabled,config_json=excluded.config_json`)
      .bind(purposeId, extensionId, enabled, JSON.stringify(config)).run();
  }
}
