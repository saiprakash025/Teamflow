import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi, preferencesApi, tasksApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ConfirmDialog from '../components/ConfirmDialog';
import ProjectHeader from './ProjectHeader';
import MembersModal from './MembersModal';
import ViewSwitcher from './ViewSwitcher';
import KanbanBoard from './KanbanBoard';
import CalendarView from './CalendarView';
import ListView from './ListView';
import Reports from './Reports';
import ActivityLog from './ActivityLog';
import RcaPage from '../rca/RcaPage';
import TaskDrawer from '../tasks/TaskDrawer';
import TaskForm from '../tasks/TaskForm';

function roleForUser(project, userId) {
  if (project.owner && (project.owner._id || project.owner) === userId) return 'owner';
  const member = (project.members || []).find((m) => (m.user._id || m.user) === userId);
  return member ? member.role : 'viewer';
}

const TABS = [
  { key: 'board', label: 'Board' },
  { key: 'rca', label: 'RCA' },
  { key: 'reports', label: 'Reports' },
  { key: 'activity', label: 'Activity' },
];

export default function ProjectPage() {
  const { id: projectId } = useParams();
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('board');
  const [boardView, setBoardView] = useState('kanban');
  const [showMembers, setShowMembers] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadProject = useCallback(() => {
    projectsApi
      .get(projectId)
      .then((res) => setProject(res.data))
      .catch(() => showToast('Unable to load project', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(loadProject, [loadProject]);

  // load this user's saved view + theme preference for this project (applied instantly, no reload)
  useEffect(() => {
    preferencesApi
      .get(projectId)
      .then((res) => {
        setBoardView(res.data.viewPreference);
        setTheme(res.data.theme);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function changeView(view) {
    setBoardView(view);
    try {
      await preferencesApi.set(projectId, { viewPreference: view });
    } catch {
      // non-fatal: preference just won't persist
    }
  }

  async function handleCreateTask(data) {
    await tasksApi.create({ ...data, project: projectId });
    showToast('Task created', 'success');
    setShowCreateTask(false);
    setRefreshKey((k) => k + 1);
  }

  async function handleDeleteProject() {
    try {
      await projectsApi.remove(projectId);
      showToast('Project deleted', 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to delete project', 'error');
    }
  }

  if (!project) return <LoadingSkeleton lines={8} />;

  const role = roleForUser(project, user.id);
  const canEdit = role !== 'viewer';

  return (
    <div>
      <ProjectHeader
        project={project}
        role={role}
        onOpenMembers={() => setShowMembers(true)}
        onDeleteProject={() => setConfirmDeleteProject(true)}
      />

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'board' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <ViewSwitcher current={boardView} onChange={changeView} />
            {canEdit && (
              <button className="btn btn-primary" onClick={() => setShowCreateTask(true)}>
                + Create Task
              </button>
            )}
          </div>

          {boardView === 'kanban' && (
            <KanbanBoard
              projectId={projectId}
              canEdit={canEdit}
              refreshKey={refreshKey}
              onTaskClick={(t) => setSelectedTaskId(t._id)}
              onCreateTask={() => setShowCreateTask(true)}
            />
          )}
          {boardView === 'calendar' && (
            <CalendarView
              projectId={projectId}
              refreshKey={refreshKey}
              onTaskClick={(t) => setSelectedTaskId(t._id)}
            />
          )}
          {boardView === 'list' && (
            <ListView
              projectId={projectId}
              refreshKey={refreshKey}
              onTaskClick={(t) => setSelectedTaskId(t._id)}
            />
          )}
        </div>
      )}

      {activeTab === 'rca' && <RcaPage projectId={projectId} canEdit={canEdit} />}
      {activeTab === 'reports' && <Reports projectId={projectId} />}
      {activeTab === 'activity' && <ActivityLog projectId={projectId} />}

      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          projectId={projectId}
          canEdit={canEdit}
          onClose={() => setSelectedTaskId(null)}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {showCreateTask && (
        <div className="modal-overlay" onClick={() => setShowCreateTask(false)}>
          <div className="modal card" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Create Task</h3>
            <TaskForm projectId={projectId} onSubmit={handleCreateTask} onCancel={() => setShowCreateTask(false)} />
          </div>
        </div>
      )}

      {showMembers && (
        <MembersModal
          project={project}
          isAdmin={role === 'owner' || role === 'admin'}
          onClose={() => setShowMembers(false)}
          onUpdated={() => {
            loadProject();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteProject}
        title="Delete project"
        message="This will permanently delete the project. This can't be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteProject}
        onCancel={() => setConfirmDeleteProject(false)}
      />
    </div>
  );
}
