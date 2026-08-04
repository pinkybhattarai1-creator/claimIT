# ClaimIT: Hospital IT Warranty & RMA Management System Implementation Plan

This plan outlines the architecture and workflow for the ClaimIT system, specifically tailored for a **Hospital IT Support Environment**. It prioritizes strict data security (ISO standards), legal compliance (PDPA), and a realistic Return Merchandise Authorization (RMA) workflow for medical/IT assets.

## User Review Required

> [!IMPORTANT]
> Please review the **Brand-Specific Claiming Procedures Integration** section. I have extracted the procedures for IDA, Dell, Lenovo, TSC, and Acer from your images and proposed a way to integrate them into the IT Admin Portal.

## Open Questions

> [!WARNING]
> 1. **Data Sanitization:** Before an IT asset (e.g., a PC hard drive) is sent outside to a vendor (Acer, HP) for a warranty claim, do you have a standard operating procedure (SOP) for wiping the data? Should the ClaimIT system include a mandatory "Data Wiped" checkbox before allowing the status to change to "Out for Claim"?
> 2. **Authentication:** For the "us" (IT Staff) side, should we build a standalone login system, or do you want to integrate with the hospital's existing Active Directory/LDAP?
> 3. **Are there any other brands** you would like to add claiming procedures for in the future? The system will be designed to easily add more.

## Brand-Specific Claiming Procedures Integration (NEW)

To integrate the 5 vendor procedures into the program, I will modify the IT Admin Portal's "Send to Vendor RMA" section. 

**Proposed Changes:**
1. **Vendor Selection Dropdown:** Instead of just a text input for the vendor name, we will provide a searchable dropdown or preset buttons for the supported vendors (IDA, Dell, Lenovo, TSC, Acer), plus an "Other" option.
2. **Dynamic Procedure Panel:** When a specific brand is selected, a panel will appear displaying the exact step-by-step claiming instructions specific to that brand (extracted from your images).
3. **Data Extraction:** The procedures have been transcribed into Thai exactly as provided:
   - **IDA**: Email contact, info required, wait for pickup.
   - **Dell**: Take photos with ServiceTag, call support, email photos, keep old tag for new device, test.
   - **Lenovo**: Use warranty lookup website, enter S/N, select contact channel.
   - **TSC**: Call/Line, send photos/video, document signing for equipment leaving premises, ID card copy upon return.
   - **Acer**: Email support, specific instructions for mouse/keyboard claims requiring the PC's S/N.

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
4.  **Vendor Claim Initiated:** IT selects the brand, views the **Brand-Specific Procedure**, follows the steps, and marks item as "Out to Vendor".
5.  **Resolution:** Item returns, is tested, and marked "In / Active", returning to the `stock_floor`.

### 2. Dual Portal System (The "Two Sides")
*   **Ward/Department Portal (The "User" side):** A simple, read-only interface where hospital staff can scan an asset tag to see if IT is already fixing it or if it's under warranty.
*   **IT Department Portal (The "Us" side):** A secure dashboard to manage the RMA lifecycle.

## Database Schema (Hospital Context)

**`mains` (Core IT Assets)**
*   `id` (PK), `asset_tag`, `category`, `brand`, `model`, `serial_no`, `Device_name`
*   `location` (FK)
*   `warranty_start_date`, `warranty_end_date`
*   `sanitization_required` (Boolean)

**`move_log` (ISO Audit Trail)**
*   `id` (PK), `serial_no` / `asset_tag` (FK)
*   `department_name`, `floor`, `status`
*   `moved` (in/out)
*   `action_by_user_id`

**`rma_claims`**
*   `id` (PK), `asset_id` (FK)
*   `vendor_rma_number`, `claim_date`, `expected_return_date`
*   `data_wiped_confirmed` (Boolean)

## Verification Plan

### Automated Tests
- None currently specified.

### Manual Verification
1.  **UI Verification:** Log in as IT Admin, select a broken asset, proceed to RMA form. Select each brand (IDA, Dell, Lenovo, TSC, Acer) and verify the correct procedure instructions appear.
2.  **Workflow Test:** Simulate a claim process following the displayed instructions and submitting the RMA form.
