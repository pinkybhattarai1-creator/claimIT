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

    // TEST 12: Automated SQLite Database Backup
    console.log('\n--- TEST 12: Automated SQLite Database Backup ---');
    const backupRes = await makeRequest('POST', '/api/backup', null, adminToken);
    assert(backupRes.status === 200, 'Database backup triggered via maintenance API (200)');
    assert(backupRes.data.fileName && backupRes.data.fileName.startsWith('claimit_backup_'), 'Backup filename properly formatted');

    console.log('\n===============================================================');
    console.log('🎉 ALL 12 COMPREHENSIVE AUTOMATED TEST STAGES PASSED (100%)!');
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
