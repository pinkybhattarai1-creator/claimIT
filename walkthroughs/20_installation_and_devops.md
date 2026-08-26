# 20 — ติดตั้งและ DevOps (Installation Guide)

กลุ่มผู้ใช้: Developer / System Admin

---

## ความต้องการของระบบ

- Node.js >= 18
- npm >= 9
- SQLite3 (ไม่ต้องติดตั้งแยก — มาพร้อม better-sqlite3)
- OS: Windows, Linux, macOS

---

## วิธีที่ 1: ติดตั้งแบบปกติ (Node.js)

### Step 1: Clone / วางไฟล์
  วางโฟลเดอร์ claimIT ในตำแหน่งที่ต้องการ

### Step 2: ติดตั้ง Dependencies
  cd claimIT
  npm install

### Step 3: ตั้งค่า Environment Variables
  copy .env.example .env

แก้ไข .env:
  PORT=8847
  JWT_SECRET=your-very-long-secret-key-here
  NODE_ENV=production
  SENDGRID_API_KEY=SG.xxxxxx (ถ้าต้องการส่งอีเมล)
  SENDGRID_FROM=no-reply@hospital.com

### Step 4: เริ่มระบบ
  npm start

หรือใช้ start.bat (Windows):
  Double-click start.bat

ระบบเปิดที่: http://localhost:8847

---

## วิธีที่ 2: Docker Compose

### Step 1: Build และ run
  docker compose up -d

### Step 2: ดู logs
  docker compose logs -f

### Step 3: หยุดระบบ
  docker compose down

---

## Environment Variables ทั้งหมด

| Variable | จำเป็น | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|---|
| PORT | ไม่ | 8847 | พอร์ต Web Server |
| JWT_SECRET | ใช่ | - | Secret สำหรับ Sign JWT |
| NODE_ENV | ไม่ | development | development / production / test |
| SENDGRID_API_KEY | ไม่ | - | สำหรับส่งอีเมลจริง |
| SENDGRID_FROM | ไม่ | no-reply@claimit.local | อีเมลผู้ส่ง |

---

## Database

- ไฟล์: database.db (SQLite)
- Schema: schema.sql
- WAL Mode เปิดอัตโนมัติ
- Backup: โฟลเดอร์ backups/ (Auto backup บางโมเดล)

### รัน Schema ครั้งแรก:
ระบบสร้าง Schema อัตโนมัติเมื่อ startup (ถ้า DB ว่าง)

### Seed ข้อมูลเริ่มต้น:
  node seed_configs.js

---

## โครงสร้างไฟล์

claimIT/
├── server.js           # Entry point
├── db/index.js         # Database connection & helpers
├── routes/             # API Route handlers
│   ├── auth.js         # Login / Token
│   ├── assets.js       # Asset CRUD
│   ├── claims.js       # RMA Claims
│   ├── evidence.js     # File upload
│   ├── users.js        # User management
│   ├── configurations.js # System config
│   ├── audit.js        # Audit logs
│   ├── export.js       # Excel/CSV export
│   └── email.js        # Email routes
├── services/
│   ├── claimService.js # Business logic: viability, state machine
│   ├── emailService.js # SendGrid integration
│   └── evidenceService.js # File storage
├── middleware/
│   ├── auth.js         # JWT verification + RBAC
│   └── security.js     # Rate limiting, CORS, headers
├── utils/
│   ├── dateNormalizer.js # Date parsing & normalization
│   └── envValidator.js # Startup env check
├── public/
│   ├── index.html      # Single Page Application (SPA)
│   ├── js/app.js       # Frontend JavaScript (~120KB)
│   └── css/style.css   # Dark theme CSS
├── claim_calculator.js # Viability algorithm
├── schema.sql          # Database schema
├── seed_configs.js     # Seed data for configs
├── storage/evidence/   # Private file storage
└── walkthroughs/       # Documentation (นี่คือที่นี่)

---

## การทดสอบอัตโนมัติ (Automated Tests)

### ชุดทดสอบหลัก (10 ขั้นตอน):
  node test_suite.js
ครอบคลุม: Auth, RBAC, Viability Score, Max 5 Assets, Evidence, Wipe Code, Health

### Integration Workflow:
  node test_workflow.js
ทดสอบกระบวนการทำงานครบวงจร End-to-End

### Sample Validation:
  node test_samples_validation.js

---

## Backup

โฟลเดอร์ backups/ เก็บ backup database อัตโนมัติ
ไฟล์ backupdatabase_pharmacy (ที่ d:\claimit\) คือ backup ของ database

---

*เอกสารนี้ครอบคลุมการติดตั้งและ DevOps ทั้งหมดของ ClaimIT*
