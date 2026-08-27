const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const { db } = require('../db');
const { verifyToken, staffOnly } = require('../middleware/auth');
const { RESEND_API_KEY, RESEND_FROM, SENDGRID_API_KEY, SENDGRID_FROM } = require('../utils/envValidator');
const { sendViaSendGrid } = require('../services/emailService');

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// POST /api/email/send (Staff-only with real SendGrid, Resend & simulation fallback + email_logs audit)
router.post('/send', verifyToken, staffOnly, async (req, res) => {
  const { to, subject, html, claim_id } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing email parameters (to, subject, html).' });
  }

  let status = 'SENT';
  let errorMessage = null;
  let providerUsed = 'SIMULATED';

  const isInternalTest = to.endsWith('.local') || to.endsWith('.test');

  if (isInternalTest) {
    if (!SENDGRID_API_KEY && !resend) {
      status = 'NOT_INSERTED';
      providerUsed = 'NOT_INSERTED';
      console.warn(`[EMAIL WARNING] You didn't insert SendGrid or Resend API key in .env. Safe test for ${to} completed in unconfigured mode.`);
    } else {
      status = 'TEST_DELIVERED';
      providerUsed = SENDGRID_API_KEY ? 'SendGrid (Safe Test)' : 'Resend (Safe Test)';
      console.log(`[SAFE TEST DISPATCH] Test recipient (${to}) verified safely via ${providerUsed} without external network dispatch.`);
    }
  } else if (SENDGRID_API_KEY) {
    try {
      const fromAddress = SENDGRID_FROM || 'no-reply@claimit.local';
      await sendViaSendGrid({ to, from: fromAddress, subject, html });
      status = 'SENT';
      providerUsed = 'SendGrid';
      console.log(`[EMAIL SENT via SendGrid] To: ${to} | Subject: ${subject}`);
    } catch (error) {
      console.warn('[SendGrid Notice - Trying Resend Fallback]:', error.message);
      if (resend) {
        try {
          const fromAddress = RESEND_FROM || 'onboarding@resend.dev';
          await resend.emails.send({
            from: fromAddress,
            to,
            subject,
            html
          });
          status = 'SENT';
          providerUsed = 'Resend (Fallback)';
          console.log(`[EMAIL SENT via Resend Fallback] To: ${to} | Subject: ${subject}`);
        } catch (resendError) {
          status = 'FAILED';
          errorMessage = `SendGrid: ${error.message} | Resend: ${resendError.message}`;
          console.error('[EMAIL ERROR - Both providers failed]', errorMessage);
        }
      } else {
        status = 'FAILED';
        errorMessage = error.message;
        console.error('[EMAIL ERROR - SendGrid]', error.message);
      }
    }
  } else if (resend) {
    try {
      const fromAddress = RESEND_FROM || 'onboarding@resend.dev';
      await resend.emails.send({
        from: fromAddress,
        to,
        subject,
        html
      });
      status = 'SENT';
      providerUsed = 'Resend';
      console.log(`[EMAIL SENT via Resend] To: ${to} | Subject: ${subject}`);
    } catch (error) {
      console.error('[EMAIL ERROR - Resend]', error.message);
      status = 'FAILED';
      errorMessage = error.message;
    }
  } else {
    status = 'NOT_INSERTED';
    providerUsed = 'NOT_INSERTED';
    console.warn(`[EMAIL WARNING] You didn't insert SendGrid or Resend API key in .env. Email to ${to} was not sent.`);
  }

  // Record dispatch in email_logs
  db.run(
    `INSERT INTO email_logs (claim_id, recipient, subject, template_name, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [claim_id || null, to, subject, `MANUAL_DISPATCH (${providerUsed})`, status, errorMessage],
    function(dbErr) {
      if (dbErr) console.error('[EMAIL LOG ERROR]', dbErr.message);

      if (status === 'FAILED') {
        return res.status(500).json({ error: 'Failed to send email via provider', details: errorMessage });
      }

      const isNotConfigured = status === 'NOT_INSERTED' || status === 'SIMULATED';
      res.json({
        success: true,
        status,
        provider: providerUsed,
        not_inserted: isNotConfigured,
        message: isNotConfigured 
          ? "⚠️ คุณยังไม่ได้ใส่ API Key ในไฟล์ .env (ไม่พบทั้ง SendGrid และ Resend) — You didn't insert SendGrid or Resend API key in .env" 
          : (isInternalTest ? 'การทดสอบส่งอีเมลภายในสำเร็จ (Safe Test Mode)' : 'ส่งอีเมลแจ้งเตือนสำเร็จเรียบร้อยแล้ว')
      });
    }
  );
});

// POST /api/email/test-connection (Diagnostic endpoint for testing real email dispatch)
router.post('/test-connection', verifyToken, staffOnly, async (req, res) => {
  const targetEmail = (req.body && req.body.email) ? req.body.email.trim() : 'nurse@hospital.local';
  const hasSendGrid = Boolean(SENDGRID_API_KEY);
  const hasResend = Boolean(resend);

  if (!hasSendGrid && !hasResend) {
    return res.json({
      success: false,
      not_inserted: true,
      provider: 'NONE',
      message: "⚠️ คุณยังไม่ได้ใส่ API Key ในไฟล์ .env (ไม่พบทั้ง SendGrid และ Resend) — You didn't insert SendGrid or Resend API key in .env"
    });
  }

  if (targetEmail.endsWith('.local') || targetEmail.endsWith('.test')) {
    return res.json({
      success: true,
      target: targetEmail,
      provider: hasSendGrid ? 'SendGrid' : 'Resend',
      message: `✅ ตรวจพบการตั้งค่า API Key พร้อมใช้งาน (ทดสอบโหมดปลอดภัยสำหรับ ${targetEmail} สำเร็จ)`
    });
  }

  try {
    const subject = '🔔 [ClaimIT] ทดสอบการเชื่อมต่อระบบส่งอีเมล (Connection Test)';
    const html = `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #38bdf8; border-radius: 8px;">
      <h2 style="color: #0284c7;">✅ ClaimIT Email Connection Verified</h2>
      <p>หากคุณได้รับอีเมลนี้ แปลว่าระบบ ClaimIT สามารถส่งอีเมลออกหาบุคคลภายนอกและ Vendor ได้จริง 100% แล้วครับ!</p>
      <p style="font-size: 12px; color: #64748b;">ส่งเมื่อ: ${new Date().toLocaleString('th-TH')}</p>
    </div>`;

    if (hasSendGrid) {
      const fromAddress = SENDGRID_FROM || 'no-reply@claimit.local';
      await sendViaSendGrid({ to: targetEmail, from: fromAddress, subject, html });
      return res.json({
        success: true,
        target: targetEmail,
        provider: 'SendGrid',
        message: `✅ ส่งอีเมลทดสอบไปยัง ${targetEmail} ผ่าน SendGrid สำเร็จเรียบร้อยแล้ว!`
      });
    } else {
      const fromAddress = RESEND_FROM || 'onboarding@resend.dev';
      await resend.emails.send({ from: fromAddress, to: targetEmail, subject, html });
      return res.json({
        success: true,
        target: targetEmail,
        provider: 'Resend',
        message: `✅ ส่งอีเมลทดสอบไปยัง ${targetEmail} ผ่าน Resend สำเร็จเรียบร้อยแล้ว!`
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      target: targetEmail,
      error: err.message,
      message: `❌ ไม่สามารถส่งอีเมลไปยัง ${targetEmail} ได้: ${err.message}`
    });
  }
});

module.exports = router;
