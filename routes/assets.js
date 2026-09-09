const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { db, recordAuditLog } = require('../db');
const { evaluateClaimWorthiness } = require('../claim_calculator');
const { verifyToken, staffOnly, adminOnly } = require('../middleware/auth');
const { sendNotificationEmail } = require('../services/emailService');
const { handleDbError } = require('../utils/safeError');

// Live Anti-Error Duplicate Tag / Serial Checker (Staff/Admin)
router.get('/check-tag/:tag', verifyToken, staffOnly, (req, res) => {
  const query = req.params.tag.trim();
  db.get(
    "SELECT id, asset_tag, serial_no, device_name, location, status FROM mains WHERE (UPPER(asset_tag) = UPPER(?) OR UPPER(serial_no) = UPPER(?)) AND is_deleted = 0",
    [query, query],
    (err, row) => {
      if (err) return handleDbError(res, err);
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

  if (statusFilter === 'expiring_60d') {
    whereClause += " AND warranty_end >= date('now', 'localtime') AND warranty_end <= date('now', '+60 days', 'localtime')";
  } else if (statusFilter === 'expiring_6m' || statusFilter === 'near_expiry') {
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
    if (err) return handleDbError(res, err);
    db.get(countQuery, params, (cntErr, cntRow) => {
      if (cntErr) return handleDbError(res, cntErr);
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
      SUM(CASE WHEN warranty_end >= date('now', 'localtime') AND warranty_end <= date('now', '+60 days', 'localtime') THEN 1 ELSE 0 END) as expiring_60d,
      SUM(CASE WHEN warranty_end >= date('now', 'localtime') AND warranty_end <= date('now', '+180 days', 'localtime') THEN 1 ELSE 0 END) as expiring_6m,
      SUM(CASE WHEN status = 'Scrapped' OR salvage_status = 'Scrapped' THEN 1 ELSE 0 END) as scrapped,
      SUM(CASE WHEN salvage_status IN ('Pending Sell', 'Sold') THEN 1 ELSE 0 END) as salvage_sell,
      SUM(CASE WHEN salvage_status IN ('Pending Donation', 'Donated') THEN 1 ELSE 0 END) as salvage_donation
    FROM mains
    WHERE is_deleted = 0
  `;
  db.get(sql, [], (err, row) => {
    if (err) return handleDbError(res, err);
    res.json({
      total: (row && row.total) || 0,
      working: (row && row.working) || 0,
      broken: (row && row.broken) || 0,
      pending_pickup: (row && row.pending_pickup) || 0,
      expiring_60d: (row && row.expiring_60d) || 0,
      expiring_6m: (row && row.expiring_6m) || 0,
      scrapped: (row && row.scrapped) || 0,
      salvage_sell: (row && row.salvage_sell) || 0,
      salvage_donation: (row && row.salvage_donation) || 0
    });
  });
});

// BME Regulated Medical Device Guardrail (Comprehensive clinical equipment keywords)
const BME_REGULATED_REGEX = /\b(ventilator|infusion\s*pump|syringe\s*pump|defibrillator|patient\s*monitor|vital\s*signs?\s*monitor|anesthesia\s*machine|dialysis|aed|ecg|ekg|bp\s*monitor|nibp|pulse\s*oximeter|spo2|ultrasound|centrifuge)\b|เครื่องช่วยหายใจ|เครื่องให้สารละลาย|เครื่องกระตุกหัวใจ|เครื่องติดตามสัญญาณชีพ|เครื่องดมยาสลบ|เครื่องฟอกไต|เครื่องวัดความดัน|เครื่องวัดออกซิเจน|เครื่องตรวจคลื่นหัวใจ|เครื่องตรวจคลื่นไฟฟ้าหัวใจ|อัลตราซาวด์|เครื่องอัลตราซาวด์|เครื่องปั่นเหวี่ยง|เครื่องปั่นตกตะกอน/i;

function checkBmeRegulatedDevice(fields) {
  const combined = fields.filter(Boolean).join(' ');
  if (BME_REGULATED_REGEX.test(combined)) {
    return {
      isBme: true,
      error: 'ไม่อนุญาตให้ลงทะเบียนหรือแก้ไขเป็นอุปกรณ์ทางการแพทย์ควบคุม (Regulated Medical Device) ในระบบ ClaimIT: อุปกรณ์นี้อยู่ภายใต้การกำกับดูแลของศูนย์เครื่องมือแพทย์ (Biomedical Engineering Department / งานเครื่องมือแพทย์) กรุณาติดต่อแผนกเครื่องมือแพทย์เพื่อดำเนินการตามระเบียบ'
    };
  }
  return { isBme: false };
}

function isStorageSensitiveAsset(category, deviceName) {
  const sensitiveRegex = /computer|pc|laptop|desktop|all-in-one|aio|tablet|server|workstation|storage|drive|nas|san|คอมพิวเตอร์|โน้ตบุ๊ก|แท็บเล็ต|เซิร์ฟเวอร์/i;
  const combined = `${category || ''} ${deviceName || ''}`;
  return sensitiveRegex.test(combined);
}

// Create New Asset (Admin-only)
router.post('/', verifyToken, adminOnly, (req, res) => {
  const { asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, purchase_price, warranty_months, expected_lifespan_months, po_number, invoice_no, action_by_username, recipient_email } = req.body;
  
  if (!asset_tag || !category || !brand || !model || !serial_no || !device_name || !location || !warranty_start || !warranty_end) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลครุภัณฑ์ให้ครบถ้วน' });
  }

  if (asset_tag.length > 50 || device_name.length > 255 || brand.length > 100 || model.length > 100 || serial_no.length > 100 || location.length > 100 || category.length > 100) {
    return res.status(400).json({ error: 'ความยาวข้อมูลเกินขีดจำกัดที่กำหนด (Input length exceeds limit)' });
  }

  // Enforce BME Medical Device Guardrail
  const bmeCheck = checkBmeRegulatedDevice([device_name, model, brand, category]);
  if (bmeCheck.isBme) {
    return res.status(400).json({ error: bmeCheck.error, is_bme_device: true });
  }

  // Enforce PDPA: Computing and storage hardware strictly requires data sanitization
  let sReq = sanitization_required ? 1 : 0;
  if (isStorageSensitiveAsset(category, device_name)) {
    sReq = 1;
  }
  const price = parseFloat(purchase_price) || 0;
  const wMonths = parseInt(warranty_months, 10) || 36;
  const isClinicalIT = ['Clinical IT Display', 'Clinical Workstation', 'Healthcare Scanner', 'Mobile Nursing Cart'].includes(category);
  const defaultLifespan = isClinicalIT ? 84 : 60;
  const lMonths = parseInt(expected_lifespan_months, 10) || defaultLifespan;
  const actionUser = action_by_username || (req.user ? req.user.username : 'admin');

  db.run(`INSERT INTO mains (asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status, purchase_price, warranty_months, expected_lifespan_months, po_number, invoice_no, salvage_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Working', ?, ?, ?, ?, ?, 'None')`,
    [asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sReq, price, wMonths, lMonths, po_number || '', invoice_no || ''],
    function(err) {
      if (err) return handleDbError(res, err);

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
  const { category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status, purchase_price, warranty_months, expected_lifespan_months, salvage_status, new_asset_tag } = req.body;
  const tag = req.params.tag;
  const actionUser = req.user ? req.user.username : 'admin';

  // Enforce BME Medical Device Guardrail on update
  const bmeCheck = checkBmeRegulatedDevice([device_name, model, brand, category]);
  if (bmeCheck.isBme) {
    return res.status(400).json({ error: bmeCheck.error, is_bme_device: true });
  }

  const targetTag = (new_asset_tag && new_asset_tag.trim()) || (req.body.asset_tag && req.body.asset_tag.trim()) || tag;
  if (targetTag.length > 50 || (device_name && device_name.length > 255) || (brand && brand.length > 100) || (model && model.length > 100) || (serial_no && serial_no.length > 100) || (location && location.length > 100)) {
    return res.status(400).json({ error: 'ความยาวข้อมูลเกินขีดจำกัดที่กำหนด (Input length exceeds limit)' });
  }

  const isClinicalIT = ['Clinical IT Display', 'Clinical Workstation', 'Healthcare Scanner', 'Mobile Nursing Cart'].includes(category);
  const defaultLifespan = isClinicalIT ? 84 : 60;
  const lMonths = parseInt(expected_lifespan_months, 10) || defaultLifespan;

  db.run(`UPDATE mains SET asset_tag=?, category=?, brand=?, model=?, serial_no=?, device_name=?, location=?, warranty_start=?, warranty_end=?, sanitization_required=?, status=?, purchase_price=?, warranty_months=?, expected_lifespan_months=?, salvage_status=?
          WHERE asset_tag=? AND is_deleted=0`,
    [targetTag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required ? 1 : 0, status, parseFloat(purchase_price)||0, parseInt(warranty_months)||36, lMonths, salvage_status || 'None', tag],
    function(err) {
      if (err) return handleDbError(res, err);
      if (this.changes === 0) {
        return res.status(404).json({ error: 'ไม่พบครุภัณฑ์ที่ต้องการแก้ไข หรือครุภัณฑ์ถูกลบไปแล้ว (Asset not found)' });
      }

      const logCode = recordAuditLog(db, {
        asset_tag: targetTag,
        department_name: location || 'IT Dept',
        floor: 'Floor 1',
        status: status || 'Working',
        moved_direction: 'IN',
        action_by_username: actionUser,
        details: targetTag !== tag ? `แก้ไขรหัสครุภัณฑ์จาก ${tag} เป็น ${targetTag} (Cascade Updated)` : `อัปเดตข้อมูลครุภัณฑ์: ${device_name || tag}`
      });

      res.json({ message: 'อัปเดตข้อมูลครุภัณฑ์สำเร็จ', asset_tag: targetTag, log_code: logCode });
    }
  );
});

// Soft Delete Asset (Admin-only)
router.delete('/:tag', verifyToken, adminOnly, (req, res) => {
  const tag = req.params.tag;
  const actionUser = req.user ? req.user.username : 'admin';
  db.run("UPDATE mains SET is_deleted = 1 WHERE asset_tag = ?", [tag], function(err) {
    if (err) return handleDbError(res, err);
    if (this.changes === 0) {
      return res.status(404).json({ error: 'ไม่พบครุภัณฑ์ที่ต้องการลบ' });
    }

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

// Restore Soft-Deleted Asset (Admin-only)
router.post('/:tag/restore', verifyToken, adminOnly, (req, res) => {
  const tag = req.params.tag.toUpperCase();
  const actionUser = req.user ? req.user.username : 'admin';

  db.get("SELECT * FROM mains WHERE UPPER(asset_tag) = ? AND is_deleted = 1", [tag], (err, row) => {
    if (err) return handleDbError(res, err);
    if (!row) {
      return res.status(404).json({ error: 'ไม่พบรายการครุภัณฑ์ที่ถูกลบชั่วคราว หรือครุภัณฑ์ยังอยู่ในระบบ' });
    }

    db.run("UPDATE mains SET is_deleted = 0 WHERE id = ?", [row.id], function(updateErr) {
      if (updateErr) return handleDbError(res, updateErr);

      const logCode = recordAuditLog(db, {
        asset_tag: row.asset_tag,
        department_name: row.location || 'Technical Support',
        floor: 'Floor 1',
        status: row.status,
        moved_direction: 'RESTORE',
        action_by_username: actionUser,
        details: `กู้คืนรายการครุภัณฑ์ (Restore Soft Deleted Asset): ${row.device_name}`
      });

      res.json({
        message: 'กู้คืนรายการครุภัณฑ์สำเร็จ',
        asset: { ...row, is_deleted: 0 },
        log_code: logCode
      });
    });
  });
});

// POST /api/assets/batch (Batch Asset Intake, Admin-only)
router.post('/batch', verifyToken, adminOnly, (req, res) => {
  const { common, items } = req.body;

  if (!common || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'กรุณาระบุข้อมูลส่วนกลาง (common) และรายการครุภัณฑ์ (items)' });
  }

  if (items.length > 50) {
    return res.status(400).json({ error: 'ลงทะเบียนแบบกลุ่มได้สูงสุดครั้งละ 50 รายการ' });
  }

  const { category, brand, model, location, warranty_start, warranty_end, purchase_price, warranty_months, po_number } = common;

  if (!category || !brand || !model || !location || !warranty_start || !warranty_end) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลส่วนกลางให้ครบถ้วน' });
  }

  // Enforce BME check on common specs
  const bmeCheck = checkBmeRegulatedDevice([category, brand, model]);
  if (bmeCheck.isBme) {
    return res.status(400).json({ error: bmeCheck.error, is_bme_device: true });
  }

  // Validate items
  const cleanItems = [];
  const tagSet = new Set();
  const serialSet = new Set();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const tag = (item.asset_tag || '').trim().toUpperCase();
    const serial = (item.serial_no || '').trim();
    const devName = (item.device_name || `${brand} ${model}`).trim();

    if (!tag || !serial) {
      return res.status(400).json({ error: `รายการลำดับที่ ${i + 1} ข้อมูลไม่ครบถ้วน (ต้องมี Asset Tag และ Serial Number)` });
    }

    if (tagSet.has(tag)) {
      return res.status(400).json({ error: `รหัสครุภัณฑ์ซ้ำกันภายในชุดข้อมูล: ${tag}` });
    }
    if (serialSet.has(serial)) {
      return res.status(400).json({ error: `หมายเลข Serial Number ซ้ำกันภายในชุดข้อมูล: ${serial}` });
    }

    tagSet.add(tag);
    serialSet.add(serial);
    cleanItems.push({ asset_tag: tag, serial_no: serial, device_name: devName });
  }

  const isClinicalIT = ['Clinical IT Display', 'Clinical Workstation', 'Healthcare Scanner', 'Mobile Nursing Cart'].includes(category);
  const defaultLifespan = isClinicalIT ? 84 : 60;
  const lMonths = parseInt(common.expected_lifespan_months, 10) || defaultLifespan;
  const wMonths = parseInt(warranty_months, 10) || 36;
  const price = parseFloat(purchase_price) || 0;
  let sReq = common.sanitization_required ? 1 : 0;
  if (isStorageSensitiveAsset(category, common.device_name || model)) {
    sReq = 1;
  }
  const actionUser = req.user ? req.user.username : 'admin';

  // Check database for collisions
  const placeholders = cleanItems.map(() => '?').join(',');
  const allTags = cleanItems.map(it => it.asset_tag);
  const allSerials = cleanItems.map(it => it.serial_no);

  db.all(
    `SELECT asset_tag, serial_no FROM mains WHERE (asset_tag IN (${placeholders}) OR serial_no IN (${placeholders})) AND is_deleted = 0`,
    [...allTags, ...allSerials],
    (collErr, collisions) => {
      if (collErr) return handleDbError(res, collErr);
      if (collisions && collisions.length > 0) {
        const dup = collisions[0];
        return res.status(400).json({
          error: `พบข้อมูลซ้ำกับในระบบ: รหัส ${dup.asset_tag} หรือ S/N ${dup.serial_no} มีอยู่แล้ว`
        });
      }

      // Execute batch insert inside atomic transaction
      db.serialize(() => {
        db.run("BEGIN IMMEDIATE TRANSACTION;");

        const stmt = db.prepare(`
          INSERT INTO mains (
            asset_tag, category, brand, model, serial_no, device_name, location,
            warranty_start, warranty_end, sanitization_required, status,
            purchase_price, warranty_months, expected_lifespan_months, po_number, salvage_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Working', ?, ?, ?, ?, 'None')
        `);

        cleanItems.forEach(it => {
          stmt.run([
            it.asset_tag, category, brand, model, it.serial_no, it.device_name, location,
            warranty_start, warranty_end, sReq, price, wMonths, lMonths, po_number || ''
          ]);
        });

        stmt.finalize((finErr) => {
          if (finErr) {
            db.run("ROLLBACK;");
            return handleDbError(res, finErr);
          }

          db.run("COMMIT;", (commitErr) => {
            if (commitErr) {
              db.run("ROLLBACK;");
              return handleDbError(res, commitErr);
            }

            let batchLogCode = null;
            cleanItems.forEach((item, idx) => {
              const code = recordAuditLog(db, {
                asset_tag: item.asset_tag,
                department_name: location,
                floor: 'Floor 1',
                status: 'Working',
                moved_direction: 'IN_BATCH',
                action_by_username: actionUser,
                details: `ลงทะเบียนครุภัณฑ์แบบกลุ่ม (Batch Intake ${idx + 1}/${cleanItems.length}): ${brand} ${model} S/N: ${item.serial_no}`
              });
              if (idx === 0) batchLogCode = code;
            });

            res.status(201).json({
              message: `ลงทะเบียนครุภัณฑ์แบบกลุ่มสำเร็จ ${cleanItems.length} รายการ`,
              count: cleanItems.length,
              log_code: batchLogCode,
              assets: cleanItems
            });
          });
        });
      });
    }
  );
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
    if (err) return handleDbError(res, err);
    if (row) {
      return res.json(row);
    }
    
    // Check if item is soft-deleted and requested by admin
    if (req.user && req.user.role === 'admin') {
      db.get("SELECT * FROM mains WHERE (UPPER(asset_tag) = ? OR UPPER(serial_no) = ?) AND is_deleted = 1", [tag, tag], (delErr, delRow) => {
        if (!delErr && delRow) {
          return res.json({ ...delRow, is_deleted: 1 });
        }
        performFuzzyLookup();
      });
    } else {
      performFuzzyLookup();
    }

    function performFuzzyLookup() {
      if (tag.length < 3) {
        return res.status(404).json({ error: 'ไม่พบทรัพย์สินดังกล่าว' });
      }

      db.all("SELECT m.*, r.vendor_name, r.vendor_rma_number, r.claim_date, r.expected_return_date, r.data_wiped_confirmed as rma_data_wiped_confirmed, r.data_wiped_by, r.data_wiped_at, r.sanitization_note, r.resolved_date, r.resolution_type, r.replacement_serial_no, r.repair_cost, r.status as rma_status FROM mains m LEFT JOIN rma_claims r ON m.asset_tag = r.asset_tag AND r.is_deleted = 0 WHERE m.is_deleted = 0 ORDER BY m.id DESC LIMIT 300", [], (err, rows) => {
        if (err) return handleDbError(res, err);
        
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

        for (const r of rows) {
          const tagDist = levenshtein(tag, (r.asset_tag || '').toUpperCase());
          const serialDist = levenshtein(tag, (r.serial_no || '').toUpperCase());
          const dist = Math.min(tagDist, serialDist);
          
          const candidate = dist === tagDist ? r.asset_tag : r.serial_no;
          // Tighter distance constraint: maximum 2 edits and at most 15% difference
          const maxAllowed = Math.min(2, Math.max(1, Math.floor((candidate || '').length * 0.15)));
          
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

  // Strict Wipe Authorization Code Check (supports English, Thai, and Asset Tag)
  const validCodes = ['WIPED', 'CONFIRM-WIPE', 'WIPE-CONFIRM', 'ยืนยัน', 'ล้างข้อมูลแล้ว'];
  const cleanCode = (wipe_code || '').trim().toUpperCase();
  const isMatchAssetTag = (cleanCode === asset_tag.trim().toUpperCase());
  if (!validCodes.includes(cleanCode) && !isMatchAssetTag) {
    return res.status(400).json({ 
      error: 'รหัสยืนยันการล้างข้อมูลไม่ถูกต้อง! กรุณาระบุรหัสยืนยัน (พิมพ์ "ยืนยัน" หรือ "WIPED") ตามนโยบายความปลอดภัยสารสนเทศของโรงพยาบาล' 
    });
  }

  const actionUser = action_by_username || (req.user ? req.user.username : 'staff');
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];
  const method = req.body.sanitization_method || 'PHYSICAL_STORAGE_REMOVED';
  const methodLabels = {
    'PHYSICAL_STORAGE_REMOVED': 'ถอดสื่อบันทึกข้อมูลออกแล้ว (Storage Media Physically Removed)',
    'STANDARD_OVERWRITE': 'ล้างข้อมูลระดับมาตรฐาน (Standard Secure Format/Wipe)',
    'SECURE_ERASE': 'ล้างข้อมูลความปลอดภัยสูง / ฟอร์แมตความปลอดภัย (Secure Format / Wipe)',
    'NIST_800_88': 'ล้างข้อมูลความปลอดภัยสูง / ฟอร์แมตความปลอดภัย (Secure Format / Wipe)',
    'NO_STORAGE_MEDIA': 'อุปกรณ์ไม่มีสื่อบันทึกข้อมูล (No Storage Device)'
  };
  const methodLabel = methodLabels[method] || method;
  const note = sanitization_note || `Confirmed ${methodLabel} (Authorization Code: ${cleanCode})`;

  db.get("SELECT asset_tag, is_deleted FROM mains WHERE asset_tag = ?", [asset_tag], (findErr, assetRow) => {
    if (findErr) return handleDbError(res, findErr);
    if (!assetRow || assetRow.is_deleted === 1) {
      return res.status(404).json({ error: 'ไม่พบครุภัณฑ์ที่ต้องการล้างข้อมูล หรือครุภัณฑ์ถูกลบไปแล้ว (Asset not found)' });
    }

    db.serialize(() => {
      const defaultRmaNumber = `PDPA-${cleanCode}-${Date.now().toString().slice(-6)}`;
      db.run(`INSERT INTO rma_claims (asset_tag, vendor_name, vendor_rma_number, claim_date, expected_return_date, data_wiped_confirmed, data_wiped_by, data_wiped_at, sanitization_note, status) 
              VALUES (?, 'Internal Technical Support', ?, ?, ?, 1, ?, ?, ?, 'Sanitized')
              ON CONFLICT(asset_tag) DO UPDATE SET 
                data_wiped_confirmed = 1, data_wiped_by = excluded.data_wiped_by, data_wiped_at = excluded.data_wiped_at, sanitization_note = excluded.sanitization_note, status = 'Sanitized'`,
        [asset_tag, defaultRmaNumber, todayStr, todayStr, actionUser, now, note], 
        function(err) {
          if (err) return handleDbError(res, err);
        
        db.run(`UPDATE mains SET status = 'Sanitized' WHERE asset_tag = ?`, [asset_tag]);
        
        const logCode = recordAuditLog(db, {
          asset_tag,
          department_name: 'Technical Support',
          floor: 'Fl 4',
          status: 'Sanitized',
          moved_direction: 'IN',
          action_by_username: actionUser,
          details: `Data Sanitization: ${note}`
        });

        res.json({ message: 'การล้างข้อมูล (Data Sanitization) เสร็จสิ้นและบันทึกประวัติสำเร็จ', data_wiped_by: actionUser, data_wiped_at: now, log_code: logCode });
      });
    });
  });
});

// Initiate RMA / Warranty Claim (Staff/Admin with Data Sanitization Gate)
router.post('/claim', verifyToken, staffOnly, (req, res) => {
  const { asset_tag, vendor_name, vendor_rma_number, expected_return_date, data_wiped_confirmed, sanitization_note, action_by_username } = req.body;
  if (!asset_tag || !vendor_name || !vendor_rma_number) return res.status(400).json({ error: 'กรุณากรอกข้อมูลการเคลมให้ครบถ้วน' });

  const actionUser = action_by_username || (req.user ? req.user.username : 'staff');
  const claimDate = new Date().toISOString().split('T')[0];

  db.serialize(() => {
    // 1. Verify if asset requires sanitization and enforce Sanitization Gate
    db.get("SELECT * FROM mains WHERE asset_tag = ? AND is_deleted = 0", [asset_tag], (err, asset) => {
      if (err || !asset) return res.status(404).json({ error: 'Asset not found' });

      db.get("SELECT * FROM rma_claims WHERE asset_tag = ? AND is_deleted = 0", [asset_tag], (rmaErr, existingRma) => {
        const isWiped = Boolean(data_wiped_confirmed) || (existingRma && existingRma.data_wiped_confirmed === 1 && existingRma.status === 'Sanitized');

        if (asset.sanitization_required === 1 && !isWiped) {
          return res.status(400).json({ 
            error: 'Security Gate Block: อุปกรณ์นี้เป็นอุปกรณ์บันทึกข้อมูลหลัก ต้องทำการล้างข้อมูล (Confirm Data Wiped) ก่อนจึงจะส่งศูนย์บริการได้' 
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
            if (claimErr) return handleDbError(res, claimErr);

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

// EOL Salvage Management (Pending Sell / Pending Donation / Scrapped) (Admin-only)
router.post('/salvage', verifyToken, adminOnly, (req, res) => {
  const { asset_tag, salvage_status, action_by_username } = req.body;
  if (!asset_tag || !salvage_status) return res.status(400).json({ error: 'Missing asset_tag or salvage_status' });

  const actionUser = action_by_username || (req.user ? req.user.username : 'admin');
  let newAssetStatus = 'Broken';
  if (salvage_status === 'Pending Sell') newAssetStatus = 'Pending Sell';
  else if (salvage_status === 'Sold') newAssetStatus = 'Sold';
  else if (salvage_status === 'Pending Donation') newAssetStatus = 'Pending Donation';
  else if (salvage_status === 'Donated') newAssetStatus = 'Donated';
  else if (salvage_status === 'Scrapped') newAssetStatus = 'Scrapped';

  db.serialize(() => {
    db.run("UPDATE mains SET salvage_status = ?, status = ? WHERE asset_tag = ? AND is_deleted = 0", [salvage_status, newAssetStatus, asset_tag], function(err) {
      if (err) return handleDbError(res, err);

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

// PDF Generation for Claim Report (Staff/Admin)
router.get('/:tag/pdf', verifyToken, staffOnly, (req, res) => {
  const tag = req.params.tag.toUpperCase();
  const fs = require('fs');
  const path = require('path');

  db.get("SELECT m.*, r.vendor_name, r.vendor_rma_number, r.claim_date, r.expected_return_date, r.data_wiped_confirmed, r.data_wiped_by, r.data_wiped_at, r.sanitization_note, r.resolution_type, r.repair_cost FROM mains m LEFT JOIN rma_claims r ON m.asset_tag = r.asset_tag AND r.is_deleted = 0 WHERE m.asset_tag = ? AND m.is_deleted = 0", [tag], (err, asset) => {
    if (err || !asset) return res.status(404).json({ error: 'Asset not found' });
    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    const filename = `claim_${tag}.pdf`;
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
    
    // Header
    const titleFont = isThai ? 'ThaiBold' : 'Helvetica-Bold';
    const regularFont = isThai ? 'ThaiRegular' : 'Helvetica';

    const hospTitle = process.env.HOSPITAL_NAME || 'Hospital IT Department (ฝ่ายเทคโนโลยีสารสนเทศ)';
    doc.font(titleFont).fontSize(16).fillColor('#0284c7').text('ClaimIT — Hospital Asset Warranty & RMA Report', { align: 'center' });
    doc.font(regularFont).fontSize(9).fillColor('#64748b').text(`Hospital: ${hospTitle} | Generated: ${new Date().toLocaleString('th-TH')}`, { align: 'center' });
    doc.moveDown(1);

    // Section 1: Asset Information
    doc.font(titleFont).fontSize(11).fillColor('#0f172a').text('1. รายละเอียดครุภัณฑ์ (Asset Specifications)', { underline: true });
    doc.moveDown(0.3);
    doc.font(regularFont).fontSize(9.5).fillColor('#334155');
    doc.text(`รหัสครุภัณฑ์ (Asset Tag): ${asset.asset_tag}`);
    doc.text(`ชื่ออุปกรณ์ (Device Name): ${asset.device_name}`);
    doc.text(`หมวดหมู่ / ยี่ห้อ / รุ่น: ${asset.category} | ${asset.brand} ${asset.model}`);
    doc.text(`หมายเลขซีเรียล (S/N): ${asset.serial_no}`);
    doc.text(`จุดติดตั้ง (Location): ${asset.location}`);
    doc.text(`มูลค่าจัดซื้อ (Purchase Price): ฿${(asset.purchase_price || 0).toLocaleString()}`);
    doc.text(`ระยะเวลาการรับประกัน: ${asset.warranty_start} ถึง ${asset.warranty_end}`);
    doc.text(`สถานะปัจจุบัน (Status): ${asset.status} (Salvage: ${asset.salvage_status || 'None'})`);
    doc.moveDown(1);

    // Section 2: Data Sanitization Audit Log
    doc.font(titleFont).fontSize(11).fillColor('#0f172a').text('2. บันทึกความปลอดภัยข้อมูล (Data Sanitization & Storage Security Audit)', { underline: true });
    doc.moveDown(0.3);
    doc.font(regularFont).fontSize(9.5).fillColor('#334155');
    doc.text(`ต้องล้างข้อมูลก่อนส่ง (Sanitization Required): ${asset.sanitization_required ? 'ใช่ (YES)' : 'ไม่ใช่ (NO)'}`);
    doc.text(`ยืนยันการล้างข้อมูลเรียบร้อย (Data Wiped Confirmed): ${asset.data_wiped_confirmed ? '✓ ยืนยันแล้ว (CONFIRMED)' : 'ยังไม่ดำเนินการ'}`);
    if (asset.data_wiped_by) doc.text(`ผู้ดำเนินการล้างข้อมูล (Technician): ${asset.data_wiped_by}`);
    if (asset.data_wiped_at) doc.text(`วันที่และเวลาที่ดำเนินการ: ${asset.data_wiped_at}`);
    if (asset.sanitization_note) doc.text(`บันทึกเพิ่มเติม: ${asset.sanitization_note}`);
    doc.moveDown(1);

    // Section 3: Vendor Claim Details
    if (asset.vendor_name) {
      doc.font(titleFont).fontSize(11).fillColor('#0f172a').text('3. ข้อมูลการส่งเคลมศูนย์บริการ (Vendor RMA Service Details)', { underline: true });
      doc.moveDown(0.3);
      doc.font(regularFont).fontSize(9.5).fillColor('#334155');
      doc.text(`ศูนย์บริการ (Vendor): ${asset.vendor_name}`);
      doc.text(`หมายเลขใบรับเคลม (RMA / Case No.): ${asset.vendor_rma_number || 'N/A'}`);
      doc.text(`วันที่ส่งเคลม (Dispatch Date): ${asset.claim_date || '-'}`);
      doc.text(`กำหนดส่งคืนโดยประมาณ (Expected Return): ${asset.expected_return_date || '-'}`);
      if (asset.resolution_type) doc.text(`ผลการซ่อม/เคลม (Resolution): ${asset.resolution_type}`);
      if (asset.repair_cost) doc.text(`ค่าใช้จ่าย (Cost): ฿${asset.repair_cost.toLocaleString()}`);
    }

    doc.end();
  });
});

router.checkBmeRegulatedDevice = checkBmeRegulatedDevice;
router.BME_REGULATED_REGEX = BME_REGULATED_REGEX;

module.exports = router;
