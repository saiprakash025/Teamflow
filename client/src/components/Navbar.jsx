import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from '../notifications/NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="navbar">
      <div className="navbar-left">
        <Link to="/dashboard" className="navbar-brand">
          TeamFlow
        </Link>
      </div>
      <div className="navbar-right">
        <button className="btn-icon" title="Toggle theme" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <NotificationBell />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.name}</span>
        <button
          className="btn btn-sm"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
