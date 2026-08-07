/* bloom — "By time of day" visualization
 * Averages each selected tracker's ratings across four day-parts
 * (Morning, Afternoon, Evening, Night) within the viz date range.
 * Purely additive: reads the global `entries`, `trackers`,
 * `selectedForViz`, `colorForTracker` state from the other scripts.
 */

let timeChart = null;

const DAYS = ['Morning', 'Afternoon', 'Evening', 'Night'];

/* Map an hour (0-23) to a day-part bucket index into DAYS. */
function dayPartIndex(hour) {
  if (hour >= 5 && hour <= 11) return 0; // Morning
  if (hour >= 12 && hour <= 16) return 1; // Afternoon
  if (hour >= 17 && hour <= 21) return 2; // Evening
  return 3; // Night (22-4)
}

window.vizTime = {
  render() {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById('time-chart');
    const emptyMsg = document.getElementById('time-empty');
    if (!canvas || !emptyMsg) return;

    const fromEl = document.getElementById('viz-from');
    const toEl = document.getElementById('viz-to');
    const from = (fromEl && fromEl.value) || shiftDate(todayISO(), -30);
    const to = (toEl && toEl.value) || todayISO();

    if (timeChart) { timeChart.destroy(); timeChart = null; }

    // sums[tid][part] = [sum of ratings, count]
    const sums = {};
    Object.keys(entries).forEach((d) => {
      if (d < from || d > to) return;
      (entries[d] || []).forEach((e) => {
        const h = parseInt((e.time || '12:00').split(':')[0], 10);
        if (isNaN(h)) return;
        const part = dayPartIndex(h);
        Object.keys(e.ratings || {}).forEach((tid) => {
          const v = e.ratings[tid];
          if (typeof v !== 'number') return;
          const acc = (sums[tid] = sums[tid] || [[0, 0], [0, 0], [0, 0], [0, 0]]);
          acc[part][0] += v;
          acc[part][1] += 1;
        });
      });
    });

    const selected = trackers.filter((t) => selectedForViz.has(t.id));
    const hasAny = selected.some((t) => sums[t.id] && sums[t.id].some(([, n]) => n > 0));

    emptyMsg.classList.toggle('hidden', hasAny);
    canvas.style.display = hasAny ? 'block' : 'none';
    if (!hasAny) return;

    const datasets = selected.map((t) => {
      const acc = sums[t.id] || [[0, 0], [0, 0], [0, 0], [0, 0]];
      const color = colorForTracker(t);
      return {
        label: t.name,
        data: acc.map(([sum, n]) => (n > 0 ? Math.round((sum / n) * 100) / 100 : null)),
        borderColor: color,
        backgroundColor: color + '22',
        borderWidth: 3,
        pointRadius: 4,
        spanGaps: false,
        tension: 0.3,
      };
    });

    timeChart = new Chart(canvas, {
      type: 'line',
      data: { labels: DAYS, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { family: 'Nunito', weight: 700 }, color: '#5b3a4a' } },
          tooltip: { titleFont: { family: 'Nunito', weight: 700 } },
        },
        scales: {
          y: {
            min: 1,
            max: 7,
            ticks: { stepSize: 1, color: '#9d7b8c', font: { family: 'Nunito' } },
            grid: { color: '#fce7f3' },
          },
          x: {
            type: 'category',
            ticks: { color: '#9d7b8c', font: { family: 'Nunito' } },
            grid: { display: false },
          },
        },
      },
    });
  },
};