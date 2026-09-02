import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './PageAnalysis.css';

const Spark = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2.8c.7 4.6 2.6 6.5 7.2 7.2-4.6.7-6.5 2.6-7.2 7.2-.7-4.6-2.6-6.5-7.2-7.2 4.6-.7 6.5-2.6 7.2-7.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M19 15.5c.25 1.8 1.2 2.75 3 3-1.8.25-2.75 1.2-3 3-.25-1.8-1.2-2.75-3-3 1.8-.25 2.75-1.2 3-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const PageAnalysis = ({ title, context, summary, signals = [], className = '' }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  return (
    <>
      <button type="button" className={`pai-trigger ${className}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Spark />
        <span>Explain this page</span>
      </button>
      {open && createPortal(
        <div className="pai-scrim" onClick={() => setOpen(false)}>
          <aside className="pai-drawer" role="dialog" aria-modal="true" aria-labelledby="pai-title" onClick={(event) => event.stopPropagation()}>
            <header className="pai-head">
              <div><Spark size={21} /><strong>Page analysis</strong></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close page analysis">×</button>
            </header>
            <div className="pai-body">
              <div className="pai-context">
                <span>{context || 'CURRENT VIEW'}</span>
                <h2 id="pai-title">{title}</h2>
                <p>Insights are derived from the data and filters currently shown on this page.</p>
              </div>
              <section className="pai-summary">
                <span className="pai-label">Executive summary</span>
                <p>{summary}</p>
              </section>
              <section className="pai-signals">
                <span className="pai-label">Key signals</span>
                {signals.length ? signals.map((signal, index) => (
                  <article key={`${signal.label}-${index}`} className={signal.tone ? `is-${signal.tone}` : ''}>
                    <small>{signal.label}</small>
                    <strong>{signal.value}</strong>
                    {signal.detail && <p>{signal.detail}</p>}
                  </article>
                )) : <p className="pai-empty">No additional signals are available for this view.</p>}
              </section>
            </div>
            <footer className="pai-foot"><Spark size={14} /><span>Review insights alongside operational and clinical context.</span></footer>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
};

export default PageAnalysis;
