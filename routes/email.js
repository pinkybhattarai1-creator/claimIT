const express = require('express');
const router = express.Router();
const sgMail = require('@sendgrid/mail');
const { verifyToken, staffOnly } = require('../middleware/auth');

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// POST /api/email/send (Staff-only, real SendGrid)
router.post('/send', verifyToken, staffOnly, async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing email parameters (to, subject, html).' });
  }
  try {
    await sgMail.send({ to, from: process.env.SENDGRID_FROM || 'no-reply@claimit.local', subject, html });
    res.json({ success: true, message: 'Email sent successfully.' });
  } catch (error) {
    console.error('SendGrid error:', error);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

module.exports = router;
