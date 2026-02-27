import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const CATEGORY_ICONS = {
  shelter: '🏠', benefits: '💰', health: '🏥', legal: '⚖️',
  housing: '🔑', veterans: '🎖️', food: '🍽️', services: '🤝'
};

const STATUS_COLORS = { pending: '#f59e0b', approved: '#10b981', denied: '#ef4444' };

export default function Dashboard() {
  const { user } = useAuth();
  const [assessment, setAssessment] = useState(undefined);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    api.get('/assessment/my-assessment').then(r => setAssessment(r.data)).catch(() => setAssessment(null));
    api.get('/agencies/my/applications').then(r => setApplications(r.data)).catch(() => {});
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h2>Welcome back, {user.firstName} 👋</h2>
        <p>Here's an overview of your resources and applications.</p>
      </div>

      <div className="dashboard-grid">
        {/* Assessment Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>🤖 Assessment</h3>
            <Link to="/assessment" className="dash-link">
              {assessment ? 'Retake' : 'Start'} →
            </Link>
          </div>
          {assessment === undefined ? (
            <p className="loading-text">Loading...</p>
          ) : assessment ? (
            <>
              <p className="dash-label">Your top recommendations:</p>
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
              <p>No assessment yet.</p>
              <Link to="/assessment" className="btn-primary">Take Assessment</Link>
            </div>
          )}
        </div>

        {/* Applications Card */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>📋 Applications</h3>
            <Link to="/agencies" className="dash-link">Browse Agencies →</Link>
          </div>
          {applications.length === 0 ? (
            <div className="empty-state">
              <p>No applications yet.</p>
              <Link to="/agencies" className="btn-primary">Find Agencies</Link>
            </div>
          ) : (
            <div className="app-list">
              {applications.map(app => (
                <div key={app.id} className="app-item">
                  <div className="app-name">{app.agency_name}</div>
                  <span
                    className="status-badge"
                    style={{ background: STATUS_COLORS[app.status] || '#6b7280' }}
                  >
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
            <h3>⚡ Quick Actions</h3>
          </div>
          <div className="quick-actions">
            <Link to="/map" className="quick-action">
              <span>🗺️</span>
              <span>Find Resources Near Me</span>
            </Link>
            <Link to="/agencies" className="quick-action">
              <span>🏢</span>
              <span>Browse All Agencies</span>
            </Link>
            <Link to="/assessment" className="quick-action">
              <span>🤖</span>
              <span>Retake Assessment</span>
            </Link>
          </div>
        </div>

        {/* Stats Card */}
        <div className="dash-card stats-card">
          <div className="dash-card-header">
            <h3>📊 Your Stats</h3>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-num">{applications.length}</span>
              <span className="stat-lbl">Applications</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{assessment ? assessment.recommendations.length : 0}</span>
              <span className="stat-lbl">Recommendations</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{applications.filter(a => a.status === 'pending').length}</span>
              <span className="stat-lbl">Pending</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
