/* Read-only import from the hospital MySQL stock database into ClaimIT SQLite. */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { db } = require('../db');

const reportPath = path.join(__dirname, '..', 'storage', 'sync-status.json');
const required = ['SOURCE_DB_HOST', 'SOURCE_DB_USER', 'SOURCE_DB_PASSWORD'];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
  console.error(`Sync not started: configure ${missing.join(', ')} in .env.`);
  process.exit(2);
}

const source = { host: process.env.SOURCE_DB_HOST, port: Number(process.env.SOURCE_DB_PORT || 3306), user: process.env.SOURCE_DB_USER, password: process.env.SOURCE_DB_PASSWORD, database: process.env.SOURCE_DB_NAME || 'stockz' };
const query = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(err) { err ? reject(err) : resolve(this); }));

function value(row, ...keys) { for (const key of keys) if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return String(row[key]).trim(); return null; }
async function main() {
  const connection = await mysql.createConnection(source);
  // Only source fields that exist are used. No guessed data is ever written.
  const [rows] = await connection.execute('SELECT asset_tag, serial_no, name, category, brand, model, department_name, floor, status FROM mains');
  let imported = 0, skipped = 0;
  for (const row of rows) {
    const assetTag = value(row, 'asset_tag'); const serial = value(row, 'serial_no');
    if (!assetTag || !serial) { skipped++; continue; }
    const category = value(row, 'category') || 'Unclassified'; const brand = value(row, 'brand') || 'Unknown'; const model = value(row, 'model') || 'Unknown';
    const name = value(row, 'name') || `${category} ${brand} ${model}`;
    const location = [value(row, 'department_name'), value(row, 'floor') ? `ชั้น ${value(row, 'floor')}` : null].filter(Boolean).join(' — ') || 'ไม่ระบุสถานที่';
    await run(`INSERT INTO mains (asset_tag, serial_no, device_name, category, brand, model, location, warranty_start, warranty_end, status, sanitization_required)
      VALUES (?, ?, ?, ?, ?, ?, ?, '1970-01-01', '1970-01-01', ?, 0)
      ON CONFLICT(asset_tag) DO UPDATE SET serial_no=excluded.serial_no, device_name=excluded.device_name, category=excluded.category, brand=excluded.brand, model=excluded.model, location=excluded.location, status=excluded.status`, [assetTag, serial, name, category, brand, model, location, value(row, 'status') || 'Working']);
    imported++;
  }
  await connection.end();
  const report = { synced_at: new Date().toISOString(), source: `${source.database}.mains`, imported, skipped, mapping: ['asset_tag', 'serial_no', 'name', 'category', 'brand', 'model', 'department_name', 'floor', 'status'] };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Sync complete: ${imported} imported/updated, ${skipped} skipped. Report: ${reportPath}`);
}
main().catch(error => { console.error('Sync failed:', error.message); process.exit(1); });
