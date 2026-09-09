const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db, hashPassword, verifyPassword, recordAuditLog } = require('../db');
const { JWT_SECRET } = require('../utils/envValidator');
const { loginLimiter, resetLimiter } = require('../middleware/security');
const { verifyToken } = require('../middleware/auth');
const { handleDbError } = require('../utils/safeError');
const { sendNotificationEmail, isEmailConfigured } = require('../services/emailService');

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

        const dbTokenVersion = user.token_version || 0;
        const mustChange = Boolean(user.must_change_password);

        const tokenPayload = {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          department: user.department,
          token_version: dbTokenVersion
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
            department: user.department,
            token_version: dbTokenVersion,
            must_change_password: mustChange
          },
          must_change_password: mustChange,
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

// POST /api/auth/change-password (Self password change with authentication and brute-force protection)
router.post('/change-password', verifyToken, loginLimiter, (req, res) => {
  const { username, current_password, new_password } = req.body;
  if (!username || !current_password || !new_password) {
    return res.status(400).json({ error: 'กรุณาระบุ username, current_password และ new_password ให้ครบถ้วน' });
  }

  if (String(new_password).length < 6) {
    return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  const cleanUsername = String(username).trim();

  // Enforce that caller is altering their own account (or has admin role)
  if (req.user.username !== cleanUsername && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'ท่านไม่มีสิทธิ์เปลี่ยนรหัสผ่านของผู้ใช้อื่น' });
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
    const nextVersion = (user.token_version || 0) + 1;

    db.run(
      "UPDATE users SET password = ?, token_version = ?, must_change_password = 0 WHERE id = ?",
      [hashedNew, nextVersion, user.id],
      function(updateErr) {
        if (updateErr) return res.status(500).json({ error: 'Failed to update password' });
        logAuthEvent(cleanUsername, 'PASSWORD_CHANGE', 'User changed password successfully', req);

        // Issue fresh replacement token with the new token_version so caller can continue seamlessly
        const updatedPayload = {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          department: user.department,
          token_version: nextVersion
        };
        const newToken = jwt.sign(updatedPayload, JWT_SECRET, { expiresIn: '8h' });

        res.json({
          message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว',
          token: newToken
        });
      }
    );
  });
});

// POST /api/auth/refresh (Renew valid token before expiry)
router.post('/refresh', verifyToken, (req, res) => {
  const tokenPayload = {
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
    name: req.user.name,
    department: req.user.department,
    token_version: req.user.token_version || 0
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
  res.json({
    message: 'ต่ออายุเซสชันสำเร็จ',
    token
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
      if (err) return handleDbError(res, err);

      const updatedUser = {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        name: cleanName,
        department: cleanDept,
        token_version: req.user.token_version !== undefined ? req.user.token_version : 0
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

// POST /api/auth/request-reset (Self-service password reset request)
router.post('/request-reset', resetLimiter, (req, res) => {
  if (!isEmailConfigured() && process.env.TEST_ALLOW_RESET !== '1') {
    return res.status(503).json({
      error: 'ระบบส่งอีเมลยังไม่ได้รับการกำหนดค่า กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่านโดยตรง'
    });
  }

  const { username } = req.body;
  if (!username || !String(username).trim()) {
    return res.status(400).json({ error: 'กรุณาระบุ Username' });
  }

  const cleanUsername = String(username).trim();

  db.get(
    "SELECT * FROM users WHERE username = ? AND is_deleted = 0 AND is_active = 1",
    [cleanUsername],
    (err, user) => {
      if (err) return handleDbError(res, err);

      if (!user) {
        logAuthEvent(cleanUsername, 'RESET_REQUEST_FAILED', 'User not found or inactive', req);
        return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้งานที่ระบุ หรือบัญชีถูกระงับการใช้งาน' });
      }

      // Generate 6-digit cryptographic numeric OTP
      const otp = crypto.randomInt(100000, 1000000).toString();
      const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');

      db.run(
        `INSERT INTO password_resets (user_id, username, token_hash, expires_at)
         VALUES (?, ?, ?, datetime('now', '+15 minutes'))`,
        [user.id, cleanUsername, tokenHash],
        async function(insertErr) {
          if (insertErr) return handleDbError(res, insertErr);

          try {
            await sendNotificationEmail({
              templateName: 'PASSWORD_RESET_OTP',
              recipient: `${cleanUsername}@hospital.local`,
              data: {
                name: user.name,
                username: cleanUsername,
                otp
              }
            });
          } catch (mailErr) {
            console.error('[PASSWORD RESET EMAIL ERROR]', mailErr.message);
          }

          logAuthEvent(cleanUsername, 'RESET_OTP_ISSUED', 'Password reset code generated and dispatched', req);

          // STRICT ZERO BACKDOOR: OTP is NEVER returned in response JSON
          res.json({
            message: 'ระบบได้ส่งรหัสยืนยัน (OTP) ไปยังช่องทางที่บันทึกไว้เรียบร้อยแล้ว รหัสมีอายุ 15 นาที',
            username: cleanUsername
          });
        }
      );
    }
  );
});

// POST /api/auth/reset-password-token (Verify OTP and apply new password)
router.post('/reset-password-token', resetLimiter, (req, res) => {
  const { username, otp, new_password } = req.body;
  if (!username || !otp || !new_password) {
    return res.status(400).json({ error: 'กรุณาระบุ Username, รหัสยืนยัน OTP และรหัสผ่านใหม่' });
  }

  if (String(new_password).length < 6) {
    return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  const cleanUsername = String(username).trim();
  const tokenHash = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');

  db.get(
    `SELECT * FROM password_resets 
     WHERE username = ? AND token_hash = ? AND used = 0 AND expires_at > datetime('now')
     ORDER BY id DESC LIMIT 1`,
    [cleanUsername, tokenHash],
    (err, resetRecord) => {
      if (err) return handleDbError(res, err);

      if (!resetRecord) {
        logAuthEvent(cleanUsername, 'RESET_FAILED', 'Invalid or expired OTP token', req);
        return res.status(400).json({ error: 'รหัสยืนยัน OTP ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอรหัสใหม่' });
      }

      const newBcryptHash = hashPassword(String(new_password));

      // Invalidate existing sessions by incrementing token_version and clear must_change_password
      db.run(
        `UPDATE users 
         SET password = ?, must_change_password = 0, token_version = COALESCE(token_version, 0) + 1 
         WHERE id = ? AND is_deleted = 0`,
        [newBcryptHash, resetRecord.user_id],
        function(updateErr) {
          if (updateErr) return handleDbError(res, updateErr);

          // Mark reset code as used
          db.run("UPDATE password_resets SET used = 1 WHERE id = ?", [resetRecord.id]);

          logAuthEvent(cleanUsername, 'PASSWORD_RESET_SUCCESS', 'Password successfully reset via self-service OTP', req);

          res.json({
            message: 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว ท่านสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที'
          });
        }
      );
    }
  );
});

// Helper to record auth audit events safely with standard tracking code
function logAuthEvent(username, action, details, req) {
  const ip = req ? (req.ip || req.connection?.remoteAddress || '127.0.0.1') : '127.0.0.1';
  recordAuditLog(db, {
    asset_tag: 'SYSTEM_AUTH',
    department_name: `IP: ${ip}`,
    floor: 'Security',
    status: action,
    moved_direction: 'AUTH',
    action_by_username: username || 'anonymous',
    details: details || ''
  });
}

module.exports = router;
