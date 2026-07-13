---
name: verify
description: Build, run, and drive the QualityPulse app to observe a change at its real surface (browser pixels).
---

# Verifying QualityPulse

Vite + React SPA. The surface is **pixels in a browser** — drive it with Playwright.

## Launch

```bash
npm run dev -- --port 5199        # NOT react-scripts; package.json is Vite + "type": "module"
```

`npx react-scripts build` **wipes `build/` and injects a `browserslist` key into
package.json.** Never run it. `npm run build` (vite) is the real build.

The app always fetches `https://dwihn-uat.lumenore.com/...` and gets a CORS
failure locally, then falls back to sample data with an amber
"Live data unavailable — showing sample data" banner. That console error spam is
**expected**; filter it (`grep -v -i "cors\|ERR_FAILED"`) rather than chasing it.

## Driving to the v2 flow

The v2 scorecard is the index route (`/`). `ScorecardV2` swaps between three
views; there is no URL for the inner ones, so you must click through:

```js
await page.goto('http://localhost:5199/');
await page.waitForTimeout(1800);                                  // sample-data fallback settles
await page.getByRole('button', { name: /^SSD/ }).click();         // a bubble in the measure field
await page.getByRole('button', { name: /Investigate measure/ }).click();  // right rail -> MeasureExplorer
```

From `MeasureExplorer`:
- `Assign intervention · all providers` → measure-wide `AssignPanel`
- `Assign` (bare) → provider-scope `AssignPanel`. **The first one is the
  "Overall" row, which is deliberately measure-wide** — use `.nth(1)` for a real
  provider scope.

`AssignPanel` is portaled to `document.body`; its root is `.apx`.

## Gotchas

- Sample providers are generated independently of the measure's denominator, so
  summed provider counts exceed the measure's own non-compliant total. Numbers
  that don't reconcile across scopes are the fixture, not the logic.
- Panel closes on scrim click, **not** on Escape.
