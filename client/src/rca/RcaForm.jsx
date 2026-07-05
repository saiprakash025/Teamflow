import { useState } from 'react';
import { tasksApi, usersApi } from '../api/endpoints';

export default function RcaForm({ projectId, initialRca, onSubmit, onCancel }) {
  const isEdit = !!initialRca;

  const [taskQuery, setTaskQuery] = useState(initialRca?.task?.title || '');
  const [taskId, setTaskId] = useState(initialRca?.task?._id || '');
  const [taskResults, setTaskResults] = useState([]);

  const [title, setTitle] = useState(initialRca?.title || '');
  const [timeline, setTimeline] = useState(initialRca?.timeline || '');
  const [contributingFactors, setContributingFactors] = useState(initialRca?.contributingFactors || '');
  const [correctiveActions, setCorrectiveActions] = useState(initialRca?.correctiveActions || '');
  const [preventiveMeasures, setPreventiveMeasures] = useState(initialRca?.preventiveMeasures || '');

  const [reviewerQuery, setReviewerQuery] = useState('');
  const [reviewerResults, setReviewerResults] = useState([]);
  const [reviewers, setReviewers] = useState(initialRca?.reviewers || []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function searchTask(q) {
    setTaskQuery(q);
    setTaskId('');
    if (!q.trim()) {
      setTaskResults([]);
      return;
    }
    const res = await tasksApi.list({ project: projectId });
    setTaskResults(res.data.filter((t) => t.title.toLowerCase().includes(q.toLowerCase())).slice(0, 6));
  }

  async function searchReviewer(q) {
    setReviewerQuery(q);
    if (!q.trim()) {
      setReviewerResults([]);
      return;
    }
    const res = await usersApi.search(q);
    setReviewerResults(res.data);
  }

  function addReviewer(u) {
    if (!reviewers.some((r) => r._id === u._id)) {
      setReviewers((prev) => [...prev, u]);
    }
    setReviewerQuery('');
    setReviewerResults([]);
  }

  async function handleSubmit(e, submitForReview) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!isEdit && !taskId) {
      setError('Please select the task this RCA is for.');
      return;
    }
    if (submitForReview && reviewers.length === 0) {
      setError('At least one reviewer is required to submit.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        task: taskId,
        title,
        timeline,
        contributingFactors,
        correctiveActions,
        preventiveMeasures,
        reviewers: reviewers.map((r) => r._id),
        submit: submitForReview,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save RCA');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, false)}>
      {error && <div className="auth-error">{error}</div>}

      {!isEdit && (
        <div className="form-group autocomplete-wrapper">
          <label>Task *</label>
          <input value={taskQuery} onChange={(e) => searchTask(e.target.value)} placeholder="Search tasks…" />
          {taskResults.length > 0 && (
            <div className="autocomplete-list">
              {taskResults.map((t) => (
                <div
                  key={t._id}
                  className="autocomplete-item"
                  onClick={() => {
                    setTaskId(t._id);
                    setTaskQuery(t.title);
                    setTaskResults([]);
                  }}
                >
                  {t.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="form-group">
        <label>Title *</label>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="form-group">
        <label>Timeline</label>
        <textarea rows={3} value={timeline} onChange={(e) => setTimeline(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Contributing Factors</label>
        <textarea rows={3} value={contributingFactors} onChange={(e) => setContributingFactors(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Corrective Actions</label>
        <textarea rows={3} value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Preventive Measures</label>
        <textarea rows={3} value={preventiveMeasures} onChange={(e) => setPreventiveMeasures(e.target.value)} />
      </div>

      <div className="form-group autocomplete-wrapper">
        <label>Reviewers</label>
        <input value={reviewerQuery} onChange={(e) => searchReviewer(e.target.value)} placeholder="Search users…" />
        {reviewerResults.length > 0 && (
          <div className="autocomplete-list">
            {reviewerResults.map((u) => (
              <div key={u._id} className="autocomplete-item" onClick={() => addReviewer(u)}>
                {u.name}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 6 }}>
          {reviewers.map((r) => (
            <span key={r._id} className="chip">
              {r.name}
              <button type="button" onClick={() => setReviewers((prev) => prev.filter((x) => x._id !== r._id))}>
                ✕
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={saving}>
          Save Draft
        </button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={(e) => handleSubmit(e, true)}>
          Submit for Review
        </button>
      </div>
    </form>
  );
}
