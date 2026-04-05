import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgency } from '../context/AgencyContext';
import api from '../api';

export default function AgencyPortal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agencies, setAgencies] = useState([]);
  const [showCredentials, setShowCredentials] = useState(false);
  const { agencyLogin, agencyUser } = useAgency();
  const navigate = useNavigate();

  useEffect(() => {
    if (agencyUser) navigate('/portal/dashboard');
    api.get('/agency-auth/agencies-list').then(r => setAgencies(r.data)).catch(() => {});
  }, [agencyUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await agencyLogin(email, password);
      navigate('/portal/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login-page">
      <div className="portal-login-left">
        <div className="portal-brand">
          <span className="portal-brand-icon">🏢</span>
          <h1>Agency Portal</h1>
          <p>Caseworker sign-in for YellowBrickRoad partner agencies</p>
        </div>
        <div className="portal-features">
          <div className="portal-feat"><span>📋</span><span>View & manage client applications</span></div>
          <div className="portal-feat"><span>💬</span><span>Message clients directly</span></div>
          <div className="portal-feat"><span>✅</span><span>Update application status</span></div>
          <div className="portal-feat"><span>📊</span><span>Track your agency's impact</span></div>
        </div>
      </div>

      <div className="portal-login-right">
        <div className="auth-card">
          <h2>Caseworker Sign In</h2>
          <p className="auth-subtitle">Sign in with your agency credentials</p>

          {error && <div className="alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email" required placeholder="admin@agency.portal"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password" required placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary full-width" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In to Portal'}
            </button>
          </form>

          <div className="credentials-section">
            <button
              className="credentials-toggle"
              onClick={() => setShowCredentials(!showCredentials)}
            >
              {showCredentials ? '▲' : '▼'} Default agency credentials
            </button>
            {showCredentials && (
              <div className="credentials-table">
                <p className="credentials-note">Default password for all agencies: <code>portal123</code></p>
                <div className="cred-list">
                  {agencies.map(a => (
                    <div
                      key={a.id}
                      className="cred-row"
                      onClick={() => { setEmail(a.admin_email || ''); setPassword('portal123'); }}
                    >
                      <span className="cred-name">{a.name}</span>
                      <span className="cred-email">{a.admin_email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
