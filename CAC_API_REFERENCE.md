# Care Action Center API Reference

## Workflow Configuration

### Workflow ID
```
105691ee-582c-11f1-9e64-33f111c58511
```

### Endpoint
```
POST https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow
```

### Request Format
```javascript
{
  "workflowId": "105691ee-582c-11f1-9e64-33f111c58511",
  "data": {
    "appId": "4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d",
    // Optional filters:
    "measureId": "FUM_30",  // Filter by measure
    "crsp": "TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE"  // Filter by CRSP
  }
}
```

## Response Format

### Success Response
```json
{
  "version": {
    "name": "vanilla",
    "version": null
  },
  "status": {
    "code": "200",
    "value": "success"
  },
  "data": {
    "data": {
      "queryInfo": {
        "totalRows": 21292,
        "type": "selected"
      },
      "metaData": [
        {
          "colIndex": 0,
          "colName": "member_id",
          "colType": "Integer",
          "colId": "member_id",
          "cryptographicFunction": "NONE"
        },
        {
          "colIndex": 1,
          "colName": "member_name",
          "colType": "Varchar",
          "colId": "member_name",
          "cryptographicFunction": "NONE"
        },
        {
          "colIndex": 2,
          "colName": "measure_id",
          "colType": "Varchar",
          "colId": "measure_id",
          "cryptographicFunction": "NONE"
        },
        {
          "colIndex": 3,
          "colName": "crsp",
          "colType": "Varchar",
          "colId": "crsp",
          "cryptographicFunction": "NONE"
        }
      ],
      "resultSet": [
        [1350796, "Davis, Curtisha", "FUM_30", "TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE"],
        [1576144, "Cole, Lucy", "FUM_30", "NO CRSP"],
        [1328308, "Gibney, Brian", "AAP", "NO CRSP"],
        [1629257, "Conley- Strange, Celeste", "BCS-E", "WAYNE CENTER"],
        [1336554, "Person, Travis", "FUM_7", "TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE"],
        [1559731, "Perkins, Kai'La", "FUM_7", "VITAL HEALTH MANAGEMENT, LLC"],
        [1554878, "Alwaely, Thikra", "AAP", "NO CRSP"],
        [1420296, "THOMAS, AMANI", "FUM_30", "NO CRSP"],
        [1608825, "White, Garion", "APM-E", "TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE"],
        [1636405, "Mongar, Joshua", "FUM_30", "TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE"]
      ]
    }
  }
}
```

## Data Mapping

### Column Indices
- **[0]** = member_id (Integer) - Unique member identifier
- **[1]** = member_name (String) - Full name of member
- **[2]** = measure_id (String) - Quality measure code (e.g., FUM_30, AAP, BCS-E)
- **[3]** = crsp (String) - Community Response Service Provider name

### Sample Data
```
Member ID: 1350796
Member Name: Davis, Curtisha
Measure: FUM_30 (Follow-up after hospitalization for mental illness - 30 days)
CRSP: TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE
```

## Measure Codes

Common measure codes returned:
- **FUM_30** - Follow-up after hospitalization for mental illness (30-day)
- **FUM_7** - Follow-up after hospitalization for mental illness (7-day)
- **AAP** - Antipsychotic medication management
- **BCS-E** - Breast cancer screening (electronic)
- **APM-E** - Antipsychotic medication monitoring

## CRSP Values

Examples of CRSP values:
- TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE
- NO CRSP
- WAYNE CENTER
- VITAL HEALTH MANAGEMENT, LLC
- ALL WELL-BEING SERVICES D/B/A AWBS - MAIN OFFICE
- ARAB COMMUNITY CENTER FOR ECONOMIC SOCIAL SERVICES (ACCESS) INC.

## Implementation in React

### Fetch Function
```javascript
const fetchCACGridData = async (filters = {}, token) => {
  const result = await callWorkflow(
    WORKFLOW_IDS.CAC_GRID,
    filters,
    token
  );
  return result.data.data;
};
```

### Usage in Component
```javascript
const data = await fetchCACGridData({
  measureId: 'FUM_30',
  crsp: 'TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE'
}, token);

// Access results
data.resultSet.forEach(row => {
  const memberId = row[0];
  const memberName = row[1];
  const measure = row[2];
  const crsp = row[3];
});
```

## Error Handling

### Common Errors
- Invalid workflow ID
- Missing authorization token
- Invalid filter parameters
- API timeout (large result sets)

### Response on Error
```json
{
  "status": {
    "code": "400",
    "value": "error"
  },
  "message": "Error description"
}
```

## Performance Notes

- **Total Records**: 21,292 members
- **Response Time**: Varies based on filters
- **Pagination**: Not implemented in current API (consider adding for large datasets)
- **Caching**: Consider caching results to reduce API calls

## Future Enhancements

1. Add pagination support (limit/offset)
2. Add sorting parameters
3. Add additional filter options
4. Add result caching
5. Add batch operations
