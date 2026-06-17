const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
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
    console.log('--- 1. Testing Login ---');
    let res = await makeRequest('/api/auth/login', 'POST', { username: 'admin', password: 'admin123' });
    console.log('Admin login:', res.status, res.data);

    res = await makeRequest('/api/auth/login', 'POST', { username: 'itstaff', password: 'itstaff123' });
    console.log('IT Staff login:', res.status, res.data);

    console.log('\n--- 2. Search Asset ---');
    res = await makeRequest('/api/assets/CIT-2022-TAB-03');
    console.log('Asset search (CIT-2022-TAB-03):', res.status, res.data.status, res.data.sanitization_required);

    console.log('\n--- 4/5. Proceed with RMA without Data Wiped confirmation ---');
    res = await makeRequest('/api/assets/claim', 'POST', {
      asset_tag: 'CIT-2022-TAB-03',
      vendor_name: 'Apple',
      vendor_rma_number: 'RMA123456',
      expected_return_date: '2026-07-01',
      data_wiped_confirmed: false, // Testing false
      action_by_username: 'itstaff'
    });
    console.log('Claim without wipe:', res.status, res.data);

    console.log('\n--- 6. Proceed with Data Wiped confirmation ---');
    res = await makeRequest('/api/assets/claim', 'POST', {
      asset_tag: 'CIT-2022-TAB-03',
      vendor_name: 'Apple',
      vendor_rma_number: 'RMA123456',
      expected_return_date: '2026-07-01',
      data_wiped_confirmed: true,
      sanitization_note: 'Wiped via settings reset',
      action_by_username: 'itstaff'
    });
    console.log('Claim with wipe:', res.status, res.data);

    console.log('\n--- 7. Confirm fields are saved ---');
    res = await makeRequest('/api/assets/CIT-2022-TAB-03');
    console.log('Asset data after claim:');
    console.log('- data_wiped_confirmed:', res.data.rma_data_wiped_confirmed);
    console.log('- data_wiped_by:', res.data.data_wiped_by);
    console.log('- data_wiped_at:', res.data.data_wiped_at);
    console.log('- sanitization_note:', res.data.sanitization_note);

    console.log('\n--- 8. Confirm Audit Log ---');
    res = await makeRequest('/api/audit-logs');
    const logs = res.data.filter(l => l.asset_tag === 'CIT-2022-TAB-03');
    console.log('Audit Logs for CIT-2022-TAB-03:');
    logs.forEach(l => console.log(`  [${l.timestamp}] ${l.action_by_username} moved ${l.moved_direction} to ${l.status}`));

  } catch (err) {
    console.error('Test error:', err);
  }
}

runTests();
