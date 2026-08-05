-- Schema for ClaimIT Hospital Equipment, Locations, Users, and RMA Claims (SQLite Compatible)
-- Note: This system operates entirely offline/locally within the hospital network.

-- 1. Users Table (RBAC)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

-- 2. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_name TEXT NOT NULL,
  floor TEXT NOT NULL,
  name TEXT NOT NULL,
  is_technical_area INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0
);

-- 3. Mains Table (Core IT Assets)
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
  is_deleted INTEGER DEFAULT 0
);

-- 4. Move Log Table (ISO 27001 Audit Trail)
CREATE TABLE IF NOT EXISTS move_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_tag TEXT NOT NULL,
  department_name TEXT NOT NULL,
  floor TEXT NOT NULL,
  status TEXT NOT NULL,
  moved_direction TEXT NOT NULL,
  action_by_username TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. RMA Claims Table (Warranty claims tracking)
CREATE TABLE IF NOT EXISTS rma_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_tag TEXT UNIQUE NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_rma_number TEXT NOT NULL,
  claim_date TEXT NOT NULL,
  expected_return_date TEXT NOT NULL,
  data_wiped_confirmed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Initiated',
  is_deleted INTEGER DEFAULT 0
);
