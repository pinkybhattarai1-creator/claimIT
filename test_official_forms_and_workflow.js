/**
 * Test Official Forms & Claim Workflow Verification Suite
 * Verifies:
 * 1. Acer Warranty URL & SOP configuration in DB and Frontend
 * 2. Claim Workflow SOP Flowchart modal & integration
 * 3. Exactly the two official hospital forms (Inspection Form & PT3-FM-SEC-1012 Gate Pass)
 * 4. Backend PDF generation for Inspection Form and Gate Pass
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { db } = require('./db');
const { app, server } = require('./server');

const PORT = process.env.PORT || 8847;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function makeRequest(method, endpoint, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(endpoint, BASE_URL);
    const headers = { 'Connection': 'close' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let payload = '';
    if (data) {
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
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let parsed = null;
        try {
          parsed = JSON.parse(buffer.toString('utf8'));
        } catch (e) {
          parsed = buffer;
        }
        resolve({ status: res.statusCode, data: parsed, buffer, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests(runNumber) {
  console.log(`\n===============================================================`);
  console.log(`🚀 RUNNING VERIFICATION SUITE - PASS #${runNumber}`);
  console.log(`===============================================================\n`);

  try {
    // -------------------------------------------------------------
    // STAGE 1: Acer Warranty Check URL & Database Configuration
    // -------------------------------------------------------------
    console.log('📌 Stage 1: Checking Acer Warranty URL & DB Configuration...');
    const acerConfig = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM configurations WHERE type = 'brand' AND value = 'Acer'", (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    assert(acerConfig, 'Acer brand configuration must exist in DB');
    assert(
      acerConfig.details.includes('https://register.acer.co.th/Warranty%20Check/warr_chk.aspx'),
      'Acer details in DB must contain official Acer warranty URL'
    );
    assert(acerConfig.details.includes('018 Warranty Hardware'), 'Acer SOP must reference hospital J drive SOP path');
    console.log('   ✅ Acer DB Configuration verified (URL & SOP steps present)');

    // Check public/js/assets.js
    const assetsJsContent = fs.readFileSync(path.join(__dirname, 'public', 'js', 'assets.js'), 'utf8');
    assert(
      assetsJsContent.includes('https://register.acer.co.th/Warranty%20Check/warr_chk.aspx'),
      'public/js/assets.js must contain the exact Acer warranty check URL'
    );
    console.log('   ✅ public/js/assets.js Acer warranty URL verified');

    // -------------------------------------------------------------
    // STAGE 2: Claim Workflow Flowchart Modal & SOP Implementation
    // -------------------------------------------------------------
    console.log('📌 Stage 2: Checking Claim Workflow SOP Flowchart...');
    const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    
    assert(indexHtml.includes('id="claim-workflow-modal"'), 'Claim workflow modal element must exist in index.html');
    assert(indexHtml.includes('ผังขั้นตอนการรับแจ้งอุปกรณ์เสียและส่งเคลม'), 'Workflow title must be present in index.html');
    assert(indexHtml.includes('J:\\\\018 Warranty Hardware'), 'J: drive SOP path must be present in workflow modal');
    assert(indexHtml.includes('เช็ค NVB ให้เหลือ 0 บาท'), 'NVB 0 baht salvage check must be in workflow flowchart');
    assert(indexHtml.includes('PT3-FM-SEC-1012'), 'PT3-FM-SEC-1012 Gate Pass must be referenced in workflow');
    assert(indexHtml.includes('id="btn-open-workflow-modal-header"'), 'Header workflow button must exist');
    assert(indexHtml.includes('id="btn-sidebar-open-workflow"'), 'Sidebar workflow button must exist');

    const appJsContent = fs.readFileSync(path.join(__dirname, 'public', 'js', 'app.js'), 'utf8');
    assert(appJsContent.includes('window.openClaimWorkflowModal'), 'openClaimWorkflowModal function must exist in app.js');
    assert(appJsContent.includes('window.openTemplateFromWorkflow'), 'openTemplateFromWorkflow function must exist in app.js');
    console.log('   ✅ Claim Workflow SOP Flowchart & UI bindings verified');

    // -------------------------------------------------------------
    // STAGE 3: Strict Only 2 Official Hospital Forms
    // -------------------------------------------------------------
    console.log('📌 Stage 3: Checking Template Selector & Implementation (Only 2 Forms)...');
    assert(
      indexHtml.includes('value="inspection" selected>📑 1. ใบตรวจเช็คอุปกรณ์ เสีย (Hospital Defective Equipment Inspection Form)</option>'),
      'Template selector must offer Form 1: ใบตรวจเช็คอุปกรณ์ เสีย'
    );
    assert(
      indexHtml.includes('value="gatepass">📑 2. ใบนําอุปกรณ์ ทรัพย์สิน ออกนอกพื้นที่ (PT3-FM-SEC-1012 Equipment Gate Pass)</option>'),
      'Template selector must offer Form 2: ใบนําอุปกรณ์ ทรัพย์สิน ออกนอกพื้นที่'
    );
    assert(!indexHtml.includes('value="repair_order"'), 'Old repair_order template must NOT be present in selector');
    assert(!indexHtml.includes('value="claim_888"'), 'Old claim_888 template must NOT be present in selector');
    assert(!indexHtml.includes('value="warranty_888"'), 'Old warranty_888 template must NOT be present in selector');
    assert(!indexHtml.includes('value="talent_delivery"'), 'Old talent_delivery template must NOT be present in selector');
    assert(!indexHtml.includes('value="claimit_audit"'), 'Old claimit_audit template must NOT be present in selector');

    const templatesJsContent = fs.readFileSync(path.join(__dirname, 'public', 'js', 'templates.js'), 'utf8');
    assert(templatesJsContent.includes('renderInspectionFormHTML'), 'renderInspectionFormHTML must exist in templates.js');
    assert(templatesJsContent.includes('renderGatePassFormHTML'), 'renderGatePassFormHTML must exist in templates.js');
    assert(templatesJsContent.includes('PT3-FM-SEC-1012'), 'PT3-FM-SEC-1012 reference must exist in templates.js');
    assert(templatesJsContent.includes('ใบตรวจเช็คอุปกรณ์ เสีย'), 'Thai title for Form 1 must exist in templates.js');
    console.log('   ✅ Template selector and template generator strictly restricted to 2 official forms');

    // -------------------------------------------------------------
    // STAGE 4: Backend API Login & Configurations Endpoint
    // -------------------------------------------------------------
    console.log('📌 Stage 4: Testing Staff Login & API Endpoints...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      username: 'staff',
      password: 'staff123'
    });
    assert.strictEqual(loginRes.status, 200, 'Staff login should succeed with 200');
    assert(loginRes.data.token, 'Staff login should return JWT token');
    const token = loginRes.data.token;

    const configRes = await makeRequest('GET', '/api/configurations', null, token);
    assert.strictEqual(configRes.status, 200, 'GET /api/configurations should return 200');
    const acerApiConfig = configRes.data.find(c => c.value === 'Acer' && c.type === 'brand');
    assert(acerApiConfig, 'Acer config must be returned by /api/configurations');
    assert(
      acerApiConfig.details.includes('https://register.acer.co.th/Warranty%20Check/warr_chk.aspx'),
      'Acer details in API must contain warranty check URL'
    );
    console.log('   ✅ Staff Auth & /api/configurations passed');

    // -------------------------------------------------------------
    // STAGE 5: Official PDF Generation Tests
    // -------------------------------------------------------------
    console.log('📌 Stage 5: Testing PDF Generation for Form 1 & Form 2...');
    
    // Form 1: Inspection PDF
    const pdfInspectionRes = await makeRequest('GET', '/api/assets/CIT-2024-AIO-02/pdf?form=inspection', null, token);
    assert.strictEqual(pdfInspectionRes.status, 200, 'Inspection PDF route should return 200');
    assert.strictEqual(pdfInspectionRes.headers['content-type'], 'application/pdf', 'Should return application/pdf');
    assert(pdfInspectionRes.buffer.slice(0, 4).toString() === '%PDF', 'Buffer should start with %PDF magic header');
    assert(pdfInspectionRes.buffer.length > 500, 'PDF buffer should be non-empty');
    console.log(`   ✅ Form 1 (Inspection PDF) generated successfully (${pdfInspectionRes.buffer.length} bytes)`);

    // Form 2: Gate Pass PDF (PT3-FM-SEC-1012)
    const pdfGatepassRes = await makeRequest('GET', '/api/assets/CIT-2024-AIO-02/pdf?form=gatepass', null, token);
    assert.strictEqual(pdfGatepassRes.status, 200, 'Gate Pass PDF route should return 200');
    assert.strictEqual(pdfGatepassRes.headers['content-type'], 'application/pdf', 'Should return application/pdf');
    assert(pdfGatepassRes.buffer.slice(0, 4).toString() === '%PDF', 'Buffer should start with %PDF magic header');
    assert(pdfGatepassRes.buffer.length > 500, 'PDF buffer should be non-empty');
    console.log(`   ✅ Form 2 (Gate Pass PT3-FM-SEC-1012 PDF) generated successfully (${pdfGatepassRes.buffer.length} bytes)`);

    // Multi-Asset Claim Gate Pass PDF
    const claimsRes = await makeRequest('GET', '/api/claims', null, token);
    assert.strictEqual(claimsRes.status, 200, 'GET /api/claims should return 200');
    if (claimsRes.data && claimsRes.data.length > 0) {
      const claimId = claimsRes.data[0].id;
      const claimPdfRes = await makeRequest('GET', `/api/claims/${claimId}/pdf`, null, token);
      assert.strictEqual(claimPdfRes.status, 200, 'Claim PDF route should return 200');
      assert.strictEqual(claimPdfRes.headers['content-type'], 'application/pdf', 'Should return application/pdf');
      assert(claimPdfRes.buffer.slice(0, 4).toString() === '%PDF', 'Buffer should start with %PDF magic header');
      console.log(`   ✅ Claim Bundle Gate Pass PDF generated successfully (${claimPdfRes.buffer.length} bytes)`);
    }

    console.log(`\n🎉 PASS #${runNumber} COMPLETED WITH 100% SUCCESS!\n`);
    return true;
  } catch (err) {
    console.error(`❌ PASS #${runNumber} FAILED:`, err);
    throw err;
  }
}

async function main() {
  try {
    // Wait a brief moment to ensure server is ready
    await new Promise(r => setTimeout(r, 600));

    // Run tests THREE TIMES consecutively as requested by user
    for (let run = 1; run <= 3; run++) {
      await runTests(run);
    }
    console.log('===============================================================');
    console.log('🏆 TRIPLE VERIFICATION PASSED: ALL 3 CONSECUTIVE TEST RUNS SUCCEEDED (100%)!');
    console.log('===============================================================');
  } finally {
    if (server && server.listening) server.close();
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  if (server && server.listening) server.close();
  process.exit(1);
});
