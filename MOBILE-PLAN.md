# Bloom — Mobile-Friendliness Plan

> Bloom is a vanilla-JS/HTML/CSS PWA (no framework, no build). This plan documents the
> gaps identified and the changes needed to make the app fully mobile-friendly. All work
> is tracked on the `mobile-friendly` branch off `main`.

## Summary

Bloom is already a strong mobile app: it's mobile-first, fluid `max-width: 720px`, uses
`rem` for all text, is Chart.js container-responsive, and renders correctly across
Track/Visualize/Manage at 320-414px with **no horizontal page scroll** (verified).
Lighthouse mobile: **A11y 91, Best Practices 100, SEO 90**.

This is a "close the remaining gaps and harden" plan, not a "make it work" plan.

## Already solid (keep as-is)

- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` present; zoom not disabled.
- Mobile-first fluid layout; only breakpoint is `min-width: 640px`.
- All text `rem`; zero `font-size: px` outliers.
- Chart.js `responsive: true, maintainAspectRatio: false` — charts fit width on mobile.
- Correlation heatmap uses an intentional horizontal scroll + `-webkit-overflow-scrolling: touch`.
- `prefers-reduced-motion` query + `:focus-visible` rings.
- Nothing essential is gated behind `:hover`.

## Priority 1 — Real issues / highest impact

### 1. iOS safe-area (notch / home-bar) support
- `index.html:5` → add `viewport-fit=cover` to the viewport meta.
- Add `env(safe-area-inset-*)` padding on: header (top), `main` (bottom), and the three
  fixed overlays: `.auth-screen`, `.update-banner`, `.onboarding`.

### 2. Fix WCAG AA color-contrast on group-label text + Create account
The `.tracker-name` group labels get inline colors set by JS. All fail contrast on
`#fdf6f8` (card bg):

| Color | Group | Contrast | Needs ≥ |
|---|---|---|---|
| `#d98ba0` | emotional | 2.41 | 4.5:1 |
| `#66987e` | physical | 3.10 | 4.5:1 |
| `#708cb7` | mind | 3.21 | 4.5:1 |
| `#ac8756` | coping | 3.10 | 4.5:1 |
| `#937fbf` | craving | 3.27 | 4.5:1 |

Plus `#auth-signup-btn` "Create account" (`#a84f6b` on `#f8d9e3` = 4.01).

Fix: darken group color tokens (~20-25%) and the signup button colors to reach ≥4.5:1 in
both light and dark themes. Colors come from the palettes.js group-color map and are
applied inline during tracker render (app.js:333-415).

### 3. `body { min-height: 100vh }` → dynamic viewport units
`styles.css:29`. Use `min-height: 100dvh` with a `100svh` fallback.

## Priority 2 — Interaction & touch polish

### 4. Bump undersized touch targets to ~44px / ≥24dp
- `.scale-btn` (7-across grid → ~34px on narrow) — `styles.css:160,167`.
- `.mini-btn` (padding 6px 12px) — `styles.css:790`.
- `.viz-tool` (padding 2px 0) — `styles.css:444`.
- `.ob-dot` (width 8px) — `onboarding.css:222`.
- `.direction-toggle input` (15px) — `styles.css` ~800s.

Expand the *clickable* area via padding + `::before`/negative margin without changing
visual size. Optionally let the scale row scroll horizontally.

### 5. Guard decorative `:hover` rules with `@media (hover: hover)`
~17 rules across `styles.css` and `onboarding.css`. Wrap all `.X:hover` blocks so touch
devices don't get stuck hover states.

### 6. Add swipe navigation to the onboarding carousel
`onboarding.js` only handles keyboard Escape/Arrow (onboarding.js:225). Add
touch/pointer swipe (`touchstart`/`touchmove`/`touchend`).

## Priority 3 — Robustness / harden + iOS install fidelity

### 7. `-webkit-text-size-adjust: 100%` on `html`/`body`
Prevents iOS auto text-inflation on orientation change.

### 8. `overflow-x: clip`/`hidden` safety net on `body`
Guards against long tracker names or heavy text-zoom.

### 9. iOS install + manifest fidelity
- Add `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title` to `index.html` head.
- `manifest.webmanifest`: add a `maskable` icon entry and align the static `theme-color`
  (`#f6f4f4`) with the manifest `theme_color` (`#f472b6`).

### 10. Add a `<meta name="description">`
Fixes the only SEO failure. Not mobile-specific.

### 11. (Optional) Precache the Google Fonts stylesheet in `sw.js`

## Priority 4 — Verification / QA gate

1. Lighthouse mobile: Accessibility ≥95, no `color-contrast` failures.
2. No horizontal page scroll at 320/375/390/414.
3. Hand-test touch flows: auth, check-in CRUD, tracker manage, theme picker, chart
   toggles, onboarding + swipe, export/import, delete account.
4. Landscape + dark mode render correctly; safe-area respects notch/home bar.
5. All targets ≥44px; no stuck hover states.

## Implementation order

1. Safe-area + viewport-fit (P1 #1).
2. Color-contrast token darkening (P1 #2) — biggest A11y lift.
3. `100dvh/svh` + text-size-adjust + overflow guard (P1 #3, P3 #7/#8).
4. Touch-target sizing + hover guard + carousel swipe (P2 #4/#5/#6).
5. iOS meta/manifest + maskable + meta description (P3 #9/#10).
6. Run the QA gate (P4).
