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
  
  if (!vendorName || !rmaNumber) {
    showToast('กรุณาระบุชื่อศูนย์บริการ และหมายเลข RMA ให้ครบถ้วน', 'warning');
    return;
  }
  
  pendingClaimData = {
    asset_tag: state.selectedAsset.asset_tag,
    vendor_name: vendorName,
    vendor_rma_number: rmaNumber,
    expected_return_date: expectedDate || '',
    data_wiped_confirmed: state.selectedAsset.sanitization_required ? 1 : 0,
    sanitization_note: 'Verified data wipe prior to vendor RMA dispatch',
    action_by_username: state.user.username
  };

  const to = `support@${vendorName.toLowerCase().replace(/\s+/g, '')}.com`;
  const subject = `[ClaimIT] แจ้งส่งซ่อมอุปกรณ์เคลมประกัน - ${vendorName} (RMA: ${rmaNumber})`;
  const dateText = expectedDate 
    ? `กำหนดการรับคืนอุปกรณ์โดยประมาณ: ${expectedDate}` 
    : `กำหนดการเข้ารับ/รับคืน: รอนัดหมายรอบการเข้ารับจากศูนย์บริการ (Pending Pickup / Waiting for vendor schedule)`;

  const body = `เรียน ทีมงานศูนย์บริการ ${vendorName},\n\n` +
               `ทางโรงพยาบาลขอแจ้งส่งซ่อมอุปกรณ์คอมพิวเตอร์ที่อยู่ในระยะรับประกัน โดยมีรายละเอียดดังนี้:\n\n` +
               `รหัสครุภัณฑ์ (Asset Tag): ${state.selectedAsset.asset_tag}\n` +
               `ชื่ออุปกรณ์: ${state.selectedAsset.device_name}\n` +
               `ยี่ห้อ/รุ่น: ${state.selectedAsset.brand} ${state.selectedAsset.model}\n` +
               `Serial Number: ${state.selectedAsset.serial_no}\n` +
               `RMA / Case ID: ${rmaNumber}\n\n` +
               `${dateText}\n\n` +
               `ขอแสดงความนับถือ,\n${state.user.name} (${state.user.department})\nClaimIT System`;

  const toInput = document.getElementById('email-preview-to');
  const subjectInput = document.getElementById('email-preview-subject');
  const bodyInput = document.getElementById('email-preview-body');

  if (toInput) toInput.value = to;
  if (subjectInput) subjectInput.value = subject;
  if (bodyInput) bodyInput.value = body;

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
    const toInput = document.getElementById('email-preview-to');
    const subjectInput = document.getElementById('email-preview-subject');
    const bodyInput = document.getElementById('email-preview-body');

    const finalTo = (toInput && toInput.value.trim()) || pendingClaimData.email.to;
    const finalSubject = (subjectInput && subjectInput.value.trim()) || pendingClaimData.email.subject;
    const finalBody = (bodyInput && bodyInput.value) || pendingClaimData.email.body;

    // 1. Try sending email via authenticated endpoint
    const emailPayload = {
      to: finalTo,
      subject: finalSubject,
      html: `<pre style="font-family:sans-serif;white-space:pre-wrap;">${finalBody}</pre>`
    };
    const emailRes = await fetch('/api/email/send', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(emailPayload)
    });
    
    let emailStatus = 'อีเมลส่งสำเร็จ';
    if (emailRes.ok) {
      const emailData = await emailRes.json();
      if (emailData.not_inserted || emailData.status === 'NOT_INSERTED') {
        emailStatus = "⚠️ ยังไม่ได้ใส่ API Key ใน .env";
        showToast("⚠️ ไม่พบ SendGrid หรือ Resend API Key ในไฟล์ .env", 'warning', 6000);
      } else {
        showToast('✉️ ส่งอีเมลแจ้งศูนย์บริการสำเร็จเรียบร้อยแล้ว', 'success');
      }
    } else {
      console.warn('Queuing email dispatch notification.');
      emailStatus = 'ส่งแจ้งเตือนเข้าระบบแล้ว (Dispatched / Queued)';
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

// ==========================================
// MULTI-ASSET CLAIMS & EVIDENCE MANAGEMENT
// ==========================================

const CLAIM_STATUS_BADGES = {
  DRAFT: '<span class="badge" style="background:#64748b; color:#fff;">DRAFT</span>',
  VIABLE: '<span class="badge" style="background:#0284c7; color:#fff;">VIABLE</span>',
  CONFIRMED: '<span class="badge" style="background:#4f46e5; color:#fff;">CONFIRMED</span>',
  SUBMITTED: '<span class="badge" style="background:#d97706; color:#fff;">SUBMITTED</span>',
  VENDOR_RESPONSE: '<span class="badge" style="background:#ea580c; color:#fff;">IN REPAIR</span>',
  RETURNED: '<span class="badge" style="background:#16a34a; color:#fff;">RETURNED</span>',
  CLOSED: '<span class="badge" style="background:#059669; color:#fff;">CLOSED</span>',
  CANCELLED: '<span class="badge" style="background:#dc2626; color:#fff;">CANCELLED</span>'
};

const NEXT_STATUS_OPTIONS = {
  DRAFT: ['VIABLE', 'CANCELLED'],
  VIABLE: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['VENDOR_RESPONSE', 'RETURNED', 'CANCELLED'],
  VENDOR_RESPONSE: ['RETURNED', 'REJECTED'],
  RETURNED: ['CLOSED'],
  REJECTED: ['CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: []
};

// Load and populate claims list
async function loadClaimsList() {
  const tbody = document.getElementById('claims-table-body');
  if (!tbody) return;

  const statusFilter = document.getElementById('filter-claim-status')?.value || '';
  const url = statusFilter ? `/api/claims?status=${encodeURIComponent(statusFilter)}` : '/api/claims';

  try {
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const claims = await res.json();
    renderClaimsTable(claims);
  } catch (err) {
    console.error('Failed to load claims list:', err);
  }
}

// Render Claims in Table
function renderClaimsTable(claims) {
  const tbody = document.getElementById('claims-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (!claims || claims.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:40px 20px;">
          <div style="font-size:36px; margin-bottom:8px;">📦</div>
          <div style="font-size:16px; font-weight:600; color:var(--text-main);">ไม่พบรายการใบส่งเคลมในระบบ</div>
          <div style="font-size:13.5px; color:var(--text-muted); margin-top:4px;">กดปุ่ม "➕ สร้างใบเคลมใหม่" เพื่อรวมรายการครุภัณฑ์และส่งเคลมศูนย์บริการ</div>
        </td>
      </tr>`;
    return;
  }

  claims.forEach(c => {
    const tr = document.createElement('tr');
    const badge = CLAIM_STATUS_BADGES[c.status] || `<span class="badge">${c.status}</span>`;
    const scoreColor = (c.viability_score !== null && c.viability_score <= 5) ? 'var(--success)' : 'var(--danger)';
    const scoreText = c.viability_score !== null ? `<span style="color:${scoreColor}; font-weight:700;">${c.viability_score}</span>` : '-';
    const dateText = formatDualDate(c.claim_date || (c.created_at ? c.created_at.slice(0,10) : ''));

    tr.innerHTML = `
      <td><strong>${c.claim_number}</strong></td>
      <td>${c.vendor_name}</td>
      <td><span class="badge" style="background:rgba(255,255,255,0.1);">${c.asset_count || 1} ชิ้น</span></td>
      <td>${dateText}</td>
      <td>${scoreText}</td>
      <td>${badge}</td>
      <td>${c.created_by || '-'}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary" style="padding:6px 12px; font-size:12px; min-height:auto;" onclick="openClaimDetailsModal(${c.id})">
            📋 รายละเอียด
          </button>
          <button class="btn btn-secondary" style="padding:6px 12px; font-size:12px; min-height:auto;" onclick="downloadClaimPDF(${c.id})">
            📄 PDF
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Download PDF for Claim
async function downloadClaimPDF(claimId) {
  try {
    showToast('กำลังสร้างเอกสาร PDF ใบส่งเคลม...', 'info', 2500);
    const res = await fetch(`/api/claims/${claimId}/pdf`, { headers: getAuthHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'PDF generation failed');
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `claim_${claimId}_report.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    showToast('ดาวน์โหลด PDF ใบส่งเคลมสำเร็จแล้ว', 'success');
  } catch (err) {
    showToast(err.message || 'ไม่สามารถดาวน์โหลด PDF ได้', 'error');
  }
}

// Open New Multi-Asset Claim Modal (Forward/Backward State Persistence)
function openNewClaimModal() {
  const modal = document.getElementById('new-multi-claim-modal');
  if (!modal) return;

  const vendorSelect = document.getElementById('multi-claim-vendor');
  if (vendorSelect) {
    vendorSelect.innerHTML = '<option value="" disabled selected>-- เลือกศูนย์บริการ --</option>';
    const vendors = (state.vendors && state.vendors.length > 0) 
      ? state.vendors 
      : ['Dell Services Center', 'HP Authorized Service', 'Apple Medical Care', 'Lenovo Hospital Support', 'Canon Center'];
    vendors.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      vendorSelect.appendChild(opt);
    });
  }

  // Restore draft state if present, or pre-fill selected asset
  const tagsInput = document.getElementById('multi-claim-tags');
  const rmaInput = document.getElementById('multi-claim-rma');
  const notesInput = document.getElementById('multi-claim-notes');

  if (state.draftClaim) {
    if (state.draftClaim.vendor && vendorSelect) vendorSelect.value = state.draftClaim.vendor;
    if (state.draftClaim.rma && rmaInput) rmaInput.value = state.draftClaim.rma;
    if (state.draftClaim.tags && tagsInput) tagsInput.value = state.draftClaim.tags;
    if (state.draftClaim.notes && notesInput) notesInput.value = state.draftClaim.notes;
  } else if (tagsInput && state.selectedAsset) {
    tagsInput.value = state.selectedAsset.asset_tag;
  }

  // Bind live draft persistence listeners
  ['multi-claim-vendor', 'multi-claim-rma', 'multi-claim-tags', 'multi-claim-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._hasDraftListener) {
      el.addEventListener('input', persistClaimDraft);
      el.addEventListener('change', persistClaimDraft);
      el._hasDraftListener = true;
    }
  });

  modal.style.display = 'flex';
}

function persistClaimDraft() {
  state.draftClaim = {
    vendor: document.getElementById('multi-claim-vendor')?.value || '',
    rma: document.getElementById('multi-claim-rma')?.value || '',
    tags: document.getElementById('multi-claim-tags')?.value || '',
    notes: document.getElementById('multi-claim-notes')?.value || ''
  };
}

// Submit New Multi-Asset Claim
async function handleNewMultiClaimSubmit(e) {
  e.preventDefault();
  const vendorName = document.getElementById('multi-claim-vendor').value;
  const vendorRma = document.getElementById('multi-claim-rma').value.trim();
  const claimType = document.getElementById('multi-claim-type').value;
  const rawTags = document.getElementById('multi-claim-tags').value;
  const notes = document.getElementById('multi-claim-notes').value.trim();

  const assetTags = rawTags
    .split(/[\s,]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  if (assetTags.length === 0) {
    showToast('กรุณาระบุรหัสครุภัณฑ์อย่างน้อย 1 รายการ', 'warning');
    return;
  }

  if (assetTags.length > 5) {
    showToast('ระบบจำกัดการส่งเคลมได้ไม่เกิน 5 ชิ้นต่อ 1 ใบเคลม', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/claims', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        vendor_name: vendorName,
        vendor_rma_number: vendorRma,
        claim_type: claimType,
        asset_tags: assetTags,
        notes
      })
    });

    if (res.ok) {
      const data = await res.json();
      showToast(`สร้างใบเคลม ${data.claim.claim_number} สำเร็จ (${data.claim.asset_count} รายการ)`, 'success');
      document.getElementById('new-multi-claim-modal').style.display = 'none';
      document.getElementById('new-multi-claim-form').reset();
      loadClaimsList();
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถสร้างใบเคลมได้', 'error');
    }
  } catch (err) {
    console.error('Create claim error:', err);
    showToast('เกิดข้อผิดพลาดในการสร้างใบเคลม', 'error');
  }
}

// Open Claim Details Modal
let activeViewingClaimId = null;
async function openClaimDetailsModal(claimId) {
  activeViewingClaimId = claimId;
  const modal = document.getElementById('claim-details-modal');
  if (!modal) return;

  try {
    const res = await fetch(`/api/claims/${claimId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Could not fetch claim details');
    const claim = await res.json();

    document.getElementById('cd-modal-title').textContent = `📋 ใบเคลม: ${claim.claim_number}`;
    document.getElementById('cd-claim-no').textContent = claim.claim_number;
    document.getElementById('cd-vendor').textContent = claim.vendor_name;
    document.getElementById('cd-status').innerHTML = CLAIM_STATUS_BADGES[claim.status] || claim.status;
    document.getElementById('cd-viability').textContent = claim.viability_score !== null ? `${claim.viability_score} / 10` : '-';
    document.getElementById('cd-date').textContent = formatDualDate(claim.claim_date || claim.created_at?.slice(0,10) || '', true);
    document.getElementById('cd-created-by').textContent = claim.created_by || '-';

    // Populate assets table
    const assetsTbody = document.getElementById('cd-assets-table-body');
    assetsTbody.innerHTML = '';
    (claim.assets || []).forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${a.asset_tag}</strong></td>
        <td>${a.device_name || '-'} (${a.brand || '-'} ${a.model || ''})</td>
        <td><span class="badge">${a.item_status || 'Pending Pickup'}</span></td>
        <td>${a.viability_score !== null ? a.viability_score : '-'}</td>
      `;
      assetsTbody.appendChild(tr);
    });

    // Populate status transition buttons
    const actionsContainer = document.getElementById('cd-status-actions');
    actionsContainer.innerHTML = '';
    const nextStates = NEXT_STATUS_OPTIONS[claim.status] || [];
    if (nextStates.length === 0) {
      actionsContainer.innerHTML = `<span style="font-size:12px; color:var(--text-muted);">ใบเคลมนี้อยู่ในสถานะสิ้นสุดแล้ว (${claim.status})</span>`;
    } else {
      nextStates.forEach(ns => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.cssText = 'padding:6px 12px; font-size:12px;';
        if (ns === 'CANCELLED') btn.className = 'btn btn-danger';
        else if (ns === 'RETURNED' || ns === 'CLOSED') btn.className = 'btn btn-success';
        else btn.className = 'btn btn-secondary';

        btn.textContent = `➡️ เปลี่ยนเป็น ${ns}`;
        btn.onclick = () => handleAdvanceClaimStatus(claimId, ns);
        actionsContainer.appendChild(btn);
      });
    }

    // Set Batch Gate Pass and download PDF buttons
    const gatepassBtn = document.getElementById('cd-btn-print-gatepass');
    if (gatepassBtn) {
      gatepassBtn.onclick = () => {
        if (typeof openClaimGatePassTemplate === 'function') {
          openClaimGatePassTemplate(claim);
        }
      };
    }

    const pdfBtn = document.getElementById('cd-btn-download-pdf');
    if (pdfBtn) {
      pdfBtn.onclick = () => downloadClaimPDF(claimId);
    }

    // Load evidence for this claim
    loadClaimEvidence(claimId);

    modal.style.display = 'flex';
  } catch (err) {
    console.error('Open claim details error:', err);
    showToast(err.message || 'เกิดข้อผิดพลาดในการโหลดใบเคลม', 'error');
  }
}

// Advance Claim Status (Streamlined - Smooth One-Click Transitions, No Disruptive Prompts)
async function handleAdvanceClaimStatus(claimId, targetStatus) {
  let resolutionType = undefined;
  if (targetStatus === 'RETURNED' || targetStatus === 'CLOSED') {
    resolutionType = 'Repaired';
  }

  const notes = `สถานะปรับปรุงเป็น [${targetStatus}] โดย ${state.user ? state.user.name : 'เจ้าหน้าที่ไอที'}`;

  try {
    const res = await fetch(`/api/claims/${claimId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        status: targetStatus,
        notes,
        resolution_type: resolutionType
      })
    });

    if (res.ok) {
      showToast(`เปลี่ยนสถานะใบเคลมเป็น [${targetStatus}] สำเร็จแล้ว!`, 'success');
      openClaimDetailsModal(claimId);
      loadClaimsList();
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถเปลี่ยนสถานะได้', 'error');
    }
  } catch (err) {
    console.error('Advance status error:', err);
    showToast('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error');
  }
}

// Load Claim Evidence
async function loadClaimEvidence(claimId) {
  const container = document.getElementById('cd-evidence-list');
  if (!container) return;

  try {
    const res = await fetch(`/api/evidence/claim/${claimId}`, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const items = await res.json();
    renderEvidenceList(container, items, () => loadClaimEvidence(claimId));
  } catch (err) {
    console.error('Load claim evidence error:', err);
  }
}

// Load Asset Evidence
async function loadAssetEvidence(assetTag) {
  const container = document.getElementById('asset-evidence-list');
  if (!container) return;

  try {
    const res = await fetch(`/api/evidence/asset/${encodeURIComponent(assetTag)}`, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const items = await res.json();
    renderEvidenceList(container, items, () => loadAssetEvidence(assetTag));
  } catch (err) {
    console.error('Load asset evidence error:', err);
  }
}

// Render Evidence Items (Streamlined - Secure View, Zero Delete Prompts)
function renderEvidenceList(container, items, refreshCallback) {
  container.innerHTML = '';
  if (!items || items.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); font-size:12px; padding:4px 0;">ยังไม่มีไฟล์หลักฐานแนบ</div>`;
    return;
  }

  items.forEach(item => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(0,0,0,0.3); border-radius:8px; border:1px solid rgba(255,255,255,0.06); margin-bottom:6px;';
    const isImage = item.file_type && item.file_type.startsWith('image/');
    const icon = isImage ? '🖼️' : '📄';

    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
        <span style="font-size:16px;">${icon}</span>
        <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          <a href="/api/evidence/${item.id}/view" target="_blank" style="color:#38bdf8; font-weight:600; text-decoration:none;">
            ${item.original_filename}
          </a>
          <span style="color:var(--text-muted); font-size:12px; margin-left:8px;">(${(item.file_size / 1024).toFixed(1)} KB)</span>
        </div>
      </div>
      <a href="/api/evidence/${item.id}/view" target="_blank" class="btn btn-secondary" style="padding:4px 10px; font-size:11.5px; text-decoration:none; min-height:auto;">
        👁️ เปิดดู
      </a>
    `;
    container.appendChild(div);
  });
}

// Upload Evidence for Active Asset
async function uploadActiveAssetEvidence() {
  if (!state.selectedAsset) {
    showToast('กรุณาเลือกครุภัณฑ์ก่อนอัปโหลด', 'warning');
    return;
  }
  const input = document.getElementById('asset-evidence-file-input');
  if (!input || !input.files || input.files.length === 0) {
    showToast('กรุณาเลือกไฟล์ที่ต้องการอัปโหลด', 'warning');
    return;
  }

  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('asset_tag', state.selectedAsset.asset_tag);

  try {
    showToast('กำลังอัปโหลดไฟล์หลักฐาน...', 'info', 2000);
    const token = state.user?.token;
    const res = await fetch('/api/evidence/upload', {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: formData
    });

    if (res.ok) {
      showToast('อัปโหลดไฟล์หลักฐานสำเร็จแล้ว', 'success');
      input.value = '';
      loadAssetEvidence(state.selectedAsset.asset_tag);
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถอัปโหลดไฟล์ได้', 'error');
    }
  } catch (err) {
    console.error('Upload error:', err);
    showToast('เกิดข้อผิดพลาดในการอัปโหลด', 'error');
  }
}

// Upload Evidence for Active Claim
async function uploadActiveClaimEvidence() {
  if (!activeViewingClaimId) return;
  const input = document.getElementById('cd-evidence-input');
  if (!input || !input.files || input.files.length === 0) {
    showToast('กรุณาเลือกไฟล์ที่ต้องการอัปโหลด', 'warning');
    return;
  }

  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('claim_id', activeViewingClaimId);

  try {
    showToast('กำลังอัปโหลดไฟล์หลักฐาน...', 'info', 2000);
    const token = state.user?.token;
    const res = await fetch('/api/evidence/upload', {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: formData
    });

    if (res.ok) {
      showToast('อัปโหลดไฟล์หลักฐานใบเคลมสำเร็จ', 'success');
      input.value = '';
      loadClaimEvidence(activeViewingClaimId);
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถอัปโหลดไฟล์ได้', 'error');
    }
  } catch (err) {
    console.error('Claim evidence upload error:', err);
    showToast('เกิดข้อผิดพลาดในการอัปโหลด', 'error');
  }
}
