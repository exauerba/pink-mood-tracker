# Visualization Color Coding — Fix Plan

Branch: `fix/viz-color-coding` (from `main` @ `36c33d1`)
Scope: the Visualize tab — trend chart, by-time-of-day chart, correlation matrix.
Status: **plan only, no code changed yet.** Every number below was measured against the shipped source.

---

## The three bugs

### Bug 1 — Legend swatch is not the line color

`charts.js:391` sets `backgroundColor: color + '22'` (the line color at 13% alpha). Chart.js fills the legend
box with `backgroundColor` (`fillStyle`, chart.js:8666) and strokes a hairline with `borderColor`
(chart.js:8386/8391/8419-8421). So the swatch is a 13% wash, not the line color.

Measured swatch-vs-card contrast, blush/light (`--card: #fdf6f8`): **1.08–1.24:1 for every tracker.** The
swatches are indistinguishable pale ghosts. Legend-vs-its-own-line ranged 1.68–7.21:1.

`viz-time.js:81` has the identical defect. There, the dataset also has `pointRadius: 4` with a visible marker
per day-part, so the point fill is washed too.

### Bug 2 — Tracker colors are neither theme-aware nor distinct

`colorForTracker` (charts.js:484-495) keeps the group hue + saturation and overrides **only lightness** with a
hardcoded 30→70 ramp. Two failures:

**Theme-blind.** Dark-mode palettes already ship *light* group colors (physical `#bcc6c1`, L≈76%); the ramp
drags them to L=30 and the lines vanish into the card.

| | light (`#fdf6f8`) | dark (`#281f24`) |
|---|---|---|
| Panic | **2.17:1** | 6.90:1 |
| Energy | **1.81:1** | 7.88:1 |
| Overthinking | **2.09:1** | 7.40:1 |
| Anxiety | 8.97:1 | **1.67:1** |
| Low mood | 5.57:1 | **2.70:1** |
| Sleep quality | 6.96:1 | **1.98:1** |
| Concentration | 8.58:1 | **1.81:1** |

Seven of twenty line/theme pairs fall below the 3:1 WCAG graphical-object minimum.

**Not distinct.** Adjacent same-group lines sit at ΔE76 8.2–9.6 at n=6. See *Open decision 4* for a
correction to the n=4 figure.

### Bug 3 — All chart chrome is hardcoded for one palette + one theme

Legend text, axis ticks, grid lines, the "normal band", and the note-dot ink are literal hex. Measured across
all 5 palettes:

| value | role | light | dark |
|---|---|---|---|
| `#5b3a4a` (charts.js:433, viz-time.js:101) | legend text | 9.17:1 ok | **1.62–1.69 FAIL** |
| `#9d7b8c` (charts.js:466,476; viz-time.js:108,113) | tick text | **3.49–3.57 FAIL** | **4.25–4.45 FAIL** |
| `#fce7f3` (charts.js:467; viz-time.js:109) | grid line | 1.10:1 invisible | **13.4–14.1 too loud** |
| `rgba(244,114,182,.16)` (charts.js:426) | band fill | 1.11:1 | fixed pink in every palette |
| `rgba(208,172,183,.55)` (charts.js:427) | band border | 1.1–1.8:1 | 1.1–1.8:1 |
| `#be185d` (charts.js:73) | note dot | 5.67:1 | **2.62–2.74 FAIL** |
| `PINK`/`BLUE` (viz-insights.js:13-14) | diverging matrix | ignores palette entirely, and is a *different* pink than the app's own |

Compounding: `applyPalette()` swaps CSS vars and `GROUPS` but never re-renders, so switching palette or
theme leaves the visualization stale until something else redraws. `updateGroupColors()` (app.js:239-248)
covers the Track view only.

---

## Sequencing

```
A  legend swatch          (2 one-line edits, zero risk)
B  tracker color ramp     (core rewrite, touches palettes.js + charts.js)
C  chart chrome           (independent of B)
D  re-render wiring       (depends on nothing; makes B and C verifiable)
```

**A before B.** Once A lands, `legendItem.fillStyle === dataset.borderColor` exactly, so the legend becomes
*as* distinct as the lines. Running B first means the bug is partly masked. B's return contract (below) is
independent of A and survives it, because `rawDotsPlugin` still derives `color+'33'` / `color+'55'`.

**D should land with B and C** — without it you cannot verify either one, because the only way to see the new
colors is to force a rebuild.

---

## Work item A — legend swatch

**Decision: set `backgroundColor: color`.** One property, one consumer.

Verified: `dataset.backgroundColor` has exactly one consumer in this repo — the legend. `LineElement.defaults.fill`
is `false` (chart.js:6890) and neither dataset sets `fill`, so no area is ever painted on the plot. The literal
`'22'` occurs only at charts.js:391 and viz-time.js:81.

**Rejected — `legend: { usePointStyle: true }`.** Read the source rather than trusting memory: chart.js:8662 calls
`getStyle(0)`, and `PointElement.defaultRoutes` (chart.js:7039-7042) route the point's `backgroundColor` back to the
*dataset's* `backgroundColor` — which is still the 13% wash. It does not fix the bug; you just get a circle instead of a
rect. It also silently changes the legend ring width from 2.5 to `PointElement.defaults.borderWidth = 1` (chart.js:7029).

**Rejected — `generateLabels` override.** Must spread or re-emit 16 fields, pinning the app to Chart.js internals.
(Trap for later: `fontColor` at chart.js:8667 is *not* what colors legend text; the draw path reads `labelOpts.color`.)

**Traded away:** the translucent area fill. There is none to preserve (`fill` is false), but **if anyone later sets
`fill` on either dataset, the lines will suddenly render a full-opacity area.** If a fill is ever wanted, introduce a
separate `areaColor` property rather than reverting `backgroundColor` to a wash.

### A1 — `charts.js:391`

```diff
-      backgroundColor: color + '22',
+      backgroundColor: color,
```

### A2 — `viz-time.js:81`

```diff
-        backgroundColor: color + '22',
+        backgroundColor: color,
```

### Acceptance

- Every dataset in both charts: `legendItem.fillStyle === dataset.borderColor` exactly (case-insensitive), so
  swatch-vs-line is 1.00:1 for all trackers. Today: 1.68–7.21:1.
- Swatch-vs-card ≥ **1.6:1** in both themes. **3:1 is not reachable by a legend-only fix** — the sub-3:1 cases are
  the *line itself* failing, which is Work item B. The bar is: the swatch must never be worse than the line it labels.

---

## Work item B — contrast-anchored Oklab ramp

**Replace the HSL lightness ramp with a straight line through Oklab**, anchored on the group's palette color, walking
a lightness band that is *guaranteed* to clear 3:1 against the live card.

Why Oklab: it is perceptually near-uniform, so a straight line in it gives evenly spaced ΔE between adjacent
siblings — which is exactly what HSL's `L` axis could not do. Rejected: golden-angle hue rotation (spends its whole
budget on hue, buys almost nothing in CIEDE2000 for in-family neighbors) and any pure-lightness variant (that *is*
the current bug).

- Band: light `[0.32, 0.635]`, dark `[0.525, 0.855]` in Oklab L.
- Hue window: 40° total at n=2, +6° per extra member, capped at 70° — keeps every sibling recognizably in-family.
- Chroma: anchored to the group's own, clamped to `[0.055, 0.10]`.
- Gamut mapping: binary-scale chroma down until all three sRGB channels are in range.
- Contrast repair: if the result misses 3:1, walk L further into the safe direction until it clears **3.05:1**
  (headroom — 8-bit rounding moves a computed ratio by ~±0.01 and several colors land at 3.05–3.12).
- `vizCardHex()` reads `cssVar('--card')` on **every call, uncached**. This is deliberate: a cached value goes stale
  across `applyPalette()` and paints light-mode colors onto a dark card. Measured cost is ~2n reads per render,
  well under a millisecond.
- **Return contract: lowercase 6-digit `#rrggbb`.** Callers string-concatenate `'22'` / `'33'` / `'55'` for
  translucent fills. Returning `rgb()` or 8-digit hex breaks that.

### B1 — delete `charts.js:484-495` and `charts.js:497-524`

The old function verbatim:

```js
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
```

`hexToHsl` / `hslToHex` (charts.js:497-524) become dead — their only callers were lines 488 and 494.

### B2 — insert into `palettes.js`, between `cssVar()` (ends 317) and `applyPalette()` (starts 319)

Lives in `palettes.js` so `charts.js` **and** `viz-time.js` share one implementation and the live `--card` is
resolvable. Both load after `palettes.js` (index.html:205-210), so a bare top-level `function` works in both.

```js
/* Shared tracker color ramp for every chart. Lives here (not charts.js) so
 * both charts.js and viz-time.js use one implementation, and so the live
 * --card value is resolvable. Contract: lowercase 6-digit #rrggbb — callers
 * append '22'/'33'/'55' for translucent fills. */
const VIZ_CARD_FLOOR = 3.05;          // 3:1 requirement + rounding headroom
const VIZ_BAND = { light: [0.32, 0.635], dark: [0.525, 0.855] };
const VIZ_HUE_BASE = 40;              // total hue window, 2 members
const VIZ_HUE_GROW = 6;               // extra degrees per extra member
const VIZ_HUE_MAX = 70;               // keep every sibling in-family

/* Card color as actually applied right now. No caching on purpose: a cached
 * value goes stale across applyPalette() and paints light-mode colors onto a
 * dark card. Falls back to the palette table if the CSS var is unreadable. */
function vizCardHex() {
  const raw = cssVar('--card');
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
  const p = PALETTES[localStorage.getItem('bloom.palette')] || PALETTES.blush;
  return p[currentMode()]['--card'];
}

function hexToLin(hex) {
  const h = hex.replace('#', '');
  return [0, 1, 2].map((i) => {
    const c = parseInt(h.substr(i * 2, 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
}

function linToHex(lin) {
  return '#' + lin.map((c) => {
    const s = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, s)) * 255).toString(16).padStart(2, '0');
  }).join('');
}

function relLumLin(lin) {
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function oklabToLin(o) {
  const l = Math.pow(o[0] + 0.3963377774 * o[1] + 0.2158037573 * o[2], 3);
  const m = Math.pow(o[0] - 0.1055613458 * o[1] - 0.0638541728 * o[2], 3);
  const s = Math.pow(o[0] - 0.0894841775 * o[1] - 1.2914855480 * o[2], 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

function linToOklab(lin) {
  const l = Math.cbrt(lin[0]), m = Math.cbrt(lin[1]), s = Math.cbrt(lin[2]);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

/* Oklab -> #rrggbb, reducing chroma until the color fits in sRGB. */
function oklabToHex(L, a, b) {
  const inside = (lin) => lin.every((c) => c >= -0.001 && c <= 1.001);
  const direct = oklabToLin([L, a, b]);
  if (inside(direct)) return linToHex(direct);
  let lo = 0, hi = 1;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (inside(oklabToLin([L, a * mid, b * mid]))) lo = mid; else hi = mid;
  }
  return linToHex(oklabToLin([L, a * lo, b * lo]));
}

/* Straight line through Oklab: a contrast-anchored lightness band plus a
 * narrow hue window, so adjacent same-group lines differ evenly in dE. */
function colorForTracker(t) {
  const g = GROUPS[t.group] || GROUPS.other;
  const anchor = linToOklab(hexToLin(g.color));
  const anchorC = Math.hypot(anchor[1], anchor[2]);
  let anchorH = Math.atan2(anchor[2], anchor[1]) * 180 / Math.PI;
  if (anchorH < 0) anchorH += 360;

  const cardY = relLumLin(hexToLin(vizCardHex()));
  const key = t.group || 'other';
  const siblings = trackers.filter((x) => (x.group || 'other') === key);
  const n = Math.max(siblings.length, 1);
  const u = n === 1 ? 0.5 : Math.max(0, siblings.indexOf(t)) / (n - 1);

  const band = cardY > 0.18 ? VIZ_BAND.light : VIZ_BAND.dark;
  const half = (Math.min(VIZ_HUE_MAX, VIZ_HUE_BASE + VIZ_HUE_GROW * (n - 1)) / 2) * Math.PI / 180;
  const hr = anchorH * Math.PI / 180;
  const c = Math.min(0.10, Math.max(0.055, anchorC));
  const a0 = c * Math.cos(hr - half), b0 = c * Math.sin(hr - half);
  const a1 = c * Math.cos(hr + half), b1 = c * Math.sin(hr + half);

  let L = band[0] + u * (band[1] - band[0]);
  for (let i = 0; i < 240; i++) {
    const hex = oklabToHex(L, a0 + u * (a1 - a0), b0 + u * (b1 - b0));
    const y = relLumLin(hexToLin(hex));
    if ((Math.max(y, cardY) + 0.05) / (Math.min(y, cardY) + 0.05) >= VIZ_CARD_FLOOR) return hex;
    L += cardY > 0.18 ? -0.004 : 0.004;
    if (L <= 0.02) return '#000000';
    if (L >= 0.99) return '#ffffff';
  }
  return oklabToHex(L, a0 + u * (a1 - a0), b0 + u * (b1 - b0));
}
```

### B3 — call sites: **no edits needed**

| Location | Code |
|---|---|
| `charts.js:126-127` | `pill.style.borderColor = colorForTracker(t);` / `pill.style.color = colorForTracker(t);` |
| `charts.js:383` | `const color = colorForTracker(t);` |
| `viz-time.js:76` | `const color = colorForTracker(t);` |

All keep working because the function keeps its global name. `GROUPS` (app.js:14) and `trackers` are `let` in a
later script, so they are only in the temporal dead zone until `app.js` executes — every call is a user click or a
render. **Do not add an eager call site at load time.**

### Expected output — default 10 trackers, blush

Light (`--card: #fdf6f8`):

| Tracker | old → new | old | new |
|---|---|---|---|
| Anxiety | `#5d3c45` → `#4b1c4e` | 8.97 | **12.51** |
| Low mood | `#875663` → `#70395a` | 5.57 | **8.14** |
| Irritability | `#a97885` → `#975565` | 3.45 | **5.18** |
| Panic | `#c3a2ab` → `#c0716d` | **2.17** ✗ | **3.38** ✓ |
| Sleep quality | `#3d5c4c` → `#003f10` | 6.96 | **11.47** |
| Energy | `#a3c2b2` → `#269d9b` | **1.81** ✗ | **3.09** ✓ |
| Concentration | `#3a495f` → `#003b3d` | 8.58 | **11.64** |
| Overthinking | `#a0afc5` → `#5291c3` | **2.09** ✗ | **3.18** ✓ |
| Coping skill use | `#aa8555` → `#894932` | 3.18 | **6.44** |
| Cravings | `#766699` → `#76497b` | 4.77 | **6.55** |

Dark (`--card: #281f24`): Anxiety `#8f5a8e` **3.07** · Low mood `#b27496` **4.45** · Irritability `#dd95a3` **6.79** ·
Panic `#ffbcb5` **10.00** · Sleep quality `#4e7653` **3.08** · Energy `#98dedc` **10.53** · Concentration `#437676`
**3.12** · Overthinking `#b0d5f1` **10.39** · Coping skill use `#b99087` **5.64** · Cravings `#af8fb2` **5.64**.

### Acceptance

Swept over 5 palettes × 2 modes × 6 groups × n = 1…12 (720 combinations):

- contrast violations `< 3:1`: **0** (observed min **3.05:1**)
- malformed hex / broken `'22'`/`'33'`/`'55'` concat: **0**
- worst-case min ΔE76 by group size: n=2 → 39.4, n=3 → 19.0, **n=4 → 12.5**, n=5 → 9.0, n=6 → 7.3, n=8 → 4.8

### Risks

- **n ≥ 5 in one group still falls under ΔE 10.** No within-family ramp can fix this — a contrast-bounded band runs
  out of room. The default set peaks at 4 per group. The fix for large n is non-color redundancy (dash patterns,
  endpoint labels), explicitly out of scope here.
- **The dark band bottom (0.525) is contrast-pinned, not chosen** — it is the lightest tone that clears 3:1 against
  the darkest card (mint `#1b221f`). Darken a card further and this endpoint must move down.
- **`VIZ_CARD_FLOOR = 3.05` is headroom, not slack.** Do not "clean it up" to 3.0.
- **Single-member groups now render the band midpoint, not the raw group color** (e.g. Coping `#894932`, not
  `#785e3c`). Correct for contrast, but it is a visible change to Manage-view swatches if any surface assumes
  `colorForTracker` equals the group color.
- **The `other` group has near-zero chroma**; the 0.055 floor tints its grays slightly. Harmless; `other` trackers are
  the least vivid series.

---

## Work item C — palette- and theme-aware chrome

**Mechanism note that drives the whole item.** `charts.js` and `viz-time.js` draw to `<canvas>`, and Chart.js caches
the exact color strings it was constructed with. Mutating a CSS variable afterwards changes **nothing** — no
`update()`, no resize, no repaint. So every value must be read **once at chart construction** inside `renderChart()` /
`vizTime.render()`, and a palette change requires a rebuild (Work item D). `rawDotsPlugin` is a per-frame draw hook
and can read live, once per frame.

`viz-insights.js` is the opposite: it builds real `<td>` elements, so `var(--x)` in an inline style resolves at paint
time and self-updates with no JS. That is why lines 240/252 are already correct and line 261 is not.

All replacement variables were confirmed to exist in `palettes.js` and `styles.css`.

### C1 — `charts.js`

`charts.js:54-56` — hoist one live read per frame:

```diff
   afterDatasetsDraw(chart) {
     const { ctx, chartArea, scales } = chart;
     if (!chartArea) return;
+    // Resolved once per frame, not once per point: a single getComputedStyle
+    // read, and the note dot still tracks a palette swap without a rebuild.
+    const noteInk = cssVar('--rose-600');
```

`charts.js:73` — note dot (`#be185d` is Tailwind pink-700, unrelated to any palette):

```diff
-          ctx.fillStyle = '#be185d';
+          ctx.fillStyle = noteInk;
```

`charts.js:426-427` — normal band (the *border* is what carries the band; the fill is a wash):

```diff
-              color: 'rgba(244,114,182,0.16)',
-              borderColor: 'rgba(208,172,183,0.55)',
+              color: cssVar('--pink-100'),
+              borderColor: cssVar('--rose-600'),
```

`charts.js:433` — legend text. **See open decision 1.**

```diff
-            color: '#5b3a4a',
+            color: cssVar('--text-soft'),
```

`charts.js:466-467` and `charts.js:476` — ticks + grid:

```diff
-          ticks: { stepSize: 1, color: '#9d7b8c', font: { family: 'Nunito' } },
-          grid: { color: '#fce7f3' },
+          ticks: { stepSize: 1, color: cssVar('--text-soft'), font: { family: 'Nunito' } },
+          grid: { color: cssVar('--hairline') },
```
```diff
-          ticks: { color: '#9d7b8c', font: { family: 'Nunito' }, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
+          ticks: { color: cssVar('--text-soft'), font: { family: 'Nunito' }, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
```

`--text-soft` clears 4.5:1 in all 10 palette/mode combos (5.19–5.86 light, 7.30–7.72 dark). `--hairline` sits at
1.08–1.19 by design — see open decision 2.

### C2 — `viz-time.js`

```diff
-          legend: { labels: { font: { family: 'Nunito', weight: 700 }, color: '#5b3a4a' } },
+          legend: { labels: { font: { family: 'Nunito', weight: 700 }, color: cssVar('--text-soft') } },
```
```diff
-            ticks: { stepSize: 1, color: '#9d7b8c', font: { family: 'Nunito' } },
-            grid: { color: '#fce7f3' },
+            ticks: { stepSize: 1, color: cssVar('--text-soft'), font: { family: 'Nunito' } },
+            grid: { color: cssVar('--hairline') },
```
```diff
-            ticks: { color: '#9d7b8c', font: { family: 'Nunito' } },
+            ticks: { color: cssVar('--text-soft'), font: { family: 'Nunito' } },
```

### C3 — `viz-insights.js`

`viz-insights.js:13-14` — delete both constants (they become unused once bases come from CSS):

```diff
-  const PINK = '236,72,153';
-  const BLUE = '56,189,248';
+  /* Strongest fill the cell ramp may reach. The label stays `var(--text)`
+   * (styles.css .corr-cell), and 0.38 is the highest ceiling that keeps
+   * --text at >= 4.5:1 on the composited cell in all 5 palettes x 2 themes.
+   * Keep in sync with the chip alpha in styles.css. */
+  const CORR_MAX_ALPHA = 0.38;
```

`viz-insights.js:225-226` — resolve once per render, not once per cell:

```diff
     const tbody = document.createElement('tbody');
+    // These are authored as "R, G, B" strings, so cssVar() returns exactly the
+    // substring the rgba() template below needs. Resolved once per render, not
+    // once per cell.
+    const posRgb = cssVar('--viz-pos-rgb');
+    const negRgb = cssVar('--viz-neg-rgb');
     shown.forEach((sa) => {
```

`viz-insights.js:260-261`:

```diff
-            const alpha = Math.max(0.15, Math.min(0.9, Math.abs(rho))).toFixed(2);
-            td.style.background = `rgba(${rho > 0 ? PINK : BLUE},${alpha})`;
+            const alpha = Math.max(0.15, Math.min(CORR_MAX_ALPHA, Math.abs(rho))).toFixed(2);
+            td.style.background = `rgba(${rho > 0 ? posRgb : negRgb},${alpha})`;
```

`styles.css:781-782` — the legend chips must track the cells:

```diff
-.chip-pink { background: rgba(236, 72, 153, 0.55); }
-.chip-blue { background: rgba(56, 189, 248, 0.55); margin-left: 10px; }
+.chip-pink { background: rgba(var(--viz-pos-rgb), 0.38); }
+.chip-blue { background: rgba(var(--viz-neg-rgb), 0.38); margin-left: 10px; }
```

### C4 — `palettes.js`: two new variables

A correlation scale needs two perceptually opposed hues. The palettes define exactly one accent family
(`--pink-*` and `--rose-*` are the same hue), so `--accent-rgb` cannot serve — and is disqualified anyway: it is the
*light* accent in both themes, which at 0.38 alpha composites to a near-invisible wash. Add after each
`'--accent-rgb'` line (palettes.js lines 49, 69, 103, 123, 157, 177, 211, 231, 265, 285):

| palette | light pos / neg | dark pos / neg |
|---|---|---|
| blush | `'114, 36, 49'` / `'42, 52, 119'` | `'234, 187, 195'` / `'193, 198, 233'` |
| lavender | `'52, 32, 78'` / `'18, 46, 54'` | `'216, 202, 234'` / `'171, 216, 227'` |
| mint | `'28, 66, 51'` / `'104, 39, 63'` | `'166, 217, 196'` / `'234, 197, 211'` |
| sky | `'34, 62, 91'` / `'83, 53, 29'` | `'195, 214, 233'` / `'231, 206, 187'` |
| peach | `'86, 58, 34'` / `'29, 72, 78'` | `'229, 208, 189'` / `'179, 220, 227'` |

Also add to `:root` in `styles.css` (after line 14) so chips resolve before any palette is applied and a missing key
degrades to blush rather than to an invalid color:

```diff
   --accent-rgb: 186, 135, 151;
+  --viz-pos-rgb: 114, 36, 49;
+  --viz-neg-rgb: 42, 52, 119;
```

These are **data** colors — deeper and more saturated than the palette's pastel chrome ramps, because they are only
ever seen composited at ≤0.38 alpha.

### C risks

- **Grid lines getting louder is not the risk; getting quieter is.** `--hairline` caps at 1.19, so the old 13–14:1
  dark-mode glare cannot recur. But at 1.10–1.14 in light mode reviewers may read the chart as having lost its
  structure. Step-up alternative is `--pink-200` (1.29–1.71). **Do not** jump to `--pink-300` — 3.3–3.8:1 in dark,
  invisible in light. Judge light and dark separately; a call from one theme will mislead.
- **`rgba(${posRgb},${alpha})` depends on the exact literal form.** Re-authoring `--viz-pos-rgb` as `#722431` or
  space-separated `'114 36 49'` silently yields an invalid background and a fully transparent cell. The `0.38` is also
  duplicated in `styles.css:781-782` — change one or change both, or the legend chips stop matching the cells.
- **`Math.max(0.15, …)` must stay below the cap.** If the floor is ever raised above `CORR_MAX_ALPHA`, `Math.max` wins
  and the ramp inverts.
- **The correlation alpha has three ways to break** and is the single most fragile part of this plan — see open
  decision 3 before implementing.
- **Grid/band colors assume the chart sits on `--card`.** True today (`.chart-card` uses `var(--card)`), but if a card
  ever gets its own background, the contrast numbers above stop applying while the code is still correct.

---

## Work item D — repaint on palette / theme change

**Hook `applyPalette()` — not `app.js`.** One insertion there covers all four entry points: `app.js:642` (palette
swatch), `app.js:660` (theme mode, via `setThemeMode` → `applyPalette`), `app.js:906` (init), and the
`prefers-color-scheme` listener at `palettes.js:336-339`. That last one is the only path where a **live, visible** chart
goes stale: the user is on the Visualize tab, the OS flips to dark, and nothing rebuilds. **No edits needed at
app.js:643/661** — the viz now refreshes at those same moments by construction.

### D1 — `charts.js`, after `renderVisualize()` (after line 94)

```diff
   if (window.vizInsights) window.vizInsights.render();
 }
 
+/* Rebuild the visualize charts after a palette or theme swap. Chart.js caches
+ * the color strings it was constructed with, so a CSS variable change cannot
+ * reach a live chart — the options object has to be rebuilt. No-op when the
+ * Visualize tab is hidden (nothing visible is stale; app.js rebuilds on the
+ * next tab switch, which re-reads the current palette) and no-op before the
+ * view has ever rendered, so `selectedForViz` is never auto-selected twice. */
+function refreshVizColors() {
+  const view = document.getElementById('view-visualize');
+  if (!view || !view.classList.contains('active')) return;
+  if (!vizInitialized) return;
+  renderVisualize();
+}
+
 function buildPills() {
```

Guard on `vizInitialized` (charts.js:10, set at charts.js:103), **not** on `!trendChart && !timeChart`: with zero
data `renderChart()` returns early and leaves both handles `null` even after a successful render, so a handle check
would skip the correlation rebuild.

### D2 — `palettes.js:328-329`

```diff
   localStorage.setItem('bloom.palette', effectiveId);
+  // Chart canvases resolve their colors once, at construction, so a palette or
+  // theme swap cannot reach an existing chart — rebuild it. The typeof guard
+  // covers the init call in app.js, which runs before charts.js is parsed.
+  if (typeof refreshVizColors === 'function') refreshVizColors();
 }
```

`vizInsights.render()` is invoked from `renderVisualize()` (charts.js:93), so the matrix cells rebuild in the same
pass. The `var(--pink-100)` / `var(--pink-50)` cells at viz-insights.js:240/252 need nothing.

### D risks

- **The `typeof` guard is load-bearing.** `app.js:906` calls `applyPalette` during `app.js` parse, before `charts.js`
  is parsed. Remove the `typeof` and the app throws a `ReferenceError` on every cold start.
- **Rebuild-on-swap is heavier than it looks** — re-reads every entry, recomputes rolling averages and Spearman
  matrices for up to 10 trackers, destroys and recreates two Chart.js instances. It only fires on `applyPalette`, so
  at most one rebuild per user action — but the `prefers-color-scheme` listener can fire repeatedly while the OS theme
  is actively being changed. If it stutters, debounce the media-query path rather than loosening the guard.
- **`vizInitialized` guards `selectedForViz`.** If it is ever reset without resetting the chart handles, a palette
  change on a visible tab will re-run `autoSelectDefaults()` and silently change which trackers are plotted.

---

## Open decisions — resolve before implementing C3

1. **Legend text weight: `--text-soft` or `--text`?** `--text-soft` is a deliberate hierarchy demotion (legend goes
   from 9.17:1 to 5.19–5.86 in light). It passes 4.5:1 everywhere. `--text` (9.35–12.96 everywhere) keeps the legend
   as the primary label. One-token swap either way.

2. **Grid line target.** `--hairline` (1.08–1.19) is the app's own "structural, not semantic" tint. It is defensible
   under WCAG 1.4.11 — gridlines are not required to understand the values, the tick labels are — but it does not
   reach 3:1 and that should be a conscious call, not a silent one. `--pink-200` is the one-notch-up alternative.

3. **The correlation heatmap gets materially weaker under this plan, and there is no free win.** Capping alpha at
   0.38 is what makes the labels AA-compliant, but it drops the strongest cell from ~5.2:1 (light) / ~7.9:1 (dark)
   distinct-from-card down to ~2.1 / ~2.7. The cell label is `var(--text)` at `0.85rem` bold ≈ 13.6px — *not* WCAG
   large text, so 4.5:1 is required, and `--text` (mid dark) against `--card` (mid light) has a dead band where
   neither reaches it. Loosening to 3:1 does not rescue it either: at 3:1 the fill must go near-black, and 38% of
   near-black over a near-white card composites to grey, destroying the diverging read. Options, none chosen here
   because it is a product call:
   - (a) raise `.corr-cell` to `1.2rem` bold (≥18.66px bold = WCAG large text, 3:1 target) **and** raise the alpha
     ceiling back toward 0.9, accepting a 3:1 label;
   - (b) drop the number from saturated cells and show it only on pale ones;
   - (c) add two near-extreme ink tokens (`--viz-ink-pale` / `--viz-ink-strong`, ~20 more lines) and switch on alpha,
     accepting a narrow ~4.4:1 band.

4. **Correction to the earlier ΔE claim.** The distinctness numbers in the bug report were adjacent-pair ΔE76. On a
   like-for-like all-pairs minimum, the blush `emotional` group at n=4 measures **ΔE76 13.4 / CIEDE2000 11.4**, not
   8.2–9.8. The n=6 figures (8.2 light / 7.9 dark) agree exactly, and the contrast half of the report reproduced to
   the decimal in both modes. So the distinctness problem is real but **starts around n=5, not n=4** — which is
   consistent with the new ramp holding 12.5 worst-case at n=4 and falling to 9.0 at n=5. Re-measure once during
   implementation and correct this document if needed.

5. **Should the diverging hues be per-palette at all?** A correlation scale is a data encoding, not brand chrome: a
   reader who learns "pink = moves together" in blush loses that mapping in mint. One fixed semantic pair defined once
   would be 4 lines instead of 20 and would keep the encoding stable. The plan implements per-palette because that was
   the brief; the alternative is defensible and worth one sentence from the user before C4 lands.

---

## Out of scope — flagged, not fixed

- **Tooltip is still palette-blind.** `charts.js:439-440` sets only `titleFont`; Chart.js falls back to
  `rgba(0,0,0,0.8)` / `#fff`. It passes contrast in both themes but is off-palette everywhere. A translucent
  `--card` tooltip will likely fail 4.5:1 on a light card — needs its own decision.
- **The "What helped" card is the same bug class.** `styles.css:645-646,666` are hardcoded greens that ignore the
  palette entirely.
- **`updateGroupColors()` misses the `auto` media-query path.** `palettes.js:338` calls `applyPalette` with no
  follow-up, so an OS theme flip leaves the Track view's group dots stale. One line —
  `if (typeof updateGroupColors === 'function') updateGroupColors();` in `applyPalette` — fixes it, mirroring D2.
- **Non-color redundancy for large groups** (dash patterns, endpoint labels) for n ≥ 5.

---

## Verification

No build step, no package.json, no test framework. Serve statically:
`python -m http.server 8000` from the repo root.

### Trap 1 — stale service worker (most likely false negative)

`sw.js` registers at `app.js:915` and serves app files cache-first. A normal reload will happily run the previous
`charts.js` and you will "verify" a fix that is not loaded. **Unregister the worker** (DevTools → Application →
Service Workers → Unregister) or hard-reload with Ctrl+Shift+R after *every* edit.

### Trap 2 — chart globals are not on `window`

`trendChart` (charts.js:8) and `timeChart` (viz-time.js:8) are top-level `let` in **classic** scripts, so they are
global *lexical* bindings: `trendChart` works in the console, `window.trendChart` is `undefined` (expected, not a
bug). `window.vizTime` and `window.vizInsights` **are** on `window`.

### Trap 3 — entries storage shape

`bloom.entries` is an **object keyed by ISO date**, not an array. `loadEntries` (app.js:96-105) explicitly rejects
`Array.isArray(parsed)`, so seeding an array silently yields zero points.

### Readback (Visualize tab active, after a theme/palette switch)

```js
(() => {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (a) => 0.2126 * lin(a[0]) + 0.7152 * lin(a[1]) + 0.0722 * lin(a[2]);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const parse = (s) => { const m = String(s).match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
  const card = parse(cssVar('--card'));
  const rows = [];
  const push = (what, color, min) => {
    const c = parse(color); if (!c) { rows.push({ what, color: String(color), vs_card: 'unresolved' }); return; }
    const r = ratio(c, card);
    rows.push({ what, color: String(color), vs_card: r.toFixed(2) + ':1', result: r >= min ? 'PASS' : 'FAIL' });
  };
  const probe = (ch, tag) => {
    if (!ch) { rows.push({ what: tag, color: '(not built)' }); return; }
    (ch.data.datasets || []).forEach((d) => push(tag + ' line: ' + d.label, d.borderColor, 3));
    push(tag + ' legend fill', ch.legend?.legendItems?.[0]?.fillStyle, 0);
  };
  probe(typeof trendChart !== 'undefined' ? trendChart : null, 'trend');
  probe(typeof timeChart !== 'undefined' ? timeChart : null, 'time');
  if (typeof trendChart !== 'undefined' && trendChart) {
    push('trend legend text', trendChart.options.plugins.legend.labels.color, 4.5);
    push('trend y ticks', trendChart.options.scales.y.ticks.color, 4.5);
    push('trend x ticks', trendChart.options.scales.x.ticks.color, 4.5);
    push('trend y grid', trendChart.options.scales.y.grid.color, 0);
    const b = trendChart.options.plugins.normalBand;
    if (b) { push('band fill', b.color, 0); push('band border', b.borderColor, 3); }
  }
  const cells = [...document.querySelectorAll('.corr-cell')]
    .map((td) => { const bg = parse(getComputedStyle(td).backgroundColor);
                   return bg ? ratio(parse(getComputedStyle(td).color), bg) : null; })
    .filter((v) => v !== null);
  if (cells.length) rows.push({ what: 'corr label (min of ' + cells.length + ')', color: '-',
    vs_card: Math.min(...cells).toFixed(2) + ':1', result: Math.min(...cells) >= 4.5 ? 'PASS' : 'FAIL' });
  console.log('palette=' + localStorage.getItem('bloom.palette') + ' theme=' + document.documentElement.dataset.theme);
  console.log(['--card','--text-soft','--hairline','--pink-100','--rose-600','--viz-pos-rgb','--viz-neg-rgb']
    .map((n) => n + '=' + JSON.stringify(cssVar(n))).join('  '));
  console.table(rows);
})();
```

### Checks

1. **Sweep all 5 palettes × both themes = 10 runs.** For each: Manage tab → set palette swatch and Light/Dark mode
   (do **not** use Auto — it is the `prefers-color-scheme` path and is not UI-controllable) → Visualize tab → paste
   readback. Expect every `PASS`, no `unresolved`, `trend y grid` 1.05–1.25, `band border` ≥ 4.7, `corr label` ≥ 4.5.
2. **Legend swatch equals line, exactly** — `trendChart.legend.legendItems[i].fillStyle === trendChart.data.datasets[i].borderColor`
   for every dataset, both charts. (This is the Work item A acceptance criterion; the readback above only prints the
   first item's fill, so assert the loop directly for item A.)
3. **Live repaint (Work item D).** Visualize tab active, DevTools → Rendering → emulate `prefers-color-scheme: dark`
   with `bloom.theme` unset. Charts must recolor with no reload. Then with the tab **hidden**, change the palette and
   confirm a clean console (no `ReferenceError`, no null-property error) — that is the guard working.
4. **Selection survives a palette change.** Select three tracker pills → Manage → change palette → Visualize. The same
   three must still be selected.
5. **Empty state.** Clear `bloom.entries`, Visualize tab open, change the OS theme. No console errors; `#viz-empty` /
   `#time-empty` still show.
6. **Offline contrast sweep.** A scratch harness that `eval`s the real `palettes.js` under browser stubs, written to
   `%TEMP%` and **never inside the repo**. Acceptance: 0 violations, min contrast ≥ 3.05 across all 720 combinations.
   Re-run after any tweak to `VIZ_BAND`, `VIZ_HUE_*`, the chroma clamp, or `CORR_MAX_ALPHA`.
7. **Final gate.** Run `impeccable.cmd detect --json charts.js viz-time.js viz-insights.js palettes.js styles.css` once
   at the end of implementation (directive from `impeccable context`). Report findings; do not repair drift as a side
   effect.
