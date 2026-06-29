import './StatusBadge.css';

// Status is conveyed by shape + label + color (never color alone) so it stays
// legible for colorblind users.
const META = {
  'Above Goal': { cls: 'above', label: 'Above Goal' },
  'At Goal':    { cls: 'at',    label: 'At Goal' },
  'Below Goal': { cls: 'below', label: 'Below Goal' },
};

const StatusBadge = ({ status, size }) => {
  const m = META[status] || { cls: 'neutral', label: status || '—' };
  return (
    <span className={`status-badge2 sb-${m.cls} ${size === 'sm' ? 'sb-sm' : ''}`}>
      <span className="sb-dot" aria-hidden="true" />
      {m.label}
    </span>
  );
};

export default StatusBadge;
