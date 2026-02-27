import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
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
        <h2>Create Your Account</h2>
        <p className="auth-subtitle">Get personalized resources and support for your situation</p>
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input type="text" required placeholder="First" value={form.firstName} onChange={set('firstName')} />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" required placeholder="Last" value={form.lastName} onChange={set('lastName')} />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" required placeholder="you@example.com" value={form.email} onChange={set('email')} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required placeholder="Min. 6 characters" minLength={6} value={form.password} onChange={set('password')} />
          </div>
          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
