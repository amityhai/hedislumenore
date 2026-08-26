# Accessibility

**Target: WCAG 2.2 Level AA**, with AAA on body text where the palette allows.

This is not a compliance checkbox. These are six-hour-a-day screens in a
regulated setting, read by people who will still be reading them at 4pm on a
laptop in a bright room. Every rule below has a cost attached to breaking it
that is measured in misread rates.

---

## Contrast

### Measured ratios

All values computed against the shipping tokens.

| Pair | Ratio | AA text | Note |
|---|---|---|---|
| `fg-default` on canvas | **16.32** | ✅ AAA | |
| `fg-subtle` on canvas | **14.61** | ✅ AAA | |
| `fg-muted` on canvas | **4.96** | ✅ | |
| `fg-muted` on sunken | **4.66** | ✅ | the binding case |
| `fg-faint` on canvas | **4.96** | ✅ | legacy alias of `fg-muted` |
| white on `brand-base` (teal) | **4.74** | ✅ | primary button label |
| white on `brand-base` (blue) | **4.61** | ✅ | provider primary |
| `brand-strong` on `brand-subtle` | 5.31 | ✅ | tonal button |
| `status-below-fg` on its tint | **5.09** | ✅ | |
| `status-at-fg` on its tint | **5.08** | ✅ | |
| `status-above-fg` on its tint | **4.70** | ✅ | |
| `status-caution-fg` on its tint | **4.98** | ✅ | |
| `workflow-assign-fg` on its tint | **8.55** | ✅ AAA | |

### Four failures this system fixed

These were live in the pre-system palette and are corrected in Tier 1. Each is
a visible change and each is deliberate.

| Token | Was | Ratio | Now | Ratio |
|---|---|---|---|---|
| brand primary (teal) | `#0e8a8c` | 4.17 ❌ | `#0d8082` | 4.74 ✅ |
| above-goal text | `#0a8a5f` | 3.83 ❌ | `#087a54` | 4.70 ✅ |
| caution text | `#9a6a16` | 4.13 ❌ | `#8a5e12` | 4.98 ✅ |
| muted text | `#6b7785` | 4.28 ❌ * | `#66717f` | 4.66 ✅ |

\* on the sunken surface — which is where captions, table heads and hero-block
meta actually live.

The teal one mattered most: **every primary button in the product had a white
label at 4.17:1**, under AA at 14px/600. It is the most-pressed control in the
app and it was the least legible thing on the page.

The green one mattered second: the *only* good-news status was the *only* one
failing. Below-goal and At-goal both passed. A user with reduced contrast
sensitivity could read every problem and not the successes.

### Light neutrals are non-text only

The lighter neutral steps remain appropriate for **non-text** contrast (icons,
control boundaries, focus indicators). Readable text uses `fg-muted`; the
legacy `fg-faint` alias now resolves to that same AA-capable slate.

- ✅ icons, dividers, chevrons, placeholders, disabled controls
- ❌ column heads, KPI labels, axis labels, help text, captions, meta lines

Routing readable text through `fg-faint` was the single most common contrast
failure in the codebase before the system. Column heads and KPI labels now take
`fg-muted`.

### Rules

- Body text ≥ 4.5:1. Large text (≥18.66px bold or ≥24px) ≥ 3:1.
- Non-text UI — control borders, icons, focus rings, chart marks ≥ 3:1.
- **Buttons are not large text.** A 14px/600 label needs 4.5:1.
- Disabled controls are exempt from contrast minimums, and that is exactly why
  a disabled control must never be the only place information appears.

---

## Colour is never alone

Status is carried by **three** signals simultaneously: hue, shape, and text.

```jsx
<span className="lds-chip lds-chip--above">
  <span className="lds-chip__dot" aria-hidden="true" />
  Above Goal
</span>
```

Deuteranopia makes the below/above pair (red/green) the hardest in the palette.
The dot and the label mean the badge survives it — and survives greyscale
printing, which quality reports still get.

Charts follow the same rule: never encode a series by colour alone. Direct
labels, distinct marks, or a pattern in addition to hue.

---

## Keyboard

Every interactive element is reachable and operable by keyboard. No exceptions,
including bubble fields and data marks.

| Pattern | Keys |
|---|---|
| Buttons, links | Tab · Enter/Space |
| Tabs | Tab to the list, ← → within it, Home/End |
| Menu / select | Enter or ↓ opens · ↑↓ moves · Enter selects · Esc closes |
| Modal | focus trapped · Esc closes · focus returns to trigger |
| Table rows (interactive) | Tab · Enter/Space activates |
| Sortable header | Enter/Space toggles, `aria-sort` announces |

**Focus order follows visual order.** Do not reorder with CSS in a way that
breaks it; if the DOM order is wrong, fix the DOM.

### Focus visibility

One ring for the whole house:

```css
box-shadow: 0 0 0 3px rgb(var(--lds-brand-rgb) / 0.18);
```

`box-shadow`, not `outline`, so the ring inherits each element's own
`border-radius` for free. Forcing a radius on the ring squared off round pills
and bubbles on keyboard focus — do not "fix" that by adding one back.

**There is no `outline: none` in this system without a replacement.** The
`:focus-visible` selector already suppresses the ring for mouse clicks.

### Skip link

`.lds-skip-link` is the first focusable element on every page and jumps to
`#main`. Non-negotiable on a product with a 12-item sidebar in front of the
content.

---

## Screen readers

### Semantic HTML first

An ARIA role is a repair, not a design. `<button>` before
`div role="button"`; `<table>` before `div role="table"`; `<nav>`, `<main>`,
`<h1>`–`<h3>` in a real hierarchy.

Current app usage — `role="tab"` ×8, `role="dialog"` ×7, `role="status"` ×5,
`role="option"`, `role="listbox"`, `role="tablist"` — is broadly correct and
should stay that way.

### Live regions

| Change | Region |
|---|---|
| Filter/sort result count | `role="status"` (polite) |
| Success toast | `role="status"` (polite) |
| Error toast, validation failure | `role="alert"` (assertive) |
| Async load completing | `aria-busy` on the container |

Never fire an assertive announcement for routine success — it interrupts.

### Names

- Icon-only controls: `aria-label` naming the **action**.
- Decorative SVG: `aria-hidden="true"`.
- Truncated text: pair `.lds-truncate` with a `title` or full accessible name.
  An ellipsis that hides the only copy of a member's name is data loss.
- Every field has a `<label>`, programmatically associated. A placeholder is
  not a label.
- Errors: `aria-invalid="true"` plus `aria-describedby` pointing at the message.

---

## Motion

`prefers-reduced-motion: reduce` reduces to **effectively none** —
`0.01ms` durations, one iteration, `scroll-behavior: auto`.

For a vestibular-sensitive user, a 400ms panel slide repeated two hundred times
in a working day is not a delight; it is a working condition. Nothing in this
product depends on motion to convey meaning, so there is nothing lost.

---

## Targets & zoom

- Pointer targets ≥ 44×44px, or ≥ 24×24px with adequate spacing (WCAG 2.2
  §2.5.8). Table cell padding is 13px specifically to hold a 44px row.
- The layout survives **200% zoom** and a 320px viewport without horizontal
  page scroll. Wide tables scroll **inside their own container**; the page body
  never scrolls sideways.
- No content is lost or functionality blocked at 400% zoom.

---

## Forced colors

Windows High Contrast strips background fills. Anything whose meaning rides on
a tint needs a border to survive it — chips, badges, cards and toasts get one
under `@media (forced-colors: active)`, and focus falls back to
`outline: 2px solid Highlight`.

---

## Testing

**Automated** (blocks the build)
- `axe-core` on every route and every modal open-state
- Contrast check across all semantic pairs — `npm run ds:contrast`
- Lint: no raw hex, no off-scale `font-size`, no bare `z-index`

**Manual** (per release)
- Full keyboard pass, no mouse, on the two primary flows
- VoiceOver (Safari) + NVDA (Firefox) on Overview and Care Action Center
- 200% zoom at 1280px, and 320px width
- Greyscale screenshot — every status still readable?
- Deuteranopia simulation on the bubble field and every chart

**Not automatable, so it goes on the checklist**
- Does the focus order match the reading order?
- Is every error recoverable without losing entered data?
- Does anything depend on hover?
