const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { db, recordAuditLog } = require('../db');
const { evaluateClaimWorthiness } = require('../claim_calculator');
const { verifyToken, staffOnly, adminOnly } = require('../middleware/auth');
const { sendNotificationEmail } = require('../services/emailService');

// Live Anti-Error Duplicate Tag / Serial Checker (Staff/Admin)
router.get('/check-tag/:tag', verifyToken, staffOnly, (req, res) => {
  const query = req.params.tag.trim();
  db.get(
    "SELECT id, asset_tag, serial_no, device_name, location, status FROM mains WHERE (UPPER(asset_tag) = UPPER(?) OR UPPER(serial_no) = UPPER(?)) AND is_deleted = 0",
    [query, query],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) {
        return res.json({ exists: true, asset: row });
      }
      res.json({ exists: false });
    }
  );
});

// Get All Assets with optional pagination & filtering (Staff/Admin)
router.get('/', verifyToken, staffOnly, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const statusFilter = req.query.status;
  const categoryFilter = req.query.category;
  
  let whereClause = "WHERE is_deleted = 0";
  let params = [];

  if (statusFilter === 'expiring_6m' || statusFilter === 'near_expiry') {
    whereClause += " AND warranty_end >= date('now', 'localtime') AND warranty_end <= date('now', '+180 days', 'localtime')";
  } else if (statusFilter === 'expired') {
    whereClause += " AND warranty_end < date('now', 'localtime')";
  } else if (statusFilter) {
    whereClause += " AND status = ?";
    params.push(statusFilter);
  }
  if (categoryFilter) {
    whereClause += " AND category = ?";
    params.push(categoryFilter);
  }

  const query = `SELECT * FROM mains ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
  const countQuery = `SELECT COUNT(*) as total FROM mains ${whereClause}`;

  db.all(query, [...params, limit, offset], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get(countQuery, params, (cntErr, cntRow) => {
      if (cntErr) return res.status(500).json({ error: cntErr.message });
      res.json({ total: cntRow.total, page, limit, assets: rows });
    });
  });
});

// GET /api/assets/summary (Staff/Admin) - Accurate database-wide inventory metrics
router.get('/summary', verifyToken, staffOnly, (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Working' THEN 1 ELSE 0 END) as working,
      SUM(CASE WHEN status = 'Broken' THEN 1 ELSE 0 END) as broken,
      SUM(CASE WHEN status = 'Pending Pickup' THEN 1 ELSE 0 END) as pending_pickup,
      SUM(CASE WHEN warranty_end >= date('now', 'localtime') AND warranty_end <= date('now', '+180 days', 'localtime') THEN 1 ELSE 0 END) as expiring_6m,
      SUM(CASE WHEN status = 'Scrapped' OR salvage_status = 'Scrapped' THEN 1 ELSE 0 END) as scrapped,
      SUM(CASE WHEN salvage_status IN ('Pending Sell', 'Sold') THEN 1 ELSE 0 END) as salvage_sell,
      SUM(CASE WHEN salvage_status IN ('Pending Donation', 'Donated') THEN 1 ELSE 0 END) as salvage_donation
    FROM mains
    WHERE is_deleted = 0
  `;
  db.get(sql, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      total: (row && row.total) || 0,
      working: (row && row.working) || 0,
      broken: (row && row.broken) || 0,
      pending_pickup: (row && row.pending_pickup) || 0,
      expiring_6m: (row && row.expiring_6m) || 0,
      scrapped: (row && row.scrapped) || 0,
      salvage_sell: (row && row.salvage_sell) || 0,
      salvage_donation: (row && row.salvage_donation) || 0
    });
  });
});

// Create New Asset (Admin-only)
router.post('/', verifyToken, adminOnly, (req, res) => {
  const { asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, purchase_price, warranty_months, expected_lifespan_months, po_number, invoice_no, action_by_username, recipient_email } = req.body;
  
  if (!asset_tag || !category || !brand || !model || !serial_no || !device_name || !location || !warranty_start || !warranty_end) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลครุภัณฑ์ให้ครบถ้วน' });
  }

  const sReq = sanitization_required ? 1 : 0;
  const price = parseFloat(purchase_price) || 0;
  const wMonths = parseInt(warranty_months, 10) || 36;
  const lMonths = parseInt(expected_lifespan_months, 10) || 60;
  const actionUser = action_by_username || (req.user ? req.user.username : 'admin');

  db.run(`INSERT INTO mains (asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status, purchase_price, warranty_months, expected_lifespan_months, po_number, invoice_no, salvage_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Working', ?, ?, ?, ?, ?, 'None')`,
    [asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sReq, price, wMonths, lMonths, po_number || '', invoice_no || ''],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'รหัสครุภัณฑ์หรือ Serial Number นี้มีอยู่ในระบบแล้ว' });
        }
        return res.status(500).json({ error: err.message });
      }

      const logCode = recordAuditLog(db, {
        asset_tag,
        department_name: location,
        floor: 'Floor 1',
        status: 'Working',
        moved_direction: 'IN',
        action_by_username: actionUser,
        details: `ลงทะเบียนครุภัณฑ์ใหม่: ${device_name} (${brand} ${model})`
      });

      // Dispatch automated email notification upon asset addition
      sendNotificationEmail({
        templateName: 'ASSET_ADDED',
        recipient: recipient_email || process.env.NOTIFY_EMAIL || 'admin@claimit.local',
        data: {
          asset_tag,
          device_name,
          category,
          brand,
          model,
          serial_no,
          location,
          warranty_start,
          warranty_end,
          log_code: logCode,
          created_by: actionUser
        }
      }).catch(emailErr => console.error('[ASSET EMAIL DISPATCH ERROR]', emailErr));

      res.json({ id: this.lastID, asset_tag, log_code: logCode, message: 'ลงทะเบียนครุภัณฑ์ใหม่สำเร็จและบันทึกประวัติความปลอดภัยเรียบร้อย' });
    }
  );
});

// Update Asset Details (Admin-only)
router.put('/:tag', verifyToken, adminOnly, (req, res) => {
  const { category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status, purchase_price, warranty_months, expected_lifespan_months, salvage_status } = req.body;
  const tag = req.params.tag;
  const actionUser = req.user ? req.user.username : 'admin';

  db.run(`UPDATE mains SET category=?, brand=?, model=?, serial_no=?, device_name=?, location=?, warranty_start=?, warranty_end=?, sanitization_required=?, status=?, purchase_price=?, warranty_months=?, expected_lifespan_months=?, salvage_status=?
          WHERE asset_tag=? AND is_deleted=0`,
    [category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required ? 1 : 0, status, parseFloat(purchase_price)||0, parseInt(warranty_months)||36, parseInt(expected_lifespan_months)||60, salvage_status || 'None', tag],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const logCode = recordAuditLog(db, {
        asset_tag: tag,
        department_name: location || 'IT Dept',
        floor: 'Floor 1',
        status: status || 'Working',
        moved_direction: 'IN',
        action_by_username: actionUser,
        details: `อัปเดตข้อมูลครุภัณฑ์: ${device_name || tag}`
      });

      res.json({ message: 'อัปเดตข้อมูลครุภัณฑ์สำเร็จ', log_code: logCode });
    }
  );
});

// Soft Delete Asset (Admin-only)
router.delete('/:tag', verifyToken, adminOnly, (req, res) => {
  const tag = req.params.tag;
  const actionUser = req.user ? req.user.username : 'admin';
  db.run("UPDATE mains SET is_deleted = 1 WHERE asset_tag = ?", [tag], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    const logCode = recordAuditLog(db, {
      asset_tag: tag,
      department_name: 'IT Admin',
      floor: 'Floor 1',
      status: 'Deleted',
      moved_direction: 'OUT',
      action_by_username: actionUser,
      details: 'ลบรายการครุภัณฑ์ (Soft Delete)'
    });

    res.json({ message: 'ลบรายการครุภัณฑ์สำเร็จ', log_code: logCode });
  });
});

// Evaluate Claim Worthiness Endpoint (Staff/Admin)
router.get('/:tag/evaluate', verifyToken, staffOnly, (req, res) => {
  db.get("SELECT * FROM mains WHERE asset_tag = ? AND is_deleted = 0", [req.params.tag], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Asset not found' });
    
    const evaluationPayload = {
      assetId: row.asset_tag,
      purchaseDate: row.warranty_start,
      purchasePrice: row.purchase_price || (row.category === 'Computer' ? 18000 : (row.category === 'Tablet' ? 22000 : 4500)),
      warrantyMonths: row.warranty_months || 36,
      expectedLifespanMonths: row.expected_lifespan_months || 60,
      status: row.status
    };
    
    const result = evaluateClaimWorthiness(evaluationPayload);
    result.salvage_status = row.salvage_status || 'None';
    res.json(result);
  });
});

// Lookup Asset by Tag/Serial with Fuzzy Matching Fallback (Staff/Admin)
router.get('/:tag', verifyToken, staffOnly, (req, res) => {
  const tag = req.params.tag.toUpperCase();
  db.get("SELECT m.*, r.vendor_name, r.vendor_rma_number, r.claim_date, r.expected_return_date, r.data_wiped_confirmed as rma_data_wiped_confirmed, r.data_wiped_by, r.data_wiped_at, r.sanitization_note, r.resolved_date, r.resolution_type, r.replacement_serial_no, r.repair_cost, r.status as rma_status FROM mains m LEFT JOIN rma_claims r ON m.asset_tag = r.asset_tag AND r.is_deleted = 0 WHERE (m.asset_tag = ? OR m.serial_no = ?) AND m.is_deleted = 0", [tag, tag], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      res.json(row);
    } else {
      db.all("SELECT m.*, r.vendor_name, r.vendor_rma_number, r.claim_date, r.expected_return_date, r.data_wiped_confirmed as rma_data_wiped_confirmed, r.data_wiped_by, r.data_wiped_at, r.sanitization_note, r.resolved_date, r.resolution_type, r.replacement_serial_no, r.repair_cost, r.status as rma_status FROM mains m LEFT JOIN rma_claims r ON m.asset_tag = r.asset_tag AND r.is_deleted = 0 WHERE m.is_deleted = 0", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let bestMatch = null;
        let minDistance = Infinity;
        
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

        if (tag.length < 2) {
          return res.status(404).json({ error: 'ไม่พบทรัพย์สินดังกล่าว' });
        }

        for (const r of rows) {
          const tagDist = levenshtein(tag, r.asset_tag.toUpperCase());
          const serialDist = levenshtein(tag, r.serial_no.toUpperCase());
          const dist = Math.min(tagDist, serialDist);
          
          const candidate = dist === tagDist ? r.asset_tag : r.serial_no;
          const maxAllowed = Math.max(1, Math.min(4, Math.floor(candidate.length * 0.25)));
          
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

// Update Asset Status (Staff/Admin)
router.post('/update-status', verifyToken, staffOnly, (req, res) => {
  const { asset_tag, status, location, action_by_username, department_name, floor } = req.body;
  if (!asset_tag || !status) return res.status(400).json({ error: 'Missing fields' });
  const actionUser = action_by_username || (req.user ? req.user.username : 'staff');

  db.serialize(() => {
    db.get("SELECT * FROM mains WHERE asset_tag = ? AND is_deleted = 0", [asset_tag], (err, asset) => {
      if (err || !asset) return res.status(404).json({ error: 'Asset not found' });

      const newLocation = location || asset.location;
      db.run("UPDATE mains SET status = ?, location = ? WHERE asset_tag = ?", [status, newLocation, asset_tag], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update asset status' });

        const movedDirection = status === 'Working' || status === 'Finished' ? 'IN' : 'OUT';
        const logDept = department_name || newLocation;
        const logFloor = floor || 'Unknown';

        const logCode = recordAuditLog(db, {
          asset_tag,
          department_name: logDept,
          floor: logFloor,
          status,
          moved_direction: movedDirection,
          action_by_username: actionUser,
          details: `เปลี่ยนสถานะเป็น: ${status} (จุดติดตั้ง: ${newLocation})`
        });

        res.json({ message: 'Asset status updated', status, location: newLocation, log_code: logCode });
      });
    });
  });
});

// Confirm Data Sanitization (PDPA Safeguard) (Staff/Admin)
router.post('/sanitize', verifyToken, staffOnly, (req, res) => {
  const { asset_tag, action_by_username, sanitization_note, wipe_code } = req.body;
  if (!asset_tag) return res.status(400).json({ error: 'Missing asset_tag' });

  // Strict Wipe Authorization Code Check
  const validCodes = ['WIPED', 'CONFIRM-WIPE', 'WIPE-CONFIRM', '9999', asset_tag.toUpperCase()];
  const cleanCode = (wipe_code || '').trim().toUpperCase();
  if (!validCodes.includes(cleanCode)) {
    return res.status(400).json({ 
      error: 'รหัสยืนยันความปลอดภัยไม่ถูกต้อง! กรุณาระบุรหัสยืนยัน (พิมพ์ "WIPED" หรือรหัสครุภัณฑ์) เพื่อความปลอดภัยสูงสุด' 
    });
  }

  const actionUser = action_by_username || (req.user ? req.user.username : 'staff');
  const now = new Date().toISOString();
  const note = sanitization_note || 'Confirmed storage media wiped / drive removed with authorization code: ' + cleanCode;

  db.serialize(() => {
    db.run(`INSERT INTO rma_claims (asset_tag, vendor_name, vendor_rma_number, claim_date, expected_return_date, data_wiped_confirmed, data_wiped_by, data_wiped_at, sanitization_note, status) 
            VALUES (?, '', '', '', '', 1, ?, ?, ?, 'Sanitized')
            ON CONFLICT(asset_tag) DO UPDATE SET 
              data_wiped_confirmed = 1, data_wiped_by = excluded.data_wiped_by, data_wiped_at = excluded.data_wiped_at, sanitization_note = excluded.sanitization_note, status = 'Sanitized'`,
      [asset_tag, actionUser, now, note], 
      function(err) {
        if (err) return res.status(500).json({ error: 'Failed to confirm sanitization' });
        
        db.run(`UPDATE mains SET status = 'Sanitized' WHERE asset_tag = ?`, [asset_tag]);
        
        const logCode = recordAuditLog(db, {
          asset_tag,
          department_name: 'Technical Support',
          floor: 'Fl 4',
          status: 'Sanitized',
          moved_direction: 'IN',
          action_by_username: actionUser,
          details: `PDPA Sanitization: ${note}`
        });

        res.json({ message: 'การลบข้อมูล (PDPA Sanitization) เสร็จสิ้นและบันทึกประวัติสำเร็จ', data_wiped_by: actionUser, data_wiped_at: now, log_code: logCode });
      }
    );
  });
});

// Initiate RMA / Warranty Claim (Staff/Admin with STRICT PDPA GATE)
router.post('/claim', verifyToken, staffOnly, (req, res) => {
  const { asset_tag, vendor_name, vendor_rma_number, expected_return_date, data_wiped_confirmed, sanitization_note, action_by_username } = req.body;
  if (!asset_tag || !vendor_name || !vendor_rma_number) return res.status(400).json({ error: 'กรุณากรอกข้อมูลการเคลมให้ครบถ้วน' });

  const actionUser = action_by_username || (req.user ? req.user.username : 'staff');
  const claimDate = new Date().toISOString().split('T')[0];

  db.serialize(() => {
    // 1. Verify if asset requires sanitization and enforce PDPA Gate
    db.get("SELECT * FROM mains WHERE asset_tag = ? AND is_deleted = 0", [asset_tag], (err, asset) => {
      if (err || !asset) return res.status(404).json({ error: 'Asset not found' });

      db.get("SELECT * FROM rma_claims WHERE asset_tag = ? AND is_deleted = 0", [asset_tag], (rmaErr, existingRma) => {
        const isWiped = data_wiped_confirmed || (existingRma && existingRma.data_wiped_confirmed === 1);

        if (asset.sanitization_required === 1 && !isWiped) {
          return res.status(400).json({ 
            error: 'PDPA Security Gate Block: อุปกรณ์นี้เป็นอุปกรณ์บันทึกข้อมูลหลัก ต้องทำการล้างข้อมูล (Confirm Data Wiped) ก่อนจึงจะส่งศูนย์บริการได้' 
          });
        }

        const now = new Date().toISOString();
        const note = sanitization_note || (existingRma ? existingRma.sanitization_note : 'Data wiped confirmed prior to RMA dispatch');

        db.run(`INSERT INTO rma_claims (asset_tag, vendor_name, vendor_rma_number, claim_date, expected_return_date, data_wiped_confirmed, data_wiped_by, data_wiped_at, sanitization_note, status)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, 'Out to Vendor')
                ON CONFLICT(asset_tag) DO UPDATE SET 
                  vendor_name = excluded.vendor_name, vendor_rma_number = excluded.vendor_rma_number, claim_date = excluded.claim_date, expected_return_date = excluded.expected_return_date, data_wiped_confirmed = 1, data_wiped_by = excluded.data_wiped_by, data_wiped_at = excluded.data_wiped_at, sanitization_note = excluded.sanitization_note, status = 'Out to Vendor'`, 
          [asset_tag, vendor_name, vendor_rma_number, claimDate, expected_return_date, actionUser, now, note], 
          function(claimErr) {
            if (claimErr) return res.status(500).json({ error: claimErr.message });

            db.run("UPDATE mains SET status = 'Pending Pickup' WHERE asset_tag = ?", [asset_tag], function(updateErr) {
              if (updateErr) return res.status(500).json({ error: 'Failed to update asset status' });

              const logCode = recordAuditLog(db, {
                asset_tag,
                department_name: vendor_name,
                floor: 'External',
                status: 'Pending Pickup',
                moved_direction: 'OUT',
                action_by_username: actionUser,
                details: `ส่งเคลมศูนย์บริการ: ${vendor_name} (RMA No: ${vendor_rma_number})`
              });

              res.json({ message: 'บันทึกส่งเคลมศูนย์บริการสำเร็จ', asset_tag, status: 'Pending Pickup', data_wiped_by: actionUser, data_wiped_at: now, sanitization_note: note, log_code: logCode });
            });
          }
        );
      });
    });
  });
});

// Resolve RMA Claim (Return to Stock / Scrapped) (Staff/Admin)
router.post('/resolve-claim', verifyToken, staffOnly, (req, res) => {
  const { asset_tag, resolution_type, replacement_serial_no, repair_cost, action_by_username } = req.body;
  if (!asset_tag || !resolution_type) return res.status(400).json({ error: 'Missing asset_tag or resolution_type' });

  const actionUser = action_by_username || (req.user ? req.user.username : 'staff');
  const resolvedDate = new Date().toISOString().split('T')[0];
  const newStatus = resolution_type === 'Scrapped' ? 'Scrapped' : 'Working';

  db.serialize(() => {
    db.get("SELECT * FROM mains WHERE asset_tag = ? AND is_deleted = 0", [asset_tag], (err, asset) => {
      if (err || !asset) return res.status(404).json({ error: 'Asset not found' });

      const newSerial = replacement_serial_no ? replacement_serial_no.trim() : asset.serial_no;

      db.run("UPDATE mains SET status = ?, serial_no = ? WHERE asset_tag = ?", [newStatus, newSerial, asset_tag], function(updateErr) {
        if (updateErr) return res.status(500).json({ error: 'Failed to update asset' });

        db.run(`UPDATE rma_claims SET status = 'Returned', resolved_date = ?, resolution_type = ?, replacement_serial_no = ?, repair_cost = ? WHERE asset_tag = ? AND is_deleted = 0`,
          [resolvedDate, resolution_type, newSerial, parseFloat(repair_cost)||0, asset_tag], function(rmaErr) {
            
            const logCode = recordAuditLog(db, {
              asset_tag,
              department_name: asset.location,
              floor: 'Fl 1',
              status: newStatus,
              moved_direction: 'IN',
              action_by_username: actionUser,
              details: `รับเครื่องคืนจากศูนย์: ${resolution_type} (ค่าซ่อม: ฿${parseFloat(repair_cost)||0})`
            });

            res.json({ message: `รับอุปกรณ์คืนเรียบร้อยแล้ว สถานะ: [${newStatus}]`, asset_tag, status: newStatus, resolvedDate, log_code: logCode });
        });
      });
    });
  });
});

// EOL Salvage Management (Pending Sell / Pending Donation / Scrapped) (Staff/Admin)
router.post('/salvage', verifyToken, staffOnly, (req, res) => {
  const { asset_tag, salvage_status, action_by_username } = req.body;
  if (!asset_tag || !salvage_status) return res.status(400).json({ error: 'Missing asset_tag or salvage_status' });

  const actionUser = action_by_username || (req.user ? req.user.username : 'staff');
  let newAssetStatus = 'Broken';
  if (salvage_status === 'Pending Sell') newAssetStatus = 'Pending Sell';
  else if (salvage_status === 'Sold') newAssetStatus = 'Sold';
  else if (salvage_status === 'Pending Donation') newAssetStatus = 'Pending Donation';
  else if (salvage_status === 'Donated') newAssetStatus = 'Donated';
  else if (salvage_status === 'Scrapped') newAssetStatus = 'Scrapped';

  db.serialize(() => {
    db.run("UPDATE mains SET salvage_status = ?, status = ? WHERE asset_tag = ? AND is_deleted = 0", [salvage_status, newAssetStatus, asset_tag], function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const logCode = recordAuditLog(db, {
        asset_tag,
        department_name: 'Salvage Dept',
        floor: 'Warehouse',
        status: newAssetStatus,
        moved_direction: 'OUT',
        action_by_username: actionUser,
        details: `จัดการแทงจำหน่าย/บริจาค: ${salvage_status}`
      });

      res.json({ message: `อัปเดตสถานะการขาย/บริจาคเป็น [${salvage_status}] สำเร็จ`, asset_tag, salvage_status, status: newAssetStatus, log_code: logCode });
    });
  });
});

// PDF Generation for Official Hospital Forms (Inspection Form or Gate Pass PT3-FM-SEC-1012)
router.get('/:tag/pdf', verifyToken, staffOnly, (req, res) => {
  const tag = req.params.tag.toUpperCase();
  const formType = (req.query.form || 'inspection').toLowerCase();
  const fs = require('fs');
  const path = require('path');

  db.get("SELECT m.*, r.vendor_name, r.vendor_rma_number, r.claim_date, r.expected_return_date, r.data_wiped_confirmed, r.data_wiped_by, r.data_wiped_at, r.sanitization_note, r.resolution_type, r.repair_cost FROM mains m LEFT JOIN rma_claims r ON m.asset_tag = r.asset_tag AND r.is_deleted = 0 WHERE m.asset_tag = ? AND m.is_deleted = 0", [tag], (err, asset) => {
    if (err || !asset) return res.status(404).json({ error: 'Asset not found' });
    
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const filePrefix = formType === 'gatepass' ? 'PT3-FM-SEC-1012' : 'Inspection';
    const filename = `${filePrefix}_${tag}.pdf`;
    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', 'application/pdf');

    // Register Thai font if available (cross-platform bundled or OS)
    const { resolveFontPath } = require('../utils/fontResolver');
    const thaiFontPath = resolveFontPath();
    const isThai = !!thaiFontPath;
    if (isThai) {
      doc.registerFont('ThaiRegular', thaiFontPath);
      const thaiBoldFontPath = thaiFontPath.replace('tahoma.ttf', 'tahomabd.ttf');
      if (fs.existsSync(thaiBoldFontPath)) {
        doc.registerFont('ThaiBold', thaiBoldFontPath);
      } else {
        doc.registerFont('ThaiBold', thaiFontPath);
      }
      doc.font('ThaiRegular');
    }

    doc.pipe(res);

    const titleFont = isThai ? 'ThaiBold' : 'Helvetica-Bold';
    const regularFont = isThai ? 'ThaiRegular' : 'Helvetica';
    const today = new Date();
    const shortDate = `${today.getDate().toString().padStart(2, '0')} / ${(today.getMonth() + 1).toString().padStart(2, '0')} / ${today.getFullYear() + 543}`;
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    if (formType === 'gatepass') {
      // =========================================================================
      // FORM 2: ใบนําอุปกรณ์ ทรัพย์สิน ออกนอกพื้นที่ (PT3-FM-SEC-1012)
      // =========================================================================
      doc.font(regularFont).fontSize(8).fillColor('#475569')
         .text('PT3-FM-SEC-1012; แก้ไขครั้งที่ 07; วันที่มีผลบังคับใช้ 01/12/2563; หน้า 1 / 1', { align: 'right' });
      doc.moveDown(0.2);

      // Hospital Header
      doc.font(titleFont).fontSize(14).fillColor('#047857')
         .text('PHYATHAI 3 HOSPITAL  โรงพยาบาลพญาไท 3', { align: 'center' });
      doc.font(regularFont).fontSize(8).fillColor('#64748b')
         .text('PETCHKASEM 19 • เพชรเกษม 19', { align: 'center' });
      doc.moveDown(0.3);

      doc.font(titleFont).fontSize(13).fillColor('#000')
         .text('ใบนําอุปกรณ์ ทรัพย์สิน ออกนอกพื้นที่ (PT3-FM-SEC-1012)', { align: 'center' });
      doc.moveDown(0.3);

      doc.font(regularFont).fontSize(9.5).fillColor('#000');
      doc.text(`วันที่: ${today.getDate()}   เดือน: ${thaiMonths[today.getMonth()]}   ปี: ${today.getFullYear() + 543}`, { align: 'right' });
      doc.moveDown(0.3);

      doc.text(`ชื่อ-สกุล: ${req.user?.name || 'เจ้าหน้าที่ไอที ประจำโรงพยาบาล'}          ตำแหน่ง: เจ้าหน้าที่เทคโนโลยีสารสนเทศ          แผนก/หน่วย: ${asset.location || 'เทคโนโลยีสารสนเทศ'}`);
      doc.moveDown(0.3);
      doc.text(`ขอนำรายการทรัพย์สินของ   [X] โรงพยาบาลออก      [  ] ส่วนตัว   ออกจากพื้นที่ของโรงพยาบาล`);
      doc.text(`ด้วยวิธีการ:  [  ] นำออกด้วยตนเอง      [X] อนุญาตให้ ชื่อ/บริษัท ${asset.vendor_name || 'Acer Service Center'} เป็นตัวแทนนำออก`);
      doc.moveDown(0.4);

      // 10 Rows Table
      doc.font(titleFont).fontSize(9).text('ดังรายการต่อไปนี้:');
      doc.moveDown(0.2);

      const tableTop = doc.y;
      const colX = [30, 65, 360, 430, 565];
      doc.rect(colX[0], tableTop, colX[4] - colX[0], 20).fill('#f1f5f9');
      doc.fillColor('#000').font(titleFont).fontSize(8.5);
      doc.text('ลำดับ', colX[0] + 5, tableTop + 5);
      doc.text('รายการ (Description)', colX[1] + 5, tableTop + 5);
      doc.text('จำนวน', colX[2] + 5, tableTop + 5);
      doc.text('หมายเหตุ (Note)', colX[3] + 5, tableTop + 5);

      let currentY = tableTop + 20;
      doc.font(regularFont).fontSize(8);

      for (let i = 1; i <= 10; i++) {
        doc.rect(colX[0], currentY, colX[4] - colX[0], 18).stroke('#cbd5e1');
        if (i === 1) {
          doc.fillColor('#000').text('1', colX[0] + 12, currentY + 4);
          doc.text(`${asset.device_name || asset.category} (${asset.brand} ${asset.model}) S/N: ${asset.serial_no}`, colX[1] + 5, currentY + 4);
          doc.text('1 เครื่อง', colX[2] + 10, currentY + 4);
          doc.text(`Tag: ${asset.asset_tag}`, colX[3] + 5, currentY + 4);
        } else {
          doc.fillColor('#94a3b8').text(i.toString(), colX[0] + 12, currentY + 4);
        }
        currentY += 18;
      }

      doc.y = currentY + 8;
      doc.fillColor('#000').font(regularFont).fontSize(8.5);
      doc.text(`เหตุผลในการนำออก:   [X] เพื่อซ่อม      [  ] จำหน่าย      [  ] ใช้งานภายนอกโรงพยาบาล      [  ] ยืมระหว่างโรงพยาบาล      [  ] อื่นๆ`);
      doc.text(`วันที่จะนำทรัพย์สินออก: ${shortDate} เวลา 14:00 น.      ทะเบียนรถ: 1กข-5542 กทม.      ยี่ห้อ: Toyota สีขาว / ขนส่งศูนย์บริการ`);
      doc.moveDown(0.6);

      // Signatures (5 boxes)
      const sigTop = doc.y;
      const sigW = (colX[4] - colX[0]) / 2;
      
      doc.rect(colX[0], sigTop, sigW, 80).stroke('#cbd5e1');
      doc.rect(colX[0] + sigW, sigTop, sigW, 80).stroke('#cbd5e1');

      doc.font(titleFont).fontSize(8).fillColor('#000');
      doc.text('1. เจ้าของทรัพย์สิน (กรณีทรัพย์สินส่วนตัว)', colX[0] + 5, sigTop + 6);
      doc.font(regularFont).fontSize(7.5);
      doc.text('ลงชื่อ ................................................................', colX[0] + 5, sigTop + 35);
      doc.text('วันที่ ........................... เวลา ...........................', colX[0] + 5, sigTop + 55);

      doc.font(titleFont).fontSize(8);
      doc.text('2. หน่วยงานเจ้าของทรัพย์สิน (กรณีทรัพย์สินของหน่วยงาน)', colX[0] + sigW + 5, sigTop + 6);
      doc.font(regularFont).fontSize(7.5);
      doc.text(`ลงชื่อ: ${req.user?.name || 'เจ้าหน้าที่ไอที ประจำโรงพยาบาล'} (ผู้จัดการแผนก/หัวหน้าหน่วย)`, colX[0] + sigW + 5, sigTop + 35);
      doc.text(`วันที่: ${shortDate}`, colX[0] + sigW + 5, sigTop + 55);

      const sigTop2 = sigTop + 85;
      const sigW3 = (colX[4] - colX[0]) / 3;
      doc.rect(colX[0], sigTop2, sigW3, 75).stroke('#cbd5e1');
      doc.rect(colX[0] + sigW3, sigTop2, sigW3, 75).stroke('#cbd5e1');
      doc.rect(colX[0] + (sigW3 * 2), sigTop2, sigW3, 75).stroke('#cbd5e1');

      doc.font(titleFont).fontSize(7.5);
      doc.text('3. ผู้อำนวยการฝ่าย/ผู้จัดการส่วน', colX[0] + 4, sigTop2 + 5);
      doc.font(regularFont).fontSize(7);
      doc.text('ลงชื่อ ..........................................', colX[0] + 4, sigTop2 + 35);

      doc.font(titleFont).fontSize(7.5);
      doc.text('4. รปภ.จุดทางออกตรวจสอบทรัพย์สิน', colX[0] + sigW3 + 4, sigTop2 + 5);
      doc.font(regularFont).fontSize(7);
      doc.text('ลงชื่อ ..........................................', colX[0] + sigW3 + 4, sigTop2 + 35);

      doc.font(titleFont).fontSize(7.5);
      doc.text('5. หน่วยรักษาความปลอดภัย', colX[0] + (sigW3 * 2) + 4, sigTop2 + 5);
      doc.font(regularFont).fontSize(7);
      doc.text('ลงชื่อ ..........................................', colX[0] + (sigW3 * 2) + 4, sigTop2 + 35);

    } else {
      // =========================================================================
      // FORM 1: ใบตรวจเช็คอุปกรณ์ เสีย (Hospital Defective Equipment Inspection Form)
      // =========================================================================
      doc.font(titleFont).fontSize(16).fillColor('#047857').text('พญาไท 3   PHYATHAI 3', 35, 35);
      doc.font(regularFont).fontSize(8.5).fillColor('#4b5563').text('เพชรเกษม 19', 35, 55);

      doc.rect(260, 30, 305, 38).stroke('#000');
      doc.font(titleFont).fontSize(14).fillColor('#000').text('ใบตรวจเช็คอุปกรณ์ เสีย', 270, 42);
      doc.font(regularFont).fontSize(10).text(`วันที่ ${shortDate}`, 445, 44);

      doc.y = 85;
      doc.font(regularFont).fontSize(10.5).fillColor('#000');
      doc.text(`ประเภทอุปกรณ์ : ${asset.category || asset.device_name || 'คอมพิวเตอร์'}`, 35, 90);
      doc.font(titleFont).fillColor('#dc2626').text(`ผู้เก็บอุปกรณ์ : `, 360, 90, { continued: true });
      doc.font(regularFont).fillColor('#000').text(`${req.user?.name || 'เจ้าหน้าที่ไอที ประจำโรงพยาบาล'}`);

      doc.text(`Tag / Serial : ${asset.asset_tag} / ${asset.serial_no}`, 35, 115);
      doc.text(`แผนก : ${asset.location || 'เทคโนโลยีสารสนเทศ'}                  ชั้น : ${(asset.location?.match(/Fl(oor)?\s*(\d+)/i)?.[2]) || '2'}`, 35, 140);

      doc.moveDown(1.5);
      doc.font(titleFont).fontSize(11).fillColor('#000').text('สถานะอุปกรณ์', { underline: true });
      doc.moveDown(0.4);
      doc.font(regularFont).fontSize(10).fillColor('#000');
      doc.text('   [  ] ใช้งานได้   หมายเหตุ ( ถ้ามี ) ............................................................................................');
      doc.moveDown(0.3);
      doc.text(`   [X] เสีย   อาการเสีย : เครื่องเปิดไม่ติด / อุปกรณ์ฮาร์ดแวร์ทำงานผิดปกติ`);

      doc.moveDown(1.2);
      doc.font(titleFont).fontSize(11).text('สถานะดำเนินการต่อ', { underline: true });
      doc.moveDown(0.4);
      doc.font(regularFont).fontSize(10);
      doc.text('   [X] ส่งเครม      [  ] ส่งซ่อม*มีค่าใช่จ่าย      [  ] สั่งซื้อทดแทน      [  ] ตัดขาย      [  ] เก็บเข้า Stock');

      doc.moveDown(2);
      // 3 Columns Box at bottom
      const boxTop = doc.y;
      const colWidth = 175;
      
      // Col 1: ผู้ตรวจสอบอุปกรณ์
      doc.rect(35, boxTop, colWidth, 180).stroke('#000');
      doc.font(titleFont).fontSize(10.5).text('ผู้ตรวจสอบอุปกรณ์', 45, boxTop + 12, { width: colWidth - 20, align: 'center', underline: true });
      doc.font(regularFont).fontSize(9.5);
      doc.text(`ลงชื่อ: ${req.user?.name || 'เจ้าหน้าที่ไอที'}`, 45, boxTop + 60);
      doc.text(`วันที่: ${shortDate}`, 45, boxTop + 85);
      doc.text('หมายเหตุ: ตรวจสอบเงื่อนไขแล้ว', 45, boxTop + 110);

      // Col 2: ผู้ดำเนินการต่อ
      doc.rect(35 + colWidth, boxTop, colWidth, 180).stroke('#000');
      doc.font(titleFont).fontSize(10.5).text('ผู้ดำเนินการต่อ', 35 + colWidth + 10, boxTop + 12, { width: colWidth - 20, align: 'center', underline: true });
      doc.font(regularFont).fontSize(9.5);
      doc.text(`ลงชื่อ: ${req.user?.name || 'เจ้าหน้าที่ไอที'}`, 35 + colWidth + 10, boxTop + 60);
      doc.text(`วันที่: ${shortDate}`, 35 + colWidth + 10, boxTop + 85);
      doc.text('หมายเหตุ: ส่งเคลมศูนย์บริการ', 35 + colWidth + 10, boxTop + 110);

      // Col 3: เฉพาะกรณีส่งเครม , ส่งซ่อม (Red highlighted text)
      doc.rect(35 + (colWidth * 2), boxTop, colWidth, 180).stroke('#000');
      doc.font(titleFont).fontSize(10).fillColor('#dc2626').text('เฉพาะกรณีส่งเครม , ส่งซ่อม', 35 + (colWidth * 2) + 10, boxTop + 12, { width: colWidth - 20, align: 'center', underline: true });
      doc.font(regularFont).fontSize(9).fillColor('#dc2626');
      doc.text(`วันที่ส่งเครม/ซ่อม: วันที่ ${shortDate}`, 35 + (colWidth * 2) + 10, boxTop + 45);
      doc.text(`ชื่อ บริษัท: ${asset.vendor_name || 'Acer Service Center'}`, 35 + (colWidth * 2) + 10, boxTop + 70);
      doc.fillColor('#000');
      doc.text(`ลงชื่อ: ${req.user?.name || 'นายพิพัฒน์ วงศ์สวัสดิ์'}`, 35 + (colWidth * 2) + 10, boxTop + 110);
      doc.font(regularFont).fontSize(8).fillColor('#4b5563').text('(ชื่อผู้ส่งอุปกรณ์)', 35 + (colWidth * 2) + 10, boxTop + 130, { align: 'center', width: colWidth - 20 });
    }

    doc.end();
  });
});

module.exports = router;
