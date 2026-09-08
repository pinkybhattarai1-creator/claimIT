const assert = require('assert');
const { app } = require('../server');
const { db } = require('../db');
const { runMigrations } = require('../db/migrations');

async function runTests() {
  console.log('🧪 Starting Feedback & Mobile Features Verification Tests...\n');
  const request = require('http');

  // Ensure migrations are run on db
  await new Promise(resolve => {
    runMigrations(db, () => resolve());
  });

  // Helper to make local HTTP request to app
  const server = app.listen(0, '127.0.0.1', async () => {
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    function makeRequest(method, path, body, token) {
      return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = request.request(url, { method, headers }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
            } catch (e) {
              resolve({ status: res.statusCode, body: data });
            }
          });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    }

    try {
      // 1. Test POST /api/feedback with valid data
      console.log('Test 1: POST /api/feedback with valid data');
      const testPayload = {
        category: 'bug',
        page_url: 'ระบบแจ้งซ่อมภาคสนาม (/ward)',
        comment: 'ทดสอบการส่งรายงานปัญหาจากปุ่มลอย: สแกนบาร์โค้ดไม่ขึ้น',
        rating: 4,
        reporter_name: 'พยาบาลสมหญิง',
        department: 'OPD Ward 3',
        device_info: 'Apple iPhone (390x844)',
        screen_size: '390x844'
      };
      const res1 = await makeRequest('POST', '/api/feedback', testPayload);
      assert.strictEqual(res1.status, 201, `Expected status 201, got ${res1.status}`);
      assert.ok(res1.body.success, 'Expected success to be true');
      assert.ok(res1.body.id, 'Expected an ID to be returned');
      const createdId = res1.body.id;
      console.log(`  ✓ Feedback created successfully with ID: ${createdId}`);

      // 2. Test POST /api/feedback with missing comment (Validation check)
      console.log('Test 2: POST /api/feedback validation on empty comment');
      const res2 = await makeRequest('POST', '/api/feedback', { comment: '' });
      assert.strictEqual(res2.status, 400, `Expected status 400, got ${res2.status}`);
      console.log('  ✓ Empty comment properly rejected with 400 Bad Request');

      // 3. Test GET /api/feedback
      console.log('Test 3: GET /api/feedback retrieval');
      const res3 = await makeRequest('GET', '/api/feedback');
      assert.strictEqual(res3.status, 200, `Expected status 200, got ${res3.status}`);
      assert.ok(Array.isArray(res3.body), 'Expected body to be array');
      const found = res3.body.find(f => f.id === createdId);
      assert.ok(found, `Expected to find feedback with ID ${createdId}`);
      assert.strictEqual(found.category, 'bug');
      assert.strictEqual(found.rating, 4);
      assert.strictEqual(found.reporter_name, 'พยาบาลสมหญิง');
      assert.strictEqual(found.device_info, 'Apple iPhone (390x844)');
      console.log('  ✓ Feedback list retrieved and verified with context details');

      // 4. Test PATCH /api/feedback/:id (Status update)
      console.log('Test 4: PATCH /api/feedback/:id to reviewed');
      const res4 = await makeRequest('PATCH', `/api/feedback/${createdId}`, { status: 'reviewed' });
      assert.strictEqual(res4.status, 200, `Expected status 200, got ${res4.status}`);
      assert.ok(res4.body.success);
      console.log('  ✓ Status updated to reviewed');

      // 5. Test DELETE /api/feedback/:id
      console.log('Test 5: DELETE /api/feedback/:id cleanup');
      const res5 = await makeRequest('DELETE', `/api/feedback/${createdId}`);
      assert.strictEqual(res5.status, 200, `Expected status 200, got ${res5.status}`);
      console.log('  ✓ Feedback deleted successfully');

      // 6. Verify network-info endpoint returns valid detectedIp and port
      console.log('Test 6: GET /api/network-info');
      const res6 = await makeRequest('GET', '/api/network-info');
      assert.strictEqual(res6.status, 200);
      assert.ok(res6.body.detectedIp, 'Expected detectedIp to exist');
      assert.ok(res6.body.port, 'Expected port to exist');
      console.log(`  ✓ Network info detected: IP=${res6.body.detectedIp}, Port=${res6.body.port}`);

      console.log('\n🎉 ALL 6 FEEDBACK & MOBILE VERIFICATION TESTS PASSED!\n');
      process.exit(0);
    } catch (err) {
      console.error('\n❌ Test failure:', err);
      process.exit(1);
    } finally {
      server.close();
    }
  });
}

runTests();
