# 15 — ตั้งค่าระบบ (System Configurations)

กลุ่มผู้ใช้: Admin เท่านั้น

---

## ภาพรวม

Admin สามารถจัดการการตั้งค่าแบบ Dynamic ที่ใช้ทั่วระบบ:
- แบรนด์/Vendor (Brand)
- หมวดหมู่ครุภัณฑ์ (Category)
- สถานที่ (Location)

---

## ตารางการตั้งค่า

แสดงในหน้า IT Portal:
- ID
- ประเภท (Type): brand / category / location
- ค่า (Value): เช่น Dell, Computer, Ward 20
- รายละเอียด / ขั้นตอน (Details)
- ปุ่มจัดการ

---

## เพิ่มการตั้งค่าใหม่

กดปุ่ม [เพิ่มการตั้งค่า] → เปิด Modal

| ฟิลด์ | ตัวเลือก |
|---|---|
| ประเภท (Type) | brand / category / location |
| ค่า (Value) | เช่น Acer, Network, หอผู้ป่วยศัลยกรรม |
| รายละเอียด / ขั้นตอนการเคลม | รองรับ HTML |

---

## Brand Procedure (ขั้นตอนการเคลมของแต่ละแบรนด์)

ฟิลด์ "รายละเอียด" ของ config type = brand
ใช้เก็บขั้นตอนการเคลมเฉพาะของแต่ละ Vendor

เมื่อเลือก Vendor ใน RMA Form ขั้นตอนจะแสดงอัตโนมัติ
ใน "Brand Procedure Panel" เพื่อเตือน IT Staff ว่าต้องทำอะไรบ้าง

ตัวอย่าง (Dell):
- โทร 02-670-7250 ขอ RMA Number ก่อน
- ถ่ายรูปเครื่อง Serial No. และ Error Code
- แพ็คใส่กล่องพร้อม Packing List

---

## การตั้งค่าเริ่มต้น (Seed Data)

เมื่อติดตั้งระบบใหม่ รัน:
  node seed_configs.js

จะสร้างข้อมูล:
- Brands: Dell, HP, Lenovo, Apple, Zebra, Acer, IDA, TSC, Generic
- Categories: Computer, Monitor, Tablet, Scanner, Printer, Network, Webcam
- Locations: Ward 1–30, ICU, ER, OPD, Technical Support ฯลฯ

---

## API

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| GET | /api/configurations | ดูทั้งหมด |
| POST | /api/configurations | เพิ่มใหม่ (Admin) |
| PUT | /api/configurations/:id | แก้ไข (Admin) |
| DELETE | /api/configurations/:id | ลบ (Admin) |

---

ถัดไป: 16_excel_csv_export.md
