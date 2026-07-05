import { useEffect, useState } from 'react';
import { activityApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

function colorClass(action) {
  if (action.includes('CREATED')) return 'activity-create';
  if (action.includes('DELETE')) return 'activity-delete';
  if (action.includes('UPDATE') || action.includes('CHANGE') || action.includes('STATUS') || action.includes('REASSIGN')) {
    return 'activity-update';
  }
  return 'activity-other';
}

function describe(log) {
  const actor = log.actor?.name || 'Someone';
  const action = log.action.replace(/_/g, ' ').toLowerCase();
  return `${actor} — ${action}`;
}

export default function ActivityLog({ projectId }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    activityApi
      .list({ project: projectId })
      .then((res) => setLogs(res.data))
      .catch(() => showToast('Unable to load activity', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (logs === null) return <LoadingSkeleton lines={5} />;
  if (logs.length === 0) return <EmptyState title="No activity yet" />;

  return (
    <div>
      {logs.map((log) => (
        <div key={log._id} className="activity-item">
          <div className={`activity-dot ${colorClass(log.action)}`} />
          <div>
            <div>{describe(log)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(log.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
