import React, { useMemo, useState, useEffect } from 'react';
import './MonthFilter.css';

/**
 * Returns today's month in the same `YYYY-MM` form that the MonthFilter `<select>`
 * uses. Used as the initial selection before the AVAILABLE_MONTHS workflow has
 * returned a real list; once it does, App auto-corrects to the most recent
 * month from the API response if today isn't in the list.
 */
export const getCurrentMonthValue = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

// Fallback generator (used only when `availableMonths` prop is absent or empty,
// e.g. before the API has responded or if the call fails).
const generateFallbackMonths = () => {
  const months = [];
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push({ value: monthValue, label: monthName });
  }
  // Most recent first to match the API-driven shape.
  return months.reverse();
};

// Extract just the month name (full when available, e.g. "October") from a
// month option. Used when the Year dropdown is set, since the year would
// otherwise be redundant in every line.
const monthOnlyLabel = (monthOpt) => {
  if (monthOpt.monthName) return monthOpt.monthName;
  if (monthOpt.label) return monthOpt.label.split(' ')[0];
  if (monthOpt.monYear) return monthOpt.monYear.split('-')[0];
  return '';
};

const MonthFilter = ({ selectedMonth, onMonthChange, availableMonths }) => {
  const monthOptions = (availableMonths && availableMonths.length > 0)
    ? availableMonths
    : generateFallbackMonths();

  // Unique years from the months list (newest first). The Year dropdown is a
  // UI-only filter on top of the Month dropdown — it doesn't get sent in the
  // payload itself; the selected month implicitly carries the year.
  const years = useMemo(() => {
    const seen = new Set();
    const list = [];
    monthOptions.forEach((m) => {
      const y = m.value.split('-')[0];
      if (y && !seen.has(y)) {
        seen.add(y);
        list.push(y);
      }
    });
    return list.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  }, [monthOptions]);

  // Internal year state derived from `selectedMonth` (so deep-linking / parent-
  // driven changes keep the Year dropdown in sync).
  const yearFromSelected = selectedMonth ? selectedMonth.split('-')[0] : '';
  const [selectedYear, setSelectedYear] = useState(yearFromSelected || years[0] || '');

  useEffect(() => {
    if (yearFromSelected && yearFromSelected !== selectedYear) {
      setSelectedYear(yearFromSelected);
    }
  }, [yearFromSelected, selectedYear]);

  // When a specific year is chosen, the Month dropdown shows only that year's
  // months; "All Years" shows every available month.
  const filteredMonths = selectedYear
    ? monthOptions.filter((m) => m.value.startsWith(`${selectedYear}-`))
    : monthOptions;

  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
    if (!newYear) return; // "All Years" — leave month selection alone.
    // If the currently-selected month is in another year, snap to the most
    // recent month of the newly-chosen year so the user immediately sees data.
    const currentYear = selectedMonth ? selectedMonth.split('-')[0] : '';
    if (currentYear === newYear) return;
    const yearMonths = monthOptions.filter((m) => m.value.startsWith(`${newYear}-`));
    if (yearMonths.length > 0) {
      onMonthChange(yearMonths[0].value); // already most-recent-first
    }
  };

  return (
    <div className="month-filter-container">
      <label htmlFor="year-select" className="month-filter-label">
        Year:
      </label>
      <select
        id="year-select"
        value={selectedYear}
        onChange={(e) => handleYearChange(e.target.value)}
        className="month-filter-select month-filter-select--year"
      >
        <option value="">-- All Years --</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <span className="month-filter-divider" aria-hidden="true" />

      <label htmlFor="month-select" className="month-filter-label">
        Month:
      </label>
      <select
        id="month-select"
        value={selectedMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        className="month-filter-select"
      >
        <option value="">-- All Months --</option>
        {filteredMonths.map((month) => (
          <option key={month.value} value={month.value}>
            {selectedYear ? monthOnlyLabel(month) : month.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default MonthFilter;
