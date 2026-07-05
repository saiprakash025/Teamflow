const VIEWS = [
  { key: 'kanban', label: 'Kanban' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'list', label: 'List' },
];

export default function ViewSwitcher({ current, onChange }) {
  return (
    <div className="view-switcher">
      {VIEWS.map((v) => (
        <button key={v.key} className={current === v.key ? 'active' : ''} onClick={() => onChange(v.key)}>
          {v.label}
        </button>
      ))}
    </div>
  );
}
