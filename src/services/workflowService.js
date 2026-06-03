/**
 * Workflow Service
 * Centralized service for all workflow API calls
 * Handles all API communication with Lumenore workflow endpoints
 */

const API_BASE_URL = 'https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow';
const APP_ID = '4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d';

// Workflow IDs for different features
const WORKFLOW_IDS = {
  DASHBOARD_KPI: '28d510c9-3284-11f1-bc78-afc84e14c8e9',
  DASHBOARD_MEASURES: '0a483e41-3282-11f1-bc78-3b7e37da8ec2',
  MEASURE_STRATIFICATION_AGE: 'b0a05c44-3283-11f1-bc78-d11c052590ae',
  MEASURE_STRATIFICATION_ETHNICITY: 'f8b3e606-3283-11f1-bc78-8777b53d8488',
  MEASURE_STRATIFICATION_RACE: 'd54528a5-3283-11f1-bc78-81585c103e4d',
  CHART_MEASURES_MEETING_TARGET: '148a8724-34d4-11f1-bbd1-c3e6efa115de',
  ALL_MEASURES_GRID: 'adfade0d-3701-11f1-bbd1-4b51cdcc5eeb',
  CRSP_LEVEL: '3fc1ac55-3729-11f1-bbd1-e38b1acb336a',
  AGE_CRSP_DRILLDOWN: '9c650927-3729-11f1-bbd1-cff0cd6ae894',
  RACE_CRSP_DRILLDOWN: 'd5e57ea8-3729-11f1-bbd1-2ba4b6c25ac7',
  ETHNICITY_CRSP_DRILLDOWN: '0d23cc59-372a-11f1-bbd1-35af3ca61c44',
  MEMBER_DETAILS: 'fc465731-380b-11f1-bbd1-0fac4df3fbb8', // Age-based member details
  RACE_MEMBER_DETAILS: 'bb5e52d6-380c-11f1-bbd1-03e2e173ad9d', // Race-based member details
  ETHNICITY_MEMBER_DETAILS: '293908e9-380d-11f1-bbd1-9f7f1ad739dc', // Ethnicity-based member details
  CRSP_MEMBER_DETAILS: 'c2c50c7c-380d-11f1-bbd1-032f4075ce67', // CRSP-level member details
  MEASURE_DETAIL: 'workflow-id-measure-detail', // To be updated
  CARE_ACTION: 'workflow-id-care-action', // To be updated
  RATE_SIMULATOR: 'workflow-id-rate-simulator', // To be updated
  PROVIDER_SCORES: 'workflow-id-provider-scores', // To be updated
  MINI_CHART_MEASURE_TREND: 'ec62d64e-3c95-11f1-bbd1-bdc0a4f0d4d3', // Mini chart measure trend by month
  LOWEST_PERFORMING_MEASURES: 'cb7946ab-529a-11f1-a096-5fdff526e7e2', // Lowest performing measures
  CRSPS_NEEDING_ATTENTION: '1444eaf0-529d-11f1-a096-03ecb299c978', // CRSPs needing attention
  EQUITY_ALERTS: '69ed8f07-529f-11f1-a096-dbe274b0ddea', // Equity alerts
  CAC_MEASURES: '8a255948-582a-11f1-9e64-1b3c9c6445c5', // Care Action Center measures dropdown
  CAC_CRSPS: 'a7883ca9-582a-11f1-9e64-4b9952bc281e', // Care Action Center CRSP dropdown
  CAC_GRID: '105691ee-582c-11f1-9e64-33f111c58511', // Care Action Center grid data (member_id, member_name, measure_id, crsp)
  CAC_NON_COMPLIANT: '610cb1f9-583c-11f1-9e64-c1c8521cd737', // Care Action Center non-compliant count
  CAC_UNASSIGNED: 'workflow-id-cac-unassigned', // Care Action Center unassigned count (to be updated)
  CAC_ACTIONABLE: 'workflow-id-cac-actionable', // Care Action Center actionable count (to be updated)
  CAC_EXPIRING: 'workflow-id-cac-expiring', // Care Action Center expiring this week count (to be updated)
  AVAILABLE_MONTHS: '53dc3a92-5e5c-11f1-9f6b-adfc4f5915e5', // List of months available across all measures (Mon-YYYY)
};

// --- Selected-month state (shared across every workflow call) -----------------
//
// The UI's MonthFilter exposes values in `YYYY-MM` form (e.g. "2026-01"). Every
// workflow request body must include the chosen month in `Mon-YYYY` form
// (e.g. "Jan-2026"). Rather than threading the month through ~30 fetch functions,
// we keep it as module state and merge it into the payload inside `callWorkflow`.
// Components are expected to call `setSelectedWorkflowMonth(...)` whenever the
// MonthFilter changes (empty string / null clears it).
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

let currentSelectedMonth = null; // formatted as "Mon-YYYY" or null when "All Months"

/**
 * Convert a MonthFilter value (`YYYY-MM`) to API form (`Mon-YYYY`).
 * Returns null for empty / invalid inputs.
 */
const formatMonthForPayload = (monthValue) => {
  if (!monthValue || typeof monthValue !== 'string') return null;
  const parts = monthValue.split('-');
  if (parts.length !== 2) return null;
  const [year, monthNum] = parts;
  const idx = parseInt(monthNum, 10) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx > 11 || !year) return null;
  return `${MONTH_NAMES[idx]}-${year}`;
};

/**
 * Set the currently-selected month for every subsequent workflow call.
 * Accepts the raw MonthFilter value (`YYYY-MM`) or empty/null to clear.
 * Components should call this whenever the MonthFilter changes so that
 * downstream workflow requests pick up the new month automatically.
 */
export const setSelectedWorkflowMonth = (monthValue) => {
  const formatted = formatMonthForPayload(monthValue);
  if (formatted === currentSelectedMonth) return;
  currentSelectedMonth = formatted;
};

/**
 * Returns the currently-active month in API form (`Mon-YYYY`), or null.
 */
export const getSelectedWorkflowMonth = () => currentSelectedMonth;

/**
 * Lookup tables for converting between the various month-name shapes the
 * AVAILABLE_MONTHS workflow has returned over its lifetime.
 *
 * Supported inputs:
 *   - Short:   "Jan", "Feb", ..., "Dec"
 *   - Full:    "January", "February", ..., "December"
 *   - Mixed case (e.g. "january", "JAN") is normalised by lowercasing the key.
 */
const MONTH_NAME_TO_NUMBER = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12'
};

const monthNameToNumber = (name) => {
  if (!name || typeof name !== 'string') return null;
  return MONTH_NAME_TO_NUMBER[name.trim().toLowerCase()] || null;
};

/**
 * Convert an API-format month string (`Mon-YYYY` or `Month-YYYY`) back to the
 * MonthFilter internal value (`YYYY-MM`). Returns null for unparseable input.
 */
const monYearToValue = (monYear) => {
  if (!monYear || typeof monYear !== 'string') return null;
  const parts = monYear.split('-');
  if (parts.length !== 2) return null;
  const [mon, year] = parts;
  const monthNum = monthNameToNumber(mon);
  if (!monthNum || !/^\d{4}$/.test(year)) return null;
  return `${year}-${monthNum}`;
};

// --- Available-months cache (workflow returns a small fixed list per tenant) --
let availableMonthsCache = { token: null, data: null, promise: null };

export const resetAvailableMonthsCache = () => {
  availableMonthsCache = { token: null, data: null, promise: null };
};

/**
 * Fetch the list of months that have data, cached + in-flight deduped per token.
 *
 * Returns an array of `{ value, label, monthName, monYear }` objects sorted
 * most-recent-first:
 *   - value:     "YYYY-MM"        — used as the MonthFilter <option value="...">
 *   - label:     "Month YYYY"     — display label (full month name as returned by API)
 *   - monthName: "Month"          — just the month part (full name) for compact display
 *   - monYear:   "Mon-YYYY"       — raw API payload form (always short, backend contract)
 */
export const fetchAvailableMonths = async (token) => {
  if (availableMonthsCache.token === token && availableMonthsCache.data) {
    return availableMonthsCache.data;
  }
  if (availableMonthsCache.token === token && availableMonthsCache.promise) {
    return availableMonthsCache.promise;
  }

  const fetchPromise = (async () => {
    try {
      const result = await callWorkflow(
        WORKFLOW_IDS.AVAILABLE_MONTHS,
        {},
        token
      );

      if (!result.data?.data?.resultSet) {
        throw new Error('Invalid response format');
      }

      // The workflow has shipped two response shapes over time:
      //   v1 (legacy):  resultSet rows = ["Mon-YYYY"]                e.g. ["Dec-2025"]
      //   v2 (current): resultSet rows = ["FullMonthName", yearNum]  e.g. ["December", 2025]
      // Handle both so a future server-side rollback doesn't break the dropdown.
      const months = result.data.data.resultSet
        .map((row) => {
          let monthName;
          let year;

          if (Array.isArray(row)) {
            if (row.length >= 2 && (typeof row[1] === 'number' || /^\d{4}$/.test(String(row[1])))) {
              // v2 shape: separate month name + year columns.
              monthName = row[0];
              year = String(row[1]);
            } else {
              // v1 shape: single "Mon-YYYY" cell.
              const [m, y] = String(row[0] || '').split('-');
              monthName = m;
              year = y;
            }
          } else if (typeof row === 'string') {
            const [m, y] = row.split('-');
            monthName = m;
            year = y;
          }

          const monthNum = monthNameToNumber(monthName);
          if (!monthNum || !year || !/^\d{4}$/.test(year)) return null;

          // Prefer the full month name from the API response. If the legacy
          // shape (`"Dec-2025"`) was used, the source only has the short form;
          // derive a full name from the month number so display stays consistent.
          const monthIdx = parseInt(monthNum, 10) - 1;
          const shortMon = MONTH_NAMES[monthIdx];
          const looksFull = typeof monthName === 'string' && monthName.length > 3;
          const fullMon = looksFull
            ? monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase()
            : MONTH_FULL_NAMES[monthIdx];

          return {
            value: `${year}-${monthNum}`,   // "YYYY-MM" — MonthFilter <option value>
            label: `${fullMon} ${year}`,     // "Month YYYY" — display label (full name)
            monthName: fullMon,              // "Month" — full name for compact display
            monYear: `${shortMon}-${year}`   // "Mon-YYYY" — backend payload form (unchanged)
          };
        })
        .filter(Boolean)
        // Most recent first — `value` is `YYYY-MM` so string compare works.
        .sort((a, b) => (a.value < b.value ? 1 : a.value > b.value ? -1 : 0));

      if (availableMonthsCache.token === token) {
        availableMonthsCache = { token, data: months, promise: null };
      }
      return months;
    } catch (error) {
      if (availableMonthsCache.token === token) {
        availableMonthsCache = { token: null, data: null, promise: null };
      }
      throw error;
    }
  })();

  availableMonthsCache = { token, data: null, promise: fetchPromise };
  return fetchPromise;
};

/**
 * Get common headers for all API requests
 * @param {string} token - Authorization token
 * @returns {object} Headers object
 */
const getCommonHeaders = (token) => ({
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'application-id': APP_ID,
  'authorization': `Bearer ${token}`,
  'cache-control': 'no-cache',
  'device-details': JSON.stringify({
    colorDepth: '32',
    hardwareConcurrency: '2',
    deviceMemory: '1',
    platform: 'Win32',
    maxTouchPoints: '10'
  }),
  'geo-location': 'denied',
  'loc-addr': '103.46.196.202',
  'time-zone': 'Asia/Calcutta',
  'x-lumenore-studio': 'true'
});

/**
 * Make a workflow API call
 * @param {string} workflowId - Workflow ID
 * @param {object} data - Payload data
 * @param {string} token - Authorization token
 * @returns {Promise} API response
 */
const callWorkflow = async (workflowId, data, token) => {
  try {
    const formData = new FormData();
    formData.append('data', JSON.stringify({
      workflowId,
      data: {
        appId: APP_ID,
        // Inject the globally-selected month first so any caller can override
        // by passing `month` explicitly inside `data` if it ever needs to.
        ...(currentSelectedMonth ? { month: currentSelectedMonth } : {}),
        ...data
      }
    }));

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: getCommonHeaders(token),
      body: formData
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.message || 'API returned an error');
    }

    if (result.status.code !== '200') {
      throw new Error(`API Status: ${result.status.value}`);
    }

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Ethnicity-CRSP Drill-down Data
 * @param {string} measureId - Measure ID to filter by
 * @param {string} ethnicityStrat - Specific ethnicity stratification (e.g. "Hispanic"). Optional — when omitted the API returns all groups for the measure.
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed ethnicity-CRSP drill-down data
 */
export const fetchEthnicityCRSPDrilldown = async (measureId, ethnicityStrat, token) => {
  try {
    const payload = { measureId };
    if (ethnicityStrat) payload.ethnicityStrat = ethnicityStrat;

    const result = await callWorkflow(
      WORKFLOW_IDS.ETHNICITY_CRSP_DRILLDOWN,
      payload,
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to ethnicity-CRSP drill-down format
    // Structure: { ethnicityGroup: { crsp: [...], rate: X, denom: Y, num: Z } }
    const ethnicityGroupMap = {};

    result.data.data.resultSet.forEach((row) => {
      const [rowMeasureId, ethnicityStrat, crsp, numerator, denominator, rate] = row;
      
      // Only include rows for the requested measure
      if (rowMeasureId === measureId) {
        
        // Initialize ethnicity group if not exists
        if (!ethnicityGroupMap[ethnicityStrat]) {
          ethnicityGroupMap[ethnicityStrat] = {
            crspList: [],
            totalDenom: 0,
            totalNum: 0,
            totalRate: 0
          };
        }

        // Add CRSP data to ethnicity group
        ethnicityGroupMap[ethnicityStrat].crspList.push({
          crsp: crsp,
          rate: Math.round(rate),
          numerator: numerator,
          denominator: denominator
        });

        // Accumulate totals for the ethnicity group
        ethnicityGroupMap[ethnicityStrat].totalDenom += denominator;
        ethnicityGroupMap[ethnicityStrat].totalNum += numerator;
      }
    });

    // Calculate aggregate rate for each ethnicity group
    Object.keys(ethnicityGroupMap).forEach(ethnicityGroup => {
      const data = ethnicityGroupMap[ethnicityGroup];
      data.totalRate = data.totalDenom > 0 ? Math.round((data.totalNum / data.totalDenom) * 100) : 0;
    });

    return ethnicityGroupMap;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Race-CRSP Drill-down Data
 * @param {string} measureId - Measure ID to filter by
 * @param {string} raceStrat - Specific race stratification (e.g. "White"). Optional — when omitted the API returns all groups for the measure.
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed race-CRSP drill-down data
 */
export const fetchRaceCRSPDrilldown = async (measureId, raceStrat, token) => {
  try {
    const payload = { measureId };
    if (raceStrat) payload.raceStrat = raceStrat;

    const result = await callWorkflow(
      WORKFLOW_IDS.RACE_CRSP_DRILLDOWN,
      payload,
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to race-CRSP drill-down format
    // Structure: { raceGroup: { crsp: [...], rate: X, denom: Y, num: Z } }
    const raceGroupMap = {};

    result.data.data.resultSet.forEach((row) => {
      const [rowMeasureId, raceStrat, crsp, numerator, denominator, rate] = row;
      
      // Only include rows for the requested measure
      if (rowMeasureId === measureId) {
        
        // Initialize race group if not exists
        if (!raceGroupMap[raceStrat]) {
          raceGroupMap[raceStrat] = {
            crspList: [],
            totalDenom: 0,
            totalNum: 0,
            totalRate: 0
          };
        }

        // Add CRSP data to race group
        raceGroupMap[raceStrat].crspList.push({
          crsp: crsp,
          rate: Math.round(rate),
          numerator: numerator,
          denominator: denominator
        });

        // Accumulate totals for the race group
        raceGroupMap[raceStrat].totalDenom += denominator;
        raceGroupMap[raceStrat].totalNum += numerator;
      }
    });

    // Calculate aggregate rate for each race group
    Object.keys(raceGroupMap).forEach(raceGroup => {
      const data = raceGroupMap[raceGroup];
      data.totalRate = data.totalDenom > 0 ? Math.round((data.totalNum / data.totalDenom) * 100) : 0;
    });

    return raceGroupMap;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Age-CRSP Drill-down Data
 * @param {string} measureId - Measure ID to filter by
 * @param {string} ageStrat - Specific age stratification (e.g. "65+"). Optional — when omitted the API returns all groups for the measure.
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed age-CRSP drill-down data
 */
export const fetchAgeCRSPDrilldown = async (measureId, ageStrat, token) => {
  try {
    const payload = { measureId };
    if (ageStrat) payload.ageStrat = ageStrat;

    const result = await callWorkflow(
      WORKFLOW_IDS.AGE_CRSP_DRILLDOWN,
      payload,
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to age-CRSP drill-down format
    // Structure: { ageGroup: { crsp: [...], rate: X, denom: Y, num: Z } }
    const ageGroupMap = {};

    result.data.data.resultSet.forEach((row) => {
      const [rowMeasureId, ageStrat, crsp, numerator, denominator, rate] = row;
      
      // Only include rows for the requested measure
      if (rowMeasureId === measureId) {
        
        // Initialize age group if not exists
        if (!ageGroupMap[ageStrat]) {
          ageGroupMap[ageStrat] = {
            crspList: [],
            totalDenom: 0,
            totalNum: 0,
            totalRate: 0
          };
        }

        // Add CRSP data to age group
        ageGroupMap[ageStrat].crspList.push({
          crsp: crsp,
          rate: Math.round(rate),
          numerator: numerator,
          denominator: denominator
        });

        // Accumulate totals for the age group
        ageGroupMap[ageStrat].totalDenom += denominator;
        ageGroupMap[ageStrat].totalNum += numerator;
      }
    });

    // Calculate aggregate rate for each age group
    Object.keys(ageGroupMap).forEach(ageGroup => {
      const data = ageGroupMap[ageGroup];
      data.totalRate = data.totalDenom > 0 ? Math.round((data.totalNum / data.totalDenom) * 100) : 0;
    });

    return ageGroupMap;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch CRSP Level Data
 * @param {string} measureId - Measure ID to filter by
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed CRSP level data
 */
export const fetchCRSPLevelData = async (measureId, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.CRSP_LEVEL,
      {},
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to CRSP level format for the specific measure
    const crspData = [];

    result.data.data.resultSet.forEach((row) => {
      // Log each row to debug the structure
      
      const [rowMeasureId, crsp, numerator, denominator, rate] = row;
      
      
      // Only include rows for the requested measure
      if (rowMeasureId === measureId) {
        
        crspData.push({
          crsp: crsp,
          rate: Math.round(rate),
          numerator: numerator,
          denominator: denominator
        });
      }
    });

    return crspData;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch All Measures Grid Data
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed measures grid data
 */
export const fetchAllMeasuresGrid = async (token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.ALL_MEASURES_GRID,
      {},
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to measures grid format
    const measuresGrid = result.data.data.resultSet.map((row) => {
      const [displayName, numerator, denominator, rate, kpiStatus, category, measureDefinition, measureId, goal50th] = row;
      
      return {
        display_name: displayName,
        numerator: numerator,
        denominator: denominator,
        rate: Math.round(rate),
        kpi_status: kpiStatus,
        category: category,
        measure_definition: measureDefinition,
        measure_id: measureId,
        goal_50th: goal50th,
        actionable: kpiStatus === 'Below Goal'
      };
    });

    return measuresGrid;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Dashboard KPI Data
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed KPI data
 */
export const fetchDashboardKPI = async (token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.DASHBOARD_KPI,
      {},
      token
    );

    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to KPI format
    const targetValue = result.data.data.resultSet.find(r => r[0] === 'Target')?.[1] || 88;

    const kpiData = result.data.data.resultSet
      .filter(item => item[0] !== 'Target')
      .map((item) => {
        const [label, value] = item;
        const typeMap = {
          'Above Goal': 'above',
          'At Goal': 'at',
          'Below Goal': 'below'
        };

        return {
          label: label === 'Above Goal' ? 'Above goal / target' :
                 label === 'At Goal' ? 'At goal / target' :
                 'Below Goal / Target',
          value: value,
          total: targetValue,
          trend: label === 'Above Goal' ? '+5 vs MY 2025' :
                 label === 'At Goal' ? 'Stable vs MY 2025' :
                 '7 critical, 39 below target',
          type: typeMap[label] || 'teal'
        };
      });

    return kpiData;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Dashboard Measures Data
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed measures data organized by category
 */
export const fetchDashboardMeasures = async (token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.DASHBOARD_MEASURES,
      {},
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to measures format organized by category
    const measuresMap = {
      eoc: [],
      ecds: [],
      aac: [],
      uru: []
    };

    result.data.data.resultSet.forEach((row) => {
      const [measureId, category, displayName, numerator, denominator, rate, gapToGoal, goal50th, kpiStatus] = row;
      
      
      // Validate required fields
      if (!measureId || !category || !displayName || denominator === null || denominator === undefined) {
        return;
      }
      
      // Map category to our format
      const categoryKey = category.toLowerCase().trim();
      if (measuresMap[categoryKey]) {
        // Parse goal value - ensure it's a valid number
        let goalValue = 65; // default fallback
        if (goal50th !== null && goal50th !== undefined && goal50th !== '') {
          const parsed = parseInt(goal50th);
          if (!isNaN(parsed)) {
            goalValue = parsed;
          }
        }
        
        // Parse gap value - handle scientific notation and string formats
        let gapValue = 0;
        if (gapToGoal !== null && gapToGoal !== undefined && gapToGoal !== '') {
          if (typeof gapToGoal === 'string') {
            gapValue = parseFloat(gapToGoal.replace(/E\+/gi, 'e+').replace(/E\-/gi, 'e-'));
          } else {
            gapValue = parseFloat(gapToGoal);
          }
          gapValue = isNaN(gapValue) ? 0 : gapValue;
        }
        
        // Calculate gaps based on goal percentage
        const expectedCount = Math.ceil((goalValue / 100) * denominator);
        const actualGaps = Math.max(0, expectedCount - numerator);
        
        measuresMap[categoryKey].push({
          id: measureId,
          name: displayName,
          rate: Math.round(rate),
          goal: goalValue,
          gaps: actualGaps,
          actionable: kpiStatus === 'Below Goal',
          denom: denominator,
          num: numerator,
          type: 'Screening',
          method: category,
          gapToGoal: gapValue
        });
      } else {
      }
    });

    return measuresMap;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Measure Stratification Data by Age
 * @param {string} measureId - Measure ID to filter by
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed stratification data organized by measure and age
 */
export const fetchMeasureStratification = async (measureId, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.MEASURE_STRATIFICATION_AGE,
      { measureId },
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to stratification format for the specific measure
    // New format: [measure_id, age_strat, numerator, denominator, rate_age, not_meeting, disparity]
    const ageGroups = [];

    result.data.data.resultSet.forEach((row) => {
      const [rowMeasureId, ageStrat, numerator, denominator, rateAge, notMeeting, disparity] = row;
      
      // Only include rows for the requested measure
      if (rowMeasureId === measureId) {
        
        ageGroups.push({
          group: ageStrat,
          rate: Math.round(rateAge),
          denom: denominator,
          num: numerator,
          notMeeting: notMeeting,
          disparity: disparity
        });
      }
    });

    const stratificationMap = {
      [measureId]: {
        age: ageGroups
      }
    };

    return stratificationMap;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Measure Stratification Data by Ethnicity
 * @param {string} measureId - Measure ID to filter by
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed stratification data organized by measure and ethnicity
 */
export const fetchMeasureStratificationEthnicity = async (measureId, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.MEASURE_STRATIFICATION_ETHNICITY,
      { measureId },
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to stratification format for the specific measure
    // New format: [measure_id, ethnicity_strat, numerator, denominator, rate_ethnicity, not_meeting, disparity]
    const ethnicityGroups = [];

    result.data.data.resultSet.forEach((row) => {
      const [rowMeasureId, ethnicityStrat, numerator, denominator, rateEthnicity, notMeeting, disparity] = row;
      
      // Only include rows for the requested measure
      if (rowMeasureId === measureId) {
        
        ethnicityGroups.push({
          group: ethnicityStrat,
          rate: Math.round(rateEthnicity),
          denom: denominator,
          num: numerator,
          notMeeting: notMeeting,
          disparity: disparity
        });
      }
    });

    const stratificationMap = {
      [measureId]: {
        ethnicity: ethnicityGroups
      }
    };

    return stratificationMap;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Measure Stratification Data by Race
 * @param {string} measureId - Measure ID to filter by
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed stratification data organized by measure and race
 */
export const fetchMeasureStratificationRace = async (measureId, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.MEASURE_STRATIFICATION_RACE,
      { measureId },
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to stratification format for the specific measure
    // New format: [measure_id, race_strat, numerator, denominator, rate_race, not_meeting, disparity]
    const raceGroups = [];

    result.data.data.resultSet.forEach((row) => {
      const [rowMeasureId, raceStrat, numerator, denominator, rateRace, notMeeting, disparity] = row;
      
      // Only include rows for the requested measure
      if (rowMeasureId === measureId) {
        
        raceGroups.push({
          group: raceStrat,
          rate: Math.round(rateRace),
          denom: denominator,
          num: numerator,
          notMeeting: notMeeting,
          disparity: disparity
        });
      }
    });

    const stratificationMap = {
      [measureId]: {
        race: raceGroups
      }
    };

    return stratificationMap;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Chart Data - Measures Meeting Target
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed chart data
 */
export const fetchChartMeasuresMeetingTarget = async (token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.CHART_MEASURES_MEETING_TARGET,
      {},
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to chart format
    const chartData = result.data.data.resultSet.map((row) => {
      const [month, measureCount] = row;
      return {
        month: month,
        value: measureCount
      };
    });

    return chartData;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Member Details with Filter Context (Age-based)
 * Retrieves member-level records filtered by measure, age category, and CRSP
 * @param {object} filters - Filter parameters
 * @param {string} filters.measureId - Measure ID
 * @param {string} filters.ageStrat - Age stratification category
 * @param {string} filters.crsp - CRSP organization name
 * @param {string} token - Authorization token
 * @returns {Promise} Member details data
 */
export const fetchMemberDetails = async (filters, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.MEMBER_DETAILS,
      {
        measureId: filters.measureId,
        ageStrat: filters.ageStrat,
        crsp: filters.crsp
      },
      token
    );

    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    const memberDetails = [];

    result.data.data.resultSet.forEach((row) => {
      const [memberId, memberName, measureId, ageStrat, crsp, age, status] = row;
      
      memberDetails.push({
        memberId: memberId,
        memberName: memberName,
        measureId: measureId,
        ageStrat: ageStrat,
        crsp: crsp,
        age: age,
        status: status,
        dob: 'N/A',
        gender: 'N/A',
        numerator: 1,
        denominator: 1,
        crspValue: crsp
      });
    });

    return memberDetails;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Race-based Member Details with Filter Context
 * Retrieves member-level records filtered by measure, race category, and CRSP
 * @param {object} filters - Filter parameters
 * @param {string} filters.measureId - Measure ID
 * @param {string} filters.raceStrat - Race stratification category
 * @param {string} filters.crsp - CRSP organization name
 * @param {string} token - Authorization token
 * @returns {Promise} Member details data
 */
export const fetchRaceMemberDetails = async (filters, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.RACE_MEMBER_DETAILS,
      {
        measureId: filters.measureId,
        raceStrat: filters.raceStrat,
        crsp: filters.crsp
      },
      token
    );

    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    const memberDetails = [];

    result.data.data.resultSet.forEach((row) => {
      const [memberId, memberName, measureId, raceStrat, crsp, age, status] = row;
      
      memberDetails.push({
        memberId: memberId,
        memberName: memberName,
        measureId: measureId,
        raceStrat: raceStrat,
        crsp: crsp,
        age: age,
        status: status,
        dob: 'N/A',
        race: raceStrat,
        gender: 'N/A',
        numerator: 1,
        denominator: 1,
        crspValue: crsp
      });
    });

    return memberDetails;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Ethnicity-based Member Details with Filter Context
 * Retrieves member-level records filtered by measure, ethnicity category, and CRSP
 * @param {object} filters - Filter parameters
 * @param {string} filters.measureId - Measure ID
 * @param {string} filters.ethnicityStrat - Ethnicity stratification category
 * @param {string} filters.crsp - CRSP organization name
 * @param {string} token - Authorization token
 * @returns {Promise} Member details data
 */
export const fetchEthnicityMemberDetails = async (filters, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.ETHNICITY_MEMBER_DETAILS,
      {
        measureId: filters.measureId,
        ethnicityStrat: filters.ethnicityStrat,
        crsp: filters.crsp
      },
      token
    );

    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    const memberDetails = [];

    result.data.data.resultSet.forEach((row) => {
      const [memberId, memberName, measureId, ethnicityStrat, crsp, age, status] = row;
      
      memberDetails.push({
        memberId: memberId,
        memberName: memberName,
        measureId: measureId,
        ethnicityStrat: ethnicityStrat,
        crsp: crsp,
        age: age,
        status: status,
        dob: 'N/A',
        ethnicity: ethnicityStrat,
        gender: 'N/A',
        numerator: 1,
        denominator: 1,
        crspValue: crsp
      });
    });

    return memberDetails;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch CRSP-level Member Details with Filter Context
 * Retrieves member-level records filtered by measure and CRSP
 * @param {object} filters - Filter parameters
 * @param {string} filters.measureId - Measure ID
 * @param {string} filters.crsp - CRSP organization name
 * @param {string} token - Authorization token
 * @returns {Promise} Member details data
 */
export const fetchCRSPMemberDetails = async (filters, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.CRSP_MEMBER_DETAILS,
      {
        measureId: filters.measureId,
        crsp: filters.crsp
      },
      token
    );

    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    const memberDetails = [];

    result.data.data.resultSet.forEach((row) => {
      const [memberId, memberName, measureId, crsp] = row;
      
      memberDetails.push({
        memberId: memberId,
        memberName: memberName,
        measureId: measureId,
        crsp: crsp,
        dob: 'N/A',
        gender: 'N/A',
        numerator: 1,
        denominator: 1,
        crspValue: crsp
      });
    });

    return memberDetails;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Measure Detail Data
 * @param {string} measureId - Measure ID
 * @param {string} token - Authorization token
 * @returns {Promise} Measure detail data
 */
export const fetchMeasureDetail = async (measureId, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.MEASURE_DETAIL,
      { measureId },
      token
    );

    return result.data?.data || {};
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Care Action Center Data
 * @param {object} filters - Filter parameters
 * @param {string} token - Authorization token
 * @returns {Promise} Care action data
 */
export const fetchCareActionData = async (filters, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.CARE_ACTION,
      filters,
      token
    );

    return result.data?.data || {};
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Rate Simulator Data
 * @param {string} measureId - Measure ID
 * @param {string} token - Authorization token
 * @returns {Promise} Rate simulator data
 */
export const fetchRateSimulatorData = async (measureId, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.RATE_SIMULATOR,
      { measureId },
      token
    );

    return result.data?.data || {};
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Provider Scores Data
 * @param {object} filters - Filter parameters
 * @param {string} token - Authorization token
 * @returns {Promise} Provider scores data
 */
export const fetchProviderScores = async (filters, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.PROVIDER_SCORES,
      filters,
      token
    );

    return result.data?.data || {};
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Mini Chart Measure Trend Data
 * Returns measure rate trends by month for a specific measure
 * @param {string} measureId - Measure ID to fetch trend data for
 * @param {string} token - Authorization token
 * @returns {object} Mini chart data with months and rates
 */
export const fetchMiniChartData = async (measureId, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.MINI_CHART_MEASURE_TREND,
      {
        appId: APP_ID
      },
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to chart format
    // Filter data for the specific measure and transform to chart-friendly format
    const chartData = result.data.data.resultSet
      .filter(row => row[0] === measureId) // Filter by measure_id
      .map(row => ({
        month: row[1], // month
        rate: row[2]   // rate
      }))
      .sort((a, b) => {
        // Sort by month (Jan, Feb, Mar, etc.)
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const aMonth = a.month.split('-')[0];
        const bMonth = b.month.split('-')[0];
        return monthOrder.indexOf(aMonth) - monthOrder.indexOf(bMonth);
      });

    return chartData;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Lowest Performing Measures
 * Returns the 5 lowest performing measures by rate
 * @param {string} token - Authorization token
 * @returns {array} Array of lowest performing measures with measure_id, display_name, and rate
 */
export const fetchLowestPerformingMeasures = async (token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.LOWEST_PERFORMING_MEASURES,
      {
        appId: APP_ID
      },
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to measure format
    // resultSet format: [measure_id, display_name, rate]
    const measures = result.data.data.resultSet.map(row => ({
      measure_id: row[0],
      display_name: row[1],
      rate: row[2]
    }));

    return measures;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch CRSPs Needing Attention
 * Returns CRSPs with performance issues (low rates)
 * @param {string} token - Authorization token
 * @returns {array} Array of CRSPs with measure_id, crsp_name, and rate
 */
export const fetchCRSPsNeedingAttention = async (token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.CRSPS_NEEDING_ATTENTION,
      {
        appId: APP_ID
      },
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to CRSP format
    // resultSet format: [measure_id, crsp, rate]
    const crsps = result.data.data.resultSet.map(row => ({
      measure_id: row[0],
      crsp_name: row[1],
      rate: row[2]
    }));

    return crsps;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch Equity Alerts
 * Returns equity alerts with measure, race/ethnicity, and rate disparities
 * @param {string} token - Authorization token
 * @returns {array} Array of equity alerts with measure_id, race_strat, and rate
 */
export const fetchEquityAlerts = async (token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.EQUITY_ALERTS,
      {
        appId: APP_ID
      },
      token
    );


    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to equity alert format
    // resultSet format: [measure_id, race_strat, rate]
    const alerts = result.data.data.resultSet.map(row => ({
      measure_id: row[0],
      race_strat: row[1],
      rate: row[2]
    }));

    return alerts;
  } catch (error) {
    throw error;
  }
};

/**
 * Update Workflow ID for a feature
 * @param {string} feature - Feature name (DASHBOARD_KPI, MEASURE_DETAIL, etc.)
 * @param {string} workflowId - New workflow ID
 */
export const updateWorkflowId = (feature, workflowId) => {
  if (WORKFLOW_IDS[feature]) {
    WORKFLOW_IDS[feature] = workflowId;
  } else {
  }
};

/**
 * Get all workflow IDs
 * @returns {object} All workflow IDs
 */
export const getWorkflowIds = () => WORKFLOW_IDS;

/**
 * Get API configuration
 * @returns {object} API configuration
 */
export const getApiConfig = () => ({
  baseUrl: API_BASE_URL,
  appId: APP_ID,
  workflowIds: WORKFLOW_IDS
});

/**
 * Fetch all measures for Care Action Center dropdown
 * @param {string} token - Authorization token
 * @returns {Promise<string[]>} Array of measure IDs
 */
export const fetchCACMeasures = async (token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.CAC_MEASURES,
      {},
      token
    );

    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    return result.data.data.resultSet.map(row => row[0]);
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch all CRSPs for Care Action Center dropdown
 * @param {string} token - Authorization token
 * @returns {Promise<string[]>} Array of CRSP names
 */
export const fetchCACCRSPs = async (token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.CAC_CRSPS,
      {},
      token
    );

    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    return result.data.data.resultSet.map(row => row[0]);
  } catch (error) {
    throw error;
  }
};

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
    throw error;
  }
};

/**
 * Fetch Care Action Center non-compliant count
 * @param {string} token - Authorization token
 * @returns {Promise<number>} Non-compliant count
 */
export const fetchCACNonCompliantCount = async (token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.CAC_NON_COMPLIANT,
      {},
      token
    );

    if (!result.data?.data?.resultSet || result.data.data.resultSet.length === 0) {
      return 21292; // Default value
    }

    const count = result.data.data.resultSet[0][0];
    return count || 21292;
  } catch (error) {
    // Return default value on error
    return 21292;
  }
};

/**
 * Fetch Care Action Center unassigned count
 * @param {string} token - Authorization token
 * @returns {Promise<number>} Unassigned count
 */
export const fetchCACUnassignedCount = async (token) => {
  try {
    // TODO: Replace with actual workflow ID when available
    // For now, return a default value
    const result = await callWorkflow(
      WORKFLOW_IDS.CAC_UNASSIGNED,
      {},
      token
    );

    if (!result.data?.data?.resultSet || result.data.data.resultSet.length === 0) {
      return 2392; // Default value
    }

    return result.data.data.resultSet[0][0] || 2392;
  } catch (error) {
    // Return default value on error
    return 2392;
  }
};

/**
 * Fetch Care Action Center actionable count
 * @param {string} token - Authorization token
 * @returns {Promise<number>} Actionable count
 */
export const fetchCACActionableCount = async (token) => {
  try {
    // TODO: Replace with actual workflow ID when available
    // For now, return a default value
    const result = await callWorkflow(
      WORKFLOW_IDS.CAC_ACTIONABLE,
      {},
      token
    );

    if (!result.data?.data?.resultSet || result.data.data.resultSet.length === 0) {
      return 5842; // Default value
    }

    return result.data.data.resultSet[0][0] || 5842;
  } catch (error) {
    // Return default value on error
    return 5842;
  }
};

/**
 * Fetch Care Action Center expiring this week count
 * @param {string} token - Authorization token
 * @returns {Promise<number>} Expiring count
 */
export const fetchCACExpiringCount = async (token) => {
  try {
    // TODO: Replace with actual workflow ID when available
    // For now, return a default value
    const result = await callWorkflow(
      WORKFLOW_IDS.CAC_EXPIRING,
      {},
      token
    );

    if (!result.data?.data?.resultSet || result.data.data.resultSet.length === 0) {
      return 127; // Default value
    }

    return result.data.data.resultSet[0][0] || 127;
  } catch (error) {
    // Return default value on error
    return 127;
  }
};

export default {
  fetchDashboardKPI,
  fetchDashboardMeasures,
  setSelectedWorkflowMonth,
  getSelectedWorkflowMonth,
  fetchAvailableMonths,
  resetAvailableMonthsCache,
  fetchAllMeasuresGrid,
  fetchCRSPLevelData,
  fetchAgeCRSPDrilldown,
  fetchRaceCRSPDrilldown,
  fetchEthnicityCRSPDrilldown,
  fetchMeasureStratification,
  fetchMeasureStratificationEthnicity,
  fetchMeasureStratificationRace,
  fetchChartMeasuresMeetingTarget,
  fetchMemberDetails,
  fetchRaceMemberDetails,
  fetchEthnicityMemberDetails,
  fetchCRSPMemberDetails,
  fetchMeasureDetail,
  fetchCareActionData,
  fetchRateSimulatorData,
  fetchProviderScores,
  fetchMiniChartData,
  fetchLowestPerformingMeasures,
  fetchCRSPsNeedingAttention,
  fetchEquityAlerts,
  fetchCACMeasures,
  fetchCACCRSPs,
  fetchCACGridData,
  fetchCACNonCompliantCount,
  fetchCACUnassignedCount,
  fetchCACActionableCount,
  fetchCACExpiringCount,
  updateWorkflowId,
  getWorkflowIds,
  getApiConfig,
  callWorkflow
};
