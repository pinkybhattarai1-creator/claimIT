const { SENDGRID_API_KEY, SENDGRID_FROM, RESEND_API_KEY, RESEND_FROM } = require('../utils/envValidator');
const { sendViaSendGrid } = require('../services/emailService');
const { Resend } = require('resend');

async function main() {
  const targetEmail = process.argv[2] || 'nurse@hospital.local';
  console.log('===============================================================');
  console.log('📧 ClaimIT Email Provider Diagnostic & Test Tool');
  console.log('===============================================================');
  console.log(`🎯 Target Email: ${targetEmail}`);

  const hasSendGrid = Boolean(SENDGRID_API_KEY);
  const hasResend = Boolean(RESEND_API_KEY);

  console.log(`🔑 SendGrid API Key: ${hasSendGrid ? '✅ CONFIGURED (' + SENDGRID_API_KEY.slice(0, 7) + '...)' : '❌ NOT CONFIGURED'}`);
  console.log(`🔑 Resend API Key:   ${hasResend ? '✅ CONFIGURED (' + RESEND_API_KEY.slice(0, 7) + '...)' : '❌ NOT CONFIGURED'}`);

  if (!hasSendGrid && !hasResend) {
    console.log('\n⚠️ [WARNING] You didn\'t insert SendGrid or Resend API key in .env');
    console.log('👉 เพื่อเปิดใช้งาน กรุณาใส่ SENDGRID_API_KEY หรือ RESEND_API_KEY ในไฟล์ .env');
    console.log('   ดูตัวอย่างและคำแนะนำได้ที่: EMAIL_CONFIG.md\n');
    process.exit(0);
  }

  if (targetEmail.endsWith('.local') || targetEmail.endsWith('.test')) {
    console.log(`\n🛡️ [SAFE TEST MODE] Internal test address (${targetEmail}) detected.`);
    console.log('✅ Configuration check passed. No external email was dispatched.\n');
    console.log('💡 วิธีทดสอบส่งอีเมลจริงเข้ากล่องข้อความของคุณ:');
    console.log('   node scripts/test_email.js your_email@domain.com\n');
    process.exit(0);
  }

  console.log(`\n🚀 Attempting real email dispatch to: ${targetEmail}...`);

  const subject = '🔔 [ClaimIT] ทดสอบการเชื่อมต่อระบบส่งอีเมลสำเร็จ';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; border: 2px solid #0284c7; border-radius: 12px; max-width: 600px;">
      <h2 style="color: #0284c7; margin-top: 0;">🎉 ClaimIT Email Delivery Verified!</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #1e293b;">
        ยินดีด้วยครับ! ระบบ ClaimIT สามารถส่งอีเมลเชื่อมต่อไปยังกล่องข้อความจริงของคุณสำเร็จเรียบร้อยแล้ว
      </p>
      <div style="background: #f1f5f9; padding: 14px; border-radius: 8px; font-size: 13px; color: #475569; margin: 16px 0;">
        📍 <strong>ผู้รับ (To):</strong> ${targetEmail}<br>
        ⏱️ <strong>เวลาส่ง:</strong> ${new Date().toLocaleString('th-TH')}<br>
        🏥 <strong>ระบบ:</strong> ClaimIT Hospital IT Warranty Management
      </div>
      <p style="font-size: 13px; color: #64748b;">
        ระบบพร้อมส่งอีเมลแจ้งเคลมหา Vendor (Acer, Dell, Lenovo ฯลฯ) ได้จริง 100% แล้วครับ
      </p>
    </div>
  `;

  if (hasSendGrid) {
    try {
      const from = SENDGRID_FROM || 'no-reply@claimit.local';
      console.log(`📡 Sending via SendGrid v3 API (From: ${from})...`);
      await sendViaSendGrid({ to: targetEmail, from, subject, html });
      console.log(`✅ SUCCESS: Email delivered via SendGrid to ${targetEmail}!\n`);
      process.exit(0);
    } catch (err) {
      console.error(`❌ SendGrid Error: ${err.message}`);
      if (hasResend) {
        console.log('🔄 Trying fallback via Resend...');
      }
    }
  }

  if (hasResend) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      const from = RESEND_FROM || 'onboarding@resend.dev';
      console.log(`📡 Sending via Resend SDK (From: ${from})...`);
      await resend.emails.send({ from, to: targetEmail, subject, html });
      console.log(`✅ SUCCESS: Email delivered via Resend to ${targetEmail}!\n`);
      process.exit(0);
    } catch (err) {
      console.error(`❌ Resend Error: ${err.message}\n`);
      process.exit(1);
    }
  }
}

main().catch(console.error);
