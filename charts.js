/* bloom — visualization view (separate tab from tracking)
 * Renders a multi-line Chart.js chart of tracker ratings over time.
 * Each check-in is its own point on a time axis, so multiple entries
 * on the same day appear at their actual times. Includes per-tracker
 * toggle pills and a date range filter.
 */

let trendChart = null;
let selectedForViz = new Set();
let vizInitialized = false;

/* Draws a small rose dot above each point whose raw data carries a note. */
const noteMarkerPlugin = {
  id: 'noteMarker',
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    chart.data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta || !meta.data) return;
      meta.data.forEach((el) => {
        const raw = el.$context && el.$context.raw;
        if (raw && typeof raw.note === 'string' && raw.note.trim()) {
          ctx.save();
          ctx.fillStyle = '#be185d';
          ctx.beginPath();
          ctx.arc(el.x, el.y - 10, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    });
  },
};

function renderVisualize() {
  buildPills();
  buildDateRange();
  renderChart();
  if (window.vizTime) window.vizTime.render();
  if (window.vizInsights) window.vizInsights.render();
}

function buildPills() {
  const wrap = document.getElementById('viz-tracker-pills');
  wrap.innerHTML = '';

  // default: everything selected on first visit
  if (!vizInitialized) {
    trackers.forEach((t) => selectedForViz.add(t.id));
    vizInitialized = true;
  }

  const allBtn = document.getElementById('viz-select-all');
  const noneBtn = document.getElementById('viz-select-none');
  if (allBtn) {
    allBtn.onclick = () => {
      trackers.forEach((t) => selectedForViz.add(t.id));
      renderVisualize();
    };
  }
  if (noneBtn) {
    noneBtn.onclick = () => {
      selectedForViz.clear();
      renderVisualize();
    };
  }

  trackers.forEach((t) => {
    const pill = document.createElement('button');
    pill.className = 'pill' + (selectedForViz.has(t.id) ? ' active' : '');
    pill.textContent = t.name;
    if (selectedForViz.has(t.id)) {
      pill.style.borderColor = colorForTracker(t);
      pill.style.color = colorForTracker(t);
    }
    pill.addEventListener('click', () => {
      if (selectedForViz.has(t.id)) selectedForViz.delete(t.id);
      else selectedForViz.add(t.id);
      renderVisualize();
    });
    wrap.appendChild(pill);
  });
}

function buildDateRange() {
  const from = document.getElementById('viz-from');
  const to = document.getElementById('viz-to');

  if (!from.value) from.value = shiftDate(todayISO(), -30); // last 30 days default
  if (!to.value) to.value = todayISO();

  from.addEventListener('change', renderVisualize);
  to.addEventListener('change', renderVisualize);
}

/* Collect {x: date+time, y: rating} points for one tracker in range. */
function collectPoints(trackerId, from, to) {
  const pts = [];
  Object.keys(entries)
    .filter((d) => d >= from && d <= to)
    .sort()
    .forEach((d) => {
      (entries[d] || []).forEach((e) => {
        const y = e.ratings[trackerId];
        if (typeof y === 'number') {
          const pt = { x: `${d}T${e.time || '12:00'}`, y };
          if (typeof e.note === 'string' && e.note.trim()) pt.note = e.note;
          pts.push(pt);
        }
      });
    });
  pts.sort((a, b) => a.x.localeCompare(b.x));
  return pts;
}

function renderChart() {
  const from = document.getElementById('viz-from').value;
  const to = document.getElementById('viz-to').value;

  const canvas = document.getElementById('trend-chart');
  const emptyMsg = document.getElementById('viz-empty');

  const selectedTrackers = trackers.filter((t) => selectedForViz.has(t.id));
  const hasData = selectedTrackers.some((t) => collectPoints(t.id, from, to).length > 0);

  emptyMsg.classList.toggle('hidden', hasData);
  canvas.style.display = hasData ? 'block' : 'none';

  if (trendChart) { trendChart.destroy(); trendChart = null; }
  if (!hasData) return;

  const datasets = selectedTrackers.map((t) => {
    const color = colorForTracker(t);
    return {
      label: t.name,
      data: collectPoints(t.id, from, to),
      borderColor: color,
      backgroundColor: color + '22',
      borderWidth: 3,
      pointRadius: 4,
      pointHoverRadius: 6,
      spanGaps: false,
      tension: 0.3,
    };
  });

  trendChart = new Chart(canvas, {
    type: 'line',
    data: { datasets },
    plugins: [noteMarkerPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { family: 'Nunito', weight: 700 }, color: '#5b3a4a' } },
        tooltip: {
          titleFont: { family: 'Nunito', weight: 700 },
          callbacks: {
            label(context) {
              const raw = context.raw;
              const label = raw ? String(raw.y) : '';
              if (raw && typeof raw.note === 'string' && raw.note.trim()) {
                return [label, `Note: ${raw.note}`];
              }
              return label;
            },
          },
        },
      },
      scales: {
        y: {
          min: 1,
          max: 7,
          ticks: { stepSize: 1, color: '#9d7b8c', font: { family: 'Nunito' } },
          grid: { color: '#fce7f3' },
        },
        x: {
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: { day: 'MMM d' },
            tooltipFormat: 'MMM d, HH:mm',
          },
          ticks: { color: '#9d7b8c', font: { family: 'Nunito' }, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
          grid: { display: false },
        },
      },
    },
  });
}

/* Color per tracker: use its group hue, vary lightness by position within
 * the group so same-group lines stay distinguishable. */
function colorForTracker(t) {
  const g = GROUPS[t.group] || GROUPS.other;
  const [h, s] = hexToHsl(g.color);
  const siblings = trackers.filter((x) => (x.group || 'other') === (t.group || 'other'));
  const idx = Math.max(0, siblings.indexOf(t));
  const n = Math.max(siblings.length, 1);
  // Evenly spread lightness across the group so same-group lines stay distinct.
  const newL = n === 1 ? 50 : 30 + (idx / (n - 1)) * 40;
  return hslToHex(h, s, newL);
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}