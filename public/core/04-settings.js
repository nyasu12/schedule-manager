function masterRows(type) {
  if (type === 'area') return state.data.areas;
  if (type === 'scheduleType') return state.data.scheduleTypes;
  if (type === 'organization') return state.data.organizations;
  if (type === 'location') return state.data.locations;
  if (type === 'assignee') return state.data.assignees;
  if (type === 'resource') return state.data.resources;
  if (type === 'customField') return state.data.customFieldDefinitions;
  return [];
}
function resetMasterForm() { $('masterId').value = ''; renderMasterFields(); }
function scheduleTypeOptions(value = '', includeGlobal = false) {
  const global = includeGlobal ? `<option value="" ${!value ? 'selected' : ''}>すべての予定タイプ</option>` : '';
  return global + state.data.scheduleTypes.filter((x) => x.active !== false || x.id === value).map((x) => `<option value="${escapeHtml(x.id)}" ${x.id === value ? 'selected' : ''}>${escapeHtml(x.name)}</option>`).join('');
}
function renderMasterFields(row = null) {
  const type = state.masterType;
  const areas = state.data.areas.filter((x) => x.active !== false).map((x) => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('');
  const organizations = state.data.organizations.filter((x) => x.active).map((x) => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('');
  let html = '';
  if (type === 'scheduleType') html = `<div class="settings-fields"><label class="field">予定タイプ名<input id="masterName" required value="${escapeHtml(row?.name || '')}"></label><label class="field">表示順<input id="masterSortOrder" type="number" min="0" max="9999" value="${Number(row?.sortOrder || 0)}"></label><label class="check-field"><input id="masterEnableOrganization" type="checkbox" ${row?.enableOrganization === false ? '' : 'checked'}> 組織・拠点を使う</label><label class="check-field"><input id="masterRequireTime" type="checkbox" ${row?.requireTime ? 'checked' : ''}> 開始時刻を必須にする</label><label class="check-field"><input id="masterRequireAssignee" type="checkbox" ${row?.requireAssignee ? 'checked' : ''}> 担当者を必須にする</label><label class="check-field"><input id="masterRequireResource" type="checkbox" ${row?.requireResource ? 'checked' : ''}> リソースを必須にする</label></div><div id="masterExtensionFields">${extensionSettingsFields(row)}</div>`;
  if (type === 'area') html = `<div class="settings-fields"><label class="field">エリア名<input id="masterName" required value="${escapeHtml(row?.name || '')}"></label><label class="field">表示順<input id="masterSortOrder" type="number" min="0" max="9999" value="${Number(row?.sortOrder || 0)}"></label></div>`;
  if (type === 'organization') html = `<div class="settings-fields"><label class="field">組織名<input id="masterName" required value="${escapeHtml(row?.name || '')}"></label><label class="field">コード<input id="masterCode" value="${escapeHtml(row?.code || '')}"></label><label class="field">識別色<input id="masterColor" type="color" value="${escapeHtml(row?.color || '#1769df')}"></label></div>`;
  if (type === 'location') html = `<div class="settings-fields"><label class="field">拠点名<input id="masterName" required value="${escapeHtml(row?.name || '')}"></label><label class="field">組織<select id="masterOrganization">${organizations}</select></label><label class="field">コード<input id="masterCode" value="${escapeHtml(row?.code || '')}"></label></div>`;
  if (type === 'assignee' || type === 'resource') html = `<div class="settings-fields"><label class="field">${type === 'assignee' ? '担当者名' : 'リソース名'}<input id="masterName" required value="${escapeHtml(row?.name || '')}"></label><label class="field">エリア<select id="masterArea">${areas}</select></label></div>`;
  if (type === 'customField') html = `<div class="settings-fields"><label class="field">表示名<input id="masterName" required value="${escapeHtml(row?.label || '')}"></label><label class="field">キー<input id="masterFieldKey" required value="${escapeHtml(row?.key || '')}" placeholder="customer_name"></label><label class="field">予定タイプ<select id="masterFieldScheduleType">${scheduleTypeOptions(row?.scheduleTypeId || '', true)}</select></label><label class="field">種類<select id="masterFieldType"><option value="text">テキスト</option><option value="number">数値</option><option value="date">日付</option><option value="time">時刻</option><option value="boolean">チェック</option><option value="url">URL</option><option value="select">選択式</option></select></label><label class="field">表示順<input id="masterSortOrder" type="number" min="0" max="9999" value="${Number(row?.sortOrder || 0)}"></label><label class="field full">選択肢（選択式のみ・1行1件）<textarea id="masterFieldOptions" rows="4">${escapeHtml((row?.options || []).join('\n'))}</textarea></label><label class="check-field"><input id="masterFieldRequired" type="checkbox" ${row?.required ? 'checked' : ''}> 必須にする</label></div>`;
  if (type === 'appSettings') html = `<div class="settings-fields"><label class="field">表示言語<select id="appLocale"><option value="auto">ブラウザに合わせる</option><option value="ja">日本語</option><option value="en">English</option></select></label><label class="field">タイムゾーン<input id="appTimezone" value="${escapeHtml(state.data.settings?.timezone || 'UTC')}" placeholder="Asia/Tokyo"></label></div>`;
  $('masterFields').innerHTML = html;
  if (row && type === 'location' && $('masterOrganization')) $('masterOrganization').value = row.organizationId ?? row.companyId ?? '';
  if (row && (type === 'assignee' || type === 'resource') && $('masterArea')) $('masterArea').value = row.areaId ?? row.regionId ?? '';
  if (row && type === 'customField' && $('masterFieldType')) $('masterFieldType').value = row.type || 'text';
  if (type === 'appSettings' && $('appLocale')) $('appLocale').value = state.data.settings?.locale || 'auto';
}
function renderMasterList() {
  qsa('[data-master-type]').forEach((b) => b.classList.toggle('active', b.dataset.masterType === state.masterType));
  if (state.masterType === 'appSettings') { $('masterList').innerHTML = '<div class="empty">言語とタイムゾーンはデプロイ単位で適用されます。</div>'; return; }
  const rows = masterRows(state.masterType).filter((x) => x.active !== false);
  $('masterList').innerHTML = rows.length ? rows.map((x) => {
    let sub = '';
    if (state.masterType === 'scheduleType') { const flags = [x.requireTime ? '時刻必須' : '', x.requireAssignee ? '担当者必須' : '', x.requireResource ? 'リソース必須' : '', ...(x.extensions || []).map((ext) => `拡張:${ext.id}`)].filter(Boolean); sub = `表示順 ${Number(x.sortOrder || 0)}${flags.length ? `　${flags.join(' / ')}` : ''}`; }
    if (state.masterType === 'area') sub = `表示順 ${Number(x.sortOrder || 0)}`;
    if (state.masterType === 'organization') sub = `<span class="color-dot" style="background:${escapeHtml(x.color)}"></span>${escapeHtml(x.code || '')}`;
    if (state.masterType === 'location') sub = `${escapeHtml(organizationById(x.organizationId ?? x.companyId)?.name || '組織未設定')}　${escapeHtml(x.code || '')}`;
    if (state.masterType === 'assignee' || state.masterType === 'resource') sub = escapeHtml(areaName(x.areaId ?? x.regionId));
    if (state.masterType === 'customField') sub = `${escapeHtml(x.type)} / ${escapeHtml(x.scheduleTypeId ? scheduleTypeName(x.scheduleTypeId) : '全予定タイプ')}${x.required ? ' / 必須' : ''}`;
    const title = state.masterType === 'customField' ? x.label : x.name;
    return `<div class="settings-row"><div><strong>${escapeHtml(title)}</strong><small>${sub}</small></div><div class="settings-row-actions"><button type="button" class="btn small" data-edit-master="${escapeHtml(x.id)}">編集</button><button type="button" class="btn small danger" data-delete-master="${escapeHtml(x.id)}">無効化</button></div></div>`;
  }).join('') : '<div class="empty">登録はありません。</div>';
  qsa('[data-edit-master]', $('masterList')).forEach((b) => b.addEventListener('click', () => { const row = masterRows(state.masterType).find((x) => x.id === b.dataset.editMaster); if (!row) return; $('masterId').value = row.id; renderMasterFields(row); }));
  qsa('[data-delete-master]', $('masterList')).forEach((b) => b.addEventListener('click', () => deleteMaster(b.dataset.deleteMaster)));
}
function renderSettings() { resetMasterForm(); renderMasterList(); }
function masterApiType(type) { return type === 'scheduleType' ? 'schedule-type' : type; }
async function saveMaster(event) {
  event.preventDefault();
  try {
    if (state.masterType === 'appSettings') {
      await api('/api/settings', { method: 'POST', body: { locale: $('appLocale').value, timezone: $('appTimezone').value.trim() } });
    } else if (state.masterType === 'customField') {
      await api('/api/custom-fields', { method: 'POST', body: { id: $('masterId').value, label: $('masterName').value.trim(), key: $('masterFieldKey').value.trim(), scheduleTypeId: $('masterFieldScheduleType').value, type: $('masterFieldType').value, sortOrder: Number($('masterSortOrder').value || 0), required: $('masterFieldRequired').checked, options: $('masterFieldOptions').value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) } });
    } else {
      const body = { id: $('masterId').value, name: $('masterName').value.trim() };
      if (state.masterType === 'scheduleType') { body.sortOrder = Number($('masterSortOrder').value || 0); body.enableOrganization = $('masterEnableOrganization').checked; body.requireTime = $('masterRequireTime').checked; body.requireAssignee = $('masterRequireAssignee').checked; body.requireResource = $('masterRequireResource').checked; body.extensions = collectExtensionSettings(); }
      if (state.masterType === 'area') body.sortOrder = Number($('masterSortOrder').value || 0);
      if (state.masterType === 'organization') { body.code = $('masterCode').value.trim(); body.color = $('masterColor').value; }
      if (state.masterType === 'location') { body.organizationId = $('masterOrganization').value; body.code = $('masterCode').value.trim(); }
      if (state.masterType === 'assignee' || state.masterType === 'resource') body.areaId = $('masterArea').value;
      await api(`/api/master/${masterApiType(state.masterType)}`, { method: 'POST', body });
    }
    await loadData(false); renderSettings(); toast('設定を保存しました。');
  } catch (e) { toast(e.message, 3500); }
}
async function deleteMaster(id) {
  if (!confirm('この設定を無効にしますか？既存の予定データは削除されません。')) return;
  try {
    if (state.masterType === 'customField') await api(`/api/custom-fields/${encodeURIComponent(id)}`, { method: 'DELETE' });
    else await api(`/api/master/${masterApiType(state.masterType)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadData(false); renderSettings(); toast('設定を無効にしました。');
  } catch (e) { toast(e.message, 3500); }
}
