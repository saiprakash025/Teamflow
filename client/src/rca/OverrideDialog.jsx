import { useState } from 'react';
import { usersApi } from '../api/endpoints';

export default function OverrideDialog({ onClose, onSubmit }) {
  const [mode, setMode] = useState('reassign'); // 'reassign' | 'forceClose'
  const [reason, setReason] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
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

  function addReviewer(u) {
    if (!selectedReviewers.some((r) => r._id === u._id)) {
      setSelectedReviewers((prev) => [...prev, u]);
    }
    setQuery('');
    setResults([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === 'reassign') {
        await onSubmit({ newReviewers: selectedReviewers.map((r) => r._id), reason });
      } else {
        await onSubmit({ forceClose: true, reason });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 style={{ marginTop: 0 }}>Admin Override</h3>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'reassign' ? 'btn-primary' : ''}`}
            onClick={() => setMode('reassign')}
          >
            Reassign Reviewer
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'forceClose' ? 'btn-primary' : ''}`}
            onClick={() => setMode('forceClose')}
          >
            Force Close
          </button>
        </div>

        {mode === 'reassign' && (
          <div className="form-group autocomplete-wrapper">
            <label>New reviewer(s)</label>
            <input value={query} onChange={(e) => search(e.target.value)} placeholder="Search users…" />
            {results.length > 0 && (
              <div className="autocomplete-list">
                {results.map((u) => (
                  <div key={u._id} className="autocomplete-item" onClick={() => addReviewer(u)}>
                    {u.name}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 6 }}>
              {selectedReviewers.map((r) => (
                <span key={r._id} className="chip">
                  {r.name}
                  <button
                    type="button"
                    onClick={() => setSelectedReviewers((prev) => prev.filter((x) => x._id !== r._id))}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Reason (required)</label>
          <textarea rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !reason.trim() || (mode === 'reassign' && selectedReviewers.length === 0)}
          >
            {saving ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
