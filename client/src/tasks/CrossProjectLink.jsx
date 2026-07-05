import { useEffect, useState } from 'react';
import { projectsApi, projectTaskLinksApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';

export default function CrossProjectLink({ task, currentProjectId }) {
  const { showToast } = useToast();
  const [links, setLinks] = useState(null);
  const [projects, setProjects] = useState([]);
  const [picking, setPicking] = useState(false);

  function loadLinks() {
    projectTaskLinksApi
      .listForTask(task._id)
      .then((res) => setLinks(res.data))
      .catch(() => showToast('Unable to load linked projects', 'error'));
  }

  useEffect(loadLinks, [task._id]);

  async function startLinking() {
    setPicking(true);
    try {
      const res = await projectsApi.list();
      setProjects(res.data.filter((p) => p._id !== currentProjectId));
    } catch {
      showToast('Unable to load projects', 'error');
    }
  }

  async function linkTo(projectId) {
    try {
      await projectTaskLinksApi.create(projectId, task._id);
      showToast('Task linked to project', 'success');
      setPicking(false);
      loadLinks();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to link task', 'error');
    }
  }

  async function unlink(linkId) {
    try {
      await projectTaskLinksApi.remove(linkId);
      loadLinks();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to remove link', 'error');
    }
  }

  return (
    <div>
      {links && links.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {links.map((l) => (
            <span key={l._id} className="chip">
              {l.project?.name}
              <button onClick={() => unlink(l._id)} title="Remove link">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {links && links.length === 0 && !picking && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          Not linked to any other project.
        </div>
      )}

      {!picking && (
        <button className="btn btn-sm" onClick={startLinking}>
          + Link to another project
        </button>
      )}

      {picking && (
        <div>
          {projects.map((p) => (
            <div key={p._id} className="autocomplete-item" onClick={() => linkTo(p._id)}>
              {p.name}
            </div>
          ))}
          {projects.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No other projects available.</div>
          )}
          <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => setPicking(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
