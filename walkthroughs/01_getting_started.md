# 01 — เริ่มต้นใช้งาน ClaimIT (Getting Started)

กลุ่มผู้ใช้: ทุกคน (Staff & Admin) | เวลาอ่าน: ~5 นาที

---

## ระบบนี้คืออะไร?

ClaimIT คือระบบบริหารจัดการการรับประกันและส่งเคลมครุภัณฑ์ไอที (RMA) สำหรับโรงพยาบาล

---

## ขั้นตอนที่ 1: เข้าถึงระบบ

เปิด Browser ที่:
  http://[server-ip]:8847
  หรือ http://localhost:8847

---

## ขั้นตอนที่ 2: Security Gate (ประตูรักษาความปลอดภัย)

ก่อนหน้าล็อกอิน ระบบมี "Security Gate" — หน้าจอขอรหัสผ่านเข้าแอป
รหัสผ่านเริ่มต้น: 1 (กำหนดใน .env ด้วย APP_PASSCODE)

หากผ่าน Gate แล้ว ระบบจะตั้ง Cookie claimit_gate=1 (หมดอายุ 30 วัน)
ครั้งต่อไปไม่ต้องกรอก Gate อีก

---

## ขั้นตอนที่ 3: ล็อกอิน (Login)

1. หน้าแรกแสดง "ยินดีต้อนรับสู่ ClaimIT"
2. กรอก Username และ Password
3. กด "เข้าสู่ระบบ (Sign In)"

บัญชีทดสอบ (Demo Credentials):
| บัญชี           | Username | Password  | สิทธิ์       |
|-----------------|----------|-----------|--------------|
| พนักงานทั่วไป  | staff    | staff123  | Staff Portal |
| เจ้าหน้าที่ IT | admin    | admin123  | Full Access  |

ข้อสำคัญ:
- Token หมดอายุใน 8 ชั่วโมง (ไม่ใช่ 24 ชั่วโมง)
- บัญชีที่ถูก Deactivate ล็อกอินไม่ได้
- Login ล้มเหลวเกิน 15 ครั้งใน 15 นาที → ถูก Block (Rate Limiting)
- ทุก Login สำเร็จ/ล้มเหลวถูกบันทึกใน Audit Log
- รหัสผ่าน Legacy (pbkdf2) จะถูก migrate ไปเป็น bcrypt อัตโนมัติเมื่อล็อกอิน

---

## ขั้นตอนที่ 4: หน้าจอหลังล็อกอิน

Nav Bar ด้านบนประกอบด้วย:
- ชื่อ + Role ของผู้ใช้ปัจจุบัน
- ปุ่ม [Staff Portal] — สำหรับแจ้งซ่อมจากวอร์ด
- ปุ่ม [IT Portal] — สำหรับจัดการเคลม (เฉพาะ Admin เท่านั้น)
- ปุ่ม [ข้อมูลด่วน / Quick Sidebar] — เปิด Quick Hub
- ปุ่ม [ส่งออก Excel] — ดาวน์โหลดรายงาน
- ปุ่ม [ออกจากระบบ] — Logout

Staff ที่ไม่ใช่ Admin จะเห็นปุ่ม IT Portal แต่กดแล้วได้รับแจ้งเตือน
"เฉพาะเจ้าหน้าที่ IT (Admin) เท่านั้น"

---

## Session Auto-Restore

ถ้ายัง login อยู่ (มี token ใน localStorage) และ refresh หน้า:
- Admin → ไป IT Portal อัตโนมัติ
- Staff → ไป Staff Portal อัตโนมัติ

---

## เปลี่ยนรหัสผ่านตัวเอง

POST /api/auth/change-password
Body: { username, current_password, new_password }
ผู้ใช้สามารถเปลี่ยนรหัสผ่านตัวเองได้โดยไม่ต้องขอ Admin

---

## Demo Mode

ปุ่ม "Demo Mode" ที่ Header (สีจาง) เมื่อเปิดจะแสดงปุ่ม:
- [Fill Admin] — กรอก admin/admin123 อัตโนมัติ
- [Fill Staff] — กรอก staff/staff123 อัตโนมัติ
กดแล้ว submit ทันทีก็ได้ (Quick Login Buttons)

---

## Health Check

GET /health → ดูสถานะเซิร์ฟเวอร์และฐานข้อมูล:
  { status: 'UP', database: 'CONNECTED', uptime: 1234, ... }

---

## ออกจากระบบ (Logout)

กดปุ่ม "ออกจากระบบ" — ระบบล้าง JWT Token และกลับไปหน้า Login

---

ถัดไป: 02_staff_portal.md
