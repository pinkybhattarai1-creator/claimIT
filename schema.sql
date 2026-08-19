-- ============================================================================
-- ClaimIT Hospital IT Warranty & RMA Management System
-- Database Schema Definition (SQLite Compatible)
-- ============================================================================

-- 1. Users Table (RBAC: admin, staff, user)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  is_deleted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Departments Table (Hospital Layout)
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_name TEXT NOT NULL,
  floor TEXT NOT NULL,
  name TEXT NOT NULL,
  is_technical_area INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Mains Table (Core IT Assets & EOL Salvage Tracking)
CREATE TABLE IF NOT EXISTS mains (
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
);

-- 4. Multi-Asset Claims Table (Controlled State Machine)
CREATE TABLE IF NOT EXISTS claims (
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
);

-- 5. Claim Assets Junction Table (1 to 5 assets per claim)
CREATE TABLE IF NOT EXISTS claim_assets (
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
);

-- 6. RMA Claims Table (Legacy 1-to-1 asset compatibility view/table)
CREATE TABLE IF NOT EXISTS rma_claims (
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
);

-- 7. Evidence Attachments Table (Private Cloud/Disk Storage)
CREATE TABLE IF NOT EXISTS evidence (
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
);

-- 8. Move & Security Audit Log Table (Immutable audit trail)
CREATE TABLE IF NOT EXISTS move_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_tag TEXT NOT NULL,
  department_name TEXT NOT NULL,
  floor TEXT NOT NULL,
  status TEXT NOT NULL,
  moved_direction TEXT NOT NULL,
  action_by_username TEXT NOT NULL,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Configurations Table (Dynamic Settings)
CREATE TABLE IF NOT EXISTS configurations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  details TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Email & Notification Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_name TEXT NOT NULL,
  status TEXT DEFAULT 'SENT',
  error_message TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_mains_asset_tag ON mains(asset_tag);
CREATE INDEX IF NOT EXISTS idx_mains_serial_no ON mains(serial_no);
CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_claim_assets_claim_id ON claim_assets(claim_id);
CREATE INDEX IF NOT EXISTS idx_evidence_storage_key ON evidence(storage_key);
CREATE INDEX IF NOT EXISTS idx_move_log_asset_tag ON move_log(asset_tag);
