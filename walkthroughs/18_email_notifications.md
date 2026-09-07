# 18 — การส่งอีเมลแจ้งเตือน (Email Notifications)

กลุ่มผู้ใช้: IT Admin / Developer

---

## ภาพรวม

ClaimIT มีระบบส่งอีเมลแจ้งเตือนผ่าน Resend API:
1. การส่งอีเมลโดยตรงจากหน้าจอ (Direct Dispatch via `/api/email/send`)
2. การส่งอีเมลแจ้งเตือนอัตโนมัติจาก Backend เมื่อสร้างใบเคลม หรือเพิ่มครุภัณฑ์ใหม่

---

## การตั้งค่า Resend ใน .env

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM=no-reply@claimit.local
NOTIFY_EMAIL=admin@claimit.local
```

Endpoint:
- `POST /api/email/send`
- Header: `Authorization: Bearer <jwt_token>`
- Body: `{ "to": "recipient@hospital.local", "subject": "หัวข้อ", "html": "<p>ข้อความ</p>" }`
- สิทธิ์: Staff / Admin

หาก `RESEND_API_KEY` ไม่ได้ตั้งค่า:
- ระบบยังทำงานได้ปกติโดยบันทึก Log ลงในระบบ (Non-blocking / Resilient)
- บันทึกประวัติการส่งลงในตาราง `email_logs` ในฐานข้อมูล SQLite

---

## Email Templates ที่มี (4 เทมเพลตมาตรฐาน)

1. **Template: ASSET_ADDED**
   - เมื่อลงทะเบียนครุภัณฑ์ใหม่เข้าสู่คลัง
   - เนื้อหา: asset_tag, device_name, category, brand, model, location, warranty_start, warranty_end

2. **Template: VIABILITY_REPORT**
   - เมื่อสร้างใบเคลม RMA + ระบุ recipient_email
   - เนื้อหา: claim_number, viability_status, viability_score, asset_count

3. **Template: RMA_DISPATCH**
   - เมื่อบันทึกส่งมอบครุภัณฑ์ให้ศูนย์บริการ/Vendor
   - เนื้อหา: claim_number, vendor_name, vendor_rma_number, claim_date, expected_return_date, PDPA compliance note

4. **Template: CLAIM_RESOLVED**
   - เมื่อรับเครื่องคืนและปิดงานเคลม
   - เนื้อหา: claim_number, resolution_type, repair_cost, replacement_serial_no

---

## Email Preview Modal (ใน UI)

ใน IT Portal ก่อนส่งเคลม มี Modal Preview อีเมล:
- แสดง To, Subject, Body
- กด [ยืนยันส่งอีเมลและบันทึกเคลม] → ส่งอีเมลและบันทึกใบเคลม
- กด [ยกเลิก] → ยกเลิก

---

## Login Audit Logging

ทุก Login Success/Fail/Block บันทึกเป็น Audit Event ในตาราง move_log:
- asset_tag: SYSTEM_AUTH
- moved_direction: AUTH
- details: LOGIN_SUCCESS / LOGIN_FAILED / LOGIN_BLOCKED / PASSWORD_CHANGE
- department_name: IP Address ของผู้ใช้

---

ถัดไป: 19_security_and_rbac.md
