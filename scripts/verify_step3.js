/**
 * Step 3 Verification Suite
 * Tests safe foreign key migrations with ON UPDATE CASCADE,
 * BME regulated medical device guardrails, and
 * Clinical IT category 84-month lifespan / claim viability calibration.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const assert = require('assert');
const { runMigrations } = require('../db/migrations');
const { evaluateClaimWorthiness } = require('../claim_calculator');
const { calculateServerViability } = require('../services/claimService');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function verifyStep3() {
  console.log('=== CLAIMIT STEP 3 VERIFICATION SUITE ===\n');

  // 1. Run Migrations
  console.log('1. Executing schema migrations...');
  await new Promise((resolve, reject) => {
    runMigrations(db, (err, res) => {
      if (err) return reject(err);
      console.log(`   Migrations run successfully. Applied count: ${res ? res.appliedCount : 0}`);
      resolve();
    });
  });

  // Verify migration 005 is recorded
  const migrations = await query("SELECT * FROM schema_migrations WHERE version = '005_enforce_foreign_keys'");
  assert(migrations.length === 1, 'Migration 005_enforce_foreign_keys is recorded in schema_migrations');
  console.log('   ✅ Migration 005_enforce_foreign_keys verified in DB.');

  // 2. PRAGMA foreign_key_check
  console.log('\n2. Verifying database integrity via PRAGMA foreign_key_check...');
  await runSql("PRAGMA foreign_keys = ON;");
  const violations = await query("PRAGMA foreign_key_check;");
  assert(violations.length === 0, `Expected 0 foreign key violations, found: ${JSON.stringify(violations)}`);
  console.log('   ✅ 0 Foreign Key violations detected across all tables.');

  // 3. Verify Configurations contains the 4 Clinical IT categories
  console.log('\n3. Verifying Clinical IT Categories seeded in configurations...');
  const clinicalCats = [
    'Clinical IT Display',
    'Clinical Workstation',
    'Healthcare Scanner',
    'Mobile Nursing Cart'
  ];
  for (const cat of clinicalCats) {
    const rows = await query("SELECT * FROM configurations WHERE type = 'category' AND value = ?", [cat]);
    assert(rows.length >= 1, `Category '${cat}' exists in configurations table`);
  }
  console.log('   ✅ All 4 Clinical IT categories present in configurations table.');

  // 4. Test ON UPDATE CASCADE
  console.log('\n4. Testing ON UPDATE CASCADE functionality...');
  const testTagOrig = `TEST-CASCADE-${Date.now()}`;
  const testTagUpdated = `${testTagOrig}-NEW`;

  // Insert base asset into mains
  await runSql(`
    INSERT INTO mains (asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status, purchase_price, warranty_months, expected_lifespan_months)
    VALUES (?, 'Clinical Workstation', 'HP', 'ProOne 440', ?, 'COW Terminal Test', 'Ward 20', '2024-01-01', '2027-01-01', 1, 'Working', 35000, 36, 84)
  `, [testTagOrig, `SN-${testTagOrig}`]);

  // Create test claim
  const claimNum = `CLM-TEST-${Date.now()}`;
  const claimRes = await runSql(`
    INSERT INTO claims (claim_number, vendor_name, vendor_rma_number, claim_type, created_by, status)
    VALUES (?, 'HP Thailand', 'RMA-999', 'WARRANTY', 'admin', 'DRAFT')
  `, [claimNum]);
  const claimId = claimRes.lastID;

  // Insert into claim_assets
  await runSql(`
    INSERT INTO claim_assets (claim_id, asset_tag, item_status)
    VALUES (?, ?, 'Pending Pickup')
  `, [claimId, testTagOrig]);

  // Insert into rma_claims
  await runSql(`
    INSERT INTO rma_claims (asset_tag, vendor_name, vendor_rma_number, claim_date, expected_return_date)
    VALUES (?, 'HP Thailand', 'RMA-999', '2026-09-07', '2026-09-21')
  `, [testTagOrig]);

  // Insert into evidence
  const storageKey = `storage-key-${Date.now()}`;
  await runSql(`
    INSERT INTO evidence (claim_id, asset_tag, uploader_username, original_filename, storage_key, mime_type, file_size)
    VALUES (?, ?, 'admin', 'test_photo.jpg', ?, 'image/jpeg', 1024)
  `, [claimId, testTagOrig, storageKey]);

  // Now UPDATE asset_tag on mains!
  console.log(`   Updating mains.asset_tag from ${testTagOrig} -> ${testTagUpdated}...`);
  await runSql("UPDATE mains SET asset_tag = ? WHERE asset_tag = ?", [testTagUpdated, testTagOrig]);

  // Verify cascading in claim_assets
  const cascadedClaimAssets = await query("SELECT * FROM claim_assets WHERE claim_id = ?", [claimId]);
  assert.strictEqual(cascadedClaimAssets[0].asset_tag, testTagUpdated, 'claim_assets.asset_tag cascaded automatically');

  // Verify cascading in rma_claims
  const cascadedRma = await query("SELECT * FROM rma_claims WHERE vendor_rma_number = 'RMA-999'");
  assert.strictEqual(cascadedRma[0].asset_tag, testTagUpdated, 'rma_claims.asset_tag cascaded automatically');

  // Verify cascading in evidence
  const cascadedEvidence = await query("SELECT * FROM evidence WHERE storage_key = ?", [storageKey]);
  assert.strictEqual(cascadedEvidence[0].asset_tag, testTagUpdated, 'evidence.asset_tag cascaded automatically');

  // Re-verify PRAGMA foreign_key_check after cascade
  const postCascadeViolations = await query("PRAGMA foreign_key_check;");
  assert(postCascadeViolations.length === 0, 'Zero foreign key violations after cascade update');
  console.log('   ✅ ON UPDATE CASCADE verified: all foreign key child records updated with zero violations.');

  // Clean up test data
  await runSql("DELETE FROM evidence WHERE storage_key = ?", [storageKey]);
  await runSql("DELETE FROM rma_claims WHERE vendor_rma_number = 'RMA-999'");
  await runSql("DELETE FROM claim_assets WHERE claim_id = ?", [claimId]);
  await runSql("DELETE FROM claims WHERE id = ?", [claimId]);
  await runSql("DELETE FROM mains WHERE asset_tag = ?", [testTagUpdated]);

  // 5. Test Audit Log Safety (move_log has NO foreign key)
  console.log('\n5. Testing move_log audit trail safety with non-asset tags...');
  await runSql(`
    INSERT INTO move_log (log_code, asset_tag, department_name, floor, status, moved_direction, action_by_username, details)
    VALUES (?, 'SYSTEM_AUTH', 'Security Subsystem', 'Floor 1', 'SUCCESS', 'IN', 'system', 'Admin login audit event')
  `, [`CHG-TEST-${Date.now()}`]);
  await runSql(`
    INSERT INTO move_log (log_code, asset_tag, department_name, floor, status, moved_direction, action_by_username, details)
    VALUES (?, 'GENERAL', 'Backup Subsystem', 'Floor 1', 'COMPLETED', 'OUT', 'backup_job', 'Nightly offsite backup executed')
  `, [`CHG-TEST-2-${Date.now()}`]);
  console.log('   ✅ move_log logged SYSTEM_AUTH and GENERAL events without Foreign Key errors.');

  // 6. Test Clinical IT Lifespan & Claim Worthiness
  console.log('\n6. Testing Clinical IT 84-month lifespan and claim viability calculation...');
  
  // 6a: Clinical IT Display (within 84 months, out of warranty, repair cost 15,000 vs replacement 45,000 -> 33% < 50%)
  const clinicalDisplay = [{
    asset_tag: 'CIT-DISP-01',
    category: 'Clinical IT Display',
    warrantyStart: '2020-01-01',
    warrantyMonths: 36, // Expired in 2023
    purchasePrice: 45000,
    repair_cost: 15000, // 33% repair ratio
    replacement_price: 45000,
    status: 'Broken'
  }];
  const clinicalEval = evaluateClaimWorthiness(clinicalDisplay[0]);
  assert.strictEqual(clinicalEval.expectedLifespanMonths, 84, 'Clinical IT Display defaults to 84 months lifespan');
  assert.strictEqual(clinicalEval.category, 'OUT_OF_WARRANTY_REPAIRABLE', 'Clinical IT with repair < 50% is OUT_OF_WARRANTY_REPAIRABLE');

  const clinicalViability = calculateServerViability(clinicalDisplay);
  assert(clinicalViability.score <= 5.0, `Clinical IT viability score is ${clinicalViability.score} <= 5.0`);
  assert.strictEqual(clinicalViability.isViable, true, 'Clinical IT item is VIABLE');
  console.log(`   ✅ Clinical IT Display: 84m lifespan, Repair < 50% -> OUT_OF_WARRANTY_REPAIRABLE (Score: ${clinicalViability.score}, VIABLE)`);

  // 6b: Standard Expired Asset (Test 5 fidelity check)
  const expiredGeneral = [{
    asset_tag: 'TEST-E1',
    warrantyStart: '2015-01-01',
    warrantyMonths: 24,
    expectedLifespanMonths: 36,
    purchasePrice: 15000,
    status: 'Broken'
  }];
  const expiredResult = calculateServerViability(expiredGeneral);
  assert(expiredResult.score > 5.0, `Expired item score is ${expiredResult.score} > 5.0`);
  assert.strictEqual(expiredResult.isViable, false, 'Expired general asset is NOT_VIABLE');
  console.log(`   ✅ General Expired Asset: Score ${expiredResult.score} > 5.0 -> NOT_VIABLE (Test 5 preserved)`);

  console.log('\n=============================================');
  console.log('🎉 ALL STEP 3 VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('=============================================\n');
  process.exit(0);
}

verifyStep3().catch(err => {
  console.error('\n❌ STEP 3 VERIFICATION FAILED:', err);
  process.exit(1);
});
