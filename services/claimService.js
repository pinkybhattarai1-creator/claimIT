/**
 * ClaimIT Claim Service
 * Authoritative backend for claim viability calculation, multi-asset limits (1-5 assets),
 * state machine transitions, and atomic database transactions.
 */

const { db, recordAuditLog } = require('../db');
const { evaluateClaimWorthiness, evaluateComprehensiveAsset } = require('../claim_calculator');

const MAX_ASSETS_PER_CLAIM = 5;

// Strict Controlled Claim State Transitions
const VALID_STATE_TRANSITIONS = {
  'DRAFT': ['VIABLE', 'NOT_VIABLE', 'CANCELLED'],
  'VIABLE': ['CONFIRMED', 'CANCELLED'],
  'NOT_VIABLE': ['CANCELLED'],
  'CONFIRMED': ['SUBMITTED', 'CANCELLED'],
  'SUBMITTED': ['VENDOR_RESPONSE', 'RETURNED', 'REJECTED', 'CANCELLED'],
  'VENDOR_RESPONSE': ['RETURNED', 'REJECTED', 'CANCELLED'],
  'RETURNED': ['CLOSED'],
  'REJECTED': ['CLOSED'],
  'CLOSED': [],
  'CANCELLED': []
};

/**
 * Server-authoritative viability score calculation
 * Hard rule: score <= 5 -> VIABLE, score > 5 -> NOT_VIABLE
 */
function calculateServerViability(assets) {
  if (!assets || !Array.isArray(assets) || assets.length === 0) {
    throw new Error('ต้องระบุรายการครุภัณฑ์อย่างน้อย 1 รายการเพื่อประเมินความคุ้มค่า');
  }

  let totalScore = 0;
  let totalCurrentValue = 0;
  let totalPurchasePrice = 0;
  const assetEvaluations = [];

  for (const asset of assets) {
    const evalResult = evaluateClaimWorthiness(asset);
    assetEvaluations.push(evalResult);
    
    totalPurchasePrice += evalResult.purchasePrice;
    totalCurrentValue += evalResult.estimatedCurrentValue;

    // Score: 0-10 scale where <= 5 is Viable
    // If under warranty, score is 1.0 (highly viable)
    // If out of warranty but high value, score is proportional to depreciation (e.g. 3.0-5.0)
    // If expired/EOL, score is 7.5-10.0 (not viable)
    let itemScore = 5.0;
    if (evalResult.isUnderWarranty) {
      itemScore = 1.0;
    } else if (evalResult.category === 'OUT_OF_WARRANTY_REPAIRABLE') {
      const depreciationRatio = evalResult.estimatedCurrentValue / Math.max(1, evalResult.purchasePrice);
      itemScore = Math.min(5.0, Math.max(2.0, 5.0 - (depreciationRatio * 3.0)));
    } else {
      itemScore = 8.5;
    }
    totalScore += itemScore;
  }

  const averageScore = Math.round((totalScore / assets.length) * 100) / 100;
  const isViable = averageScore <= 5.0;
  const viabilityStatus = isViable ? 'VIABLE' : 'NOT_VIABLE';

  return {
    score: averageScore,
    isViable,
    viabilityStatus,
    assetEvaluations,
    totalCurrentValue,
    totalPurchasePrice,
    explanation: isViable 
      ? `ผลการประเมิน: คุ้มค่าที่จะส่งเคลม (Viability Score: ${averageScore} <= 5.0)` 
      : `ผลการประเมิน: ไม่คุ้มค่าส่งเคลมหรือหมดอายุการใช้งาน (Viability Score: ${averageScore} > 5.0)`
  };
}

/**
 * Create a Multi-Asset Claim (1 to 5 assets) inside an atomic transaction
 */
function createClaim({ claim_number, vendor_name, vendor_rma_number, asset_tags, claim_type, notes, user }) {
  return new Promise((resolve, reject) => {
    // 1. Validation of asset counts
    if (!asset_tags || !Array.isArray(asset_tags)) {
      return reject({ status: 400, message: 'รูปแบบรายการครุภัณฑ์ไม่ถูกต้อง' });
    }

    if (asset_tags.length === 0) {
      return reject({ status: 400, message: 'กรุณาเลือกครุภัณฑ์อย่างน้อย 1 รายการ' });
    }

    if (asset_tags.length > MAX_ASSETS_PER_CLAIM) {
      return reject({ 
        status: 400, 
        message: `ไม่อนุญาตให้ส่งเคลมเกิน ${MAX_ASSETS_PER_CLAIM} รายการต่อ 1 ใบเคลม (ได้รับ: ${asset_tags.length} รายการ)` 
      });
    }

    // Check for duplicate asset tags
    const uniqueTags = new Set(asset_tags.map(t => String(t).trim().toUpperCase()));
    if (uniqueTags.size !== asset_tags.length) {
      return reject({ status: 400, message: 'มีรหัสครุภัณฑ์ซ้ำกันในใบเคลมเดียวกัน' });
    }

    const cleanTags = Array.from(uniqueTags);
    const claimNum = claim_number || `CLM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const createdBy = user ? user.username : 'system';

    // 2. Fetch all requested assets from database
    const placeholders = cleanTags.map(() => '?').join(',');
    db.all(`SELECT * FROM mains WHERE asset_tag IN (${placeholders}) AND is_deleted = 0`, cleanTags, (err, rows) => {
      if (err) return reject({ status: 500, message: 'Database error fetching assets: ' + err.message });

      if (rows.length !== cleanTags.length) {
        const foundTags = new Set(rows.map(r => r.asset_tag));
        const missing = cleanTags.filter(t => !foundTags.has(t));
        return reject({ status: 404, message: `ไม่พบครุภัณฑ์รหัส: ${missing.join(', ')}` });
      }

      // Check PDPA Sanitization requirement
      for (const asset of rows) {
        if (asset.sanitization_required === 1 && asset.status !== 'Sanitized') {
          return reject({
            status: 400,
            code: 'PDPA_SANITIZATION_REQUIRED',
            message: `PDPA Compliance Violation: ครุภัณฑ์รหัส [${asset.asset_tag}] (${asset.device_name || asset.category}) มีข้อมูลอ่อนไหว ต้องผ่านการล้างข้อมูล (Sanitization) ก่อนส่งเคลม`
          });
        }
      }

      // 3. Calculate Server-Side Viability
      const viability = calculateServerViability(rows);
      const claimDate = new Date().toISOString().split('T')[0];

      // 4. Begin Atomic SQLite Transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (beginErr) => {
          if (beginErr) return reject({ status: 500, message: 'Failed to start transaction' });

          // Insert into claims table
          const insertClaimSql = `
            INSERT INTO claims (
              claim_number, vendor_name, vendor_rma_number, claim_type,
              viability_score, viability_status, status, claim_date,
              created_by, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          db.run(insertClaimSql, [
            claimNum,
            vendor_name || 'Generic Vendor',
            vendor_rma_number || '',
            claim_type || 'WARRANTY',
            viability.score,
            viability.viabilityStatus,
            'DRAFT',
            claimDate,
            createdBy,
            notes || ''
          ], function(insertClaimErr) {
            if (insertClaimErr) {
              db.run('ROLLBACK');
              return reject({ status: 500, message: 'Failed to create claim record: ' + insertClaimErr.message });
            }

            const claimId = this.lastID;

            // Insert each asset into claim_assets junction table
            const insertAssetStmt = db.prepare(`
              INSERT INTO claim_assets (claim_id, asset_tag, item_status)
              VALUES (?, ?, 'Pending Pickup')
            `);

            for (const asset of rows) {
              insertAssetStmt.run([claimId, asset.asset_tag]);
            }

            insertAssetStmt.finalize((stmtErr) => {
              if (stmtErr) {
                db.run('ROLLBACK');
                return reject({ status: 500, message: 'Failed to insert claim assets: ' + stmtErr.message });
              }

              // Update asset statuses to Pending Pickup
              const updateMainsSql = `UPDATE mains SET status = 'Pending Pickup' WHERE asset_tag IN (${placeholders})`;
              db.run(updateMainsSql, cleanTags, (updateMainsErr) => {
                if (updateMainsErr) {
                  db.run('ROLLBACK');
                  return reject({ status: 500, message: 'Failed to update asset statuses' });
                }

                // Insert Audit Logs with guaranteed unique codes
                for (const asset of rows) {
                  recordAuditLog(db, {
                    asset_tag: asset.asset_tag,
                    department_name: vendor_name || 'Vendor',
                    floor: 'Claim Dept',
                    status: 'Pending Pickup',
                    moved_direction: 'OUT',
                    action_by_username: createdBy,
                    details: `สร้างใบส่งเคลม: ${claimNum} (Viability Score: ${viability.score})`
                  });
                }

                db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    db.run('ROLLBACK');
                    return reject({ status: 500, message: 'Failed to commit claim transaction' });
                  }

                  resolve({
                    id: claimId,
                    claim_number: claimNum,
                    vendor_name,
                    asset_count: rows.length,
                    assets: rows.map(r => ({ asset_tag: r.asset_tag, device_name: r.device_name })),
                    viability_score: viability.score,
                    viability_status: viability.viabilityStatus,
                    explanation: viability.explanation,
                    status: 'DRAFT',
                    claim_date: claimDate
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

/**
 * Perform a strict state transition on a claim and synchronize attached asset states
 */
function transitionClaimStatus({ claim_id, new_status, user, notes, resolution_type, replacement_serial_no, repair_cost }) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM claims WHERE id = ? AND is_deleted = 0", [claim_id], (err, claim) => {
      if (err || !claim) {
        return reject({ status: 404, message: 'ไม่พบใบเคลมที่ระบุ' });
      }

      const currentStatus = claim.status;
      const allowedNext = VALID_STATE_TRANSITIONS[currentStatus] || [];

      if (!allowedNext.includes(new_status)) {
        return reject({
          status: 400,
          message: `ไม่อนุญาตให้เปลี่ยนสถานะจาก [${currentStatus}] ไปยัง [${new_status}] (สถานะที่อนุญาต: ${allowedNext.join(', ') || 'ไม่มี'})`
        });
      }

      const confirmedBy = new_status === 'CONFIRMED' ? (user ? user.username : 'staff') : claim.confirmed_by;
      const resolvedDate = (new_status === 'RETURNED' || new_status === 'CLOSED') ? new Date().toISOString().split('T')[0] : claim.resolved_date;
      const resType = resolution_type || claim.resolution_type;
      const repCost = (repair_cost !== undefined && repair_cost !== null) ? parseFloat(repair_cost) : claim.repair_cost;
      const repSerial = replacement_serial_no || claim.replacement_serial_no;

      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (beginErr) => {
          if (beginErr) return reject({ status: 500, message: beginErr.message });

          const updateClaimSql = `
            UPDATE claims 
            SET status = ?, confirmed_by = ?, notes = COALESCE(?, notes),
                resolved_date = ?, resolution_type = ?, replacement_serial_no = ?, repair_cost = ?,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `;

          db.run(updateClaimSql, [
            new_status, confirmedBy, notes, resolvedDate, resType, repSerial, repCost, claim_id
          ], function(updateErr) {
            if (updateErr) {
              db.run('ROLLBACK');
              return reject({ status: 500, message: updateErr.message });
            }

            // Fetch attached assets
            db.all("SELECT asset_tag FROM claim_assets WHERE claim_id = ?", [claim_id], (fetchErr, assets) => {
              if (fetchErr) {
                db.run('ROLLBACK');
                return reject({ status: 500, message: fetchErr.message });
              }

              const assetTags = (assets || []).map(a => a.asset_tag);

              let itemStatus = 'Pending Pickup';
              let mainAssetStatus = null;

              if (new_status === 'SUBMITTED') {
                itemStatus = 'At Vendor';
              } else if (new_status === 'VENDOR_RESPONSE') {
                itemStatus = 'Under Repair';
              } else if (new_status === 'RETURNED' || new_status === 'CLOSED') {
                itemStatus = 'Returned';
                mainAssetStatus = (resType === 'Scrapped') ? 'Scrapped' : 'Working';
              } else if (new_status === 'REJECTED') {
                itemStatus = 'Rejected';
                mainAssetStatus = 'Broken';
              } else if (new_status === 'CANCELLED') {
                itemStatus = 'Cancelled';
                mainAssetStatus = 'Working';
              }

              // Update claim_assets table
              db.run("UPDATE claim_assets SET item_status = ? WHERE claim_id = ?", [itemStatus, claim_id], (caErr) => {
                if (caErr) {
                  db.run('ROLLBACK');
                  return reject({ status: 500, message: caErr.message });
                }

                // If mains status should change, synchronize mains table
                if (mainAssetStatus && assetTags.length > 0) {
                  const placeholders = assetTags.map(() => '?').join(',');
                  db.run(
                    `UPDATE mains SET status = ? WHERE asset_tag IN (${placeholders})`,
                    [mainAssetStatus, ...assetTags],
                    (mainsErr) => {
                      if (mainsErr) {
                        db.run('ROLLBACK');
                        return reject({ status: 500, message: mainsErr.message });
                      }

                      finishTransition();
                    }
                  );
                } else {
                  finishTransition();
                }

                function finishTransition() {
                  // Record audit log with guaranteed unique tracking code
                  recordAuditLog(db, {
                    asset_tag: claim.claim_number,
                    department_name: 'Claim Dept',
                    floor: 'IT Admin',
                    status: new_status,
                    moved_direction: 'STATE_CHANGE',
                    action_by_username: user ? user.username : 'system',
                    details: `เปลี่ยนสถานะใบเคลม: จาก ${currentStatus} เป็น ${new_status} (ครุภัณฑ์: ${assetTags.length} รายการ -> ${mainAssetStatus || itemStatus})`
                  });

                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                      db.run('ROLLBACK');
                      return reject({ status: 500, message: commitErr.message });
                    }

                    resolve({
                      id: claim_id,
                      claim_number: claim.claim_number,
                      previous_status: currentStatus,
                      status: new_status,
                      confirmed_by: confirmedBy,
                      item_status: itemStatus,
                      asset_status: mainAssetStatus,
                      asset_count: assetTags.length
                    });
                  });
                }
              });
            });
          });
        });
      });
    });
  });
}

module.exports = {
  MAX_ASSETS_PER_CLAIM,
  VALID_STATE_TRANSITIONS,
  calculateServerViability,
  createClaim,
  transitionClaimStatus,
  evaluateComprehensiveAsset
};
