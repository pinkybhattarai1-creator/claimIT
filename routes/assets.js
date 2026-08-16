const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { db } = require('../db');
const { evaluateClaimWorthiness } = require('../claim_calculator');
const { verifyToken, staffOnly } = require('../middleware/auth');

// Get All Assets with optional pagination
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  
  db.all("SELECT * FROM mains WHERE is_deleted = 0 ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT COUNT(*) as total FROM mains WHERE is_deleted = 0", (cntErr, cntRow) => {
      if (cntErr) return res.status(500).json({ error: cntErr.message });
      res.json({ total: cntRow.total, page, limit, assets: rows });
    });
  });
});

// Create New Asset
router.post('/', (req, res) => {
  const { asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, action_by_username } = req.body;
  
  if (!asset_tag || !category || !brand || !model || !serial_no || !device_name || !location || !warranty_start || !warranty_end) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลครุภัณฑ์ให้ครบถ้วน' });
  }

  const sReq = sanitization_required ? 1 : 0;

  db.run(`INSERT INTO mains (asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Working')`,
    [asset_tag, category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sReq],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'รหัสครุภัณฑ์หรือ Serial Number นี้มีอยู่ในระบบแล้ว' });
        }
        return res.status(500).json({ error: err.message });
      }

      db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, ?, 'Fl 1', 'Working', 'IN', ?)`, 
        [asset_tag, location, action_by_username || 'system']);

      res.json({ id: this.lastID, asset_tag, message: 'ลงทะเบียนครุภัณฑ์ใหม่สำเร็จ' });
    }
  );
});

// Update Asset Details
router.put('/:tag', (req, res) => {
  const { category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required, status } = req.body;
  const tag = req.params.tag;

  db.run(`UPDATE mains SET category=?, brand=?, model=?, serial_no=?, device_name=?, location=?, warranty_start=?, warranty_end=?, sanitization_required=?, status=?
          WHERE asset_tag=? AND is_deleted=0`,
    [category, brand, model, serial_no, device_name, location, warranty_start, warranty_end, sanitization_required ? 1 : 0, status, tag],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'อัปเดตข้อมูลครุภัณฑ์สำเร็จ' });
    }
  );
});

// Soft Delete Asset
router.delete('/:tag', (req, res) => {
  db.run("UPDATE mains SET is_deleted = 1 WHERE asset_tag = ?", [req.params.tag], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'ลบรายการครุภัณฑ์สำเร็จ' });
  });
});

// Evaluate Claim Worthiness Endpoint
router.get('/:tag/evaluate', (req, res) => {
  db.get("SELECT * FROM mains WHERE asset_tag = ? AND is_deleted = 0", [req.params.tag], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Asset not found' });
    
    const evaluationPayload = {
      assetId: row.asset_tag,
      purchaseDate: row.warranty_start,
      purchasePrice: row.category === 'Computer' ? 18000 : (row.category === 'Tablet' ? 22000 : 4500),
      warrantyMonths: 36,
      expectedLifespanMonths: 60,
      status: row.status
    };
    
    const result = evaluateClaimWorthiness(evaluationPayload);
    res.json(result);
  });
});

// Lookup Asset by Tag/Serial with Fuzzy Matching Fallback
router.get('/:tag', (req, res) => {
  const tag = req.params.tag.toUpperCase();
  db.get("SELECT m.*, r.vendor_name, r.vendor_rma_number, r.claim_date, r.expected_return_date, r.data_wiped_confirmed as rma_data_wiped_confirmed, r.status as rma_status FROM mains m LEFT JOIN rma_claims r ON m.asset_tag = r.asset_tag AND r.is_deleted = 0 WHERE (m.asset_tag = ? OR m.serial_no = ?) AND m.is_deleted = 0", [tag, tag], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      res.json(row);
    } else {
      db.all("SELECT m.*, r.vendor_name, r.vendor_rma_number, r.claim_date, r.expected_return_date, r.data_wiped_confirmed as rma_data_wiped_confirmed, r.status as rma_status FROM mains m LEFT JOIN rma_claims r ON m.asset_tag = r.asset_tag AND r.is_deleted = 0 WHERE m.is_deleted = 0", [], (err, rows) => {
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

        if (tag.length < 3) {
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

// Update Asset Status
router.post('/update-status', (req, res) => {
  const { asset_tag, status, location, action_by_username, department_name, floor } = req.body;
  if (!asset_tag || !status || !action_by_username) return res.status(400).json({ error: 'Missing fields' });

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
          [asset_tag, logDept, logFloor, status, movedDirection, action_by_username]);
        res.json({ message: 'Asset status updated', status, location: newLocation });
      });
    });
  });
});

// Confirm Data Sanitization (PDPA Safeguard)
router.post('/sanitize', (req, res) => {
  const { asset_tag, action_by_username } = req.body;
  if (!asset_tag || !action_by_username) return res.status(400).json({ error: 'Missing fields' });

  db.serialize(() => {
    db.run("INSERT OR IGNORE INTO rma_claims (asset_tag, vendor_name, vendor_rma_number, claim_date, expected_return_date, data_wiped_confirmed, status) VALUES (?, '', '', '', '', 1, 'Sanitized')", [asset_tag], function(err) {
      db.run("UPDATE rma_claims SET data_wiped_confirmed = 1 WHERE asset_tag = ? AND is_deleted = 0", [asset_tag], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to confirm sanitization' });
        
        db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, 'Technical Support', 'Fl 4', 'Sanitized', 'IN', ?)`, 
          [asset_tag, action_by_username]);
        res.json({ message: 'การลบข้อมูล (Sanitization) เสร็จสิ้น' });
      });
    });
  });
});

// Initiate RMA / Warranty Claim
router.post('/claim', (req, res) => {
  const { asset_tag, vendor_name, vendor_rma_number, expected_return_date, data_wiped_confirmed, action_by_username } = req.body;
  if (!asset_tag || !vendor_name || !vendor_rma_number || !action_by_username) return res.status(400).json({ error: 'Missing fields' });

  const claimDate = new Date().toISOString().split('T')[0];
  const wiped = data_wiped_confirmed ? 1 : 0;

  db.serialize(() => {
    db.run(`INSERT INTO rma_claims (asset_tag, vendor_name, vendor_rma_number, claim_date, expected_return_date, data_wiped_confirmed, status)
            VALUES (?, ?, ?, ?, ?, ?, 'Out to Vendor')
            ON CONFLICT(asset_tag) DO UPDATE SET 
              vendor_name = excluded.vendor_name, vendor_rma_number = excluded.vendor_rma_number, claim_date = excluded.claim_date, expected_return_date = excluded.expected_return_date, data_wiped_confirmed = excluded.data_wiped_confirmed, status = 'Out to Vendor'`, 
      [asset_tag, vendor_name, vendor_rma_number, claimDate, expected_return_date, wiped], 
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        db.run("UPDATE mains SET status = 'Pending Pickup' WHERE asset_tag = ?", [asset_tag], function(err) {
          if (err) return res.status(500).json({ error: 'Failed to update asset status' });

          db.run(`INSERT INTO move_log (asset_tag, department_name, floor, status, moved_direction, action_by_username) VALUES (?, ?, 'External', 'Pending Pickup', 'OUT', ?)`, 
            [asset_tag, vendor_name, action_by_username]);
          res.json({ message: 'รอศูนย์บริการเข้ามารับ', asset_tag, status: 'Pending Pickup' });
        });
      }
    );
  });
});

// PDF Generation for Claim Report
router.get('/:tag/pdf', verifyToken, staffOnly, (req, res) => {
  const tag = req.params.tag.toUpperCase();
  db.get("SELECT * FROM mains WHERE asset_tag = ? AND is_deleted = 0", [tag], (err, asset) => {
    if (err || !asset) return res.status(404).json({ error: 'Asset not found' });
    const doc = new PDFDocument();
    const filename = `claim_${tag}.pdf`;
    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);
    doc.fontSize(20).text('Claim Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Asset Tag: ${asset.asset_tag}`);
    doc.text(`Category: ${asset.category}`);
    doc.text(`Brand: ${asset.brand}`);
    doc.text(`Model: ${asset.model}`);
    doc.text(`Serial No: ${asset.serial_no}`);
    doc.text(`Location: ${asset.location}`);
    doc.text(`Warranty: ${asset.warranty_start} – ${asset.warranty_end}`);
    doc.text(`Status: ${asset.status}`);
    doc.end();
  });
});

module.exports = router;
