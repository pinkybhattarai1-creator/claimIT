const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const { verifyToken, staffOnly } = require('../middleware/auth');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// POST /api/email/send (Staff-only, real Resend)
router.post('/send', verifyToken, staffOnly, async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing email parameters (to, subject, html).' });
  }
  if (!resend) {
    return res.status(503).json({ error: 'Email service not configured. Set RESEND_API_KEY in .env.' });
  }
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'no-reply@claimit.local',
      to,
      subject,
      html
    });
    res.json({ success: true, message: 'Email sent successfully.' });
  } catch (error) {
    console.error('Resend error:', error);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

module.exports = router;
