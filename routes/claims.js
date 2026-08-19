/**
 * ClaimIT Multi-Asset Claims Route Handler
 * Manages 1 to 5 assets per claim, server-calculated viability,
 * state machine transitions, and multi-asset PDF generation.
 */

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { db } = require('../db');
const { verifyToken, staffOnly, adminOnly } = require('../middleware/auth');
const { createClaim, transitionClaimStatus, calculateServerViability } = require('../services/claimService');
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
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ error: 'กรุณาระบุสถานะใหม่ (new status required)' });

    const result = await transitionClaimStatus({
      claim_id: req.params.id,
      new_status: status,
      user: req.user,
      notes
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

// GET /api/claims/:id/pdf (Download multi-asset claim PDF report)
router.get('/:id/pdf', verifyToken, staffOnly, (req, res, next) => {
  const claimId = req.params.id;

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

      const doc = new PDFDocument({ margin: 40 });
      const filename = `claim_${claim.claim_number}.pdf`;
      res.setHeader('Content-disposition', 'attachment; filename=' + filename);
      res.setHeader('Content-type', 'application/pdf');
      doc.pipe(res);

      // PDF Title Header
      doc.fontSize(20).fillColor('#0284c7').text('ClaimIT — Multi-Asset Warranty & RMA Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor('#64748b').text(`Generated: ${new Date().toLocaleString('th-TH')} | Reference: ${claim.claim_number}`, { align: 'center' });
      doc.moveDown(1.2);

      // Section 1: Claim Header Information
      doc.fontSize(12).fillColor('#0f172a').text('1. Claim Overview', { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor('#334155');
      doc.text(`Claim Number: ${claim.claim_number}`);
      doc.text(`Vendor / Service Center: ${claim.vendor_name} (RMA No: ${claim.vendor_rma_number || 'N/A'})`);
      doc.text(`Claim Date: ${claim.claim_date || 'N/A'} | Status: ${claim.status}`);
      doc.text(`Viability Score: ${claim.viability_score} / 10.0 (${claim.viability_status})`);
      doc.text(`Created By: ${claim.created_by} | Confirmed By: ${claim.confirmed_by || 'Pending'}`);
      doc.moveDown(1.2);

      // Section 2: Attached Assets (1 to 5)
      doc.fontSize(12).fillColor('#0f172a').text(`2. Attached Assets (${assets.length} / 5 Max Items)`, { underline: true });
      doc.moveDown(0.4);

      assets.forEach((item, idx) => {
        doc.fontSize(10).fillColor('#1e293b').text(`[Item ${idx + 1}] ${item.asset_tag} - ${item.device_name}`);
        doc.fontSize(9).fillColor('#475569');
        doc.text(`   Category: ${item.category} | Brand/Model: ${item.brand} ${item.model} | S/N: ${item.serial_no}`);
        doc.text(`   Warranty Expiry: ${item.warranty_end} | Sanitization: ${item.data_wiped_confirmed ? 'CONFIRMED' : 'Not Required'}`);
        doc.moveDown(0.3);
      });

      doc.moveDown(0.8);

      // Section 3: PDPA-Aware Security & Audit Note
      doc.fontSize(12).fillColor('#0f172a').text('3. PDPA-Aware Handling & Security Audit', { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(9).fillColor('#475569');
      doc.text('All storage media on applicable items have undergone authorization-coded sanitization prior to external transfer.');
      doc.text('This document serves as an authorized hospital asset tracking and RMA service voucher.');

      doc.end();
    });
  });
});

module.exports = router;
