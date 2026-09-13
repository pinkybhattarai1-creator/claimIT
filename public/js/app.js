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
  // Set up all event listeners across modules
  setupEventListeners();

  // Listen for browser forward/back buttons
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.view && state.user) {
      switchView(e.state.view, false);
    } else {
      switchView(state.user ? 'ward' : 'auth', false);
    }
  });

  // Try to restore existing session from sessionStorage
  let restoredUser = null;
  try {
    const raw = sessionStorage.getItem('claimit_user');
    if (raw) {
      restoredUser = JSON.parse(raw);
    }
  } catch (e) {}

  if (restoredUser && restoredUser.token) {
    const expTime = typeof parseJwtExp === 'function' ? parseJwtExp(restoredUser.token) : null;
    if (!expTime || expTime > Date.now()) {
      state.user = restoredUser;
      showUserNavigation();
      if (typeof startSessionMonitor === 'function') startSessionMonitor();

      // Determine initial view based on current URL pathname or user role
      const path = window.location.pathname.toLowerCase();
      let targetView = 'ward';
      if (path.includes('config') || path.includes('admin')) {
        targetView = (state.user.role === 'admin') ? 'config' : 'ward';
      } else if (path.includes('it')) {
        targetView = (state.user.role === 'admin' || state.user.role === 'staff') ? 'it' : 'ward';
      } else if (path.includes('ward') || path.includes('staff')) {
        targetView = 'ward';
      } else {
        targetView = (state.user.role === 'admin') ? 'it' : 'ward';
      }
      switchView(targetView, false);
      return;
    }
  }

  // Not logged in or expired session -> show clean authentication / login screen
  state.user = null;
  try {
    sessionStorage.removeItem('claimit_user');
    localStorage.removeItem('claimit_user');
  } catch (e) {}
  switchView('auth', false);
}

// Routing & View Switcher with URL Path Synchronization
function switchView(viewName, pushHistory = true) {
  // Enforce RBAC Guard: Only admin can access system config. Staff and Admin can access IT Workbench & Ward.
  if (viewName === 'config' && (!state.user || state.user.role !== 'admin')) {
    if (state.user) {
      showToast('สิทธิ์การเข้าถึงถูกจำกัด: เฉพาะผู้ดูแลระบบไอที (IT Admin) เท่านั้นสำหรับการตั้งค่าระบบ', 'warning', 3500);
    }
    viewName = state.user ? 'it' : 'auth';
  } else if (viewName === 'it' && (!state.user || (state.user.role !== 'admin' && state.user.role !== 'staff'))) {
    if (state.user) {
      showToast('กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าหน้าที่เพื่อเข้าถึงระบบไอที', 'warning', 3500);
    }
    viewName = state.user ? 'ward' : 'auth';
  }

  state.activeView = viewName;
  document.title = PAGE_TITLES[viewName] || 'ClaimIT';

  // Synchronize browser address bar with view name
  if (pushHistory && window.history && window.history.pushState) {
    const targetPath = viewName === 'auth' ? '/' : '/' + viewName;
    if (window.location.pathname !== targetPath) {
      try {
        window.history.pushState({ view: viewName }, '', targetPath);
      } catch {}
    }
  }

  authSection.classList.remove('active');
  wardSection.classList.remove('active');
  itSection.classList.remove('active');
  if (configSection) configSection.classList.remove('active');

  const btnWard = document.getElementById('btn-to-ward');
  const btnIt = document.getElementById('btn-to-it');
  const btnConfig = document.getElementById('btn-to-config');
  const btnTopWard = document.getElementById('btn-top-ward');
  const btnTopIt = document.getElementById('btn-top-it');
  const btnTopConfig = document.getElementById('btn-top-config');

  [btnWard, btnIt, btnConfig, btnTopWard, btnTopIt, btnTopConfig].forEach(b => b?.classList.remove('active'));
  
  if (viewName === 'auth') {
    authSection.classList.add('active');
    navTabs.style.display = 'none';
    userBadge.style.display = 'none';
    const appSidebar = document.getElementById('app-sidebar');
    if (appSidebar) {
      appSidebar.style.display = 'none';
      appSidebar.classList.remove('open');
    }
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.classList.remove('active');
    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
    const topbarLogout = document.getElementById('btn-topbar-logout');
    if (topbarLogout) topbarLogout.style.display = 'none';
    updateBreadcrumb('', '');
    if (window.history && window.history.replaceState) {
      try { window.history.replaceState({}, '', '/'); } catch {}
    }
  } else if (viewName === 'ward') {
    wardSection.classList.add('active');
    navTabs.style.display = 'flex';
    userBadge.style.display = 'flex';
    btnWard?.classList.add('active');
    btnTopWard?.classList.add('active');
    updateBreadcrumb('ระบบแจ้งซ่อมประจำแผนก', 'สแกนและแจ้งซ่อม');
    refreshData();
    setTimeout(() => document.getElementById('ward-search-input')?.focus(), 100);
  } else if (viewName === 'it') {
    itSection.classList.add('active');
    navTabs.style.display = 'flex';
    userBadge.style.display = 'flex';
    btnIt?.classList.add('active');
    btnTopIt?.classList.add('active');
    const currentActiveTab = document.querySelector('.it-tab-btn.active')?.getAttribute('data-tab') || 'tab-it-scanner';
    switchItTab(currentActiveTab);
    refreshData();
    setTimeout(() => document.getElementById('it-search-input')?.focus(), 100);
  } else if (viewName === 'config') {
    if (configSection) configSection.classList.add('active');
    navTabs.style.display = 'flex';
    userBadge.style.display = 'flex';
    btnConfig?.classList.add('active');
    btnTopConfig?.classList.add('active');
    const currentActiveCfgTab = document.querySelector('.config-tab-btn.active')?.getAttribute('data-tab') || 'tab-cfg-brands';
    switchConfigTab(currentActiveCfgTab);
    refreshData();
  }
}
window.switchView = switchView;

// Global Return to Home Handler
window.returnToHome = function() {
  if (!state.user) {
    switchView('auth');
  } else if (state.user.role === 'admin') {
    switchView('it');
  } else {
    switchView('ward');
  }
};

// Switch IT sub-navigation tab (Eliminates infinite scrolling)
function switchItTab(tabId) {
  const resolvedId = tabId.startsWith('tab-it-') ? tabId : `tab-it-${tabId}`;
  document.querySelectorAll('.it-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === resolvedId);
  });
  document.querySelectorAll('.it-tab-pane').forEach(pane => {
    pane.style.display = pane.id === resolvedId ? 'block' : 'none';
  });
  const activeBtn = document.querySelector(`.it-tab-btn[data-tab="${resolvedId}"]`);
  updateBreadcrumb('ศูนย์ซ่อมและเคลมประกัน', activeBtn ? activeBtn.textContent.trim() : '');
}
window.switchItTab = switchItTab;

// Switch System Configuration sub-navigation tab (Separate Part)
function switchConfigTab(tabId) {
  let resolvedId = tabId.startsWith('tab-cfg-') ? tabId : `tab-cfg-${tabId}`;
  if (resolvedId === 'tab-cfg-settings') resolvedId = 'tab-cfg-brands';

  document.querySelectorAll('.config-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === resolvedId);
  });
  document.querySelectorAll('.config-tab-pane').forEach(pane => {
    pane.style.display = pane.id === resolvedId ? 'block' : 'none';
  });
  const activeBtn = document.querySelector(`.config-tab-btn[data-tab="${resolvedId}"]`);
  updateBreadcrumb('ตั้งค่าระบบและจัดการผู้ใช้งาน', activeBtn ? activeBtn.textContent.trim() : '');
  if ((resolvedId === 'tab-cfg-locations' || resolvedId === 'tab-cfg-layout') && typeof renderHospitalLayoutView === 'function') {
    renderHospitalLayoutView('hospital-layout-content-area');
  }
}
window.switchConfigTab = switchConfigTab;

// Contextual Breadcrumb Manager
function updateBreadcrumb(sectionName, tabName) {
  const bar = document.getElementById('breadcrumb-bar');
  const secEl = document.getElementById('breadcrumb-section');
  const tabEl = document.getElementById('breadcrumb-tab');
  if (!bar || !secEl || !tabEl) return;

  if (state.activeView === 'auth' || !state.user) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  secEl.textContent = sectionName || 'IT Portal';
  tabEl.textContent = tabName || '';
  tabEl.style.display = tabName ? 'inline-flex' : 'none';
}
window.updateBreadcrumb = updateBreadcrumb;

// Global Refresh Data & Real-Time Sync
async function refreshData() {
  if (!state.user) return;
  try {
    const params = new URLSearchParams({
      page: state.pagination.page,
      limit: state.pagination.limit
    });
    if (state.filters.status) params.append('status', state.filters.status);
    if (state.filters.category) params.append('category', state.filters.category);

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

    // Load configurations for ALL authenticated roles (Staff and Admin)
    if (state.user) {
      try {
        const configRes = await fetch('/api/configurations', { headers: getAuthHeaders() });
        if (configRes.ok) {
          const configs = await configRes.json();
          state.configs = configs;
          if (typeof window !== 'undefined' && window.state) window.state.configs = configs;
          if (typeof updateDynamicDropdowns === 'function') updateDynamicDropdowns(configs);
          if (typeof setupHospitalLayoutDatalist === 'function') setupHospitalLayoutDatalist(configs);
          if (typeof updateHotlineNumbersUI === 'function') updateHotlineNumbersUI(configs);
          if (state.user.role === 'admin' && typeof populateConfigTable === 'function') {
            populateConfigTable(configs);
          }
        }
      } catch (cfgErr) {
        console.warn('Failed to load configurations:', cfgErr);
      }
    }

    if (state.user && state.user.role === 'admin') {
      const usersRes = await fetch('/api/users', { headers: getAuthHeaders() });
      if (usersRes.ok) {
        const users = await usersRes.json();
        populateUserTable(users);
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

  const maxPage = Math.ceil(state.pagination.total / state.pagination.limit) || 1;

  // Render Real Numbered Pagination Slot Buttons [1], [2], [3]...
  const slotsContainer = document.getElementById('asset-pagination-slots');
  if (slotsContainer) {
    let slotsHtml = '';
    const cur = state.pagination.page;
    const startPage = Math.max(1, cur - 2);
    const endPage = Math.min(maxPage, startPage + 4);
    const adjustedStart = Math.max(1, endPage - 4);

    for (let p = adjustedStart; p <= endPage; p++) {
      const isActive = p === cur;
      slotsHtml += `<button type="button" class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'} pagination-slot-btn" onclick="jumpToAssetPage(${p})" style="min-width: 28px; padding: 2px 7px; font-weight: ${isActive ? '700' : '500'}; font-size: 12px; ${isActive ? 'box-shadow: 0 0 0 2px rgba(59,130,246,0.3);' : ''}" title="ไปยังหน้าที่ ${p}">${p}</button>`;
    }
    slotsContainer.innerHTML = slotsHtml;
  }

  // Direct Page-Jump Slot Selector
  const jumpSelect = document.getElementById('asset-page-jump-select');
  if (jumpSelect) {
    let options = '';
    for (let p = 1; p <= maxPage; p++) {
      options += `<option value="${p}" ${p === state.pagination.page ? 'selected' : ''}>หน้า ${p} จาก ${maxPage}</option>`;
    }
    jumpSelect.innerHTML = options;
  }

  // Page Size Selector sync
  const limitSelect = document.getElementById('asset-pagination-limit');
  if (limitSelect && limitSelect.value !== String(state.pagination.limit)) {
    limitSelect.value = String(state.pagination.limit);
  }

  const btnPrev = document.getElementById('btn-prev-page');
  const btnNext = document.getElementById('btn-next-page');
  if (btnPrev && btnNext) {
    const isPrevDisabled = state.pagination.page <= 1;
    const isNextDisabled = (state.pagination.page >= maxPage || maxPage === 0);

    btnPrev.disabled = isPrevDisabled;
    btnPrev.style.opacity = isPrevDisabled ? '0.5' : '1';
    btnPrev.style.cursor = isPrevDisabled ? 'not-allowed' : 'pointer';
    btnPrev.style.display = 'inline-block';

    btnNext.disabled = isNextDisabled;
    btnNext.style.opacity = isNextDisabled ? '0.5' : '1';
    btnNext.style.cursor = isNextDisabled ? 'not-allowed' : 'pointer';
    btnNext.style.display = 'inline-block';
  }
}

function changeAssetLimit(newLimit) {
  state.pagination.limit = parseInt(newLimit, 10) || 15;
  state.pagination.page = 1;
  refreshData();
}
window.changeAssetLimit = changeAssetLimit;

function jumpToAssetPage(page) {
  state.pagination.page = parseInt(page, 10) || 1;
  refreshData();
}
window.jumpToAssetPage = jumpToAssetPage;

function changePage(delta) {
  if (!state.pagination) return;
  const maxPage = Math.ceil(state.pagination.total / state.pagination.limit) || 1;
  const newPage = state.pagination.page + delta;
  if (newPage >= 1 && newPage <= maxPage) {
    state.pagination.page = newPage;
    refreshData();
  }
}
window.changePage = changePage;

function closeEmailModal() {
  const emailModal = document.getElementById('email-preview-modal');
  if (emailModal) emailModal.style.display = 'none';
}

function setupEventListeners() {
  // Login & Navigation
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  
  const toWardBtn = document.getElementById('btn-to-ward');
  if (toWardBtn) toWardBtn.addEventListener('click', () => switchView('ward'));

  const toItBtn = document.getElementById('btn-to-it');
  if (toItBtn) {
    toItBtn.addEventListener('click', () => {
      if (state.user && (state.user.role === 'admin' || state.user.role === 'staff')) {
        switchView('it');
      } else {
        showToast('เฉพาะเจ้าหน้าที่ IT (Staff/Admin) เท่านั้นที่สามารถเข้าถึงระบบ IT Portal ได้', 'warning');
      }
    });
  }

  // Asset Table Pagination Buttons
  const btnPrevPage = document.getElementById('btn-prev-page');
  if (btnPrevPage) btnPrevPage.addEventListener('click', () => changePage(-1));
  const btnNextPage = document.getElementById('btn-next-page');
  if (btnNextPage) btnNextPage.addEventListener('click', () => changePage(1));

  const toConfigBtn = document.getElementById('btn-to-config');
  if (toConfigBtn) {
    toConfigBtn.addEventListener('click', () => {
      if (state.user && state.user.role === 'admin') {
        switchView('config');
      } else {
        showToast('เฉพาะเจ้าหน้าที่ผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเข้าถึงการตั้งค่าระบบได้', 'warning');
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

  // System Configuration Sub-Navigation Tabs Click Listener
  document.querySelectorAll('.config-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId) switchConfigTab(tabId);
    });
  });


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
  
  // Action Buttons - Report Broken with Symptom Details & Mobile Photo Evidence
  const btnReportBroken = document.getElementById('btn-report-broken');
  if (btnReportBroken) {
    btnReportBroken.addEventListener('click', async () => {
      if (btnReportBroken.disabled) return;
      const issueInput = document.getElementById('ward-issue-input');
      let issueText = issueInput ? issueInput.value.trim() : '';
      if (state.wardCapturedPhotoFile) {
        issueText = (issueText ? issueText + ' ' : '') + '[📷 แนบภาพถ่ายจากมือถือแล้ว]';
      }
      const tag = state.selectedAsset ? state.selectedAsset.asset_tag : null;
      await updateAssetStatus('Broken', issueText);
      if (tag && state.wardCapturedPhotoFile) {
        await uploadWardCapturedPhoto(tag);
      }
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
  const filterCategorySelect = document.getElementById('filter-category-select');
  if (filterCategorySelect) {
    filterCategorySelect.addEventListener('change', (e) => {
      if (typeof selectCategoryTab === 'function') {
        selectCategoryTab(e.target.value);
      } else {
        state.filters.category = e.target.value;
        state.pagination.page = 1;
        refreshData();
      }
    });
  }

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
  document.getElementById('change-password-form')?.addEventListener('submit', handleChangePasswordSubmit);

  // Proactive Warranty Expiry Badge Quick Navigation & Filter (60-day threshold)
  function goToExpiringWarrantyAssets() {
    if (typeof switchView === 'function') switchView('it');
    if (typeof switchItTab === 'function') switchItTab('tab-it-inventory');

    // Reset category tab to All without triggering duplicate refreshData
    if (typeof selectCategoryTab === 'function') {
      selectCategoryTab('', true); // skipRefresh = true
    } else if (state.filters) {
      state.filters.category = '';
    }

    const filterStatus = document.getElementById('filter-status');
    if (filterStatus) {
      filterStatus.value = 'expiring_60d';
    }
    if (state.filters) {
      state.filters.status = 'expiring_60d';
    }
    state.pagination.page = 1;

    // Single authoritative refreshData invocation
    if (typeof refreshData === 'function') {
      refreshData();
    }

    const invTable = document.getElementById('inventory-table-title') || document.getElementById('tab-it-inventory');
    if (invTable) {
      invTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  window.goToExpiringWarrantyAssets = goToExpiringWarrantyAssets;

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
      b.classList.remove('btn-primary', 'active');
      b.classList.add('btn-secondary');
      b.style.background = '';
      b.style.borderColor = '';
      b.style.color = '';
    }
  });

  if (paneScan) paneScan.style.display = 'none';
  if (paneTracker) paneTracker.style.display = 'none';
  if (paneLoaner) paneLoaner.style.display = 'none';

  let activeBtn = null;
  if (subView === 'scan') {
    activeBtn = btnScan;
    if (paneScan) paneScan.style.display = 'block';
  } else if (subView === 'tracker') {
    activeBtn = btnTracker;
    if (paneTracker) paneTracker.style.display = 'block';
    loadStaffTracker();
  } else if (subView === 'loaner') {
    activeBtn = btnLoaner;
    if (paneLoaner) paneLoaner.style.display = 'block';
  }

  if (activeBtn) {
    activeBtn.classList.remove('btn-secondary');
    activeBtn.classList.add('btn-primary', 'active');
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
        floor: 'Staff Area',
        status: 'Pending PM Inspection',
        moved_direction: 'IN',
        details: `[คำขอบำรุงรักษาเชิงป้องกันประจำรอบ 6 เดือน] แผนก ${dept} แจ้งขอรับบริการบำรุงรักษาเชิงป้องกันประจำรอบ 6 เดือน`
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
        floor: 'Staff Area',
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
    
    // Filter repair/claim in-flight assets
    const activeRepairStatuses = ['Broken', 'Pending Pickup', 'In Repair', 'Claiming', 'In Progress'];
    const allRepairs = assets.filter(a => activeRepairStatuses.includes(a.status));

    const dept = (state.user?.department || '').toLowerCase();
    const isTechOrAdmin = !dept || dept.includes('technical') || dept.includes('infrastructure') || dept.includes('it') || (state.user?.role === 'admin');

    let deptItems = [];
    if (isTechOrAdmin) {
      deptItems = allRepairs.length > 0 ? allRepairs : assets.filter(a => a.status !== 'Working');
    } else {
      // For ward staff, first look for repairs in their department
      const wardRepairs = allRepairs.filter(a => {
        const loc = (a.location || '').toLowerCase();
        return loc.includes(dept) || dept.includes(loc);
      });
      // If ward has active repairs, show them; otherwise show all active hospital repairs so staff sees system activity
      deptItems = wardRepairs.length > 0 ? wardRepairs : allRepairs;
    }

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

// ─── Mobile Connection & Hospital IP Manager ────────────────────────────────
let currentMobileUrl = typeof window !== 'undefined' ? window.location.origin : '';

async function fetchNetworkInfo() {
  try {
    const res = await fetch('/api/network-info');
    if (!res.ok) throw new Error('Network info failed');
    const data = await res.json();
    
    const savedCustomIp = localStorage.getItem('claimit_custom_ip');
    const activeHost = savedCustomIp || data.detectedIp || window.location.hostname;
    currentMobileUrl = `http://${activeHost}:${data.port || window.location.port || 8847}`;

    const sidebarInput = document.getElementById('sidebar-mobile-url-input');
    if (sidebarInput) sidebarInput.value = currentMobileUrl;

    const modalInput = document.getElementById('modal-mobile-url-input');
    if (modalInput) modalInput.value = currentMobileUrl;

    const customInput = document.getElementById('custom-ip-input');
    if (customInput && savedCustomIp) customInput.value = savedCustomIp;

    if (typeof renderQRCode === 'function') {
      renderQRCode('modal-qr-container', currentMobileUrl, 170);
    }
  } catch (e) {
    console.warn('Network info fetch error:', e);
    currentMobileUrl = currentMobileUrl || window.location.origin;
    const modalInput = document.getElementById('modal-mobile-url-input');
    if (modalInput && !modalInput.value) modalInput.value = currentMobileUrl;
    if (typeof renderQRCode === 'function') {
      renderQRCode('modal-qr-container', currentMobileUrl, 170);
    }
  }
}

function copyMobileUrl() {
  const url = currentMobileUrl || window.location.origin;
  navigator.clipboard.writeText(url)
    .then(() => showToast('📋 คัดลอกลิงก์สำหรับ iPhone/มือถือแล้ว!', 'success'))
    .catch(() => prompt('คัดลอกลิงก์นี้เปิดบนมือถือ:', url));
}
window.copyMobileUrl = copyMobileUrl;

function openMobileIpModal() {
  const modal = document.getElementById('mobile-ip-modal');
  if (modal) modal.style.display = 'flex';

  const initialUrl = currentMobileUrl || window.location.origin;
  const modalInput = document.getElementById('modal-mobile-url-input');
  if (modalInput && (!modalInput.value || modalInput.value === '')) {
    modalInput.value = initialUrl;
  }
  if (typeof renderQRCode === 'function') {
    renderQRCode('modal-qr-container', initialUrl, 170);
  }

  fetchNetworkInfo();
}
window.openMobileIpModal = openMobileIpModal;

function saveCustomIP() {
  const input = document.getElementById('custom-ip-input');
  if (!input) return;
  const val = input.value.trim();
  if (val) {
    localStorage.setItem('claimit_custom_ip', val);
    showToast(`💾 บันทึก IP กำหนดเอง: ${val} แล้ว`, 'success');
  } else {
    localStorage.removeItem('claimit_custom_ip');
    showToast('🔄 คืนค่า IP เป็นระบบตรวจจับอัตโนมัติ', 'info');
  }
  fetchNetworkInfo();
}
window.saveCustomIP = saveCustomIP;

function promptChangeMobileIP() {
  openMobileIpModal();
}
window.promptChangeMobileIP = promptChangeMobileIP;

// ─── Ward / Staff Photo Capture (Mobile & iPhone Camera) ─────────────────────
state.wardCapturedPhotoFile = null;

function handleWardPhotoCapture(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  state.wardCapturedPhotoFile = file;

  // Show status tag in Upper Bar
  const statusTag = document.getElementById('ward-camera-status-tag');
  if (statusTag) statusTag.style.display = 'flex';

  // Show preview in Details Card
  const previewBox = document.getElementById('ward-photo-preview-box');
  const imgEl = document.getElementById('ward-photo-img');
  if (previewBox && imgEl) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imgEl.src = e.target.result;
      previewBox.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  }

  showToast('📷 แนบภาพถ่ายจากมือถือสำเร็จ!', 'success');
}
window.handleWardPhotoCapture = handleWardPhotoCapture;

function clearWardPhoto() {
  state.wardCapturedPhotoFile = null;
  const input = document.getElementById('ward-camera-input');
  if (input) input.value = '';

  const statusTag = document.getElementById('ward-camera-status-tag');
  if (statusTag) statusTag.style.display = 'none';

  const previewBox = document.getElementById('ward-photo-preview-box');
  if (previewBox) previewBox.style.display = 'none';
}
window.clearWardPhoto = clearWardPhoto;

async function uploadWardCapturedPhoto(assetTag) {
  if (!state.wardCapturedPhotoFile || !assetTag) return;
  const token = state.user?.token;
  if (!token) {
    showToast('กรุณาเข้าสู่ระบบก่อนอัปโหลดภาพหลักฐาน', 'warning');
    return;
  }
  try {
    const formData = new FormData();
    formData.append('file', state.wardCapturedPhotoFile);
    formData.append('asset_tag', assetTag);

    const res = await fetch('/api/evidence/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || 'อัปโหลดภาพหลักฐานล้มเหลว', 'error');
      return;
    }
    console.log(`[Photo Evidence] Uploaded photo evidence for ${assetTag}`);
    showToast('อัปโหลดภาพหลักฐานสำเร็จ', 'success');
    clearWardPhoto();
  } catch (err) {
    console.warn('Photo evidence upload warning:', err);
    showToast('อัปโหลดภาพหลักฐานล้มเหลว กรุณาลองใหม่', 'error');
  }
}
window.uploadWardCapturedPhoto = uploadWardCapturedPhoto;

async function triggerManualBackup() {
  const statusText = document.getElementById('backup-status-text');
  if (statusText) statusText.textContent = '⏳ กำลังสร้างไฟล์สำรอง...';
  try {
    const res = await fetch('/api/backup', {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`✅ สำรองฐานข้อมูลสำเร็จ: ${data.fileName}`, 'success');
      if (statusText) statusText.textContent = `✅ สำรองสำเร็จล่าสุด: ${data.fileName}`;
    } else {
      showToast(data.error || 'การสำรองข้อมูลล้มเหลว', 'error');
      if (statusText) statusText.textContent = '❌ การสำรองข้อมูลล้มเหลว';
    }
  } catch (err) {
    console.error('Backup error:', err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
  }
}
window.triggerManualBackup = triggerManualBackup;

// ─── IT Hotline Numbers UI Synchronizer ────────────────────────────────────
function updateHotlineNumbersUI(configs) {
  if (!configs || !Array.isArray(configs)) return;
  const hotlineCfg = configs.find(c => c.type === 'hotline');
  const rawValue = (hotlineCfg && hotlineCfg.value) ? hotlineCfg.value : '4401, 4402, 4403';

  // Extract phone numbers separated by comma, slash, semicolon, or whitespace
  const numbers = rawValue.split(/[,;/]+/).map(s => s.trim()).filter(Boolean);
  if (numbers.length === 0) numbers.push('4401', '4402', '4403');

  // 1. Update Staff / Ward portal call buttons
  const container = document.getElementById('staff-hotline-container');
  if (container) {
    container.innerHTML = numbers.map(num => {
      const telClean = num.replace(/[^0-9+]/g, '');
      return `<a href="tel:${telClean || num}" class="btn btn-secondary btn-sm" title="โทร ${escapeHtml(num)}">☎️ ${escapeHtml(num)}</a>`;
    }).join('\n');
  }

  // 2. Update Sidebar IT Helpdesk text
  const sidebarText = document.getElementById('sidebar-hotline-text');
  if (sidebarText) {
    if (numbers.length === 1) {
      sidebarText.textContent = `โทรภายใน ${numbers[0]}`;
    } else {
      sidebarText.textContent = `โทรภายใน ${numbers.join(' - ')}`;
    }
  }

  // 3. Update Admin Hotline Input & Preview if present
  const hotlineInput = document.getElementById('cfg-hotline-input');
  if (hotlineInput && document.activeElement !== hotlineInput) {
    hotlineInput.value = numbers.join(', ');
  }
  if (typeof previewHotlineNumbers === 'function') {
    previewHotlineNumbers(numbers.join(', '));
  }
}
window.updateHotlineNumbersUI = updateHotlineNumbersUI;

// Initialize Network info and public contact on load
document.addEventListener('DOMContentLoaded', () => {
  fetchNetworkInfo();
  fetch('/api/configurations/public-contact')
    .then(r => r.ok ? r.json() : [])
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        updateHotlineNumbersUI(data);
      }
    })
    .catch(() => {});
});

// ==========================================================================
// User & Admin Manual Modal Controller (Dual-Role Documentation Center)
// ==========================================================================
function openManualModal() {
  const modal = document.getElementById('modal-manual-download');
  if (!modal) return;

  const userRole = (state.user && state.user.role) ? state.user.role : 'staff';
  const adminSection = document.getElementById('manual-admin-section');
  const adminActions = document.getElementById('manual-admin-actions');
  const adminRestricted = document.getElementById('manual-admin-restricted');
  const regenSection = document.getElementById('manual-regenerate-section');

  if (userRole === 'admin') {
    if (adminActions) adminActions.style.display = 'flex';
    if (adminRestricted) adminRestricted.style.display = 'none';
    if (regenSection) regenSection.style.display = 'block';
  } else {
    if (adminActions) adminActions.style.display = 'none';
    if (adminRestricted) adminRestricted.style.display = 'block';
    if (regenSection) regenSection.style.display = 'none';
  }

  modal.style.display = 'flex';
}

function closeManualModal() {
  const modal = document.getElementById('modal-manual-download');
  if (modal) modal.style.display = 'none';
}

function viewManualOnline(role) {
  const token = state.user && state.user.token ? state.user.token : '';
  const url = `/api/manuals/${encodeURIComponent(role)}/html?token=${encodeURIComponent(token)}`;
  window.open(url, '_blank');
}

function downloadManualFile(role, format) {
  const token = state.user && state.user.token ? state.user.token : '';
  const url = `/api/manuals/${encodeURIComponent(role)}/${encodeURIComponent(format)}?token=${encodeURIComponent(token)}`;
  window.location.href = url;
}

async function triggerRegenerateManuals() {
  if (!state.user || state.user.role !== 'admin') {
    if (typeof showToast === 'function') {
      showToast('สิทธิ์ไม่เพียงพอ: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น', 'warning');
    }
    return;
  }
  const btn = document.getElementById('btn-regenerate-manuals');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ กำลังสร้างคู่มือ...';
  }
  try {
    const res = await fetch('/api/manuals/regenerate', {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Authorization': 'Bearer ' + state.user.token }
    });
    const data = await res.json();
    if (res.ok) {
      if (typeof showToast === 'function') {
        showToast(data.message || 'สร้างคู่มือระบบใหม่สำเร็จเรียบร้อยแล้ว', 'success', 3500);
      }
    } else {
      if (typeof showToast === 'function') {
        showToast(data.error || 'การสร้างคู่มือล้มเหลว', 'error');
      }
    }
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔄 สร้างคู่มือใหม่ทันที';
    }
  }
}

window.openManualModal = openManualModal;
window.closeManualModal = closeManualModal;
window.viewManualOnline = viewManualOnline;
window.downloadManualFile = downloadManualFile;
window.triggerRegenerateManuals = triggerRegenerateManuals;
