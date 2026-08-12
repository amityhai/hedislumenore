# Governance

A design system without governance is a folder of suggestions. This document
says who decides what, how a change gets in, and what happens when it drifts.

---

## 1. The house

**Lumenore Design System (LDS)** is a *house of brands*: one system, one set of
foundations, several products with distinct identities.

```
                     LUMENORE DESIGN SYSTEM
                     ─────────────────────────
     foundations · semantics · components · a11y · governance
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
  QualityPulse        Provider Portal        (next product)
  staff · teal        external · blue        6 hooks, 0 forks
```

**What a brand owns:** six colour hooks. `subtlest · subtle · muted · base ·
strong · rgb`. That is the entire surface.

**What the house owns — and no brand may change:**

- Status semantics (below/at/above/caution) and their hues
- The four colour languages and the rule that they never mix
- Control heights, radius meanings, the type scale, the space scale
- Every accessibility contract
- Component anatomy and behaviour
- Icon keyline, sizes, and semantics

If a product needs to change any of the second list, it is not a brand — it is
a fork, and a fork needs an explicit council decision before a line of CSS is
written.

### Why status is locked

A health plan's performance data appears in the staff app, the provider portal,
exported reports, and regulator submissions. If "below goal" is red in one and
orange in another, the data stops being comparable and the numbers stop being
trustworthy. The numbers are the product.

---

## 2. Roles

| Role | Who | Owns |
|---|---|---|
| **System owner** | Design lead | Roadmap, breaking changes, final call |
| **Council** | 1 design + 1 eng + 1 a11y, rotating | Tier 1 & Tier 2 changes |
| **Brand steward** | Per product | Their six hooks; brand-review sign-off |
| **Contributor** | Anyone | Proposals, component work, docs |

Council meets weekly and clears anything unblocked within one cycle. If the
council cannot reach a decision in two cycles, the system owner decides.

---

## 3. Change classes

| Class | Examples | Needs | SLA |
|---|---|---|---|
| **A · Additive** | new component variant, new doc, new icon | 1 reviewer | 2 days |
| **B · Component** | new component, changed anatomy | Council + a11y review | 1 week |
| **C · Tier 2** | new semantic token, changed meaning | Council + migration note | 1 week |
| **D · Tier 1** | new hue, new scale step, changed primitive | Council + contrast audit + owner | 2 weeks |
| **E · Breaking** | removed token, changed status colour, new brand | Council + owner + all brand stewards + deprecation cycle | 1 month |

**A new brand is class E.** It gets a brand review with the button row, the
status row and the assign row screenshotted side by side, plus the contrast
checklist in `brands/_template.css`.

### The three questions every proposal answers

1. **What can't be built today?** Show the real screen, not a hypothetical.
2. **Why won't an existing token or variant do?** If the answer is "it's not
   exactly right", that is usually a no.
3. **Who else needs this?** One-product needs are usually product code.

Two or more products needing the same thing is the strongest possible signal.
One product wanting a slightly different shade is the weakest.

---

## 4. Adding a token — the decision tree

```
Do I need a new value?
├─ Can an existing semantic token express this purpose?
│   └─ YES → use it. Stop.
├─ Is it a NEW PURPOSE that maps to an existing primitive?
│   └─ Add a Tier 2 semantic token.               (class C)
├─ Does one component deviate for a stated reason?
│   └─ Add a Tier 3 component token + a comment.  (class B)
└─ Is it genuinely a new raw value?
    └─ Tier 1, with a contrast audit.             (class D)
```

**Naming**

- Tier 1 — `--lds-<category>-<scale>` · `--lds-teal-600`
- Tier 2 — `--lds-<role>-<variant>-<state?>` · `--lds-action-primary-bg-hover`
- Tier 3 — `--lds-<component>-<element?>-<prop>-<state?>` ·
  `--lds-table-row-bg-hover`

A Tier 2 name that mentions a component, or a Tier 3 name that mentions a
value, is rejected on sight.

**A Tier 3 token that is a 1:1 passthrough of its semantic parent, with no
deviation and no override need, gets deleted.** It is not documentation; it is
a second place to be wrong.

---

## 5. Enforcement

These run in CI and fail the build.

```bash
npm run ds:lint       # stylelint + custom LDS rules
npm run ds:contrast   # every semantic pair against WCAG AA
npm run ds:a11y       # axe-core across routes and modal open-states
npm run ds:usage      # token adoption + legacy-alias reference count
```

**Custom rules**

| Rule | Fails on |
|---|---|
| `lds/no-raw-color` | any hex, `rgb()`, or named colour in product CSS |
| `lds/no-tier1-in-product` | `--lds-<hue>-<n>` referenced outside Tier 2/brand |
| `lds/font-size-scale` | a `font-size` not in the 13-step scale |
| `lds/no-bare-z-index` | a `z-index` that is not `--lds-z-*` |
| `lds/breakpoint-allowlist` | an `@media` width not in the six |
| `lds/icon-size` | an icon rendered below 16px or off the 2px grid |
| `lds/no-status-fill-on-action` | a `--lds-status-*` on a `.lds-btn` |
| `lds/no-brand-on-status` | a `--lds-brand-*` on a `.lds-chip--<status>` |
| `lds/focus-not-removed` | `outline: none` without a replacement |
| `lds/legacy-token` | any `--c-*`, `--r-*`, `--sh-*`, `--pv-*` in new code |

The last two matter most. `focus-not-removed` is the only lint rule that
protects a legal obligation, and `legacy-token` is what stops the compat bridge
from becoming permanent.

---

## 6. Drift

Drift is what kills systems, and it is quiet. Four known channels and their
controls:

| Channel | Control |
|---|---|
| `tokens.json` vs `tokens/*.css` | CI diffs the two; a mismatch fails the build |
| `--lds-breakpoint-*` vs `@media` literals | allowlist rule; CSS can't read a var in a media query, so this can only be checked, not enforced by the language |
| Figma library vs code | `DesignSync` / Code Connect mapping reviewed monthly |
| Product CSS vs system | quarterly audit — see below |

### Quarterly audit

Run and record:

```bash
npm run ds:usage
```

Reported metrics:
- **Adoption** — % of declarations using LDS tokens (target ≥ 95%)
- **Legacy** — remaining `--c-*` / `--pv-*` references (target 0)
- **Off-scale** — count of font-sizes, z-indexes, breakpoints outside the scales
- **Orphans** — tokens with zero references (candidates for deprecation)
- **Overrides** — product CSS re-declaring a semantic token (a smell: it usually
  means a missing variant)

An audit that finds nothing means the audit is not looking hard enough.

---

## 7. Deprecation

Nothing is deleted without a cycle.

1. **Mark** — `$deprecated` in `tokens.json`, a comment in CSS naming the
   replacement, and an entry in the changelog.
2. **Warn** — the linter warns (does not fail) for one minor version.
3. **Migrate** — ship a codemod. If a change cannot be codemodded, the proposal
   has to justify the manual cost before it is approved.
4. **Remove** — only when `ds:usage` reports zero references, and only on a
   major version.

Minimum lifetime for a deprecated public token: **one minor version, or 90
days, whichever is longer.**

### Currently deprecated

| Token | Replacement | Removed in |
|---|---|---|
| `--lds-teal-550` (`#0e8a8c`) | `--lds-teal-600` (`#0d8082`) | 2.0 — migration diff only |
| all `--c-*`, `--r-*`, `--sh-*` | LDS equivalents in `compat.css` | 2.0 |
| `--pv-*` | brand hooks via `[data-lds-brand]` | 2.0 |

---

## 8. Versioning

Semver on the system as a whole.

- **Major** — a token removed, a status colour changed, a component's anatomy
  broken.
- **Minor** — a token or variant added, a component added, a deprecation
  marked.
- **Patch** — a bug fix, a doc change, a value corrected within its contrast
  contract.

**A contrast fix that visibly changes a hue is a minor, not a patch.** The four
fixes shipped in 1.0 changed pixels; the changelog says so.

---

## 9. Support

- `#design-system` — questions, 1 business day
- `ds-proposal` issue template — new tokens and components
- Office hours — Thursdays, bring the screen you're stuck on

**Contributing is faster than working around.** If you find yourself writing a
hex in a component file, that is the moment to open a proposal — a workaround
takes ten minutes and costs the next person a day.
