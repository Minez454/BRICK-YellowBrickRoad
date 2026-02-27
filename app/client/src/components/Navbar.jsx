import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
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
        {t('nav_brand')}
      </Link>
      <div className="nav-links">
        {user && (
          <>
            <Link to="/dashboard" className={isActive('/dashboard')}>{t('nav_dashboard')}</Link>
            <Link to="/assessment" className={isActive('/assessment')}>{t('nav_assessment')}</Link>
          </>
        )}
        <Link to="/map" className={isActive('/map')}>{t('nav_map')}</Link>
        <Link to="/agencies" className={isActive('/agencies')}>{t('nav_agencies')}</Link>
        <Link to="/benefits" className={isActive('/benefits')}>{t('nav_benefits')}</Link>
      </div>
      <div className="nav-actions">
        <button className="lang-toggle" onClick={toggleLang} title="Switch language">
          {lang === 'en' ? '🇲🇽 Español' : '🇺🇸 English'}
        </button>
        {user ? (
          <>
            <span className="nav-user">{t('nav_hi')}, {user.firstName}</span>
            <button onClick={handleLogout} className="btn-outline-sm">{t('nav_logout')}</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-outline-sm">{t('nav_login')}</Link>
            <Link to="/register" className="btn-primary-sm">{t('nav_get_started')}</Link>
            <Link to="/portal" className="portal-nav-btn" title="Agency staff portal">🏢 Portal</Link>
          </>
        )}
      </div>
    </nav>
  );
}
