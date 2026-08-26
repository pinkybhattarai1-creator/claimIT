/**
 * ClaimIT Frontend - Asset Management Module
 * Handles asset lookup, details display, live duplicate checker,
 * warranty calculations, claim worthiness evaluation, and salvage actions.
 */

// Asset Status Badges HTML Builder
function getStatusBadgeHTML(asset) {
  const status = asset.status;
  const salvageStatus = asset.salvage_status;
  const isExpired = new Date(asset.warranty_end) < new Date();

  if (salvageStatus === 'Pending Sell') {
    return `<span class="badge badge-sell">💰 รอขายทอดตลาด</span>`;
  }
  if (salvageStatus === 'Sold') {
    return `<span class="badge badge-sell">💰 ขายทอดตลาดแล้ว</span>`;
  }
  if (salvageStatus === 'Pending Donation') {
    return `<span class="badge badge-donation">🎁 รอดำเนินการบริจาค</span>`;
  }
  if (salvageStatus === 'Donated') {
    return `<span class="badge badge-donation">🎁 บริจาคเรียบร้อย</span>`;
  }
  if (salvageStatus === 'Scrapped' || status === 'Scrapped') {
    return `<span class="badge badge-scrapped">🗑️ แทงจำหน่าย (Scrapped)</span>`;
  }
  if (status === 'Broken' || (isExpired && status !== 'Working' && status !== 'Pending Pickup')) {
    return `<span class="badge badge-broken">🔴 ชำรุด/หมดประกัน (Danger)</span>`;
  }
  if (status === 'Pending Pickup') {
    return `<span class="badge badge-vendor">🟡 รอศูนย์เข้ามารับ</span>`;
  }
  return `<span class="badge badge-working">🟢 ปกติ (Working)</span>`;
}

// Populate Asset Inventory Table with 1-Click PDF Button
function populateAssetTable(assets) {
  const tbody = document.getElementById('it-asset-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  assets.forEach(asset => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.addEventListener('click', () => {
      document.getElementById('it-search-input').value = asset.asset_tag;
      lookupAsset(asset.asset_tag);
    });
    
    const priceText = asset.purchase_price ? `฿${asset.purchase_price.toLocaleString()}` : '-';
    
    tr.innerHTML = `
      <td><strong>${asset.asset_tag}</strong></td>
      <td>${asset.device_name}</td>
      <td><strong>${asset.brand || '-'}</strong></td>
      <td>${asset.location}</td>
      <td>${asset.warranty_end}</td>
      <td>${priceText}</td>
      <td>${getStatusBadgeHTML(asset)}</td>
      <td>
        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px; white-space: nowrap;" onclick="event.stopPropagation(); downloadPDF('${asset.asset_tag}')" title="ดาวน์โหลดใบงานเคลม PDF ทันที">
          📄 PDF
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Lookup Asset Details
async function lookupAsset(tag) {
  const parsed = parseAssetTagLocal(tag);
  displayLocalParserResults(parsed);
  hideFuzzySuggestion();
  
  try {
    const res = await fetch(`/api/assets/${encodeURIComponent(tag)}`, { headers: getAuthHeaders() });
    if (res.ok) {
      const asset = await res.json();

      if (asset.is_fuzzy_match) {
        state.pendingFuzzyAsset = asset;
        const prefix = state.activeView === 'ward' ? 'ward' : 'it';
        const textEl = document.getElementById(`fuzzy-suggestion-${prefix}-text`);
        if (textEl) {
          textEl.innerHTML = `คุณหมายถึง <strong style="color:var(--warning);">${asset.asset_tag}</strong> — ${asset.device_name} (${asset.location}) ใช่หรือไม่?`;
        }
        const banner = document.getElementById(`fuzzy-suggestion-${prefix}`);
        if (banner) banner.style.display = 'flex';
      } else {
        state.selectedAsset = asset;
        addRecentScan(asset);
        displayAssetDetails(asset);
      }
    } else {
      showToast(`ไม่พบรหัส "${tag}" ในฐานข้อมูล (ประมาณการปีผลิต: ${parsed.year})`, 'warning', 4000);
      if (state.user && state.user.role === 'admin') {
        const addAssetModal = document.getElementById('add-asset-modal');
        if (addAssetModal) {
          addAssetModal.style.display = 'flex';
          document.getElementById('new-asset-tag').value = tag;
        }
      }
    }
  } catch (error) {
    console.error('Lookup failed:', error);
    showToast('เกิดข้อผิดพลาดในการค้นหาข้อมูล', 'error');
  }
}

// Evaluation Analytics
async function fetchAndDisplayEvaluation(assetTag, prefix) {
  const container = document.getElementById(`${prefix}-detail-evaluate`);
  if (!container) return;

  try {
    const res = await fetch(`/api/assets/${encodeURIComponent(assetTag)}/evaluate`, { headers: getAuthHeaders() });
    if (res.ok) {
      const evalData = await res.json();
      container.style.display = 'block';
      
      let html = '';
      if (evalData.isWorthClaiming) {
        container.style.background = 'rgba(16, 185, 129, 0.1)';
        container.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        container.style.color = '#10b981';
        html = `<strong>💡 ผลการวิเคราะห์ความคุ้มค่า (Claim Worthiness):</strong><br><span style="color:#fff;">${evalData.reason}</span>`;
      } else {
        container.style.background = 'rgba(239, 68, 68, 0.1)';
        container.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        container.style.color = '#ef4444';
        html = `<strong>⚠️ ผลการวิเคราะห์ความคุ้มค่า (Claim Worthiness):</strong><br><span style="color:#fff;">${evalData.reason}</span>`;
      }

      container.innerHTML = html;

      // Automatically show salvage disposal panel if equipment is EOL / non-repairable
      const salvagePanel = document.getElementById('salvage-panel');
      if (salvagePanel && prefix === 'it') {
        if (!evalData.isWorthClaiming || state.selectedAsset.status === 'Broken' || state.selectedAsset.salvage_status !== 'None') {
          salvagePanel.style.display = 'block';
        } else {
          salvagePanel.style.display = 'none';
        }
      }
    }
  } catch (err) {
    console.error('Evaluation fetch error:', err);
  }
}

// Display Asset Details in Ward/IT Panel
function displayAssetDetails(asset) {
  const prefix = state.activeView === 'ward' ? 'ward' : 'it';
  
  const warrantyEnd = new Date(asset.warranty_end);
  const today = new Date();
  const diffTime = warrantyEnd - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let warrantyHTML = '';
  if (diffDays > 0) {
    warrantyHTML = `<span style="color:var(--success); font-weight:600;">คงเหลือ ${diffDays} วัน (Active)</span>`;
  } else {
    warrantyHTML = `<span style="color:var(--danger); font-weight:600;">หมดอายุแล้ว (Expired) ${Math.abs(diffDays)} วัน</span>`;
  }
  
  document.getElementById(`${prefix}-detail-tag`).textContent = asset.asset_tag;
  document.getElementById(`${prefix}-detail-name`).textContent = asset.device_name;
  document.getElementById(`${prefix}-detail-serial`).textContent = asset.serial_no;
  document.getElementById(`${prefix}-detail-loc`).textContent = asset.location;
  document.getElementById(`${prefix}-detail-warranty`).innerHTML = `${asset.warranty_end} (${warrantyHTML})`;
  
  // --- WARRANTY QUICK-ACCESS PANEL ---
  const WARRANTY_LINKS = {
    'dell':     'https://www.dell.com/support/home/en-us',
    'lenovo':   'https://support.lenovo.com/warrantylookup',
    'acer':     'https://register.acer.co.th/WarrantyCheck/warr_chk.aspx',
    'hp':       'https://support.hp.com/us-en/check-warranty',
    'tsc':      'https://support.tscprinters.com/',
    'logitech': 'https://support.logi.com',
    'apple':    'https://checkcoverage.apple.com/',
    'zebra':    'https://www.zebra.com/us/en/support-downloads/warranty.html'
  };
  const brandKey = (asset.brand || '').toLowerCase().trim();
  let warrantyUrl = WARRANTY_LINKS[brandKey] || `https://www.google.com/search?q=${encodeURIComponent((asset.brand||'') + ' warranty check serial number')}`;

  const oldPanel = document.getElementById(`${prefix}-warranty-quick`);
  if (oldPanel) oldPanel.remove();

  const quickPanel = document.createElement('div');
  quickPanel.id = `${prefix}-warranty-quick`;
  quickPanel.style.cssText = 'display:flex; gap:8px; margin-top:10px; margin-bottom:4px; flex-wrap:wrap;';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn btn-secondary';
  copyBtn.style.cssText = 'font-size:12px; padding:7px 14px; flex:1; display:flex; align-items:center; justify-content:center; gap:6px;';
  copyBtn.innerHTML = '📋 คัดลอก Serial Number';
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(asset.serial_no);
      copyBtn.innerHTML = '✅ คัดลอกแล้ว!';
      copyBtn.style.background = 'var(--success)';
      setTimeout(() => {
        copyBtn.innerHTML = '📋 คัดลอก Serial Number';
        copyBtn.style.background = '';
      }, 2000);
    } catch {
      prompt('คัดลอก S/N นี้:', asset.serial_no);
    }
  };
  quickPanel.appendChild(copyBtn);

  const linkBtn = document.createElement('a');
  linkBtn.href = warrantyUrl;
  linkBtn.target = '_blank';
  linkBtn.rel = 'noopener noreferrer';
  linkBtn.className = 'btn btn-secondary';
  linkBtn.style.cssText = 'font-size:12px; padding:7px 14px; flex:1; display:flex; align-items:center; justify-content:center; gap:6px; text-decoration:none;';
  const brandLabel = asset.brand ? asset.brand.charAt(0).toUpperCase() + asset.brand.slice(1) : 'Brand';
  linkBtn.innerHTML = `🌐 ตรวจสอบรับประกัน ${brandLabel}`;
  quickPanel.appendChild(linkBtn);

  const serialEl = document.getElementById(`${prefix}-detail-serial`);
  if (serialEl) serialEl.closest('.detail-item').after(quickPanel);
  // --- END WARRANTY QUICK-ACCESS PANEL ---

  document.getElementById(`${prefix}-detail-status`).innerHTML = getStatusBadgeHTML(asset);
  document.getElementById(`${prefix}-details-card`).style.display = 'block';
  
  // Fetch and display claim worthiness calculator evaluation
  fetchAndDisplayEvaluation(asset.asset_tag, prefix);

  // Toggle Contextual Actions for IT
  if (prefix === 'it') {
    const btnSendClaim = document.getElementById('btn-action-send-claim');
    const btnResolve = document.getElementById('btn-action-resolve-rma');
    const sanitizationGate = document.getElementById('sanitization-gate-panel');
    
    // Hide actions by default
    btnSendClaim.style.display = 'none';
    btnResolve.style.display = 'none';
    sanitizationGate.style.display = 'none';

    // Show/hide vendor procedures guide
    const guideBox = document.getElementById('vendor-guide-box');
    const guideContent = document.getElementById('vendor-guide-content');
    const brand = asset.brand ? asset.brand.trim() : '';

    if (vendorProcedures[brand]) {
      guideContent.innerHTML = vendorProcedures[brand];
      guideBox.style.display = 'block';
    } else {
      guideBox.style.display = 'none';
    }

    // Security PDPA Sanitization Gate Check
    if (asset.sanitization_required) {
      sanitizationGate.style.display = 'block';
      const isWiped = asset.rma_data_wiped_confirmed || asset.status === 'Sanitized';
      document.getElementById('sanitization-status-badge').innerHTML = isWiped ? 
        '<span class="badge badge-working">✅ ผ่านการล้างข้อมูลความปลอดภัยแล้ว (Sanitized)</span>' : 
        '<span class="badge badge-broken">⚠️ ต้องทำการล้างข้อมูลความปลอดภัยก่อนส่งเคลม (PDPA Gate)</span>';
      
      const btnConfirmSanitize = document.getElementById('btn-confirm-sanitize');
      btnConfirmSanitize.disabled = isWiped;
      btnConfirmSanitize.textContent = isWiped ? 'ยืนยันความปลอดภัยเรียบร้อยแล้ว' : '🔒 ยืนยันการล้างข้อมูล (Wipe Data)';
    }

    if (asset.status === 'Broken' || asset.status === 'Sanitized') {
      const isWiped = !asset.sanitization_required || asset.rma_data_wiped_confirmed || asset.status === 'Sanitized';
      if (isWiped) {
        btnSendClaim.style.display = 'block';
        document.getElementById('claim-tag-input').value = asset.asset_tag;
      }
    } else if (asset.status === 'Pending Pickup') {
      btnResolve.style.display = 'block';
      btnResolve.textContent = '✅ รับเครื่องคืนจากศูนย์บริการ (Complete RMA)';
    }
  }
}

// Add Asset Live Pre-Check & Auto-Calculator
function setupAddAssetSafeguards() {
  const tagInput = document.getElementById('new-asset-tag');
  const serialInput = document.getElementById('new-serial');
  const warningBox = document.getElementById('add-asset-dup-warning');
  const warningMsg = document.getElementById('add-asset-dup-msg');
  const submitBtn = document.getElementById('btn-submit-add-asset');
  let dupTimer = null;

  function checkDuplicate(val) {
    clearTimeout(dupTimer);
    const tag = (val || '').trim().toUpperCase();
    if (!tag || tag.length < 3) {
      if (warningBox) warningBox.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;
      return;
    }
    dupTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/assets/check-tag/${encodeURIComponent(tag)}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            if (warningBox) warningBox.style.display = 'block';
            if (warningMsg) warningMsg.innerHTML = `รหัส/ซีเรียล <strong>${data.asset.asset_tag}</strong> (${data.asset.device_name}) มีอยู่ในระบบแล้ว!`;
            if (submitBtn) submitBtn.disabled = true;
          } else {
            if (warningBox) warningBox.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
          }
        }
      } catch (err) {
        console.error('Duplicate check error:', err);
      }
    }, 250);
  }

  if (tagInput) tagInput.addEventListener('input', (e) => checkDuplicate(e.target.value));
  if (serialInput) serialInput.addEventListener('input', (e) => checkDuplicate(e.target.value));

  // Auto-calculate warranty end date from start date + months
  const startInput = document.getElementById('new-warranty-start');
  const monthsSelect = document.getElementById('new-warranty-months');
  const endInput = document.getElementById('new-warranty-end');

  function calculateWarrantyEnd() {
    if (!startInput || !monthsSelect || !endInput) return;
    const startVal = startInput.value;
    if (!startVal) return;
    const months = parseInt(monthsSelect.value, 10) || 36;
    const startDate = new Date(startVal);
    startDate.setMonth(startDate.getMonth() + months);
    const yyyy = startDate.getFullYear();
    const mm = String(startDate.getMonth() + 1).padStart(2, '0');
    const dd = String(startDate.getDate()).padStart(2, '0');
    endInput.value = `${yyyy}-${mm}-${dd}`;
  }

  if (startInput) startInput.addEventListener('change', calculateWarrantyEnd);
  if (monthsSelect) monthsSelect.addEventListener('change', calculateWarrantyEnd);
}

// Add New Asset Submit Handler
async function handleAddAsset(e) {
  e.preventDefault();
  const payload = {
    asset_tag: document.getElementById('new-asset-tag').value.trim(),
    device_name: document.getElementById('new-device-name').value.trim(),
    category: document.getElementById('new-category').value,
    brand: document.getElementById('new-brand').value.trim(),
    model: document.getElementById('new-model').value.trim(),
    serial_no: document.getElementById('new-serial').value.trim(),
    location: document.getElementById('new-location').value.trim(),
    warranty_start: document.getElementById('new-warranty-start').value,
    warranty_end: document.getElementById('new-warranty-end').value,
    purchase_price: parseFloat(document.getElementById('new-price').value) || 0,
    warranty_months: parseInt(document.getElementById('new-warranty-months').value) || 36,
    expected_lifespan_months: parseInt(document.getElementById('new-lifespan-months').value) || 60,
    po_number: document.getElementById('new-po-number').value.trim(),
    invoice_no: document.getElementById('new-invoice-no').value.trim(),
    status: 'Working'
  };

  try {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      const codeMsg = data.log_code ? ` (รหัสติดตาม: ${data.log_code})` : '';
      showToast(`ลงทะเบียนครุภัณฑ์สำเร็จ!${codeMsg}`, 'success', 5000);
      document.getElementById('add-asset-modal').style.display = 'none';
      document.getElementById('add-asset-form').reset();
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถลงทะเบียนครุภัณฑ์ได้', 'error');
    }
  } catch (error) {
    console.error('Add asset error:', error);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  }
}

// Global EOL Salvage Action Handler
window.handleSalvageAction = async function(salvageStatus) {
  if (!state.selectedAsset) return;
  const tag = state.selectedAsset.asset_tag;
  if (!confirm(`คุณยืนยันที่จะเปลี่ยนสถานะอุปกรณ์ ${tag} เป็น [${salvageStatus}] ใช่หรือไม่?`)) return;

  try {
    const res = await fetch('/api/assets/salvage', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        asset_tag: tag,
        salvage_status: salvageStatus,
        action_by_username: state.user ? state.user.username : 'admin'
      })
    });

    if (res.ok) {
      showToast(`อัปเดตสถานะการจำหน่ายเป็น [${salvageStatus}] เรียบร้อยแล้ว`, 'success');
      lookupAsset(tag);
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถทำรายการได้', 'error');
    }
  } catch (err) {
    console.error('Salvage action error:', err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  }
};

// Copy Data Logic (TSV format)
async function copyAssetDataToClipboard() {
  try {
    const res = await fetch('/api/assets?limit=500', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();
    const assets = Array.isArray(data) ? data : (data.assets || []);
    
    let tsvData = 'Asset Tag\tDevice Name\tLocation\tWarranty End\tStatus\tSalvage Status\n';
    assets.forEach(a => {
      tsvData += `${a.asset_tag}\t${a.device_name}\t${a.location}\t${a.warranty_end}\t${a.status}\t${a.salvage_status || 'None'}\n`;
    });
    
    await navigator.clipboard.writeText(tsvData);
    showToast('คัดลอกข้อมูลเรียบร้อยแล้ว (TSV format)', 'success');
  } catch (error) {
    console.error('Copy data error:', error);
    showToast('ไม่สามารถคัดลอกข้อมูลได้', 'error');
  }
}
