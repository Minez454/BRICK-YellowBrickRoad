const router = require('express').Router();
const agencyAuth = require('../middleware/agencyAuth');
const db = require('../db');

// All portal routes require agency authentication
router.use(agencyAuth);

// GET /api/portal/stats
router.get('/stats', (req, res) => {
  const { agencyId } = req.agencyUser;
  const total = db.prepare('SELECT COUNT(*) as count FROM applications WHERE agency_id = ?').get(agencyId);
  const pending = db.prepare("SELECT COUNT(*) as count FROM applications WHERE agency_id = ? AND status = 'pending'").get(agencyId);
  const approved = db.prepare("SELECT COUNT(*) as count FROM applications WHERE agency_id = ? AND status = 'approved'").get(agencyId);
  const denied = db.prepare("SELECT COUNT(*) as count FROM applications WHERE agency_id = ? AND status = 'denied'").get(agencyId);
  const unread = db.prepare(
    'SELECT COUNT(*) as count FROM messages WHERE agency_id = ? AND from_type = ? AND read_by_agency = 0'
  ).get(agencyId, 'client');

  res.json({
    total: total.count,
    pending: pending.count,
    approved: approved.count,
    denied: denied.count,
    unreadMessages: unread.count,
  });
});

// GET /api/portal/applications
router.get('/applications', (req, res) => {
  const { agencyId } = req.agencyUser;
  const apps = db.prepare(`
    SELECT
      a.*,
      u.first_name, u.last_name, u.email as user_email,
      (SELECT COUNT(*) FROM messages m WHERE m.application_id = a.id AND m.from_type = 'client' AND m.read_by_agency = 0) as unread_count
    FROM applications a
    JOIN users u ON a.user_id = u.id
    WHERE a.agency_id = ?
    ORDER BY a.created_at DESC
  `).all(agencyId);
  res.json(apps);
});

// GET /api/portal/applications/:id
router.get('/applications/:id', (req, res) => {
  const { agencyId } = req.agencyUser;
  const app = db.prepare(`
    SELECT a.*, u.first_name, u.last_name, u.email as user_email, u.created_at as user_since
    FROM applications a
    JOIN users u ON a.user_id = u.id
    WHERE a.id = ? AND a.agency_id = ?
  `).get(req.params.id, agencyId);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json(app);
});

// PATCH /api/portal/applications/:id/status
router.patch('/applications/:id/status', (req, res) => {
  const { agencyId } = req.agencyUser;
  const { status, notes } = req.body;
  if (!['pending', 'approved', 'denied', 'in_review'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });

  const app = db.prepare('SELECT id FROM applications WHERE id = ? AND agency_id = ?').get(req.params.id, agencyId);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  db.prepare(
    "UPDATE applications SET status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, notes || null, req.params.id);

  res.json({ success: true });
});

// GET /api/portal/messages/:applicationId
router.get('/messages/:applicationId', (req, res) => {
  const { agencyId } = req.agencyUser;
  const msgs = db.prepare(`
    SELECT m.*,
      CASE WHEN m.from_type = 'client' THEN u.first_name || ' ' || u.last_name ELSE au.name END as sender_name
    FROM messages m
    LEFT JOIN users u ON m.from_type = 'client' AND m.from_id = u.id
    LEFT JOIN agency_users au ON m.from_type = 'agency' AND m.from_id = au.id
    WHERE m.application_id = ? AND m.agency_id = ?
    ORDER BY m.created_at ASC
  `).all(req.params.applicationId, agencyId);

  // Mark all client messages as read by agency
  db.prepare(
    "UPDATE messages SET read_by_agency = 1 WHERE application_id = ? AND agency_id = ? AND from_type = 'client'"
  ).run(req.params.applicationId, agencyId);

  res.json(msgs);
});

// POST /api/portal/messages
router.post('/messages', (req, res) => {
  const { agencyId, id: agencyUserId } = req.agencyUser;
  const { applicationId, content } = req.body;
  if (!applicationId || !content?.trim()) return res.status(400).json({ error: 'applicationId and content required' });

  const app = db.prepare('SELECT user_id FROM applications WHERE id = ? AND agency_id = ?').get(applicationId, agencyId);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  const result = db.prepare(`
    INSERT INTO messages (agency_id, application_id, user_id, from_type, from_id, content)
    VALUES (?, ?, ?, 'agency', ?, ?)
  `).run(agencyId, applicationId, app.user_id, agencyUserId, content.trim());

  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
  res.json(msg);
});

// GET /api/portal/me
router.get('/me', (req, res) => {
  const user = db.prepare(`
    SELECT au.id, au.name, au.email, au.role, au.agency_id,
           a.name as agency_name, a.category as agency_category, a.address, a.phone, a.website
    FROM agency_users au
    JOIN agencies a ON au.agency_id = a.id
    WHERE au.id = ?
  `).get(req.agencyUser.id);
  res.json(user);
});

// GET /api/portal/caseworkers
router.get('/caseworkers', (req, res) => {
  const { agencyId } = req.agencyUser;
  const workers = db.prepare(
    'SELECT id, name, email, role, created_at FROM agency_users WHERE agency_id = ? ORDER BY role DESC, name ASC'
  ).all(agencyId);
  res.json(workers);
});

module.exports = router;
