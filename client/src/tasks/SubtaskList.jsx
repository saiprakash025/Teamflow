import { useEffect, useState } from 'react';
import { tasksApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';

export default function SubtaskList({ task }) {
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(true);
  const [subtasks, setSubtasks] = useState(null);

  useEffect(() => {
    tasksApi
      .subtasks(task._id)
      .then((res) => setSubtasks(res.data))
      .catch(() => showToast('Unable to load subtasks', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task._id]);

  async function toggleDone(sub) {
    const nextStatus = sub.status === 'done' ? 'todo' : 'done';
    try {
      await tasksApi.update(sub._id, { status: nextStatus });
      setSubtasks((prev) => prev.map((s) => (s._id === sub._id ? { ...s, status: nextStatus } : s)));
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to update subtask', 'error');
    }
  }

  if (subtasks === null) return null;
  if (subtasks.length === 0) return <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No subtasks.</div>;

  return (
    <div>
      <button
        className="btn btn-sm"
        style={{ marginBottom: 6 }}
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? '▾' : '▸'} {task.title} ({subtasks.filter((s) => s.status === 'done').length}/{subtasks.length})
      </button>
      {expanded &&
        subtasks.map((s) => (
          <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 4px 20px' }}>
            <input type="checkbox" checked={s.status === 'done'} onChange={() => toggleDone(s)} />
            <span style={{ fontSize: 13, textDecoration: s.status === 'done' ? 'line-through' : 'none' }}>
              {s.title}
            </span>
          </div>
        ))}
    </div>
  );
}
