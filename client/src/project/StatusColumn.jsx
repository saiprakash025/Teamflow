import { useState } from 'react';
import TaskCard from '../tasks/TaskCard';

export default function StatusColumn({ status, label, tasks, onTaskClick, onDropTask, canEdit }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="kanban-column">
      <div className="kanban-column-header">
        <span>{label}</span>
        <span>{tasks.length}</span>
      </div>
      <div
        className={`kanban-column-body ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!canEdit) return;
          const taskId = e.dataTransfer.getData('text/task-id');
          const fromStatus = e.dataTransfer.getData('text/from-status');
          if (taskId && fromStatus !== status) {
            onDropTask(taskId, fromStatus, status);
          }
        }}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            draggable={canEdit}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/task-id', task._id);
              e.dataTransfer.setData('text/from-status', status);
            }}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </div>
    </div>
  );
}
