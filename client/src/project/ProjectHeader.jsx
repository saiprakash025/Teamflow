export default function ProjectHeader({ project, role, onOpenMembers, onDeleteProject }) {
  const isAdmin = role === 'owner' || role === 'admin';

  return (
    <div className="project-header">
      <div>
        <h2 style={{ margin: 0 }}>{project.name}</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{project.description}</p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-sm" onClick={onOpenMembers}>
          Members
        </button>
        {isAdmin && (
          <button className="btn btn-sm btn-danger" onClick={onDeleteProject}>
            Delete Project
          </button>
        )}
      </div>
    </div>
  );
}
