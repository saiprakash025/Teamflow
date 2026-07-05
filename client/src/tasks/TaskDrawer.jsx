import { useEffect, useState } from 'react';
import { tasksApi, activityApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ConfirmDialog from '../components/ConfirmDialog';
import CommentThread from './CommentThread';
import AttachmentUploader from './AttachmentUploader';
import DependencySelector from './DependencySelector';
import SubtaskList from './SubtaskList';
import CrossProjectLink from './CrossProjectLink';

export default function TaskDrawer({ taskId, projectId, canEdit, onClose, onChanged }) {
  const { showToast } = useToast();
  const [task, setTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activity, setActivity] = useState(null);

  function load() {
    tasksApi
      .get(taskId)
      .then((res) => setTask(res.data))
      .catch(() => showToast('Unable to load task', 'error'));
    activityApi
      .list({ entityType: 'task', entityId: taskId })
      .then((res) => setActivity(res.data))
      .catch(() => {});
  }

  useEffect(load, [taskId]);

  async function saveField(patch) {
    setSaving(true);
    try {
      const res = await tasksApi.update(taskId, patch);
      setTask((prev) => ({ ...prev, ...res.data }));
      onChanged();
    } catch (err) {
      const reason = err.response?.data?.reason;
      if (reason === 'OPEN_BLOCKERS') {
        showToast('Cannot change status. Reason: an open blocker still exists.', 'error');
      } else if (reason === 'OPEN_SUBTASKS') {
        showToast('Cannot change status. Reason: subtasks are still open.', 'error');
      } else {
        showToast(err.response?.data?.message || 'Unable to update task', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await tasksApi.remove(taskId);
      showToast('Task deleted', 'success');
      setConfirmDelete(false);
      onChanged();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to delete task', 'error');
    }
  }

  async function addComment(data) {
    try {
      await tasksApi.addComment(taskId, data);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to add comment', 'error');
    }
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        {!task ? (
          <LoadingSkeleton lines={8} />
        ) : (
          <>
            <div className="drawer-header">
              <div>
                <h2 style={{ margin: 0 }}>{task.title}</h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {task.project?.name}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {canEdit && (
                  <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>
                    Delete
                  </button>
                )}
                <button className="btn btn-sm" onClick={onClose}>
                  ✕
                </button>
              </div>
            </div>

            <div className="drawer-section">
              <h4>Description</h4>
              <p style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{task.description || 'No description.'}</p>
            </div>

            <div className="drawer-section">
              <h4>Details</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    disabled={!canEdit || saving}
                    value={task.status}
                    onChange={(e) => saveField({ status: e.target.value })}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    disabled={!canEdit || saving}
                    value={task.priority}
                    onChange={(e) => saveField({ priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    disabled={!canEdit || saving}
                    value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                    onChange={(e) => saveField({ dueDate: e.target.value || null })}
                  />
                </div>
                <div className="form-group">
                  <label>Assignee</label>
                  <div style={{ fontSize: 14, padding: '8px 0' }}>
                    {task.assignee ? task.assignee.name : 'Unassigned'}
                  </div>
                </div>
              </div>
              {!canEdit && <p className="disabled-note">You have view-only access to this project.</p>}
            </div>

            <div className="drawer-section">
              <h4>Subtasks</h4>
              <SubtaskList task={task} />
            </div>

            <div className="drawer-section">
              <h4>Dependencies</h4>
              <DependencySelector
                task={task}
                projectId={task.project?._id || projectId}
                onUpdated={(updated) => setTask((prev) => ({ ...prev, ...updated }))}
              />
            </div>

            <div className="drawer-section">
              <h4>Appears In</h4>
              <CrossProjectLink task={task} currentProjectId={task.project?._id || projectId} />
            </div>

            <div className="drawer-section">
              <h4>Attachments</h4>
              <AttachmentUploader
                attachments={task.attachments}
                onChange={(next) => saveField({ attachments: next })}
              />
            </div>

            <div className="drawer-section">
              <h4>Comments</h4>
              <CommentThread comments={task.comments} onAddComment={addComment} />
            </div>

            <div className="drawer-section">
              <h4>Activity</h4>
              {activity === null && <LoadingSkeleton lines={2} />}
              {activity && activity.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No activity yet.</div>
              )}
              {activity &&
                activity.map((log) => (
                  <div key={log._id} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    {log.actor?.name || 'Someone'} — {log.action.replace(/_/g, ' ').toLowerCase()} ·{' '}
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task"
        message="This can't be undone. Delete this task permanently?"
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
