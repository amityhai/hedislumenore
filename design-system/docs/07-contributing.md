# Contributing

---

## Before you write anything

Work down this list. Most requests stop before step 4.

1. **Is there a token for it?** Search `2-semantic.css`. The name describes a
   purpose, so search by purpose: "the fill behind a selected row" → `selected`.
2. **Is there a component for it?** Check [components](03-components.md).
3. **Is there a variant?** A different size, a different state, a composed pair.
4. **Would two products want this?** If only yours, it is probably product code.
5. **Open a proposal.** `ds-proposal` template.

---

## Building a feature with the system

```jsx
import 'design-system/index.css';

<main className="lds-page" id="main">
  <header>
    <p className="lds-eyebrow">Quality measures</p>
    <h1 className="lds-page-title">Member Worklist</h1>
    <p className="lds-page-subtitle">Open care gaps for HDO, Q3 2026.</p>
  </header>

  <div className="lds-card lds-card--flush">
    <table className="lds-table">
      <thead>
        <tr>
          <th>Member</th>
          <th className="is-num">Days open</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr className="lds-table__row--interactive" tabIndex={0} role="button">
          <td>Dana R.</td>
          <td className="is-num lds-num">42</td>
          <td>
            <span className="lds-chip lds-chip--below">
              <span className="lds-chip__dot" aria-hidden="true" />
              Below Goal
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</main>
```

Note what is *absent*: no hex, no `font-size`, no `z-index`, no bespoke radius.

---

## Writing product CSS

**Do**

```css
.worklist-summary {
  padding: var(--lds-space-900) var(--lds-space-1000);
  background: var(--lds-bg-surface-sunken);
  border-radius: var(--lds-radius-400);
  color: var(--lds-fg-subtle);
}
```

**Don't**

```css
.worklist-summary {
  padding: 17px 21px;              /* off-scale, and nobody will know why */
  background: #f7f9fa;             /* raw hex — never re-themes */
  border-radius: 11px;             /* not a radius in the system */
  color: var(--lds-neutral-800);   /* Tier 1 from product code */
}
```

The last one is the subtle failure. `--lds-neutral-800` renders identically to
`--lds-fg-subtle` today. It stops doing so the moment the foreground ramp
shifts — and it is invisible to a search for "who uses body text colour".

---

## Adding a component

**Definition of done**

- [ ] Uses only Tier 2 tokens (Tier 3 only where it deviates, with a comment)
- [ ] All states: default · hover · focus-visible · active · disabled ·
      loading · empty · error
- [ ] Keyboard-operable end to end, no mouse
- [ ] Focus visible via the standard ring; no `outline: none` without a
      replacement
- [ ] Accessible name on every control; roles and ARIA verified with a real
      screen reader, not just axe
- [ ] Contrast measured, not eyeballed — including hover and disabled
- [ ] Responsive at 320px, 768px, 1280px, and at 200% zoom
- [ ] `prefers-reduced-motion` honoured
- [ ] Works in `forced-colors: active`
- [ ] Documented in `03-components.md` with a **Don't** section
- [ ] Named consistently with its siblings

**The Don't section is required.** Documenting what a component is *not* for is
what prevents the second, subtly-different copy of it appearing in six months.

---

## Adding a brand

1. Copy `brands/_template.css`.
2. Fill in the six hooks. Nothing else.
3. Run the checklist in the template — the `base`-on-white and
   `strong`-on-`subtle` ratios are the two that fail most often.
4. Verify `base` is distinguishable at pill size from **both** the At-Goal blue
   and the assign indigo. If it isn't, you have recreated the ambiguity the
   system exists to prevent.
5. Import it in `index.css`, between core and semantic.
6. Screenshot the button row, status row and assign row side by side against an
   existing brand. That comparison is the brand review.

If you need a seventh hook, stop and open a class-E proposal.

---

## Reviewing a PR

Ask these, in order:

1. Any raw values? Hex, font-size, z-index, breakpoint, radius.
2. Any Tier 1 tokens read from product code?
3. All eight states present, or a stated reason why not?
4. Keyboard-operable? Focus visible? Accessible names correct?
5. Contrast measured?
6. Would this be better as a system change than a product one?

Question 6 is the one that keeps the system alive. Approving a good workaround
is how a system slowly stops being used.

---

## Commit convention

```
ds(tier1): darken teal-600 to #0d8082 for AA on primary fill
ds(tier2): add --lds-lifecycle-* for intervention state
ds(component): add lds-btn--danger
ds(docs): document the icon keyline
ds(deprecate): mark --c-* aliases, removal in 2.0
```
