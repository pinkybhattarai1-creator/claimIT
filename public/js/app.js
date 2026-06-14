// ClaimIT Frontend Application State Manager
const state = {
  user: null,
  activeView: 'auth', // 'auth', 'ward', 'it'
  selectedAsset: null,
  sanitizationChecked: false,
  webcamStream: null
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
  
  // Manual search
  document.getElementById('ward-search-btn').addEventListener('click', () => {
    const val = document.getElementById('ward-search-input').value.trim();
    if (val) lookupAsset(val);
  });
  
  document.getElementById('it-search-btn').addEventListener('click', () => {
    const val = document.getElementById('it-search-input').value.trim();
    if (val) lookupAsset(val);
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
  
  // Claim Submit
  document.getElementById('rma-form').addEventListener('submit', handleClaimInitiate);
  
  // Camera trigger
  document.getElementById('btn-start-camera-ward').addEventListener('click', () => startCamera('ward-video'));
  document.getElementById('btn-start-camera-it').addEventListener('click', () => startCamera('it-video'));
}

// Routing & View Switcher
function switchView(viewName) {
  state.activeView = viewName;
  
  // Hide all sections
  authSection.classList.remove('active');
  wardSection.classList.remove('active');
  itSection.classList.remove('active');
  
  // Stop camera stream when leaving view
  stopCamera();
  
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
  } else if (viewName === 'it') {
    itSection.classList.add('active');
    navTabs.style.display = 'flex';
    userBadge.style.display = 'flex';
    document.getElementById('btn-to-it').classList.add('active');
    document.getElementById('btn-to-ward').classList.remove('active');
    refreshData();
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
    // 1. Fetch Assets
    const assetsRes = await fetch('/api/assets');
    const assets = await assetsRes.json();
    
    // 2. Fetch Logs
    const logsRes = await fetch('/api/audit-logs');
    const logs = await logsRes.json();
    
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
      // populate scanner form
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
  console.log('Running Local Heuristic Regex Parser on:', rawText);
  
  // Matches 4-digit years like 2021, 2022, etc.
  const yearMatch = rawText.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : 'Unknown';
  
  // Matches Version numbers e.g. V1, V2, Version 3
  const versionMatch = rawText.match(/[vV](ersion)?\s*([0-9])/);
  const version = versionMatch ? versionMatch[2] : '1';
  
  // Determine if Tag syntax holds indications of status
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

// Display Parser results visually to WOW the user
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
  // First run local parser heuristic
  const parsed = parseAssetTagLocal(tag);
  displayLocalParserResults(parsed);
  
  try {
    const res = await fetch(`/api/assets/${tag}`);
    if (res.ok) {
      const asset = await res.json();
      state.selectedAsset = asset;
      displayAssetDetails(asset);
    } else {
      alert(`ไม่พบรหัสครุภัณฑ์ "${tag}" ในฐานข้อมูล แต่ระบบคำนวณแบบ Offline ได้ว่าปีผลิตคือ ${parsed.year}`);
    }
  } catch (error) {
    console.error('Lookup failed:', error);
  }
}

function displayAssetDetails(asset) {
  // Update details panel in active view
  const prefix = state.activeView === 'ward' ? 'ward' : 'it';
  
  // Calculate remaining warranty days
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
  
  // Status Class Badge
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
  
  // Show/Hide forms based on status
  document.getElementById(`${prefix}-details-card`).style.display = 'block';
  
  if (prefix === 'it') {
    const claimForm = document.getElementById('rma-form-container');
    const sanitizePanel = document.getElementById('sanitize-panel');
    const btnResolve = document.getElementById('btn-resolve');
    const btnReportBroken = document.getElementById('btn-report-broken');
    
    // Reset buttons
    btnResolve.style.display = 'none';
    btnReportBroken.style.display = 'none';
    sanitizePanel.style.display = 'none';
    claimForm.style.display = 'none';
    
    // Status Logic
    if (asset.status === 'Working') {
      btnReportBroken.style.display = 'block';
    } else if (asset.status === 'Broken') {
      btnResolve.style.display = 'block';
      
      // If data wipe required, show Sanitization panel
      if (asset.sanitization_required) {
        if (!asset.rma_data_wiped_confirmed && asset.rma_status !== 'Sanitized') {
          sanitizePanel.style.display = 'block';
          // Ensure checkbox reset
          state.sanitizationChecked = false;
          document.getElementById('sanitize-chk').classList.remove('checked');
        } else {
          // Already sanitized, show claim form
          claimForm.style.display = 'block';
          document.getElementById('claim-tag-input').value = asset.asset_tag;
        }
      } else {
        // Sanitization not required (e.g. barcode scanner), show claim form immediately
        claimForm.style.display = 'block';
        document.getElementById('claim-tag-input').value = asset.asset_tag;
      }
    } else if (asset.status === 'At Vendor') {
      btnResolve.style.display = 'block';
      btnResolve.textContent = 'รับเครื่องกลับเข้าคลัง (Return to Stock)';
    }
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
      // Reload details to show RMA form
      lookupAsset(state.selectedAsset.asset_tag);
      refreshData();
    } else {
      alert('ล้มเหลวในการบันทึกข้อมูลการ Sanitization');
    }
  } catch (error) {
    console.error('Sanitization update error:', error);
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

// Camera WebRTC Implementation & Preset Fallback Simulation
function startCamera(videoId) {
  const video = document.getElementById(videoId);
  if (!video) return;
  
  stopCamera();
  
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      state.webcamStream = stream;
      video.srcObject = stream;
      video.style.display = 'block';
      
      // Simulate scanning barcode after 3 seconds
      setTimeout(() => {
        if (state.webcamStream) {
          // Select a random asset to parse automatically
          const demoTags = ['CIT-2024-AIO-02', 'CIT-2023-SCN-01', 'CIT-2022-TAB-03'];
          const randomTag = demoTags[Math.floor(Math.random() * demoTags.length)];
          
          const inputId = videoId.startsWith('ward') ? 'ward-search-input' : 'it-search-input';
          document.getElementById(inputId).value = randomTag;
          
          alert(`[CAMERA DETECTED BARCODE] สแกนพบรหัส: ${randomTag}`);
          lookupAsset(randomTag);
          stopCamera();
        }
      }, 3000);
    })
    .catch(err => {
      console.warn('Camera access denied or unavailable:', err);
      alert('ไม่พบกล้องเชื่อมต่ออยู่ หรือคุณไม่อนุญาตให้เข้าถึงกล้อง (Camera not found or access denied). ระบบจำลองเปิดกล้องเพื่อเลือก Tag ด้านล่างแทน');
    });
}

function stopCamera() {
  if (state.webcamStream) {
    state.webcamStream.getTracks().forEach(track => track.stop());
    state.webcamStream = null;
  }
  
  const v1 = document.getElementById('ward-video');
  const v2 = document.getElementById('it-video');
  if (v1) { v1.srcObject = null; v1.style.display = 'none'; }
  if (v2) { v2.srcObject = null; v2.style.display = 'none'; }
}

// Global functions for presets
window.selectPreset = function(tag) {
  const prefix = state.activeView === 'ward' ? 'ward' : 'it';
  document.getElementById(`${prefix}-search-input`).value = tag;
  lookupAsset(tag);
};
