# Content & voice

Copy is part of the system. A button labelled "Submit" and a button labelled
"Assign 42 members" are different components as far as the user is concerned.

---

## Voice

**Calm, clinical, trustworthy.** This is a compliance setting. The interface is
a colleague who knows the data, not a product that is excited about itself.

- Plain, direct, unhedged. "12 measures below goal", not "It looks like you may
  have some measures that could use attention."
- No exclamation marks. No congratulation for routine work.
- Never blame the user. "That member is already covered by a population play",
  not "Invalid selection."
- Clinical accuracy over friendliness where they conflict.

---

## Grammar

| Element | Rule | Example |
|---|---|---|
| Page title | Title Case, noun phrase | `Member Worklist` |
| Section heading | Sentence case | `Providers driving the gap` |
| Button | Sentence case, verb first | `Assign members` |
| Label (uppercase) | ≤3 words | `OPEN GAPS` |
| Column head | Sentence case, uppercase-styled | `Last outreach` |
| Chip | Title Case | `Above Goal` |
| Eyebrow | UPPERCASE, ≤4 words | `QUALITY MEASURES` |
| Toast | Sentence case, past tense | `Assigned 42 members to Dana R.` |
| Empty state | Sentence case, full sentences | — |

**Buttons name their outcome, not their mechanism.** `Assign members`, not
`Submit`. `Export CSV`, not `Download`. If a button's label works on any screen
in the app, it is too vague to be on this one.

---

## Numbers

- Rates: one decimal with a percent sign — `62.4%`.
- Counts: thousands separators — `1,284 members`.
- Deltas: always signed, always with a baseline — `+2.1 pts vs. Q3`.
- Never a bare number without its unit and period in the same visual group.
- Ranges use an en dash with spaces — `Jan – Mar 2026`.
- Dates: `7 Aug 2026` in prose, `2026-08-07` in mono/ID contexts. Never
  ambiguous numeric forms.
- Nulls are `—`, never `0`, never blank. Zero is a measurement; missing is not.

---

## Clinical & PHI language

- "Member", not "patient", "user", or "customer" — that is the plan's term.
- "Care gap", not "deficiency".
- "Provider" for the clinician, "CRSP" only where the contract term is required.
- Measure codes always in mono: `HDO`, `FUH-30`, `AMM`.
- **Never put PHI in a URL, a toast, a page title, or a tooltip.** Member names
  and IDs live in the body of an authenticated view.
- Screenshots, demos and sample data use synthetic members. Always.

---

## Error and empty copy

Three parts, in order: **what happened · why · what to do now.**

```
✓  Couldn't load member data
   The measure service didn't respond. Your filters are unchanged.
   [ Retry ]

✗  Error: request failed (500)
```

Empty states say what *would* be here and how to get it:

```
✓  No unassigned gaps in this stratum
   Every open gap here already has an active play. Clear the
   "Unassigned" filter to see all 84 members.

✗  No data
```

Sample-data notices name themselves plainly:

```
Showing sample data — the live measure service is unavailable. [ Retry ]
```

---

## Accessible names

The visible label and the accessible name must match, or voice-control users
cannot say what they see.

```jsx
// ✓
<button aria-label="Next page">›</button>

// ✗ — a voice user says "next" and nothing happens
<button aria-label="Advance to subsequent results page">Next</button>
```

Icon-only controls: name the **action**, not the glyph. `aria-label="Filter
measures"`, never `aria-label="Funnel icon"`.
