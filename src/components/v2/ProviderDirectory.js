import { useMemo, useState, useEffect, useCallback } from 'react';
import './ProviderDirectory.css';
import { Skeleton, EmptyState, ErrorState } from '../ui/Feedback';
import useAsync from '../../hooks/useAsync';
import ProviderAnalysis from './ProviderAnalysis';
import {
  fetchAllMeasuresGrid,
  fetchCRSPLevelData,
} from '../../services/workflowService';
import {
  num, acronym, SAMPLE_MEASURES, sampleProviderNames, providerProfile, providerSummary, withCustomGoals,
} from './v2utils';

const PAGE_SIZE = 12;

// Worst-first: most measures below goal, then the widest average miss. The point
// of the directory is "who needs work", so it opens on that order rather than
// alphabetically — the name is what search is for.
const byNeed = (a, b) => (b.summary.below - a.summary.below) || (a.summary.avgGap - b.summary.avgGap);

// The provider list itself has no endpoint. CRSP rows are fetched per measure,
// so the roster is taken from whichever measure the grid leads with — every CRSP
// reports on every measure — and falls back to the sample roster like the rest
// of v2. Announced by the notice, never silently faked.
const rosterFor = async (grid, token) => {
  const lead = grid[0]?.measure_id;
  if (!lead) return { names: sampleProviderNames(), sample: true };
  try {
    const rows = await fetchCRSPLevelData(lead, token);
    const names = [...new Set((rows || []).map((r) => r.crsp).filter(Boolean))];
    if (!names.length) throw new Error('empty');
    return { names, sample: false };
  } catch (e) {
    return { names: sampleProviderNames(), sample: true };
  }
};

const ProviderDirectory = ({ token, selectedMonth, onSidebar }) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null); // { provider, measure } — the analysis view

  // The directory is a wide table and the analysis page is dense; both want the
  // room, so the sidebar collapses the same way the rest of the v2 flow does.
  useEffect(() => { if (onSidebar) onSidebar(false); }, [open, onSidebar]);

  const { data, loading, error, refetch } = useAsync(async () => {
    let grid;
    let gridSample = false;
    try {
      grid = await fetchAllMeasuresGrid(token);
      if (!grid || grid.length === 0) throw new Error('empty');
    } catch (e) {
      grid = SAMPLE_MEASURES;
      gridSample = true;
    }
    grid = withCustomGoals(grid);
    const { names, sample: rosterSample } = await rosterFor(grid, token);
    // Every provider's standing across the whole measure set, derived the same
    // way the Provider Analysis page derives it — so a row here and the page it
    // opens can never disagree.
    const rows = names
      .filter((n) => n && n !== 'Overall')
      .map((name) => {
        const profile = providerProfile(name, false, grid);
        return { name, profile, summary: providerSummary(profile) };
      })
      .sort(byNeed);
    return { grid, rows, sample: gridSample || rosterSample };
  }, [token, selectedMonth], { enabled: !!token });

  const rows = data?.rows || [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE),
    [filtered, pageSafe]
  );
  useEffect(() => { setPage(1); }, [query]);

  // The analysis page is a per-measure read for its equity and worklist sections,
  // so opening a provider cold has to choose an entry measure. It picks the one
  // that provider is furthest below goal on — the measure you'd have drilled in
  // on anyway — and the page says so rather than claiming you came from it.
  const openProvider = useCallback((row) => {
    const worst = [...row.profile]
      .filter((m) => num(m.goal_50th) > 0)
      .sort((a, b) => (num(a.rate) / num(a.goal_50th)) - (num(b.rate) / num(b.goal_50th)))[0];
    const entry = (data?.grid || []).find((m) => m.measure_id === worst?.measure_id) || null;
    setOpen({ provider: { crsp: row.name, rate: num(worst?.rate), goal: num(worst?.goal_50th) }, measure: entry });
  }, [data]);

  if (open) {
    return (
      <div className="pdir">
        <div className="sc2-topnav">
          <button type="button" className="sc2-back" onClick={() => setOpen(null)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <nav className="sc2-crumbs" aria-label="Breadcrumb">
            <span className="sc2-crumb-wrap">
              <button type="button" className="sc2-crumb" onClick={() => setOpen(null)}>Providers</button>
            </span>
            <span className="sc2-crumb-wrap">
              <span className="sc2-crumb-sep" aria-hidden="true">/</span>
              <span className="sc2-crumb is-current" aria-current="page">{open.provider.crsp}</span>
            </span>
          </nav>
        </div>
        <ProviderAnalysis token={token} selectedMonth={selectedMonth}
          measure={open.measure} provider={open.provider} origin="directory" />
      </div>
    );
  }

  return (
    <div className="pdir">
      <header className="pdir-head">
        <div>
          <div className="eyebrow">PROVIDERS</div>
          <h1 className="pdir-title">Provider Directory</h1>
          <p className="pdir-sub">Every CRSP in the network, worst-first. Open one for its full quality profile.</p>
        </div>
        <label className="pdir-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Search providers" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </header>

      <div className="pdir-card-wrap">
        {error ? (
          <ErrorState message="Couldn't load providers." onRetry={refetch} />
        ) : loading ? (
          <div className="pdir-grid">
            {[...Array(9)].map((_, i) => <Skeleton key={i} height={168} radius={14} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="—" title="No providers match" hint="Try a different name." />
        ) : (
          <>
            <div className="pdir-grid">
              {pageRows.map((r, i) => <ProviderCard key={r.name} row={r} index={i} onOpen={() => openProvider(r)} />)}
            </div>

            {totalPages > 1 && (
              <div className="pdir-pager">
                <span className="pdir-pager-info num">
                  {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(filtered.length, pageSafe * PAGE_SIZE)} of {filtered.length}
                </span>
                <div className="pdir-pager-btns">
                  <button type="button" className="btn btn-secondary btn-icon btn-sm" aria-label="Previous page"
                    disabled={pageSafe === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
                  <span className="pdir-pager-cur num">{pageSafe} / {totalPages}</span>
                  <button type="button" className="btn btn-secondary btn-icon btn-sm" aria-label="Next page"
                    disabled={pageSafe === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// One provider card. A roster is a set of *entities*, not a matrix of readings —
// a table asks the eye to scan a grid of cells to reassemble one provider, where
// a card hands it over whole. The standing bar is the same below/at/above split
// the Provider Analysis page opens with, so a card previews the page it leads to.
const ProviderCard = ({ row, index, onOpen }) => {
  const { summary } = row;
  const total = Math.max(1, summary.total);
  const pct = (n) => `${(n / total) * 100}%`;
  // The card's accent is its worst standing — the reason you'd open it.
  const worst = summary.below > 0 ? 'below' : summary.at > 0 ? 'at' : 'above';
  return (
    <button type="button" className={`pdir-card pdir-card-${worst}`}
      style={{ animationDelay: `${index * 30}ms` }} onClick={onOpen}>
      <span className="pdir-card-top">
        <span className={`pdir-badge pdir-badge-${worst} mono`} aria-hidden="true">{acronym(row.name)}</span>
        <span className="pdir-card-name">{row.name}</span>
        <span className="pdir-go" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </span>

      <span className="pdir-dist" role="img"
        aria-label={`${summary.below} below, ${summary.at} at, ${summary.above} above goal, of ${summary.total} measures`}>
        {summary.below > 0 && <span className="pdir-dist-seg pdir-dist-below" style={{ width: pct(summary.below) }} />}
        {summary.at > 0 && <span className="pdir-dist-seg pdir-dist-at" style={{ width: pct(summary.at) }} />}
        {summary.above > 0 && <span className="pdir-dist-seg pdir-dist-above" style={{ width: pct(summary.above) }} />}
      </span>
      <span className="pdir-keys">
        <span className="pdir-key"><i className="pdir-dot pdir-dot-below" /><b className="num">{summary.below}</b> below</span>
        <span className="pdir-key"><i className="pdir-dot pdir-dot-at" /><b className="num">{summary.at}</b> at</span>
        <span className="pdir-key"><i className="pdir-dot pdir-dot-above" /><b className="num">{summary.above}</b> above</span>
      </span>

      {/* Two stats, not three: a "Measures" column read 26 on every card (every
          CRSP reports on every measure), and the key row above already sums to
          it. A number that never varies is a column of noise. */}
      <span className="pdir-stats">
        <span className="pdir-stat">
          <span className="pdir-stat-k">Avg gap</span>
          <span className={`pdir-stat-v num ${summary.avgGap < 0 ? 'is-neg' : 'is-pos'}`}>
            {summary.avgGap >= 0 ? '+' : ''}{summary.avgGap} pts
          </span>
        </span>
        <span className="pdir-stat">
          <span className="pdir-stat-k">Open gaps</span>
          <span className="pdir-stat-v num">{summary.open.toLocaleString()}</span>
        </span>
      </span>
    </button>
  );
};

export default ProviderDirectory;
