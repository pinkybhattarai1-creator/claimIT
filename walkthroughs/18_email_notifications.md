# 18 — การส่งอีเมลแจ้งเตือน (Email Notifications)

> **กลุ่มผู้ใช้:** IT Admin / Developer | **เวลาอ่าน:** ~4 นาที

---

## ภาพรวม

ClaimIT มีระบบส่งอีเมล 2 ช่องทาง และรองรับทั้ง **SendGrid** และ **Resend**:

1. **ระบบ UI Direct (routes/email.js)** — ส่งอีเมลจาก Modal Preview ในหน้า IT Portal โดยตรง
2. **ระบบ Background Automatic (services/emailService.js)** — ส่งอีเมลอัตโนมัติจาก API events (เพิ่มครุภัณฑ์ใหม่ ฯลฯ)

---

## การตั้งค่าใน .env (เลือกระหว่าง SendGrid หรือ Resend)

### ตัวเลือกที่ 1: ใช้งานผ่าน SendGrid (แนะนำหากมี SendGrid API Key)
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM=no-reply@yourhospital.com
```

### ตัวเลือกที่ 2: ใช้งานผ่าน Resend
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM=onboarding@resend.dev
```

**ลำดับความสำคัญ (Provider Priority):**
- หากระบุ `SENDGRID_API_KEY` ➔ ระบบจะส่งผ่าน **SendGrid v3 REST API** ทันที
- หากระบุ `RESEND_API_KEY` ➔ ระบบจะส่งผ่าน **Resend SDK**
- หากไม่ระบุทั้งคู่ ➔ ระบบจะทำงานใน **Simulation Mode** (จำลองการส่งลง Console ปลอดภัย 100%)

---

## ระบบที่ 1: UI Direct Email (routes/email.js)

ใช้สำหรับส่งอีเมลจากหน้า IT Portal ผ่าน Email Preview Modal ก่อนสร้างใบเคลม

**Endpoint:**
```
POST /api/email/send
Body: { to, subject, html, claim_id }
สิทธิ์: Staff+
```

**สถานะการส่งที่เป็นไปได้:**
- `SENT` — ส่งสำเร็จผ่าน SendGrid หรือ Resend
- `SIMULATED` — หากไม่ได้ระบุ API Key ใน .env ระบบจะ Log ไว้ใน console แต่ไม่ส่งจริง (ไม่ทำให้ระบบล้มเหลว)
- `FAILED` — ส่งไม่ได้ (ตอบกลับ HTTP 500)

ทุกการส่งบันทึกเข้าตาราง `email_logs` ในฐานข้อมูลโดยอัตโนมัติ

---

## ระบบที่ 2: Background Automatic Email (services/emailService.js)

ทำงานอัตโนมัติเบื้องหลังเมื่อเกิด event สำคัญในระบบ รองรับทั้ง SendGrid และ Resend เช่นเดียวกัน

**เหตุการณ์ที่ทริกเกอร์อีเมลอัตโนมัติ:**
| เหตุการณ์ | Template ที่ใช้ |
|---|---|
| Admin เพิ่มครุภัณฑ์ใหม่ | `ASSET_ADDED` |
| สร้างใบเคลม + ส่ง recipient_email | `VIABILITY_REPORT` |

**หากไม่ตั้งค่า RESEND_API_KEY:**
- ระบบยังทำงานได้ตามปกติทุกประการ
- อีเมลจะถูก Simulate ใน console log แทน (Fire-and-Forget)
- ผู้ใช้ได้รับ response success ตามปกติ ไม่มีผลต่อการทำงานหลัก

---

## Email Templates ที่มีในระบบ (4 Templates)

| Template Name | ทริกเกอร์เมื่อ | เนื้อหาหลัก |
|---|---|---|
| `VIABILITY_REPORT` | สร้างใบเคลม + ระบุ recipient_email | claim_number, viability_status, viability_score (0-10), asset_count |
| `RMA_DISPATCH` | บันทึกส่งเคลมศูนย์บริการ | vendor_name, RMA No., claim_date, expected_return_date, PDPA note |
| `CLAIM_RESOLVED` | รับเครื่องคืนจากศูนย์บริการ | asset_tag, resolution_type, replacement_serial_no, repair_cost, resolved_date |
| `ASSET_ADDED` | Admin เพิ่มครุภัณฑ์ใหม่ | asset_tag, device_name, category, brand, model, serial_no, location, warranty |

ทุก Template ส่งเป็น HTML Email สวยงามพร้อมตารางข้อมูล รองรับภาษาไทย

---

## Email Preview Modal (ใน UI ก่อนส่งเคลม)

ใน IT Portal ก่อนส่งเคลม มี Modal Preview อีเมล:
1. แสดง **To** (ผู้รับ), **Subject** (หัวข้อ), และ **เนื้อหา HTML**
2. กด **[ยืนยันส่งอีเมลและบันทึกเคลม]** → ส่งอีเมลและบันทึกใบเคลมพร้อมกัน
3. กด **[ยกเลิก]** → ปิด Modal โดยไม่ดำเนินการ

---

## บันทึก Audit — Auth Events

ทุก Login/Logout/Password Change บันทึกเป็น Audit Event ในตาราง `move_log`:

| ฟิลด์ | ค่า |
|---|---|
| `asset_tag` | `SYSTEM_AUTH` |
| `moved_direction` | `AUTH` |
| `action_by_username` | Username ที่พยายามล็อกอิน |
| `department_name` | `IP: <IP Address>` ของผู้ใช้ |
| `details` | `LOGIN_SUCCESS` / `LOGIN_FAILED` / `LOGIN_BLOCKED` / `PASSWORD_CHANGE` |

---

ถัดไป: [19_security_and_rbac.md](file:///d:/claimit/claimIT/walkthroughs/19_security_and_rbac.md)
