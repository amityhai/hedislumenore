# Baseline audit

What the codebase looked like on **7 Aug 2026**, before the system landed. This
is the evidence behind every rule in the docs, and the baseline the quarterly
audit measures against.

Scope: 32 CSS files (7,556 lines) and 47 JS components across the staff app
(`src/components`, `src/components/v2`), the provider portal
(`src/components/provider`), and shared UI (`src/components/ui`).

---

## Strengths — what was already right

The starting position was well above average, and the system preserved all of
it rather than replacing it.

- **Already tokenised.** A coherent `--c-*` / `--r-*` / `--sh-*` palette with
  ~95% adoption for colour. The hard part — getting people to use tokens at all
  — was already done.
- **Semantics were deliberate and documented.** Brand-never-status,
  assign-has-its-own-hue, shape-carries-meaning: all three were real rules with
  reasons written into the CSS comments. The system codified them; it did not
  invent them.
- **Comments explain *why*.** Genuinely rare. `--c-error-text` carries the note
  that it was darkened from `#c4453d` because the old value only reached 3.9:1.
  Someone had already been doing this work.
- **`min-height: 0` on the modal body**, `overflow-x: clip` rather than
  `hidden` to preserve sticky, the focus ring left un-radiused so it follows
  pills — three subtle correctness details that most codebases get wrong.
- **Accessibility foundations present.** 88 `aria-hidden`, 62 `aria-label`,
  correct `role="tablist"`/`tab`/`tabpanel`, `role="dialog"` + `aria-modal`,
  `role="status"` live regions, interactive rows with `role="button"`.
- **A reduced-motion block** already shipped.

---

## Findings

### P0 — contrast failures

Measured, not estimated. All four are fixed in Tier 1.

| # | Finding | Ratio | Impact |
|---|---|---|---|
| 1 | White label on `--c-primary` `#0e8a8c` | **4.17** | Every primary button in the product, at 13px/600. The most-pressed control was the least legible thing on the page. |
| 2 | `--c-success-text` `#0a8a5f` on its tint | **3.83** | The Above-Goal chip. Below and At both passed — the one good-news state was the only failure. |
| 3 | `--c-warn-text` `#9a6a16` on its tint | **4.13** | Unassigned chips, preview tags, sample-data notices. |
| 4 | `--c-text-3` `#6b7785` on `--c-bg-subtle` | **4.28** | Every caption, table-head label and hero-block meta line. |

Plus a structural one: **`--c-text-4` (`#9aa6ad`, 2.49:1) was used for readable
text** — column heads, KPI labels, pagination counts, empty-state hints. The
system now routes both legacy `fg-faint` and `fg-muted` text roles to the same
AA-capable slate, while decorative glyphs use a separate non-text token.

### P1 — scale drift

| Dimension | Distinct values found | System | Worst offenders |
|---|---|---|---|
| `font-size` | **29** | 13 | `9.5px`, `10.5px`, `11.5px`, `12.5px`, `13.5px`, `14.5px` |
| `@media` width | **19** | 6 | 560, 620, 640, 680, 720, 760, 768, 860, 900, 940, 980 |
| `z-index` | **16** | 13 | 3, 4, 5, 6, 30, 40, 49, 60, 110 |
| `font-weight` | **6** | 4 | 300 (×16 declarations), 800 (×1) |
| icon size | 14, 15, 16, 17, 18, 20, 28, 30 | 12/16/20/24/40/48 | 14, 15, 17 — below the floor and off the grid |

The z-index set is the most revealing: a nav scrim at 49 one below its own
sidebar at 50, and a mobile menu button at 110 hopping over a sticky header at
100. Each number was correct in isolation; together they were unreadable.

Nineteen breakpoints is nineteen layouts, and nobody has ever seen all of them.

### P1 — component duplication

Same idea, independent implementations:

- **Tabs — 4×**: `.tab` in `MeasurePerformanceSection.css` *and*
  `MeasureDetail.css`, plus `.dom-tab` and `.detail-tabs .tab`.
- **Pills — 6×**: `.pill` (twice), `.md-pill-*`, `.ov2-pill`, `.cac-pill`,
  `.oa-tag`.
- **Tables — 5×**: `.cac-table`, `.provider-table`, `.md-table`,
  `.detail-table`, `.ov2-table` — each with its own header size and cell
  padding.
- **Form fields — 3×**: `.cac-form-group`, `.login-field`,
  `.provider-login-field`.
- **Segmented controls — 2×**: `.ov2-lenses` and `.ov2-views`, 0.5px apart in
  font size and 1px apart in padding.

### P2 — hard-coded values

51 distinct raw hex values in component CSS despite the token layer. The
meaningful ones:

- `#F8FAFC` (×20) — a *warm-neutral* slate that does not exist in the cool
  palette. Used for disabled field backgrounds and progress tracks.
- `#9CA3AF`, `#E5E7EB`, `#6B7280` in `App.css` — leftover Tailwind greys on
  `.nav-item`, `.user-name`, `.user-role`.
- `#F43F5E` → `#F59E0B` → `#22C55E` gradient on `.progress-fill`. Three hues,
  none of them in the palette, on a bar whose whole job is to encode one rate
  against one goal.
- `#8b5cf6`, `#ede9fe`, `#fed7aa`, `#dbeafe`, `#dcfce7` — an unlabelled second
  accent set in the v2 pages.

### P2 — icons

46 hand-inlined SVGs across 17 files, no shared set. All on a `0 0 24 24`
viewBox with `strokeWidth="2"`, rendered at 8 different sizes — so a 14px icon
carries a 1.17px stroke and reads lighter than the 20px icon beside it on the
same row. Four visually distinct chevrons coexist.

### P3 — documentation debt

~40 root-level `*.md` files (≈300KB), largely superseded change logs from
earlier redesigns: `MODAL_FIX_SUMMARY.md`, `MEASURE_SELECTION_FIX.md`,
`SYNTAX_ERROR_FIX.md`, and so on. Their functional and API content is still
useful; their styling guidance is now contradicted by this system.

---

## Scorecard

| Dimension | Before | Notes |
|---|---|---|
| Token adoption (colour) | **A−** | genuinely good, a few raw-hex leaks |
| Token architecture | **C** | single flat tier, no brand layer |
| Type system | **D** | 29 sizes, 6 weights |
| Spacing | **B−** | consistent instincts, no closed scale |
| Colour semantics | **A** | the strongest thing in the codebase |
| Contrast | **D** | 4 measured AA failures on core tokens |
| Iconography | **D** | no set, no scale, below the floor |
| Component reuse | **C−** | 4 tab systems, 6 pill systems, 5 tables |
| Accessibility (structure) | **B** | good roles, good live regions |
| Accessibility (contrast) | **D** | see above |
| Responsive | **C** | works, but 19 breakpoints |
| Documentation | **C+** | excellent inline comments, chaotic files |
| Governance | **F** | none — no rules, no enforcement, no owner |

**Overall: C+.** A codebase with unusually good instincts and no system to hold
them. The instincts are why this design system could be *documented* rather
than *invented* — most of Tier 2 is a formalisation of decisions someone had
already made and written down in a CSS comment.

---

## Targets

| Metric | Baseline | Target | Phase |
|---|---|---|---|
| WCAG AA failures on semantic pairs | 4 | 0 | 0 |
| Distinct font sizes | 29 | 13 | 3c |
| Distinct breakpoints | 19 | 6 | 3b |
| Distinct z-index values | 16 | 13 (scale) | 3a |
| Raw hex in product CSS | 51 | 0 | 4 |
| Icons below 16px | ~20 | 0 | 3d |
| Tab implementations | 4 | 1 | 4 |
| Table implementations | 5 | 1 | 4 |
| Legacy `--c-*` references | ~900 | 0 | 5 |
