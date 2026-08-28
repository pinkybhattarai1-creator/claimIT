# 20 — ติดตั้งและ DevOps (Installation Guide)

กลุ่มผู้ใช้: Developer / System Admin

---

## ความต้องการของระบบ

- Node.js >= 18
- npm >= 9
- SQLite3 (มาพร้อม better-sqlite3 ไม่ต้องติดตั้งแยก)
- OS: Windows, Linux, macOS

---

## วิธีที่ 1: ติดตั้งแบบปกติ (Node.js)

Step 1: ติดตั้ง Dependencies
  npm install

Step 2: ตั้งค่า Environment Variables
  copy .env.example .env
  แก้ไข .env ตามต้องการ

Step 3: เริ่มระบบ
  npm start
  หรือ double-click start.bat (Windows)

ระบบเปิดที่: http://localhost:8847

### การเข้าใช้งานผ่านเครือข่ายโรงพยาบาล & มือถือ / iPhone (Hospital Intranet 10.33.xx.xx)
ระบบตั้งค่าให้ Bind กับ `HOST=0.0.0.0` อัตโนมัติ โดยเครื่องและอุปกรณ์พกพาในเครือข่ายโรงพยาบาล (วง `10.33.43.xx` และ `10.33.xx.xx`) สามารถเข้าถึงได้ทันที:
- ระบบมี API ตรวจจับ IP อัตโนมัติ: `GET /api/network-info` ส่งคืน IP และ URL พกพา
- ช่างไอทีภาคสนามสามารถเปิดเบราว์เซอร์บน iPhone หรือสมาร์ทโฟนเข้าที่: `http://10.33.xx.xx:8847`
- หน้า Login และ Quick Sidebar มีปุ่ม **[📋 คัดลอก]** ลิงก์มือถือ และปุ่ม **[⚙️ เปลี่ยน IP]** สำหรับระบุ IP หรือ Subnet เองได้
- ระบบมี CORS Middleware รองรับการร้องขอข้ามเครือข่ายอินทราเน็ตโรงพยาบาลโดยอัตโนมัติ

---

## การบริหารจัดการ Branch บน GitHub

| Branch | ประเภท | วัตถุประสงค์ |
|---|---|---|
| **`finalhtinmc`** | Production Release | โค้ดหลักระบบพร้อมใช้งานสำหรับฝ่ายไอที รพ. (Clean Core, Non-AI, 4 Admins + 4 Staff) |
| **`main`** | Production Master | รวมโค้ดหลักเพื่อการ Deploy ขึ้น Production |
| **`finalhtinmc-experiment`** | Experimental AI | ระบบทดลองปัญญาประดิษฐ์ Multi-Provider (Groq, OpenRouter, Gemini) และ OCR วิเคราะห์ภาพ |

---

## Environment Variables ทั้งหมด

| Variable | จำเป็น | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|---|
| PORT | ไม่ | 8847 | พอร์ต Web Server |
| HOST | ไม่ | 0.0.0.0 | Network Interface |
| JWT_SECRET | ใช่ | - | Secret สำหรับ Sign JWT (อายุ 8h) |
| NODE_ENV | ไม่ | development | development/production/test |
| CORS_ORIGIN | ไม่ | * | CORS Allowlist (comma separated) |
| APP_PASSCODE | ไม่ | 1 | รหัส Security Gate หน้า Login |
| SECRET_PORTAL_PATH | ไม่ | - | URL ลับ redirect ไป / (Hidden Door) |
| SENDGRID_API_KEY | ไม่ | - | Background email (ASSET_ADDED/VIABILITY) |
| SENDGRID_FROM | ไม่ | no-reply@claimit.local | อีเมลผู้ส่ง (SendGrid) |
| RESEND_API_KEY | ไม่ | - | Direct email (/api/email/send) |
| RESEND_FROM | ไม่ | no-reply@claimit.local | อีเมลผู้ส่ง (Resend) |
| NOTIFY_EMAIL | ไม่ | admin@claimit.local | รับอีเมลแจ้งเตือนเพิ่มครุภัณฑ์ |

---

## Database

- ไฟล์: database.db (SQLite)
- Schema: schema.sql
- WAL Mode เปิดอัตโนมัติ (PRAGMA journal_mode = WAL)
- Foreign Keys: เปิด (PRAGMA foreign_keys = ON)
- Backup: โฟลเดอร์ backups/

Seed ข้อมูลเริ่มต้น:
  node seed_configs.js
สร้าง Brand/Category/Location พร้อมใช้

Auto Database Backup:
  POST /api/backup
สร้างไฟล์ backup ใน backups/ folder โดยทันที

Auto Migration:
- ระบบ migrate columns อัตโนมัติเมื่อ startup
- ปลอดภัยสำหรับ database เก่า (ไม่ต้อง DROP TABLE)

---

## Health Check Endpoint

GET /health
Response:
  {
    "status": "UP",
    "database": "CONNECTED",
    "environment": "production",
    "uptime": 1234,
    "timestamp": "2026-08-27T..."
  }

ใช้สำหรับ monitoring, load balancer, Docker healthcheck

---

## โครงสร้างไฟล์
```
claimIT/
├── server.js                    # Express Entry point (Port, Security, Route Mount, Backup)
├── db/index.js                  # SQLite connection, migrations, audit logging, bcrypt
├── routes/
│   ├── auth.js                  # POST /login, POST /change-password
│   ├── assets.js                # Asset CRUD + sanitize/claim/resolve/salvage/PDF
│   ├── claims.js                # Multi-asset claims + state machine + PDF
│   ├── evidence.js              # File upload/view/delete (IDOR-safe)
│   ├── users.js                 # User CRUD, deactivate, reactivate, reset-password
│   ├── departments.js           # Department CRUD (Admin-only)
│   ├── configurations.js        # System config CRUD (Brand/Category/Location)
│   ├── audit.js                 # Audit logs + daily summary
│   ├── export.js                # Excel (5 sheets) + CSV export
│   └── email.js                 # Direct email via Resend API
├── services/
│   ├── claimService.js          # Viability engine, state machine, multi-asset
│   ├── emailService.js          # Resend notifications and HTML templates
│   └── evidenceService.js       # multer upload, UUID storage, IDOR check
├── middleware/
│   ├── auth.js                  # JWT verifyToken, staffOnly, adminOnly
│   └── security.js              # Custom headers, CORS, Rate Limiting, errorHandler
├── utils/
│   ├── dateNormalizer.js        # Date parsing & normalization
│   ├── envValidator.js          # Startup env validation & export
│   └── fontResolver.js          # Cross-platform Thai font resolution
├── scripts/
│   ├── backup.js                # Database backup utility
│   ├── hostile_qa_test.js       # Hostile QA & stress verification suite
│   ├── qa_audit.js              # DOM & ID integrity audit
│   └── verify_frontend_workflows.js # Frontend and workflow validator
├── public/
│   ├── index.html               # Main SPA shell
│   ├── ward.html, it.html, ...  # Standalone companion portal pages
│   ├── css/style.css            # Responsive dark/clinical theme CSS
│   └── js/                      # Modular client architecture
│       ├── app.js               # Main application controller
│       ├── state.js             # Client state management
│       ├── templates.js         # Document center & print templates
│       ├── claims.js            # Claim & RMA processing
│       ├── assets.js            # Asset management & inventory
│       ├── auth.js              # Auth & session handler
│       ├── admin.js             # User & configuration admin
│       ├── audit.js             # Audit trail viewer
│       ├── scanner.js           # Barcode scanner engine
│       └── sidebar.js           # Quick hub sidebar
├── claim_calculator.js          # Viability score algorithm & 14 output dimensions
├── schema.sql                   # Database schema definition
├── seed_configs.js              # Seed data for vendors, categories, locations
├── test_suite.js                # Comprehensive 12-stage test suite
├── test_workflow.js             # End-to-end integration workflow test
├── test_samples_validation.js   # Real-world data & accounting validator
├── storage/evidence/            # Private file storage (outside public)
├── backups/                     # Database backups
└── walkthroughs/                # 21 User documentation guides
```

---

## การทดสอบอัตโนมัติ (Automated Tests)

ชุดทดสอบครอบคลุมทุกระดับ:
1. `node test_suite.js` — ทดสอบ 12 ขั้นตอน (Auth, RBAC, Viability, 1-5 Assets, Evidence, PDPA, Backup)
2. `node test_workflow.js` — End-to-end Integration Workflow
3. `node test_samples_validation.js` — ตรวจสอบตัวอย่างข้อมูลจริงและการคำนวณทางบัญชี
4. `node scripts/qa_audit.js` — ตรวจสอบ DOM IDs และ Event Listeners
5. `node scripts/hostile_qa_test.js` — Hostile QA & Security Stress Test (34/34 Passed)
6. `node scripts/verify_frontend_workflows.js` — จำลองการทำงาน Frontend & Workflows (40/40 Passed)

---

## Network Discovery

เมื่อ start ระบบจะ print IP ของทุก network interface:
  [ClaimIT Network] สำหรับเพื่อนร่วมงาน: http://192.168.x.x:8847

---

*เอกสารนี้ครอบคลุมการติดตั้งและ DevOps ทั้งหมดของ ClaimIT v1.0*
