# Component library

Every component in the house, what it is for, and — more usefully — what it is
**not** for. Each entry states its anatomy, its variants, its accessibility
contract, and the mistakes it exists to prevent.

Components marked **CSS** ship as classes in `base/primitives.css`. Components
marked **React** need state, focus management or ARIA wiring and ship as
components.

---

## Action

### Button · CSS

Composition: `.lds-btn` + one variant + optional size + optional `--icon`.

| Variant | Fill | Use | Budget |
|---|---|---|---|
| `--primary` | brand solid | the single next action | **1 per view** |
| `--tonal` | brand tint | a repeated action inside rows | unlimited |
| `--assign` | indigo tint | the assign verb, anywhere | unlimited |
| `--secondary` | white + border | cancel, back, alternate path | unlimited |
| `--ghost` | transparent | tertiary, toolbar, dismiss | unlimited |
| `--danger` | white + red border | destructive **trigger** | 1 per group |

Sizes: default 38px · `--sm` 30px · `--lg` 42px. Buttons and fields share
`--lds-control-height` so a filter row aligns without per-page nudging.

**Rules**

- Always a rounded rectangle. Never `border-radius: full` on a button.
- `--assign` has no tonal sibling on purpose. A second assign style defeats the
  point of having a verb hue at all.
- A solid red fill belongs to the *confirmation*, never the trigger.
- Icon-only buttons require `aria-label`. No exceptions.
- Disabled buttons need an adjacent explanation (`.lds-modal__hint`), or they
  read as broken.

**Don't**

```jsx
// ✗ status colour filling an action — now green means two things
<button style={{background: 'var(--lds-status-above-accent)'}}>Save</button>

// ✗ hand-rolled height and radius
<button style={{height: 36, borderRadius: 999}}>Assign</button>
```

---

### Assign button — a note on why it exists

"Assign" is the one workflow verb that repeats on every surface in the product:
the measure card, the provider row, the stratum read, the member row, and the
assign panel's own submit. It gets a dedicated hue so it is recognisable
*before* the label is read.

The hue is deliberately desaturated. A bright violet was tried first and read
as a different product bolted onto the page — on a calm slate canvas the assign
button has to be **distinguishable**, not loud.

It sits next to the At-Goal blue in hue space, which is precisely why that blue
is only ever spent on small dots and pills and never on a button fill.

---

## Status & metadata

### Status badge · React

`<StatusBadge status="Above Goal" size="sm" />`

Anatomy: pill · 6px dot · label. **Three carriers of the same meaning** — hue,
shape, text — so it survives colour-blindness, greyscale printing, and Windows
high-contrast mode.

States: `above` · `at` · `below` · `caution` · `neutral`.

Never render the dot without the label. Never render the label in a colour
without the dot.

### Lifecycle chip · CSS

`unassigned` · `assigned` · `in progress` · `action taken` · `closed`.

Describes where the *work* is, not how the measure scored. Assigned borrows the
workflow indigo so the verb and its result read as one thing — and is
pointedly **not** green, because assigning is a promise and green is an outcome.

### Filter pill · CSS

Full radius, `aria-pressed`. When active, it takes the tint of whatever it
filters *to* — a below-goal filter goes red — so the filter and the result
speak the same language.

---

## Input

### Field · CSS

`.lds-field` wraps a label, a control, and help/error text as one unit.

- Label above, always. Placeholder-as-label vanishes the moment the user types
  — exactly when they need it.
- Help text and errors sit **below** the field, never in the placeholder.
- Required marker is a red asterisk on the label, plus `required` on the input.
- Field radius is `sm`, one step tighter than a button: a field is a container,
  a button is an object.
- Errors need `aria-describedby` pointing at the error node and
  `aria-invalid="true"`. Colour alone is not an error message.

### Select · React (`CustomSelect`)

A `<button role="combobox">` opening a `role="listbox"` of `role="option"`
buttons — keyboard- and screen-reader-reachable, unlike a styled `<div>`.

Use the native `<select>` (`.lds-select`) for simple, short, high-frequency
choices like a month filter; the custom one when options need formatting,
grouping, or a rate badge.

### Search · CSS

An `.lds-input` with a leading icon and `type="search"`. Debounce at 250ms.
Always pair with a visible result count — a search that silently returns
nothing is indistinguishable from a search that broke.

---

## Containers

### Card · CSS

`--lds-radius-600`, 1px border, `--lds-elevation-card`. The border and the
shadow *both* do separation work because the page ground is white.

`.lds-card--flush` removes padding and clips children — for cards whose content
is a table.

### KPI card · CSS

A card with a 3px status rule inset from the corners (`--lds-card-rule-inset`).
Inset rather than full-bleed because a full-bleed rule fights the xl radius.

A KPI that is *also* a filter (e.g. "Unassigned") must be a real `<button>`,
must say so in a hint line, and must show its active state — an interactive
number that looks like a static number is a trap.

### Table · CSS

- Header: sunken background, 11px uppercase `fg-muted`, sticky where the table
  is long.
- Rows: 44px minimum (cell padding is 13px, not 12px, precisely to hold that
  pointer-target floor).
- Numeric columns right-align with tabular numerals. Always.
- Sortable headers are real `<button>`s inside the `<th>`, with `aria-sort` on
  the `<th>`. The idle caret is rendered at reduced opacity so the column width
  does not shift when sort moves.
- Interactive rows get `role="button"`, `tabIndex={0}`, and Enter/Space
  handling — plus a real focus style (`--lds-focus-ring-inset`).
- Below `--lds-table-min-width-scroll` (640px) the wrapper scrolls
  horizontally rather than the columns collapsing.

---

## Navigation

### Sidebar · React

232px expanded, 80px rail below 1024px, overlay drawer below 768px. Active item
takes the brand tint plus a 3px left marker; the marker hides in rail mode
because the tint alone is unambiguous at that width.

### Breadcrumb · React

Uppercase 11px micro-type. A crumb that can **switch** its sibling (jump to a
different provider at the same level) carries a chevron and opens a menu; a
plain crumb never does.

### Tabs — two shapes, two jobs

| Shape | Job | ARIA |
|---|---|---|
| **Underline** | navigate *between* views (page-level, persistent) | `role="tablist"` / `role="tab"` / `role="tabpanel"` |
| **Segmented** | switch a *lens* on the current view (card-level) | `role="tablist"` or `aria-pressed` group |

They are not interchangeable. Using a segmented control for page navigation
tells the user the change is local when it is not.

Both need arrow-key roving focus.

---

## Overlays

### Modal · React

Widths: `sm` 460px (one decision, ≤4 fields) · `md` 620px (grouped form) ·
`lg` 1160px (form plus a docked roster — the assign panel).

**Contract**

- `role="dialog"` `aria-modal="true"` `aria-labelledby` pointing at the title.
- Focus moves into the dialog on open and returns to the trigger on close.
- Focus is trapped while open. Escape closes. The scrim closes on click **only
  when nothing is unsaved**.
- The `--lds-modal__body` scrolls, not the dialog. `min-height: 0` on the body
  is load-bearing: without it the dialog overflows its `max-height` and the
  centring scrim clips the pinned header off the top of the viewport.
- Never gutter-0. A modal flush to the viewport edge has no dismiss affordance
  on touch.

### Drawer / side panel · React

420px docked panel. Same focus contract as a modal.

### Menu / dropdown · React

`--lds-radius-500`, `--lds-elevation-overlay`, 240px max height. Options are
`<button role="option">`. Arrow keys move, Enter selects, Escape closes and
returns focus to the trigger. Close on outside click *and* on scroll of the
underlying container.

### Toast · React (`ToastProvider`)

One app-wide provider. Bottom-right, stacked, 380px max, 6s auto-dismiss —
long enough to read twelve words twice.

**Error toasts do not auto-dismiss.** Success toasts live in
`role="status"` (polite); errors live in `role="alert"` (assertive).

A toast is never the only place a result appears. If the user needs the
information after six seconds, it belongs on the page.

### Tooltip · React

Supplementary **only**. Never the sole carrier of a label, a requirement, or an
error — tooltips are unreachable by touch and by several assistive paths.
Trigger on hover *and* focus. 260px max.

---

## Feedback & state

Every data surface ships **four** states, not one. A component that only has a
success state is not finished.

| State | Component | Rule |
|---|---|---|
| Loading | `.lds-skeleton` | mirror the real layout's shape, not a spinner |
| Empty | `.lds-state` | say what would appear here and how to make it appear |
| Error | `.lds-state--error` | say what failed and offer a retry |
| Sample data | `.lds-notice` | **amber, always announced, with retry** |

> **Never silently fake numbers.** Sample-data fallbacks keep every view
> demonstrable, but they announce themselves. A wrong number that looks
> confident is worse than no number — see [principle 1](00-principles.md).

### Progress / rate bar · CSS

Flat status-coloured fill on a neutral track, with a hairline goal marker.

**Not** a red→amber→green gradient. A gradient implies the whole bar is a scale
and makes the same rate read differently depending on where the goal sits —
which is exactly backwards for a measure whose goal varies by contract.

---

## Data visualisation

- A chart encoding **performance** uses the status palette. Non-negotiable.
- A chart encoding **categories** uses `--lds-viz-1…8`, in order. The sequence
  is tuned for maximum separation at the first three, which is what most series
  counts actually are. Do not reorder it to look nicer.
- Every chart needs a non-visual equivalent: a data table, an accessible
  summary, or both.
- Direct-label series where possible; a legend is a lookup task.
- Bubble fields have a legibility budget. Past it, offer a table view — and
  make the toggle visible, because the table is the way *out* of the limit.
