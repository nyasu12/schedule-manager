function currentScheduleType() { return scheduleTypeById($('schedulePurpose')?.value) || {}; }
function updateScheduleConditionalFields() {
  const type = currentScheduleType();
  $('returnDateWrap').hidden = false;
  $('otherContentWrap').hidden = false;
  $('organizationSection').hidden = type.enableOrganization === false;
  renderCustomFieldInputs();
  syncExtensionLocationRows(type);
  updateExtensionScheduleForm(type);
}

function addLocationRow(value = {}) {
  const row = document.createElement('div');
  row.className = 'dynamic-row store-row';
  row.innerHTML = `<label class="field">組織<select class="store-company"></select></label><label class="field">拠点<select class="store-store"><option value="">未選択</option></select></label><label class="field">備考<input class="store-note" maxlength="300" value="${escapeHtml(value.note || '')}"></label><button type="button" class="btn small danger row-remove">削除</button>`;
  const organizationSelect = qs('.store-company', row), activeOrganizations = state.data.organizations.filter((x) => x.active);
  organizationSelect.innerHTML = `<option value="">未選択</option>${activeOrganizations.map((x) => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('')}`;
  organizationSelect.value = value.organizationId ?? value.companyId ?? '';
  function refreshLocations() {
    const locationSelect = qs('.store-store', row), selected = locationSelect.value || value.locationId || value.storeId || '';
    const locations = state.data.locations.filter((x) => x.active && (!organizationSelect.value || (x.organizationId ?? x.companyId) === organizationSelect.value));
    locationSelect.innerHTML = `<option value="">未選択</option>${locations.map((x) => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('')}`;
    if ([...locationSelect.options].some((o) => o.value === selected)) locationSelect.value = selected;
  }
  organizationSelect.addEventListener('change', refreshLocations);
  qs('.row-remove', row).addEventListener('click', () => row.remove());
  refreshLocations();
  $('storeRows').appendChild(row);
  decorateExtensionLocationRow(row, value, currentScheduleType());
}

function customFieldDefinitionsForType(typeId) {
  return state.data.customFieldDefinitions.filter((field) => field.active !== false && (!field.scheduleTypeId || field.scheduleTypeId === typeId)).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}
function renderCustomFieldInputs(schedule = null) {
  const container = $('customFieldRows'); if (!container) return;
  const typeId = $('schedulePurpose')?.value || schedule?.scheduleTypeId || '';
  const definitions = customFieldDefinitionsForType(typeId);
  $('customFieldsSection').hidden = !definitions.length;
  container.innerHTML = definitions.map((field) => {
    const existing = container.querySelector(`[data-custom-field="${CSS.escape(field.id)}"]`);
    const value = schedule?.customFields?.[field.id] ?? (existing?.type === 'checkbox' ? String(existing.checked) : existing?.value) ?? '';
    const required = field.required ? 'required' : '';
    if (field.type === 'boolean') return `<label class="check-field"><input type="checkbox" data-custom-field="${escapeHtml(field.id)}" ${String(value) === 'true' ? 'checked' : ''}> ${escapeHtml(field.label)}</label>`;
    if (field.type === 'select') return `<label class="field">${escapeHtml(field.label)}<select data-custom-field="${escapeHtml(field.id)}" ${required}><option value="">未選択</option>${(field.options || []).map((option) => `<option value="${escapeHtml(option)}" ${String(value) === String(option) ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select></label>`;
    const inputType = ['number','date','time','url'].includes(field.type) ? field.type : 'text';
    return `<label class="field">${escapeHtml(field.label)}<input type="${inputType}" data-custom-field="${escapeHtml(field.id)}" value="${escapeHtml(value)}" ${required}></label>`;
  }).join('');
}
function collectCustomFieldValues() {
  const values = {};
  qsa('[data-custom-field]', $('customFieldRows')).forEach((el) => { values[el.dataset.customField] = el.type === 'checkbox' ? String(el.checked) : el.value; });
  return values;
}

function resetFileInputs() { if ($('generalAttachments')) $('generalAttachments').value = ''; }
function openScheduleForm(id = '') {
  const schedule = id ? state.data.schedules.find((x) => x.id === id) : null;
  if (schedule ? !canEditSchedule() : !canCreateSchedule()) return;
  $('scheduleModalTitle').textContent = schedule ? '予定を編集' : '新しい予定'; $('scheduleId').value = schedule?.id || '';
  $('scheduleDate').value = schedule?.date || state.selectedDate || localDateString(new Date()); $('returnDate').value = schedule?.returnDate || '';
  const areas = state.data.areas.filter((x) => x.active !== false || x.id === schedule?.areaId), types = state.data.scheduleTypes.filter((x) => x.active !== false || x.id === schedule?.scheduleTypeId);
  setSelectOptions($('scheduleRegion'), areas, schedule?.areaId || areas[0]?.id || ''); setSelectOptions($('schedulePurpose'), types, schedule?.scheduleTypeId || types[0]?.id || '');
  $('workflowStatus').value = schedule?.workflowStatus || 'planned'; $('departureTime').value = schedule?.startTime || ''; $('otherContent').value = schedule?.otherContent || ''; $('otherTransport').value = schedule?.otherTransport || ''; $('scheduleMemo').value = schedule?.memo || '';
  $('storeRows').innerHTML = ''; if (schedule?.locations?.length) schedule.locations.forEach(addLocationRow); else addLocationRow({});
  setChoiceIds('assignee', schedule?.assignees || []); setChoiceIds('resource', schedule?.resources || []); resetFileInputs(); renderCustomFieldInputs(schedule);
  $('deleteScheduleButton').hidden = !schedule || !canDeleteSchedule();
  if ($('generalAttachmentsSection')) $('generalAttachmentsSection').hidden = !canAddFiles();
  $('scheduleError').hidden = true;
  const type = scheduleTypeById($('schedulePurpose').value) || {}; $('organizationSection').hidden = type.enableOrganization === false; syncExtensionLocationRows(type); openExtensionScheduleForm(schedule, type); openModal('scheduleModal');
}

function openStartTimeForm(id) {
  if (!canEditStartTime()) return;
  const schedule = state.data.schedules.find((x) => x.id === id); if (!schedule) return;
  $('departureTimeScheduleId').value = schedule.id; $('quickDepartureTime').value = schedule.startTime || ''; $('departureTimeError').hidden = true; $('departureTimeTitle').textContent = `${fmtDate(schedule.date)} 開始時間変更`; openModal('departureTimeModal'); setTimeout(() => $('quickDepartureTime').focus(), 0);
}
async function saveStartTime(event) {
  event.preventDefault();
  const id = $('departureTimeScheduleId').value, error = $('departureTimeError'), button = $('departureTimeSaveButton'); error.hidden = true; button.disabled = true;
  try { await api(`/api/schedules/${encodeURIComponent(id)}/start-time`, { method: 'POST', body: { startTime: $('quickDepartureTime').value } }); closeModal('departureTimeModal'); await loadData(false); toast('開始時間を更新しました。'); }
  catch (e) { error.textContent = e.message; error.hidden = false; } finally { button.disabled = false; }
}

function openMemoForm(id) {
  if (!canEditMemo()) return;
  const schedule = state.data.schedules.find((x) => x.id === id); if (!schedule) return;
  $('memoScheduleId').value = schedule.id; $('quickMemo').value = schedule.memo || ''; $('memoError').hidden = true; $('memoTitle').textContent = `${fmtDate(schedule.date)} メモ変更`; openModal('memoModal'); setTimeout(() => $('quickMemo').focus(), 0);
}
async function saveMemo(event) {
  event.preventDefault();
  const id = $('memoScheduleId').value, error = $('memoError'), button = $('memoSaveButton'); error.hidden = true; button.disabled = true;
  try { await api(`/api/schedules/${encodeURIComponent(id)}/memo`, { method: 'POST', body: { memo: $('quickMemo').value } }); closeModal('memoModal'); await loadData(false); toast('メモを更新しました。'); }
  catch (e) { error.textContent = e.message; error.hidden = false; } finally { button.disabled = false; }
}

function collectLocationRows() {
  return qsa('.store-row', $('storeRows')).map((row) => ({ organizationId: qs('.store-company', row).value, locationId: qs('.store-store', row).value, note: qs('.store-note', row).value.trim() })).filter((row) => row.organizationId || row.locationId || row.note);
}
function selectedChoiceValues(containerId) { try { return JSON.parse($(containerId).dataset.selected || '[]'); } catch { return []; } }
async function uploadSelectedFiles(scheduleId, type) {
  if (!canAddFiles()) return [];
  const errors = [], general = $('generalAttachments') ? [...$('generalAttachments').files] : [];
  for (const file of general) { const form = new FormData(); form.append('file', file); try { await api(`/api/schedules/${encodeURIComponent(scheduleId)}/files?category=attachment`, { method: 'POST', body: form }); } catch (e) { errors.push(`${file.name}: ${e.message}`); } }
  if (canUseExtensions()) errors.push(...await uploadExtensionFiles(type, scheduleId));
  return errors;
}

async function saveSchedule(event) {
  event.preventDefault(); const errorEl = $('scheduleError'), button = $('saveScheduleButton'); errorEl.hidden = true; button.disabled = true;
  try {
    const existingId = $('scheduleId').value;
    if (existingId ? !canEditSchedule() : !canCreateSchedule()) throw new Error('この操作の権限がありません。');
    const type = currentScheduleType();
    const payload = {
      id: existingId, date: $('scheduleDate').value, returnDate: $('returnDate').value,
      areaId: $('scheduleRegion').value, scheduleTypeId: $('schedulePurpose').value, workflowStatus: $('workflowStatus').value, startTime: $('departureTime').value,
      otherContent: $('otherContent').value.trim(), otherTransport: $('otherTransport').value.trim(), memo: $('scheduleMemo').value.trim(),
      locations: type.enableOrganization === false ? [] : collectLocationRows(), assignees: selectedChoiceValues('employeeChoices'), resources: selectedChoiceValues('carChoices'), customFields: collectCustomFieldValues(), extensions: collectExtensionPayloads(type),
    };
    const result = await api('/api/schedules', { method: 'POST', body: payload }); const uploadErrors = await uploadSelectedFiles(result.id, type); state.selectedDate = payload.date; closeModal('scheduleModal'); await loadData(false);
    if (uploadErrors.length) toast(`予定は保存済み。ファイル${uploadErrors.length}件だけ失敗しました。`, 4500); else toast(existingId ? '予定を更新しました。' : '予定を登録しました。');
  } catch (e) { errorEl.textContent = e.message; errorEl.hidden = false; } finally { button.disabled = false; }
}
async function deleteSchedule() {
  if (!canDeleteSchedule()) return;
  const id = $('scheduleId').value; if (!id || !confirm('この予定を削除扱いにしますか？')) return;
  try { await api(`/api/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' }); closeModal('scheduleModal'); await loadData(false); toast('予定を削除しました。'); } catch (e) { toast(e.message, 3500); }
}
async function deleteFile(id) {
  if (!canDeleteFiles() || !confirm('このファイルを削除しますか？')) return;
  try { await api(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' }); await loadData(false); toast('ファイルを削除しました。'); } catch (e) { toast(e.message, 3500); }
}
