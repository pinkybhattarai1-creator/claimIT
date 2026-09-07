/**
 * ClaimIT Inbound Webhooks Route Handler
 * Allows external authorized service center / vendor systems to push status updates
 * automatically into ClaimIT without manual technician input.
 */

const express = require('express');
const router = express.Router();
const { db, recordAuditLog } = require('../db');
const { transitionClaimStatus, VALID_STATE_TRANSITIONS } = require('../services/claimService');
const { handleDbError } = require('../utils/safeError');

const EXPECTED_WEBHOOK_KEY = process.env.VENDOR_WEBHOOK_KEY || 'claimit_vendor_webhook_secret_2026';

// Middleware to authenticate vendor webhook requests
function verifyWebhookKey(req, res, next) {
  const incomingKey = req.headers['x-vendor-webhook-key'];
  if (!incomingKey || incomingKey !== EXPECTED_WEBHOOK_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-Vendor-Webhook-Key' });
  }
  next();
}

// POST /api/webhooks/vendor-update (Inbound Vendor Status Update)
router.post('/vendor-update', verifyWebhookKey, async (req, res) => {
  const { 
    vendor_rma_number, 
    status, 
    notes, 
    expected_return_date, 
    actual_return_date, 
    replacement_serial_no, 
    repair_cost 
  } = req.body;

  if (!vendor_rma_number || !String(vendor_rma_number).trim()) {
    return res.status(400).json({ error: 'กรุณาระบุ vendor_rma_number' });
  }

  const cleanRma = String(vendor_rma_number).trim();

  // Find corresponding claim in claims table
  db.get('SELECT * FROM claims WHERE UPPER(vendor_rma_number) = UPPER(?) AND is_deleted = 0', [cleanRma], async (err, claim) => {
    if (err) {
      return res.status(500).json({ error: 'Database query error during webhook processing' });
    }

    if (claim) {
      try {
        let updatedClaim = claim;

        // If a status update is requested and differs from current status
        if (status && status !== claim.status) {
          const allowedTransitions = VALID_STATE_TRANSITIONS[claim.status] || [];
          if (allowedTransitions.includes(status)) {
            updatedClaim = await transitionClaimStatus({
              claim_id: claim.id,
              new_status: status,
              user: { username: 'vendor_webhook' },
              notes: notes ? ('[Vendor Update] ' + notes) : undefined,
              resolution_type: status === 'RETURNED' ? 'Repaired' : undefined,
              replacement_serial_no,
              repair_cost
            });
          }
        }

        // Update additional metadata fields if provided
        const updates = [];
        const params = [];

        if (expected_return_date) {
          updates.push('expected_return_date = ?');
          params.push(expected_return_date);
        }
        if (notes) {
          updates.push("notes = COALESCE(notes || '\n', '') || ?");
          params.push(`[${new Date().toISOString().slice(0, 19)}] Vendor Update: ${notes}`);
        }
        if (repair_cost !== undefined && repair_cost !== null) {
          updates.push('repair_cost = ?');
          params.push(parseFloat(repair_cost) || 0);
        }
        if (replacement_serial_no) {
          updates.push('replacement_serial_no = ?');
          params.push(replacement_serial_no);
        }

        if (updates.length > 0) {
          params.push(claim.id);
          db.run(`UPDATE claims SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        recordAuditLog(db, {
          asset_tag: claim.claim_number,
          department_name: 'Vendor RMA',
          floor: 'External',
          status: status || claim.status,
          moved_direction: 'WEBHOOK',
          action_by_username: 'vendor_api',
          details: `Webhook RMA Update (${cleanRma}): ${notes || status || 'Updated details'}`
        });

        return res.json({
          message: 'อัปเดตข้อมูลจากศูนย์บริการสำเร็จ',
          vendor_rma_number: cleanRma,
          claim_id: claim.id,
          claim_number: claim.claim_number,
          status: updatedClaim.status
        });
      } catch (transErr) {
        return res.status(400).json({ error: transErr.message });
      }
    }

    // Fallback: check legacy rma_claims table
    db.get('SELECT * FROM rma_claims WHERE UPPER(vendor_rma_number) = UPPER(?) AND is_deleted = 0', [cleanRma], (rmaErr, rmaRow) => {
      if (rmaErr) return res.status(500).json({ error: 'Database error' });
      if (!rmaRow) {
        return res.status(404).json({ error: `ไม่พบใบเคลมที่ตรงกับหมายเลข RMA: ${cleanRma}` });
      }

      const updates = [];
      const params = [];
      if (status) { updates.push('status = ?'); params.push(status); }
      if (expected_return_date) { updates.push('expected_return_date = ?'); params.push(expected_return_date); }
      if (actual_return_date) { updates.push('resolved_date = ?'); params.push(actual_return_date); }
      if (repair_cost !== undefined) { updates.push('repair_cost = ?'); params.push(parseFloat(repair_cost) || 0); }
      if (replacement_serial_no) { updates.push('replacement_serial_no = ?'); params.push(replacement_serial_no); }

      if (updates.length > 0) {
        params.push(rmaRow.id);
        db.run(`UPDATE rma_claims SET ${updates.join(', ')} WHERE id = ?`, params, (updErr) => {
          if (updErr) return handleDbError(res, updErr);
          
          recordAuditLog(db, {
            asset_tag: rmaRow.asset_tag,
            department_name: 'Vendor RMA',
            floor: 'External',
            status: status || rmaRow.status,
            moved_direction: 'WEBHOOK',
            action_by_username: 'vendor_api',
            details: `Webhook Legacy RMA Update (${cleanRma})`
          });

          res.json({
            message: 'อัปเดตข้อมูล RMA สำเร็จ',
            vendor_rma_number: cleanRma,
            asset_tag: rmaRow.asset_tag
          });
        });
      } else {
        res.json({ message: 'ไม่มีข้อมูลให้อัปเดต', vendor_rma_number: cleanRma });
      }
    });
  });
});

module.exports = router;
