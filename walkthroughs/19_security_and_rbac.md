# 19 — ความปลอดภัย (Security & RBAC)

กลุ่มผู้ใช้: Admin / Developer

---

## ภาพรวมความปลอดภัย

ClaimIT ออกแบบตามหลัก Defense in Depth:
1. JWT Authentication (Stateless)
2. RBAC (Role-Based Access Control)
3. Security Middleware (Rate Limiting, CORS, Headers)
4. PDPA Safeguard
5. IDOR Protection
6. Immutable Audit Trail

---

## 1. JWT Authentication

ทุก request ต้องมี:
  Authorization: Bearer <jwt_token>

- Token สร้างจาก JWT_SECRET ใน .env
- อายุ Token: 24 ชั่วโมง
- ไม่ใช้ Hardcoded Fallback Secret
- หาก TOKEN_SECRET ไม่ตั้งค่า ระบบหยุดทันที (startup validation)

Login (POST /api/auth/login):
  Response: { token: "eyJ...", user: { id, username, role, name } }

---

## 2. RBAC (Role-Based Access Control)

| Role | สิทธิ์ |
|---|---|
| staff | อ่าน assets, สแกน, แจ้งชำรุด, ดู audit, ดาวน์โหลด |
| admin | ทุกอย่างของ staff + สร้าง/แก้ไข/ลบ assets, users, configs, claims |

Middleware:
- verifyToken: ตรวจสอบ JWT ทุก request
- staffOnly: ต้อง login (role ใดก็ได้)
- adminOnly: ต้องเป็น admin เท่านั้น

---

## 3. Security Middleware

ไฟล์: middleware/security.js

- Rate Limiting: จำกัด request ต่อ IP (ป้องกัน brute force)
- CORS: กำหนด Origin ที่อนุญาต
- Security Headers: X-Frame-Options, X-Content-Type, CSP ฯลฯ
- Helmet.js: ตั้งค่า HTTP Security Headers อัตโนมัติ

---

## 4. Password Security

- bcryptjs Cost Factor 10
- ไม่เก็บ plain text
- Admin สามารถ reset ได้ผ่าน /api/users/:id/reset-password
- ผู้ใช้ไม่สามารถ reset password ตัวเองได้ (ต้องขอ Admin)

---

## 5. Environment Variables Validation

ไฟล์: utils/envValidator.js

เมื่อ startup ระบบตรวจสอบ:
- JWT_SECRET ต้องไม่ว่าง
- หาก NODE_ENV = production และ JWT_SECRET อ่อนแอ → แจ้งเตือน

---

## 6. Database Security

- SQLite WAL Mode: ป้องกัน data corruption
- Foreign Keys: เปิดใช้งาน
- Parameterized Queries: ป้องกัน SQL Injection ทุก query
- Soft Delete: ข้อมูลไม่ถูกลบถาวร (is_deleted flag)

---

## 7. สิทธิ์ตาม API Endpoint

| Endpoint | Method | สิทธิ์ |
|---|---|---|
| /api/auth/login | POST | Public |
| /api/assets | GET | Staff+ |
| /api/assets | POST | Admin |
| /api/assets/:tag | PUT/DELETE | Admin |
| /api/claims | GET/POST | Staff+ |
| /api/claims/:id/status | PUT | Staff+ |
| /api/users | GET/POST | Admin |
| /api/users/:id | PUT/DELETE | Admin |
| /api/configurations | GET | Staff+ |
| /api/configurations | POST/PUT/DELETE | Admin |
| /api/audit-logs | GET | Staff+ |
| /api/export/excel | GET | Staff+ |
| /api/evidence/:id/file | GET | Staff+ (ownership check) |

---

ถัดไป: 20_installation_and_devops.md
