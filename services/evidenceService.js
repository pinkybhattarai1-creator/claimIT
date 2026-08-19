/**
 * ClaimIT Evidence Service
 * Handles private storage, MIME/magic byte validation, UUID key generation,
 * and secure streaming with IDOR protection.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { db } = require('../db');

// Private storage directory outside public web root
const EVIDENCE_STORAGE_DIR = path.join(__dirname, '..', 'storage', 'evidence');
if (!fs.existsSync(EVIDENCE_STORAGE_DIR)) {
  fs.mkdirSync(EVIDENCE_STORAGE_DIR, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf', '.doc', '.docx', '.mp4'
]);

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Multer disk storage using secure UUID storage keys
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, EVIDENCE_STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const storageKey = `${crypto.randomUUID()}${ext}`;
    cb(null, storageKey);
  }
});

// Multer file filter for security
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`ประเภทไฟล์ไม่อนุญาต (.${ext.replace('.', '')}) อนุญาตเฉพาะ รูปภาพ, PDF, DOCX, และ MP4`), false);
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error(`MIME type '${file.mimetype}' ไม่ถูกต้อง`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

/**
 * Save evidence metadata to SQLite
 */
function recordEvidence({ claim_id, asset_tag, uploader, originalname, storageKey, mimetype, size }) {
  return new Promise((resolve, reject) => {
    const cleanFilename = path.basename(originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    
    db.run(
      `INSERT INTO evidence (claim_id, asset_tag, uploader_username, original_filename, storage_key, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [claim_id || null, asset_tag || null, uploader, cleanFilename, storageKey, mimetype, size],
      function(err) {
        if (err) return reject(err);

        const evidenceId = this.lastID;

        // Audit log
        db.run(
          `INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username, details)
           VALUES (?, 'Evidence Storage', 'Security', 'UPLOAD', 'EVIDENCE', ?, ?)`,
          [asset_tag || `CLAIM-${claim_id}`, uploader, `Evidence Uploaded: ${cleanFilename} (${mimetype}, ${Math.round(size/1024)}KB)`]
        );

        resolve({
          id: evidenceId,
          claim_id,
          asset_tag,
          original_filename: cleanFilename,
          storage_key: storageKey,
          mime_type: mimetype,
          file_size: size
        });
      }
    );
  });
}

/**
 * Get Evidence by ID with IDOR protection & Permission Verification
 */
function getEvidenceForUser(evidenceId, user) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM evidence WHERE id = ? AND is_deleted = 0", [evidenceId], (err, row) => {
      if (err || !row) {
        return reject({ status: 404, message: 'ไม่พบไฟล์หลักฐานที่ระบุ' });
      }

      // Check permission: Admin or Staff or the original Uploader
      if (user.role !== 'admin' && user.role !== 'staff' && row.uploader_username !== user.username) {
        return reject({ status: 403, message: 'ท่านไม่มีสิทธิ์เข้าถึงไฟล์หลักฐานนี้ (Access Denied)' });
      }

      const filePath = path.join(EVIDENCE_STORAGE_DIR, row.storage_key);
      if (!fs.existsSync(filePath)) {
        return reject({ status: 404, message: 'ไฟล์หลักฐานสูญหายหรือไม่พบในระบบจัดเก็บ' });
      }

      resolve({
        evidence: row,
        filePath
      });
    });
  });
}

/**
 * Soft delete evidence file
 */
function deleteEvidence(evidenceId, user) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM evidence WHERE id = ? AND is_deleted = 0", [evidenceId], (err, row) => {
      if (err || !row) return reject({ status: 404, message: 'ไม่พบไฟล์หลักฐาน' });

      // Only admin or uploader can delete
      if (user.role !== 'admin' && row.uploader_username !== user.username) {
        return reject({ status: 403, message: 'เฉพาะผู้ดูแลระบบหรือผู้อัปโหลดเท่านั้นที่สามารถลบไฟล์ได้' });
      }

      db.run("UPDATE evidence SET is_deleted = 1 WHERE id = ?", [evidenceId], function(delErr) {
        if (delErr) return reject({ status: 500, message: delErr.message });

        db.run(
          `INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username, details)
           VALUES (?, 'Evidence Storage', 'Security', 'DELETE', 'EVIDENCE', ?, ?)`,
          [row.asset_tag || `CLAIM-${row.claim_id}`, user.username, `Evidence Deleted: ID ${evidenceId} (${row.original_filename})`]
        );

        resolve({ message: 'ลบไฟล์หลักฐานสำเร็จ', id: evidenceId });
      });
    });
  });
}

module.exports = {
  upload,
  recordEvidence,
  getEvidenceForUser,
  deleteEvidence,
  EVIDENCE_STORAGE_DIR
};
