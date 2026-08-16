const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/audit-logs
router.get('/audit-logs', (req, res) => {
  db.all("SELECT * FROM move_log ORDER BY timestamp DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/rma-claims
router.get('/rma-claims', (req, res) => {
  db.all("SELECT * FROM rma_claims WHERE is_deleted = 0", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// DELETE /api/rma-claims/:id
router.delete('/rma-claims/:id', (req, res) => {
  db.run("UPDATE rma_claims SET is_deleted = 1 WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'RMA Claim soft deleted' });
  });
});

module.exports = router;
