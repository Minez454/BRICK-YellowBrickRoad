const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'yellowbrickroad-secret';

// Login for agency staff
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare(`
    SELECT au.*, a.name as agency_name, a.category as agency_category
    FROM agency_users au
    JOIN agencies a ON au.agency_id = a.id
    WHERE au.email = ?
  `).get(email);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, agencyId: user.agency_id, email: user.email, role: user.role, type: 'agency' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      agencyId: user.agency_id,
      agencyName: user.agency_name,
      agencyCategory: user.agency_category,
    }
  });
});

// Register a new caseworker for an agency (requires existing agency admin token)
router.post('/register', async (req, res) => {
  const { name, email, password, agencyId } = req.body;
  if (!name || !email || !password || !agencyId)
    return res.status(400).json({ error: 'All fields required' });

  const agency = db.prepare('SELECT id FROM agencies WHERE id = ?').get(agencyId);
  if (!agency) return res.status(400).json({ error: 'Agency not found' });

  const existing = db.prepare('SELECT id FROM agency_users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const result = db.prepare(
    "INSERT INTO agency_users (agency_id, name, email, password, role) VALUES (?, ?, ?, ?, 'caseworker')"
  ).run(agencyId, name, email, hashed);

  const token = jwt.sign(
    { id: result.lastInsertRowid, agencyId, email, role: 'caseworker', type: 'agency' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({
    token,
    user: { id: result.lastInsertRowid, name, email, role: 'caseworker', agencyId }
  });
});

// Get list of all agency admins (for portal login helper)
router.get('/agencies-list', (req, res) => {
  const agencies = db.prepare(`
    SELECT a.id, a.name, a.category, au.email as admin_email
    FROM agencies a
    LEFT JOIN agency_users au ON au.agency_id = a.id AND au.role = 'admin'
    ORDER BY a.category, a.name
  `).all();
  res.json(agencies);
});

module.exports = router;
