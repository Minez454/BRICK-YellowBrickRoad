import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Home() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1>{t('home_hero_title')}</h1>
          <p>{t('home_hero_subtitle')}</p>
          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn-primary">{t('home_go_dashboard')}</Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary">{t('home_get_started')}</Link>
                <Link to="/map" className="btn-outline">{t('home_view_map')}</Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-number">20+</span>
            <span className="stat-label">{t('home_stat_agencies')}</span>
          </div>
          <div className="stat">
            <span className="stat-number">25+</span>
            <span className="stat-label">{t('home_stat_resources')}</span>
          </div>
          <div className="stat">
            <span className="stat-number">24/7</span>
            <span className="stat-label">{t('home_stat_hours')}</span>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>{t('home_features_title')}</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>{t('home_feat1_title')}</h3>
            <p>{t('home_feat1_desc')}</p>
            <Link to={user ? '/assessment' : '/register'} className="feature-link">{t('home_feat1_link')}</Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>{t('home_feat2_title')}</h3>
            <p>{t('home_feat2_desc')}</p>
            <Link to="/map" className="feature-link">{t('home_feat2_link')}</Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏢</div>
            <h3>{t('home_feat3_title')}</h3>
            <p>{t('home_feat3_desc')}</p>
            <Link to="/agencies" className="feature-link">{t('home_feat3_link')}</Link>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>{t('home_feat4_title')}</h3>
            <p>{t('home_feat4_desc')}</p>
            <Link to="/benefits" className="feature-link">{t('home_feat4_link')}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
