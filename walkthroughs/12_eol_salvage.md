# 12 — EOL & Salvage Actions (ครุภัณฑ์หมดสภาพ)

กลุ่มผู้ใช้: IT Admin

---

## EOL คืออะไร?

EOL = End of Life — ครุภัณฑ์ที่หมดอายุการใช้งานแล้ว
ซ่อมไม่คุ้มค่า หรือเกินอายุที่กำหนด

---

## ตัวเลือกสำหรับครุภัณฑ์ EOL

ใน IT Portal เมื่อสแกนครุภัณฑ์ที่ประเมินว่า NOT_VIABLE
จะแสดง "EOL Salvage Actions Panel":

### 1. รอขายทอดตลาด (Pending Sell)
- ครุภัณฑ์ยังมีมูลค่าเหลืออยู่บ้าง
- รอดำเนินการขายต่อ
- กดปุ่มสีม่วง [รอขายทอดตลาด]
- สถานะเปลี่ยนเป็น: Pending Sell

### 2. รอดำเนินการบริจาค (Pending Donation)
- บริจาคให้สถาบัน/องค์กรที่ต้องการ
- กดปุ่มสีชมพู [รอดำเนินการบริจาค]
- สถานะเปลี่ยนเป็น: Pending Donation

### 3. แทงจำหน่าย (Scrapped)
- ซ่อมไม่ได้ / ไม่มีมูลค่า / ทิ้ง
- กดปุ่มสีเทา [แทงจำหน่าย (Scrap)]
- สถานะเปลี่ยนเป็น: Scrapped

---

## ผลลัพธ์หลังกด Salvage Action

- อัปเดตสถานะในตาราง mains
- อัปเดต salvage_status field
- บันทึก Audit Log อัตโนมัติ
- แสดง Toast Notification

---

## ดูรายการ Salvage ใน Inventory Table

กรองตาม:
- Pending Sell
- Pending Donation
- Scrapped

---

## บันทึกใน Audit Trail

ทุก Salvage Action บันทึกใน move_log:
- asset_tag
- สถานะใหม่
- ผู้ดำเนินการ
- timestamp

---

ถัดไป: 13_audit_trail.md
