import { useEffect, useState, useCallback } from 'react';
import { tasksApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import StatusColumn from './StatusColumn';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';

const COLUMNS = [
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
];

export default function KanbanBoard({ projectId, canEdit, onTaskClick, refreshKey, onCreateTask }) {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState(null);

  const load = useCallback(() => {
    tasksApi
      .list({ project: projectId })
      .then((res) => setTasks(res.data))
      .catch(() => showToast('Unable to load tasks', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(load, [load, refreshKey]);

  async function moveTask(taskId, fromStatus, toStatus) {
    const previous = tasks;
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: toStatus } : t)));

    try {
      await tasksApi.update(taskId, { status: toStatus });
      showToast('Task updated', 'success');
    } catch (err) {
      setTasks(previous); // revert the optimistic move
      const reason = err.response?.data?.reason;
      if (reason === 'OPEN_BLOCKERS') {
        showToast('Cannot move task. Reason: it is still blocked by an open task.', 'error');
      } else if (reason === 'OPEN_SUBTASKS') {
        showToast('Cannot move task. Reason: it has unfinished subtasks.', 'error');
      } else {
        showToast(err.response?.data?.message || 'Unable to update task', 'error');
      }
    }
  }

  if (tasks === null) return <LoadingSkeleton lines={5} />;

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No Tasks Yet"
        subtitle="Create your first task to get the board moving."
        actionLabel={canEdit ? 'Create Task' : undefined}
        onAction={canEdit ? onCreateTask : undefined}
      />
    );
  }

  return (
    <div className="kanban-board">
      {COLUMNS.map((col) => (
        <StatusColumn
          key={col.status}
          status={col.status}
          label={col.label}
          tasks={tasks.filter((t) => t.status === col.status)}
          onTaskClick={onTaskClick}
          onDropTask={moveTask}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}

