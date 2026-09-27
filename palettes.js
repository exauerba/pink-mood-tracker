/* bloom — pastel color palettes
 * Defines the theme options and applyPalette(), which swaps CSS variables,
 * the global group colors, the theme-color meta, and the stored choice.
 * Each palette has a light and a dark variant; applyPalette() picks one
 * based on the stored 'bloom.theme' mode (auto resolves via media query).
 * The --pink-* CSS variable names are kept for backward compatibility and
 * simply hold each palette's accent shades.
 *
 * Every pair below is utility-verified: text/soft, card/bg, pill fills,
 * inputs, the save button, and the focus ring all meet WCAG AA.
 */

/* Group colors shared by every palette. Only 'emotional' differs per
 * palette — it mirrors the palette's accent (--pink-400 in light,
 * --rose-600 in dark). */
const BASE_GROUPS = {
  light: {
    physical: { label: 'Physical', color: '#476a58' },
    mind: { label: 'Mind', color: '#4e6280' },
    coping: { label: 'Coping', color: '#785e3c' },
    craving: { label: 'Craving', color: '#675986' },
    other: { label: 'Other', color: '#636160' },
  },
  dark: {
    physical: { label: 'Physical', color: '#bcc6c1' },
    mind: { label: 'Mind', color: '#bfc5cd' },
    coping: { label: 'Coping', color: '#cac2b9' },
    craving: { label: 'Craving', color: '#c6c1d1' },
    other: { label: 'Other', color: '#c4c3c3' },
  },
};

const PALETTES = {
  blush: {
    name: 'Blush',
    light: {
      '--bg': '#fdf1f5',
      '--card': '#fdf6f8',
      '--pink-50': '#fbe9ef',
      '--pink-100': '#f8d9e3',
      '--pink-200': '#f0c2d1',
      '--pink-300': '#e5a3b8',
      '--pink-400': '#d98ba0',
      '--pink-500': '#c06a85',
      '--rose-600': '#a84f6b',
      '--rose-700': '#5c2f3d',
      '--text': '#4d3c42',
      '--text-soft': '#765b66',
      '--accent-rgb': '217, 139, 160',
      '--shadow': '0 1px 2px rgba(217, 139, 160, 0.05), 0 8px 24px -8px rgba(217, 139, 160, 0.09)',
      '--shadow-hover': '0 1px 3px rgba(217, 139, 160, 0.07), 0 14px 30px -12px rgba(217, 139, 160, 0.13)',
      '--shadow-pressed': '0 1px 1px rgba(217, 139, 160, 0.04), 0 3px 8px -4px rgba(217, 139, 160, 0.07)',
      '--hairline': '#f2e4ea',
      '--ring': '#a84a63',
    },
    dark: {
      '--bg': '#1a1417',
      '--card': '#281f24',
      '--pink-50': '#281d21',
      '--pink-100': '#392a2f',
      '--pink-200': '#4c393f',
      '--pink-300': '#634b52',
      '--pink-400': '#866972',
      '--pink-500': '#b9a2a9',
      '--rose-600': '#c3a2a8',
      '--rose-700': '#271719',
      '--text': '#e4dcdf',
      '--text-soft': '#b9acb0',
      '--accent-rgb': '195, 162, 168',
      '--shadow': 'none',
      '--shadow-hover': 'none',
      '--shadow-pressed': 'none',
      '--hairline': '#302529',
      '--ring': '#bb959c',
    },
    groups: {
      light: {
        emotional: { label: 'Emotional', color: '#986170' },
        ...BASE_GROUPS.light,
      },
      dark: {
        emotional: { label: 'Emotional', color: '#c3a2a8' },
        ...BASE_GROUPS.dark,
      },
    },
    meta: { light: '#fdf1f5', dark: '#1a1417' },
  },
  lavender: {
    name: 'Lavender',
    light: {
      '--bg': '#f6f5f7',
      '--card': '#fafafb',
      '--pink-50': '#f1f0f5',
      '--pink-100': '#e9e5f0',
      '--pink-200': '#d3c8e4',
      '--pink-300': '#b6a2d2',
      '--pink-400': '#977cc0',
      '--pink-500': '#7f56a9',
      '--rose-600': '#674195',
      '--rose-700': '#3b3046',
      '--text': '#433a4b',
      '--text-soft': '#665e78',
      '--accent-rgb': '151, 124, 192',
      '--shadow': '0 1px 2px rgba(151, 124, 192, 0.05), 0 8px 24px -8px rgba(151, 124, 192, 0.09)',
      '--shadow-hover': '0 1px 3px rgba(151, 124, 192, 0.07), 0 14px 30px -12px rgba(151, 124, 192, 0.13)',
      '--shadow-pressed': '0 1px 1px rgba(151, 124, 192, 0.04), 0 3px 8px -4px rgba(151, 124, 192, 0.07)',
      '--hairline': '#edeaf1',
      '--ring': '#65478f',
    },
    dark: {
      '--bg': '#17141a',
      '--card': '#231f28',
      '--pink-50': '#231e29',
      '--pink-100': '#342e3e',
      '--pink-200': '#463d51',
      '--pink-300': '#5e536e',
      '--pink-400': '#776c89',
      '--pink-500': '#b5aec2',
      '--rose-600': '#b4a8c7',
      '--rose-700': '#221727',
      '--text': '#e6e2e9',
      '--text-soft': '#b1acb9',
      '--accent-rgb': '180, 168, 199',
      '--shadow': 'none',
      '--shadow-hover': 'none',
      '--shadow-pressed': 'none',
      '--hairline': '#2c2733',
      '--ring': '#a495bb',
    },
    groups: {
      light: {
        emotional: { label: 'Emotional', color: '#6a5786' },
        ...BASE_GROUPS.light,
      },
      dark: {
        emotional: { label: 'Emotional', color: '#b4a8c7' },
        ...BASE_GROUPS.dark,
      },
    },
    meta: { light: '#f6f5f7', dark: '#17141a' },
  },
  mint: {
    name: 'Mint',
    light: {
      '--bg': '#f5f7f6',
      '--card': '#f8faf9',
      '--pink-50': '#f0f5f2',
      '--pink-100': '#e5f0ea',
      '--pink-200': '#c8e4d5',
      '--pink-300': '#9fd0b5',
      '--pink-400': '#79beaa',
      '--pink-500': '#428060',
      '--rose-600': '#367c5c',
      '--rose-700': '#273931',
      '--text': '#35453e',
      '--text-soft': '#596e6a',
      '--accent-rgb': '121, 190, 170',
      '--shadow': '0 1px 2px rgba(121, 190, 170, 0.05), 0 8px 24px -8px rgba(121, 190, 170, 0.09)',
      '--shadow-hover': '0 1px 3px rgba(121, 190, 170, 0.07), 0 14px 30px -12px rgba(121, 190, 170, 0.13)',
      '--shadow-pressed': '0 1px 1px rgba(121, 190, 170, 0.04), 0 3px 8px -4px rgba(121, 190, 170, 0.07)',
      '--hairline': '#e9f1ee',
      '--ring': '#478f7b',
    },
    dark: {
      '--bg': '#121714',
      '--card': '#1b221f',
      '--pink-50': '#1c2620',
      '--pink-100': '#293831',
      '--pink-200': '#374940',
      '--pink-300': '#486057',
      '--pink-400': '#69867b',
      '--pink-500': '#a2b9ad',
      '--rose-600': '#aecbb9',
      '--rose-700': '#172720',
      '--text': '#dce4df',
      '--text-soft': '#a6b5ad',
      '--accent-rgb': '174, 203, 182',
      '--shadow': 'none',
      '--shadow-hover': 'none',
      '--shadow-pressed': 'none',
      '--hairline': '#222d28',
      '--ring': '#95bba0',
    },
    groups: {
      light: {
        emotional: { label: 'Emotional', color: '#4b7669' },
        ...BASE_GROUPS.light,
      },
      dark: {
        emotional: { label: 'Emotional', color: '#aecbb9' },
        ...BASE_GROUPS.dark,
      },
    },
    meta: { light: '#f5f7f6', dark: '#121714' },
  },
  sky: {
    name: 'Sky',
    light: {
      '--bg': '#f5f6f7',
      '--card': '#f9fafb',
      '--pink-50': '#eff2f5',
      '--pink-100': '#e6eaf0',
      '--pink-200': '#c8d6e4',
      '--pink-300': '#9fb7d0',
      '--pink-400': '#7c9dc0',
      '--pink-500': '#4d7298',
      '--rose-600': '#416295',
      '--rose-700': '#252c37',
      '--text': '#3c434d',
      '--text-soft': '#5e6978',
      '--accent-rgb': '124, 157, 192',
      '--shadow': '0 1px 2px rgba(124, 157, 192, 0.05), 0 8px 24px -8px rgba(124, 157, 192, 0.09)',
      '--shadow-hover': '0 1px 3px rgba(124, 157, 192, 0.07), 0 14px 30px -12px rgba(124, 157, 192, 0.13)',
      '--shadow-pressed': '0 1px 1px rgba(124, 157, 192, 0.04), 0 3px 8px -4px rgba(124, 157, 192, 0.07)',
      '--hairline': '#eaedf1',
      '--ring': '#476a8f',
    },
    dark: {
      '--bg': '#14161a',
      '--card': '#1f2328',
      '--pink-50': '#1c2026',
      '--pink-100': '#2e343e',
      '--pink-200': '#3d4851',
      '--pink-300': '#53616e',
      '--pink-400': '#6c7989',
      '--pink-500': '#b3bcc6',
      '--rose-600': '#abb9c9',
      '--rose-700': '#171d27',
      '--text': '#e5e7eb',
      '--text-soft': '#aeb4bc',
      '--accent-rgb': '171, 185, 201',
      '--shadow': 'none',
      '--shadow-hover': 'none',
      '--shadow-pressed': 'none',
      '--hairline': '#272d33',
      '--ring': '#95a7bb',
    },
    groups: {
      light: {
        emotional: { label: 'Emotional', color: '#576e86' },
        ...BASE_GROUPS.light,
      },
      dark: {
        emotional: { label: 'Emotional', color: '#abb9c9' },
        ...BASE_GROUPS.dark,
      },
    },
    meta: { light: '#f5f6f7', dark: '#14161a' },
  },
  peach: {
    name: 'Peach',
    light: {
      '--bg': '#f7f6f5',
      '--card': '#f9f8f6',
      '--pink-50': '#f5f2f0',
      '--pink-100': '#f0eae6',
      '--pink-200': '#e4d7c8',
      '--pink-300': '#d2ba9d',
      '--pink-400': '#bf9c78',
      '--pink-500': '#916b4a',
      '--rose-600': '#8a5c3d',
      '--rose-700': '#40332b',
      '--text': '#4b413a',
      '--text-soft': '#72665b',
      '--accent-rgb': '191, 156, 120',
      '--shadow': '0 1px 2px rgba(191, 156, 120, 0.05), 0 8px 24px -8px rgba(191, 156, 120, 0.09)',
      '--shadow-hover': '0 1px 3px rgba(191, 156, 120, 0.07), 0 14px 30px -12px rgba(191, 156, 120, 0.13)',
      '--shadow-pressed': '0 1px 1px rgba(191, 156, 120, 0.04), 0 3px 8px -4px rgba(191, 156, 120, 0.07)',
      '--hairline': '#f1ede9',
      '--ring': '#8f6c47',
    },
    dark: {
      '--bg': '#1a1614',
      '--card': '#221e1b',
      '--pink-50': '#26201c',
      '--pink-100': '#3b312b',
      '--pink-200': '#4e423b',
      '--pink-300': '#6c5b51',
      '--pink-400': '#867569',
      '--pink-500': '#c2b7ae',
      '--rose-600': '#c7b6a8',
      '--rose-700': '#271b17',
      '--text': '#e7e3df',
      '--text-soft': '#b7b0a9',
      '--accent-rgb': '199, 182, 168',
      '--shadow': 'none',
      '--shadow-hover': 'none',
      '--shadow-pressed': 'none',
      '--hairline': '#332b26',
      '--ring': '#bba695',
    },
    groups: {
      light: {
        emotional: { label: 'Emotional', color: '#866d54' },
        ...BASE_GROUPS.light,
      },
      dark: {
        emotional: { label: 'Emotional', color: '#c7b6a8' },
        ...BASE_GROUPS.dark,
      },
    },
    meta: { light: '#f7f6f5', dark: '#1a1614' },
  },
};

function currentMode() {
  const t = localStorage.getItem('bloom.theme');
  if (t === 'dark') return 'dark';
  if (t === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/* Resolve a live palette CSS variable (e.g. '--rose-600') so canvas/runtime
 * code can use the currently applied palette instead of stale hardcoded hex. */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* Shared tracker color ramp for every chart. Lives here (not charts.js) so
 * both charts.js and viz-time.js use one implementation, and so the live
 * --card value is resolvable. Contract: lowercase 6-digit #rrggbb — callers
 * append '22'/'33'/'55' for translucent fills. */
const VIZ_CARD_FLOOR = 3.05;          // 3:1 requirement + rounding headroom
const VIZ_BAND = { light: [0.32, 0.635], dark: [0.525, 0.855] };
const VIZ_HUE_BASE = 40;              // total hue window, 2 members
const VIZ_HUE_GROW = 6;               // extra degrees per extra member
const VIZ_HUE_MAX = 70;               // keep every sibling in-family
/* Known limit: same-group separation falls below dE76 10 from n=5 (9.0 at n=5,
 * 7.3 at n=6). No contrast-bounded ramp can fix this, and the obvious
 * non-color channel is taken — borderDash [6,4] already means "inverted
 * tracker" (charts.js). The defaults peak at 4 per group, so this only bites
 * users who add trackers. If it needs a fix, use point shapes or line-end
 * labels, not dashes. */

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

/* NOTE: --viz-pos-rgb / --viz-neg-rgb (correlation heatmap) are intentionally
 * NOT palette keys — they are owned by styles.css so the diverging encoding
 * stays fixed across palettes. Do not add them to a palette block. */
function applyPalette(id) {
  const effectiveId = PALETTES[id] ? id : 'blush';
  const p = PALETTES[effectiveId];
  const mode = currentMode();
  Object.entries(p[mode]).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  GROUPS = p.groups[mode];
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.style.colorScheme = mode;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', p.meta[mode]);
  localStorage.setItem('bloom.palette', effectiveId);
  // Chart canvases resolve their colors once, at construction, so a palette or
  // theme swap cannot reach an existing chart — rebuild it. The typeof guard
  // covers the init call in app.js, which runs before charts.js is parsed.
  if (typeof refreshVizColors === 'function') refreshVizColors();
  // Same for the Track view's group dots: the prefers-color-scheme path calls
  // applyPalette() directly, so without this an OS theme flip leaves the Track
  // view stale. No-op before the Track view renders (empty querySelectorAll).
  if (typeof updateGroupColors === 'function') updateGroupColors();
}

function setThemeMode(mode) {
  localStorage.setItem('bloom.theme', mode);
  applyPalette(localStorage.getItem('bloom.palette') || 'blush');
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const t = localStorage.getItem('bloom.theme');
  if (!t || t === 'auto') applyPalette(localStorage.getItem('bloom.palette') || 'blush');
});