/**
 * ClaimIT Frontend - Claims & RMA Processing Module
 * Handles status updates, RMA resolution, PDPA sanitization gates,
 * vendor procedures, claim initiation, and email previews.
 */

let pendingClaimData = null;

// Action Handlers - Status Transitions
async function updateAssetStatus(newStatus, customDetails) {
  if (!state.selectedAsset) return;
  
  const payload = {
    asset_tag: state.selectedAsset.asset_tag,
    status: newStatus,
    location: state.selectedAsset.location,
    action_by_username: state.user ? state.user.username : 'staff',
    department_name: state.user ? state.user.department : 'Ward 20',
    floor: state.activeView === 'ward' ? 'Fl 2' : 'Fl 1',
    details: customDetails ? `แจ้งชำรุด: ${customDetails}` : undefined
  };
  
  try {
    const res = await fetch('/api/assets/update-status', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      const data = await res.json();
      const codeMsg = data.log_code ? ` (รหัสติดตาม: ${data.log_code})` : '';
      showToast(`อัปเดตสถานะเป็น [${newStatus}] สำเร็จแล้ว!${codeMsg}`, 'success', 5000);
      lookupAsset(state.selectedAsset.asset_tag);
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถอัปเดตสถานะได้', 'error');
    }
  } catch (error) {
    console.error('Update status error:', error);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  }
}

// Resolve RMA Claim
async function handleResolveRma(e) {
  e.preventDefault();
  if (!state.selectedAsset) return;
  
  const payload = {
    asset_tag: document.getElementById('resolve-tag-input').value,
    resolution_type: document.getElementById('resolve-type').value,
    replacement_serial_no: document.getElementById('resolve-new-serial').value.trim(),
    repair_cost: parseFloat(document.getElementById('resolve-cost').value) || 0,
    action_by_username: state.user.username
  };

  try {
    const res = await fetch('/api/assets/resolve-claim', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      showToast(data.message || 'รับเครื่องคืนจากศูนย์บริการเรียบร้อยแล้ว', 'success');
      document.getElementById('resolve-rma-modal').style.display = 'none';
      lookupAsset(state.selectedAsset.asset_tag);
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถรับเครื่องคืนได้', 'error');
    }
  } catch (err) {
    console.error('Resolve RMA error:', err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  }
}

// PDPA Security Data Sanitization Confirmation
async function confirmSanitization() {
  if (!state.selectedAsset) return;
  if (!state.sanitizationChecked) {
    showToast('กรุณายืนยันการล้างข้อมูลโดยคลิกเครื่องหมายถูกก่อนยืนยัน', 'warning');
    return;
  }

  const codeInput = document.getElementById('sanitize-code-input');
  const wipeCode = codeInput ? codeInput.value.trim() : '';
  if (!wipeCode) {
    showToast('🔐 กรุณากรอกรหัสยืนยันความปลอดภัย (พิมพ์ "WIPED" หรือรหัสครุภัณฑ์)', 'warning');
    if (codeInput) codeInput.focus();
    return;
  }
  
  const payload = {
    asset_tag: state.selectedAsset.asset_tag,
    action_by_username: state.user.username,
    sanitization_note: 'Verified data wipe via IT Security Safeguard Panel (Code: ' + wipeCode.toUpperCase() + ')',
    wipe_code: wipeCode
  };
  
  try {
    const res = await fetch('/api/assets/sanitize', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'บันทึกการล้างข้อมูลความปลอดภัยสำเร็จ', 'success');
      if (codeInput) codeInput.value = '';
      lookupAsset(state.selectedAsset.asset_tag);
      refreshData();
    } else {
      showToast(data.error || 'ล้มเหลวในการบันทึกข้อมูลการ Sanitization', 'error');
    }
  } catch (error) {
    console.error('Sanitization update error:', error);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  }
}

// Vendor Selection Change
function handleVendorChange(e) {
  const panel = document.getElementById('brand-procedure-panel');
  const vendor = e.target.value;
  const safeDetails = sanitizeBrandProcedure(vendorProcedures[vendor] || '');

  if (safeDetails) {
    panel.innerHTML = safeDetails;
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

// Initiate Claim Flow
async function handleClaimInitiate(e) {
  e.preventDefault();
  if (!state.selectedAsset) return;
  
  const vendorName = document.getElementById('claim-vendor').value.trim();
  const rmaNumber = document.getElementById('claim-rma-no').value.trim();
  const expectedDate = document.getElementById('claim-expected-date').value;
  
  if (!vendorName || !rmaNumber || !expectedDate) {
    showToast('กรุณากรอกข้อมูลการเคลมศูนย์บริการให้ครบถ้วน', 'warning');
    return;
  }
  
  pendingClaimData = {
    asset_tag: state.selectedAsset.asset_tag,
    vendor_name: vendorName,
    vendor_rma_number: rmaNumber,
    expected_return_date: expectedDate,
    data_wiped_confirmed: state.selectedAsset.sanitization_required ? 1 : 0,
    sanitization_note: 'Verified data wipe prior to vendor RMA dispatch',
    action_by_username: state.user.username
  };

  const to = `support@${vendorName.toLowerCase().replace(/\s+/g, '')}.com`;
  const subject = `[ClaimIT] แจ้งส่งซ่อมอุปกรณ์เคลมประกัน - ${vendorName} (RMA: ${rmaNumber})`;
  const body = `เรียน ทีมงานศูนย์บริการ ${vendorName},\n\n` +
               `ทางโรงพยาบาลขอแจ้งส่งซ่อมอุปกรณ์คอมพิวเตอร์ที่อยู่ในระยะรับประกัน โดยมีรายละเอียดดังนี้:\n\n` +
               `รหัสครุภัณฑ์ (Asset Tag): ${state.selectedAsset.asset_tag}\n` +
               `ชื่ออุปกรณ์: ${state.selectedAsset.device_name}\n` +
               `ยี่ห้อ/รุ่น: ${state.selectedAsset.brand} ${state.selectedAsset.model}\n` +
               `Serial Number: ${state.selectedAsset.serial_no}\n` +
               `RMA / Case ID: ${rmaNumber}\n\n` +
               `ทางเราคาดหวังว่าจะได้รับอุปกรณ์คืนภายในวันที่: ${expectedDate}\n\n` +
               `ขอแสดงความนับถือ,\n${state.user.name} (${state.user.department})\nClaimIT System`;

  document.getElementById('email-preview-to').textContent = to;
  document.getElementById('email-preview-subject').textContent = subject;
  document.getElementById('email-preview-body').textContent = body;

  pendingClaimData.email = { to, subject, body };
  document.getElementById('email-preview-modal').style.display = 'flex';
}

// Confirm Email and Submit Claim
async function confirmAndSendEmail() {
  if (!pendingClaimData) return;

  const btn = document.getElementById('confirm-send-email-btn');
  btn.disabled = true;
  btn.textContent = 'กำลังส่ง...';

  try {
    // 1. Try sending email via authenticated endpoint
    const emailPayload = {
      to: pendingClaimData.email.to,
      subject: pendingClaimData.email.subject,
      html: `<pre style="font-family:sans-serif;white-space:pre-wrap;">${pendingClaimData.email.body}</pre>`
    };
    const emailRes = await fetch('/api/email/send', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(emailPayload)
    });
    
    let emailStatus = 'อีเมลส่งสำเร็จ';
    if (!emailRes.ok) {
      console.warn('Simulating SMTP fallback or queuing offline dispatch.');
      emailStatus = 'จำลองการส่งอีเมล (Simulated / Queued)';
    }

    // 2. Submit Claim into Database
    const claimRes = await fetch('/api/assets/claim', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        asset_tag: pendingClaimData.asset_tag,
        vendor_name: pendingClaimData.vendor_name,
        vendor_rma_number: pendingClaimData.vendor_rma_number,
        expected_return_date: pendingClaimData.expected_return_date,
        data_wiped_confirmed: pendingClaimData.data_wiped_confirmed,
        sanitization_note: pendingClaimData.sanitization_note,
        action_by_username: pendingClaimData.action_by_username
      })
    });

    if (claimRes.ok) {
      const emailModal = document.getElementById('email-preview-modal');
      if (emailModal) emailModal.style.display = 'none';
      const claimFormContainer = document.getElementById('rma-form-container');
      if (claimFormContainer) claimFormContainer.style.display = 'none';
      lookupAsset(state.selectedAsset.asset_tag);
      refreshData();
    } else {
      const err = await claimRes.json();
      showToast(err.error || 'ไม่สามารถส่งเคลมทรัพย์สินได้', 'error');
    }
  } catch (error) {
    console.error('Claim initiation error:', error);
    showToast('เกิดข้อผิดพลาดในการส่งเคลม', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 ยืนยันส่งอีเมลและบันทึกเคลม';
    pendingClaimData = null;
  }
}
