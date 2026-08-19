/**
 * ClaimIT Evidence Attachment Route Handler
 * Provides secure file upload, metadata storage, and authorized file streaming with IDOR protection.
 */

const express = require('express');
const router = express.Router();
const { verifyToken, staffOnly } = require('../middleware/auth');
const { upload, recordEvidence, getEvidenceForUser, deleteEvidence } = require('../services/evidenceService');

// POST /api/evidence/upload (Upload evidence file with size & MIME validation)
router.post('/upload', verifyToken, staffOnly, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' });
    }

    try {
      const { claim_id, asset_tag } = req.body;
      const result = await recordEvidence({
        claim_id: claim_id ? parseInt(claim_id, 10) : null,
        asset_tag: asset_tag ? String(asset_tag).trim().toUpperCase() : null,
        uploader: req.user.username,
        originalname: req.file.originalname,
        storageKey: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      res.status(201).json({
        message: 'อัปโหลดไฟล์หลักฐานสำเร็จ',
        evidence: result
      });
    } catch (dbErr) {
      next(dbErr);
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
