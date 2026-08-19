const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, hashPassword, verifyPassword } = require('../db');
const { JWT_SECRET } = require('../utils/envValidator');
const { loginLimiter } = require('../middleware/security');

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
        // Record login failure audit log
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

// Helper to record auth audit events safely
function logAuthEvent(username, action, details, req) {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  db.run(
    `INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['SYSTEM_AUTH', `IP: ${ip}`, 'Security', action, 'AUTH', username || 'anonymous'],
    () => {} // Non-blocking
  );
}

module.exports = router;
