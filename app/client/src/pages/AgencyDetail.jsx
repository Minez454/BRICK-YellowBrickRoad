import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const CAT_COLORS = {
  shelter: '#ef4444', food: '#f97316', health: '#10b981',
  legal: '#6366f1', veterans: '#8b5cf6', services: '#3b82f6',
};
const CAT_EMOJI = {
  shelter: '🏠', food: '🍽️', health: '🏥',
  legal: '⚖️', veterans: '🎖️', services: '🤝',
};

function MessageThread({ agencyId, applicationId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const bottomRef = useRef(null);

  const load = () =>
    api.get(`/messages/${agencyId}`, { params: { applicationId } })
      .then(r => setMessages(r.data));

  useEffect(() => { load(); }, [agencyId, applicationId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      await api.post('/messages', { agencyId, applicationId, content: input.trim() });
      setInput('');
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="message-thread">
      <div className="thread-messages">
        {messages.length === 0 ? (
          <p className="thread-empty">No messages yet. Say hello to your caseworker!</p>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`bubble ${m.from_type === 'client' ? 'bubble-client' : 'bubble-agency'}`}>
              <div className="bubble-meta">{m.sender_name} · {new Date(m.created_at).toLocaleString()}</div>
              <div className="bubble-content">{m.content}</div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      {user && (
        <form onSubmit={send} className="thread-form">
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="Type a message to your caseworker..."
            className="thread-input"
          />
          <button type="submit" disabled={sending || !input.trim()} className="btn-primary">
            {sending ? '...' : 'Send'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function AgencyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [agency, setAgency] = useState(null);
  const [application, setApplication] = useState(undefined);
  const [applyMsg, setApplyMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('about'); // about | apply | messages

  useEffect(() => {
    api.get(`/agencies/${id}`).then(r => setAgency(r.data)).catch(() => navigate('/agencies'));
    if (user) {
      api.get('/agencies/my/applications')
        .then(r => {
          const found = r.data.find(a => a.agency_id === Number(id));
          setApplication(found || null);
        })
        .catch(() => setApplication(null));
    } else {
      setApplication(null);
    }
  }, [id, user]);

  const handleApply = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post(`/agencies/${id}/apply`, { message: applyMsg });
      // Reload application
      const r = await api.get('/agencies/my/applications');
      const found = r.data.find(a => a.agency_id === Number(id));
      setApplication(found || null);
      setActiveTab('messages');
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!agency) return <div className="page-loading">Loading...</div>;

  const color = CAT_COLORS[agency.category] || '#6b7280';
  const emoji = CAT_EMOJI[agency.category] || '📍';

  const STATUS_COLORS = { pending: '#f59e0b', approved: '#10b981', denied: '#ef4444', in_review: '#3b82f6' };

  return (
    <div className="agency-detail-page">
      {/* Hero */}
      <div className="agency-hero" style={{ borderTop: `4px solid ${color}` }}>
        <div className="agency-hero-inner">
          <div className="agency-hero-left">
            <div className="agency-big-icon" style={{ background: color + '18', color }}>
              {emoji}
            </div>
            <div>
              <span className="agency-cat-label" style={{ color }}>{agency.category}</span>
              <h1>{agency.name}</h1>
              <p className="agency-hero-desc">{agency.description}</p>
            </div>
          </div>
          <div className="agency-hero-contact">
            {agency.phone && (
              <a href={`tel:${agency.phone}`} className="contact-row">📞 {agency.phone}</a>
            )}
            {agency.address && (
              <span className="contact-row">📍 {agency.address}</span>
            )}
            {agency.email && agency.email !== 'info@va.gov' && (
              <a href={`mailto:${agency.email}`} className="contact-row">✉️ {agency.email}</a>
            )}
            {agency.website && (
              <a href={agency.website} target="_blank" rel="noreferrer" className="contact-row">🌐 Visit Website</a>
            )}
          </div>
        </div>

        <div className="agency-services-row">
          {agency.services.map(s => (
            <span key={s} className="service-chip" style={{ borderColor: color, color }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        <button className={`detail-tab ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>
          About
        </button>
        <button className={`detail-tab ${activeTab === 'apply' ? 'active' : ''}`} onClick={() => setActiveTab('apply')}>
          {application ? '✓ Application' : 'Apply'}
        </button>
        {user && (
          <button className={`detail-tab ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            💬 Messages
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="detail-content">
        {activeTab === 'about' && (
          <div className="about-section">
            <h2>About {agency.name}</h2>
            <p>{agency.description}</p>
            <h3>Services Offered</h3>
            <ul className="services-list">
              {agency.services.map(s => <li key={s}>{s}</li>)}
            </ul>
            {!user && (
              <div className="cta-box">
                <p>Create a free account to apply for services and message a caseworker.</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <Link to="/register" className="btn-primary">Create Account</Link>
                  <Link to="/login" className="btn-outline">Sign In</Link>
                </div>
              </div>
            )}
            {user && !application && (
              <div className="cta-box">
                <p>Ready to request services from {agency.name}?</p>
                <button onClick={() => setActiveTab('apply')} className="btn-primary">Apply Now</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'apply' && (
          <div className="apply-section">
            {application ? (
              <div className="application-status">
                <div className="status-header">
                  <h2>Your Application</h2>
                  <span className="big-status-badge" style={{ background: STATUS_COLORS[application.status] || '#6b7280' }}>
                    {application.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="status-date">Submitted {new Date(application.created_at).toLocaleDateString()}</p>
                {application.message && (
                  <div className="app-message-box">
                    <strong>Your message:</strong>
                    <p>{application.message}</p>
                  </div>
                )}
                {application.notes && (
                  <div className="app-notes-box">
                    <strong>Caseworker notes:</strong>
                    <p>{application.notes}</p>
                  </div>
                )}
                <button onClick={() => setActiveTab('messages')} className="btn-primary" style={{ marginTop: 16 }}>
                  💬 Message Caseworker
                </button>
              </div>
            ) : user ? (
              <div>
                <h2>Apply to {agency.name}</h2>
                <p className="apply-intro">Fill out the form below and a caseworker will review your request.</p>
                {error && <div className="alert-error">{error}</div>}
                <form onSubmit={handleApply} className="apply-form">
                  <div className="form-group">
                    <label>Tell us about your situation <span className="optional">(optional but helpful)</span></label>
                    <textarea
                      rows={5}
                      placeholder="Describe your current situation and what specific help you're looking for. The more detail you share, the better we can assist you."
                      value={applyMsg}
                      onChange={e => setApplyMsg(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="cta-box">
                <p>You must be signed in to apply.</p>
                <Link to="/login" className="btn-primary">Sign In to Apply</Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="messages-section">
            <h2>Messages with {agency.name}</h2>
            {!user ? (
              <div className="cta-box">
                <p>Sign in to message a caseworker.</p>
                <Link to="/login" className="btn-primary">Sign In</Link>
              </div>
            ) : (
              <>
                {!application && (
                  <div className="info-banner">
                    You can send a general question, or <button className="inline-link" onClick={() => setActiveTab('apply')}>apply first</button> to start a case.
                  </div>
                )}
                <MessageThread agencyId={Number(id)} applicationId={application?.id} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
