/* bloom — mood & symptom tracker
 * Pure static app. Data lives in localStorage (browser-only).
 * Trackers are a list of named 1-7 scales. Each day holds multiple
 * check-ins: { id, time (HH:MM), ratings: {trackerId: 1-7}, note }.
 */

const STORE_TRACKERS = 'bloom.trackers';
const STORE_ENTRIES = 'bloom.entries';

let syncing = false; // true while a pull is loading data, to avoid push loops

const GROUPS = {
  emotional: { label: 'Emotional states', color: '#ec4899' },
  physical: { label: 'Physical & sleep', color: '#a78bfa' },
  mind: { label: 'Mind & focus', color: '#38bdf8' },
  coping: { label: 'Coping & connection', color: '#34d399' },
  craving: { label: 'Craving', color: '#fb923c' },
  other: { label: 'Other', color: '#94a3b8' },
};

const DEFAULT_TRACKERS = [
  { name: 'Anxiety', group: 'emotional' },
  { name: 'Low mood', group: 'emotional' },
  { name: 'Irritability', group: 'emotional' },
  { name: 'Panic', group: 'emotional' },
  { name: 'Sleep quality', group: 'physical' },
  { name: 'Energy', group: 'physical' },
  { name: 'Concentration', group: 'mind' },
  { name: 'Overthinking', group: 'mind' },
  { name: 'Coping skill use', group: 'coping' },
  { name: 'Cravings', group: 'craving' },
];

/* ---------- Storage layer ---------- */

function loadTrackers() {
  const defaults = DEFAULT_TRACKERS.map((d) => ({ id: slug(d.name), name: d.name, group: d.group }));
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
  // Merge: keep saved trackers, append any new defaults not already present.
  const ids = new Set(saved.map((t) => t.id));
  let added = false;
  defaults.forEach((d) => { if (!ids.has(d.id)) { saved.push(d); added = true; } });
  if (added || backfilled) saveTrackers(saved);
  return saved;
}

function saveTrackers(trackers) {
  localStorage.setItem(STORE_TRACKERS, JSON.stringify(trackers));
  if (!syncing && window.bloomSync) window.bloomSync.pushTrackers(trackers);
}

function loadEntries() {
  const raw = localStorage.getItem(STORE_ENTRIES);
  let entries = {};
  if (raw) {
    try { entries = JSON.parse(raw); } catch (e) { /* fall through */ }
  }
  return migrate(entries);
}

function saveEntries(entries) {
  localStorage.setItem(STORE_ENTRIES, JSON.stringify(entries));
  if (!syncing && window.bloomSync) window.bloomSync.pushEntries(entries);
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

/* ---------- State ---------- */

let trackers = loadTrackers();
let entries = loadEntries();
let currentDate = todayISO();
let editingId = null; // id of check-in being edited, or null for a new one
let draft = {}; // trackerId -> rating for the check-in form

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
      const anchors = { 1: 'Not at all', 4: 'Moderately', 7: 'Extremely' };
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

      actions.appendChild(renameBtn);
      actions.appendChild(delBtn);
      card.appendChild(name);
      card.appendChild(actions);
      group.appendChild(card);
    });

    list.appendChild(group);
  });
}

function renameTracker(idx) {
  const t = trackers[idx];
  const newName = prompt('Rename "' + t.name + '" to:', t.name);
  if (newName && newName.trim()) {
    t.name = newName.trim();
    t.id = slug(newName);
    saveTrackers(trackers);
    renderManage();
  }
}

function removeTracker(idx) {
  const t = trackers[idx];
  if (confirm('Remove "' + t.name + '"? Its past ratings will be kept but hidden.')) {
    trackers.splice(idx, 1);
    saveTrackers(trackers);
    renderManage();
  }
}

document.getElementById('add-tracker-btn').addEventListener('click', () => {
  const input = document.getElementById('new-tracker-name');
  const name = input.value.trim();
  if (!name) return;
  const group = document.getElementById('new-tracker-group').value;
  trackers.push({ id: slug(name), name, group });
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
      if (!Array.isArray(data.trackers) || typeof data.entries !== 'object') {
        throw new Error('bad shape');
      }
      trackers = data.trackers;
      entries = migrate(data.entries);
      saveTrackers(trackers);
      saveEntries(entries);
      renderTrack();
      renderManage();
      const status = document.getElementById('export-status');
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
    trackers = newTrackers;
    entries = newEntries;
    localStorage.setItem(STORE_TRACKERS, JSON.stringify(trackers));
    localStorage.setItem(STORE_ENTRIES, JSON.stringify(entries));
    syncing = false;
    renderTrack();
    renderManage();
  }
};