# 16 — ส่งออกข้อมูล Excel / CSV

กลุ่มผู้ใช้: IT Admin (ส่งออก Excel ทั้งระบบ .xls) / Staff & IT Admin (ส่งออก CSV ครุภัณฑ์และบันทึกประวัติ)

---

## ภาพรวม

ระบบรองรับการส่งออกข้อมูลในหลายรูปแบบ:
1. Multi-Sheet Excel (.xls) — ครอบคลุมทุกตาราง (สิทธิ์: IT Admin เท่านั้น)
2. CSV ครุภัณฑ์ (.csv) — เฉพาะรายการครุภัณฑ์ (สิทธิ์: Staff & IT Admin)
3. CSV Audit Log (.csv) — ประวัติการเคลื่อนย้าย (สิทธิ์: Staff & IT Admin)

---

## 1. ดาวน์โหลด Excel ทั้งหมด (Admin Only)

### วิธีเข้าถึง:
- ปุ่ม [ส่งออก Excel ทั้งหมด] ในตาราง Inventory (เฉพาะ Admin)
- ปุ่ม [ส่งออก Excel] ใน Nav Bar Header (เฉพาะ Admin)
- ปุ่ม [ดาวน์โหลด Excel ทั้งหมด] ใน Quick Sidebar (เฉพาะ Admin)

API: GET /api/export/excel (สิทธิ์: `adminOnly` — บัญชี Staff ทั่วไปจะถูกปฏิเสธสิทธิ์ด้วย HTTP 403)

### ชีต (Sheets) ในไฟล์ Excel:
| ชีต | ข้อมูล |
|---|---|
| IT Assets | ครุภัณฑ์ทั้งหมด (ไม่รวมที่ถูกลบ) |
| Claims | ใบเคลมทั้งหมด |
| Move Logs | Audit Trail (2000 รายการล่าสุด) |
| Users | รายชื่อผู้ใช้งาน |
| Configurations | การตั้งค่าระบบ |

### รูปแบบ:
- Native SpreadsheetML (.xls) — เปิดใน Excel ได้โดยตรง
- Header row มีสีพื้นหลังสีน้ำเงิน
- UTF-8 encoding รองรับภาษาไทย

---

## 2. ดาวน์โหลด CSV ครุภัณฑ์

API: GET /api/export/csv/assets

คอลัมน์:
- รหัสครุภัณฑ์, ชื่ออุปกรณ์, หมวดหมู่, แบรนด์, รุ่น
- Serial No., สถานที่, วันเริ่มประกัน, วันหมดประกัน
- สถานะ, Salvage Status, ราคาซื้อ
- ระยะเวลาประกัน, PO Number, Invoice No.
- ต้องล้างข้อมูล (PDPA)

---

## 3. ดาวน์โหลด CSV Audit Logs

API: GET /api/export/csv/audit-logs

หรือกดปุ่ม [ส่งออกบันทึกเป็น Excel/CSV] ในส่วน Audit Trail

คอลัมน์:
- Log Code, Timestamp, Asset Tag
- Department, Status, Moved Direction
- Username, Details

---

## Quick Export จาก Sidebar

เปิด Quick Hub Sidebar → ส่วน "ส่งออกข้อมูล (Quick Export)":
- [ดาวน์โหลด Excel ทั้งหมด (.xls)]
- [ดาวน์โหลด CSV ครุภัณฑ์ (.csv)]

---

ถัดไป: 17_quick_sidebar.md
