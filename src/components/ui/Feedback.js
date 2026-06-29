import './Feedback.css';

/* Loading — shimmer placeholder block */
export const Skeleton = ({ width = '100%', height = 14, radius = 6, style }) => (
  <span
    className="skeleton"
    style={{ width, height, borderRadius: radius, ...style }}
    aria-hidden="true"
  />
);

/* Loading — a few lines of shimmer text */
export const SkeletonText = ({ lines = 3 }) => (
  <span className="skeleton-text" aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} height={12} width={i === lines - 1 ? '60%' : '100%'} />
    ))}
  </span>
);

/* Empty — distinct from loading; friendly and clear */
export const EmptyState = ({ icon = '✨', title, hint, action }) => (
  <div className="state-block" role="status">
    <div className="state-icon" aria-hidden="true">{icon}</div>
    {title && <div className="state-title">{title}</div>}
    {hint && <div className="state-hint">{hint}</div>}
    {action}
  </div>
);

/* Error — never silent; always offers Retry */
export const ErrorState = ({ title = 'Couldn’t load this', message, onRetry }) => (
  <div className="state-block state-error" role="alert">
    <div className="state-icon" aria-hidden="true">⚠️</div>
    <div className="state-title">{title}</div>
    {message && <div className="state-hint">{message}</div>}
    {onRetry && (
      <button type="button" className="btn btn-secondary state-retry" onClick={onRetry}>
        ↻ Retry
      </button>
    )}
  </div>
);
