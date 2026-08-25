const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { db } = require('../db');
const { evaluateClaimWorthiness } = require('../claim_calculator');
const { verifyToken, staffOnly, adminOnly } = require('../middleware/auth');

// Get All Assets with optional pagination & filtering (Staff/Admin)
router.get('/', verifyToken, staffOnly, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const statusFilter = req.query.status;
  const categoryFilter = req.query.category;
  
  let whereClause = "WHERE is_deleted = 0";
  let params = [];

  if (statusFilter) {
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

// Create New Asset (Admin-only)
router.post('/', verifyToken, adminOnly, (req, res) => {
  const { asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, purchase_price, warranty_months, expected_lifespan_months, po_number, invoice_no, action_by_username } = req.body;
  
  if (!asset_tag || !category || !brand || !model || !serial_no || !device_name || !location || !warranty_start || !warranty_end) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลครุภัณฑ์ให้ครบถ้วน' });
  }

  const sReq = sanitization_required ? 1 : 0;
  const price = parseFloat(purchase_price) || 0;
  const wMonths = parseInt(warranty_months, 10) || 36;
  const lMonths = parseInt(expected_lifespan_months, 10) || 60;

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

      db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, ?, 'Fl 1', 'Working', 'IN', ?)`, 
        [asset_tag, location, action_by_username || req.user.username || 'system']);

      res.json({ id: this.lastID, asset_tag, message: 'ลงทะเบียนครุภัณฑ์ใหม่สำเร็จ' });
    }
  );
});

// Update Asset Details (Admin-only)
router.put('/:tag', verifyToken, adminOnly, (req, res) => {
  const { category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status, purchase_price, warranty_months, expected_lifespan_months, salvage_status } = req.body;
  const tag = req.params.tag;

  db.run(`UPDATE mains SET category=?, brand=?, model=?, serial_no=?, device_name=?, location=?, warranty_start=?, warranty_end=?, sanitization_required=?, status=?, purchase_price=?, warranty_months=?, expected_lifespan_months=?, salvage_status=?
          WHERE asset_tag=? AND is_deleted=0`,
    [category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required ? 1 : 0, status, parseFloat(purchase_price)||0, parseInt(warranty_months)||36, parseInt(expected_lifespan_months)||60, salvage_status || 'None', tag],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'อัปเดตข้อมูลครุภัณฑ์สำเร็จ' });
    }
  );
});

// Soft Delete Asset (Admin-only)
router.delete('/:tag', verifyToken, adminOnly, (req, res) => {
  db.run("UPDATE mains SET is_deleted = 1 WHERE asset_tag = ?", [req.params.tag], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'ลบรายการครุภัณฑ์สำเร็จ' });
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

        db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, ?, ?, ?, ?, ?)`, 
          [asset_tag, logDept, logFloor, status, movedDirection, actionUser]);
        res.json({ message: 'Asset status updated', status, location: newLocation });
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
        db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, 'Technical Support', 'Fl 4', 'Sanitized', 'IN', ?)`, 
          [asset_tag, actionUser]);
        res.json({ message: 'การลบข้อมูล (PDPA Sanitization) เสร็จสิ้นและบันทึกประวัติสำเร็จ', data_wiped_by: actionUser, data_wiped_at: now });
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

              db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, ?, 'External', 'Pending Pickup', 'OUT', ?)`, 
                [asset_tag, vendor_name, actionUser]);
              res.json({ message: 'บันทึกส่งเคลมศูนย์บริการสำเร็จ', asset_tag, status: 'Pending Pickup', data_wiped_by: actionUser, data_wiped_at: now, sanitization_note: note });
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
            
            db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, ?, 'Fl 1', ?, 'IN', ?)`,
              [asset_tag, asset.location, newStatus, actionUser]);

            res.json({ message: `รับอุปกรณ์คืนเรียบร้อยแล้ว สถานะ: [${newStatus}]`, asset_tag, status: newStatus, resolvedDate });
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

      db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, 'Salvage Dept', 'Warehouse', ?, 'OUT', ?)`,
        [asset_tag, newAssetStatus, actionUser]);

      res.json({ message: `อัปเดตสถานะการขาย/บริจาคเป็น [${salvage_status}] สำเร็จ`, asset_tag, salvage_status, status: newAssetStatus });
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

    // Register Thai font if available on host
    const thaiFontPath = 'C:\\Windows\\Fonts\\tahoma.ttf';
    const thaiBoldFontPath = 'C:\\Windows\\Fonts\\tahomabd.ttf';
    if (fs.existsSync(thaiFontPath)) {
      doc.registerFont('ThaiRegular', thaiFontPath);
      if (fs.existsSync(thaiBoldFontPath)) {
        doc.registerFont('ThaiBold', thaiBoldFontPath);
      } else {
        doc.registerFont('ThaiBold', thaiFontPath);
      }
      doc.font('ThaiRegular');
    }

    doc.pipe(res);
    
    // Header
    const isThai = fs.existsSync(thaiFontPath);
    const titleFont = isThai ? 'ThaiBold' : 'Helvetica-Bold';
    const regularFont = isThai ? 'ThaiRegular' : 'Helvetica';

    doc.font(titleFont).fontSize(16).fillColor('#0284c7').text('ClaimIT — Hospital Asset Warranty & RMA Report', { align: 'center' });
    doc.font(regularFont).fontSize(9).fillColor('#64748b').text(`Hospital: Phyathai 3 Hospital (โรงพยาบาลพญาไท 3) | Generated: ${new Date().toLocaleString('th-TH')}`, { align: 'center' });
    doc.moveDown(1);

    // Section 1: Asset Information
    doc.font(titleFont).fontSize(11).fillColor('#0f172a').text('1. รายละเอียดครุภัณฑ์ (Asset Specifications)', { underline: true });
    doc.moveDown(0.3);
    doc.font(regularFont).fontSize(9.5).fillColor('#334155');
    doc.text(`รหัสครุภัณฑ์ (Asset Tag): ${asset.asset_tag}`);
    doc.text(`ชื่ออุปกรณ์ (Device Name): ${asset.device_name}`);
    doc.text(`หมวดหมู่ / แบรนด์ / รุ่น: ${asset.category} | ${asset.brand} ${asset.model}`);
    doc.text(`หมายเลขซีเรียล (S/N): ${asset.serial_no}`);
    doc.text(`จุดติดตั้ง (Location): ${asset.location}`);
    doc.text(`มูลค่าจัดซื้อ (Purchase Price): ฿${(asset.purchase_price || 0).toLocaleString()}`);
    doc.text(`ระยะเวลารับประกัน (Warranty): ${asset.warranty_start} ถึง ${asset.warranty_end}`);
    doc.text(`สถานะปัจจุบัน (Status): ${asset.status} (Salvage: ${asset.salvage_status || 'None'})`);
    doc.moveDown(1);

    // Section 2: PDPA-Aware Data Sanitization Audit Log
    doc.font(titleFont).fontSize(11).fillColor('#0f172a').text('2. บันทึกความปลอดภัยข้อมูลผู้ป่วย (PDPA Storage Security Audit)', { underline: true });
    doc.moveDown(0.3);
    doc.font(regularFont).fontSize(9.5).fillColor('#334155');
    doc.text(`ต้องทำความสะอาดข้อมูลก่อนส่ง (Sanitization Required): ${asset.sanitization_required ? 'ใช่ (YES)' : 'ไม่ใช่ (NO)'}`);
    doc.text(`ยืนยันการล้างข้อมูลเรียบร้อย (Data Wiped Confirmed): ${asset.data_wiped_confirmed ? '✓ ยืนยันแล้ว (CONFIRMED)' : 'ยังไม่ดำเนินการ'}`);
    if (asset.data_wiped_by) doc.text(`ผู้ดำเนินการล้างข้อมูล (Technician): ${asset.data_wiped_by}`);
    if (asset.data_wiped_at) doc.text(`วัน-เวลาที่ดำเนินการ: ${asset.data_wiped_at}`);
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

module.exports = router;
