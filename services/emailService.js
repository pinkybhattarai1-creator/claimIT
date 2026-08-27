/**
 * ClaimIT Email Service
 * Handles backend-controlled HTML templates, SendGrid & Resend integration,
 * and dispatch tracking in SQLite email_logs.
 */

const https = require('https');
const { Resend } = require('resend');
const { db } = require('../db');
const { RESEND_API_KEY, RESEND_FROM, SENDGRID_API_KEY, SENDGRID_FROM } = require('../utils/envValidator');

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Send email using SendGrid v3 REST API (no external SDK required)
function sendViaSendGrid({ to, from, subject, html }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from || 'no-reply@claimit.local' },
      subject: subject,
      content: [{ type: 'text/html', value: html }]
    });

    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve({ provider: 'SendGrid', status: res.statusCode });
      } else {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          reject(new Error(`SendGrid API error (${res.statusCode}): ${body}`));
        });
      }
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

// Pre-defined Email Templates
const TEMPLATES = {
  VIABILITY_REPORT: (data) => ({
    subject: `[ClaimIT] ผลการประเมินความคุ้มค่าการส่งเคลม: ${data.claim_number || data.asset_tag}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0284c7; margin-top: 0;">🛡️ รายงานการประเมินความคุ้มค่า (Claim Viability)</h2>
        <p>เรียน ฝ่ายเทคโนโลยีสารสนเทศ / ผู้เกี่ยวข้อง,</p>
        <p>ระบบ ClaimIT ได้ทำการประเมินความคุ้มค่าของรายการส่งเคลม <strong>${data.claim_number || data.asset_tag}</strong> เรียบร้อยแล้ว:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>สถานะความคุ้มค่า:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0; color: ${data.viability_status === 'VIABLE' ? '#16a34a' : '#dc2626'}; font-weight: bold;">${data.viability_status}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>คะแนนความคุ้มค่า (Viability Score):</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.viability_score} / 10.0 (เกณฑ์คุ้มค่า &le; 5.0)</td></tr>
          <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>จำนวนครุภัณฑ์:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.asset_count || 1} รายการ</td></tr>
        </table>
        <p style="color: #64748b; font-size: 13px;">ระบบสร้างข้อความนี้โดยอัตโนมัติ กรุณาเข้าสู่ระบบ IT Admin Portal เพื่อดำเนินการต่อ</p>
      </div>
    `
  }),

  RMA_DISPATCH: (data) => ({
    subject: `[ClaimIT] แจ้งส่งเคลมศูนย์บริการ: ${data.vendor_name} (RMA: ${data.vendor_rma_number || '-'})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0284c7; margin-top: 0;">📦 บันทึกส่งเคลมศูนย์บริการสำเร็จ</h2>
        <p>เรียน เจ้าหน้าที่ผู้ดูแลงานเคลม,</p>
        <p>ครุภัณฑ์ได้รับการบันทึกส่งศูนย์บริการ <strong>${data.vendor_name}</strong> เรียบร้อยแล้ว:</p>
        <ul style="line-height: 1.8;">
          <li><strong>รหัสครุภัณฑ์ / ใบเคลม:</strong> ${data.claim_number || data.asset_tag}</li>
          <li><strong>หมายเลข RMA / Case No.:</strong> ${data.vendor_rma_number || 'รอรับจากศูนย์'}</li>
          <li><strong>วันที่ส่งเคลม:</strong> ${data.claim_date || new Date().toISOString().split('T')[0]}</li>
          <li><strong>กำหนดรับเครื่องโดยประมาณ:</strong> ${data.expected_return_date || 'ตามมาตรฐานศูนย์'}</li>
        </ul>
        <div style="background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 13px;">
          🔒 <strong>PDPA-Aware Data Handling:</strong> บันทึกประวัติการล้างข้อมูลก่อนส่งมอบศูนย์บริการเรียบร้อยแล้ว
        </div>
      </div>
    `
  }),

  CLAIM_RESOLVED: (data) => ({
    subject: `[ClaimIT] รับอุปกรณ์คืนจากศูนย์บริการเรียบร้อยแล้ว: ${data.asset_tag || data.claim_number}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #16a34a; margin-top: 0;">✅ ปิดงานเคลมและรับอุปกรณ์คืน</h2>
        <p>เรียน ฝ่ายเทคโนโลยีสารสนเทศ,</p>
        <p>รายการเคลม <strong>${data.asset_tag || data.claim_number}</strong> ได้รับการส่งคืนและทดสอบพร้อมใช้งานแล้ว:</p>
        <ul style="line-height: 1.8;">
          <li><strong>ผลการเคลม (Resolution):</strong> ${data.resolution_type || 'Returned / Repaired'}</li>
          <li><strong>Serial Number ใหม่:</strong> ${data.replacement_serial_no || 'คงเดิม'}</li>
          <li><strong>ค่าใช้จ่าย:</strong> ฿${(data.repair_cost || 0).toLocaleString()}</li>
          <li><strong>วันที่รับมอบ:</strong> ${data.resolved_date || new Date().toISOString().split('T')[0]}</li>
        </ul>
      </div>
    `
  }),

  ASSET_ADDED: (data) => ({
    subject: `[ClaimIT] บันทึกครุภัณฑ์ใหม่ในระบบ: ${data.asset_tag} — ${data.device_name || data.category}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0284c7; margin-top: 0;">📦 บันทึกครุภัณฑ์ใหม่เข้าระบบสำเร็จ</h2>
        <p>เรียน ฝ่ายเทคโนโลยีสารสนเทศ / ผู้ดูแลระบบ,</p>
        <p>มีการลงทะเบียนครุภัณฑ์คอมพิวเตอร์และเครือข่ายรายการใหม่เข้าสู่คลังระบบ ClaimIT เรียบร้อยแล้ว:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>รหัสครุภัณฑ์ (Asset Tag):</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #0284c7;">${data.asset_tag}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>ชื่ออุปกรณ์:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.device_name || '-'}</td></tr>
          <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>หมวดหมู่ / แบรนด์ / รุ่น:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.category} | ${data.brand} ${data.model}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Serial Number:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.serial_no}</td></tr>
          <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>สถานที่ติดตั้ง:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.location}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>ระยะเวลารับประกัน:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.warranty_start} ถึง ${data.warranty_end}</td></tr>
          <tr style="background: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>รหัสตรวจสอบการเปลี่ยนแปลง:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0; font-family: monospace;">${data.log_code || '-'}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>ผู้บันทึกรายการ:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.created_by || 'system'}</td></tr>
        </table>
        <p style="color: #64748b; font-size: 13px;">ระบบ ClaimIT โรงพยาบาลพญาไท 3 — บันทึกประวัติและตรวจสอบย้อนหลังได้ทุกรายการ</p>
      </div>
    `
  })
};

/**
 * Dispatch Email with tracking in email_logs table
 */
async function sendNotificationEmail({ templateName, recipient, claimId, data }) {
  const templateFn = TEMPLATES[templateName];
  if (!templateFn) {
    throw new Error(`ไม่พบเทมเพลตอีเมลชื่อ '${templateName}'`);
  }

  const { subject, html } = templateFn(data);
  let status = 'NOT_SENT';
  let errorMessage = null;

  let providerUsed = 'SIMULATED';

  if (SENDGRID_API_KEY && recipient) {
    try {
      await sendViaSendGrid({
        to: recipient,
        from: SENDGRID_FROM || 'no-reply@claimit.local',
        subject,
        html
      });
      status = 'SENT';
      providerUsed = 'SendGrid';
      console.log(`[EMAIL SENT via SendGrid] To: ${recipient} | Subject: ${subject}`);
    } catch (err) {
      console.warn('[SendGrid Notice - Trying Resend Fallback]:', err.message);
      if (resend) {
        try {
          await resend.emails.send({
            from: RESEND_FROM,
            to: recipient,
            subject,
            html
          });
          status = 'SENT';
          providerUsed = 'Resend (Fallback)';
          console.log(`[EMAIL SENT via Resend Fallback] To: ${recipient} | Subject: ${subject}`);
        } catch (resendErr) {
          status = 'FAILED';
          errorMessage = `SendGrid: ${err.message} | Resend: ${resendErr.message}`;
          console.error('[EMAIL ERROR - Both providers failed]', errorMessage);
        }
      } else {
        status = 'FAILED';
        errorMessage = err.message;
        console.error('[EMAIL ERROR - SendGrid]', err.message);
      }
    }
  } else if (resend && recipient) {
    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: recipient,
        subject,
        html
      });
      status = 'SENT';
      providerUsed = 'Resend';
      console.log(`[EMAIL SENT via Resend] To: ${recipient} | Subject: ${subject}`);
    } catch (err) {
      status = 'FAILED';
      errorMessage = err.message;
      console.error('[EMAIL ERROR - Resend]', err.message);
    }
  } else {
    status = 'NOT_CONFIGURED';
    providerUsed = 'NOT_INSERTED';
    console.warn(`[EMAIL WARNING] You didn't insert SendGrid or Resend API key in .env. Skipped sending email to: ${recipient} | Subject: ${subject}`);
  }

  // Record log in SQLite
  return new Promise((resolve) => {
    db.run(
      `INSERT INTO email_logs (claim_id, recipient, subject, template_name, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [claimId || null, recipient || 'internal@claimit.local', subject, `${templateName} (${providerUsed})`, status, errorMessage],
      function(err) {
        resolve({
          logId: this ? this.lastID : null,
          status,
          provider: providerUsed,
          subject,
          recipient,
          error: errorMessage
        });
      }
    );
  });
}

module.exports = {
  TEMPLATES,
  sendNotificationEmail,
  sendViaSendGrid
};
