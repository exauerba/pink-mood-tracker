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
    physical: { label: 'Physical', color: '#66987e' },
    mind: { label: 'Mind', color: '#708cb7' },
    coping: { label: 'Coping', color: '#ac8756' },
    craving: { label: 'Craving', color: '#937fbf' },
    other: { label: 'Other', color: '#8e8a89' },
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
        emotional: { label: 'Emotional', color: '#d98ba0' },
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
        emotional: { label: 'Emotional', color: '#977cc0' },
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
        emotional: { label: 'Emotional', color: '#79beaa' },
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
        emotional: { label: 'Emotional', color: '#7c9dc0' },
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
        emotional: { label: 'Emotional', color: '#bf9c78' },
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
}

function setThemeMode(mode) {
  localStorage.setItem('bloom.theme', mode);
  applyPalette(localStorage.getItem('bloom.palette') || 'blush');
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const t = localStorage.getItem('bloom.theme');
  if (!t || t === 'auto') applyPalette(localStorage.getItem('bloom.palette') || 'blush');
});