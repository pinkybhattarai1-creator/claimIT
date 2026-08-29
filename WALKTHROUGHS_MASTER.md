# ClaimIT — Complete System & UX/UI Master Reference Document
> *Compiled from all 21 Walkthrough Guides (00_INDEX.md through 20_installation_and_devops.md)*

---

## 1. System Architecture & UX/UI Philosophy

ClaimIT is a single-page application (SPA) designed for hospital IT equipment warranty management and RMA claim tracking.

### Core User Roles:
1. **IT Field Staff (ช่างไอทีภาคสนาม / On-site Support)**:
   - Mobile & desktop responsive access.
   - Fast barcode scanning and camera photo capture.
   - Dual Buddhist Era (พ.ศ.) and Gregorian (ค.ศ.) warranty expiration display.
   - Broken equipment reporting, 6-Month PM requests, and emergency loaner requests.
2. **IT Admin / Supervisor (ผู้ดูแลระบบและหัวหน้าฝ่ายไอที)**:
   - Multi-asset claim creation (1 to 5 assets per RMA voucher).
   - Claim viability score evaluation (score $\le 5.0$ viable, $> 5.0$ not viable).
   - PDPA data sanitization authorization gate for storage-bearing assets.
   - Vendor RMA lifecycle state transitions (Draft → Confirmed → Submitted → Vendor Response → Returned → Closed).
   - Master data management, user accounts, audit trail, and native multi-sheet Excel exports.

---

## 2. Walkthroughs Summary & Feature Mapping (00 to 20)

| Walkthrough | Feature Area | Key UX/UI Controls & Workflows |
|---|---|---|
| **01_getting_started** | Login & Navigation | Persona-based one-click demo login, responsive topbar, sidebar drawer. |
| **02_staff_portal** | Field Technician Portal | Barcode search input, camera capture button, preset chip shortcuts, quick action buttons (Report Broken, 6M PM, Emergency Loaner). |
| **03_it_portal_dashboard** | IT Operations Hub | 4 Sub-tabs: Scanner/Lookup, Vendor Claims, Asset Inventory, Audit Trail. Stat summary cards. |
| **04_asset_scanning_and_lookup** | Scanner & Search | Hardware scanner burst listener, anti-typo mode, fuzzy search suggestions, asset detail cards. |
| **05_pdpa_data_sanitization** | PDPA Wipe Gate | Data sanitization badge, wipe confirmation code input (`WIPED` / `WIPED-<TAG>`), audit logging. |
| **06_rma_claim_creation** | Multi-Asset RMA Claims | 1 to 5 asset picker, live viability score calculator, vendor selection, RMA voucher dispatch. |
| **07_viability_score** | Viability Score Engine | Formula factoring purchase price, remaining warranty days, repair cost, and device age. Score $\le 5.0$ = VIABLE. |
| **08_claim_status_lifecycle** | Claim State Machine | Strict sequential status advancement: DRAFT → CONFIRMED → SUBMITTED → VENDOR_RESPONSE → RETURNED → CLOSED. |
| **09_evidence_upload** | Evidence Attachments | Multi-file uploader (JPEG, PNG, WebP, PDF), instant thumbnail preview, IDOR-protected download/stream. |
| **10_pdf_and_print_center** | PDF & Print Center | Dual-language PDF generation (Thai Tahoma font / Helvetica fallback), Gate Pass, RMA Voucher, Repair Request. |
| **11_asset_management** | Asset Inventory Management | Asset table, add asset modal, edit master data, delete confirmation, status badge indicators. |
| **12_eol_salvage** | EOL & Salvage Disposal | End-of-Life tracking, disposal actions: Pending Sell, Sold, Pending Donation, Donated, Scrapped. |
| **13_audit_trail** | Audit & Tracking Trail | Real-time immutable event log with unique tracking codes (`CHG-YYYYMMDD-XXXXXX`), time-span filters (Today, 7D, 30D). |
| **14_user_management** | RBAC & User Administration | Admin & Staff user table, password reset modal, deactivate/reactivate user toggles, last-admin deletion safeguard. |
| **15_system_configurations** | Master Configurations | Brand RMA procedures, equipment categories, hospital locations/wards. |
| **16_excel_csv_export** | Data Export | Native Microsoft Excel SpreadsheetML (.xls) multi-sheet export, UTF-8 BOM CSV export. |
| **17_quick_sidebar** | Quick Access Drawer (`ทางลัด`) | Slide-out drawer with Today's activity, recent scan history, vendor hotlines, and quick download links. |
| **18_email_notifications** | Email Notifications | Automated notifications via Resend for viability reports, RMA dispatch, and resolution. |
| **19_security_and_rbac** | Security & RBAC | JWT 8-hour tokens, bcrypt password hashing, login rate limiter, strict server-side middleware (`adminOnly`, `staffOnly`). |
| **20_installation_and_devops** | Deployment & DevOps | Node.js native startup, Docker containerization, SQLite WAL mode, database backup. |

---

## 3. Targeted UX/UI Standards & Checklist

1. **Scanner & Lookup UX**:
   - Clean, professional search bar starting empty with high-contrast text.
   - Remove offline parser debug HUD (`[OFFLINE TAG PARSER DETECTED]`).
   - Clear feedback for invalid or malformed tags without breaking the layout.
2. **Terminology & Quick Access Drawer**:
   - Container labeled `ทางลัด` (Thai) / `Quick Access` (English).
   - `วันนี้` / `Today` strictly used for today's case activity.
3. **Login Experience**:
   - Clean persona cards for one-click demo access without exposing raw passwords or internal IPs.
4. **Configuration Table Hierarchy**:
   - Distinct presentation of `TYPE` → `VALUE` → `DETAILS`.
   - Scroll containment on vendor RMA procedure guides so long text does not stretch columns.
5. **Authentication State Teardown**:
   - Complete cleanup on logout (token destroyed, navigation hidden, drawers closed, inputs reset).
