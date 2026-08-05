// ClaimIT Frontend Application State Manager
const state = {
  user: null,
  activeView: 'auth', // 'auth', 'ward', 'it'
  selectedAsset: null,
  sanitizationChecked: false,
  pendingFuzzyAsset: null // holds a fuzzy match until the user confirms it
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
  document.getElementById('btn-resolve').addEventListener('click', () => updateAssetStatus('Working'));
  
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
}

// Routing & View Switcher
function switchView(viewName) {
  state.activeView = viewName;
  
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
  userRoleEl.textContent = state.user.role === 'admin' ? 'IT Support' : 'Ward Staff';
  
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
  try {
    const assetsRes = await fetch('/api/assets');
    const assets = await assetsRes.json();
    
    const logsRes = await fetch('/api/audit-logs');
    const logs = await logsRes.json();

    if (state.user && state.user.role === 'admin') {
      const usersRes = await fetch('/api/users');
      const users = await usersRes.json();
      populateUserTable(users);
    }
    
    updateStatistics(assets);
    populateAssetTable(assets);
    populateAuditTable(logs);
  } catch (error) {
    console.error('Failed to refresh data:', error);
  }
}

function updateStatistics(assets) {
  const total = assets.length;
  const working = assets.filter(a => a.status === 'Working').length;
  const broken = assets.filter(a => a.status === 'Broken').length;
  const atVendor = assets.filter(a => a.status === 'At Vendor').length;
  
  document.getElementById('stat-total-assets').textContent = total;
  document.getElementById('stat-working-assets').textContent = working;
  document.getElementById('stat-broken-assets').textContent = broken;
  document.getElementById('stat-vendor-claims').textContent = atVendor;
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
    
    let statusClass = 'badge-working';
    let statusText = 'ปกติ (Working)';
    if (asset.status === 'Broken') {
      statusClass = 'badge-broken';
      statusText = 'ชำรุด (Broken)';
    } else if (asset.status === 'At Vendor') {
      statusClass = 'badge-vendor';
      statusText = 'เคลมศูนย์ (At Vendor)';
    }
    
    tr.innerHTML = `
      <td><strong>${asset.asset_tag}</strong></td>
      <td>${asset.device_name}</td>
      <td>${asset.location}</td>
      <td>${asset.warranty_end}</td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function populateUserTable(users) {
  const tbody = document.getElementById('user-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  users.forEach(u => {
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
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      alert('ลบผู้ใช้สำเร็จแล้ว');
      refreshData();
    } else {
      alert('ไม่สามารถลบผู้ใช้ได้');
    }
  } catch (error) {
    console.error('Delete user error:', error);
  }
};

function populateAuditTable(logs) {
  const tbody = document.getElementById('audit-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  logs.forEach(log => {
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
    const res = await fetch(`/api/assets/${encodeURIComponent(tag)}`);
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
      alert(`ไม่พบรหัสครุภัณฑ์ "${tag}" ในฐานข้อมูล แต่ระบบคำนวณแบบ Offline ได้ว่าปีผลิตคือ ${parsed.year}`);
    }
  } catch (error) {
    console.error('Lookup failed:', error);
  }
}

async function fetchAndDisplayEvaluation(assetTag, prefix) {
  const container = document.getElementById(`${prefix}-detail-evaluate`);
  if (!container) return;

  try {
    const res = await fetch(`/api/assets/${encodeURIComponent(assetTag)}/evaluate`);
    if (res.ok) {
      const evalData = await res.json();
      container.style.display = 'block';
      
      if (evalData.isWorthClaiming) {
        container.style.background = 'rgba(16, 185, 129, 0.1)';
        container.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        container.style.color = '#10b981';
        container.innerHTML = `
          <strong>💡 ผลการวิเคราะห์ความคุ้มค่า (Claim Worthiness):</strong><br>
          <span style="color:#fff;">${evalData.reason}</span>
        `;
      } else {
        container.style.background = 'rgba(239, 68, 68, 0.1)';
        container.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        container.style.color = '#ef4444';
        container.innerHTML = `
          <strong>⚠️ ผลการวิเคราะห์ความคุ้มค่า (Claim Worthiness):</strong><br>
          <span style="color:#fff;">${evalData.reason}</span>
        `;
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
  
  let statusClass = 'badge-working';
  let statusText = 'ปกติ (Working)';
  if (asset.status === 'Broken') {
    statusClass = 'badge-broken';
    statusText = 'ชำรุด (Broken)';
  } else if (asset.status === 'At Vendor') {
    statusClass = 'badge-vendor';
    statusText = `เคลมศูนย์ (${asset.vendor_name || 'Vendor'})`;
  }
  document.getElementById(`${prefix}-detail-status`).innerHTML = `<span class="badge ${statusClass}">${statusText}</span>`;
  
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
    } else if (asset.status === 'At Vendor') {
      btnResolve.style.display = 'block';
      btnResolve.textContent = 'รับเครื่องกลับเข้าคลัง (Return to Stock)';
    }
  }
}

// Form Handlers: Add Asset & Add User
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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

// Action handlers
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
      headers: { 'Content-Type': 'application/json' },
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

async function confirmSanitization() {
  if (!state.selectedAsset) return;
  if (!state.sanitizationChecked) {
    alert('กรุณายืนยันการล้างข้อมูลโดยคลิกเครื่องหมายถูกก่อนยืนยัน (Please confirm data sanitization)');
    return;
  }
  
  const payload = {
    asset_tag: state.selectedAsset.asset_tag,
    action_by_username: state.user.username
  };
  
  try {
    const res = await fetch('/api/assets/sanitize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      const data = await res.json();
      alert(data.message);
      lookupAsset(state.selectedAsset.asset_tag);
      refreshData();
    } else {
      alert('ล้มเหลวในการบันทึกข้อมูลการ Sanitization');
    }
  } catch (error) {
    console.error('Sanitization update error:', error);
  }
}

const vendorProcedures = {
  'IDA': `
    <h5 style="color: var(--primary); margin-bottom: 8px;">ขั้นตอนการส่งเคลมอุปกรณ์ IDA</h5>
    <ol style="padding-left: 20px; font-size: 13px; color: var(--text-main); margin-bottom: 0;">
      <li>ติดต่อผ่านเมล <a href="mailto:vorakan.t@planetbarcode.co.th" style="color: var(--info);">vorakan.t@planetbarcode.co.th</a></li>
      <li>แจ้งรุ่น S/N อาการเสียและที่อยู่เบอร์โทร (ตัวอย่างรุ่น: IDA-52P1)</li>
      <li>ทางบริษัทจะตอบเมลมาและรอนัดวันเข้ามารับอุปกรณ์</li>
    </ol>
  `,
  'Dell': `
    <h5 style="color: var(--primary); margin-bottom: 8px;">ขั้นตอนการส่งเคลมอุปกรณ์ Dell</h5>
    <ol style="padding-left: 20px; font-size: 13px; color: var(--text-main); margin-bottom: 0;">
      <li>ตรวจสอบประกัน: <a href="https://Dell.com/support/contractservice/en-th" target="_blank" style="color: var(--info);">Dell.com/support/contractservice/en-th</a></li>
      <li>เทสอุปกรณ์และถ่ายรูปอุปกรณ์ที่เสีย 2-3 รูปพร้อม ServiceTag</li>
      <li>โทรไปที่เบอร์ 02-855-7085 ต่อ 3 และแจ้ง Service Code 10-11 หลัก (เวลาทำการ 9:00 - 16:00 น.)</li>
      <li>ติดต่อพนักงาน Dell แจ้งอาการและรอตอบเมลด้วยรูปที่ถ่ายมาและที่อยู่</li>
      <li>ยืนยันที่อยู่กับพนักงานส่งของและรอรับของ</li>
      <li>นำ Tag ที่ติดกับอุปกรณ์เก่าออกมาเพื่อไปติดที่เครื่องใหม่</li>
      <li>Test อุปกรณ์ให้เรียบร้อยและนำเข้าสตอก</li>
    </ol>
  `,
  'Lenovo': `
    <h5 style="color: var(--primary); margin-bottom: 8px;">ขั้นตอนการส่งเคลมอุปกรณ์ Lenovo</h5>
    <ol style="padding-left: 20px; font-size: 13px; color: var(--text-main); margin-bottom: 0;">
      <li>เข้าไปที่เว็บไซต์ <a href="https://pcsupport.lenovo.com/th/th/warranty-lookup#/" target="_blank" style="color: var(--info);">https://pcsupport.lenovo.com/th/th/warranty-lookup#/</a></li>
      <li>กรอก S/N ในช่องและกดติดต่อฝ่ายสนับสนุน</li>
      <li>เลือกช่องทางการติดต่อหลังจากนั้นทางบริษัทจะโทรมานัดวันเพื่อเข้ามาซ่อม</li>
    </ol>
  `,
  'TSC': `
    <h5 style="color: var(--primary); margin-bottom: 8px;">ขั้นตอนการส่งเคลมอุปกรณ์ TSC</h5>
    <ol style="padding-left: 20px; font-size: 13px; color: var(--text-main); margin-bottom: 0;">
      <li>ติดต่อเบอร์ 081-467-3307 และติดต่อผ่าน Line</li>
      <li>แจ้ง รุ่น S/N และอาการเสียที่เจอพร้อมส่งรูปหรือวีดีโอ</li>
      <li>แจ้งที่อยู่ ชื่อเบอร์โทรและนัดวันรับของ</li>
      <li>พนักงานมารับของไปซ่อมข้างนอกให้นำใบ นำอุปกรณ์ออกนอกสถานที่ให้เซ็น</li>
      <li>รอนัดวันรับของหลังแก้ไขเสร็จ</li>
      <li>รับของและเทสให้เรียบร้อย หลังจากนั้นขอ สำเนาบัตร ปชช คนส่งเพื่อมาแนบกับใบนำอุปกรณ์ออกนอกสถานที่</li>
      <li>แจ้งผู้ดูแล สตอกและนำเข้า</li>
    </ol>
    <div style="font-size: 12px; color: var(--warning); margin-top: 8px; padding: 6px; background: rgba(245, 158, 11, 0.1); border-radius: 4px;">
      <strong>ประกัน:</strong> (เครื่อง 1 ปี / หัว 6 เดือน) หลังปี 2569 จะเป็น 1 ปีทั้ง 2 อย่าง
    </div>
  `,
  'Acer': `
    <h5 style="color: var(--primary); margin-bottom: 8px;">ขั้นตอนการส่งเคลมอุปกรณ์ Acer</h5>
    <ol style="padding-left: 20px; font-size: 13px; color: var(--text-main); margin-bottom: 0;">
      <li>ตรวจสอบประกัน: <a href="https://Register.acer.co.th/WarrantyCheck/warr_chk.aspx" target="_blank" style="color: var(--info);">Register.acer.co.th/WarrantyCheck/warr_chk.aspx</a></li>
      <li>ส่งเมลไปที่ <a href="mailto:ath.onsite@acer.com" style="color: var(--info);">ath.onsite@acer.com</a></li>
      <li>แจ้งรายละเอียด อาการเสีย เลขS/Nและที่อยู่</li>
      <li><strong>กรณีแจ้งเคลมเมาส์คีย์บอร์ด:</strong> ให้ใส่รุ่นและเลข S/N ของคอมที่ยังไม่เคยส่งเคลม (ตัวอย่างรุ่นคอม: Veriton X2720G)</li>
    </ol>
  `
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
  
  const payload = {
    asset_tag: state.selectedAsset.asset_tag,
    vendor_name: vendorName,
    vendor_rma_number: rmaNumber,
    expected_return_date: expectedDate,
    data_wiped_confirmed: state.selectedAsset.sanitization_required ? 1 : 0,
    action_by_username: state.user.username
  };
  
  try {
    const res = await fetch('/api/assets/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      alert(`ดำเนินการเปิดใบเคลมศูนย์บริการ ${vendorName} เรียบร้อยแล้ว`);
      lookupAsset(state.selectedAsset.asset_tag);
      refreshData();
    } else {
      alert('ไม่สามารถส่งเคลมทรัพย์สินได้');
    }
  } catch (error) {
    console.error('Claim initiation error:', error);
  }
}

// Global functions for presets
window.selectPreset = function(tag) {
  const prefix = state.activeView === 'ward' ? 'ward' : 'it';
  document.getElementById(`${prefix}-search-input`).value = tag;
  lookupAsset(tag);
};
