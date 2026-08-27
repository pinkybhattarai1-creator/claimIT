# 09 — แนบไฟล์หลักฐาน (Evidence Upload)

กลุ่มผู้ใช้: IT Staff / Admin

---

## ฟีเจอร์นี้คืออะไร?

ระบบรองรับการแนบไฟล์หลักฐาน (ภาพถ่าย / เอกสาร) เข้ากับใบเคลม
เช่น รูปถ่ายอุปกรณ์เสีย, สลิปรับงาน, รูปหน้าจอ error

---

## วิธีอัปโหลด Evidence

### 1. ถ่ายภาพผ่านมือถือ / iPhone บนวอร์ด (Staff Portal):
- ช่างไอทีกดปุ่ม **[📷 ถ่ายรูป]** หรือ **[📸 ถ่ายรูป/แนบภาพ]** บน Staff Portal
- ถ่ายรูปตัวเครื่อง หรือจุดชำรุดเสียหายด้วยกล้องมือถือ
- เมื่อกด **[🚨 แจ้งชำรุดเข้าส่วนกลาง]** ระบบจะอัปโหลดรูปภาพผ่าน API นี้และผูกเป็นหลักฐานของครุภัณฑ์อัตโนมัติ

### 2. ผ่าน REST API / ใบส่งเคลม:
POST /api/evidence/upload
- Header: Authorization: Bearer [JWT Token]
- Body: multipart/form-data
  - claim_id: [ID ของใบเคลม]
  - asset_tag: [รหัสครุภัณฑ์]
  - file: [ไฟล์ภาพ/เอกสาร]

Response 201:
  { message: "อัปโหลดไฟล์หลักฐานสำเร็จ", evidence: { id, storage_key, ... } }

---

## ที่จัดเก็บไฟล์ (Private Storage)

ไฟล์ถูกจัดเก็บใน:
  /storage/evidence/

ไม่อยู่ใน Public Web Root → ผู้ใช้ไม่สามารถเข้าถึงโดยตรงผ่าน URL
ชื่อไฟล์ถูกแทนด้วย UUID สุ่ม เช่น:
  3f9a2b1c-4d5e-6789-abcd-ef0123456789.jpg
ชื่อไฟล์เดิมเก็บแยกใน field original_filename

---

## IDOR Protection

IDOR = Insecure Direct Object Reference

ระบบป้องกัน:
1. ผู้ใช้ต้องล็อกอินและมี JWT Token ถูกต้อง
2. ระบบตรวจสอบว่าผู้ขอดูไฟล์มีสิทธิ์เข้าถึงใบเคลมนั้น
3. ไม่สามารถเดา URL ไฟล์โดยตรงได้เพราะชื่อเป็น UUID สุ่ม

---

## ดูไฟล์ Evidence (Secure Stream)

GET /api/evidence/:id/view
- ระบบตรวจสอบ JWT + ownership ก่อน
- Stream ไฟล์กลับพร้อม correct Content-Type
- Cache-Control: private, max-age=3600
- Content-Disposition: inline (แสดงในเบราว์เซอร์)

---

## ลบ Evidence

DELETE /api/evidence/:id
- Soft delete (is_deleted = 1)
- ไม่ได้ลบไฟล์จริงบน disk ทันที

---

## ดูรายการ Evidence ของใบเคลม

GET /api/claims/:id
Response รวม:
  evidence: [
    { id, original_filename, mime_type, file_size, created_at },
    ...
  ]

---

ถัดไป: 10_pdf_and_print_center.md
