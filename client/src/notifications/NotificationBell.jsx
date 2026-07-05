import { useEffect, useState, useCallback } from 'react';
import { notificationsApi } from '../api/endpoints';
import NotificationPanel from './NotificationPanel';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    notificationsApi
      .list()
      .then((res) => setNotifications(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function markRead(id) {
    await notificationsApi.markRead(id);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => notificationsApi.markRead(n._id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div style={{ position: 'relative' }}>
      <button className="btn-icon" style={{ position: 'relative', fontSize: 18 }} onClick={() => setOpen((o) => !o)}>
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>
      {open && (
        <NotificationPanel
          notifications={notifications}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
