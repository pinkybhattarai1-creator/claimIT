/**
 * ClaimIT Evidence Attachment Route Handler
 * Provides secure file upload, metadata storage, and authorized file streaming with IDOR protection.
 */

const express = require('express');
const router = express.Router();
const { verifyToken, staffOnly } = require('../middleware/auth');
const { upload, recordEvidence, getEvidenceForUser, deleteEvidence, EVIDENCE_STORAGE_DIR } = require('../services/evidenceService');
const { parseDocumentEvidence, parseReceiptText, crossCheckSerialNumber, sanitizePersonalData } = require('../services/ocrService');
const { db } = require('../db');
const path = require('path');

// POST /api/evidence/upload (Upload evidence file with optional auto-OCR parsing)
router.post('/upload', verifyToken, staffOnly, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' });
    }

    try {
      const { claim_id, asset_tag, run_ocr, raw_text } = req.body;
      const result = await recordEvidence({
        claim_id: claim_id ? parseInt(claim_id, 10) : null,
        asset_tag: asset_tag ? String(asset_tag).trim().toUpperCase() : null,
        uploader: req.user.username,
        originalname: req.file.originalname,
        storageKey: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      let ocrResult = null;
      if (run_ocr === 'true' || run_ocr === true || raw_text) {
        const filePath = path.join(EVIDENCE_STORAGE_DIR, req.file.filename);
        ocrResult = await parseDocumentEvidence(filePath, raw_text || '');

        if (asset_tag) {
          const cleanTag = String(asset_tag).trim().toUpperCase();
          const asset = await new Promise((resolve) => {
            db.get("SELECT serial_no, category FROM mains WHERE (UPPER(asset_tag) = ? OR UPPER(serial_no) = ?) AND is_deleted = 0", [cleanTag, cleanTag], (e, r) => resolve(r));
          });
          if (asset) {
            ocrResult.serial_validation = crossCheckSerialNumber(ocrResult.extracted_serial_number, asset.serial_no);
          }
        }
      }

      res.status(201).json({
        message: 'อัปโหลดไฟล์หลักฐานสำเร็จ',
        evidence: result,
        ocr: ocrResult
      });
    } catch (dbErr) {
      next(dbErr);
    }
  });
});

// POST /api/evidence/ocr-extract (Direct OCR text or evidence parsing with PDPA mask & serial cross-check)
router.post('/ocr-extract', verifyToken, staffOnly, async (req, res, next) => {
  try {
    const { text, evidence_id, asset_tag } = req.body;

    let ocrData = null;
    if (evidence_id) {
      const { evidence, filePath } = await getEvidenceForUser(evidence_id, req.user);
      ocrData = await parseDocumentEvidence(filePath, text || '');
    } else {
      ocrData = parseReceiptText(text || '');
    }

    let serialValidation = { match: 'not_found', message: 'No asset specified for verification' };
    const targetTag = asset_tag || (evidence_id ? (await new Promise(r => db.get("SELECT asset_tag FROM evidence WHERE id = ?", [evidence_id], (e, row) => r(row ? row.asset_tag : null)))) : null);

    if (targetTag) {
      const cleanTag = String(targetTag).trim().toUpperCase();
      const asset = await new Promise((resolve) => {
        db.get("SELECT serial_no, category, device_name FROM mains WHERE (UPPER(asset_tag) = ? OR UPPER(serial_no) = ?) AND is_deleted = 0", [cleanTag, cleanTag], (e, r) => resolve(r));
      });

      if (asset) {
        serialValidation = crossCheckSerialNumber(ocrData.extracted_serial_number, asset.serial_no);
      } else {
        serialValidation = { match: 'not_found', message: `Asset with tag ${cleanTag} not found in database` };
      }
    }

    res.json({
      ocr: ocrData,
      serial_validation: serialValidation
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// GET /api/evidence/:id/view (Secure stream with authentication and permission verification)
router.get('/:id/view', verifyToken, async (req, res, next) => {
  try {
    const evidenceId = req.params.id;
    const { evidence, filePath } = await getEvidenceForUser(evidenceId, req.user);

    res.setHeader('Content-Type', evidence.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(evidence.original_filename)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    
    res.sendFile(filePath);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/evidence/:id (Delete evidence file)
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const evidenceId = req.params.id;
    const result = await deleteEvidence(evidenceId, req.user);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;

