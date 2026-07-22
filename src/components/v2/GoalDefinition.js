import { useMemo, useState } from 'react';
import './GoalDefinition.css';
import MonthFilter from '../MonthFilter';
import { Skeleton, EmptyState, ErrorState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import { fetchAllMeasuresGrid } from '../../services/workflowService';
import {
  num, shortId, statusFor, STATUS_TONE, SAMPLE_MEASURES,
  readGoals, setMeasureGoal, clearAllGoals, priorYearRate,
} from './v2utils';

const STATUS_LABEL = { 'Below Goal': 'Below', 'At Goal': 'At goal', 'Above Goal': 'Above' };

// Worst-first, so the measures most in need of a target decision sort to the top.
const byWorstFirst = (a, b) => {
  const ga = num(a.goal_50th) || 100, gb = num(b.goal_50th) || 100;
  return (num(a.rate) / ga) - (num(b.rate) / gb);
};

const GoalDefinition = ({ token, selectedMonth, onMonthChange, availableMonths }) => {
  const toast = useToast();
  // The store is the source of truth; local state mirrors it so edits render
  // instantly (the status pill recomputes as you type).
  const [goals, setGoals] = useState(() => readGoals());
  const [query, setQuery] = useState('');

  // Raw grid — NOT run through withCustomGoals, because this screen needs the
  // untouched benchmark to show alongside the custom goal.
  const { data, loading, error, refetch } = useAsync(async () => {
    try {
      const grid = await fetchAllMeasuresGrid(token);
      if (!grid || grid.length === 0) throw new Error('empty');
      return { rows: grid, sample: false };
    } catch (e) { return { rows: SAMPLE_MEASURES, sample: true }; }
  }, [token, selectedMonth], { enabled: !!token });

  const rows = useMemo(() => {
    const seen = new Set();
    const list = (data?.rows || [])
      .filter((m) => m.measure_id && !seen.has(m.measure_id) && seen.add(m.measure_id))
      .sort(byWorstFirst);
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter((m) =>
      (m.display_name || '').toLowerCase().includes(q) || shortId(m.measure_id).toLowerCase().includes(q));
  }, [data, query]);

  const customCount = Object.keys(goals).length;

  const commit = (id, value) => {
    const saved = setMeasureGoal(id, value);
    setGoals(readGoals());
    return saved;
  };
  const resetOne = (id) => { commit(id, null); };
  const resetAll = () => {
    clearAllGoals();
    setGoals({});
    toast({ type: 'success', message: 'All goals reset to benchmark' });
  };

  const effGoal = (m) => {
    const c = goals[m.measure_id];
    return typeof c === 'number' ? c : num(m.goal_50th);
  };

  return (
    <div className="gdf">
      <header className="gdf-head">
        <div className="gdf-head-left">
          <div className="eyebrow">GOALS</div>
          <h1 className="gdf-title">Goal Definition</h1>
          <p className="gdf-sub">
            Set your own target per measure. A custom goal <strong>replaces the 50th-percentile benchmark</strong> as
            the working target across the app — status bands, colours and gaps all follow it.
          </p>
        </div>
        <MonthFilter selectedMonth={selectedMonth} onMonthChange={onMonthChange} availableMonths={availableMonths} />
      </header>

      <div className="gdf-card">
        <div className="gdf-toolbar">
          <input type="search" className="gdf-search" placeholder="Search measures…"
            value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search measures" />
          <span className="gdf-count">
            {customCount > 0
              ? <><strong className="num">{customCount}</strong> custom {customCount === 1 ? 'goal' : 'goals'} set</>
              : 'No custom goals — every measure uses its benchmark'}
          </span>
          {customCount > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetAll}>Reset all to benchmark</button>
          )}
        </div>

        {error ? (
          <ErrorState message="Couldn't load measures." onRetry={refetch} />
        ) : loading ? (
          <div className="gdf-loading">{[...Array(8)].map((_, i) => <Skeleton key={i} height={44} radius={10} style={{ marginBottom: 8 }} />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon="🔍" title="No measures" hint="Nothing matches your search." />
        ) : (
          <div className="gdf-table" role="table">
            <div className="gdf-row gdf-row-head" role="row">
              <span>Measure</span>
              <span className="ta-r" title="No real prior-year feed — a stable indicative value">Prev. year <em>◦</em></span>
              <span className="ta-r">Current</span>
              <span className="ta-r">Benchmark</span>
              <span className="ta-r">Your goal</span>
              <span>Standing</span>
              <span aria-hidden="true" />
            </div>
            {rows.map((m) => {
              const rate = num(m.rate);
              const benchmark = num(m.goal_50th);
              const custom = goals[m.measure_id];
              const isCustom = typeof custom === 'number';
              const eff = isCustom ? custom : benchmark;
              const tone = STATUS_TONE[statusFor(rate, eff)] || 'below';
              const prev = priorYearRate(m.measure_id, rate);
              return (
                <div key={m.measure_id} className={`gdf-row gdf-row-data ${isCustom ? 'is-custom' : ''}`} role="row">
                  <span className="gdf-measure">
                    <span className="gdf-id mono">{shortId(m.measure_id)}</span>
                    <span className="gdf-name">{m.display_name}</span>
                  </span>
                  <span className="ta-r num gdf-muted">{prev}%</span>
                  <span className="ta-r num gdf-rate">{rate}%</span>
                  <span className="ta-r num gdf-muted">{benchmark}%</span>
                  <span className="ta-r gdf-goalcell">
                    <span className="gdf-input-wrap">
                      <input type="number" min="0" max="100" step="0.5" className="gdf-input"
                        value={isCustom ? custom : ''} placeholder={String(benchmark)}
                        aria-label={`Your goal for ${m.display_name}`}
                        onChange={(e) => commit(m.measure_id, e.target.value)} />
                      <span className="gdf-input-pct" aria-hidden="true">%</span>
                    </span>
                    {isCustom && <span className="gdf-tag">custom</span>}
                  </span>
                  <span className={`gdf-standing gdf-standing-${tone}`}>
                    <span className={`gdf-dot gdf-dot-${tone}`} aria-hidden="true" />
                    {STATUS_LABEL[statusFor(rate, eff)]}
                  </span>
                  <span className="ta-r">
                    {isCustom && (
                      <button type="button" className="gdf-reset" onClick={() => resetOne(m.measure_id)}>Reset</button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {data?.sample && !loading && (
          <p className="gdf-note mono">Showing sample measures — live workflow unavailable. Goals you set are still saved locally.</p>
        )}
        <p className="gdf-note mono">
          <span className="gdf-note-mark">◦</span> Previous-year values are indicative — there is no live prior-year feed yet, so a stable per-measure estimate is shown.
        </p>
      </div>
    </div>
  );
};

export default GoalDefinition;
