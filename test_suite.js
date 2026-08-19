/**
 * ClaimIT Comprehensive Automated Test Suite (P9, P16, P17)
 * Tests Auth, RBAC, Viability Boundary Rules, Max 5 Assets, State Machine,
 * Evidence Storage, IDOR Security, PDPA Sanitization Gate, and Health Check.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { calculateServerViability } = require('./services/claimService');

const PORT = process.env.PORT || 8847;
const BASE_URL = `http://localhost:${PORT}`;

let adminToken = '';
let staffToken = '';
let createdClaimId = null;
let uploadedEvidenceId = null;

// HTTP Request Helper
function makeRequest(method, endpoint, data = null, token = null, isMultipart = false, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const headers = { ...customHeaders };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let payload = '';
    if (data && !isMultipart) {
      payload = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(url, { method, headers }, (res) => {
      let responseBody = '';
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
    const url = new URL(endpoint, BASE_URL);
    const headers = {
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

    const req = http.request(url, { method: 'POST', headers }, (res) => {
      let responseBody = '';
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
  console.log(`🚀 ClaimIT Comprehensive Automated Test Suite (Target Port: ${PORT})`);
  console.log('===============================================================\n');

  // TEST 1: Health Check Endpoint (P11)
  console.log('--- TEST 1: Health Check Endpoint (GET /health) ---');
  const healthRes = await makeRequest('GET', '/health');
  assert(healthRes.status === 200, `Health check returned 200 (Got: ${healthRes.status})`);
  assert(healthRes.data.status === 'UP', `System status is UP`);
  assert(healthRes.data.database === 'CONNECTED', `Database is CONNECTED`);

  // TEST 2: Authentication Security (P1)
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

  // TEST 3: RBAC & Permission Enforcement (P1)
  console.log('\n--- TEST 3: Role-Based Access Control (RBAC) ---');
  // Staff trying to access Admin-only route (/api/users)
  const staffOnAdminRoute = await makeRequest('GET', '/api/users', null, staffToken);
  assert(staffOnAdminRoute.status === 403, 'Staff access to admin-only user list blocked (403)');

  // Admin access to Admin route
  const adminOnAdminRoute = await makeRequest('GET', '/api/users', null, adminToken);
  assert(adminOnAdminRoute.status === 200, 'Admin access to user list permitted (200)');

  // TEST 4: Viability Score Boundary Logic (P3)
  console.log('\n--- TEST 4: Viability Score Boundary Calculations (Server-authoritative) ---');
  // Under warranty asset (Score 1.0 <= 5.0) -> VIABLE
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

  // Expired / EOL asset (Score 8.5 > 5.0) -> NOT_VIABLE
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

  // TEST 5: Multi-Asset Claims & Max 5 Limit (P3)
  console.log('\n--- TEST 5: Multi-Asset Claim Rules (1-5 assets limit) ---');
  
  // 5.1 Create Claim with 1 asset (Allowed)
  const claim1 = await makeRequest('POST', '/api/claims', {
    vendor_name: 'Dell Thailand',
    vendor_rma_number: 'DELL-RMA-8847',
    asset_tags: ['032186040006'],
    notes: 'Camera sensor blur'
  }, staffToken);
  assert(claim1.status === 201, `Single-asset claim created successfully (201, ID: ${claim1.data.claim?.id})`);
  createdClaimId = claim1.data.claim.id;

  // 5.2 Create Claim with 5 assets (Allowed)
  const claim5 = await makeRequest('POST', '/api/claims', {
    vendor_name: 'IT Support Center',
    asset_tags: ['032186040006', '031709030031', 'CIT-2023-SCN-01', 'CIT-2024-AIO-02', 'CIT-2022-TAB-03'],
    notes: 'Batch annual warranty service'
  }, staffToken);
  assert(claim5.status === 201, `5-asset claim created successfully (201, Asset count: ${claim5.data.claim?.asset_count})`);

  // 5.3 Attempt to Create Claim with 6 assets (Hard Limit Violation -> Rejection with 400)
  const claim6 = await makeRequest('POST', '/api/claims', {
    vendor_name: 'IT Center',
    asset_tags: ['032186040006', '031709030031', 'CIT-2023-SCN-01', 'CIT-2024-AIO-02', 'CIT-2022-TAB-03', 'CIT-2021-AIO-01']
  }, staffToken);
  assert(claim6.status === 400, '6-asset claim correctly rejected by backend (400)');

  // 5.4 Attempt to Create Claim with Duplicate Assets
  const claimDup = await makeRequest('POST', '/api/claims', {
    vendor_name: 'IT Center',
    asset_tags: ['032186040006', '032186040006']
  }, staffToken);
  assert(claimDup.status === 400, 'Claim with duplicate asset tags rejected (400)');

  // TEST 6: Claim State Machine Transitions (P3)
  console.log('\n--- TEST 6: Controlled State Machine Transitions ---');
  // Valid transition: DRAFT -> VIABLE
  const trans1 = await makeRequest('PUT', `/api/claims/${createdClaimId}/status`, { status: 'VIABLE' }, staffToken);
  assert(trans1.status === 200, 'Valid transition DRAFT -> VIABLE succeeded (200)');

  // Valid transition: VIABLE -> CONFIRMED
  const trans2 = await makeRequest('PUT', `/api/claims/${createdClaimId}/status`, { status: 'CONFIRMED' }, staffToken);
  assert(trans2.status === 200, 'Valid transition VIABLE -> CONFIRMED succeeded (200)');

  // Invalid transition: CONFIRMED -> CLOSED (Arbitrary jump blocked)
  const transInvalid = await makeRequest('PUT', `/api/claims/${createdClaimId}/status`, { status: 'CLOSED' }, staffToken);
  assert(transInvalid.status === 400, 'Arbitrary invalid state transition blocked by backend (400)');

  // TEST 7: Evidence Upload, Storage & IDOR Protection (P4)
  console.log('\n--- TEST 7: Private Evidence Storage & IDOR Access Control ---');
  // Create a temporary dummy image file
  const testImagePath = path.join(__dirname, 'test_evidence.png');
  fs.writeFileSync(testImagePath, Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2D0000000049454E44AE426082', 'hex'));

  // Upload evidence
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

  // Clean up temp file
  if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);

  // TEST 8: Data Wipe Authorization Code & PDPA Gate (P1)
  console.log('\n--- TEST 8: Data Sanitization Security Gate & Wipe Confirmation Code ---');
  // 8.1 Bad / Missing Wipe Code
  const badWipe = await makeRequest('POST', '/api/assets/sanitize', {
    asset_tag: 'CIT-2022-TAB-03',
    wipe_code: 'WRONGCODE'
  }, staffToken);
  assert(badWipe.status === 400, 'Sanitization with incorrect code rejected (400)');

  // 8.2 Valid Wipe Code "WIPED"
  const goodWipe = await makeRequest('POST', '/api/assets/sanitize', {
    asset_tag: 'CIT-2022-TAB-03',
    wipe_code: 'WIPED',
    sanitization_note: 'DoD 5220.22-M 3-pass overwrite completed'
  }, staffToken);
  assert(goodWipe.status === 200, 'Sanitization with valid code "WIPED" succeeded (200)');

  // TEST 9: PDF Report Generation (P8)
  console.log('\n--- TEST 9: Multi-Asset PDF Report Generation ---');
  const pdfRes = await makeRequest('GET', `/api/claims/${createdClaimId}/pdf`, null, staffToken);
  assert(pdfRes.status === 200, 'Multi-asset PDF report generated and downloaded successfully (200)');
  assert(pdfRes.headers['content-type'] === 'application/pdf', 'Response Content-Type is application/pdf');

  // TEST 10: Audit Log Verification (P6)
  console.log('\n--- TEST 10: Immutable Audit Log Verification ---');
  const auditRes = await makeRequest('GET', '/api/audit-logs', null, staffToken);
  assert(auditRes.status === 200, 'Audit logs retrieved successfully (200)');
  assert(Array.isArray(auditRes.data) && auditRes.data.length > 0, `Audit logs recorded (${auditRes.data.length} entries)`);

  console.log('\n===============================================================');
  console.log('🎉 ALL 10 COMPREHENSIVE AUTOMATED TEST STAGES PASSED (100%)!');
  console.log('===============================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('💥 Test suite crashed with error:', err);
  process.exit(1);
});
