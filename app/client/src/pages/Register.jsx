import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Register() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.firstName, form.lastName, form.email, form.password);
      navigate('/assessment');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>{t('register_title')}</h2>
        <p className="auth-subtitle">{t('register_subtitle')}</p>
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label>{t('register_first')}</label>
              <input type="text" required placeholder={t('register_first')} value={form.firstName} onChange={set('firstName')} />
            </div>
            <div className="form-group">
              <label>{t('register_last')}</label>
              <input type="text" required placeholder={t('register_last')} value={form.lastName} onChange={set('lastName')} />
            </div>
          </div>
          <div className="form-group">
            <label>{t('login_email')}</label>
            <input type="email" required placeholder="you@example.com" value={form.email} onChange={set('email')} />
          </div>
          <div className="form-group">
            <label>{t('login_password')}</label>
            <input type="password" required placeholder="Min. 6 characters" minLength={6} value={form.password} onChange={set('password')} />
          </div>
          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? t('register_loading') : t('register_btn')}
          </button>
        </form>
        <p className="auth-footer">
          {t('register_have_account')} <Link to="/login">{t('register_login_link')}</Link>
        </p>
      </div>
    </div>
  );
}
