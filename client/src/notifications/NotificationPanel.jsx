export default function NotificationPanel({ notifications, onMarkRead, onMarkAllRead, onClose }) {
  return (
    <div className="notification-panel card" onMouseLeave={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <strong style={{ fontSize: 13 }}>Notifications</strong>
        <button className="btn btn-sm" onClick={onMarkAllRead}>
          Mark all read
        </button>
      </div>

      {notifications.length === 0 && (
        <div className="empty-state" style={{ padding: 30 }}>
          <h3 style={{ fontSize: 14 }}>You're all caught up!</h3>
        </div>
      )}

      {notifications.map((n) => (
        <div
          key={n._id}
          className={`notification-item ${n.isRead ? '' : 'unread'}`}
          onClick={() => onMarkRead(n._id)}
        >
          {n.message}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {new Date(n.createdAt).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
