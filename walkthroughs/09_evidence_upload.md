# 09 — แนบไฟล์หลักฐาน (Evidence Upload)

กลุ่มผู้ใช้: IT Staff / Admin

---

## ฟีเจอร์นี้คืออะไร?

ระบบรองรับการแนบไฟล์หลักฐาน (ภาพถ่าย / เอกสาร) เข้ากับใบเคลม
เช่น รูปถ่ายอุปกรณ์เสีย, สลิปรับงาน, รูปหน้าจอ error

---

## วิธีอัปโหลด Evidence

POST /api/evidence
- Header: Authorization: Bearer [JWT Token]
- Body: multipart/form-data
  - claim_id: [ID ของใบเคลม]
  - asset_tag: [รหัสครุภัณฑ์]
  - file: [ไฟล์ภาพ/เอกสาร]

---

## ที่จัดเก็บไฟล์ (Private Storage)

ไฟล์ถูกจัดเก็บใน:
  /storage/evidence/

ไม่อยู่ใน Public Web Root → ผู้ใช้ไม่สามารถเข้าถึงโดยตรงผ่าน URL

ชื่อไฟล์ถูกแทนด้วย UUID สุ่ม:
  ตัวอย่าง: 3f9a2b1c-4d5e-6789-abcd-ef0123456789.jpg
  (ชื่อไฟล์เดิมเก็บแยกใน field original_filename)

---

## IDOR Protection

IDOR = Insecure Direct Object Reference

ระบบป้องกัน:
1. ผู้ใช้ต้องล็อกอินและมี JWT Token ถูกต้อง
2. ระบบตรวจสอบว่าผู้ขอดูไฟล์มีสิทธิ์เข้าถึงใบเคลมนั้น
3. ไม่สามารถเดา URL ไฟล์โดยตรงได้ เพราะชื่อเป็น UUID สุ่ม

---

## ดูไฟล์ Evidence

GET /api/evidence/:id/file
- ระบบตรวจสอบ JWT + ownership ก่อน
- Stream ไฟล์กลับพร้อม correct Content-Type

---

## ดูรายการ Evidence ของใบเคลม

GET /api/claims/:id
Response รวม:
  evidence: [
    { id, original_filename, mime_type, file_size, created_at },
    ...
  ]

---

## ข้อจำกัด

- รองรับ image/*, application/pdf และ document formats
- ขนาดไฟล์สูงสุดกำหนดโดย multer (ดูใน services/evidenceService.js)
- Soft delete: ลบไฟล์ใน DB (is_deleted=1) ไม่ได้ลบไฟล์จริงใน disk ทันที

---

ถัดไป: 10_pdf_and_print_center.md
