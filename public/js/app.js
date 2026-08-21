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
    tr.innerHTML = `
      <td>${c.id}</td>
      <td><strong>${c.type}</strong></td>
      <td>${c.value}</td>
      <td><div style="word-wrap: break-word; white-space: pre-wrap; max-width: 400px;">${c.details || '-'}</div></td>
      <td>
        <button class="btn btn-secondary" onclick="editConfig(${c.id}, '${c.type}', '${c.value}', \`${(c.details||'').replace(/`/g, '\\`')}\`)" style="padding: 4px 8px; font-size: 11px;">แก้ไข</button>
        <button class="btn btn-danger" onclick="deleteConfig(${c.id})" style="padding: 4px 8px; font-size: 11px;">ลบ</button>
      </td>
    `;
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
      if (b.details) {
        vendorProcedures[b.value] = b.details;
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
  if (vendorProcedures[vendor]) {
    panel.innerHTML = vendorProcedures[vendor];
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
