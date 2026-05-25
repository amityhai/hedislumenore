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
    console.error('Workflow API Error:', error);
    throw error;
  }
};

/**
 * Fetch Ethnicity-CRSP Drill-down Data
 * @param {string} measureId - Measure ID to filter by
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed ethnicity-CRSP drill-down data
 */
export const fetchEthnicityCRSPDrilldown = async (measureId, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.ETHNICITY_CRSP_DRILLDOWN,
      {},
      token
    );

    console.log('Raw Ethnicity-CRSP Drilldown API Response:', result);
    console.log('Filtering for measureId:', measureId);

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
        console.log(`Processing: measure=${rowMeasureId}, ethnicity=${ethnicityStrat}, crsp=${crsp}, rate=${rate}`);
        
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

    console.log('Transformed Ethnicity-CRSP Drilldown Data:', ethnicityGroupMap);
    return ethnicityGroupMap;
  } catch (error) {
    console.error('Error fetching Ethnicity-CRSP Drilldown Data:', error);
    throw error;
  }
};

/**
 * Fetch Race-CRSP Drill-down Data
 * @param {string} measureId - Measure ID to filter by
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed race-CRSP drill-down data
 */
export const fetchRaceCRSPDrilldown = async (measureId, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.RACE_CRSP_DRILLDOWN,
      {},
      token
    );

    console.log('Raw Race-CRSP Drilldown API Response:', result);
    console.log('Filtering for measureId:', measureId);

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
        console.log(`Processing: measure=${rowMeasureId}, race=${raceStrat}, crsp=${crsp}, rate=${rate}`);
        
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

    console.log('Transformed Race-CRSP Drilldown Data:', raceGroupMap);
    return raceGroupMap;
  } catch (error) {
    console.error('Error fetching Race-CRSP Drilldown Data:', error);
    throw error;
  }
};

/**
 * Fetch Age-CRSP Drill-down Data
 * @param {string} measureId - Measure ID to filter by
 * @param {string} token - Authorization token
 * @returns {Promise} Transformed age-CRSP drill-down data
 */
export const fetchAgeCRSPDrilldown = async (measureId, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.AGE_CRSP_DRILLDOWN,
      {},
      token
    );

    console.log('Raw Age-CRSP Drilldown API Response:', result);
    console.log('Filtering for measureId:', measureId);

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
        console.log(`Processing: measure=${rowMeasureId}, age=${ageStrat}, crsp=${crsp}, rate=${rate}`);
        
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

    console.log('Transformed Age-CRSP Drilldown Data:', ageGroupMap);
    return ageGroupMap;
  } catch (error) {
    console.error('Error fetching Age-CRSP Drilldown Data:', error);
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

    console.log('Raw CRSP Level API Response:', result);
    console.log('Filtering for measureId:', measureId);

    if (!result.data?.data?.resultSet) {
      throw new Error('Invalid response format');
    }

    // Transform API response to CRSP level format for the specific measure
    const crspData = [];

    result.data.data.resultSet.forEach((row) => {
      // Log each row to debug the structure
      console.log('CRSP Row:', row);
      
      const [rowMeasureId, crsp, numerator, denominator, rate] = row;
      
      console.log(`Comparing: rowMeasureId="${rowMeasureId}" vs measureId="${measureId}", match: ${rowMeasureId === measureId}`);
      
      // Only include rows for the requested measure
      if (rowMeasureId === measureId) {
        console.log(`Processing CRSP: ${rowMeasureId}, CRSP: ${crsp}, rate: ${rate}`);
        
        crspData.push({
          crsp: crsp,
          rate: Math.round(rate),
          numerator: numerator,
          denominator: denominator
        });
      }
    });

    console.log('Transformed CRSP Level Data for measure', measureId, ':', crspData);
    return crspData;
  } catch (error) {
    console.error('Error fetching CRSP Level Data:', error);
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

    console.log('Raw All Measures Grid API Response:', result);

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

    console.log('Transformed Measures Grid:', measuresGrid);
    return measuresGrid;
  } catch (error) {
    console.error('Error fetching All Measures Grid:', error);
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
                 'Below benchmark / critical',
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
    console.error('Error fetching Dashboard KPI:', error);
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

    console.log('Raw API Response:', result);

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
      
      console.log(`Processing measure: ${measureId}, category: ${category}, rate: ${rate}, goal: ${goal50th}, gap: ${gapToGoal}`);
      
      // Validate required fields
      if (!measureId || !category || !displayName || denominator === null || denominator === undefined) {
        console.warn(`Skipping invalid measure row:`, row);
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
        console.warn(`Unknown category: ${category}. Available categories: ${Object.keys(measuresMap).join(', ')}`);
      }
    });

    console.log('Transformed Measures:', measuresMap);
    return measuresMap;
  } catch (error) {
    console.error('Error fetching Dashboard Measures:', error);
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
      {},
      token
    );

    console.log('Raw Age Stratification API Response:', result);

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
        console.log(`Processing age stratification: ${rowMeasureId}, age: ${ageStrat}, rate: ${rateAge}, not_meeting: ${notMeeting}, disparity: ${disparity}`);
        
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

    console.log('Transformed Age Stratification Data:', stratificationMap);
    return stratificationMap;
  } catch (error) {
    console.error('Error fetching Measure Age Stratification:', error);
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
      {},
      token
    );

    console.log('Raw Ethnicity Stratification API Response:', result);

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
        console.log(`Processing ethnicity stratification: ${rowMeasureId}, ethnicity: ${ethnicityStrat}, rate: ${rateEthnicity}, not_meeting: ${notMeeting}, disparity: ${disparity}`);
        
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

    console.log('Transformed Ethnicity Stratification Data:', stratificationMap);
    return stratificationMap;
  } catch (error) {
    console.error('Error fetching Measure Ethnicity Stratification:', error);
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
      {},
      token
    );

    console.log('Raw Race Stratification API Response:', result);

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
        console.log(`Processing race stratification: ${rowMeasureId}, race: ${raceStrat}, rate: ${rateRace}, not_meeting: ${notMeeting}, disparity: ${disparity}`);
        
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

    console.log('Transformed Race Stratification Data:', stratificationMap);
    return stratificationMap;
  } catch (error) {
    console.error('Error fetching Measure Race Stratification:', error);
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

    console.log('Raw Chart Data API Response:', result);

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

    console.log('Transformed Chart Data:', chartData);
    return chartData;
  } catch (error) {
    console.error('Error fetching Chart Data:', error);
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
        crsp: filters.crsp,
        stratification: filters.ageStrat,
        stratificationType: 'age'
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
    console.error('Error fetching Member Details:', error);
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
        crsp: filters.crsp,
        stratification: filters.raceStrat,
        stratificationType: 'race'
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
    console.error('Error fetching Race Member Details:', error);
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
        crsp: filters.crsp,
        stratification: filters.ethnicityStrat,
        stratificationType: 'ethnicity'
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
    console.error('Error fetching Ethnicity Member Details:', error);
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
        crsp: filters.crsp,
        ...(filters.stratification && { stratification: filters.stratification }),
        ...(filters.stratificationType && { stratificationType: filters.stratificationType })
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
    console.error('Error fetching CRSP Member Details:', error);
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
    console.error('Error fetching Measure Detail:', error);
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
    console.error('Error fetching Care Action Data:', error);
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
    console.error('Error fetching Rate Simulator Data:', error);
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
    console.error('Error fetching Provider Scores:', error);
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

    console.log('Raw Mini Chart API Response:', result);

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

    console.log('Transformed Mini Chart Data:', chartData);
    return chartData;
  } catch (error) {
    console.error('Error fetching Mini Chart Data:', error);
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

    console.log('Raw Lowest Performing Measures API Response:', result);

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

    console.log('Transformed Lowest Performing Measures:', measures);
    return measures;
  } catch (error) {
    console.error('Error fetching Lowest Performing Measures:', error);
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

    console.log('Raw CRSPs Needing Attention API Response:', result);

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

    console.log('Transformed CRSPs Needing Attention:', crsps);
    return crsps;
  } catch (error) {
    console.error('Error fetching CRSPs Needing Attention:', error);
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

    console.log('Raw Equity Alerts API Response:', result);

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

    console.log('Transformed Equity Alerts:', alerts);
    return alerts;
  } catch (error) {
    console.error('Error fetching Equity Alerts:', error);
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
    console.log(`Updated ${feature} workflow ID to: ${workflowId}`);
  } else {
    console.warn(`Feature ${feature} not found in WORKFLOW_IDS`);
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
    console.error('Error fetching CAC measures:', error);
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
    console.error('Error fetching CAC CRSPs:', error);
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
    console.error('Error fetching CAC grid data:', error);
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
    console.log('Fetching non-compliant count...');
    const result = await callWorkflow(
      WORKFLOW_IDS.CAC_NON_COMPLIANT,
      {},
      token
    );

    if (!result.data?.data?.resultSet || result.data.data.resultSet.length === 0) {
      console.warn('No non-compliant data returned, using default');
      return 21292; // Default value
    }

    const count = result.data.data.resultSet[0][0];
    console.log('Non-compliant count fetched:', count);
    return count || 21292;
  } catch (error) {
    console.error('Error fetching CAC non-compliant count:', error);
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
    console.log('Fetching unassigned count...');
    const result = await callWorkflow(
      WORKFLOW_IDS.CAC_UNASSIGNED,
      {},
      token
    );

    if (!result.data?.data?.resultSet || result.data.data.resultSet.length === 0) {
      console.warn('No unassigned data returned, using default');
      return 2392; // Default value
    }

    return result.data.data.resultSet[0][0] || 2392;
  } catch (error) {
    console.error('Error fetching CAC unassigned count:', error);
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
    console.log('Fetching actionable count...');
    const result = await callWorkflow(
      WORKFLOW_IDS.CAC_ACTIONABLE,
      {},
      token
    );

    if (!result.data?.data?.resultSet || result.data.data.resultSet.length === 0) {
      console.warn('No actionable data returned, using default');
      return 5842; // Default value
    }

    return result.data.data.resultSet[0][0] || 5842;
  } catch (error) {
    console.error('Error fetching CAC actionable count:', error);
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
    console.log('Fetching expiring count...');
    const result = await callWorkflow(
      WORKFLOW_IDS.CAC_EXPIRING,
      {},
      token
    );

    if (!result.data?.data?.resultSet || result.data.data.resultSet.length === 0) {
      console.warn('No expiring data returned, using default');
      return 127; // Default value
    }

    return result.data.data.resultSet[0][0] || 127;
  } catch (error) {
    console.error('Error fetching CAC expiring count:', error);
    // Return default value on error
    return 127;
  }
};

export default {
  fetchDashboardKPI,
  fetchDashboardMeasures,
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
