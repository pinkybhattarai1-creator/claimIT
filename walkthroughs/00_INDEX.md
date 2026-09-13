# 📚 ClaimIT — Walkthrough Index

> *Hospital IT Warranty & RMA Claim Management System*

---

## 📂 รายการ Walkthrough ทั้งหมด (Complete Index)

| ไฟล์ | หัวข้อ | กลุ่มผู้ใช้ |
|---|---|---|
| 01_getting_started.md | เริ่มต้นใช้งาน — ติดตั้งและล็อกอิน | ทุกคน |
| 02_staff_portal.md | Staff Portal — แจ้งซ่อมจากวอร์ด | Staff |
| 03_it_portal_dashboard.md | IT Portal — หน้า Dashboard และสถิติ | IT/Admin |
| 04_asset_scanning_and_lookup.md | สแกนและค้นหาครุภัณฑ์ (Barcode & Fuzzy Search) | Staff / IT |
| 05_pdpa_data_sanitization.md | PDPA Safeguard — ยืนยันล้างข้อมูลก่อนส่งเคลม | IT/Admin |
| 06_rma_claim_creation.md | สร้างใบส่งเคลม (RMA Claim — 1–5 ครุภัณฑ์) | IT/Admin |
| 07_viability_score.md | คะแนนความคุ้มค่า (Viability Score Engine) | IT/Admin |
| 08_claim_status_lifecycle.md | สถานะใบเคลมและ State Machine | IT/Admin |
| 09_evidence_upload.md | แนบไฟล์หลักฐาน (Evidence Upload & IDOR Protection) | IT/Admin |
| 10_pdf_and_print_center.md | พิมพ์เอกสารและดาวน์โหลด PDF | Staff / IT |
| 11_asset_management.md | จัดการครุภัณฑ์ — เพิ่ม / แก้ไข / จำหน่าย | IT/Admin |
| 12_eol_salvage.md | EOL & Salvage — ขาย / บริจาค / แทงจำหน่าย | IT/Admin |
| 13_audit_trail.md | Audit Trail — ประวัติการเคลื่อนย้ายและการเปลี่ยนแปลง | IT/Admin |
| 14_user_management.md | จัดการผู้ใช้งาน (RBAC: Admin & Staff) | Admin |
| 15_system_configurations.md | ตั้งค่าระบบ — แบรนด์ หมวดหมู่ ผังอาคารโรงพยาบาล และสายด่วนไอที | Admin |
| 16_excel_csv_export.md | ส่งออกข้อมูล Excel / CSV | Admin (Excel) / Staff (CSV) |
| 17_quick_sidebar.md | Quick Hub Sidebar — ข้อมูลด่วนและสายด่วน IT Helpdesk | ทุกคน |
| 18_email_notifications.md | การส่งอีเมลแจ้งเตือน (Resend Integration) | IT/Admin |
| 19_security_and_rbac.md | ความปลอดภัย — JWT, RBAC, Rate Limiting | Admin / Dev |
| 20_installation_and_devops.md | ติดตั้งระบบ — Node.js & Docker | Developer |

---

## 🏥 ภาพรวมระบบและโครงสร้างสิทธิ์ (System Overview & Roles)

ClaimIT ออกแบบมาเพื่อกระบวนการทำงานจริงของฝ่ายเทคโนโลยีสารสนเทศ (IT Department) โรงพยาบาล:

    IT Field Staff (ช่างไอทีภาคสนาม / On-site Support)
      เปิดผ่าน iPhone/มือถือ หรือคอมพิวเตอร์ → สแกนบาร์โค้ด / ถ่ายรูปความเสียหาย → ตรวจเช็คประกัน (พ.ศ./ค.ศ.) → แจ้งซ่อม / ขอยืมเครื่องสำรอง

    IT Admin / Supervisor (ผู้ดูแลระบบและหัวหน้าไอที)
      รับแจ้งซ่อม → ตรวจสอบความคุ้มค่า (Viability Score) → ล้างข้อมูล PDPA → ออกใบเคลม RMA (1-5 รายการ) → ประสานงานศูนย์ซ่อม → ปิดงานเคลม

    System Management (ผู้บริหารระบบ)
      จัดการบัญชีผู้ใช้ (RBAC) → ตั้งค่าหมวดหมู่/แบรนด์ → ดู Audit Trail แบบ Real-time → ส่งออก Excel/TSV → สำรองฐานข้อมูลอัตโนมัติ

---

## 🌿 โครงสร้าง Git Branches บน GitHub

- **`last-weekb2`** *(Active Feature & Manuals Branch)*: สาขาฟีเจอร์ล่าสุด เพิ่มคู่มือการใช้งานแบบภาพประกอบเวกเตอร์ SVG ฉบับสมบูรณ์ (Staff & Admin) ในรูปแบบ HTML, Word (.doc) และ Markdown (.md), เพิ่มโมดอลและ API ดาวน์โหลดคู่มือแบบจำแนกตามสิทธิ์ (Role-Based Manuals Center), และรักษาความสอดคล้อง SHA-256 Parity 100% ข้าม 6 หน้าเทมเพลต
- **`last-week`** *(Base Development Branch)*: โค้ดหลักระบบ ClaimIT ปรับปรุงโครงสร้าง Full-Stack, ระบบ 1-Click Fast Login 2 บัญชีหลัก, ทะเบียนผังอาคารและสายด่วนไอที, ตรวจสอบสถานะประกันแบบเรียลไทม์, และระบบ Multi-Asset Claim
- **`main`**: สาขาหลักสำหรับ Production Deployment
- **`rewrite`**: สาขารวมการปรับปรุงโครงสร้าง Full-Stack

---

## 👤 บัญชีเริ่มต้นสำหรับเข้าใช้งานระบบ (Authoritative Pre-seeded Accounts)

ระบบติดตั้งมาพร้อม 2 บัญชีหลักตามมาตรฐานความปลอดภัยโรงพยาบาล (Security Hardening):

| บทบาท | Username | Password เริ่มต้น | ชื่อ-ตำแหน่ง | แผนก/สังกัด |
|---|---|---|---|---|
| 👑 **IT Administrator (ผู้ดูแลระบบ)** | `admin` | `admin123` | Admin 1 (Technical Support Head - หัวหน้าฝ่ายไอที) | Technical Support & Infrastructure |
| 🩺 **IT Support Staff (ช่างภาคสนาม)** | `staff` | `staff123` | Staff 1 (IT Field Technician - ช่างไอทีภาคสนาม) | Technical Support & Infrastructure |

- **ปุ่มเข้าสู่ระบบด่วน 1-Click (Fast Login):** หน้าล็อกอินมีปุ่มทางลัด 2 ปุ่ม (`👑 แอดมิน (admin)` และ `🩺 เจ้าหน้าที่ (staff)`) เพื่อสลับสิทธิ์การทดสอบได้อย่างรวดเร็ว
- **การเพิ่มผู้ใช้งาน:** ผู้ดูแลระบบ (Admin) สามารถสร้างบัญชี Admin หรือ Staff เพิ่มเติมได้ไม่จำกัดผ่านเมนู **[⚙️ ตั้งค่าระบบ] → [👥 จัดการผู้ใช้งานระบบ]** โดยผู้ใช้ใหม่จะถูกกำหนดให้เปลี่ยนรหัสผ่านในการเข้าสู่ระบบครั้งแรก (`must_change_password = 1`)
- **การแก้ไขข้อมูลตนเอง:** ทุกบัญชีสามารถกดปุ่ม **"✏️ แก้ไขชื่อ"** บนแถบ Header หรือคลิกที่รูปโปรไฟล์เพื่อเปลี่ยนชื่อ-นามสกุล และแผนกของตนเองได้ตลอดเวลาตามต้องการ

---

*อัปเดต: กันยายน 2026 — ครอบคลุมระบบช่างไอทีภาคสนาม, สแกนเนอร์ออฟไลน์และกล้องถ่ายรูป, ระบบกรองประกัน 60 วัน/6 เดือน, ผังอาคารโรงพยาบาล, สายด่วนไอที, และการจัดการผู้ใช้งานแบบแยกตาราง*
