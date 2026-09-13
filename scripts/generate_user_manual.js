/**
 * scripts/generate_user_manual.js
 * Generates comprehensive, genuine End-User Manuals for ClaimIT:
 * 1. Dedicated Staff User Manual (คู่มือเจ้าหน้าที่วอร์ด / ช่างเทคนิคภาคสนาม) -> .html, .doc, .md
 * 2. Dedicated Admin System Manual (คู่มือผู้ดูแลระบบไอทีและปฏิบัติการ) -> .html, .doc, .md
 * 3. Combined Dual-Role Manual (คู่มือฉบับสมบูรณ์) -> .html, .doc, .md, USER_MANUAL.md
 * 
 * Features:
 * - Embedded SVG diagrams (Workflow, Mobile UI, Desktop Admin UI, Viability Meter, RMA State Machine, PDPA Gate, Hospital Layout)
 * - Microsoft Word styling & pagination for .doc
 * - High-contrast responsive print CSS for .html
 * - Full coverage of all 21 walkthrough files (00 to 20)
 * - Exportable function for API-triggered regeneration
 */

const fs = require('fs');
const path = require('path');

// SVG 1: End-to-End Workflow Diagram
function getWorkflowSvg() {
  return `<svg width="100%" height="140" viewBox="0 0 840 140" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; margin:15px 0;">
    <defs>
      <linearGradient id="gBlue" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#0369a1"/></linearGradient>
      <linearGradient id="gRed" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#dc2626"/></linearGradient>
      <linearGradient id="gPurple" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient>
      <linearGradient id="gAmber" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#d97706"/></linearGradient>
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

// SVG 2: Mobile Staff UI Diagram
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

// SVG 3: Desktop Admin UI Diagram
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

// SVG 4: Viability Score Engine Diagram
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

// SVG 5: 6-Stage RMA State Machine
function getRmaStateMachineSvg() {
  return `<svg width="100%" height="90" viewBox="0 0 780 90" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; margin:15px 0;">
    <!-- States -->
    <rect x="15" y="25" width="105" height="42" rx="6" fill="#f1f5f9" stroke="#94a3b8"/>
    <text x="67" y="50" font-family="sans-serif" font-size="11" font-weight="bold" fill="#475569" text-anchor="middle">1. DRAFT</text>
    <path d="M 120 46 L 140 46" stroke="#64748b" stroke-width="2"/>

    <rect x="145" y="25" width="105" height="42" rx="6" fill="#e0f2fe" stroke="#38bdf8"/>
    <text x="197" y="50" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="middle">2. CONFIRMED</text>
    <path d="M 250 46 L 270 46" stroke="#64748b" stroke-width="2"/>

    <rect x="275" y="25" width="105" height="42" rx="6" fill="#fef3c7" stroke="#f59e0b"/>
    <text x="327" y="50" font-family="sans-serif" font-size="11" font-weight="bold" fill="#b45309" text-anchor="middle">3. SUBMITTED</text>
    <path d="M 380 46 L 400 46" stroke="#64748b" stroke-width="2"/>

    <rect x="405" y="25" width="115" height="42" rx="6" fill="#ede9fe" stroke="#8b5cf6"/>
    <text x="462" y="50" font-family="sans-serif" font-size="10.5" font-weight="bold" fill="#6d28d9" text-anchor="middle">4. VENDOR_RESP</text>
    <path d="M 520 46 L 540 46" stroke="#64748b" stroke-width="2"/>

    <rect x="545" y="25" width="105" height="42" rx="6" fill="#fef08a" stroke="#ca8a04"/>
    <text x="597" y="50" font-family="sans-serif" font-size="11" font-weight="bold" fill="#854d0e" text-anchor="middle">5. RETURNED</text>
    <path d="M 650 46 L 670 46" stroke="#64748b" stroke-width="2"/>

    <rect x="675" y="25" width="90" height="42" rx="6" fill="#dcfce7" stroke="#22c55e"/>
    <text x="720" y="50" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d" text-anchor="middle">6. CLOSED</text>
  </svg>`;
}

// Common HTML/Word CSS Stylesheet
function getCommonCss(isWordDoc = false) {
  return `
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
    .badge-staff {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .badge-admin {
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
    h2.section-header {
      padding: 12px 18px;
      border-radius: 6px;
      color: #ffffff;
      margin-top: 40px;
      font-size: 18pt;
    }
    .header-staff {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }
    .header-admin {
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
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12pt;
      color: #0369a1;
    }
  `;
}

// --------------------------------------------------------------------------
// 1. STAFF USER MANUAL (HTML & DOC)
// --------------------------------------------------------------------------
function generateStaffManualHtml(isWordDoc = false) {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>คู่มือการใช้งานระบบ ClaimIT สำหรับเจ้าหน้าที่วอร์ด (Staff User Manual)</title>
  <style>${getCommonCss(isWordDoc)}</style>
</head>
<body>
<div class="container">

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-icon">📱 🏥 🛠️</div>
    <h1 class="title">คู่มือการใช้งานระบบ ClaimIT (Staff User Manual)</h1>
    <div class="subtitle">ระบบแจ้งซ่อมและตรวจสอบประกันอุปกรณ์คอมพิวเตอร์ประจำแผนก/วอร์ด<br>Hospital IT Support & Broken Asset Reporting Portal</div>
    <span class="badge badge-staff">🟢 สำหรับเจ้าหน้าที่ประจำวอร์ด / พยาบาล / ช่างไอทีภาคสนาม (Staff)</span>
    <span class="badge">ฉบับปรับปรุงปี 2026</span>
    <div class="meta-box">
      <strong>จัดทำโดย:</strong> ฝ่ายเทคโนโลยีสารสนเทศและโครงสร้างพื้นฐานโรงพยาบาล<br>
      <strong>วัตถุประสงค์:</strong> เพื่อให้เจ้าหน้าที่ประจำแผนกสามารถตรวจสอบประกัน สแกนบาร์โค้ด แจ้งซ่อม ขอยืมเครื่องสำรอง และติดต่อสายด่วนไอทีได้อย่างถูกต้องรวดเร็ว
    </div>
  </div>

  <!-- TABLE OF CONTENTS -->
  <h2>📑 สารบัญคู่มือเจ้าหน้าที่ (Table of Contents)</h2>
  <div style="background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:25px;">
    <ul style="margin:0; line-height:1.9;">
      <li><strong>1.1 การเข้าสู่ระบบและความปลอดภัยของเซสชัน:</strong> Username <code>staff</code>, Password <code>staff123</code> และระบบตัดเซสชันอัตโนมัติ 15 นาที</li>
      <li><strong>1.2 การค้นหาและสแกนบาร์โค้ด:</strong> เครื่องอ่านบาร์โค้ด, พิมพ์ค้นหา, สแกนกล้องสด และ <em>Offline Photo Scanner</em> (รองรับ iOS Safari และแนบรูปอัตโนมัติ)</li>
      <li><strong>1.3 การตรวจสอบประกันแบบสองปฏิทิน:</strong> ปฏิทิน พ.ศ. (ไทย) และ ค.ศ. (สากล) พร้อมสถานะประกันเขียว-เหลือง-แดง</li>
      <li><strong>1.4 การแจ้งซ่อมอุปกรณ์ชำรุด:</strong> เลือกอาการเสีย, แนบภาพจุดชำรุด และ <em>ระบบป้องกันแจ้งซ่อมซ้ำ (Duplicate Guardrail)</em></li>
      <li><strong>1.5 ช่องทางติดต่อด่วน IT Support Hotline:</strong> หมายเลขโทรศัพท์ส่วนกลาง <code>4401 - 4403</code> พร้อมปุ่ม Click-to-Dial โทรออกได้ทันที</li>
      <li><strong>1.6 การขอยืมอุปกรณ์สำรองฉุกเฉิน (Emergency Loaner Units):</strong> การขอเบิกใช้งานเครื่องสำรอง All-in-One และ Printer</li>
      <li><strong>1.7 การติดตามสถานะงานซ่อมประจำแผนก:</strong> ตรวจสอบสถานะงานซ่อม 24 ชั่วโมง และคำชี้แจงปุ่มฟังก์ชันระดับ Admin ที่แสดงผลเป็นสีเทา (Disabled)</li>
      <li><strong>ภาคผนวก:</strong> ปัญหาที่พบบ่อยและการแก้ไขด้วยตนเอง (FAQ)</li>
    </ul>
  </div>

  <div style="text-align:center; margin:25px 0;">
    <div style="font-weight:bold; color:#0369a1; margin-bottom:6px;">📊 ภาพรวมกระบวนการแจ้งซ่อมและส่งเคลม 5 ขั้นตอน</div>
    ${getWorkflowSvg()}
  </div>

  <div class="page-break"></div>

  <!-- SECTION 1 -->
  <h2 class="section-header header-staff">📱 การใช้งานระบบแจ้งซ่อมสำหรับเจ้าหน้าที่ประจำวอร์ด</h2>

  <div style="text-align:center; margin:20px 0;">
    <div style="font-weight:bold; color:#059669; margin-bottom:6px;">📱 ภาพจำลองหน้าจอระบบแจ้งซ่อม Staff Portal UI</div>
    ${getMobileUiSvg()}
  </div>

  <h3>1.1 การเข้าสู่ระบบและความปลอดภัยของเซสชัน (Login & 15-Min Auto-Timeout)</h3>
  <ol>
    <li>เปิดเว็บเบราว์เซอร์ (Google Chrome, Microsoft Edge, หรือ Safari บน iPhone/iPad)</li>
    <li>พิมพ์ URL ระบบ ClaimIT (เช่น <code>http://10.33.x.x:8847</code> หรือลิงก์ที่ฝ่ายไอทีจัดเตรียมไว้)</li>
    <li>กรอก <strong>Username:</strong> <code>staff</code> และ <strong>Password:</strong> <code>staff123</code> (หรือบัญชีประจำแผนก)</li>
    <li>กดปุ่ม <strong>[เข้าสู่ระบบ]</strong> ระบบจะนำท่านเข้าสู่หน้าจอ <strong>"🛡️ ระบบแจ้งซ่อมประจำแผนก (Staff)"</strong> โดยตรง</li>
  </ol>
  <div class="callout warning">
    <div class="callout-title">🔒 ระบบตัดเซสชันอัตโนมัติเมื่อไม่ใช้งาน 15 นาที (Auto-Timeout)</div>
    หากเปิดหน้าจอทิ้งไว้โดยไม่มีการขยับเมาส์หรือแตะหน้าจอเกิน 15 นาที ระบบจะแสดงหน้าต่างแจ้งเตือนและออกจากระบบให้อัตโนมัติ เพื่อป้องกันผู้อื่นสวมสิทธิ์การใช้งานตามมาตรฐาน PDPA & ISO 27001
  </div>

  <h3>1.2 การค้นหาและสแกนครุภัณฑ์ (Barcode, Camera & Offline Photo Scanner)</h3>
  <ul>
    <li><strong>ยิงสแกนเนอร์บาร์โค้ด:</strong> ใช้ปืนยิงบาร์โค้ดยิงที่สติ๊กเกอร์รหัสครุภัณฑ์บนตัวเครื่องได้ทันที ข้อมูลจะแสดงขึ้นมาอัตโนมัติ</li>
    <li><strong>พิมพ์ค้นหา:</strong> พิมพ์รหัสครุภัณฑ์ในช่องค้นหา (เช่น <code>CIT-2024-AIO-02</code>) แล้วกดปุ่ม <strong>[🔍 ค้นหา]</strong></li>
    <li><strong>🔒 โหมดล็อกหัวอ่านบาร์โค้ด (Scanner Lock):</strong> แตะเปิดสวิตช์นี้เพื่อซ่อนแป้นพิมพ์จำลองบนจอมือถือไม่ให้เด้งขึ้นมาบดบังหน้าจอ</li>
    <li><strong>📷 สแกนกล้องสดและถ่ายภาพบาร์โค้ด (Offline Multi-Format Engine):</strong>
      <br>กดปุ่ม <strong>[📷 ถ่ายรูป]</strong> เพื่อเปิดหน้าต่างสแกนเนอร์:
      <ul>
        <li><strong>กล้องสด (Live Camera):</strong> ตรวจจับบาร์โค้ด Code 128 / Code 39 และ QR Code อัตโนมัติ</li>
        <li><strong>ถ่ายภาพบาร์โค้ด (Offline Photo Scanner):</strong> ใช้งานได้บนทุกอุปกรณ์และเบราว์เซอร์ โดยเฉพาะ Apple iOS Safari (iPhone / iPad) บนเครือข่ายแลน HTTP สามารถแตะ <strong>"📸 ถ่ายรูปบาร์โค้ด"</strong> เพื่อประมวลผลถอดรหัสบาร์โค้ดและ QR Code แบบออฟไลน์ได้ทันที 100%</li>
        <li><strong>แนบภาพหลักฐานอัตโนมัติ:</strong> หากสติ๊กเกอร์บาร์โค้ดเลือนรางหรือฉีกขาดจนสแกนไม่ติด ระบบจะนำภาพถ่ายไปแนบในใบแจ้งซ่อมเป็นภาพหลักฐานความเสียหายให้อัตโนมัติ</li>
      </ul>
    </li>
  </ul>

  <h3>1.3 การตรวจสอบสถานะประกัน 2 ปฏิทิน (Thai BE & CE)</h3>
  <ul>
    <li><span style="color:#15803d; font-weight:bold;">🟢 ปกติ ในประกัน:</span> อยู่ในระยะรับประกัน ซ่อมศูนย์ฟรี พร้อมแสดงวันหมดอายุทั้ง พ.ศ. และ ค.ศ. รวมถึงจำนวนวันที่เหลือ</li>
    <li><span style="color:#d97706; font-weight:bold;">⚠️ ใกล้หมดประกันใน 6 เดือน:</span> แจ้งเตือนให้รีบตรวจเช็กเครื่องก่อนสิ้นสุดสัญญาประกัน</li>
    <li><span style="color:#dc2626; font-weight:bold;">🔴 หมดอายุประกันแล้ว:</span> เครื่องหมดสัญญาประกันแล้ว ฝ่ายไอทีจะดำเนินการซ่อมบำรุงตามระเบียบพัสดุ</li>
  </ul>

  <h3>1.4 การแจ้งซ่อมอุปกรณ์ชำรุด และระบบป้องกันการแจ้งซ้ำซ้อน (Duplicate Guardrail)</h3>
  <ol>
    <li>เมื่อค้นหาอุปกรณ์พบแล้ว เลือกอาการเสียจากปุ่มลัด (เปิดไม่ติด, จอดับ, พิมพ์กระดาษติด, บาร์โค้ดไม่ติด) หรือพิมพ์รายละเอียด</li>
    <li>กดปุ่ม <strong>[📷 ถ่ายภาพจุดชำรุด]</strong> เพื่อแนบภาพความเสียหายจริงหน้างาน</li>
    <li>กดปุ่มสีแดง <strong>[🚨 แจ้งชำรุดเข้าส่วนกลาง]</strong> เพื่อส่งเรื่องให้ฝ่ายไอทีทันที</li>
  </ol>
  <div class="callout danger">
    <div class="callout-title">🛡️ ระบบป้องกันการแจ้งซ่อมซ้ำซ้อน (Duplicate Report Guardrail)</div>
    หากอุปกรณ์ชิ้นนั้นอยู่ในสถานะชำรุดอยู่แล้ว หรืออยู่ระหว่างรอส่งเคลม/กำลังซ่อมแซม ปุ่ม <strong>[🚨 แจ้งชำรุดเข้าส่วนกลาง]</strong> จะถูก <strong>ปิดการใช้งาน (Disabled / สีเทา)</strong> โดยอัตโนมัติ พร้อมมีข้อความชี้แจงชัดเจน เพื่อป้องกันไม่ให้เจ้าหน้าที่ในแผนกส่งตั๋วแจ้งซ่อมซ้ำซ้อน
  </div>

  <h3>1.5 ช่องทางติดต่อด่วน IT Support Hotline (☎️ 4401 - 4403 โทรออกได้ทันที)</h3>
  <ul>
    <li>บนหน้าจอ Staff Portal จะมีแถบข้อมูล <strong>"☎️ IT Support Hotline: 4401 - 4403"</strong> แสดงอยู่เสมอ</li>
    <li><strong>Click-to-Dial:</strong> สามารถแตะที่หมายเลขโทรศัพท์เพื่อโทรติดต่อทีมช่างไอทีได้ทันทีผ่านระบบโทรศัพท์ VoIP ของโรงพยาบาล</li>
    <li>หมายเลขนี้ได้รับการเชื่อมโยงและควบคุมจากศูนย์กลางไอที หากมีการปรับเปลี่ยนคู่สาย หมายเลขบนหน้าจอจะอัปเดตตรงกันโดยอัตโนมัติ</li>
  </ul>

  <h3>1.6 การขอยืมอุปกรณ์สำรองฉุกเฉิน (Emergency Loaner Units)</h3>
  <p>หากเครื่องคอมพิวเตอร์หรือเครื่องพิมพ์ในจุดบริการสำคัญเสีย และฝ่ายไอทีจำเป็นต้องยกเครื่องไปตรวจสอบ:</p>
  <ol>
    <li>กดปุ่ม <strong>[📦 ขอยืมเครื่องสำรองฉุกเฉิน (Loaner Unit)]</strong> ใต้การ์ดข้อมูลอุปกรณ์</li>
    <li>เลือกรหัสเครื่องสำรองที่พร้อมใช้งานในคลัง (เช่น <code>LNR-AIO-01</code> หรือ <code>LNR-PRN-01</code>)</li>
    <li>นำเครื่องสำรองมาต่อใช้งานแทนได้ทันที ทำให้งานบริการผู้ป่วยดำเนินต่อไปได้โดยไม่สะดุด</li>
  </ol>

  <h3>1.7 การติดตามสถานะงานซ่อม และคำชี้แจงปุ่มฟังก์ชันสีเทา (Disabled Controls)</h3>
  <ul>
    <li><strong>ตารางติดตามงานซ่อม:</strong> เลื่อนดูตารางสรุปงานซ่อมของแผนกตนเองได้ตลอด 24 ชั่วโมง เพื่อดูว่าช่างได้รับเครื่องไปแล้วหรือยัง และมีกำหนดส่งคืนวันไหน</li>
    <li><strong>ปุ่มฟังก์ชันระดับ Admin แสดงเป็นสีเทา:</strong> ปุ่ม <strong>[⚙️ ไปยังหน้าตั้งค่าระบบ]</strong> จะแสดงเป็นสีเทาและไม่สามารถกดได้ พร้อมมี Tooltip ชี้แจงว่า <em>"สำหรับสิทธิ์ผู้ดูแลระบบ (Admin) เท่านั้น"</em> เพื่อความปลอดภัยของระบบ</li>
  </ul>

  <div class="page-break"></div>

  <!-- FAQ -->
  <h2>❓ ภาคผนวก: การแก้ปัญหาเบื้องต้นสำหรับเจ้าหน้าที่วอร์ด (FAQ)</h2>
  <h3>Q1: ยิงบาร์โค้ดแล้วขึ้นภาษาไทยเพี้ยนหรือตัวเลขไม่ถูกต้อง?</h3>
  <p><strong>วิธีแก้:</strong> แป้นพิมพ์คอมพิวเตอร์เปิดโหมดภาษาไทยค้างอยู่ ให้กดปุ่มเปลี่ยนภาษาบนคีย์บอร์ดเป็น <strong>ภาษาอังกฤษ (EN)</strong> ก่อนยิงบาร์โค้ดเสมอ</p>

  <h3>Q2: สแกนผ่านมือถือแล้วแป้นพิมพ์เสมือนเด้งขึ้นมาบังจอภาพ?</h3>
  <p><strong>วิธีแก้:</strong> ให้เลื่อนเปิดสวิตช์ <strong>"🔒 โหมดล็อกหัวอ่านบาร์โค้ด"</strong> ที่อยู่ด้านล่างช่องค้นหา ระบบจะซ่อนแป้นพิมพ์บนจอให้อัตโนมัติ</p>

  <h3>Q3: สแกนบาร์โค้ดบนมือถือ iPhone / iPad ผ่านเครือข่ายแลนโรงพยาบาลแล้วกล้องสดไม่เปิด?</h3>
  <p><strong>วิธีแก้:</strong> เบราว์เซอร์ iOS Safari มีข้อกำหนดความปลอดภัยที่ไม่อนุญาตให้เปิดกล้องสดผ่าน HTTP วงแลน ให้แตะที่ปุ่ม <strong>"📸 ถ่ายรูปบาร์โค้ด"</strong> แทน ระบบได้ติดตั้งเอนจินประมวลผลภาพแบบ Offline Multi-Format Barcode Engine ไว้ภายในตัว สามารถถอดรหัสบาร์โค้ดและ QR Code จากภาพถ่ายได้ทันทีโดยไม่ต้องต่ออินเทอร์เน็ตภายนอก</p>

  <h3>Q4: หากสติ๊กเกอร์บาร์โค้ดเลือนรางหรือฉีกขาดจนสแกนไม่ติด ต้องทำอย่างไร?</h3>
  <p><strong>วิธีแก้:</strong> ให้ถ่ายภาพสติ๊กเกอร์หรือตัวเครื่องตามปกติ ระบบจะแนบรูปถ่ายนั้นเป็นหลักฐานความเสียหายในใบแจ้งซ่อมให้อัตโนมัติ จากนั้นให้เจ้าหน้าที่พิมพ์รหัสครุภัณฑ์เพื่อยืนยันการค้นหา</p>

  <hr style="margin-top:40px; border:0; border-top:1px solid #cbd5e1;">
  <div style="text-align:center; color:#64748b; font-size:11pt; padding:20px 0;">
    ClaimIT Hospital IT Warranty & RMA Claim Management System — คู่มือผู้ใช้งานสำหรับเจ้าหน้าที่วอร์ด (Staff User Manual)
  </div>

</div>
</body>
</html>`;
}

// --------------------------------------------------------------------------
// 2. ADMIN SYSTEM MANUAL (HTML & DOC)
// --------------------------------------------------------------------------
function generateAdminManualHtml(isWordDoc = false) {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>คู่มือผู้ดูแลระบบและวิศวกรไอที ClaimIT (Admin System Manual)</title>
  <style>${getCommonCss(isWordDoc)}</style>
</head>
<body>
<div class="container">

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-icon">💻 🛡️ ⚙️</div>
    <h1 class="title">คู่มือผู้ดูแลระบบและวิศวกรไอที ClaimIT (Admin System Manual)</h1>
    <div class="subtitle">ระบบบริหารจัดการรับประกัน ส่งเคลมศูนย์บริการ และควบคุมโครงสร้างระบบสารสนเทศโรงพยาบาล<br>Hospital IT Warranty, RMA Claim & System Administration Master Manual</div>
    <span class="badge badge-admin">🔵 สำหรับผู้ดูแลระบบ / วิศวกรคอมพิวเตอร์ / หัวหน้าฝ่ายไอที (Admin & Operations)</span>
    <span class="badge">ฉบับปรับปรุงปี 2026 (ครบทั้ง 21 โมดูล)</span>
    <div class="meta-box">
      <strong>จัดทำโดย:</strong> ฝ่ายเทคโนโลยีสารสนเทศและโครงสร้างพื้นฐานโรงพยาบาล<br>
      <strong>ครอบคลุม:</strong> การบริหารทะเบียนครุภัณฑ์, ออกใบเคลม RMA 1-5 เครื่อง, มาตรการล้างข้อมูล PDPA, ประเมินความคุ้มค่า Viability Score, Audit Trail, ผังอาคารถาวร, จัดการผู้ใช้ RBAC, ส่งออก Excel และ DevOps
    </div>
  </div>

  <!-- TABLE OF CONTENTS -->
  <h2>📑 สารบัญคู่มือผู้ดูแลระบบ (Complete Admin Index - 21 Modules)</h2>
  <div style="background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:25px;">
    <ul style="margin:0; line-height:1.8;">
      <li><strong>01. เริ่มต้นใช้งาน & สิทธิ์การเข้าถึง (RBAC):</strong> บัญชีผู้ดูแลระบบ <code>admin / admin123</code> และการจัดการโทเค็น JWT</li>
      <li><strong>02. แดชบอร์ดศูนย์ควบคุมไอที (IT Operations Hub):</strong> ตัวชี้วัด KPIs, แจ้งเตือน <code>expiring_60d</code> & <code>expiring_6m</code></li>
      <li><strong>03. สแกนและค้นหาครุภัณฑ์ขั้นสูง:</strong> Hardware Burst Listener, Anti-Typo Engine และ Offline Barcode Engine</li>
      <li><strong>04. การบริหารจัดการทะเบียนครุภัณฑ์ (Asset Management):</strong> Category Dropdown Selector, Single-Brand Guardrail, Numbered Pagination Slots และผังอาคารโรงพยาบาล</li>
      <li><strong>05. มาตรการความปลอดภัยข้อมูล PDPA Storage Sanitization:</strong> ประตูกักกันข้อมูล (Enforced Wipe Gate: พิมพ์ "ยืนยัน" / "WIPED")</li>
      <li><strong>06. การสร้างใบส่งเคลมศูนย์บริการ (Multi-Asset RMA):</strong> รวบรวมส่งเคลม 1 ถึง 5 เครื่องต่อใบเคลม และเลือกศูนย์บริการ</li>
      <li><strong>07. เครื่องคำนวณความคุ้มค่า (Viability Score Engine):</strong> ดัชนีตัดสิน &le; 5.0 (VIABLE) vs &gt; 5.0 (NOT_VIABLE)</li>
      <li><strong>08. วงจรสถานะงานเคลม (6-Stage Claim State Machine):</strong> DRAFT &rarr; CONFIRMED &rarr; SUBMITTED &rarr; VENDOR_RESPONSE &rarr; RETURNED &rarr; CLOSED</li>
      <li><strong>09. ระบบจัดเก็บไฟล์หลักฐานและความปลอดภัย (Evidence Storage):</strong> IDOR Protection, Magic Byte Inspection และการกักกันไฟล์ 90 วัน</li>
      <li><strong>10. ศูนย์พิมพ์เอกสารราชการและ PDF (PDF & Print Center):</strong> ใบส่งเคลม RMA Voucher, Gate Pass และ Repair Slips ฟอนต์ไทย Tahoma</li>
      <li><strong>11. การแทงจำหน่ายและจัดการซาก (EOL & Salvage Disposal):</strong> Pending Sell, Sold, Pending Donation, Donated และ Scrapped</li>
      <li><strong>12. บันทึกประวัติการเปลี่ยนแปลงแบบแก้ไขไม่ได้ (Audit Trail):</strong> รหัสอ้างอิง <code>CHG-YYYYMMDD-XXXXXX</code> และตัวกรองช่วงเวลา</li>
      <li><strong>13. การบริหารจัดการบัญชีผู้ใช้ (User Management):</strong> แยกตาราง Admin/Staff, ตัวกรองบทบาท, นโยบายรหัสผ่าน <code>must_change_password</code></li>
      <li><strong>14. การตั้งค่าระบบ 6 แท็บย่อย (System Configurations):</strong> แบรนด์, หมวดหมู่เรียงตาม ID, ทะเบียนผังอาคารโรงพยาบาลถาวร, ผู้ใช้, Feedback & Bugs (#tab-cfg-feedback) และสำรองฐานข้อมูล</li>
      <li><strong>15. ระบบสายด่วนไอทีแบบไดนามิก (Dynamic IT Hotline):</strong> ควบคุมเบอร์โทร <code>4401 - 4403</code> เชื่อมโยงสู่หน้า Staff ทันทีแบบ 0-DB changes</li>
      <li><strong>16. การส่งออกข้อมูล Excel & CSV:</strong> Microsoft Excel SpreadsheetML (.xls) แบบหลายชีต และ UTF-8 BOM CSV</li>
      <li><strong>17. เมนูทางลัดด่วน (Quick Access Sidebar Drawer):</strong> สถิติงานประจำวัน, ประวัติการสแกน และสายด่วน Vendor</li>
      <li><strong>18. การแจ้งเตือนผ่านอีเมล (Email Notifications):</strong> Resend API Integration สำหรับรายงานผล Viability และใบเคลม</li>
      <li><strong>19. มาตรการความปลอดภัยและป้องกันการโจมตี (Security & Hardening):</strong> Rate Limiting, CORS, Parameterized SQL, Token Revocation</li>
      <li><strong>20. การติดตั้งระบบและการบำรุงรักษา (DevOps & Deployment):</strong> Node.js, Docker Compose, SQLite WAL Mode และ Daily Auto-Maintenance</li>
      <li><strong>ภาคผนวก:</strong> Disaster Recovery, การกู้คืนฐานข้อมูลสำรอง และ FAQ สำหรับผู้ดูแลระบบ</li>
    </ul>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 2: ADMIN DEEP DIVE -->
  <h2 class="section-header header-admin">🔵 รายละเอียดโมดูลระบบสารสนเทศและการควบคุมส่วนกลาง</h2>

  <div style="text-align:center; margin:20px 0;">
    <div style="font-weight:bold; color:#1e40af; margin-bottom:6px;">💻 ภาพรวมหน้าจอศูนย์ควบคุมและตารางครุภัณฑ์ (IT Portal Admin UI)</div>
    ${getAdminUiSvg()}
  </div>

  <h3>2.1 การบริหารจัดการทะเบียนครุภัณฑ์ (Asset Management)</h3>
  <ul>
    <li><strong>ตัวกรองหมวดหมู่ Dropdown Selector (<code>filter-category-select</code>):</strong> ออกแบบกะทัดรัด สะอาดตา อยู่เคียงข้างตัวกรองสถานะอุปกรณ์ ช่วยตัดปัญหา Horizontal Scrollbar กรองเฉพาะ Computer, Monitor, Printer, Network ได้ทันที</li>
    <li><strong>ระบบป้องกันการพิมพ์หลายยี่ห้อ (Single-Brand Guardrail):</strong> ตรวจสอบทั้ง Frontend และ Backend ป้องกันไม่ให้พิมพ์หลายยี่ห้อปนกัน (เช่น <code>Dell และ Acer</code>, <code>HP, Lenovo</code>) พร้อมระบบ Whitelist รองรับชื่อแบรนด์ผสมถูกต้อง เช่น <em>A&amp;D Medical, Bang &amp; Olufsen, AT&amp;T</em></li>
    <li><strong>ปุ่มสล็อตตัวเลขสลับหน้า (Numbered Pagination Slots):</strong> แสดงปุ่ม <code>[1]</code> <code>[2]</code> <code>[3]</code> ... ชัดเจน พร้อมระบบล็อกปุ่มขอบหน้า (Boundary Disabled)</li>
    <li><strong>🏥 ทำเนียบผังอาคารโรงพยาบาลมาตรฐาน (Hospital Layout Picker):</strong> กดเลือกอาคาร ชั้น และแผนกจากผังโครงสร้างจริง (อาคาร 1 ชั้น 21 ถึง ชั้น D และอาคาร Call Center) ป้องกันข้อผิดพลาดในการพิมพ์ชื่อสถานที่</li>
  </ul>

  <h3>2.2 มาตรการความปลอดภัยข้อมูล PDPA (Enforced Wipe Gate)</h3>
  <div class="callout danger">
    <div class="callout-title">🛑 ข้อบังคับความปลอดภัยข้อมูลผู้ป่วย (PDPA Data Sanitization Gate)</div>
    อุปกรณ์ที่มีสื่อบันทึกข้อมูล (ฮาร์ดดิสก์, SSD) เช่น คอมพิวเตอร์ All-in-One หรือโน้ตบุ๊ก <strong>จะถูกระบบบล็อกไม่ให้ออกใบส่งเคลมเด็ดขาด</strong> จนกว่าผู้ดูแลระบบจะยืนยันว่าได้ถอดสื่อบันทึกข้อมูลหรือทำการล้างข้อมูลความปลอดภัยเรียบร้อยแล้ว
  </div>
  <ol>
    <li>เปิดการ์ดรายละเอียดของเครื่องที่แจ้งซ่อม</li>
    <li>ติ๊กช่อง <em>"ข้าพเจ้ายืนยันว่าได้ถอดสื่อบันทึกข้อมูล หรือล้างข้อมูลความปลอดภัยเรียบร้อยแล้ว"</em></li>
    <li>พิมพ์รหัสยืนยัน: <strong style="color:#0284c7; font-size:14pt;">ยืนยัน หรือ WIPED</strong></li>
    <li>กดปุ่ม <strong>[ยืนยันความปลอดภัยข้อมูล]</strong> ระบบจะบันทึก Audit Log และปลดล็อกให้สามารถนำเครื่องเข้าสู่กระบวนการสร้างใบเคลม RMA ได้ทันที</li>
  </ol>

  <h3>2.3 การประเมินความคุ้มค่า (Viability Score Engine)</h3>
  <div style="text-align:center; margin:15px 0;">
    ${getViabilitySvg()}
  </div>
  <p>ระบบใช้สูตรคำนวณความคุ้มค่าทางเศรษฐศาสตร์:</p>
  <ul>
    <li><strong>อยู่ในสัญญาประกัน:</strong> Viability Score = <strong>1.0 (VIABLE)</strong> (คุ้มค่าที่สุด ศูนย์บริการรับผิดชอบค่าอะไหล่และค่าแรง)</li>
    <li><strong>หมดประกันแล้ว:</strong> คำนวณจากราคาจัดซื้อเดิม, ค่าซ่อมประเมิน, และอายุการใช้งาน:
      <ul>
        <li>คะแนน <strong>0.0 – 5.0 (🟢 VIABLE):</strong> คุ้มค่าส่งซ่อมศูนย์บริการ</li>
        <li>คะแนน <strong>5.1 – 10.0 (🔴 NOT VIABLE):</strong> ไม่คุ้มค่าซ่อม (เครื่องเก่าเกิน 5 ปี หรือค่าซ่อมเกิน 50% ของมูลค่าคงเหลือ) ควรพิจารณาเสนอแทงจำหน่าย (Scrap) หรือขายทอดตลาด</li>
      </ul>
    </li>
  </ul>

  <h3>2.4 การสร้างใบส่งเคลมศูนย์บริการ (Multi-Asset RMA Claims)</h3>
  <ul>
    <li>กดปุ่ม <strong>[➕ สร้างใบเคลมใหม่]</strong> ในแท็บใบส่งเคลม</li>
    <li>เลือกศูนย์บริการ (Vendor) เช่น Dell ProSupport, HP Care, TSC, Canon, Acer ฯลฯ และใส่เลข Case/Ticket</li>
    <li>สามารถเลือกครุภัณฑ์ที่ผ่านการล้างข้อมูลแล้วรวมส่งพร้อมกันได้ <strong>1 ถึง 5 เครื่องต่อ 1 ใบเคลม</strong></li>
    <li>เมื่อบันทึก เครื่องจะเปลี่ยนสถานะเป็น <code>Pending Pickup (รอรถขนส่งมารับ)</code></li>
  </ul>

  <h3>2.5 วงจรสถานะงานเคลม (6-Stage Claim State Machine)</h3>
  <div style="text-align:center; margin:15px 0;">
    ${getRmaStateMachineSvg()}
  </div>
  <table style="font-size:11.5pt;">
    <tr><th>ลำดับ</th><th>สถานะ</th><th>ความหมายและเงื่อนไขการเปลี่ยนผ่าน</th></tr>
    <tr><td>1</td><td><code>DRAFT</code></td><td>ร่างใบเคลม ยังสามารถเพิ่ม/ลดรายการครุภัณฑ์ได้</td></tr>
    <tr><td>2</td><td><code>CONFIRMED</code></td><td>ยืนยันรายการส่งซ่อม ล็อกรายการครุภัณฑ์</td></tr>
    <tr><td>3</td><td><code>SUBMITTED</code></td><td>ส่งมอบเครื่องให้รถขนส่ง/ศูนย์บริการเรียบร้อยแล้ว</td></tr>
    <tr><td>4</td><td><code>VENDOR_RESPONSE</code></td><td>ศูนย์บริการตอบรับ กำลังดำเนินการซ่อมหรือรออะไหล่</td></tr>
    <tr><td>5</td><td><code>RETURNED</code></td><td>ศูนย์บริการส่งเครื่องกลับมาถึงโรงพยาบาล อยู่ระหว่างตรวจรับ</td></tr>
    <tr><td>6</td><td><code>CLOSED</code></td><td>ตรวจรับเรียบร้อย ส่งเครื่องคืนวอร์ด ปิดงานสมบูรณ์</td></tr>
  </table>

  <h3>2.6 การตั้งค่าระบบ 6 แท็บย่อย (System Configurations)</h3>
  <ol>
    <li><code>🏷️ แบรนด์ & คู่มือเคลม</code>: บันทึกข้อมูลติดต่อและเงื่อนไขการส่งซ่อมของแต่ละศูนย์บริการ</li>
    <li><code>💻 หมวดหมู่อุปกรณ์</code>: จัดระเบียบตามลำดับ ID พร้อมคำแปลภาษาไทย</li>
    <li><code>🏥 แผนกและผังอาคารถาวร (Hospital Directory)</code>: แสดงผังอาคารทางการ (อาคาร 1 และ Call Center) แบบไม่ให้ลบโครงสร้างถาวร</li>
    <li><code>👥 จัดการบัญชีผู้ใช้ (RBAC)</code>: แยกตารางแสดงผล Admin และ Staff พร้อมปุ่มเปลี่ยนรหัสผ่านและนโยบาย <code>must_change_password</code></li>
    <li><code>💬 ข้อเสนอแนะและแจ้งปัญหา (Feedback & Bugs)</code>: ติดตามข้อเสนอแนะจากเจ้าหน้าที่หน้างาน (แท็บ <code>#tab-cfg-feedback</code>)</li>
    <li><code>💾 สำรองฐานข้อมูล & สายด่วนไอที</code>:
      <ul>
        <li><strong>แก้ไขเบอร์สายด่วน IT Support Hotline:</strong> ระบุหมายเลขคั่นด้วยจุลภาค เช่น <code>4401, 4402, 4403</code> เพื่ออัปเดตไปยังหน้า Staff ทันที</li>
        <li><strong>สำรองฐานข้อมูล (SQLite Backup):</strong> คลิกเดียวเพื่อดาวน์โหลด Snapshot ฐานข้อมูลพร้อมโครงสร้างครบถ้วน</li>
      </ul>
    </li>
  </ol>

  <h3>2.7 ความปลอดภัยและการจัดเก็บหลักฐาน (Evidence Storage & IDOR Protection)</h3>
  <ul>
    <li><strong>Magic Byte Validation:</strong> ตรวจสอบโครงสร้างไบต์จริงของไฟล์ทุกไฟล์บนดิสก์ ป้องกันการปลอมแปลงนามสกุลไฟล์</li>
    <li><strong>IDOR Protection:</strong> การเข้าถึงไฟล์หลักฐานทุกไฟล์ต้องผ่านการตรวจสอบสิทธิ์ JWT และความสัมพันธ์ของคดี</li>
    <li><strong>Quarantine Purge:</strong> ระบบทำความสะอาดไฟล์ที่กักกันเกิน 90 วันอัตโนมัติทุก 24 ชั่วโมง</li>
  </ul>

  <h3>2.8 การติดตั้งและการบำรุงรักษา (DevOps & Maintenance)</h3>
  <ul>
    <li><strong>คำสั่งเริ่มต้นระบบ:</strong> <code>npm start</code> หรือรันไฟล์ <code>Start_Hospital_LAN.bat</code></li>
    <li><strong>การทำงานบนเครือข่ายแลนโรงพยาบาล:</strong> ระบบผูกกับ <code>0.0.0.0</code> และตรวจจับ IP วงแลน <code>10.33.x.x</code> หรือ <code>10.x.x.x</code> อัตโนมัติ</li>
    <li><strong>SQLite WAL Mode:</strong> เปิดใช้งาน Write-Ahead Logging เพื่อรองรับการอ่าน/เขียนพร้อมกันหลายแผนกได้อย่างมีเสถียรภาพ</li>
  </ul>

  <hr style="margin-top:40px; border:0; border-top:1px solid #cbd5e1;">
  <div style="text-align:center; color:#64748b; font-size:11pt; padding:20px 0;">
    ClaimIT Hospital IT Warranty & RMA Claim Management System — คู่มือผู้ดูแลระบบและวิศวกรไอที (Admin System Manual)
  </div>

</div>
</body>
</html>`;
}

// --------------------------------------------------------------------------
// 3. COMBINED DUAL-ROLE MANUAL (HTML & DOC) - Backward Compatibility
// --------------------------------------------------------------------------
function generateCombinedManualHtml(isWordDoc = false) {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>คู่มือการใช้งานระบบ ClaimIT (Dual-Role User & Admin Manual)</title>
  <style>${getCommonCss(isWordDoc)}</style>
</head>
<body>
<div class="container">

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-icon">💻 🏥 🛡️</div>
    <h1 class="title">คู่มือการใช้งานระบบ ClaimIT (Dual-Role User Manual)</h1>
    <div class="subtitle">ระบบบริหารจัดการรับประกันและส่งเคลมครุภัณฑ์คอมพิวเตอร์โรงพยาบาล<br>(Hospital IT Warranty & RMA Claim Management System)</div>
    <span class="badge badge-staff">🟢 ด้านที่ 1: สำหรับเจ้าหน้าที่ประจำวอร์ด / ผู้ใช้งานทั่วไป (Staff)</span>
    <span class="badge badge-admin">🔵 ด้านที่ 2: สำหรับผู้ดูแลระบบและฝ่ายไอที (Admin & Operations)</span>
    <span class="badge">ฉบับปรับปรุงปี 2026 (ครบทั้ง 21 โมดูล)</span>
    <div class="meta-box">
      <strong>จัดทำโดย:</strong> ฝ่ายเทคโนโลยีสารสนเทศและโครงสร้างพื้นฐานโรงพยาบาล<br>
      <strong>โครงสร้างคู่มือ:</strong> รวมทั้ง 2 ด้านไว้ในเล่มเดียว เพื่อให้ผู้ใช้งานทุกระดับสามารถทำความเข้าใจภาพรวมของระบบร่วมกันได้อย่างสมบูรณ์
    </div>
  </div>

  <div style="text-align:center; margin:25px 0;">
    <div style="font-weight:bold; color:#0369a1; margin-bottom:6px;">📊 ภาพรวมกระบวนการทำงานทั้ง 5 ขั้นตอน (End-to-End Workflow)</div>
    ${getWorkflowSvg()}
  </div>

  <div class="page-break"></div>

  <!-- SIDE 1: STAFF -->
  <h2 class="section-header header-staff">🟢 ด้านที่ 1 (SIDE 1): คู่มือสำหรับเจ้าหน้าที่ประจำวอร์ด / ผู้ใช้งานทั่วไป (Staff Portal)</h2>
  <div style="text-align:center; margin:20px 0;">
    ${getMobileUiSvg()}
  </div>
  <h3>1.1 วิธีการเข้าสู่ระบบและความปลอดภัยของเซสชัน</h3>
  <p>เข้าสู่ระบบด้วย Username: <code>staff</code> และ Password: <code>staff123</code> พร้อมระบบตัดเซสชันอัตโนมัติเมื่อไม่มีการใช้งาน 15 นาที</p>
  <h3>1.2 การค้นหาครุภัณฑ์ ตรวจสอบประกัน และโหมดล็อกหัวอ่านบาร์โค้ด</h3>
  <p>รองรับการยิงสแกนเนอร์บาร์โค้ด, พิมพ์ค้นหา, สแกนกล้องสด และระบบ <strong>Offline Photo Scanner</strong> บน iOS Safari พร้อมระบบแนบรูปอัตโนมัติ</p>
  <h3>1.3 การแจ้งซ่อมอุปกรณ์ชำรุด และระบบ Duplicate Report Guardrail</h3>
  <p>ระบบล็อกปุ่มแจ้งซ่อมเป็นสีเทาโดยอัตโนมัติหากอุปกรณ์ได้รับการแจ้งซ่อมไปแล้ว เพื่อป้องกันความสับสน</p>
  <h3>1.4 ช่องทางติดต่อด่วน IT Support Hotline (4401 - 4403)</h3>
  <p>แตะโทรออกได้ทันที พร้อมอัปเดตหมายเลขแบบไดนามิกจากระบบส่วนกลาง</p>
  <h3>1.5 การขอยืมอุปกรณ์สำรองฉุกเฉิน (Emergency Loaner Units)</h3>
  <p>ขอยืมคอมพิวเตอร์ All-in-One หรือเครื่องพิมพ์สำรองได้ทันทีเมื่อเกิดเหตุฉุกเฉิน</p>
  <h3>1.6 การติดตามสถานะงานซ่อมประจำแผนก</h3>
  <p>ตรวจสอบสถานะได้ตลอด 24 ชม. และปุ่มฟังก์ชันระดับ Admin จะแสดงเป็นสีเทาสำหรับ Staff</p>

  <div class="page-break"></div>

  <!-- SIDE 2: ADMIN -->
  <h2 class="section-header header-admin">🔵 ด้านที่ 2 (SIDE 2): คู่มือสำหรับผู้ดูแลระบบและฝ่ายไอที (Admin Portal)</h2>
  <div style="text-align:center; margin:20px 0;">
    ${getAdminUiSvg()}
  </div>
  <h3>2.1 แดชบอร์ดศูนย์ควบคุมไอที และทางลัดเครื่องใกล้หมดประกัน</h3>
  <p>สรุปสถิติ KPIs ทั่วทั้งโรงพยาบาล พร้อมทางลัด <code>expiring_60d</code> และ <code>expiring_6m</code></p>
  <h3>2.2 Category Dropdown Selector และ Numbered Pagination Slots</h3>
  <p>ตัวกรองหมวดหมู่แบบ Dropdown ไร้ Scrollbar แนวนอน พร้อมปุ่มสลับหน้าแบบสล็อตหมายเลข 1, 2, 3...</p>
  <h3>2.3 การลงทะเบียนครุภัณฑ์: Single-Brand Guardrail และผังอาคารโรงพยาบาล</h3>
  <p>ระบบป้องกันพิมพ์หลายยี่ห้อ พร้อมตัวเลือกผังอาคาร 1 ชั้น 21-D และ Call Center</p>
  <h3>2.4 มาตรการความปลอดภัยข้อมูล PDPA (Enforced Wipe Gate)</h3>
  <p>บังคับพิมพ์ <strong>ยืนยัน</strong> หรือ <strong>WIPED</strong> ก่อนอนุญาตให้ออกใบส่งเคลมสำหรับอุปกรณ์ที่มีสื่อบันทึกข้อมูล</p>
  <h3>2.5 เครื่องคำนวณความคุ้มค่า (Viability Score) และใบเคลม Multi-Asset RMA</h3>
  <div style="text-align:center; margin:15px 0;">
    ${getViabilitySvg()}
  </div>
  <p>เกณฑ์ประเมิน &le; 5.0 คุ้มค่าส่งซ่อม และรวมส่งซ่อมได้ 1 ถึง 5 เครื่องต่อ 1 ใบเคลม</p>
  <h3>2.6 วงจรสถานะงานเคลม (6-Stage Claim State Machine)</h3>
  <div style="text-align:center; margin:15px 0;">
    ${getRmaStateMachineSvg()}
  </div>
  <p>DRAFT &rarr; CONFIRMED &rarr; SUBMITTED &rarr; VENDOR_RESPONSE &rarr; RETURNED &rarr; CLOSED</p>
  <h3>2.7 การตั้งค่าระบบ 6 แท็บย่อย และการสำรองฐานข้อมูล</h3>
  <p>จัดการแบรนด์, หมวดหมู่, ผังอาคาร, ผู้ใช้, Feedback & Bugs (#tab-cfg-feedback) และตั้งค่าเบอร์ Hotline</p>

  <hr style="margin-top:40px; border:0; border-top:1px solid #cbd5e1;">
  <div style="text-align:center; color:#64748b; font-size:11pt; padding:20px 0;">
    ClaimIT Hospital IT Warranty & RMA Claim Management System — คู่มือฉบับสมบูรณ์สองด้าน (Dual-Role User Manual)
  </div>

</div>
</body>
</html>`;
}

// --------------------------------------------------------------------------
// 4. MARKDOWN GENERATORS (Staff, Admin, Combined)
// --------------------------------------------------------------------------
function generateStaffMarkdown() {
  return `# 📱 คู่มือการใช้งานระบบ ClaimIT สำหรับเจ้าหน้าที่วอร์ด (Staff User Manual)
> **ระบบแจ้งซ่อมและตรวจสอบประกันอุปกรณ์คอมพิวเตอร์ประจำแผนก/วอร์ด**  
> *(Hospital IT Support & Broken Asset Reporting Portal — ฉบับปรับปรุงปี 2026)*

---

## 📑 สารบัญคู่มือเจ้าหน้าที่ (Table of Contents)
1. [1.1 การเข้าสู่ระบบและความปลอดภัยของเซสชัน (15 นาที)](#11-การเข้าสู่ระบบและความปลอดภัยของเซสชัน)
2. [1.2 การค้นหาและสแกนบาร์โค้ด (กล้องสด & ถ่ายภาพออฟไลน์บน iOS)](#12-การค้นหาและสแกนบาร์โค้ด)
3. [1.3 การตรวจสอบสถานะประกัน 2 ปฏิทิน (พ.ศ. / ค.ศ.)](#13-การตรวจสอบสถานะประกัน-2-ปฏิทิน)
4. [1.4 การแจ้งซ่อมอุปกรณ์ชำรุด และระบบป้องกันการแจ้งซ้ำซ้อน](#14-การแจ้งซ่อมอุปกรณ์ชำรุด-และระบบป้องกันการแจ้งซ้ำซ้อน)
5. [1.5 ช่องทางติดต่อด่วน IT Support Hotline (4401 - 4403)](#15-ช่องทางติดต่อด่วน-it-support-hotline)
6. [1.6 การขอยืมอุปกรณ์สำรองฉุกเฉิน (Emergency Loaner Units)](#16-การขอยืมอุปกรณ์สำรองฉุกเฉิน)
7. [1.7 การติดตามสถานะงานซ่อมประจำแผนก](#17-การติดตามสถานะงานซ่อมประจำแผนก)
8. [❓ ภาคผนวก: การแก้ปัญหาเบื้องต้นที่พบบ่อย (FAQ)](#ภาคผนวก-การแก้ปัญหาเบื้องต้นที่พบบ่อย)

---

## 1.1 การเข้าสู่ระบบและความปลอดภัยของเซสชัน
- **URL ระบบ:** เปิดเบราว์เซอร์ไปที่ลิงก์ระบบ ClaimIT ของโรงพยาบาล
- **Username:** \`staff\`
- **Password:** \`staff123\`
- **ระบบตัดเซสชัน 15 นาที (Auto-Timeout):** หากไม่มีการใช้งานเกิน 15 นาที ระบบจะตัดการเชื่อมต่อและออกจากระบบอัตโนมัติเพื่อความปลอดภัยของข้อมูล

---

## 1.2 การค้นหาและสแกนบาร์โค้ด
- **ยิงสแกนเนอร์บาร์โค้ด:** ใช้ปืนยิงบาร์โค้ดยิงใส่สติ๊กเกอร์บนตัวเครื่องได้ทันที
- **พิมพ์ค้นหา:** พิมพ์รหัสครุภัณฑ์ (เช่น \`CIT-2024-AIO-02\`) แล้วกดค้นหา
- **🔒 โหมดล็อกหัวอ่านบาร์โค้ด:** ปิดแป้นพิมพ์บนจอมือถือไม่ให้เด้งขึ้นมาบดบัง
- **📷 สแกนกล้องสด & Offline Photo Scanner:**  
  กดปุ่ม **[📷 ถ่ายรูป]** เพื่อตรวจจับบาร์โค้ด/QR Code หรือแตะ **"📸 ถ่ายรูปบาร์โค้ด"** เพื่อถอดรหัสแบบออฟไลน์ 100% บน Apple iOS Safari (iPhone / iPad) หากสติ๊กเกอร์เลือนราง ระบบจะแนบภาพเป็นหลักฐานความเสียหายให้อัตโนมัติ

---

## 1.3 การตรวจสอบสถานะประกัน 2 ปฏิทิน
- \`🟢 ปกติ ในประกัน:\` อยู่ในระยะรับประกัน ซ่อมศูนย์ฟรี
- \`⚠️ ใกล้หมดประกันใน 6 เดือน:\` แจ้งเตือนให้รีบส่งตรวจสอบก่อนหมดสัญญา
- \`🔴 หมดอายุประกันแล้ว:\` เครื่องหมดสัญญาประกันแล้ว

---

## 1.4 การแจ้งซ่อมอุปกรณ์ชำรุด และระบบป้องกันการแจ้งซ้ำซ้อน
1. เลือกอาการเสียจากปุ่มลัด (เปิดไม่ติด, จอดับ, พิมพ์กระดาษติด, บาร์โค้ดไม่ติด)
2. กดปุ่ม **[📷 ถ่ายภาพจุดชำรุด]** เพื่อแนบภาพความเสียหายจริงหน้างาน
3. กดปุ่มสีแดง **[🚨 แจ้งชำรุดเข้าส่วนกลาง]**
> 🛡️ **Duplicate Report Guardrail:** หากเครื่องอยู่ระหว่างรอซ่อม ปุ่มแจ้งซ่อมจะถูก **ปิดการใช้งาน (สีเทา)** อัตโนมัติ เพื่อป้องกันการส่งซ้ำ

---

## 1.5 ช่องทางติดต่อด่วน IT Support Hotline
- แถบ **☎️ IT Support Hotline: 4401 - 4403** แสดงอยู่เด่นชัด
- **Click-to-Dial:** แตะที่เบอร์เพื่อโทรออกได้ทันที
- หมายเลขจะอัปเดตแบบไดนามิกตรงกับการตั้งค่าของฝ่ายไอทีส่วนกลางเสมอ

---

## 1.6 การขอยืมอุปกรณ์สำรองฉุกเฉิน
กดปุ่ม **[📦 ขอยืมเครื่องสำรองฉุกเฉิน (Loaner Unit)]** เลือกรหัสเครื่องสำรอง (เช่น \`LNR-AIO-01\`) แล้วนำมาต่อใช้งานได้ทันที

---

## 1.7 การติดตามสถานะงานซ่อมประจำแผนก
สามารถเลื่อนดูตารางติดตามงานซ่อมของแผนกได้ตลอด 24 ชม. โดยปุ่มตั้งค่าระบบระดับ Admin จะแสดงเป็นสีเทา (Disabled) พร้อมแจ้งเตือนสิทธิ์เพื่อความปลอดภัย

---

## ❓ ภาคผนวก: การแก้ปัญหาเบื้องต้นที่พบบ่อย
- **ยิงบาร์โค้ดแล้วขึ้นภาษาไทยเพี้ยน:** เปลี่ยนภาษาบนคีย์บอร์ดคอมพิวเตอร์เป็นภาษาอังกฤษ (EN)
- **แป้นพิมพ์มือถือเด้งบังจอ:** เลื่อนเปิดสวิตช์ "🔒 โหมดล็อกหัวอ่านบาร์โค้ด"
- **กล้องสดไม่เปิดบน iOS Safari ผ่าน LAN:** แตะที่ปุ่ม "📸 ถ่ายรูปบาร์โค้ด" เพื่อถอดรหัสผ่าน Offline Barcode Engine ได้ทันที
`;
}

function generateAdminMarkdown() {
  return `# 💻 คู่มือผู้ดูแลระบบและวิศวกรไอที ClaimIT (Admin System Manual)
> **ระบบบริหารจัดการรับประกัน ส่งเคลมศูนย์บริการ และควบคุมโครงสร้างระบบสารสนเทศโรงพยาบาล**  
> *(Hospital IT Warranty, RMA Claim & System Administration Master Manual — ฉบับปรับปรุงปี 2026)*

---

## 📑 สารบัญคู่มือผู้ดูแลระบบ (Complete Admin Index - 21 Modules)
1. [2.1 การบริหารจัดการทะเบียนครุภัณฑ์ (Category Dropdown & Single-Brand)](#21-การบริหารจัดการทะเบียนครุภัณฑ์)
2. [2.2 มาตรการความปลอดภัยข้อมูล PDPA (Enforced Wipe Gate)](#22-มาตรการความปลอดภัยข้อมูล-pdpa)
3. [2.3 เครื่องคำนวณความคุ้มค่า (Viability Score Engine)](#23-เครื่องคำนวณความคุ้มค่า)
4. [2.4 การสร้างใบส่งเคลมศูนย์บริการ (Multi-Asset RMA: 1-5 เครื่อง)](#24-การสร้างใบส่งเคลมศูนย์บริการ)
5. [2.5 วงจรสถานะงานเคลม (6-Stage Claim State Machine)](#25-วงจรสถานะงานเคลม)
6. [2.6 การตั้งค่าระบบ 6 แท็บย่อย และทะเบียนผังอาคารถาวร](#26-การตั้งค่าระบบ-6-แท็บย่อย)
7. [2.7 ความปลอดภัยและการจัดเก็บหลักฐาน (IDOR & Magic Bytes)](#27-ความปลอดภัยและการจัดเก็บหลักฐาน)
8. [2.8 การส่งออกรายงาน Excel Multi-Sheet & พิมพ์ PDF](#28-การส่งออกรายงาน-excel--พิมพ์-pdf)
9. [2.9 การติดตั้งและการบำรุงรักษา (DevOps, SQLite WAL, Docker)](#29-การติดตั้งและการบำรุงรักษา)

---

## 2.1 การบริหารจัดการทะเบียนครุภัณฑ์
- **Category Dropdown Selector (\`filter-category-select\`):** ตัวกรองหมวดหมู่แบบ Dropdown กะทัดรัด สะอาดตา ไร้ Scrollbar แนวนอน
- **Single-Brand Guardrail:** บังคับกรอกเพียง 1 ยี่ห้อ พร้อม Whitelist แบรนด์ผสม เช่น *A&D Medical, Bang & Olufsen, AT&T*
- **Numbered Pagination Slots:** ปุ่มสลับหน้าสล็อตหมายเลข \`[1]\`, \`[2]\`, \`[3]\`... พร้อมสถานะ Disabled ที่ขอบหน้า
- **Hospital Layout Picker:** เลือกแผนกจากผังโครงสร้างอาคารจริง (อาคาร 1 ชั้น 21 ถึง ชั้น D และ Call Center)

---

## 2.2 มาตรการความปลอดภัยข้อมูล PDPA
> 🛑 **PDPA Storage Wipe Gate:** บล็อกไม่ให้ออกใบเคลมสำหรับอุปกรณ์ที่มีสื่อบันทึกข้อมูลเด็ดขาดจนกว่าจะล้างข้อมูล  
1. ติ๊กยืนยันการถอดหรือล้างสื่อบันทึกข้อมูล  
2. พิมพ์รหัสยืนยัน: **\`ยืนยัน\`** หรือ **\`WIPED\`**  
3. กดปุ่มยืนยัน ระบบจะบันทึก Audit Log และปลดล็อกให้ออกใบเคลมได้ทันที

---

## 2.3 เครื่องคำนวณความคุ้มค่า (Viability Score Engine)
- **ในประกัน:** Viability Score = **1.0 (\`VIABLE\`)**
- **หมดประกันแล้ว:** คำนวณจากราคาจัดซื้อ ค่าซ่อมประเมิน และอายุใช้งาน:
  - \`0.0 – 5.0\` (🟢 **VIABLE**): คุ้มค่าส่งซ่อมศูนย์บริการ
  - \`5.1 – 10.0\` (🔴 **NOT VIABLE**): ไม่คุ้มค่าซ่อม เสนอแทงจำหน่าย (\`Scrapped\`) หรือขายทอดตลาด (\`Pending Sell\`)

---

## 2.4 การสร้างใบส่งเคลมศูนย์บริการ (Multi-Asset RMA)
- รวมส่งเคลมได้ **1 ถึง 5 เครื่องต่อ 1 ใบเคลม**
- เลือกศูนย์บริการ (Dell, HP Care, TSC, Canon, Acer ฯลฯ) พร้อมระบุ RMA Ticket Number
- เปลี่ยนสถานะเป็น \`Pending Pickup\` เมื่อออกเอกสาร

---

## 2.5 วงจรสถานะงานเคลม (6-Stage Claim State Machine)
\`DRAFT\` &rarr; \`CONFIRMED\` &rarr; \`SUBMITTED\` &rarr; \`VENDOR_RESPONSE\` &rarr; \`RETURNED\` &rarr; \`CLOSED\`

---

## 2.6 การตั้งค่าระบบ 6 แท็บย่อย
1. \`🏷️ แบรนด์ & คู่มือเคลม\`: ข้อมูลและเงื่อนไขการรับประกันของแต่ละศูนย์บริการ
2. \`💻 หมวดหมู่อุปกรณ์\`: เรียงตามลำดับ ID พร้อมคำแปลภาษาไทย
3. \`🏥 แผนกและผังอาคารถาวร\`: ทะเบียนผังอาคาร 1 และ Call Center แบบป้องกันการลบโครงสร้าง
4. \`👥 จัดการบัญชีผู้ใช้ (RBAC)\`: แยกตาราง Admin/Staff, กำหนด \`must_change_password\`
5. \`💬 ข้อเสนอแนะและแจ้งปัญหา (Feedback & Bugs)\`: เมนูแท็บ \`#tab-cfg-feedback\`
6. \`💾 สำรองฐานข้อมูล & สายด่วนไอที\`: กล่องแก้ไขเบอร์ Hotline \`4401 - 4403\` และปุ่ม Backup SQLite

---

## 2.7 ความปลอดภัยและการจัดเก็บหลักฐาน
- **Magic Byte Validation:** ตรวจสอบโครงสร้างไบต์จริงของไฟล์บนดิสก์ ป้องกันไฟล์อันตราย
- **IDOR Protection:** ตรวจสอบสิทธิ์การเข้าถึงไฟล์หลักฐานตาม JWT ทุกครั้ง
- **Quarantine Purge:** ลบไฟล์กักกันเกิน 90 วันอัตโนมัติ

---

## 2.8 การส่งออกรายงาน Excel & พิมพ์ PDF
- **Microsoft Excel (.xls):** ส่งออกไฟล์ SpreadsheetML หลายชีต (Assets, Claims, Audit, Users, Configs)
- **PDF Center:** พิมพ์ใบรับซ่อม, RMA Report และ Gate Pass ด้วยฟอนต์ภาษาไทย Tahoma

---

## 2.9 การติดตั้งและการบำรุงรักษา
- **คำสั่งรันระบบ:** \`npm start\` หรือรัน \`Start_Hospital_LAN.bat\`
- **SQLite WAL Mode:** เปิดใช้งาน PRAGMA journal_mode=WAL รองรับการอ่าน/เขียนพร้อมกันหลายเครื่อง
`;
}

function generateCombinedMarkdown() {
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
6. [2.6 การตั้งค่าระบบ 6 แท็บ: ทำเนียบผังอาคารโรงพยาบาลถาวร และการแก้ไขเบอร์ Hotline ส่วนกลาง](#26-การตั้งค่าระบบ-6-แท็บ-ทำเนียบผังอาคารโรงพยาบาลถาวร-และการแก้ไขเบอร์-hotline)
7. [2.7 การตรวจรับเครื่องซ่อมเสร็จ ส่งคืนวอร์ด และส่งออกรายงาน Excel / พิมพ์ PDF](#27-การตรวจรับเครื่องซ่อมเสร็จ-ส่งคืนวอร์ด-และส่งออกรายงาน-excel)

---

### ❓ [ภาคผนวก: การแก้ปัญหาเบื้องต้นที่พบบ่อย (FAQ & Troubleshooting)](#ภาคผนวก-การแก้ปัญหาเบื้องต้นที่พบบ่อย-faq--troubleshooting)
`;
}

// --------------------------------------------------------------------------
// 5. MASTER GENERATION FUNCTION (Callable via CLI or API)
// --------------------------------------------------------------------------
function generateAllManuals() {
  const outputDir = path.join(__dirname, '..');
  const rootDir = path.join(__dirname, '..', '..');

  const filesMap = {
    // 1. Staff Manual
    'คู่มือการใช้งาน_ClaimIT_Staff.doc': '\ufeff' + generateStaffManualHtml(true),
    'คู่มือการใช้งาน_ClaimIT_Staff.html': '\ufeff' + generateStaffManualHtml(false),
    'คู่มือการใช้งาน_ClaimIT_Staff.md': generateStaffMarkdown(),

    // 2. Admin Manual
    'คู่มือการใช้งาน_ClaimIT_Admin.doc': '\ufeff' + generateAdminManualHtml(true),
    'คู่มือการใช้งาน_ClaimIT_Admin.html': '\ufeff' + generateAdminManualHtml(false),
    'คู่มือการใช้งาน_ClaimIT_Admin.md': generateAdminMarkdown(),

    // 3. Combined Manual (Backward Compatibility)
    'คู่มือการใช้งาน_ClaimIT.doc': '\ufeff' + generateCombinedManualHtml(true),
    'คู่มือการใช้งาน_ClaimIT.html': '\ufeff' + generateCombinedManualHtml(false),
    'คู่มือการใช้งาน_ClaimIT.md': generateCombinedMarkdown(),
    'USER_MANUAL.md': generateCombinedMarkdown()
  };

  const results = [];

  // Write to both claimIT folder and workspace root folder
  [outputDir, rootDir].forEach(targetDir => {
    try {
      if (fs.existsSync(targetDir)) {
        Object.entries(filesMap).forEach(([fileName, content]) => {
          const filePath = path.join(targetDir, fileName);
          fs.writeFileSync(filePath, content, 'utf8');
          results.push(filePath);
        });
      }
    } catch (err) {
      console.warn('[Manual Generator Warning]:', err.message);
    }
  });

  return results;
}

// Direct CLI Execution
if (require.main === module) {
  console.log('Generating Illustrated Self-Contained Manuals (Staff & Admin)...');
  const generated = generateAllManuals();
  console.log(`✅ Successfully generated ${generated.length} manual files across formats (.html, .doc, .md).`);
}

module.exports = {
  generateAllManuals,
  generateStaffManualHtml,
  generateAdminManualHtml,
  generateCombinedManualHtml,
  generateStaffMarkdown,
  generateAdminMarkdown,
  generateCombinedMarkdown
};
