import { useEffect, useState } from 'react';
import { analyticsApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';

function BarChart({ rows, valueKey, labelKey, max }) {
  const maxValue = max || Math.max(1, ...rows.map((r) => r[valueKey]));
  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} className="bar-chart-row">
          <div className="bar-chart-label">{r[labelKey]}</div>
          <div className="bar-chart-track">
            <div
              className="bar-chart-fill"
              style={{ width: `${(r[valueKey] / maxValue) * 100}%` }}
            />
          </div>
          <div className="bar-chart-value">{r[valueKey]}</div>
        </div>
      ))}
      {rows.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No data yet.</div>
      )}
    </div>
  );
}

export default function Reports({ projectId }) {
  const { showToast } = useToast();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    analyticsApi
      .summary(projectId)
      .then((res) => setSummary(res.data))
      .catch(() => showToast('Unable to load reports', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (!summary) return <LoadingSkeleton lines={6} />;

  const velocityRows = summary.velocityLast8Weeks.map((w) => ({
    label: `Wk ${w.isoWeek}`,
    completedCount: w.completedCount,
  }));

  return (
    <div>
      <div className="stat-cards">
        <div className="stat-card card">
          <div className="stat-value">{summary.completionRate}%</div>
          <div className="stat-label">Completion Rate</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value">{summary.taskCount - summary.completedTasks}</div>
          <div className="stat-label">Open Tasks</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value">{summary.overdueTaskCount}</div>
          <div className="stat-label">Overdue / Blocked</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value">
            {summary.rcaByStatus.draft + summary.rcaByStatus.submitted + summary.rcaByStatus.reviewed}
          </div>
          <div className="stat-label">RCAs</div>
        </div>
        <div className="stat-card card">
          <div className="stat-value" style={{ textTransform: 'capitalize' }}>
            {summary.projectHealth.replace('_', ' ')}
          </div>
          <div className="stat-label">Project Health</div>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h4 style={{ marginTop: 0 }}>Velocity (last 8 weeks, tasks completed)</h4>
        <BarChart rows={velocityRows} valueKey="completedCount" labelKey="label" />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h4 style={{ marginTop: 0 }}>Workload by assignee (open tasks)</h4>
        <BarChart rows={summary.workloadByAssignee} valueKey="openTaskCount" labelKey="name" />
      </div>
    </div>
  );
}
