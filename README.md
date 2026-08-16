# ClaimIT 🛡️

**ระบบติดตามรับประกันและส่งเคลมครุภัณฑ์ไอทีโรงพยาบาล**  
Hospital IT Warranty & RMA Claim Management System

---

## Features
- 🔐 **JWT Authentication** – Role-based access (admin / staff)
- 📦 **Asset Inventory** – Register, search (with fuzzy matching), and manage IT assets
- 🛡️ **PDPA Safeguard** – Data sanitization check before sending assets to vendors
- 📤 **RMA / Claim Tracking** – Full warranty claim lifecycle management
- 📧 **Email Notification** – SendGrid integration (staff-only, manual confirmation before send)
- 📄 **PDF Report** – Downloadable claim report per asset
- 📊 **Audit Trail** – ISO 27001 move log for all asset status changes
- 🏥 **Department/User Management** – Full CRUD via the admin panel

---

## Quick Start (Windows)

```bat
REM 1. Copy env template and fill in values
copy .env.example .env

REM 2. Double-click start.bat  (or run in terminal)
start.bat
```

The app opens automatically at **http://localhost:3000**

**Default credentials:**
| Role | Username | Password |
|------|----------|----------|
| Admin (IT Staff) | `admin` | `admin123` |
| General Staff | `staff` | `staff123` |

---

## Environment Variables

See [`.env.example`](.env.example) for all options.

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No (default 3000) | HTTP listen port |
| `JWT_SECRET` | **Yes** in production | Secret for signing JWTs |
| `SENDGRID_API_KEY` | No | SendGrid API key – leave blank to disable email |
| `SENDGRID_FROM` | No | Sender email address for outgoing mail |

---

## Docker Deployment

```bash
# 1. Copy and fill in env vars
cp .env.example .env

# 2. Build and start
docker compose up -d

# 3. View logs
docker compose logs -f
```

The container persists the SQLite database in a named Docker volume (`claimit_data`).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | SQLite 3 (via `sqlite3`) |
| Auth | JWT (`jsonwebtoken`) |
| Email | SendGrid (`@sendgrid/mail`) |
| PDF | PDFKit |
| Frontend | Vanilla HTML + CSS + JS |
| Deployment | Docker / Docker Compose |

---

## PDF Report Customization

The PDF template lives in `server.js` under the `/api/assets/:tag/pdf` route.  
Edit the PDFKit commands there to change fonts, add a hospital logo, adjust layout, add a signature block, etc.

---

## License

Internal use – Hospital IT Department. Not for public distribution.