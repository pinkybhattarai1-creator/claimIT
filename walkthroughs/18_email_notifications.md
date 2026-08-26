# 18 — การส่งอีเมลแจ้งเตือน (Email Notifications)

กลุ่มผู้ใช้: IT Admin / Developer

---

## ภาพรวม

ClaimIT มีระบบส่งอีเมล 2 ระบบ:
1. Resend (routes/email.js) — สำหรับส่งอีเมลจาก UI โดยตรง
2. SendGrid (services/emailService.js) — สำหรับอีเมล background จาก API

---

## ระบบที่ 1: Resend (Direct Email via API)

ตั้งค่าใน .env:
  RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
  RESEND_FROM=no-reply@claimit.local

Endpoint:
POST /api/email/send
Body: { to, subject, html }
สิทธิ์: Staff+

หาก RESEND_API_KEY ไม่ได้ตั้งค่า → response 503:
"Email service not configured. Set RESEND_API_KEY in .env."

---

## ระบบที่ 2: SendGrid (Background Notifications)

ตั้งค่าใน .env:
  SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
  SENDGRID_FROM=no-reply@claimit.local

ใช้โดย Backend เอง เมื่อ:
1. เพิ่มครุภัณฑ์ใหม่ → Template: ASSET_ADDED
2. สร้างใบเคลม (ถ้า recipient_email ถูกส่งมา) → Template: VIABILITY_REPORT

หาก SendGrid ไม่ตั้งค่า:
- ระบบยังทำงานได้ปกติ
- Log error ใน console
- ผู้ใช้ได้รับ response success ตามปกติ (fire-and-forget)

---

## Email Templates ที่มี

Template: ASSET_ADDED
- เมื่อ Admin เพิ่มครุภัณฑ์ใหม่
- เนื้อหา: asset_tag, device_name, category, brand, model, location, warranty

Template: VIABILITY_REPORT
- เมื่อสร้างใบเคลม + มี recipient_email
- เนื้อหา: claim_number, viability_status, viability_score, asset_count

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
