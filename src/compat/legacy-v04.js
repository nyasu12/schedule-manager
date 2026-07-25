// Compatibility adapter for the v0.4 physical D1 schema.
// Core code uses domain-neutral names; legacy table/column names are confined here
// so populated deployments can migrate without destructive renames.

function trimValue(value, max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}

function safeInt(value, fallback = 0) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function validColor(value) {
  const color = trimValue(value, 20);
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#1769df';
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`;
}

const MASTER_ALIASES = new Map([
  ['area', 'area'], ['region', 'area'],
  ['scheduleType', 'scheduleType'], ['purpose', 'scheduleType'],
  ['organization', 'organization'], ['company', 'organization'],
  ['location', 'location'], ['store', 'location'],
  ['assignee', 'assignee'], ['employee', 'assignee'],
  ['resource', 'resource'], ['car', 'resource'],
]);

export function canonicalMasterType(type) {
  return MASTER_ALIASES.get(String(type || '')) || '';
}

export async function saveCoreMasterRecord(env, type, body = {}) {
  const kind = canonicalMasterType(type);
  if (!kind) throw new Error('設定種類が不正です。');
  const name = trimValue(body.name, 200);
  if (!name) throw new Error('名称を入力してください。');

  const prefix = { area: 'AREA', scheduleType: 'TYPE', organization: 'ORG', location: 'LOC', assignee: 'ASN', resource: 'RES' }[kind];
  const id = trimValue(body.id, 80) || makeId(prefix);

  if (kind === 'area') {
    const sortOrder = Math.max(0, Math.min(9999, safeInt(body.sortOrder, 0)));
    await env.DB.prepare(`INSERT INTO app_regions_v2(id,name,sort_order,active) VALUES(?,?,?,1)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,sort_order=excluded.sort_order,active=1`)
      .bind(id, name, sortOrder).run();
  } else if (kind === 'scheduleType') {
    const sortOrder = Math.max(0, Math.min(9999, safeInt(body.sortOrder, 0)));
    const requestedExtensions = Array.isArray(body.extensions) ? body.extensions : [];
    const travel = requestedExtensions.find((row) => row?.id === 'travel');
    const legacyTravelEnabled = travel ? travel.enabled === true : body.enableTravel === true;
    const legacyRequireFlight = travel ? travel.config?.requireFlight === true : body.requireFlight === true;
    await env.DB.prepare(`INSERT INTO app_purposes_v2(id,name,sort_order,active,enable_travel,require_flight,require_time,require_assignee,require_resource,enable_organization)
      VALUES(?,?,?,1,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,sort_order=excluded.sort_order,active=1,enable_travel=excluded.enable_travel,require_flight=excluded.require_flight,require_time=excluded.require_time,require_assignee=excluded.require_assignee,require_resource=excluded.require_resource,enable_organization=excluded.enable_organization`)
      .bind(id, name, sortOrder, legacyTravelEnabled ? 1 : 0, legacyRequireFlight ? 1 : 0, body.requireTime ? 1 : 0, body.requireAssignee ? 1 : 0, body.requireResource ? 1 : 0, body.enableOrganization === false ? 0 : 1).run();
  } else if (kind === 'organization') {
    await env.DB.prepare(`INSERT INTO app_companies_v2(id,code,name,color,active,updated_at) VALUES(?,?,?,?,1,CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET code=excluded.code,name=excluded.name,color=excluded.color,active=1,updated_at=CURRENT_TIMESTAMP`)
      .bind(id, trimValue(body.code, 60), name, validColor(body.color)).run();
  } else if (kind === 'location') {
    const organizationId = trimValue(body.organizationId ?? body.companyId, 80);
    await env.DB.prepare(`INSERT INTO app_stores_v2(id,company_id,code,name,active,updated_at) VALUES(?,?,?,?,1,CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,code=excluded.code,name=excluded.name,active=1,updated_at=CURRENT_TIMESTAMP`)
      .bind(id, organizationId, trimValue(body.code, 60), name).run();
  } else {
    const areaId = trimValue(body.areaId ?? body.regionId, 80);
    const table = kind === 'assignee' ? 'app_employees_v2' : 'app_cars_v2';
    await env.DB.prepare(`INSERT INTO ${table}(id,name,region_id,active,updated_at) VALUES(?,?,?,1,CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,region_id=excluded.region_id,active=1,updated_at=CURRENT_TIMESTAMP`)
      .bind(id, name, areaId).run();
  }
  return { id, kind };
}

export async function deactivateCoreMasterRecord(env, type, id) {
  const kind = canonicalMasterType(type);
  if (!kind) throw new Error('設定種類が不正です。');
  const table = {
    area: 'app_regions_v2', scheduleType: 'app_purposes_v2', organization: 'app_companies_v2',
    location: 'app_stores_v2', assignee: 'app_employees_v2', resource: 'app_cars_v2',
  }[kind];
  const suffix = ['area', 'scheduleType'].includes(kind) ? '' : ',updated_at=CURRENT_TIMESTAMP';
  await env.DB.prepare(`UPDATE ${table} SET active=0${suffix} WHERE id=?`).bind(id).run();
}

export function appendCoreSchedulePersistenceStatements(env, statements, schedule) {
  statements.push(
    env.DB.prepare(`INSERT INTO app_schedules_v2(id,date,return_date,region_id,purpose_id,departure_time,workflow_status,other_content,other_transport,memo,created_at,updated_at,deleted_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,NULL)
      ON CONFLICT(id) DO UPDATE SET date=excluded.date,return_date=excluded.return_date,region_id=excluded.region_id,purpose_id=excluded.purpose_id,departure_time=excluded.departure_time,workflow_status=excluded.workflow_status,other_content=excluded.other_content,other_transport=excluded.other_transport,memo=excluded.memo,updated_at=CURRENT_TIMESTAMP,deleted_at=NULL`)
      .bind(schedule.id, schedule.date, schedule.returnDate || null, schedule.areaId, schedule.scheduleTypeId, schedule.startTime || null, schedule.workflowStatus, schedule.otherContent, schedule.otherTransport, schedule.memo),
    env.DB.prepare('DELETE FROM app_schedule_stores_v2 WHERE schedule_id=?').bind(schedule.id),
    env.DB.prepare('DELETE FROM app_schedule_employees_v2 WHERE schedule_id=?').bind(schedule.id),
    env.DB.prepare('DELETE FROM app_schedule_cars_v2 WHERE schedule_id=?').bind(schedule.id),
  );
  for (const row of schedule.locations || []) {
    statements.push(env.DB.prepare('INSERT INTO app_schedule_stores_v2(schedule_id,company_id,store_id,arrival_count,departure_count,note) VALUES(?,?,?,?,?,?)')
      .bind(schedule.id, row.organizationId, row.locationId, 0, 0, row.note));
  }
  for (const id of schedule.assignees || []) statements.push(env.DB.prepare('INSERT INTO app_schedule_employees_v2(schedule_id,employee_id) VALUES(?,?)').bind(schedule.id, id));
  for (const id of schedule.resources || []) statements.push(env.DB.prepare('INSERT INTO app_schedule_cars_v2(schedule_id,car_id) VALUES(?,?)').bind(schedule.id, id));
}

export async function softDeleteCoreSchedule(env, id) {
  await env.DB.prepare('UPDATE app_schedules_v2 SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();
}

export async function updateCoreScheduleStartTime(env, id, startTime) {
  const exists = await env.DB.prepare('SELECT id FROM app_schedules_v2 WHERE id=? AND deleted_at IS NULL').bind(id).first();
  if (!exists) return false;
  await env.DB.prepare('UPDATE app_schedules_v2 SET departure_time=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(startTime || null, id).run();
  return true;
}
