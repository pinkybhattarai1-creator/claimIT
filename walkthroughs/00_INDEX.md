# 📚 ClaimIT — Walkthrough Index

> **ClaimIT** คือระบบบริหารจัดการการรับประกันและกระบวนการส่งเคลมครุภัณฑ์ไอที (RMA) สำหรับโรงพยาบาล
> *Hospital IT Warranty & RMA Claim Management System — Phyathai 3 Hospital*

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
| 15_system_configurations.md | ตั้งค่าระบบ — แบรนด์ หมวดหมู่ สถานที่ | Admin |
| 16_excel_csv_export.md | ส่งออกข้อมูล Excel / CSV | Staff / IT |
| 17_quick_sidebar.md | Quick Hub Sidebar — ข้อมูลด่วนและ Hotlines | ทุกคน |
| 18_email_notifications.md | การส่งอีเมลแจ้งเตือน (SendGrid Integration) | IT/Admin |
| 19_security_and_rbac.md | ความปลอดภัย — JWT, RBAC, Rate Limiting | Admin / Dev |
| 20_installation_and_devops.md | ติดตั้งระบบ — Node.js & Docker | Developer |

---

## 🏥 ภาพรวมระบบ (System Overview)

ClaimIT ออกแบบมาเพื่อรองรับกระบวนการงานจริงของฝ่าย IT Support โรงพยาบาล:

    Hospital Staff (พนักงานทั่วไปและเจ้าหน้าที่ทุกแผนก)
      สแกนบาร์โค้ด → แจ้งชำรุด → พิมพ์แบบฟอร์มส่งซ่อม

    IT Staff (เจ้าหน้าที่ไอที)
      รับแจ้ง → ล้างข้อมูล (PDPA) → สร้างใบเคลม → ส่งศูนย์บริการ → รับเครื่องคืน → ปิดงาน

    Admin (หัวหน้า IT / ผู้ดูแลระบบ)
      จัดการผู้ใช้ → กำหนดการตั้งค่า → ดู Audit Trail → Export รายงาน

---

## 👤 บัญชีเริ่มต้นสำหรับเข้าใช้งานระบบ (Pre-seeded Accounts: 4 IT Admins + 4 IT Staff)

### 💻 บัญชีเจ้าหน้าที่ฝ่ายไอที (4 IT Admins)
| Username | Password | ชื่อ-ตำแหน่ง | แผนก/สังกัด |
|---|---|---|---|
| `admin` | `admin123` | Admin 1 (Technical Support Head - หัวหน้าไอที) | Technical Support & Infrastructure |
| `admin2` | `admin123` | Admin 2 (Senior IT Support - ช่างอาวุโส) | Technical Support & Infrastructure |
| `admin3` | `admin123` | Admin 3 (Systems & Network IT - ดูแลระบบ) | Technical Support & Infrastructure |
| `admin4` | `admin123` | Admin 4 (Hardware & Claim IT - ฝ่ายเคลม) | Technical Support & Infrastructure |

### 🛠️ บัญชีช่างไอทีภาคสนาม / On-site Support (4 IT Staff)
| Username | Password | ชื่อ-ตำแหน่ง | แผนก/สังกัด |
|---|---|---|---|
| `staff` | `staff123` | Staff 1 (IT Field Technician - On-Site) | Technical Support & Infrastructure |
| `staff2` | `staff123` | Staff 2 (IT On-site Support - ช่างประจำวอร์ด) | Technical Support & Infrastructure |
| `staff3` | `staff123` | Staff 3 (IT Mobile Hardware Support - โมบาย/iPhone) | Technical Support & Infrastructure |
| `staff4` | `staff123` | Staff 4 (IT Ward Support Staff - ผู้ช่วยไอที) | Technical Support & Infrastructure |

*(หมายเหตุ: ทุกบัญชีสามารถกดปุ่ม "✏️ แก้ไขชื่อ" เพื่อเปลี่ยนชื่อและแผนกของตนเองได้ตลอดเวลาตามต้องการ)*

---

*อัปเดต: สิงหาคม 2026 — ครอบคลุมระบบช่างไอทีภาคสนาม, ใช้งานผ่าน iPhone/มือถือ, อัปโหลดภาพถ่ายครุภัณฑ์, ระบบ 6 เดือน, และวันที่สองปี พ.ศ./ค.ศ.*
