function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function TaskCard({ task, onClick, draggable, onDragStart }) {
  return (
    <div
      className="task-card card"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="task-title">{task.title}</div>
      <div className="task-meta">
        <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
        {task.dueDate && <span>{new Date(task.dueDate).toLocaleDateString()}</span>}
        {task.assignee && (
          <span className="assignee-avatar" title={task.assignee.name}>
            {initials(task.assignee.name)}
          </span>
        )}
      </div>
    </div>
  );
}
