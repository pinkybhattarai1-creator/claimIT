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
    limit: 50,
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
    limit: 100
  }
};

// Page Titles
const PAGE_TITLES = {
  auth: 'ClaimIT — เข้าสู่ระบบ',
  ward: 'ClaimIT — Staff Portal (ช่างไอทีภาคสนาม)',
  it:   'ClaimIT — IT Portal (ศูนย์เคลม & ครุภัณฑ์)',
  config: 'ClaimIT — System Configuration (ตั้งค่า & จัดการระบบ)'
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

// Global Non-Blocking Toast Notification Engine
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span style="font-size: 16px;">${icon}</span><div style="flex: 1;">${message}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
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
