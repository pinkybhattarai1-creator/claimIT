const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    // Enable SQLite optimizations & foreign keys
    db.run("PRAGMA foreign_keys = ON;");
    db.run("PRAGMA journal_mode = WAL;");
    initializeDatabase();
  }
});

// Built-in Secure Password Hashing via bcryptjs
function hashPassword(password) {
  return bcrypt.hashSync(String(password), 10);
}

function verifyPassword(inputPassword, storedHash) {
  if (!storedHash || !inputPassword) return false;
  // Standard bcrypt hash
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    return bcrypt.compareSync(String(inputPassword), storedHash);
  }
  // Legacy pbkdf2 migration support
  const crypto = require('crypto');
  const salt = 'claimit_local_salt_2026';
  const legacyHash = crypto.pbkdf2Sync(String(inputPassword), salt, 1000, 32, 'sha256').toString('hex');
  return storedHash === legacyHash;
}

// Safely add missing columns to existing SQLite tables
function migrateColumns() {
  const migrations = [
    { table: 'users', col: 'is_active', def: 'INTEGER DEFAULT 1' },
    { table: 'users', col: 'created_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'departments', col: 'created_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'mains', col: 'purchase_price', def: 'REAL DEFAULT 0' },
    { table: 'mains', col: 'warranty_months', def: 'INTEGER DEFAULT 36' },
    { table: 'mains', col: 'expected_lifespan_months', def: 'INTEGER DEFAULT 60' },
    { table: 'mains', col: 'po_number', def: 'TEXT' },
    { table: 'mains', col: 'invoice_no', def: 'TEXT' },
    { table: 'mains', col: 'salvage_status', def: "TEXT DEFAULT 'None'" },
    { table: 'mains', col: 'created_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'mains', col: 'updated_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
    { table: 'rma_claims', col: 'data_wiped_by', def: 'TEXT' },
    { table: 'rma_claims', col: 'data_wiped_at', def: 'DATETIME' },
    { table: 'rma_claims', col: 'sanitization_note', def: 'TEXT' },
    { table: 'rma_claims', col: 'resolved_date', def: 'TEXT' },
    { table: 'rma_claims', col: 'resolution_type', def: 'TEXT' },
    { table: 'rma_claims', col: 'replacement_serial_no', def: 'TEXT' },
    { table: 'rma_claims', col: 'repair_cost', def: 'REAL DEFAULT 0' },
    { table: 'move_log', col: 'details', def: 'TEXT' },
    { table: 'move_log', col: 'log_code', def: 'TEXT' },
    { table: 'configurations', col: 'created_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
  ];

  migrations.forEach(m => {
    db.run(`ALTER TABLE ${m.table} ADD COLUMN ${m.col} ${m.def}`, () => {
      if (m.col === 'log_code') {
        db.run("CREATE INDEX IF NOT EXISTS idx_move_log_code ON move_log(log_code);");
        db.run("UPDATE move_log SET log_code = 'CHG-LEGACY-' || id WHERE log_code IS NULL OR log_code = '';");
      }
    });
  });
  // Fallback backfill for existing databases
  db.run("UPDATE move_log SET log_code = 'CHG-LEGACY-' || id WHERE log_code IS NULL OR log_code = '';", () => {});
}

// Generate guaranteed-unique change tracking code
const crypto = require('crypto');
function generateLogCode() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CHG-${dateStr}-${rand}`;
}

// Standardized Audit Log Recorder ensuring guaranteed unique tracking code
function recordAuditLog(database, { asset_tag, department_name, floor, status, moved_direction, action_by_username, details }, callback) {
  const targetDb = database || db;
  const logCode = generateLogCode();
  const sql = `
    INSERT INTO move_log (log_code, asset_tag, department_name, floor, status, moved_direction, action_by_username, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    logCode,
    asset_tag || 'GENERAL',
    department_name || 'IT Support',
    floor || 'Floor 1',
    status || 'Recorded',
    moved_direction || 'IN',
    action_by_username || 'system',
    details || ''
  ];

  targetDb.run(sql, params, function(err) {
    if (callback) callback(err, { id: this ? this.lastID : null, log_code: logCode });
  });
  return logCode;
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
      is_active INTEGER DEFAULT 1,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Departments Table
    db.run(`CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_name TEXT NOT NULL,
      floor TEXT NOT NULL,
      name TEXT NOT NULL,
      is_technical_area INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. Mains Table (Assets)
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
      purchase_price REAL DEFAULT 0,
      warranty_months INTEGER DEFAULT 36,
      expected_lifespan_months INTEGER DEFAULT 60,
      po_number TEXT,
      invoice_no TEXT,
      salvage_status TEXT DEFAULT 'None',
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 4. Claims Table (Multi-Asset Claim)
    db.run(`CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_number TEXT UNIQUE NOT NULL,
      vendor_name TEXT NOT NULL,
      vendor_rma_number TEXT,
      claim_type TEXT DEFAULT 'WARRANTY',
      viability_score REAL DEFAULT 0,
      viability_status TEXT DEFAULT 'VIABLE',
      status TEXT DEFAULT 'DRAFT',
      claim_date TEXT,
      expected_return_date TEXT,
      resolved_date TEXT,
      resolution_type TEXT,
      replacement_serial_no TEXT,
      repair_cost REAL DEFAULT 0,
      created_by TEXT NOT NULL,
      confirmed_by TEXT,
      notes TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 5. Claim Assets Junction Table
    db.run(`CREATE TABLE IF NOT EXISTS claim_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id INTEGER NOT NULL,
      asset_tag TEXT NOT NULL,
      data_wiped_confirmed INTEGER DEFAULT 0,
      data_wiped_by TEXT,
      data_wiped_at DATETIME,
      sanitization_note TEXT,
      item_status TEXT DEFAULT 'Pending Pickup',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (claim_id) REFERENCES claims (id)
    )`);

    // 6. RMA Claims Table (Compatibility)
    db.run(`CREATE TABLE IF NOT EXISTS rma_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_tag TEXT UNIQUE NOT NULL,
      vendor_name TEXT NOT NULL,
      vendor_rma_number TEXT NOT NULL,
      claim_date TEXT NOT NULL,
      expected_return_date TEXT NOT NULL,
      data_wiped_confirmed INTEGER DEFAULT 0,
      data_wiped_by TEXT,
      data_wiped_at DATETIME,
      sanitization_note TEXT,
      resolved_date TEXT,
      resolution_type TEXT,
      replacement_serial_no TEXT,
      repair_cost REAL DEFAULT 0,
      status TEXT DEFAULT 'Initiated',
      is_deleted INTEGER DEFAULT 0
    )`);

    // 7. Evidence Table
    db.run(`CREATE TABLE IF NOT EXISTS evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id INTEGER,
      asset_tag TEXT,
      uploader_username TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      storage_key TEXT UNIQUE NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      checksum TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 8. Move Log Table (Audit trail)
    db.run(`CREATE TABLE IF NOT EXISTS move_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_code TEXT UNIQUE,
      asset_tag TEXT NOT NULL,
      department_name TEXT NOT NULL,
      floor TEXT NOT NULL,
      status TEXT NOT NULL,
      moved_direction TEXT NOT NULL,
      action_by_username TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 9. Configurations Table
    db.run(`CREATE TABLE IF NOT EXISTS configurations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      details TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 10. Email Logs Table
    db.run(`CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id INTEGER,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      template_name TEXT NOT NULL,
      status TEXT DEFAULT 'SENT',
      error_message TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create Indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_mains_asset_tag ON mains(asset_tag);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_mains_serial_no ON mains(serial_no);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_claim_assets_claim_id ON claim_assets(claim_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_evidence_storage_key ON evidence(storage_key);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_move_log_asset_tag ON move_log(asset_tag);`);

    // Apply migrations
    migrateColumns();

    // Seed Configurations if empty
    db.get("SELECT COUNT(*) as count FROM configurations", (err, row) => {
      if (row && row.count === 0) {
        const defaultConfigs = [
          ['brand', 'IDA', '<div class="brand-guide"><div style="font-weight:bold;color:#38bdf8;margin-bottom:6px;">📋 ขั้นตอนการส่งเคลมประกันศูนย์ IDA:</div><ol style="margin:0 0 10px 18px;padding:0;line-height:1.6;font-size:13px;"><li>ส่ง Email แจ้งเคลมไปที่ <strong>support@idagroup.co.th</strong></li><li>ระบุข้อมูลจำเป็น: <strong>หมายเลขซีเรียล (S/N), อาการเสียอย่างละเอียด, จุดติดตั้ง/แผนก, ชื่อและเบอร์โทรผู้ติดต่อ</strong></li><li>รอรับการตอบกลับยืนยันและหมายเลข RMA / Case Number จากเจ้าหน้าที่</li><li>จัดเตรียมอุปกรณ์และรอรถขนส่งเข้ามารับเครื่องที่โรงพยาบาล</li></ol><div style="font-size:12px;color:#94a3b8;background:rgba(56,189,248,0.1);padding:8px;border-radius:6px;border-left:3px solid #38bdf8;">💡 <strong>ข้อแนะนำ:</strong> บันทึกหมายเลข Case No. หรือ RMA No. ที่ได้รับลงในระบบ ClaimIT ทันทีเพื่อความสะดวกในการติดตามสถานะ</div></div>'],
          ['brand', 'Dell', '<div class="brand-guide"><div style="font-weight:bold;color:#38bdf8;margin-bottom:6px;">📋 ขั้นตอนการส่งเคลมประกันศูนย์ Dell (ProSupport):</div><ol style="margin:0 0 10px 18px;padding:0;line-height:1.6;font-size:13px;"><li>ถ่ายรูปภาพตัวเครื่องให้เห็นป้าย <strong>Service Tag / Express Service Code</strong> ชัดเจน และรูปภาพแสดงอาการเสีย</li><li>โทรติดต่อ Call Center Dell Support (02-670-7250) หรือเปิดเคสออนไลน์</li><li>ส่งรูปภาพ Service Tag และข้อมูลประกอบตามที่ฝ่ายบริการส่งคำขอมาทาง Email</li><li><strong style="color:#f59e0b;">ข้อควรจำ:</strong> หากเป็นชิ้นส่วนหรือเครื่องทดแทน ให้ลอก/เก็บป้าย Tag เดิมไว้ติดกับอุปกรณ์ชิ้นใหม่</li><li>เมื่อช่าง Dell เข้าเปลี่ยนอะไหล่ ให้ทดสอบระบบ (Diagnostics) ให้เรียบร้อยก่อนเซ็นรับมอบงาน</li></ol></div>'],
          ['brand', 'Lenovo', '<div class="brand-guide"><div style="font-weight:bold;color:#38bdf8;margin-bottom:6px;">📋 ขั้นตอนการส่งเคลมประกันศูนย์ Lenovo:</div><ol style="margin:0 0 10px 18px;padding:0;line-height:1.6;font-size:13px;"><li>เข้าสู่ระบบตรวจสอบประกันที่เว็บไซต์ <a href="https://support.lenovo.com/warrantylookup" target="_blank" style="color:#38bdf8;text-decoration:underline;">Lenovo Warranty Lookup</a></li><li>กรอกหมายเลข Serial Number (S/N) ของเครื่องเพื่อตรวจสอบระดับการรับประกัน (Onsite / Premier Support)</li><li>เลือกช่องทางเปิดเคส: โทร 1800-011-936 หรือส่ง e-Ticket ผ่านระบบเว็บไซต์</li><li>นัดหมายวันเวลาให้ช่างผู้ชำนาญการ On-site เข้ามาให้บริการที่โรงพยาบาล หรือเตรียมส่งเครื่องเข้าศูนย์บริการ</li></ol></div>'],
          ['brand', 'TSC', '<div class="brand-guide"><div style="font-weight:bold;color:#38bdf8;margin-bottom:6px;">📋 ขั้นตอนการส่งเคลมเครื่องพิมพ์บาร์โค้ด TSC:</div><ol style="margin:0 0 10px 18px;padding:0;line-height:1.6;font-size:13px;"><li>ติดต่อตัวแทนจำหน่าย/ศูนย์บริการ TSC ผ่านโทรศัพท์หรือ Line Official Service</li><li>ถ่ายรูปป้าย Serial Number และถ่ายคลิปวิดีโอสั้นแสดงอาการผิดปกติ (เช่น หัวพิมพ์ขาด, มอเตอร์ไม่หมุน, ฟีดกระดาษติด)</li><li><strong style="color:#f59e0b;">เอกสารนำออก:</strong> ทำหนังสือขออนุญาตนำทรัพย์สินออกนอกโรงพยาบาล (Gate Pass) พร้อมให้ผู้มีอำนาจลงนาม</li><li>เมื่อเจ้าหน้าที่นำเครื่องมาส่งคืน ให้ขอสำเนาบัตรประชาชนผู้ส่งและเอกสารใบส่งมอบคืนเครื่องไว้เป็นหลักฐาน</li></ol></div>'],
          ['brand', 'Acer', '<div class="brand-guide"><div style="font-weight:bold;color:#38bdf8;margin-bottom:6px;">📋 ขั้นตอนการส่งเคลมประกันศูนย์ Acer:</div><ol style="margin:0 0 10px 18px;padding:0;line-height:1.6;font-size:13px;"><li>ส่ง Email แจ้งเคลมไปที่ <strong>acerthai@acer.com</strong> หรือติดต่อ Call Center 02-153-9600</li><li><strong style="color:#ef4444;">⚠️ กฎสำคัญ:</strong> หากเป็นการเคลมอุปกรณ์ต่อพ่วง (เมาส์ / คีย์บอร์ด / Adapter) <strong>ต้องระบุหมายเลข S/N ของเครื่อง PC/AIO ตัวแม่ที่ซื้อมาคู่กันเสมอ</strong></li><li>ระบุอาการเสีย สถานที่ตั้งเครื่อง และเบอร์โทรศัพท์ผู้ประสานงาน</li><li>รอรับใบงาน RMA เพื่อส่งเครื่องหรือรอขนส่งเข้ารับอุปกรณ์</li></ol></div>'],
          ['category', 'Computer', ''],
          ['category', 'Scanner', ''],
          ['category', 'Tablet', ''],
          ['category', 'Webcam', ''],
          ['category', 'Monitor', ''],
          ['location', 'Ward 20', 'Floor 2'],
          ['location', 'ICU', 'Floor 3'],
          ['location', 'ฉุกเฉิน (ER)', 'Floor 1'],
          ['location', 'Technical Support & Infrastructure', 'Floor 4']
        ];

        const stmt = db.prepare("INSERT INTO configurations (type, value, details) VALUES (?, ?, ?)");
        defaultConfigs.forEach(cfg => stmt.run(cfg));
        stmt.finalize();
        console.log('ClaimIT configurations seeded with rich brand procedures.');
      }
    });

    // Seed 4 Admins and 4 Staff (IT Field/On-Site Technicians)
    const adminPass = hashPassword('admin123');
    const staffPass = hashPassword('staff123');
    const standardUsers = [
      ['admin', adminPass, 'admin', 'Admin 1 (Technical Support Head)', 'Technical Support & Infrastructure'],
      ['admin2', adminPass, 'admin', 'Admin 2 (Senior IT Support)', 'Technical Support & Infrastructure'],
      ['admin3', adminPass, 'admin', 'Admin 3 (Systems & Network IT)', 'Technical Support & Infrastructure'],
      ['admin4', adminPass, 'admin', 'Admin 4 (Hardware & Claim IT)', 'Technical Support & Infrastructure'],
      ['staff', staffPass, 'staff', 'Staff 1 (IT Field Technician - On-Site)', 'Technical Support & Infrastructure'],
      ['staff2', staffPass, 'staff', 'Staff 2 (IT On-site Support)', 'Technical Support & Infrastructure'],
      ['staff3', staffPass, 'staff', 'Staff 3 (IT Mobile Hardware Support)', 'Technical Support & Infrastructure'],
      ['staff4', staffPass, 'staff', 'Staff 4 (IT Ward Support Staff)', 'Technical Support & Infrastructure']
    ];

    standardUsers.forEach(u => {
      db.run(
        `INSERT INTO users (username, password, role, name, department, is_active)
         SELECT ?, ?, ?, ?, ?, 1
         WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = ?)`,
        [u[0], u[1], u[2], u[3], u[4], u[0]]
      );
    });

    db.get("SELECT COUNT(*) as count FROM departments", (err, row) => {
      if (row && row.count === 0) {
        db.run(
          `INSERT INTO departments (building_name, floor, name, is_technical_area) VALUES 
          ('Building 1', '1', 'ฉุกเฉิน (ER)', 0),
          ('Building 1', '2', 'ศูนย์ระบบทางเดินอาหาร (GI)', 0),
          ('Building 1', '4', 'Technical Support & Infrastructure', 1),
          ('Building 1', '4', 'อายุรกรรม', 0),
          ('Building 1', '5', 'สำนักงาน ผอ.รพ.', 0),
          ('Call Center New', '2', 'Call Center Employee Workspace', 0)`
        );

        db.run(
          `INSERT INTO mains (asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status, purchase_price, warranty_months, expected_lifespan_months, salvage_status) VALUES 
          ('032186040006', 'Webcam', 'Logitech', 'C930E', 'SN9988', 'Logitech C930E', 'Technical Support & Infrastructure', '2023-01-15', '2026-01-15', 0, 'Working', 4500, 36, 60, 'None'),
          ('031709030031', 'Monitor', 'Dell', 'E2318H', 'CN-00J', 'Dell E2318H', 'Technical Support & Infrastructure', '2019-05-10', '2022-05-10', 0, 'Broken', 4800, 36, 48, 'Pending Sell'),
          ('CIT-2023-SCN-01', 'Scanner', 'Zebra', 'DS2208', 'ZB123456', 'Barcode Scanner W20', 'Ward 20', '2023-01-15', '2026-01-15', 0, 'Working', 6500, 36, 60, 'None'),
          ('CIT-2024-AIO-02', 'Computer', 'HP', 'ProOne 440 G9', 'HP440-2024', 'HP ProOne (ต้อนรับ หน้า รพ.)', 'ต้อนรับ หน้า รพ.', '2024-01-01', '2027-01-01', 1, 'Working', 24500, 36, 60, 'None'),
          ('CIT-2022-TAB-03', 'Tablet', 'Apple', 'iPad Air 5', 'IPAD-AIR-99', 'iPad Air (ICU Cart)', 'ICU', '2022-03-10', '2025-03-10', 1, 'Broken', 22000, 36, 60, 'None'),
          ('CIT-2021-AIO-01', 'Computer', 'Dell', 'OptiPlex 7090', 'DELL-OPT-21', 'Dell OptiPlex (Emergency)', 'ฉุกเฉิน (ER)', '2018-06-01', '2021-06-01', 1, 'Broken', 18500, 36, 48, 'Pending Donation')`
        );

        db.run(
          `INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES 
          ('032186040006', 'Technical Support & Infrastructure', 'Fl 4', 'Working', 'IN', 'system'),
          ('CIT-2023-SCN-01', 'Ward 20', 'Fl 2', 'Working', 'IN', 'system'),
          ('CIT-2022-TAB-03', 'ICU', 'Fl 3', 'Broken', 'OUT', 'staff')`
        );

        console.log('ClaimIT database initialized with core tables and demo presets [DEMO ONLY].');
      }
    });
  });
}

// Transaction execution helper
function runInTransaction(callback) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION;", (beginErr) => {
        if (beginErr) return reject(beginErr);

        callback(db)
          .then((result) => {
            db.run("COMMIT;", (commitErr) => {
              if (commitErr) return reject(commitErr);
              resolve(result);
            });
          })
          .catch((err) => {
            db.run("ROLLBACK;", () => {
              reject(err);
            });
          });
      });
    });
  });
}

module.exports = {
  db,
  hashPassword,
  verifyPassword,
  initializeDatabase,
  runInTransaction,
  generateLogCode,
  recordAuditLog
};
