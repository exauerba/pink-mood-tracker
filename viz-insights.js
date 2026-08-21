/* bloom — insights panels for the visualize view
 * Panel 1: "What helped" — compares anxiety on coping vs non-coping days.
 * Panel 2: "Links between trackers" — Spearman correlation matrix across
 * the trackers currently selected in the time chart.
 *
 * Depends only on the global lexical state from app.js (trackers, entries)
 * and charts.js (selectedForViz), plus the #viz-from / #viz-to date inputs.
 */

(function () {
  'use strict';

  const PINK = '236,72,153';
  const BLUE = '56,189,248';
  const NEAR_ZERO = 0.1;
  const MIN_HELPED_DAYS = 3;
  const MIN_PAIRED_DAYS = 5;
  const MAX_TRACKERS = 10;

  /* All dates in the range with entries, sorted ascending. */
  function rangeDays(from, to) {
    return Object.keys(entries)
      .filter((d) => d >= from && d <= to)
      .sort();
  }

  /* Average rating of one tracker over all check-ins on a single day,
   * or null when that tracker was not rated that day. */
  function dayAverage(day, trackerId) {
    let sum = 0;
    let count = 0;
    (entries[day] || []).forEach((e) => {
      const v = e.ratings[trackerId];
      if (typeof v === 'number') {
        sum += v;
        count++;
      }
    });
    return count === 0 ? null : sum / count;
  }

  /* Number of individual ratings for a tracker across the whole range. */
  function ratingCount(trackerId, from, to) {
    let count = 0;
    rangeDays(from, to).forEach((d) => {
      (entries[d] || []).forEach((e) => {
        if (typeof e.ratings[trackerId] === 'number') count++;
      });
    });
    return count;
  }

  /* ---------------- Panel 1: What helped ---------------- */

  function renderHelped(from, to) {
    const card = document.getElementById('helped-card');
    const content = document.getElementById('helped-content');
    const empty = document.getElementById('helped-empty');
    const deltaEl = document.getElementById('helped-delta');
    const deltaLabelEl = document.getElementById('helped-delta-label');
    const sentenceEl = document.getElementById('helped-sentence');

    const coping = trackers.filter((t) => t.group === 'coping');
    const anxiety =
      trackers.find((t) => t.id === 'anxiety' || String(t.name).toLowerCase() === 'anxiety') ||
      fallbackTracker(from, to);

    if (!content || !empty || !card) return;
    if (!anxiety || coping.length === 0) return;

    const copingIds = new Set(coping.map((t) => t.id));
    let copingSum = 0;
    let copingDays = 0;
    let otherSum = 0;
    let otherDays = 0;

    rangeDays(from, to).forEach((d) => {
      const avg = dayAverage(d, anxiety.id);
      if (avg === null) return;
      let usedCoping = false;
      (entries[d] || []).forEach((e) => {
        copingIds.forEach((id) => {
          if (typeof e.ratings[id] === 'number') usedCoping = true;
        });
      });
      if (usedCoping) {
        copingSum += avg;
        copingDays++;
      } else {
        otherSum += avg;
        otherDays++;
      }
    });

    if (copingDays < MIN_HELPED_DAYS || otherDays < MIN_HELPED_DAYS) {
      empty.classList.remove('hidden');
      card.classList.remove('helped', 'hurt');
      content.classList.add('hidden');
      return;
    }

    const copingMean = copingSum / copingDays;
    const otherMean = otherSum / otherDays;
    const diff = otherMean - copingMean; // positive => coping days lower

    let state;
    let delta;
    let deltaLabel;
    let sentence;
    if (Math.abs(diff) < 0.3) {
      state = 'neutral';
      delta = '≈';
      deltaLabel = 'no clear change';
      sentence = `Coping days and other days showed similar anxiety levels (${copingDays} vs ${otherDays} days).`;
    } else if (diff > 0) {
      state = 'helped';
      delta = diff.toFixed(1);
      deltaLabel = 'points lower with coping';
      sentence = `On days you used coping skills, ${anxiety.name} averaged ${diff.toFixed(1)} points lower (${copingDays} coping days vs ${otherDays} other days).`;
    } else {
      state = 'hurt';
      delta = Math.abs(diff).toFixed(1);
      deltaLabel = 'points higher with coping';
      sentence = `On days you used coping skills, ${anxiety.name} averaged ${Math.abs(diff).toFixed(1)} points higher (${copingDays} vs ${otherDays} days).`;
    }

    if (deltaEl) deltaEl.textContent = delta;
    if (deltaLabelEl) deltaLabelEl.textContent = deltaLabel;
    if (sentenceEl) sentenceEl.textContent = sentence;
    card.classList.remove('helped', 'hurt', 'neutral');
    card.classList.add(state);
    empty.classList.add('hidden');
    content.classList.remove('hidden');
  }

  function fallbackTracker(from, to) {
    let best = null;
    let bestCount = -1;
    trackers.forEach((t) => {
      const n = ratingCount(t.id, from, to);
      if (n > bestCount) {
        bestCount = n;
        best = t;
      }
    });
    return best;
  }

  /* ---------------- Panel 2: Links between trackers ---------------- */

  function renderCorrelations(from, to) {
    const wrap = document.getElementById('corr-wrap');
    if (!wrap) return;

    const series = [];
    trackers.forEach((t) => {
      if (!selectedForViz.has(t.id)) return;
      const days = new Map();
      rangeDays(from, to).forEach((d) => {
        const avg = dayAverage(d, t.id);
        if (avg !== null) days.set(d, avg);
      });
      if (days.size > 0) series.push({ id: t.id, name: t.name, days });
    });

    if (series.length < 2) {
      wrap.textContent = 'Select at least two trackers with data to see links.';
      return;
    }

    // Limit the table to MAX_TRACKERS. Prefer trackers with the most data;
    // when more than MAX_TRACKERS have data, pick the ones with the
    // strongest correlations instead.
    let shown = series;
    if (series.length > MAX_TRACKERS) {
      const strength = new Map();
      series.forEach((s) => strength.set(s.id, 0));
      for (let i = 0; i < series.length; i++) {
        for (let j = i + 1; j < series.length; j++) {
          const a = series[i];
          const b = series[j];
          const paired = [];
          a.days.forEach((val, day) => {
            if (b.days.has(day)) paired.push([val, b.days.get(day)]);
          });
          if (paired.length < MIN_PAIRED_DAYS) continue;
          const rho = Math.abs(
            spearman(
              paired.map((p) => p[0]),
              paired.map((p) => p[1])
            )
          );
          if (rho > strength.get(a.id)) strength.set(a.id, rho);
          if (rho > strength.get(b.id)) strength.set(b.id, rho);
        }
      }
      shown = series
        .slice()
        .sort(
          (x, y) =>
            strength.get(y.id) - strength.get(x.id) ||
            y.days.size - x.days.size
        )
        .slice(0, MAX_TRACKERS);
    } else {
      shown = series.slice().sort((x, y) => y.days.size - x.days.size);
    }

    const table = document.createElement('table');
    table.className = 'corr-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.textContent = '';
    headRow.appendChild(corner);
    shown.forEach((s) => {
      const th = document.createElement('th');
      th.textContent = s.name;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    shown.forEach((sa) => {
      const tr = document.createElement('tr');

      const label = document.createElement('td');
      label.className = 'corr-label';
      label.textContent = sa.name;
      tr.appendChild(label);

      shown.forEach((sb) => {
        const td = document.createElement('td');
        td.className = 'corr-cell';

        if (sa.id === sb.id) {
          td.textContent = '—';
          td.style.background = 'var(--pink-100)';
          tr.appendChild(td);
          return;
        }

        const paired = [];
        sa.days.forEach((val, day) => {
          if (sb.days.has(day)) paired.push([val, sb.days.get(day)]);
        });

        if (paired.length < MIN_PAIRED_DAYS) {
          td.textContent = '—';
          td.style.background = 'var(--pink-50)';
        } else {
          const rho = spearman(
            paired.map((p) => p[0]),
            paired.map((p) => p[1])
          );
          td.textContent = rho.toFixed(2);
          if (Math.abs(rho) >= NEAR_ZERO) {
            const alpha = Math.max(0.15, Math.min(0.9, Math.abs(rho))).toFixed(2);
            td.style.background = `rgba(${rho > 0 ? PINK : BLUE},${alpha})`;
          }
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrap.innerHTML = '';
    wrap.appendChild(table);
  }

  /* Spearman rank correlation: rank each series (average ranks for ties),
   * then Pearson correlation on the ranks. Constant series give 0. */
  function spearman(a, b) {
    return pearson(rankValues(a), rankValues(b));
  }

  function rankValues(values) {
    const n = values.length;
    const ranks = new Array(n);
    const indexed = values.map((v, i) => ({ v, i }));
    indexed.sort((x, y) => (x.v - y.v) || (x.i - y.i));
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n && indexed[j].v === indexed[i].v) j++;
      const avg = (i + 1 + j) / 2;
      for (let k = i; k < j; k++) ranks[indexed[k].i] = avg;
      i = j;
    }
    return ranks;
  }

  function pearson(x, y) {
    const n = x.length;
    let mx = 0;
    let my = 0;
    for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
    mx /= n;
    my /= n;
    let num = 0;
    let dx = 0;
    let dy = 0;
    for (let i = 0; i < n; i++) {
      const a = x[i] - mx;
      const b = y[i] - my;
      num += a * b;
      dx += a * a;
      dy += b * b;
    }
    if (dx === 0 || dy === 0) return 0;
    return num / Math.sqrt(dx * dy);
  }

  /* ---------------- Public API ---------------- */

  window.vizInsights = {
    render() {
      const fromEl = document.getElementById('viz-from');
      const toEl = document.getElementById('viz-to');
      if (!fromEl || !toEl) return;
      renderHelped(fromEl.value, toEl.value);
      renderCorrelations(fromEl.value, toEl.value);
    },
  };
})();