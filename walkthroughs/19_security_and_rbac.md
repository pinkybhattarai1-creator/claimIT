# 19 — ความปลอดภัย (Security & RBAC)

กลุ่มผู้ใช้: Admin / Developer

---

## ภาพรวมความปลอดภัย

ClaimIT ออกแบบตามหลัก Defense in Depth:
1. JWT Authentication (Stateless, 8 ชั่วโมง)
2. RBAC (Role-Based Access Control)
3. Security Gate (Passcode: 1 — Cookie 30 วัน)
4. Security Middleware (Rate Limiting, CORS, Headers)
5. PDPA Safeguard + PDPA Gate
6. IDOR Protection
7. Immutable Audit Trail

---

## 1. JWT Authentication

ทุก request ต้องมี:
  Authorization: Bearer <jwt_token>

- Token สร้างจาก JWT_SECRET ใน .env
- อายุ Token: 8 ชั่วโมง (expiresIn: '8h')
- ไม่ใช้ Hardcoded Fallback Secret
- หาก JWT_SECRET ไม่ตั้งค่า → startup หยุดทันที

Login (POST /api/auth/login):
  Response: { token: "eyJ...", user: { id, username, role, name, department } }

---

## 2. RBAC (Role-Based Access Control)

| Role | สิทธิ์ |
|---|---|
| staff | อ่าน assets, สแกน, แจ้งชำรุด, ดู audit, ดาวน์โหลด, ส่งเคลม |
| admin | ทุกอย่างของ staff + สร้าง/แก้ไข/ลบ assets, users, configs, claims |

Middleware:
- verifyToken: ตรวจสอบ JWT ทุก request
- staffOnly: ต้อง login (role ใดก็ได้)
- adminOnly: ต้องเป็น admin เท่านั้น

Staff กดปุ่ม IT Portal → แสดง Toast Warning (ไม่ redirect)

---

## 3. Security Gate

ก่อนหน้า Login มี Passcode Gate:
- รหัสเริ่มต้น: 1 (กำหนดใน .env ด้วย APP_PASSCODE)
- POST /api/verify-gate → ตั้ง Cookie claimit_gate=1 (30 วัน)
- หากผ่านแล้ว ไม่ต้องกรอกซ้ำจนกว่า Cookie หมดอายุ

---

## 4. Rate Limiting

ระบบทำเอง (ไม่ใช้ library ภายนอก) — Sliding Window In-Memory:

| Limiter | Window | Max Requests | ผลลัพธ์เมื่อเกิน |
|---|---|---|---|
| loginLimiter | 15 นาที | 15 ครั้ง | error 429 + ภาษาไทย |
| apiLimiter | 1 นาที | 300 ครั้ง | error 429 + ภาษาไทย |

Headers ที่ส่งกลับ:
- X-RateLimit-Limit
- X-RateLimit-Remaining
- X-RateLimit-Reset

---

## 5. Security Headers (ไม่ใช้ Helmet library)

ระบบเขียน middleware เอง:
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Strict-Transport-Security (Production เท่านั้น)
- Content-Security-Policy: default-src 'self' (+ inline styles)
- ลบ X-Powered-By header

---

## 6. Password Security

- bcryptjs Cost Factor 10
- ไม่เก็บ plain text
- Legacy pbkdf2 hash → migrate ไป bcrypt อัตโนมัติเมื่อ login สำเร็จ
- เปลี่ยนรหัสผ่านตัวเอง: POST /api/auth/change-password (ต้องรู้รหัสเดิม)
- Admin Reset: POST /api/users/:id/reset-password (ไม่ต้องรู้รหัสเดิม)

---

## 7. Environment Variables Validation

ไฟล์: utils/envValidator.js

เมื่อ startup ระบบตรวจสอบและ export:
- PORT, NODE_ENV, HOST
- JWT_SECRET (บังคับ — หากว่างระบบหยุด)
- CORS_ORIGIN
- SECRET_PORTAL_PATH (ชื่อ URL alias ลับ)

---

## 8. Database Security

- SQLite WAL Mode (journal_mode = WAL)
- Foreign Keys เปิดใช้งาน (PRAGMA foreign_keys = ON)
- Parameterized Queries ทุก query (ป้องกัน SQL Injection)
- Soft Delete ทุก table (is_deleted flag)

---

## 9. SECRET_PORTAL_PATH (Hidden URL)

ถ้าตั้งค่า SECRET_PORTAL_PATH ใน .env:
  http://[server]/[secret-path] → redirect ไป /

ใช้เป็น "hidden door" สำหรับ staff ที่รู้ URL

---

## 10. Audit Logging ของ Auth Events

ทุก Login Success/Fail/Block บันทึกใน move_log:
- asset_tag: SYSTEM_AUTH
- moved_direction: AUTH
- details: LOGIN_SUCCESS / LOGIN_FAILED / LOGIN_BLOCKED / PASSWORD_CHANGE
- department_name: IP Address ของผู้ใช้

---

## สิทธิ์ตาม API Endpoint

| Endpoint | Method | สิทธิ์ |
|---|---|---|
| /health | GET | Public |
| /api/verify-gate | POST | Public |
| /api/auth/login | POST | Public |
| /api/auth/change-password | POST | Public (ต้องรู้รหัสเดิม) |
| /api/assets | GET | Staff+ |
| /api/assets | POST | Admin |
| /api/assets/:tag | PUT/DELETE | Admin |
| /api/assets/salvage | POST | Admin (verifyToken, adminOnly) |
| /api/claims | GET/POST | Staff+ |
| /api/claims/:id/status | PUT | Admin (verifyToken, adminOnly) |
| /api/users | GET/POST | Admin |
| /api/users/:id | PUT/DELETE | Admin |
| /api/configurations | GET | Staff+ |
| /api/configurations | POST/PUT/DELETE | Admin |
| /api/departments | GET | Authenticated |
| /api/departments | POST/PUT/DELETE | Admin |
| /api/audit-logs | GET | Staff+ |
| /api/export/excel | GET | Admin (verifyToken, adminOnly) |
| /api/export/assets.csv | GET | Staff+ |
| /api/evidence/upload | POST | Staff+ |
| /api/evidence/:id/view | GET | Staff+ (+ ownership check) |
| /api/backup | POST | Admin (verifyToken, adminOnly) |

---

ถัดไป: 20_installation_and_devops.md
