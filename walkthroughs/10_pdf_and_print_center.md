# 10 — ศูนย์พิมพ์เอกสารและดาวน์โหลด PDF

กลุ่มผู้ใช้: Staff / IT Admin

---

## ภาพรวม

ClaimIT มีระบบเอกสาร 2 ส่วน:
1. PDF Report จาก Backend (ใบเคลม RMA ทางการ)
2. Official Document & Print Center (แบบฟอร์มโรงพยาบาลและ Vendor)

---

## ส่วนที่ 1: ดาวน์โหลด PDF ใบเคลม (Backend PDF)

### วิธีใช้:
- ใน IT Portal สแกนครุภัณฑ์ที่มีใบเคลม
- กดปุ่ม [ดาวน์โหลด PDF]

หรือเรียก API:
GET /api/claims/:id/pdf

### เนื้อหาใน PDF:
1. ชื่อโรงพยาบาล + วันที่ + หมายเลขอ้างอิง
2. ข้อมูลภาพรวมใบเคลม:
   - หมายเลขใบเคลม
   - ชื่อ Vendor / RMA Number
   - วันที่ / สถานะ
   - Viability Score
   - ผู้สร้าง / ผู้ยืนยัน
3. รายการครุภัณฑ์ (1–5 รายการ):
   - Asset Tag, ชื่อ, หมวดหมู่, Brand/Model, Serial No.
   - วันหมดประกัน
   - สถานะ PDPA Sanitization
4. มาตรการ PDPA Compliance
   - ยืนยันว่าผ่าน Sanitization Authorization

### ฟอนต์:
- หาก Windows มี Tahoma (ไทย) ใช้ ThaiRegular/ThaiBold
- หากไม่มี ใช้ Helvetica (ภาษาอังกฤษ)

---

## ส่วนที่ 2: Official Document & Print Center

เปิดได้จาก:
- Staff Portal: ปุ่ม [พิมพ์แบบฟอร์มส่งซ่อม/เคลม]
- IT Portal: ปุ่ม [แบบฟอร์มพิมพ์ทางการ (Official Forms)]

### แบบฟอร์มที่รองรับ (5 แบบ):

| เลข | ชื่อแบบฟอร์ม |
|---|---|
| 1 | ใบรับงานซ่อม / ใบรับเคลมสินค้า (Hospital Work Order) |
| 2 | ใบรับเคลม / นำส่งสินค้า (888 Technology Claim Form) |
| 3 | ใบรับประกันสินค้า (888 Technology Warranty Certificate) |
| 4 | ใบส่งมอบ / ใบรับประกัน (Talent Technology Form) |
| 5 | รายงานประเมินความคุ้มค่า & PDPA Audit (ClaimIT Report) |

### วิธีใช้ Print Center:
1. เลือกแบบฟอร์มจาก Dropdown
2. ข้อมูลจากครุภัณฑ์ที่สแกนจะถูกใส่อัตโนมัติ
3. กด [ปรับแต่งข้อมูลฟอร์ม] เพื่อแก้ไขข้อมูล:
   - เลขที่ Job / อ้างอิง
   - ชื่อผู้ติดต่อ
   - เบอร์โทร
   - อาการเสีย / ปัญหา
   - ชื่อช่าง / ผู้ดำเนินการ
   - วิธีการแก้ไข
4. กด [สั่งพิมพ์เอกสาร / บันทึก PDF]
   → เปิด Print Dialog ของ Browser (พิมพ์ได้ทันที หรือ Save as PDF)

### Preview:
แบบฟอร์มแสดงใน "กระดาษ A4 จำลอง" ก่อนพิมพ์

---

ถัดไป: 11_asset_management.md
