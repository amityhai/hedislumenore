import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './MemberWorklist.css';
import { Skeleton, EmptyState, ErrorState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import AssignPanel, { UNASSIGNED } from './AssignPanel';
import {
  fetchMemberDetails,
  fetchRaceMemberDetails,
  fetchEthnicityMemberDetails,
  fetchCRSPMemberDetails,
  fetchMeasureStratification,
  fetchMeasureStratificationRace,
  fetchMeasureStratificationEthnicity,
} from '../../services/workflowService';
import { num, shortId, statusFor, STATUS_TONE, sampleEquity, sampleMembers, STAFF, INTERVENTIONS, stratumRead, worklistRead, addAssignment, activePlaysForMember, ASSIGNMENTS_EVENT } from './v2utils';
import { Signals } from './OverviewExplore';

const toneFor = (rate, goal) => STATUS_TONE[statusFor(rate, goal)] || 'below';

const EQUITY_DIMS = [
  { key: 'age', title: 'AGE' },
  { key: 'race', title: 'RACE' },
  { key: 'ethnicity', title: 'ETHNICITY' },
];

const PAGE_SIZE = 12;

// Non-compliant = an open care gap (no qualifying service this period). We treat
// a member as compliant only when the source data explicitly says so.
const isCompliant = (m) => {
  if (typeof m.compliant === 'boolean') return m.compliant;
  const s = String(m.status ?? m.priority ?? '').toLowerCase();
  if (/non|open|gap|incomplete|^0$|false/.test(s)) return false;
  if (/compl|met|closed|^1$|true/.test(s)) return true;
  return !!m.source && m.source !== '-';
};

const normalize = (m, fallbackCrsp) => ({
  memberId: m.memberId,
  memberName: m.memberName,
  age: m.age,
  crsp: m.crsp && m.crsp !== 'NO CRSP' ? m.crsp : (fallbackCrsp || m.crsp || '—'),
  compliant: isCompliant(m),
});

const MemberWorklist = ({ token, selectedMonth, measure, provider, strat, onAnalyzeProvider, onOpenMember }) => {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [ncOnly, setNcOnly] = useState(false);     // show only non-compliant
  const [assigned, setAssigned] = useState({});   // memberId -> staff name
  const [modalMembers, setModalMembers] = useState(null); // null | [member] — the set the assign modal is for
  const [selectedIds, setSelectedIds] = useState(() => new Set()); // scenario 3: hand-picked subset
  const [assignState, setAssignState] = useState(null); // null | { intervention? } — provider-wide / stratum assign
  // Equity segment is an in-place filter, not a navigation: picking a stratum
  // narrows the member list below without leaving the page. `pickedStrat` holds
  // the active chip; it composes with the `strat` prop (a stratum this worklist
  // was opened on already) — the prop wins, and the segment card is hidden then.
  const [pickedStrat, setPickedStrat] = useState(null);
  // Bumped whenever the assignment store changes so the per-member coverage
  // badges re-resolve without prop plumbing — the same broadcast the tracking
  // board and action chips listen on.
  const [storeVer, setStoreVer] = useState(0);
  useEffect(() => {
    const bump = () => setStoreVer((v) => v + 1);
    window.addEventListener(ASSIGNMENTS_EVENT, bump);
    window.addEventListener('storage', bump);
    return () => { window.removeEventListener(ASSIGNMENTS_EVENT, bump); window.removeEventListener('storage', bump); };
  }, []);

  const measureId = measure?.measure_id;
  const providerCrsp = provider && !provider.overall ? provider.crsp : undefined;
  // On a provider (or all-provider) worklist that isn't already narrowed to a
  // stratum, offer an equity-segmentation card up top rather than dropping the
  // reader straight into a flat member list.
  const showSegment = !!provider && !strat;
  // The stratum actually driving the list: an in-page pick, or the prop it opened on.
  const effStrat = strat || pickedStrat;

  // A different provider/measure is a different population — drop any in-page pick.
  useEffect(() => { setPickedStrat(null); setPage(1); }, [measureId, providerCrsp]);

  // Equity strata power three things now: the segmentation card, the provider-wide
  // Assign panel, and the stratum-level insight read (which needs the sibling
  // strata to rank the active group). So fetch whenever there's a measure and
  // either a provider worklist or an already-picked stratum — not only when the
  // segment card is showing.
  const wantEquity = !!measureId && (!!provider || !!strat);
  const equityAsync = useAsync(async () => {
    if (!wantEquity) return null;
    try {
      const [a, r, e] = await Promise.all([
        fetchMeasureStratification(measureId, token),
        fetchMeasureStratificationRace(measureId, token),
        fetchMeasureStratificationEthnicity(measureId, token),
      ]);
      const age = a?.[measureId]?.age || [];
      const race = r?.[measureId]?.race || [];
      const ethnicity = e?.[measureId]?.ethnicity || [];
      if (age.length + race.length + ethnicity.length === 0) throw new Error('empty');
      return { age, race, ethnicity };
    } catch (err) { return sampleEquity(measureId); }
  }, [measureId, wantEquity, selectedMonth], { enabled: !!token && wantEquity });
  const equity = equityAsync.data || { age: [], race: [], ethnicity: [] };

  const { data, loading, error, refetch } = useAsync(async () => {
    try {
      let rows = [];
      if (effStrat?.type === 'age') rows = await fetchMemberDetails({ measureId, ageStrat: effStrat.group, crsp: providerCrsp }, token);
      else if (effStrat?.type === 'race') rows = await fetchRaceMemberDetails({ measureId, raceStrat: effStrat.group, crsp: providerCrsp }, token);
      else if (effStrat?.type === 'ethnicity') rows = await fetchEthnicityMemberDetails({ measureId, ethnicityStrat: effStrat.group, crsp: providerCrsp }, token);
      else rows = await fetchCRSPMemberDetails({ measureId, crsp: provider?.crsp }, token);
      if (!rows || rows.length === 0) throw new Error('empty');
      return { rows: rows.map((r) => normalize(r, providerCrsp)), sample: false };
    } catch (e) {
      return { rows: sampleMembers(20, providerCrsp).map((r) => normalize(r, providerCrsp)), sample: true };
    }
  }, [measureId, providerCrsp, effStrat?.type, effStrat?.group, selectedMonth], { enabled: !!token && !!measureId });

  const members = data?.rows || [];
  const nonCompliant = members.filter((m) => !m.compliant).length;
  const compliant = members.length - nonCompliant;

  // The header's intelligence read. With an equity stratum driving the list it's
  // that group's standing; with nothing picked it's the population the list is
  // actually showing — this provider (or all providers) on this measure. An
  // unfiltered list isn't a list with nothing to say, so the read is always
  // there and the header renders one component either way.
  const insight = useMemo(() => {
    const read = effStrat
      ? stratumRead(effStrat, equity[effStrat.type] || [], measure)
      : worklistRead(measure, provider, equity, { members: members.length, nonCompliant });
    if (!read) return null;
    return { read };
  }, [effStrat, equity, measure, provider, members.length, nonCompliant]);

  const shown = useMemo(() => (ncOnly ? members.filter((m) => !m.compliant) : members), [members, ncOnly]);
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageRows = useMemo(() => shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [shown, page]);
  const setFilter = (v) => { setNcOnly(v); setPage(1); };

  // Per-member coverage from the assignment store: for each row on the page, the
  // newest active play that already covers this member (if any). This is the
  // row-level counterpart to the assign panel's "will be skipped" count — same
  // source, resolved to member IDs instead of an estimate. Recomputes on paging,
  // filtering, and any store change (storeVer).
  const coverage = useMemo(() => {
    const map = {};
    pageRows.forEach((m) => {
      const plays = activePlaysForMember(m, measureId, providerCrsp);
      if (plays.length) map[m.memberId] = plays[0];
    });
    return map;
    // storeVer forces a re-resolve when the assignment store broadcasts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageRows, measureId, providerCrsp, storeVer]);

  // Context header metrics — reflect the effective stratum so the header follows
  // an in-page equity filter, not just the stratum this worklist opened on.
  // A provider carried across a measure switch arrives as an identity only —
  // its rate and goal belong to the measure it came from and are being
  // re-resolved. Falling through to the measure's own numbers here would print
  // the network rate under the provider's name, so hold the metrics instead.
  const providerPending = !!provider?._stale;
  const rate = num(effStrat?.rate ?? provider?.rate ?? measure?.rate);
  const goal = num(effStrat?.goal ?? provider?.goal ?? measure?.goal_50th);
  const delta = Math.round((rate - goal) * 10) / 10;
  const tone = STATUS_TONE[statusFor(rate, goal)] || 'below';
  const title = effStrat?.group || (provider && !provider.overall ? provider.crsp : null) || measure?.display_name || 'Members';
  const providerName = provider ? (provider.overall ? 'All providers (Overall)' : provider.crsp) : null;
  const hasRead = !!insight;

  // Selection (scenario 3): pick a subset of a group and drop the rest. Persists
  // across pagination, so you can gather members from several pages, but resets
  // when the underlying list changes (a different measure/provider/stratum/filter
  // is a different population — carrying a stale selection into it would assign
  // members the reader can no longer see).
  useEffect(() => { setSelectedIds(new Set()); }, [measureId, providerCrsp, effStrat?.type, effStrat?.group, ncOnly]);
  const toggleSelect = (id) => setSelectedIds((cur) => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const shownIds = useMemo(() => shown.map((m) => m.memberId), [shown]);
  const allShownSelected = shownIds.length > 0 && shownIds.every((id) => selectedIds.has(id));
  const toggleSelectAllShown = () => setSelectedIds((cur) => {
    if (shownIds.every((id) => cur.has(id))) {
      const next = new Set(cur); shownIds.forEach((id) => next.delete(id)); return next;
    }
    return new Set([...cur, ...shownIds]);
  });
  const selectedMembers = useMemo(() => shown.filter((m) => selectedIds.has(m.memberId)), [shown, selectedIds]);

  // Assign to a set of hand-picked members (scenario 3) or a single row. Records
  // one assignment with an explicit member target — an explicit set never grows,
  // so unlike a stratum play a member who arrives later is NOT swept in.
  const saveAssignment = ({ members: mems, staff, intervention, notes }) => {
    const list = mems && mems.length ? mems : [];
    if (!list.length) return;
    setAssigned((a) => { const n = { ...a }; list.forEach((m) => { n[m.memberId] = staff; }); return n; });
    setModalMembers(null);
    setSelectedIds(new Set());
    addAssignment({
      measureId,
      measureName: measure?.display_name,
      level: provider && !provider.overall ? 'provider' : 'measure',
      crsp: providerCrsp || null,
      target: {
        kind: 'members',
        memberIds: list.map((m) => m.memberId),
        label: list.length === 1 ? list[0].memberName : `${list.length} selected members${effStrat ? ` · ${effStrat.group}` : ''}`,
      },
      intervention, assignedTo: staff, why: notes, coverEstimate: list.length,
    });
    toast({ type: 'success', message: `${intervention} assigned to ${staff} · ${list.length} ${list.length === 1 ? 'member' : 'members'}` });
  };

  return (
    <div className="mwl">
      {/* Context header — who/what this list is, its numbers, and its intelligence
          read, all in one card. The read used to be a second card below; it named
          the same group, rate and goal the header already states, so it now hangs
          off the header it belongs to. The identity strip stays one line: title,
          disparity flag, provider, metrics. */}
      <div className={`mwl-head mwl-head-${tone} ${hasRead ? 'has-read' : ''} ${insight?.read.isDisparity ? 'is-disparity' : ''}`}>
        <div className="mwl-head-main">
          <div className="mwl-head-left">
            <div className="mwl-head-titlerow">
              <h2 className="mwl-head-title">{title}</h2>
              {insight?.read.isDisparity && <span className="mwl-head-flag mono">WIDEST DISPARITY</span>}
              {/* No rate badge — the Rate metric on the right already states it.
                  The measure is named explicitly: the title is the provider (or
                  the stratum), so without this the page never says which measure
                  these members are non-compliant on. */}
              {measure?.display_name && title !== measure.display_name && (
                <span className="mwl-head-measure">
                  Measure · <strong>{measure.display_name}</strong>
                  <span className="mwl-head-mid mono">{shortId(measure.measure_id)}</span>
                </span>
              )}
              {providerName && <span className="mwl-head-provider">Provider · <strong>{providerName}</strong></span>}
            </div>
            {/* Assign the play and Analyze the provider are the two moves off this
                header — they sit together here (the read no longer carries a CTA). */}
            {(provider || hasRead) && (
              <div className="mwl-head-actions">
                <button type="button" className="btn btn-assign btn-sm"
                  onClick={() => setAssignState({})}>
                  Assign intervention
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
                {provider && !provider.overall && onAnalyzeProvider && (
                  <button type="button" className="btn btn-tonal btn-sm"
                    onClick={() => onAnalyzeProvider(measure, provider)}>
                    Analyze provider
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="mwl-head-metrics">
            <div><span className="mwl-mk">Rate</span><span className="mwl-mv num">{providerPending ? '—' : `${rate}%`}</span></div>
            <div><span className="mwl-mk">Goal</span><span className="mwl-mv num">{providerPending ? '—' : `${goal}%`}</span></div>
            <div><span className="mwl-mk">Delta</span><span className={`mwl-mv num ${delta < 0 ? 'is-neg' : 'is-pos'}`}>{providerPending ? '—' : `${delta >= 0 ? '+' : ''}${delta} pts`}</span></div>
            <div className="mwl-msep" />
            <div><span className="mwl-mk">Members</span><span className="mwl-mv num">{loading ? '—' : members.length}</span></div>
            <div><span className="mwl-mk">Non-comp.</span><span className="mwl-mv num is-neg">{loading ? '—' : nonCompliant}</span></div>
            <div><span className="mwl-mk">Compliant</span><span className="mwl-mv num is-pos">{loading ? '—' : compliant}</span></div>
          </div>
        </div>

        {/* The read — the active equity group's when one is filtering, otherwise
            the provider/measure population the list is showing. */}
        {hasRead && (
          <HeadRead insight={insight} loading={loading || equityAsync.loading} />
        )}
      </div>

      {/* Equity segmentation — segregate this provider's members by stratum
          instead of dropping straight into a flat list. */}
      {showSegment && (
        <EquitySegment equity={equity} loading={equityAsync.loading} measureGoal={goal}
          selected={pickedStrat}
          onPick={(dim, g) => {
            const pick = { type: dim, ...g, goal: num(g.goal ?? goal) };
            // Toggle: re-picking the active stratum clears the filter.
            setPickedStrat((cur) => (cur && cur.type === dim && cur.group === g.group ? null : pick));
            setPage(1);
          }}
          onClear={() => { setPickedStrat(null); setPage(1); }} />
      )}

      {/* Table */}
      <div className="mwl-card">
        {error ? (
          <ErrorState message="Couldn't load members." onRetry={refetch} />
        ) : loading ? (
          <div className="mwl-loading">{[...Array(8)].map((_, i) => <Skeleton key={i} height={20} style={{ marginBottom: 14 }} />)}</div>
        ) : members.length === 0 ? (
          <EmptyState icon="🎉" title="No members" hint="Nothing to work in this group." />
        ) : (
          <>
            <div className="mwl-toolbar">
              <button type="button" className={`mwl-filter ${ncOnly ? 'is-active' : ''}`} onClick={() => setFilter(!ncOnly)}>
                <span className="mwl-filter-dot" aria-hidden="true" />
                Non-compliant only
                <span className="mwl-filter-count num">{nonCompliant}</span>
              </button>
              {ncOnly && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilter(false)}>Clear ✕</button>
              )}
              <span className="mwl-toolbar-count num">{shown.length} of {members.length} shown</span>
            </div>

            {/* Scenario 3 — pick a subset and assign only those, dropping the
                rest. The bar appears once anything is checked. */}
            {selectedIds.size > 0 && (
              <div className="mwl-bulkbar" role="region" aria-label="Selection actions">
                <span className="mwl-bulk-count"><strong className="num">{selectedIds.size}</strong> selected</span>
                <div className="mwl-bulk-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>Clear</button>
                  <button type="button" className="btn btn-assign btn-sm" onClick={() => setModalMembers(selectedMembers)}>
                    Assign selected ({selectedIds.size})
                  </button>
                </div>
              </div>
            )}
            {shown.length === 0 ? (
              <EmptyState icon="✅" title="No non-compliant members" hint="Everyone in this group is compliant." />
            ) : (
            <>
            <div className="mwl-table" role="table">
              <div className="mwl-row mwl-row-head" role="row">
                <span className="mwl-idcell">
                  <input type="checkbox" className="mwl-check" aria-label="Select all shown"
                    checked={allShownSelected} onChange={toggleSelectAllShown} />
                  Member ID
                </span>
                <span>Name</span><span className="ta-r">Age</span>
                <span>Provider (CRSP)</span><span>Status</span><span>Assigned to</span><span className="ta-r">Action</span>
              </div>
              {pageRows.map((m, i) => {
                const play = coverage[m.memberId];
                // Assignee: this session's pick wins for immediacy, else the play's.
                const who = assigned[m.memberId] || play?.assignedTo;
                const covered = !!play;
                return (
                  <div className={`mwl-row mwl-row-data ${!m.compliant ? 'is-gap' : ''} ${selectedIds.has(m.memberId) ? 'is-picked' : ''} ${covered ? 'is-covered' : ''}`} role="row" key={`${m.memberId}-${i}`} style={{ animationDelay: `${i * 20}ms` }}>
                    <span className="mwl-idcell">
                      <input type="checkbox" className="mwl-check" aria-label={`Select ${m.memberName}`}
                        checked={selectedIds.has(m.memberId)} onChange={() => toggleSelect(m.memberId)} />
                      <span className="mwl-id mono">{m.memberId}</span>
                    </span>
                    <span className="mwl-name">{m.memberName}</span>
                    <span className="ta-r num">{m.age}</span>
                    <span className="mwl-crsp">{m.crsp}</span>
                    <span className={`mwl-status ${m.compliant ? 'is-ok' : 'is-gap'}`}>
                      <span aria-hidden="true">{m.compliant ? '✓' : '✕'}</span> {m.compliant ? 'Compliant' : 'Non-compliant'}
                    </span>
                    <span>
                      {covered ? (
                        <span className="mwl-play" title={`${play.intervention || 'Intervention'}${who ? ` · ${who}` : ''}${play.label ? ` · ${play.label}` : ''}`}>
                          <span className="mwl-play-dot" aria-hidden="true" />
                          <span className="mwl-play-text">
                            <span className="mwl-play-tag">In active play</span>
                            {play.intervention && <span className="mwl-play-sub">{play.intervention}</span>}
                          </span>
                        </span>
                      ) : who ? (
                        <span className="mwl-assigned">{who}</span>
                      ) : (
                        <span className="mwl-unassigned">Unassigned</span>
                      )}
                    </span>
                    <span className="ta-r mwl-row-actions">
                      <button type="button" className="btn btn-assign btn-sm" onClick={() => setModalMembers([m])}>
                        {covered || who ? 'Reassign' : 'Assign'}
                      </button>
                      {onOpenMember && (
                        <button type="button" className="btn btn-tonal btn-sm" onClick={() => onOpenMember(m)}>
                          Open 360
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mwl-pager">
                <button type="button" className="btn btn-secondary btn-icon btn-sm" aria-label="Previous page"
                  disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
                <span className="mwl-pg-info num">{page} / {totalPages}</span>
                <button type="button" className="btn btn-secondary btn-icon btn-sm" aria-label="Next page"
                  disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
              </div>
            )}
            </>
            )}
          </>
        )}
      </div>

      {data?.sample && !loading && <div className="mwl-sample">Showing sample data — live workflow unavailable.</div>}

      {/* Portaled to <body> so the fixed overlay isn't trapped by an ancestor's
          stacking/transform context (it would otherwise dim only the content card). */}
      {modalMembers && createPortal(
        <AssignModal members={modalMembers} providerName={providerName}
          current={modalMembers.length === 1 ? assigned[modalMembers[0].memberId] : null}
          onClose={() => setModalMembers(null)} onSave={saveAssignment} />,
        document.body
      )}

      {/* Assign, launched from the header (provider-wide) or a stratum's
          Recommended-action button (seeded with that play). Scoped to this
          provider when there is one, else measure-wide; equity is the same
          measure-level set the segmentation card uses. */}
      {assignState && measure && createPortal(
        <AssignPanel measure={measure}
          token={token} selectedMonth={selectedMonth}
          providers={provider ? (provider.overall ? [] : [provider]) : []}
          equity={equity}
          scope={{
            ...(provider && !provider.overall ? { level: 'provider', provider } : { level: 'measure' }),
            intervention: assignState.intervention,
          }}
          onClose={() => setAssignState(null)}
          onAssign={(payload) => {
            setAssignState(null);
            const where = provider && !provider.overall ? provider.crsp : 'all providers';
            toast({ type: 'success', message: `${payload.preview.created.toLocaleString()} tasks queued for ${where} · ${payload.assignedTo === UNASSIGNED ? 'unassigned pool' : payload.assignedTo}` });
          }} />,
        document.body
      )}
    </div>
  );
};

// ── Equity segmentation card ─────────────────────────────────
// Sits above the member list on a provider worklist and acts as an in-place
// FILTER: picking a stratum narrows the member list below (scoped to the
// provider by the member fetch) without leaving the page; re-picking it clears.
// Each stratum is a color-coded chip. Reads all strata — the equity picture is a
// comparison, so nothing is hidden.
const EquitySegment = ({ equity, loading, measureGoal, selected, onPick, onClear }) => {
  const dims = EQUITY_DIMS.filter((d) => (equity[d.key] || []).length > 0);
  // Collapsed by default — the strata chips are an opt-in drill, so the header
  // stays a one-line affordance until the reader opens it. An active filter forces
  // it open so the current stratum (and its chips) are always in view.
  const [open, setOpen] = useState(!!selected);
  const expanded = open || !!selected;
  return (
    <div className={`mwl-segment ${selected ? 'is-filtering' : ''} ${expanded ? 'is-open' : ''}`}>
      <div className="mwl-segment-head">
        <button type="button" className="mwl-segment-toggle" aria-expanded={expanded}
          onClick={() => setOpen((o) => !o)}>
          <span className={`mwl-segment-chev ${expanded ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
          <span className="mwl-segment-title">Filter by equity</span>
        </button>
        <span className="mwl-segment-sub">
          {selected ? <>Showing <strong>{selected.group}</strong> · the list below is filtered</> : 'Pick a stratum to narrow the list below'}
        </span>
        {selected && (
          <button type="button" className="mwl-segment-clear" onClick={onClear}>Clear filter ✕</button>
        )}
      </div>
      {!expanded ? null : loading ? (
        <div className="mwl-segment-loading">{[...Array(3)].map((_, i) => <Skeleton key={i} height={30} width={120} radius={9999} />)}</div>
      ) : dims.length === 0 ? (
        <div className="mwl-segment-empty">No equity strata for this measure.</div>
      ) : (
        dims.map((d) => (
          <div key={d.key} className="mwl-segment-dim">
            <span className="mwl-segment-dimlabel mono">{d.title}</span>
            <div className="mwl-segment-chips">
              {(equity[d.key] || []).slice().sort((a, b) => num(a.rate) - num(b.rate)).map((g, i) => {
                const gGoal = num(g.goal ?? measureGoal);
                const active = selected && selected.type === d.key && selected.group === g.group;
                return (
                  <button key={i} type="button" aria-pressed={!!active}
                    className={`mwl-segment-chip mwl-segment-chip-${toneFor(g.rate, gGoal)} ${active ? 'is-active' : ''}`}
                    onClick={() => onPick(d.key, g)}>
                    <span className={`mwl-segment-dot mwl-segment-dot-${toneFor(g.rate, gGoal)}`} aria-hidden="true" />
                    <span className="mwl-segment-name">{g.group}</span>
                    <span className="mwl-segment-rate num">{num(g.rate)}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ── Header read ──────────────────────────────────────────────
// Carries the same Standing read the Overview gives a measure, framed for
// whatever the list is scoped to — an equity stratum when one is filtering,
// otherwise the provider/measure population itself. Reuses the Overview's
// Signals and tag styling so it reads identically across surfaces.
//
// Rendered INSIDE the context header card: it carries no card chrome and no
// eyebrow of its own — the header it sits in already names and rates the
// population. The assign CTA sits in its foot, so the list can be worked
// straight from the read.
const HeadRead = ({ insight, loading }) => {
  const { read } = insight;
  if (loading) return <div className="mwl-read"><Skeleton height={64} radius={10} /></div>;
  return (
    <div className="mwl-read">
      <section className="mwl-read-col">
        <div className="mwl-read-top">
          <span className="eyebrow">Standing</span>
        </div>
        <p className="mwl-read-lead">{read.synthesis}</p>
        <Signals items={read.signals} />
        <div className="mwl-read-foot">
          <p className="ov2-read-why mono">{read.confidence.why}</p>
        </div>
      </section>
    </div>
  );
};

// ── Assign-intervention modal ────────────────────────────────
// Takes a member SET (one row, or a hand-picked selection). One member shows the
// member card; several show a count and a short preview, so the reader can see
// exactly who the play lands on before committing.
const AssignModal = ({ members, providerName, current, onClose, onSave }) => {
  const [staff, setStaff] = useState(current || STAFF[0]);
  const [intervention, setIntervention] = useState(INTERVENTIONS[0]);
  const [notes, setNotes] = useState('');
  const single = members.length === 1;

  return (
    <div className="mwl-modal-scrim" onClick={onClose}>
      <div className="mwl-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Assign intervention">
        <div className="mwl-modal-head">
          <h3>Assign intervention</h3>
          <button type="button" className="mwl-modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {single ? (
          <div className="mwl-modal-member">
            <span className="mwl-name">{members[0].memberName}</span>
            <span className="mwl-id mono">{members[0].memberId}</span>
            {providerName && <span className="mwl-modal-prov">{providerName}</span>}
          </div>
        ) : (
          <div className="mwl-modal-set">
            <div className="mwl-modal-set-head">
              <strong className="num">{members.length}</strong> members selected
              {providerName && <span className="mwl-modal-prov">{providerName}</span>}
            </div>
            <ul className="mwl-modal-set-list">
              {members.slice(0, 6).map((m) => (
                <li key={m.memberId}><span className="mwl-id mono">{m.memberId}</span> {m.memberName}</li>
              ))}
              {members.length > 6 && <li className="mwl-modal-set-more">+{members.length - 6} more</li>}
            </ul>
          </div>
        )}

        <label className="mwl-field">
          <span>Intervention</span>
          <select value={intervention} onChange={(e) => setIntervention(e.target.value)}>
            {INTERVENTIONS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="mwl-field">
          <span>Assign to</span>
          <select value={staff} onChange={(e) => setStaff(e.target.value)}>
            {STAFF.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="mwl-field">
          <span>Notes <em>(optional)</em></span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context for the assignee…" />
        </label>

        <div className="mwl-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-assign" onClick={() => onSave({ members, staff, intervention, notes })}>
            {single ? 'Assign' : `Assign ${members.length}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberWorklist;
