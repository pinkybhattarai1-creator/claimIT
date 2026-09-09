/**
 * scripts/generate_user_manual.js
 * Generates comprehensive, genuine End-User Manual (คู่มือการใช้งานระบบ ClaimIT สำหรับผู้ปฏิบัติงาน)
 * in 3 formats:
 * 1. คู่มือการใช้งาน_ClaimIT.doc (Microsoft Word Document format with Word styling)
 * 2. คู่มือการใช้งาน_ClaimIT.html (Interactive, print-ready HTML manual with CSS visual styling)
 * 3. คู่มือการใช้งาน_ClaimIT.md (Markdown document for repo/git)
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..');
const docPath = path.join(outputDir, 'คู่มือการใช้งาน_ClaimIT.doc');
const htmlPath = path.join(outputDir, 'คู่มือการใช้งาน_ClaimIT.html');
const mdPath = path.join(outputDir, 'คู่มือการใช้งาน_ClaimIT.md');

const rootDir = path.join(__dirname, '..', '..');
const rootDocPath = path.join(rootDir, 'คู่มือการใช้งาน_ClaimIT.doc');
const rootHtmlPath = path.join(rootDir, 'คู่มือการใช้งาน_ClaimIT.html');
const rootMdPath = path.join(rootDir, 'คู่มือการใช้งาน_ClaimIT.md');

// SVG Visual Generators for User Manual
function getWorkflowSvg() {
  return `<svg width="100%" height="150" viewBox="0 0 840 140" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; margin:15px 0;">
    <defs>
      <linearGradient id="gBlue" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#0369a1"/></linearGradient>
      <linearGradient id="gAmber" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient>
      <linearGradient id="gRed" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#dc2626"/></linearGradient>
      <linearGradient id="gPurple" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient>
      <linearGradient id="gGreen" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#059669"/></linearGradient>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.1"/></filter>
    </defs>
    <!-- Step 1 -->
    <rect x="20" y="25" width="130" height="90" rx="8" fill="url(#gBlue)" filter="url(#shadow)"/>
    <text x="85" y="55" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#fff">📱</text>
    <text x="85" y="78" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">1. ตรวจสอบ/แจ้งซ่อม</text>
    <text x="85" y="96" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#e0f2fe">ผู้ใช้งาน (Staff)</text>
    <path d="M 155 70 L 180 70 M 175 65 L 180 70 L 175 75" stroke="#0284c7" stroke-width="2.5" fill="none"/>
    <!-- Step 2 -->
    <rect x="185" y="25" width="130" height="90" rx="8" fill="url(#gRed)" filter="url(#shadow)"/>
    <text x="250" y="55" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#fff">🔒</text>
    <text x="250" y="78" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">2. ล้างข้อมูลก่อนส่ง</text>
    <text x="250" y="96" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#fee2e2">พิมพ์ "ยืนยัน" หรือ "WIPED"</text>
    <path d="M 320 70 L 345 70 M 340 65 L 345 70 L 340 75" stroke="#ef4444" stroke-width="2.5" fill="none"/>
    <!-- Step 3 -->
    <rect x="350" y="25" width="130" height="90" rx="8" fill="url(#gPurple)" filter="url(#shadow)"/>
    <text x="415" y="55" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#fff">⚖️</text>
    <text x="415" y="78" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">3. ประเมินความคุ้ม</text>
    <text x="415" y="96" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#f3e8ff">ระบบคำนวณราคาซ่อม</text>
    <path d="M 485 70 L 510 70 M 505 65 L 510 70 L 505 75" stroke="#8b5cf6" stroke-width="2.5" fill="none"/>
    <!-- Step 4 -->
    <rect x="515" y="25" width="130" height="90" rx="8" fill="url(#gAmber)" filter="url(#shadow)"/>
    <text x="580" y="55" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#fff">📑</text>
    <text x="580" y="78" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">4. ส่งเคลมศูนย์ซ่อม</text>
    <text x="580" y="96" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#fef3c7">ออกใบเคลม RMA</text>
    <path d="M 650 70 L 675 70 M 670 65 L 675 70 L 670 75" stroke="#f59e0b" stroke-width="2.5" fill="none"/>
    <!-- Step 5 -->
    <rect x="680" y="25" width="135" height="90" rx="8" fill="url(#gGreen)" filter="url(#shadow)"/>
    <text x="747" y="55" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#fff">✅</text>
    <text x="747" y="78" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">5. ส่งคืนใช้งาน</text>
    <text x="747" y="96" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#d1fae5">พร้อมใช้งานปกติ</text>
  </svg>`;
}

function getMobileUiSvg() {
  return `<svg width="100%" height="440" viewBox="0 0 360 440" xmlns="http://www.w3.org/2000/svg" style="background:#f1f5f9; border-radius:12px; border:2px solid #cbd5e1; margin:15px auto; display:block; max-width:360px;">
    <!-- Phone Topbar -->
    <rect x="0" y="0" width="360" height="48" fill="#1e293b"/>
    <text x="16" y="30" font-family="sans-serif" font-size="18" fill="#ffffff">☰</text>
    <text x="45" y="30" font-family="sans-serif" font-size="16" font-weight="bold" fill="#38bdf8">ClaimIT</text>
    <rect x="185" y="14" width="70" height="22" rx="11" fill="#ea580c"/>
    <text x="220" y="29" font-family="sans-serif" font-size="11" font-weight="bold" fill="#fff" text-anchor="middle">⚠️ 12 ใกล้หมด</text>
    <circle cx="330" cy="24" r="14" fill="#0284c7"/>
    <text x="330" y="28" font-family="sans-serif" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle">ST</text>

    <!-- Sticky Scanner Box -->
    <rect x="12" y="58" width="336" height="85" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
    <rect x="22" y="68" width="220" height="34" rx="4" fill="#f8fafc" stroke="#94a3b8"/>
    <text x="32" y="90" font-family="monospace" font-size="13" fill="#0f172a">CIT-2024-AIO-02</text>
    <rect x="248" y="68" width="45" height="34" rx="4" fill="#0284c7"/>
    <text x="270" y="89" font-family="sans-serif" font-size="12" fill="#fff" text-anchor="middle">🔍</text>
    <rect x="298" y="68" width="40" height="34" rx="4" fill="#10b981"/>
    <text x="318" y="89" font-family="sans-serif" font-size="12" fill="#fff" text-anchor="middle">📷</text>
    <circle cx="30" cy="122" r="6" fill="#16a34a"/>
    <text x="44" y="126" font-family="sans-serif" font-size="11" fill="#475569">🔒 ล็อกหัวอ่านบาร์โค้ด (ปิดแป้นพิมพ์บนจอ)</text>

    <!-- Asset Detail Card -->
    <rect x="12" y="152" width="336" height="205" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
    <rect x="12" y="152" width="336" height="32" rx="8" fill="#e0f2fe"/>
    <text x="24" y="173" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0369a1">💻 คอมพิวเตอร์ All-in-One (จุดปฏิบัติงาน 1)</text>
    <text x="24" y="202" font-family="sans-serif" font-size="12" fill="#334155">รหัสครุภัณฑ์: <strong>CIT-2024-AIO-02</strong></text>
    <text x="24" y="222" font-family="sans-serif" font-size="12" fill="#334155">สถานที่: แผนกบริการทั่วไป (General Service)</text>
    <rect x="24" y="234" width="312" height="28" rx="4" fill="#dcfce7"/>
    <text x="34" y="253" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">🟢 สถานะประกัน: ปกติ (หมดอายุ พ.ศ. 2570 / เหลือ 640 วัน)</text>
    <rect x="24" y="270" width="100" height="20" rx="4" fill="#f1f5f9"/>
    <text x="74" y="284" font-family="sans-serif" font-size="11" fill="#475569" text-anchor="middle">สถานะ: ใช้งานได้</text>

    <!-- Buttons -->
    <rect x="24" y="302" width="312" height="38" rx="6" fill="#dc2626"/>
    <text x="180" y="326" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">🚨 แจ้งซ่อมอุปกรณ์ชำรุด</text>

    <!-- Bottom Loaner Action -->
    <rect x="12" y="368" width="336" height="42" rx="8" fill="#fffbeb" stroke="#fde68a"/>
    <text x="180" y="394" font-family="sans-serif" font-size="13" font-weight="bold" fill="#b45309" text-anchor="middle">📦 ขอยืมอุปกรณ์สำรองฉุกเฉิน (Loaner Unit)</text>
  </svg>`;
}

function getViabilitySvg() {
  return `<svg width="100%" height="90" viewBox="0 0 600 90" xmlns="http://www.w3.org/2000/svg" style="background:#fff; border-radius:8px; border:1px solid #e2e8f0; margin:15px 0;">
    <rect x="40" y="25" width="260" height="24" rx="12" fill="#10b981"/>
    <rect x="300" y="25" width="260" height="24" rx="12" fill="#ef4444"/>
    <text x="170" y="41" font-family="sans-serif" font-size="12" font-weight="bold" fill="#fff" text-anchor="middle">🟢 0.0 - 5.0 : คุ้มค่าส่งซ่อม (VIABLE)</text>
    <text x="430" y="41" font-family="sans-serif" font-size="12" font-weight="bold" fill="#fff" text-anchor="middle">🔴 5.1 - 10.0 : ไม่คุ้มค่าส่งซ่อม (NOT VIABLE)</text>
    <line x1="300" y1="18" x2="300" y2="56" stroke="#0f172a" stroke-width="3"/>
    <text x="300" y="14" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">เกณฑ์ตัดสิน (5.0)</text>
    <text x="40" y="70" font-family="sans-serif" font-size="11" fill="#64748b">อยู่ในประกัน = 1.0 (คุ้มที่สุด ไม่เสียค่าอะไหล่)</text>
    <text x="300" y="70" font-family="sans-serif" font-size="11" fill="#64748b" text-anchor="middle">หมดประกันแต่มูลค่ายังคุ้มซ่อม (2.0 - 5.0)</text>
    <text x="560" y="70" font-family="sans-serif" font-size="11" fill="#64748b" text-anchor="end">หมดอายุเกิน 5 ปี = 8.5+</text>
  </svg>`;
}

// Generate HTML and Word Content
function generateHtmlAndWordContent(isWordDoc = false) {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>คู่มือการใช้งานระบบ ClaimIT (IT Warranty & RMA User Manual)</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4;
      margin: 20mm 20mm 20mm 20mm;
      mso-header-margin: 36pt;
      mso-footer-margin: 36pt;
    }
    body {
      font-family: 'Sarabun', 'TH Sarabun New', 'Cordia New', 'Segoe UI', Tahoma, sans-serif;
      font-size: 14pt;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0;
      padding: ${isWordDoc ? '0' : '20px'};
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: ${isWordDoc ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.1)'};
    }
    .cover-page {
      text-align: center;
      padding: 40px 20px;
      border-bottom: 3px solid #0284c7;
      margin-bottom: 40px;
    }
    .cover-icon {
      font-size: 52pt;
      margin-bottom: 10px;
    }
    h1.title {
      font-size: 24pt;
      color: #0f172a;
      margin: 10px 0;
      font-weight: bold;
    }
    .subtitle {
      font-size: 15pt;
      color: #475569;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11pt;
      font-weight: bold;
      background: #e0f2fe;
      color: #0369a1;
      margin: 4px;
    }
    .meta-box {
      margin-top: 25px;
      padding: 15px;
      background: #f1f5f9;
      border-radius: 6px;
      font-size: 12pt;
      color: #334155;
    }
    h2 {
      color: #0284c7;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-top: 40px;
      font-size: 18pt;
    }
    h3 {
      color: #334155;
      margin-top: 24px;
      font-size: 15pt;
    }
    p, li {
      font-size: 13pt;
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 12pt;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background: #f8fafc;
      color: #0f172a;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .callout {
      padding: 16px 20px;
      border-left: 5px solid #0284c7;
      background: #f0f9ff;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
    }
    .callout.warning {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }
    .callout.danger {
      border-left-color: #ef4444;
      background: #fef2f2;
    }
    .callout.success {
      border-left-color: #10b981;
      background: #f0fdf4;
    }
    .callout-title {
      font-weight: bold;
      font-size: 13pt;
      margin-bottom: 6px;
    }
    .ui-mockup {
      border: 2px solid #cbd5e1;
      border-radius: 8px;
      background: #f8fafc;
      padding: 20px;
      margin: 20px 0;
    }
    .ui-header {
      background: #1e293b;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 6px 6px 0 0;
      font-weight: bold;
      font-size: 12pt;
      display: flex;
      justify-content: space-between;
    }
    .ui-body {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-top: none;
      padding: 16px;
      border-radius: 0 0 6px 6px;
    }
    .btn-mock {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11pt;
      font-weight: bold;
      text-decoration: none;
    }
    .btn-blue { background: #0284c7; color: #fff; }
    .btn-green { background: #16a34a; color: #fff; }
    .btn-amber { background: #d97706; color: #fff; }
    .btn-red { background: #dc2626; color: #fff; }
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>

<div class="container">

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-icon">💻 🛡️ ⚙️</div>
    <h1 class="title">คู่มือการใช้งานระบบ ClaimIT</h1>
    <div class="subtitle">ระบบบริหารจัดการรับประกันและส่งเคลมครุภัณฑ์คอมพิวเตอร์<br>(IT Warranty & RMA Claim Management System)</div>
    <span class="badge">📘 คู่มือผู้ปฏิบัติงาน (User Manual)</span>
    <span class="badge">ฉบับปรับปรุงปี 2026</span>
    <span class="badge">📱 ใช้งานได้ทั้งมือถือ & คอมพิวเตอร์</span>
    <div class="meta-box">
      <strong>จัดทำโดย:</strong> ฝ่ายเทคโนโลยีสารสนเทศและโครงสร้างพื้นฐาน<br>
      <strong>วัตถุประสงค์:</strong> สำหรับผู้ใช้งานระดับ Staff และผู้ดูแลระบบระดับ Admin
    </div>
  </div>

  <!-- TABLE OF CONTENTS -->
  <h2>📑 สารบัญคู่มือ (Table of Contents)</h2>
  <ol style="line-height: 2;">
    <li><a href="#ch1">บทนำ: ทำความรู้จักกับระบบ ClaimIT และการเข้าสู่ระบบ</a></li>
    <li><a href="#ch2">ส่วนที่ 1: ขั้นตอนการแจ้งซ่อมและยืมเครื่องสำรอง (สำหรับ Staff)</a></li>
    <li><a href="#ch3">ส่วนที่ 2: ขั้นตอนการล้างข้อมูลและการส่งเคลมศูนย์บริการ (สำหรับ Admin)</a></li>
    <li><a href="#ch4">ส่วนที่ 3: การลงทะเบียนครุภัณฑ์ใหม่และการจำหน่ายซาก (สำหรับผู้ดูแลพัสดุไอที)</a></li>
    <li><a href="#ch5">ส่วนที่ 4: การแก้ปัญหาเบื้องต้นที่พบบ่อย (FAQ & Troubleshooting)</a></li>
  </ol>

  <div class="page-break"></div>

  <!-- CHAPTER 1 -->
  <h2 id="ch1">บทนำ: ทำความรู้จักกับระบบ ClaimIT และการเข้าสู่ระบบ</h2>
  <p>
    ระบบ <strong>ClaimIT</strong> ถูกออกแบบมาเพื่ออำนวยความสะดวกให้ผู้ใช้งานสามารถ:
  </p>
  <ul>
    <li><strong>ตรวจสอบระยะเวลารับประกัน</strong> ของคอมพิวเตอร์และอุปกรณ์ไอทีได้ทันที แค่ยิงบาร์โค้ด</li>
    <li><strong>แจ้งซ่อมเมื่ออุปกรณ์ชำรุด</strong> ได้ทันทีจากหน้างาน ไม่ต้องเสียเวลาเขียนใบส่งซ่อมกระดาษ</li>
    <li><strong>ขอยืมเครื่องสำรองฉุกเฉิน (Loaner)</strong> ไปใช้งานทดแทนทันที เพื่อให้การปฏิบัติงานไม่สะดุด</li>
    <li><strong>ติดตามสถานะการส่งซ่อม</strong> ว่าส่งเครื่องไปศูนย์บริการหรือยัง และมีกำหนดรับเครื่องกลับเมื่อไหร่</li>
  </ul>

  <div style="text-align:center; margin:25px 0;">
    <div style="font-weight:bold; color:#0369a1; margin-bottom:6px;">📊 ภาพรวม: ขั้นตอนการทำงานตั้งแต่หน้างานจนถึงรับเครื่องคืน</div>
    ${getWorkflowSvg()}
  </div>

  <h3>1.1 วิธีการเข้าสู่ระบบ</h3>
  <ol>
    <li>เปิดโปรแกรมเว็บเบราว์เซอร์ (Google Chrome, Microsoft Edge, หรือ Safari บน iPhone)</li>
    <li>พิมพ์ที่อยู่เว็บไซต์ของระบบ ClaimIT (สอบถาม IP หรือลิงก์จากฝ่ายไอที เช่น <code>http://192.168.1.45:8847</code>)</li>
    <li>กรอก <strong>ชื่อผู้ใช้ (Username)</strong> และ <strong>รหัสผ่าน (Password)</strong> ของท่าน แล้วกดปุ่ม <strong>[เข้าสู่ระบบ]</strong></li>
  </ol>

  <div class="callout">
    <div class="callout-title">💡 บัญชีทดสอบมาตรฐานของระบบ</div>
    <ul>
      <li><strong>ผู้ใช้งานระดับ Staff:</strong> ชื่อผู้ใช้ <code>staff</code> / รหัสผ่าน <code>staff123</code></li>
      <li><strong>ผู้ดูแลระบบระดับ Admin:</strong> ชื่อผู้ใช้ <code>admin</code> / รหัสผ่าน <code>admin123</code></li>
    </ul>
  </div>

  <div class="callout warning">
    <div class="callout-title">🔒 ระบบตัดเซสชันอัตโนมัติ (15 นาที) เพื่อความปลอดภัย</div>
    หากท่านเปิดหน้าจอทิ้งไว้โดยไม่มีการขยับเมาส์หรือแตะหน้าจอเป็นเวลา 15 นาที ระบบจะมีหน้าต่างเตือนและออกจากระบบให้อัตโนมัติ เพื่อป้องกันไม่ให้ผู้อื่นเข้าใช้งานต่อตามระเบียบความปลอดภัยขององค์กร
  </div>

  <div class="page-break"></div>

  <!-- CHAPTER 2 -->
  <h2 id="ch2">ส่วนที่ 1: ขั้นตอนการแจ้งซ่อมและยืมเครื่องสำรอง (สำหรับ Staff)</h2>
  <p>
    เมื่อผู้ใช้งาน Staff ล็อกอินเข้ามา ให้แตะที่เมนู <strong>"🛡️ ระบบแจ้งซ่อมประจำแผนก (Staff)"</strong> ด้านบน จะพบกับหน้าจอสำหรับการตรวจสอบและแจ้งซ่อม:
  </p>

  <div style="text-align:center; margin:20px 0;">
    <div style="font-weight:bold; color:#0369a1; margin-bottom:6px;">📱 ภาพจำลอง: หน้าจอใช้งานบนสมาร์ทโฟน / iPhone</div>
    ${getMobileUiSvg()}
  </div>

  <h3>ขั้นตอนการแจ้งซ่อมอุปกรณ์ (5 ขั้นตอนง่ายๆ):</h3>
  <ol>
    <li>
      <strong>ค้นหาอุปกรณ์:</strong>
      <ul>
        <li>ใช้ปืนยิงบาร์โค้ดยิงใส่สติ๊กเกอร์บนเครื่อง หรือ</li>
        <li>พิมพ์รหัสครุภัณฑ์ในช่องค้นหา (เช่น <code>CIT-2024-AIO-02</code>) แล้วกดปุ่ม <strong>[🔍 ค้นหา]</strong> หรือ</li>
        <li>กดปุ่ม <strong>[📷 ถ่ายรูป]</strong> เพื่อถ่ายภาพบาร์โค้ดบนตัวเครื่องโดยตรงจากมือถือ</li>
      </ul>
    </li>
    <li>
      <strong>ดูสถานะการรับประกัน:</strong>
      <br>ระบบจะแสดงแถบสีสถานะรับประกันให้เห็นชัดเจน:
      <ul>
        <li><span style="color:#16a34a; font-weight:bold;">🟢 ปกติ ในประกัน:</span> เครื่องยังอยู่ในระยะประกันศูนย์ (ซ่อมฟรี) พร้อมระบุปี พ.ศ. ที่หมดอายุ</li>
        <li><span style="color:#d97706; font-weight:bold;">⚠️ ใกล้หมดประกันใน 6 เดือน:</span> แจ้งเตือนเพื่อให้รีบตรวจสอบก่อนหมดสิทธิ์เคลม</li>
        <li><span style="color:#dc2626; font-weight:bold;">🔴 หมดอายุประกันแล้ว:</span> เครื่องหมดประกันแล้ว ฝ่ายไอทีจะพิจารณาการซ่อมตามความเหมาะสม</li>
      </ul>
    </li>
    <li>
      <strong>ระบุอาการเสีย:</strong>
      <br>เลือกอาการเสียจากปุ่มลัด (เช่น <em>เปิดไม่ติด, จอดับ/จอฟ้า, เครื่องพิมพ์ขัดข้อง, สแกนเนอร์ไม่ติด</em>) หรือพิมพ์ระบุอาการเพิ่มเติม
    </li>
    <li>
      <strong>ถ่ายภาพความเสียหาย (ถ้ามี):</strong>
      <br>กดปุ่มถ่ายรูปจุดที่ชำรุด เช่น รอยแตก รอยน้ำหก หรือสายไฟขาด ภาพจะถูกแนบเข้าใบแจ้งซ่อมทันที
    </li>
    <li>
      <strong>กดส่งเรื่องแจ้งซ่อม:</strong>
      <br>กดปุ่มสีแดง <strong>[🚨 ส่งเรื่องแจ้งซ่อม]</strong> สถานะจะเปลี่ยนเป็นชำรุด (Broken) และส่งเรื่องต่อไปยังฝ่ายไอทีทันที
    </li>
  </ol>

  <h3>การขอยืมเครื่องสำรองฉุกเฉิน (Emergency Loaner Units):</h3>
  <p>
    หากคอมพิวเตอร์หรือเครื่องพิมพ์ในจุดสำคัญ (เช่น แผนกบริการ, จุดประชาสัมพันธ์, จุดปฏิบัติงาน) เสียหายและต้องยกไปซ่อม:
  </p>
  <ul>
    <li>กดปุ่ม <strong>[🔄 ขอยืมเครื่องสำรองใช้งาน]</strong></li>
    <li>เลือกรหัสเครื่องสำรองที่มีพร้อมในคลัง (เช่น <code>LNR-AIO-01</code> คอมพิวเตอร์สำรอง หรือ <code>LNR-PRN-01</code> เครื่องพิมพ์สำรอง)</li>
    <li>นำเครื่องสำรองไปติดตั้งใช้งานแทนได้ทันที ทำให้การปฏิบัติงานดำเนินต่อไปได้โดยไม่สะดุด</li>
  </ul>

  <div class="page-break"></div>

  <!-- CHAPTER 3 -->
  <h2 id="ch3">ส่วนที่ 2: ขั้นตอนการล้างข้อมูลและการส่งเคลมศูนย์บริการ (สำหรับ Admin)</h2>
  <p>
    สำหรับผู้ดูแลระบบระดับ Admin เมื่อเข้าสู่หน้า <strong>"IT Portal (Admin Portal)"</strong> จะพบข้อมูลสรุปงานซ่อมและรายการที่รอส่งศูนย์บริการ
  </p>

  <h3>3.1 การประเมินความคุ้มค่าในการส่งซ่อม (Viability Score)</h3>
  <p>
    ระบบ ClaimIT มีระบบช่วยคำนวณความคุ้มค่าในการส่งซ่อมให้อัตโนมัติ โดยคิดจากอายุการใช้งานและราคาประเมินอะไหล่:
  </p>
  <div style="text-align:center; margin:15px 0;">
    ${getViabilitySvg()}
  </div>
  <ul>
    <li><strong>คะแนน 1.0 – 5.0 (🟢 คุ้มค่าส่งซ่อม):</strong> สมควรส่งเคลมศูนย์บริการทันที</li>
    <li><strong>คะแนน 5.1 – 10.0 (🔴 ซ่อมไม่คุ้ม / เสนอปลด):</strong> เครื่องเก่าเกิน 5 ปี หรือค่าซ่อมประเมินไม่คุ้มค่า ควรเสนอหัวหน้างานเพื่อรออนุมัติจำหน่ายหรือเปลี่ยนเครื่องใหม่</li>
  </ul>

  <h3>3.2 มาตรการปกป้องข้อมูลก่อนส่งอุปกรณ์ภายนอก (Data Sanitization)</h3>
  <div class="callout danger">
    <div class="callout-title">🛑 ข้อบังคับสำคัญ: ต้องล้างข้อมูลก่อนส่งศูนย์ภายนอก</div>
    คอมพิวเตอร์และอุปกรณ์ที่มีการเก็บข้อมูลสำคัญหรือข้อมูลส่วนบุคคล (ฮาร์ดดิสก์/SSD) จะ<strong>ถูกระบบบล็อกไม่ให้ออกใบเคลมเด็ดขาด</strong> จนกว่าผู้ดูแลระบบ Admin จะยืนยันว่าได้ถอดฮาร์ดดิสก์ออก หรือทำการล้างข้อมูล (Format/Wipe) เรียบร้อยแล้ว เพื่อความปลอดภัยตามนโยบายความปลอดภัยสารสนเทศของโรงพยาบาล
  </div>

  <p><strong>ขั้นตอนการยืนยันการล้างข้อมูล:</strong></p>
  <ol>
    <li>เปิดดูข้อมูลเครื่องที่แจ้งซ่อมในระบบ</li>
    <li>ติ๊กถูกที่ช่อง <em>"ฉันขอยืนยันว่าได้ถอดสื่อบันทึกข้อมูล หรือล้างข้อมูลความปลอดภัยเรียบร้อยแล้ว"</em></li>
    <li>พิมพ์รหัสยืนยันในช่อง: <strong style="color:#0284c7; font-size:15pt;">ยืนยัน หรือ WIPED</strong></li>
    <li>กดปุ่ม <strong>[ยืนยันความปลอดภัยข้อมูล]</strong> ระบบจะปลดล็อคให้สร้างใบส่งเคลมได้ทันที</li>
  </ol>

  <h3>3.3 การออกใบส่งเคลมศูนย์บริการ (RMA Claim)</h3>
  <ol>
    <li>ไปที่แท็บ <strong>"📑 รายการใบส่งเคลม"</strong> แล้วกด <strong>[➕ สร้างใบเคลมใหม่]</strong></li>
    <li>เลือก <strong>ศูนย์บริการ (Vendor)</strong> เช่น Dell ProSupport, HP Service, Apple Care</li>
    <li>ใส่ <strong>หมายเลข RMA / Case No.</strong> ที่เปิดไว้กับศูนย์บริการ</li>
    <li>ระบุรหัสครุภัณฑ์ที่ต้องการส่งรอบนี้ (รวมส่งได้ <strong>1 ถึง 5 เครื่องต่อ 1 ใบเคลม</strong>)</li>
    <li>กดบันทึก ระบบจะเปลี่ยนสถานะเครื่องเป็น <code>Pending Pickup (รอรถขนส่งมารับ)</code></li>
  </ol>

  <h3>3.4 การตรวจรับเครื่องคืนและปิดงานซ่อม</h3>
  <p>
    เมื่อศูนย์บริการนำเครื่องที่ซ่อมเสร็จกลับมาส่งคืน:
  </p>
  <ul>
    <li>ค้นหาใบเคลมในระบบ แล้วกดปุ่ม <strong>[รับอุปกรณ์คืน]</strong></li>
    <li>เลือกผลการซ่อม (เช่น ซ่อมเสร็จเปลี่ยนอะไหล่ หรือ เปลี่ยนเครื่องใหม่)</li>
    <li>สถานะเครื่องจะกลับมาเป็น <strong>Working (ปกติ)</strong> พร้อมนำส่งคืนแผนกเดิมเพื่อใช้งานทันที</li>
  </ul>

  <h3>3.5 การพิมพ์เอกสาร PDF</h3>
  <p>
    สามารถกดพิมพ์เอกสารทางการภาษาไทยได้ทุกเมื่อ:
  </p>
  <ul>
    <li><strong>ใบส่งมอบงานซ่อม (Repair Slip):</strong> ใช้สำหรับติดบนตัวเครื่องและให้ผู้ส่ง-ผู้รับลงชื่อ</li>
    <li><strong>ใบสรุปส่งเคลม (RMA Report):</strong> ใช้สำหรับแนบส่งให้พนักงานขนส่งของศูนย์บริการ</li>
  </ul>

  <div class="page-break"></div>

  <!-- CHAPTER 4 -->
  <h2 id="ch4">ส่วนที่ 3: การลงทะเบียนครุภัณฑ์ใหม่และการจำหน่ายซาก (สำหรับผู้ดูแลพัสดุไอที)</h2>

  <h3>4.1 การเพิ่มคอมพิวเตอร์และอุปกรณ์ใหม่เข้าสู่ระบบ</h3>
  <p>
    เมื่อหน่วยงานจัดซื้ออุปกรณ์ไอทีเข้ามาใหม่:
  </p>
  <ol>
    <li>เข้าเมนู IT Portal แล้วกดปุ่ม <strong>[➕ เพิ่มครุภัณฑ์ใหม่]</strong></li>
    <li>กรอกข้อมูลสำคัญ: รหัสครุภัณฑ์, แบรนด์, รุ่น, Serial Number, แผนกที่นำไปติดตั้ง</li>
    <li>ระบุวันที่เริ่มรับประกัน และระยะเวลารับประกัน (เช่น 1 ปี, 2 ปี, 3 ปี หรือ 5 ปี)</li>
    <li>กดบันทึก อุปกรณ์จะพร้อมให้ตรวจสอบและแจ้งซ่อมในระบบทันที</li>
  </ol>

  <h3>4.2 การจัดการอุปกรณ์เลิกใช้งาน / ซ่อมไม่คุ้ม</h3>
  <p>
    สำหรับเครื่องที่เก่ามาก ซ่อมไม่คุ้ม หรือชำรุดถาวร สามารถเปลี่ยนสถานะได้ 3 รูปแบบ:
  </p>
  <ul>
    <li><strong>รอขายทอดตลาด (Pending Sell):</strong> สำหรับเครื่องที่ยังเปิดติดแต่นำมาประมูลขายตามระเบียบพัสดุ</li>
    <li><strong>รอส่งมอบเพื่อบริจาค (Pending Donation):</strong> สำหรับคอมพิวเตอร์ที่พร้อมส่งต่อให้โรงเรียน</li>
    <li><strong>รออนุมัติจำหน่าย (Scrapped):</strong> สำหรับเครื่องที่เมนบอร์ดไหม้ หรือเสียหายถาวร พร้อมส่งทำลาย</li>
  </ul>

  <h3>4.3 การส่งออกรายงานเป็น Excel</h3>
  <p>
    ผู้ดูแลระบบสามารถกดปุ่ม <strong>[ส่งออก Excel (.xlsx)]</strong> เพื่อดาวน์โหลดสรุปประวัติงานซ่อมและสต็อกครุภัณฑ์ทั้งหมดไปทำรายงานเสนอผู้บริหารประจำเดือนได้ทันที
  </p>

  <div class="page-break"></div>

  <!-- CHAPTER 5 -->
  <h2 id="ch5">ส่วนที่ 4: การแก้ปัญหาเบื้องต้นที่พบบ่อย (FAQ & Troubleshooting)</h2>

  <h3>Q1: ยิงสแกนเนอร์บาร์โค้ดแล้วตัวหนังสือไม่ขึ้น หรือขึ้นเป็นภาษาไทยเพี้ยน?</h3>
  <p>
    <strong>วิธีแก้:</strong> ให้ตรวจสอบแป้นพิมพ์คอมพิวเตอร์ของท่านว่าเปิดภาษาไทยไว้หรือไม่ ให้กดเปลี่ยนภาษาบนแป้นพิมพ์เป็น <strong>ภาษาอังกฤษ (EN)</strong> ก่อนยิงบาร์โค้ดเสมอ
  </p>

  <h3>Q2: ใช้มือถือสแกนแล้ว แป้นพิมพ์บนจอมือถือเด้งขึ้นมาบังหน้าจอทำอย่างไร?</h3>
  <p>
    <strong>วิธีแก้:</strong> ให้เปิดสวิตช์ <strong>"🔒 โหมดเครื่องยิงบาร์โค้ด"</strong> ที่อยู่ข้างช่องค้นหา ระบบจะซ่อนแป้นพิมพ์เสมือนไม่ให้เด้งขึ้นมารบกวนการทำงาน
  </p>

  <h3>Q3: กดปุ่มกล้องบนมือถือแล้วระบบไม่เปิดกล้องให้?</h3>
  <p>
    <strong>วิธีแก้:</strong> หากเข้าใช้งานผ่าน WiFi ให้กดปุ่ม <strong>[📷 ถ่ายรูป]</strong> หรือ <strong>[ถ่ายรูปบาร์โค้ด / อัปโหลดภาพ]</strong> ระบบจะเรียกแอปพลิเคชันกล้องของโทรศัพท์ขึ้นมาให้ถ่ายรูปและแนบเข้าระบบได้ทันที 100%
  </p>

  <h3>Q4: หน้าจอ Logout มืดค้าง หรือเมนูด้านข้างบนมือถือไม่ยอมปิด?</h3>
  <p>
    <strong>วิธีแก้:</strong> สามารถแตะที่พื้นที่ว่างสีดำ หรือแตะที่เมนูใดก็ได้ หน้าต่างเมนูจะปิดลงทันทีอย่างราบรื่น
  </p>

  <h3>Q5: หากลืมรหัสผ่านต้องทำอย่างไร?</h3>
  <p>
    <strong>วิธีแก้:</strong> ให้ติดต่อผู้ดูแลระบบ Admin เพื่อกดปุ่มรีเซ็ตรหัสผ่านใหม่ให้ในระบบได้ทันที
  </p>

  <hr style="margin-top:40px; border:0; border-top:1px solid #cbd5e1;">
  <div style="text-align:center; color:#64748b; font-size:11pt; padding:20px 0;">
    ClaimIT IT Warranty & RMA Claim Management System — คู่มือผู้ปฏิบัติงาน ฉบับปี 2026
  </div>

</div>

</body>
</html>
`;
}

// Generate Clean User-Centric Markdown Content
function generateMarkdownContent() {
  return `# 💻 คู่มือการใช้งานระบบ ClaimIT (User Manual)
> **ระบบบริหารจัดการรับประกันและส่งเคลมครุภัณฑ์คอมพิวเตอร์**  
> *(IT Warranty & RMA Claim Management System — คู่มือผู้ปฏิบัติงาน ฉบับปี 2026)*

---

## 📑 สารบัญคู่มือ (Table of Contents)
1. [บทนำ: แนะนำระบบ ClaimIT และการเข้าสู่ระบบ](#บทนำ-แนะนำระบบ-claimit-และการเข้าสู่ระบบ)
2. [ส่วนที่ 1: ขั้นตอนการแจ้งซ่อมและยืมเครื่องสำรอง (สำหรับ Staff)](#ส่วนที่-1-ขั้นตอนการแจ้งซ่อมและยืมเครื่องสำรอง-สำหรับ-staff)
3. [ส่วนที่ 2: ขั้นตอนการล้างข้อมูลและการส่งเคลมศูนย์บริการ (สำหรับ Admin)](#ส่วนที่-2-ขั้นตอนการล้างข้อมูลและการส่งเคลมศูนย์บริการ-สำหรับ-admin)
4. [ส่วนที่ 3: การลงทะเบียนครุภัณฑ์ใหม่และการจำหน่ายซาก (สำหรับผู้ดูแลพัสดุไอที)](#ส่วนที่-3-การลงทะเบียนครุภัณฑ์ใหม่และการจำหน่ายซาก-สำหรับผู้ดูแลพัสดุไอที)
5. [ส่วนที่ 4: การแก้ปัญหาเบื้องต้นที่พบบ่อย (FAQ & Troubleshooting)](#ส่วนที่-4-การแก้ปัญหาเบื้องต้นที่พบบ่อย-faq--troubleshooting)

---

## บทนำ: แนะนำระบบ ClaimIT และการเข้าสู่ระบบ

ระบบ **ClaimIT** พัฒนาขึ้นเพื่อช่วยให้เจ้าหน้าที่และผู้ปฏิบัติงานติดตามประกันคอมพิวเตอร์และแจ้งซ่อมได้อย่างสะดวกรวดเร็ว:
* ตรวจสอบวันหมดอายุรับประกันได้ทันทีแค่สแกนบาร์โค้ด
* แจ้งซ่อมออนไลน์พร้อมถ่ายภาพความเสียหายได้ทันทีจากมือถือ
* ขอยืมเครื่องสำรองใช้งานระหว่างซ่อมไปใช้งานทดแทนได้ทันที
* ตรวจสอบสถานะงานซ่อมได้ตลอดเวลาโดยไม่ต้องโทรตามงาน

### บัญชีผู้ใช้งานเริ่มต้น
| ประเภทผู้ใช้งาน | Username | Password | หน้าที่หลัก |
|---|---|---|---|
| **ผู้ใช้งานระดับ Staff** | \`staff\` | \`staff123\` | สแกนบาร์โค้ด, ตรวจสอบประกัน, แจ้งซ่อม, ขอยืมเครื่องสำรอง |
| **ผู้ดูแลระบบระดับ Admin** | \`admin\` | \`admin123\` | อนุมัติส่งซ่อม, ล้างข้อมูลก่อนส่งซ่อม (Data Sanitization), ออกใบเคลมศูนย์บริการ, พิมพ์เอกสาร |

> 🔒 **ความปลอดภัย 15 นาที:** หากไม่มีการขยับหน้าจอเป็นเวลา 15 นาที ระบบจะแจ้งเตือนหมดเวลาการเข้าใช้งานและออกจากระบบให้อัตโนมัติ เพื่อป้องกันผู้อื่นเข้าใช้งานต่อ

---

## ส่วนที่ 1: ขั้นตอนการแจ้งซ่อมและยืมเครื่องสำรอง (สำหรับ Staff)

เมื่อล็อกอินแล้ว ให้แตะที่เมนู **"🛠️ ระบบแจ้งซ่อมประจำแผนก (Staff)"**:

### ขั้นตอนการแจ้งซ่อม (5 ขั้นตอน):
1. **ค้นหาเครื่อง:** ยิงบาร์โค้ด หรือพิมพ์รหัสครุภัณฑ์ (เช่น \`CIT-2024-AIO-02\`) หรือกดปุ่ม **[📷 สแกนผ่านกล้อง]** เพื่อถ่ายภาพบาร์โค้ด
2. **ดูแถบสีสถานะรับประกัน:**
   - \`🟢 ปกติ ในประกัน:\` เครื่องยังอยู่ในประกันศูนย์ ซ่อมฟรี พร้อมบอกปี พ.ศ. ที่หมดอายุ
   - \`⚠️ ใกล้หมดประกันใน 6 เดือน:\` เตือนให้รีบตรวจสอบก่อนหมดสิทธิ์เคลม
   - \`🔴 หมดอายุประกันแล้ว:\` เครื่องหมดประกันแล้ว ฝ่ายไอทีจะประเมินการซ่อมตามความเหมาะสม
3. **เลือกอาการเสีย:** กดเลือกอาการเสียยอดนิยม (เช่น เปิดไม่ติด, จอดับ, สแกนไม่ติด ฯลฯ)
4. **ถ่ายภาพความเสียหาย:** กดปุ่มถ่ายภาพรอยแตกหรือรอยชำรุด ภาพจะถูกแนบเข้าใบแจ้งซ่อมทันที
5. **กดส่งเรื่อง:** กดปุ่มสีแดง **[🚨 ส่งเรื่องแจ้งซ่อม]** เพื่อส่งเรื่องให้ฝ่ายไอทีเข้าดำเนินการ

### การขอยืมเครื่องสำรองใช้งาน:
หากคอมพิวเตอร์หรือเครื่องพิมพ์ในจุดบริการสำคัญเกิดเสียและต้องยกไปซ่อม:
* กดปุ่ม **[📦 ขอยืมเครื่องสำรองใช้งาน]**
* เลือกรหัสเครื่องสำรองที่มีพร้อมในคลัง (เช่น \`LNR-AIO-01\`)
* นำเครื่องสำรองไปติดตั้งใช้งานแทนได้ทันที ไม่กระทบการปฏิบัติงานของหน่วยงาน

---

## ส่วนที่ 2: ขั้นตอนการล้างข้อมูลและการส่งเคลมศูนย์บริการ (สำหรับ Admin)

สำหรับผู้ดูแลระบบระดับ Admin ที่ดูแลงานส่งเคลม:

### 1. ผลประเมินความคุ้มค่าในการซ่อม (Viability Score)
* ระบบคำนวณคะแนนให้อัตโนมัติ:
  * **0.0 – 5.0 (\`VIABLE\` - 🟢 คุ้มค่าส่งซ่อม):** สมควรส่งศูนย์ซ่อมทันที
  * **5.1 – 10.0 (\`NOT_VIABLE\` - 🔴 ซ่อมไม่คุ้ม / เสนอปลด):** เครื่องเก่าเกิน 5 ปี หรือค่าซ่อมประเมินไม่คุ้มค่า ควรเสนอรออนุมัติจำหน่าย

### 2. มาตรการปกป้องข้อมูลก่อนส่งอุปกรณ์ภายนอก (Data Sanitization)
> 🛑 **ข้อบังคับ:** อุปกรณ์ที่มีฮาร์ดดิสก์/SSD จะถูกบล็อกไม่ให้ออกใบส่งเคลมเด็ดขาด จนกว่าจะยืนยันการล้างข้อมูลก่อนส่งซ่อมตามนโยบายความปลอดภัยสารสนเทศ
1. ติ๊กช่อง *"ฉันขอยืนยันว่าได้ถอดสื่อบันทึกข้อมูล หรือล้างข้อมูลเรียบร้อยแล้ว"*
2. พิมพ์รหัสยืนยัน: **\`ยืนยัน\`** หรือ **\`WIPED\`**
3. กดปุ่ม **[ยืนยันความปลอดภัยข้อมูล]** ระบบจะปลดล็อคให้ออกใบเคลมได้ทันที

### 3. การสร้างใบส่งเคลมศูนย์บริการ (RMA Claim)
* ไปที่แท็บ **"📑 รายการส่งซ่อมศูนย์บริการ (RMA)"** แล้วกด **[➕ สร้างใบเคลมใหม่]**
* เลือกศูนย์บริการ (เช่น Dell, HP, Apple) และระบุหมายเลข RMA
* ระบุรหัสครุภัณฑ์ที่จะส่งซ่อม (รวมส่งได้ **1 ถึง 5 เครื่องต่อ 1 ใบเคลม**)
* บันทึกรายการ เครื่องจะเปลี่ยนสถานะเป็น \`Pending Pickup (รอรถขนส่งมารับ)\`

### 4. การตรวจรับเครื่องคืนและพิมพ์เอกสาร
* เมื่อศูนย์ซ่อมส่งเครื่องคืน: ค้นหาใบเคลมแล้วกด **[รับอุปกรณ์คืน]** เครื่องจะกลับสู่สถานะ \`Working (ปกติ)\` พร้อมนำส่งคืนแผนกเดิมเพื่อใช้งาน
* การพิมพ์เอกสาร: สามารถกดดาวน์โหลด **ใบส่งมอบงานซ่อม** หรือ **ใบส่งเคลมศูนย์บริการ** เป็นไฟล์ PDF ทางการได้ทันที

---

## ส่วนที่ 3: การลงทะเบียนครุภัณฑ์ใหม่และการจำหน่ายซาก (สำหรับผู้ดูแลพัสดุไอที)

* **ลงทะเบียนเครื่องใหม่:** เข้า IT Portal กดปุ่ม **[➕ เพิ่มครุภัณฑ์ใหม่]** กรอกรุ่น แบรนด์ แผนกติดตั้ง และระยะเวลารับประกัน
* **การจัดการอุปกรณ์เลิกใช้งาน / ซ่อมไม่คุ้ม:**
  1. **รอขายทอดตลาด (\`Pending Sell\`):** อุปกรณ์เลิกใช้งานรอขายทอดตลาด
  2. **รอส่งมอบเพื่อบริจาค (\`Pending Donation\`):** เครื่องพร้อมส่งมอบบริจาคแก่สถานศึกษา
  3. **รออนุมัติจำหน่าย (\`Scrapped\`):** เสียหายถาวร ส่งทำลายขยะอิเล็กทรอนิกส์
* **ส่งออกรายงาน:** กดปุ่ม **[ส่งออก Excel (.xlsx)]** เพื่อทำรายงานสรุปประจำเดือน

---

## ส่วนที่ 4: การแก้ปัญหาเบื้องต้นที่พบบ่อย (FAQ & Troubleshooting)

* **Q: ยิงบาร์โค้ดแล้วขึ้นภาษาไทยเพี้ยน?**  
  *A:* ให้เปลี่ยนแป้นพิมพ์คอมพิวเตอร์เป็นภาษาอังกฤษ (EN) ก่อนยิงบาร์โค้ด
* **Q: แป้นพิมพ์บนจอมือถือเด้งขึ้นมาบังเวลาสแกน?**  
  *A:* เปิดสวิตช์ **"🔒 โหมดเครื่องยิงบาร์โค้ด"** แป้นพิมพ์จำลองจะไม่เด้งขึ้นมากวนใจ
* **Q: กดปุ่มกล้องบนมือถือแล้วไม่ขึ้นภาพ?**  
  *A:* ให้กดปุ่ม **[📷 สแกนผ่านกล้อง]** หรือ **[ถ่ายรูปบาร์โค้ด / อัปโหลดภาพ]** เพื่อเรียกแอปกล้องของมือถือขึ้นมาถ่ายภาพได้ทันที 100%
* **Q: ลืมรหัสผ่านทำอย่างไร?**  
  *A:* ติดต่อผู้ดูแลระบบ Admin เพื่อกดปุ่มรีเซ็ตรหัสผ่านใหม่ให้ในระบบ
`;
}

// Write files
console.log('Generating Authentic User Manual files...');

// 1. In claimIT folder
fs.writeFileSync(docPath, '\ufeff' + generateHtmlAndWordContent(true), 'utf8');
fs.writeFileSync(htmlPath, '\ufeff' + generateHtmlAndWordContent(false), 'utf8');
fs.writeFileSync(mdPath, generateMarkdownContent(), 'utf8');

// 2. In root folder (d:/claimit)
fs.writeFileSync(rootDocPath, '\ufeff' + generateHtmlAndWordContent(true), 'utf8');
fs.writeFileSync(rootHtmlPath, '\ufeff' + generateHtmlAndWordContent(false), 'utf8');
fs.writeFileSync(rootMdPath, generateMarkdownContent(), 'utf8');

console.log('✅ Generated Word Document (.doc):', docPath, 'and', rootDocPath);
console.log('✅ Generated HTML Manual (.html):', htmlPath, 'and', rootHtmlPath);
console.log('✅ Generated Markdown Manual (.md):', mdPath, 'and', rootMdPath);
