/* bloom — visualization view (separate tab from tracking)
 * Renders a multi-line Chart.js chart of tracker ratings over time.
 * Each check-in is its own point on a time axis, so multiple entries
 * on the same day appear at their actual times. Includes per-tracker
 * toggle pills and a date range filter.
 */

let trendChart = null;
let selectedForViz = new Set();
let vizInitialized = false;

/* Trackers where a HIGHER rating is worse (e.g. anxiety). These are
 * plotted inverted (8 - y) so every line going up means "better".
 * Custom trackers default to "up = better". */
const BAD_DIRECTION = new Set([
  'anxiety', 'panic-sensations', 'panic', 'sadness', 'irritability',
  'stress-level', 'guilt', 'overthinking', 'low-mood', 'cravings',
  'craving', 'urges', 'hyperfocus-pull',
]);

/* Default selection on first visit: a small mix of good/bad lines. */
const DEFAULT_VIZ_IDS = ['anxiety', 'sleep-quality', 'energy', 'coping-skill-use', 'mood'];

function isFlipped(t) { return BAD_DIRECTION.has(t.id); }
function flipValue(v) { return 8 - v; }

/* Draws a shaded "normal" band (mean ± 1 SD of all raw values in range)
 * behind the lines, so a single bad day reads as noise, not crisis. */
const normalBandPlugin = {
  id: 'normalBand',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales.y) return;
    const band = chart.options.plugins.normalBand;
    if (!band) return;
    const yTop = scales.y.getPixelForValue(band.hi);
    const yBottom = scales.y.getPixelForValue(band.lo);
    ctx.save();
    ctx.fillStyle = band.color;
    ctx.fillRect(chartArea.left, yTop, chartArea.right - chartArea.left, yBottom - yTop);
    ctx.restore();
  },
};

/* Draws the raw check-in dots in a light color, plus a small rose dot
   above any raw point whose check-in carries a note. */
const rawDotsPlugin = {
  id: 'rawDots',
  afterDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;
    chart.data.datasets.forEach((ds) => {
      if (!ds.raw || !ds.raw.length) return;
      const color = ds.borderColor;
      ctx.save();
      ctx.fillStyle = color + '33';
      ctx.strokeStyle = color + '55';
      ctx.lineWidth = 1;
      ds.raw.forEach((p) => {
        const x = scales.x.getPixelForValue(p.x);
        const y = scales.y.getPixelForValue(p.y);
        if (x < chartArea.left || x > chartArea.right) return;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (p.note) {
          ctx.fillStyle = '#be185d';
          ctx.beginPath();
          ctx.arc(x, y - 9, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = color + '33';
        }
      });
      ctx.restore();
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

  // default: a small curated set on first visit
  if (!vizInitialized) {
    DEFAULT_VIZ_IDS.forEach((id) => {
      if (trackers.some((t) => t.id === id)) selectedForViz.add(id);
    });
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

/* Collect {x: date+time, y: rating} points for one tracker in range.
 * "Bad" trackers are inverted (8 - y) so up always means better;
 * the original rating is kept as `orig` for tooltips. */
function collectPoints(trackerId, from, to) {
  const t = trackers.find((x) => x.id === trackerId);
  const flipped = t && isFlipped(t);
  const pts = [];
  Object.keys(entries)
    .filter((d) => d >= from && d <= to)
    .sort()
    .forEach((d) => {
      (entries[d] || []).forEach((e) => {
        const y = e.ratings[trackerId];
        if (typeof y === 'number') {
          const pt = { x: `${d}T${e.time || '12:00'}`, y };
          if (flipped) { pt.orig = y; pt.y = flipValue(y); }
          if (typeof e.note === 'string' && e.note.trim()) pt.note = e.note;
          pts.push(pt);
        }
      });
    });
  pts.sort((a, b) => a.x.localeCompare(b.x));
  return pts;
}

/* 7-day trailing average of a tracker's daily means, as {x, y} points.
 * Skips days with no rating; needs at least 3 rated days in the window.
 * Flipped for "bad" trackers (8 - y) so up means better, `orig` kept. */
function rollingAverage(trackerId, from, to) {
  const t = trackers.find((x) => x.id === trackerId);
  const flipped = t && isFlipped(t);
  const days = Object.keys(entries)
    .filter((d) => d >= from && d <= to)
    .sort();
  const daily = []; // { day, mean }
  days.forEach((d) => {
    let sum = 0;
    let count = 0;
    (entries[d] || []).forEach((e) => {
      const v = e.ratings[trackerId];
      if (typeof v === 'number') {
        sum += v;
        count++;
      }
    });
    if (count > 0) daily.push({ day: d, mean: sum / count });
  });

  const out = [];
  for (let i = 0; i < daily.length; i++) {
    const window = daily.slice(Math.max(0, i - 6), i + 1);
    if (window.length < 3) continue;
    const avg = window.reduce((s, w) => s + w.mean, 0) / window.length;
    const pt = { x: `${daily[i].day}T00:00`, y: Math.round(avg * 100) / 100 };
    if (flipped) { pt.orig = pt.y; pt.y = Math.round(flipValue(avg) * 100) / 100; }
    out.push(pt);
  }
  return out;
}

/* Mean ± 1 SD across every raw rating in range, clamped to the 1-7 scale. */
function normalBand(selectedTrackers, from, to) {
  const all = [];
  selectedTrackers.forEach((t) => {
    collectPoints(t.id, from, to).forEach((p) => all.push(p.y));
  });
  if (all.length < 5) return null;
  const mean = all.reduce((s, v) => s + v, 0) / all.length;
  const sd = Math.sqrt(all.reduce((s, v) => s + (v - mean) ** 2, 0) / all.length);
  return {
    lo: Math.max(1, mean - sd),
    hi: Math.min(7, mean + sd),
  };
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

  const band = normalBand(selectedTrackers, from, to);

  const datasets = selectedTrackers.map((t) => {
    const color = colorForTracker(t);
    const flipped = isFlipped(t);
    return {
      label: t.name + (flipped ? ' ↺' : ''),
      data: rollingAverage(t.id, from, to),
      raw: collectPoints(t.id, from, to),
      borderColor: color,
      backgroundColor: color + '22',
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 0,
      spanGaps: true,
      tension: 0.4,
    };
  });

  trendChart = new Chart(canvas, {
    type: 'line',
    data: { datasets },
    plugins: [normalBandPlugin, rawDotsPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        normalBand: band
          ? { lo: band.lo, hi: band.hi, color: 'rgba(244,114,182,0.10)' }
          : null,
        legend: {
          labels: {
            font: { family: 'Nunito', weight: 700, size: 11 },
            color: '#5b3a4a',
            boxWidth: 12,
            boxHeight: 12,
            padding: 8,
          },
        },
        tooltip: {
          titleFont: { family: 'Nunito', weight: 700 },
          callbacks: {
            label(context) {
              const raw = context.raw;
              // Flipped trackers plot 8 - rating; show the real rating.
              const label = raw ? String(raw.orig !== undefined ? raw.orig : raw.y) : '';
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