# ClaimIT: Hospital IT Warranty & RMA Management System Implementation Plan

This plan outlines the architecture and workflow for the ClaimIT system, specifically tailored for a **Hospital IT Support Environment**. It prioritizes strict data security (ISO standards), legal compliance (PDPA), and a realistic Return Merchandise Authorization (RMA) workflow for medical/IT assets.

## Problem Statement & Background
Hospital IT departments manage critical infrastructure (PCs, Barcode Scanners, AIOs) across various wards and departments. When an asset fails, the warranty claim (RMA) process must be initiated swiftly. However, this process must adhere to strict security protocols: ensuring no Protected Health Information (PHI) or unnecessary Personally Identifiable Information (PII) leaves the premises, maintaining an unalterable audit trail (ISO 27001), and accurately tracking the asset's physical location.

## User Review Required

> [!IMPORTANT]
> Please review the heavily revised **Security & Compliance** and **RMA Workflow** sections. As this is for a hospital, ensuring we meet your internal security audits is the highest priority.

## Open Questions

> [!WARNING]
> 1. **Data Sanitization:** Before an IT asset (e.g., a PC hard drive) is sent outside to a vendor (Acer, HP) for a warranty claim, do you have a standard operating procedure (SOP) for wiping the data? Should the ClaimIT system include a mandatory "Data Wiped" checkbox before allowing the status to change to "Out for Claim"?
> 2. **Network Segregation:** To maintain "next to no connection to the outside", will this server sit on a specific isolated Hospital IT VLAN? 
> 3. **Authentication:** For the "us" (IT Staff) side, should we build a standalone login system, or do you want to integrate with the hospital's existing Active Directory/LDAP?

## Proposed Architecture & Security (PDPA / ISO)

The architecture is a localized MVC pattern, strictly isolated from external networks to prevent data breaches.

*   **Pattern:** MVC (Model-View-Controller)
*   **Infrastructure:** On-Premise Node.js/Express Server. 
*   **Database:** Local PostgreSQL or SQLite.
*   **PDPA Compliance (Data Minimization):** The database will *strictly* store Asset Data (Serial No, Brand) and IT tracking data. **Under no circumstances will Patient Data or non-IT Staff PII be entered into this system.** 
*   **ISO 27001 Compliance (Audit & Access):**
    *   **RBAC (Role-Based Access Control):** Different views for "User" (e.g., Ward Nurse reporting a broken scanner - can only see status) vs "IT Admin" (can initiate claims).
    *   **Immutable Audit Logs:** Every movement (`move_log`) and status change is recorded with a timestamp and the user ID who made the change.

## Key Features & Realistic RMA Workflow

### 1. The RMA (Return Merchandise Authorization) Lifecycle
Instead of just a "warranty checker", the system will manage the physical reality of a hospital claim:
1.  **Fault Reported:** Asset flagged as broken.
2.  **Warranty Verification:** Camera scans the tag OR IT inputs the Asset Tag. System checks local DB (`mains`) and calculates if the warranty is active based on the scanned/stored dates.
3.  **Sanitization Check (Security Gate):** System prompts IT to confirm if storage media has been removed or securely wiped (PDPA protection).
4.  **Vendor Claim Initiated:** Item marked as "Out to Vendor".
5.  **Resolution:** Item returns, is tested, and marked "In / Active", returning to the `stock_floor`.

### 2. Dual Portal System (The "Two Sides")
*   **Ward/Department Portal (The "User" side):** A simple, read-only interface where hospital staff (e.g., in Ward 20) can scan an asset tag using a tablet/phone camera to see if IT is already fixing it or if it's under warranty.
*   **IT Department Portal (The "Us" side):** A secure dashboard to manage the RMA lifecycle, update the `move_log`, and oversee the `stock_department` inventory.

### 3. Camera Integration & AI Tag Parsing (On-Device)
*   We will use the HTML5 WebRTC API for camera access.
*   To maintain the strict "no outside connection" rule, any OCR or AI parsing of the complex "old" and "new" tags MUST happen locally. We will use a local heuristic parser in the Controller to extract the `Year`, `Version`, and `Status` from the raw text.

## Database Schema (Hospital Context)

**`mains` (Core IT Assets)**
*   `id` (PK), `asset_tag`, `category`, `brand`, `model`, `serial_no`, `Device_name`
*   `location` (FK -> `stock_floor.id` or `stock_department.id`)
*   `warranty_start_date`, `warranty_end_date` (Parsed from tags or manually entered)
*   **`sanitization_required` (Boolean - Does this device hold data?)**

**`move_log` (ISO Audit Trail)**
*   `id` (PK)
*   `serial_no` / `asset_tag` (FK)
*   `department_name`, `floor`, `status` (e.g., "Working", "Broken", "At Vendor")
*   `moved` (in/out)
*   **`action_by_user_id` (Who moved it? Critical for ISO)**

**`rma_claims` (New Table for Warranty Tracking)**
*   `id` (PK), `asset_id` (FK)
*   `vendor_rma_number`, `claim_date`, `expected_return_date`
*   **`data_wiped_confirmed` (Boolean - Security check)**

## Verification Plan

### Manual Verification
1.  **Security Audit:** Verify that no external API calls are made during the scanning or parsing process.
2.  **PDPA Check:** Review the database schema and UI forms to ensure no fields exist that could accidentally capture patient names or medical records.
3.  **Workflow Test:** Simulate a broken PC in "ต้อนรับ หน้า รพ." being scanned, data-wiped, sent to Acer, and returned, ensuring the `move_log` captures every step accurately.
