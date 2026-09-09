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

// 2. Strict CORS Allowlist (Supporting Phyathai, Hospital Intranet, Localhost, and custom domains)
function isOriginAllowed(origin, allowedList) {
  if (!origin) return true; // Same-origin or non-browser client (curl, mobile, backend)

  // Phyathai hospital domains (*.phyathai.com, phyathai.com)
  if (/^https?:\/\/([a-zA-Z0-9-]+\.)*phyathai\.com(:\d+)?$/i.test(origin)) return true;

  // Localhost & Loopback on any port
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;

  // Hospital Intranet private subnets (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
  if (/^https?:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;

  // Custom allowed origins from .env
  if (allowedList === '*') return true;
  if (Array.isArray(allowedList)) {
    for (const item of allowedList) {
      if (!item) continue;
      if (item === '*' || item === origin) return true;
      if (item.startsWith('*.')) {
        const rootDomain = item.slice(2);
        try {
          const u = new URL(origin);
          if (u.hostname === rootDomain || u.hostname.endsWith('.' + rootDomain)) return true;
        } catch {}
      }
    }
  }
  return false;
}

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const allowed = CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(o => o.trim());

  if (isOriginAllowed(origin, allowed)) {
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Vendor-Webhook-Key');
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

// 3. Sliding Window In-Memory Rate Limiter with Route Normalization & Strict Size Cap
const MAX_RATE_LIMITER_ENTRIES = 5000;

function normalizeRouteSegment(req) {
  const cleanPath = (req.originalUrl || req.url || req.path || '').split('?')[0];
  const parts = cleanPath.split('/').filter(Boolean);
  return parts.slice(0, 2).join('_') || 'root';
}

function createRateLimiter({ windowMs = 60000, max = 100, message = 'Too many requests, please try again later.' }) {
  const hits = new Map();

  // Cleanup old entries periodically
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
    const routePrefix = normalizeRouteSegment(req);
    const key = `${routePrefix}:${ip}`;
    const now = Date.now();

    // Prevent map ballooning by enforcing hard capacity ceiling
    if (hits.size >= MAX_RATE_LIMITER_ENTRIES) {
      for (const [k, rec] of hits.entries()) {
        if (now - rec.startTime > windowMs) {
          hits.delete(k);
        }
      }
      if (hits.size >= MAX_RATE_LIMITER_ENTRIES) {
        const evictCount = Math.ceil(MAX_RATE_LIMITER_ENTRIES * 0.1);
        let count = 0;
        for (const k of hits.keys()) {
          hits.delete(k);
          count++;
          if (count >= evictCount) break;
        }
      }
    }

    let record = hits.get(key);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const isLoopback = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    const effectiveMax = isLoopback ? Math.max(max, 300) : max;

    res.setHeader('X-RateLimit-Limit', effectiveMax);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, effectiveMax - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((record.startTime + windowMs) / 1000));

    if (record.count > effectiveMax) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}

// Rate Limiter Presets
const isDevOrTest = NODE_ENV === 'test' || NODE_ENV === 'development' || !NODE_ENV;
const loginLimiter = createRateLimiter({
  windowMs: isDevOrTest ? 1000 : 15 * 60 * 1000, // 1 second in dev/test, 15m in prod
  max: isDevOrTest ? 1000 : 15,
  message: 'เข้าสู่ระบบล้มเหลวหลายครั้งเกินไป กรุณารอ 15 นาทีก่อนลองใหม่อีกครั้ง'
});

const resetLimiter = createRateLimiter({
  windowMs: isDevOrTest ? 1000 : 15 * 60 * 1000,
  max: isDevOrTest ? 1000 : 5,
  message: 'คำขอรีเซ็ตรหัสผ่านถี่เกินไป กรุณารอ 15 นาทีก่อนทำรายการใหม่'
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
    error: clientMessage
  });
}

module.exports = {
  securityHeaders,
  corsMiddleware,
  createRateLimiter,
  loginLimiter,
  resetLimiter,
  apiLimiter,
  errorHandler
};
