const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { evaluateClaimWorthiness } = require('./claim_calculator');

const app = express();
const PORT = process.env.PORT || 3000;

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

    // Seed data if database is empty
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (row && row.count === 0) {
        // Seed Users
        db.run(`INSERT INTO users (username, password, role, name, department) VALUES 
          ('admin', 'admin123', 'admin', 'Technical Support Head', 'Technical Support & Infrastructure'),
          ('nurse', 'nurse123', 'nurse', 'Nurse Joy', 'Ward 20')`);

        // Seed Departments based on layout map
        db.run(`INSERT INTO departments (building_name, floor, name, is_technical_area) VALUES 
          ('Building 1', '1', 'ฉุกเฉิน (ER)', 0),
          ('Building 1', '2', 'ศูนย์ระบบทางเดินอาหาร (GI)', 0),
          ('Building 1', '4', 'Technical Support & Infrastructure', 1),
          ('Building 1', '4', 'อายุรกรรม', 0),
          ('Building 1', '5', 'สำนักงาน ผอ.รพ.', 0),
          ('Call Center New', '2', 'Call Center Employee Workspace', 0)`);

        // Seed Assets (mains)
        db.run(`INSERT INTO mains (asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status) VALUES 
          ('032186040006', 'Webcam', 'Logitech', 'C930E', 'SN9988', 'Logitech C930E', 'Technical Support & Infrastructure', '2023-01-15', '2026-01-15', 0, 'Working'),
          ('031709030031', 'Monitor', 'Dell', 'E2318H', 'CN-00J', 'Dell E2318H', 'Technical Support & Infrastructure', '2020-05-10', '2023-05-10', 0, 'Working'),
          ('CIT-2023-SCN-01', 'Scanner', 'Zebra', 'DS2208', 'ZB123456', 'Barcode Scanner W20', 'Ward 20', '2023-01-15', '2026-01-15', 0, 'Working')`);

        // Seed Audit Logs (move_log)
        db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES 
          ('032186040006', 'Technical Support & Infrastructure', 'Fl 4', 'Working', 'IN', 'system'),
          ('CIT-2023-SCN-01', 'Ward 20', 'Fl 2', 'Working', 'IN', 'system')`);
        
        console.log('Database tables initialized and seeded.');
      }
    });
  });
}

// REST APIs

// 1. Authentication
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ? AND password = ? AND is_deleted = 0", [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database query error' });
    if (user) {
      res.json({ username: user.username, role: user.role, name: user.name, department: user.department });
    } else {
      res.status(401).json({ error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
    }
  });
});

// ==========================================
// DEPARTMENTS CRUD (Phase 1)
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

// Soft Delete Department
app.delete('/api/departments/:id', (req, res) => {
  db.run(`UPDATE departments SET is_deleted = 1 WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Department soft deleted' });
  });
});

// ==========================================
// ASSETS CRUD & SOFT DELETES
// ==========================================

// Get All Assets (Only active)
app.get('/api/assets', (req, res) => {
  db.all("SELECT * FROM mains WHERE is_deleted = 0", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Soft Delete Asset (keeps IP, Code, Origin)
app.delete('/api/assets/:tag', (req, res) => {
  db.run("UPDATE mains SET is_deleted = 1 WHERE asset_tag = ?", [req.params.tag], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Asset soft deleted successfully. Audit trail preserved.' });
  });
});

// Evaluate Claim Worthiness (Phase 2 Integration)
app.get('/api/assets/:tag/evaluate', (req, res) => {
  db.get("SELECT * FROM mains WHERE asset_tag = ? AND is_deleted = 0", [req.params.tag], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Asset not found' });
    
    // Mock purchase price & lifespan
    const evaluationPayload = {
      assetId: row.asset_tag,
      purchaseDate: row.warranty_start,
      purchasePrice: 10000, 
      warrantyMonths: 36,
      expectedLifespanMonths: 60
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
      // Fuzzy matching logic if exact match fails
      db.all("SELECT m.*, r.vendor_name, r.vendor_rma_number, r.claim_date, r.expected_return_date, r.data_wiped_confirmed as rma_data_wiped_confirmed, r.status as rma_status FROM mains m LEFT JOIN rma_claims r ON m.asset_tag = r.asset_tag AND r.is_deleted = 0 WHERE m.is_deleted = 0", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let bestMatch = null;
        let minDistance = Infinity;
        
        // Levenshtein distance algorithm
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

        // Skip fuzzy matching for very short queries (too many false positives)
        if (tag.length < 4) {
          return res.status(404).json({ error: 'ไม่พบทรัพย์สินดังกล่าว' });
        }

        for (const r of rows) {
          const tagDist = levenshtein(tag, r.asset_tag.toUpperCase());
          const serialDist = levenshtein(tag, r.serial_no.toUpperCase());
          const dist = Math.min(tagDist, serialDist);
          
          // Threshold scales with tag length: allow ~20% character variance, min 1, max 4
          const candidate = dist === tagDist ? r.asset_tag : r.serial_no;
          const maxAllowed = Math.max(1, Math.min(4, Math.floor(candidate.length * 0.20)));
          
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

// Update Asset Status (IT/Nurse Action)
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

        db.run("UPDATE mains SET status = 'At Vendor' WHERE asset_tag = ?", [asset_tag], function(err) {
          if (err) return res.status(500).json({ error: 'Failed to update asset status' });

          db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, ?, 'External', 'At Vendor', 'OUT', ?)`, 
            [asset_tag, vendor_name, action_by_username]);
          res.json({ message: 'ส่งเคลมไปที่ศูนย์บริการ', asset_tag, status: 'At Vendor' });
        });
      }
    );
  });
});

// Get Audit Trail
app.get('/api/audit-logs', (req, res) => {
  db.all("SELECT * FROM move_log ORDER BY timestamp DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get RMA Claims (Only non-deleted)
app.get('/api/rma-claims', (req, res) => {
  db.all("SELECT * FROM rma_claims WHERE is_deleted = 0", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Soft Delete RMA Claim
app.delete('/api/rma-claims/:id', (req, res) => {
  db.run("UPDATE rma_claims SET is_deleted = 1 WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'RMA Claim soft deleted' });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`ClaimIT server running on http://localhost:${PORT}`);
});
