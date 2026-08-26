const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const { db } = require('../db');
const { verifyToken, staffOnly } = require('../middleware/auth');
const { RESEND_API_KEY, RESEND_FROM } = require('../utils/envValidator');

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// POST /api/email/send (Staff-only with real Resend & simulation fallback + email_logs audit)
router.post('/send', verifyToken, staffOnly, async (req, res) => {
  const { to, subject, html, claim_id } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing email parameters (to, subject, html).' });
  }

  const fromAddress = RESEND_FROM || 'no-reply@claimit.local';
  let status = 'SENT';
  let errorMessage = null;

  if (resend) {
    try {
      await resend.emails.send({
        from: fromAddress,
        to,
        subject,
        html
      });
      status = 'SENT';
    } catch (error) {
      console.error('[EMAIL ERROR]', error.message);
      status = 'FAILED';
      errorMessage = error.message;
    }
  } else {
    status = 'SIMULATED';
    console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
  }

  // Record dispatch in email_logs
  db.run(
    `INSERT INTO email_logs (claim_id, recipient, subject, template_name, status, error_message)
     VALUES (?, ?, ?, 'MANUAL_DISPATCH', ?, ?)`,
    [claim_id || null, to, subject, status, errorMessage],
    function(dbErr) {
      if (dbErr) console.error('[EMAIL LOG ERROR]', dbErr.message);

      if (status === 'FAILED') {
        return res.status(500).json({ error: 'Failed to send email via provider', details: errorMessage });
      }

      res.json({
        success: true,
        status,
        message: status === 'SIMULATED' 
          ? 'จำลองการส่งอีเมลเรียบร้อย (Simulation Mode)' 
          : 'ส่งอีเมลแจ้งเตือนสำเร็จเรียบร้อยแล้ว'
      });
    }
  );
});

module.exports = router;
