import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const CATEGORY_KEYS = [
  { value: 'all', tKey: 'cat_all_agencies' },
  { value: 'shelter', emoji: '🏠', tKey: 'cat_shelter' },
  { value: 'food', emoji: '🍽️', tKey: 'cat_food' },
  { value: 'health', emoji: '🏥', tKey: 'cat_health' },
  { value: 'legal', emoji: '⚖️', tKey: 'cat_legal' },
  { value: 'veterans', emoji: '🎖️', tKey: 'cat_veterans' },
  { value: 'services', emoji: '🤝', tKey: 'cat_services' },
];

function ApplyModal({ agency, onClose, onSuccess }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

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
        <h3>{t('agencies_modal_title')} {agency.name}</h3>
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>{t('agencies_msg_label')}</label>
            <textarea
              rows={4} placeholder={t('agencies_msg_placeholder')}
              value={message} onChange={e => setMessage(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-outline">{t('agencies_cancel')}</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? t('agencies_submitting') : t('agencies_submit')}
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
  const { t } = useLanguage();

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
        <h2>{t('agencies_title')}</h2>
        <p>{t('agencies_sub')}</p>
        <div className="agencies-controls">
          <input
            type="text" placeholder={t('agencies_search')}
            value={search} onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="category-tabs">
          {CATEGORY_KEYS.map(c => (
            <button
              key={c.value}
              className={`tab-btn ${category === c.value ? 'active' : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.emoji ? `${c.emoji} ` : ''}{t(c.tKey)}
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
              <span className="category-badge">{t(`cat_${agency.category}`) || agency.category}</span>
            </div>
            <p className="agency-desc">{agency.description}</p>
            <div className="agency-services">
              {agency.services.slice(0, 3).map(s => (
                <span key={s} className="service-tag">{s}</span>
              ))}
              {agency.services.length > 3 && <span className="service-tag">+{agency.services.length - 3} more</span>}
            </div>
            <div className="agency-contact">
              {agency.phone && <span>📞 {agency.phone}</span>}
              {agency.address && <span>📍 {agency.address}</span>}
            </div>
            <div className="agency-actions">
              <Link to={`/agencies/${agency.id}`} className="btn-outline">View Details</Link>
              {user ? (
                applied.has(agency.id) ? (
                  <span className="applied-badge">{t('agencies_applied')}</span>
                ) : (
                  <button onClick={() => setApplying(agency)} className="btn-primary">
                    {t('agencies_apply')}
                  </button>
                )
              ) : (
                <Link to={`/agencies/${agency.id}`} className="btn-primary">{t('agencies_apply')}</Link>
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
