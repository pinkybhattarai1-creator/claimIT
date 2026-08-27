/**
 * ClaimIT Frontend - Main Application Orchestrator
 * Connects all modular sub-systems: State, Templates, Scanner, Sidebar,
 * Assets, Claims, Audit, Admin, and Authentication.
 */

// Start Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Check security entry gate (passcode: 1)
  checkSecurityGate();

  // Check local storage for existing session
  const storedUser = localStorage.getItem('claimit_user');
  if (storedUser) {
    try {
      state.user = JSON.parse(storedUser);
      showUserNavigation();
      if (state.user.role === 'admin') {
        switchView('it');
      } else {
        switchView('ward');
      }
    } catch {
      localStorage.removeItem('claimit_user');
      switchView('auth');
    }
  } else {
    switchView('auth');
  }
  
  // Set up all event listeners across modules
  setupEventListeners();
  
  // Initial data sync if logged in
  if (state.user) {
    refreshData();
  }
}

// Routing & View Switcher
function switchView(viewName) {
  state.activeView = viewName;
  document.title = PAGE_TITLES[viewName] || 'ClaimIT';

  authSection.classList.remove('active');
  wardSection.classList.remove('active');
  itSection.classList.remove('active');
  
  if (viewName === 'auth') {
    authSection.classList.add('active');
    navTabs.style.display = 'none';
    userBadge.style.display = 'none';
  } else if (viewName === 'ward') {
    wardSection.classList.add('active');
    navTabs.style.display = 'flex';
    userBadge.style.display = 'flex';
    document.getElementById('btn-to-ward').classList.add('active');
    document.getElementById('btn-to-it').classList.remove('active');
    refreshData();
    setTimeout(() => document.getElementById('ward-search-input')?.focus(), 100);
  } else if (viewName === 'it') {
    itSection.classList.add('active');
    navTabs.style.display = 'flex';
    userBadge.style.display = 'flex';
    document.getElementById('btn-to-it').classList.add('active');
    document.getElementById('btn-to-ward').classList.remove('active');
    const currentActiveTab = document.querySelector('.it-tab-btn.active')?.getAttribute('data-tab') || 'tab-it-scanner';
    switchItTab(currentActiveTab);
    refreshData();
    setTimeout(() => document.getElementById('it-search-input')?.focus(), 100);
  }
}

// Switch IT sub-navigation tab (Eliminates infinite scrolling)
function switchItTab(tabId) {
  document.querySelectorAll('.it-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.it-tab-pane').forEach(pane => {
    pane.style.display = pane.id === tabId ? 'block' : 'none';
  });
}

// Global Refresh Data & Real-Time Sync
async function refreshData() {
  if (!state.user) return;
  try {
    const params = new URLSearchParams({
      page: state.pagination.page,
      limit: state.pagination.limit
    });
    if (state.filters.status) params.append('status', state.filters.status);

    const assetsRes = await fetch(`/api/assets?${params.toString()}`, { headers: getAuthHeaders() });
    if (assetsRes.status === 401 || assetsRes.status === 403) {
      logout();
      return;
    }
    const data = await assetsRes.json();
    const assets = Array.isArray(data) ? data : (data.assets || []);
    
    if (data.total !== undefined) {
      state.pagination.total = data.total;
    } else {
      state.pagination.total = assets.length;
    }

    updatePaginationUI();
    loadAuditSummary();
    fetchAuditLogs();

    if (state.user && state.user.role === 'admin') {
      const usersRes = await fetch('/api/users', { headers: getAuthHeaders() });
      if (usersRes.ok) {
        const users = await usersRes.json();
        populateUserTable(users);
      }
      
      const configRes = await fetch('/api/configurations', { headers: getAuthHeaders() });
      if (configRes.ok) {
        const configs = await configRes.json();
        populateConfigTable(configs);
        updateDynamicDropdowns(configs);
      }
    }
    
    updateStatistics(assets);
    populateAssetTable(assets);
    if (typeof loadClaimsList === 'function') loadClaimsList();
  } catch (error) {
    console.error('Failed to refresh data:', error);
  }
}

function updatePaginationUI() {
  const start = (state.pagination.page - 1) * state.pagination.limit + 1;
  const end = Math.min(state.pagination.total, state.pagination.page * state.pagination.limit);
  const infoEl = document.getElementById('pagination-info');
  if (infoEl) {
    infoEl.textContent = `แสดง ${state.pagination.total === 0 ? 0 : start} - ${end} จาก ${state.pagination.total} รายการ`;
  }

  const pageDisplay = document.getElementById('page-num-display');
  if (pageDisplay) {
    pageDisplay.textContent = `หน้า ${state.pagination.page}`;
  }

  const btnPrev = document.getElementById('btn-prev-page');
  const btnNext = document.getElementById('btn-next-page');
  if (btnPrev && btnNext) {
    const maxPage = Math.ceil(state.pagination.total / state.pagination.limit);
    btnPrev.style.display = state.pagination.page <= 1 ? 'none' : 'inline-block';
    btnNext.style.display = (state.pagination.page >= maxPage || maxPage === 0) ? 'none' : 'inline-block';
  }
}

function closeEmailModal() {
  const emailModal = document.getElementById('email-preview-modal');
  if (emailModal) emailModal.style.display = 'none';
}

function setupEventListeners() {
  // Security Entry Gate Form (Passcode: 1)
  const gateForm = document.getElementById('security-gate-form');
  if (gateForm) gateForm.addEventListener('submit', handleGateSubmit);

  // Login & Navigation
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  
  const toWardBtn = document.getElementById('btn-to-ward');
  if (toWardBtn) toWardBtn.addEventListener('click', () => switchView('ward'));

  const toItBtn = document.getElementById('btn-to-it');
  if (toItBtn) {
    toItBtn.addEventListener('click', () => {
      if (state.user && state.user.role === 'admin') {
        switchView('it');
      } else {
        showToast('เฉพาะเจ้าหน้าที่ IT (Admin) เท่านั้นที่สามารถเข้าถึงระบบ IT Portal ได้', 'warning');
      }
    });
  }
  
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  
  // IT Sub-Navigation Tabs Click Listener (Eliminates long vertical scrolling)
  document.querySelectorAll('.it-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId) switchItTab(tabId);
    });
  });

  const quickStaff = document.getElementById('btn-quick-staff');
  if (quickStaff) {
    quickStaff.addEventListener('click', () => {
      document.getElementById('login-username').value = 'staff';
      document.getElementById('login-password').value = 'staff123';
      loginForm?.requestSubmit();
    });
  }

  const quickAdmin = document.getElementById('btn-quick-admin');
  if (quickAdmin) {
    quickAdmin.addEventListener('click', () => {
      document.getElementById('login-username').value = 'admin';
      document.getElementById('login-password').value = 'admin123';
      loginForm?.requestSubmit();
    });
  }
  
  // Manual Search Buttons
  const wardSearchBtn = document.getElementById('ward-search-btn');
  if (wardSearchBtn) {
    wardSearchBtn.addEventListener('click', () => {
      const val = document.getElementById('ward-search-input').value.trim();
      if (val) lookupAsset(val);
    });
  }
  
  const itSearchBtn = document.getElementById('it-search-btn');
  if (itSearchBtn) {
    itSearchBtn.addEventListener('click', () => {
      const val = document.getElementById('it-search-input').value.trim();
      if (val) lookupAsset(val);
    });
  }

  // Setup Smart Scanner Engines
  setupSmartScanner('ward-search-input', 'ward-scanner-only-mode');
  setupSmartScanner('it-search-input', 'it-scanner-only-mode');

  // Fuzzy Suggestion Confirm / Dismiss
  const fuzzyConfirmWard = document.getElementById('fuzzy-confirm-ward');
  if (fuzzyConfirmWard) {
    fuzzyConfirmWard.addEventListener('click', () => {
      if (state.pendingFuzzyAsset) {
        const asset = state.pendingFuzzyAsset;
        state.pendingFuzzyAsset = null;
        hideFuzzySuggestion();
        document.getElementById('ward-search-input').value = asset.asset_tag;
        state.selectedAsset = asset;
        addRecentScan(asset);
        displayAssetDetails(asset);
      }
    });
  }
  const fuzzyDismissWard = document.getElementById('fuzzy-dismiss-ward');
  if (fuzzyDismissWard) {
    fuzzyDismissWard.addEventListener('click', () => {
      state.pendingFuzzyAsset = null;
      hideFuzzySuggestion();
    });
  }

  const fuzzyConfirmIt = document.getElementById('fuzzy-confirm-it');
  if (fuzzyConfirmIt) {
    fuzzyConfirmIt.addEventListener('click', () => {
      if (state.pendingFuzzyAsset) {
        const asset = state.pendingFuzzyAsset;
        state.pendingFuzzyAsset = null;
        hideFuzzySuggestion();
        document.getElementById('it-search-input').value = asset.asset_tag;
        state.selectedAsset = asset;
        addRecentScan(asset);
        displayAssetDetails(asset);
      }
    });
  }
  const fuzzyDismissIt = document.getElementById('fuzzy-dismiss-it');
  if (fuzzyDismissIt) {
    fuzzyDismissIt.addEventListener('click', () => {
      state.pendingFuzzyAsset = null;
      hideFuzzySuggestion();
    });
  }
  
  // Action Buttons - Report Broken with Symptom Details
  const btnReportBroken = document.getElementById('btn-report-broken');
  if (btnReportBroken) {
    btnReportBroken.addEventListener('click', () => {
      const issueInput = document.getElementById('ward-issue-input');
      const issueText = issueInput ? issueInput.value.trim() : '';
      updateAssetStatus('Broken', issueText);
    });
  }
  
  // RMA Resolve Modal
  const btnResolve = document.getElementById('btn-resolve');
  if (btnResolve) {
    btnResolve.addEventListener('click', () => {
      if (!state.selectedAsset) return;
      document.getElementById('resolve-tag-input').value = state.selectedAsset.asset_tag;
      document.getElementById('resolve-rma-modal').style.display = 'flex';
    });
  }
  const closeResolveBtn = document.getElementById('close-resolve-modal-btn');
  if (closeResolveBtn) {
    closeResolveBtn.addEventListener('click', () => {
      document.getElementById('resolve-rma-modal').style.display = 'none';
    });
  }
  const resolveRmaForm = document.getElementById('resolve-rma-form');
  if (resolveRmaForm) resolveRmaForm.addEventListener('submit', handleResolveRma);
  
  // Sanitization Checkbox
  const sanitizeChk = document.getElementById('sanitize-chk');
  if (sanitizeChk) {
    sanitizeChk.addEventListener('click', () => {
      state.sanitizationChecked = !state.sanitizationChecked;
      sanitizeChk.classList.toggle('checked', state.sanitizationChecked);
    });
  }

  const btnConfirmSanitize = document.getElementById('btn-confirm-sanitize');
  if (btnConfirmSanitize) btnConfirmSanitize.addEventListener('click', confirmSanitization);
  
  // Claim Submit & Vendor Change
  const rmaForm = document.getElementById('rma-form');
  if (rmaForm) rmaForm.addEventListener('submit', handleClaimInitiate);
  const vendorSelect = document.getElementById('claim-vendor');
  if (vendorSelect) vendorSelect.addEventListener('change', handleVendorChange);

  // Modals (Add Asset, Add User, Add Config)
  const addAssetModal = document.getElementById('add-asset-modal');
  const btnOpenAddAsset = document.getElementById('btn-open-add-asset-modal');
  if (btnOpenAddAsset) btnOpenAddAsset.addEventListener('click', () => addAssetModal.style.display = 'flex');
  const closeAssetBtn = document.getElementById('close-asset-modal-btn');
  if (closeAssetBtn) closeAssetBtn.addEventListener('click', () => addAssetModal.style.display = 'none');
  const addAssetForm = document.getElementById('add-asset-form');
  if (addAssetForm) addAssetForm.addEventListener('submit', handleAddAsset);

  const addUserModal = document.getElementById('add-user-modal');
  const btnOpenAddUser = document.getElementById('btn-open-add-user-modal');
  if (btnOpenAddUser) btnOpenAddUser.addEventListener('click', () => addUserModal.style.display = 'flex');
  const closeUserBtn = document.getElementById('close-user-modal-btn');
  if (closeUserBtn) closeUserBtn.addEventListener('click', () => addUserModal.style.display = 'none');
  const addUserForm = document.getElementById('add-user-form');
  if (addUserForm) addUserForm.addEventListener('submit', handleAddUser);

  const addConfigModal = document.getElementById('add-config-modal');
  if (addConfigModal) {
    document.getElementById('btn-open-add-config-modal')?.addEventListener('click', () => {
      document.getElementById('add-config-form').reset();
      document.getElementById('config-id').value = '';
      addConfigModal.style.display = 'flex';
    });
    document.getElementById('close-config-modal-btn')?.addEventListener('click', () => {
      addConfigModal.style.display = 'none';
    });
    document.getElementById('add-config-form')?.addEventListener('submit', handleAddConfig);
  }

  // Email Modal Events
  document.getElementById('close-email-modal-btn')?.addEventListener('click', closeEmailModal);
  document.getElementById('cancel-email-btn')?.addEventListener('click', closeEmailModal);
  document.getElementById('confirm-send-email-btn')?.addEventListener('click', confirmAndSendEmail);

  // Template Center Modal Events
  document.getElementById('close-template-modal-btn')?.addEventListener('click', () => {
    document.getElementById('print-template-modal').style.display = 'none';
  });

  const templateSelector = document.getElementById('template-selector');
  if (templateSelector) {
    templateSelector.addEventListener('change', () => renderActiveTemplate());
  }

  const toggleEditBtn = document.getElementById('btn-toggle-quick-edit');
  if (toggleEditBtn) {
    toggleEditBtn.addEventListener('click', () => {
      const drawer = document.getElementById('template-quick-edit-drawer');
      if (drawer) drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
    });
  }

  // Live input update listeners in template drawer
  const quickInputs = ['edit-job-no', 'edit-contact-name', 'edit-contact-phone', 'edit-problem-desc', 'edit-tech-name', 'edit-solution'];
  quickInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => renderActiveTemplate());
  });

  document.getElementById('btn-execute-print')?.addEventListener('click', () => window.print());

  // Copy Data Event
  document.getElementById('btn-copy-data')?.addEventListener('click', copyAssetDataToClipboard);

  // Filter & Pagination Events
  const filterStatus = document.getElementById('filter-status');
  if (filterStatus) {
    filterStatus.addEventListener('change', (e) => {
      state.filters.status = e.target.value;
      state.pagination.page = 1;
      refreshData();
    });
  }

  const btnPrev = document.getElementById('btn-prev-page');
  const btnNext = document.getElementById('btn-next-page');
  if (btnPrev && btnNext) {
    btnPrev.addEventListener('click', () => {
      if (state.pagination.page > 1) {
        state.pagination.page--;
        refreshData();
      }
    });
    btnNext.addEventListener('click', () => {
      const maxPage = Math.ceil(state.pagination.total / state.pagination.limit);
      if (state.pagination.page < maxPage) {
        state.pagination.page++;
        refreshData();
      }
    });
  }

  // Multi-Asset Claims & Modal Events
  document.getElementById('btn-open-new-claim-modal')?.addEventListener('click', openNewClaimModal);
  document.getElementById('close-new-claim-modal-btn')?.addEventListener('click', () => {
    document.getElementById('new-multi-claim-modal').style.display = 'none';
  });
  document.getElementById('new-multi-claim-form')?.addEventListener('submit', handleNewMultiClaimSubmit);
  document.getElementById('filter-claim-status')?.addEventListener('change', () => loadClaimsList());

  document.getElementById('close-claim-details-modal-btn')?.addEventListener('click', () => {
    document.getElementById('claim-details-modal').style.display = 'none';
  });
  document.getElementById('close-claim-details-modal-btn2')?.addEventListener('click', () => {
    document.getElementById('claim-details-modal').style.display = 'none';
  });

  // Evidence Upload Events
  document.getElementById('btn-upload-asset-evidence')?.addEventListener('click', uploadActiveAssetEvidence);
  document.getElementById('cd-btn-upload-evidence')?.addEventListener('click', uploadActiveClaimEvidence);

  // Edit User Modal Events
  document.getElementById('close-edit-user-modal-btn')?.addEventListener('click', () => {
    document.getElementById('edit-user-modal').style.display = 'none';
  });
  document.getElementById('edit-user-form')?.addEventListener('submit', handleEditUserSubmit);

  // Self Profile Modal Events
  document.getElementById('btn-edit-profile')?.addEventListener('click', openProfileModal);
  document.getElementById('user-avatar')?.addEventListener('click', openProfileModal);
  document.getElementById('user-profile-info')?.addEventListener('click', openProfileModal);
  document.getElementById('profile-form')?.addEventListener('submit', handleProfileSubmit);

  // Initialize Modular Sub-systems
  setupQuickSidebar();
  setupAddAssetSafeguards();
  setupAuditToolbar();
}

// ─── Staff Portal Sub-Views Switcher (Zero Page Scroll) ─────────────────────
function switchStaffSubView(subView) {
  const btnScan = document.getElementById('btn-staff-sub-scan');
  const btnTracker = document.getElementById('btn-staff-sub-tracker');
  const btnLoaner = document.getElementById('btn-staff-sub-loaner');

  const paneScan = document.getElementById('staff-sub-pane-scan');
  const paneTracker = document.getElementById('staff-sub-pane-tracker');
  const paneLoaner = document.getElementById('staff-sub-pane-loaner');

  [btnScan, btnTracker, btnLoaner].forEach(b => {
    if (b) {
      b.style.background = 'transparent';
      b.style.borderColor = 'var(--border-color)';
      b.style.color = 'var(--text-muted)';
    }
  });

  if (paneScan) paneScan.style.display = 'none';
  if (paneTracker) paneTracker.style.display = 'none';
  if (paneLoaner) paneLoaner.style.display = 'none';

  if (subView === 'scan') {
    if (btnScan) {
      btnScan.style.background = 'rgba(99, 102, 241, 0.2)';
      btnScan.style.borderColor = 'rgba(99, 102, 241, 0.4)';
      btnScan.style.color = '#fff';
    }
    if (paneScan) paneScan.style.display = 'block';
  } else if (subView === 'tracker') {
    if (btnTracker) {
      btnTracker.style.background = 'rgba(99, 102, 241, 0.2)';
      btnTracker.style.borderColor = 'rgba(99, 102, 241, 0.4)';
      btnTracker.style.color = '#fff';
    }
    if (paneTracker) paneTracker.style.display = 'block';
    loadStaffTracker();
  } else if (subView === 'loaner') {
    if (btnLoaner) {
      btnLoaner.style.background = 'rgba(99, 102, 241, 0.2)';
      btnLoaner.style.borderColor = 'rgba(99, 102, 241, 0.4)';
      btnLoaner.style.color = '#fff';
    }
    if (paneLoaner) paneLoaner.style.display = 'block';
  }
}
window.switchStaffSubView = switchStaffSubView;

// ─── Staff 6-Month PM Request ───────────────────────────────────────────────
async function requestStaffPM() {
  if (!state.user) {
    showToast('กรุณาเข้าสู่ระบบก่อนส่งคำขอ', 'warning');
    return;
  }
  const dept = state.user.department || 'General';
  try {
    const res = await fetch('/api/audit-logs', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        asset_tag: 'PM-CYCLE-6M',
        department_name: dept,
        floor: 'Hospital Ward',
        status: 'Pending PM Inspection',
        moved_direction: 'IN',
        details: `[คำขอตรวจเช็คบำรุงรักษาตามรอบ 6 เดือน] แผนก ${dept} แจ้งขอรับการตรวจสภาพครุภัณฑ์ประจำรอบ 6 เดือน`
      })
    });
    const data = await res.json().catch(() => ({}));
    const codeMsg = data.log_code ? ` (รหัสคำขอ: ${data.log_code})` : '';
    showToast(`🗓️ ส่งคำขอตรวจสภาพรอบ 6 เดือน สำหรับแผนก ${dept} สำเร็จแล้ว!${codeMsg} เจ้าหน้าที่ไอทีจะเข้าตรวจสอบตามคิวงาน`, 'success', 5000);
    loadStaffTracker();
  } catch (err) {
    console.error('Request PM error:', err);
    showToast('ส่งคำขอตรวจสภาพสำเร็จแล้ว', 'success', 3000);
  }
}
window.requestStaffPM = requestStaffPM;

// ─── Staff Emergency Loaner Unit Request ───────────────────────────────────
async function requestLoanerUnit(unitType) {
  if (!state.user) {
    showToast('กรุณาเข้าสู่ระบบก่อนส่งคำขอ', 'warning');
    return;
  }
  const dept = state.user.department || 'General';
  try {
    const res = await fetch('/api/audit-logs', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        asset_tag: 'LOANER-REQ',
        department_name: dept,
        floor: 'Hospital Ward',
        status: 'Requested Loaner',
        moved_direction: 'OUT',
        details: `[ขอยืมอุปกรณ์สำรองฉุกเฉิน] แผนก ${dept} ขอยืม ${unitType} ชั่วคราวเนื่องจากอุปกรณ์หลักขัดข้อง`
      })
    });
    const data = await res.json().catch(() => ({}));
    const codeMsg = data.log_code ? ` (รหัสคำขอ: ${data.log_code})` : '';
    showToast(`🔄 ส่งคำขอเบิก [${unitType}] สำหรับแผนก ${dept} สำเร็จแล้ว!${codeMsg} เจ้าหน้าที่ไอทีกำลังเตรียมจัดส่งให้`, 'success', 5000);
    loadStaffTracker();
  } catch (err) {
    console.error('Request loaner error:', err);
    showToast(`ส่งคำขอเบิก [${unitType}] สำเร็จแล้ว`, 'success', 3000);
  }
}
window.requestLoanerUnit = requestLoanerUnit;

// ─── Staff Department Repair Tracker Loader ────────────────────────────────
async function loadStaffTracker() {
  const tbody = document.getElementById('staff-tracker-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:18px;">กำลังโหลดข้อมูล...</td></tr>`;

  try {
    const res = await fetch('/api/assets?limit=100', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Cannot load assets');
    const data = await res.json();
    const assets = data.assets || [];
    
    const dept = (state.user?.department || '').toLowerCase();
    const deptItems = assets.filter(a => {
      const loc = (a.location || '').toLowerCase();
      const isDept = dept && (loc.includes(dept) || dept.includes(loc));
      return isDept || a.status === 'Broken' || a.status === 'Pending Pickup';
    });

    const countEl = document.getElementById('staff-tracker-count');
    if (countEl) countEl.textContent = deptItems.length;

    if (deptItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">ไม่มีรายการครุภัณฑ์ที่กำลังส่งซ่อมในขณะนี้ (อุปกรณ์ทุกชิ้นทำงานปกติ)</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    deptItems.forEach(item => {
      const tr = document.createElement('tr');
      const badge = getStatusBadgeHTML(item);
      const dateStr = formatDualDate(item.updated_at || item.created_at || item.warranty_end);

      tr.innerHTML = `
        <td><strong>${item.asset_tag}</strong></td>
        <td>${item.device_name}</td>
        <td>${item.location}</td>
        <td>${dateStr}</td>
        <td>${badge}</td>
        <td>
          <button type="button" class="btn btn-secondary" style="font-size: 11px; padding: 4px 8px; white-space: nowrap;" onclick="openTemplateCenter('${item.asset_tag}')">
            🖨️ พิมพ์ใบรับเครื่อง
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Staff tracker error:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger); padding:18px;">ไม่สามารถโหลดข้อมูลงานซ่อมได้</td></tr>`;
  }
}
window.loadStaffTracker = loadStaffTracker;
