# Foundations

The raw material. Everything on this page is Tier 1 or Tier 2 — see
[the token architecture](#token-architecture) for which tier you are allowed to
touch.

---

## Token architecture

```
  CORE                     BRAND                   SEMANTIC                 COMPONENT
  a position on a scale    16 hooks per product    a purpose                one property of one component

  --lds-teal-600     ──►   --lds-brand-base   ──►  --lds-action-primary-bg ──► --lds-button-primary-bg
  #0d8082                  (per brand)             "the fill of the one          (only when it deviates)
                                                    next action"

  --lds-radius-400   ──►   --lds-brand-radius-300 ─►  --lds-radius-control ──► --lds-button-radius
  10px                     (per brand)                "how round a control is"

  --lds-size-700     ─────────────────────────────►  --lds-size-avatar    ──► --lds-avatar-size
  36px                     (not brand-owned)          "how big a person is"

  ✗ product code           ✗ product code          ✓ PRODUCT CODE            ✓ product code
    may not read             may not read            TARGETS THIS TIER         (override points)
```

**Which tier do I use?**

| I want to… | Use |
|---|---|
| Style anything in a product | **Semantic** |
| Override one property of one shared component | Component |
| Add a new brand | The 16 brand hooks, nothing else |
| Add a new hue, size, or elevation step | Core — and that is a council change |

Reading a core token from product code is a lint error. It bypasses both the
brand layer and the semantic contract: your button stops re-theming and stops
being findable when the meaning changes.

### Why core keys are ordinal, not t-shirt

Core names a **position on a scale** — `--lds-radius-400`, `--lds-size-700` —
and deliberately tells you nothing about where to use it. The old names
(`radius-md`, `font-size-sm`, `border-width-marker`) read like decisions
without being decisions, and that had a cost we actually paid:

- Radius had **no semantic row at all**. Thirteen component tokens aliased
  brand hooks directly, because `brand-radius-md` already sounded like an
  answer. There was no single place that said how round a control is.
- `border-width-marker` and `border-width-ring` were *purposes* — the nav bar
  and the bubble field — sitting in the value tier. A primitive cannot know
  what a nav bar is.
- Scales that had no obvious t-shirt vocabulary simply were not created. There
  was no `size` scale and no `measure` scale, so component tokens carried raw
  pixels: `--lds-avatar-size: 36px`, `--lds-drawer-width: 420px`. The avatar
  then drifted to 38px in Figma while the CSS stayed at 36, because neither
  side pointed at a shared primitive.

An opaque name forces the decision up into semantic, where it belongs. The
number is a position, not a value, so re-tuning 10px to 11px does not
invalidate the name.

**Every axis gets a semantic row** — colour, radius, size, measure, border
width, elevation, motion, layer, type. If an axis exists in core and has no
purposes named in semantic, it *will* be skipped again.

The one documented exception is **space**: component padding and gaps reference
`--lds-space-*` directly. "16px of padding inside a button" has no meaningful
purpose-name between the scale and the component, and inventing
`--lds-space-inline-md` would be the t-shirt scale wearing a hat — a hop that
adds no decision. Optical insets are the exception's exception: see below.

**Load order matters.** Semantic tokens read the brand hooks, so a brand file
loaded *after* them resolves too late and you silently get the neutral
fallback. `index.css` fixes the order; don't import the parts separately.

---

## Colour

### Neutral · cool slate

The canvas family for every brand in the house. Deliberately cool so warm
accents read as deliberate.

| Token | Value | Role |
|---|---|---|
| `neutral-0` | `#ffffff` | the page ground, cards, modals |
| `neutral-50` | `#f6f8f9` | sunken wells, table heads, row hover |
| `neutral-100` | `#eef2f3` | internal dividers, row rules, progress track |
| `neutral-200` | `#e2e8ea` | card and control edges |
| `neutral-400` | `#9aa6ad` | **non-text only** — 2.49:1 |
| `neutral-450` | `#78858f` | icons, control edges — clears the 3:1 non-text floor |
| `neutral-500` | `#66717f` | labels, captions, supporting copy |
| `neutral-800` | `#1f2a33` | body copy, secondary values |
| `neutral-900` | `#16212b` | headings, values, the number they came for |

> **The page ground is white.** Cards do not rely on a grey canvas to separate
> them — a 1px border plus `--lds-elevation-card` does that. Setting
> `--lds-bg-canvas` to a grey breaks card separation twice over: it removes the
> contrast the border was tuned against *and* makes the card shadow invisible.

### The four foreground steps mean something

| Token | Use for | Never use for |
|---|---|---|
| `fg-default` | headings, values, the primary number | body paragraphs |
| `fg-subtle` | body copy, table cells, secondary values | — |
| `fg-muted` | labels, captions, column heads, help text | — |
| `fg-faint` | icons, control edges, placeholders | **anything a user must read** |
| `fg-decorative` | rules, dots, chevrons | anything carrying meaning |

`fg-faint` at 3.78:1 clears the WCAG 3:1 non-text minimum and *fails* the 4.5:1
text minimum. That is on purpose and it is enforced: routing a column head or a
KPI label through `fg-faint` was the most common contrast failure in the
pre-system codebase.

### Status · fixed forever

```
below goal   red     bg red-100    text red-700    accent red-500
at goal      blue    bg blue-100   text blue-600   accent blue-500
above goal   green   bg green-100  text green-600  accent green-500
caution      amber   bg amber-100  text amber-700  accent amber-500
```

No brand may remap these. A plan's performance has to mean the same thing in
every product in the house or the numbers stop being trustworthy — and the
numbers are the product.

### The blue collision, and why it is safe

Provider Portal's brand blue and the "At Goal" status blue are the same family.
That is tolerated because of a rule that holds for *every* brand: brand never
tints a status chip, status never fills an action. Break either and the two
become genuinely ambiguous — which is exactly what the linter checks for.

### Expressive palette

Twelve hues inherited from the Lumenore PLG icon library. **Illustration and
data-viz only.** Never UI state, never text, never an interactive fill. They
exist so illustration has a sanctioned palette instead of inventing hexes.

---

## Typography

**Hanken Grotesk** for UI — a humanist grotesque whose open apertures survive
11px, which matters because a lot of this interface lives at 11–13px.
**Spline Sans Mono** (≤600 weight) for measure codes, member IDs, NPIs and
eyebrows. Never for prose.

### Scale · 13 steps

`10 · 11 · 12 · 13 · 14 · 15 · 16 · 18 · 20 · 22 · 26 · 30 · 36`

The ratio is deliberately tight (~1.09 through the body band). These are dense
analytical screens: the steps must be *distinguishable* without a title
wrapping to three lines. A wider scale would look better in a specimen and
worse in the product.

> The pre-system codebase used **29 distinct sizes**, including `9.5px`,
> `10.5px`, `11.5px`, `12.5px`, `13.5px` and `14.5px`. Half-pixel type does not
> render as a half-pixel difference; it renders as inconsistent hinting. All of
> them collapse into the 13 steps.

### Weights

`400 · 500 · 600 · 700`. Weight 300 and 800 are not licensed for UI — 300 fails
legibility at the sizes this product uses, 800 has no role the 700 doesn't fill.

### Roles

| Role | Spec | Where |
|---|---|---|
| Eyebrow | mono · 11px · 500 · `0.12em` · uppercase · **brand** | above every page title |
| Page title | 26px · 700 · `-0.02em` | one per page |
| Section | 18px · 700 · `-0.01em` | card group headings |
| Card title | 15px · 700 | inside a card |
| Body | 14px · 400 · 1.55 | default |
| Body small | 13px · 400 | dense rows, drawers |
| Caption | 12px · 400 · 1.35 | help text, meta |
| Label | 11px · 600 · `0.04em` · uppercase | column heads, KPI labels, `<dt>` |

**The page pattern is fixed across the house:**

```
QUALITY MEASURES              ← eyebrow · mono · uppercase · brand
Member Worklist               ← 26px · 700
Open care gaps for the …      ← 14px · muted · ONE line
```

One line. If the subtitle needs two, the title is not doing its job.

Uppercase labels cap at about three words — uppercase destroys word-shape, and
a sentence in caps is unreadable at 11px. If your label needs a sentence, it is
help text, not a label.

---

## Space

2px base unit, 4px rhythm. `--lds-space-100` … `--lds-space-2100`, ordinal —
the number is the step, not the pixel count.

The odd 2px steps (`space-300` = 6px, `space-500` = 10px, `space-700` = 14px,
`space-900` = 18px, `space-1100` = 22px) are **optical corrections for dense
controls only**. Page and section layout uses the 4px multiples. Mixing them at
page level is how a codebase ends up with 44px and 46px gutters that nobody can
tell apart but everybody has to maintain.

### Optical insets — a separate, tiny scale

`--lds-space-optical-100` … `-400` hold 3px, 7px, 11px and 13px. These are not
rhythm steps. Each is a vertical padding chosen to hold a control or row at its
target height given its line box, which is why they land on odd pixels the
space scale does not contain — `inset-cell` is 13px because that is what keeps
a table row at the 44px pointer-target floor, not because 13 was pretty.

They are kept out of `space` on purpose. Folding 3, 7, 11 and 13 in next to 4,
8 and 12 turns the rhythm into "any number is fine", which is the opposite of
having a scale. They get semantic roles (`--lds-inset-pill`, `-segment`,
`-option`, `-cell`) because the object each one holds up is the only reason its
value is what it is: change the type ramp and every one must be re-derived.

Vertical padding on dense controls only. Never a gap, never a margin.

### Page gutter

```css
--lds-page-padding:        32px 44px 48px;   /* top · horizontal · bottom */
--lds-page-padding-mobile: 64px 16px 32px;
```

Shorthand on purpose: the two side gutters cannot fall out of sync. Every
routed top-level page reads this one token. Before it existed, pages had
drifted to 32/36/52px horizontal independently.

The 64px mobile top clears the fixed drawer button.

---

## Radius

| Token | Value | Owns |
|---|---|---|
| `2xs` | 3px | the inset status rule on a KPI card |
| `xs` | 6px | tiny inline affordances, sort buttons |
| `sm` | 8px | fields, small buttons, segmented items |
| `md` | 10px | buttons, nav items, notices |
| `lg` | 14px | menus, dropdowns |
| `xl` | 18px | **cards, modals, drawers — and nothing else** |
| `full` | 9999px | pills, chips, dots, avatars |

Radius steps down with the box so corners stay *optically* equal: a 10px corner
on a 30px button reads heavier than the same corner on a 38px one.

Never nest `xl` inside `xl`. It reads as a mistake, because it usually is one.

---

## Elevation

Named by **role**, not by number, so you pick by what the thing *is*:

| Role | Shadow | For |
|---|---|---|
| `hairline` | `xs` | inputs, segmented pips |
| `control` | `sm` | a control resting *on* a card |
| `card` | `card` | a page-level card on the white ground |
| `raised` | `md` | hover lift, sticky bars |
| `overlay` | `lg` | menus, toasts, drawers |
| `modal` | `xl` | modals, the assign panel |

`card` is its own token rather than a bump to `sm`, because `sm` is shared by
28 rules including inputs and buttons that should stay flat.

All shadows are cool-tinted (`rgb(20 33 43 / …)`) — a neutral-black shadow on a
cool canvas reads muddy.

---

## Motion

| Token | Duration | For |
|---|---|---|
| `fast` | 140ms | hover, row highlight |
| `base` | 180ms | control state, colour change |
| `slow` | 260ms | entrances, panel reveals |
| `slower` | 400ms | layout shifts, sidebar collapse |
| `data` | 800ms | bar and rate fills that encode a value |

Easings: `standard` for state, `entrance` for things arriving, `emphasis` for
overlays, `exit` for things leaving.

`data` is slow on purpose — a bar that grows over 800ms reads as *measurement*.
A bar that snaps reads as a layout jump.

**`prefers-reduced-motion` means effectively none**, not less. For a
vestibular-sensitive user, a 400ms panel slide repeated two hundred times a day
is a working condition.

---

## Z-index

A closed scale. Never write a bare number.

```
below -1 · base 0 · raised 1 · overlap 10 · sticky 100
nav-scrim 190 · nav 200 · dropdown 300
modal-scrim 400 · modal 410 · popover 500 · toast 600 · tooltip 700
```

> The pre-system codebase had **16 distinct z-index values** including 3, 4, 5,
> 6, 30, 40, 49, 60 and 110 — with a nav scrim at 49 sitting one below its own
> sidebar at 50 and a mobile menu button at 110 hopping over a sticky header at
> 100. Every one of those numbers was correct in isolation and none of them
> were legible together.

---

## Breakpoints

Six. `480 · 640 · 768 · 1024 · 1280 · 1536`.

The two that carry behaviour:

- **768px** — the sidebar leaves the flow and becomes an overlay drawer.
  Docking even an 80px rail below this left the v2 card ~126px wide.
- **1024px** — the sidebar collapses to an 80px icon rail.

> The pre-system codebase used **19 distinct max-widths** (480, 560, 620, 640,
> 680, 720, 760, 768, 860, 900, 940, 980, 1024, 1080, 1100, 1200, 1240 …).
> Nineteen breakpoints is nineteen layouts nobody has ever seen all of.

CSS `@media` cannot read a custom property, so the literals stay in the media
queries and `--lds-breakpoint-*` exists for JS and tooling. Keeping the two in
sync is a governance check — see [governance §Drift](06-governance.md).
