const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { verifyToken, staffOnly, adminOnly } = require('../middleware/auth');

// GET /api/audit-logs (Staff/Admin)
router.get('/audit-logs', verifyToken, staffOnly, (req, res) => {
  db.all("SELECT * FROM move_log ORDER BY timestamp DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/rma-claims (Staff/Admin)
router.get('/rma-claims', verifyToken, staffOnly, (req, res) => {
  db.all("SELECT * FROM rma_claims WHERE is_deleted = 0 ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// DELETE /api/rma-claims/:id (Admin-only)
router.delete('/rma-claims/:id', verifyToken, adminOnly, (req, res) => {
  db.run("UPDATE rma_claims SET is_deleted = 1 WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'RMA Claim soft deleted' });
  });
});

module.exports = router;
