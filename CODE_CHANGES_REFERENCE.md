# Code Changes Reference

## File 1: src/services/workflowService.js

### Change 1: Add Workflow ID
**Location**: Line 37 (in WORKFLOW_IDS object)

```javascript
// BEFORE
  CAC_MEASURES: '8a255948-582a-11f1-9e64-1b3c9c6445c5', // Care Action Center measures dropdown
  CAC_CRSPS: 'a7883ca9-582a-11f1-9e64-4b9952bc281e', // Care Action Center CRSP dropdown
};

// AFTER
  CAC_MEASURES: '8a255948-582a-11f1-9e64-1b3c9c6445c5', // Care Action Center measures dropdown
  CAC_CRSPS: 'a7883ca9-582a-11f1-9e64-4b9952bc281e', // Care Action Center CRSP dropdown
  CAC_GRID: '105691ee-582c-11f1-9e64-33f111c58511', // Care Action Center grid data (member_id, member_name, measure_id, crsp)
};
```

### Change 2: Add New Function
**Location**: After fetchCACCRSPs function (around line 1305)

```javascript
/**
 * Fetch Care Action Center grid data with member and measure information
 * @param {object} filters - Filter parameters (measureId, crsp, status, assignedStaff)
 * @param {string} token - Authorization token
 * @returns {Promise<object>} Grid data with metadata and result set
 */
export const fetchCACGridData = async (filters = {}, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.CAC_GRID,
      filters,
      token
    );

    if (!result.data?.data) {
      throw new Error('Invalid response format');
    }

    return result.data.data;
  } catch (error) {
    console.error('Error fetching CAC grid data:', error);
    throw error;
  }
};
```

### Change 3: Update Export
**Location**: In export default object (around line 1345)

```javascript
// BEFORE
  fetchCACMeasures,
  fetchCACCRSPs,
  updateWorkflowId,

// AFTER
  fetchCACMeasures,
  fetchCACCRSPs,
  fetchCACGridData,
  updateWorkflowId,
```

---

## File 2: src/components/CareActionCenter.js

### Change 1: Update Import
**Location**: Line 4

```javascript
// BEFORE
import { fetchCACMeasures, fetchCACCRSPs } from '../services/workflowService';

// AFTER
import { fetchCACMeasures, fetchCACCRSPs, fetchCACGridData } from '../services/workflowService';
```

### Change 2: Add State Variables
**Location**: Inside component, after existing state (around line 16)

```javascript
// BEFORE
  const [selectedCrsp, setSelectedCrsp] = useState('');
  const [loadingCrsps, setLoadingCrsps] = useState(true);

// AFTER
  const [selectedCrsp, setSelectedCrsp] = useState('');
  const [loadingCrsps, setLoadingCrsps] = useState(true);
  const [gridData, setGridData] = useState([]);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [error, setError] = useState(null);
```

### Change 3: Update useEffect
**Location**: useEffect hook (around line 20)

```javascript
// BEFORE
  useEffect(() => {
    const loadMeasures = async () => {
      try {
        setLoadingMeasures(true);
        const data = await fetchCACMeasures(token);
        setMeasures(data);
      } catch (err) {
        console.error('Error loading CAC measures:', err);
      } finally {
        setLoadingMeasures(false);
      }
    };

    const loadCrsps = async () => {
      try {
        setLoadingCrsps(true);
        const data = await fetchCACCRSPs(token);
        setCrsps(data);
      } catch (err) {
        console.error('Error loading CAC CRSPs:', err);
      } finally {
        setLoadingCrsps(false);
      }
    };

    if (token) {
      loadMeasures();
      loadCrsps();
    }
  }, [token]);

// AFTER
  useEffect(() => {
    const loadMeasures = async () => {
      try {
        setLoadingMeasures(true);
        const data = await fetchCACMeasures(token);
        setMeasures(data);
      } catch (err) {
        console.error('Error loading CAC measures:', err);
        setError('Failed to load measures');
      } finally {
        setLoadingMeasures(false);
      }
    };

    const loadCrsps = async () => {
      try {
        setLoadingCrsps(true);
        const data = await fetchCACCRSPs(token);
        setCrsps(data);
      } catch (err) {
        console.error('Error loading CAC CRSPs:', err);
        setError('Failed to load CRSPs');
      } finally {
        setLoadingCrsps(false);
      }
    };

    const loadGridData = async () => {
      try {
        setLoadingGrid(true);
        const filters = {
          ...(selectedMeasure && { measureId: selectedMeasure }),
          ...(selectedCrsp && { crsp: selectedCrsp })
        };
        const data = await fetchCACGridData(filters, token);
        setGridData(data.resultSet || []);
      } catch (err) {
        console.error('Error loading CAC grid data:', err);
        setError('Failed to load grid data');
      } finally {
        setLoadingGrid(false);
      }
    };

    if (token) {
      loadMeasures();
      loadCrsps();
      loadGridData();
    }
  }, [token, selectedMeasure, selectedCrsp]);
```

### Change 4: Remove Hardcoded Data
**Location**: After KPI definition (around line 70)

```javascript
// REMOVE THIS ENTIRE SECTION:
  const actions = [
    {
      id: 1,
      memberId: '0094184633',
      name: 'Adams, Daisha',
      measure: 'FUH',
      type: 'Follow-up',
      window: '7-day (03/29)',
      daysLeft: '2 days',
      status: 'Urgent',
      assigned: 'Sarah Jenkins',
      statusColor: '#854f0b',
    },
    // ... more hardcoded data
  ];
```

### Change 5: Update Table Structure
**Location**: Table element (around line 130)

```javascript
// BEFORE
      <table className="actions-table">
        <thead>
          <tr>
            <th>Member ID</th>
            <th>Name</th>
            <th>Measure</th>
            <th>Type</th>
            <th>Window</th>
            <th>Days left</th>
            <th>Status</th>
            <th>Assigned</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action) => (
            <tr key={action.id}>
              <td>{action.memberId}</td>
              <td style={{ fontWeight: 600 }}>{action.name}</td>
              <td>{action.measure}</td>
              <td>{action.type}</td>
              <td>{action.window}</td>
              <td style={{ color: action.statusColor, fontWeight: 600 }}>{action.daysLeft}</td>
              <td style={{ color: action.statusColor, fontWeight: 600 }}>{action.status}</td>
              <td>{action.assigned}</td>
              <td>
                {action.status === 'Expired' ? (
                  <button className="btn-monitor">Monitor only</button>
                ) : (
                  <button className="btn-action" onClick={() => setSelectedAction(action)}>
                    {action.type === 'Follow-up' ? 'Schedule visit' : 'Assign action'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

// AFTER
      <table className="actions-table">
        <thead>
          <tr>
            <th>Member ID</th>
            <th>Member Name</th>
            <th>Measure</th>
            <th>CRSP</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loadingGrid ? (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Loading data...</td>
            </tr>
          ) : gridData.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No data available</td>
            </tr>
          ) : (
            gridData.map((row, idx) => (
              <tr key={idx}>
                <td>{row[0]}</td>
                <td style={{ fontWeight: 600 }}>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
                <td>
                  <button 
                    className="btn-action" 
                    onClick={() => setSelectedAction({
                      memberId: row[0],
                      name: row[1],
                      measure: row[2],
                      crsp: row[3]
                    })}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
```

### Change 6: Update Modal
**Location**: Modal section (around line 180)

```javascript
// BEFORE
      {selectedAction && (
        <div className="modal-overlay" onClick={() => setSelectedAction(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule Follow-up: {selectedAction.name}</h2>
              <button className="modal-close" onClick={() => setSelectedAction(null)}>✕</button>
            </div>
            <div className="modal-info">
              <strong>Member:</strong> {selectedAction.name} · ID: {selectedAction.memberId}
            </div>
            <div className="modal-info" style={{ background: '#faeeda', color: '#633806' }}>
              {selectedAction.measure} — {selectedAction.type}
              <br />
              Window: <strong>{selectedAction.window}</strong>
            </div>
            <div className="form-group">
              <label>Follow-up visit type</label>
              <select>
                <option>Behavioral health outpatient visit</option>
                <option>Telehealth MH visit</option>
                <option>Telephone visit with MH provider</option>
              </select>
            </div>
            <div className="form-group">
              <label>Appointment date</label>
              <input type="date" defaultValue="2026-04-05" />
            </div>
            <div className="form-group">
              <label>Provider</label>
              <select>
                <option>Dr. Sarah Jenkins (Assigned PCP)</option>
                <option>Dr. Patel – Behavioral Health</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setSelectedAction(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => setSelectedAction(null)}>Schedule Visit</button>
            </div>
          </div>
        </div>
      )}

// AFTER
      {selectedAction && (
        <div className="modal-overlay" onClick={() => setSelectedAction(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Member Details: {selectedAction.name}</h2>
              <button className="modal-close" onClick={() => setSelectedAction(null)}>✕</button>
            </div>
            <div className="modal-info">
              <strong>Member:</strong> {selectedAction.name} · ID: {selectedAction.memberId}
            </div>
            <div className="modal-info" style={{ background: '#faeeda', color: '#633806' }}>
              <strong>Measure:</strong> {selectedAction.measure}
              <br />
              <strong>CRSP:</strong> {selectedAction.crsp}
            </div>
            <div className="form-group">
              <label>Action Type</label>
              <select>
                <option>Schedule Follow-up Visit</option>
                <option>Assign Care Coordinator</option>
                <option>Send Outreach</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea placeholder="Add any relevant notes..." rows="4"></textarea>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setSelectedAction(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => setSelectedAction(null)}>Save Action</button>
            </div>
          </div>
        </div>
      )}
```

---

## Summary of Changes

### workflowService.js
- **Lines Added**: ~25
- **Lines Modified**: 2
- **Lines Removed**: 0
- **Total Changes**: 27 lines

### CareActionCenter.js
- **Lines Added**: ~80
- **Lines Modified**: 15
- **Lines Removed**: ~60 (hardcoded data)
- **Total Changes**: ~35 net lines

### Total Impact
- **Files Modified**: 2
- **New Functions**: 1
- **New State Variables**: 3
- **New Workflow ID**: 1
- **Breaking Changes**: None
- **Backward Compatible**: Yes

---

## Testing the Changes

### Quick Verification
1. Check syntax: `node -c src/services/workflowService.js`
2. Check imports: Verify `fetchCACGridData` is imported in CareActionCenter.js
3. Check state: Verify new state variables are initialized
4. Check rendering: Verify table renders with new structure

### Build and Run
```bash
npm run build
npm run dev
```

### Manual Testing
1. Navigate to Care Action Center
2. Verify grid loads with data
3. Test measure filter
4. Test CRSP filter
5. Click "View Details" to open modal
6. Verify modal displays correct data
