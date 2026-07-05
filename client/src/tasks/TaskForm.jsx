import { useEffect, useState } from 'react';
import { usersApi, tasksApi } from '../api/endpoints';

export default function TaskForm({ projectId, initialTask, onSubmit, onCancel }) {
  const isEdit = !!initialTask;
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [priority, setPriority] = useState(initialTask?.priority || 'medium');
  const [status, setStatus] = useState(initialTask?.status || 'todo');
  const [dueDate, setDueDate] = useState(initialTask?.dueDate ? initialTask.dueDate.slice(0, 10) : '');
  const [assigneeQuery, setAssigneeQuery] = useState(initialTask?.assignee?.name || '');
  const [assigneeId, setAssigneeId] = useState(initialTask?.assignee?._id || '');
  const [assigneeResults, setAssigneeResults] = useState([]);
  const [parentQuery, setParentQuery] = useState(initialTask?.parent?.title || '');
  const [parentId, setParentId] = useState(initialTask?.parent?._id || initialTask?.parent || '');
  const [parentResults, setParentResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function searchAssignee(q) {
    setAssigneeQuery(q);
    setAssigneeId('');
    if (!q.trim()) {
      setAssigneeResults([]);
      return;
    }
    const res = await usersApi.search(q);
    setAssigneeResults(res.data);
  }

  async function searchParent(q) {
    setParentQuery(q);
    setParentId('');
    if (!q.trim()) {
      setParentResults([]);
      return;
    }
    const res = await tasksApi.list({ project: projectId });
    setParentResults(
      res.data.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()) && t._id !== initialTask?._id).slice(0, 6)
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title,
        description,
        priority,
        status,
        dueDate: dueDate || null,
        assignee: assigneeId || null,
        parent: parentId || null,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="auth-error">{error}</div>}

      <div className="form-group">
        <label>Title *</label>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="form-group autocomplete-wrapper">
          <label>Assignee</label>
          <input value={assigneeQuery} onChange={(e) => searchAssignee(e.target.value)} placeholder="Search…" />
          {assigneeResults.length > 0 && (
            <div className="autocomplete-list">
              {assigneeResults.map((u) => (
                <div
                  key={u._id}
                  className="autocomplete-item"
                  onClick={() => {
                    setAssigneeId(u._id);
                    setAssigneeQuery(u.name);
                    setAssigneeResults([]);
                  }}
                >
                  {u.name} <span style={{ color: 'var(--text-muted)' }}>({u.email})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="form-group autocomplete-wrapper">
        <label>Parent Task (optional)</label>
        <input value={parentQuery} onChange={(e) => searchParent(e.target.value)} placeholder="Search tasks in this project…" />
        {parentResults.length > 0 && (
          <div className="autocomplete-list">
            {parentResults.map((t) => (
              <div
                key={t._id}
                className="autocomplete-item"
                onClick={() => {
                  setParentId(t._id);
                  setParentQuery(t.title);
                  setParentResults([]);
                }}
              >
                {t.title}
              </div>
            ))}
          </div>
        )}
      </div>

      {isEdit && (
        <p className="disabled-note">
          Dependencies can be managed from the "Dependencies" section once the task is open.
        </p>
      )}

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
