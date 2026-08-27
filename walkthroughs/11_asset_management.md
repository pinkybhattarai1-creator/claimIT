# 11 — จัดการครุภัณฑ์ (Asset Management)

กลุ่มผู้ใช้: IT Admin (เพิ่ม/แก้ไข/ลบ) | Staff (ดูอย่างเดียว)

---

## ภาพรวม

ส่วนนี้คือคลังครุภัณฑ์ IT ทั้งหมดของโรงพยาบาล
เจ้าหน้าที่ IT สามารถเพิ่ม แก้ไข และจัดการชีวิตของครุภัณฑ์

---

## ตารางรายการครุภัณฑ์ (Inventory Table)

แสดงในหน้า IT Portal:
- รหัสครุภัณฑ์ (Asset Tag)
- ชื่ออุปกรณ์
- แบรนด์ (Brand)
- ที่อยู่/จุดติดตั้ง
- วันหมดอายุรับประกัน
- มูลค่าประเมิน
- สถานะ (Working / Broken / Pending ฯลฯ)
- ปุ่ม [เอกสาร] — ดาวน์โหลด PDF ใบเคลม

### กรองข้อมูล:
เลือกสถานะจาก Dropdown:
- ทุกสถานะ
- ปกติ (Working)
- ⚠️ ใกล้หมดประกันใน 6 เดือน (Expiring in 6 Months)
- ชำรุด (Broken)
- รอศูนย์มารับ (Pending Pickup)
- รอขายทอดตลาด (Pending Sell)
- รอดำเนินการบริจาค (Pending Donation)
- แทงจำหน่าย (Scrapped)

### Pagination:
- แสดงข้อมูล 50 รายการต่อหน้า
- ปุ่ม [ย้อนกลับ] / [ถัดไป]
- แสดง: "แสดง X - Y จาก Z รายการ"

---

## เพิ่มครุภัณฑ์ใหม่ (Add New Asset)

กดปุ่ม [เพิ่มครุภัณฑ์ใหม่ (Add New Asset)] → เปิด Modal

### ข้อมูลที่ต้องกรอก:

| ฟิลด์ | ตัวอย่าง | จำเป็น |
|---|---|---|
| รหัสครุภัณฑ์ (Asset Tag) | CIT-2026-MON-01 | ใช่ |
| ชื่ออุปกรณ์ (Device Name) | Dell Monitor 24-inch | ใช่ |
| หมวดหมู่ (Category) | Monitor / Computer / Tablet / Scanner / Printer / Network | ใช่ |
| ยี่ห้อ (Brand) | Dell, HP, Apple, Zebra | ใช่ |
| รุ่น (Model) | OptiPlex 7090 | ใช่ |
| Serial No. | SN12345678 | ใช่ |
| สถานที่ติดตั้ง (Location) | Ward 20, ER | ใช่ |
| วันเริ่มรับประกัน | 2026-01-01 | ใช่ |
| ระยะเวลาประกัน | 3 เดือน / 6 เดือน / 1 ปี / 2 ปี / 3 ปี / 4 ปี / 5 ปี | ใช่ |
| ต้องทำความสะอาดข้อมูล (PDPA) | checkbox (checked = ต้อง) | ไม่ |

### ป้องกันรหัสซ้ำ (Anti-Duplicate):
ระบบตรวจสอบ Asset Tag และ Serial Number แบบ real-time
หากซ้ำ แสดงคำเตือน: "ตรวจพบข้อมูลซ้ำ"

### สถานะเริ่มต้น:
ครุภัณฑ์ใหม่เริ่มที่สถานะ Working เสมอ

---

## API สำหรับการจัดการครุภัณฑ์

| Method | Endpoint | สิทธิ์ | คำอธิบาย |
|---|---|---|---|
| GET | /api/assets | Staff+ | ดูรายการทั้งหมด |
| GET | /api/assets/:tag | Staff+ | ดูครุภัณฑ์เดียว |
| POST | /api/assets | Admin | เพิ่มใหม่ |
| PUT | /api/assets/:tag | Admin | แก้ไข |
| DELETE | /api/assets/:tag | Admin | Soft delete |
| GET | /api/assets/check-tag/:tag | Staff+ | ตรวจสอบรหัสซ้ำ |
| GET | /api/assets/search/fuzzy | Staff+ | Fuzzy search |

---

## คัดลอกข้อมูล TSV

กดปุ่ม [คัดลอกข้อมูล (TSV)] เพื่อคัดลอกข้อมูลตารางปัจจุบัน
เป็น Tab-Separated Values → วางลง Excel ได้ทันที

---

ถัดไป: 12_eol_salvage.md
