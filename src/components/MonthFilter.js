import React from 'react';
import './MonthFilter.css';

const MonthFilter = ({ selectedMonth, onMonthChange }) => {
  // Generate last 12 months
  const getMonthOptions = () => {
    const months = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({ value: monthValue, label: monthName });
    }
    
    return months;
  };

  const monthOptions = getMonthOptions();

  return (
    <div className="month-filter-container">
      <label htmlFor="month-select" className="month-filter-label">
        Select Month:
      </label>
      <select
        id="month-select"
        value={selectedMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        className="month-filter-select"
      >
        <option value="">-- All Months --</option>
        {monthOptions.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default MonthFilter;
