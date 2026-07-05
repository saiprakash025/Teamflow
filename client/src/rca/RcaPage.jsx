import { useEffect, useState } from 'react';
import { rcaApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import RcaForm from './RcaForm';
import ReviewerStatus from './ReviewerStatus';
import RcaReview from './RcaReview';
import OverrideDialog from './OverrideDialog';
import CommentThread from '../tasks/CommentThread';
import AttachmentUploader from '../tasks/AttachmentUploader';

export default function RcaPage({ projectId, canEdit }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [rcas, setRcas] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showOverride, setShowOverride] = useState(false);

  function loadList() {
    rcaApi
      .list({ project: projectId })
      .then((res) => setRcas(res.data))
      .catch(() => showToast('Unable to load RCAs', 'error'));
  }

  useEffect(loadList, [projectId]);

  function loadDetail(id) {
    rcaApi
      .get(id)
      .then((res) => setDetail(res.data))
      .catch(() => showToast('Unable to load RCA', 'error'));
  }

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function handleCreate(data) {
    await rcaApi.create(data);
    showToast(data.submit ? 'RCA submitted for review' : 'RCA draft saved', 'success');
    setShowCreate(false);
    loadList();
  }

  async function handleSaveDraft(data) {
    await rcaApi.update(selectedId, data);
    showToast(data.submit ? 'RCA submitted for review' : 'RCA draft saved', 'success');
    loadDetail(selectedId);
    loadList();
  }

  async function handleReview(decision, comment) {
    try {
      await rcaApi.review(selectedId, decision, comment);
      showToast('Review submitted', 'success');
      loadDetail(selectedId);
      loadList();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to submit review', 'error');
    }
  }

  async function handleOverride(data) {
    try {
      await rcaApi.override(selectedId, data);
      showToast('Override applied', 'success');
      setShowOverride(false);
      loadDetail(selectedId);
      loadList();
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to apply override', 'error');
    }
  }

  async function addComment(data) {
    try {
      await rcaApi.addComment(selectedId, data);
      loadDetail(selectedId);
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to add comment', 'error');
    }
  }

  // ---------- list view ----------
  if (!selectedId) {
    if (rcas === null) return <LoadingSkeleton lines={5} />;

    return (
      <div>
        <div className="dashboard-header">
          <h3 style={{ margin: 0 }}>Root Cause Analyses</h3>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + New RCA
            </button>
          )}
        </div>

        {rcas.length === 0 && <EmptyState title="No RCAs yet" subtitle="Open one from a task that needs investigation." />}

        {rcas.map((r) => (
          <div key={r._id} className="card" style={{ padding: 14, marginBottom: 10, cursor: 'pointer' }} onClick={() => setSelectedId(r._id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{r.title}</strong>
              <span className={`badge badge-${r.status}`}>{r.status}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Task: {r.task?.title} · Owner: {r.owner?.name}
            </div>
          </div>
        ))}

        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal card" style={{ width: 560, maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>New RCA</h3>
              <RcaForm projectId={projectId} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- detail view ----------
  if (!detail) return <LoadingSkeleton lines={6} />;

  const isOwner = detail.owner._id === user.id;
  const isReviewer = detail.reviewers.some((r) => r._id === user.id);
  const alreadyReviewed = detail.reviews.some((r) => (r.reviewer._id || r.reviewer) === user.id);
  const isAdmin = user.role === 'admin';

  return (
    <div>
      <button className="btn btn-sm" style={{ marginBottom: 12 }} onClick={() => setSelectedId(null)}>
        ← Back to RCAs
      </button>

      <div className="dashboard-header">
        <h3 style={{ margin: 0 }}>
          {detail.title} <span className={`badge badge-${detail.status}`}>{detail.status}</span>
        </h3>
        {isAdmin && (
          <button className="btn" onClick={() => setShowOverride(true)}>
            Admin Override
          </button>
        )}
      </div>

      {detail.status === 'draft' && isOwner ? (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <RcaForm initialRca={detail} onSubmit={handleSaveDraft} onCancel={() => {}} />
        </div>
      ) : (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div className="drawer-section">
            <h4>Timeline</h4>
            <p style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{detail.timeline || '—'}</p>
          </div>
          <div className="drawer-section">
            <h4>Contributing Factors</h4>
            <p style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{detail.contributingFactors || '—'}</p>
          </div>
          <div className="drawer-section">
            <h4>Corrective Actions</h4>
            <p style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{detail.correctiveActions || '—'}</p>
          </div>
          <div className="drawer-section">
            <h4>Preventive Measures</h4>
            <p style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{detail.preventiveMeasures || '—'}</p>
          </div>
        </div>
      )}

      {detail.status !== 'draft' && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h4 style={{ marginTop: 0 }}>Reviewer Status</h4>
          <ReviewerStatus reviewers={detail.reviewers} reviews={detail.reviews} />

          {isReviewer && detail.status === 'submitted' && (
            <div style={{ marginTop: 14 }}>
              <RcaReview onDecide={handleReview} alreadyReviewed={alreadyReviewed} />
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <h4 style={{ marginTop: 0 }}>Attachments</h4>
        {detail.status === 'draft' && isOwner ? (
          <AttachmentUploader
            attachments={detail.attachments}
            onChange={(next) => handleSaveDraft({ attachments: next })}
          />
        ) : (
          <div>
            {(detail.attachments || []).map((a, i) => (
              <div key={i} className="attachment-row">
                <span>{a.name}</span>
              </div>
            ))}
            {(!detail.attachments || detail.attachments.length === 0) && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No attachments.</div>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h4 style={{ marginTop: 0 }}>Comments</h4>
        <CommentThread comments={detail.comments} onAddComment={addComment} />
      </div>

      {showOverride && (
        <OverrideDialog onClose={() => setShowOverride(false)} onSubmit={handleOverride} />
      )}
    </div>
  );
}
