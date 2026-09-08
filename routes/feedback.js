const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { JWT_SECRET } = require('../utils/envValidator');
const { handleDbError } = require('../utils/safeError');

// Optional auth helper (works whether logged in or guest tester)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch {}
  }
  next();
}

// Automatically syncs all feedback entries into a clean single-file Markdown Checklist
function syncFeedbackLogFile() {
  db.all('SELECT * FROM user_feedback ORDER BY created_at DESC', [], (err, rows) => {
    if (err || !rows) return;

    const total = rows.length;
    const openCount = rows.filter(r => r.status === 'open').length;
    const reviewedCount = rows.filter(r => r.status === 'reviewed').length;
    const resolvedCount = rows.filter(r => r.status === 'resolved').length;

    let md = `# 📋 ClaimIT - Master Tester Feedback & Checklist Log\n\n`;
    md += `> ไฟล์นี้รวบรวมข้อคิดเห็น ปัญหา และข้อเสนอแนะทั้งหมดจากผู้ใช้งานในโรงพยาบาลแบบ Real-time\n\n`;
    md += `## 📊 สรุปภาพรวม (Summary)\n`;
    md += `- **ข้อเสนอแนะทั้งหมด:** ${total} รายการ\n`;
    md += `- **⏳ รอตรวจ/รอแก้ไข (Open):** ${openCount} รายการ\n`;
    md += `- **👀 รับทราบแล้ว (Reviewed):** ${reviewedCount} รายการ\n`;
    md += `- **✅ แก้ไขเรียบร้อย (Resolved):** ${resolvedCount} รายการ\n\n`;
    md += `---\n\n`;
    md += `## 📝 รายการที่ต้องตรวจสอบ & แก้ไข (Action Items Checklist)\n\n`;

    if (rows.length === 0) {
      md += `*✨ ยังไม่มีรายการข้อเสนอแนะในระบบ (เมื่อมีผู้ทดสอบส่งข้อมูลเข้ามา จะแสดงที่นี่ทันที)*\n`;
    } else {
      const catIcons = { bug: '🐞 พบปัญหา (Bug)', suggestion: '💡 ข้อเสนอแนะ (Suggestion)', ux: '❓ ใช้งานยาก (UX)', other: '💬 ความคิดเห็น' };
      const statusLabels = { open: '⏳ รอตรวจ (Open)', reviewed: '👀 รับทราบแล้ว (Reviewed)', resolved: '✅ แก้ไขแล้ว (Resolved)' };

      rows.forEach(r => {
        const isDone = r.status === 'resolved';
        const checkMark = isDone ? 'x' : ' ';
        const icon = catIcons[r.category] || r.category;
        const stars = r.rating ? '⭐️'.repeat(r.rating) : 'N/A';
        const date = r.created_at || 'Unknown';

        md += `- [${checkMark}] **#${r.id} [${icon}]** \`${r.page_url}\` — คะแนน: ${stars}\n`;
        md += `  - **ข้อความ/ปัญหา:** ${r.comment}\n`;
        md += `  - **ผู้แจ้ง:** ${r.reporter_name || 'ทั่วไป'} (แผนก: ${r.department || '-'})\n`;
        md += `  - **อุปกรณ์:** ${r.device_info || 'Unknown'}\n`;
        md += `  - **สถานะ:** ${statusLabels[r.status] || r.status}\n`;
        md += `  - **เวลาที่ส่ง:** ${date}\n\n`;
      });
    }

    const targetPaths = [
      path.join(__dirname, '..', 'FEEDBACK_LOG.md'),
      path.join(__dirname, '..', '..', 'FEEDBACK_LOG.md')
    ];
    targetPaths.forEach(p => {
      try {
        fs.writeFileSync(p, md, 'utf8');
      } catch (e) {}
    });
  });
}

// Initial sync on module load
try { syncFeedbackLogFile(); } catch {}

// Anti-Spam Rate Limiter: Max 5 submissions per minute per IP, and 3-second cooldown
const ipTracker = new Map();
const COOLDOWN_MS = 3000;       // 3 seconds cooldown between consecutive submits
const WINDOW_MS = 60000;        // 1 minute window
const MAX_PER_WINDOW = 5;       // max 5 comments per minute

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipTracker.entries()) {
    if (now - data.lastTime > WINDOW_MS * 2) {
      ipTracker.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

function checkSpam(req) {
  if (process.env.NODE_ENV === 'test') return null;

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const data = ipTracker.get(clientIp);

  if (data) {
    // 1. Enforce cooldown
    if (now - data.lastTime < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (now - data.lastTime)) / 1000);
      return `กรุณารออีก ${waitSec} วินาทีก่อนส่งข้อคิดเห็นถัดไป (Anti-spam cooldown)`;
    }

    // 2. Enforce window limit
    if (now - data.windowStart < WINDOW_MS) {
      if (data.count >= MAX_PER_WINDOW) {
        return 'คุณส่งข้อคิดเห็นเกินกำหนด (สูงสุด 5 ครั้งต่อนาที) กรุณารอสักครู่';
      }
      data.count++;
    } else {
      data.windowStart = now;
      data.count = 1;
    }

    // 3. Duplicate text check within 30s
    if (data.lastComment === req.body.comment?.trim() && (now - data.lastTime < 30000)) {
      return 'ข้อความนี้เพิ่งถูกส่งไปแล้ว กรุณาอย่าส่งข้อความซ้ำครับ';
    }

    data.lastTime = now;
    data.lastComment = req.body.comment?.trim();
  } else {
    ipTracker.set(clientIp, {
      lastTime: now,
      windowStart: now,
      count: 1,
      lastComment: req.body.comment?.trim()
    });
  }

  return null;
}

// POST /api/feedback - Submit new feedback or bug report
router.post('/', optionalAuth, (req, res) => {
  const spamError = checkSpam(req);
  if (spamError) {
    return res.status(429).json({ error: spamError });
  }

  const { 
    category = 'suggestion', 
    page_url = '/', 
    comment, 
    rating, 
    reporter_name, 
    department, 
    device_info, 
    screen_size 
  } = req.body;

  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    return res.status(400).json({ error: 'กรุณากรอกข้อความข้อเสนอแนะหรือปัญหาที่พบ' });
  }

  const cleanComment = comment.trim().substring(0, 2000);
  const validCategories = ['bug', 'suggestion', 'ux', 'other'];
  const cleanCategory = validCategories.includes(category) ? category : 'other';
  const cleanRating = (typeof rating === 'number' && rating >= 1 && rating <= 5) ? Math.round(rating) : null;
  const cleanPageUrl = String(page_url || '/').substring(0, 255);
  
  const userId = req.user ? req.user.id : null;
  const finalName = (req.user && req.user.name) ? req.user.name : (reporter_name ? String(reporter_name).trim().substring(0, 100) : 'ผู้ทดสอบทั่วไป');
  const finalDept = (req.user && req.user.department) ? req.user.department : (department ? String(department).trim().substring(0, 100) : 'ทั่วไป/ภาคสนาม');
  const finalDevice = device_info ? String(device_info).substring(0, 255) : (req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 255) : 'Unknown');
  const finalScreen = screen_size ? String(screen_size).substring(0, 50) : null;

  const sql = `
    INSERT INTO user_feedback (user_id, reporter_name, department, category, page_url, comment, rating, device_info, screen_size, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
  `;

  db.run(sql, [userId, finalName, finalDept, cleanCategory, cleanPageUrl, cleanComment, cleanRating, finalDevice, finalScreen], function(err) {
    if (err) return handleDbError(res, err);
    const feedbackId = this.lastID;
    syncFeedbackLogFile();

    // Instant external backup & alert via Webhook (Discord, Telegram, Slack, Google Sheets, etc.)
    if (process.env.FEEDBACK_WEBHOOK_URL) {
      try {
        const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
        const colors = { bug: 0xef4444, suggestion: 0x3b82f6, ux: 0xf59e0b, other: 0x10b981 };
        const payload = {
          content: `🔔 **มีข้อเสนอแนะ/แจ้งปัญหาใหม่จาก รพ. (ClaimIT)**\n**ประเภท:** ${cleanCategory}\n**ผู้แจ้ง:** ${finalName} (${finalDept})\n**หน้าจอ:** ${cleanPageUrl}\n**อุปกรณ์:** ${finalDevice}\n**ข้อความ:** ${cleanComment}\n**คะแนน:** ${cleanRating ? '⭐️'.repeat(cleanRating) : '-'}`
        };

        if (webhookUrl.includes('discord.com/api/webhooks')) {
          payload.embeds = [{
            title: `[${cleanCategory.toUpperCase()}] ข้อคิดเห็น/ปัญหาใหม่ #${feedbackId}`,
            description: cleanComment,
            color: colors[cleanCategory] || 0x3b82f6,
            fields: [
              { name: 'ผู้แจ้ง / แผนก', value: `${finalName} (${finalDept})`, inline: true },
              { name: 'หน้าจอ', value: cleanPageUrl, inline: true },
              { name: 'อุปกรณ์', value: finalDevice, inline: true },
              { name: 'คะแนน', value: cleanRating ? '⭐️'.repeat(cleanRating) : 'ไม่ได้ระบุ', inline: true }
            ],
            timestamp: new Date().toISOString()
          }];
        }

        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(e => console.error('[Feedback Webhook Error]:', e.message));
      } catch (e) {
        console.error('[Feedback Webhook Exception]:', e.message);
      }
    }

    res.status(201).json({
      success: true,
      id: feedbackId,
      message: 'ขอบคุณสำหรับข้อเสนอแนะ! บันทึกข้อมูลเรียบร้อยแล้ว ทีมงานจะนำไปปรับปรุงระบบต่อไป'
    });
  });
});

// GET /api/feedback/public - Public read-only list for testers to verify their comments
router.get('/public', (req, res) => {
  db.all(
    'SELECT id, category, page_url, comment, rating, reporter_name, department, device_info, status, created_at FROM user_feedback ORDER BY created_at DESC LIMIT 50',
    [],
    (err, rows) => {
      if (err) return handleDbError(res, err);
      res.json(rows || []);
    }
  );
});

// GET /api/feedback/export/csv - Export CSV with UTF-8 BOM for Microsoft Excel
router.get('/export/csv', optionalAuth, (req, res) => {
  db.all('SELECT * FROM user_feedback ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return handleDbError(res, err);

    let csv = '\uFEFF"ID","Date","Category","Rating","Page URL","Comment","Reporter Name","Department","Device Info","Status"\n';
    (rows || []).forEach(r => {
      const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
      csv += [
        r.id,
        escapeCsv(r.created_at),
        escapeCsv(r.category),
        r.rating || '',
        escapeCsv(r.page_url),
        escapeCsv(r.comment),
        escapeCsv(r.reporter_name),
        escapeCsv(r.department),
        escapeCsv(r.device_info),
        escapeCsv(r.status)
      ].join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ClaimIT_Feedback_Export.csv"');
    res.send(csv);
  });
});

// GET /api/feedback/export/markdown - Download FEEDBACK_LOG.md
router.get('/export/markdown', optionalAuth, (req, res) => {
  syncFeedbackLogFile();
  const filePath = path.join(__dirname, '..', 'FEEDBACK_LOG.md');
  setTimeout(() => {
    res.download(filePath, 'FEEDBACK_LOG.md');
  }, 50);
});

// GET /api/feedback - List all feedback entries
router.get('/', optionalAuth, (req, res) => {
  const { status, category } = req.query;
  let sql = 'SELECT * FROM user_feedback WHERE 1=1';
  const params = [];

  if (status && ['open', 'reviewed', 'resolved'].includes(status)) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (category && ['bug', 'suggestion', 'ux', 'other'].includes(category)) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC LIMIT 200';

  db.all(sql, params, (err, rows) => {
    if (err) return handleDbError(res, err);
    res.json(rows || []);
  });
});

// PATCH /api/feedback/:id - Update status (open, reviewed, resolved)
router.patch('/:id', optionalAuth, (req, res) => {
  const { status } = req.body;
  const validStatus = ['open', 'reviewed', 'resolved'];
  if (!validStatus.includes(status)) {
    return res.status(400).json({ error: 'สถานะไม่ถูกต้อง (ต้องเป็น open, reviewed หรือ resolved)' });
  }

  db.run('UPDATE user_feedback SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
    if (err) return handleDbError(res, err);
    if (this.changes === 0) return res.status(404).json({ error: 'ไม่พบรายการข้อเสนอแนะ' });
    syncFeedbackLogFile();
    res.json({ success: true, message: `อัปเดตสถานะเป็น ${status} เรียบร้อยแล้ว` });
  });
});

// DELETE /api/feedback/:id - Delete feedback
router.delete('/:id', optionalAuth, (req, res) => {
  db.run('DELETE FROM user_feedback WHERE id = ?', [req.params.id], function(err) {
    if (err) return handleDbError(res, err);
    if (this.changes === 0) return res.status(404).json({ error: 'ไม่พบรายการข้อเสนอแนะ' });
    syncFeedbackLogFile();
    res.json({ success: true, message: 'ลบรายการข้อเสนอแนะเรียบร้อยแล้ว' });
  });
});

module.exports = router;
