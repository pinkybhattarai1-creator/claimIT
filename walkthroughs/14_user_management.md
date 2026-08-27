# 14 — จัดการผู้ใช้งาน (User Management)

กลุ่มผู้ใช้: Admin เท่านั้น

---

## ภาพรวม

Admin สามารถสร้าง แก้ไข ระงับ และรีเซ็ตรหัสผ่านของผู้ใช้งานทั้งหมด

---

## ตารางผู้ใช้งาน

แสดงในหน้า IT Portal:
- ID
- Username
- ชื่อ-นามสกุล
- แผนก (Department)
- สิทธิ์การใช้งาน (Role)
- ปุ่มจัดการ

---

## บัญชีเริ่มต้นในระบบ (Pre-seeded Accounts: 4 IT Admins + 4 IT Staff)

ระบบติดตั้งมาพร้อม 8 บัญชีสำหรับฝ่ายไอที:
- **4 เจ้าหน้าที่ฝ่ายไอที (Admins)**: `admin`, `admin2`, `admin3`, `admin4` (รหัสผ่าน: `admin123`)
- **4 ช่างไอทีภาคสนาม (Staff)**: `staff`, `staff2`, `staff3`, `staff4` (รหัสผ่าน: `staff123`)

## เพิ่มผู้ใช้งานใหม่ (Create User)

กดปุ่ม [➕ เพิ่มผู้ใช้งานใหม่] → เปิด Modal

ข้อมูลที่ต้องกรอก:
| ฟิลด์ | ตัวอย่าง |
|---|---|
| Username | `staff5` หรือ `it_hardware` |
| Password | รหัสผ่าน (เข้ารหัสความปลอดภัยด้วย bcrypt) |
| ชื่อ-นามสกุล | นายประสิทธิ์ มั่นคง (ช่างเทคนิคภาคสนาม) |
| แผนก | Technical Support & Infrastructure |
| Role | Staff / Admin |

Roles:
- staff = สำหรับช่างไอทีภาคสนาม และเจ้าหน้าที่แจ้งซ่อม (Staff Portal)
- admin = สำหรับผู้ดูแลระบบ, ผู้จัดการเคลม, และหัวหน้าไอที (IT Portal & Settings)

---

## การแก้ไขข้อมูลส่วนตัวด้วยตนเอง (Self Profile Editing)

ผู้ใช้ทุกคน (ทั้ง Admin และ Staff) สามารถคลิกปุ่ม **`✏️ แก้ไขชื่อ`** บนแถบ Header หรือคลิกที่ชื่อของตนเองเพื่อ:
- แก้ไขชื่อ-นามสกุล / ตำแหน่งที่แสดง
- แก้ไขชื่อแผนก / สังกัด
- ระบบจะอัปเดตลงฐานข้อมูลและออก JWT Token ใหม่แบบ Real-time ทันทีโดยไม่ต้องให้ Admin แก้ไขให้

---

## แก้ไขผู้ใช้งาน

PUT /api/users/:id
- แก้ไขได้: role, name, department
- ไม่สามารถเปลี่ยน username ได้

---

## ระงับการใช้งาน (Deactivate)

DELETE /api/users/:id
- เป็น Soft Delete (is_deleted = 1, is_active = 0)
- ผู้ใช้ไม่สามารถล็อกอินได้อีก
- ข้อมูลยังอยู่ในฐานข้อมูล

---

## เปิดใช้งานอีกครั้ง (Reactivate)

POST /api/users/:id/reactivate
- ตั้ง is_deleted = 0, is_active = 1
- ผู้ใช้ล็อกอินได้ปกติ

---

## รีเซ็ตรหัสผ่าน (Admin Reset Password)

POST /api/users/:id/reset-password
Body: { "new_password": "รหัสใหม่" }
- Admin สามารถรีเซ็ตรหัสผ่านได้โดยไม่ต้องรู้รหัสเดิม
- รหัสใหม่ถูกเข้ารหัสด้วย bcrypt ทันที

---

## ความปลอดภัย

- รหัสผ่านทั้งหมดเข้ารหัสด้วย bcryptjs (Cost Factor 10)
- ไม่มีการเก็บ plain text password
- JWT Token หมดอายุหลัง 24 ชั่วโมง

---

ถัดไป: 15_system_configurations.md
