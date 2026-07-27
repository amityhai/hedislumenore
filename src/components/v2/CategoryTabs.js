// Shared HEDIS reporting-domain ("sub-category") tabs. Full-radius filter pills
// (per .impeccable: pills describe/filter, buttons act), mono eyebrow type to
// match the measure-code aesthetic. There is no "All" tab — a category is always
// selected, so the board never opens on an unscoped mix of domains. Consumers
// seed the first category when nothing is picked yet.
const CategoryTabs = ({ categories, value, onChange, counts }) => {
  if (!categories || categories.length <= 1) return null;
  return (
    <div className="sc2-cats" role="tablist" aria-label="Measure category">
      {categories.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={active}
            className={`sc2-cat mono ${active ? 'is-active' : ''}`}
            onClick={() => onChange(c)}
          >
            {c}
            {counts && counts[c] != null && <span className="sc2-cat-count num">{counts[c]}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
