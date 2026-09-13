/**
 * routes/manuals.js
 * Role-Based Manual Download and Regeneration Route Handler
 * 
 * Endpoints:
 * - GET  /api/manuals/list: Returns available manuals according to role (Staff or Admin)
 * - GET  /api/manuals/staff/:format: Serves Staff User Manual (.html, .doc, .md) to Staff & Admin
 * - GET  /api/manuals/admin/:format: Serves Admin System Manual (.html, .doc, .md) strictly to Admin (403 on Staff)
 * - POST /api/manuals/regenerate: Triggers on-demand manual regeneration (Admin-only)
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { verifyToken, staffOnly, adminOnly } = require('../middleware/auth');
const { generateAllManuals } = require('../scripts/generate_user_manual');

const BASE_DIR = path.join(__dirname, '..');

// Helper to ensure manuals exist before serving
function ensureManualsExist() {
  const checkFile = path.join(BASE_DIR, 'คู่มือการใช้งาน_ClaimIT_Staff.html');
  if (!fs.existsSync(checkFile)) {
    generateAllManuals();
  }
}

// GET /api/manuals/list
// Dynamic list of available manuals based on user role
router.get('/list', verifyToken, (req, res) => {
  const userRole = req.user.role;
  const manuals = [
    {
      id: 'staff',
      role: 'staff',
      title: 'คู่มือการใช้งานสำหรับเจ้าหน้าที่วอร์ด (Staff User Manual)',
      description: 'ขั้นตอนการสแกนบาร์โค้ดผ่านมือถือ ตรวจสอบประกัน แจ้งซ่อม ขอยืมเครื่องสำรอง และโทรสายด่วนไอที',
      formats: ['html', 'doc', 'md'],
      badge: 'Staff & Admin'
    }
  ];

  if (userRole === 'admin') {
    manuals.push({
      id: 'admin',
      role: 'admin',
      title: 'คู่มือผู้ดูแลระบบและวิศวกรไอที (Admin System Manual)',
      description: 'ระบบออกใบเคลม RMA 1-5 เครื่อง, ประเมิน Viability Score, ล้างข้อมูล PDPA, ทะเบียนผังอาคาร, ส่งออก Excel และ DevOps ครบ 21 โมดูล',
      formats: ['html', 'doc', 'md'],
      badge: 'Admin Only'
    });
  }

  res.json({
    role: userRole,
    manuals,
    canRegenerate: userRole === 'admin'
  });
});

// GET /api/manuals/staff/:format
// Accessible to both 'staff' and 'admin' roles
router.get('/staff/:format', verifyToken, staffOnly, (req, res) => {
  const format = String(req.params.format).toLowerCase().trim();
  const allowedFormats = ['html', 'doc', 'md'];

  if (!allowedFormats.includes(format)) {
    return res.status(400).json({ error: 'รูปแบบไฟล์ไม่ถูกต้อง (Supported: html, doc, md)' });
  }

  ensureManualsExist();
  const fileName = `คู่มือการใช้งาน_ClaimIT_Staff.${format}`;
  const filePath = path.join(BASE_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'ไม่พบไฟล์คู่มือสำหรับเจ้าหน้าที่' });
  }

  if (format === 'html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(filePath);
  }

  if (format === 'doc') {
    res.setHeader('Content-Type', 'application/msword');
    return res.download(filePath, fileName);
  }

  if (format === 'md') {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.download(filePath, fileName);
  }
});

// GET /api/manuals/admin/:format
// Strictly restricted to 'admin' role (Returns 403 Forbidden for Staff)
router.get('/admin/:format', verifyToken, adminOnly, (req, res) => {
  const format = String(req.params.format).toLowerCase().trim();
  const allowedFormats = ['html', 'doc', 'md'];

  if (!allowedFormats.includes(format)) {
    return res.status(400).json({ error: 'รูปแบบไฟล์ไม่ถูกต้อง (Supported: html, doc, md)' });
  }

  ensureManualsExist();
  const fileName = `คู่มือการใช้งาน_ClaimIT_Admin.${format}`;
  const filePath = path.join(BASE_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'ไม่พบไฟล์คู่มือสำหรับผู้ดูแลระบบ' });
  }

  if (format === 'html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(filePath);
  }

  if (format === 'doc') {
    res.setHeader('Content-Type', 'application/msword');
    return res.download(filePath, fileName);
  }

  if (format === 'md') {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.download(filePath, fileName);
  }
});

// POST /api/manuals/regenerate
// On-demand regeneration of all manuals (Admin-only)
router.post('/regenerate', verifyToken, adminOnly, (req, res) => {
  try {
    const generated = generateAllManuals();
    res.json({
      success: true,
      message: 'สร้างคู่มือการใช้งานระบบใหม่ครบทั้งสองชุดเรียบร้อยแล้ว',
      fileCount: generated.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Manual Regeneration Error]:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างคู่มือ กรุณาตรวจสอบบันทึกเซิร์ฟเวอร์' });
  }
});

module.exports = router;
