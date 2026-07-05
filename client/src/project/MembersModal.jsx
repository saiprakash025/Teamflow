import { useState } from 'react';
import { usersApi, projectsApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';

export default function MembersModal({ project, isAdmin, onClose, onUpdated }) {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [role, setRole] = useState('member');
  const [saving, setSaving] = useState(false);

  async function search(q) {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const res = await usersApi.search(q);
    setResults(res.data);
  }

  async function addMember(user) {
    setSaving(true);
    try {
      const currentMembers = project.members.map((m) => ({
        user: m.user._id || m.user,
        role: m.role,
      }));
      const already = currentMembers.some((m) => m.user === user._id);
      const nextMembers = already
        ? currentMembers.map((m) => (m.user === user._id ? { ...m, role } : m))
        : [...currentMembers, { user: user._id, role }];

      await projectsApi.setMembers(project._id, nextMembers);
      showToast('Members updated', 'success');
      setQuery('');
      setResults([]);
      onUpdated();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to update members', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Members</h3>

        {project.members.map((m) => (
          <div key={m.user._id || m.user} className="reviewer-row">
            <span>{m.user.name || m.user}</span>
            <span className="role-badge">{m.role}</span>
          </div>
        ))}

        {isAdmin && (
          <div style={{ marginTop: 16 }}>
            <div className="form-row">
              <div className="form-group autocomplete-wrapper" style={{ flex: 2 }}>
                <label>Add member</label>
                <input value={query} onChange={(e) => search(e.target.value)} placeholder="Search users…" />
                {results.length > 0 && (
                  <div className="autocomplete-list">
                    {results.map((u) => (
                      <div key={u._id} className="autocomplete-item" onClick={() => addMember(u)}>
                        {u.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {saving && <p className="disabled-note">Saving…</p>}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
