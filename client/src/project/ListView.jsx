import { useEffect, useMemo, useState, useCallback } from 'react';
import { tasksApi, analyticsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

const PAGE_SIZE = 10;

export default function ListView({ projectId, onTaskClick, refreshKey }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [sortKey, setSortKey] = useState('dueDate');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    tasksApi
      .list({ project: projectId })
      .then((res) => setTasks(res.data))
      .catch(() => showToast('Unable to load tasks', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(load, [load, refreshKey]);

  const filtered = useMemo(() => {
    if (!tasks) return [];
    let result = [...tasks];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }
    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    if (assignedToMe) {
      result = result.filter((t) => t.assignee && t.assignee._id === user.id);
    }
    if (openOnly) {
      result = result.filter((t) => t.status !== 'done');
    }

    result.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (sortKey === 'dueDate') {
        va = va ? new Date(va).getTime() : Infinity;
        vb = vb ? new Date(vb).getTime() : Infinity;
      }
      if (sortKey === 'priority') {
        const order = { low: 0, medium: 1, high: 2 };
        va = order[a.priority];
        vb = order[b.priority];
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, search, priorityFilter, assignedToMe, openOnly, sortKey, sortDir, user.id]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  async function handleExport() {
    try {
      const params = { project: projectId };
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      const res = await analyticsApi.exportCsv(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tasks.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Export downloaded', 'success');
    } catch (err) {
      showToast('Unable to export CSV', 'error');
    }
  }

  if (tasks === null) return <LoadingSkeleton lines={6} />;

  if (tasks.length === 0) {
    return <EmptyState title="No Tasks Yet" subtitle="Create your first task to see it here." />;
  }

  return (
    <div>
      <div className="list-toolbar">
        <input placeholder="Search by title…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
          <option value="all">All priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={assignedToMe} onChange={(e) => { setAssignedToMe(e.target.checked); setPage(1); }} />
          Assigned To Me
        </label>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={openOnly} onChange={(e) => { setOpenOnly(e.target.checked); setPage(1); }} />
          Open Tasks
        </label>
        <button className="btn" onClick={handleExport} style={{ marginLeft: 'auto' }}>
          Export CSV
        </button>
      </div>

      <table className="task-table">
        <thead>
          <tr>
            <th onClick={() => toggleSort('title')}>Title</th>
            <th onClick={() => toggleSort('priority')}>Priority {sortKey === 'priority' && (sortDir === 'asc' ? '↑' : '↓')}</th>
            <th onClick={() => toggleSort('status')}>Status</th>
            <th onClick={() => toggleSort('dueDate')}>Due {sortKey === 'dueDate' && (sortDir === 'asc' ? '↑' : '↓')}</th>
            <th>Assignee</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((t) => (
            <tr key={t._id} onClick={() => onTaskClick(t)}>
              <td>{t.title}</td>
              <td>
                <span className={`priority-badge priority-${t.priority}`}>{t.priority}</span>
              </td>
              <td>{t.status.replace('_', ' ')}</td>
              <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
              <td>{t.assignee ? t.assignee.name : 'Unassigned'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && (
        <div className="empty-state">
          <h3>No matching tasks</h3>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span style={{ fontSize: 13, alignSelf: 'center' }}>
            Page {page} of {totalPages}
          </span>
          <button className="btn btn-sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
