/**
 * ClaimIT Comprehensive Automated Test Suite
 * Tests Auth, RBAC, User Management, Viability Boundary Rules, Max 5 Assets,
 * State Machine, Evidence Storage, IDOR Security, PDPA Sanitization Gate,
 * PDF Report Generation, Automated Database Backup, and Health Check.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { app, server } = require('./server');
const { calculateServerViability } = require('./services/claimService');
const { performBackup } = require('./scripts/backup');

const PORT = process.env.PORT || 8847;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let adminToken = '';
let staffToken = '';
let createdClaimId = null;
let uploadedEvidenceId = null;

// HTTP Request Helper
function makeRequest(method, endpoint, data = null, token = null, isMultipart = false, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(endpoint, BASE_URL);
    const headers = { 'Connection': 'close', ...customHeaders };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let payload = '';
    if (data && !isMultipart) {
      payload = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        let parsed = responseBody;
        try {
          parsed = JSON.parse(responseBody);
        } catch (e) {}
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });

    req.on('error', err => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

// Multipart Upload Helper
function uploadFile(endpoint, filePath, fieldName = 'file', extraFields = {}, token = null) {
  return new Promise((resolve, reject) => {
    const boundary = '----ClaimITBoundary' + Date.now();
    const parsedUrl = new URL(endpoint, BASE_URL);
    const headers = {
      'Connection': 'close',
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    let bodyHeader = '';
    for (const [k, v] of Object.entries(extraFields)) {
      bodyHeader += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
    }

    bodyHeader += `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: image/png\r\n\r\n`;
    const bodyFooter = `\r\n--${boundary}--\r\n`;

    const totalLength = Buffer.byteLength(bodyHeader) + fileContent.length + Buffer.byteLength(bodyFooter);
    headers['Content-Length'] = totalLength;

    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: headers
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        let parsed = responseBody;
        try { parsed = JSON.parse(responseBody); } catch (e) {}
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', err => reject(err));
    req.write(bodyHeader);
    req.write(fileContent);
    req.write(bodyFooter);
    req.end();
  });
}

// Assert Helper
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ ${message}`);
}

async function runTests() {
  console.log('===============================================================');
  console.log(`🚀 ClaimIT Comprehensive Automated Test Suite (Port: ${PORT})`);
  console.log('===============================================================\n');

  if (server && !server.listening) {
    await new Promise(resolve => server.on('listening', resolve));
  }

  // Allow database initialization to settle
  await new Promise(r => setTimeout(r, 600));

  try {
    // TEST 1: Health Check Endpoint
    console.log('--- TEST 1: Health Check Endpoint (GET /health) ---');
    const healthRes = await makeRequest('GET', '/health');
    assert(healthRes.status === 200, `Health check returned 200 (Got: ${healthRes.status})`);
    assert(healthRes.data.status === 'UP', `System status is UP`);
    assert(healthRes.data.database === 'CONNECTED', `Database is CONNECTED`);

    // TEST 2: Authentication & Password Security
    console.log('\n--- TEST 2: Authentication & Password Security ---');
    // 2.1 Valid Admin Login
    const adminLogin = await makeRequest('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    assert(adminLogin.status === 200, 'Admin login succeeded (200)');
    assert(adminLogin.data.token && adminLogin.data.role === 'admin', 'JWT token issued with admin role');
    adminToken = adminLogin.data.token;

    // 2.2 Valid Staff Login
    const staffLogin = await makeRequest('POST', '/api/auth/login', { username: 'staff', password: 'staff123' });
    assert(staffLogin.status === 200, 'Staff login succeeded (200)');
    staffToken = staffLogin.data.token;

    // 2.3 Wrong Password Rejection
    const badLogin = await makeRequest('POST', '/api/auth/login', { username: 'admin', password: 'wrongpassword' });
    assert(badLogin.status === 401, 'Wrong password correctly rejected (401)');

    // 2.4 Missing Token Rejection
    const noTokenRes = await makeRequest('GET', '/api/users');
    assert(noTokenRes.status === 401, 'Unauthenticated request to protected route blocked (401)');

    // 2.5 Self Password Change
    const selfChangeFail = await makeRequest('POST', '/api/auth/change-password', {
      username: 'staff',
      current_password: 'WrongCurrentPassword',
      new_password: 'NewStaffPassword123!'
    });
    assert(selfChangeFail.status === 400, 'Self change password with wrong old password rejected (400)');

    const selfChangeOk = await makeRequest('POST', '/api/auth/change-password', {
      username: 'staff',
      current_password: 'staff123',
      new_password: 'staff123'
    });
    assert(selfChangeOk.status === 200, 'Self change password with valid old password succeeded (200)');

    // TEST 3: RBAC & Permission Enforcement
    console.log('\n--- TEST 3: Role-Based Access Control (RBAC) ---');
    // Staff trying to access Admin-only route (/api/users)
    const staffOnAdminRoute = await makeRequest('GET', '/api/users', null, staffToken);
    assert(staffOnAdminRoute.status === 403, 'Staff access to admin-only user list blocked (403)');

    // Admin access to Admin route
    const adminOnAdminRoute = await makeRequest('GET', '/api/users', null, adminToken);
    assert(adminOnAdminRoute.status === 200, 'Admin access to user list permitted (200)');

    // TEST 4: Full User Management CRUD & Lifecycle
    console.log('\n--- TEST 4: Full User Management CRUD & Lifecycle ---');
    const testUsername = `user_lifecycle_${Date.now()}`;
    const createUserRes = await makeRequest('POST', '/api/users', {
      username: testUsername,
      password: 'TemporaryPass123!',
      role: 'staff',
      name: 'Dr. Test Lifecycle',
      department: 'Surgery'
    }, adminToken);
    assert(createUserRes.status === 200, 'Admin successfully created new user (200)');
    const createdUserId = createUserRes.data.id;

    // Edit user details
    const editUserRes = await makeRequest('PUT', `/api/users/${createdUserId}`, {
      role: 'staff',
      name: 'Dr. Test Senior',
      department: 'Cardiology'
    }, adminToken);
    assert(editUserRes.status === 200, 'Admin successfully updated user details (200)');

    // Admin trying to deactivate self blocked by safeguard
    const selfDeleteRes = await makeRequest('DELETE', `/api/users/1`, null, adminToken);
    assert(selfDeleteRes.status === 400, 'Admin deactivating own account blocked by system safeguard (400)');

    // Deactivate user
    const deactUserRes = await makeRequest('DELETE', `/api/users/${createdUserId}`, null, adminToken);
    assert(deactUserRes.status === 200, 'Admin successfully deactivated user (200)');

    // Deactivated user login blocked
    const deactLoginRes = await makeRequest('POST', '/api/auth/login', { username: testUsername, password: 'TemporaryPass123!' });
    assert(deactLoginRes.status === 401 || deactLoginRes.status === 403, 'Deactivated user blocked from logging in');

    // Reactivate user
    const reactUserRes = await makeRequest('POST', `/api/users/${createdUserId}/reactivate`, null, adminToken);
    assert(reactUserRes.status === 200, 'Admin successfully reactivated user (200)');

    // Admin reset password
    const resetPassRes = await makeRequest('POST', `/api/users/${createdUserId}/reset-password`, {
      new_password: 'ResetPasswordSuccess99!'
    }, adminToken);
    assert(resetPassRes.status === 200, 'Admin successfully reset user password (200)');

    const reactLoginRes = await makeRequest('POST', '/api/auth/login', { username: testUsername, password: 'ResetPasswordSuccess99!' });
    assert(reactLoginRes.status === 200, 'Reactivated user login with reset password succeeded (200)');

    // TEST 5: Viability Score Boundary Calculations
    console.log('\n--- TEST 5: Viability Score Boundary Calculations (Server-authoritative) ---');
    const viableAsset = [{
      asset_tag: 'TEST-V1',
      warrantyStart: new Date().toISOString().split('T')[0],
      warrantyMonths: 36,
      expectedLifespanMonths: 60,
      purchasePrice: 20000,
      status: 'Working'
    }];
    const viableResult = calculateServerViability(viableAsset);
    assert(viableResult.score <= 5.0, `Under warranty item score is ${viableResult.score} <= 5.0`);
    assert(viableResult.isViable === true, 'Viability status is VIABLE');

    const expiredAsset = [{
      asset_tag: 'TEST-E1',
      warrantyStart: '2015-01-01',
      warrantyMonths: 24,
      expectedLifespanMonths: 36,
      purchasePrice: 15000,
      status: 'Broken'
    }];
    const expiredResult = calculateServerViability(expiredAsset);
    assert(expiredResult.score > 5.0, `Expired item score is ${expiredResult.score} > 5.0`);
    assert(expiredResult.isViable === false, 'Viability status is NOT_VIABLE');

    // TEST 6: PDPA Data Sanitization Security Gate
    console.log('\n--- TEST 6: Data Sanitization Security Gate & Wipe Confirmation Code ---');
    // Ensure test asset starts in unsanitized state for test idempotency
    const { db } = require('./db');
    await new Promise(r => db.run("UPDATE mains SET status = 'Broken' WHERE asset_tag = 'CIT-2022-TAB-03'", r));
    await new Promise(r => db.run("DELETE FROM rma_claims WHERE asset_tag = 'CIT-2022-TAB-03'", r));

    // 6.1 Unsanitized claim attempt on sensitive asset blocked by PDPA Gate
    const unsanitizedClaim = await makeRequest('POST', '/api/claims', {
      vendor_name: 'Apple',
      asset_tags: ['CIT-2022-TAB-03'], // Sensitive Tablet, not yet sanitized
      notes: 'Unsanitized claim attempt'
    }, staffToken);
    assert(unsanitizedClaim.status === 400, 'Claim on unsanitized sensitive asset blocked by PDPA Gate (400)');

    // 6.2 Bad Wipe Code
    const badWipe = await makeRequest('POST', '/api/assets/sanitize', {
      asset_tag: 'CIT-2022-TAB-03',
      wipe_code: 'WRONGCODE'
    }, staffToken);
    assert(badWipe.status === 400, 'Sanitization with incorrect authorization code rejected (400)');

    // 6.3 Valid Wipe Code "WIPED"
    const goodWipe = await makeRequest('POST', '/api/assets/sanitize', {
      asset_tag: 'CIT-2022-TAB-03',
      wipe_code: 'WIPED',
      sanitization_note: 'DoD 5220.22-M 3-pass overwrite completed'
    }, staffToken);
    assert(goodWipe.status === 200, 'Sanitization with valid code "WIPED" succeeded (200)');

    // 6.4 Single-Asset RMA Claim with Optional / Blank Expected Pickup Date
    const rmaNoDate = await makeRequest('POST', '/api/assets/claim', {
      asset_tag: 'CIT-2022-TAB-03',
      vendor_name: 'Apple Care Medical',
      vendor_rma_number: 'APPLE-RMA-2026',
      expected_return_date: ''
    }, staffToken);
    assert(rmaNoDate.status === 200, 'RMA claim without immediate pickup date accepted (200)');
    assert(rmaNoDate.data.status === 'Pending Pickup', 'Asset placed in Pending Pickup status');

    // Also sanitize other demo computer asset for multi-claim testing
    await makeRequest('POST', '/api/assets/sanitize', {
      asset_tag: 'CIT-2024-AIO-02',
      wipe_code: 'WIPED'
    }, staffToken);

    // TEST 7: Multi-Asset Claims & Max 5 Limit
    console.log('\n--- TEST 7: Multi-Asset Claim Rules (1-5 assets limit) ---');
    
    // 7.1 Create Claim with 1 asset (Allowed)
    const claim1 = await makeRequest('POST', '/api/claims', {
      vendor_name: 'Logitech Service',
      vendor_rma_number: 'LOGI-RMA-8847',
      asset_tags: ['032186040006'],
      notes: 'Camera sensor blur'
    }, staffToken);
    assert(claim1.status === 201, `Single-asset claim created successfully (201, ID: ${claim1.data.claim?.id})`);
    createdClaimId = claim1.data.claim.id;

    // 7.2 Create Claim with 5 sanitized/permissible assets (Allowed)
    const claim5 = await makeRequest('POST', '/api/claims', {
      vendor_name: 'IT Support Center',
      asset_tags: ['032186040006', '031709030031', 'CIT-2023-SCN-01', 'CIT-2024-AIO-02', 'CIT-2022-TAB-03'],
      notes: 'Batch annual warranty service'
    }, staffToken);
    assert(claim5.status === 201, `5-asset claim created successfully (201, Asset count: ${claim5.data.claim?.asset_count})`);

    // 7.3 Attempt to Create Claim with 6 assets (Hard Limit Violation -> 400)
    const claim6 = await makeRequest('POST', '/api/claims', {
      vendor_name: 'IT Center',
      asset_tags: ['032186040006', '031709030031', 'CIT-2023-SCN-01', 'CIT-2024-AIO-02', 'CIT-2022-TAB-03', 'CIT-2021-AIO-01']
    }, staffToken);
    assert(claim6.status === 400, '6-asset claim correctly rejected by backend (400)');

    // 7.4 Attempt to Create Claim with Duplicate Assets
    const claimDup = await makeRequest('POST', '/api/claims', {
      vendor_name: 'IT Center',
      asset_tags: ['032186040006', '032186040006']
    }, staffToken);
    assert(claimDup.status === 400, 'Claim with duplicate asset tags rejected (400)');

    // TEST 8: Claim State Machine Transitions
    console.log('\n--- TEST 8: Controlled State Machine Transitions ---');
    // Valid transition: DRAFT -> VIABLE
    const trans1 = await makeRequest('PUT', `/api/claims/${createdClaimId}/status`, { status: 'VIABLE' }, staffToken);
    assert(trans1.status === 200, 'Valid transition DRAFT -> VIABLE succeeded (200)');

    // Valid transition: VIABLE -> CONFIRMED
    const trans2 = await makeRequest('PUT', `/api/claims/${createdClaimId}/status`, { status: 'CONFIRMED' }, staffToken);
    assert(trans2.status === 200, 'Valid transition VIABLE -> CONFIRMED succeeded (200)');

    // Invalid transition: CONFIRMED -> CLOSED (Arbitrary jump blocked)
    const transInvalid = await makeRequest('PUT', `/api/claims/${createdClaimId}/status`, { status: 'CLOSED' }, staffToken);
    assert(transInvalid.status === 400, 'Arbitrary invalid state transition blocked by backend (400)');

    // 8.1 Test Asset State Synchronization on Claim Cancellation
    const syncClaim = await makeRequest('POST', '/api/claims', {
      vendor_name: 'Dell Service',
      asset_tags: ['031709030031']
    }, staffToken);
    assert(syncClaim.status === 201, 'Test sync claim created (201)');
    const syncClaimId = syncClaim.data.claim.id;

    // Check asset is Pending Pickup
    const checkBeforeCancel = await makeRequest('GET', '/api/assets/031709030031', null, staffToken);
    assert(checkBeforeCancel.data.status === 'Pending Pickup', 'Asset status set to Pending Pickup upon claim creation');

    // Cancel the claim
    const cancelRes = await makeRequest('PUT', `/api/claims/${syncClaimId}/status`, { status: 'CANCELLED' }, staffToken);
    assert(cancelRes.status === 200, 'Claim transitioned to CANCELLED (200)');

    // Verify asset status was synchronized back to Working
    const checkAfterCancel = await makeRequest('GET', '/api/assets/031709030031', null, staffToken);
    assert(checkAfterCancel.data.status === 'Working', 'Asset status synchronized back to Working upon claim cancellation');

    // 8.2 Test Database-Wide Inventory Summary Endpoint
    const summaryRes = await makeRequest('GET', '/api/assets/summary', null, staffToken);
    assert(summaryRes.status === 200, 'Inventory summary endpoint returned 200');
    assert(typeof summaryRes.data.total === 'number' && typeof summaryRes.data.working === 'number', 'Inventory summary contains accurate counts');

    // TEST 9: Evidence Upload, Storage & IDOR Protection
    console.log('\n--- TEST 9: Private Evidence Storage & IDOR Access Control ---');
    const testImagePath = path.join(__dirname, 'test_evidence.png');
    fs.writeFileSync(testImagePath, Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2D0000000049454E44AE426082', 'hex'));

    const uploadRes = await uploadFile('/api/evidence/upload', testImagePath, 'file', {
      claim_id: createdClaimId,
      asset_tag: '032186040006'
    }, staffToken);

    assert(uploadRes.status === 201, `Evidence uploaded successfully (201, Storage Key: ${uploadRes.data.evidence?.storage_key})`);
    uploadedEvidenceId = uploadRes.data.evidence.id;

    // Stream view evidence (Authenticated)
    const viewRes = await makeRequest('GET', `/api/evidence/${uploadedEvidenceId}/view`, null, staffToken);
    assert(viewRes.status === 200, 'Authenticated stream view of evidence succeeded (200)');

    // IDOR Protection: Unauthenticated request to view evidence blocked
    const unauthView = await makeRequest('GET', `/api/evidence/${uploadedEvidenceId}/view`);
    assert(unauthView.status === 401, 'Unauthenticated IDOR attempt on evidence stream blocked (401)');

    if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);

    // TEST 10: PDF Report Generation
    console.log('\n--- TEST 10: Multi-Asset PDF Report Generation ---');
    const pdfRes = await makeRequest('GET', `/api/claims/${createdClaimId}/pdf`, null, staffToken);
    assert(pdfRes.status === 200, 'Multi-asset PDF report generated and downloaded successfully (200)');
    assert(pdfRes.headers['content-type'] === 'application/pdf', 'Response Content-Type is application/pdf');

    // TEST 11: Immutable Audit Log Verification
    console.log('\n--- TEST 11: Immutable Audit Log Verification ---');
    const auditRes = await makeRequest('GET', '/api/audit-logs', null, staffToken);
    assert(auditRes.status === 200, 'Audit logs retrieved successfully (200)');
    assert(Array.isArray(auditRes.data) && auditRes.data.length > 0, `Audit logs recorded (${auditRes.data.length} entries)`);

    // TEST 12: Automated SQLite Database Backup & Authorization
    console.log('\n--- TEST 12: Automated SQLite Database Backup & Email Route ---');
    const unauthBackup = await makeRequest('POST', '/api/backup', null);
    assert(unauthBackup.status === 401, 'Unauthenticated backup request blocked (401)');

    const staffBackup = await makeRequest('POST', '/api/backup', null, staffToken);
    assert(staffBackup.status === 403, 'Staff backup request blocked by RBAC (403)');

    const backupRes = await makeRequest('POST', '/api/backup', null, adminToken);
    assert(backupRes.status === 200, 'Admin database backup triggered via maintenance API (200)');
    assert(backupRes.data.fileName && backupRes.data.fileName.startsWith('claimit_backup_'), 'Backup filename properly formatted');

    // Email dispatch test
    const emailRes = await makeRequest('POST', '/api/email/send', {
      to: 'nurse@hospital.local',
      subject: 'ClaimIT Test Notification',
      html: '<p>Hospital equipment notification</p>'
    }, staffToken);
    assert(emailRes.status === 200, 'Mounted /api/email/send dispatches successfully (200)');

    // =========================================================================
    // PROMPT 1: Depreciation Calculations & Historical Repair Cost Ledger
    // =========================================================================
    console.log('\n--- TEST 13: Straight-Line Depreciation Floor (BV >= 1.00 THB) ---');
    const { calculateStraightLineBV, calculateDynamicViability } = require('./claim_calculator');

    // 13.1 Fresh asset (0 months age)
    const freshBV = calculateStraightLineBV(20000, 0, 60);
    assert(freshBV === 20000, `Fresh asset (0 mo) Book Value equals purchase price: ฿${freshBV}`);

    // 13.2 Mid-life asset (30 of 60 months)
    const midBV = calculateStraightLineBV(20000, 30, 60);
    assert(midBV === 10000, `Mid-life asset (30 mo) Book Value is half purchase price: ฿${midBV}`);

    // 13.3 Expired asset (72 of 60 months -> 120% expired)
    const expiredBV = calculateStraightLineBV(18500, 72, 60);
    assert(expiredBV === 1.0, `Expired asset (72/60 mo) Book Value never drops below 1.00 THB (Got: ฿${expiredBV})`);

    // 13.4 Ancient asset (120 of 36 months)
    const ancientBV = calculateStraightLineBV(50000, 120, 36);
    assert(ancientBV === 1.0, `Ancient asset (120/36 mo) Book Value strictly floors at 1.00 THB (Got: ฿${ancientBV})`);

    // 13.5 Zero/Negative price edge case
    const zeroBV = calculateStraightLineBV(0, 10, 60);
    assert(zeroBV === 1.0, `Zero price asset Book Value remains at 1.00 THB (Got: ฿${zeroBV})`);

    console.log('\n--- TEST 14: Dynamic Viability & Cost Ledger ($BV * 0.5 Threshold) ---');
    // 14.1 Add record to repair cost history ledger via API
    const addLedgerRes = await makeRequest('POST', '/api/claims/cost-ledger', {
      asset_id: 1,
      asset_category: 'Computer',
      issue_category: 'Motherboard Failure',
      part_name: 'OptiPlex Motherboard V2',
      cost_thb: 4500,
      vendor_name: 'Dell Thailand Service'
    }, staffToken);
    assert(addLedgerRes.status === 201, 'Repair cost record added to ledger via API (201)');

    // 14.2 Query cost ledger
    const queryLedgerRes = await makeRequest('GET', '/api/claims/cost-ledger?asset_category=Computer', null, staffToken);
    assert(queryLedgerRes.status === 200, 'Cost ledger records retrieved successfully (200)');
    assert(queryLedgerRes.data.total > 0, `Cost ledger contains ${queryLedgerRes.data.total} records`);

    // 14.3 Viability Calculation: Obsolete asset (BV=฿1, Cost=฿4,500 > BV*0.5=฿0.50 -> "Salvage / Write-off")
    const salvageEval = calculateDynamicViability({
      purchase_price: 18500,
      age_in_months: 72,
      expected_lifespan_months: 48,
      category: 'Computer',
      repair_cost: 4500
    });
    assert(salvageEval.recommendation === 'Salvage / Write-off', `Obsolete asset recommended for Salvage / Write-off (Got: ${salvageEval.recommendation})`);
    assert(salvageEval.book_value_thb === 1.0, `Book Value is ฿1.00 THB`);
    assert(salvageEval.formula_breakdown.threshold_value === 0.5, `Threshold value is ฿0.50 THB (BV * 0.5)`);

    // 14.4 Viability Calculation: Viable new asset (BV=฿19,600, Cost=฿3,200 <= BV*0.5=฿9,800 -> "RMA / Repair")
    const repairEval = calculateDynamicViability({
      purchase_price: 24500,
      age_in_months: 12,
      expected_lifespan_months: 60,
      category: 'Computer',
      repair_cost: 3200
    });
    assert(repairEval.recommendation === 'RMA / Repair', `Valuable asset recommended for RMA / Repair (Got: ${repairEval.recommendation})`);

    // 14.5 API calculate-viability endpoint
    const apiViabilityRes = await makeRequest('POST', '/api/claims/calculate-viability', {
      asset_tag: '031709030031', // Old Dell Monitor
      issue_category: 'Panel Defect'
    }, staffToken);
    assert(apiViabilityRes.status === 200, 'API /api/claims/calculate-viability returned 200');
    assert(apiViabilityRes.data.recommendation === 'Salvage / Write-off', 'Aged monitor evaluated as Salvage / Write-off');

    // =========================================================================
    // PROMPT 2: Receipt OCR Extraction, PDPA Sanitization & Serial Cross-Check
    // =========================================================================
    console.log('\n--- TEST 15: Receipt OCR, PDPA Masking & Serial Verification ---');
    const sampleInvoiceText = `
      บริษัท เดลล์ คอร์ปอเรชั่น (ประเทศไทย) จำกัด
      เลขประจำตัวผู้เสียภาษี: 0105537042598
      เลขที่ใบกำกับภาษี: INV-2026-998812
      วันที่: 2026-08-20
      ผู้ติดต่อ: นายสมชาย การุณย์
      เบอร์โทร: 089-123-4567
      เลขบัตรประชาชน: 1-1004-99887-12-3
      อีเมล: somchai.k@gmail.com
      รายการ: Replacement Motherboard OptiPlex 7090
      Serial Number: DELL-OPT-21
      จำนวนเงินรวมทั้งสิ้น: ฿4,500.00
    `;

    // 15.1 Direct OCR extraction with matching serial number
    const ocrMatchRes = await makeRequest('POST', '/api/evidence/ocr-extract', {
      text: sampleInvoiceText,
      asset_tag: 'CIT-2021-AIO-01' // Asset with S/N DELL-OPT-21
    }, staffToken);
    assert(ocrMatchRes.status === 200, 'OCR extract endpoint returned 200');
    assert(ocrMatchRes.data.ocr.vendor_tax_id === '0105537042598', `Extracted Thai Tax ID: ${ocrMatchRes.data.ocr.vendor_tax_id}`);
    assert(ocrMatchRes.data.ocr.total_amount_thb === 4500, `Extracted Amount: ฿${ocrMatchRes.data.ocr.total_amount_thb}`);
    assert(ocrMatchRes.data.ocr.extracted_serial_number === 'DELL-OPT-21', `Extracted Serial Number: ${ocrMatchRes.data.ocr.extracted_serial_number}`);

    // 15.2 PDPA Sanitization Check (Phone, Citizen ID, Personal Email masked)
    const sanitizedText = ocrMatchRes.data.ocr.sanitized_text;
    assert(!sanitizedText.includes('089-123-4567') && sanitizedText.includes('089-***-4567'), 'PDPA: Phone number masked');
    assert(!sanitizedText.includes('1-1004-99887-12-3') && sanitizedText.includes('1-****-*****-**-3'), 'PDPA: Thai Citizen ID masked');
    assert(!sanitizedText.includes('somchai.k@gmail.com') && sanitizedText.includes('s***k@gmail.com'), 'PDPA: Personal email address masked');

    // 15.3 Serial Number Match Verification
    assert(ocrMatchRes.data.serial_validation.match === true, 'Serial verification PASSED when document S/N matches asset S/N');

    // 15.4 Serial Number Mismatch Alert
    const ocrMismatchRes = await makeRequest('POST', '/api/evidence/ocr-extract', {
      text: sampleInvoiceText,
      asset_tag: '032186040006' // Asset with S/N SN9988 (differs from DELL-OPT-21)
    }, staffToken);
    assert(ocrMismatchRes.status === 200, 'OCR extract for mismatched asset returned 200');
    assert(ocrMismatchRes.data.serial_validation.match === false, 'Serial mismatch ALERT triggered when OCR serial != asset serial');

    // =========================================================================
    // PROMPT 3: AI Missing Information Inquirer & Vendor RMA Brief Generator
    // =========================================================================
    console.log('\n--- TEST 16: AI Intake Diagnostics & Bilingual Vendor RMA Brief ---');
    // 16.1 Incomplete intake (Missing power state, liquid, physical drop details)
    const incompleteIntake = await makeRequest('POST', '/api/claims/validate-intake', {
      description: 'เครื่องเสีย ใช้งานไม่ได้',
      issue_symptoms: 'เปิดโปรแกรมไม่ขึ้น',
      device_type: 'Computer'
    }, staffToken);
    assert(incompleteIntake.status === 200, 'Intake validation endpoint returned 200');
    assert(incompleteIntake.data.missing_details === true, 'Incomplete intake flagged with missing_details = true');
    assert(incompleteIntake.data.follow_up_questions.length >= 2, `Generated ${incompleteIntake.data.follow_up_questions.length} diagnostic follow-up questions`);

    // 16.2 Complete intake
    const completeIntake = await makeRequest('POST', '/api/claims/validate-intake', {
      description: 'คอมพิวเตอร์เปิดไม่ติด ไฟ Power LED กระพริบสีส้ม 2 ครั้ง ไม่มีเสียง Beep',
      issue_symptoms: 'ไม่เคยโดนน้ำหรือของเหลว สภาพบอดี้ปกติไม่มีรอยตกหล่นหรือแตกหัก',
      device_type: 'Computer'
    }, staffToken);
    assert(completeIntake.status === 200, 'Complete intake validation returned 200');
    assert(completeIntake.data.missing_details === false, 'Complete intake verified with missing_details = false');

    // 16.3 Vendor RMA Dispatch Brief Generation
    const rmaBriefRes = await makeRequest('POST', `/api/claims/${createdClaimId}/generate-rma-brief`, null, staffToken);
    assert(rmaBriefRes.status === 200, 'Generate RMA Brief endpoint returned 200');
    assert(rmaBriefRes.data.brief_markdown && rmaBriefRes.data.brief_markdown.includes('HOSPITAL IT WARRANTY & RMA DISPATCH NOTE'), 'Bilingual RMA Brief generated');
    assert(rmaBriefRes.data.structured_data.assets.length > 0, 'RMA Brief contains structured asset records');

    // =========================================================================
    // PROMPT 4: Human-in-the-Loop Override Governance & Quality Gates
    // =========================================================================
    console.log('\n--- TEST 17: Human-in-the-Loop Override Governance & Quality Gates ---');
    // 17.1 Override without reason -> Rejected with HTTP 400
    const overrideNoReason = await makeRequest('POST', `/api/claims/${createdClaimId}/override-recommendation`, {
      overridden_recommendation: 'RMA / Repair',
      override_reason: '' // Empty string
    }, staffToken);
    assert(overrideNoReason.status === 400, 'Override request with empty reason rejected with HTTP 400');

    // 17.2 Override with missing reason parameter -> Rejected with HTTP 400
    const overrideMissingReason = await makeRequest('POST', `/api/claims/${createdClaimId}/override-recommendation`, {
      overridden_recommendation: 'Salvage / Write-off'
    }, staffToken);
    assert(overrideMissingReason.status === 400, 'Override request with missing reason rejected with HTTP 400');

    // 17.3 Override with whitespace-only reason -> Rejected with HTTP 400
    const overrideWhitespaceReason = await makeRequest('POST', `/api/claims/${createdClaimId}/override-recommendation`, {
      overridden_recommendation: 'RMA / Repair',
      override_reason: '     '
    }, staffToken);
    assert(overrideWhitespaceReason.status === 400, 'Override request with whitespace-only reason rejected with HTTP 400');

    // 17.4 Valid Override Request with Justification
    const validOverride = await makeRequest('POST', `/api/claims/${createdClaimId}/override-recommendation`, {
      overridden_recommendation: 'RMA / Repair',
      override_reason: 'Critical medical workstation controller with specialized legacy software (No modern replacement available in ICU)',
      previous_recommendation: 'Salvage / Write-off'
    }, staffToken);
    assert(validOverride.status === 200, 'Valid override with non-empty reason accepted (200)');
    assert(validOverride.data.audit_log_code && validOverride.data.audit_log_code.startsWith('CHG-'), 'Immutable audit log code generated for override');

    // 17.5 Verify immutable audit trail recorded the override
    const auditCheckRes = await makeRequest('GET', '/api/audit-logs?search=Override+Recommendation', null, staffToken);
    assert(auditCheckRes.status === 200, 'Audit logs search returned 200');
    const foundOverrideLog = (auditCheckRes.data || []).some(l => l.details && l.details.includes('Critical medical workstation controller'));
    assert(foundOverrideLog === true, 'Override justification permanently preserved in immutable audit log');

    console.log('\n===============================================================');
    console.log('🎉 ALL 17 COMPREHENSIVE AUTOMATED TEST STAGES PASSED (100%)!');
    console.log('===============================================================\n');

  } finally {
    if (server && server.listening) {
      server.close();
    }
  }

  process.exit(0);
}

runTests().catch(err => {
  console.error('💥 Test suite crashed with error:', err);
  process.exit(1);
});
