# 📚 ClaimIT — Walkthrough Index (สารบัญคู่มือการใช้งานระบบ)

> **ClaimIT** คือระบบบริหารจัดการการรับประกันและกระบวนการส่งเคลมครุภัณฑ์ไอที (RMA) สำหรับโรงพยาบาล
> *Hospital IT Warranty & RMA Claim Management System — Phyathai 3 Hospital*

---

## 📂 รายการ Walkthrough ทั้งหมด (Complete Index)

| ไฟล์คู่มือ | หัวข้อ | กลุ่มผู้ใช้เป้าหมาย | สาระสำคัญ |
|---|---|---|---|
| [01_getting_started.md](file:///d:/claimit/claimIT/walkthroughs/01_getting_started.md) | เริ่มต้นใช้งานและเข้าสู่ระบบ | ทุกคน | Security Entry Gate (Passcode: 1), ล็อกอิน, JWT 8 ชม., การสลับหน้าตามสิทธิ์ |
| [02_staff_portal.md](file:///d:/claimit/claimIT/walkthroughs/02_staff_portal.md) | Staff Portal — ระบบแจ้งซ่อมจากวอร์ด | Staff ประจำวอร์ด/แผนก | สแกนบาร์โค้ด, Anti-Typo, เสียงปี๊บ, ปุ่มอาการเสีย, บันทึกชำรุด, พิมพ์ใบส่งซ่อม |
| [03_it_portal_dashboard.md](file:///d:/claimit/claimIT/walkthroughs/03_it_portal_dashboard.md) | IT Portal Dashboard | IT Staff / Admin | สถิติ 4 ด้าน, Action Board, คลังครุภัณฑ์, แผงงานเคลม Multi-Asset, คอนฟิก |
| [04_asset_scanning_and_lookup.md](file:///d:/claimit/claimIT/walkthroughs/04_asset_scanning_and_lookup.md) | สแกนและค้นหาครุภัณฑ์ | Staff / IT | Smart Scanner Engine (<180ms burst), Anti-Typo, Tag Parser, Fuzzy Match |
| [05_pdpa_data_sanitization.md](file:///d:/claimit/claimIT/walkthroughs/05_pdpa_data_sanitization.md) | มาตรการความปลอดภัยข้อมูล PDPA | IT Staff / Admin | Storage Media Safeguard, รหัสยืนยัน Wipe Code (WIPED / 9999), PDPA Gate |
| [06_rma_claim_creation.md](file:///d:/claimit/claimIT/walkthroughs/06_rma_claim_creation.md) | สร้างใบส่งเคลมศูนย์บริการ (RMA) | IT Staff / Admin | เคลมรายชิ้น, เคลมกลุ่ม 1–5 ชิ้น (Multi-Asset Modal), กฎ Atomic Transaction |
| [07_viability_score.md](file:///d:/claimit/claimIT/walkthroughs/07_viability_score.md) | คะแนนความคุ้มค่า (Viability Score) | IT Staff / Admin | สูตรคำนวณเซิร์ฟเวอร์, ในประกัน (1.0), นอกประกัน (2.0–5.0), EOL (8.5) |
| [08_claim_status_lifecycle.md](file:///d:/claimit/claimIT/walkthroughs/08_claim_status_lifecycle.md) | วงจรสถานะงานเคลม (State Machine) | IT Staff / Admin | DRAFT ถึง CLOSED, ปรับสถานะใน Claim Details Modal, รับเครื่องคืน |
| [09_evidence_upload.md](file:///d:/claimit/claimIT/walkthroughs/09_evidence_upload.md) | แนบไฟล์หลักฐานและภาพถ่าย | IT Staff / Admin | แนบระดับเครื่อง/ใบเคลม, โฟลเดอร์นิรภัยนอกเว็บ, ชื่อสุ่ม UUID, ป้องกัน IDOR |
| [10_pdf_and_print_center.md](file:///d:/claimit/claimIT/walkthroughs/10_pdf_and_print_center.md) | ศูนย์พิมพ์เอกสารและรายงาน PDF | Staff / IT | PDF รายเครื่อง, PDF ใบเคลมรวม, 2 แบบฟอร์มทางการ รพ.พญาไท 3 (ใบตรวจเช็คเสีย & PT3-FM-SEC-1012), Quick-Edit |
| [11_asset_management.md](file:///d:/claimit/claimIT/walkthroughs/11_asset_management.md) | จัดการคลังครุภัณฑ์ (Inventory) | IT Admin | ค้นหา, คลิกแถวดูข้อมูล, ดาวน์โหลด PDF ใน 1 คลิก, คัดลอก TSV, เช็ครหัสซ้ำ |
| [12_eol_salvage.md](file:///d:/claimit/claimIT/walkthroughs/12_eol_salvage.md) | จัดการครุภัณฑ์หมดสภาพ (EOL Salvage) | IT Admin | รอขายทอดตลาด (Pending Sell/Sold), บริจาค, แทงจำหน่าย (Scrapped) |
| [13_audit_trail.md](file:///d:/claimit/claimIT/walkthroughs/13_audit_trail.md) | บันทึกประวัติการเคลื่อนย้ายและความปลอดภัย | IT Staff / Admin | Immutable Audit, รหัสติดตาม CHG-, คลิกคัดลอก, สถิติ Daily Volume |
| [14_user_management.md](file:///d:/claimit/claimIT/walkthroughs/14_user_management.md) | จัดการผู้ใช้งานและสิทธิ์เข้าถึง (RBAC) | IT Admin | แยกกลุ่ม Admin/Staff, ซ่อนเมนู IT จาก Staff, ระงับ/เปิดสิทธิ์, รีเซ็ตรหัสผ่าน |
| [15_system_configurations.md](file:///d:/claimit/claimIT/walkthroughs/15_system_configurations.md) | ตั้งค่าระบบและขั้นตอนการเคลม | IT Admin | แบรนด์ (Brand Procedures), หมวดหมู่, จุดติดตั้ง, จัดการแผนกโรงพยาบาล |
| [16_excel_csv_export.md](file:///d:/claimit/claimIT/walkthroughs/16_excel_csv_export.md) | ส่งออกข้อมูล Excel และ CSV | Staff / IT | Native XML SpreadsheetML 5 ชีต (ภาษาไทย UTF-8), Assets CSV, Audit Trail อยู่ใน Sheet 3 ของ Excel |
| [17_quick_sidebar.md](file:///d:/claimit/claimIT/walkthroughs/17_quick_sidebar.md) | แผงข้อมูลด่วน (Quick Hub Sidebar) | ทุกคน | สถิติงานวันนี้, ประวัติสแกนล่าสุด 5 รายการ, สายด่วนคู่ค้า (Dell/Lenovo/Acer) |
| [18_email_notifications.md](file:///d:/claimit/claimIT/walkthroughs/18_email_notifications.md) | การส่งอีเมลแจ้งเตือน (Email Services) | IT Admin / Dev | ทั้งสองระบบใช้ Resend: ส่งตรงจาก UI (routes/email.js) + ส่งอัตโนมัติ Background (emailService.js) |
| [19_security_and_rbac.md](file:///d:/claimit/claimIT/walkthroughs/19_security_and_rbac.md) | ความปลอดภัยและสถาปัตยกรรมป้องกัน | Admin / Dev | JWT 8 ชม., Rate Limiting (15 ครั้ง/15 นาที), Security Headers, PDPA Gate |
| [20_installation_and_devops.md](file:///d:/claimit/claimIT/walkthroughs/20_installation_and_devops.md) | ติดตั้งระบบ สถาปัตยกรรม และ DevOps | Developer / Admin | Node.js & Docker, โครงสร้างโค้ด 10 โมดูล, ฟอนต์ข้าม OS, ตาราง .env |
| [21_official_forms_and_claim_workflow.md](file:///d:/claimit/claimIT/walkthroughs/21_official_forms_and_claim_workflow.md) | แบบฟอร์มทางการ 2 ฉบับ & ผังขั้นตอนเคลม รพ.พญาไท 3 | IT Staff / Admin | แบบฟอร์มตรวจเช็คเสีย, ใบนำทรัพย์สินออก PT3-FM-SEC-1012, เช็คประกัน Acer, และผัง SOP |

---

## 🏥 ภาพรวมวงจรการทำงานของระบบ (Hospital Operational Workflow)

```text
    ┌────────────────────────────────────────────────────────┐
    │ 1. Ward Staff (เจ้าหน้าที่ประจำวอร์ด/ห้องตรวจ)          │
    │    สแกนบาร์โค้ด → ตรวจสอบสถานะ → ระบุอาการเสีย → แจ้งซ่อม│
    └───────────────────────────┬────────────────────────────┘
                                │
                                ▼
    ┌────────────────────────────────────────────────────────┐
    │ 2. IT Staff (เจ้าหน้าที่สนับสนุนไอที)                    │
    │    รับแจ้ง → ล้างข้อมูล PDPA (Storage) → ประเมินความคุ้มค่า│
    │    สร้างใบส่งเคลม (1–5 ชิ้น) → ส่ง Vendor → บันทึกรับเครื่อง│
    └───────────────────────────┬────────────────────────────┘
                                │
                                ▼
    ┌────────────────────────────────────────────────────────┐
    │ 3. IT Administrator & Quality Management (ผู้ดูแลระบบ) │
    │    กำหนดสิทธิ์ผู้ใช้ → คอนฟิกแบรนด์/คู่มือ → ตรวจสอบ Audit Log│
    │    ส่งออกรายงาน Excel 5 ชีต → แทงจำหน่ายเครื่อง EOL    │
    └────────────────────────────────────────────────────────┘
```

---

## 👤 บัญชีทดสอบมาตรฐาน (Demo Credentials)

| บทบาท (Role) | Username | Password | สิทธิ์การเข้าถึง |
|---|---|---|---|
| **Admin / IT Head** | `admin` | `admin123` | เข้าถึงได้ทุกฟังก์ชัน ทั้ง IT Portal และ Staff Portal |
| **Staff / Ward Nurse** | `staff` | `staff123` | ใช้งาน Staff Portal สำหรับสแกนและแจ้งเครื่องเสียเท่านั้น |

---

*ปรับปรุงล่าสุด: สิงหาคม 2026 — ครอบคลุมการทำงานทุกฟังก์ชันและทุกโมดูลของ ClaimIT v1.0 อย่างสมบูรณ์*
