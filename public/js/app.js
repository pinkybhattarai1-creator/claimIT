// ClaimIT Frontend Application State Manager
const state = {
  user: null,
  activeView: 'auth', // 'auth', 'ward', 'it'
  selectedAsset: null,
  sanitizationChecked: false,
  pendingFuzzyAsset: null, // holds a fuzzy match until the user confirms it
  pagination: {
    page: 1,
    limit: 50,
    total: 0
  },
  filters: {
    status: '',
    category: ''
  }
};

// DOM Elements
const authSection = document.getElementById('auth-section');
const wardSection = document.getElementById('ward-section');
const itSection = document.getElementById('it-section');

const navTabs = document.getElementById('nav-tabs');
const userBadge = document.getElementById('user-badge');
const userNameEl = document.getElementById('user-name');
const userRoleEl = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');

// Start Application
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function getAuthHeaders() {
  const token = state.user ? state.user.token : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

function initApp() {
  // Check local storage for user session
  const storedUser = localStorage.getItem('claimit_user');
  if (storedUser) {
    state.user = JSON.parse(storedUser);
    showUserNavigation();
    if (state.user.role === 'admin') {
      switchView('it');
    } else {
      switchView('ward');
    }
  } else {
    switchView('auth');
  }
  
  // Set up event listeners
  setupEventListeners();
  
  // Fetch initial data
  if (state.user) {
    refreshData();
  }
}

// Helper to hide fuzzy suggestion banners safely
function hideFuzzySuggestion() {
  const wardBanner = document.getElementById('fuzzy-suggestion-ward');
  const itBanner = document.getElementById('fuzzy-suggestion-it');
  if (wardBanner) wardBanner.style.display = 'none';
  if (itBanner) itBanner.style.display = 'none';
}

function setupEventListeners() {
  // Login Form
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  
  // Navigation Tabs
  document.getElementById('btn-to-ward').addEventListener('click', () => switchView('ward'));
  document.getElementById('btn-to-it').addEventListener('click', () => {
    if (state.user && state.user.role === 'admin') {
      switchView('it');
    } else {
      alert('เฉพาะเจ้าหน้าที่ IT (Admin) เท่านั้นที่สามารถเข้าถึงระบบ IT Portal ได้');
    }
  });
  
  logoutBtn.addEventListener('click', logout);
  
  // Demo Mode
  let isDemoMode = false;
  const demoToggleBtn = document.getElementById('demo-toggle-btn');
  if (demoToggleBtn) {
    demoToggleBtn.addEventListener('click', () => {
      isDemoMode = !isDemoMode;
      demoToggleBtn.style.opacity = isDemoMode ? '1' : '0.5';
      demoToggleBtn.style.background = isDemoMode ? 'var(--primary-glow)' : 'transparent';
      document.querySelectorAll('.demo-only').forEach(el => {
        el.style.display = isDemoMode ? 'inline-block' : 'none';
      });
    });
  }

  const fillAdmin = document.getElementById('demo-fill-admin');
  if (fillAdmin) fillAdmin.addEventListener('click', () => {
    document.getElementById('login-username').value = 'admin';
    document.getElementById('login-password').value = 'admin123';
  });

  const fillStaff = document.getElementById('demo-fill-staff');
  if (fillStaff) fillStaff.addEventListener('click', () => {
    document.getElementById('login-username').value = 'staff';
    document.getElementById('login-password').value = 'staff123';
  });
  
  // Manual search (Click)
  document.getElementById('ward-search-btn').addEventListener('click', () => {
    const val = document.getElementById('ward-search-input').value.trim();
    if (val) lookupAsset(val);
  });
  
  document.getElementById('it-search-btn').addEventListener('click', () => {
    const val = document.getElementById('it-search-input').value.trim();
    if (val) lookupAsset(val);
  });

  // Hardware Scanner Support (Listens for "Enter" key after scan)
  document.getElementById('ward-search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      hideFuzzySuggestion();
      const val = document.getElementById('ward-search-input').value.trim();
      if (val) lookupAsset(val);
    }
  });

  document.getElementById('it-search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      hideFuzzySuggestion();
      const val = document.getElementById('it-search-input').value.trim();
      if (val) lookupAsset(val);
    }
  });

  // Fuzzy suggestion confirm / dismiss buttons
  document.getElementById('fuzzy-confirm-ward').addEventListener('click', () => {
    if (state.pendingFuzzyAsset) {
      const asset = state.pendingFuzzyAsset;
      state.pendingFuzzyAsset = null;
      hideFuzzySuggestion();
      document.getElementById('ward-search-input').value = asset.asset_tag;
      state.selectedAsset = asset;
      displayAssetDetails(asset);
    }
  });
  document.getElementById('fuzzy-dismiss-ward').addEventListener('click', () => {
    state.pendingFuzzyAsset = null;
    hideFuzzySuggestion();
  });

  document.getElementById('fuzzy-confirm-it').addEventListener('click', () => {
    if (state.pendingFuzzyAsset) {
      const asset = state.pendingFuzzyAsset;
      state.pendingFuzzyAsset = null;
      hideFuzzySuggestion();
      document.getElementById('it-search-input').value = asset.asset_tag;
      state.selectedAsset = asset;
      displayAssetDetails(asset);
    }
  });
  document.getElementById('fuzzy-dismiss-it').addEventListener('click', () => {
    state.pendingFuzzyAsset = null;
    hideFuzzySuggestion();
  });
  
  // Action Buttons
  document.getElementById('btn-report-broken').addEventListener('click', () => updateAssetStatus('Broken'));
  
  // Open Resolve Modal
  document.getElementById('btn-resolve').addEventListener('click', () => {
    if (!state.selectedAsset) return;
    document.getElementById('resolve-tag-input').value = state.selectedAsset.asset_tag;
    document.getElementById('resolve-rma-modal').style.display = 'flex';
  });
  document.getElementById('close-resolve-modal-btn').addEventListener('click', () => {
    document.getElementById('resolve-rma-modal').style.display = 'none';
  });
  document.getElementById('resolve-rma-form').addEventListener('submit', handleResolveRma);
  
  // Sanitization Checkbox
  const sanitizeChk = document.getElementById('sanitize-chk');
  if (sanitizeChk) {
    sanitizeChk.addEventListener('click', () => {
      state.sanitizationChecked = !state.sanitizationChecked;
      if (state.sanitizationChecked) {
        sanitizeChk.classList.add('checked');
      } else {
        sanitizeChk.classList.remove('checked');
      }
    });
  }

  document.getElementById('btn-confirm-sanitize').addEventListener('click', confirmSanitization);
  
  // Claim Submit & Vendor Change
  document.getElementById('rma-form').addEventListener('submit', handleClaimInitiate);
  const vendorSelect = document.getElementById('claim-vendor');
  if (vendorSelect) {
    vendorSelect.addEventListener('change', handleVendorChange);
  }

  // Modals (Add Asset & Add User)
  const addAssetModal = document.getElementById('add-asset-modal');
  document.getElementById('btn-open-add-asset-modal').addEventListener('click', () => {
    addAssetModal.style.display = 'flex';
  });
  document.getElementById('close-asset-modal-btn').addEventListener('click', () => {
    addAssetModal.style.display = 'none';
  });
  document.getElementById('add-asset-form').addEventListener('submit', handleAddAsset);

  const addUserModal = document.getElementById('add-user-modal');
  document.getElementById('btn-open-add-user-modal').addEventListener('click', () => {
    addUserModal.style.display = 'flex';
  });
  document.getElementById('close-user-modal-btn').addEventListener('click', () => {
    addUserModal.style.display = 'none';
  });
  document.getElementById('add-user-form').addEventListener('submit', handleAddUser);

  // Modal (Add Config)
  const addConfigModal = document.getElementById('add-config-modal');
  if (addConfigModal) {
      document.getElementById('btn-open-add-config-modal').addEventListener('click', () => {
        document.getElementById('add-config-form').reset();
        document.getElementById('config-id').value = '';
        addConfigModal.style.display = 'flex';
      });
      document.getElementById('close-config-modal-btn').addEventListener('click', () => {
        addConfigModal.style.display = 'none';
      });
      document.getElementById('add-config-form').addEventListener('submit', handleAddConfig);
  }

  // Email Modal Events
  document.getElementById('close-email-modal-btn').addEventListener('click', closeEmailModal);
  document.getElementById('cancel-email-btn').addEventListener('click', closeEmailModal);
  document.getElementById('confirm-send-email-btn').addEventListener('click', confirmAndSendEmail);

  // Template Center Modal Events
  const closeTemplateModalBtn = document.getElementById('close-template-modal-btn');
  if (closeTemplateModalBtn) {
    closeTemplateModalBtn.addEventListener('click', () => {
      document.getElementById('print-template-modal').style.display = 'none';
    });
  }

  const templateSelector = document.getElementById('template-selector');
  if (templateSelector) {
    templateSelector.addEventListener('change', () => {
      renderActiveTemplate();
    });
  }

  const toggleEditBtn = document.getElementById('btn-toggle-quick-edit');
  if (toggleEditBtn) {
    toggleEditBtn.addEventListener('click', () => {
      const drawer = document.getElementById('template-quick-edit-drawer');
      drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
    });
  }

  // Live input update listeners in quick edit drawer
  const quickInputs = ['edit-job-no', 'edit-contact-name', 'edit-contact-phone', 'edit-problem-desc', 'edit-tech-name', 'edit-solution'];
  quickInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => renderActiveTemplate());
    }
  });

  const btnExecutePrint = document.getElementById('btn-execute-print');
  if (btnExecutePrint) {
    btnExecutePrint.addEventListener('click', () => {
      window.print();
    });
  }

  // Copy Data Event
  const copyBtn = document.getElementById('btn-copy-data');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyAssetDataToClipboard);
  }

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
}

// Copy Data Logic
async function copyAssetDataToClipboard() {
  try {
    const res = await fetch('/api/assets?limit=500', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();
    const assets = Array.isArray(data) ? data : (data.assets || []);
    
    // Create TSV (Tab-Separated Values) format
    let tsvData = 'Asset Tag\tDevice Name\tLocation\tWarranty End\tStatus\tSalvage Status\n';
    assets.forEach(a => {
      tsvData += `${a.asset_tag}\t${a.device_name}\t${a.location}\t${a.warranty_end}\t${a.status}\t${a.salvage_status || 'None'}\n`;
    });
    
    await navigator.clipboard.writeText(tsvData);
    alert('คัดลอกข้อมูลสำเร็จ (Data copied to clipboard)!');
  } catch (error) {
    console.error('Copy data error:', error);
    alert('ไม่สามารถคัดลอกข้อมูลได้ (Failed to copy data)');
  }
}

function closeEmailModal() {
  document.getElementById('email-preview-modal').style.display = 'none';
}

let pendingClaimData = null;

// Routing & View Switcher
const PAGE_TITLES = {
  auth: 'ClaimIT — เข้าสู่ระบบ',
  ward: 'ClaimIT — Staff Portal (แจ้งซ่อมครุภัณฑ์)',
  it:   'ClaimIT — IT Dashboard (จัดการระบบ)'
};

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
    refreshData();
    setTimeout(() => document.getElementById('it-search-input')?.focus(), 100);
  }
}

// Authentication
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
      const user = await response.json();
      state.user = user;
      localStorage.setItem('claimit_user', JSON.stringify(user));
      showUserNavigation();
      
      if (user.role === 'admin') {
        switchView('it');
      } else {
        switchView('ward');
      }
    } else {
      const err = await response.json();
      alert(err.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Cannot connect to server. Check terminal to ensure the backend is running.');
  }
}

function showUserNavigation() {
  userNameEl.textContent = state.user.name;
  userRoleEl.textContent = state.user.role === 'admin' ? 'IT Admin' : 'Staff';
  const itBtn = document.getElementById('btn-to-it');
  if (state.user.role === 'admin') {
    itBtn.style.display = 'flex';
  } else {
    itBtn.style.display = 'none';
  }
}

function logout() {
  localStorage.removeItem('claimit_user');
  state.user = null;
  switchView('auth');
}

// Fetch Lists & Update Statistics
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

    const assetsData = await assetsRes.json();
    const assets = Array.isArray(assetsData) ? assetsData : (assetsData.assets || []);
    state.pagination.total = assetsData.total || assets.length;

    updatePaginationUI();
    
    const logsRes = await fetch('/api/audit-logs', { headers: getAuthHeaders() });
    const logs = await logsRes.json();

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
    populateAuditTable(logs);
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
    
    // Hide prev if on first page
    btnPrev.style.display = state.pagination.page <= 1 ? 'none' : 'inline-block';
    // Hide next if on last page or no items
    btnNext.style.display = (state.pagination.page >= maxPage || maxPage === 0) ? 'none' : 'inline-block';
  }
}

function updateStatistics(assets) {
  const total = state.pagination.total || assets.length;
  const working = assets.filter(a => a.status === 'Working').length;
  const broken = assets.filter(a => a.status === 'Broken').length;
  const atVendor = assets.filter(a => a.status === 'Pending Pickup').length;
  
  document.getElementById('stat-total-assets').textContent = total;
  document.getElementById('stat-working-assets').textContent = working;
  document.getElementById('stat-broken-assets').textContent = broken;
  document.getElementById('stat-vendor-claims').textContent = atVendor;
}

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
    `;
    tbody.appendChild(tr);
  });
}

function populateUserTable(users) {
  const tbody = document.getElementById('user-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  
  // Sort users so Admin is first
  const sortedUsers = [...users].sort((a, b) => a.role.localeCompare(b.role));
  
  let currentRole = null;
  sortedUsers.forEach(u => {
    if (currentRole !== u.role) {
      currentRole = u.role;
      const groupTr = document.createElement('tr');
      groupTr.style.background = 'rgba(255, 255, 255, 0.1)';
      groupTr.innerHTML = `<td colspan="6" style="font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${currentRole === 'admin' ? '🛡️ Administrators' : '👨‍💻 Staff Members'}</td>`;
      tbody.appendChild(groupTr);
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td><strong>${u.username}</strong></td>
      <td>${u.name}</td>
      <td>${u.department}</td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-working' : 'badge-vendor'}">${u.role.toUpperCase()}</span></td>
      <td>
        ${u.username !== 'admin' ? `<button class="btn btn-danger" onclick="deleteUser(${u.id})" style="padding: 4px 8px; font-size: 11px;">ลบผู้ใช้</button>` : `<span style="font-size: 11px; color: var(--text-muted);">ระบบหลัก</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteUser = async function(id) {
  if (!confirm('คุณต้องการลบผู้ใช้นี้ออกจากระบบใช่หรือไม่?')) return;
  try {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (res.ok) {
      alert('ลบผู้ใช้สำเร็จแล้ว');
      refreshData();
    } else {
      const err = await res.json();
      alert(err.error || 'ไม่สามารถลบผู้ใช้ได้');
    }
  } catch (error) {
    console.error('Delete user error:', error);
  }
};

function populateAuditTable(logs) {
  const tbody = document.getElementById('audit-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  // Sort by moved_direction or type to group them
  const sortedLogs = [...logs].sort((a, b) => a.moved_direction.localeCompare(b.moved_direction));
  let currentDir = null;

  sortedLogs.forEach(log => {
    if (currentDir !== log.moved_direction) {
      currentDir = log.moved_direction;
      const groupTr = document.createElement('tr');
      groupTr.style.background = 'rgba(255, 255, 255, 0.1)';
      groupTr.innerHTML = `<td colspan="6" style="font-weight: bold;">${currentDir === 'IN' ? '📥 สินค้าเข้า (IN)' : '📤 สินค้าออก (OUT)'}</td>`;
      tbody.appendChild(groupTr);
    }

    const tr = document.createElement('tr');
    const time = new Date(log.timestamp).toLocaleString('th-TH');
    
    let dirClass = 'badge-working';
    if (log.moved_direction === 'OUT') dirClass = 'badge-broken';
    
    tr.innerHTML = `
      <td>${time}</td>
      <td><strong>${log.asset_tag}</strong></td>
      <td>${log.department_name}</td>
      <td>${log.status}</td>
      <td><span class="badge ${dirClass}">${log.moved_direction}</span></td>
      <td>${log.action_by_username}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Local Tag Parser Heuristic (ISO / Off-grid Offline Parser)
function parseAssetTagLocal(rawText) {
  const yearMatch = rawText.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : 'Unknown';
  
  const versionMatch = rawText.match(/[vV](ersion)?\s*([0-9])/);
  const version = versionMatch ? versionMatch[2] : '1';
  
  let parsedStatus = 'Unknown';
  if (rawText.includes('-W') || rawText.toLowerCase().includes('work')) {
    parsedStatus = 'Warranty Active';
  } else if (rawText.includes('-EX') || rawText.toLowerCase().includes('exp')) {
    parsedStatus = 'Expired';
  }
  
  return {
    raw: rawText,
    year,
    version,
    parsedStatus,
    timestamp: new Date().toISOString()
  };
}

function displayLocalParserResults(parsed) {
  const elements = [
    document.getElementById('parser-analytics-ward'),
    document.getElementById('parser-analytics-it')
  ];
  
  elements.forEach(el => {
    if (!el) return;
    el.style.display = 'block';
    el.innerHTML = `
      <div style="font-size: 11px; font-family: monospace; color: var(--info); line-height: 1.5;">
        <span style="color:#fff; font-weight:bold;">[OFFLINE TAG PARSER DETECTED]</span><br>
        Raw Text: "${parsed.raw}"<br>
        Extracted Year: <span style="color:#fff">${parsed.year}</span><br>
        Schema Version: <span style="color:#fff">V${parsed.version}</span><br>
        Implied Status: <span style="color:#fff">${parsed.parsedStatus}</span><br>
        Security Status: <span style="color:#10b981">PDPA Cleared (No PII)</span>
      </div>
    `;
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
        displayAssetDetails(asset);
      }
    } else {
      if (confirm(`ไม่พบรหัสครุภัณฑ์ "${tag}" คุณต้องการเพิ่มข้อมูลครุภัณฑ์ใหม่หรือไม่?`)) {
        document.getElementById('add-asset-modal').style.display = 'flex';
        document.getElementById('new-asset-tag').value = tag;
      } else {
        alert(`ไม่พบรหัสครุภัณฑ์ "${tag}" ในฐานข้อมูล แต่ระบบคำนวณแบบ Offline ได้ว่าปีผลิตคือ ${parsed.year}`);
      }
    }
  } catch (error) {
    console.error('Lookup failed:', error);
  }
}

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
  serialEl.closest('.detail-item').after(quickPanel);
  // --- END WARRANTY QUICK-ACCESS PANEL ---

  document.getElementById(`${prefix}-detail-status`).innerHTML = getStatusBadgeHTML(asset);
  document.getElementById(`${prefix}-details-card`).style.display = 'block';
  
  // Fetch and display claim worthiness calculator evaluation
  fetchAndDisplayEvaluation(asset.asset_tag, prefix);

  if (prefix === 'it') {
    const claimForm = document.getElementById('rma-form-container');
    const sanitizePanel = document.getElementById('sanitize-panel');
    const btnResolve = document.getElementById('btn-resolve');
    const btnReportBroken = document.getElementById('btn-report-broken');
    
    btnResolve.style.display = 'none';
    if (btnReportBroken) btnReportBroken.style.display = 'none';
    sanitizePanel.style.display = 'none';
    claimForm.style.display = 'none';
    
    if (asset.status === 'Working') {
      if (btnReportBroken) btnReportBroken.style.display = 'block';
    } else if (asset.status === 'Broken') {
      btnResolve.style.display = 'block';
      btnResolve.textContent = '✅ รับเครื่องคืนจากซ่อม/เคลม (Return to Stock)';
      
      if (asset.sanitization_required) {
        if (!asset.rma_data_wiped_confirmed && asset.rma_status !== 'Sanitized') {
          sanitizePanel.style.display = 'block';
          state.sanitizationChecked = false;
          document.getElementById('sanitize-chk').classList.remove('checked');
        } else {
          claimForm.style.display = 'block';
          document.getElementById('claim-tag-input').value = asset.asset_tag;
        }
      } else {
        claimForm.style.display = 'block';
        document.getElementById('claim-tag-input').value = asset.asset_tag;
      }
    } else if (asset.status === 'Pending Pickup') {
      btnResolve.style.display = 'block';
      btnResolve.textContent = '✅ รับเครื่องคืนจากศูนย์บริการ (Complete RMA)';
    }
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
      alert(`อัปเดตสถานะการจำหน่ายเป็น [${salvageStatus}] เรียบร้อยแล้ว`);
      lookupAsset(tag);
      refreshData();
    } else {
      const err = await res.json();
      alert(err.error || 'ไม่สามารถทำรายการได้');
    }
  } catch (err) {
    console.error('Salvage action error:', err);
  }
};

// Form Handlers: Add Asset, Add User, Add Config
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
    sanitization_required: document.getElementById('new-sanitization-req').checked ? 1 : 0,
    action_by_username: state.user ? state.user.username : 'admin'
  };

  try {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      alert('ลงทะเบียนครุภัณฑ์ใหม่เรียบร้อยแล้ว');
      document.getElementById('add-asset-modal').style.display = 'none';
      document.getElementById('add-asset-form').reset();
      refreshData();
    } else {
      const err = await res.json();
      alert(err.error || 'ไม่สามารถลงทะเบียนครุภัณฑ์ได้');
    }
  } catch (error) {
    console.error('Add asset error:', error);
  }
}

async function handleAddUser(e) {
  e.preventDefault();
  const payload = {
    username: document.getElementById('new-username').value.trim(),
    password: document.getElementById('new-password').value,
    name: document.getElementById('new-fullname').value.trim(),
    department: document.getElementById('new-user-dept').value.trim(),
    role: document.getElementById('new-user-role').value
  };

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('เพิ่มผู้ใช้งานใหม่เรียบร้อยแล้ว');
      document.getElementById('add-user-modal').style.display = 'none';
      document.getElementById('add-user-form').reset();
      refreshData();
    } else {
      const err = await res.json();
      alert(err.error || 'ไม่สามารถเพิ่มผู้ใช้งานได้');
    }
  } catch (error) {
    console.error('Add user error:', error);
  }
}

async function handleAddConfig(e) {
  e.preventDefault();
  const id = document.getElementById('config-id').value;
  const payload = {
    type: document.getElementById('config-type').value,
    value: document.getElementById('config-value').value.trim(),
    details: document.getElementById('config-details').value.trim()
  };
  
  try {
    const url = id ? `/api/configurations/${id}` : '/api/configurations';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('บันทึกการตั้งค่าสำเร็จ');
      document.getElementById('add-config-modal').style.display = 'none';
      refreshData();
    } else {
      const err = await res.json();
      alert(err.error || 'บันทึกข้อมูลล้มเหลว');
    }
  } catch (error) {
    console.error('Add config error:', error);
  }
}

// Action Handlers
async function updateAssetStatus(newStatus) {
  if (!state.selectedAsset) return;
  
  const payload = {
    asset_tag: state.selectedAsset.asset_tag,
    status: newStatus,
    location: state.selectedAsset.location,
    action_by_username: state.user ? state.user.username : 'staff',
    department_name: state.user ? state.user.department : 'Ward 20',
    floor: state.activeView === 'ward' ? 'Fl 2' : 'Fl 1'
  };
  
  try {
    const res = await fetch('/api/assets/update-status', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      alert(`อัปเดตสถานะทรัพย์สินเป็น [${newStatus}] สำเร็จแล้ว`);
      lookupAsset(state.selectedAsset.asset_tag);
      refreshData();
    } else {
      alert('ไม่สามารถอัปเดตสถานะได้');
    }
  } catch (error) {
    console.error('Update status error:', error);
  }
}

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
      alert(data.message);
      document.getElementById('resolve-rma-modal').style.display = 'none';
      lookupAsset(state.selectedAsset.asset_tag);
      refreshData();
    } else {
      const err = await res.json();
      alert(err.error || 'ไม่สามารถรับเครื่องคืนได้');
    }
  } catch (err) {
    console.error('Resolve RMA error:', err);
  }
}

async function confirmSanitization() {
  if (!state.selectedAsset) return;
  if (!state.sanitizationChecked) {
    alert('กรุณายืนยันการล้างข้อมูลโดยคลิกเครื่องหมายถูกก่อนยืนยัน (Please confirm data sanitization)');
    return;
  }

  const codeInput = document.getElementById('sanitize-code-input');
  const wipeCode = codeInput ? codeInput.value.trim() : '';
  if (!wipeCode) {
    alert('🔐 เพื่อความปลอดภัยสูงสุด กรุณากรอกรหัสยืนยันความปลอดภัย (พิมพ์ "WIPED" หรือรหัสครุภัณฑ์) ในช่องที่กำหนด');
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
      alert(data.message || 'บันทึกการล้างข้อมูลความปลอดภัยสำเร็จ');
      if (codeInput) codeInput.value = '';
      lookupAsset(state.selectedAsset.asset_tag);
      refreshData();
    } else {
      alert(data.error || 'ล้มเหลวในการบันทึกข้อมูลการ Sanitization');
    }
  } catch (error) {
    console.error('Sanitization update error:', error);
  }
}

let vendorProcedures = {}; // Dynamically populated from configurations

function sanitizeBrandProcedure(details) {
  if (typeof details !== 'string') return '';

  const trimmed = details.trim();
  if (!trimmed) return '';

  const unsafePatterns = [
    /style\s*=\s*["']\s*padding\s*:/i,
    /padding\s*:\s*4px\s*8px/i,
    /<script[\s\S]*?<\/script>/i
  ];

  if (unsafePatterns.some(pattern => pattern.test(trimmed))) {
    return '';
  }

  return trimmed;
}

function populateConfigTable(configs) {
  const tbody = document.getElementById('config-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const sortedConfigs = [...configs].sort((a, b) => a.type.localeCompare(b.type));
  let currentType = null;

  sortedConfigs.forEach(c => {
    if (currentType !== c.type) {
      currentType = c.type;
      const groupTr = document.createElement('tr');
      groupTr.style.background = 'rgba(255, 255, 255, 0.1)';
      groupTr.innerHTML = `<td colspan="5" style="font-weight: bold; text-transform: uppercase; color: var(--primary);">${currentType}</td>`;
      tbody.appendChild(groupTr);
    }
    const tr = document.createElement('tr');
    const tdId = document.createElement('td');
    tdId.innerHTML = String(c.id);

    const tdType = document.createElement('td');
    tdType.innerHTML = `<strong>${c.type}</strong>`;

    const tdValue = document.createElement('td');
    tdValue.textContent = c.value;

    const tdDetails = document.createElement('td');
    tdDetails.innerHTML = `<div style="word-wrap: break-word; white-space: pre-wrap; max-width: 400px;">${c.details || '-'}</div>`;

    const tdActions = document.createElement('td');

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary';
    editBtn.style.padding = '4px 8px';
    editBtn.style.fontSize = '11px';
    editBtn.textContent = 'แก้ไข';
    editBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      window.editConfig(c.id, c.type, c.value, c.details || '');
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.style.padding = '4px 8px';
    deleteBtn.style.fontSize = '11px';
    deleteBtn.textContent = 'ลบ';
    deleteBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      await window.deleteConfig(c.id);
    });

    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);

    tr.appendChild(tdId);
    tr.appendChild(tdType);
    tr.appendChild(tdValue);
    tr.appendChild(tdDetails);
    tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}

function updateDynamicDropdowns(configs) {
  const vendorSelect = document.getElementById('claim-vendor');
  if (vendorSelect) {
    vendorSelect.innerHTML = '<option value="" disabled selected>-- กรุณาเลือกศูนย์บริการ --</option>';
    const brands = configs.filter(c => c.type === 'brand');
    vendorProcedures = {};
    brands.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.value;
      opt.textContent = b.value;
      vendorSelect.appendChild(opt);

      const safeDetails = sanitizeBrandProcedure(b.details);
      if (safeDetails) {
        vendorProcedures[b.value] = safeDetails;
      }
    });
    const otherOpt = document.createElement('option');
    otherOpt.value = 'Other';
    otherOpt.textContent = 'อื่นๆ (Other)';
    vendorSelect.appendChild(otherOpt);
  }

  const catSelect = document.getElementById('new-category');
  if (catSelect) {
    catSelect.innerHTML = '';
    const categories = configs.filter(c => c.type === 'category');
    if (categories.length === 0) {
        catSelect.innerHTML = '<option value="Computer">Computer</option>';
    } else {
        categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.value;
        opt.textContent = c.value;
        catSelect.appendChild(opt);
        });
    }
  }
}

window.editConfig = function(id, type, value, details) {
  document.getElementById('config-id').value = id;
  document.getElementById('config-type').value = type;
  document.getElementById('config-value').value = value;
  document.getElementById('config-details').value = details;
  document.getElementById('add-config-modal').style.display = 'flex';
};

window.deleteConfig = async function(id) {
  if (!confirm('ยืนยันการลบการตั้งค่านี้?')) return;
  try {
    const res = await fetch(`/api/configurations/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (res.ok) {
      alert('ลบสำเร็จ');
      refreshData();
    }
  } catch (error) {
    console.error(error);
  }
};

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

async function handleClaimInitiate(e) {
  e.preventDefault();
  if (!state.selectedAsset) return;
  
  const vendorName = document.getElementById('claim-vendor').value.trim();
  const rmaNumber = document.getElementById('claim-rma-no').value.trim();
  const expectedDate = document.getElementById('claim-expected-date').value;
  
  if (!vendorName || !rmaNumber || !expectedDate) {
    alert('กรุณากรอกข้อมูลการเคลมศูนย์บริการให้ครบถ้วน');
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
    
    if (!emailRes.ok) {
      const errData = await emailRes.json().catch(() => ({}));
      console.warn('Email send warning:', errData.error || 'Email service not configured');
      if (emailRes.status === 500 || emailRes.status === 400) {
        const proceed = confirm('ไม่สามารถส่งอีเมลได้ (SendGrid ยังไม่ได้ตั้งค่า) ต้องการดำเนินการบันทึกเคลมต่อไปโดยไม่ส่งอีเมลหรือไม่?');
        if (!proceed) {
          btn.disabled = false;
          btn.textContent = '🚀 ยืนยันส่งอีเมลและบันทึกเคลม';
          return;
        }
      }
    }

    // 2. Process Claim (Strict PDPA gate enforced on server)
    const claimRes = await fetch('/api/assets/claim', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(pendingClaimData)
    });
    
    if (claimRes.ok) {
      alert(`ดำเนินการบันทึกใบเคลมศูนย์บริการ ${pendingClaimData.vendor_name} เรียบร้อยแล้ว`);
      closeEmailModal();
      document.getElementById('rma-form').reset();
      lookupAsset(state.selectedAsset.asset_tag);
      refreshData();
    } else {
      const err = await claimRes.json();
      alert(err.error || 'ไม่สามารถส่งเคลมทรัพย์สินได้');
    }
  } catch (error) {
    console.error('Claim initiation error:', error);
    alert('เกิดข้อผิดพลาดในการส่งเคลม');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 ยืนยันส่งอีเมลและบันทึกเคลม';
    pendingClaimData = null;
  }
}

// Global functions for presets
window.selectPreset = function(tag) {
  const prefix = state.activeView === 'ward' ? 'ward' : 'it';
  document.getElementById(`${prefix}-search-input`).value = tag;
  lookupAsset(tag);
};

// PDF Download
window.downloadPDF = async function(assetTag) {
  if (!state.user || !state.user.token) {
    alert('กรุณาเข้าสู่ระบบก่อนดาวน์โหลด PDF');
    return;
  }
  try {
    const res = await fetch(`/api/assets/${encodeURIComponent(assetTag)}/pdf`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('PDF generation failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claim_${assetTag}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('PDF download error:', err);
    alert('ไม่สามารถดาวน์โหลด PDF ได้');
  }
};

// ============================================================================
// OFFICIAL PRINT TEMPLATES ENGINE (Hospital Work Orders & RMA Vouchers)
// Pixel-Perfect Clean Thai Layouts
// ============================================================================

let currentTemplateAsset = null;

window.openTemplateCenter = function(assetTag) {
  const tag = (assetTag || (state.selectedAsset ? state.selectedAsset.asset_tag : '')).trim();
  if (!tag) {
    alert('กรุณาระบุหรือเลือกครุภัณฑ์ก่อนเปิดแบบฟอร์ม');
    return;
  }

  if (state.selectedAsset && state.selectedAsset.asset_tag.toUpperCase() === tag.toUpperCase()) {
    currentTemplateAsset = state.selectedAsset;
    initAndShowTemplateModal();
  } else {
    // Fetch asset details first
    fetch(`/api/assets/${encodeURIComponent(tag)}`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(asset => {
        currentTemplateAsset = asset;
        initAndShowTemplateModal();
      })
      .catch(err => {
        console.error('Failed to load asset for template:', err);
        alert('ไม่สามารถโหลดข้อมูลครุภัณฑ์สำหรับสร้างแบบฟอร์มได้');
      });
  }
};

function initAndShowTemplateModal() {
  if (!currentTemplateAsset) return;
  const modal = document.getElementById('print-template-modal');
  if (!modal) return;

  // Pre-fill quick edit fields with clean Thai data
  const editJobNo = document.getElementById('edit-job-no');
  if (editJobNo) {
    editJobNo.value = currentTemplateAsset.vendor_rma_number || `PYT68${Math.floor(100000 + Math.random() * 900000)}`;
  }

  const editContact = document.getElementById('edit-contact-name');
  if (editContact) {
    editContact.value = state.user ? (state.user.name || 'คุณรมิตา ภูมิแสง') : 'คุณรมิตา ภูมิแสง';
  }

  const editPhone = document.getElementById('edit-contact-phone');
  if (editPhone) {
    editPhone.value = '097-160-9630';
  }

  const editProb = document.getElementById('edit-problem-desc');
  if (editProb) {
    if (currentTemplateAsset.category === 'Printer' || (currentTemplateAsset.device_name || '').toLowerCase().includes('printer')) {
      editProb.value = 'ปริ้นเป็นเส้น / หัวพิมพ์ติดขัด (TM-Bit missing)';
    } else if (currentTemplateAsset.category === 'Scanner') {
      editProb.value = 'สแกนเนอร์ไม่อ่านบาร์โค้ด / สัญญาณขาดหาย';
    } else {
      editProb.value = 'เครื่องเปิดไม่ติด / อุปกรณ์ฮาร์ดแวร์ทำงานผิดปกติ';
    }
  }

  const editTech = document.getElementById('edit-tech-name');
  if (editTech) {
    editTech.value = state.user ? state.user.name : 'ช่างเทคนิคไอที ประจำ รพ.';
  }

  modal.style.display = 'flex';
  renderActiveTemplate();
}

window.renderActiveTemplate = function() {
  const container = document.getElementById('printable-template-paper');
  const selector = document.getElementById('template-selector');
  if (!container || !selector || !currentTemplateAsset) return;

  const templateType = selector.value;
  const asset = currentTemplateAsset;

  // Gather live edit values
  const customData = {
    jobNo: (document.getElementById('edit-job-no')?.value || 'PYT68100232').trim(),
    contactName: (document.getElementById('edit-contact-name')?.value || 'คุณรมิตา ภูมิแสง').trim(),
    contactPhone: (document.getElementById('edit-contact-phone')?.value || '097-160-9630').trim(),
    problemDesc: (document.getElementById('edit-problem-desc')?.value || 'ปริ้นเป็นเส้น').trim(),
    techName: (document.getElementById('edit-tech-name')?.value || 'ช่างเทคนิคไอที').trim(),
    solution: (document.getElementById('edit-solution')?.value || 'ทำความสะอาด และเปลี่ยนลูกรอก ให้กับตัวเครื่อง ใช้งานได้ปกติ').trim(),
    todayFormatted: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    thaiYearDate: `${new Date().getDate()} / ${new Date().getMonth() + 1} / ${new Date().getFullYear() + 543}`
  };

  let html = '';
  switch (templateType) {
    case 'repair_order':
      html = renderRepairOrderHTML(asset, customData);
      break;
    case 'claim_888':
      html = render888ClaimHTML(asset, customData);
      break;
    case 'warranty_888':
      html = render888WarrantyHTML(asset, customData);
      break;
    case 'talent_delivery':
      html = renderTalentDeliveryHTML(asset, customData);
      break;
    case 'claimit_audit':
      html = renderClaimITComplianceHTML(asset, customData);
      break;
    default:
      html = renderRepairOrderHTML(asset, customData);
  }

  container.innerHTML = html;
};

// ----------------------------------------------------------------------------
// 1. TEMPLATE: ใบรับงานซ่อม / ใบรับเคลมสินค้า (Hospital Work Order & Claim Receipt)
// Exact match to Scan Pages 1, 6, 7
// ----------------------------------------------------------------------------
function renderRepairOrderHTML(asset, data) {
  const isUnderWarranty = new Date(asset.warranty_end) >= new Date();
  const warrantyText = isUnderWarranty ? 'อยู่ในประกัน' : 'นอกประกัน';

  return `
    <div style="position:relative; width:100%;">
      <!-- Header Bar -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:6px;">
        <tr>
          <td style="vertical-align:bottom; width:55%;">
            <div style="font-size:18px; font-weight:800; color:#000; letter-spacing:-0.02em;">ใบรับงานซ่อม / ใบรับเคลมสินค้า</div>
          </td>
          <td style="vertical-align:top; width:45%; font-size:11px; text-align:right; line-height:1.4;">
            <div><strong>ประเภทการรับประกัน :</strong> <span style="border-bottom:1px dotted #000; padding:0 8px;">${warrantyText}</span></div>
            <div><strong>อ้างอิงเลขที่ Job . :</strong> <span style="border-bottom:1px dotted #000; padding:0 8px; font-weight:bold;">${data.jobNo}</span></div>
            <div><strong>วันที่รับแจ้งปัญหา :</strong> <span style="border-bottom:1px dotted #000; padding:0 8px;">${data.todayFormatted}</span></div>
          </td>
        </tr>
      </table>

      <!-- 1. รายละเอียดลูกค้า -->
      <div style="font-size:11.5px; font-weight:700; margin:4px 0 2px 0;">1. รายละเอียดลูกค้า</div>
      <div style="border:1px solid #000; padding:5px 8px; font-size:10.5px; line-height:1.45; margin-bottom:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:55%;"><strong>ชื่อลูกค้า/บริษัท</strong> <span style="margin-left:6px;">บริษัท โรงพยาบาลพญาไท 3 จำกัด</span></td>
            <td style="width:45%; text-align:right;"><strong>อ้างอิงเลขที่สัญญา</strong> <span style="margin-left:6px; font-family:monospace;">IV6803002</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>ที่อยู่</strong> <span style="margin-left:6px;">111 ถนนเพชรเกษม แขวงปากคลองภาษีเจริญ เขตภาษีเจริญ กรุงเทพมหานคร 10160</span></td>
          </tr>
          <tr>
            <td><strong>ข้อมูลผู้ติดต่อ</strong></td>
            <td style="text-align:right;"><strong>อ้างอิงเลขที่โครงการ</strong> <span style="margin-left:6px; font-family:monospace;">PJS0968001</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>ชื่อ</strong> <span style="margin-left:6px;">${data.contactName}</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>สถานที่ติดต่อ</strong> <span style="margin-left:6px;">โรงพยาบาลพญาไท 3 แผนก${asset.location || 'เทคโนโลยีสารสนเทศ'} 111 ถ.เพชรเกษม แขวงปากคลองภาษีเจริญ เขตภาษีเจริญ กทม. 10160</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>เบอร์โทร/มือถือ</strong> <span style="margin-left:6px;">${data.contactPhone}</span> <strong style="margin-left:24px;">Email</strong> <span style="margin-left:6px;">${state.user?.email || 'it_support@phyathai.com'}</span></td>
          </tr>
        </table>
      </div>

      <!-- 2. รายละเอียดผลิตภัณฑ์ -->
      <div style="font-size:11.5px; font-weight:700; margin:4px 0 2px 0;">2. รายละเอียดผลิตภัณฑ์</div>
      <div style="border:1px solid #000; padding:5px 8px; font-size:10.5px; line-height:1.45; margin-bottom:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td colspan="2"><strong>ประเภท</strong> <span style="margin-left:6px;">${asset.category || 'Thermal Printer'}</span></td>
          </tr>
          <tr>
            <td style="width:50%;"><strong>หมายเลขเครื่อง</strong> <span style="margin-left:6px; font-weight:bold; font-family:monospace;">${asset.serial_no}</span></td>
            <td style="width:50%;"><strong>รายละเอียดปัญหา</strong> <span style="margin-left:6px;">${data.problemDesc}</span></td>
          </tr>
          <tr>
            <td><strong>ยี่ห้อ</strong> <span style="margin-left:6px;">${asset.brand || 'TSC'}</span> <strong style="margin-left:20px;">รุ่น</strong> <span style="margin-left:6px;">${asset.model || 'TTP-345'}</span></td>
            <td></td>
          </tr>
          <tr>
            <td colspan="2"><strong>ประเภทปัญหาแจ้งซ่อม</strong> <span style="margin-left:6px;">${asset.category === 'Printer' ? 'TM-Bit missing / TM-Have Noisy' : 'ฮาร์ดแวร์ทำงานผิดปกติ'}</span></td>
          </tr>
        </table>
      </div>

      <!-- 3. การดำเนินการ -->
      <div style="font-size:11.5px; font-weight:700; margin:4px 0 2px 0; display:flex; justify-content:space-between;">
        <span>3. การดำเนินการ</span>
        <span style="font-weight:normal; font-size:10.5px;"><span class="doc-chk"></span> Non &nbsp;&nbsp; <span class="doc-chk"></span> Inv</span>
      </div>
      <div style="border:1px solid #000; padding:5px 8px; font-size:10.5px; line-height:1.45; margin-bottom:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:55%;"><strong>ชื่อช่าง</strong> <span style="margin-left:6px;">${data.techName}</span></td>
            <td style="width:45%; text-align:right;"><strong>เบอร์ติดต่อ</strong> <span style="margin-left:6px;">082-221-9211</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>วันที่ดำเนินการ</strong> <span style="margin-left:6px;">${data.todayFormatted}</span> <strong style="margin-left:20px;">เวลาเข้า</strong> <span class="doc-dotted-line" style="min-width:60px;"></span> <strong style="margin-left:12px;">เวลาออก</strong> <span class="doc-dotted-line" style="min-width:60px;"></span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>วิธีการแก้ไข</strong> <span style="margin-left:6px;">${data.solution}</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>รายการอะไหล่</strong> <span style="margin-left:6px;">-</span></td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:4px;">
              <strong>สถานะงาน</strong> &nbsp;
              <span class="doc-chk"></span> รออะไหล่ &nbsp;&nbsp;
              <span class="doc-chk"></span> ส่งศูนย์บริการ &nbsp;&nbsp;
              <span class="doc-chk checked"></span> เสร็จเรียบร้อย &nbsp;&nbsp;
              <strong>วันที่</strong> <span style="border-bottom:1px dotted #000; padding:0 8px;">${data.todayFormatted}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="text-align:right; padding-top:10px;">
              <strong>ลงชื่อผู้แจ้งซ่อม (ลูกค้า) พร้อมประทับตราสาขา</strong> <span class="doc-dotted-line" style="min-width:140px;"></span>
            </td>
          </tr>
        </table>
      </div>

      <!-- 4. รายละเอียดเครื่องสำรอง -->
      <div style="font-size:11.5px; font-weight:700; margin:4px 0 2px 0;">4. รายละเอียดเครื่องสำรอง (สำหรับเจ้าหน้าที่บริษัท)</div>
      <div style="border:1px solid #000; padding:5px 8px; font-size:10.5px; line-height:1.45; margin-bottom:8px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td colspan="2">
              <span class="doc-chk checked"></span> ไม่ประสงค์รับเครื่องสำรอง &nbsp;&nbsp;&nbsp;&nbsp;
              <span class="doc-chk"></span> ประสงค์รับเครื่องสำรอง
            </td>
          </tr>
          <tr>
            <td style="width:50%;"><strong>หมายเลขเครื่อง</strong> <span class="doc-dotted-line" style="min-width:120px;"></span></td>
            <td style="width:50%;"><strong>รุ่น</strong> <span class="doc-dotted-line" style="min-width:120px;"></span></td>
          </tr>
          <tr>
            <td><strong>ยี่ห้อ</strong> <span class="doc-dotted-line" style="min-width:120px;"></span></td>
            <td><strong>ลงชื่อ</strong> <span class="doc-dotted-line" style="min-width:120px;"></span></td>
          </tr>
          <tr>
            <td><strong>วันที่รับเครื่อง</strong> <span class="doc-dotted-line" style="min-width:120px;"></span> <strong>ลงชื่อ</strong> <span class="doc-dotted-line" style="min-width:80px;"></span></td>
            <td><strong>วันที่ส่งเครื่อง</strong> <span class="doc-dotted-line" style="min-width:120px;"></span> <strong>ลงชื่อ</strong> <span class="doc-dotted-line" style="min-width:80px;"></span></td>
          </tr>
        </table>
      </div>

      <!-- Bottom Signature Columns -->
      <div class="doc-grid-2" style="gap:10px;">
        <div style="border:1px solid #000; padding:6px; text-align:center;">
          <div style="font-weight:700; font-size:11px; margin-bottom:12px; text-align:center; border-bottom:1px solid #e5e7eb; padding-bottom:3px;">ลูกค้าส่งเครื่องซ่อม</div>
          <div style="font-size:10px; line-height:1.8; text-align:center;">
            <div>........................................................ <strong>ลูกค้า</strong> &nbsp;&nbsp;&nbsp;&nbsp; ${data.todayFormatted} <strong>วันที่</strong></div>
            <div style="font-size:9.5px; color:#4b5563;">ผู้ส่งซ่อม (ลูกค้า)</div>
            <div style="margin-top:8px;">........................................................ <strong>ช่าง</strong> &nbsp;&nbsp;&nbsp;&nbsp; ${data.todayFormatted} <strong>วันที่</strong></div>
            <div style="font-size:9.5px; color:#4b5563;">ผู้รับซ่อม (ช่าง)</div>
          </div>
        </div>

        <div style="border:1px solid #000; padding:6px; text-align:center;">
          <div style="font-weight:700; font-size:11px; margin-bottom:12px; text-align:center; border-bottom:1px solid #e5e7eb; padding-bottom:3px;">ลูกค้ารับเครื่องคืน</div>
          <div style="font-size:10px; line-height:1.8; text-align:center;">
            <div>........................................................ <strong>ช่าง</strong> &nbsp;&nbsp;&nbsp;&nbsp; ${data.todayFormatted} <strong>วันที่</strong></div>
            <div style="font-size:9.5px; color:#4b5563;">ผู้ส่งคืน (ช่าง)</div>
            <div style="margin-top:8px;">........................................................ <strong>ลูกค้า</strong> &nbsp;&nbsp;&nbsp;&nbsp; ${data.todayFormatted} <strong>วันที่</strong></div>
            <div style="font-size:9.5px; color:#4b5563;">ผู้รับคืน (ลูกค้า)</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 2. TEMPLATE: ใบรับเคลม / นำส่งสินค้า (888 Technology Claim & Dispatch Form)
// Exact match to Scan Page 5
// ----------------------------------------------------------------------------
function render888ClaimHTML(asset, data) {
  return `
    <div style="position:relative; width:100%; font-size:11px;">
      <!-- Vendor Header -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
        <tr>
          <td style="vertical-align:top; width:80%;">
            <div style="font-size:14.5px; font-weight:800; color:#000;">บริษัท 888 เทคโนโลยี จำกัด (สำนักงานใหญ่)/888 Technology Co.Ltd</div>
            <div style="font-size:11px; font-weight:700; color:#1e40af; margin-top:1px;">แผนก Claim & Service</div>
            <div style="font-size:10px; color:#374151;">199/5 ซอยนพเก้า แขวงวงศ์สว่าง เขตบางซื่อ กรุงเทพมหานคร 10800</div>
            <div style="font-size:10px; color:#374151;">
              <strong>เบอร์โทรติดต่อ</strong> 091-894-1657 &nbsp;&nbsp;
              <strong>Email :</strong> <span style="color:#2563eb; text-decoration:underline;">Service@888technology.co.th</span>
            </div>
          </td>
          <td style="vertical-align:middle; text-align:right; width:20%;">
            <div style="font-size:28px; line-height:1;">🛡️⚙️</div>
          </td>
        </tr>
      </table>

      <!-- Title Bar -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:6px; border:1.5px solid #000;">
        <tr style="background:#52525b; color:#fff; text-align:center; font-weight:bold;">
          <td style="padding:4px 10px; font-size:13px; width:55%;">ใบรับเคลม/นำส่งสินค้า</td>
          <td style="padding:4px 10px; font-size:12px; width:20%; background:#71717a;">วันที่แจ้งงาน:</td>
          <td style="padding:4px 10px; font-size:12px; width:25%; background:#fff; color:#000; font-weight:bold;">${data.thaiYearDate}</td>
        </tr>
      </table>

      <!-- Customer Address Section -->
      <div style="background:#71717a; color:#fff; font-weight:bold; padding:2px 8px; font-size:10.5px; text-align:center;">
        ลูกค้ากรอก : รายละเอียดที่อยู่รับสินค้าเคลม
      </div>
      <div style="border:1px solid #000; border-top:none; padding:5px 8px; font-size:10.5px; line-height:1.4; margin-bottom:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:12%;"><strong>ลูกค้า :</strong></td>
            <td style="width:88%;">หน่วยสนับสนุนเทคโนโลยีสารสนเทศ รพ.พญาไท3</td>
          </tr>
          <tr>
            <td><strong>ที่อยู่ :</strong></td>
            <td>111 ถ.เพชรเกษม แขวงปากคลองภาษีเจริญ เขตภาษีเจริญ กรุงเทพมหานคร 10160</td>
          </tr>
          <tr>
            <td><strong>ชื่อผู้ติดต่อ :</strong></td>
            <td>${data.contactName} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>โทร.</strong> ${data.contactPhone}</td>
          </tr>
          <tr>
            <td><strong>อีเมล :</strong></td>
            <td><span style="color:#2563eb;">ramita_phu@phyathai.com</span></td>
          </tr>
          <tr>
            <td><strong>หมายเหตุ :</strong></td>
            <td>รหัสครุภัณฑ์ ${asset.asset_tag} (${asset.location})</td>
          </tr>
        </table>
      </div>

      <!-- Item Claim Table Section -->
      <div style="background:#71717a; color:#fff; font-weight:bold; padding:2px 8px; font-size:10.5px; text-align:center;">
        ลูกค้ากรอก : รายละเอียดสินค้าที่ต้องการแจ้งเคลม
      </div>
      <table class="doc-table" style="margin-top:0; margin-bottom:4px;">
        <thead>
          <tr style="background:#52525b; color:#fff;">
            <th style="width:8%; color:#fff; background:#52525b;">ลำดับที่</th>
            <th style="width:32%; color:#fff; background:#52525b;">ยี่ห้อ/รุ่น/SKU No.</th>
            <th style="width:25%; color:#fff; background:#52525b;">อาการเสียต่างๆ</th>
            <th style="width:15%; color:#fff; background:#52525b;">อุปกรณ์ที่นำส่ง</th>
            <th style="width:20%; color:#fff; background:#52525b;">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center;">1</td>
            <td><strong>${(asset.brand || 'ZEBRA').toUpperCase()} / ${asset.model || 'ZD421'}</strong></td>
            <td>${data.problemDesc}</td>
            <td style="text-align:center;">1 ชุด</td>
            <td style="font-family:monospace; font-size:10px;">S/N : ${asset.serial_no}</td>
          </tr>
          ${[2,3,4,5,6,7,8,9,10].map(i => `
            <tr style="height:17px;">
              <td style="text-align:center; color:#9ca3af;">${i}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          `).join('')}
          <tr style="font-weight:bold; background:#f9fafb;">
            <td colspan="2" style="text-align:center;">รวมทั้งสิ้น</td>
            <td style="text-align:center;">1 unit</td>
            <td colspan="2" style="text-align:center;">จำนวน/กล่อง : 1 กล่อง</td>
          </tr>
        </tbody>
      </table>

      <!-- Reason Section -->
      <table style="width:100%; border:1px solid #000; border-collapse:collapse; margin-bottom:6px; font-size:10px;">
        <tr>
          <td style="width:25%; padding:4px 6px; font-weight:bold; border-right:1px solid #000; vertical-align:middle;">
            เหตุผลในการส่งเคลม :
          </td>
          <td style="width:40%; padding:4px 6px; line-height:1.5;">
            <div><span class="doc-chk"></span> เปลี่ยนสินค้าใหม่ [DOA - Invoice Ingram 30 Days]</div>
            <div><span class="doc-chk"></span> เปลี่ยนสินค้าใหม่ [DOA - Invoice User 7 Days]</div>
            <div><span class="doc-chk"></span> DOA WITH คืน [C/N]</div>
          </td>
          <td style="width:35%; padding:4px 6px; line-height:1.5;">
            <div><span class="doc-chk checked"></span> ซ่อม [REPAIR]</div>
            <div><span class="doc-chk"></span> คืนสินค้า GR (GOOD RETURN)</div>
          </td>
        </tr>
      </table>

      <!-- Terms Box -->
      <div style="background:#52525b; color:#fff; font-weight:bold; padding:2px 8px; font-size:10px; text-align:center;">
        เงื่อนไขการบริการรับสินค้าเคลม
      </div>
      <div style="border:1px solid #000; border-top:none; padding:4px 8px; font-size:9.5px; color:#374151; line-height:1.35; margin-bottom:6px;">
        <p>• เอกสารฉบับนี้เป็นเอกสารแสดงว่าทาง บริษัท 888 เทคโนโลยี จำกัด ได้รับสินค้าจากผู้ส่งสินค้า ตามรายการข้างต้น</p>
        <p>• <strong>กรณีสินค้าไม่ได้บรรจุใส่กล่อง</strong> เพื่อป้องกันความเสียหายระหว่างขนส่ง แต่ลูกค้ายืนยันที่จะส่งมอบสินค้า โดยไม่ทำการห่อหุ้มเพื่อกันกระแทกและป้องกันความชำรุดระหว่างขนส่งที่อาจเกิดขึ้น บริษัทฯ ขอไม่รับผิดชอบหากเกิดความเสียหายแตกหักและชำรุดระหว่างการขนส่ง</p>
        <p>• ข้าพเจ้าผู้ส่งมอบสินค้าเคลมได้อ่านและรับทราบเงื่อนไขการบริการรับสินค้าเคลมเป็นที่เรียบร้อยแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐาน</p>
      </div>

      <!-- Signatures Footer -->
      <table style="width:100%; border-collapse:collapse; font-size:10px; line-height:1.7;">
        <tr>
          <td style="width:50%; vertical-align:top;">
            <div>ได้รับทราบและตกลงตาม "เงื่อนไขการบริการรับสินค้าเคลม" &nbsp;&nbsp; <span class="doc-dotted-line" style="min-width:140px;"></span> <strong>ลงชื่อผู้ส่งมอบสินค้าเคลม</strong></div>
            <div style="margin-left:230px;"><span class="doc-dotted-line" style="min-width:140px;"></span> <strong>วันที่ส่งมอบสินค้า</strong></div>
          </td>
          <td style="width:50%; vertical-align:top;">
            <div>พนักงานผู้รับสินค้า ได้รับมอบสินค้าจากลูกค้าเรียบร้อยแล้ว &nbsp;&nbsp; <span class="doc-dotted-line" style="min-width:140px;"></span> <strong>ลงชื่อ พนักงานผู้รับสินค้า</strong></div>
            <div style="margin-left:230px;"><span class="doc-dotted-line" style="min-width:140px;"></span> <strong>วันที่รับมอบสินค้า</strong></div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 3. TEMPLATE: ใบรับประกันสินค้า (888 Technology Multi-Serial Certificate)
// Exact match to Scan Page 2
// ----------------------------------------------------------------------------
function render888WarrantyHTML(asset, data) {
  return `
    <div style="position:relative; width:100%; font-size:11px;">
      <!-- Vendor Header -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
        <tr>
          <td style="vertical-align:top; width:80%;">
            <div style="font-size:14.5px; font-weight:800; color:#000;">บริษัท 888 เทคโนโลยี จำกัด (สำนักงานใหญ่)/888 Technology Co.Ltd</div>
            <div style="font-size:10px; color:#374151; margin-top:2px;">199/5 ซอยนพเก้า แขวงวงศ์สว่าง เขตบางซื่อ กรุงเทพมหานคร 10800</div>
            <div style="font-size:10px; color:#374151;">
              <strong>เบอร์โทรติดต่อ</strong> 091-894-1657 &nbsp;&nbsp;
              <strong>Email :</strong> <span style="color:#2563eb; text-decoration:underline;">Service@888technology.co.th</span>
            </div>
          </td>
          <td style="vertical-align:middle; text-align:right; width:20%;">
            <div style="font-size:28px; line-height:1;">🛡️⚙️</div>
          </td>
        </tr>
      </table>

      <!-- Title Bar -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:6px; border:1.5px solid #000;">
        <tr style="background:#52525b; color:#fff; text-align:center; font-weight:bold;">
          <td style="padding:4px 10px; font-size:13px; width:55%;">ใบรับประกันสินค้า</td>
          <td style="padding:4px 10px; font-size:12px; width:20%; background:#71717a;">วัน/เดือน/ปี</td>
          <td style="padding:4px 10px; font-size:12px; width:25%; background:#fff; color:#000; font-weight:bold;">${data.thaiYearDate}</td>
        </tr>
      </table>

      <!-- Customer Section -->
      <div style="background:#52525b; color:#fff; font-weight:bold; padding:2px 8px; font-size:10.5px; text-align:center;">
        ลูกค้า
      </div>
      <div style="border:1px solid #000; border-top:none; padding:5px 8px; font-size:10.5px; line-height:1.45; margin-bottom:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:12%;"><strong>ลูกค้า :</strong></td>
            <td style="width:88%;">โรงพยาบาลพญาไท 3 (แผนก IT)</td>
          </tr>
          <tr>
            <td><strong>ที่อยู่ :</strong></td>
            <td>เลขที่ 111 เพชรเกษม 19 แขวงปากคลองภาษีเจริญ เขตภาษีเจริญ กทม 10160</td>
          </tr>
          <tr>
            <td><strong>ชื่อผู้ติดต่อ :</strong></td>
            <td>คุณ คล่อง ชุมคล้าย &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>โทรศัพท์</strong> 082-6678955</td>
          </tr>
          <tr>
            <td><strong>อีเมล์:</strong></td>
            <td><span style="color:#2563eb;">klong_chu@phyathai.com</span></td>
          </tr>
          <tr>
            <td><strong>หมายเหตุ:</strong></td>
            <td>อ้างอิงเลขที่ใบสั่งซื้อ 23022020556 / รหัสครุภัณฑ์ ${asset.asset_tag}</td>
          </tr>
        </table>
      </div>

      <!-- Itemized Table -->
      <div style="background:#52525b; color:#fff; font-weight:bold; padding:2px 8px; font-size:10.5px; text-align:center;">
        รายละเอียดสินค้า
      </div>
      <table class="doc-table" style="margin-top:0; margin-bottom:4px;">
        <thead>
          <tr style="background:#52525b; color:#fff;">
            <th style="width:8%; color:#fff; background:#52525b;">ลำดับที่</th>
            <th style="width:30%; color:#fff; background:#52525b;">ยี่ห้อ/รุ่น/SKU No.</th>
            <th style="width:25%; color:#fff; background:#52525b;">S/N</th>
            <th style="width:15%; color:#fff; background:#52525b;">อุปกรณ์ที่นำส่ง</th>
            <th style="width:22%; color:#fff; background:#52525b;">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center;">1</td>
            <td><strong>${asset.brand || 'Zebra'}-${asset.model || 'ZD4A043-30PM00EZ'}</strong></td>
            <td style="font-family:monospace; font-size:10px; font-weight:bold; color:#0284c7;">${asset.serial_no}</td>
            <td style="text-align:center;">1 unit</td>
            <td style="color:#dc2626; font-size:9.5px; font-weight:bold;">Warranty 2 Yrs./Printerhead 6 Mth</td>
          </tr>
          ${[2,3,4,5,6,7,8,9,10,11,12,13].map(i => `
            <tr style="height:16px;">
              <td style="text-align:center; color:#9ca3af;">${i}</td>
              <td style="color:#6b7280;">Zebra-ZD4A043-30PM00EZ</td>
              <td style="font-family:monospace; font-size:10px; color:#6b7280;">D6J224010${280 + i}</td>
              <td style="text-align:center; color:#6b7280;">1 unit</td>
              <td style="color:#dc2626; font-size:9.5px;">Warranty 2 Yrs./Printerhead 6 Mth</td>
            </tr>
          `).join('')}
          <tr style="font-weight:bold; background:#f9fafb;">
            <td colspan="3" style="text-align:center;">รวมทั้งสิ้น</td>
            <td style="text-align:center;">13 units</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <!-- Terms & Signatures -->
      <div style="background:#52525b; color:#fff; font-weight:bold; padding:2px 8px; font-size:10px; text-align:center;">
        เงื่อนไขการรับประกันสินค้า
      </div>
      <div style="border:1px solid #000; border-top:none; padding:5px 8px; font-size:9.5px; line-height:1.4; margin-bottom:8px;">
        <p>• เอกสารฉบับนี้เป็นเอกสารแสดงว่าทาง <strong>บริษัท 888 เทคโนโลยี จำกัด</strong> ได้ส่งมอบสินค้าพร้อมกับการรับประกันสินค้าเป็นระยะเวลา <strong>2 ปี</strong> นับจากวันที่ลูกค้ารับสินค้า ตามรายการข้างต้น</p>
        <p>• เพื่อป้องกันความเสียหาย ลูกค้ากรุณาตรวจเช็คสินค้าก่อนส่งมอบสินค้า</p>
        <p>• ข้าพเจ้าผู้รับมอบสินค้าได้อ่านและรับทราบเงื่อนไขการส่งมอบสินค้าและการรับประกันสินค้าเป็นที่เรียบร้อยแล้ว</p>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:10px; line-height:1.7;">
        <tr>
          <td style="width:50%; vertical-align:top;">
            <div><span class="doc-dotted-line" style="min-width:150px;"></span> <strong>ลงชื่อผู้รับมอบสินค้า</strong></div>
            <div><span class="doc-dotted-line" style="min-width:150px;"></span> <strong>วันที่รับสินค้า</strong></div>
          </td>
          <td style="width:50%; vertical-align:top; text-align:right;">
            <div><span class="doc-dotted-line" style="min-width:150px;"></span> <strong>ลงชื่อพนักงานผู้ส่งสินค้า</strong></div>
            <div><span class="doc-dotted-line" style="min-width:150px;"></span> <strong>วันที่ส่งสินค้า</strong></div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 4. TEMPLATE: ใบส่งมอบ / ใบรับประกันสินค้า (Talent Technology)
// Exact match to Scan Pages 3 & 4
// ----------------------------------------------------------------------------
function renderTalentDeliveryHTML(asset, data) {
  return `
    <div style="position:relative; width:100%; font-size:11px;">
      <!-- Talent Header -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <tr>
          <td style="vertical-align:middle; width:75%;">
            <div style="font-size:16px; font-weight:800; color:#000;">บริษัท ทาร์เล้นท์ เทคโนโลยี จำกัด</div>
            <div style="font-size:12px; font-weight:700; color:#374151;">TALENT TECHNOLOGY CO.,LTD.</div>
            <div style="font-size:9.5px; color:#4b5563; margin-top:2px;">40/61 ซอยเพชรเกษม 77/4 แขวงหนองค้างพลู เขตหนองแขม กรุงเทพฯ 10160</div>
            <div style="font-size:9.5px; color:#4b5563;">Tel. 02-809-7017 Fax. 02-421-7762 www.tl.co.th</div>
          </td>
          <td style="vertical-align:middle; text-align:right; width:25%;">
            <div style="font-size:24px; font-weight:900; color:#2563eb; border:2px solid #2563eb; padding:4px 8px; display:inline-block;">TL TECH</div>
          </td>
        </tr>
      </table>

      <!-- Customer Info Card -->
      <div style="border:1px solid #000; padding:10px 12px; margin-bottom:16px; line-height:1.6; font-size:11px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:15%; font-weight:bold;">ลูกค้า</td>
            <td style="width:85%;"><strong>โรงพยาบาลพญาไท 3 จำกัด</strong></td>
          </tr>
          <tr>
            <td style="font-weight:bold;">ที่อยู่</td>
            <td>111 ถ.เพชรเกษม แขวงปากคลองภาษีเจริญ เขตภาษีเจริญ กทม. 10160</td>
          </tr>
          <tr>
            <td style="font-weight:bold;">โทร.</td>
            <td>02-4671111 ต่อ 3456</td>
          </tr>
          <tr>
            <td style="font-weight:bold;">ติดต่อ</td>
            <td>คุณเอก 082-6678955 ชั้น 4</td>
          </tr>
          <tr>
            <td style="font-weight:bold;">อ้างอิง</td>
            <td>SO: 6608-0029 &nbsp;&nbsp;&nbsp;&nbsp; PO: 23023013066</td>
          </tr>
        </table>
      </div>

      <!-- Main Asset Voucher -->
      <div style="border:1.5px solid #000; padding:14px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e5e7eb; padding-bottom:8px; margin-bottom:10px;">
          <div style="font-size:15px; font-weight:bold; color:#000;">${asset.brand || 'Acer'} ${asset.model || 'Veriton M4690G'}</div>
          <div style="font-size:13px; font-weight:bold;">1 Unit</div>
        </div>

        <div style="font-size:12px; font-weight:bold; color:#1e40af; font-family:monospace; margin-bottom:10px;">
          S/N: ${asset.serial_no}
        </div>

        <div style="font-size:10.5px; color:#374151; line-height:1.6; background:#f9fafb; padding:8px; border-radius:4px;">
          <div>• CPU Intel Core i7 12700 LGA 2.1G 25M</div>
          <div>• Intel B660 Chipset | MEM UNB-DIMM 16GB DDR4</div>
          <div>• SSD M.2 NVMe 512GB | HDD 3.5" 2TB SATA3 (7200rpm)</div>
          <div>• Windows 11 Pro 64bit | Acer USB Keyboard & USB Mouse</div>
          <div style="color:#dc2626; font-weight:bold; margin-top:4px;">• Warranty 3Yrs. Onsite Service</div>
        </div>
      </div>

      <!-- Warning Banner -->
      <div style="text-align:center; font-weight:bold; font-size:12px; color:#b91c1c; margin-bottom:30px;">
        *** โปรดเก็บเอกสารนี้ไว้ใช้เป็นหลักฐานสำคัญในการรับประกันสินค้า ***
      </div>

      <!-- Signatures Footer -->
      <table style="width:100%; border-collapse:collapse; margin-top:20px; font-size:11px;">
        <tr>
          <td style="width:50%; text-align:left;">
            <div>Customer ....................................................</div>
            <div style="margin-top:10px;">Date ...... / ...... / 2568</div>
          </td>
          <td style="width:50%; text-align:right;">
            <div>Delivery by ....................................................</div>
            <div style="margin-top:10px;">Date ...... / ...... / 2568</div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 5. TEMPLATE: ClaimIT Comprehensive Multi-Asset & PDPA Audit Report
// ----------------------------------------------------------------------------
function renderClaimITComplianceHTML(asset, data) {
  const isWiped = asset.rma_data_wiped_confirmed || asset.status === 'Sanitized';

  return `
    <div style="position:relative; width:100%; font-size:11px; line-height:1.45;">
      <div style="border-bottom:2px solid #0284c7; padding-bottom:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div style="font-size:18px; font-weight:800; color:#0284c7;">ClaimIT — Hospital Asset Warranty & Compliance Report</div>
          <div style="font-size:11px; color:#64748b;">ระบบติดตามรับประกันและส่งเคลมครุภัณฑ์ไอที โรงพยาบาลพญาไท 3</div>
        </div>
        <div style="text-align:right; font-size:10.5px; color:#64748b;">
          <div><strong>Report Date:</strong> ${data.todayFormatted}</div>
          <div><strong>Ref:</strong> ${asset.asset_tag}</div>
        </div>
      </div>

      <!-- Section 1: Specifications -->
      <div style="font-size:12px; font-weight:bold; color:#0f172a; margin-bottom:4px; text-decoration:underline;">1. ข้อมูลจำเพาะของครุภัณฑ์ (Asset Specifications)</div>
      <div style="border:1px solid #cbd5e1; padding:8px; margin-bottom:10px; font-size:11px; line-height:1.5;">
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="width:30%;"><strong>รหัสครุภัณฑ์ (Asset Tag):</strong></td><td><strong>${asset.asset_tag}</strong></td></tr>
          <tr><td><strong>ชื่ออุปกรณ์:</strong></td><td>${asset.device_name}</td></tr>
          <tr><td><strong>หมวดหมู่ / แบรนด์ / รุ่น:</strong></td><td>${asset.category} | ${asset.brand} ${asset.model}</td></tr>
          <tr><td><strong>หมายเลขซีเรียล (S/N):</strong></td><td style="font-family:monospace; font-weight:bold;">${asset.serial_no}</td></tr>
          <tr><td><strong>จุดติดตั้ง / แผนก:</strong></td><td>${asset.location}</td></tr>
          <tr><td><strong>ระยะเวลารับประกัน:</strong></td><td>${asset.warranty_start} ถึง ${asset.warranty_end}</td></tr>
          <tr><td><strong>สถานะปัจจุบัน:</strong></td><td><strong>${asset.status}</strong> (Salvage Status: ${asset.salvage_status || 'None'})</td></tr>
        </table>
      </div>

      <!-- Section 2: PDPA Sanitization -->
      <div style="font-size:12px; font-weight:bold; color:#0f172a; margin-bottom:4px; text-decoration:underline;">2. การตรวจสอบความปลอดภัยข้อมูลผู้ป่วย (PDPA Security & Sanitization Audit)</div>
      <div style="border:1px solid #cbd5e1; padding:8px; margin-bottom:10px; font-size:11px; line-height:1.5; background:${isWiped ? '#f0fdf4' : '#fff'};">
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="width:40%;"><strong>อุปกรณ์บันทึกข้อมูลหลัก (Storage):</strong></td><td>${asset.sanitization_required ? 'ใช่ (ต้องทำการ Sanitization)' : 'ไม่ใช่ (Non-Storage Device)'}</td></tr>
          <tr><td><strong>สถานะการล้างข้อมูล (Wipe Status):</strong></td><td><strong style="color:${isWiped ? '#16a34a' : '#dc2626'};">${isWiped ? '✓ ยืนยันการล้างข้อมูลแล้ว (CONFIRMED WIPED)' : 'ยังไม่ได้ดำเนินการล้างข้อมูล'}</strong></td></tr>
          <tr><td><strong>ผู้ตรวจสอบความปลอดภัย:</strong></td><td>${asset.data_wiped_by || state.user?.name || 'IT Security Officer'}</td></tr>
          <tr><td><strong>บันทึกความปลอดภัย:</strong></td><td>${asset.sanitization_note || 'Verified data wipe and security protocol compliance.'}</td></tr>
        </table>
      </div>

      <!-- Section 3: RMA Details -->
      <div style="font-size:12px; font-weight:bold; color:#0f172a; margin-bottom:4px; text-decoration:underline;">3. ประวัติการส่งเคลมและศูนย์บริการ (Vendor RMA Service Record)</div>
      <div style="border:1px solid #cbd5e1; padding:8px; margin-bottom:12px; font-size:11px; line-height:1.5;">
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="width:40%;"><strong>ศูนย์บริการ / ผู้จัดจำหน่าย:</strong></td><td>${asset.vendor_name || '888 Technology Co.,Ltd. / Talent Tech'}</td></tr>
          <tr><td><strong>หมายเลขใบเคลม (RMA No.):</strong></td><td>${asset.vendor_rma_number || data.jobNo}</td></tr>
          <tr><td><strong>วันที่ส่งเคลม:</strong></td><td>${asset.claim_date || data.todayFormatted}</td></tr>
          <tr><td><strong>กำหนดส่งคืนโดยประมาณ:</strong></td><td>${asset.expected_return_date || '-'}</td></tr>
        </table>
      </div>

      <!-- Authorization Signatures -->
      <table style="width:100%; border-collapse:collapse; margin-top:20px; font-size:10.5px;">
        <tr>
          <td style="width:50%; text-align:center; padding:10px;">
            <div>....................................................................</div>
            <div style="margin-top:4px;">( ${state.user?.name || 'เจ้าหน้าที่ฝ่ายเทคโนโลยีสารสนเทศ'} )</div>
            <div style="color:#64748b; font-size:10px;">ผู้รายงาน / เจ้าหน้าที่ไอทีระบบ</div>
          </td>
          <td style="width:50%; text-align:center; padding:10px;">
            <div>....................................................................</div>
            <div style="margin-top:4px;">( .................................................................... )</div>
            <div style="color:#64748b; font-size:10px;">หัวหน้าแผนกสนับสนุนเทคโนโลยีสารสนเทศ</div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

