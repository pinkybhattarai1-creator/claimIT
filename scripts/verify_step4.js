const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 8847;

function api(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: endpoint,
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function uploadFile(endpoint, fieldName, filename, fileBuffer, extraFields = {}, headers = {}, partMimeType = 'image/png') {
  return new Promise((resolve, reject) => {
    const boundary = '----ClaimITBoundary' + crypto.randomBytes(8).toString('hex');
    const chunks = [];

    // Add extra form fields
    for (const [key, val] of Object.entries(extraFields)) {
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
    }

    // Add file with specified MIME type
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${partMimeType}\r\n\r\n`));
    chunks.push(fileBuffer);
    chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const totalBody = Buffer.concat(chunks);
    const reqHeaders = {
      ...headers,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': totalBody.length
    };

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: endpoint,
        method: 'POST',
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    req.write(totalBody);
    req.end();
  });
}

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 ClaimIT Step 4 / Enterprise Remediation Verifier');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate as admin
    const loginRes = await api('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    assert(loginRes.status === 200 && loginRes.body.token, 'Admin login succeeded');
    const adminToken = loginRes.body.token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

    // Check must_change_password was set for default account
    assert(loginRes.body.user && loginRes.body.user.must_change_password !== undefined, 'Admin user has must_change_password field');

    // 2. Point 1: Seeded accounts count
    const usersRes = await api('GET', '/api/users', null, adminHeaders);
    assert(usersRes.status === 200, 'Fetched users list');
    const users = usersRes.body;
    const defaultAccounts = users.filter(u => ['admin2', 'admin3', 'admin4', 'staff2', 'staff3', 'staff4'].includes(u.username));
    assert(defaultAccounts.length === 0, 'Excess hardcoded default accounts (admin2-4, staff2-4) eliminated');

    // 3. Create test asset for tests
    const testAssetTag = `CIT-TEST-${Date.now()}`;
    const createRes = await api('POST', '/api/assets', {
      asset_tag: testAssetTag,
      device_name: 'Test Delete Monitor',
      category: 'Monitor',
      brand: 'Dell',
      model: 'P2419H',
      serial_no: `SN-${Date.now()}`,
      location: 'Warehouse',
      warranty_start: '2026-01-01',
      warranty_end: '2029-01-01',
      warranty_months: 36
    }, adminHeaders);
    assert(createRes.status === 200, `Created test asset ${testAssetTag}`);

    // 4. Point 2: Magic Byte File Validation
    // 4.1 Upload a fake PNG (plain text claiming to be image/png)
    const fakePng = Buffer.from('NOT A REAL PNG FILE AT ALL - JUST PLAIN TEXT CONTENT MALICIOUS PAYLOAD');
    const fakeUploadRes = await uploadFile('/api/evidence/upload', 'file', 'fake.png', fakePng, { asset_tag: testAssetTag }, adminHeaders, 'image/png');
    assert(fakeUploadRes.status === 400 && fakeUploadRes.body.error && fakeUploadRes.body.error.includes('Magic byte'), 'Magic Byte rejected fake PNG with HTTP 400');

    // 4.2 Upload a REAL PNG (valid 16-byte PNG header: 89 50 4E 47 0D 0A 1A 0A ...)
    const realPng = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52]),
      Buffer.alloc(128)
    ]);
    const validPngUploadRes = await uploadFile('/api/evidence/upload', 'file', 'valid.png', realPng, { asset_tag: testAssetTag, doc_type: 'DAMAGE_PHOTO' }, adminHeaders, 'image/png');
    assert((validPngUploadRes.status === 200 || validPngUploadRes.status === 201) && validPngUploadRes.body.evidence, 'Valid PNG accepted with doc_type = DAMAGE_PHOTO');
    if (validPngUploadRes.body.evidence) {
      assert(validPngUploadRes.body.evidence.doc_type === 'DAMAGE_PHOTO', 'Evidence record saved correct doc_type');
    }

    // 5. Point 3: Emergency Password Reset (Zero Backdoors)
    const resetReqRes = await api('POST', '/api/auth/request-reset', { username: 'admin' });
    if (resetReqRes.status === 503) {
      assert(true, 'Password reset returned 503 when email unconfigured');
    } else if (resetReqRes.status === 200) {
      assert(!resetReqRes.body.otp && !resetReqRes.body.token, 'Password reset response never leaks OTP or reset token');
    }

    // 6. Point 6: Soft-Delete & Restore

    // Soft-delete test asset
    const deleteRes = await api('DELETE', `/api/assets/${encodeURIComponent(testAssetTag)}`, null, adminHeaders);
    assert(deleteRes.status === 200, `Soft-deleted asset ${testAssetTag}`);

    // Verify it is viewable by admin with is_deleted=1 flag
    const lookupDeleted = await api('GET', `/api/assets/${encodeURIComponent(testAssetTag)}`, null, adminHeaders);
    assert(lookupDeleted.status === 200 && lookupDeleted.body.is_deleted === 1, 'Admin can view soft-deleted asset with is_deleted=1 flag');

    // Restore test asset
    const restoreRes = await api('POST', `/api/assets/${encodeURIComponent(testAssetTag)}/restore`, null, adminHeaders);
    assert(restoreRes.status === 200 && restoreRes.body.message.includes('กู้คืน'), 'Soft-deleted asset successfully restored');

    // Verify it is active again
    const lookupRestored = await api('GET', `/api/assets/${encodeURIComponent(testAssetTag)}`, null, adminHeaders);
    assert(lookupRestored.status === 200 && lookupRestored.body.is_deleted === 0, 'Restored asset is active (is_deleted=0)');

    // 6. Point 10: Batch Asset Intake (Preserving Cap 5 for Claims)
    const batchTag1 = `CIT-B1-${Date.now()}`;
    const batchTag2 = `CIT-B2-${Date.now()}`;
    const batchRes = await api('POST', '/api/assets/batch', {
      common: {
        category: 'Monitor',
        brand: 'Dell',
        model: 'P2422H',
        location: 'OPD Clinic',
        warranty_start: '2026-01-01',
        warranty_end: '2029-01-01',
        warranty_months: 36,
        purchase_price: 6500,
        po_number: 'PO-2026-BATCH',
        sanitization_required: 0
      },
      items: [
        { asset_tag: batchTag1, serial_no: `SN-B1-${Date.now()}`, device_name: 'Dell P2422H' },
        { asset_tag: batchTag2, serial_no: `SN-B2-${Date.now()}`, device_name: 'Dell P2422H' }
      ]
    }, adminHeaders);
    assert(batchRes.status === 201 && batchRes.body.count === 2, `Batch asset intake registered 2 assets successfully (${batchRes.body.log_code})`);

    // Verify Cap 5 is PRESERVED on claims
    const overCapClaimRes = await api('POST', '/api/claims', {
      asset_tags: [batchTag1, batchTag2, 'CIT-MON-991', 'CIT-MON-992', 'CIT-MON-993', 'CIT-MON-994'],
      claim_type: 'Warranty Repair',
      notes: 'Over cap test'
    }, adminHeaders);
    assert(overCapClaimRes.status === 400 && (overCapClaimRes.body.error.includes('5') || overCapClaimRes.body.error.includes('เกิน')), 'Claim creation strictly enforces MAX_ASSETS_PER_CLAIM = 5');

    // 7. Point 9 & 14: State Machine Revert & High-Value Approval Gate
    const vendorRmaNum = `DELL-RMA-${Date.now()}`;
    const validClaimRes = await api('POST', '/api/claims', {
      asset_tags: [batchTag1],
      vendor_name: 'Dell Thailand',
      vendor_rma_number: vendorRmaNum,
      claim_type: 'Warranty Repair',
      notes: 'Display backlight flickering'
    }, adminHeaders);
    assert(validClaimRes.status === 201 && validClaimRes.body.claim && validClaimRes.body.claim.id, `Created multi-asset claim ${validClaimRes.body.claim?.claim_number}`);
    const claimId = validClaimRes.body.claim.id;

    // Advance to VIABLE
    const toViableRes = await api('PUT', `/api/claims/${claimId}/status`, {
      status: 'VIABLE',
      notes: 'Hardware confirmed broken'
    }, adminHeaders);
    assert(toViableRes.status === 200, 'Advanced claim to VIABLE');

    // Revert VIABLE back to DRAFT (Point 9)
    const revertDraftRes = await api('PUT', `/api/claims/${claimId}/status`, {
      status: 'DRAFT',
      notes: 'Technician re-evaluating symptoms'
    }, adminHeaders);
    assert(revertDraftRes.status === 200 && revertDraftRes.body.claim && revertDraftRes.body.claim.status === 'DRAFT', 'Successfully reverted claim status from VIABLE to DRAFT');

    // Advance back to VIABLE
    await api('PUT', `/api/claims/${claimId}/status`, { status: 'VIABLE' }, adminHeaders);

    // Try to advance to CONFIRMED with high repair cost (> 20,000) WITHOUT supervisor approval (Point 14)
    const unapprovedHighCostRes = await api('PUT', `/api/claims/${claimId}/status`, {
      status: 'CONFIRMED',
      repair_cost: 35000,
      notes: 'Panel replacement'
    }, adminHeaders);
    assert(unapprovedHighCostRes.status === 400 && (unapprovedHighCostRes.body.requires_supervisor_approval || unapprovedHighCostRes.body.error.includes('Supervisor')), 'High-value repair (> ฿20,000) blocked without supervisor approval');

    // Advance to CONFIRMED WITH supervisor approval
    const approvedHighCostRes = await api('PUT', `/api/claims/${claimId}/status`, {
      status: 'CONFIRMED',
      repair_cost: 35000,
      supervisor_approval: true,
      notes: 'Panel replacement approved by IT Supervisor'
    }, adminHeaders);
    assert(approvedHighCostRes.status === 200 && approvedHighCostRes.body.claim && approvedHighCostRes.body.claim.status === 'CONFIRMED', 'High-value repair approved and advanced to CONFIRMED');

    // Advance to SUBMITTED so vendor webhook can respond
    const submittedRes = await api('PUT', `/api/claims/${claimId}/status`, {
      status: 'SUBMITTED',
      notes: 'Dispatched to vendor'
    }, adminHeaders);
    assert(submittedRes.status === 200, 'Claim transitioned to SUBMITTED');

    // 8. Point 15: Inbound Vendor Webhook
    // 8.1 Without webhook key
    const unauthWebhookRes = await api('POST', '/api/webhooks/vendor-update', {
      vendor_rma_number: vendorRmaNum,
      status: 'VENDOR_RESPONSE'
    });
    assert(unauthWebhookRes.status === 401, 'Vendor webhook rejected unauthenticated request');

    // 8.2 With valid webhook key
    const authWebhookRes = await api('POST', '/api/webhooks/vendor-update', {
      vendor_rma_number: vendorRmaNum,
      status: 'VENDOR_RESPONSE',
      notes: 'Part inspected by vendor engineers'
    }, { 'X-Vendor-Webhook-Key': 'claimit_vendor_webhook_secret_2026' });
    assert(authWebhookRes.status === 200 && authWebhookRes.body.claim_id, 'Vendor webhook processed RMA status update successfully');

    // 9. Point 11: Assets summary with expiring_60d
    const summaryRes = await api('GET', '/api/assets/summary', null, adminHeaders);
    assert(summaryRes.status === 200 && summaryRes.body.expiring_60d !== undefined, 'Asset summary returns expiring_60d count for proactive topbar badge');

    console.log('\n====================================================');
    console.log(`Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal verification error:', err);
    process.exit(1);
  }
}

runVerification();
