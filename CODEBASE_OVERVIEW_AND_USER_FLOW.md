# QualityPulse — Codebase Overview & User Flow

> **QualityPulse** is a React 19 + Vite single-page app: a healthcare quality dashboard for **HEDIS measures**, built for a Behavioral Health org. No UI framework (vanilla CSS). Backend is the **Lumenore Workflow API**, called with a JWT held in session storage.

---

## In plain language (the "why")

### What is this platform?

QualityPulse is a dashboard that helps a healthcare organization **measure and improve the quality of care its patients receive**. Health plans and clinics are graded on standardized "report card" metrics called **HEDIS measures** — e.g. *"What % of women got their breast cancer screening?"* or *"What % of hypertensive patients have it under control?"* QualityPulse is the screen where staff watch those scores and act on them.

> Think of it like a **fitness tracker for a whole patient population** — instead of "you walked 8,000 steps," it shows "12,000 of your diabetic patients still need an eye exam."

### The problem it solves

Quality data normally sits in spreadsheets and databases that are hard to read. QualityPulse turns it into a clear scoreboard, a way to drill down to *exactly which patients* are missing care, and a worklist so staff can assign follow-up.

### The goal

**Close "care gaps."** A care gap = a patient who should have gotten a test, screening, or treatment but didn't. The app exists to find those patients and get them the care they need — which improves patient health *and* raises the organization's quality scores.

### The outcome (what success looks like)

- More patients get needed screenings/follow-ups → **better health outcomes**.
- Quality scores move **above target** (often tied to funding, bonuses, and reputation).
- Staff spend less time hunting through data, more time helping patients.

### Who the users are

This is an **internal staff tool** — patients never see it.

| User | What they use it for |
|------|----------------------|
| **Quality / HEDIS managers** | The big-picture scoreboard — which measures are above/below goal this month. |
| **Care coordinators / outreach staff** | The **Care Action Center** worklist — assigned specific patients to call, schedule, and follow up with. |
| **Population health / equity analysts** | Deep-dive views — breaking scores down by **age, race, ethnicity, and provider group** to spot unfair gaps. |
| **Clinic / provider leadership** | Seeing how their own provider groups are performing. |

### A typical day (the core loop)

1. A quality manager opens **Overview** and sees breast cancer screening is below goal this month.
2. They **Deep Dive** and find the gap is worst in a particular age group and provider.
3. They hand it to the **Care Action Center**, where a coordinator gets the exact list of patients missing the screening, assigns themselves, and starts outreach.
4. Next month those patients show as "screened," the score ticks up, the gap shrinks.

> **measure → find the gap → act → improve** — that loop is the entire purpose of the platform.

---

## Tech stack

- **React 19.2.4** (function components + hooks)
- **Vite 5** (dev server on port 3000, `npm run dev`)
- **Vanilla CSS** (one `.css` per component)
- **Lumenore Workflow API** (backend, ~30 workflow endpoints keyed by UUID)
- **Session storage** for JWT token management (15-min expiry, auto-refresh every 14 min)

### Running locally

```bash
npm install      # installs platform-correct deps (esbuild/rollup native binaries)
npm run dev      # Vite dev server → http://localhost:3000/ (opens automatically)
npm run build    # production build → dist/
```

> **Note:** if `node_modules` was copied from another OS (e.g. Windows `@esbuild/win32-x64`), delete `node_modules` + `package-lock.json` and reinstall so the correct native binaries are pulled for your platform.

---

## Pages & components

| Component | Type | Role | Navigates to |
|-----------|------|------|--------------|
| `App.js` | Router/state | `currentPage` string switch (no react-router). Owns `token`, `selectedMonth`, `availableMonths`, sidebar state. | all pages |
| `Dashboard.js` | Page | KPI tabs (Above / At / Below Goal) that filter the measure table; insight cards (Lowest Performing, CRSPs Needing Attention, Equity Alerts). | → Measure Detail |
| `MeasureDetail.js` | Page | Deep dive into one measure: performance section + stratification by Age / Race / Ethnicity / CRSP, expandable member drilldowns, CSV export. | → Care Action Center, (→ Rate Simulator) |
| `MeasurePerformanceSection.js` | Shared | DOM tabs (EOC / ECDS / AAC / URU), measure pills, mini trend chart, KPI metrics. Embedded in Measure Detail. | — |
| `CareActionCenter.js` | Page | Care-gap worklist: KPI cards, filters (measure / status / CRSP / staff), paginated member table, action modal (assign staff, action type, notes). | standalone |
| `RateSimulator.js` | Page | **Mock / placeholder** — slider to model gap-closure scenarios on hardcoded data. | unreachable (see Known Issues) |
| `ProviderScores.js` | Page | **Mock / placeholder** — CRSP/provider scorecards on hardcoded data. | unreachable (no nav) |
| `MonthFilter.js` | Shared | Year + Month dropdowns. Value flows up to App → `workflowService`. Exports `getCurrentMonthValue()`. | — |
| `CustomSelect.js` | Shared | Styled dropdown used in CAC filters. | — |

### Services

| File | Role |
|------|------|
| `services/workflowService.js` | Centralizes all ~30 workflow API calls (keyed by UUID in `WORKFLOW_IDS`). Injects the selected month (`YYYY-MM` → `Mon-YYYY`) into every request payload via shared module state (`setSelectedWorkflowMonth`). |
| `services/tokenService.js` | JWT storage in session storage, validity checks, and 14-minute auto-refresh interval. |

---

## High-level user flow

```
                          ┌──────────────────────────────────────┐
                          │  SIDEBAR (always visible)             │
                          │  • Overview   • Measure Detail   • CAC │
                          └──────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┼──────────────────────────────┐
         ▼                             ▼                              ▼
┌──────────────────┐         ┌───────────────────┐         ┌────────────────────┐
│   DASHBOARD      │         │  MEASURE DETAIL   │         │ CARE ACTION CENTER │
│  (Overview)      │         │  (Deep Dive)      │         │      (CAC)         │
├──────────────────┤         ├───────────────────┤         ├────────────────────┤
│ MonthFilter      │         │ Perf section:     │         │ KPI cards          │
│ 3 KPI tabs ──────┤         │  EOC/ECDS/AAC/URU │         │ Filters (measure,  │
│  filter table    │         │  pills + mini-chart│        │   status, CRSP)    │
│ Measure table    │         │ Stratification:   │         │ Member table       │
│  └ "Deep Dive →" ─┼────────▶│  Age / Race /     │         │  └ "View Details"  │
│ Insight cards:   │  (passes │  Ethnicity / CRSP │         │      → modal       │
│  • Lowest perf ──┼─measureId)  each: cards →   │         │   (assign staff,   │
│  • CRSPs ────────┼────────▶│   table → CRSP →   │         │    action, notes,  │
│  • Equity alerts │         │   member drilldown│         │    Save)           │
└──────────────────┘         │   (+ CSV export)  │         └────────────────────┘
                             │                   │
                             │ Row "Care Action  │
                             │  Center →" ───────┼──────────────▶ (to CAC)
                             │ "Simulate" ───────┼──▶ Rate Simulator ✗ broken
                             └───────────────────┘
```

### Flow narrative

1. **Sidebar** has three working entries: Overview, Measure Detail, Care Action Center.
2. **Dashboard** → click a KPI tab to filter the measure table → **"Deep Dive →"** on a row (or click an insight card) passes the `measure_id` to **Measure Detail**.
3. **Measure Detail** → pick a measure pill, then drill: stratification card → table row → CRSP row → member drilldown (with CSV export). A row's **"Care Action Center →"** link jumps to CAC.
4. **Care Action Center** → filter the worklist → **"View Details"** opens a modal to assign staff / set action type / add notes / Save.

---

## Data layer (under everything)

Every page calls `workflowService.js`, which POSTs to the Lumenore Workflow API with:
- the **JWT** (from `tokenService.js`), and
- the **selected month** injected from shared module state.

On any API failure, each page **falls back to mock data**, so the UI always renders.

### MonthFilter — the one cross-cutting control

- Lives in **App's** state (`selectedMonth`).
- Synced into `workflowService` during render (`setSelectedWorkflowMonth`), so every workflow request picks it up.
- Changing the month refetches Dashboard, Measure Detail, and the mini-chart **in lockstep**.
- On load, App calls the `AVAILABLE_MONTHS` workflow and **snaps to the newest month that has data**.

---

## Known issues / observations

1. **Rate Simulator route is broken.** `MeasureDetail.js` calls `onNavigate('rateSimulator', …)`, but `App.js` only renders for `currentPage === 'sim'`. The strings don't match, so the "Simulate" button does nothing.
2. **Provider Scores is unreachable.** It's wired in `App.js` as `'prov'`, but nothing in the sidebar or any page navigates there.
3. Both **Rate Simulator** and **Provider Scores** are still **placeholder pages on hardcoded data**.
4. **Hardcoded fallback JWT** in `App.js` is expired; live workflow data may fail until a fresh token is supplied (the UI shell still renders via mock fallbacks).

---

## Flow validation (persona / UX / problem-statement lenses)

Graded against the platform's own core loop: **measure → find the gap → act → improve.** All findings are traced from the code.

### 1. Problem-statement lens

> *Stated problem: quality data is unreadable; staff need to find care gaps and act on them to close them.*

| Loop stage | Delivered? | Evidence |
|------------|-----------|----------|
| **Measure** | ✅ Strong | Dashboard KPIs + measure table + monthly trend. |
| **Find the gap** | ✅ Strong | Measure Detail drills measure → age/race/ethnicity → CRSP → individual members, with CSV export. |
| **Act** | ❌ Broken | `CareActionCenter.handleSaveAction()` is a `// TODO: Send to backend API` — it just closes the modal. Assignments/actions are **never persisted**. |
| **Improve** | ❌ Missing | No feedback loop connecting an action taken to a gap later closing. Month-over-month comparison exists, but no "did my outreach work?" signal. |

**Verdict:** Excellent at the *diagnostic* half (measure + find), effectively **non-functional at the action half**. Today it is a strong **reporting tool**, not yet the **workflow tool** its name ("Care *Action* Center") implies. Most important finding.

### 2. Persona lens

| Persona | Served? | Reality in the code |
|---------|---------|---------------------|
| **Quality / HEDIS manager** | ✅ Well | Dashboard → Deep Dive is coherent and complete. |
| **Equity / population-health analyst** | 🟡 Mostly | Stratification + disparity flags are strong. But the **Equity Alerts** card is read-only — its items aren't clickable (unlike the other two insight cards), so no jump into the measure. |
| **Care coordinator / outreach staff** | ❌ Underserved | The action loop is *for* them, yet **Save Action does nothing** and 2 of 4 CAC filters (Status, Assigned staff) are decorative (`onChange={() => {}}`). They can't save work or filter their queue by status/owner. |
| **Provider / clinic leadership** | ❌ Unserved | `ProviderScores` is mock data **and unreachable**. |

**Verdict:** Built around the **manager/analyst who views** data; the **coordinator who does the work** hits dead ends. Personas degrade as you move from viewing to acting.

### 3. UX lens

**Broken / misleading affordances (highest severity):**
- **Dead "Simulate" button** — `onNavigate('rateSimulator')` never matches the `'sim'` route.
- **Decorative filters** in CAC look functional but do nothing — erodes trust.
- **Silent Save** — modal closes with no success/error feedback; user believes they saved when nothing happened.

**Flow & continuity gaps:**
- **No URL routing** — can't bookmark/share a measure or refresh without losing place.
- **"Back to Overview" always returns to Dashboard**, even when CAC was reached from Measure Detail — drill-down context is lost.
- **MonthFilter missing on Care Action Center** — Dashboard and Measure Detail are month-scoped; the action page isn't. Inconsistent model.

**Smaller friction:**
- **"Loading…" that never ends** — insight cards key off `length > 0`, so a genuinely empty result shows "Loading…" forever (loading vs. empty indistinguishable).
- **Whole-sidebar-toggles-on-click** — clicking anywhere in the sidebar collapses it; easy accidental collapse.

**Verdict:** The happy path (Overview → Deep Dive) is polished. UX weakens at the **edges and the action layer** — broken routes, fake filters, no-feedback saves, lost context on navigation.

### Bottom line & prioritized fixes

Strong as an **analytics** product, incomplete as a **workflow** product. It nails *measure* and *find*; the loop the platform is named for — *act → improve* — is currently a demo shell. Highest-leverage fixes, in order:

1. **Wire up "Save Action"** to a real backend (unblocks the coordinator persona + the action loop).
2. **Make the two fake CAC filters real**, or remove them.
3. **Fix the Simulate route**; surface or hide Provider Scores.
4. **Add a closure/feedback signal** so users see gaps move after they act.
5. Add **URL routing** + a month filter on CAC for continuity.
