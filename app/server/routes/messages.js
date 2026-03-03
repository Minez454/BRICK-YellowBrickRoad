const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// GET /api/messages/:agencyId — get all messages between this user and an agency
// Can be filtered by ?applicationId=X
router.get('/:agencyId', auth, (req, res) => {
  const { agencyId } = req.params;
  const { applicationId } = req.query;

  let query = `
    SELECT m.*,
      CASE WHEN m.from_type = 'client' THEN u.first_name || ' ' || u.last_name ELSE au.name END as sender_name
    FROM messages m
    LEFT JOIN users u ON m.from_type = 'client' AND m.from_id = u.id
    LEFT JOIN agency_users au ON m.from_type = 'agency' AND m.from_id = au.id
    WHERE m.agency_id = ? AND m.user_id = ?
  `;
  const params = [agencyId, req.user.id];

  if (applicationId) {
    query += ' AND m.application_id = ?';
    params.push(applicationId);
  }
  query += ' ORDER BY m.created_at ASC';

  const msgs = db.prepare(query).all(...params);

  // Mark agency messages as read by client
  db.prepare(
    "UPDATE messages SET read_by_client = 1 WHERE agency_id = ? AND user_id = ? AND from_type = 'agency'"
  ).run(agencyId, req.user.id);

  res.json(msgs);
});

// POST /api/messages — send a message to an agency
router.post('/', auth, (req, res) => {
  const { agencyId, applicationId, content } = req.body;
  if (!agencyId || !content?.trim()) return res.status(400).json({ error: 'agencyId and content required' });

  const agency = db.prepare('SELECT id FROM agencies WHERE id = ?').get(agencyId);
  if (!agency) return res.status(404).json({ error: 'Agency not found' });

  // If applicationId provided, verify it belongs to this user + agency
  if (applicationId) {
    const app = db.prepare(
      'SELECT id FROM applications WHERE id = ? AND user_id = ? AND agency_id = ?'
    ).get(applicationId, req.user.id, agencyId);
    if (!app) return res.status(404).json({ error: 'Application not found' });
  }

  const result = db.prepare(`
    INSERT INTO messages (agency_id, application_id, user_id, from_type, from_id, content)
    VALUES (?, ?, ?, 'client', ?, ?)
  `).run(agencyId, applicationId || null, req.user.id, req.user.id, content.trim());

  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
  res.json(msg);
});

// GET /api/messages/unread/count — total unread agency replies across all conversations
router.get('/unread/count', auth, (req, res) => {
  const count = db.prepare(
    "SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND from_type = 'agency' AND read_by_client = 0"
  ).get(req.user.id);
  res.json({ count: count.count });
});

module.exports = router;
