# Adoption & migration

The QualityPulse codebase is ~7,600 lines of CSS across 32 files, already
tokenised against a good but flat single-tier palette (`--c-*`, `--r-*`,
`--sh-*`). That is a strong starting position: most of the work is renaming and
tightening, not rewriting.

Five phases. Each ships independently and each leaves the app working.

---

## Phase 0 · Land the system — *no visual change beyond the contrast fixes*

**One import.**

```js
// src/index.js
import '../design-system/index.css';
```

`compat.css` re-points every `--c-*`, `--r-*`, `--sh-*` and `--pv-*` name at
its LDS equivalent, so all 32 existing CSS files keep working untouched.

`src/index.css` keeps only what is genuinely app-specific; its `:root` block
and its `.btn` / `.eyebrow` / `.num` / `.mono` rules are now duplicates and
should be deleted in the same PR.

**What visibly changes**

The four contrast fixes, and only those:

| Where | Change |
|---|---|
| Every primary button, active nav item, eyebrow, link | teal `#0e8a8c` → `#0d8082` |
| Above-Goal chip and any green text | `#0a8a5f` → `#087a54` |
| Caution/unassigned text, preview tag | `#9a6a16` → `#8a5e12` |
| Every muted caption, label, meta line | `#6b7785` → `#66717f` |

All four are darkenings of 2–4%. They are deliberate; see
[accessibility](05-accessibility.md).

**Risk:** low. **Rollback:** remove the import.

---

## Phase 1 · Retire the duplicate primitives

Delete from `src/index.css`: the `:root` token block, `.btn` and all variants,
`.eyebrow`, `.num`, `.mono`, the reset, the scrollbar rules, the global focus
ring, the reduced-motion block. Every one of them now lives in
`design-system/base/`.

Codemod the class names:

```bash
npx jscodeshift -t design-system/codemods/rename-primitives.js src/
```

| Old | New |
|---|---|
| `.btn` `.btn-primary` `.btn-sm` `.btn-icon` … | `.lds-btn` `.lds-btn--primary` `.lds-btn--sm` `.lds-btn--icon` |
| `.eyebrow` | `.lds-eyebrow` |
| `.num` `.mono` | `.lds-num` `.lds-mono` |
| `.status-badge2` `.sb-*` | `.lds-chip` `.lds-chip--*` |

That is 45 `.btn` + 128 `.num` + 37 `.mono` + 19 `.eyebrow` call sites — all
mechanical.

**Risk:** low. **Rollback:** revert the codemod commit.

---

## Phase 2 · Move the Provider Portal onto the brand layer

`ProviderShell.css` declares `--pv-primary` and four siblings inside
`.provider-portal`. Replace that block with the brand attribute:

```jsx
<div className="provider-portal" data-lds-brand="provider-portal">
```

Then delete the local `--pv-*` declarations. `compat.css` keeps the ~14 existing
`var(--pv-*)` call sites working until they are renamed.

**This is the phase that proves the house-of-brands architecture works.** After
it, switching the provider portal's identity is a six-line change in one file.

**Risk:** low, scoped to one app. **Rollback:** restore the local block.

---

## Phase 3 · Normalise the scales — *visible, and worth it*

The four drift classes, in ascending order of visual impact.

### 3a · Z-index (invisible)

16 values → the 13-step scale. Purely a correctness fix: the nav scrim at 49
sits one below its own sidebar at 50, and the mobile menu button at 110 hops
over a sticky header at 100.

### 3b · Breakpoints (low impact)

19 max-widths → six. Round each to the nearest scale step; re-test the three
grid-collapse points (`cac-kpis`, `ov2-body`, `apx-shell`).

### 3c · Type scale (moderate)

29 sizes → 13. The half-pixel sizes are the bulk of it:

```
9.5 → 10    10.5 → 11    11.5 → 12    12.5 → 13    13.5 → 14    14.5 → 15
17 → 16     19 → 20      21 → 22      24 → 22      25 → 26      28 → 30
32 → 30     34 → 36      40 → 36
```

Also: 16 declarations at `font-weight: 300` → 400, and one at 800 → 700.
Weight 300 in Hanken Grotesk at 11px is genuinely hard to read.

### 3d · Icons (most visible)

14px and 15px → **16px**; 17px and 18px → **20px**. 46 inline SVGs across 17
files. Do this last, and screenshot-diff the toolbar rows — the icons will look
a little heavier, which is the correction.

**Risk:** moderate. Ship 3a–3b together, then 3c, then 3d. Screenshot-diff
each.

---

## Phase 4 · Consolidate duplicated components

The codebase contains several independent implementations of the same idea.
Each replacement is one PR.

| Duplicates | Replace with |
|---|---|
| `.tab` (×2 files), `.dom-tab`, `.detail-tabs .tab` | underline tab component |
| `.ov2-lenses`, `.ov2-views` | `.lds-segmented` |
| `.pill` (×2 files), `.md-pill-*`, `.ov2-pill`, `.cac-pill`, `.oa-tag` | `.lds-chip` / `.lds-pill` |
| `.cac-modal-*`, `.apx-*` shells | `.lds-modal` |
| `.cac-table`, `.provider-table`, `.md-table`, `.detail-table`, `.ov2-table` | `.lds-table` |
| `.cac-form-group`, `.login-field`, `.provider-login-field` | `.lds-field` |
| `.custom-select-dropdown`, `.sc2-crumb-pop` | `.lds-menu` |

Also worth fixing here: `MeasureDetail.css` hard-codes a red→amber→green
gradient progress fill. Replace with a flat status fill — see
[components §Progress](03-components.md).

**Risk:** moderate per component, low overall because each is independently
revertible.

---

## Phase 5 · Turn on enforcement

Enable the lint rules from [governance §5](06-governance.md) and set
`ds:usage` thresholds:

- token adoption ≥ 95%
- legacy `--c-*` / `--pv-*` references = 0
- off-scale font-size / z-index / breakpoint = 0

When legacy references hit zero, delete `compat.css`. That is the moment the
migration is actually finished — not before, no matter how good the numbers
look.

---

## Sequencing

```
Phase 0 ──┐
Phase 1 ──┤ mechanical, low risk, ship together
Phase 2 ──┘
Phase 3a+3b ─── invisible / low
Phase 3c ────── typography sweep, screenshot-diff
Phase 3d ────── icon sweep, screenshot-diff
Phase 4 ─────── one component per PR, any order
Phase 5 ─────── once Phase 4 is done
```

Phase 4 does not block Phase 5 for rules that already pass. Turn on each lint
rule the moment its violations reach zero — a rule that is "coming soon" is a
rule nobody follows.

---

## What this migration will not fix

Stated plainly so nobody expects it to:

- **The `qualitypulse_complete.html` static file** is outside the build and
  outside the system. Either delete it or accept that it drifts.
- **The ~40 root-level `*.md` design docs** are a historical record, not
  specification. This system supersedes the styling guidance in them; the
  functional and API documentation in them still stands.
- **Layout architecture.** The system standardises tokens and components, not
  page composition. `MeasureDetail.css` at 1,298 lines and
  `OverviewExplore.css` at 831 lines will still be long after this work; they
  are long because those pages are complex, and that is a separate problem.
