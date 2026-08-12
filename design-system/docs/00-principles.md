# Principles

Six rules. They are ordered — when two conflict, the earlier one wins. Every
component decision in this system can be traced back to one of them, and any
proposal that contradicts one needs to argue against the principle, not against
the component.

---

## 1. The number is the product

These are clinical-compliance screens. A quality-improvement manager acts on a
rate, a denominator, a gap count. If a user has to squint at a figure, doubt a
figure, or re-derive a figure from two places on the page, the interface has
failed regardless of how it looks.

**What this obliges**

- Tabular lining numerals on **every** tabulated figure. Proportional digits
  make a column of rates unscannable and make a value appear to jump when it
  refreshes.
- Numeric columns right-align. Always.
- Never render a number without its denominator, its period, or its unit
  somewhere in the same visual group.
- **Never silently substitute sample data.** A fallback must announce itself in
  an amber notice with a retry. A wrong number that looks confident is worse
  than no number.

---

## 2. Colour is a vocabulary, not a decoration

The palette carries four separate, non-overlapping languages. Mixing them is
the single most damaging thing anyone can do to this system, because the whole
value of a status colour is that it means one thing.

| Language | Hue | Says |
|---|---|---|
| **Action** | brand (teal / blue per brand) | "Press this. Go here." |
| **Workflow** | indigo | "Assign" — the one verb that repeats everywhere |
| **Status** | red · blue · green · amber | below / at / above goal, caution |
| **Feedback** | same four hues, different components | "your save worked" |

**Hard rules**

- A status colour never fills an action. The moment green fills a button, the
  user loses the ability to tell a **result** from a **control**.
- Brand never tints a status chip.
- "Assigned" is not green. Assigning is a promise; green is an outcome.
- Status is *never* carried by hue alone — always hue **plus** a dot, a glyph,
  and a text label. See [accessibility](05-accessibility.md).

---

## 3. Shape carries meaning

Before a label is read, a control's silhouette already told the user what kind
of thing it is.

- **A button DOES something** → rounded rectangle, always. `--lds-radius-400`,
  stepping to `sm` when the box shrinks so the corner stays optically equal.
- **A pill FILTERS or DESCRIBES** → full radius, always. Status chips, filter
  pills, segmented tabs, badges.
- **A card CONTAINS** → `--lds-radius-600`, the widest in the system, and the
  only place `xl` is legal.

Never round a button. Never square a chip. If you find yourself wanting to,
the component is doing two jobs and needs splitting.

---

## 4. Every affordance is visible at rest

No hover-only reveals. Not one.

These are long sessions on dense screens, frequently driven by keyboard, often
on a trackpad, sometimes on a tablet. An action that only exists on hover does
not exist for a touch user, a keyboard user, or a user scanning for what they
can do next.

If a row has an action, the action is on the row — at rest, at full opacity.
If that makes the row noisy, the action doesn't belong on the row.

---

## 5. One next action per view

Primary buttons are rare and expensive. A screen with four primary buttons has
told the user nothing about what to do.

- Exactly one `--primary` per view, where a clear next step exists.
- A repeated action down a list is `--tonal` or `--assign`, never `--primary` —
  a wall of solid brand fill shouts and stops meaning "the important one".
- Everything else is `--secondary` or `--ghost`.
- Destructive triggers are `--danger` (text-red on a light shell). A solid red
  fill is reserved for the confirmation step.

---

## 6. Extend the system, never the component

The instant you write a raw hex, a bare `font-size`, or a hand-rolled button
height in a component file, the system has a hole in it and the next person
inherits the hole.

- No hard-coded colour values in product CSS. Ever.
- No `font-size` outside the 13-step scale.
- No `z-index` outside `--lds-z-*`.
- No `@media` breakpoint outside the six in `--lds-breakpoint-*`.
- If the system genuinely lacks what you need, the fix is a token or a variant
  in `design-system/`, submitted through [governance](06-governance.md) — not a
  one-off in your page.

---

## How these apply across the house

QualityPulse and the Provider Portal are different **brands**, not different
**systems**. A brand may change six colour hooks (see
[`brands/_template.css`](../brands/_template.css)) and nothing else.

A brand may **not** redefine what "below goal" looks like, how tall a control
is, what a button's silhouette means, or which of the four colour languages a
component speaks. Those are house law, because a plan's performance data has to
mean the same thing in every product that displays it — that consistency *is*
the trustworthiness of the numbers.
