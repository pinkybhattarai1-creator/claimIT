const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');
dotenv.config();
const { evaluateClaimWorthiness } = require('./claim_calculator');
const sgMail = require('@sendgrid/mail');
const jwt = require('jsonwebtoken');


const app = express();
const PORT = process.env.PORT || 8847;

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// JWT secret
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

// Staff‑only middleware (both 'admin' and 'staff' roles can access staff endpoints)
function staffOnly(req, res, next) {
  if (req.user && (req.user.role === 'staff' || req.user.role === 'admin')) return next();
  return res.status(403).json({ error: 'Staff access required' });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// Connect to SQLite Database
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

// Built-in Secure Password Hashing (Local & Offline Capable)
function hashPassword(password) {
  const salt = 'claimit_local_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
}

// Initialize Database Tables and Seed Data
function initializeDatabase() {
  db.serialize(() => {
    // 1. Users Table (RBAC)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0
    )`);

    // 2. Departments Table (CRUD & Hospital Layout)
    db.run(`CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_name TEXT NOT NULL,
      floor TEXT NOT NULL,
      name TEXT NOT NULL,
      is_technical_area INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0
    )`);

    // 3. Mains Table (Core IT Assets)
    db.run(`CREATE TABLE IF NOT EXISTS mains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_tag TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      serial_no TEXT UNIQUE NOT NULL,
      device_name TEXT NOT NULL,
      location TEXT NOT NULL,
      warranty_start TEXT NOT NULL,
      warranty_end TEXT NOT NULL,
      sanitization_required INTEGER DEFAULT 1,
      status TEXT DEFAULT 'Working',
      is_deleted INTEGER DEFAULT 0
    )`);

    // 4. Move Log Table (ISO 27001 Audit Trail)
    db.run(`CREATE TABLE IF NOT EXISTS move_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_tag TEXT NOT NULL,
      department_name TEXT NOT NULL,
      floor TEXT NOT NULL,
      status TEXT NOT NULL,
      moved_direction TEXT NOT NULL,
      action_by_username TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 5. RMA Claims Table (Warranty claims tracking)
    db.run(`CREATE TABLE IF NOT EXISTS rma_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_tag TEXT UNIQUE NOT NULL,
      vendor_name TEXT NOT NULL,
      vendor_rma_number TEXT NOT NULL,
      claim_date TEXT NOT NULL,
      expected_return_date TEXT NOT NULL,
      data_wiped_confirmed INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Initiated',
      is_deleted INTEGER DEFAULT 0
    )`);

    // 6. Configurations Table (Dynamic Settings)
    db.run(`CREATE TABLE IF NOT EXISTS configurations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      details TEXT,
      is_deleted INTEGER DEFAULT 0
    )`);

    // Seed data if users table is empty
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (row && row.count === 0) {
        const adminPass = hashPassword('admin123');
        const staffPass = hashPassword('staff123');

        db.run(`INSERT INTO users (username, password, role, name, department) VALUES 
          ('admin', ?, 'admin', 'Technical Support Head', 'Technical Support & Infrastructure'),
          ('staff', ?, 'staff', 'General Staff', 'General Department')`, [adminPass, staffPass]);

        db.run(`INSERT INTO departments (building_name, floor, name, is_technical_area) VALUES 
          ('Building 1', '1', 'ฉุกเฉิน (ER)', 0),
          ('Building 1', '2', 'ศูนย์ระบบทางเดินอาหาร (GI)', 0),
          ('Building 1', '4', 'Technical Support & Infrastructure', 1),
          ('Building 1', '4', 'อายุรกรรม', 0),
          ('Building 1', '5', 'สำนักงาน ผอ.รพ.', 0),
          ('Call Center New', '2', 'Call Center Employee Workspace', 0)`);

        // Seed Assets (mains) including demo preset tags
        db.run(`INSERT INTO mains (asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status) VALUES 
          ('032186040006', 'Webcam', 'Logitech', 'C930E', 'SN9988', 'Logitech C930E', 'Technical Support & Infrastructure', '2023-01-15', '2026-01-15', 0, 'Working'),
          ('031709030031', 'Monitor', 'Dell', 'E2318H', 'CN-00J', 'Dell E2318H', 'Technical Support & Infrastructure', '2020-05-10', '2023-05-10', 0, 'Working'),
          ('CIT-2023-SCN-01', 'Scanner', 'Zebra', 'DS2208', 'ZB123456', 'Barcode Scanner W20', 'Ward 20', '2023-01-15', '2026-01-15', 0, 'Working'),
          ('CIT-2024-AIO-02', 'Computer', 'HP', 'ProOne 440 G9', 'HP440-2024', 'HP ProOne (ต้อนรับ หน้า รพ.)', 'ต้อนรับ หน้า รพ.', '2024-01-01', '2027-01-01', 1, 'Working'),
          ('CIT-2022-TAB-03', 'Tablet', 'Apple', 'iPad Air 5', 'IPAD-AIR-99', 'iPad Air (ICU Cart)', 'ICU', '2022-03-10', '2025-03-10', 1, 'Broken'),
          ('CIT-2021-AIO-01', 'Computer', 'Dell', 'OptiPlex 7090', 'DELL-OPT-21', 'Dell OptiPlex (Emergency)', 'ฉุกเฉิน (ER)', '2021-06-01', '2024-06-01', 1, 'Working')`);

        db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES 
          ('032186040006', 'Technical Support & Infrastructure', 'Fl 4', 'Working', 'IN', 'system'),
          ('CIT-2023-SCN-01', 'Ward 20', 'Fl 2', 'Working', 'IN', 'system'),
          ('CIT-2022-TAB-03', 'ICU', 'Fl 3', 'Broken', 'OUT', 'staff')`);
        
        db.run(`INSERT INTO configurations (type, value, details) VALUES 
          ('brand', 'IDA', 'Email contact, info required, wait for pickup.'),
          ('brand', 'Dell', 'Take photos with ServiceTag, call support, email photos, keep old tag for new device, test.'),
          ('brand', 'Lenovo', 'Use warranty lookup website, enter S/N, select contact channel.'),
          ('brand', 'TSC', 'Call/Line, send photos/video, document signing for equipment leaving premises, ID card copy upon return.'),
          ('brand', 'Acer', 'Email support, specific instructions for mouse/keyboard claims requiring the PC''s S/N.'),
          ('category', 'Computer', ''),
          ('category', 'Scanner', ''),
          ('category', 'Tablet', ''),
          ('category', 'Webcam', ''),
          ('category', 'Monitor', '')`);

        console.log('Database tables initialized and seeded with demo presets.');
      } else {
        // Ensure missing preset tags exist even if database already created
        const presets = [
          ['CIT-2024-AIO-02', 'Computer', 'HP', 'ProOne 440 G9', 'HP440-2024', 'HP ProOne (ต้อนรับ หน้า รพ.)', 'ต้อนรับ หน้า รพ.', '2024-01-01', '2027-01-01', 1, 'Working'],
          ['CIT-2022-TAB-03', 'Tablet', 'Apple', 'iPad Air 5', 'IPAD-AIR-99', 'iPad Air (ICU Cart)', 'ICU', '2022-03-10', '2025-03-10', 1, 'Broken'],
          ['CIT-2021-AIO-01', 'Computer', 'Dell', 'OptiPlex 7090', 'DELL-OPT-21', 'Dell OptiPlex (Emergency)', 'ฉุกเฉิน (ER)', '2021-06-01', '2024-06-01', 1, 'Working']
        ];
        presets.forEach(p => {
          db.run(`INSERT OR IGNORE INTO mains (asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, p);
        });
      }
    });
  });
}

// REST APIs

// 1. Authentication (Supports hashed + fallback plain text)
app.post('/api/auth/login', (req, res) => {
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


// ==========================================
// USER MANAGEMENT CRUD (Admin only)
// ==========================================
app.get('/api/users', (req, res) => {
  db.all("SELECT id, username, role, name, department FROM users WHERE is_deleted = 0", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/users', (req, res) => {
  const { username, password, role, name, department } = req.body;
  if (!username || !password || !role || !name || !department) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลผู้ใช้งานให้ครบถ้วน' });
  }

  const hashedPassword = hashPassword(password);
  db.run(`INSERT INTO users (username, password, role, name, department) VALUES (?, ?, ?, ?, ?)`,
    [username, hashedPassword, role, name, department],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username นี้ถูกใช้งานแล้ว' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'เพิ่มผู้ใช้งานสำเร็จ' });
    }
  );
});

app.delete('/api/users/:id', (req, res) => {
  db.run("UPDATE users SET is_deleted = 1 WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'ลบผู้ใช้งานสำเร็จ' });
  });
});

// ==========================================
// DEPARTMENTS CRUD
// ==========================================
app.get('/api/departments', (req, res) => {
  db.all("SELECT * FROM departments WHERE is_deleted = 0", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/departments', (req, res) => {
  const { building_name, floor, name, is_technical_area } = req.body;
  db.run(`INSERT INTO departments (building_name, floor, name, is_technical_area) VALUES (?, ?, ?, ?)`, 
    [building_name, floor, name, is_technical_area ? 1 : 0], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Department created' });
  });
});

app.put('/api/departments/:id', (req, res) => {
  const { building_name, floor, name, is_technical_area } = req.body;
  db.run(`UPDATE departments SET building_name = ?, floor = ?, name = ?, is_technical_area = ? WHERE id = ? AND is_deleted = 0`,
    [building_name, floor, name, is_technical_area ? 1 : 0, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Department updated' });
  });
});

app.delete('/api/departments/:id', (req, res) => {
  db.run(`UPDATE departments SET is_deleted = 1 WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Department soft deleted' });
  });
});

// ==========================================
// CONFIGURATIONS CRUD (Admin only)
// ==========================================
app.get('/api/configurations', (req, res) => {
  const { type } = req.query;
  let query = "SELECT * FROM configurations WHERE is_deleted = 0";
  let params = [];
  if (type) {
    query += " AND type = ?";
    params.push(type);
  }
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/configurations', (req, res) => {
  const { type, value, details } = req.body;
  if (!type || !value) return res.status(400).json({ error: 'Missing required fields' });
  db.run(`INSERT INTO configurations (type, value, details) VALUES (?, ?, ?)`, [type, value, details || ''], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Configuration added' });
  });
});

app.put('/api/configurations/:id', (req, res) => {
  const { type, value, details } = req.body;
  db.run(`UPDATE configurations SET type = ?, value = ?, details = ? WHERE id = ? AND is_deleted = 0`, [type, value, details || '', req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Configuration updated' });
  });
});

app.delete('/api/configurations/:id', (req, res) => {
  db.run(`UPDATE configurations SET is_deleted = 1 WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Configuration soft deleted' });
  });
});

// ==========================================
// ASSETS CRUD & SOFT DELETES
// ==========================================

// Get All Assets with optional pagination
app.get('/api/assets', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  
  db.all("SELECT * FROM mains WHERE is_deleted = 0 ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Also return total count for client‑side pagination
    db.get("SELECT COUNT(*) as total FROM mains WHERE is_deleted = 0", (cntErr, cntRow) => {
      if (cntErr) return res.status(500).json({ error: cntErr.message });
      res.json({ total: cntRow.total, page, limit, assets: rows });
    });
  });
});


// Create New Asset
app.post('/api/assets', (req, res) => {
  const { asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, action_by_username } = req.body;
  
  if (!asset_tag || !category || !brand || !model || !serial_no || !device_name || !location || !warranty_start || !warranty_end) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลครุภัณฑ์ให้ครบถ้วน' });
  }

  const sReq = sanitization_required ? 1 : 0;

  db.run(`INSERT INTO mains (asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Working')`,
    [asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sReq],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'รหัสครุภัณฑ์หรือ Serial Number นี้มีอยู่ในระบบแล้ว' });
        }
        return res.status(500).json({ error: err.message });
      }

      db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, ?, 'Fl 1', 'Working', 'IN', ?)`, 
        [asset_tag, location, action_by_username || 'system']);

      res.json({ id: this.lastID, asset_tag, message: 'ลงทะเบียนครุภัณฑ์ใหม่สำเร็จ' });
    }
  );
});

// Update Asset Details
app.put('/api/assets/:tag', (req, res) => {
  const { category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status } = req.body;
  const tag = req.params.tag;

  db.run(`UPDATE mains SET category=?, brand=?, model=?, serial_no=?, device_name=?, location=?, warranty_start=?, warranty_end=?, sanitization_required=?, status=?
          WHERE asset_tag=? AND is_deleted=0`,
    [category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required ? 1 : 0, status, tag],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'อัปเดตข้อมูลครุภัณฑ์สำเร็จ' });
    }
  );
});

// Soft Delete Asset
app.delete('/api/assets/:tag', (req, res) => {
  db.run("UPDATE mains SET is_deleted = 1 WHERE asset_tag = ?", [req.params.tag], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'ลบรายการครุภัณฑ์สำเร็จ' });
  });
});

// Evaluate Claim Worthiness Endpoint
app.get('/api/assets/:tag/evaluate', (req, res) => {
  db.get("SELECT * FROM mains WHERE asset_tag = ? AND is_deleted = 0", [req.params.tag], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Asset not found' });
    
    const evaluationPayload = {
      assetId: row.asset_tag,
      purchaseDate: row.warranty_start,
      purchasePrice: row.category === 'Computer' ? 18000 : (row.category === 'Tablet' ? 22000 : 4500),
      warrantyMonths: 36,
      expectedLifespanMonths: 60,
      status: row.status
    };
    
    const result = evaluateClaimWorthiness(evaluationPayload);
    res.json(result);
  });
});

// Lookup Asset by Tag/Serial with Fuzzy Matching Fallback
app.get('/api/assets/:tag', (req, res) => {
  const tag = req.params.tag.toUpperCase();
  db.get("SELECT m.*, r.vendor_name, r.vendor_rma_number, r.claim_date, r.expected_return_date, r.data_wiped_confirmed as rma_data_wiped_confirmed, r.status as rma_status FROM mains m LEFT JOIN rma_claims r ON m.asset_tag = r.asset_tag AND r.is_deleted = 0 WHERE (m.asset_tag = ? OR m.serial_no = ?) AND m.is_deleted = 0", [tag, tag], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      res.json(row);
    } else {
      db.all("SELECT m.*, r.vendor_name, r.vendor_rma_number, r.claim_date, r.expected_return_date, r.data_wiped_confirmed as rma_data_wiped_confirmed, r.status as rma_status FROM mains m LEFT JOIN rma_claims r ON m.asset_tag = r.asset_tag AND r.is_deleted = 0 WHERE m.is_deleted = 0", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let bestMatch = null;
        let minDistance = Infinity;
        
        const levenshtein = (a, b) => {
          const matrix = [];
          for (let i = 0; i <= b.length; i++) matrix[i] = [i];
          for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
          for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
              if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
              } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
              }
            }
          }
          return matrix[b.length][a.length];
        };

        if (tag.length < 3) {
          return res.status(404).json({ error: 'ไม่พบทรัพย์สินดังกล่าว' });
        }

        for (const r of rows) {
          const tagDist = levenshtein(tag, r.asset_tag.toUpperCase());
          const serialDist = levenshtein(tag, r.serial_no.toUpperCase());
          const dist = Math.min(tagDist, serialDist);
          
          const candidate = dist === tagDist ? r.asset_tag : r.serial_no;
          const maxAllowed = Math.max(1, Math.min(4, Math.floor(candidate.length * 0.25)));
          
          if (dist < minDistance && dist <= maxAllowed) {
            minDistance = dist;
            bestMatch = r;
          }
        }
        
        if (bestMatch) {
          bestMatch.is_fuzzy_match = true;
          bestMatch.original_query = req.params.tag;
          res.json(bestMatch);
        } else {
          res.status(404).json({ error: 'ไม่พบทรัพย์สินดังกล่าว' });
        }
      });
    }
  });
});

// Update Asset Status
app.post('/api/assets/update-status', (req, res) => {
  const { asset_tag, status, location, action_by_username, department_name, floor } = req.body;
  if (!asset_tag || !status || !action_by_username) return res.status(400).json({ error: 'Missing fields' });

  db.serialize(() => {
    db.get("SELECT * FROM mains WHERE asset_tag = ? AND is_deleted = 0", [asset_tag], (err, asset) => {
      if (err || !asset) return res.status(404).json({ error: 'Asset not found' });

      const newLocation = location || asset.location;
      db.run("UPDATE mains SET status = ?, location = ? WHERE asset_tag = ?", [status, newLocation, asset_tag], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update asset status' });

        const movedDirection = status === 'Working' || status === 'Finished' ? 'IN' : 'OUT';
        const logDept = department_name || newLocation;
        const logFloor = floor || 'Unknown';

        db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, ?, ?, ?, ?, ?)`, 
          [asset_tag, logDept, logFloor, status, movedDirection, action_by_username]);
        res.json({ message: 'Asset status updated', status, location: newLocation });
      });
    });
  });
});

// Confirm Data Sanitization (PDPA Safeguard)
app.post('/api/assets/sanitize', (req, res) => {
  const { asset_tag, action_by_username } = req.body;
  if (!asset_tag || !action_by_username) return res.status(400).json({ error: 'Missing fields' });

  db.serialize(() => {
    db.run("INSERT OR IGNORE INTO rma_claims (asset_tag, vendor_name, vendor_rma_number, claim_date, expected_return_date, data_wiped_confirmed, status) VALUES (?, '', '', '', '', 1, 'Sanitized')", [asset_tag], function(err) {
      db.run("UPDATE rma_claims SET data_wiped_confirmed = 1 WHERE asset_tag = ? AND is_deleted = 0", [asset_tag], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to confirm sanitization' });
        
        db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, 'Technical Support', 'Fl 4', 'Sanitized', 'IN', ?)`, 
          [asset_tag, action_by_username]);
        res.json({ message: 'การลบข้อมูล (Sanitization) เสร็จสิ้น' });
      });
    });
  });
});

// Initiate RMA / Warranty Claim
app.post('/api/assets/claim', (req, res) => {
  const { asset_tag, vendor_name, vendor_rma_number, expected_return_date, data_wiped_confirmed, action_by_username } = req.body;
  if (!asset_tag || !vendor_name || !vendor_rma_number || !action_by_username) return res.status(400).json({ error: 'Missing fields' });

  const claimDate = new Date().toISOString().split('T')[0];
  const wiped = data_wiped_confirmed ? 1 : 0;

  db.serialize(() => {
    db.run(`INSERT INTO rma_claims (asset_tag, vendor_name, vendor_rma_number, claim_date, expected_return_date, data_wiped_confirmed, status)
            VALUES (?, ?, ?, ?, ?, ?, 'Out to Vendor')
            ON CONFLICT(asset_tag) DO UPDATE SET 
              vendor_name = excluded.vendor_name, vendor_rma_number = excluded.vendor_rma_number, claim_date = excluded.claim_date, expected_return_date = excluded.expected_return_date, data_wiped_confirmed = excluded.data_wiped_confirmed, status = 'Out to Vendor'`, 
      [asset_tag, vendor_name, vendor_rma_number, claimDate, expected_return_date, wiped], 
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        db.run("UPDATE mains SET status = 'Pending Pickup' WHERE asset_tag = ?", [asset_tag], function(err) {
          if (err) return res.status(500).json({ error: 'Failed to update asset status' });

          db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, ?, 'External', 'Pending Pickup', 'OUT', ?)`, 
            [asset_tag, vendor_name, action_by_username]);
          res.json({ message: 'รอศูนย์บริการเข้ามารับ', asset_tag, status: 'Pending Pickup' });
        });
      }
    );
  });
});

// Audit Trail
app.get('/api/audit-logs', (req, res) => {
  db.all("SELECT * FROM move_log ORDER BY timestamp DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// RMA Claims
app.get('/api/rma-claims', (req, res) => {
  db.all("SELECT * FROM rma_claims WHERE is_deleted = 0", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.delete('/api/rma-claims/:id', (req, res) => {
  db.run("UPDATE rma_claims SET is_deleted = 1 WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'RMA Claim soft deleted' });
  });
});

// PDF Generation for Claim Report
const PDFDocument = require('pdfkit');
const fs = require('fs');

app.get('/api/assets/:tag/pdf', verifyToken, staffOnly, (req, res) => {
  const tag = req.params.tag.toUpperCase();
  db.get("SELECT * FROM mains WHERE asset_tag = ? AND is_deleted = 0", [tag], (err, asset) => {
    if (err || !asset) return res.status(404).json({ error: 'Asset not found' });
    const doc = new PDFDocument();
    const filename = `claim_${tag}.pdf`;
    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);
    // Simple template – can be replaced with HTML rendering later
    doc.fontSize(20).text('Claim Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Asset Tag: ${asset.asset_tag}`);
    doc.text(`Category: ${asset.category}`);
    doc.text(`Brand: ${asset.brand}`);
    doc.text(`Model: ${asset.model}`);
    doc.text(`Serial No: ${asset.serial_no}`);
    doc.text(`Location: ${asset.location}`);
    doc.text(`Warranty: ${asset.warranty_start} – ${asset.warranty_end}`);
    doc.text(`Status: ${asset.status}`);
    doc.end();
  });
});


// ==========================================
// EMAIL ENDPOINT (Staff‑only, real SendGrid)
// ==========================================
app.post('/api/email/send', verifyToken, staffOnly, async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing email parameters (to, subject, html).' });
  }
  try {
    await sgMail.send({ to, from: process.env.SENDGRID_FROM || 'no-reply@claimit.local', subject, html });
    res.json({ success: true, message: 'Email sent successfully.' });
  } catch (error) {
    console.error('SendGrid error:', error);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});


// Start Server
app.listen(PORT, () => {
  console.log(`ClaimIT Server running on port ${PORT}`);
});
