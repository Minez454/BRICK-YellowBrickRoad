const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'yellowbrickroad-secret';

module.exports = function (req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'agency') return res.status(403).json({ error: 'Agency token required' });
    req.agencyUser = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
