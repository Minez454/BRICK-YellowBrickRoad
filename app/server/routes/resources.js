const router = require('express').Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { category } = req.query;
  let query = 'SELECT * FROM resources WHERE 1=1';
  const params = [];

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }

  const resources = db.prepare(query).all(...params);
  res.json(resources);
});

module.exports = router;
