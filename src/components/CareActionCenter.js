import React, { useState, useEffect, useMemo } from 'react';
import './CareActionCenter.css';
import CustomSelect from './CustomSelect';
import { Skeleton, EmptyState } from './ui/Feedback';
import { useToast } from './ui/Toast';
import {
  fetchCACMeasures,
  fetchCACCRSPs,
  fetchCACGridData,
  fetchCACNonCompliantCount,
  fetchCACUnassignedCount,
  fetchCACActionableCount,
  saveCareAction,
} from '../services/workflowService';
import { sampleMembers, SAMPLE_MEASURES, STAFF } from './v2/v2utils';

// Demo rows in the grid's row shape ([memberId, name, measure, crsp, assignedTo])
// so the page stays demonstrable when the workflow is unreachable — same
// pattern as the v2 views, and always announced by the notice banner.
const sampleGridRows = () =>
  sampleMembers(36).map((m, i) => [
    m.memberId,
    m.memberName,
    SAMPLE_MEASURES[i % SAMPLE_MEASURES.length].measure_id,
    m.crsp,
    i % 4 === 0 ? STAFF[i % STAFF.length] : 'Unassigned',
  ]);

// `onBack` is gone: the sidebar is the navigation — an in-page "Back to
// Overview" duplicated it and pointed at the parked classic dashboard.
const CareActionCenter = ({ token }) => {
  const toast = useToast();

  // Modal / action state
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionType, setActionType] = useState('');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Data
  const [measures, setMeasures] = useState([]);
  const [loadingMeasures, setLoadingMeasures] = useState(true);
  const [crsps, setCrsps] = useState([]);
  const [loadingCrsps, setLoadingCrsps] = useState(true);
  const [gridData, setGridData] = useState([]);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [gridSample, setGridSample] = useState(false); // live list unavailable → demo rows
  const [gridReloadKey, setGridReloadKey] = useState(0);

  // Server-side filters
  const [selectedMeasure, setSelectedMeasure] = useState('');
  const [selectedCrsp, setSelectedCrsp] = useState('');
  // Client-side filters (these two were previously decorative — now real)
  const [assignmentFilter, setAssignmentFilter] = useState(''); // '' | 'unassigned' | 'assigned'
  const [staffFilter, setStaffFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [kpiData, setKpiData] = useState({ nonCompliant: 0, unassigned: 0, actionable: 0 });
  const [loadingKpi, setLoadingKpi] = useState(true);
  const [kpiSample, setKpiSample] = useState(false); // live counts unavailable → demo numbers

  // ── Derived: client-side filtering ──────────────────────────
  const isUnassigned = (row) => !row[4] || row[4] === 'Unassigned';

  const filteredData = useMemo(() => {
    return gridData.filter((row) => {
      // Measure and CRSP are server-side filters on the live path — the fetch
      // re-runs and hands back an already-narrowed set. On the sample path there
      // is no server to narrow anything, so the same two have to be applied here
      // or picking a measure would visibly do nothing.
      if (gridSample && selectedMeasure && row[2] !== selectedMeasure) return false;
      if (gridSample && selectedCrsp && row[3] !== selectedCrsp) return false;
      if (assignmentFilter === 'unassigned' && !isUnassigned(row)) return false;
      if (assignmentFilter === 'assigned' && isUnassigned(row)) return false;
      if (staffFilter && row[4] !== staffFilter) return false;
      return true;
    });
  }, [gridData, gridSample, selectedMeasure, selectedCrsp, assignmentFilter, staffFilter]);

  // Option lists. The live endpoints supply the measure/CRSP vocabularies; when
  // they're down the dropdowns fall back to the values actually present in the
  // rows on screen. Without this they hold a lone "All …" and read as broken —
  // the filter isn't decorative, it just had nothing to offer.
  const measureOptions = useMemo(
    () => (measures.length ? measures : [...new Set(gridData.map((r) => r[2]).filter(Boolean))].sort()),
    [measures, gridData]
  );
  const crspOptions = useMemo(
    () => (crsps.length ? crsps : [...new Set(gridData.map((r) => r[3]).filter(Boolean))].sort()),
    [crsps, gridData]
  );
  const staffOptions = useMemo(() => {
    const set = new Set();
    gridData.forEach((row) => { if (row[4] && row[4] !== 'Unassigned') set.add(row[4]); });
    return Array.from(set).sort();
  }, [gridData]);

  // Pagination on the filtered set
  const totalRecords = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  useEffect(() => { setCurrentPage(1); }, [assignmentFilter, staffFilter, selectedMeasure, selectedCrsp]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  // ── Data loading ────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    (async () => {
      try { setLoadingMeasures(true); setMeasures(await fetchCACMeasures(token)); }
      catch { /* dropdown falls back to All */ }
      finally { setLoadingMeasures(false); }
    })();
    (async () => {
      try { setLoadingCrsps(true); setCrsps(await fetchCACCRSPs(token)); }
      catch { /* */ }
      finally { setLoadingCrsps(false); }
    })();
    (async () => {
      try {
        setLoadingKpi(true);
        const [nonCompliant, unassigned, actionable] = await Promise.all([
          fetchCACNonCompliantCount(token),
          fetchCACUnassignedCount(token),
          fetchCACActionableCount(token),
        ]);
        setKpiData({ nonCompliant: nonCompliant || 0, unassigned: unassigned || 0, actionable: actionable || 0 });
        setKpiSample(false);
      } catch {
        // Keep the page demonstrable, but say the numbers aren't live.
        setKpiData({ nonCompliant: 21292, unassigned: 2392, actionable: 5842 });
        setKpiSample(true);
      } finally { setLoadingKpi(false); }
    })();
    // gridReloadKey lets the sample-data notice's Retry refresh the KPIs too.
  }, [token, gridReloadKey]);

  // Grid reloads on server-side filter change or explicit retry
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingGrid(true);
        const filters = {
          ...(selectedMeasure && { measureId: selectedMeasure }),
          ...(selectedCrsp && { crsp: selectedCrsp }),
        };
        const data = await fetchCACGridData(filters, token);
        if (cancelled) return;
        const rows = data.resultSet || [];
        if (rows.length === 0 && !selectedMeasure && !selectedCrsp) throw new Error('empty');
        setGridData(rows);
        setGridSample(false);
      } catch {
        // Same fallback pattern as the v2 views: demo rows + a visible notice.
        if (!cancelled) { setGridData(sampleGridRows()); setGridSample(true); }
      } finally {
        if (!cancelled) setLoadingGrid(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, selectedMeasure, selectedCrsp, gridReloadKey]);

  // ── Modal handlers ──────────────────────────────────────────
  const handleOpenModal = (row) => {
    setSelectedAction({
      memberId: row[0], name: row[1], measure: row[2], crsp: row[3],
      assignedTo: row[4] || 'Unassigned',
    });
    setAssignedStaff(row[4] && row[4] !== 'Unassigned' ? row[4] : '');
    setActionType('');
    setNotes('');
  };

  const handleCloseModal = () => {
    if (saving) return;
    setSelectedAction(null);
    setActionType('');
    setAssignedStaff('');
    setNotes('');
  };

  // Close the loop: persist, optimistically update the row + KPI, confirm.
  const handleSaveAction = async () => {
    if (!actionType) { toast({ type: 'error', message: 'Choose an action type before saving.' }); return; }
    setSaving(true);
    try {
      const res = await saveCareAction({
        memberId: selectedAction.memberId,
        measureId: selectedAction.measure,
        crsp: selectedAction.crsp,
        assignedTo: assignedStaff,
        actionType,
        notes,
      }, token);

      const wasUnassigned = selectedAction.assignedTo === 'Unassigned';
      // Optimistic: reflect the new assignment in the table immediately.
      setGridData((rows) => rows.map((r) =>
        r[0] === selectedAction.memberId
          ? [r[0], r[1], r[2], r[3], assignedStaff || r[4]]
          : r
      ));
      if (wasUnassigned && assignedStaff) {
        setKpiData((k) => ({ ...k, unassigned: Math.max(0, k.unassigned - 1) }));
      }

      toast({
        type: 'success',
        message: res.simulated
          ? `Saved (demo) — ${selectedAction.name} · ${assignedStaff || 'unassigned'}.`
          : `Action saved for ${selectedAction.name}.`,
      });
      setSelectedAction(null);
      setActionType(''); setAssignedStaff(''); setNotes('');
    } catch {
      toast({ type: 'error', message: 'Couldn’t save the action. Please retry.' });
    } finally {
      setSaving(false);
    }
  };

  const goToPage = (p) => { if (p >= 1 && p <= totalPages) setCurrentPage(p); };

  return (
    <div className="cac">
      <header className="cac-head">
        <div className="eyebrow">CARE MANAGEMENT</div>
        <h1 className="cac-title">Care Action Center</h1>
        <p className="cac-sub">Prioritize open care gaps and assign them to your team.</p>
      </header>

      {(kpiSample || gridSample) && !loadingKpi && !loadingGrid && (
        <div className="cac-notice" role="status">
          <span>Live data unavailable — showing sample data.</span>
          <button type="button" className="cac-notice-retry" onClick={() => setGridReloadKey((k) => k + 1)}>↻ Retry</button>
        </div>
      )}

      {/* KPIs — "Unassigned" doubles as a filter on the list below */}
      <div className="cac-kpis">
        <div className="cac-kpi cac-kpi-below">
          <div className="cac-kpi-label">Total non-compliant</div>
          {loadingKpi
            ? <Skeleton width={84} height={26} radius={6} style={{ marginTop: 6 }} />
            : <div className="cac-kpi-value num">{kpiData.nonCompliant.toLocaleString()}</div>}
        </div>
        <button
          type="button"
          className={`cac-kpi cac-kpi-warn cac-kpi-btn ${assignmentFilter === 'unassigned' ? 'is-active' : ''}`}
          aria-pressed={assignmentFilter === 'unassigned'}
          onClick={() => setAssignmentFilter((f) => (f === 'unassigned' ? '' : 'unassigned'))}
        >
          <div className="cac-kpi-label">Unassigned</div>
          {loadingKpi
            ? <Skeleton width={84} height={26} radius={6} style={{ marginTop: 6 }} />
            : <div className="cac-kpi-value num">{kpiData.unassigned.toLocaleString()}</div>}
          <span className="cac-kpi-hint">
            {assignmentFilter === 'unassigned' ? 'Filtering the list · click to clear' : 'Click to show only unassigned'}
          </span>
        </button>
        <div className="cac-kpi cac-kpi-at">
          <div className="cac-kpi-label">Actionable now</div>
          {loadingKpi
            ? <Skeleton width={84} height={26} radius={6} style={{ marginTop: 6 }} />
            : <div className="cac-kpi-value num">{kpiData.actionable.toLocaleString()}</div>}
        </div>
      </div>

      {/* Filters */}
      <div className="cac-filters">
        <CustomSelect
          value={selectedMeasure}
          onChange={setSelectedMeasure}
          options={[{ value: '', label: 'All Measures' }, ...measureOptions.map((m) => ({ value: m, label: m }))]}
          disabled={loadingMeasures || loadingGrid}
          title="Filter by measure"
        />
        <CustomSelect
          value={selectedCrsp}
          onChange={setSelectedCrsp}
          options={[{ value: '', label: 'All CRSP Groups' }, ...crspOptions.map((c) => ({ value: c, label: c }))]}
          disabled={loadingCrsps || loadingGrid}
          title="Filter by CRSP"
        />
        <CustomSelect
          value={assignmentFilter}
          onChange={setAssignmentFilter}
          options={[
            { value: '', label: 'All Assignments' },
            { value: 'unassigned', label: 'Unassigned' },
            { value: 'assigned', label: 'Assigned' },
          ]}
          title="Filter by assignment status"
        />
        <CustomSelect
          value={staffFilter}
          onChange={setStaffFilter}
          options={[{ value: '', label: 'All Staff' }, ...staffOptions.map((s) => ({ value: s, label: s }))]}
          disabled={staffOptions.length === 0}
          title="Filter by assigned staff"
        />
        {(assignmentFilter || staffFilter || selectedMeasure || selectedCrsp) && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => { setSelectedMeasure(''); setSelectedCrsp(''); setAssignmentFilter(''); setStaffFilter(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="cac-table-wrap">
        <table className="cac-table">
          <thead>
            <tr>
              <th>Member ID</th><th>Member Name</th><th>Measure</th>
              <th>CRSP</th><th>Assigned to</th><th className="ta-r">Action</th>
            </tr>
          </thead>
          <tbody>
            {loadingGrid ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan="6" style={{ padding: '10px 16px' }}><Skeleton height={16} /></td></tr>
              ))
            ) : filteredData.length === 0 ? (
              <tr><td colSpan="6"><EmptyState icon="✅" title="No matching care gaps" hint="Try clearing a filter, or switch the measure/CRSP above." /></td></tr>
            ) : (
              paginatedData.map((row, idx) => (
                // The whole row opens the action modal; the button is the visible
                // affordance and the keyboard path.
                <tr key={idx} className="cac-row" onClick={() => handleOpenModal(row)}>
                  <td className="num">{row[0]}</td>
                  <td className="cac-name">{row[1]}</td>
                  <td>{row[2]}</td>
                  <td>{row[3]}</td>
                  <td>
                    {isUnassigned(row)
                      ? <span className="cac-pill cac-pill-unassigned">Unassigned</span>
                      : <span className="cac-pill cac-pill-assigned">{row[4]}</span>}
                  </td>
                  <td className="ta-r">
                    <button
                      className={`btn ${isUnassigned(row) ? 'btn-assign' : 'btn-secondary'} btn-sm`}
                      onClick={(e) => { e.stopPropagation(); handleOpenModal(row); }}
                    >
                      {isUnassigned(row) ? 'Assign' : 'View / Edit'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loadingGrid && filteredData.length > 0 && (
          <div className="cac-pagination">
            <span className="cac-page-info num">
              {startIndex + 1}–{Math.min(startIndex + pageSize, totalRecords)} of {totalRecords}
            </span>
            <div className="cac-page-controls">
              <select className="cac-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <button type="button" className="btn btn-secondary btn-icon btn-sm" aria-label="Previous page"
                onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>‹</button>
              <span className="cac-page-current num">{currentPage} / {totalPages}</span>
              <button type="button" className="btn btn-secondary btn-icon btn-sm" aria-label="Next page"
                onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Action modal */}
      {selectedAction && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Member action">
            <div className="modal-header">
              <h2>{selectedAction.name}</h2>
              <button className="modal-close" onClick={handleCloseModal} aria-label="Close">✕</button>
            </div>

            <div className="modal-meta">
              <div><span className="modal-meta-label">Member ID</span><span className="num">{selectedAction.memberId}</span></div>
              <div><span className="modal-meta-label">Measure</span><span>{selectedAction.measure}</span></div>
              <div><span className="modal-meta-label">CRSP</span><span>{selectedAction.crsp}</span></div>
            </div>

            <div className="form-group">
              <label htmlFor="assign">Assigned to</label>
              <input
                id="assign" type="text" list="cac-staff-options"
                placeholder="Enter staff name"
                value={assignedStaff} onChange={(e) => setAssignedStaff(e.target.value)}
              />
              {/* Suggest staff already assigned elsewhere, so names stay consistent */}
              <datalist id="cac-staff-options">
                {staffOptions.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label htmlFor="atype">Action type <span className="req">*</span></label>
              <select id="atype" value={actionType} onChange={(e) => setActionType(e.target.value)}>
                <option value="">— Select an action —</option>
                <option value="schedule-visit">Schedule Follow-up Visit</option>
                <option value="assign-coordinator">Assign Care Coordinator</option>
                <option value="send-outreach">Send Outreach</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" rows="3" placeholder="Add any relevant notes…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="modal-actions">
              {!actionType && <span className="modal-hint">Choose an action type to save</span>}
              <button className="btn btn-secondary" onClick={handleCloseModal} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveAction} disabled={saving || !actionType}>
                {saving ? 'Saving…' : 'Save Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareActionCenter;
