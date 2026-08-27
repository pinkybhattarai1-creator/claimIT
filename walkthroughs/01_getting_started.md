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
2. กรอก Username และ Password หรือกดปุ่ม **เข้าสู่ระบบด่วน 1-Click (Fast Login)**
3. มีปุ่มกดเข้าสู่ระบบด่วน 8 บัญชีแบ่งตามบทบาท:
   - **4 เจ้าหน้าที่ไอที (Admins)**:
     - `admin` (Admin 1 - Technical Support Head)
     - `admin2` (Admin 2 - Senior IT Support)
     - `admin3` (Admin 3 - Systems & Network IT)
     - `admin4` (Admin 4 - Hardware & Claim IT)
   - **4 ช่างไอทีภาคสนาม (Staff)**:
     - `staff` (Staff 1 - IT Field Technician)
     - `staff2` (Staff 2 - IT On-site Support)
     - `staff3` (Staff 3 - IT Mobile Support / iPhone)
     - `staff4` (Staff 4 - IT Ward Support Staff)

4. **การเชื่อมต่อผ่าน iPhone / มือถือใน รพ.**:
   - แถบใต้ฟอร์มล็อกอินจะแสดง URL เชื่อมต่อผ่านเครือข่าย รพ. อัตโนมัติ (เช่น `http://10.33.43.xx:8847`)
   - มีปุ่ม [📋 คัดลอก] เพื่อนำไปเปิดใน Safari / Chrome บน iPhone ได้ทันที
   - สามารถกด [⚙️ เปลี่ยน IP] เพื่อระบุ IP Address เองได้หากใช้วงเครือข่ายเฉพาะ

ข้อสำคัญ:
- Token หมดอายุใน 8 ชั่วโมง
- บัญชีที่ถูก Deactivate ล็อกอินไม่ได้
- Login ล้มเหลวเกิน 15 ครั้งใน 15 นาที → ถูก Block (Rate Limiting)
- ทุก Login สำเร็จ/ล้มเหลวถูกบันทึกใน Audit Log
- รหัสผ่าน Legacy (pbkdf2) จะถูก migrate ไปเป็น bcrypt อัตโนมัติเมื่อล็อกอิน

---

## ขั้นตอนที่ 4: หน้าจอหลังล็อกอิน & แก้ไขข้อมูลส่วนตัว (Self Profile Edit)

Nav Bar ด้านบนประกอบด้วย:
- ชื่อ + Role และแผนกของผู้ใช้ปัจจุบัน (เช่น `IT Admin (Technical Support & Infrastructure)` หรือ `Staff (ICU)`)
- ปุ่ม **✏️ แก้ไขชื่อ (Edit Profile)**: สามารถกดเพื่อเปลี่ยนชื่อ-นามสกุล และแผนกของตนเองได้ทันที โดยระบบจะอัปเดตฐานข้อมูลและออก JWT Token ใหม่แบบ Real-time
- ปุ่มเปิดข้อมูลด่วน (Quick Sidebar)
- ปุ่มส่งออก Excel
- ปุ่มออกจากระบบ (Logout)
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

## เข้าสู่ระบบด่วนตามสิทธิ์ (Fast Login Buttons)

หน้าเข้าสู่ระบบมีปุ่ม Fast Login เพื่อความสะดวกในการสลับสิทธิ์การทำงาน:
- 👑 เข้าสู่ระบบ IT Admin (ผู้ดูแลระบบ)
- 🛡️ เข้าสู่ระบบพนักงานทั่วไป (เจ้าหน้าที่ประจำแผนก)
คลิกเพื่อเข้าสู่ระบบตามสิทธิ์ที่ต้องการทันที

---

## Health Check

GET /health → ดูสถานะเซิร์ฟเวอร์และฐานข้อมูล:
  { status: 'UP', database: 'CONNECTED', uptime: 1234, ... }

---

## ออกจากระบบ (Logout)

กดปุ่ม "ออกจากระบบ" — ระบบล้าง JWT Token และกลับไปหน้า Login

---

ถัดไป: 02_staff_portal.md
