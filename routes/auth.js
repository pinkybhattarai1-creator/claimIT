const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, hashPassword, verifyPassword } = require('../db');
const { JWT_SECRET } = require('../utils/envValidator');
const { loginLimiter } = require('../middleware/security');
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณาระบุ Username และ Password' });
  }

  const cleanUsername = String(username).trim();

  db.get(
    "SELECT * FROM users WHERE username = ? AND is_deleted = 0",
    [cleanUsername],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database query error during login' });
      }

      if (!user) {
        logAuthEvent(cleanUsername, 'LOGIN_FAILED', 'User not found', req);
        return res.status(401).json({ error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
      }

      if (user.is_active === 0) {
        logAuthEvent(cleanUsername, 'LOGIN_BLOCKED', 'Inactive user account', req);
        return res.status(403).json({ error: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งานชั่วคราว' });
      }

      const isMatch = verifyPassword(password, user.password);

      if (isMatch) {
        // Auto-migrate legacy password hash to bcrypt if needed
        if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
          const newBcryptHash = hashPassword(password);
          db.run("UPDATE users SET password = ? WHERE id = ?", [newBcryptHash, user.id]);
        }

        const tokenPayload = {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          department: user.department
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

        logAuthEvent(cleanUsername, 'LOGIN_SUCCESS', 'User logged in successfully', req);

        return res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            department: user.department
          },
          // Top-level backwards compatibility for existing frontend
          username: user.username,
          role: user.role,
          name: user.name,
          department: user.department
        });
      } else {
        logAuthEvent(cleanUsername, 'LOGIN_FAILED', 'Incorrect password', req);
        return res.status(401).json({ error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
      }
    }
  );
});

// POST /api/auth/change-password (Self password change with brute-force protection)
router.post('/change-password', loginLimiter, (req, res) => {
  const { username, current_password, new_password } = req.body;
  if (!username || !current_password || !new_password) {
    return res.status(400).json({ error: 'กรุณาระบุ username, current_password และ new_password ให้ครบถ้วน' });
  }

  if (String(new_password).length < 6) {
    return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  const cleanUsername = String(username).trim();

  // If token is present, ensure caller is altering their own account (or is admin)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.username !== cleanUsername && decoded.role !== 'admin') {
        return res.status(403).json({ error: 'ท่านไม่มีสิทธิ์เปลี่ยนรหัสผ่านของผู้ใช้อื่น' });
      }
    } catch {
      return res.status(401).json({ error: 'Token ยืนยันตัวตนไม่ถูกต้องหรือหมดอายุ' });
    }
  }

  db.get("SELECT * FROM users WHERE username = ? AND is_deleted = 0", [cleanUsername], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) {
      logAuthEvent(cleanUsername, 'PASSWORD_CHANGE_FAILED', 'User not found', req);
      return res.status(404).json({ error: 'User not found' });
    }

    const isCurrentValid = verifyPassword(current_password, user.password);
    if (!isCurrentValid) {
      logAuthEvent(cleanUsername, 'PASSWORD_CHANGE_FAILED', 'Incorrect current password', req);
      return res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    }

    const hashedNew = hashPassword(new_password);
    db.run("UPDATE users SET password = ? WHERE id = ?", [hashedNew, user.id], function(updateErr) {
      if (updateErr) return res.status(500).json({ error: 'Failed to update password' });
      logAuthEvent(cleanUsername, 'PASSWORD_CHANGE', 'User changed password successfully', req);
      res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว' });
    });
  });
});

// PUT /api/auth/profile (Update self name and department)
router.put('/profile', verifyToken, (req, res) => {
  const { name, department } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อ-นามสกุล' });
  }
  const cleanName = String(name).trim();
  const cleanDept = department ? String(department).trim() : req.user.department;

  db.run(
    "UPDATE users SET name = ?, department = ? WHERE id = ? AND is_deleted = 0",
    [cleanName, cleanDept, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const updatedUser = {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        name: cleanName,
        department: cleanDept
      };
      const token = jwt.sign(updatedUser, JWT_SECRET, { expiresIn: '8h' });

      logAuthEvent(req.user.username, 'PROFILE_UPDATE', `Updated name to: ${cleanName}, dept: ${cleanDept}`, req);

      res.json({
        message: 'อัปเดตข้อมูลส่วนตัวสำเร็จเรียบร้อย',
        user: updatedUser,
        token
      });
    }
  );
});

// Helper to record auth audit events safely
function logAuthEvent(username, action, details, req) {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  db.run(
    `INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username, details)
     VALUES (?, ?, 'Security', ?, 'AUTH', ?, ?)`,
    ['SYSTEM_AUTH', `IP: ${ip}`, action, username || 'anonymous', details || ''],
    () => {} // Non-blocking
  );
}

module.exports = router;
