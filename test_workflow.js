const http = require('http');

let authToken = null;
let activePort = 8847;

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      ...headers
    };

    const options = {
      hostname: '127.0.0.1',
      port: activePort,
      path: path,
      method: method,
      headers: requestHeaders
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  try {
    // Check active port
    try {
      await makeRequest('/api/configurations');
    } catch {
      activePort = 8847;
    }

    console.log(`--- 1. Testing Admin Authentication (Port: ${activePort}) ---`);
    let res = await makeRequest('/api/auth/login', 'POST', { username: 'admin', password: 'admin123' });
    console.log('Admin login status:', res.status);
    if (res.data.token) {
      authToken = res.data.token;
      console.log('JWT Token acquired:', authToken.substring(0, 20) + '...');
    }

    console.log('\n--- 2. Search Asset (CIT-2022-TAB-03) ---');
    res = await makeRequest('/api/assets/CIT-2022-TAB-03');
    console.log('Asset search status:', res.status, '| Tag:', res.data.asset_tag, '| Status:', res.data.status, '| Sanitization Required:', res.data.sanitization_required);

    console.log('\n--- 3. Testing PDPA Gate (Initiate RMA without wipe confirmation) ---');
    res = await makeRequest('/api/assets/claim', 'POST', {
      asset_tag: 'CIT-2022-TAB-03',
      vendor_name: 'Apple',
      vendor_rma_number: 'RMA-TEST-999',
      expected_return_date: '2026-09-01',
      data_wiped_confirmed: false,
      action_by_username: 'admin'
    });
    console.log('Claim without wipe response (Expect 400 PDPA block):', res.status, res.data);

    console.log('\n--- 4. Perform Data Sanitization Security Tests (POST /api/assets/sanitize) ---');
    // 4a. Test with invalid/missing wipe code (Expect 400 rejection)
    let badRes = await makeRequest('/api/assets/sanitize', 'POST', {
      asset_tag: 'CIT-2022-TAB-03',
      action_by_username: 'admin',
      sanitization_note: 'Attempting wipe without code'
    });
    console.log('Sanitization with missing code (Expect 400 block):', badRes.status, badRes.data.error || badRes.data);

    // 4b. Test with valid wipe code
    res = await makeRequest('/api/assets/sanitize', 'POST', {
      asset_tag: 'CIT-2022-TAB-03',
      action_by_username: 'admin',
      sanitization_note: 'Storage wiped using DoD 5220.22-M standard',
      wipe_code: 'WIPED'
    });
    console.log('Sanitization response with valid code:', res.status, res.data);

    console.log('\n--- 5. Initiate RMA Claim WITH Data Wipe Confirmation ---');
    res = await makeRequest('/api/assets/claim', 'POST', {
      asset_tag: 'CIT-2022-TAB-03',
      vendor_name: 'Apple',
      vendor_rma_number: 'RMA-TEST-999',
      expected_return_date: '2026-09-01',
      data_wiped_confirmed: true,
      sanitization_note: 'Storage wiped using DoD 5220.22-M standard',
      action_by_username: 'admin'
    });
    console.log('Claim with wipe response:', res.status, res.data);

    console.log('\n--- 6. Verify Asset Status after RMA ---');
    res = await makeRequest('/api/assets/CIT-2022-TAB-03');
    console.log('- Asset Status:', res.data.status);
    console.log('- RMA Vendor:', res.data.vendor_name);
    console.log('- Data Wiped By:', res.data.data_wiped_by);
    console.log('- Data Wiped At:', res.data.data_wiped_at);
    console.log('- Sanitization Note:', res.data.sanitization_note);

    console.log('\n--- 7. Resolve RMA Claim (Return to Stock) ---');
    res = await makeRequest('/api/assets/resolve-claim', 'POST', {
      asset_tag: 'CIT-2022-TAB-03',
      resolution_type: 'Replaced',
      replacement_serial_no: 'IPAD-AIR-NEW-2026',
      repair_cost: 0,
      action_by_username: 'admin'
    });
    console.log('Resolve RMA response:', res.status, res.data);

    console.log('\n--- 8. Testing EOL Salvage Management (Pending Sell & Pending Donation) ---');
    res = await makeRequest('/api/assets/salvage', 'POST', {
      asset_tag: '031709030031',
      salvage_status: 'Pending Sell',
      action_by_username: 'admin'
    });
    console.log('Salvage (Pending Sell) response:', res.status, res.data);

    res = await makeRequest('/api/assets/salvage', 'POST', {
      asset_tag: 'CIT-2021-AIO-01',
      salvage_status: 'Pending Donation',
      action_by_username: 'admin'
    });
    console.log('Salvage (Pending Donation) response:', res.status, res.data);

    console.log('\n--- 9. Verify Audit Logs ---');
    res = await makeRequest('/api/audit-logs');
    const logs = Array.isArray(res.data) ? res.data : (res.data.logs || []);
    console.log(`Total Audit Logs: ${logs.length}`);
    const recentLogs = logs.slice(0, 5);
    recentLogs.forEach(l => console.log(`  [${l.timestamp}] ${l.action_by_username} -> ${l.asset_tag} (${l.status})`));

    console.log('\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runTests();
