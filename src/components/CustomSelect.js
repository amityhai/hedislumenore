import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

const CustomSelect = ({ value, onChange, options, placeholder = 'Select...', disabled = false, title = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <div className="custom-select" ref={containerRef} title={title}>
      <button
        className="custom-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>{selectedLabel}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" className={isOpen ? 'open' : ''}>
          <path fill="var(--c-primary)" d="M1 1l5 5 5-5" />
        </svg>
      </button>

      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
