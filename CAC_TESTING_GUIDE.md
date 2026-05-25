# Care Action Center Integration - Testing Guide

## Pre-Testing Checklist

- [ ] Valid authentication token available
- [ ] Network access to `https://dwihn-uat.lumenore.com`
- [ ] Application ID: `4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d`
- [ ] Workflow ID: `105691ee-582c-11f1-9e64-33f111c58511`

## Unit Testing

### Test 1: Component Renders
```javascript
test('CareActionCenter renders without crashing', () => {
  render(<CareActionCenter onBack={jest.fn()} token="test-token" />);
  expect(screen.getByText('Care Action Center')).toBeInTheDocument();
});
```

### Test 2: Filters Load
```javascript
test('Measure and CRSP filters load', async () => {
  render(<CareActionCenter onBack={jest.fn()} token="test-token" />);
  
  // Wait for filters to load
  await waitFor(() => {
    expect(screen.getByTitle('Filter by measure')).toBeInTheDocument();
    expect(screen.getByTitle('Filter by CRSP')).toBeInTheDocument();
  });
});
```

### Test 3: Grid Data Loads
```javascript
test('Grid data loads and displays', async () => {
  render(<CareActionCenter onBack={jest.fn()} token="test-token" />);
  
  // Wait for grid to load
  await waitFor(() => {
    expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
  });
  
  // Check table headers
  expect(screen.getByText('Member ID')).toBeInTheDocument();
  expect(screen.getByText('Member Name')).toBeInTheDocument();
  expect(screen.getByText('Measure')).toBeInTheDocument();
  expect(screen.getByText('CRSP')).toBeInTheDocument();
});
```

### Test 4: Modal Opens
```javascript
test('Modal opens when View Details is clicked', async () => {
  render(<CareActionCenter onBack={jest.fn()} token="test-token" />);
  
  // Wait for grid to load
  await waitFor(() => {
    const buttons = screen.getAllByText('View Details');
    expect(buttons.length).toBeGreaterThan(0);
  });
  
  // Click first View Details button
  const viewButton = screen.getAllByText('View Details')[0];
  fireEvent.click(viewButton);
  
  // Check modal appears
  expect(screen.getByText(/Member Details:/)).toBeInTheDocument();
});
```

## Integration Testing

### Test 5: Filter by Measure
```javascript
test('Filtering by measure updates grid', async () => {
  render(<CareActionCenter onBack={jest.fn()} token="test-token" />);
  
  // Wait for initial load
  await waitFor(() => {
    expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
  });
  
  // Select a measure
  const measureSelect = screen.getByTitle('Filter by measure');
  fireEvent.change(measureSelect, { target: { value: 'FUM_30' } });
  
  // Wait for grid to update
  await waitFor(() => {
    expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
  });
  
  // Verify grid updated
  expect(screen.getByText('FUM_30')).toBeInTheDocument();
});
```

### Test 6: Filter by CRSP
```javascript
test('Filtering by CRSP updates grid', async () => {
  render(<CareActionCenter onBack={jest.fn()} token="test-token" />);
  
  // Wait for initial load
  await waitFor(() => {
    expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
  });
  
  // Select a CRSP
  const crspSelect = screen.getByTitle('Filter by CRSP');
  fireEvent.change(crspSelect, { 
    target: { value: 'TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE' } 
  });
  
  // Wait for grid to update
  await waitFor(() => {
    expect(screen.queryByText('Loading data...')).not.toBeInTheDocument();
  });
});
```

## Manual Testing

### Scenario 1: Initial Load
1. Navigate to Care Action Center
2. **Expected**: 
   - KPI cards display with values
   - Filters load with options
   - Grid shows loading indicator briefly
   - Grid displays member data (21,292 rows available)

### Scenario 2: Filter by Measure
1. Click Measure dropdown
2. Select "FUM_30"
3. **Expected**:
   - Grid shows loading indicator
   - Grid updates to show only FUM_30 records
   - Row count decreases

### Scenario 3: Filter by CRSP
1. Click CRSP dropdown
2. Select "TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE"
3. **Expected**:
   - Grid shows loading indicator
   - Grid updates to show only selected CRSP
   - Row count decreases

### Scenario 4: Combined Filters
1. Select Measure: "FUM_30"
2. Select CRSP: "TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE"
3. **Expected**:
   - Grid shows loading indicator
   - Grid updates with both filters applied (AND logic)
   - Row count significantly decreases

### Scenario 5: View Member Details
1. Click "View Details" button on any row
2. **Expected**:
   - Modal opens
   - Modal displays:
     - Member name and ID
     - Measure
     - CRSP
     - Action type dropdown
     - Notes textarea
     - Save and Cancel buttons

### Scenario 6: Modal Actions
1. Open modal (Scenario 5)
2. Select action type from dropdown
3. Enter notes in textarea
4. Click "Save Action"
5. **Expected**:
   - Modal closes
   - (Future: Data sent to backend)

### Scenario 7: Modal Close
1. Open modal (Scenario 5)
2. Click "Cancel" or X button
3. **Expected**:
   - Modal closes
   - Grid remains visible

## API Testing

### Test API Response
```bash
curl -X POST "https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow" \
  -H "authorization: Bearer YOUR_TOKEN" \
  -H "application-id: 4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d" \
  -H "content-type: multipart/form-data" \
  -F "data={\"workflowId\":\"105691ee-582c-11f1-9e64-33f111c58511\",\"data\":{\"appId\":\"4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d\"}}"
```

### Expected Response
```json
{
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
      "metaData": [...],
      "resultSet": [...]
    }
  }
}
```

## Performance Testing

### Test 1: Initial Load Time
- Measure time from component mount to grid display
- **Target**: < 3 seconds

### Test 2: Filter Response Time
- Measure time from filter selection to grid update
- **Target**: < 2 seconds

### Test 3: Large Dataset Handling
- Test with full 21,292 records
- **Expected**: Grid renders without lag
- **Note**: Consider pagination for production

### Test 4: Memory Usage
- Monitor memory usage with large dataset
- **Expected**: No memory leaks
- **Note**: Use React DevTools Profiler

## Error Handling Testing

### Test 1: Invalid Token
1. Pass invalid token to component
2. **Expected**: Error message in console, grid shows "No data available"

### Test 2: Network Error
1. Disconnect network
2. Try to load grid
3. **Expected**: Error message in console, loading indicator disappears

### Test 3: API Timeout
1. Make request with very large filter result
2. **Expected**: Timeout handled gracefully

## Browser Compatibility

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader announces table data
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators visible

## Regression Testing

After integration, verify:
- [ ] Dashboard still loads correctly
- [ ] Other components not affected
- [ ] Token service still works
- [ ] Navigation between pages works

## Test Data

### Sample Member Records
```
1350796, Davis, Curtisha, FUM_30, TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE
1576144, Cole, Lucy, FUM_30, NO CRSP
1328308, Gibney, Brian, AAP, NO CRSP
1629257, Conley- Strange, Celeste, BCS-E, WAYNE CENTER
1336554, Person, Travis, FUM_7, TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE
```

## Known Issues / Limitations

1. **No Pagination**: Currently loads all 21,292 records
   - **Impact**: May cause performance issues
   - **Solution**: Implement pagination in future

2. **No Sorting**: Cannot sort by column
   - **Impact**: Users cannot organize data
   - **Solution**: Add column sorting in future

3. **Modal Save Not Connected**: Save button doesn't send data to backend
   - **Impact**: Actions not persisted
   - **Solution**: Connect to backend API in future

4. **Status Filter Not Implemented**: Status dropdown doesn't filter
   - **Impact**: Cannot filter by status
   - **Solution**: Implement in future

5. **Assigned Staff Filter Not Implemented**: Assigned staff dropdown doesn't filter
   - **Impact**: Cannot filter by assigned staff
   - **Solution**: Implement in future

## Sign-Off

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All manual scenarios pass
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Accessibility verified
- [ ] Ready for production
