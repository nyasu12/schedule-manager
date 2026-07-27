function bindEvents() {
  $('loginButton').addEventListener('click', () => { $('loginError').hidden = true; $('loginPassword').value = ''; openModal('loginModal'); setTimeout(() => $('loginUsername').focus(), 0); });
  $('logoutButton').addEventListener('click', async () => { try { await api('/api/logout', { method: 'POST' }); await loadData(false); toast('ログアウトしました。'); } catch (e) { toast(e.message); } });
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const error = $('loginError'); error.hidden = true; $('loginSubmit').disabled = true;
    try { await api('/api/login', { method: 'POST', body: { username: $('loginUsername').value.trim(), password: $('loginPassword').value } }); closeModal('loginModal'); await loadData(false); toast('ログインしました。'); }
    catch (err) { error.textContent = err.message; error.hidden = false; } finally { $('loginSubmit').disabled = false; }
  });
  qsa('[data-close-modal]').forEach((b) => b.addEventListener('click', () => closeModal(b.dataset.closeModal)));
  qsa('.modal-backdrop').forEach((el) => el.addEventListener('click', (e) => { if (e.target === el) el.hidden = true; }));
  qsa('[data-mode]').forEach((b) => b.addEventListener('click', () => { state.mode = b.dataset.mode; closeDrawer(); renderMode(); }));
  $('regionFilter').addEventListener('change', renderMode); $('purposeFilter').addEventListener('change', renderMode); $('employeeFilter').addEventListener('change', renderMode); $('storeFilter').addEventListener('change', renderMode);
  qsa('[data-incomplete-filter]').forEach((input) => input.addEventListener('change', () => { state.incompleteFilters[input.dataset.incompleteFilter] = input.checked; updateIncompleteFilterSummary(); if (state.mode === 'incomplete') renderList(); }));
  $('clearIncompleteFilters')?.addEventListener('click', () => { state.incompleteFilters = { ...DEFAULT_INCOMPLETE_FILTERS }; qsa('[data-incomplete-filter]').forEach((input) => { input.checked = false; }); updateIncompleteFilterSummary(); if (state.mode === 'incomplete') renderList(); });
  $('prevMonth').addEventListener('click', () => { state.viewMonth.setMonth(state.viewMonth.getMonth() - 1); renderMode(); });
  $('nextMonth').addEventListener('click', () => { state.viewMonth.setMonth(state.viewMonth.getMonth() + 1); renderMode(); });
  $('thisMonth').addEventListener('click', () => { const n = new Date(); state.viewMonth = new Date(n.getFullYear(), n.getMonth(), 1); state.selectedDate = localDateString(n); closeMonthJump(); renderMode(); });
  $('monthLabel').addEventListener('click', () => { if ($('monthJumpPanel').hidden) openMonthJump(); else closeMonthJump(); });
  $('monthJumpApply').addEventListener('click', jumpToSelectedMonth); $('monthJumpCancel').addEventListener('click', closeMonthJump);
  $('addScheduleButton').addEventListener('click', () => openScheduleForm(''));
  $('addStoreRow').addEventListener('click', () => addLocationRow());
  $('schedulePurpose').addEventListener('change', updateScheduleConditionalFields);
  $('scheduleRegion').addEventListener('change', () => { renderChoicePicker('assignee'); renderChoicePicker('resource'); });
  $('employeePicker').addEventListener('change', () => addPickerChoice('assignee')); $('carPicker').addEventListener('change', () => addPickerChoice('resource'));
  qsa('[data-clear-choices]').forEach((b) => b.addEventListener('click', () => setChoiceIds(b.dataset.clearChoices.startsWith('employee') ? 'assignee' : 'resource', [])));
  $('scheduleForm').addEventListener('submit', saveSchedule); $('departureTimeForm').addEventListener('submit', saveStartTime); $('memoForm').addEventListener('submit', saveMemo); $('deleteScheduleButton').addEventListener('click', deleteSchedule);
  qsa('[data-open-settings]').forEach((b) => b.addEventListener('click', () => { if (!isAdmin()) return; state.masterType = 'scheduleType'; renderSettings(); openModal('settingsModal'); closeDrawer(); }));
  qsa('[data-master-type]').forEach((b) => b.addEventListener('click', () => { state.masterType = b.dataset.masterType; renderSettings(); }));
  $('masterForm').addEventListener('submit', saveMaster); $('masterReset').addEventListener('click', resetMasterForm);
  $('mobileMenuButton').addEventListener('click', () => { $('drawerBackdrop').hidden = false; }); $('closeDrawer').addEventListener('click', closeDrawer); $('drawerBackdrop').addEventListener('click', (e) => { if (e.target === $('drawerBackdrop')) closeDrawer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { qsa('.modal-backdrop').forEach((x) => { x.hidden = true; }); closeMonthJump(); closeDrawer(); } });
  bindExtensionEvents();
}
function closeDrawer() { $('drawerBackdrop').hidden = true; }

async function init() {
  bindEvents();
  const now = new Date(); state.viewMonth = new Date(now.getFullYear(), now.getMonth(), 1); state.selectedDate = localDateString(now);
  renderMode(); await loadData(true);
}

document.addEventListener('DOMContentLoaded', init);
