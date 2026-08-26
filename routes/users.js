const express = require('express');
const router = express.Router();
const { db, hashPassword } = require('../db');
const { verifyToken, adminOnly } = require('../middleware/auth');

// GET /api/users (Admin-only)
router.get('/', verifyToken, adminOnly, (req, res) => {
  const includeDeleted = req.query.include_deleted === 'true';
  const query = includeDeleted
    ? "SELECT id, username, role, name, department, is_active, is_deleted, created_at FROM users ORDER BY id ASC"
    : "SELECT id, username, role, name, department, is_active, is_deleted, created_at FROM users WHERE is_deleted = 0 ORDER BY id ASC";

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/users/:id (Admin-only)
router.get('/:id', verifyToken, adminOnly, (req, res) => {
  db.get("SELECT id, username, role, name, department, is_active, is_deleted, created_at FROM users WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json(row);
  });
});

// POST /api/users (Admin-only)
router.post('/', verifyToken, adminOnly, (req, res) => {
  const { username, password, role, name, department } = req.body;
  if (!username || !password || !role || !name || !department) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลผู้ใช้งานให้ครบถ้วน' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  const hashedPassword = hashPassword(password);
  db.run(`INSERT INTO users (username, password, role, name, department, is_active, is_deleted) VALUES (?, ?, ?, ?, ?, 1, 0)`,
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

// PUT /api/users/:id - Edit User Details (Admin-only)
router.put('/:id', verifyToken, adminOnly, (req, res) => {
  const { role, name, department } = req.body;
  if (!role || !name || !department) {
    return res.status(400).json({ error: 'กรุณาระบุ role, name, และ department ให้ครบถ้วน' });
  }

  db.run("UPDATE users SET role = ?, name = ?, department = ? WHERE id = ?", 
    [role, name, department, req.params.id], 
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'อัปเดตข้อมูลผู้ใช้งานสำเร็จ' });
    }
  );
});

// DELETE /api/users/:id - Deactivate User (Admin-only)
router.delete('/:id', verifyToken, adminOnly, (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (req.user && req.user.id === targetId) {
    return res.status(400).json({ error: 'ไม่อนุญาตให้ระงับหรือลบบัญชีผู้ใช้งานของตนเอง (Cannot delete own account)' });
  }

  db.get("SELECT COUNT(*) as active_admins FROM users WHERE role = 'admin' AND is_active = 1 AND is_deleted = 0 AND id != ?", [targetId], (cntErr, cntRow) => {
    if (cntErr) return res.status(500).json({ error: cntErr.message });
    if (!cntRow || cntRow.active_admins < 1) {
      return res.status(400).json({ error: 'ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้ ระบบต้องมีผู้ดูแลระบบที่ใช้งานอยู่อย่างน้อย 1 คน' });
    }

    db.run("UPDATE users SET is_deleted = 1, is_active = 0 WHERE id = ?", [targetId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'ระงับการใช้งานผู้ใช้งานสำเร็จ (Deactivated)' });
    });
  });
});

// POST /api/users/:id/reactivate - Reactivate User (Admin-only)
router.post('/:id/reactivate', verifyToken, adminOnly, (req, res) => {
  db.run("UPDATE users SET is_deleted = 0, is_active = 1 WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'เปิดใช้งานบัญชีผู้ใช้สำเร็จ (Reactivated)' });
  });
});

// POST /api/users/:id/reset-password - Admin Reset Password (Admin-only)
router.post('/:id/reset-password', verifyToken, adminOnly, (req, res) => {
  const { new_password } = req.body;
  if (!new_password || String(new_password).length < 6) {
    return res.status(400).json({ error: 'กรุณาระบุ new_password ความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  const hashedPassword = hashPassword(new_password);
  db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
  });
});

module.exports = router;
