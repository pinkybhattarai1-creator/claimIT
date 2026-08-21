const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'database.db');
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
    { table: 'configurations', col: 'created_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
  ];

  migrations.forEach(m => {
    db.run(`ALTER TABLE ${m.table} ADD COLUMN ${m.col} ${m.def}`, () => {
      // Ignore if column already exists
    });
  });
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

    // The application has exactly two roles. Preserve access for old Super Admin
    // accounts by migrating them to Admin on start-up.
    db.run("UPDATE users SET role = 'admin' WHERE role = 'super_admin'");

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

    // Seed Initial Admin & Staff if empty
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (row && row.count === 0) {
        const adminPass = hashPassword('admin123');
        const staffPass = hashPassword('staff123');

        db.run(
          `INSERT INTO users (username, password, role, name, department, is_active) VALUES 
          ('admin', ?, 'admin', 'Technical Support Head', 'Technical Support & Infrastructure', 1),
          ('staff', ?, 'staff', 'General Staff', 'General Department', 1)`,
          [adminPass, staffPass]
        );

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

    const departmentLayout = [
      ['อาคาร AP', '7', 'Ward 7'], ['อาคาร AP', '7', 'Well Baby'], ['อาคาร AP', '8', 'Ward 8'], ['อาคาร AP', '9', 'Ward 9'], ['อาคาร AP', '10', 'Ward 10'], ['อาคาร AP', '11', 'Ward 11'], ['อาคาร AP', '12', 'Ward 12'], ['อาคาร AP', '15', 'Ward 15'], ['อาคาร AP', '17', 'Ward 17'],
      ['อาคาร 1', '1', 'ยานพาหนะ'], ['อาคาร 1', '1', 'เภสัช'], ['อาคาร 1', '1', 'ต้อนรับหน้ารพ.'], ['อาคาร 1', '1', 'เวชระเบียน'], ['อาคาร 1', '1', 'ฉุกเฉิน'], ['อาคาร 1', '1', 'X-Ray'], ['อาคาร 1', '1', 'ต้อนรับจองห้อง'], ['อาคาร 1', '1', 'การเงิน OPD'], ['อาคาร 1', '1', 'ต้อนรับฉุกเฉิน'], ['อาคาร 1', '1', 'รับ-ส่ง ER'], ['อาคาร 1', '1', 'MSK'], ['อาคาร 1', '1', 'EMTB'], ['อาคาร 1', '1', 'ศัลยกรรม'], ['อาคาร 1', '1', 'Operator'], ['อาคาร 1', '1', 'รักษาความปลอดภัย'], ['อาคาร 1', '1', 'บูธการตลาด'], ['อาคาร 1', '1', 'โภชนาการ'], ['อาคาร 1', '1', 'คัดกรองอาการ'], ['อาคาร 1', '1', 'Food House'], ['อาคาร 1', '1', 'เจาะเลือด (62)'],
      ['อาคาร 1', '2', 'การเงิน'], ['อาคาร 1', '2', 'คลังสุขภาพ'], ['อาคาร 1', '2', 'เจาะเลือด'], ['อาคาร 1', '2', 'ต้อนรับ GI'], ['อาคาร 1', '2', 'ต้อนรับศูนย์สุขภาพหญิง'], ['อาคาร 1', '2', 'ทันตกรรม'], ['อาคาร 1', '2', 'เภสัช'], ['อาคาร 1', '2', 'เวชระเบียน (ขอประวัติ)'], ['อาคาร 1', '2', 'ศูนย์ผู้มีบุตรยาก'], ['อาคาร 1', '2', 'ศูนย์ระบบทางเดินอาหาร'], ['อาคาร 1', '2', 'ศูนย์สมองและระบบประสาท'], ['อาคาร 1', '2', 'ศูนย์สุขภาพหญิง'], ['อาคาร 1', '2', 'ห้องปฏิบัติการหญิง'],
      ['อาคาร 1', '3', 'Cath Lab'], ['อาคาร 1', '3', 'CSSD'], ['อาคาร 1', '3', 'ICU 1'], ['อาคาร 1', '3', 'ICU 3'], ['อาคาร 1', '3', 'N-Health'], ['อาคาร 1', '3', 'PICU'], ['อาคาร 1', '3', 'ไตเทียม'], ['อาคาร 1', '3', 'วิสัญญี'], ['อาคาร 1', '3', 'ห้องผ่าตัด'], ['อาคาร 1', '3', 'ห้องพักแพทย์ ICU'],
      ['อาคาร 1', '4', 'การเงิน ARI'], ['อาคาร 1', '4', 'อายุรกรรม'], ['อาคาร 1', '4', 'ห้องยา ARI'], ['อาคาร 1', '4', 'ต้อนรับ ARI'], ['อาคาร 1', '4', 'ต้อนรับห้องเด็ก'], ['อาคาร 1', '4', 'ต้อนรับ EENT'], ['อาคาร 1', '4', 'เภสัชกรรมเด็ก'], ['อาคาร 1', '4', 'รับ-ส่ง'], ['อาคาร 1', '4', 'เจาะเลือด'], ['อาคาร 1', '4', 'EENT'], ['อาคาร 1', '4', 'IT', 1], ['อาคาร 1', '4', 'ARI'], ['อาคาร 1', '4', 'ต้อนรับศูนย์สุขภาพเด็ก'], ['อาคาร 1', '4', 'Fax Claim'], ['อาคาร 1', '4', 'UR Nurse'], ['อาคาร 1', '4', 'การเงิน IPD'], ['อาคาร 1', '4', 'ศูนย์สุขภาพเด็ก'], ['อาคาร 1', '4', 'คลินิคนมแม่'], ['อาคาร 1', '4', 'การเงิน OPD'],
      ['อาคาร 1', '5', 'IC'], ['อาคาร 1', '5', 'IMC'], ['อาคาร 1', '5', 'New Normal'], ['อาคาร 1', '5', 'Nurse Case'], ['อาคาร 1', '5', 'QMS (UR OPD)'], ['อาคาร 1', '5', 'QMS'], ['อาคาร 1', '5', 'QMS สำนักงานผอ.รพ.'], ['อาคาร 1', '5', 'Tele Care'], ['อาคาร 1', '5', 'UR OPD'], ['อาคาร 1', '5', 'ธุรการ'], ['อาคาร 1', '5', 'บริหารลูกค้าองค์กร'], ['อาคาร 1', '5', 'บุคคล'], ['อาคาร 1', '5', 'ประกันสัมพันธ์'], ['อาคาร 1', '5', 'ฝ่ายการพยาบาล'], ['อาคาร 1', '5', 'เวชสถิติ'], ['อาคาร 1', '5', 'สำนักงาน ผอ.บริหาร'], ['อาคาร 1', '5', 'สำนักงาน ผอ.แพทย์'], ['อาคาร 1', '5', 'สำนักงาน ผอ.รพ.'], ['อาคาร 1', '5', 'ห้องประชุม Design Thinking (Training Room)'], ['อาคาร 1', '5', 'ห้องประชุม We Beforeme'], ['อาคาร 1', '5', 'ห้องประชุม We Can'], ['อาคาร 1', '5', 'ห้องผอ.การตลาด'], ['อาคาร 1', '5', 'ห้องผอ.แพทย์'], ['อาคาร 1', '5', 'ห้องพักแพทย์'], ['อาคาร 1', '5', 'ห้องรับรองผอ.รพ.'],
      ['อาคาร 1', '6', 'ART'], ['อาคาร 1', '6', 'Nursery'], ['อาคาร 1', '6', 'การตลาด'], ['อาคาร 1', '6', 'บริหารธุรกิจ (Biz Admin)'], ['อาคาร 1', '6', 'บัญชี'], ['อาคาร 1', '6', 'สนับสนุนการเงิน'], ['อาคาร 1', '6', 'ห้องคลอด'], ['อาคาร 1', '14', 'ศูนย์ตาและเลสิก'], ['อาคาร 1', '14', 'PWA'], ['อาคาร 1', '14', 'เภสัชกรรม'], ['อาคาร 1', '14', 'ต้อนรับ PWA'], ['อาคาร 1', '14', 'Nurse Case'], ['อาคาร 1', '14', 'ศูนย์ความงาม'], ['อาคาร 1', '14', 'ศูนย์สุขภาพเพศ (Look Like Love)'], ['อาคาร 1', '14', 'Love Live Center'], ['อาคาร 1', '14', 'การเงิน OPD'], ['อาคาร 1', '16', 'กายภาพ'], ['อาคาร 1', '16', 'ไตเทียม'], ['อาคาร 1', '18', 'ศูนย์เต้านม'], ['อาคาร 1', '18', 'เภสัชกรรม'], ['อาคาร 1', '18', 'พิมพ์ผล'], ['อาคาร 1', '18', 'ต้อนรับ Check Up'], ['อาคาร 1', '18', 'เจาะเลือดทั่วไป'], ['อาคาร 1', '18', 'เจาะเลือด Corporate'], ['อาคาร 1', '18', 'การเงิน OPD'], ['อาคาร 1', '18', 'X-Ray'], ['อาคาร 1', '18', 'X-Ray Corporate'], ['อาคาร 1', '18', 'Check Up Corporate'], ['อาคาร 1', '18', 'Check Up'], ['อาคาร 1', '19', 'URO'], ['อาคาร 1', '19', 'การเงิน OPD'], ['อาคาร 1', '19', 'เจาะเลือด DM'], ['อาคาร 1', '19', 'ต้อนรับ URO DM'], ['อาคาร 1', '19', 'เภสัชกรรม'], ['อาคาร 1', '19', 'ศูนย์เบาหวาน'], ['อาคาร 1', '19', 'หัวใจ'], ['อาคาร 1', '20', 'Ward 20'], ['อาคาร 1', '21', 'Observ'], ['อาคาร 1', 'B', 'พัสดุ'], ['อาคาร 1', 'B', 'รักษาความปลอดภัย'], ['อาคาร 1', 'B', 'วิศวกรรม'], ['อาคาร 1', 'B', 'เวชระเบียน'], ['อาคาร 1', 'D', 'คลังยา'], ['อาคาร 1', 'D', 'ช่างศิลป์'], ['อาคาร 1', 'D', 'บริหารทรัพย์สิน'], ['อาคาร 1', 'D', 'แม่บ้าน'],
      ['Call Center เดิม', '1', 'Call Center'], ['Call Center เดิม', '1', 'ลูกค้าต่างชาติ / รับและส่งสินค้า'], ['Call Center เดิม', '2', 'นักแปล'], ['Call Center ใหม่', '1', 'หัวหน้างาน'], ['Call Center ใหม่', '2', 'พนักงาน'], ['Call Center ใหม่', '3', 'พนักงาน'], ['Call Center ใหม่', '4', 'พนักงาน'], ['Call Center ใหม่', 'Floating', 'ผู้จัดการ']
    ];
    const insertDepartment = db.prepare(`INSERT INTO departments (building_name, floor, name, is_technical_area)
      SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM departments WHERE building_name = ? AND floor = ? AND name = ? AND is_deleted = 0)`);
    departmentLayout.forEach(([building, floor, name, technical = 0]) => insertDepartment.run(building, floor, name, technical, building, floor, name));
    insertDepartment.finalize();
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
  runInTransaction
};
