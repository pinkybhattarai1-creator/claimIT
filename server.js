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

// 6. Mount API Route Modules
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/configurations', require('./routes/configurations'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/claims', require('./routes/claims'));
app.use('/api/evidence', require('./routes/evidence'));
app.use('/api/export', require('./routes/export'));
app.use('/api', require('./routes/audit'));
const { performBackup } = require('./scripts/backup');

// Admin Backup Trigger Endpoint
app.post('/api/backup', (req, res) => {
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
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`[ClaimIT Network] 📱 สำหรับเพื่อนร่วมงานเข้าใช้งานผ่านเครือข่าย: http://${net.address}:${PORT}`);
        }
      }
    }
  } catch {}
});

module.exports = { app, server };
