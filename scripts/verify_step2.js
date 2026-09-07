const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const PORT = 8847;

function makeRequest(urlPath, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: urlPath,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runStep2Verification() {
  console.log('===============================================================');
  console.log('🛡️ Step 2: Session & Auth Hardening Verification');
  console.log('===============================================================\n');

  // 1. Admin login & token_version presence
  console.log('1. Verifying Admin Login & token_version issuance...');
  const loginRes = await makeRequest('/api/auth/login', 'POST', { username: 'admin', password: 'admin123' });
  assert.strictEqual(loginRes.status, 200, 'Admin login returned 200');
  assert(loginRes.data.token, 'JWT token returned');
  assert.strictEqual(typeof loginRes.data.user.token_version, 'number', 'user.token_version is a number');
  assert.strictEqual(typeof loginRes.data.must_change_password, 'boolean', 'must_change_password is a boolean');
  const adminToken = loginRes.data.token;
  console.log(`  ✅ Login successful. token_version=${loginRes.data.user.token_version}, must_change_password=${loginRes.data.must_change_password}`);

  // 2. Token refresh endpoint
  console.log('\n2. Verifying POST /api/auth/refresh session extension...');
  const refreshRes = await makeRequest('/api/auth/refresh', 'POST', null, adminToken);
  assert.strictEqual(refreshRes.status, 200, 'Refresh returned 200');
  assert(refreshRes.data.token, 'New refreshed token received');
  console.log('  ✅ Session refresh successful.');

  // 3. User lifecycle session revocation
  console.log('\n3. Verifying User session revocation upon Admin Reset Password...');
  const tempUsername = `step2_tester_${Date.now()}`;
  const createRes = await makeRequest('/api/users', 'POST', {
    username: tempUsername,
    password: 'InitialPassword123!',
    role: 'staff',
    name: 'Step 2 Tester',
    department: 'Cardiology'
  }, adminToken);
  assert.strictEqual(createRes.status, 200, 'User created');
  const userId = createRes.data.id;

  // Login as tester
  const testerLogin = await makeRequest('/api/auth/login', 'POST', {
    username: tempUsername,
    password: 'InitialPassword123!'
  });
  assert.strictEqual(testerLogin.status, 200, 'Tester login succeeded');
  const oldTesterToken = testerLogin.data.token;
  assert.strictEqual(testerLogin.data.must_change_password, true, 'New user has must_change_password=true');
  console.log('  ✅ Initial user login issued token with must_change_password=true');

  // Verify tester token works
  const accessBeforeReset = await makeRequest('/api/assets', 'GET', null, oldTesterToken);
  assert.strictEqual(accessBeforeReset.status, 200, 'Tester token works before reset');

  // Admin resets tester password
  const resetRes = await makeRequest(`/api/users/${userId}/reset-password`, 'POST', {
    new_password: 'AdminResetPassword99!'
  }, adminToken);
  assert.strictEqual(resetRes.status, 200, 'Admin reset password returned 200');

  // Assert old token is REVOKED (401 Session revoked)
  const accessAfterReset = await makeRequest('/api/assets', 'GET', null, oldTesterToken);
  assert.strictEqual(accessAfterReset.status, 401, 'Old tester token returned 401 Session Revoked');
  console.log(`  ✅ Verified: Old JWT immediately revoked (Got: 401 - ${accessAfterReset.data.error})`);

  // Tester logs in with reset password
  const loginAfterReset = await makeRequest('/api/auth/login', 'POST', {
    username: tempUsername,
    password: 'AdminResetPassword99!'
  });
  assert.strictEqual(loginAfterReset.status, 200, 'Login with new password succeeded');
  assert.strictEqual(loginAfterReset.data.must_change_password, true, 'must_change_password is true after reset');
  const freshTesterToken = loginAfterReset.data.token;

  // Tester changes own password
  console.log('\n4. Verifying Self Password Change token update & old token revocation...');
  const changeRes = await makeRequest('/api/auth/change-password', 'POST', {
    username: tempUsername,
    current_password: 'AdminResetPassword99!',
    new_password: 'FinalTesterPassword77!'
  }, freshTesterToken);
  assert.strictEqual(changeRes.status, 200, 'Self change password returned 200');
  assert(changeRes.data.token, 'Fresh replacement token returned in response');

  // Assert freshTesterToken is now revoked
  const accessAfterSelfChange = await makeRequest('/api/assets', 'GET', null, freshTesterToken);
  assert.strictEqual(accessAfterSelfChange.status, 401, 'Pre-change token returned 401');
  console.log('  ✅ Verified: Pre-change token immediately revoked upon password update');

  // New token returned from change-password works
  const accessWithNewToken = await makeRequest('/api/assets', 'GET', null, changeRes.data.token);
  assert.strictEqual(accessWithNewToken.status, 200, 'Replacement token accepted');
  console.log('  ✅ Verified: Replacement token from change-password response works (200)');

  // Clean up user
  await makeRequest(`/api/users/${userId}`, 'DELETE', null, adminToken);

  // 5. HTML files modal audit
  console.log('\n5. Verifying HTML modals in all 6 entry pages...');
  const htmlFiles = ['index.html', 'admin.html', 'ward.html', 'it.html', 'config.html', 'login.html'];
  for (const file of htmlFiles) {
    const content = fs.readFileSync(path.join(__dirname, '..', 'public', file), 'utf8');
    assert(content.includes('id="change-password-modal"'), `${file} contains change-password-modal`);
    assert(content.includes('id="session-warning-modal"'), `${file} contains session-warning-modal`);
    assert(content.includes('openChangePasswordModal(false)'), `${file} contains profile change password button`);
    console.log(`  ✅ ${file}: change-password-modal, session-warning-modal, and profile button verified`);
  }

  console.log('\n===============================================================');
  console.log('🎉 STEP 2: SESSION & AUTH HARDENING FULLY VERIFIED (100% PASS)');
  console.log('===============================================================\n');
}

runStep2Verification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
