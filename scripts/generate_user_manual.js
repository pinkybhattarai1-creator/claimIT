/**
 * scripts/generate_user_manual.js
 * Generates comprehensive, genuine End-User Manual (คู่มือการใช้งานระบบ ClaimIT สองด้าน: Staff & Admin)
 * in 3 primary formats:
 * 1. คู่มือการใช้งาน_ClaimIT.doc (Microsoft Word Document format with Word styling)
 * 2. คู่มือการใช้งาน_ClaimIT.html (Interactive, print-ready HTML manual with CSS visual styling)
 * 3. คู่มือการใช้งาน_ClaimIT.md (Markdown document for repository/Git)
 * 4. USER_MANUAL.md (Standard English/Thai repository manual)
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..');
const docPath = path.join(outputDir, 'คู่มือการใช้งาน_ClaimIT.doc');
const htmlPath = path.join(outputDir, 'คู่มือการใช้งาน_ClaimIT.html');
const mdPath = path.join(outputDir, 'คู่มือการใช้งาน_ClaimIT.md');
const userManualPath = path.join(outputDir, 'USER_MANUAL.md');

const rootDir = path.join(__dirname, '..', '..');
const rootDocPath = path.join(rootDir, 'คู่มือการใช้งาน_ClaimIT.doc');
const rootHtmlPath = path.join(rootDir, 'คู่มือการใช้งาน_ClaimIT.html');
const rootMdPath = path.join(rootDir, 'คู่มือการใช้งาน_ClaimIT.md');
const rootUserManualPath = path.join(rootDir, 'USER_MANUAL.md');

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
    <text x="85" y="96" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#e0f2fe">เจ้าหน้าที่วอร์ด (Staff)</text>
    <path d="M 155 70 L 180 70 M 175 65 L 180 70 L 175 75" stroke="#0284c7" stroke-width="2.5" fill="none"/>
    <!-- Step 2 -->
    <rect x="185" y="25" width="130" height="90" rx="8" fill="url(#gRed)" filter="url(#shadow)"/>
    <text x="250" y="55" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#fff">🔒</text>
    <text x="250" y="78" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">2. ล้างข้อมูล PDPA</text>
    <text x="250" y="96" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#fee2e2">พิมพ์ "ยืนยัน" / "WIPED"</text>
    <path d="M 320 70 L 345 70 M 340 65 L 345 70 L 340 75" stroke="#ef4444" stroke-width="2.5" fill="none"/>
    <!-- Step 3 -->
    <rect x="350" y="25" width="130" height="90" rx="8" fill="url(#gPurple)" filter="url(#shadow)"/>
    <text x="415" y="55" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#fff">⚖️</text>
    <text x="415" y="78" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">3. ประเมินความคุ้ม</text>
    <text x="415" y="96" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#f3e8ff">Viability Score &le; 5.0</text>
    <path d="M 485 70 L 510 70 M 505 65 L 510 70 L 505 75" stroke="#8b5cf6" stroke-width="2.5" fill="none"/>
    <!-- Step 4 -->
    <rect x="515" y="25" width="130" height="90" rx="8" fill="url(#gAmber)" filter="url(#shadow)"/>
    <text x="580" y="55" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#fff">📑</text>
    <text x="580" y="78" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">4. ส่งเคลมศูนย์ซ่อม</text>
    <text x="580" y="96" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#fef3c7">ใบเคลม RMA 1-5 เครื่อง</text>
    <path d="M 650 70 L 675 70 M 670 65 L 675 70 L 670 75" stroke="#f59e0b" stroke-width="2.5" fill="none"/>
    <!-- Step 5 -->
    <rect x="680" y="25" width="135" height="90" rx="8" fill="url(#gGreen)" filter="url(#shadow)"/>
    <text x="747" y="55" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#fff">✅</text>
    <text x="747" y="78" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#fff">5. รับเครื่องส่งคืนวอร์ด</text>
    <text x="747" y="96" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#d1fae5">สถานะปกติ พร้อมใช้งาน</text>
  </svg>`;
}

function getMobileUiSvg() {
  return `<svg width="100%" height="490" viewBox="0 0 360 490" xmlns="http://www.w3.org/2000/svg" style="background:#f1f5f9; border-radius:12px; border:2px solid #cbd5e1; margin:15px auto; display:block; max-width:360px;">
    <!-- Phone Topbar -->
    <rect x="0" y="0" width="360" height="48" fill="#1e293b"/>
    <text x="16" y="30" font-family="sans-serif" font-size="18" fill="#ffffff">☰</text>
    <text x="45" y="30" font-family="sans-serif" font-size="16" font-weight="bold" fill="#38bdf8">ClaimIT</text>
    <rect x="175" y="14" width="85" height="22" rx="11" fill="#ea580c"/>
    <text x="217" y="29" font-family="sans-serif" font-size="11" font-weight="bold" fill="#fff" text-anchor="middle">⚠️ 12 ใกล้หมด</text>
    <circle cx="330" cy="24" r="14" fill="#0284c7"/>
    <text x="330" y="28" font-family="sans-serif" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle">ST</text>

    <!-- IT Hotline Banner -->
    <rect x="12" y="56" width="336" height="32" rx="6" fill="#e0f2fe" stroke="#bae6fd"/>
    <text x="22" y="77" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0369a1">☎️ แจ้งฝ่ายไอทีเร่งด่วน: 4401 - 4403</text>
    <rect x="270" y="60" width="70" height="24" rx="4" fill="#0284c7"/>
    <text x="305" y="76" font-family="sans-serif" font-size="11" font-weight="bold" fill="#fff" text-anchor="middle">โทรออก</text>

    <!-- Sticky Scanner Box -->
    <rect x="12" y="96" width="336" height="85" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
    <rect x="22" y="106" width="220" height="34" rx="4" fill="#f8fafc" stroke="#94a3b8"/>
    <text x="32" y="128" font-family="monospace" font-size="13" fill="#0f172a">CIT-2024-AIO-02</text>
    <rect x="248" y="106" width="45" height="34" rx="4" fill="#0284c7"/>
    <text x="270" y="127" font-family="sans-serif" font-size="12" fill="#fff" text-anchor="middle">🔍</text>
    <rect x="298" y="106" width="40" height="34" rx="4" fill="#10b981"/>
    <text x="318" y="127" font-family="sans-serif" font-size="12" fill="#fff" text-anchor="middle">📷</text>
    <circle cx="30" cy="160" r="6" fill="#16a34a"/>
    <text x="44" y="164" font-family="sans-serif" font-size="11" fill="#475569">🔒 ล็อกหัวอ่านบาร์โค้ด (ปิดแป้นพิมพ์บนจอ)</text>

    <!-- Asset Detail Card -->
    <rect x="12" y="190" width="336" height="230" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
    <rect x="12" y="190" width="336" height="32" rx="8" fill="#e0f2fe"/>
    <text x="24" y="211" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0369a1">💻 คอมพิวเตอร์ All-in-One (จุดบริการ 1)</text>
    <text x="24" y="238" font-family="sans-serif" font-size="12" fill="#334155">รหัสครุภัณฑ์: <strong>CIT-2024-AIO-02</strong></text>
    <text x="24" y="258" font-family="sans-serif" font-size="12" fill="#334155">สถานที่: อาคาร 1 ชั้น 2 แผนกผู้ป่วยนอก</text>
    <rect x="24" y="270" width="312" height="28" rx="4" fill="#dcfce7"/>
    <text x="34" y="289" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">🟢 ประกันปกติ (หมดอายุ พ.ศ. 2570 / ค.ศ. 2027)</text>
    
    <!-- State: Broken Guardrail -->
    <rect x="24" y="306" width="312" height="42" rx="6" fill="#f1f5f9" stroke="#cbd5e1"/>
    <text x="180" y="324" font-family="sans-serif" font-size="12" font-weight="bold" fill="#94a3b8" text-anchor="middle">🚨 แจ้งชำรุดเข้าส่วนกลาง (ปิดใช้งาน)</text>
    <text x="180" y="340" font-family="sans-serif" font-size="10" fill="#64748b" text-anchor="middle">⚠️ อุปกรณ์นี้ได้รับการแจ้งซ่อมแล้ว ไม่สามารถแจ้งซ้ำได้</text>

    <!-- Loaner Action -->
    <rect x="24" y="358" width="312" height="42" rx="6" fill="#fffbeb" stroke="#fde68a"/>
    <text x="180" y="384" font-family="sans-serif" font-size="12" font-weight="bold" fill="#b45309" text-anchor="middle">📦 ขอยืมอุปกรณ์สำรองฉุกเฉิน (Loaner Unit)</text>

    <!-- Role Disabled Button Note -->
    <rect x="12" y="430" width="336" height="45" rx="6" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="22" y="448" font-family="sans-serif" font-size="11" fill="#64748b">⚙️ ปุ่มตั้งค่าระบบ: แสดงเป็นสีเทา (สำหรับ Admin เท่านั้น)</text>
    <text x="22" y="465" font-family="sans-serif" font-size="10" fill="#94a3b8">ระบบล็อกตามสิทธิ์เพื่อความปลอดภัยและความเรียบง่าย</text>
  </svg>`;
}

function getAdminUiSvg() {
  return `<svg width="100%" height="220" viewBox="0 0 840 220" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; border-radius:8px; border:1px solid #cbd5e1; margin:15px 0;">
    <!-- Top Filter Bar -->
    <rect x="15" y="15" width="810" height="50" rx="6" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="30" y="45" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a">กรองข้อมูล:</text>
    
    <!-- Category Dropdown -->
    <rect x="110" y="25" width="180" height="30" rx="4" fill="#ffffff" stroke="#94a3b8"/>
    <text x="125" y="45" font-family="sans-serif" font-size="12" fill="#0f172a">📁 หมวดหมู่: ทั้งหมด (All) ▾</text>

    <!-- Status Filter -->
    <rect x="305" y="25" width="160" height="30" rx="4" fill="#ffffff" stroke="#94a3b8"/>
    <text x="320" y="45" font-family="sans-serif" font-size="12" fill="#0f172a">📊 สถานะ: ทั้งหมด ▾</text>

    <!-- Add Asset Button -->
    <rect x="670" y="25" width="140" height="30" rx="4" fill="#0284c7"/>
    <text x="740" y="45" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">➕ เพิ่มครุภัณฑ์ใหม่</text>

    <!-- Table Mockup -->
    <rect x="15" y="75" width="810" height="85" fill="#f1f5f9" stroke="#e2e8f0"/>
    <line x1="15" y1="105" x2="825" y2="105" stroke="#cbd5e1"/>
    <text x="30" y="95" font-family="sans-serif" font-size="11" font-weight="bold" fill="#475569">รหัสครุภัณฑ์</text>
    <text x="170" y="95" font-family="sans-serif" font-size="11" font-weight="bold" fill="#475569">ยี่ห้อ/รุ่น (Single-Brand)</text>
    <text x="380" y="95" font-family="sans-serif" font-size="11" font-weight="bold" fill="#475569">สถานที่ (ผังอาคาร 1-Call Center)</text>
    <text x="630" y="95" font-family="sans-serif" font-size="11" font-weight="bold" fill="#475569">สถานะรับประกัน</text>
    <text x="760" y="95" font-family="sans-serif" font-size="11" font-weight="bold" fill="#475569">จัดการ</text>

    <text x="30" y="130" font-family="monospace" font-size="11" fill="#0f172a">CIT-2024-AIO-01</text>
    <text x="170" y="130" font-family="sans-serif" font-size="11" fill="#0f172a">Dell OptiPlex 7400</text>
    <text x="380" y="130" font-family="sans-serif" font-size="11" fill="#0f172a">Building 1 ชั้น 2 (OPD)</text>
    <text x="630" y="130" font-family="sans-serif" font-size="11" fill="#16a34a">🟢 ปกติ (พ.ศ. 2570)</text>
    <text x="760" y="130" font-family="sans-serif" font-size="11" fill="#0284c7">🔍 รายละเอียด</text>

    <!-- Pagination Slots -->
    <rect x="15" y="170" width="810" height="40" rx="6" fill="#f8fafc"/>
    <text x="30" y="195" font-family="sans-serif" font-size="12" fill="#64748b">แสดง 1 - 25 จากทั้งหมด 348 รายการ</text>
    
    <!-- Slots -->
    <rect x="600" y="176" width="30" height="28" rx="4" fill="#e2e8f0"/>
    <text x="615" y="195" font-family="sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">&lt;</text>
    <rect x="636" y="176" width="30" height="28" rx="4" fill="#0284c7"/>
    <text x="651" y="195" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">1</text>
    <rect x="672" y="176" width="30" height="28" rx="4" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="687" y="195" font-family="sans-serif" font-size="12" fill="#334155" text-anchor="middle">2</text>
    <rect x="708" y="176" width="30" height="28" rx="4" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="723" y="195" font-family="sans-serif" font-size="12" fill="#334155" text-anchor="middle">3</text>
    <rect x="744" y="176" width="30" height="28" rx="4" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="759" y="195" font-family="sans-serif" font-size="12" fill="#334155" text-anchor="middle">4</text>
    <rect x="780" y="176" width="30" height="28" rx="4" fill="#ffffff" stroke="#cbd5e1"/>
    <text x="795" y="195" font-family="sans-serif" font-size="12" fill="#334155" text-anchor="middle">&gt;</text>
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
  <title>คู่มือการใช้งานระบบ ClaimIT (Dual-Role User & Admin Manual)</title>
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
      max-width: 920px;
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
      margin-bottom: 30px;
    }
    .cover-icon {
      font-size: 48pt;
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
      margin-bottom: 15px;
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
    .badge-side1 {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .badge-side2 {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .meta-box {
      margin-top: 20px;
      padding: 14px;
      background: #f1f5f9;
      border-radius: 6px;
      font-size: 12pt;
      color: #334155;
    }
    h2.side-header {
      padding: 12px 18px;
      border-radius: 6px;
      color: #ffffff;
      margin-top: 45px;
      font-size: 18pt;
    }
    .side-header-1 {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }
    .side-header-2 {
      background: linear-gradient(135deg, #0284c7 0%, #1e40af 100%);
    }
    h2 {
      color: #0284c7;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-top: 35px;
      font-size: 17pt;
    }
    h3 {
      color: #334155;
      margin-top: 22px;
      font-size: 14pt;
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
      padding: 9px 12px;
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
      padding: 14px 18px;
      border-left: 5px solid #0284c7;
      background: #f0f9ff;
      border-radius: 0 8px 8px 0;
      margin: 18px 0;
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
      margin-bottom: 4px;
    }
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>

<div class="container">

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-icon">💻 🏥 🛡️</div>
    <h1 class="title">คู่มือการใช้งานระบบ ClaimIT (Dual-Role User Manual)</h1>
    <div class="subtitle">ระบบบริหารจัดการรับประกันและส่งเคลมครุภัณฑ์คอมพิวเตอร์โรงพยาบาล<br>(Hospital IT Warranty & RMA Claim Management System)</div>
    <span class="badge badge-side1">🟢 SIDE 1: สำหรับเจ้าหน้าที่ประจำวอร์ด / ผู้ใช้งานทั่วไป (Staff)</span>
    <span class="badge badge-side2">🔵 SIDE 2: สำหรับผู้ดูแลระบบและทีมช่างไอที (Admin & Operations)</span>
    <span class="badge">ฉบับปรับปรุงปี 2026</span>
    <div class="meta-box">
      <strong>จัดทำโดย:</strong> ฝ่ายเทคโนโลยีสารสนเทศและโครงสร้างพื้นฐานโรงพยาบาล<br>
      <strong>โครงสร้างคู่มือ:</strong> แบ่งออกเป็น 2 ด้านอย่างชัดเจน เพื่อให้ผู้ใช้งานแต่ละกลุ่มสามารถเปิดอ่านและปฏิบัติตามได้อย่างรวดเร็วและถูกต้อง
    </div>
  </div>

  <!-- TABLE OF CONTENTS -->
  <h2>📑 สารบัญคู่มือ (Table of Contents)</h2>
  <div style="background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:25px;">
    <h3 style="margin-top:0; color:#047857;">🟢 ด้านที่ 1 (SIDE 1): คู่มือสำหรับเจ้าหน้าที่ประจำวอร์ด / ผู้ใช้งานทั่วไป (Staff Portal)</h3>
    <ul style="margin-bottom:15px; line-height:1.8;">
      <li><a href="#side1-intro">1.1 ภาพรวมและวิธีการเข้าสู่ระบบ (Login & Auto-Timeout 15 นาที)</a></li>
      <li><a href="#side1-scan">1.2 การค้นหาครุภัณฑ์ ตรวจสอบประกัน 2 ปฏิทิน (พ.ศ./ค.ศ.) และโหมดล็อกหัวอ่านบาร์โค้ด</a></li>
      <li><a href="#side1-report">1.3 การแจ้งซ่อมอุปกรณ์ชำรุด และระบบป้องกันการแจ้งซ้ำซ้อน (Duplicate Report Guardrail)</a></li>
      <li><a href="#side1-hotline">1.4 ช่องทางติดต่อด่วน IT Support Hotline (☎️ 4401 - 4403 โทรออกได้ทันที)</a></li>
      <li><a href="#side1-loaner">1.5 การขอยืมอุปกรณ์สำรองฉุกเฉิน (Emergency Loaner Units)</a></li>
      <li><a href="#side1-status">1.6 การติดตามสถานะงานซ่อมประจำแผนก และคำชี้แจงปุ่มฟังก์ชันสีเทา (Disabled Controls)</a></li>
    </ul>

    <h3 style="margin-top:15px; color:#1d4ed8;">🔵 ด้านที่ 2 (SIDE 2): คู่มือสำหรับผู้ดูแลระบบและฝ่ายไอที (Admin & Operations Portal)</h3>
    <ul style="margin-bottom:0; line-height:1.8;">
      <li><a href="#side2-dash">2.1 แดชบอร์ดศูนย์ควบคุมไอที (IT KPIs) และทางลัดเครื่องใกล้หมดประกัน</a></li>
      <li><a href="#side2-cat">2.2 การจัดการตารางครุภัณฑ์ด้วย Category Dropdown Selector และ Numbered Pagination Slots</a></li>
      <li><a href="#side2-asset">2.3 การลงทะเบียนครุภัณฑ์ใหม่: ระบบจำกัดยี่ห้อเดียว (Single-Brand) และผังอาคารโรงพยาบาล</a></li>
      <li><a href="#side2-pdpa">2.4 มาตรการความปลอดภัยข้อมูล PDPA (Enforced Wipe Gate: พิมพ์ "ยืนยัน" / "WIPED")</a></li>
      <li><a href="#side2-rma">2.5 การประเมินความคุ้มค่า (Viability Score &le; 5.0) และการออกใบส่งเคลม RMA (1-5 เครื่อง)</a></li>
      <li><a href="#side2-config">2.6 การตั้งค่าระบบ 5 แท็บ: ทำเนียบผังอาคารโรงพยาบาลถาวร และการแก้ไขเบอร์ Hotline ส่วนกลาง</a></li>
      <li><a href="#side2-return">2.7 การตรวจรับเครื่องซ่อมเสร็จ ส่งคืนวอร์ด และส่งออกรายงาน Excel / พิมพ์ PDF</a></li>
    </ul>

    <h3 style="margin-top:15px; color:#475569;">❓ ภาคผนวก: การแก้ปัญหาเบื้องต้นที่พบบ่อย (FAQ & Troubleshooting)</h3>
    <ul style="margin-bottom:0; line-height:1.8;">
      <li><a href="#faq">คำถามและข้อผิดพลาดที่พบบ่อย พร้อมวิธีแก้ไขด้วยตนเอง</a></li>
    </ul>
  </div>

  <div style="text-align:center; margin:25px 0;">
    <div style="font-weight:bold; color:#0369a1; margin-bottom:6px;">📊 ภาพรวมกระบวนการทำงานทั้ง 5 ขั้นตอน (End-to-End Workflow)</div>
    ${getWorkflowSvg()}
  </div>

  <div class="page-break"></div>

  <!-- ========================================== -->
  <!-- SIDE 1: WARD STAFF & GENERAL USERS         -->
  <!-- ========================================== -->
  <h2 class="side-header side-header-1" id="side1-intro">🟢 ด้านที่ 1 (SIDE 1): คู่มือสำหรับเจ้าหน้าที่ประจำวอร์ด / ผู้ใช้งานทั่วไป</h2>
  <p>
    หน้านี้ออกแบบมาเพื่อเจ้าหน้าที่พยาบาล เภสัชกร เจ้าหน้าที่เวชระเบียน และบุคลากรประจำวอร์ด เพื่อให้สามารถตรวจสอบประกันและแจ้งซ่อมได้อย่างสะดวกรวดเร็ว ไม่ซับซ้อน และไม่รบกวนเวลาการดูแลผู้ป่วย
  </p>

  <div style="text-align:center; margin:20px 0;">
    <div style="font-weight:bold; color:#059669; margin-bottom:6px;">📱 ภาพจำลองหน้าจอสำหรับเจ้าหน้าที่วอร์ด (Staff Portal UI)</div>
    ${getMobileUiSvg()}
  </div>

  <h3>1.1 วิธีการเข้าสู่ระบบและความปลอดภัยของเซสชัน</h3>
  <ol>
    <li>เปิดเว็บเบราว์เซอร์ (Google Chrome, Microsoft Edge, หรือ Safari บนสมาร์ทโฟน/แท็บเล็ต)</li>
    <li>พิมพ์ URL ระบบ ClaimIT (เช่น <code>http://192.168.1.45:8847</code> หรือลิงก์ที่ฝ่ายไอทีจัดเตรียมไว้)</li>
    <li>กรอก <strong>ชื่อผู้ใช้ (Username)</strong>: <code>staff</code> และ <strong>รหัสผ่าน (Password)</strong>: <code>staff123</code> (หรือบัญชีประจำแผนก)</li>
    <li>กดปุ่ม <strong>[เข้าสู่ระบบ]</strong> ระบบจะนำท่านเข้าสู่หน้า <strong>"🛡️ ระบบแจ้งซ่อมประจำแผนก (Staff)"</strong> โดยตรง</li>
  </ol>

  <div class="callout warning">
    <div class="callout-title">🔒 ระบบตัดเซสชันอัตโนมัติเมื่อไม่มีการใช้งาน 15 นาที (Auto-Timeout)</div>
    เพื่อความปลอดภัยของข้อมูลตามมาตรฐานโรงพยาบาล หากเปิดหน้าจอทิ้งไว้โดยไม่มีการขยับเมาส์หรือแตะหน้าจอเกิน 15 นาที ระบบจะแสดงหน้าต่างแจ้งเตือนและออกจากระบบให้อัตโนมัติ เพื่อป้องกันไม่ให้ผู้อื่นสวมสิทธิ์การใช้งาน
  </div>

  <h3 id="side1-scan">1.2 การค้นหาครุภัณฑ์ ตรวจสอบประกัน และโหมดล็อกหัวอ่านบาร์โค้ด</h3>
  <p>เมื่อต้องการตรวจสอบอุปกรณ์ที่ใช้งานอยู่:</p>
  <ul>
    <li><strong>การยิงสแกนเนอร์บาร์โค้ด:</strong> ให้ใช้ปืนยิงบาร์โค้ดยิงสแกนสติ๊กเกอร์รหัสครุภัณฑ์บนตัวเครื่องได้ทันที ข้อมูลจะแสดงขึ้นมาโดยอัตโนมัติ</li>
    <li><strong>การพิมพ์ค้นหา:</strong> พิมพ์รหัสครุภัณฑ์ในช่องค้นหา (เช่น <code>CIT-2024-AIO-02</code>) แล้วกดปุ่ม <strong>[🔍 ค้นหา]</strong></li>
    <li><strong>การถ่ายภาพบาร์โค้ดผ่านมือถือ:</strong> หากใช้งานผ่านสมาร์ทโฟนหรือแท็บเล็ต สามารถกดปุ่ม <strong>[📷 ถ่ายรูป]</strong> เพื่อถ่ายภาพบาร์โค้ดบนเครื่องได้ทันที</li>
    <li><strong>🔒 โหมดล็อกหัวอ่านบาร์โค้ด (Barcode Scanner Lock):</strong> เมื่อเปิดสวิตช์นี้ ระบบจะป้องกันไม่ให้แป้นพิมพ์จำลองบนหน้าจอมือถือเด้งขึ้นมาบดบังสายตา ทำให้ยิงบาร์โค้ดต่อเนื่องได้อย่างราบรื่น</li>
    <li><strong>แถบสถานะประกันแบบสองปฏิทิน (Thai BE / CE):</strong>
      <br>ระบบจะแสดงแถบสีสถานะรับประกันให้ทราบชัดเจน พร้อมระบุปี พ.ศ. และ ค.ศ.:
      <ul>
        <li><span style="color:#15803d; font-weight:bold;">🟢 ปกติ ในประกัน:</span> อยู่ในระยะรับประกัน ซ่อมศูนย์ฟรี พร้อมแสดงวันหมดอายุและจำนวนวันที่เหลือ</li>
        <li><span style="color:#d97706; font-weight:bold;">⚠️ ใกล้หมดประกันใน 6 เดือน:</span> แจ้งเตือนให้รีบตรวจเช็กเครื่องก่อนสิ้นสุดสัญญาประกัน</li>
        <li><span style="color:#dc2626; font-weight:bold;">🔴 หมดอายุประกันแล้ว:</span> เครื่องหมดสัญญาประกันแล้ว ฝ่ายไอทีจะดำเนินการซ่อมบำรุงตามระเบียบพัสดุ</li>
      </ul>
    </li>
  </ul>

  <h3 id="side1-report">1.3 การแจ้งซ่อมอุปกรณ์ชำรุด และระบบป้องกันการแจ้งซ้ำซ้อน (Duplicate Guardrail)</h3>
  <ol>
    <li>เมื่อพบเครื่องชำรุด ให้ค้นหาอุปกรณ์ตามข้อ 1.2</li>
    <li>เลือกอาการเสียจากปุ่มลัด (เช่น <em>เปิดไม่ติด, จอดับ/จอฟ้า, เครื่องพิมพ์กระดาษติด, หัวอ่านบาร์โค้ดไม่ติด</em>) หรือพิมพ์รายละเอียดอาการเพิ่มเติม</li>
    <li>กดปุ่ม <strong>[📷 ถ่ายภาพจุดชำรุด]</strong> เพื่อแนบภาพถ่ายสภาพความเสียหายจริงเข้าสู่ระบบ</li>
    <li>กดปุ่มสีแดง <strong>[🚨 แจ้งชำรุดเข้าส่วนกลาง]</strong> สถานะจะเปลี่ยนเป็น <code>Broken (ชำรุด)</code> และส่งเรื่องแจ้งเตือนไปยังฝ่ายไอทีทันที</li>
  </ol>

  <div class="callout danger">
    <div class="callout-title">🛡️ ระบบป้องกันการแจ้งซ่อมซ้ำซ้อน (Duplicate Report Guardrail)</div>
    หากอุปกรณ์ชิ้นนั้นอยู่ในสถานะชำรุดแล้ว หรืออยู่ระหว่างที่ฝ่ายไอทีกำลังรับเรื่อง/ส่งศูนย์ซ่อมภายนอก ปุ่ม <strong>[🚨 แจ้งชำรุดเข้าส่วนกลาง]</strong> จะถูก <strong>ปิดการใช้งาน (Disabled / กลายเป็นสีเทา)</strong> โดยอัตโนมัติ พร้อมมีข้อความระบุว่า <em>"อุปกรณ์นี้ได้รับการแจ้งซ่อมหรืออยู่ระหว่างดำเนินการแล้ว"</em> เพื่อป้องกันไม่ให้เจ้าหน้าที่ในวอร์ดกดแจ้งซ้ำซ้อน
  </div>

  <h3 id="side1-hotline">1.4 ช่องทางติดต่อด่วน IT Support Hotline (☎️ 4401 - 4403 โทรออกได้ทันที)</h3>
  <p>
    ในกรณีที่เกิดเหตุฉุกเฉินในวอร์ด เช่น ระบบคอมพิวเตอร์ห้องฉุกเฉินหรือห้องยาขัดข้องเร่งด่วน:
  </p>
  <ul>
    <li>บนหน้าจอ Staff Portal จะมีแถบข้อมูล <strong>"☎️ IT Support Hotline: 4401 - 4403"</strong> แสดงอยู่เด่นชัดเสมอ</li>
    <li><strong>Click-to-Dial:</strong> สามารถแตะที่หมายเลขโทรศัพท์เพื่อโทรติดต่อฝ่ายไอทีได้ทันทีผ่านโทรศัพท์หรือระบบเชื่อมต่อ VoIP ของโรงพยาบาล</li>
    <li>หมายเลขนี้ได้รับการเชื่อมโยงและควบคุมจากศูนย์กลางไอที หากมีการปรับเปลี่ยนคู่สาย หมายเลขบนหน้าจอจะอัปเดตตรงกันโดยอัตโนมัติ</li>
  </ul>

  <h3 id="side1-loaner">1.5 การขอยืมอุปกรณ์สำรองฉุกเฉิน (Emergency Loaner Units)</h3>
  <p>
    หากเครื่องคอมพิวเตอร์หรือเครื่องพิมพ์ในจุดบริการสำคัญเสีย และฝ่ายไอทีจำเป็นต้องยกเครื่องไปตรวจสอบ:
  </p>
  <ul>
    <li>กดปุ่ม <strong>[📦 ขอยืมเครื่องสำรองฉุกเฉิน (Loaner Unit)]</strong> ใต้การ์ดข้อมูลอุปกรณ์</li>
    <li>เลือกรหัสเครื่องสำรองที่พร้อมใช้งานในคลัง (เช่น คอมพิวเตอร์ All-in-One <code>LNR-AIO-01</code> หรือเครื่องพิมพ์ <code>LNR-PRN-01</code>)</li>
    <li>นำเครื่องสำรองมาต่อใช้งานแทนได้ทันที ทำให้งานบริการผู้ป่วยดำเนินต่อไปได้โดยไม่สะดุด</li>
  </ul>

  <h3 id="side1-status">1.6 การติดตามสถานะงานซ่อม และคำชี้แจงปุ่มฟังก์ชันสีเทา (Disabled Controls)</h3>
  <ul>
    <li><strong>ตารางติดตามงานซ่อม:</strong> สามารถเลื่อนดูตารางสรุปงานซ่อมของแผนกตนเองได้ตลอด 24 ชั่วโมง เพื่อดูว่าช่างได้รับเครื่องไปแล้วหรือยัง และมีกำหนดส่งคืนวันไหน</li>
    <li><strong>ปุ่มฟังก์ชันของผู้ดูแลระบบแสดงผลเป็นสีเทา (Disabled):</strong> ปุ่มควบคุมระดับสูง เช่น ปุ่ม <strong>[⚙️ ไปยังหน้าตั้งค่าระบบ]</strong> จะแสดงเป็นสีเทาและไม่สามารถกดได้ พร้อมมี Tooltip ชี้แจงว่า <em>"สำหรับสิทธิ์ผู้ดูแลระบบ (Admin) เท่านั้น"</em> เพื่อป้องกันไม่ให้เกิดความสับสนในการใช้งาน</li>
  </ul>

  <div class="page-break"></div>

  <!-- ========================================== -->
  <!-- SIDE 2: IT ADMIN & OPERATIONS             -->
  <!-- ========================================== -->
  <h2 class="side-header side-header-2" id="side2-dash">🔵 ด้านที่ 2 (SIDE 2): คู่มือสำหรับผู้ดูแลระบบและฝ่ายไอที</h2>
  <p>
    หน้านี้ออกแบบมาเพื่อวิศวกรคอมพิวเตอร์ ช่างเทคนิคไอที และผู้ดูแลระบบ (IT Administrator & Operations) สำหรับการควบคุมทะเบียนครุภัณฑ์ ส่งเคลมศูนย์บริการ และบริหารจัดการระบบส่วนกลาง
  </p>

  <div style="text-align:center; margin:20px 0;">
    <div style="font-weight:bold; color:#1e40af; margin-bottom:6px;">💻 ภาพรวมหน้าจอศูนย์ควบคุมและตารางครุภัณฑ์ (IT Portal Admin UI)</div>
    ${getAdminUiSvg()}
  </div>

  <h3>2.1 แดชบอร์ดศูนย์ควบคุมไอที (IT KPIs) และทางลัดเครื่องใกล้หมดประกัน</h3>
  <ul>
    <li>เข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ: Username <code>admin</code> และ Password <code>admin123</code></li>
    <li>เข้าเมนู <strong>"🖥️ ศูนย์ควบคุมไอที (IT Portal)"</strong> จะพบแดชบอร์ดสรุปสถิติสำคัญ:
      <ul>
        <li>จำนวนครุภัณฑ์ทั้งหมดในโรงพยาบาล แยกตามสถานะการใช้งาน</li>
        <li>รายการเครื่องชำรุดที่รอการดำเนินการ</li>
        <li>จำนวนเครื่องที่อยู่ระหว่างส่งเคลมศูนย์บริการภายนอก (Active RMA Claims)</li>
      </ul>
    </li>
    <li><strong>ปุ่มทางลัดแจ้งเตือน <code>⚠️ ใกล้หมดประกัน</code>:</strong> สามารถคลิกที่ป้ายเตือนด้านบน ระบบจะเปิดตารางครุภัณฑ์และกรองเฉพาะเครื่องที่สัญญาประกันจะหมดอายุใน 180 วันให้ทันทีในคลิกเดียว</li>
  </ul>

  <h3 id="side2-cat">2.2 การจัดการตารางครุภัณฑ์ด้วย Category Dropdown และ Numbered Pagination</h3>
  <ul>
    <li><strong>ตัวกรองหมวดหมู่อุปกรณ์แบบ Dropdown Selector (<code>filter-category-select</code>):</strong>
      <br>ระบบได้รับการพัฒนาใหม่ โดยแทนที่แถบปุ่มแนวนอน 10 ปุ่มเดิมที่ต้องเลื่อน Scrollbar ด้วย <strong>Dropdown List ที่กะทัดรัดและสวยงาม</strong> อยู่เคียงข้างตัวกรองสถานะอุปกรณ์ ช่วยให้เลือกดูเฉพาะกลุ่มอุปกรณ์ เช่น <em>Computer, Monitor, Printer, Scanner, Network</em> ได้อย่างรวดเร็วโดยไม่เปลืองพื้นที่หน้าจอ
    </li>
    <li><strong>ปุ่มสล็อตตัวเลขสลับหน้า (Numbered Pagination Slots):</strong>
      <br>แสดงหมายเลขหน้าแบบสล็อตชัดเจน (<code>[1]</code> <code>[2]</code> <code>[3]</code> <code>[4]</code> ...) พร้อมระบบควบคุมขอบเขต (Boundary Disabled States: ปุ่มย้อนกลับจะถูกปิดเมื่ออยู่หน้าแรก และปุ่มถัดไปจะถูกปิดเมื่ออยู่หน้าสุดท้าย) ทำให้ค้นหาและข้ามหน้าได้อย่างแม่นยำ
    </li>
  </ul>

  <h3 id="side2-asset">2.3 การลงทะเบียนครุภัณฑ์ใหม่: ระบบจำกัดยี่ห้อเดียว และผังอาคารโรงพยาบาล</h3>
  <ol>
    <li>ในหน้า IT Portal กดปุ่ม <strong>[➕ เพิ่มครุภัณฑ์ใหม่]</strong></li>
    <li>
      กรอกข้อมูลสำคัญตามแนวทางมาตรฐาน:
      <ul>
        <li><strong>ยี่ห้อ (Brand):</strong> ระบุเพียง 1 ยี่ห้อเท่านั้น เช่น <code>Dell</code>, <code>HP</code> หรือ <code>Lenovo</code> โดยระบบมีระบบป้องกัน <em>(Single-Brand Guardrail)</em> ป้องกันการพิมพ์หลายยี่ห้อปนกัน</li>
        <li><strong>สถานที่และแผนกที่ติดตั้ง:</strong> ให้กดปุ่ม <strong>[🏥 เลือกจากผังอาคาร]</strong> เพื่อเลือกแผนกตามโครงสร้างอาคารจริงของโรงพยาบาล (เช่น Building 1 ชั้น 21 ถึง ชั้น D หรืออาคาร Call Center) ช่วยป้องกันการพิมพ์ชื่อแผนกผิดพลาด</li>
        <li><strong>ระยะเวลารับประกัน:</strong> ระบุวันเริ่มสัญญาและระยะเวลารับประกัน (1 - 5 ปี)</li>
      </ul>
    </li>
    <li>กดบันทึก ข้อมูลจะถูกจัดเก็บและพร้อมให้เจ้าหน้าที่วอร์ดสแกนตรวจสอบได้ทันที</li>
  </ol>

  <h3 id="side2-pdpa">2.4 มาตรการความปลอดภัยข้อมูล PDPA (Enforced Wipe Gate)</h3>
  <div class="callout danger">
    <div class="callout-title">🛑 ข้อบังคับความปลอดภัยข้อมูลผู้ป่วย (PDPA Data Sanitization)</div>
    อุปกรณ์ที่มีสื่อบันทึกข้อมูล (ฮาร์ดดิสก์, SSD) เช่น เครื่องคอมพิวเตอร์ All-in-One หรือโน้ตบุ๊ก <strong>จะถูกระบบบล็อกไม่ให้ออกใบส่งเคลมเด็ดขาด</strong> จนกว่าผู้ดูแลระบบไอทีจะทำการล้างข้อมูลหรือถอดฮาร์ดดิสก์ออกตามระเบียบความปลอดภัยสารสนเทศ
  </div>
  <p><strong>ขั้นตอนการปลดล็อกก่อนส่งเคลม:</strong></p>
  <ol>
    <li>เปิดการ์ดรายละเอียดของเครื่องที่แจ้งซ่อม</li>
    <li>ติ๊กเครื่องหมายถูกที่ช่อง <em>"ข้าพเจ้ายืนยันว่าได้ถอดสื่อบันทึกข้อมูล หรือล้างข้อมูลความปลอดภัยเรียบร้อยแล้ว"</em></li>
    <li>พิมพ์คำยืนยันลงในช่องข้อความ: <strong style="color:#0284c7; font-size:14pt;">ยืนยัน หรือ WIPED</strong></li>
    <li>กดปุ่ม <strong>[ยืนยันความปลอดภัยข้อมูล]</strong> ระบบจะบันทึก Audit Log และปลดล็อกให้สามารถสร้างใบเคลม RMA ได้ทันที</li>
  </ol>

  <h3 id="side2-rma">2.5 การประเมินความคุ้มค่า (Viability Score) และการออกใบส่งเคลม RMA</h3>
  <div style="text-align:center; margin:15px 0;">
    ${getViabilitySvg()}
  </div>
  <ul>
    <li><strong>ดัชนีประเมินความคุ้มค่า (Viability Score &le; 5.0):</strong> ระบบจะประเมินคะแนนความคุ้มค่าในการซ่อมให้อัตโนมัติ:
      <ul>
        <li>คะแนน <strong>1.0 – 5.0 (🟢 VIABLE):</strong> คุ้มค่าต่อการส่งศูนย์บริการ</li>
        <li>คะแนน <strong>5.1 – 10.0 (🔴 NOT VIABLE):</strong> ไม่คุ้มค่าซ่อม (เครื่องเก่าเกิน 5 ปี หรือค่าอะไหล่สูงเกินเกณฑ์) ควรพิจารณาเสนอแทงจำหน่าย (Scrap) หรือขายทอดตลาด</li>
      </ul>
    </li>
    <li><strong>การออกใบเคลมศูนย์บริการ (Multi-Asset RMA):</strong>
      <ul>
        <li>ไปที่แท็บ <strong>"📑 รายการใบส่งเคลม"</strong> แล้วกด <strong>[➕ สร้างใบเคลมใหม่]</strong></li>
        <li>เลือกศูนย์บริการ (Vendor) เช่น Dell ProSupport, HP Care, Canon ฯลฯ และใส่เลข Ticket/Case No.</li>
        <li>สามารถเลือกครุภัณฑ์ที่ผ่านการล้างข้อมูลแล้วรวมส่งพร้อมกันได้ <strong>1 ถึง 5 เครื่องต่อ 1 ใบเคลม</strong></li>
        <li>เมื่อบันทึก เครื่องจะเปลี่ยนสถานะเป็น <code>Pending Pickup (รอรถขนส่งมารับ)</code></li>
      </ul>
    </li>
  </ul>

  <h3 id="side2-config">2.6 การตั้งค่าระบบ 5 แท็บ: ทำเนียบผังอาคารโรงพยาบาลถาวร และการแก้ไขเบอร์ Hotline</h3>
  <p>
    ในเมนู <strong>[⚙️ ตั้งค่า & จัดการระบบ]</strong> สำหรับผู้ดูแลระบบ ประกอบด้วย 5 แท็บย่อยที่ชัดเจน:
  </p>
  <ol>
    <li><code>🏷️ แบรนด์และคู่มือศูนย์บริการ</code>: บันทึกเบอร์โทรและเงื่อนไขการรับประกันของแต่ละยี่ห้อ</li>
    <li><code>💻 หมวดหมู่อุปกรณ์</code>: จัดหมวดหมู่คอมพิวเตอร์ จอภาพ เครื่องพิมพ์ และอุปกรณ์เครือข่าย</li>
    <li><code>🏥 แผนกและสถานที่ติดตั้ง (Hospital Architecture Directory)</code>:
      <br><strong>ทำเนียบผังโครงสร้างอาคารมาตรฐานของโรงพยาบาล:</strong> แสดงผังอาคารที่เป็นทางการของโรงพยาบาล (อาคาร 1 ชั้น 21 ถึง ชั้น D และอาคาร Call Center) อย่างถูกต้องเป็นเอกภาพ โดยปิดการแก้ไข/ลบโครงสร้างทางกายภาพ เพื่อป้องกันความผิดพลาดและตัดปัญหาตารางข้อมูลซ้ำซ้อน
    </li>
    <li><code>👥 จัดการบัญชีผู้ใช้</code>: แยกตารางระหว่าง IT Staff และ Admin พร้อมตัวกรองบทบาทและปุ่มรีเซ็ตรหัสผ่าน</li>
    <li><code>💾 สำรองฐานข้อมูล & ตั้งค่าเบอร์โทรศัพท์ส่วนกลาง</code>:
      <ul>
        <li><strong>กล่องแก้ไขเบอร์โทรศัพท์ IT Support Hotline (4401 - 4403):</strong> ผู้ดูแลระบบสามารถอัปเดตหมายเลขโทรศัพท์ติดต่อด่วนของฝ่ายไอทีได้ทันที เมื่อบันทึกแล้ว หมายเลขนี้จะถูกส่งต่อไปแสดงผลและเปิดใช้งานบนหน้าจอ Staff ทันทีแบบไดนามิก</li>
        <li><strong>สำรองฐานข้อมูล (Backup SQLite):</strong> กดดาวน์โหลดสำเนาไฟล์ฐานข้อมูลทั้งหมดได้ในคลิกเดียว</li>
      </ul>
    </li>
  </ol>

  <h3 id="side2-return">2.7 การตรวจรับเครื่องซ่อมเสร็จ ส่งคืนวอร์ด และการส่งออกรายงาน</h3>
  <ul>
    <li><strong>ตรวจรับเครื่องคืน:</strong> เมื่อศูนย์ซ่อมส่งเครื่องกลับมา ให้เปิดใบเคลมแล้วกด <strong>[รับอุปกรณ์คืน]</strong> สถานะจะกลับเป็น <code>Working (ปกติ)</code> พร้อมส่งคืนวอร์ดเดิม</li>
    <li><strong>ส่งออกรายงาน Excel:</strong> กดปุ่ม <strong>[ส่งออก Excel (.xlsx)]</strong> เพื่อดาวน์โหลดสรุปประวัติงานซ่อมและทรัพย์สินครุภัณฑ์ทั้งหมดไปใช้งานต่อ</li>
    <li><strong>พิมพ์เอกสารราชการ:</strong> สามารถกดพิมพ์ <strong>ใบส่งมอบงานซ่อม (Repair Slip)</strong> และ <strong>ใบส่งเคลมศูนย์บริการ (RMA Report)</strong> เป็น PDF สวยงามตามแบบฟอร์มโรงพยาบาลได้ทันที</li>
  </ul>

  <div class="page-break"></div>

  <!-- ========================================== -->
  <!-- FAQ & TROUBLESHOOTING                      -->
  <!-- ========================================== -->
  <h2 id="faq">❓ ภาคผนวก: การแก้ปัญหาเบื้องต้นที่พบบ่อย (FAQ & Troubleshooting)</h2>

  <h3>Q1: ยิงบาร์โค้ดแล้วขึ้นภาษาไทยเพี้ยนหรือตัวเลขไม่ถูกต้อง?</h3>
  <p>
    <strong>วิธีแก้:</strong> แป้นพิมพ์คอมพิวเตอร์เปิดโหมดภาษาไทยค้างอยู่ ให้กดปุ่มเปลี่ยนภาษาบนคีย์บอร์ดเป็น <strong>ภาษาอังกฤษ (EN)</strong> ก่อนยิงบาร์โค้ดเสมอ
  </p>

  <h3>Q2: สแกนผ่านมือถือแล้วแป้นพิมพ์เสมือนเด้งขึ้นมาบังจอภาพ?</h3>
  <p>
    <strong>วิธีแก้:</strong> ให้เลื่อนเปิดสวิตช์ <strong>"🔒 โหมดล็อกหัวอ่านบาร์โค้ด"</strong> ที่อยู่ด้านล่างช่องค้นหา ระบบจะซ่อนแป้นพิมพ์บนจอให้อัตโนมัติ
  </p>

  <h3>Q3: เหตุใดปุ่ม [🚨 แจ้งชำรุดเข้าส่วนกลาง] จึงกลายเป็นสีเทาและกดไม่ได้?</h3>
  <p>
    <strong>วิธีแก้:</strong> เป็นระบบป้องกันการแจ้งซ้ำ (Duplicate Guardrail) แสดงว่าอุปกรณ์ชิ้นนั้นมีเพื่อนร่วมงานแจ้งซ่อมไปแล้ว หรือช่างไอทีกำลังดำเนินการอยู่ สามารถตรวจสอบสถานะได้ในตารางติดตามงานซ่อม
  </p>

  <h3>Q4: เหตุใดปุ่ม [⚙️ ตั้งค่าระบบ] ในหน้า Staff จึงเป็นสีเทาและมีเครื่องหมายห้าม?</h3>
  <p>
    <strong>วิธีแก้:</strong> เมนูการตั้งค่าระบบและฐานข้อมูลสงวนไว้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น บัญชีระดับ Staff จะไม่สามารถเข้าถึงได้เพื่อความปลอดภัยของระบบ
  </p>

  <h3>Q5: หากลืมรหัสผ่านหรือต้องการเพิ่มผู้ใช้งานใหม่ ต้องทำอย่างไร?</h3>
  <p>
    <strong>วิธีแก้:</strong> ให้ติดต่อผู้ดูแลระบบไอที (Admin) เพื่อทำการรีเซ็ตรหัสผ่านหรือสร้างบัญชีใหม่ในเมนู <code>👥 จัดการบัญชีผู้ใช้</code>
  </p>

  <hr style="margin-top:40px; border:0; border-top:1px solid #cbd5e1;">
  <div style="text-align:center; color:#64748b; font-size:11pt; padding:20px 0;">
    ClaimIT Hospital IT Warranty & RMA Claim Management System — คู่มือผู้ปฏิบัติงานแบบสองด้าน ฉบับปรับปรุงปี 2026
  </div>

</div>

</body>
</html>
`;
}

// Generate Clean User-Centric Markdown Content
function generateMarkdownContent() {
  return `# 💻 คู่มือการใช้งานระบบ ClaimIT (Dual-Role User Manual)
> **ระบบบริหารจัดการรับประกันและส่งเคลมครุภัณฑ์คอมพิวเตอร์โรงพยาบาล**  
> *(Hospital IT Warranty & RMA Claim Management System — ฉบับปรับปรุงปี 2026)*

---

## 📑 โครงสร้างคู่มือสองด้าน (Table of Contents)

### 🟢 ด้านที่ 1 (SIDE 1): สำหรับเจ้าหน้าที่ประจำวอร์ด / ผู้ใช้งานทั่วไป (Staff Portal)
1. [1.1 บทนำ การเข้าสู่ระบบ และความปลอดภัยของเซสชัน (15 นาที)](#11-บทนำ-การเข้าสู่ระบบ-และความปลอดภัยของเซสชัน)
2. [1.2 การค้นหาครุภัณฑ์ ตรวจสอบประกัน 2 ปฏิทิน (พ.ศ./ค.ศ.) และโหมดล็อกหัวอ่านบาร์โค้ด](#12-การค้นหาครุภัณฑ์-ตรวจสอบประกัน-2-ปฏิทิน-และโหมดล็อกหัวอ่านบาร์โค้ด)
3. [1.3 การแจ้งซ่อมอุปกรณ์ชำรุด และระบบป้องกันการแจ้งซ้ำซ้อน (Duplicate Report Guardrail)](#13-การแจ้งซ่อมอุปกรณ์ชำรุด-และระบบป้องกันการแจ้งซ้ำซ้อน)
4. [1.4 ช่องทางติดต่อด่วน IT Support Hotline (☎️ 4401 - 4403 โทรออกได้ทันที)](#14-ช่องทางติดต่อด่วน-it-support-hotline-4401---4403)
5. [1.5 การขอยืมอุปกรณ์สำรองฉุกเฉิน (Emergency Loaner Units)](#15-การขอยืมอุปกรณ์สำรองฉุกเฉิน)
6. [1.6 การติดตามสถานะงานซ่อมประจำแผนก และคำชี้แจงปุ่มสีเทา (Disabled Controls)](#16-การติดตามสถานะงานซ่อมประจำแผนก)

---

### 🔵 ด้านที่ 2 (SIDE 2): สำหรับผู้ดูแลระบบและฝ่ายไอที (Admin & Operations Portal)
1. [2.1 แดชบอร์ดศูนย์ควบคุมไอที (IT KPIs) และทางลัดเครื่องใกล้หมดประกัน](#21-แดชบอร์ดศูนย์ควบคุมไอที-it-kpis-และทางลัดเครื่องใกล้หมดประกัน)
2. [2.2 การจัดการตารางครุภัณฑ์ด้วย Category Dropdown Selector และ Numbered Pagination Slots](#22-การจัดการตารางครุภัณฑ์ด้วย-category-dropdown-และ-pagination-slots)
3. [2.3 การลงทะเบียนครุภัณฑ์ใหม่: ระบบจำกัดยี่ห้อเดียว (Single-Brand) และผังอาคารโรงพยาบาล](#23-การลงทะเบียนครุภัณฑ์ใหม่-ระบบจำกัดยี่ห้อเดียว-และผังอาคารโรงพยาบาล)
4. [2.4 มาตรการความปลอดภัยข้อมูล PDPA (Enforced Wipe Gate: พิมพ์ "ยืนยัน" / "WIPED")](#24-มาตรการความปลอดภัยข้อมูล-pdpa-enforced-wipe-gate)
5. [2.5 การประเมินความคุ้มค่า (Viability Score ≤ 5.0) และการออกใบส่งเคลม RMA (1-5 เครื่อง)](#25-การประเมินความคุ้มค่า-viability-score-และการออกใบส่งเคลม-rma)
6. [2.6 การตั้งค่าระบบ 5 แท็บ: ทำเนียบผังอาคารโรงพยาบาลถาวร และการแก้ไขเบอร์ Hotline ส่วนกลาง](#26-การตั้งค่าระบบ-5-แท็บ-ทำเนียบผังอาคารโรงพยาบาลถาวร-และการแก้ไขเบอร์-hotline)
7. [2.7 การตรวจรับเครื่องซ่อมเสร็จ ส่งคืนวอร์ด และส่งออกรายงาน Excel / พิมพ์ PDF](#27-การตรวจรับเครื่องซ่อมเสร็จ-ส่งคืนวอร์ด-และส่งออกรายงาน-excel)

---

### ❓ [ภาคผนวก: การแก้ปัญหาเบื้องต้นที่พบบ่อย (FAQ & Troubleshooting)](#ภาคผนวก-การแก้ปัญหาเบื้องต้นที่พบบ่อย-faq--troubleshooting)

---

# 🟢 ด้านที่ 1 (SIDE 1): คู่มือสำหรับเจ้าหน้าที่ประจำวอร์ด / ผู้ใช้งานทั่วไป

## 1.1 บทนำ การเข้าสู่ระบบ และความปลอดภัยของเซสชัน
ระบบ ClaimIT พัฒนาขึ้นเพื่ออำนวยความสะดวกแก่บุคลากรทางการแพทย์ พยาบาล เภสัชกร และเจ้าหน้าที่ประจำวอร์ด ในการตรวจสอบประกันและแจ้งซ่อมอุปกรณ์คอมพิวเตอร์อย่างรวดเร็ว

### การเข้าสู่ระบบ:
1. เปิดเบราว์เซอร์ (Chrome, Edge หรือ Safari) ไปที่ URL ของระบบ ClaimIT
2. เข้าใช้งานด้วยบัญชีผู้ใช้ประจำแผนก:
   - **Username:** \`staff\`
   - **Password:** \`staff123\`
3. เมื่อเข้าสู่ระบบ จะพบหน้าจอ **"🛡️ ระบบแจ้งซ่อมประจำแผนก (Staff)"** ทันที

> 🔒 **ระบบตัดเซสชันอัตโนมัติเมื่อไม่ใช้งาน 15 นาที (Auto-Timeout):**  
> เพื่อความปลอดภัยของข้อมูลตามมาตรฐานโรงพยาบาล หากไม่มีการขยับเมาส์หรือแตะหน้าจอเกิน 15 นาที ระบบจะตัดเซสชันและออกจากระบบให้อัตโนมัติ เพื่อป้องกันผู้อื่นใช้งานต่อ

---

## 1.2 การค้นหาครุภัณฑ์ ตรวจสอบประกัน 2 ปฏิทิน และโหมดล็อกหัวอ่านบาร์โค้ด
* **สแกนบาร์โค้ด:** ใช้ปืนยิงบาร์โค้ดยิงใส่สติ๊กเกอร์บนตัวเครื่องได้ทันที ข้อมูลครุภัณฑ์จะแสดงทันที
* **พิมพ์ค้นหา:** พิมพ์รหัสครุภัณฑ์ (เช่น \`CIT-2024-AIO-02\`) ในช่องค้นหาแล้วกดปุ่ม **[🔍 ค้นหา]**
* **ถ่ายภาพผ่านมือถือ:** กดปุ่ม **[📷 ถ่ายรูป]** เพื่อถ่ายภาพสติ๊กเกอร์บาร์โค้ดจากกล้องสมาร์ทโฟน
* **🔒 โหมดล็อกหัวอ่านบาร์โค้ด (Barcode Scanner Lock):** สวิตช์ปิดแป้นพิมพ์บนจอมือถือไม่ให้เด้งขึ้นมาบังเวลาสแกนบาร์โค้ดต่อเนื่อง
* **แถบสีสถานะประกัน 2 ปฏิทิน (Thai BE / CE):**
  - \`🟢 ปกติ ในประกัน:\` เครื่องยังอยู่ในประกันศูนย์ ซ่อมฟรี ระบุปี พ.ศ. และ ค.ศ. ที่หมดอายุ
  - \`⚠️ ใกล้หมดประกันใน 6 เดือน:\` แจ้งเตือนเพื่อให้ตรวจสอบก่อนหมดสัญญา
  - \`🔴 หมดอายุประกันแล้ว:\` เครื่องหมดสัญญาประกันแล้ว ฝ่ายไอทีจะดำเนินการซ่อมตามระเบียบพัสดุ

---

## 1.3 การแจ้งซ่อมอุปกรณ์ชำรุด และระบบป้องกันการแจ้งซ้ำซ้อน
1. เมื่อค้นหาอุปกรณ์พบแล้ว ให้เลือกอาการเสียจากปุ่มลัด (เช่น เปิดไม่ติด, จอดับ, พิมพ์กระดาษติด, บาร์โค้ดไม่ติด)
2. กดปุ่ม **[📷 ถ่ายภาพจุดชำรุด]** เพื่อแนบภาพความเสียหายจริงหน้างาน
3. กดปุ่มสีแดง **[🚨 แจ้งชำรุดเข้าส่วนกลาง]** เพื่อส่งเรื่องให้ฝ่ายไอทีทันที

> 🛡️ **ระบบป้องกันการแจ้งซ่อมซ้ำซ้อน (Duplicate Report Guardrail):**  
> หากอุปกรณ์ชิ้นนั้นอยู่ในสถานะชำรุดอยู่แล้ว หรืออยู่ระหว่างรอส่งเคลม/กำลังซ่อมแซม ปุ่ม **[🚨 แจ้งชำรุดเข้าส่วนกลาง]** จะถูก **ปิดการใช้งาน (Disabled / สีเทา)** โดยอัตโนมัติ พร้อมมีข้อความชี้แจงชัดเจน เพื่อป้องกันไม่ให้เจ้าหน้าที่ในแผนกส่งตั๋วแจ้งซ่อมซ้ำซ้อน

---

## 1.4 ช่องทางติดต่อด่วน IT Support Hotline (4401 - 4403)
* บนหน้าจอ Staff Portal จะมีแถบข้อมูล **"☎️ IT Support Hotline: 4401 - 4403"** แสดงอยู่เสมอ
* **Click-to-Dial:** หากเปิดผ่านโทรศัพท์มือถือหรือแท็บเล็ต สามารถแตะที่หมายเลขเพื่อโทรติดต่อทีมช่างไอทีได้ทันที
* หมายเลขโทรศัพท์นี้ถูกควบคุมแบบไดนามิกจากระบบส่วนกลางของฝ่ายไอที

---

## 1.5 การขอยืมอุปกรณ์สำรองฉุกเฉิน
หากเครื่องในจุดบริการสำคัญ (เช่น ห้องจ่ายยา, จุดรับผู้ป่วย) ชำรุดและต้องยกไปซ่อม:
1. กดปุ่ม **[📦 ขอยืมเครื่องสำรองฉุกเฉิน (Loaner Unit)]**
2. เลือกรหัสเครื่องสำรองที่มีพร้อมในคลัง (เช่น \`LNR-AIO-01\` หรือ \`LNR-PRN-01\`)
3. นำเครื่องสำรองมาต่อใช้งานแทนได้ทันที ไม่กระทบต่อการบริการผู้ป่วย

---

## 1.6 การติดตามสถานะงานซ่อมประจำแผนก
* สามารถเลื่อนดู **ตารางประวัติงานซ่อมประจำแผนก** ได้ตลอด 24 ชั่วโมง เพื่อติดตามว่าฝ่ายไอทีรับเรื่องหรือยัง ส่งศูนย์ซ่อมหรือยัง และมีกำหนดส่งคืนวันไหน
* **ปุ่มควบคุมระดับ Admin แสดงเป็นสีเทา (Disabled Controls):** ปุ่มไปยังหน้าตั้งค่าระบบ (\`#btn-it-to-config\`) จะแสดงเป็นสีเทาและปิดการทำงานสำหรับผู้ใช้ทั่วไป พร้อมมี Tooltip แจ้งเตือนสิทธิ์เพื่อความโปร่งใสและปลอดภัย

---

# 🔵 ด้านที่ 2 (SIDE 2): คู่มือสำหรับผู้ดูแลระบบและฝ่ายไอที

## 2.1 แดชบอร์ดศูนย์ควบคุมไอที (IT KPIs) และทางลัดเครื่องใกล้หมดประกัน
* เข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ:
  - **Username:** \`admin\`
  - **Password:** \`admin123\`
* **แดชบอร์ดสรุปงาน:** แสดงตัวเลขงานซ่อมคงค้าง, รายการที่ส่งเคลมศูนย์บริการ, และสต็อกเครื่องสำรอง
* **ทางลัดแจ้งเตือน \`⚠️ ใกล้หมดประกัน\`:** คลิกที่ป้ายเตือนด้านบนเพื่อเปิดตารางครุภัณฑ์และกรองเฉพาะเครื่องที่จะหมดสัญญาประกันใน 180 วันได้ทันที

---

## 2.2 การจัดการตารางครุภัณฑ์ด้วย Category Dropdown และ Pagination Slots
* **Category Dropdown Selector (\`filter-category-select\`):**  
  แทนที่ปุ่มแนวนอนเดิมที่มีแถบเลื่อน (Scrollbar) ด้วย Dropdown รายการหมวดหมู่อุปกรณ์ที่กะทัดรัด อยู่เคียงข้างตัวกรองสถานะ สะอาดตา กรองอุปกรณ์ (*Computer, Monitor, Printer, Scanner, Network...*) ได้ในคลิกเดียว
* **Numbered Pagination Slots:**  
  ปุ่มสลับหน้าแบบสล็อตหมายเลข (\`[1]\`, \`[2]\`, \`[3]\`, \`[4]\`...) พร้อมสถานะ Disabled สำหรับปุ่ม Previous (เมื่ออยู่หน้าแรก) และปุ่ม Next (เมื่ออยู่หน้าสุดท้าย)

---

## 2.3 การลงทะเบียนครุภัณฑ์ใหม่: ระบบจำกัดยี่ห้อเดียว และผังอาคารโรงพยาบาล
1. ในหน้า IT Portal กดปุ่ม **[➕ เพิ่มครุภัณฑ์ใหม่]**
2. **Single-Brand Guardrail:** กำหนดให้กรอกได้เพียง 1 ยี่ห้อ เช่น \`Dell\` หรือ \`HP\` ระบบมีกลไกป้องกันการพิมพ์หลายยี่ห้อปนกัน
3. **Hospital Layout Picker:** กดปุ่ม **[🏥 เลือกจากผังอาคาร]** เพื่อดึงชื่ออาคาร ชั้น และแผนกมาตรฐาน (Building 1 ชั้น 21 ถึง ชั้น D และ Call Center) ป้องกันข้อผิดพลาดในการพิมพ์ชื่อสถานที่
4. ระบุระยะเวลารับประกัน (1–5 ปี) แล้วบันทึกข้อมูล

---

## 2.4 มาตรการความปลอดภัยข้อมูล PDPA (Enforced Wipe Gate)
> 🛑 **ข้อบังคับ PDPA:** เครื่องคอมพิวเตอร์และอุปกรณ์ที่มีสื่อบันทึกข้อมูล (HDD/SSD) จะถูกระบบบล็อกไม่ให้ออกใบเคลมเด็ดขาด จนกว่าจะยืนยันการล้างข้อมูล
1. เปิดรายละเอียดเครื่องที่แจ้งซ่อม
2. ติ๊กช่อง *"ข้าพเจ้ายืนยันว่าได้ถอดสื่อบันทึกข้อมูล หรือล้างข้อมูลความปลอดภัยเรียบร้อยแล้ว"*
3. พิมพ์รหัสยืนยัน: **\`ยืนยัน\`** หรือ **\`WIPED\`**
4. กดปุ่ม **[ยืนยันความปลอดภัยข้อมูล]** ระบบจะบันทึก Audit Log และปลดล็อกให้สร้างใบเคลมได้ทันที

---

## 2.5 การประเมินความคุ้มค่า (Viability Score) และการออกใบส่งเคลม RMA
* **ดัชนีความคุ้มค่าในการซ่อม (Viability Score):**
  - **0.0 – 5.0 (\`VIABLE\` - 🟢 คุ้มค่าส่งซ่อม):** สมควรส่งศูนย์ซ่อมทันที
  - **5.1 – 10.0 (\`NOT_VIABLE\` - 🔴 ไม่คุ้มค่าส่งซ่อม):** เครื่องเก่าเกิน 5 ปี หรือค่าซ่อมประเมินไม่คุ้มค่า ควรเสนอแทงจำหน่าย (\`Scrapped\`) หรือขายทอดตลาด (\`Pending Sell\`)
* **การออกใบส่งเคลมศูนย์บริการ (Multi-Asset RMA):**
  - กดปุ่ม **[➕ สร้างใบเคลมใหม่]** ในแท็บใบส่งเคลม
  - เลือกศูนย์บริการ (Vendor) และระบุหมายเลข RMA Ticket
  - รวมส่งซ่อมได้ **1 ถึง 5 เครื่องต่อ 1 ใบเคลม**
  - บันทึกรายการ สถานะจะเปลี่ยนเป็น \`Pending Pickup (รอรถขนส่งมารับ)\`

---

## 2.6 การตั้งค่าระบบ 5 แท็บ: ทำเนียบผังอาคารโรงพยาบาลถาวร และการแก้ไขเบอร์ Hotline
เข้าสู่หน้าจัดการระบบผ่านเมนู **[⚙️ ตั้งค่า & จัดการระบบ]** ประกอบด้วย 5 แท็บย่อย:
1. \`🏷️ แบรนด์ & คู่มือเคลม\`: บันทึกข้อมูลและเงื่อนไขการเคลมของแต่ละแบรนด์
2. \`💻 หมวดหมู่อุปกรณ์\`: จัดการประเภทครุภัณฑ์คอมพิวเตอร์
3. \`🏥 แผนกและสถานที่ติดตั้ง (Hospital Locations & Wards)\`:  
   **ทำเนียบผังโครงสร้างอาคารมาตรฐานของโรงพยาบาล:** แสดงข้อมูลโครงสร้างอาคารจริงอย่างเป็นเอกภาพ (Building 1 ชั้น 21 ถึง ชั้น D และ Call Center) ปิดการแก้ไข/ลบโครงสร้างทางกายภาพ เพื่อความเสถียรและความถูกต้องของระบบ
4. \`👥 จัดการบัญชีผู้ใช้\`: แยกตาราง Admin และ IT Staff มีปุ่มล็อกและรีเซ็ตรหัสผ่าน
5. \`💾 สำรองฐานข้อมูล & ตั้งค่าเบอร์โทรศัพท์ส่วนกลาง\`:
   - **แก้ไขเบอร์โทรศัพท์ IT Support Hotline (4401 - 4403):** สามารถอัปเดตหมายเลขติดต่อด่วนของฝ่ายไอทีได้ทันที โดยระบบจะส่งค่าไปแสดงผลและเปิดใช้งานบนหน้าจอ Staff ทันทีแบบเรียลไทม์
   - **สำรองฐานข้อมูล:** กดดาวน์โหลดสำรอง SQLite ฐานข้อมูลทั้งหมดได้ใน 1 คลิก

---

## 2.7 การตรวจรับเครื่องซ่อมเสร็จ ส่งคืนวอร์ด และส่งออกรายงาน Excel
* **รับอุปกรณ์คืน:** เมื่อศูนย์ซ่อมส่งเครื่องกลับ ให้กดปุ่ม **[รับอุปกรณ์คืน]** สถานะจะเปลี่ยนเป็น \`Working (ปกติ)\` พร้อมส่งคืนวอร์ดเดิม
* **ส่งออกข้อมูล:** กดปุ่ม **[ส่งออก Excel (.xlsx)]** เพื่อดึงรายงานสรุปงานซ่อมและครุภัณฑ์ทั้งหมด
* **พิมพ์เอกสาร PDF:** สามารถพิมพ์ **ใบส่งมอบงานซ่อม (Repair Slip)** และ **ใบส่งเคลมศูนย์บริการ (RMA Report)** ภาษาไทยได้ทันที

---

# ❓ ภาคผนวก: การแก้ปัญหาเบื้องต้นที่พบบ่อย (FAQ & Troubleshooting)

* **Q: ยิงบาร์โค้ดแล้วขึ้นภาษาไทยเพี้ยนหรือตัวเลขผิด?**  
  *A:* ให้เปลี่ยนภาษาบนแป้นพิมพ์คอมพิวเตอร์เป็นภาษาอังกฤษ (EN) ก่อนยิงบาร์โค้ดเสมอ
* **Q: แป้นพิมพ์บนมือถือเด้งขึ้นมาบังเวลาสแกน?**  
  *A:* ให้เปิดสวิตช์ **"🔒 โหมดล็อกหัวอ่านบาร์โค้ด"** ด้านล่างช่องค้นหา
* **Q: ทำไมปุ่ม [🚨 แจ้งชำรุดเข้าส่วนกลาง] เป็นสีเทากดไม่ได้?**  
  *A:* อุปกรณ์ชิ้นนั้นมีผู้แจ้งซ่อมไปแล้ว หรืออยู่ระหว่างรอซ่อมแซม (Duplicate Report Guardrail)
* **Q: ทำไมปุ่ม [⚙️ ตั้งค่าระบบ] ในหน้า Staff เป็นสีเทากดไม่ได้?**  
  *A:* เมนูการตั้งค่าสงวนไว้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น บัญชีระดับ Staff จะถูกล็อกไว้เพื่อความปลอดภัย
* **Q: ลืมรหัสผ่านทำอย่างไร?**  
  *A:* ติดต่อผู้ดูแลระบบไอที (Admin) เพื่อทำการรีเซ็ตรหัสผ่านใหม่ในเมนูจัดการผู้ใช้
`;
}

// Write files
console.log('Generating Authentic Two-Sided User Manual files...');

// 1. In claimIT folder
fs.writeFileSync(docPath, '\ufeff' + generateHtmlAndWordContent(true), 'utf8');
fs.writeFileSync(htmlPath, '\ufeff' + generateHtmlAndWordContent(false), 'utf8');
fs.writeFileSync(mdPath, generateMarkdownContent(), 'utf8');
fs.writeFileSync(userManualPath, generateMarkdownContent(), 'utf8');

// 2. In root folder (d:/claimit)
fs.writeFileSync(rootDocPath, '\ufeff' + generateHtmlAndWordContent(true), 'utf8');
fs.writeFileSync(rootHtmlPath, '\ufeff' + generateHtmlAndWordContent(false), 'utf8');
fs.writeFileSync(rootMdPath, generateMarkdownContent(), 'utf8');
fs.writeFileSync(rootUserManualPath, generateMarkdownContent(), 'utf8');

console.log('✅ Generated Word Document (.doc):', docPath, 'and', rootDocPath);
console.log('✅ Generated HTML Manual (.html):', htmlPath, 'and', rootHtmlPath);
console.log('✅ Generated Markdown Manual (.md):', mdPath, 'and', rootMdPath);
console.log('✅ Generated USER_MANUAL.md (.md):', userManualPath, 'and', rootUserManualPath);
