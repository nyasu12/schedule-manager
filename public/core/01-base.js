'use strict';

const $ = (id) => document.getElementById(id);
const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

const DEFAULT_INCOMPLETE_FILTERS = Object.freeze({ status: false, startTime: false, assignee: false, resource: false, custom: false, extension: false });
const INCOMPLETE_FILTER_LABELS = Object.freeze({ status: '未確定', startTime: '開始時刻', assignee: '担当者', resource: 'リソース', custom: 'カスタム項目', extension: '拡張機能' });

const state = {
  data: {
    user: null, settings: { locale: 'auto', timezone: 'UTC' }, extensions: [], customFieldDefinitions: [],
    areas: [], scheduleTypes: [], holidays: [], organizations: [], locations: [], assignees: [], resources: [], schedules: [], usage: {},
  },
  mode: 'month',
  viewMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: localDateString(new Date()),
  masterType: 'scheduleType',
  incompleteFilters: { ...DEFAULT_INCOMPLETE_FILTERS },
};

const clientExtensions = new Map();
function registerClientExtension(extension) {
  if (!extension?.id) throw new Error('Extension id is required');
  clientExtensions.set(extension.id, extension);
}
function scheduleTypeExtensions(type) { return [...clientExtensions.values()].filter((extension) => extension.isEnabled?.(type)); }
function extensionMissingReasons(schedule, type) { return scheduleTypeExtensions(type).flatMap((extension) => extension.missingReasons?.(schedule, type) || []); }
function extensionLocationSuffix(schedule, type, location) { return scheduleTypeExtensions(type).map((extension) => extension.locationSuffix?.(schedule, type, location) || '').join(''); }
function decorateExtensionLocationRow(row, value, type) { for (const extension of scheduleTypeExtensions(type)) extension.decorateLocationRow?.(row, value, type); }
function syncExtensionLocationRows(type) { for (const extension of clientExtensions.values()) extension.syncLocationRows?.(qsa('.store-row', $('storeRows')), type); }
function renderScheduleExtensionDetails(schedule, type) { return scheduleTypeExtensions(type).map((extension) => extension.renderDetails?.(schedule, type) || '').join(''); }
function extensionFileLabel(file) { for (const extension of clientExtensions.values()) { const label = extension.fileLabel?.(file); if (label) return label; } return ''; }
function updateExtensionScheduleForm(type) { for (const extension of clientExtensions.values()) extension.onTypeChange?.(type); }
function openExtensionScheduleForm(schedule, type) { for (const extension of clientExtensions.values()) extension.onFormOpen?.(schedule, type); }
function collectExtensionPayloads(type) { return Object.fromEntries(scheduleTypeExtensions(type).map((extension) => [extension.id, extension.collectPayload?.(type) || {}])); }
async function uploadExtensionFiles(type, scheduleId) { const errors = []; for (const extension of scheduleTypeExtensions(type)) errors.push(...(await extension.uploadFiles?.(scheduleId) || [])); return errors; }
function bindExtensionEvents() { for (const extension of clientExtensions.values()) { extension.injectUi?.(); extension.bindEvents?.(); } }
function bindExtensionDetailEvents(root) { for (const extension of clientExtensions.values()) extension.bindDetailEvents?.(root); }
function extensionSettingsFields(type) { return [...clientExtensions.values()].map((extension) => extension.settingsFields?.(type) || '').join(''); }
function collectExtensionSettings() { return [...clientExtensions.values()].map((extension) => extension.collectSettings?.()).filter(Boolean); }
function extensionModeMeta(mode) { for (const extension of clientExtensions.values()) if (extension.navigation?.mode === mode) return extension.navigation; return null; }

function localDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  const locale = state.data.settings?.locale === 'en' ? 'en-US' : 'ja-JP';
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }).format(d);
}
function toast(message, ms = 2200) { const el = $('toast'); el.textContent = String(message || ''); el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), ms); }
function setBanner(message = '', error = false) { const el = $('statusBanner'); el.textContent = message; el.classList.toggle('error', error); el.classList.toggle('ready', !message); }
function openModal(id) { $(id).hidden = false; }
function closeModal(id) { $(id).hidden = true; }
function isAdmin() { return state.data.user?.role === 'admin'; }
function hasCapability(key) { return isAdmin() || state.data.user?.capabilities?.includes('*') || state.data.user?.capabilities?.includes(key); }
function canCreateSchedule() { return hasCapability('schedule.create'); }
function canEditSchedule() { return hasCapability('schedule.edit'); }
function canDeleteSchedule() { return hasCapability('schedule.delete'); }
function canEditStartTime() { return hasCapability('schedule.start_time.edit'); }
function canEditMemo() { return hasCapability('schedule.memo.edit'); }
function canAddFiles() { return hasCapability('file.add'); }
function canReadFiles() { return hasCapability('file.read'); }
function canDeleteFiles() { return hasCapability('file.delete'); }
function canUseExtensions() { return hasCapability('extension.execute'); }
function isEditor() { return canCreateSchedule() || canEditSchedule(); }
function isTimeEditor() { return canEditStartTime() && !isEditor(); }

async function api(url, options = {}) {
  const opts = { ...options, headers: { ...(options.headers || {}) } };
  if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== 'string') { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(opts.body); }
  const response = await fetch(url, opts);
  const type = response.headers.get('content-type') || '';
  const payload = type.includes('application/json') ? await response.json().catch(() => ({})) : await response.text();
  if (!response.ok || payload?.ok === false) throw new Error(String(typeof payload === 'object' ? (payload.error || payload.details || `HTTP ${response.status}`) : (payload || `HTTP ${response.status}`)));
  return payload;
}

function normalizeBootstrap(data = {}) {
  data.areas = data.areas || data.regions || [];
  data.scheduleTypes = data.scheduleTypes || data.purposes || [];
  data.organizations = data.organizations || data.companies || [];
  data.locations = data.locations || data.stores || [];
  data.assignees = data.assignees || data.employees || [];
  data.resources = data.resources || data.cars || [];
  data.settings ||= { locale: 'auto', timezone: 'UTC' };
  data.extensions ||= [];
  data.customFieldDefinitions ||= [];
  data.schedules = (data.schedules || []).map((schedule) => ({
    ...schedule,
    areaId: schedule.areaId ?? schedule.regionId ?? '',
    scheduleTypeId: schedule.scheduleTypeId ?? schedule.purposeId ?? '',
    startTime: schedule.startTime ?? schedule.departureTime ?? '',
    locations: schedule.locations || schedule.stores || [],
    assignees: schedule.assignees || schedule.employees || [],
    resources: schedule.resources || schedule.cars || [],
    extensions: schedule.extensions || {},
    customFields: schedule.customFields || {},
  }));
  return data;
}

function scheduleTypeById(id) { return state.data.scheduleTypes.find((x) => x.id === id); }
function scheduleTypeName(id) { return scheduleTypeById(id)?.name || id || '予定'; }
function activeScheduleTypes() { return state.data.scheduleTypes.filter((x) => x.active !== false); }
const workflowStatusLabels = { draft: '下書き', planned: '未確定', confirmed: '確定', in_progress: '進行中', done: '完了', cancelled: 'キャンセル' };
function workflowStatusLabel(value) { return workflowStatusLabels[value] || '未確定'; }
function workflowStatusClass(value) { return `status-${String(value || 'planned').replace(/[^a-z_]/g, '')}`; }
function areaName(id) { return state.data.areas.find((x) => x.id === id)?.name || id || ''; }
function organizationById(id) { return state.data.organizations.find((x) => x.id === id); }
function locationById(id) { return state.data.locations.find((x) => x.id === id); }
function assigneeById(id) { return state.data.assignees.find((x) => x.id === id); }
function resourceById(id) { return state.data.resources.find((x) => x.id === id); }
function scheduleColors(schedule) { const colors = (schedule.locations || []).map((x) => organizationById(x.organizationId ?? x.companyId)?.color).filter(Boolean); return [...new Set(colors.length ? colors : ['#aeb9c7'])]; }
function colorStrip(colors) { return `<div class="company-strip">${colors.map((c) => `<i style="background:${escapeHtml(c)}"></i>`).join('')}</div>`; }
function customFieldMissing(schedule) {
  return state.data.customFieldDefinitions.filter((field) => field.active !== false && field.required && (!field.scheduleTypeId || field.scheduleTypeId === schedule.scheduleTypeId) && (schedule.customFields?.[field.id] === undefined || schedule.customFields?.[field.id] === ''));
}
function scheduleMissingItems(schedule) {
  const items = [];
  const type = scheduleTypeById(schedule.scheduleTypeId) || {};
  if (type.requireTime && !schedule.startTime) items.push({ key: 'startTime', label: '開始時刻' });
  if (type.requireAssignee && !schedule.assignees?.length) items.push({ key: 'assignee', label: '担当者' });
  if (type.requireResource && !schedule.resources?.length) items.push({ key: 'resource', label: 'リソース' });
  for (const field of customFieldMissing(schedule)) items.push({ key: 'custom', label: field.label || 'カスタム項目' });
  for (const reason of extensionMissingReasons(schedule, type)) items.push({ key: 'extension', label: reason });
  return items;
}
function scheduleAttentionItems(schedule) {
  const items = scheduleMissingItems(schedule);
  if (['draft','planned'].includes(schedule.workflowStatus || 'planned')) items.unshift({ key: 'status', label: '未確定ステータス' });
  return items;
}
function scheduleMissingReasons(schedule) { return [...new Set(scheduleMissingItems(schedule).map((item) => item.label))]; }
function isIncomplete(schedule) { return scheduleMissingItems(schedule).length > 0; }
function needsAttention(schedule) { return scheduleAttentionItems(schedule).length > 0; }
function selectedIncompleteFilterKeys() { return Object.entries(state.incompleteFilters || {}).filter(([, enabled]) => enabled).map(([key]) => key); }
function updateIncompleteFilterSummary() {
  const el = $('incompleteFilterSummary'); if (!el) return;
  const keys = selectedIncompleteFilterKeys(); el.textContent = keys.length ? keys.map((key) => INCOMPLETE_FILTER_LABELS[key] || key).join('・') : 'すべて';
}
function locationSummary(schedule) { if (!schedule.locations?.length) return '組織・拠点 未入力'; return schedule.locations.map((row) => `${organizationById(row.organizationId ?? row.companyId)?.name || '組織未設定'}／${locationById(row.locationId ?? row.storeId)?.name || '拠点未設定'}`).join('、'); }
function assigneeSummary(schedule) { return schedule.assignees?.length ? schedule.assignees.map((id) => assigneeById(id)?.name || id).join('、') : '未割当'; }
function resourceSummary(schedule) { return schedule.resources?.length ? schedule.resources.map((id) => resourceById(id)?.name || id).join('、') : '未割当'; }

function currentMonthSchedules() { const key = `${state.viewMonth.getFullYear()}-${String(state.viewMonth.getMonth() + 1).padStart(2, '0')}`; return filteredBase().filter((s) => s.date.startsWith(key)); }
function filteredBase() { const area = $('regionFilter')?.value || ''; const scheduleType = $('purposeFilter')?.value || ''; return state.data.schedules.filter((s) => (!area || s.areaId === area) && (!scheduleType || s.scheduleTypeId === scheduleType)); }
function modeSchedules() {
  let rows = filteredBase();
  if (state.mode === 'incomplete') {
    rows = rows.filter(needsAttention);
    const selected = new Set(selectedIncompleteFilterKeys());
    if (selected.size) rows = rows.filter((schedule) => scheduleAttentionItems(schedule).some((item) => selected.has(item.key)));
  }
  if (state.mode === 'personstore') {
    const assignee = $('employeeFilter')?.value || '', location = $('storeFilter')?.value || '';
    if (assignee) rows = rows.filter((s) => s.assignees?.includes(assignee));
    if (location) rows = rows.filter((s) => s.locations?.some((r) => (r.locationId ?? r.storeId) === location));
  }
  for (const extension of clientExtensions.values()) rows = extension.filterMode?.(state.mode, rows) || rows;
  return rows.sort((a, b) => `${a.date} ${a.startTime || '99:99'}`.localeCompare(`${b.date} ${b.startTime || '99:99'}`));
}

function renderExtensionNavigation() {
  const slots = qsa('.extension-nav-slot');
  const buttons = [...clientExtensions.values()].filter((ext) => ext.navigation && ext.isNavigationEnabled?.(state.data)).map((ext) => `<button type="button" class="nav-btn" data-mode="${escapeHtml(ext.navigation.mode)}">${escapeHtml(ext.navigation.label)}</button>`).join('');
  slots.forEach((slot) => { slot.innerHTML = buttons; });
  qsa('[data-mode]').forEach((b) => { b.classList.toggle('active', b.dataset.mode === state.mode); b.onclick = () => { state.mode = b.dataset.mode; closeDrawer(); renderMode(); }; });
  if (extensionModeMeta(state.mode) && ![...clientExtensions.values()].some((ext) => ext.navigation?.mode === state.mode && ext.isNavigationEnabled?.(state.data))) state.mode = 'month';
}
function renderSession() {
  const user = state.data.user;
  $('loginButton').hidden = !!user; $('logoutButton').hidden = !user; $('addScheduleButton').hidden = !canCreateSchedule();
  qsa('.admin-only').forEach((el) => { el.hidden = !isAdmin(); });
  renderExtensionNavigation();
  $('sessionLabel').textContent = user ? `${user.username} / ${user.role === 'admin' ? '完全権限' : user.role}` : '一般閲覧';
  const texts = [...clientExtensions.values()].map((ext) => ext.usageText?.(state.data) || '').filter(Boolean);
  $('usageLabel').hidden = !texts.length; $('usageLabel').textContent = texts.join(' / ');
}
function renderFilters() {
  const areaValue = $('regionFilter').value, typeValue = $('purposeFilter').value, assigneeValue = $('employeeFilter').value, locationValue = $('storeFilter').value;
  $('regionFilter').innerHTML = `<option value="">すべて</option>${state.data.areas.filter((x) => x.active !== false).map((x) => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('')}`;
  $('purposeFilter').innerHTML = `<option value="">すべて</option>${activeScheduleTypes().map((x) => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('')}`;
  $('employeeFilter').innerHTML = `<option value="">すべて</option>${state.data.assignees.filter((x) => x.active).map((x) => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('')}`;
  $('storeFilter').innerHTML = `<option value="">すべて</option>${state.data.locations.filter((x) => x.active).map((x) => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('')}`;
  if ([...$('regionFilter').options].some((o) => o.value === areaValue)) $('regionFilter').value = areaValue;
  if ([...$('purposeFilter').options].some((o) => o.value === typeValue)) $('purposeFilter').value = typeValue;
  if ([...$('employeeFilter').options].some((o) => o.value === assigneeValue)) $('employeeFilter').value = assigneeValue;
  if ([...$('storeFilter').options].some((o) => o.value === locationValue)) $('storeFilter').value = locationValue;
  const named = state.mode === 'personstore'; $('employeeFilterWrap').hidden = !named; $('storeFilterWrap').hidden = !named;
  const incomplete = state.mode === 'incomplete'; if ($('incompleteFilterWrap')) $('incompleteFilterWrap').hidden = !incomplete;
  qsa('[data-incomplete-filter]', $('incompleteFilterWrap')).forEach((input) => { input.checked = !!state.incompleteFilters?.[input.dataset.incompleteFilter]; });
  updateIncompleteFilterSummary();
}
function renderStats() {
  const rows = currentMonthSchedules();
  $('totalStat').textContent = String(rows.length);
  $('confirmedStat').textContent = String(rows.filter((s) => ['confirmed','done'].includes(s.workflowStatus)).length);
  $('incompleteStat').textContent = String(rows.filter(needsAttention).length);
}

function openMonthJump() {
  const panel = $('monthJumpPanel'); if (!panel) return;
  $('monthJumpYear').value = String(state.viewMonth.getFullYear()); $('monthJumpMonth').value = String(state.viewMonth.getMonth() + 1); panel.hidden = false;
}
function closeMonthJump() { if ($('monthJumpPanel')) $('monthJumpPanel').hidden = true; }
function jumpToSelectedMonth() {
  const year = Number($('monthJumpYear').value), month = Number($('monthJumpMonth').value);
  if (!Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) { toast('年は1900〜2100、月は1〜12で指定してください。', 3200); return; }
  state.viewMonth = new Date(year, month - 1, 1);
  const prefix = `${year}-${String(month).padStart(2, '0')}-`; if (!String(state.selectedDate || '').startsWith(prefix)) state.selectedDate = `${prefix}01`;
  closeMonthJump(); renderMode();
}
