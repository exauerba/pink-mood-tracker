# Visualize Pane — Design Evaluation & Refinement Plan

Branch: `viz/visualize-pane-polish`
App: **bloom** (pink-mood-tracker) — vanilla JS PWA, no build step.
Live view evaluated at `http://127.0.0.1:8123/index.html`, signed in with demo account (`demo` / `demo1234`), 120 days of data across 10 trackers, 1M range (Jul 22 – Aug 21), 5 selected trackers.

---

## What's already good

- Coherent pastel design system: `:root` tokens in `styles.css` (18px radius, rose-tinted shadows, `--pink-50..500` scale, `--rose-600/700`), warm gradient body background.
- Pill toggles for trackers / range / scale match the app's language and are easy to hit.
- **Correlation table is the standout** — a genuinely thoughtful Spearman viz with color-by-magnitude in `viz-insights.js`.
- `prefers-reduced-motion` guard present (collapses all animation/transition durations to 0.01ms at styles.css lines 1016–1025).
- Sensible defaults: 7-day rolling average, auto-select top-5 trackers by rating count then variance.

## Problems (ranked by impact)

**A. Trend chart is visually empty — reads as broken.** *(biggest issue)*
All 5 lines cluster lower-left (y≈2–4, Jul 24 – Aug 7). ~45% of the 460px chart (y=4.5→7) is blank. Cause: y-axis is hard-fixed at 1–7 while real data only spans ~2–4. Same issue in the "By time of day" chart (data lands entirely in one category).

**B. "What helped" insight is the most valuable thing — and the least styled.**
It's the payoff of the app, but renders as a plain bold `<p>` (`#helped-text`). The metric ("2.2 points lower") has no emphasis, no card treatment, no visual weight. Real *user-ease* failure: it's the sentence to remember.

**C. Correlation table details.**
- Diagonal uses `#f1f5f9` — a cool slate-gray that clashes with the warm palette.
- No legend for pink=negative / blue=positive / alpha=intensity.
- 0.8rem text + wrapping row labels ("Sleep quality" breaks across two lines) — cramped and hard to scan.

**D. Scale toggle is cryptic.**
"Up always good" / "Actual #'s" only makes sense after reading the 3-line hint paragraph. A flipped tracker gets only a subtle `↺` in the legend — easy to misread which direction is reflected.

**E. Weak hierarchy / lots of dead vertical space.** Five stacked control groups + three insight cards, but only the corr-table has visual weight. The primary chart is huge and empty while secondary insights are equal-sized.

---

## Plan

### Phase 1 — Un-empty the charts (highest return)
- **Autoscale the y-axis to the data** (floor/ceil to data extent ±0.5, clamped 1–7, `stepSize:1`) for both trend + by-time charts. Add `niceYRange(data)` helper in `charts.js`.
- **Strengthen the normal-band:** raise fill alpha 0.10 → ~0.16, add dashed border (`--pink-300`, ~50%) so it reads as a "typical range" envelope.
- Drop chart card **460px → ~380px**.

### Phase 2 — Promote "What helped"
- The metric ("2.2", direction) set large and bold, supporting sentence in `--text-soft`.
- Wrap in a soft emphasis card (pink-50→100 gradient + left accent bar, green if it helped / rose if not).
- Make it the visual anchor of the insights stack.

### Phase 3 — Correlation table polish
- Swap `#f1f5f9` → `--pink-100` for the diagonal.
- Add a compact legend (🔵 positive · 🩷 negative · deeper = stronger).
- Bump cell text to 0.85rem; row labels on one line.
- Minimum visible alpha (~0.15) for weak cells.

### Phase 4 — Clarify controls
- Replace cryptic scale pills with clearer segmented control + one-line caption ("Higher is usually worse → line is flipped"). Keep persisting `bloom.scale`.
- Visible "flipped" affordance in the legend (dashed line + `↺`) so direction is unambiguous.
- Collapse From/To into the "Custom" reveal — hide date inputs until "Custom" is tapped.

### Phase 5 — Hierarchy & layout
- Reorder insights so "What helped" sits first; trend chart primary size; arrange by-time + helped into two-column pair on desktop (stacked mobile).
- Tighten insight spacing (18→16px), unify card titles.

### Phase 6 — Verify
- Run the **impeccable audit**: confirm contrast (WCAG), reduced-motion still collapses, no Inter-font / purple-gradient / nested-card tell, all new colors route through existing palette tokens.

---

## Scope

Self-contained in `styles.css` + `charts.js` + `viz-insights.js` + `viz-time.js`, no new dependencies.
