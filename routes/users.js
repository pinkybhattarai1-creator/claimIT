const express = require('express');
const router = express.Router();
const { db, hashPassword } = require('../db');
const { verifyToken, adminOnly } = require('../middleware/auth');

const ROLES = new Set(['admin', 'staff']);

function writeUserAudit(actor, target, action, details) {
  db.run(
    `INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username, details)
     VALUES ('SYSTEM_USER', 'การจัดการผู้ใช้งาน', '-', ?, 'USER_ROLE', ?, ?)`,
    [action, actor.username, JSON.stringify({ target: target.username, ...details })]
  );
}

// GET /api/users (Admin-only)
router.get('/', verifyToken, adminOnly, (req, res) => {
  const includeDeleted = req.query.include_deleted === 'true';
  const query = includeDeleted
    ? "SELECT id, username, role, name, department, is_active, is_deleted FROM users ORDER BY id ASC"
    : "SELECT id, username, role, name, department, is_active, is_deleted FROM users WHERE is_deleted = 0 ORDER BY id ASC";

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/users/:id (Admin-only)
router.get('/:id', verifyToken, adminOnly, (req, res) => {
  db.get("SELECT id, username, role, name, department, is_active, is_deleted FROM users WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json(row);
  });
});

// POST /api/users (Admin-only)
router.post('/', verifyToken, adminOnly, (req, res) => {
  const { username, password, role, name, department } = req.body;
  // New accounts always start as Staff. An Admin may promote them afterwards.
  if (!username || !password || !name || !department) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลผู้ใช้งานให้ครบถ้วน' });
  }

  if (role && !ROLES.has(role)) {
    return res.status(400).json({ error: 'สิทธิ์ผู้ใช้งานไม่ถูกต้อง' });
  }

  const hashedPassword = hashPassword(password);
  db.run(`INSERT INTO users (username, password, role, name, department, is_active, is_deleted) VALUES (?, ?, ?, ?, ?, 1, 0)`,
    [username.trim(), hashedPassword, 'staff', name.trim(), department.trim()],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username นี้ถูกใช้งานแล้ว' });
        }
        return res.status(500).json({ error: err.message });
      }
      writeUserAudit(req.user, { username: username.trim() }, 'CREATE_STAFF', { role: 'staff', department: department.trim() });
      res.json({ id: this.lastID, message: 'เพิ่มบัญชีเจ้าหน้าที่สำเร็จ' });
    }
  );
});

// PUT /api/users/:id - Edit user profile (Admin-only). Role changes use the protected endpoint below.
router.put('/:id', verifyToken, adminOnly, (req, res) => {
  const { name, department } = req.body;
  if (!name || !department) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อและแผนกให้ครบถ้วน' });
  }

  db.run("UPDATE users SET name = ?, department = ? WHERE id = ?",
    [name.trim(), department.trim(), req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ message: 'อัปเดตข้อมูลผู้ใช้งานสำเร็จ' });
    }
  );
});

// PUT /api/users/:id/role - Promote a Staff member or demote an Admin safely.
router.put('/:id/role', verifyToken, adminOnly, (req, res) => {
  const role = String(req.body.role || '').trim();
  if (!ROLES.has(role)) return res.status(400).json({ error: 'สิทธิ์ผู้ใช้งานไม่ถูกต้อง' });

  db.get('SELECT id, username, role, is_deleted FROM users WHERE id = ?', [req.params.id], (err, target) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!target || target.is_deleted) return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });
    if (target.role === role) return res.status(400).json({ error: 'ผู้ใช้งานมีสิทธิ์นี้อยู่แล้ว' });

    const applyRole = () => db.run('UPDATE users SET role = ? WHERE id = ?', [role, target.id], function(updateErr) {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      writeUserAudit(req.user, target, role === 'admin' ? 'PROMOTE_TO_ADMIN' : 'DEMOTE_TO_STAFF', { from: target.role, to: role });
      res.json({ message: role === 'admin' ? 'เลื่อนสิทธิ์เป็นผู้ดูแลระบบสำเร็จ' : 'ปรับสิทธิ์เป็นเจ้าหน้าที่สำเร็จ' });
    });

    if (target.role !== 'admin' || role !== 'staff') return applyRole();
    // An Admin can be demoted only when another active Admin remains.
    db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1 AND is_deleted = 0 AND id != ?", [target.id], (countErr, row) => {
      if (countErr) return res.status(500).json({ error: countErr.message });
      if (row.count < 1) return res.status(400).json({ error: 'ไม่สามารถลดสิทธิ์ผู้ดูแลคนสุดท้ายได้ ต้องมีผู้ดูแลระบบที่ใช้งานอยู่คนอื่นอย่างน้อย 1 คน' });
      applyRole();
    });
  });
});

// DELETE /api/users/:id - Deactivate User (Admin-only)
router.delete('/:id', verifyToken, adminOnly, (req, res) => {
  db.run("UPDATE users SET is_deleted = 1, is_active = 0 WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'ระงับการใช้งานผู้ใช้งานสำเร็จ (Deactivated)' });
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
  if (!new_password) {
    return res.status(400).json({ error: 'กรุณาระบุ new_password ใหม่' });
  }

  const hashedPassword = hashPassword(new_password);
  db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'รีเซ็ตรหัสผ่านสำเร็จ' });
  });
});

module.exports = router;
