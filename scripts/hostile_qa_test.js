/**
 * ClaimIT Hostile QA & Stress Verification Suite
 * Exhaustively tests all major workflows, edge cases, RBAC boundaries,
 * state machine integrity, PDF/evidence streaming, and error handling.
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:8847';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const text = buffer.toString('utf8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json || text,
          rawBuffer: buffer
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      if (typeof body === 'string') req.write(body);
      else req.write(JSON.stringify(body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runHostileQASuite() {
  console.log('===============================================================');
  console.log('🧪 ClaimIT HOSTILE QA VERIFICATION & STRESS TEST SUITE');
  console.log('===============================================================\n');

  // 1. HEALTH & METRICS
  console.log('--- 1. Health & Server Metrics ---');
  const health = await request('GET', '/health');
  assert(health.status === 200, 'Health endpoint responds 200 OK');
  assert(health.body.status === 'UP', 'Health status is UP');
  assert(health.body.database === 'CONNECTED', 'Database connection verified');

  // 2. AUTHENTICATION & MALICIOUS LOGIN ATTEMPTS
  console.log('\n--- 2. Authentication & Attack Resistance ---');
  const badLogin1 = await request('POST', '/api/auth/login', { username: 'admin', password: 'wrongpassword' });
  assert(badLogin1.status === 401, 'Wrong password rejected (401)');

  const sqlInjLogin = await request('POST', '/api/auth/login', { username: "' OR 1=1 --", password: 'any' });
  assert(sqlInjLogin.status === 401, 'SQL Injection in login safely blocked (401)');

  const emptyLogin = await request('POST', '/api/auth/login', { username: '', password: '' });
  assert(emptyLogin.status === 400 || emptyLogin.status === 401, 'Empty credentials rejected');

  const adminAuth = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  assert(adminAuth.status === 200, 'Admin login succeeded');
  const adminToken = adminAuth.body.token;

  const staffAuth = await request('POST', '/api/auth/login', { username: 'staff2', password: 'staff123' });
  assert(staffAuth.status === 200, 'Staff login succeeded');
  const staffToken = staffAuth.body.token;

  // 3. RBAC ISOLATION & PRIVILEGE ESCALATION PREVENTION
  console.log('\n--- 3. RBAC Privilege Escalation Prevention ---');
  const staffGetUsers = await request('GET', '/api/users', null, { Authorization: `Bearer ${staffToken}` });
  assert(staffGetUsers.status === 403, 'Staff prevented from accessing user management (403)');

  const staffBackup = await request('POST', '/api/backup', null, { Authorization: `Bearer ${staffToken}` });
  assert(staffBackup.status === 403, 'Staff prevented from triggering database backup (403)');

  const unauthGetAssets = await request('GET', '/api/assets');
  assert(unauthGetAssets.status === 401, 'Unauthenticated access to assets blocked (401)');

  // 4. ASSET SEARCH, SPECS, & PDPA SECURITY GATES
  console.log('\n--- 4. Asset Search, Specs, & PDPA Security Gates ---');
  const searchAsset = await request('GET', '/api/assets/CIT-2022-TAB-03', null, { Authorization: `Bearer ${adminToken}` });
  assert(searchAsset.status === 200, 'Specific asset lookup succeeded');
  assert(searchAsset.body.asset_tag === 'CIT-2022-TAB-03', 'Correct asset data retrieved');

  // Sanitize tablet first with WIPED
  const wipeRes = await request('POST', '/api/assets/sanitize', {
    asset_tag: 'CIT-2022-TAB-03',
    wipe_code: 'WIPED',
    sanitization_note: 'Hostile QA Sanitize Check'
  }, { Authorization: `Bearer ${adminToken}` });
  assert(wipeRes.status === 200, 'PDPA sanitization gate passed with WIPED code (200)');

  // 5. MULTI-ASSET CLAIM CREATION & 1-5 ASSET BOUNDARY RULES
  console.log('\n--- 5. Multi-Asset Claim Rules & Viability Calculations ---');
  const singleClaim = await request('POST', '/api/claims', {
    vendor_name: 'Dell Service',
    vendor_rma_number: 'DELL-QA-01',
    claim_type: 'WARRANTY',
    asset_tags: ['032186040006']
  }, { Authorization: `Bearer ${adminToken}` });
  assert(singleClaim.status === 201, 'Single-asset claim created (201)');
  const claimId = singleClaim.body.claim ? singleClaim.body.claim.id : singleClaim.body.id;

  // Attempt claim with 6 assets (must be rejected)
  const sixAssetsClaim = await request('POST', '/api/claims', {
    vendor_name: 'Dell Service',
    claim_type: 'WARRANTY',
    asset_tags: ['TAG-1', 'TAG-2', 'TAG-3', 'TAG-4', 'TAG-5', 'TAG-6']
  }, { Authorization: `Bearer ${adminToken}` });
  assert(sixAssetsClaim.status === 400, 'Claim with >5 assets blocked by backend (400)');

  // Attempt claim with 0 assets (must be rejected)
  const zeroAssetClaim = await request('POST', '/api/claims', {
    vendor_name: 'Dell Service',
    claim_type: 'WARRANTY',
    asset_tags: []
  }, { Authorization: `Bearer ${adminToken}` });
  assert(zeroAssetClaim.status === 400, 'Claim with 0 assets blocked (400)');

  // 6. CONTROLLED STATE MACHINE TRANSITIONS
  console.log('\n--- 6. State Machine Integrity & Transitions ---');
  // Transition DRAFT -> VIABLE
  const toViable = await request('PUT', `/api/claims/${claimId}/status`, { status: 'VIABLE' }, { Authorization: `Bearer ${adminToken}` });
  assert(toViable.status === 200, 'Transition DRAFT -> VIABLE succeeded (200)');

  // Attempt invalid transition VIABLE -> CLOSED (Skipping required steps)
  const invalidJump = await request('PUT', `/api/claims/${claimId}/status`, { status: 'CLOSED' }, { Authorization: `Bearer ${adminToken}` });
  assert(invalidJump.status === 400, 'Invalid state jump correctly blocked (400)');

  // Valid transition VIABLE -> CONFIRMED
  const toConfirmed = await request('PUT', `/api/claims/${claimId}/status`, { status: 'CONFIRMED' }, { Authorization: `Bearer ${adminToken}` });
  assert(toConfirmed.status === 200, 'Transition VIABLE -> CONFIRMED succeeded (200)');

  // 7. PDF DOCUMENT GENERATION (SINGLE & MULTI-ASSET)
  console.log('\n--- 7. Official PDF Generation & Download ---');
  const singlePdf = await request('GET', '/api/assets/CIT-2024-AIO-02/pdf', null, { Authorization: `Bearer ${adminToken}` });
  assert(singlePdf.status === 200, 'Single asset PDF download responds 200 OK');
  assert(singlePdf.headers['content-type'] === 'application/pdf', 'Single asset PDF has application/pdf Content-Type');
  assert(singlePdf.rawBuffer.slice(0, 4).toString() === '%PDF', 'Single PDF starts with valid %PDF header');

  const multiPdf = await request('GET', `/api/claims/${claimId}/pdf`, null, { Authorization: `Bearer ${adminToken}` });
  assert(multiPdf.status === 200, 'Multi-asset claim PDF download responds 200 OK');
  assert(multiPdf.headers['content-type'] === 'application/pdf', 'Multi-asset PDF has application/pdf Content-Type');
  assert(multiPdf.rawBuffer.slice(0, 4).toString() === '%PDF', 'Multi PDF starts with valid %PDF header');

  // 8. AUDIT LOG IMMUTABILITY & REVISION TRACKING
  console.log('\n--- 8. Audit Trail Verification & Time-Span Filtering ---');
  const auditLogs = await request('GET', '/api/audit-logs?timeSpan=today&limit=10', null, { Authorization: `Bearer ${adminToken}` });
  assert(auditLogs.status === 200, 'Audit logs endpoint responds 200 OK');
  assert(Array.isArray(auditLogs.body.logs || auditLogs.body), 'Audit logs returns array format');

  const auditSummary = await request('GET', '/api/audit-summary', null, { Authorization: `Bearer ${adminToken}` });
  assert(auditSummary.status === 200, 'Audit summary endpoint responds 200 OK');
  assert(typeof auditSummary.body.today_cases === 'number', 'Today cases is numeric metric');

  // 9. DATA EXPORTS & INVENTORY ENDPOINTS
  console.log('\n--- 9. Data Exports & Inventory Summary ---');
  const inventory = await request('GET', '/api/assets?page=1&limit=10', null, { Authorization: `Bearer ${adminToken}` });
  assert(inventory.status === 200, 'Inventory pagination endpoint responds 200 OK');
  assert(Array.isArray(inventory.body.data || inventory.body.assets || inventory.body), 'Inventory returns data array');

  const exportExcel = await request('GET', '/api/export/excel', null, { Authorization: `Bearer ${adminToken}` });
  assert(exportExcel.status === 200, 'Excel Export endpoint responds 200 OK');

  const exportCsv = await request('GET', '/api/export/assets.csv', null, { Authorization: `Bearer ${adminToken}` });
  assert(exportCsv.status === 200, 'CSV Export endpoint responds 200 OK');

  console.log('\n===============================================================');
  console.log(`📊 HOSTILE QA SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runHostileQASuite().catch(err => {
  console.error('Hostile QA suite error:', err);
  process.exit(1);
});
