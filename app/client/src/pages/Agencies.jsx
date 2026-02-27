import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { value: 'all', label: 'All Agencies' },
  { value: 'shelter', label: '🏠 Shelter' },
  { value: 'food', label: '🍽️ Food' },
  { value: 'health', label: '🏥 Health' },
  { value: 'legal', label: '⚖️ Legal' },
  { value: 'veterans', label: '🎖️ Veterans' },
  { value: 'services', label: '🤝 Services' },
];

function ApplyModal({ agency, onClose, onSuccess }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/agencies/${agency.id}/apply`, { message });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Application failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Apply to {agency.name}</h3>
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Message (optional)</label>
            <textarea
              rows={4} placeholder="Briefly describe your situation and what help you need..."
              value={message} onChange={e => setMessage(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Agencies() {
  const [agencies, setAgencies] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [applying, setApplying] = useState(null);
  const [applied, setApplied] = useState(new Set());
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const params = {};
    if (category !== 'all') params.category = category;
    if (search) params.search = search;
    api.get('/agencies', { params }).then(r => setAgencies(r.data));
  }, [category, search]);

  useEffect(() => {
    if (user) {
      api.get('/agencies/my/applications').then(r => {
        setApplied(new Set(r.data.map(a => a.agency_id)));
      }).catch(() => {});
    }
  }, [user]);

  const handleSuccess = () => {
    setApplied(prev => new Set([...prev, applying.id]));
    setApplying(null);
    setSuccess(`Application submitted to ${applying.name}!`);
    setTimeout(() => setSuccess(''), 4000);
  };

  return (
    <div className="agencies-page">
      <div className="agencies-header">
        <h2>Agency Directory</h2>
        <p>Browse Las Vegas social service agencies and apply for support</p>
        <div className="agencies-controls">
          <input
            type="text" placeholder="Search agencies..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="category-tabs">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              className={`tab-btn ${category === c.value ? 'active' : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {success && <div className="alert-success">{success}</div>}

      <div className="agencies-grid">
        {agencies.map(agency => (
          <div key={agency.id} className="agency-card">
            <div className="agency-card-header">
              <h3>{agency.name}</h3>
              <span className="category-badge">{agency.category}</span>
            </div>
            <p className="agency-desc">{agency.description}</p>
            <div className="agency-services">
              {agency.services.map(s => (
                <span key={s} className="service-tag">{s}</span>
              ))}
            </div>
            <div className="agency-contact">
              {agency.phone && <span>📞 {agency.phone}</span>}
              {agency.address && <span>📍 {agency.address}</span>}
            </div>
            <div className="agency-actions">
              {user ? (
                applied.has(agency.id) ? (
                  <span className="applied-badge">✓ Applied</span>
                ) : (
                  <button onClick={() => setApplying(agency)} className="btn-primary">
                    Apply Now
                  </button>
                )
              ) : (
                <a href="/register" className="btn-primary">Sign in to Apply</a>
              )}
            </div>
          </div>
        ))}
      </div>

      {applying && (
        <ApplyModal agency={applying} onClose={() => setApplying(null)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}
