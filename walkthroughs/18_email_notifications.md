# 18 — การส่งอีเมลแจ้งเตือน (Email Notifications)

กลุ่มผู้ใช้: IT Admin / Developer

---

## ภาพรวม

ระบบส่งอีเมลอัตโนมัติผ่าน SendGrid API
ใช้สำหรับแจ้งเตือน Vendor เมื่อสร้างใบเคลม

---

## ตั้งค่า SendGrid

ใน .env:
  SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
  SENDGRID_FROM=no-reply@claimit.local

หาก SENDGRID_API_KEY ไม่ได้ตั้งค่า:
- ระบบจะ log คำเตือน
- ระบบยังทำงานได้ปกติ เพียงแต่ไม่ส่งอีเมล

---

## เมื่อไหร่ที่ส่งอีเมล?

เมื่อสร้างใบเคลม (POST /api/claims) และระบุ recipient_email ในการตั้งค่า:

Body:
{
  ...
  "recipient_email": "vendor@dell.com"
}

Template: VIABILITY_REPORT
เนื้อหา: หมายเลขใบเคลม, Viability Status, Score, จำนวนครุภัณฑ์

---

## Email Preview Modal

ใน UI มี Modal ดูตัวอย่างอีเมลก่อนส่ง:
- แสดง To, Subject, Body
- กด [ยืนยันส่งอีเมลและบันทึกเคลม] → ส่งอีเมลและบันทึกใบเคลม
- กด [ยกเลิก] → ยกเลิก

---

## Email Templates

ระบบมี template ใน services/emailService.js:

Template: VIABILITY_REPORT
หัวข้อ: แจ้งผลประเมินความคุ้มค่าใบเคลม [claim_number]
เนื้อหา:
- หมายเลขใบเคลม
- สถานะ VIABLE / NOT_VIABLE
- Viability Score
- จำนวนครุภัณฑ์

---

## การส่งอีเมลเป็น Background Task

อีเมลถูกส่งแบบ async (fire-and-forget):
- ไม่บล็อก response ของ API
- ถ้าส่งไม่สำเร็จ log error ใน console
- ผู้ใช้ยังได้รับ response success ตามปกติ

---

ถัดไป: 19_security_and_rbac.md
