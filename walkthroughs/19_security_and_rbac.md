# 19 — ความปลอดภัยและสิทธิ์การเข้าถึง (Security & RBAC Architecture)

> **กลุ่มผู้ใช้:** ผู้ดูแลระบบ / นักพัฒนา (Admin & Developer) | **เวลาอ่าน:** ~6 นาที

---

## ภาพรวมความปลอดภัย (Defense-in-Depth)

ClaimIT ได้รับการออกแบบตามหลัก **Defense-in-Depth (การป้องกันแบบหลายชั้น)** เพื่อปกป้องข้อมูลครุภัณฑ์ทางการแพทย์และข้อมูลประวัติโรงพยาบาล:
1. **Security Entry Gate:** ประตูรหัสผ่านชั้นแรกป้องกันการเข้าถึงเว็บก่อนล็อกอิน
2. **Stateless JWT Authentication:** ตรวจสอบตัวตนด้วยกุญแจดิจิทัลที่มีอายุ 8 ชั่วโมง
3. **Role-Based Access Control (RBAC):** แยกสิทธิ์อย่างเด็ดขาดระหว่าง `staff` และ `admin` ทั้งในระดับ UI และ Middleware
4. **Custom Security Middleware:** ป้องกัน Brute-force, Cross-Site Scripting, Clickjacking และการละเมิด CORS
5. **PDPA Safeguard & Storage Gate:** บังคับตรวจความปลอดภัยข้อมูลผู้ป่วยก่อนส่งเคลม
6. **IDOR Authorization Protection:** ป้องกันการเข้าถึงไฟล์หลักฐานโดยไม่ได้รับอนุญาต
7. **Immutable Audit Trail:** บันทึกประวัติความปลอดภัยถาวรที่ไม่สามารถลบหรือแก้ไขได้

---

## 1. การยืนยันตัวตนด้วย JWT (JSON Web Token)

- **Header รูปแบบมาตรฐาน:**
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```
- **การสร้าง Token:** ทำการ Sign ด้วยอัลกอริทึม HMAC SHA256 ผ่านตัวแปร `JWT_SECRET` ที่กำหนดใน `.env`
- **อายุการใช้งาน:** **8 ชั่วโมง** (`expiresIn: '8h'`)
- **การป้องกัน Fallback Secret:** ระบบจะไม่ยอมให้ใช้งาน Hardcoded Secret หากค่า `JWT_SECRET` ใน `.env` ว่างเปล่า เซิร์ฟเวอร์จะปฏิเสธการเริ่มทำงานทันทีตั้งแต่ขั้นตอนตรวจสอบสภาพแวดล้อม (`utils/envValidator.js`)
- **ข้อมูลใน Payload:** เก็บ `id`, `username`, `role`, `name`, และ `department`

---

## 2. การควบคุมสิทธิ์ตามบทบาท (Role-Based Access Control - RBAC)

ระบบแบ่งออกเป็น 2 บทบาทหลัก:

| บทบาท (Role) | สิทธิ์การเข้าถึงและการทำงาน |
|---|---|
| `staff` | ใช้งาน Staff Portal, สแกนค้นหา, แจ้งเครื่องชำรุด (Report Broken), ดูรายการ Audit Trail, ดาวน์โหลดรายงาน Excel/CSV, พิมพ์แบบฟอร์ม |
| `admin` | สิทธิ์ทั้งหมดของ Staff + เข้าถึง IT Portal, จัดการคลังครุภัณฑ์ (เพิ่ม/แก้ไข/ลบ), สร้างใบเคลม Multi-Asset, จัดการผู้ใช้งาน (เพิ่ม/ระงับ/รีเซ็ตรหัส), ตั้งค่าคอนฟิก, จัดการ EOL Salvage |

### การบังคับใช้สิทธิ์ (Enforcement):
- **ฝั่งหน้าบ้าน (UI):** ปุ่ม `[IT Portal]` บนแถบเมนูหลักจะถูกซ่อนอย่างสมบูรณ์ (`display: none`) สำหรับผู้ใช้ระดับ Staff
- **ฝั่งหลังบ้าน (Middleware):**
  - `verifyToken`: ตรวจสอบความถูกต้องและอายุของ JWT Token
  - `staffOnly`: อนุญาตเฉพาะผู้ใช้ที่ผ่านการล็อกอิน (Staff หรือ Admin)
  - `adminOnly`: อนุญาตเฉพาะผู้ใช้ที่มี `role === 'admin'` เท่านั้น หากเป็น Staff จะได้รับรหัส `403 Forbidden`

---

## 3. ประตูรหัสผ่านความปลอดภัย (Security Gate)

- กำหนดรหัสผ่านเริ่มต้นคือ `1` (ปรับเปลี่ยนได้ผ่าน `APP_PASSCODE` ใน `.env`)
- เมื่อยืนยันรหัสถูกต้องที่ `POST /api/verify-gate`:
  - เซิร์ฟเวอร์จะตั้งค่า Cookie: `claimit_gate=1; Path=/; Max-Age=2592000` (อายุ 30 วัน)
  - ฝั่งไคลเอนต์จะจำสถานะใน `localStorage`
- ช่วยป้องกัน Web Crawler หรือบุคคลแปลกหน้าเข้าถึงหน้าล็อกอินของโรงพยาบาล

---

## 4. ระบบจำกัดความถี่ของคำขอ (Rate Limiting)

ระบบพัฒนา Rate Limiter แบบ In-Memory Sliding Window ขึ้นมาเอง (`middleware/security.js`) เพื่อประสิทธิภาพสูงสุด:

| ตัวจำกัดความถี่ (Limiter) | ช่วงเวลา (Window) | จำนวนคำขอสูงสุด | ผลลัพธ์เมื่อเกินขีดจำกัด |
|---|---|---|---|
| **loginLimiter** | 15 นาที | **15 ครั้ง** ต่อ IP | ตอบกลับ HTTP `429 Too Many Requests` พร้อมข้อความแจ้งเตือนภาษาไทย |
| **apiLimiter** | 1 นาที | **300 ครั้ง** ต่อ IP | ป้องกัน DoS/DDoS ถล่ม API |

Header ที่ส่งกลับไปพร้อมการตอบกลับ:
- `X-RateLimit-Limit`: ขีดจำกัดสูงสุด
- `X-RateLimit-Remaining`: จำนวนคำขอที่เหลือ
- `X-RateLimit-Reset`: เวลาที่รอบการจำกัดจะถูกรีเซ็ต (Unix Timestamp)

---

## 5. มาตรการ HTTP Security Headers

ทำงานผ่านมิดเดิลแวร์ใน `middleware/security.js` (เทียบเท่า Helmet):
- **`X-Content-Type-Options: nosniff`** — ป้องกัน MIME Type Confusion
- **`X-Frame-Options: SAMEORIGIN`** — ป้องกันการฝังใน iFrame ของเว็บอื่น (Clickjacking)
- **`X-XSS-Protection: 1; mode=block`** — เปิดใช้งานตัวกรอง XSS ของเบราว์เซอร์
- **`Referrer-Policy: strict-origin-when-cross-origin`** — ป้องกันการรั่วไหลของ URL ปลายทาง
- **`Strict-Transport-Security` (HSTS):** บังคับใช้ HTTPS ในโหมด Production
- **`Content-Security-Policy` (CSP):** กำหนดแหล่งที่มาของ Scripts, Styles และ Fonts อย่างรัดกุม
- **ลบ Header `X-Powered-By: Express`** — ป้องกันการสแกนตรวจหาเวอร์ชันของเซิร์ฟเวอร์

---

## 6. ความปลอดภัยของรหัสผ่าน (Password Security)

- **การเข้ารหัส:** ใช้ `bcryptjs` ด้วย Cost Factor 10
- **ไม่เก็บ Plaintext:** ไม่มีจุดใดในฐานข้อมูลที่เก็บรหัสผ่านจริง
- **การอัปเกรดรหัสผ่านเก่า (Auto-Migration):** หากตรวจพบว่าผู้ใช้ยังใช้ Hash รูปแบบเก่า (pbkdf2) ระบบจะแปลงเป็น `bcrypt` ให้โดยอัตโนมัติเมื่อล็อกอินสำเร็จ
- **การเปลี่ยนรหัสผ่าน:** มีเอนด์พอยต์ `POST /api/auth/change-password` สำหรับผู้ใช้เปลี่ยนรหัสตนเอง

---

## 7. ประตูความปลอดภัย PDPA (PDPA Storage Security Gate)

- ใน `POST /api/assets/claim`: หากครุภัณฑ์มี `sanitization_required === 1` แต่ยังไม่ได้ผ่านการยืนยัน `data_wiped_confirmed === 1`
- เซิร์ฟเวอร์จะปฏิเสธคำขอทันทีด้วยข้อความ:
  ```text
  PDPA Security Gate Block: อุปกรณ์นี้เป็นอุปกรณ์บันทึกข้อมูลหลัก ต้องทำการล้างข้อมูลก่อนจึงจะส่งศูนย์บริการได้
  ```
- ไม่สามารถข้ามขั้นตอนนี้ได้แม้จะส่งคำขอ API เข้ามาโดยตรง

---

## 8. สรุปสิทธิ์การเข้าถึงตาม API Endpoints ทั้งหมด

| Endpoint | Method | ระดับสิทธิ์ที่ต้องการ | คำอธิบาย |
|---|---|---|---|
| `/health` | GET | สาธารณะ (Public) | ตรวจสอบสถานะการทำงานของระบบ |
| `/api/verify-gate` | POST | สาธารณะ (Public) | ปลดล็อก Security Entry Gate |
| `/api/auth/login` | POST | สาธารณะ (จำกัด 15 ครั้ง) | เข้าสู่ระบบและรับ JWT Token |
| `/api/auth/change-password` | POST | ต้องระบุรหัสเดิม | เปลี่ยนรหัสผ่านของผู้ใช้ |
| `/api/assets` | GET | Staff+ | ค้นหาและดูรายการครุภัณฑ์ |
| `/api/assets` | POST | **Admin เท่านั้น** | ลงทะเบียนครุภัณฑ์ใหม่ |
| `/api/assets/:tag` | PUT / DELETE | **Admin เท่านั้น** | แก้ไขหรือลบครุภัณฑ์ |
| `/api/claims` | GET / POST | Staff+ | สร้างและดูรายการใบส่งเคลม |
| `/api/claims/:id/status` | PUT | Staff+ | ปรับสถานะใบเคลมตาม State Machine |
| `/api/users` | GET / POST | **Admin เท่านั้น** | ดูและเพิ่มผู้ใช้งานในระบบ |
| `/api/users/:id` | PUT / DELETE | **Admin เท่านั้น** | แก้ไขและระงับผู้ใช้งาน |
| `/api/users/:id/reset-password` | POST | **Admin เท่านั้น** | รีเซ็ตรหัสผ่านของผู้ใช้งาน |
| `/api/configurations` | GET | Staff+ | ดึงข้อมูลแบรนด์/หมวดหมู่/สถานที่ |
| `/api/configurations` | POST/PUT/DELETE | **Admin เท่านั้น** | จัดการการตั้งค่าระบบ |
| `/api/departments` | GET | ผู้ใช้ล็อกอินทุกคน | ดึงข้อมูลแผนกและอาคาร |
| `/api/departments` | POST/PUT/DELETE | **Admin เท่านั้น** | จัดการแผนกและอาคาร |
| `/api/audit-logs` | GET | Staff+ | ดูบันทึกประวัติความปลอดภัย |
| `/api/export/excel` | GET | Staff+ | ดาวน์โหลดฐานข้อมูล Excel |
| `/api/evidence/upload` | POST | Staff+ | อัปโหลดไฟล์หลักฐาน |
| `/api/evidence/:id/view` | GET | Staff+ (เช็ค IDOR) | สตรีมดูไฟล์หลักฐาน |
| `/api/backup` | POST | Admin / Script | สร้างไฟล์สำรองฐานข้อมูล SQLite |

---

ถัดไป: [20_installation_and_devops.md](file:///d:/claimit/claimIT/walkthroughs/20_installation_and_devops.md)
