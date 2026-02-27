import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../api';

const CATEGORY_ICONS = {
  shelter: '🏠', benefits: '💰', health: '🏥', legal: '⚖️',
  housing: '🔑', veterans: '🎖️', food: '🍽️', services: '🤝'
};

const STATUS_COLORS = { pending: '#f59e0b', approved: '#10b981', denied: '#ef4444' };

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [assessment, setAssessment] = useState(undefined);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    api.get('/assessment/my-assessment').then(r => setAssessment(r.data)).catch(() => setAssessment(null));
    api.get('/agencies/my/applications').then(r => setApplications(r.data)).catch(() => {});
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h2>{t('dash_welcome')}, {user.firstName} 👋</h2>
        <p>{t('dash_overview')}</p>
      </div>

      <div className="dashboard-grid">
        {/* Assessment Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>🤖 {t('dash_assessment')}</h3>
            <Link to="/assessment" className="dash-link">
              {assessment ? t('dash_retake') : t('dash_start')} →
            </Link>
          </div>
          {assessment === undefined ? (
            <p className="loading-text">{t('loading')}</p>
          ) : assessment ? (
            <>
              <p className="dash-label">{t('dash_top_recs')}</p>
              <div className="rec-list">
                {assessment.recommendations.slice(0, 3).map((rec, i) => (
                  <div key={i} className="rec-mini">
                    <span className="rec-icon">{CATEGORY_ICONS[rec.category] || '📌'}</span>
                    <span className="rec-text">{rec.text.substring(0, 80)}...</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>{t('dash_no_assessment')}</p>
              <Link to="/assessment" className="btn-primary">{t('dash_take')}</Link>
            </div>
          )}
        </div>

        {/* Applications Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>📋 {t('dash_applications')}</h3>
            <Link to="/agencies" className="dash-link">{t('dash_browse')}</Link>
          </div>
          {applications.length === 0 ? (
            <div className="empty-state">
              <p>{t('dash_no_apps')}</p>
              <Link to="/agencies" className="btn-primary">{t('dash_find_agencies')}</Link>
            </div>
          ) : (
            <div className="app-list">
              {applications.map(app => (
                <div key={app.id} className="app-item">
                  <div className="app-name">{app.agency_name}</div>
                  <span className="status-badge" style={{ background: STATUS_COLORS[app.status] || '#6b7280' }}>
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>⚡ {t('dash_quick_actions')}</h3>
          </div>
          <div className="quick-actions">
            <Link to="/map" className="quick-action">
              <span>🗺️</span>
              <span>{t('dash_find_resources')}</span>
            </Link>
            <Link to="/agencies" className="quick-action">
              <span>🏢</span>
              <span>{t('dash_browse_agencies')}</span>
            </Link>
            <Link to="/benefits" className="quick-action">
              <span>💰</span>
              <span>{t('nav_benefits')}</span>
            </Link>
            <Link to="/assessment" className="quick-action">
              <span>🤖</span>
              <span>{t('dash_retake_assess')}</span>
            </Link>
          </div>
        </div>

        {/* Stats Card */}
        <div className="dash-card stats-card">
          <div className="dash-card-header">
            <h3>📊 {t('dash_stats')}</h3>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-num">{applications.length}</span>
              <span className="stat-lbl">{t('dash_stat_apps')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{assessment ? assessment.recommendations.length : 0}</span>
              <span className="stat-lbl">{t('dash_stat_recs')}</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{applications.filter(a => a.status === 'pending').length}</span>
              <span className="stat-lbl">{t('dash_stat_pending')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
