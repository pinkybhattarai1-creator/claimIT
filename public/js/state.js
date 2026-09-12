/**
 * ClaimIT Frontend - Global State & Core Utilities
 * Contains application state, auth headers, toast notifications, and global helpers.
 */

// Application State Manager
const state = {
  user: null,
  activeView: 'auth', // 'auth', 'ward', 'it'
  selectedAsset: null,
  sanitizationChecked: false,
  pendingFuzzyAsset: null, // holds a fuzzy match until user confirms
  pagination: {
    page: 1,
    limit: 15,
    total: 0
  },
  claimsPagination: {
    page: 1,
    limit: 15,
    total: 0
  },
  filters: {
    status: '',
    category: ''
  },
  recentScans: [],
  auditFilter: {
    timeSpan: 'all',
    startDate: '',
    endDate: '',
    search: '',
    page: 1,
    limit: 15,
    total: 0
  }
};

// Global XSS Sanitizer for DOM injection
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

const PAGE_TITLES = {
  auth: 'ClaimIT — เข้าสู่ระบบ',
  ward: 'ClaimIT — ระบบแจ้งซ่อมประจำแผนก (Staff)',
  it:   'ClaimIT — ศูนย์ซ่อมและเคลมประกัน',
  config: 'ClaimIT — ตั้งค่าระบบและจัดการผู้ใช้งาน'
};

// Core DOM Elements
const authSection = document.getElementById('auth-section');
const wardSection = document.getElementById('ward-section');
const itSection = document.getElementById('it-section');
const configSection = document.getElementById('config-section');

const navTabs = document.getElementById('nav-tabs');
const userBadge = document.getElementById('user-badge');
const userNameEl = document.getElementById('user-name');
const userRoleEl = document.getElementById('user-role');
const logoutBtn = document.getElementById('logout-btn');

// Authentication Header Helper
function getAuthHeaders() {
  const token = state.user ? state.user.token : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

// Global Non-Blocking Toast Notification Engine (with close button & persistent error support)
function showToast(message, type = 'info', duration = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const defaultDuration = (type === 'error') ? 8000 : (type === 'warning' ? 5000 : 3000);
  const actualDuration = duration !== null ? duration : defaultDuration;

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '8px';

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';

  const contentDiv = document.createElement('div');
  contentDiv.style.flex = '1';
  contentDiv.innerHTML = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'ปิดการแจ้งเตือน');
  closeBtn.style.cssText = 'background:transparent; border:none; color:inherit; font-size:18px; font-weight:bold; cursor:pointer; opacity:0.75; padding:0 4px; line-height:1;';
  closeBtn.onmouseenter = () => { closeBtn.style.opacity = '1'; };
  closeBtn.onmouseleave = () => { closeBtn.style.opacity = '0.75'; };

  toast.innerHTML = `<span style="font-size: 16px;">${icon}</span>`;
  toast.appendChild(contentDiv);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  let timer = null;
  const dismiss = () => {
    if (timer) clearTimeout(timer);
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  };

  closeBtn.onclick = dismiss;
  timer = setTimeout(dismiss, actualDuration);
}

// Global Tracking Code Copy Helper
window.copyTrackingCode = async function(code) {
  if (!code || code === '-') return;
  try {
    await navigator.clipboard.writeText(code);
    showToast(`คัดลอกรหัสติดตาม <strong>${code}</strong> สำเร็จแล้ว!`, 'success', 2500);
  } catch {
    prompt('คัดลอกรหัสติดตาม:', code);
  }
};

// Global Symptom Chip Selector for Ward Staff
window.setWardIssue = function(issueText) {
  const input = document.getElementById('ward-issue-input');
  if (input) {
    input.value = issueText;
    input.focus();
  }
};

// Vendor Procedures Cache (populated dynamically from configurations)
let vendorProcedures = {};

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

// Dual Date Formatter: Christian Era (ค.ศ.) & Buddhist Era (พ.ศ.)
function formatDualDate(dateStr, includeMonthName = false) {
  if (!dateStr || dateStr === '-' || dateStr === 'null') return '-';
  try {
    const cleanStr = String(dateStr).slice(0, 10);
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      let year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);

      let ceYear = year > 2400 ? year - 543 : year;
      let beYear = ceYear + 543;

      if (includeMonthName) {
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const monthName = thaiMonths[month - 1] || `${month}`;
        return `${day} ${monthName} ${beYear} (ค.ศ. ${ceYear})`;
      }
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${ceYear}-${mm}-${dd} (พ.ศ. ${beYear})`;
    }
    return String(dateStr);
  } catch {
    return String(dateStr);
  }
}
window.formatDualDate = formatDualDate;

// Lightweight Hospital Network Status Monitor (Zero Service Worker Cache Risk)
function setupNetworkStatusMonitor() {
  const updateStatus = () => {
    const isOnline = navigator.onLine;
    let badge = document.getElementById('network-status-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'network-status-badge';
      badge.style.cssText = 'position:fixed; bottom:16px; right:16px; z-index:9999; padding:8px 16px; border-radius:20px; font-size:12.5px; font-weight:600; display:none; align-items:center; gap:8px; box-shadow:0 4px 16px rgba(0,0,0,0.35); transition:all 0.3s ease;';
      document.body.appendChild(badge);
    }

    if (!isOnline) {
      badge.style.display = 'flex';
      badge.style.background = '#dc2626';
      badge.style.color = '#ffffff';
      badge.innerHTML = '⚠️ ไม่มีสัญญาณเครือข่าย (Offline) — กรุณาตรวจสอบ Wi-Fi';
      showToast('⚠️ สัญญาณอินเทอร์เน็ตขาดหาย (Offline) กรุณาตรวจสอบการเชื่อมต่อ Wi-Fi หรือ LAN ของโรงพยาบาล', 'warning', 6000);
    } else if (badge.style.display === 'flex') {
      badge.style.background = '#16a34a';
      badge.style.color = '#ffffff';
      badge.innerHTML = '✅ เชื่อมต่อระบบโรงพยาบาลเรียบร้อย (Online)';
      showToast('✅ สัญญาณอินเทอร์เน็ตกลับมาเชื่อมต่อเรียบร้อยแล้ว', 'success', 3000);
      setTimeout(() => { badge.style.display = 'none'; }, 3000);
    }
  };

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  if (!navigator.onLine) updateStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupNetworkStatusMonitor);
} else {
  setupNetworkStatusMonitor();
}
