const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { verifyToken, adminOnly } = require('../middleware/auth');

// GET /api/departments (Authenticated users)
router.get('/', verifyToken, (req, res) => {
  db.all("SELECT * FROM departments WHERE is_deleted = 0", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/departments (Admin-only)
router.post('/', verifyToken, adminOnly, (req, res) => {
  const { building_name, floor, name, is_technical_area } = req.body;
  db.run(`INSERT INTO departments (building_name, floor, name, is_technical_area) VALUES (?, ?, ?, ?)`, 
    [building_name, floor, name, is_technical_area ? 1 : 0], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Department created' });
  });
});

// PUT /api/departments/:id (Admin-only)
router.put('/:id', verifyToken, adminOnly, (req, res) => {
  const { building_name, floor, name, is_technical_area } = req.body;
  db.run(`UPDATE departments SET building_name = ?, floor = ?, name = ?, is_technical_area = ? WHERE id = ? AND is_deleted = 0`,
    [building_name, floor, name, is_technical_area ? 1 : 0, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Department updated' });
  });
});

// DELETE /api/departments/:id (Admin-only)
router.delete('/:id', verifyToken, adminOnly, (req, res) => {
  db.run(`UPDATE departments SET is_deleted = 1 WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Department soft deleted' });
  });
});

module.exports = router;
