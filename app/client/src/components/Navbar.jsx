import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon">🏠</span>
        YellowBrickRoad
      </Link>
      {user && (
        <div className="nav-links">
          <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
          <Link to="/assessment" className={isActive('/assessment')}>Assessment</Link>
          <Link to="/map" className={isActive('/map')}>Resource Map</Link>
          <Link to="/agencies" className={isActive('/agencies')}>Agencies</Link>
        </div>
      )}
      <div className="nav-actions">
        {user ? (
          <>
            <span className="nav-user">Hi, {user.firstName}</span>
            <button onClick={handleLogout} className="btn-outline-sm">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-outline-sm">Login</Link>
            <Link to="/register" className="btn-primary-sm">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
}
