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

## เพิ่มผู้ใช้งานใหม่

กดปุ่ม [เพิ่มผู้ใช้งานใหม่] → เปิด Modal

ข้อมูลที่ต้องกรอก:
| ฟิลด์ | ตัวอย่าง |
|---|---|
| Username | nurse_ward20 |
| Password | รหัสผ่าน (เข้ารหัสด้วย bcrypt) |
| ชื่อ-นามสกุล | พยาบาล วอร์ด |
| แผนก | Ward 20 |
| Role | Staff / Admin |

Roles:
- staff = Staff Portal เท่านั้น
- admin = Full Access (IT Portal ทั้งหมด)

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
