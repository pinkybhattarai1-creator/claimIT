/**
 * ClaimIT Security Middleware Suite
 * Provides Security Headers (Helmet equivalent), Rate Limiting, CORS Allowlist, and Safe Error Handling.
 */

const { CORS_ORIGIN, NODE_ENV } = require('../utils/envValidator');

// 1. Security Headers (Helmet-equivalent)
function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Enable XSS filtering
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Enforce HTTPS HSTS when in production or over HTTPS
  if (NODE_ENV === 'production' || req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; frame-ancestors 'self';"
  );
  // Disable powered-by banner
  res.removeHeader('X-Powered-By');
  next();
}

// 2. Strict CORS Allowlist
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const allowed = CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(o => o.trim());

  if (allowed === '*' || !origin || allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  } else {
    if (req.method === 'OPTIONS') {
      return res.status(403).json({ error: 'CORS origin not allowed' });
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
}

// 3. Sliding Window In-Memory Rate Limiter
function createRateLimiter({ windowMs = 60000, max = 100, message = 'Too many requests, please try again later.' }) {
  const hits = new Map();

  // Cleanup old entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.startTime > windowMs) {
        hits.delete(key);
      }
    }
  }, Math.max(windowMs, 60000)).unref();

  return function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    let record = hits.get(key);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((record.startTime + windowMs) / 1000));

    if (record.count > max) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}

// Rate Limiter Presets
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,                  // Max 15 attempts
  message: 'เข้าสู่ระบบล้มเหลวหลายครั้งเกินไป กรุณารอ 15 นาทีก่อนลองใหม่อีกครั้ง'
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,      // 1 minute
  max: 300,                 // 300 requests per minute
  message: 'คำขอถี่เกินกำหนด กรุณารอสักครู่'
});

// 4. Centralized Safe Error Handler
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isClientError = status >= 400 && status < 500;

  // Log error with request context (without secrets)
  console.error(`[ERROR] [${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${status} - Message:`, err.message);

  if (NODE_ENV !== 'production' && !isClientError) {
    console.error(err.stack);
  }

  // Safe client response (never expose stack traces in production)
  const clientMessage = isClientError 
    ? err.message 
    : (NODE_ENV === 'production' ? 'เกิดข้อผิดพลาดภายในระบบ กรุณาติดต่อผู้ดูแล' : err.message || 'Internal Server Error');

  res.status(status).json({
    error: clientMessage,
    ...(NODE_ENV !== 'production' && !isClientError ? { stack: err.stack } : {})
  });
}

module.exports = {
  securityHeaders,
  corsMiddleware,
  createRateLimiter,
  loginLimiter,
  apiLimiter,
  errorHandler
};
