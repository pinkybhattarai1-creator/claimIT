# 📧 คู่มือและตำแหน่งการตั้งค่า Email Service (SendGrid & Resend)

เอกสารนี้จัดทำขึ้นเพื่อให้เห็นตำแหน่งและโครงสร้างการทำงานของระบบอีเมล (SendGrid / Resend) ในระบบ ClaimIT อย่างชัดเจน พร้อมผลการตรวจสอบทุกจุดในระบบว่าส่วนไหนทำงานจริง และส่วนไหนยังอยู่ในสถานะจำลอง (Simulation Mode)

---

## 1. 📍 ตำแหน่งไฟล์ที่เกี่ยวข้องกับ SendGrid และ Resend ในโค้ด

| ไฟล์ | หน้าที่และการทำงาน |
|---|---|
| 📄 [.env](file:///d:/claimit/claimIT/.env) | **ที่เก็บ API Key จริงของเซิร์ฟเวอร์:** ระบุ `SENDGRID_API_KEY` หรือ `RESEND_API_KEY` |
| 📄 [.env.example](file:///d:/claimit/claimIT/.env.example) | เทมเพลตตัวอย่างสำหรับการติดตั้งระบบ |
| ⚙️ [utils/envValidator.js](file:///d:/claimit/claimIT/utils/envValidator.js) | โหลดและตรวจสอบตัวแปรสภาพแวดล้อม (`SENDGRID_API_KEY`, `SENDGRID_FROM`, `RESEND_API_KEY`, `RESEND_FROM`) |
| 🚀 [services/emailService.js](file:///d:/claimit/claimIT/services/emailService.js) | โมดูลหลักส่งอีเมลเบื้องหลังอัตโนมัติ (Event Triggers: เพิ่มครุภัณฑ์ใหม่, แจ้งเคลม, ปิดงาน) |
| 🌐 [routes/email.js](file:///d:/claimit/claimIT/routes/email.js) | API Endpoint `POST /api/email/send` สำหรับส่งอีเมลโดยตรงจากหน้าเว็บ IT Portal |
| 📑 [walkthroughs/18_email_notifications.md](file:///d:/claimit/claimIT/walkthroughs/18_email_notifications.md) | คู่มือการใช้งานระบบอีเมลในโฟลเดอร์ Walkthroughs |

---

## 2. ⚡ ลำดับการทำงานและการตรวจจับ Provider อัตโนมัติ (Priority Logic)

ระบบ ClaimIT ถูกเขียนให้รองรับทั้ง **SendGrid** และ **Resend** แบบ Plug-and-Play:

```text
┌────────────────────────────────────────────────────────┐
│ ตรวจสอบค่าในไฟล์ .env                                    │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
  มี SENDGRID_API_KEY ?           มี RESEND_API_KEY ?
   ├── ใช่ ➔ ส่งผ่าน SendGrid v3 API ├── ใช่ ➔ ส่งผ่าน Resend SDK
   └── ไม่                           └── ไม่
            │                               │
            └───────────────┬───────────────┘
                            ▼
      หากไม่พบ Key ทั้งคู่ ➔ ระบบจะแสดงข้อความเตือนชัดเจนทันที:
      "⚠️ คุณยังไม่ได้ใส่ API Key ในไฟล์ .env (ไม่พบทั้ง SendGrid และ Resend)
       — You didn't insert SendGrid or Resend API key in .env"
      (ระบบจะบันทึกงานไว้ แต่จะไม่ส่งอีเมลจริงออกไป เพื่อป้องกันความเข้าใจผิด)
```

---

## 3. 🛠️ วิธีการเปิดใช้งาน SendGrid API ในระบบ

หากคุณมี **SendGrid API Key** (ขึ้นต้นด้วย `SG.xxxx`):
1. เปิดไฟล์ [d:\claimit\claimIT\.env](file:///d:/claimit/claimIT/.env)
2. เพิ่ม 2 บรรทัดนี้ลงไป:
   ```env
   SENDGRID_API_KEY=SG.your_actual_sendgrid_key_here
   SENDGRID_FROM=no-reply@yourhospital.com
   ```
3. บันทึกไฟล์และรีสตาร์ตระบบ — ClaimIT จะเปลี่ยนจากการจำลอง (Simulation) มาส่งอีเมลจริงผ่าน SendGrid ทันที 100%!

---

## 4. 🔍 ผลการตรวจสอบจุดที่ยังเป็น "Simulation Mode" ในระบบ (Full Simulation Audit)

จากการตรวจสอบซอร์สโค้ดและระบบการทำงานทุกส่วนอย่างละเอียด พบว่า:

### 🟡 ส่วนที่ทำงานในโหมดจำลอง (Simulation Mode เมื่อไม่มี API Key):
1. **การส่งอีเมล (Email Dispatch):**
   - **ตำแหน่ง:** `services/emailService.js` และ `routes/email.js`
   - **พฤติกรรม:** หากใน `.env` ไม่ได้ระบุ `SENDGRID_API_KEY` หรือ `RESEND_API_KEY` ระบบจะบันทึกสถานะเป็น `'SIMULATED'` และแสดงข้อความ `[EMAIL SIMULATED]` ในคอนโซล เพื่อให้เจ้าหน้าที่สามารถทดสอบระบบและรัน Integration Tests ได้ครบถ้วนโดยไม่ต้องต่ออินเทอร์เน็ตออกภายนอก

---

### 🟢 ส่วนที่ทำงานแบบจริง 100% (LIVE / PRODUCTION REALITY):
ทุกส่วนอื่น ๆ ใน ClaimIT เป็นระบบจริงสมบูรณ์ ไม่มีการ Mock หรือ Simulate:
1. **ฐานข้อมูล (Database):** ใช้งาน SQLite จริง (`database.db`) พร้อมระบบ WAL Mode และการบันทึกข้อมูลแบบ Persisted 100%
2. **ความปลอดภัย & ผู้ใช้ (Auth & RBAC):** ใช้ `bcryptjs` เข้ารหัสผ่าน 10 รอบจริง + ออกโทเค็น `JWT` จริง (พร้อมตรวจสอบหมดอายุ 8 ชม.)
3. **การสร้างเอกสารทางการ (Official PDF Generation):** ใช้ `pdfkit` วาด Vector Graphics, ฟอนต์ภาษาไทย, สัญลักษณ์, และตราโรงพยาบาลพญาไท 3 ลงกระดาษ A4 จริง 100%
4. **การประเมินความคุ้มค่า (Viability Score):** คำนวณจริงทางคณิตศาสตร์จากอายุครุภัณฑ์, ราคาจัดซื้อ, ค่าเสื่อม NVB, และประวัติการซ่อม
5. **การสำรองข้อมูล (Automated Hot Backup):** รันคำสั่ง `VACUUM INTO` คัดลอกฐานข้อมูลแบบ Zero-downtime และตัดรอบ Rotation จริงลงโฟลเดอร์ `backups/`
6. **การจัดเก็บไฟล์หลักฐาน (Evidence Private Storage):** บันทึกไฟล์ภาพลงดิสก์ใน `storage/evidence/` พร้อมคำนวณ Checksum SHA-256 จริง
7. **ระบบตรวจสอบประกัน (Warranty Check):** เชื่อมต่อไปยัง Server จริงของ Acer, Dell, และ Lenovo
