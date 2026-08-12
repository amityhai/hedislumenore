# Lumenore Design System

One system. Several products. Two independent axes between them.

LDS is a **house of brands**. Five identities — Clinical Suite, Data Labs,
Funding, City of Detroit, and the Provider Portal — built on identical
foundations, identical semantics, identical components, and identical
accessibility contracts. A brand owns its colour. The house owns everything
else, because a health plan's performance data has to mean the same thing in
every product that displays it.

Note what is *not* on that list: HEDIS, Recidivism, and Member 360 are one
brand, not three. They share a member, an intervention, and a single staff
session that moves between them. Re-tinting the chrome mid-session would
imply the user had changed systems when they had only changed question.

---

## Install

```js
// src/index.js
import '../design-system/index.css';
```

That's it. `compat.css` keeps the existing `--c-*` / `--r-*` / `--sh-*` /
`--pv-*` names working, so nothing breaks on day one. See
[adoption & migration](docs/08-adoption-migration.md).

```jsx
// switch brand and density independently
<div data-lds-brand="provider-portal" data-lds-density="comfortable">…</div>
```

---

## The three tiers

```
  TIER 1 · CORE          TIER 1.5 · BRAND       TIER 2 · SEMANTIC         TIER 3 · COMPONENT
  a value                19 hooks per product   a purpose                 one property, one component
                         + TIER 1.5 · DENSITY
                           12 hooks per profile

  --lds-teal-600   ──►   --lds-brand-base  ──►  --lds-action-primary-bg ──► --lds-button-primary-bg
  #0d8082                                       "the fill of the one         (only where it deviates)
                                                 next action"

  ✗ product code         ✗ product code         ✓ TARGET THIS TIER        ✓ override points
```

Product code targets **Tier 2**. Reading Tier 1 directly bypasses both the brand
layer and the semantic contract — your component stops re-theming and stops
being findable when the meaning changes. The linter fails the build on it.

---

## Files

```
design-system/
├── index.css                  ← the one import. Order is load-bearing.
├── tokens/
│   ├── tokens.json            DTCG source of truth, all three tiers
│   ├── 1-core.css             primitives — values, no purpose
│   ├── 0-fallback.css         neutral brand + density — loads AFTER core, BEFORE brands
│   ├── 2-semantic.css         purposes — the contract product code uses
│   ├── 3-component.css        component contracts + override points
│   └── compat.css             deprecated legacy aliases
├── density/
│   ├── dense.css              staff queues — house default
│   ├── comfortable.css        CRSP worklists, finance tables (44px targets)
│   └── presentation.css       board readouts, City of Detroit
├── brands/
│   ├── clinical-suite.css     teal   · HEDIS + Recidivism + Member 360
│   ├── data-labs.css          violet · intervention validation
│   ├── funding.css            plum   · eligibility & reimbursement
│   ├── city-of-detroit.css    royal  · external, aggregate, view-only
│   ├── provider-portal.css    blue   · external clinicians (audience, not product)
│   └── _template.css          copy this to add a brand
├── base/
│   ├── reset.css              reset, focus, reduced motion, forced colors
│   ├── typography.css         type roles as classes
│   └── primitives.css         the CSS-only components
└── docs/
    ├── 00-principles.md       six rules, in priority order
    ├── 01-foundations.md      colour · type · space · radius · elevation · motion
    ├── 02-iconography.md      the Lumenore keyline and icon semantics
    ├── 03-components.md       every component, and what it is NOT for
    ├── 04-content-style.md    voice, grammar, numbers, error copy
    ├── 05-accessibility.md    WCAG 2.2 AA, measured
    ├── 06-governance.md       who decides, how change lands, drift control
    ├── 07-contributing.md     how to add, how to review
    ├── 08-adoption-migration.md  five phases, each independently shippable
    └── 09-audit.md            the baseline this was built from
```

---

## The six principles

1. **The number is the product** — legibility over everything; never fake data.
2. **Colour is a vocabulary** — action / workflow / status / feedback never mix.
3. **Shape carries meaning** — buttons are rectangles, pills filter, cards contain.
4. **Every affordance is visible at rest** — no hover-only reveals, anywhere.
5. **One next action per view** — primary buttons are rare and expensive.
6. **Extend the system, never the component** — a raw hex is a hole in the system.

Full text with the reasoning: [principles](docs/00-principles.md).

---

## Status semantics — fixed for the whole house

```
below goal   red      at goal   blue      above goal   green      caution   amber
```

No brand may remap these. Status is always carried by **hue + shape + label** —
never colour alone.

---

## Accessibility

WCAG 2.2 AA, measured rather than assumed. Every semantic colour pair is
verified in CI.

The system's first release **fixed four AA failures** inherited from the
previous palette — including a white label on the primary button at 4.17:1, on
the most-pressed control in the product. Details and the full ratio table:
[accessibility](docs/05-accessibility.md).

---

## Checks

```bash
npm run ds:lint       # no raw hex, no off-scale type, no bare z-index
npm run ds:contrast   # every semantic pair against WCAG AA
npm run ds:a11y       # axe-core across routes and modal open-states
npm run ds:usage      # adoption + remaining legacy references
```

---

## The two axes

Brand and density are **orthogonal**, and that is deliberate:

```
  BRAND  (what product am I in)          DENSITY  (who is reading this)
  colour · font family · radius          spacing · control height · page padding
  elevation

  Clinical Suite   teal              Dense          staff queues
  Data Labs        violet            Comfortable    CRSPs, finance — 44px targets
  Funding          plum              Presentation   board readouts, City of Detroit
  City of Detroit  royal
  Provider Portal  blue
```

Two products can share a hue and differ in density; two can share a density and
differ in hue. Provider Portal and Funding are different brands on the same
density. Folding spacing into brand would make **"Clinical Suite, presentation
mode"** inexpressible — which is exactly what a HEDIS roll-up needs in a
funding review.

```jsx
<div data-lds-brand="clinical-suite" data-lds-density="presentation">…</div>
```

## Adding a brand

Copy [`brands/_template.css`](brands/_template.css), fill in the hooks, run the
checklist in the file. A brand owns colour, font family, the rounded-rectangle
radius steps and the elevation ramp — nothing else. If you need to change spacing, you want a density,
not a brand. If you need anything beyond both, that is a fork — open a class-E
proposal ([governance](docs/06-governance.md)).

---

## Getting help

`#design-system` · `ds-proposal` issue template · office hours Thursdays.

Contributing is faster than working around: a workaround takes ten minutes and
costs the next person a day.
