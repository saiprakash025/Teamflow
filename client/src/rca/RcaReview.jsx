import { useState } from 'react';

export default function RcaReview({ onDecide, alreadyReviewed }) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function decide(decision) {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await onDecide(decision, comment);
      setComment('');
    } finally {
      setSubmitting(false);
    }
  }

  if (alreadyReviewed) {
    return <p className="disabled-note">You've already submitted your review decision for this RCA.</p>;
  }

  return (
    <div>
      <div className="form-group">
        <label>Review comment (required)</label>
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-primary"
          disabled={!comment.trim() || submitting}
          onClick={() => decide('approved')}
        >
          Approve
        </button>
        <button
          className="btn btn-danger"
          disabled={!comment.trim() || submitting}
          onClick={() => decide('rejected')}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
