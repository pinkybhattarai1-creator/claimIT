# 20 — ติดตั้งและ DevOps (Installation Guide)

> **กลุ่มผู้ใช้:** Developer / System Administrator | **เวลาอ่าน:** ~7 นาที

---

## ความต้องการของระบบ (System Prerequisites)

- **Node.js:** เวอร์ชั่น $\ge 18.0.0$ (แนะนำ LTS เช่น v20.x หรือ v22.x)
- **npm:** เวอร์ชั่น $\ge 9.0.0$
- **Database:** SQLite 3 (ขับเคลื่อนผ่านไดร์เวอร์ความเร็วสูง `better-sqlite3` และ `sqlite3` มาพร้อมในตัวแพ็กเกจ ไม่ต้องติดตั้ง Database Server แยกต่างหาก)
- **ระบบปฏิบัติการ:** รองรับทั้ง Windows (มีสคริปต์ `start.bat`), Linux (Ubuntu/Debian/Alpine) และ macOS

---

## วิธีที่ 1: ติดตั้งแบบปกติ (Standard Node.js Deployment)

### Step 1: ติดตั้งไลบรารี Dependencies
เปิด Terminal หรือ PowerShell ในโฟลเดอร์โครงการ:
```bash
cd d:\claimit\claimIT
npm install
```

### Step 2: จัดเตรียมไฟล์สภาพแวดล้อม (Environment Variables)
คัดลอกไฟล์ต้นแบบ `.env.example` ไปเป็น `.env`:
```bash
copy .env.example .env
```
เปิดไฟล์ `.env` และปรับแต่งค่าตามการใช้งานจริง (ดูตารางด้านล่าง)

### Step 3: เริ่มต้นระบบ
```bash
npm start
```
หรือบนระบบปฏิบัติการ Windows สามารถดับเบิ้ลคลิกที่ไฟล์ **`start.bat`** เพื่อรันได้ทันที

ระบบจะเปิดให้บริการที่:
```text
http://localhost:8847
```
และจะแสดง IP Address สำหรับให้แผนกอื่นๆ ในเครือข่าย LAN เข้าใช้งานได้ทันที

---

## วิธีที่ 2: รันผ่าน Docker & Docker Compose

ระบบมีไฟล์ `Dockerfile` และ `docker-compose.yml` พร้อมใช้งาน:

### 1. สั่ง Build และเริ่มต้นคอนเทนเนอร์ในโหมด Background:
```bash
docker compose up -d
```

### 2. ตรวจสอบการทำงานและดู Logs:
```bash
docker compose logs -f
```

### 3. หยุดการทำงาน:
```bash
docker compose down
```

---

## ตาราง Environment Variables ทั้งหมดในระบบ (.env)

| ตัวแปร (Variable) | บังคับ | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|---|
| `PORT` | ไม่ | `8847` | พอร์ตสำหรับเปิดให้บริการ Web Server |
| `HOST` | ไม่ | `0.0.0.0` | Network Interface (0.0.0.0 เพื่อให้เข้าถึงผ่าน LAN ได้) |
| `JWT_SECRET` | **ใช่** | - | กุญแจลับสำหรับเข้ารหัสและถอดรหัส JWT Token (อายุ 8 ชั่วโมง) |
| `NODE_ENV` | ไม่ | `development` | โหมดการทำงาน (`development`, `production`, หรือ `test`) |
| `CORS_ORIGIN` | ไม่ | `*` | รายการโดเมนที่อนุญาตให้เชื่อมต่อ (คั่นด้วยจุลภาค) |
| `APP_PASSCODE` | ไม่ | `1` | รหัสผ่านสำหรับ Security Entry Gate ก่อนหน้าล็อกอิน |
| `SECRET_PORTAL_PATH` | ไม่ | - | เส้นทาง URL ลับสำหรับ Redirect ไปหน้าหลัก (เช่น `staff-door`) |
| `SENDGRID_API_KEY` | ไม่ | - | API Key ของ SendGrid สำหรับอีเมลแจ้งเตือนหลังบ้าน |
| `SENDGRID_FROM` | ไม่ | `no-reply@claimit.local` | อีเมลผู้ส่งสำหรับการแจ้งเตือนอัตโนมัติ |
| `RESEND_API_KEY` | ไม่ | - | API Key ของ Resend สำหรับการส่งอีเมลผ่านหน้าเว็บโดยตรง |
| `RESEND_FROM` | ไม่ | `no-reply@claimit.local` | อีเมลผู้ส่งสำหรับบริการ Resend |
| `NOTIFY_EMAIL` | ไม่ | `admin@claimit.local` | อีเมลที่จะได้รับแจ้งเตือนเมื่อมีการเพิ่มครุภัณฑ์ใหม่ |

---

## โครงสร้างฐานข้อมูลและการสำรองข้อมูล (Database & Backups)

- **ไฟล์ฐานข้อมูล:** `database.db` (SQLite)
- **โหมดประสิทธิภาพ:** เปิดใช้งาน `WAL Mode` (`PRAGMA journal_mode = WAL;`) และ `Foreign Keys` (`PRAGMA foreign_keys = ON;`) โดยอัตโนมัติ
- **ระบบ Auto-Migration:** เซิร์ฟเวอร์มีฟังก์ชัน `migrateColumns()` ที่จะตรวจหาและเพิ่มคอลัมน์ใหม่อัตโนมัติเมื่อเริ่มต้นระบบ ทำให้สามารถอัปเกรดเวอร์ชันได้โดยไม่สูญเสียข้อมูลเดิม
- **การสร้างข้อมูลเริ่มต้น (Seed Configs):**
  ```bash
  node seed_configs.js
  ```
  สร้างแบรนด์ หมวดหมู่ และสถานที่มาตรฐานพร้อมใช้งาน
- **ระบบสำรองข้อมูลอัตโนมัติ (Automated Database Backup):**
  - มีสคริปต์ `scripts/backup.js` สำหรับสร้างสำเนาฐานข้อมูล
  - สามารถสั่งสำรองข้อมูลผ่าน API: `POST /api/backup` ระบบจะสร้างไฟล์ไว้ในโฟลเดอร์ `backups/` ทันที

---

## การตรวจสอบความพร้อมของระบบ (Health Check Endpoint)

```http
GET /health HTTP/1.1
Host: localhost:8847
```

ตัวอย่างผลลัพธ์ตอบกลับ:
```json
{
  "status": "UP",
  "database": "CONNECTED",
  "environment": "production",
  "uptime": 18240,
  "timestamp": "2026-08-27T03:45:00.000Z"
}
```

---

## โครงสร้างไฟล์และสถาปัตยกรรมระบบ (Architecture Layout)

```text
claimIT/
├── server.js                    # จุดเริ่มต้นเซิร์ฟเวอร์ (Express, Security Headers, Mount Routes)
├── db/index.js                  # การเชื่อมต่อ SQLite, Migration, Bcrypt, Audit Logger
├── routes/                      # Route Handlers แยกตามโมดูล
│   ├── auth.js                  # POST /login, POST /change-password
│   ├── assets.js                # จัดการครุภัณฑ์ CRUD, Sanitize, Claim, Resolve, Salvage, PDF
│   ├── claims.js                # ระบบ Multi-Asset Claims, State Machine, Claim PDF
│   ├── evidence.js              # ระบบอัปโหลดและสตรีมไฟล์หลักฐาน (IDOR-safe)
│   ├── users.js                 # จัดการผู้ใช้งาน, ระงับบัญชี, รีเซ็ตรหัสผ่าน (Admin)
│   ├── departments.js           # จัดการแผนกและโครงสร้างอาคารโรงพยาบาล (Admin)
│   ├── configurations.js        # กำหนดค่าแบรนด์, หมวดหมู่, จุดติดตั้ง (Admin)
│   ├── audit.js                 # เรียกดูประวัติการเคลื่อนย้ายและสถิติกิจกรรมรายวัน
│   ├── export.js                # ส่งออกข้อมูล Multi-Sheet Excel (.xls) และ CSV
│   └── email.js                 # ส่งอีเมลผ่าน Resend API
├── services/                    # Business Logic Layer
│   ├── claimService.js          # อัลกอริทึม Viability, State Machine Transitions, Multi-Asset
│   ├── emailService.js          # ส่งอีเมลแจ้งเตือนอัตโนมัติผ่าน Resend (ASSET_ADDED, VIABILITY_REPORT)
│   └── evidenceService.js       # จัดการไฟล์ Multer, สุ่มชื่อ UUID, ตรวจสอบสิทธิ์ IDOR
├── middleware/                  # Middleware Layer
│   ├── auth.js                  # ตรวจสอบ JWT Token และควบคุมสิทธิ์ RBAC (staffOnly, adminOnly)
│   └── security.js              # Security Headers, Strict CORS, Sliding-Window Rate Limiting
├── utils/                       # เครื่องมือช่วยเหลือ (Utilities)
│   ├── dateNormalizer.js        # จัดการและแปลงรูปแบบวันที่สากล/พุทธศักราช
│   ├── envValidator.js          # ตรวจสอบความถูกต้องของ Environment Variables ตอนเริ่มระบบ
│   └── fontResolver.js          # ค้นหาและโหลดฟอนต์ภาษาไทยข้ามระบบปฏิบัติการ (Windows/Linux/Docker)
├── scripts/
│   └── backup.js                # สคริปต์สำรองข้อมูล SQLite
├── public/                      # ฝั่งหน้าบ้าน (Client Web SPA)
│   ├── index.html               # หน้า Single Page Application หลัก (~82KB)
│   ├── css/style.css            # ธีมสี Dark Theme สไตล์ Modern Hospital IT
│   └── js/                      # โมดูล JavaScript แยกตามความรับผิดชอบ:
│       ├── state.js             # สถานะ Global State, Toast Notifications, และ Helpers
│       ├── auth.js              # Security Gate, Login, Session Management, Logout
│       ├── scanner.js           # Smart Scanner Engine, Audio Beep, Heuristic Tag Parser
│       ├── assets.js            # ตาราง Inventory, คลิกดูรายละเอียด, ประเมินความคุ้มค่า
│       ├── claims.js            # ระบบเคลมเดี่ยว/กลุ่ม, State Machine Actions, Evidence UI
│       ├── audit.js             # ตัวกรอง Audit Toolbar, กิจกรรมรายวัน, Volume Metrics
│       ├── admin.js             # จัดการผู้ใช้ RBAC, การตั้งค่าแบรนด์และขั้นตอนเคลม
│       ├── sidebar.js           # Quick Hub Sidebar, สแกนล่าสุด, สายด่วนคู่ค้า, Quick Export
│       ├── templates.js         # Official Document & Print Center (5 รูปแบบเอกสาร)
│       └── app.js               # ตัวควบคุมหลัก (App Orchestrator) เชื่อมโยง Event Listeners
├── claim_calculator.js          # อัลกอริทึมคำนวณ Viability Score ทางคณิตศาสตร์
├── schema.sql                   # โครงสร้างตารางฐานข้อมูล SQLite
├── seed_configs.js              # สคริปต์สร้างข้อมูลตั้งต้น
├── storage/evidence/            # โฟลเดอร์เก็บไฟล์หลักฐานความปลอดภัยสูง (อยู่นอก Web Root)
├── backups/                     # โฟลเดอร์เก็บไฟล์สำรองฐานข้อมูล
└── walkthroughs/                # คลังเอกสารคู่มือผู้ใช้ครบทุกฟังก์ชัน (โฟลเดอร์นี้)
```

---

## ชุดทดสอบอัตโนมัติ (Automated Test Suites)

 ClaimIT มีชุดทดสอบที่ครอบคลุมทุกจุดวิกฤตของระบบ:

### 1. ชุดทดสอบหลัก 10 ขั้นตอน (Main Test Suite):
```bash
node test_suite.js
```
ครอบคลุม:
- ตรวจสอบ JWT Authentication & Role-Based Access Control (Staff vs Admin)
- ตรวจสอบอัลกอริทึมคำนวณ Viability Score (ในประกัน = 1.0, นอกประกัน = 2.0–5.0, EOL = 8.5)
- ตรวจสอบการจำกัด Multi-Asset Claim ไม่เกิน 5 ชิ้น
- ตรวจสอบระบบแนบและป้องกันไฟล์หลักฐาน (IDOR Security Stream)
- ตรวจสอบความถูกต้องของรหัส Wipe Authorization Code (WIPED, 9999, Asset Tag)
- ตรวจสอบการทำงานของ Health Check Endpoint

### 2. ทดสอบกระบวนการทำงานครบวงจร (Integration Workflow Test):
```bash
node test_workflow.js
```
จำลองการทำงานตั้งแต่แจ้งชำรุด $\rightarrow$ ล้างข้อมูล PDPA $\rightarrow$ ออกใบเคลม $\rightarrow$ รับเครื่องคืน

### 3. ทดสอบความถูกต้องของตัวอย่างข้อมูล (Sample Validation):
```bash
node test_samples_validation.js
```

---

*คู่มือนี้ครอบคลุมการติดตั้ง บำรุงรักษา และสถาปัตยกรรมระบบ ClaimIT v1.0 อย่างสมบูรณ์*
