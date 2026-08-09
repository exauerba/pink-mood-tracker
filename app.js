/* bloom — mood & symptom tracker
 * Pure static app. Data lives in localStorage (browser-only).
 * Trackers are a list of named 1-7 scales. Each day holds multiple
 * check-ins: { id, time (HH:MM), ratings: {trackerId: 1-7}, note }.
 */

const STORE_TRACKERS = 'bloom.trackers';
const STORE_ENTRIES = 'bloom.entries';
const STORE_DELETED = 'bloom.deletedTrackers';

let syncing = false; // true while a pull is loading data, to avoid push loops
let currentUid = null; // signed-in user id; tombstones are stored per user

let GROUPS = {
  emotional: { label: 'Emotional states', color: '#ba8797' },
  physical: { label: 'Physical & sleep', color: '#69957e' },
  mind: { label: 'Mind & focus', color: '#748db3' },
  coping: { label: 'Coping & connection', color: '#a7865b' },
  craving: { label: 'Craving', color: '#9482bc' },
  other: { label: 'Other', color: '#8e8a89' },
};

const DEFAULT_TRACKERS = [
  { name: 'Anxiety', group: 'emotional', direction: 'bad' },
  { name: 'Low mood', group: 'emotional', direction: 'bad' },
  { name: 'Irritability', group: 'emotional', direction: 'bad' },
  { name: 'Panic', group: 'emotional', direction: 'bad' },
  { name: 'Sleep quality', group: 'physical', direction: 'good' },
  { name: 'Energy', group: 'physical', direction: 'good' },
  { name: 'Concentration', group: 'mind', direction: 'good' },
  { name: 'Overthinking', group: 'mind', direction: 'bad' },
  { name: 'Coping skill use', group: 'coping', direction: 'good' },
  { name: 'Cravings', group: 'craving', direction: 'bad' },
];

// Direction for older trackers not covered by the defaults. Keyed by id
// because renameTracker only changes t.name, so ids stay stable.
const DIRECTION_BY_ID = {
  'anxiety': 'bad', 'panic-sensations': 'bad', 'panic': 'bad', 'sadness': 'bad',
  'irritability': 'bad', 'stress-level': 'bad', 'guilt': 'bad', 'overthinking': 'bad',
  'low-mood': 'bad', 'cravings': 'bad', 'craving': 'bad', 'urges': 'bad',
  'hyperfocus-pull': 'bad',
};

// Anchor labels shown under scale buttons 1 / 4 / 7. Other points have none.
// Individual trackers can override these via their optional `labels` field.
const DEFAULT_LABELS = { 1: 'Not at all', 4: 'Moderately', 7: 'Extremely' };

/* ---------- Storage layer ---------- */

function loadTrackers() {
  const defaults = DEFAULT_TRACKERS.map((d) => ({ id: slug(d.name), name: d.name, group: d.group, direction: d.direction || 'good' }));
  const raw = localStorage.getItem(STORE_TRACKERS);
  let saved = [];
  if (raw) {
    try { saved = JSON.parse(raw); } catch (e) { /* fall through */ }
  }
  // Backfill group for any saved tracker that predates grouping.
  const groupByName = {};
  defaults.forEach((d) => { groupByName[d.name] = d.group; });
  let backfilled = false;
  saved.forEach((t) => {
    if (!t.group) { t.group = groupByName[t.name] || 'other'; backfilled = true; }
  });
  // Backfill direction for any saved tracker that predates it.
  saved.forEach((t) => {
    if (!t.direction) { t.direction = DIRECTION_BY_ID[t.id] || 'good'; backfilled = true; }
  });
  // Backfill labels: drop broken shapes so defaults apply; valid ones pass through.
  saved.forEach((t) => {
    if (t.labels !== undefined && (t.labels === null || typeof t.labels !== 'object' || Array.isArray(t.labels))) {
      t.labels = undefined;
      backfilled = true;
    }
  });
  // Merge: keep saved trackers, append any new defaults not already present.
  const ids = new Set(saved.map((t) => t.id));
  let added = false;
  defaults.forEach((d) => { if (!ids.has(d.id) && !isDeleted(d.id)) { saved.push(d); added = true; } });
  if (added || backfilled) saveTrackers(saved);
  return saved;
}

function saveTrackers(trackers) {
  localStorage.setItem(STORE_TRACKERS, JSON.stringify(trackers));
  if (!syncing && window.bloomSync) {
    window.bloomLastTrackersPush = window.bloomSync.pushTrackers(trackers);
    return window.bloomLastTrackersPush;
  }
}

function loadEntries() {
  const raw = localStorage.getItem(STORE_ENTRIES);
  let entries = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) entries = parsed;
    } catch (e) { /* fall through */ }
  }
  return migrate(entries);
}

function saveEntries(entries) {
  localStorage.setItem(STORE_ENTRIES, JSON.stringify(entries));
  if (!syncing && window.bloomSync) {
    window.bloomLastEntriesPush = window.bloomSync.pushEntries(entries);
    return window.bloomLastEntriesPush;
  }
}

function readDeleted(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
function deletedKey() { return currentUid ? STORE_DELETED + '.' + currentUid : STORE_DELETED; }
function deletedIds() { return readDeleted(deletedKey()); }
function rememberDeleted(id) { const ids = deletedIds(); if (!ids.includes(id)) { ids.push(id); localStorage.setItem(deletedKey(), JSON.stringify(ids)); } }
function forgetDeleted(id) {
  const keys = [STORE_DELETED].concat(Object.keys(localStorage).filter((k) => k.startsWith(STORE_DELETED + '.')));
  keys.forEach((k) => localStorage.setItem(k, JSON.stringify(readDeleted(k).filter((x) => x !== id))));
}
function isDeleted(id) {
  const keys = currentUid ? [STORE_DELETED + '.' + currentUid, STORE_DELETED] : [STORE_DELETED];
  return keys.some((k) => readDeleted(k).includes(id));
}

/* Migrate the old single-record-per-day format to the check-in array format. */
function migrate(entries) {
  Object.keys(entries).forEach((date) => {
    const v = entries[date];
    if (v && !Array.isArray(v)) {
      const ratings = {};
      Object.keys(v).forEach((k) => { if (k !== 'note') ratings[k] = v[k]; });
      entries[date] = [{ id: genId(), time: '12:00', ratings, note: v.note || '' }];
    }
  });
  return entries;
}

/* ---------- Helpers ---------- */

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function genId() {
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(t) {
  const [h, m] = (t || '12:00').split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function shiftDate(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* Anchor labels for a tracker: per-tracker overrides layered on defaults. */
function labelsFor(t) {
  const anchors = { ...DEFAULT_LABELS };
  if (t && t.labels && typeof t.labels === 'object') {
    [1, 4, 7].forEach((k) => {
      const v = t.labels[k];
      if (typeof v === 'string' && v.trim()) anchors[k] = v;
    });
  }
  return anchors;
}

/* Validate and normalize a tracker's labels field. Only string values for
 * keys 1 / 4 / 7 are kept, trimmed to 24 chars; returns undefined when no
 * valid entry survives so defaults apply. */
function sanitizeLabels(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const out = {};
  [1, 4, 7].forEach((k) => {
    const v = value[k];
    if (typeof v === 'string' && v.trim()) {
      const trimmed = v.trim();
      if (trimmed.length <= 24) out[k] = trimmed;
    }
  });
  return Object.keys(out).length > 0 ? out : undefined;
}

/* ---------- State ---------- */

// Recover the signed-in user's id synchronously so the defaults merge can
// respect per-user deletions even on a signed-in page reload.
try {
  const sessionKey = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (sessionKey) {
    const s = JSON.parse(localStorage.getItem(sessionKey));
    if (s && s.user && s.user.id) currentUid = s.user.id;
  }
} catch (e) { /* no stored session */ }

let trackers = loadTrackers();
let entries = loadEntries();
let currentDate = todayISO();
let editingId = null; // id of check-in being edited, or null for a new one
let draft = {}; // trackerId -> rating for the check-in form
let labelsEditorId = null; // id of tracker whose scale labels are being edited

/* ---------- Tab switching ---------- */

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.getElementById('view-' + tab.dataset.view).classList.add('active');
    if (tab.dataset.view === 'visualize') renderVisualize();
    if (tab.dataset.view === 'manage') renderManage();
  });
});

// Re-apply current group colors to the (already rendered) Track view.
// Needed because applyPalette() swaps GROUPS without re-rendering.
function updateGroupColors() {
  document.querySelectorAll('.tracker-group').forEach((grp) => {
    const c = (GROUPS[grp.dataset.groupId] || GROUPS.other).color;
    grp.querySelector('.group-dot').style.background = c;
    grp.querySelectorAll('.tracker-name').forEach((n) => (n.style.color = c));
    grp.querySelectorAll('.scale-btn').forEach((b) => b.style.setProperty('--group-color', c));
  });
}

/* ---------- TRACK VIEW ---------- */

function renderTrack() {
  document.getElementById('track-date').textContent = formatDate(currentDate);
  document.getElementById('next-day').disabled = currentDate >= todayISO();
  editingId = null;
  draft = {};
  resetForm();
  renderEntries();
  renderScaleForm();
}

function renderEntries() {
  const wrap = document.getElementById('entry-list');
  wrap.innerHTML = '';

  const dayEntries = entries[currentDate] || [];
  if (dayEntries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'entry-empty';
    empty.textContent = 'No check-ins yet for this day 🌱';
    wrap.appendChild(empty);
    return;
  }

  dayEntries.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'entry-card';

    const header = document.createElement('div');
    header.className = 'entry-header';

    const time = document.createElement('span');
    time.className = 'entry-time';
    time.textContent = formatTime(entry.time);

    const actions = document.createElement('div');
    actions.className = 'entry-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'mini-btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => startEdit(entry));

    const delBtn = document.createElement('button');
    delBtn.className = 'mini-btn danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => deleteEntry(entry.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    header.appendChild(time);
    header.appendChild(actions);
    card.appendChild(header);

    const chips = document.createElement('div');
    chips.className = 'entry-chips';
    trackers.forEach((t) => {
      const v = entry.ratings[t.id];
      if (typeof v === 'number') {
        const chip = document.createElement('span');
        chip.className = 'chip';
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = (GROUPS[t.group] || GROUPS.other).color;
        dot.style.opacity = String(0.25 + (v / 7) * 0.75);
        chip.appendChild(dot);
        chip.appendChild(document.createTextNode(`${t.name} ${v}`));
        chips.appendChild(chip);
      }
    });
    card.appendChild(chips);

    if (entry.note) {
      const note = document.createElement('p');
      note.className = 'entry-note';
      note.textContent = entry.note;
      card.appendChild(note);
    }

    wrap.appendChild(card);
  });
}

function renderScaleForm() {
  const list = document.getElementById('tracker-list');
  list.innerHTML = '';

  // Drop draft ratings for trackers that no longer exist.
  const validIds = new Set(trackers.map((t) => t.id));
  Object.keys(draft).forEach((k) => { if (!validIds.has(k)) delete draft[k]; });

  // Group trackers by their group, preserving default order.
  const order = ['emotional', 'physical', 'mind', 'coping', 'craving', 'other'];
  const grouped = {};
  trackers.forEach((t) => {
    const g = t.group || 'other';
    (grouped[g] = grouped[g] || []).push(t);
  });

  order.forEach((gid) => {
    const items = grouped[gid];
    if (!items) return;
    const g = GROUPS[gid] || GROUPS.other;

    const group = document.createElement('div');
    group.className = 'tracker-group';
    group.dataset.groupId = gid;

    const header = document.createElement('div');
    header.className = 'group-header';
    const dot = document.createElement('span');
    dot.className = 'group-dot';
    dot.style.background = g.color;
    header.appendChild(dot);
    header.appendChild(document.createTextNode(g.label));
    group.appendChild(header);

    items.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'tracker-card';

      const name = document.createElement('div');
      name.className = 'tracker-name';
      name.style.color = g.color;
      name.textContent = t.name;

      const scaleWrap = document.createElement('div');
      scaleWrap.className = 'scale-wrap';

      const scale = document.createElement('div');
      scale.className = 'scale';

      for (let v = 1; v <= 7; v++) {
        const btn = document.createElement('button');
        btn.className = 'scale-btn' + (draft[t.id] === v ? ' selected' : '');
        btn.style.setProperty('--group-color', g.color);
        btn.textContent = v;
        btn.addEventListener('click', () => {
          draft[t.id] = v;
          scale.querySelectorAll('.scale-btn').forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
        });
        scale.appendChild(btn);
      }

      const labels = document.createElement('div');
      labels.className = 'scale-labels';
      const anchors = labelsFor(t);
      for (let v = 1; v <= 7; v++) {
        const lbl = document.createElement('span');
        lbl.className = 'scale-label';
        lbl.textContent = anchors[v] || '';
        labels.appendChild(lbl);
      }

      scaleWrap.appendChild(scale);
      scaleWrap.appendChild(labels);

      card.appendChild(name);
      card.appendChild(scaleWrap);
      group.appendChild(card);
    });

    list.appendChild(group);
  });
}

function resetForm() {
  document.getElementById('entry-time').value = nowTime();
  document.getElementById('daily-note').value = '';
  document.getElementById('save-btn').textContent = 'Save check-in';
  document.getElementById('checkin-title').textContent = 'New check-in';
  document.getElementById('cancel-edit').classList.add('hidden');
  document.getElementById('save-status').textContent = '';
}

function startEdit(entry) {
  editingId = entry.id;
  draft = { ...entry.ratings };
  document.getElementById('entry-time').value = entry.time || '12:00';
  document.getElementById('daily-note').value = entry.note || '';
  document.getElementById('save-btn').textContent = 'Update check-in';
  document.getElementById('checkin-title').textContent = 'Edit check-in';
  document.getElementById('cancel-edit').classList.remove('hidden');
  renderScaleForm();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteEntry(id) {
  if (!confirm('Delete this check-in?')) return;
  const dayEntries = entries[currentDate] || [];
  entries[currentDate] = dayEntries.filter((e) => e.id !== id);
  if (entries[currentDate].length === 0) delete entries[currentDate];
  saveEntries(entries);
  if (editingId === id) resetForm();
  renderEntries();
}

document.getElementById('prev-day').addEventListener('click', () => {
  currentDate = shiftDate(currentDate, -1);
  renderTrack();
});

document.getElementById('next-day').addEventListener('click', () => {
  currentDate = shiftDate(currentDate, 1);
  renderTrack();
});

document.getElementById('cancel-edit').addEventListener('click', () => {
  editingId = null;
  draft = {};
  resetForm();
  renderScaleForm();
});

document.getElementById('save-btn').addEventListener('click', () => {
  const time = document.getElementById('entry-time').value || '12:00';
  const note = document.getElementById('daily-note').value.trim();

  if (!entries[currentDate]) entries[currentDate] = [];

  if (editingId) {
    const entry = entries[currentDate].find((e) => e.id === editingId);
    if (entry) {
      entry.time = time;
      entry.ratings = { ...draft };
      entry.note = note;
    }
  } else {
    entries[currentDate].push({ id: genId(), time, ratings: { ...draft }, note });
  }

  saveEntries(entries);
  editingId = null;
  draft = {};
  resetForm();
  renderEntries();
  renderScaleForm();

  const status = document.getElementById('save-status');
  status.textContent = 'Saved 🌸';
  setTimeout(() => { status.textContent = ''; }, 2000);
});

/* ---------- MANAGE VIEW ---------- */

function renderManage() {
  const list = document.getElementById('tracker-list-manage');
  list.innerHTML = '';

  const order = ['emotional', 'physical', 'mind', 'coping', 'craving', 'other'];
  const grouped = {};
  trackers.forEach((t) => {
    const g = t.group || 'other';
    (grouped[g] = grouped[g] || []).push(t);
  });

  order.forEach((gid) => {
    const items = grouped[gid];
    if (!items) return;
    const g = GROUPS[gid] || GROUPS.other;

    const group = document.createElement('div');
    group.className = 'tracker-group';
    group.dataset.groupId = gid;

    const header = document.createElement('div');
    header.className = 'group-header';
    const dot = document.createElement('span');
    dot.className = 'group-dot';
    dot.style.background = g.color;
    header.appendChild(dot);
    header.appendChild(document.createTextNode(g.label));
    group.appendChild(header);

    items.forEach((t) => {
      const idx = trackers.indexOf(t);
      const card = document.createElement('div');
      card.className = 'tracker-card manage';

      const name = document.createElement('div');
      name.className = 'tracker-name';
      name.style.color = g.color;
      name.textContent = t.name;

      const actions = document.createElement('div');
      actions.className = 'manage-actions';

      const renameBtn = document.createElement('button');
      renameBtn.className = 'mini-btn';
      renameBtn.textContent = 'Rename';
      renameBtn.addEventListener('click', () => renameTracker(idx));

      const delBtn = document.createElement('button');
      delBtn.className = 'mini-btn danger';
      delBtn.textContent = 'Remove';
      delBtn.addEventListener('click', () => removeTracker(idx));

      const toggle = document.createElement('label');
      toggle.className = 'direction-toggle';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = t.direction === 'bad';
      checkbox.addEventListener('change', () => {
        t.direction = checkbox.checked ? 'bad' : 'good';
        saveTrackers(trackers);
        renderManage();
      });
      toggle.appendChild(checkbox);
      toggle.appendChild(document.createTextNode('Higher = worse'));

      const labelsBtn = document.createElement('button');
      labelsBtn.className = 'mini-btn';
      labelsBtn.textContent = 'Labels';
      labelsBtn.addEventListener('click', () => {
        labelsEditorId = labelsEditorId === t.id ? null : t.id;
        renderManage();
      });

      actions.appendChild(toggle);
      actions.appendChild(labelsBtn);
      actions.appendChild(renameBtn);
      actions.appendChild(delBtn);
      card.appendChild(name);
      card.appendChild(actions);

      if (labelsEditorId === t.id) card.appendChild(labelsEditor(t));

      group.appendChild(card);
    });

    list.appendChild(group);
  });

  const savedPalette = localStorage.getItem('bloom.palette') || 'blush';
  const theme = document.createElement('div');
  theme.className = 'theme-card';

  const themeTitle = document.createElement('h3');
  themeTitle.className = 'checkin-title';
  themeTitle.textContent = 'Theme';

  const themeHint = document.createElement('p');
  themeHint.className = 'hint';
  themeHint.textContent = 'Pick a pastel palette.';

  const swatches = document.createElement('div');
  swatches.className = 'theme-swatches';

  Object.entries(PALETTES).forEach(([id, p]) => {
    const btn = document.createElement('button');
    btn.className = 'theme-swatch' + (id === savedPalette ? ' active' : '');
    btn.dataset.palette = id;
    btn.title = p.name;

    const dot = document.createElement('span');
    dot.className = 'swatch-dot';
    dot.style.background = PALETTES[id].light['--pink-400'];

    const label = document.createElement('span');
    label.className = 'swatch-label';
    label.textContent = p.name;

    btn.appendChild(dot);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      applyPalette(id);
      updateGroupColors();
      renderManage();
    });

    swatches.appendChild(btn);
  });

  const savedMode = localStorage.getItem('bloom.theme') || 'auto';
  const modes = document.createElement('div');
  modes.className = 'theme-modes';

  ['auto', 'light', 'dark'].forEach((m) => {
    const btn = document.createElement('button');
    btn.className = 'theme-mode-btn' + (m === savedMode ? ' active' : '');
    btn.dataset.mode = m;
    btn.textContent = m.charAt(0).toUpperCase() + m.slice(1);
    btn.addEventListener('click', () => {
      setThemeMode(m);
      updateGroupColors();
      renderManage();
    });
    modes.appendChild(btn);
  });

  theme.appendChild(themeTitle);
  theme.appendChild(themeHint);
  theme.appendChild(swatches);
  theme.appendChild(modes);
  list.appendChild(theme);
}

function renameTracker(idx) {
  const t = trackers[idx];
  const newName = prompt('Rename "' + t.name + '" to:', t.name);
  if (newName && newName.trim()) {
    t.name = newName.trim();
    saveTrackers(trackers);
    renderManage();
  }
}

async function removeTracker(idx) {
  const t = trackers[idx];
  if (confirm('Remove "' + t.name + '"? Its past ratings will be kept but hidden.')) {
    trackers.splice(idx, 1);
    delete draft[t.id];
    rememberDeleted(t.id);
    const res = await saveTrackers(trackers);
    if (res && res.error) {
      const status = document.getElementById('manage-status');
      if (status) status.textContent = 'Removed on this device — will finish syncing later.';
    }
    renderManage();
  }
}

/* Inline editor for a tracker's 1 / 4 / 7 anchor labels. Inputs are
 * prefilled from labelsFor(t) (defaults visible until overridden). */
function labelsEditor(t) {
  const editor = document.createElement('div');
  editor.className = 'labels-editor';

  const anchors = labelsFor(t);
  [1, 4, 7].forEach((v) => {
    const field = document.createElement('div');
    field.className = 'labels-field';

    const lab = document.createElement('label');
    lab.textContent = String(v);

    const input = document.createElement('input');
    input.className = 'labels-input';
    input.type = 'text';
    input.maxLength = 24;
    input.value = anchors[v] || '';

    field.appendChild(lab);
    field.appendChild(input);
    editor.appendChild(field);
  });

  const actions = document.createElement('div');
  actions.className = 'labels-editor-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'mini-btn danger';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    labelsEditorId = null;
    renderManage();
  });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'mini-btn';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => {
    const labels = {};
    const keys = [1, 4, 7];
    editor.querySelectorAll('.labels-input').forEach((input, i) => {
      const val = input.value.trim();
      if (val) labels[keys[i]] = val;
    });
    t.labels = Object.keys(labels).length > 0 ? labels : undefined;
    labelsEditorId = null;
    saveTrackers(trackers);
    renderManage();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  editor.appendChild(actions);
  return editor;
}

document.getElementById('add-tracker-btn').addEventListener('click', () => {
  const input = document.getElementById('new-tracker-name');
  const name = input.value.trim();
  if (!name) return;
  const group = document.getElementById('new-tracker-group').value;
  let id = slug(name);
  if (trackers.some((t) => t.id === id)) {
    let n = 2;
    while (trackers.some((t) => t.id === id + '-' + n)) n++;
    id = id + '-' + n;
  }
  forgetDeleted(id);
  trackers.push({ id, name, group, direction: 'good' });
  saveTrackers(trackers);
  input.value = '';
  renderManage();
});

/* ---------- Export ---------- */

document.getElementById('export-btn').addEventListener('click', exportData);

function exportData() {
  const payload = {
    trackers,
    entries,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bloom-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  const status = document.getElementById('export-status');
  status.textContent = 'Downloaded 🌸';
  setTimeout(() => { status.textContent = ''; }, 3000);
}

/* ---------- Import ---------- */

document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const validGroups = ['emotional', 'physical', 'mind', 'coping', 'craving', 'other'];
      const status = document.getElementById('export-status');
      const showError = () => {
        status.textContent = 'That file did not work. Try your bloom backup file.';
        setTimeout(() => { status.textContent = ''; }, 4000);
      };

      const sanitizedTrackers = [];
      if (Array.isArray(data.trackers)) {
        for (const t of data.trackers) {
          if (
            !t ||
            typeof t.name !== 'string' || t.name.trim().length === 0 ||
            typeof t.group !== 'string' || !validGroups.includes(t.group)
          ) continue;
          const id = (typeof t.id === 'string' && t.id) || slug(t.name);
          sanitizedTrackers.push({
            id,
            name: t.name.trim(),
            group: t.group,
            // Old backups predate the direction toggle; backfill from known
            // ids. Explicit directions in the file are kept as-is.
            direction: t.direction === 'bad' || t.direction === 'good'
              ? t.direction
              : (DIRECTION_BY_ID[id] || 'good'),
            // Per-tracker anchor labels are optional; validated so only
            // clean 1/4/7 strings survive (else defaults apply).
            labels: sanitizeLabels(t.labels),
          });
        }
      }

      const sanitizedEntries = {};
      if (data.entries && typeof data.entries === 'object' && !Array.isArray(data.entries)) {
        for (const date of Object.keys(data.entries)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          const val = data.entries[date];
          if (!Array.isArray(val)) continue;
          const cleaned = [];
          for (const c of val) {
            if (
              !c ||
              typeof c.id !== 'string' || c.id.length === 0 ||
              typeof c.time !== 'string' || !/^\d{2}:\d{2}$/.test(c.time) ||
              !c.ratings || typeof c.ratings !== 'object' ||
              !Object.values(c.ratings).every((r) => typeof r === 'number' && r >= 1 && r <= 7)
            ) continue;
            cleaned.push({
              id: c.id,
              time: c.time,
              ratings: c.ratings,
              note: typeof c.note === 'string' ? c.note : '',
            });
          }
          if (cleaned.length > 0) sanitizedEntries[date] = cleaned;
        }
      }

      if (sanitizedTrackers.length === 0 && Object.keys(sanitizedEntries).length === 0) {
        showError();
        return;
      }

      trackers = sanitizedTrackers;
      entries = migrate(sanitizedEntries);
      saveTrackers(trackers);
      saveEntries(entries);
      renderTrack();
      renderManage();
      status.textContent = 'Imported 🌸';
      setTimeout(() => { status.textContent = ''; }, 3000);
    } catch (err) {
      const status = document.getElementById('export-status');
      status.textContent = 'That file did not work. Try your bloom backup file.';
      setTimeout(() => { status.textContent = ''; }, 4000);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* ---------- Init ---------- */

applyPalette(localStorage.getItem('bloom.palette') || 'blush');
renderTrack();

/* Register the service worker so the app can be installed and work offline. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

/* ---------- Sync hook ---------- */

// Called by supabase-sync.js to load cloud data into the app. Sets state,
// persists to localStorage, and re-renders without triggering a push loop.
window.bloomApp = {
  loadLocalData(newTrackers, newEntries) {
    syncing = true;
    try {
      trackers = newTrackers;
      // Cloud rows may be missing direction (migrated rows default to 'good');
      // correct known-bad ones before persisting locally.
      newTrackers.forEach((t) => {
        if (!t.direction) t.direction = DIRECTION_BY_ID[t.id] || 'good';
        if (t.labels !== undefined && (t.labels === null || typeof t.labels !== 'object' || Array.isArray(t.labels))) {
          t.labels = undefined;
        }
      });
      entries = newEntries;
      localStorage.setItem(STORE_TRACKERS, JSON.stringify(trackers));
      localStorage.setItem(STORE_ENTRIES, JSON.stringify(entries));
    } finally {
      syncing = false;
    }
    renderTrack();
    renderManage();
  },
  isDeleted,
  rememberDeleted,
  setUser(uid) { currentUid = uid || null; },
  clearLocal() {
    localStorage.removeItem(STORE_TRACKERS);
    localStorage.removeItem(STORE_ENTRIES);
    localStorage.removeItem(STORE_DELETED);
    trackers = [];
    entries = {};
    currentUid = null;
  }
};