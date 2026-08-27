/**
 * ClaimIT Multi-Asset Claims Route Handler
 * Manages 1 to 5 assets per claim, server-calculated viability,
 * state machine transitions, and multi-asset PDF generation.
 */

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { db, recordAuditLog, addRepairCostRecord, getAverageRepairCost, getRepairCostHistory } = require('../db');
const { verifyToken, staffOnly, adminOnly } = require('../middleware/auth');
const { createClaim, transitionClaimStatus, calculateServerViability } = require('../services/claimService');
const { calculateDynamicViability } = require('../claim_calculator');
const { validateClaimIntake, buildVendorRmaBrief } = require('../services/aiAssistService');
const { recordParsedItemsToLedger } = require('../services/ocrService');
const { sendNotificationEmail } = require('../services/emailService');

// POST /api/claims (Create multi-asset claim with 1-5 assets)
router.post('/', verifyToken, staffOnly, async (req, res, next) => {
  try {
    const { claim_number, vendor_name, vendor_rma_number, asset_tags, claim_type, notes, recipient_email } = req.body;
    
    const result = await createClaim({
      claim_number,
      vendor_name,
      vendor_rma_number,
      asset_tags,
      claim_type,
      notes,
      user: req.user
    });

    // Send email notification if recipient provided
    if (recipient_email) {
      sendNotificationEmail({
        templateName: 'VIABILITY_REPORT',
        recipient: recipient_email,
        claimId: result.id,
        data: {
          claim_number: result.claim_number,
          viability_status: result.viability_status,
          viability_score: result.viability_score,
          asset_count: result.asset_count
        }
      }).catch(err => console.error('Email background error:', err));
    }

    res.status(201).json({
      message: 'สร้างใบส่งเคลมสำเร็จ',
      claim: result
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/claims/validate-intake (Diagnostic Intake Gate & Follow-up Inquirer)
router.post('/validate-intake', verifyToken, staffOnly, (req, res) => {
  const { description, issue_symptoms, device_type } = req.body;
  const analysis = validateClaimIntake({
    description: description || '',
    issue_symptoms: issue_symptoms || '',
    device_type: device_type || 'computer'
  });
  res.json(analysis);
});

// POST /api/claims/calculate-viability (Dynamic Viability Calculator using Repair Cost Ledger)
router.post('/calculate-viability', verifyToken, staffOnly, async (req, res, next) => {
  try {
    const { asset_tag, issue_category, purchase_price, age_in_months, expected_lifespan_months, custom_cost } = req.body;
    let asset = req.body.asset || {};

    if (asset_tag) {
      const cleanTag = String(asset_tag).trim().toUpperCase();
      const dbAsset = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM mains WHERE (UPPER(asset_tag) = ? OR UPPER(serial_no) = ?) AND is_deleted = 0", [cleanTag, cleanTag], (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });
      if (dbAsset) {
        asset = { ...dbAsset, ...asset };
      }
    }

    if (purchase_price !== undefined) asset.purchase_price = purchase_price;
    if (age_in_months !== undefined) asset.age_in_months = age_in_months;
    if (expected_lifespan_months !== undefined) asset.expected_lifespan_months = expected_lifespan_months;

    const category = asset.category || asset.asset_category || 'Computer';
    const issueCat = issue_category || asset.issue_category || null;

    let historicalData = { avg_cost: null, sample_count: 0 };
    if (custom_cost !== undefined && custom_cost !== null && custom_cost !== '') {
      historicalData = { avg_cost: parseFloat(custom_cost), sample_count: 1 };
    } else {
      historicalData = await getAverageRepairCost(category, issueCat);
    }

    const viability = calculateDynamicViability(asset, {
      historicalAvgCost: historicalData.avg_cost,
      sampleCount: historicalData.sample_count,
      issueCategory: issueCat
    });

    res.json(viability);
  } catch (err) {
    next(err);
  }
});

// GET /api/claims/cost-ledger (Query Historical Repair Cost Ledger)
router.get('/cost-ledger', verifyToken, staffOnly, async (req, res, next) => {
  try {
    const { asset_id, asset_category, issue_category, limit } = req.query;
    const records = await getRepairCostHistory({
      asset_id: asset_id ? parseInt(asset_id, 10) : null,
      asset_category,
      issue_category,
      limit: parseInt(limit, 10) || 50
    });
    res.json({ total: records.length, records });
  } catch (err) {
    next(err);
  }
});

// POST /api/claims/cost-ledger (Add Entry to Historical Repair Cost Ledger)
router.post('/cost-ledger', verifyToken, staffOnly, async (req, res, next) => {
  try {
    const { asset_id, asset_category, issue_category, part_name, cost_thb, vendor_name } = req.body;
    if (!cost_thb || isNaN(parseFloat(cost_thb))) {
      return res.status(400).json({ error: 'กรุณาระบุจำนวนเงินค่าซ่อมที่ถูกต้อง (cost_thb is required)' });
    }

    const record = await addRepairCostRecord({
      asset_id: asset_id ? parseInt(asset_id, 10) : null,
      asset_category: asset_category || 'Computer',
      issue_category: issue_category || 'General Hardware Repair',
      part_name: part_name || 'Generic Replacement Part',
      cost_thb: parseFloat(cost_thb),
      vendor_name: vendor_name || 'Authorized Service Center'
    });

    res.status(201).json({
      message: 'บันทึกประวัติค่าซ่อมลงใน Ledger สำเร็จ',
      record
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/claims (List all multi-asset claims)
router.get('/', verifyToken, staffOnly, (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const status = req.query.status;

  let whereClause = "WHERE c.is_deleted = 0";
  let params = [];

  if (status) {
    whereClause += " AND c.status = ?";
    params.push(status);
  }

  const query = `
    SELECT c.*, COUNT(ca.id) as asset_count
    FROM claims c
    LEFT JOIN claim_assets ca ON c.id = ca.claim_id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.id DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [...params, limit, offset], (err, rows) => {
    if (err) return next(err);
    res.json({ page, limit, claims: rows });
  });
});

// GET /api/claims/:id (Get single claim details + assets + evidence)
router.get('/:id', verifyToken, staffOnly, (req, res, next) => {
  const claimId = req.params.id;

  db.get("SELECT * FROM claims WHERE id = ? AND is_deleted = 0", [claimId], (err, claim) => {
    if (err) return next(err);
    if (!claim) return res.status(404).json({ error: 'ไม่พบใบเคลมที่ระบุ' });

    // Fetch attached assets
    db.all(`
      SELECT ca.*, m.device_name, m.brand, m.model, m.serial_no, m.category, m.location, m.warranty_end, m.sanitization_required
      FROM claim_assets ca
      JOIN mains m ON ca.asset_tag = m.asset_tag
      WHERE ca.claim_id = ?
    `, [claimId], (assetErr, assets) => {
      if (assetErr) return next(assetErr);

      // Fetch attached evidence
      db.all("SELECT id, original_filename, mime_type, file_size, created_at FROM evidence WHERE claim_id = ? AND is_deleted = 0", [claimId], (evErr, evidence) => {
        if (evErr) return next(evErr);

        res.json({
          ...claim,
          assets,
          evidence
        });
      });
    });
  });
});

// PUT /api/claims/:id/status (Enforce valid state transition)
router.put('/:id/status', verifyToken, staffOnly, async (req, res, next) => {
  try {
    const { status, notes, resolution_type, replacement_serial_no, repair_cost } = req.body;
    if (!status) return res.status(400).json({ error: 'กรุณาระบุสถานะใหม่ (new status required)' });

    const result = await transitionClaimStatus({
      claim_id: req.params.id,
      new_status: status,
      user: req.user,
      notes,
      resolution_type,
      replacement_serial_no,
      repair_cost
    });

    res.json({
      message: `เปลี่ยนสถานะเป็น [${status}] สำเร็จ`,
      claim: result
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/claims/:id/generate-rma-brief (Structured Bilingual Vendor RMA Handoff Generator)
router.post('/:id/generate-rma-brief', verifyToken, staffOnly, async (req, res, next) => {
  const claimId = req.params.id;

  db.get("SELECT * FROM claims WHERE id = ? AND is_deleted = 0", [claimId], (err, claim) => {
    if (err) return next(err);
    if (!claim) return res.status(404).json({ error: 'ไม่พบใบเคลมที่ระบุ' });

    // Fetch assets
    db.all(`
      SELECT ca.*, m.device_name, m.brand, m.model, m.serial_no, m.category, m.location, m.warranty_end, m.purchase_price
      FROM claim_assets ca
      JOIN mains m ON ca.asset_tag = m.asset_tag
      WHERE ca.claim_id = ?
    `, [claimId], (assetErr, assets) => {
      if (assetErr) return next(assetErr);

      // Fetch attached evidence
      db.all("SELECT id, original_filename, mime_type, file_size FROM evidence WHERE claim_id = ? AND is_deleted = 0", [claimId], (evErr, evidence) => {
        if (evErr) return next(evErr);

        // Fetch audit trail for the claim/assets
        const assetTags = (assets || []).map(a => a.asset_tag);
        const placeholders = assetTags.map(() => '?').join(',') || "''";
        db.all(`
          SELECT * FROM move_log 
          WHERE asset_tag = ? OR asset_tag IN (${placeholders}) 
          ORDER BY timestamp DESC LIMIT 10
        `, [claim.claim_number, ...assetTags], (auditErr, auditLogs) => {
          if (auditErr) return next(auditErr);

          const rmaBrief = buildVendorRmaBrief({
            claim,
            assets: assets || [],
            auditLogs: auditLogs || [],
            evidence: evidence || []
          });

          res.json(rmaBrief);
        });
      });
    });
  });
});

// POST /api/claims/:id/override-recommendation (Human-in-the-Loop Override Governance & Quality Gates)
router.post('/:id/override-recommendation', verifyToken, staffOnly, async (req, res, next) => {
  try {
    const claimId = req.params.id;
    const { overridden_recommendation, override_reason, previous_recommendation } = req.body;

    // Quality Gate 1: Non-empty override_reason is mandatory
    if (!override_reason || typeof override_reason !== 'string' || !override_reason.trim()) {
      return res.status(400).json({ 
        error: 'กรุณาระบุเหตุผลในการแก้ไขคำแนะนำ (override_reason is required and cannot be empty)' 
      });
    }

    if (!overridden_recommendation || typeof overridden_recommendation !== 'string' || !overridden_recommendation.trim()) {
      return res.status(400).json({ 
        error: 'กรุณาระบุคำแนะนำใหม่ที่ต้องการปรับปรุง (overridden_recommendation is required)' 
      });
    }

    // Fetch existing claim
    const claim = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM claims WHERE id = ? AND is_deleted = 0", [claimId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!claim) {
      return res.status(404).json({ error: 'ไม่พบใบเคลมที่ระบุ' });
    }

    const prevRec = previous_recommendation || claim.recommendation_override || claim.viability_status || 'AUTOMATED_RECOMMENDATION';
    const newRec = overridden_recommendation.trim();
    const cleanReason = override_reason.trim();
    const username = req.user ? req.user.username : 'staff';

    // Record immutable audit log entry in move_log
    const logCode = recordAuditLog(db, {
      asset_tag: claim.claim_number,
      department_name: 'Claim Dept',
      floor: 'IT Governance',
      status: 'OVERRIDE',
      moved_direction: 'STATE_CHANGE',
      action_by_username: username,
      details: `Override Recommendation: เปลี่ยนจาก [${prevRec}] เป็น [${newRec}] | เหตุผล: ${cleanReason}`
    });

    // Update claim record
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE claims 
         SET recommendation_override = ?, override_reason = ?, overridden_by = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newRec, cleanReason, username, claimId],
        function(updateErr) {
          if (updateErr) return reject(updateErr);
          resolve();
        }
      );
    });

    res.json({
      message: 'บันทึกการ Override คำแนะนำพร้อมประวัติการตรวจสอบสำเร็จ',
      claim_id: parseInt(claimId, 10),
      claim_number: claim.claim_number,
      previous_recommendation: prevRec,
      overridden_recommendation: newRec,
      override_reason: cleanReason,
      overridden_by: username,
      audit_log_code: logCode
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/claims/:id/pdf (Download multi-asset claim PDF report)
router.get('/:id/pdf', verifyToken, staffOnly, (req, res, next) => {
  const claimId = req.params.id;
  const fs = require('fs');

  db.get("SELECT * FROM claims WHERE id = ? AND is_deleted = 0", [claimId], (err, claim) => {
    if (err) return next(err);
    if (!claim) return res.status(404).json({ error: 'ไม่พบใบเคลม' });

    db.all(`
      SELECT ca.*, m.device_name, m.brand, m.model, m.serial_no, m.category, m.location, m.warranty_end
      FROM claim_assets ca
      JOIN mains m ON ca.asset_tag = m.asset_tag
      WHERE ca.claim_id = ?
    `, [claimId], (assetErr, assets) => {
      if (assetErr) return next(assetErr);

      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const filename = `claim_${claim.claim_number}.pdf`;
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

      // PT3-FM-SEC-1012 Official Gate Pass format for Claim Bundle
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
         .text(`ใบนําอุปกรณ์ ทรัพย์สิน ออกนอกพื้นที่ (PT3-FM-SEC-1012)`, { align: 'center' });
      doc.font(regularFont).fontSize(8.5).fillColor('#64748b')
         .text(`อ้างอิงเลขที่ใบเคลม: ${claim.claim_number} (RMA No: ${claim.vendor_rma_number || '-'})`, { align: 'center' });
      doc.moveDown(0.3);

      doc.font(regularFont).fontSize(9.5).fillColor('#000');
      doc.text(`วันที่: ${today.getDate()}   เดือน: ${thaiMonths[today.getMonth()]}   ปี: ${today.getFullYear() + 543}`, { align: 'right' });
      doc.moveDown(0.3);

      doc.text(`ชื่อ-สกุล: ${claim.created_by || req.user?.name || 'เจ้าหน้าที่ไอที ประจำโรงพยาบาล'}          ตำแหน่ง: เจ้าหน้าที่เทคโนโลยีสารสนเทศ          แผนก/หน่วย: เทคโนโลยีสารสนเทศ`);
      doc.moveDown(0.3);
      doc.text(`ขอนำรายการทรัพย์สินของ   [X] โรงพยาบาลออก      [  ] ส่วนตัว   ออกจากพื้นที่ของโรงพยาบาล`);
      doc.text(`ด้วยวิธีการ:  [  ] นำออกด้วยตนเอง      [X] อนุญาตให้ ชื่อ/บริษัท ${claim.vendor_name || 'Acer Service Center'} เป็นตัวแทนนำออก`);
      doc.moveDown(0.4);

      // 10 Rows Table
      doc.font(titleFont).fontSize(9).text('ดังรายการต่อไปนี้:');
      doc.moveDown(0.2);

      const tableTop = doc.y;
      const colX = [36, 65, 360, 430, 560];
      doc.rect(colX[0], tableTop, colX[4] - colX[0], 20).fill('#f1f5f9');
      doc.fillColor('#000').font(titleFont).fontSize(8.5);
      doc.text('ลำดับ', colX[0] + 5, tableTop + 5);
      doc.text('รายการ (Description)', colX[1] + 5, tableTop + 5);
      doc.text('จำนวน', colX[2] + 5, tableTop + 5);
      doc.text('หมายเหตุ (Tag / RMA)', colX[3] + 5, tableTop + 5);

      let currentY = tableTop + 20;
      doc.font(regularFont).fontSize(8);

      for (let i = 1; i <= 10; i++) {
        doc.rect(colX[0], currentY, colX[4] - colX[0], 18).stroke('#cbd5e1');
        const item = assets[i - 1];
        if (item) {
          doc.fillColor('#000').text(i.toString(), colX[0] + 12, currentY + 4);
          doc.text(`${item.device_name || item.category} (${item.brand} ${item.model}) S/N: ${item.serial_no}`, colX[1] + 5, currentY + 4);
          doc.text('1 เครื่อง', colX[2] + 10, currentY + 4);
          doc.text(`Tag: ${item.asset_tag}`, colX[3] + 5, currentY + 4);
        } else {
          doc.fillColor('#94a3b8').text(i.toString(), colX[0] + 12, currentY + 4);
        }
        currentY += 18;
      }

      doc.y = currentY + 8;
      doc.fillColor('#000').font(regularFont).fontSize(8.5);
      doc.text(`เหตุผลในการนำออก:   [X] เพื่อซ่อม/ส่งเคลม      [  ] จำหน่าย      [  ] ใช้งานภายนอกโรงพยาบาล      [  ] ยืมระหว่างโรงพยาบาล      [  ] อื่นๆ`);
      doc.text(`วันที่จะนำทรัพย์สินออก: ${shortDate} เวลา 14:00 น.      ทะเบียนรถ: 1กข-5542 กทม.      ยี่ห้อ: Toyota สีขาว / ขนส่งศูนย์บริการ`);
      doc.moveDown(0.6);

      // Signatures
      const sigTop = doc.y;
      const sigW = (colX[4] - colX[0]) / 2;
      
      doc.rect(colX[0], sigTop, sigW, 75).stroke('#cbd5e1');
      doc.rect(colX[0] + sigW, sigTop, sigW, 75).stroke('#cbd5e1');

      doc.font(titleFont).fontSize(8).fillColor('#000');
      doc.text('1. เจ้าของทรัพย์สิน (กรณีทรัพย์สินส่วนตัว)', colX[0] + 5, sigTop + 5);
      doc.font(regularFont).fontSize(7.5);
      doc.text('ลงชื่อ ................................................................', colX[0] + 5, sigTop + 30);
      doc.text('วันที่ ........................... เวลา ...........................', colX[0] + 5, sigTop + 50);

      doc.font(titleFont).fontSize(8);
      doc.text('2. หน่วยงานเจ้าของทรัพย์สิน (กรณีทรัพย์สินของหน่วยงาน)', colX[0] + sigW + 5, sigTop + 5);
      doc.font(regularFont).fontSize(7.5);
      doc.text(`ลงชื่อ: ${claim.created_by || 'เจ้าหน้าที่ไอที ประจำโรงพยาบาล'} (ผู้จัดการแผนก/หัวหน้าหน่วย)`, colX[0] + sigW + 5, sigTop + 30);
      doc.text(`วันที่: ${shortDate}`, colX[0] + sigW + 5, sigTop + 50);

      const sigTop2 = sigTop + 80;
      const sigW3 = (colX[4] - colX[0]) / 3;
      doc.rect(colX[0], sigTop2, sigW3, 70).stroke('#cbd5e1');
      doc.rect(colX[0] + sigW3, sigTop2, sigW3, 70).stroke('#cbd5e1');
      doc.rect(colX[0] + (sigW3 * 2), sigTop2, sigW3, 70).stroke('#cbd5e1');

      doc.font(titleFont).fontSize(7.5);
      doc.text('3. ผู้อำนวยการฝ่าย/ผู้จัดการส่วน', colX[0] + 4, sigTop2 + 5);
      doc.font(regularFont).fontSize(7);
      doc.text('ลงชื่อ ..........................................', colX[0] + 4, sigTop2 + 32);

      doc.font(titleFont).fontSize(7.5);
      doc.text('4. รปภ.จุดทางออกตรวจสอบทรัพย์สิน', colX[0] + sigW3 + 4, sigTop2 + 5);
      doc.font(regularFont).fontSize(7);
      doc.text('ลงชื่อ ..........................................', colX[0] + sigW3 + 4, sigTop2 + 32);

      doc.font(titleFont).fontSize(7.5);
      doc.text('5. หน่วยรักษาความปลอดภัย', colX[0] + (sigW3 * 2) + 4, sigTop2 + 5);
      doc.font(regularFont).fontSize(7);
      doc.text('ลงชื่อ ..........................................', colX[0] + (sigW3 * 2) + 4, sigTop2 + 32);

      doc.end();
    });
  });
});

module.exports = router;
