# 06 — สร้างใบส่งเคลม (RMA Claim Creation)

กลุ่มผู้ใช้: IT Staff / Admin

---

## ใบส่งเคลม (RMA) คืออะไร?

RMA (Return Merchandise Authorization) คือใบส่งมอบครุภัณฑ์
ให้ศูนย์บริการ/Vendor เข้ามารับไปซ่อมหรือเปลี่ยน
ระบบรองรับ 1–5 ครุภัณฑ์ต่อ 1 ใบเคลม

---

## กระบวนการสร้างใบเคลม (Single-Asset จาก IT Scanner)

### Step 1: สแกนครุภัณฑ์

ใน IT Portal สแกนหรือพิมพ์รหัสครุภัณฑ์ที่ต้องการส่งเคลม

### Step 2: ยืนยัน PDPA (ถ้าจำเป็น)

หากครุภัณฑ์เป็น Storage Media ต้องยืนยัน Data Sanitization ก่อน
(ดูรายละเอียดที่ 05_pdpa_data_sanitization.md)

### Step 3: กรอกแบบฟอร์ม RMA

หลังยืนยัน PDPA แล้ว แบบฟอร์ม RMA จะปรากฏ:

| ฟิลด์ | คำอธิบาย |
|---|---|
| ศูนย์บริการ (Vendor Name) | เลือก Vendor จาก Dropdown (มาจาก System Config) |
| หมายเลข RMA / Case ID | รหัสใบรับงานจากศูนย์บริการ เช่น RMA-9988-77 |
| วันที่ศูนย์บริการมารับ (Pickup Date) | วันที่ Vendor เข้ามารับอุปกรณ์ |

ข้อมูลขั้นตอนการเคลมของ Vendor จะแสดงอัตโนมัติ
(Brand Procedure Panel) เมื่อเลือก Vendor

### Step 4: บันทึก

กดปุ่ม [บันทึกรอรับเคลม (Pending Pickup)]
- สถานะครุภัณฑ์เปลี่ยนเป็น "Pending Pickup"
- สร้างใบเคลม (claim) ในฐานข้อมูล
- คำนวณ Viability Score อัตโนมัติ (Backend)
- บันทึก Audit Log
- ส่งอีเมลแจ้งเตือน (ถ้าตั้งค่าไว้)

---

## Multi-Asset Claims (1–5 ครุภัณฑ์)

ระบบรองรับการรวมครุภัณฑ์สูงสุด 5 ชิ้นต่อ 1 ใบเคลม:

### ผ่าน API โดยตรง (สำหรับ Advanced Use):

POST /api/claims
Body:
{
  "claim_number": "CLM-2026-001",
  "vendor_name": "Dell Thailand",
  "vendor_rma_number": "RMA-12345",
  "asset_tags": ["CIT-2022-TAB-03", "CIT-2023-SCN-01"],
  "claim_type": "warranty",
  "notes": "หมายเหตุเพิ่มเติม",
  "recipient_email": "vendor@dell.com"
}

กฎ:
- ต้องมีอย่างน้อย 1 รายการ
- ห้ามเกิน 5 รายการ (Backend จะปฏิเสธ error 400)
- ทุกรายการต้องมีในฐานข้อมูลและ active
- ดำเนินการใน SQLite Transaction เดียวกัน (Atomic)

---

## ข้อมูลใบเคลมที่สร้างแล้ว

| ฟิลด์ | ตัวอย่าง |
|---|---|
| Claim Number | CLM-2026-0827-001 |
| Vendor | Dell Thailand |
| Vendor RMA No. | RMA-9988-77 |
| Viability Score | 1.0 / 10.0 |
| Viability Status | VIABLE |
| Status | SUBMITTED |
| Created By | admin |

---

## ดูรายการใบเคลมทั้งหมด

GET /api/claims
- รองรับ pagination (page, limit)
- กรองตาม status
- เรียงจากใหม่ไปเก่า

---

ถัดไป: 07_viability_score.md
