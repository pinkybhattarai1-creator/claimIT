const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', 'database.db');
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

module.exports = {
  db,
  hashPassword,
  initializeDatabase
};
