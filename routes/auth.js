const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, hashPassword } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'กรุณาระบุ Username และ Password' });

  db.get("SELECT * FROM users WHERE username = ? AND is_deleted = 0", [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database query error' });
    if (!user) return res.status(401).json({ error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });

    const hashedInput = hashPassword(password);
    const isMatch = (user.password === hashedInput) || (user.password === password);

    if (isMatch) {
      const token = jwt.sign({ username: user.username, role: user.role, name: user.name, department: user.department }, JWT_SECRET, { expiresIn: '8h' });
      res.json({ token, username: user.username, role: user.role, name: user.name, department: user.department });
    } else {
      res.status(401).json({ error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
    }
  });
});

module.exports = router;
