const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

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
      department TEXT NOT NULL
    )`);

    // 5. Departments Table
    db.run(`CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_name TEXT NOT NULL,
      floor TEXT NOT NULL,
      location_detail TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 6. Vendors Table
    db.run(`CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Mains Table (Core IT Assets)
    db.run(`CREATE TABLE IF NOT EXISTS mains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_tag TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      serial_no TEXT UNIQUE NOT NULL,
      device_name TEXT NOT NULL,
      location TEXT NOT NULL,
      department_id INTEGER,
      warranty_start TEXT NOT NULL,
      warranty_end TEXT NOT NULL,
      sanitization_required INTEGER DEFAULT 1,
      status TEXT DEFAULT 'Working'
    )`);

    // 3. Move Log Table (ISO 27001 Audit Trail)
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

    // 4. RMA Claims Table (Warranty claims tracking)
    db.run(`CREATE TABLE IF NOT EXISTS rma_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_tag TEXT UNIQUE NOT NULL,
      vendor_name TEXT NOT NULL,
      vendor_id INTEGER,
      vendor_rma_number TEXT NOT NULL,
      claim_date TEXT NOT NULL,
      expected_return_date TEXT NOT NULL,
      data_wiped_confirmed INTEGER DEFAULT 0,
      data_wiped_by TEXT,
      data_wiped_at TEXT,
      sanitization_note TEXT,
      status TEXT DEFAULT 'Initiated'
    )`);

    // Seed data if database is empty
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (row && row.count === 0) {
        // Seed Users
        db.run(`INSERT INTO users (username, password, role, name, department) VALUES 
          ('admin', 'admin123', 'admin', 'IT Support Head', 'IT Department'),
          ('itstaff', 'itstaff123', 'it_staff', 'IT Technician', 'IT Department'),
          ('nurse', 'nurse123', 'nurse', 'Nurse Joy', 'Ward 20')`);

        // Seed Departments
        db.run(`INSERT INTO departments (department_name, floor, location_detail) VALUES 
          ('IT Department', 'Fl 1', 'Main IT Room'),
          ('Ward 20', 'Fl 2', 'Nurse Station'),
          ('ต้อนรับ หน้า รพ.', 'Fl 1', 'Reception Desk'),
          ('ICU', 'Fl 3', 'Intensive Care Unit'),
          ('Ward 15', 'Fl 2', 'Secondary Nurse Station'),
          ('Emergency Dept', 'Fl 1', 'ER')`);

        // Seed Vendors
        db.run(`INSERT INTO vendors (vendor_name, contact_name, phone, email, address) VALUES 
          ('HP', 'HP Support', '12345678', 'support@hp.com', 'HP HQ'),
          ('Apple', 'Apple Care', '87654321', 'care@apple.com', 'Apple Store'),
          ('Zebra', 'Zebra Tech', '11122233', 'info@zebra.com', 'Zebra HQ'),
          ('Dell', 'Dell Support', '44455566', 'support@dell.com', 'Dell HQ')`);

        // Seed Assets (mains)
        db.run(`INSERT INTO mains (asset_tag, category, brand, model, serial_no, device_name, location, department_id, warranty_start, warranty_end, sanitization_required, status) VALUES 
          ('CIT-2023-SCN-01', 'Scanner', 'Zebra', 'DS2208', 'ZB123456', 'Barcode Scanner W20', 'Ward 20', 2, '2023-01-15', '2026-01-15', 0, 'Working'),
          ('CIT-2024-AIO-02', 'AIO PC', 'HP', 'ProOne 440', 'HP889977', 'HP ProOne Reception PC', 'ต้อนรับ หน้า รพ.', 3, '2024-05-10', '2027-05-10', 1, 'Working'),
          ('CIT-2022-TAB-03', 'Tablet', 'Apple', 'iPad Air 5', 'IP998877', 'Nurse Tablet ICU', 'ICU', 4, '2022-03-20', '2025-03-20', 1, 'Broken'),
          ('CIT-2023-SCN-02', 'Scanner', 'Zebra', 'DS2208', 'ZB654321', 'Barcode Scanner W15', 'Ward 15', 5, '2023-06-18', '2026-06-18', 0, 'Working'),
          ('CIT-2021-AIO-01', 'AIO PC', 'Dell', 'OptiPlex 7490', 'DL445566', 'Dell OptiPlex Emergency', 'Emergency Dept', 6, '2021-08-12', '2024-08-12', 1, 'Working')`);

        // Seed Audit Logs (move_log)
        db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES 
          ('CIT-2023-SCN-01', 'Ward 20', 'Fl 2', 'Working', 'IN', 'system'),
          ('CIT-2024-AIO-02', 'ต้อนรับ หน้า รพ.', 'Fl 1', 'Working', 'IN', 'system'),
          ('CIT-2022-TAB-03', 'ICU', 'Fl 3', 'Broken', 'OUT', 'nurse')`);
        
        console.log('Database tables initialized and seeded.');
      }
    });
  });
}

// REST APIs

// 1. Authentication
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database query error' });
    }
    if (user) {
      res.json({
        username: user.username,
        role: user.role,
        name: user.name,
        department: user.department
      });
    } else {
      res.status(401).json({ error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง (Invalid username or password)' });
    }
  });
});

// 2. Get All Assets
app.get('/api/assets', (req, res) => {
  db.all("SELECT * FROM mains", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 3. Lookup Asset by Tag/Serial
app.get('/api/assets/:tag', (req, res) => {
  const tag = req.params.tag;
  db.get("SELECT m.*, r.vendor_name, r.vendor_rma_number, r.claim_date, r.expected_return_date, r.data_wiped_confirmed as rma_data_wiped_confirmed, r.data_wiped_by, r.data_wiped_at, r.sanitization_note, r.status as rma_status FROM mains m LEFT JOIN rma_claims r ON m.asset_tag = r.asset_tag WHERE m.asset_tag = ? OR m.serial_no = ?", [tag, tag], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      res.json(row);
    } else {
      res.status(404).json({ error: 'ไม่พบทรัพย์สินดังกล่าว (Asset not found)' });
    }
  });
});

// 4. Update Asset Status (IT/Nurse Action)
app.post('/api/assets/update-status', (req, res) => {
  const { asset_tag, status, location, action_by_username, department_name, floor } = req.body;
  
  if (!asset_tag || !status || !action_by_username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.serialize(() => {
    // Check if asset exists
    db.get("SELECT * FROM mains WHERE asset_tag = ?", [asset_tag], (err, asset) => {
      if (err || !asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      const newLocation = location || asset.location;
      
      db.get("SELECT id FROM departments WHERE department_name = ?", [newLocation], (err, deptRow) => {
        const department_id = deptRow ? deptRow.id : (asset.department_id || null);

        // Update status and location
        db.run("UPDATE mains SET status = ?, location = ?, department_id = ? WHERE asset_tag = ?", [status, newLocation, department_id, asset_tag], function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update asset status' });
          }

          // Insert audit trail log
          const movedDirection = status === 'Working' ? 'IN' : 'OUT';
          const logDept = department_name || newLocation;
          const logFloor = floor || 'Fl 1';

          db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) 
                  VALUES (?, ?, ?, ?, ?, ?)`, 
            [asset_tag, logDept, logFloor, status, movedDirection, action_by_username], 
            function(err) {
              if (err) {
                console.error('Audit log insertion failed:', err.message);
              }
              res.json({ message: 'Asset status updated successfully', status, location: newLocation, department_id });
            }
          );
        });
      });
    });
  });
});

// 5. Confirm Data Sanitization (PDPA Safeguard)
app.post('/api/assets/sanitize', (req, res) => {
  const { asset_tag, action_by_username, sanitization_note } = req.body;
  if (!asset_tag || !action_by_username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const wipedAt = new Date().toISOString();

  db.serialize(() => {
    db.run("INSERT OR IGNORE INTO rma_claims (asset_tag, vendor_name, vendor_rma_number, claim_date, expected_return_date, data_wiped_confirmed, data_wiped_by, data_wiped_at, sanitization_note, status) VALUES (?, '', '', '', '', 1, ?, ?, ?, 'Sanitized')", 
      [asset_tag, action_by_username, wipedAt, sanitization_note || ''], 
      function(err) {
      db.run("UPDATE rma_claims SET data_wiped_confirmed = 1, data_wiped_by = ?, data_wiped_at = ?, sanitization_note = ? WHERE asset_tag = ?", 
        [action_by_username, wipedAt, sanitization_note || '', asset_tag], 
        function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to confirm sanitization' });
        }
        // Log the sanitization event
        db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) 
                VALUES (?, 'IT Department', 'Fl 1', 'Sanitized', 'IN', ?)`, 
          [asset_tag, action_by_username], 
          function(err) {
            res.json({ message: 'การลบข้อมูล (Sanitization) เสร็จสิ้นและบันทึกในระบบเรียบร้อยแล้ว' });
          }
        );
      });
    });
  });
});

// 6. Initiate RMA / Warranty Claim
app.post('/api/assets/claim', (req, res) => {
  const { asset_tag, vendor_name, vendor_rma_number, expected_return_date, data_wiped_confirmed, sanitization_note, action_by_username } = req.body;
  
  if (!asset_tag || !vendor_name || !vendor_rma_number || !action_by_username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.get("SELECT sanitization_required FROM mains WHERE asset_tag = ?", [asset_tag], (err, asset) => {
    if (err || !asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Enforce data sanitization requirement
    if (asset.sanitization_required === 1 && !data_wiped_confirmed) {
      return res.status(400).json({ error: 'Data Wiped / Data Removed confirmation is mandatory for this device type.' });
    }

    const claimDate = new Date().toISOString().split('T')[0];
    const wiped = data_wiped_confirmed ? 1 : 0;
    const wipedBy = wiped ? action_by_username : null;
    const wipedAt = wiped ? new Date().toISOString() : null;

    db.get("SELECT id FROM vendors WHERE vendor_name = ?", [vendor_name], (err, vendorRow) => {
      const vendor_id = vendorRow ? vendorRow.id : null;

      db.serialize(() => {
        // Insert or update RMA claims table
        db.run(`INSERT INTO rma_claims (asset_tag, vendor_name, vendor_id, vendor_rma_number, claim_date, expected_return_date, data_wiped_confirmed, data_wiped_by, data_wiped_at, sanitization_note, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Out to Vendor')
                ON CONFLICT(asset_tag) DO UPDATE SET 
                  vendor_name = excluded.vendor_name,
                  vendor_id = excluded.vendor_id,
                  vendor_rma_number = excluded.vendor_rma_number,
                  claim_date = excluded.claim_date,
                  expected_return_date = excluded.expected_return_date,
                  data_wiped_confirmed = excluded.data_wiped_confirmed,
                  data_wiped_by = excluded.data_wiped_by,
                  data_wiped_at = excluded.data_wiped_at,
                  sanitization_note = excluded.sanitization_note,
                  status = 'Out to Vendor'`, 
          [asset_tag, vendor_name, vendor_id, vendor_rma_number, claimDate, expected_return_date, wiped, wipedBy, wipedAt, sanitization_note || ''], 
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Update asset status to 'At Vendor' in mains
            db.run("UPDATE mains SET status = 'At Vendor' WHERE asset_tag = ?", [asset_tag], function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to update asset status' });
              }

              // Insert audit log
              db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) 
                      VALUES (?, ?, 'External', 'At Vendor', 'OUT', ?)`, 
                [asset_tag, vendor_name, action_by_username], 
                function(err) {
                  res.json({ message: 'ส่งเคลมไปที่ศูนย์บริการ (RMA Claim initiated)', asset_tag, status: 'At Vendor' });
                }
              );
            });
          }
        );
      });
    });
  });
});

// 7. Get Audit Trail (ISO 27001 logs)
app.get('/api/audit-logs', (req, res) => {
  db.all("SELECT * FROM move_log ORDER BY timestamp DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 8. Get RMA Claims
app.get('/api/rma-claims', (req, res) => {
  db.all("SELECT * FROM rma_claims", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`ClaimIT server running on http://localhost:${PORT}`);
});
