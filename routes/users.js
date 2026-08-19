const express = require('express');
const router = express.Router();
const { db, hashPassword } = require('../db');
const { verifyToken, adminOnly } = require('../middleware/auth');

// GET /api/users (Admin-only)
router.get('/', verifyToken, adminOnly, (req, res) => {
  db.all("SELECT id, username, role, name, department FROM users WHERE is_deleted = 0", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/users (Admin-only)
router.post('/', verifyToken, adminOnly, (req, res) => {
  const { username, password, role, name, department } = req.body;
  if (!username || !password || !role || !name || !department) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลผู้ใช้งานให้ครบถ้วน' });
  }

  const hashedPassword = hashPassword(password);
  db.run(`INSERT INTO users (username, password, role, name, department) VALUES (?, ?, ?, ?, ?)`,
    [username, hashedPassword, role, name, department],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username นี้ถูกใช้งานแล้ว' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'เพิ่มผู้ใช้งานสำเร็จ' });
    }
  );
});

// DELETE /api/users/:id (Admin-only)
router.delete('/:id', verifyToken, adminOnly, (req, res) => {
  db.run("UPDATE users SET is_deleted = 1 WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'ลบผู้ใช้งานสำเร็จ' });
  });
});

module.exports = router;
