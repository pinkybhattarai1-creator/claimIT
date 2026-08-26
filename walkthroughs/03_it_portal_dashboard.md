# 03 — IT Portal Dashboard (หน้าหลักเจ้าหน้าที่ IT)

กลุ่มผู้ใช้: IT Staff / Admin

---

## IT Portal คืออะไร?

หน้าหลักสำหรับเจ้าหน้าที่ IT จัดการทุกอย่างในระบบ:
- ดูสถิติสรุปรวม (Dashboard Stats)
- สแกนและจัดการครุภัณฑ์
- สร้างใบส่งเคลม (RMA)
- ดูรายการครุภัณฑ์ทั้งหมด
- จัดการผู้ใช้งาน
- ตั้งค่าระบบ
- ดู Audit Trail

---

## การ์ดสถิติ (Stats Dashboard)

ด้านบนของ IT Portal มีการ์ดสถิติ 4 ใบ:

| การ์ด | ข้อมูลที่แสดง |
|---|---|
| ทรัพย์สินทั้งหมด | จำนวนครุภัณฑ์ทั้งหมดในระบบ |
| เครื่องใช้งานปกติ (สีเขียว) | จำนวนครุภัณฑ์สถานะ Working |
| รอดำเนินการเคลม (สีแดง) | จำนวนที่ชำรุด/รอส่งเคลม |
| รอศูนย์เข้ามารับ (สีเหลือง) | จำนวน Pending Pickup |

ตัวเลขอัปเดตอัตโนมัติทุกครั้งที่โหลดหน้า

---

## แผงควบคุมหลัก

ด้านซ้าย: สแกนและค้นหาครุภัณฑ์ (เหมือน Staff Portal + มีฟีเจอร์เพิ่ม)
ด้านขวา: RMA Action Board — แผงดำเนินการเคลม

เมื่อค้นหาครุภัณฑ์สำเร็จ Action Board จะแสดง:
1. ข้อมูลครุภัณฑ์ (Tag, ชื่อ, Serial, Location, Warranty, Status)
2. แถบประเมินความคุ้มค่า (Viability Evaluation Banner)
3. ปุ่มพิมพ์ Official Forms / ดาวน์โหลด PDF
4. แผง PDPA Sanitization (หากจำเป็น)
5. แบบฟอร์ม RMA Initiation (รอส่งซ่อม)
6. EOL Salvage Actions (หมดสภาพ)
7. ปุ่มรับเครื่องคืน (Return to Stock)

---

## รายการครุภัณฑ์ (Inventory Table)

ตารางด้านล่างแสดงครุภัณฑ์ทั้งหมด:
- กรองตามสถานะ (Working / Broken / Pending Pickup / Scrapped ฯลฯ)
- ส่งออก Excel ทั้งหมด
- คัดลอกข้อมูล TSV
- เพิ่มครุภัณฑ์ใหม่
- Pagination: ย้อนกลับ / ถัดไป

---

## ส่วนอื่นๆ ใน IT Portal

- User Management Panel → ดู 14_user_management.md
- System Configurations Panel → ดู 15_system_configurations.md
- Audit Trail Panel → ดู 13_audit_trail.md

---

ถัดไป: 04_asset_scanning_and_lookup.md
