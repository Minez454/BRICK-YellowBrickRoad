import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgency } from '../context/AgencyContext';
import { portalApi } from '../api';

const STATUS_COLORS = { pending: '#f59e0b', approved: '#10b981', denied: '#ef4444', in_review: '#3b82f6' };
const STATUS_OPTIONS = ['pending', 'in_review', 'approved', 'denied'];

function MessagePane({ app, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = () =>
    portalApi.get(`/portal/messages/${app.id}`).then(r => setMessages(r.data));

  useEffect(() => { load(); }, [app.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      await portalApi.post('/portal/messages', { applicationId: app.id, content: input.trim() });
      setInput('');
      load();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="portal-message-pane">
      <div className="pane-header">
        <div>
          <h3>💬 {app.first_name} {app.last_name}</h3>
          <span className="pane-sub">{app.user_email}</span>
        </div>
        <button onClick={onClose} className="pane-close">✕</button>
      </div>
      {app.message && (
        <div className="pane-application">
          <strong>Application message:</strong>
          <p>{app.message}</p>
        </div>
      )}
      <div className="thread-messages">
        {messages.length === 0 ? (
          <p className="thread-empty">No messages yet. Send the first message!</p>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`bubble ${m.from_type === 'agency' ? 'bubble-client' : 'bubble-agency'}`}>
              <div className="bubble-meta">{m.sender_name} · {new Date(m.created_at).toLocaleString()}</div>
              <div className="bubble-content">{m.content}</div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="thread-form">
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder="Type a message to the client..."
          className="thread-input"
        />
        <button type="submit" disabled={sending || !input.trim()} className="btn-primary">
          {sending ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

function ApplicationRow({ app, onSelect, onStatusChange, selected }) {
  const [status, setStatus] = useState(app.status);
  const [saving, setSaving] = useState(false);

  const changeStatus = async (newStatus) => {
    setSaving(true);
    try {
      await portalApi.patch(`/portal/applications/${app.id}/status`, { status: newStatus });
      setStatus(newStatus);
      onStatusChange(app.id, newStatus);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className={`app-row ${selected ? 'app-row-selected' : ''}`} onClick={() => onSelect(app)}>
      <td className="app-cell-name">
        <div className="app-client-name">{app.first_name} {app.last_name}</div>
        <div className="app-client-email">{app.user_email}</div>
      </td>
      <td className="app-cell-date">
        {new Date(app.created_at).toLocaleDateString()}
      </td>
      <td className="app-cell-status" onClick={e => e.stopPropagation()}>
        <select
          value={status}
          onChange={e => changeStatus(e.target.value)}
          disabled={saving}
          className="status-select"
          style={{ borderColor: STATUS_COLORS[status] || '#6b7280', color: STATUS_COLORS[status] || '#6b7280' }}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </td>
      <td className="app-cell-msg">
        <button
          onClick={e => { e.stopPropagation(); onSelect(app); }}
          className={`msg-btn ${app.unread_count > 0 ? 'msg-btn-unread' : ''}`}
        >
          💬 {app.unread_count > 0 ? <span className="unread-badge">{app.unread_count}</span> : null}
        </button>
      </td>
    </tr>
  );
}

export default function PortalDashboard() {
  const { agencyUser, agencyLogout } = useAgency();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('applications'); // applications | team

  useEffect(() => {
    if (!agencyUser) { navigate('/portal'); return; }
    portalApi.get('/portal/stats').then(r => setStats(r.data));
    portalApi.get('/portal/applications').then(r => setApplications(r.data));
  }, [agencyUser]);

  const handleLogout = () => { agencyLogout(); navigate('/portal'); };

  const handleStatusChange = (id, newStatus) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
  };

  const filtered = applications.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || `${a.first_name} ${a.last_name} ${a.user_email}`.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  if (!agencyUser) return null;

  return (
    <div className="portal-dashboard">
      {/* Sidebar */}
      <aside className="portal-sidebar">
        <div className="portal-sidebar-top">
          <div className="portal-logo">🏢</div>
          <div className="portal-agency-name">{agencyUser.agencyName}</div>
          <div className="portal-user-name">{agencyUser.name}</div>
          <span className="portal-role-badge">{agencyUser.role}</span>
        </div>
        <nav className="portal-nav">
          <button className={`portal-nav-item ${tab === 'applications' ? 'active' : ''}`} onClick={() => setTab('applications')}>
            📋 Applications
            {stats?.pending > 0 && <span className="nav-badge">{stats.pending}</span>}
          </button>
          <button className={`portal-nav-item ${tab === 'team' ? 'active' : ''}`} onClick={() => setTab('team')}>
            👥 Team
          </button>
        </nav>
        <button onClick={handleLogout} className="portal-logout">Sign Out</button>
      </aside>

      {/* Main */}
      <main className="portal-main">
        {/* Stats Bar */}
        {stats && (
          <div className="portal-stats-bar">
            <div className="pstat"><span className="pstat-num">{stats.total}</span><span className="pstat-lbl">Total</span></div>
            <div className="pstat" style={{ color: '#f59e0b' }}><span className="pstat-num">{stats.pending}</span><span className="pstat-lbl">Pending</span></div>
            <div className="pstat" style={{ color: '#3b82f6' }}><span className="pstat-num">{stats.total - stats.pending - stats.approved - stats.denied}</span><span className="pstat-lbl">In Review</span></div>
            <div className="pstat" style={{ color: '#10b981' }}><span className="pstat-num">{stats.approved}</span><span className="pstat-lbl">Approved</span></div>
            <div className="pstat" style={{ color: '#ef4444' }}><span className="pstat-num">{stats.denied}</span><span className="pstat-lbl">Denied</span></div>
            {stats.unreadMessages > 0 && (
              <div className="pstat" style={{ color: '#6366f1' }}><span className="pstat-num">{stats.unreadMessages}</span><span className="pstat-lbl">Unread Msgs</span></div>
            )}
          </div>
        )}

        {tab === 'applications' && (
          <div className="portal-apps-section">
            <div className="portal-toolbar">
              <input
                type="text" placeholder="Search by name or email..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="portal-search"
              />
              <div className="status-filters">
                {['all', ...STATUS_OPTIONS].map(s => (
                  <button
                    key={s}
                    className={`status-filter-btn ${filter === s ? 'active' : ''}`}
                    style={filter === s && STATUS_COLORS[s] ? { background: STATUS_COLORS[s], color: '#fff', borderColor: STATUS_COLORS[s] } : {}}
                    onClick={() => setFilter(s)}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="portal-content-area">
              <div className={`portal-table-wrap ${selected ? 'split' : ''}`}>
                {filtered.length === 0 ? (
                  <div className="portal-empty">
                    <p>No applications {filter !== 'all' ? `with status "${filter}"` : ''} found.</p>
                  </div>
                ) : (
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Messages</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(app => (
                        <ApplicationRow
                          key={app.id}
                          app={app}
                          selected={selected?.id === app.id}
                          onSelect={setSelected}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {selected && (
                <MessagePane app={selected} onClose={() => setSelected(null)} />
              )}
            </div>
          </div>
        )}

        {tab === 'team' && <TeamTab agencyId={agencyUser.agencyId} />}
      </main>
    </div>
  );
}

function TeamTab({ agencyId }) {
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    portalApi.get('/portal/caseworkers').then(r => setWorkers(r.data));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setAdding(true);
    try {
      await portalApi.post('/agency-auth/register', { ...form, agencyId });
      setSuccess(`Caseworker ${form.name} added.`);
      setForm({ name: '', email: '', password: '' });
      const r = await portalApi.get('/portal/caseworkers');
      setWorkers(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add caseworker');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="team-tab">
      <h2>Team Members</h2>
      <div className="team-grid">
        <div className="team-list">
          {workers.map(w => (
            <div key={w.id} className="team-member">
              <div className="team-avatar">{w.name.charAt(0)}</div>
              <div>
                <div className="team-name">{w.name}</div>
                <div className="team-email">{w.email}</div>
              </div>
              <span className="team-role">{w.role}</span>
            </div>
          ))}
        </div>
        <div className="team-add-form">
          <h3>Add Caseworker</h3>
          {error && <div className="alert-error">{error}</div>}
          {success && <div className="alert-success">{success}</div>}
          <form onSubmit={handleAdd} className="auth-form">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Temporary Password</label>
              <input type="text" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <button type="submit" disabled={adding} className="btn-primary">
              {adding ? 'Adding...' : 'Add Caseworker'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
