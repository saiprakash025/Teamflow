export default function ReviewerStatus({ reviewers, reviews }) {
  const approvedCount = reviews.filter((r) => r.decision === 'approved').length;

  function statusFor(reviewerId) {
    const review = reviews.find((r) => (r.reviewer._id || r.reviewer) === reviewerId);
    if (!review) return 'pending';
    return review.decision;
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
        {approvedCount} / {reviewers.length} Approved
      </div>
      {reviewers.map((r) => {
        const status = statusFor(r._id);
        return (
          <div key={r._id} className="reviewer-row">
            <span>{r.name}</span>
            <span className={`badge badge-${status}`}>{status}</span>
          </div>
        );
      })}
    </div>
  );
}
