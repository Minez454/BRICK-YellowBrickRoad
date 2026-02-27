const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', (req, res) => {
  const { category, search } = req.query;
  let query = 'SELECT * FROM agencies WHERE 1=1';
  const params = [];

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const agencies = db.prepare(query).all(...params);
  res.json(agencies.map(a => ({ ...a, services: JSON.parse(a.services || '[]') })));
});

router.get('/:id', (req, res) => {
  const agency = db.prepare('SELECT * FROM agencies WHERE id = ?').get(req.params.id);
  if (!agency) return res.status(404).json({ error: 'Agency not found' });
  res.json({ ...agency, services: JSON.parse(agency.services || '[]') });
});

router.post('/:id/apply', auth, (req, res) => {
  const { message } = req.body;
  const agency = db.prepare('SELECT id FROM agencies WHERE id = ?').get(req.params.id);
  if (!agency) return res.status(404).json({ error: 'Agency not found' });

  const existing = db.prepare(
    'SELECT id FROM applications WHERE user_id = ? AND agency_id = ?'
  ).get(req.user.id, req.params.id);
  if (existing) return res.status(400).json({ error: 'You have already applied to this agency' });

  db.prepare(
    'INSERT INTO applications (user_id, agency_id, message) VALUES (?, ?, ?)'
  ).run(req.user.id, req.params.id, message || '');

  res.json({ success: true, message: 'Application submitted successfully' });
});

router.get('/my/applications', auth, (req, res) => {
  const apps = db.prepare(`
    SELECT a.*, ag.name as agency_name, ag.category as agency_category
    FROM applications a
    JOIN agencies ag ON a.agency_id = ag.id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `).all(req.user.id);
  res.json(apps);
});

module.exports = router;
