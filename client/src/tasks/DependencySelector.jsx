import { useState } from 'react';
import { tasksApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';

function TaskAutocomplete({ projectId, excludeIds, onPick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  async function handleChange(e) {
    const value = e.target.value;
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    const res = await tasksApi.list({ project: projectId });
    const filtered = res.data.filter(
      (t) => t.title.toLowerCase().includes(value.toLowerCase()) && !excludeIds.includes(t._id)
    );
    setResults(filtered.slice(0, 6));
  }

  return (
    <div className="autocomplete-wrapper">
      <input placeholder="Search…" value={query} onChange={handleChange} style={{ width: '100%' }} />
      {results.length > 0 && (
        <div className="autocomplete-list">
          {results.map((t) => (
            <div
              key={t._id}
              className="autocomplete-item"
              onClick={() => {
                onPick(t);
                setQuery('');
                setResults([]);
              }}
            >
              {t.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DependencySelector({ task, projectId, onUpdated }) {
  const { showToast } = useToast();

  async function addDependency(type, targetTask) {
    try {
      const payload = type === 'blockedBy' ? { blockedBy: targetTask._id } : { blocks: targetTask._id };
      const res = await tasksApi.setDependencies(task._id, payload);
      onUpdated(res.data.task);

      if (res.data.warning) {
        showToast(
          `Task has ${res.data.warning.count} unresolved blocker(s). Proceeding is allowed, but keep this in mind.`,
          'info'
        );
      } else {
        showToast('Dependency added', 'success');
      }
    } catch (err) {
      if (err.response?.data?.reason === 'CIRCULAR_DEPENDENCY') {
        showToast('Circular dependency detected.', 'error');
      } else {
        showToast(err.response?.data?.message || 'Unable to add dependency', 'error');
      }
    }
  }

  const excludeIds = [task._id, ...(task.blockedBy || []).map((b) => b._id), ...(task.blocks || []).map((b) => b._id)];

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Depends On (Blocked By)</div>
        {(task.blockedBy || []).map((b) => (
          <span key={b._id} className="chip">
            {b.title} <span className={`badge badge-${b.status === 'done' ? 'approved' : 'pending'}`}>{b.status}</span>
          </span>
        ))}
        {(!task.blockedBy || task.blockedBy.length === 0) && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>None</div>
        )}
        <TaskAutocomplete projectId={projectId} excludeIds={excludeIds} onPick={(t) => addDependency('blockedBy', t)} />
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Blocks</div>
        {(task.blocks || []).map((b) => (
          <span key={b._id} className="chip">
            {b.title}
          </span>
        ))}
        {(!task.blocks || task.blocks.length === 0) && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>None</div>
        )}
        <TaskAutocomplete projectId={projectId} excludeIds={excludeIds} onPick={(t) => addDependency('blocks', t)} />
      </div>
    </div>
  );
}
