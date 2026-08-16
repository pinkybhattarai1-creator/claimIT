const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/configurations
router.get('/', (req, res) => {
  const { type } = req.query;
  let query = "SELECT * FROM configurations WHERE is_deleted = 0";
  let params = [];
  if (type) {
    query += " AND type = ?";
    params.push(type);
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/configurations
router.post('/', (req, res) => {
  const { type, value, details } = req.body;
  if (!type || !value) return res.status(400).json({ error: 'Missing required fields' });
  db.run(`INSERT INTO configurations (type, value, details) VALUES (?, ?, ?)`, [type, value, details || ''], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Configuration added' });
  });
});

// PUT /api/configurations/:id
router.put('/:id', (req, res) => {
  const { type, value, details } = req.body;
  db.run(`UPDATE configurations SET type = ?, value = ?, details = ? WHERE id = ? AND is_deleted = 0`, [type, value, details || '', req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Configuration updated' });
  });
});

// DELETE /api/configurations/:id
router.delete('/:id', (req, res) => {
  db.run(`UPDATE configurations SET is_deleted = 1 WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Configuration soft deleted' });
  });
});

module.exports = router;
