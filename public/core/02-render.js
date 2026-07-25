function dateInRange(date, start, end) { return date >= start && date <= end; }
function renderCalendar() {
  const y = state.viewMonth.getFullYear(), m = state.viewMonth.getMonth();
  $('monthLabel').textContent = `${y}年${m + 1}月`;
  const first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay()), rows = filteredBase();
  const holidayMap = new Map(state.data.holidays.map((x) => [x.date, x.name]));
  const today = localDateString(new Date()), html = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const ds = localDateString(d), dayRows = rows.filter((x) => x.date === ds), spans = rows.filter((x) => x.returnDate && dateInRange(ds, x.date, x.returnDate)).slice(0, 3);
    const classes = ['day'];
    if (d.getMonth() !== m) classes.push('other'); if (d.getDay() === 0) classes.push('sun'); if (d.getDay() === 6) classes.push('sat'); if (holidayMap.has(ds)) classes.push('holiday'); if (today === ds) classes.push('today'); if (state.selectedDate === ds) classes.push('selected'); if (spans.length) classes.push('has-trip');
    const typeIds = [...new Set(dayRows.map((x) => x.scheduleTypeId))];
    const countBlocks = typeIds.map((typeId) => { const group = dayRows.filter((x) => x.scheduleTypeId === typeId); const colors = [...new Set(group.flatMap(scheduleColors))]; return `<div class="day-count"><div class="count-line"><span>${escapeHtml(scheduleTypeName(typeId))}</span><strong>${group.length}件</strong></div>${colorStrip(colors)}</div>`; }).join('');
    const attentionCount = dayRows.filter((x) => isIncomplete(x) || ['draft','planned'].includes(x.workflowStatus || 'planned')).length;
    const spanLines = spans.map((s) => `<div class="trip-line">${scheduleColors(s).map((c) => `<i style="background:${escapeHtml(c)}"></i>`).join('')}</div>`).join('');
    const spanLabel = spans.some((s) => s.date === ds) ? `<div class="trip-label">複数日 ${spans.filter((s) => s.date === ds).length}件</div>` : '';
    html.push(`<div class="${classes.join(' ')}" data-date="${ds}"><div class="daynum">${d.getDate()}</div>${holidayMap.has(ds) ? `<span class="holiday-name">${escapeHtml(holidayMap.get(ds))}</span>` : ''}<div class="day-counts">${countBlocks}${attentionCount ? `<div class="incomplete-day">要確認 ${attentionCount}件</div>` : ''}</div>${spans.length ? `${spanLabel}<div class="trip-lines">${spanLines}</div>` : ''}</div>`);
  }
  $('calendarDays').innerHTML = html.join('');
  qsa('.day', $('calendarDays')).forEach((el) => el.addEventListener('click', () => { state.selectedDate = el.dataset.date; renderCalendar(); renderDetail(); if (window.innerWidth < 1050) $('detailDate').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
}

function listCard(schedule) {
  const missing = scheduleMissingReasons(schedule), color = scheduleColors(schedule)[0], status = schedule.workflowStatus || 'planned';
  return `<article class="list-card" style="--company-color:${escapeHtml(color)}"><div class="list-date">${escapeHtml(fmtDate(schedule.date))}<small>${escapeHtml(schedule.startTime || '時刻未設定')}</small></div><div class="list-main"><div class="title-line"><strong>${escapeHtml(scheduleTypeName(schedule.scheduleTypeId))} ／ ${escapeHtml(areaName(schedule.areaId))}</strong><span class="status-chip ${workflowStatusClass(status)}">${escapeHtml(workflowStatusLabel(status))}</span></div><p>${escapeHtml(locationSummary(schedule))}<br>担当者：${escapeHtml(assigneeSummary(schedule))}　リソース：${escapeHtml(resourceSummary(schedule))}</p>${missing.length ? `<span class="incomplete-chip">未割当・不足：${escapeHtml(missing.join('・'))}</span>` : ''}</div><button type="button" class="btn small list-open" data-open-schedule="${escapeHtml(schedule.id)}">詳細</button></article>`;
}

function renderList() {
  const rows = modeSchedules(), extensionMeta = extensionModeMeta(state.mode);
  const titles = { all: '予定一覧', personstore: '担当者・リソース別', incomplete: '未確定・未割当' };
  $('listTitle').textContent = extensionMeta?.title || titles[state.mode] || '予定一覧';
  const descriptions = { personstore: '担当者と拠点で予定を絞り込めます。', incomplete: '未確定ステータス、または予定タイプで必須にした項目が不足している予定です。' };
  $('listDescription').textContent = extensionMeta?.description || descriptions[state.mode] || '条件に合う予定を日付順に表示します。';
  $('listCount').textContent = `${rows.length}件`; $('scheduleList').innerHTML = rows.length ? rows.map(listCard).join('') : '<div class="empty">該当する予定はありません。</div>';
  qsa('[data-open-schedule]', $('scheduleList')).forEach((b) => b.addEventListener('click', () => { const s = state.data.schedules.find((x) => x.id === b.dataset.openSchedule); if (!s) return; state.selectedDate = s.date; renderDetail(s.id); $('detailDate').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
}

function customFieldDetailHtml(schedule) {
  const definitions = state.data.customFieldDefinitions.filter((field) => field.active !== false && (!field.scheduleTypeId || field.scheduleTypeId === schedule.scheduleTypeId));
  return definitions.map((field) => { const value = schedule.customFields?.[field.id]; if (value === undefined || value === '') return ''; return `<div class="summary-line"><b>${escapeHtml(field.label)}</b>${escapeHtml(field.type === 'boolean' ? (value === 'true' ? 'はい' : 'いいえ') : value)}</div>`; }).join('');
}

function scheduleDetailCard(schedule) {
  const colors = scheduleColors(schedule), missing = scheduleMissingReasons(schedule), status = schedule.workflowStatus || 'planned', type = scheduleTypeById(schedule.scheduleTypeId) || {};
  const locations = type.enableOrganization ? (schedule.locations?.length ? schedule.locations.map((row) => {
    const organization = organizationById(row.organizationId ?? row.companyId), location = locationById(row.locationId ?? row.storeId), suffix = extensionLocationSuffix(schedule, type, row);
    return `<div class="summary-line store-line" style="--company-color:${escapeHtml(organization?.color || '#aeb9c7')}"><b>${escapeHtml(organization?.name || '組織未設定')}</b>${escapeHtml(location?.name || '拠点未設定')}${escapeHtml(suffix)}${row.note ? `<br><small>${escapeHtml(row.note)}</small>` : ''}</div>`;
  }).join('') : '<div class="summary-line"><b>組織・拠点</b>未入力</div>') : '';
  const files = schedule.files?.length ? schedule.files.map((file) => { const label = file.category === 'attachment' ? '添付ファイル' : (extensionFileLabel(file) || '資料'); return `<div class="file-box"><div class="file-head"><strong>${escapeHtml(label)}</strong><a class="file-link" href="/files/${encodeURIComponent(file.id)}" target="_blank" rel="noopener">${escapeHtml(file.filename)}</a></div>${isEditor() ? `<div class="file-actions"><button type="button" class="btn small danger" data-delete-file="${escapeHtml(file.id)}">ファイル削除</button></div>` : ''}</div>`; }).join('') : '';
  return `<article class="schedule-card" style="--company-color:${escapeHtml(colors[0])}"><div class="title-line"><h3>${escapeHtml(schedule.startTime || '時刻未設定')}　${escapeHtml(scheduleTypeName(schedule.scheduleTypeId))}</h3><span class="status-chip ${workflowStatusClass(status)}">${escapeHtml(workflowStatusLabel(status))}</span></div>${missing.length ? `<div class="incomplete-chip">未割当・不足：${escapeHtml(missing.join('・'))}</div>` : ''}<p><strong>${escapeHtml(areaName(schedule.areaId))}</strong>${schedule.returnDate ? ` ／ 終了 ${escapeHtml(fmtDate(schedule.returnDate))}` : ''}</p>${locations}<div class="summary-line"><b>担当者</b>${escapeHtml(assigneeSummary(schedule))}</div><div class="summary-line"><b>リソース</b>${escapeHtml(resourceSummary(schedule))}</div>${schedule.otherContent ? `<div class="summary-line"><b>内容</b>${escapeHtml(schedule.otherContent)}</div>` : ''}${schedule.otherTransport ? `<div class="summary-line"><b>場所・交通</b>${escapeHtml(schedule.otherTransport)}</div>` : ''}${schedule.memo ? `<div class="summary-line"><b>メモ</b>${escapeHtml(schedule.memo)}</div>` : ''}${customFieldDetailHtml(schedule)}${renderScheduleExtensionDetails(schedule, type)}${files}${isEditor() ? `<div class="card-actions"><button type="button" class="btn small" data-edit-schedule="${escapeHtml(schedule.id)}">編集</button></div>` : isTimeEditor() ? `<div class="card-actions"><button type="button" class="btn small primary" data-edit-start-time="${escapeHtml(schedule.id)}">開始時間変更</button></div>` : ''}</article>`;
}

function renderDetail(focusId = '') {
  $('detailDate').textContent = state.selectedDate ? fmtDate(state.selectedDate) : '—';
  let rows = filteredBase().filter((s) => s.date === state.selectedDate); if (focusId) rows = rows.filter((s) => s.id === focusId);
  const hasBaseFilter = Boolean(($('regionFilter')?.value || '') || ($('purposeFilter')?.value || ''));
  $('detailArea').classList.toggle('empty', !rows.length); $('detailArea').innerHTML = rows.length ? rows.map(scheduleDetailCard).join('') : `<div class="empty">${hasBaseFilter ? 'この日の予定に、選択中の条件に合う予定はありません。' : 'この日の予定はありません。'}</div>`;
  qsa('[data-edit-schedule]', $('detailArea')).forEach((b) => b.addEventListener('click', () => openScheduleForm(b.dataset.editSchedule)));
  qsa('[data-edit-start-time]', $('detailArea')).forEach((b) => b.addEventListener('click', () => openStartTimeForm(b.dataset.editStartTime)));
  qsa('[data-delete-file]', $('detailArea')).forEach((b) => b.addEventListener('click', () => deleteFile(b.dataset.deleteFile)));
  bindExtensionDetailEvents($('detailArea'));
}

function renderMode() {
  const extensionMeta = extensionModeMeta(state.mode), titles = { month: 'カレンダー', all: '予定一覧', personstore: '担当者・リソース別', incomplete: '未確定・未割当' };
  $('pageTitle').textContent = extensionMeta?.title || titles[state.mode] || 'カレンダー';
  qsa('[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
  const month = state.mode === 'month'; $('calendarPanel').hidden = !month; $('listPanel').hidden = month; $('monthControls').hidden = !month;
  renderFilters(); renderStats(); if (month) renderCalendar(); else renderList(); renderDetail();
}
function renderAll() { renderSession(); renderFilters(); renderMode(); }

async function loadData(showLoading = true) {
  if (showLoading) setBanner('Cloudflareのデータを読み込んでいます…');
  try { state.data = normalizeBootstrap(await api('/api/bootstrap')); renderAll(); setBanner(''); return true; }
  catch (e) { console.error(e); setBanner(`データ読込エラー：${e.message}　ログインボタンなどの画面操作は利用できます。`, true); renderSession(); renderFilters(); renderMode(); return false; }
}

function setSelectOptions(el, rows, value = '') { el.innerHTML = rows.map((x) => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join(''); if ([...el.options].some((o) => o.value === value)) el.value = value; }
function choiceDomPrefix(kind) { return kind === 'assignee' ? 'employee' : 'car'; }
function choiceRows(kind) { const areaId = $('scheduleRegion')?.value || ''; const source = kind === 'assignee' ? state.data.assignees : state.data.resources; return source.filter((x) => x.active && (!areaId || !(x.areaId ?? x.regionId) || (x.areaId ?? x.regionId) === areaId)); }
function choiceAllRows(kind) { return kind === 'assignee' ? state.data.assignees : state.data.resources; }
function choiceIds(kind) { const el = $(`${choiceDomPrefix(kind)}Choices`); try { return JSON.parse(el.dataset.selected || '[]'); } catch { return []; } }
function setChoiceIds(kind, ids) { const prefix = choiceDomPrefix(kind), valid = [...new Set((ids || []).filter(Boolean))]; $(`${prefix}Choices`).dataset.selected = JSON.stringify(valid); renderChoicePicker(kind); }
function renderChoicePicker(kind) {
  const prefix = choiceDomPrefix(kind), label = kind === 'assignee' ? '担当者' : 'リソース', picker = $(`${prefix}Picker`), container = $(`${prefix}Choices`), selected = choiceIds(kind), rows = choiceRows(kind), allRows = choiceAllRows(kind);
  picker.innerHTML = `<option value="">${label}を選択してください</option>${rows.filter((x) => !selected.includes(x.id)).map((x) => `<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join('')}`;
  const selectedRows = selected.map((id) => allRows.find((x) => x.id === id)).filter(Boolean);
  container.innerHTML = selectedRows.length ? selectedRows.map((x) => `<span class="selected-choice">${escapeHtml(x.name)}<button type="button" aria-label="${escapeHtml(x.name)}を外す" data-remove-choice="${escapeHtml(kind)}" data-choice-id="${escapeHtml(x.id)}">×</button></span>`).join('') : '<span class="choice-empty">未選択でも保存できます。</span>';
  qsa(`[data-remove-choice="${kind}"]`, container).forEach((b) => b.addEventListener('click', () => setChoiceIds(kind, selected.filter((id) => id !== b.dataset.choiceId))));
}
function addPickerChoice(kind) { const picker = $(`${choiceDomPrefix(kind)}Picker`), id = picker.value; if (id) setChoiceIds(kind, [...choiceIds(kind), id]); }
