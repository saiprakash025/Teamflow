import { useEffect, useState, useCallback } from 'react';
import { tasksApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, otherMonth: true, date: new Date(year, month - 1, daysInPrevMonth - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, otherMonth: false, date: new Date(year, month, d) });
  }
  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (startOffset + daysInMonth) + 1;
    cells.push({ day: nextDay, otherMonth: true, date: new Date(year, month + 1, nextDay) });
  }
  return cells;
}

export default function CalendarView({ projectId, onTaskClick, refreshKey }) {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState(null);
  const [cursor, setCursor] = useState(new Date());

  const load = useCallback(() => {
    tasksApi
      .list({ project: projectId })
      .then((res) => setTasks(res.data))
      .catch(() => showToast('Unable to load tasks', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(load, [load, refreshKey]);

  if (tasks === null) return <LoadingSkeleton lines={6} />;

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = buildMonthGrid(year, month);

  const tasksByDate = {};
  tasks.forEach((t) => {
    if (!t.dueDate) return;
    const key = new Date(t.dueDate).toDateString();
    tasksByDate[key] = tasksByDate[key] || [];
    tasksByDate[key].push(t);
  });

  return (
    <div>
      <div className="calendar-nav">
        <button className="btn btn-sm" onClick={() => setCursor(new Date(year, month - 1, 1))}>
          ← Prev
        </button>
        <strong>
          {cursor.toLocaleString('default', { month: 'long' })} {year}
        </strong>
        <button className="btn btn-sm" onClick={() => setCursor(new Date(year, month + 1, 1))}>
          Next →
        </button>
        <button className="btn btn-sm" onClick={() => setCursor(new Date())}>
          Today
        </button>
      </div>

      <div className="calendar-grid">
        {DAY_NAMES.map((d) => (
          <div key={d} className="calendar-day-name">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          const dayTasks = tasksByDate[cell.date.toDateString()] || [];
          return (
            <div key={i} className={`calendar-cell ${cell.otherMonth ? 'other-month' : ''}`}>
              <div className="day-number">{cell.day}</div>
              {dayTasks.slice(0, 3).map((t) => (
                <div key={t._id} className="calendar-task-chip" onClick={() => onTaskClick(t)}>
                  {t.title}
                </div>
              ))}
              {dayTasks.length > 3 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{dayTasks.length - 3} more</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
