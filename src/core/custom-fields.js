const FIELD_TYPES = new Set(['text','number','date','time','boolean','url','select']);

function trimValue(value, max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}

function parseOptions(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((x) => trimValue(x, 200)).filter(Boolean).slice(0, 100) : [];
  } catch {
    return [];
  }
}

export async function loadCustomFieldState(env) {
  const [definitionsResult, valuesResult] = await Promise.all([
    env.DB.prepare(`SELECT id,purpose_id,field_key,label,field_type,required,sort_order,options_json,active
      FROM app_custom_fields_v1 ORDER BY purpose_id,sort_order,label`).all(),
    env.DB.prepare('SELECT schedule_id,field_id,value_text FROM app_schedule_custom_values_v1').all(),
  ]);
  return {
    definitions: (definitionsResult.results || []).map((row) => ({
      id: row.id,
      purposeId: row.purpose_id || '',
      key: row.field_key,
      label: row.label,
      type: FIELD_TYPES.has(row.field_type) ? row.field_type : 'text',
      required: row.required !== 0,
      sortOrder: Number(row.sort_order || 0),
      options: parseOptions(row.options_json),
      active: row.active !== 0,
    })),
    values: valuesResult.results || [],
  };
}

export function attachCustomFieldValues(bySchedule, state) {
  for (const schedule of bySchedule.values()) schedule.customFields = {};
  for (const row of state?.values || []) {
    const schedule = bySchedule.get(row.schedule_id);
    if (schedule) schedule.customFields[row.field_id] = row.value_text ?? '';
  }
}

export async function sanitizeCustomFieldValues(env, purposeId, value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = await env.DB.prepare(`SELECT id,field_type,required,options_json
    FROM app_custom_fields_v1 WHERE active=1 AND (purpose_id='' OR purpose_id=?) ORDER BY sort_order,label`).bind(purposeId).all();
  const out = [];
  for (const field of result.results || []) {
    let normalized = trimValue(input[field.id], 5000);
    const options = parseOptions(field.options_json);
    if (field.field_type === 'boolean') normalized = ['1','true','on','yes'].includes(normalized.toLowerCase()) ? 'true' : normalized ? 'false' : '';
    if (field.field_type === 'number' && normalized && !Number.isFinite(Number(normalized))) throw new Error('数値形式のカスタム項目が正しくありません。');
    if (field.field_type === 'url' && normalized) {
      try {
        const url = new URL(normalized);
        if (!['http:','https:'].includes(url.protocol)) throw new Error('invalid');
      } catch {
        throw new Error('URL形式のカスタム項目が正しくありません。');
      }
    }
    if (field.field_type === 'select' && normalized && !options.includes(normalized)) throw new Error('選択式のカスタム項目が正しくありません。');
    if (field.required && !normalized) throw new Error('必須のカスタム項目を入力してください。');
    if (normalized) out.push({ fieldId: field.id, value: normalized });
  }
  return out;
}

export function appendCustomFieldPersistenceStatements(env, statements, scheduleId, values) {
  statements.push(env.DB.prepare('DELETE FROM app_schedule_custom_values_v1 WHERE schedule_id=?').bind(scheduleId));
  for (const item of values || []) {
    statements.push(env.DB.prepare(`INSERT INTO app_schedule_custom_values_v1(schedule_id,field_id,value_text,updated_at)
      VALUES(?,?,?,CURRENT_TIMESTAMP)`).bind(scheduleId, item.fieldId, item.value));
  }
}

export async function saveCustomFieldDefinition(env, body, makeId) {
  const id = trimValue(body?.id, 80) || makeId('FLD');
  const purposeId = trimValue(body?.purposeId, 80);
  const key = trimValue(body?.key, 80).replace(/[^a-zA-Z0-9_-]/g, '_');
  const label = trimValue(body?.label, 200);
  const type = FIELD_TYPES.has(body?.type) ? body.type : 'text';
  if (!key || !label) throw new Error('項目キーと表示名を入力してください。');
  const options = Array.isArray(body?.options) ? body.options.map((x) => trimValue(x, 200)).filter(Boolean).slice(0, 100) : [];
  await env.DB.prepare(`INSERT INTO app_custom_fields_v1(id,purpose_id,field_key,label,field_type,required,sort_order,options_json,active,updated_at)
    VALUES(?,?,?,?,?,?,?,?,1,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET purpose_id=excluded.purpose_id,field_key=excluded.field_key,label=excluded.label,field_type=excluded.field_type,required=excluded.required,sort_order=excluded.sort_order,options_json=excluded.options_json,active=1,updated_at=CURRENT_TIMESTAMP`)
    .bind(id, purposeId, key, label, type, body?.required ? 1 : 0, Number(body?.sortOrder || 0), JSON.stringify(options)).run();
  return id;
}
