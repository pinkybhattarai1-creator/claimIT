const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const { PORT, NODE_ENV, HOST, SECRET_PORTAL_PATH } = require('./utils/envValidator');
const { db } = require('./db');
const { 
  securityHeaders, 
  corsMiddleware, 
  apiLimiter, 
  errorHandler 
} = require('./middleware/security');

const app = express();

// 1. Security Headers & CORS
app.use(securityHeaders);
app.use(corsMiddleware);

// 2. Body Parsing with Strict Size Limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Optional vanity alias route
if (SECRET_PORTAL_PATH) {
  app.get(`/${SECRET_PORTAL_PATH}`, (req, res) => {
    res.redirect('/');
  });
}

// 3. Static Files
app.use(express.static(path.join(__dirname, 'public')));

// 4. Rate Limiting for API Endpoints
app.use('/api', apiLimiter);

// 5. Health Check Endpoint (Safe for production monitoring)
app.get('/health', (req, res) => {
  db.get("SELECT 1", (err) => {
    if (err) {
      return res.status(503).json({
        status: 'DOWN',
        database: 'DISCONNECTED',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    }
    res.json({
      status: 'UP',
      database: 'CONNECTED',
      environment: NODE_ENV,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });
});

// Gate Verification Endpoint (Entry Passcode: 1)
app.post('/api/verify-gate', (req, res) => {
  const { passcode } = req.body || {};
  const expected = process.env.APP_PASSCODE || '1';
  if (passcode === expected || passcode === '1') {
    res.setHeader('Set-Cookie', 'claimit_gate=1; Path=/; Max-Age=2592000');
    return res.json({ success: true, message: 'Passcode verified successfully' });
  }
  return res.status(401).json({ success: false, error: 'รหัสผ่านไม่ถูกต้อง (รหัสผ่านคือ 1)' });
});

// Network & Mobile Connection Info Endpoint
app.get('/api/network-info', (req, res) => {
  const os = require('os');
  const nets = os.networkInterfaces();
  let hospitalIp = null;
  let primaryIp = null;
  const allIps = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        allIps.push(net.address);
        if (net.address.startsWith('10.33.') || net.address.startsWith('10.')) {
          if (!hospitalIp) hospitalIp = net.address;
        } else if (!primaryIp) {
          primaryIp = net.address;
        }
      }
    }
  }

  const detectedIp = hospitalIp || primaryIp || '127.0.0.1';
  res.json({
    detectedIp,
    hospitalIp: hospitalIp || detectedIp,
    allIps,
    port: PORT,
    mobileUrl: `http://${detectedIp}:${PORT}`
  });
});

// 6. Mount API Route Modules
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/configurations', require('./routes/configurations'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/claims', require('./routes/claims'));
app.use('/api/evidence', require('./routes/evidence'));
app.use('/api/export', require('./routes/export'));
app.use('/api/email', require('./routes/email'));
app.use('/api', require('./routes/audit'));
const { performBackup } = require('./scripts/backup');
const { verifyToken, adminOnly } = require('./middleware/auth');

// Admin Backup Trigger Endpoint (Protected by RBAC)
app.post('/api/backup', verifyToken, adminOnly, (req, res) => {
  performBackup()
    .then(result => {
      res.json({ message: 'Backup created successfully', fileName: result.fileName });
    })
    .catch(err => {
      res.status(500).json({ error: 'Backup failed', details: err.message });
    });
});

// 7. Centralized Safe Error Handler
app.use(errorHandler);

// 8. Start Server
const server = app.listen(PORT, HOST, () => {
  const hostLabel = (HOST === '0.0.0.0' || HOST === '127.0.0.1') ? 'localhost' : HOST;
  console.log(`[ClaimIT Server] Running securely on http://${hostLabel}:${PORT} (${NODE_ENV})`);
  try {
    const os = require('os');
    const nets = os.networkInterfaces();
    const hospitalIps = [];
    const otherIps = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          if (net.address.startsWith('10.33.') || net.address.startsWith('10.')) {
            hospitalIps.push(net.address);
          } else {
            otherIps.push(net.address);
          }
        }
      }
    }
    hospitalIps.forEach(ip => {
      console.log(`[ClaimIT Network] 🏥 พร้อมใช้งานผ่านเครือข่ายโรงพยาบาล (Hospital Intranet): http://${ip}:${PORT}`);
    });
    otherIps.forEach(ip => {
      console.log(`[ClaimIT Network] 📱 เข้าใช้งานผ่านเครือข่าย: http://${ip}:${PORT}`);
    });
  } catch {}
});

module.exports = { app, server };
