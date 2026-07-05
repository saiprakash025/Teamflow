import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import CreateProjectModal from './CreateProjectModal';

function roleForUser(project, userId) {
  if (project.owner && (project.owner._id || project.owner) === userId) return 'owner';
  const member = (project.members || []).find(
    (m) => (m.user && (m.user._id || m.user)) === userId
  );
  return member ? member.role : 'viewer';
}

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    projectsApi
      .list()
      .then((res) => setProjects(res.data))
      .catch(() => showToast('Unable to load projects', 'error'));
  }

  useEffect(load, []);

  async function handleCreate(data) {
    try {
      await projectsApi.create(data);
      showToast('Project created', 'success');
      setShowCreate(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to create project', 'error');
    }
  }

  return (
    <div>
      <div className="dashboard-header">
        <h2>Your projects</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Create Project
        </button>
      </div>

      {projects === null && <LoadingSkeleton lines={6} />}

      {projects && projects.length === 0 && (
        <EmptyState
          title="No projects yet"
          subtitle="Create your first project to start organizing work."
          actionLabel="+ Create Project"
          onAction={() => setShowCreate(true)}
        />
      )}

      {projects && projects.length > 0 && (
        <div className="project-grid">
          {projects.map((p) => (
            <div key={p._id} className="project-card card" onClick={() => navigate(`/projects/${p._id}`)}>
              <h3>{p.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', minHeight: 36 }}>
                {p.description || 'No description'}
              </p>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {(p.members || []).length} member{(p.members || []).length === 1 ? '' : 's'}
              </div>
              <span className="role-badge">{roleForUser(p, user.id)}</span>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
