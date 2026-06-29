# QualityPulse — Redesign Plan & Design System

> **Scope:** keep the data layer (`workflowService.js`, `tokenService.js`, and all table data shapes). Rebuild everything visual: design language, flow, color, typography, and — critically — **state feedback and closed loops** (loading / empty / error / success).
>
> **North-star principle:** organize the product around its core loop — **see the gap → understand it → act → confirm it closed** — and make that loop continuous and visible.

---

## Design principles

1. **Clarity over decoration.** The data is the visual interest; the chrome stays quiet.
2. **Every async surface has four states** — loading (skeleton), empty (distinct, friendly), error (inline + retry), success (visible confirmation). Never a silent failure, never a forever-"Loading…".
3. **Status is the product.** Above / At / Below goal must be unmistakable, accessible, and never conveyed by color alone (icon + label + color).
4. **Don't lose context.** Drill-downs and navigation preserve where the user was.
5. **Minimal, modern, calm.** Generous whitespace, one accent, restrained motion.

---

## Design system

### Typography — Inter

- **UI font:** `Inter` (weights 400/500/600/700). No serif.
- **Numbers:** `font-variant-numeric: tabular-nums` everywhere figures are tabulated, so columns align. (`.num` utility class.)
- **Type scale:** 12 · 13 · 14 · 16 · 20 · 24 · 30 px. One scale, used consistently.
- Tracking slightly tight on headings (`-0.02em`), normal on body.

### Color tokens

Brand is intentionally **distinct from every semantic status color** so "this is an action" never reads as "this is a status."

| Role | Token | Value | Use |
|------|-------|-------|-----|
| Brand / primary | `--c-primary` | Indigo `#4F46E5` | actions, links, active nav |
| Above goal | `--c-success` | Emerald `#16A34A` | good / on-track |
| At goal | `--c-info` | Sky `#0284C7` | neutral-positive |
| Below goal / critical | `--c-error` | Rose `#E11D48` | needs attention |
| Warning | `--c-warn` | Amber `#D97706` | caution / expiring |
| Canvas | `--c-bg` | `#FFFFFF` / `#FAFAFA` | page / subtle fills |
| Borders | `--c-border(-light)` | `#CBD5E1` / `#E2E8F0` | dividers, card edges |
| Text | `--c-text..text-4` | `#111827` → `#4B5563` | ink ramp |

Each status also has `-bg` and `-text` variants for soft pills. All pairings target **WCAG AA**.

### Spacing, radius, motion

- **Spacing:** 8px grid (4 / 8 / 12 / 16 / 20 / 24 / 32 / 36).
- **Radius:** `--r-xs..xl` (6 → 20px); cards use `--r-lg`/`--r-xl`.
- **Shadows:** `--sh-xs..xl`, soft and layered — one resting shadow per card, slightly raised on hover.
- **Motion:** 150–200ms ease; used for feedback, not flourish. Honors `prefers-reduced-motion`.

### Shared primitives (`src/components/ui/`)

- `StatusBadge` — status pill with shape-icon + label (colorblind-safe).
- `Skeleton` / `SkeletonText` — shimmer placeholders for loading.
- `EmptyState` — icon + title + hint + optional action.
- `ErrorState` — message + **Retry** button.
- `useAsync(fn, deps)` hook (`src/hooks/`) — returns `{ data, loading, error, refetch }`, standardizing the four states across pages.

---

## Batch plan

Each batch leaves the app **runnable**. We move through them one at a time.

| # | Batch | Outcome |
|---|-------|---------|
| **0** | **Foundation** | Inter loaded; tokens refreshed to the new system; `ui/` primitives + `useAsync` added. No page-logic change. |
| **1** | **Dashboard** ✅ *agreed* | Clean KPI cards (colorblind-safe), real loading/empty/error states, restored trend chart, consistent clickable insight cards. |
| **2** | **Measure Detail** | Rebuild detail + performance section; drill-downs preserve context; consistent states. |
| **3** | **Care Action Center** | Rebuild; **wire Save Action** to backend with success/error toasts; make the dead Status/Assigned filters real (or remove). Closes the act loop. |
| **4** | **Shell & routing** | URL routing + deep links; persistent month/context bar; redesigned sidebar; fix Simulate route; surface/hide Provider Scores. |
| **5** | **Cleanup & a11y** | Finish or remove mock pages; remove dead code; accessibility + contrast pass. |

### Definition of done (per batch)

- All four states handled on every async surface.
- Status never color-only.
- Keyboard reachable, visible focus rings, AA contrast.
- No `workflowService` data-shape changes.

---

## Status

- [x] Plan & design system documented (this file)
- [x] Batch 0 — Foundation
- [x] Batch 1 — Dashboard
- [x] Batch 2 — Measure Detail
- [x] Batch 3 — Care Action Center (+ Save loop)
- [x] Batch 4 — Shell & routing
- [x] Batch 5 — Cleanup & a11y

## Direction A · Clarity (adopted from the Claude Design handoff)

The visual system was re-pointed to **Direction A · Clarity** from `HEDIS-handoff.zip`:

- **Fonts:** Hanken Grotesk (UI) + Spline Sans Mono (codes / eyebrow labels) — replaced Inter.
- **Brand:** teal `#0e8a8c` / `#0a6e70`, chip bg `#e6f3f3` — replaced indigo.
- **Status:** above green `#1f9d6b`, at blue `#3f74c9`, below red `#d9544d` (+ soft bg/text).
- **Surfaces:** page `#e9edee`, content `#f6f8f9`, white cards + `#e2e8ea` border, radius 14/18.
- **Light sidebar** with a teal active rail; teal pulse logo mark.
- **Signature patterns:** mono eyebrow labels (`.eyebrow`), KPI **goal micro-bars** + ring-selected cards, table **"Rate vs goal"** column (rate + gap-pts + bar with goal marker), mono code chips, severity-colored insight pills.

All tokens live in `src/index.css`, so every component re-skinned automatically; the Dashboard additionally got the Direction A KPI/table patterns.

## What shipped

- **Foundation:** Inter font; indigo brand distinct from status colors; refreshed tokens; `.num` tabular figures; global focus rings + reduced-motion; `useAsync` hook; `ui/` primitives (`StatusBadge`, `Skeleton`, `EmptyState`, `ErrorState`, `Toast`).
- **Dashboard:** colorblind-safe KPI tabs, skeleton/empty/error states, honest "sample data" banner, restored trend chart, all insight cards clickable.
- **Measure Detail / Performance:** tokenized accents, skeleton loading, error-with-retry.
- **Care Action Center:** Save wired to `saveCareAction` (optimistic row + KPI update, success/error toast); the two dead filters replaced with real Assignment + Staff filters; skeleton/empty/error states.
- **Shell & routing:** hash routing (`#/detail/<id>`) → deep-linkable + refresh-safe; fixed the broken Simulate route; sidebar rebuilt with a real collapse toggle + entries for all five pages.
- **Cleanup/a11y:** legacy colors tokenized app-wide; mock pages tagged "Preview · sample data"; focus states + aria labels.

### Backend follow-ups (one-line swaps)

- Set `WORKFLOW_IDS.CAC_SAVE_ACTION` to the real save workflow id (then `saveCareAction` goes live, no component change).
- Provide a fresh JWT in `App.js` to replace the expired bundled token → live data everywhere.
- Rate Simulator / Provider Scores still run on hardcoded sample data (tagged as Preview) — wire to workflows when available.
