# Iconography

Source of truth: **Lumenore PLG Components → Style Guide → Iconography**
([Figma](https://www.figma.com/design/GzPTpU4pd6Kif0x0sHgcyr/PLG---Components?node-id=4097-23670)).
Base library: **Material Icons**, redrawn to the Lumenore keyline.

> "Balance, clarity, and inclusivity serve as the cornerstones of our icon
> collection. From navigation to components to standalone use, the icons are
> everywhere."

---

## The keyline

Every icon is drawn on a **24px icon area** with a **20px live area** and a 2px
padding ring. Content must stay inside the live area — that is the region
unlikely to be optically obstructed when the icon sits next to a label or
inside a control.

```
┌──────────────────────────┐  24 × 24   icon area  (the box you place)
│  ┌────────────────────┐  │
│  │                    │  │  20 × 20   live area  (where the glyph lives)
│  │        glyph       │  │
│  │                    │  │   2px      padding ring — never draw into it
│  └────────────────────┘  │
└──────────────────────────┘
```

Stroke weight is **2 on the 24px keyline** and scales with the box — it is a
ratio, not a fixed pixel value. An icon exported at 48px carries a 4px stroke.

---

## Sizes

Scaling icons is not advised. When you must, scale **in 2px increments** and
**never below 16px**.

| Token | Size | Use |
|---|---|---|
| `icon-size-2xs` | 12px | dense table affordances — **only alongside a text label** |
| `icon-size-xs` | 16px | the floor for a standalone icon |
| `icon-size-sm` | 20px | inline with body text, inside `btn--sm` |
| `icon-size-md` | 24px | **default** — nav items, toolbar actions, `btn` |
| `icon-size-lg` | 40px | empty-state and section illustration |
| `icon-size-xl` | 48px | hero and onboarding illustration |

### ⚠ Known violation in the current codebase

The QualityPulse app renders inline SVGs at **14px, 15px, 17px and 18px** —
sizes that are both below the 16px floor and off the 2px grid. Every one of
them was drawn on a `0 0 24 24` viewBox with `strokeWidth="2"`, so scaling to
14px yields a 1.17px stroke that hints inconsistently and reads lighter than
its neighbours on the same row.

The remediation is Phase 3 of [adoption](08-adoption-migration.md): 14/15 → 16,
17/18 → 20. This is a visible change and it is a deliberate one.

---

## Colour

| Token | Value | Use |
|---|---|---|
| `icon-default` | `neutral-600` | the resting state of any UI icon |
| `icon-muted` | `fg-faint` | decorative glyphs, chevrons, disabled |
| `icon-brand` | `brand-base` | an icon that IS the brand action |
| `icon-knockout` | white | on any filled action |

Inside a button, chip or nav item, an icon uses `currentColor`
(`.lds-icon--inherit`) so it moves with its container's state automatically.
Hard-coding an icon colour inside an interactive component is the usual cause
of a glyph that stays grey on a hovered dark button.

The Lumenore illustration hues (`--lds-expressive-*`) are for **illustration
only**. A UI icon does not get to be orange.

---

## Semantics

### Universal icons

A small set carries meaning across cultures, and they are reserved for that
meaning only. From the Lumenore universal set: *feedback, help, notification,
support, close, info, print, export, share, alert, add, search, edit, refresh,
check, filter, delete, view, upload, settings, save, star, mail*.

Never repurpose one. A trash can that archives, a star that filters, a check
that means "selected" rather than "done" — each one costs the user a beat, and
these are screens they use for six hours.

### Directional icons

> "The general rule of thumb is to point in the direction you expect to be
> taken. If a consistent pattern is not maintained, trust is diminished."

**Forward navigation always uses the same right-arrow glyph** across the whole
house — measure → provider → stratum → member. A chevron that sometimes means
"drill in" and sometimes means "expand" is two icons wearing one shape.

Chevron-down is for **disclosure only** (a select, a menu, an expandable crumb).
A breadcrumb crumb that can *switch* its sibling carries a chevron; a plain
crumb never does. The chevron is the only thing distinguishing them, so it has
to be spent honestly.

### Category sets

The Lumenore library ships **441 icons** across ten sets — Universal,
Directional, Chart, Files/Document, Schema/Dataset/Dashboard/Table, Text
editor/Sort/Join, Source, Transform, Target. Reach for the existing set before
drawing anything. If a concept genuinely has no icon, that is a request to the
library, not a one-off SVG in your component.

---

## Accessibility

Two cases, and the wrong one is a bug:

**Decorative** — the icon repeats a label that is already visible.

```jsx
<button className="lds-btn lds-btn--primary">
  <Icon name="add" className="lds-icon lds-icon--inherit" aria-hidden="true" />
  Assign members
</button>
```

**Meaningful** — the icon *is* the label.

```jsx
<button className="lds-btn lds-btn--secondary lds-btn--icon lds-btn--sm"
        aria-label="Next page">
  <Icon name="chevron-right" className="lds-icon lds-icon--sm" aria-hidden="true" />
</button>
```

The SVG is `aria-hidden` in both cases. What differs is whether the *button*
carries an accessible name. An icon-only control without `aria-label` is
announced as "button" and is unusable.

**An icon is never the sole carrier of status.** Status is hue **plus** shape
**plus** text. See [accessibility](05-accessibility.md).

---

## Implementation

Ship icons as a single sprite or a generated React set from the Figma library —
not as hand-inlined SVG per component. The current codebase has 46 hand-rolled
inline SVGs across 17 files, which is why four different chevrons and three
different arrow weights coexist today.

```jsx
// ✓
<Icon name="filter" size="md" />

// ✗ — a new glyph nobody else can find, at a size that isn't on the scale
<svg width="15" height="15" viewBox="0 0 24 24" strokeWidth="2">…</svg>
```
