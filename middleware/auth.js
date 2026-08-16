const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Staff-only middleware (both 'admin' and 'staff' roles can access staff endpoints)
function staffOnly(req, res, next) {
  if (req.user && (req.user.role === 'staff' || req.user.role === 'admin')) return next();
  return res.status(403).json({ error: 'Staff access required' });
}

module.exports = {
  JWT_SECRET,
  verifyToken,
  staffOnly
};
