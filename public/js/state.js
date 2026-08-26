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
  ward: 'ClaimIT — Staff Portal (แจ้งซ่อมครุภัณฑ์)',
  it:   'ClaimIT — IT Dashboard (จัดการระบบ)'
};

// Core DOM Elements
const authSection = document.getElementById('auth-section');
const wardSection = document.getElementById('ward-section');
const itSection = document.getElementById('it-section');

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
