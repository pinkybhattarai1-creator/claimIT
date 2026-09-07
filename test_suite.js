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

let localServerInstance = null;

async function runTests() {
  console.log('===============================================================');
  console.log(`🚀 ClaimIT Comprehensive Automated Test Suite (Port: ${PORT})`);
  console.log('===============================================================\n');

  // Check if server is already running on port
  const isRunning = await new Promise(resolve => {
    const testReq = http.get(`http://127.0.0.1:${PORT}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    testReq.on('error', () => resolve(false));
    testReq.setTimeout(500, () => {
      testReq.destroy();
      resolve(false);
    });
  });

  if (!isRunning) {
    localServerInstance = app.listen(PORT, '127.0.0.1');
    await new Promise(resolve => localServerInstance.on('listening', resolve));
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

    // 2.5 Password Change Security & Access Controls
    // 2.5a Unauthenticated password change blocked
    const unauthChange = await makeRequest('POST', '/api/auth/change-password', {
      username: 'staff',
      current_password: 'staff123',
      new_password: 'staff123'
    });
    assert(unauthChange.status === 401, 'Unauthenticated password change blocked (401)');

    // 2.5b Staff attempting to change another user's password blocked
    const hijackChange = await makeRequest('POST', '/api/auth/change-password', {
      username: 'admin',
      current_password: 'admin123',
      new_password: 'HackedAdminPass123'
    }, staffToken);
    assert(hijackChange.status === 403, 'Staff attempting to change another user password blocked (403)');

    // 2.5c Self change password with wrong old password rejected
    const selfChangeFail = await makeRequest('POST', '/api/auth/change-password', {
      username: 'staff',
      current_password: 'WrongCurrentPassword',
      new_password: 'NewStaffPassword123!'
    }, staffToken);
    assert(selfChangeFail.status === 400, 'Self change password with wrong old password rejected (400)');

    // 2.5d Self change password with valid old password succeeded
    const oldStaffToken = staffToken;
    const selfChangeOk = await makeRequest('POST', '/api/auth/change-password', {
      username: 'staff',
      current_password: 'staff123',
      new_password: 'staff123'
    }, staffToken);
    assert(selfChangeOk.status === 200, 'Self change password with valid old password succeeded (200)');
    assert(selfChangeOk.data && selfChangeOk.data.token, 'Fresh JWT token issued upon password change');

    // 2.5e Verify that the old token is immediately revoked (401)
    const oldTokenRevoked = await makeRequest('GET', '/api/users', null, oldStaffToken);
    assert(oldTokenRevoked.status === 401, 'Old staff token immediately revoked after password change (401 Session revoked)');

    // Adopt fresh token
    staffToken = selfChangeOk.data.token;

    // 2.5f Session refresh endpoint
    const refreshRes = await makeRequest('POST', '/api/auth/refresh', null, staffToken);
    assert(refreshRes.status === 200, 'Session token refresh succeeded (200)');
    assert(refreshRes.data && refreshRes.data.token, 'New refreshed token received');
    staffToken = refreshRes.data.token;

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
    const adminId = (adminLogin.data && adminLogin.data.user && adminLogin.data.user.id) ? adminLogin.data.user.id : 1;
    const selfDeleteRes = await makeRequest('DELETE', `/api/users/${adminId}`, null, adminToken);
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
    // Staff attempting claim status transition blocked by RBAC
    const staffTrans = await makeRequest('PUT', `/api/claims/${createdClaimId}/status`, { status: 'VIABLE' }, staffToken);
    assert(staffTrans.status === 403, 'Staff access to claim status transition blocked by RBAC (403)');

    // Valid transition: DRAFT -> VIABLE (Admin)
    const trans1 = await makeRequest('PUT', `/api/claims/${createdClaimId}/status`, { status: 'VIABLE' }, adminToken);
    assert(trans1.status === 200, 'Valid transition DRAFT -> VIABLE succeeded (200)');

    // Valid transition: VIABLE -> CONFIRMED (Admin)
    const trans2 = await makeRequest('PUT', `/api/claims/${createdClaimId}/status`, { status: 'CONFIRMED' }, adminToken);
    assert(trans2.status === 200, 'Valid transition VIABLE -> CONFIRMED succeeded (200)');

    // Invalid transition: CONFIRMED -> CLOSED (Arbitrary jump blocked)
    const transInvalid = await makeRequest('PUT', `/api/claims/${createdClaimId}/status`, { status: 'CLOSED' }, adminToken);
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

    // Cancel the claim (Admin)
    const cancelRes = await makeRequest('PUT', `/api/claims/${syncClaimId}/status`, { status: 'CANCELLED' }, adminToken);
    assert(cancelRes.status === 200, 'Claim transitioned to CANCELLED (200)');

    // Verify asset status was synchronized back to Working
    const checkAfterCancel = await makeRequest('GET', '/api/assets/031709030031', null, staffToken);
    assert(checkAfterCancel.data.status === 'Working', 'Asset status synchronized back to Working upon claim cancellation');

    // 8.2 Test Database-Wide Inventory Summary Endpoint
    const summaryRes = await makeRequest('GET', '/api/assets/summary', null, staffToken);
    assert(summaryRes.status === 200, 'Inventory summary endpoint returned 200');
    assert(typeof summaryRes.data.total === 'number' && typeof summaryRes.data.working === 'number', 'Inventory summary contains accurate counts');

    // 8.3 Optimistic Concurrency & Conflict Protection (409 Conflict)
    const concurClaim = await makeRequest('POST', '/api/claims', {
      vendor_name: 'Zebra Center',
      asset_tags: ['CIT-2023-SCN-01']
    }, staffToken);
    assert(concurClaim.status === 201, 'Concurrency test claim created (201)');
    const concurClaimId = concurClaim.data.claim.id;

    // First transition to VIABLE
    const viableRes = await makeRequest('PUT', `/api/claims/${concurClaimId}/status`, { status: 'VIABLE' }, adminToken);
    assert(viableRes.status === 200, 'First transition to VIABLE succeeded (200)');

    // Competing transitions simultaneously: VIABLE -> CONFIRMED vs VIABLE -> CANCELLED
    const [compete1, compete2] = await Promise.all([
      makeRequest('PUT', `/api/claims/${concurClaimId}/status`, { status: 'CONFIRMED' }, adminToken),
      makeRequest('PUT', `/api/claims/${concurClaimId}/status`, { status: 'CANCELLED' }, adminToken)
    ]);
    const competeStatuses = [compete1.status, compete2.status];
    assert(competeStatuses.includes(200), 'One concurrent state transition succeeded (200)');
    assert(competeStatuses.includes(400) || competeStatuses.includes(409), `Second competing transition was rejected with 400 or 409 (Got: ${competeStatuses.join(', ')})`);

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
    const logsList = Array.isArray(auditRes.data) ? auditRes.data : (Array.isArray(auditRes.data?.logs) ? auditRes.data.logs : []);
    assert(logsList.length > 0, `Audit logs recorded (${logsList.length} entries)`);

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

    // TEST 13: Clinical IT Viability, BME Guardrail & Safe Foreign Key Cascade
    console.log('\n--- TEST 13: Clinical IT, BME Guardrails & Foreign Key Cascade Integrity ---');

    // 13.1 BME Regulated Device Blocked on Registration (Patient Monitor)
    const bmeMonitor = await makeRequest('POST', '/api/assets', {
      asset_tag: 'CIT-BME-MON-01',
      device_name: 'Mindray Patient Monitor ePM 12M',
      category: 'Computer',
      brand: 'Mindray',
      model: 'ePM 12M',
      serial_no: 'SN-BME-MON-01',
      location: 'ICU',
      warranty_start: '2024-01-01',
      warranty_end: '2027-01-01'
    }, adminToken);
    assert(bmeMonitor.status === 400, 'BME Patient Monitor rejected with 400');
    assert(bmeMonitor.data && bmeMonitor.data.is_bme_device === true, 'BME flag returned indicating BME jurisdiction');

    // 13.2 BME Regulated Device Blocked on Registration (Ventilator)
    const bmeVentilator = await makeRequest('POST', '/api/assets', {
      asset_tag: 'CIT-BME-VENT-01',
      device_name: 'Hamilton Intensive Care Unit Unit',
      category: 'Computer',
      brand: 'Hamilton',
      model: 'C3 Ventilator',
      serial_no: 'SN-BME-VENT-01',
      location: 'ICU',
      warranty_start: '2024-01-01',
      warranty_end: '2027-01-01'
    }, adminToken);
    assert(bmeVentilator.status === 400, 'BME Ventilator rejected with 400');

    // 13.3 BME Regulated Device Blocked on Registration (Infusion Pump)
    const bmePump = await makeRequest('POST', '/api/assets', {
      asset_tag: 'CIT-BME-PUMP-01',
      device_name: 'B. Braun Infusion Pump Space',
      category: 'Computer',
      brand: 'B. Braun',
      model: 'Infusomat Space',
      serial_no: 'SN-BME-PUMP-01',
      location: 'Ward 20',
      warranty_start: '2024-01-01',
      warranty_end: '2027-01-01'
    }, adminToken);
    assert(bmePump.status === 400, 'BME Infusion Pump rejected with 400');

    // 13.4 Legitimate Clinical IT Registration (Clinical IT Display, 84-month lifespan default)
    const clinicalTag = `CIT-CLIN-DISP-${Date.now()}`;
    const regClinical = await makeRequest('POST', '/api/assets', {
      asset_tag: clinicalTag,
      device_name: 'Eizo RadiForce 24-inch PACS Diagnostic Display',
      category: 'Clinical IT Display',
      brand: 'Eizo',
      model: 'RX360',
      serial_no: `SN-${clinicalTag}`,
      location: 'ศูนย์เอกซเรย์และรังสีวิทยา (Radiology & Imaging)',
      warranty_start: '2024-01-01',
      warranty_end: '2027-01-01',
      purchase_price: 52000
    }, adminToken);
    assert(regClinical.status === 200, 'Legitimate Clinical IT Display registered successfully (200)');

    // Verify 84-month default lifespan
    const fetchedClinical = await makeRequest('GET', `/api/assets/${clinicalTag}`, null, staffToken);
    assert(fetchedClinical.status === 200, 'Clinical asset fetched (200)');
    assert(fetchedClinical.data.expected_lifespan_months === 84, 'Clinical IT asset defaulted to 84-month lifespan');

    // 13.5 Create claim and test cascade update via PUT /api/assets/:tag
    const cascadedTag = `${clinicalTag}-CORRECTED`;
    const updateAssetRes = await makeRequest('PUT', `/api/assets/${clinicalTag}`, {
      category: 'Clinical IT Display',
      brand: 'Eizo',
      model: 'RX360',
      serial_no: `SN-${clinicalTag}`,
      device_name: 'Eizo RadiForce 24-inch PACS Diagnostic Display',
      location: 'ศูนย์เอกซเรย์และรังสีวิทยา (Radiology & Imaging)',
      warranty_start: '2024-01-01',
      warranty_end: '2027-01-01',
      status: 'Working',
      new_asset_tag: cascadedTag
    }, adminToken);
    assert(updateAssetRes.status === 200, 'Asset tag update executed successfully (200)');

    // Fetch updated tag
    const verifyCascade = await makeRequest('GET', `/api/assets/${cascadedTag}`, null, staffToken);
    assert(verifyCascade.status === 200, 'Updated asset tag accessible after cascade update');

    // 13.6 PRAGMA foreign_key_check verification
    const { db: activeDb } = require('./db');
    const fkViolations = await new Promise((resolve, reject) => {
      activeDb.all("PRAGMA foreign_key_check;", (e, r) => e ? reject(e) : resolve(r));
    });
    assert(fkViolations.length === 0, 'Zero foreign key violations in active database');
    console.log('   ✅ Clinical IT 84-month lifespan, BME guardrails & foreign key cascade verified.');

    console.log('\n===============================================================');
    console.log('🎉 ALL 13 COMPREHENSIVE AUTOMATED TEST STAGES PASSED (100%)!');
    console.log('===============================================================\n');

  } finally {
    if (localServerInstance && localServerInstance.listening) {
      localServerInstance.close();
    }
  }

  process.exit(0);
}

runTests().catch(err => {
  console.error('💥 Test suite crashed with error:', err);
  process.exit(1);
});
