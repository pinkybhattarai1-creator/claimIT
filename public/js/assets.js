/**
 * ClaimIT Frontend - Asset Management Module
 * Handles asset lookup, details display, live duplicate checker,
 * warranty calculations, claim worthiness evaluation, and salvage actions.
 */

// Universal Clipboard Copy with Toast Feedback & Fallback Support
window.copyTextToClipboard = function(text, label = 'ข้อความ') {
  if (!text || text === '-' || text === 'N/A') return;
  const showSuccess = () => {
    showToast(`📋 คัดลอก ${label} (${text}) ลงคลิปบอร์ดแล้ว!`, 'success');
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(showSuccess).catch(() => fallbackCopy(text, showSuccess));
  } else {
    fallbackCopy(text, showSuccess);
  }
};

function fallbackCopy(text, onSuccess) {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(el);
    if (successful) {
      if (onSuccess) onSuccess();
    } else {
      prompt('กด Ctrl+C เพื่อคัดลอก:', text);
    }
  } catch (err) {
    prompt('กด Ctrl+C เพื่อคัดลอก:', text);
  }
}

// Asset Status Badges HTML Builder
function getStatusBadgeHTML(asset) {
  const status = asset.status;
  const salvageStatus = asset.salvage_status;
  const now = new Date();
  const wEnd = new Date(asset.warranty_end);
  const isExpired = wEnd < now;
  const isNearExpiry = !isExpired && (wEnd - now) <= (180 * 24 * 60 * 60 * 1000);

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
    return `<span class="badge badge-scrapped">🗑️ แทงจำหน่าย</span>`;
  }
  if (status === 'Broken') {
    return `<span class="badge badge-broken">🔴 ชำรุด</span>`;
  }
  if (status === 'Pending Pickup') {
    return `<span class="badge badge-vendor">🟡 รอศูนย์เข้ามารับ</span>`;
  }
  if (isExpired) {
    return `<span class="badge" style="background:#64748b; color:#fff;">⚪ หมดประกันแล้ว</span>`;
  }
  if (isNearExpiry) {
    return `<span class="badge" style="background:#f59e0b; color:#000; font-weight:700;">⚠️ ใกล้หมดประกัน (6 ด.)</span>`;
  }
  return `<span class="badge badge-working">🟢 ปกติ (ในประกัน)</span>`;
}

// Populate Asset Inventory Table with 1-Click PDF Button
function populateAssetTable(assets) {
  const tbody = document.getElementById('it-asset-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  if (!assets || assets.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:40px 20px;">
          <div style="font-size:36px; margin-bottom:8px;">📋</div>
          <div style="font-size:16px; font-weight:600; color:var(--text-main);">ไม่พบคลังรายการครุภัณฑ์</div>
          <div style="font-size:13.5px; color:var(--text-muted); margin-top:4px;">กดปุ่ม "➕ เพิ่มครุภัณฑ์ใหม่" เพื่อลงทะเบียนครุภัณฑ์เข้าสู่ระบบ</div>
        </td>
      </tr>`;
    return;
  }

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
      <td>${formatDualDate(asset.warranty_end)}</td>
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
  if (diffDays > 180) {
    warrantyHTML = `<span style="color:var(--success); font-weight:600;">ปกติ ในประกัน (เหลือ ${diffDays} วัน)</span>`;
  } else if (diffDays > 0) {
    warrantyHTML = `<span style="color:var(--warning); font-weight:700; background:rgba(245,158,11,0.15); padding:2px 8px; border-radius:4px;">⚠️ ใกล้หมดประกันใน 6 เดือน (เหลือ ${diffDays} วัน / ${Math.ceil(diffDays / 30)} เดือน)</span>`;
  } else {
    warrantyHTML = `<span style="color:var(--danger); font-weight:600;">หมดอายุแล้ว (Expired ${Math.abs(diffDays)} วัน)</span>`;
  }
  
  document.getElementById(`${prefix}-detail-tag`).textContent = asset.asset_tag;
  document.getElementById(`${prefix}-detail-name`).textContent = asset.device_name;
  document.getElementById(`${prefix}-detail-serial`).textContent = asset.serial_no;
  document.getElementById(`${prefix}-detail-loc`).textContent = asset.location;
  document.getElementById(`${prefix}-detail-warranty`).innerHTML = `${formatDualDate(asset.warranty_end, true)} &nbsp; ${warrantyHTML}`;
  
  // --- WARRANTY QUICK-ACCESS PANEL ---
  const WARRANTY_LINKS = {
    'dell':     'https://www.dell.com/support/home/en-us',
    'lenovo':   'https://support.lenovo.com/warrantylookup',
    'acer':     'https://register.acer.co.th/Warranty%20Check/warr_chk.aspx',
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
  copyBtn.onclick = () => {
    copyTextToClipboard(asset.serial_no, 'Serial Number');
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

  const flowBtn = document.createElement('button');
  flowBtn.type = 'button';
  flowBtn.className = 'btn btn-secondary';
  flowBtn.style.cssText = 'font-size:12px; padding:7px 14px; flex-basis:100%; display:flex; align-items:center; justify-content:center; gap:6px; background:rgba(56,189,248,0.1); border-color:#38bdf8; color:#38bdf8;';
  flowBtn.innerHTML = '🧭 ดูผังขั้นตอนรับแจ้งเสีย & เคลม (Claim Workflow SOP)';
  flowBtn.onclick = () => {
    if (typeof openClaimWorkflowModal === 'function') {
      openClaimWorkflowModal(asset);
    }
  };
  quickPanel.appendChild(flowBtn);

  const serialEl = document.getElementById(`${prefix}-detail-serial`);
  if (serialEl) serialEl.closest('.detail-item').after(quickPanel);
  // --- END WARRANTY QUICK-ACCESS PANEL ---

  // Bind quick copy buttons for Tag and S/N
  const copyTagBtn = document.getElementById('btn-copy-tag');
  if (copyTagBtn) {
    copyTagBtn.onclick = (e) => {
      e.stopPropagation();
      copyTextToClipboard(asset.asset_tag, 'รหัสครุภัณฑ์');
    };
  }

  const copySerialBtn = document.getElementById('btn-copy-serial');
  if (copySerialBtn) {
    copySerialBtn.onclick = (e) => {
      e.stopPropagation();
      copyTextToClipboard(asset.serial_no, 'Serial Number');
    };
  }

  document.getElementById(`${prefix}-detail-status`).innerHTML = getStatusBadgeHTML(asset);
  document.getElementById(`${prefix}-details-card`).style.display = 'block';
  if (prefix === 'ward') {
    const placeholder = document.getElementById('ward-empty-placeholder');
    if (placeholder) placeholder.style.display = 'none';
  }
  
  // Audio beep confirmation on successful scan
  if (typeof playScanBeep === 'function') playScanBeep();

  // Fetch and display claim worthiness calculator evaluation
  fetchAndDisplayEvaluation(asset.asset_tag, prefix);

  // Load attached evidence photos/files for IT
  if (prefix === 'it' && typeof loadAssetEvidence === 'function') {
    loadAssetEvidence(asset.asset_tag);
  }

  // Toggle Contextual Actions for IT
  if (prefix === 'it') {
    const claimForm = document.getElementById('rma-form-container');
    const sanitizePanel = document.getElementById('sanitize-panel');
    const btnResolve = document.getElementById('btn-resolve');
    const btnReportBroken = document.getElementById('btn-report-broken');
    
    if (btnResolve) btnResolve.style.display = 'none';
    if (btnReportBroken) btnReportBroken.style.display = 'none';
    if (sanitizePanel) sanitizePanel.style.display = 'none';
    if (claimForm) claimForm.style.display = 'none';

    // Show/hide vendor procedures guide
    const guideBox = document.getElementById('brand-procedure-panel');
    const brand = asset.brand ? asset.brand.trim() : '';

    if (guideBox) {
      if (vendorProcedures[brand]) {
        guideBox.innerHTML = vendorProcedures[brand];
        guideBox.style.display = 'block';
      } else {
        guideBox.style.display = 'none';
      }
    }

    if (asset.status === 'Working') {
      if (btnReportBroken) btnReportBroken.style.display = 'block';
    } else if (asset.status === 'Broken') {
      if (btnResolve) {
        btnResolve.style.display = 'block';
        btnResolve.textContent = '✅ รับเครื่องคืนจากซ่อม/เคลม (Return to Stock)';
      }
      
      if (asset.sanitization_required) {
        const isWiped = asset.rma_data_wiped_confirmed || asset.status === 'Sanitized';
        if (!isWiped) {
          if (sanitizePanel) {
            sanitizePanel.style.display = 'block';
            state.sanitizationChecked = false;
            const chk = document.getElementById('sanitize-chk');
            if (chk) chk.classList.remove('checked');
          }
        } else {
          if (claimForm) {
            claimForm.style.display = 'block';
            const tagInput = document.getElementById('claim-tag-input');
            if (tagInput) tagInput.value = asset.asset_tag;
          }
        }
      } else {
        if (claimForm) {
          claimForm.style.display = 'block';
          const tagInput = document.getElementById('claim-tag-input');
          if (tagInput) tagInput.value = asset.asset_tag;
        }
      }
    } else if (asset.status === 'Pending Pickup') {
      if (btnResolve) {
        btnResolve.style.display = 'block';
        btnResolve.textContent = '✅ รับเครื่องคืนจากศูนย์บริการ (Complete RMA)';
      }
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
    purchase_price: parseFloat(document.getElementById('new-price')?.value) || 0,
    warranty_months: parseInt(document.getElementById('new-warranty-months')?.value, 10) || 36,
    expected_lifespan_months: 60,
    po_number: document.getElementById('new-po-number')?.value?.trim() || '',
    invoice_no: '',
    sanitization_required: document.getElementById('new-sanitization-req')?.checked ? 1 : 0,
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
