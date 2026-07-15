// Shared HEDIS reporting-domain ("sub-category") tabs. Full-radius filter pills
// (per .impeccable: pills describe/filter, buttons act), mono eyebrow type to
// match the measure-code aesthetic. `value === null` means All categories.
const CategoryTabs = ({ categories, value, onChange, count }) => {
  if (!categories || categories.length <= 1) return null;
  const tabs = [{ key: null, label: 'All' }, ...categories.map((c) => ({ key: c, label: c }))];
  return (
    <div className="sc2-cats" role="tablist" aria-label="Measure category">
      {tabs.map((t) => {
        const active = value === t.key || (value == null && t.key === null);
        return (
          <button
            key={t.key ?? 'all'}
            type="button"
            role="tab"
            aria-selected={active}
            className={`sc2-cat mono ${active ? 'is-active' : ''}`}
            onClick={() => onChange(t.key)}
          >
            {t.label}
            {t.key === null && count != null && <span className="sc2-cat-count num">{count}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
