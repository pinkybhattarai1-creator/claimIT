const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/envValidator');
const { db } = require('../db');

/**
 * Verify JWT Authentication
 * Validates presence, signature, expiration, and active database status.
 */
function verifyToken(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    } else {
      return res.status(401).json({ error: 'รูปแบบ Authorization Header ไม่ถูกต้อง (Format: Bearer <token>)' });
    }
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'ไม่พบ Token ยืนยันตัวตน (Authentication token required)' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ (Session expired)' });
      }
      return res.status(401).json({ error: 'Token ไม่ถูกต้องหรือถูกแก้ไข (Invalid authentication token)' });
    }

    // Verify user is still active in database
    db.get(
      "SELECT id, username, role, name, department, is_deleted, is_active FROM users WHERE username = ?",
      [decoded.username],
      (dbErr, user) => {
        if (dbErr) {
          return res.status(500).json({ error: 'Database query error during auth verification' });
        }
        if (!user || user.is_deleted === 1) {
          return res.status(401).json({ error: 'บัญชีผู้ใช้งานนี้ไม่มีอยู่ในระบบหรือถูกระงับแล้ว' });
        }
        if (user.is_active === 0) {
          return res.status(403).json({ error: 'บัญชีผู้ใช้งานนี้ถูกปิดการใช้งานชั่วคราว (Account inactive)' });
        }

        req.user = {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          department: user.department
        };
        next();
      }
    );
  });
}

/**
 * Staff-only Authorization Middleware
 * Allows both 'staff' and 'admin' roles.
 */
function staffOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'จำเป็นต้องเข้าสู่ระบบก่อนดำเนินการ' });
  }
  if (req.user.role === 'staff' || req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'จำเป็นต้องมีสิทธิ์ระดับเจ้าหน้าที่ขึ้นไป (Staff/Admin access required)' });
}

/**
 * Admin-only Authorization Middleware
 * Allows only 'admin' role.
 */
function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'จำเป็นต้องเข้าสู่ระบบก่อนดำเนินการ' });
  }
  if (req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบ IT (Admin) เท่านั้นที่มีสิทธิ์ดำเนินการ' });
}

module.exports = {
  JWT_SECRET,
  verifyToken,
  staffOnly,
  adminOnly
};
