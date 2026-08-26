# 10 — ศูนย์พิมพ์เอกสารและดาวน์โหลด PDF

กลุ่มผู้ใช้: Staff / IT Admin

---

## ภาพรวม

ClaimIT มีระบบเอกสาร 3 ส่วน:
1. PDF Report ระดับ Asset (ใบเคลม Single Asset ต่อครุภัณฑ์)
2. PDF Report ระดับ Claim (ใบเคลม Multi-Asset จาก /api/claims)
3. Official Document & Print Center (แบบฟอร์มโรงพยาบาลและ Vendor 5 ชนิด)

---

## ส่วนที่ 1: PDF ระดับ Asset (Single Asset Report)

API: GET /api/assets/:tag/pdf

เนื้อหา:
1. Header: ชื่อโรงพยาบาล + วันที่
2. รายละเอียดครุภัณฑ์ (Asset Tag, ชื่อ, หมวดหมู่, Brand/Model, S/N, Location, ราคา, ประกัน, สถานะ)
3. PDPA Storage Security Audit (ล้างข้อมูล: ใช่/ไม่, ผู้ดำเนินการ, วันที่)
4. ข้อมูลการส่งเคลม (Vendor, RMA No., วันส่ง, วันคาดคืน, ผลการซ่อม, ค่าใช้จ่าย)

วิธีใช้ใน IT Portal:
- สแกนครุภัณฑ์ → กดปุ่ม [ดาวน์โหลด PDF]

---

## ส่วนที่ 2: PDF ระดับ Claim (Multi-Asset Claim Report)

API: GET /api/claims/:id/pdf

เนื้อหา:
1. Header: "ClaimIT — Multi-Asset Warranty & RMA Report"
2. ข้อมูลภาพรวมใบเคลม:
   - หมายเลขใบเคลม
   - ชื่อ Vendor / RMA Number
   - วันที่ / สถานะ
   - Viability Score + VIABLE/NOT_VIABLE
   - ผู้สร้าง / ผู้ยืนยัน
3. รายการครุภัณฑ์ (สูงสุด 5 รายการ):
   - Asset Tag, ชื่อ, หมวดหมู่, Brand/Model, S/N
   - วันหมดประกัน
   - สถานะ PDPA Sanitization
4. PDPA Compliance Statement (ISO/IEC 27001)

---

## ส่วนที่ 3: Official Document & Print Center

เปิดได้จาก:
- Staff Portal: ปุ่ม [พิมพ์แบบฟอร์มส่งซ่อม/เคลม]
- IT Portal: ปุ่ม [แบบฟอร์มพิมพ์ทางการ (Official Forms)]

แบบฟอร์มที่รองรับ (5 แบบ):
| เลข | ชื่อแบบฟอร์ม |
|---|---|
| 1 | ใบรับงานซ่อม / ใบรับเคลมสินค้า (Hospital Work Order) |
| 2 | ใบรับเคลม / นำส่งสินค้า (888 Technology Claim Form) |
| 3 | ใบรับประกันสินค้า (888 Technology Warranty Certificate) |
| 4 | ใบส่งมอบ / ใบรับประกัน (Talent Technology Form) |
| 5 | รายงานประเมินความคุ้มค่า & PDPA Audit (ClaimIT Report) |

วิธีใช้ Print Center:
1. เลือกแบบฟอร์มจาก Dropdown
2. ข้อมูลจากครุภัณฑ์ที่สแกนจะใส่อัตโนมัติ
3. กด [ปรับแต่งข้อมูลฟอร์ม] เพื่อแก้ไข:
   - เลขที่ Job / อ้างอิง
   - ชื่อผู้ติดต่อ + เบอร์โทร
   - อาการเสีย / ปัญหา
   - ชื่อช่าง / ผู้ดำเนินการ
   - วิธีการแก้ไข
4. Live Preview อัปเดตทันทีเมื่อพิมพ์ในช่อง Quick Edit
5. กด [สั่งพิมพ์เอกสาร / บันทึก PDF] → Browser Print Dialog

Preview:
แบบฟอร์มแสดงใน "กระดาษ A4 จำลอง" ก่อนพิมพ์

---

## ฟอนต์

- หาก Windows มี Tahoma.ttf → ใช้ Thai font (ThaiRegular/ThaiBold)
- หากไม่มี → ใช้ Helvetica (English only)

---

ถัดไป: 11_asset_management.md
