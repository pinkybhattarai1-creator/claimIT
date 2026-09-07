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

const VALID_DOC_TYPES = new Set([
  'DAMAGE_PHOTO',
  'VENDOR_QUOTE',
  'PROOF_OF_DELIVERY',
  'INVOICE',
  'GENERAL'
]);

/**
 * Zero-dependency inspection of file magic bytes directly from disk
 */
function validateMagicBytes(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { valid: false, reason: 'File does not exist' };
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(16);
    const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) return { valid: false, reason: 'File too small' };

    // 1. PNG: 89 50 4E 47 (\x89PNG)
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return { valid: true, detectedType: 'image/png', ext: '.png' };
    }

    // 2. JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return { valid: true, detectedType: 'image/jpeg', ext: '.jpg' };
    }

    // 3. PDF: 25 50 44 46 (%PDF)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return { valid: true, detectedType: 'application/pdf', ext: '.pdf' };
    }

    // 4. GIF: 47 49 46 38 (GIF8)
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return { valid: true, detectedType: 'image/gif', ext: '.gif' };
    }

    // 5. WEBP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
    if (bytesRead >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return { valid: true, detectedType: 'image/webp', ext: '.webp' };
    }

    // 6. DOCX / ZIP: 50 4B 03 04 (PK..)
    if (buffer[0] === 0x50 && buffer[1] === 0x4B && (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) && (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)) {
      return { valid: true, detectedType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: '.docx' };
    }

    // 7. Legacy DOC: D0 CF 11 E0 (OLECF)
    if (buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) {
      return { valid: true, detectedType: 'application/msword', ext: '.doc' };
    }

    // 8. MP4: offset 4 contains 'ftyp' (66 74 79 70)
    if (bytesRead >= 8 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
      return { valid: true, detectedType: 'video/mp4', ext: '.mp4' };
    }

    return { valid: false, reason: 'Unrecognized or untrusted file header signature' };
  } catch (err) {
    return { valid: false, reason: err.message };
  }
}

/**
 * Save evidence metadata to SQLite
 */
function recordEvidence({ claim_id, asset_tag, uploader, originalname, storageKey, mimetype, size, doc_type }) {
  return new Promise((resolve, reject) => {
    const cleanFilename = path.basename(originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const validDocType = VALID_DOC_TYPES.has(doc_type) ? doc_type : 'GENERAL';
    
    db.run(
      `INSERT INTO evidence (claim_id, asset_tag, uploader_username, original_filename, storage_key, mime_type, file_size, doc_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [claim_id || null, asset_tag || null, uploader, cleanFilename, storageKey, mimetype, size, validDocType],
      function(err) {
        if (err) return reject(err);

        const evidenceId = this.lastID;

        // Audit log
        db.run(
          `INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username, details)
           VALUES (?, 'Evidence Storage', 'Security', 'UPLOAD', 'EVIDENCE', ?, ?)`,
          [asset_tag || `CLAIM-${claim_id}`, uploader, `Evidence Uploaded: ${cleanFilename} [${validDocType}] (${mimetype}, ${Math.round(size/1024)}KB)`]
        );

        resolve({
          id: evidenceId,
          claim_id,
          asset_tag,
          original_filename: cleanFilename,
          storage_key: storageKey,
          mime_type: mimetype,
          file_size: size,
          doc_type: validDocType
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

const QUARANTINE_DIR = path.join(EVIDENCE_STORAGE_DIR, '.quarantine');
if (!fs.existsSync(QUARANTINE_DIR)) {
  try { fs.mkdirSync(QUARANTINE_DIR, { recursive: true }); } catch {}
}

/**
 * Soft delete evidence file with quarantine relocation
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

        // Quarantine physical file from active serving directory to preserve audit trail
        const activePath = path.join(EVIDENCE_STORAGE_DIR, row.storage_key);
        const quarantinedPath = path.join(QUARANTINE_DIR, `deleted_${Date.now()}_${row.storage_key}`);
        if (fs.existsSync(activePath)) {
          try {
            fs.renameSync(activePath, quarantinedPath);
          } catch (mvErr) {
            console.warn('[Evidence Quarantine Warning]: Failed to move file to quarantine:', mvErr.message);
          }
        }

        db.run(
          `INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username, details)
           VALUES (?, 'Evidence Storage', 'Security', 'DELETE', 'EVIDENCE', ?, ?)`,
          [row.asset_tag || `CLAIM-${row.claim_id}`, user.username, `Evidence Quarantined & Deleted: ID ${evidenceId} (${row.original_filename})`]
        );

        resolve({ message: 'ลบไฟล์หลักฐานและย้ายสู่พื้นที่กักกันสำเร็จ', id: evidenceId });
      });
    });
  });
}

/**
 * Housekeeping utility to safely purge quarantined files older than retention policy
 */
function purgeOldQuarantinedEvidence(retentionDays = 90) {
  if (!fs.existsSync(QUARANTINE_DIR)) return { purgedCount: 0 };
  const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  let purgedCount = 0;

  try {
    const files = fs.readdirSync(QUARANTINE_DIR);
    files.forEach(f => {
      const filePath = path.join(QUARANTINE_DIR, f);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoffTime) {
        try {
          fs.unlinkSync(filePath);
          purgedCount++;
        } catch {}
      }
    });
  } catch (err) {
    console.error('[Quarantine Purge Error]:', err.message);
  }

  return { purgedCount };
}

module.exports = {
  upload,
  recordEvidence,
  getEvidenceForUser,
  deleteEvidence,
  purgeOldQuarantinedEvidence,
  validateMagicBytes,
  VALID_DOC_TYPES,
  EVIDENCE_STORAGE_DIR,
  QUARANTINE_DIR
};
