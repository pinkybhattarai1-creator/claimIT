/**
 * ClaimIT Evidence Attachment Route Handler
 * Provides secure file upload, metadata storage, and authorized file streaming with IDOR protection.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const { db } = require('../db');
const { verifyToken, staffOnly } = require('../middleware/auth');
const { upload, recordEvidence, getEvidenceForUser, deleteEvidence, validateMagicBytes } = require('../services/evidenceService');
const { handleDbError } = require('../utils/safeError');

// GET /api/evidence/claim/:claim_id (Fetch attached evidence for a specific claim)
router.get('/claim/:claim_id', verifyToken, staffOnly, (req, res, next) => {
  const claimId = parseInt(req.params.claim_id, 10);
  if (!claimId) return res.status(400).json({ error: 'Invalid claim ID' });

  db.all(
    `SELECT id, claim_id, asset_tag, uploader_username, original_filename, storage_key, mime_type, mime_type as file_type, file_size, COALESCE(doc_type, 'GENERAL') as doc_type, created_at 
     FROM evidence 
     WHERE claim_id = ? AND is_deleted = 0 
     ORDER BY id DESC`,
    [claimId],
    (err, rows) => {
      if (err) return next(err);
      res.json(rows || []);
    }
  );
});

// GET /api/evidence/asset/:asset_tag (Fetch attached evidence for a specific asset tag)
router.get('/asset/:asset_tag', verifyToken, staffOnly, (req, res, next) => {
  const assetTag = String(req.params.asset_tag).trim().toUpperCase();
  if (!assetTag) return res.status(400).json({ error: 'Invalid asset tag' });

  db.all(
    `SELECT id, claim_id, asset_tag, uploader_username, original_filename, storage_key, mime_type, mime_type as file_type, file_size, COALESCE(doc_type, 'GENERAL') as doc_type, created_at 
     FROM evidence 
     WHERE UPPER(asset_tag) = ? AND is_deleted = 0 
     ORDER BY id DESC`,
    [assetTag],
    (err, rows) => {
      if (err) return next(err);
      res.json(rows || []);
    }
  );
});

// POST /api/evidence/upload (Upload evidence file with size, MIME & Magic Byte validation)
router.post('/upload', verifyToken, staffOnly, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ 
        error: err.code === 'LIMIT_FILE_SIZE' 
          ? 'ขนาดไฟล์เกินขีดจำกัด (สูงสุด 10MB)' 
          : 'การอัปโหลดไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์ภาพหรือเอกสารที่ระบบรองรับ' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' });
    }

    // Zero-dependency Magic Byte inspection directly from file contents on disk
    const magicResult = validateMagicBytes(req.file.path);
    if (!magicResult.valid) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({
        error: 'ประเภทไฟล์ไม่ถูกต้องตามโครงสร้างจริง (Invalid file signature / Magic bytes mismatch)'
      });
    }

    try {
      const { claim_id, asset_tag, doc_type } = req.body;
      const result = await recordEvidence({
        claim_id: claim_id ? parseInt(claim_id, 10) : null,
        asset_tag: asset_tag ? String(asset_tag).trim().toUpperCase() : null,
        uploader: req.user.username,
        originalname: req.file.originalname,
        storageKey: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        doc_type: doc_type || 'GENERAL'
      });

      res.status(201).json({
        message: 'อัปโหลดไฟล์หลักฐานสำเร็จ',
        evidence: result
      });
    } catch (dbErr) {
      return handleDbError(res, dbErr);
    }
  });
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
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ error: err.message });
    }
    return handleDbError(res, err);
  }
});

// DELETE /api/evidence/:id (Delete evidence file)
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const evidenceId = req.params.id;
    const result = await deleteEvidence(evidenceId, req.user);
    res.json(result);
  } catch (err) {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ error: err.message });
    }
    return handleDbError(res, err);
  }
});

module.exports = router;
