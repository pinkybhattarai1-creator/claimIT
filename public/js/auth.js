/**
 * ClaimIT Frontend - Authentication Module
 * Handles entry security gate (passcode: 1), login, session caching,
 * RBAC navigation display, and logout.
 */

// ─── Login & Session Management ─────────────────────────────────────────────
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
      startSessionMonitor();
      
      // Never force password change for default test accounts (admin, staff)
      const isTestAccount = (user.username === 'admin' || user.username === 'staff');
      if (user.must_change_password && !isTestAccount) {
        openChangePasswordModal(true);
        showToast('⚠️ บัญชีของคุณจำเป็นต้องตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน', 'warning', 6000);
      } else {
        if (user.role === 'admin') {
          switchView('it');
        } else {
          switchView('ward');
        }
        showToast(`ยินดีต้อนรับ, ${user.name}!`, 'success', 3000);
      }
    } else {
      const err = await response.json();
      showToast(err.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบสถานะโปรแกรม', 'error');
  }
}

function showUserNavigation() {
  if (!state.user) return;
  const isAdmin = state.user && state.user.role === 'admin';

  if (userNameEl) userNameEl.textContent = state.user.name;
  if (userRoleEl) userRoleEl.textContent = `${isAdmin ? 'IT Support Admin' : 'IT Support Specialist'} (${state.user.department || 'Technical Support & Infrastructure'})`;
  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) {
    avatarEl.textContent = (state.user.name || state.user.username || 'U').charAt(0).toUpperCase();
  }
  const appSidebar = document.getElementById('app-sidebar');
  if (appSidebar) appSidebar.style.display = 'flex';
  if (userBadge) userBadge.style.display = 'flex';

  // Left Sidebar Links & Groups
  const itBtn = document.getElementById('btn-to-it');
  const configBtn = document.getElementById('btn-to-config');
  const opGroup = document.getElementById('sidebar-group-operations');
  const exportGroup = document.getElementById('sidebar-group-exports');
  
  if (itBtn) itBtn.style.display = isAdmin ? 'flex' : 'none';
  if (configBtn) configBtn.style.display = isAdmin ? 'flex' : 'none';
  if (opGroup) opGroup.style.display = isAdmin ? 'block' : 'none';
  if (exportGroup) exportGroup.style.display = isAdmin ? 'block' : 'none';

  // Top Bar Navigation Tabs
  const btnTopIt = document.getElementById('btn-top-it');
  const btnTopConfig = document.getElementById('btn-top-config');
  if (btnTopIt) btnTopIt.style.display = isAdmin ? 'inline-flex' : 'none';
  if (btnTopConfig) btnTopConfig.style.display = isAdmin ? 'inline-flex' : 'none';
}

function logout() {
  stopSessionMonitor();
  localStorage.removeItem('claimit_user');
  state.user = null;
  state.selectedAsset = null;
  state.pendingFuzzyAsset = null;
  state.claimAssets = [];
  state.recentScans = [];

  // Hide Topbar and Sidebar Navigation
  const appSidebar = document.getElementById('app-sidebar');
  if (appSidebar) {
    appSidebar.style.display = 'none';
    appSidebar.classList.remove('open');
  }
  if (userBadge) userBadge.style.display = 'none';
  const breadcrumbBar = document.getElementById('breadcrumb-bar');
  if (breadcrumbBar) breadcrumbBar.style.display = 'none';
  const navTabs = document.getElementById('nav-tabs');
  if (navTabs) navTabs.style.display = 'none';

  // Hide Admin Sections
  const itBtn = document.getElementById('btn-to-it');
  const configBtn = document.getElementById('btn-to-config');
  const opGroup = document.getElementById('sidebar-group-operations');
  const exportGroup = document.getElementById('sidebar-group-exports');
  const btnTopIt = document.getElementById('btn-top-it');
  const btnTopConfig = document.getElementById('btn-top-config');

  if (itBtn) itBtn.style.display = 'none';
  if (configBtn) configBtn.style.display = 'none';
  if (opGroup) opGroup.style.display = 'none';
  if (exportGroup) exportGroup.style.display = 'none';
  if (btnTopIt) btnTopIt.style.display = 'none';
  if (btnTopConfig) btnTopConfig.style.display = 'none';

  // Close Quick Access Drawer if open
  const quickSidebar = document.getElementById('quick-sidebar');
  if (quickSidebar) quickSidebar.classList.remove('open');

  // Close all possible open modals
  const modalIds = [
    'profile-modal', 'add-asset-modal', 'claim-modal', 'claim-detail-modal',
    'pdpa-modal', 'user-modal', 'password-modal', 'config-modal', 'mobile-ip-modal',
    'change-password-modal', 'session-warning-modal', 'forgot-password-modal'
  ];
  modalIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Shared-terminal safety: wipe all sessionStorage form drafts
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('claimit_draft_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {}

  // Reset inputs
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.reset();
  const wardSearch = document.getElementById('ward-search-input');
  if (wardSearch) wardSearch.value = '';
  const itSearch = document.getElementById('it-search-input');
  if (itSearch) itSearch.value = '';

  switchView('auth');
  showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
}

// ─── Self-Service Emergency Password Reset ─────────────────────────────────
function openForgotPasswordModal() {
  const modal = document.getElementById('forgot-password-modal');
  if (modal) {
    modal.style.display = 'flex';
    backToFpStep1();
    const u = document.getElementById('login-username');
    const fpu = document.getElementById('fp-username');
    if (u && fpu && u.value) {
      fpu.value = u.value;
    }
  }
}
window.openForgotPasswordModal = openForgotPasswordModal;

function closeForgotPasswordModal() {
  const modal = document.getElementById('forgot-password-modal');
  if (modal) modal.style.display = 'none';
  const step1 = document.getElementById('fp-step1-form') || document.getElementById('fp-step-1');
  const step2 = document.getElementById('fp-step2-form') || document.getElementById('fp-step-2');
  if (step1 && typeof step1.reset === 'function') step1.reset();
  if (step2 && typeof step2.reset === 'function') step2.reset();
}
window.closeForgotPasswordModal = closeForgotPasswordModal;

function backToFpStep1() {
  const s1 = document.getElementById('fp-step1-form') || document.getElementById('fp-step-1');
  const s2 = document.getElementById('fp-step2-form') || document.getElementById('fp-step-2');
  if (s1) s1.style.display = 'block';
  if (s2) s2.style.display = 'none';
}
window.backToFpStep1 = backToFpStep1;

async function submitRequestReset(e) {
  if (e) e.preventDefault();
  const usernameInput = document.getElementById('fp-username');
  const username = usernameInput ? usernameInput.value.trim() : '';
  if (!username) {
    showToast('กรุณาระบุ Username ของคุณ', 'warning');
    return;
  }

  const btn = document.getElementById('fp-request-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'กำลังตรวจสอบและส่งรหัส...';
  }

  try {
    const res = await fetch('/api/auth/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'ระบบส่งรหัส OTP เรียบร้อยแล้ว', 'success', 6000);
      const s1 = document.getElementById('fp-step1-form') || document.getElementById('fp-step-1');
      const s2 = document.getElementById('fp-step2-form') || document.getElementById('fp-step-2');
      if (s1) s1.style.display = 'none';
      if (s2) s2.style.display = 'block';
      const otpInput = document.getElementById('fp-otp');
      if (otpInput) {
        otpInput.value = '';
        otpInput.focus();
      }
    } else {
      showToast(data.error || 'ไม่สามารถขอรหัส OTP ได้', 'error', 5000);
    }
  } catch (err) {
    console.error('Request reset error:', err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📨 ขอรับรหัสยืนยัน OTP';
    }
  }
}
window.submitRequestReset = submitRequestReset;

async function submitResetPasswordToken(e) {
  if (e) e.preventDefault();
  const username = (document.getElementById('fp-username')?.value || '').trim();
  const otp = (document.getElementById('fp-otp')?.value || '').trim();
  const newPass = (document.getElementById('fp-new-password')?.value || '');
  const confirmPass = (document.getElementById('fp-confirm-password')?.value || '');

  if (!otp || !newPass || !confirmPass) {
    showToast('กรุณากรอกรหัส OTP และรหัสผ่านใหม่ให้ครบถ้วน', 'warning');
    return;
  }

  if (otp.length !== 6) {
    showToast('กรุณากรอกรหัส OTP 6 หลักให้ถูกต้อง', 'warning');
    return;
  }

  if (newPass !== confirmPass) {
    showToast('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', 'warning');
    return;
  }

  if (newPass.length < 6) {
    showToast('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
    return;
  }

  const btn = document.getElementById('fp-confirm-btn') || document.getElementById('fp-reset-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึกรหัสผ่านใหม่...';
  }

  try {
    const res = await fetch('/api/auth/reset-password-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        otp,
        new_password: newPass
      })
    });

    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว', 'success', 5000);
      closeForgotPasswordModal();
      const loginUser = document.getElementById('login-username');
      const loginPass = document.getElementById('login-password');
      if (loginUser) loginUser.value = username;
      if (loginPass) {
        loginPass.value = newPass;
        loginPass.focus();
      }
    } else {
      showToast(data.error || 'ไม่สามารถตั้งรหัสผ่านใหม่ได้', 'error', 5000);
    }
  } catch (err) {
    console.error('Reset token error:', err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 บันทึกรหัสผ่านใหม่';
    }
  }
}
window.submitResetPasswordToken = submitResetPasswordToken;

// ─── Fast Login (1-Click for 4 Admins and 4 Staff) ─────────────────────────
function quickLogin(username, password) {
  const uInput = document.getElementById('login-username');
  const pInput = document.getElementById('login-password');
  if (uInput && pInput) {
    uInput.value = username;
    pInput.value = password;
    const form = document.getElementById('login-form');
    if (form) form.requestSubmit();
  }
}
window.quickLogin = quickLogin;

// ─── Self Profile Editing ───────────────────────────────────────────────────
function openProfileModal() {
  if (!state.user) {
    showToast('กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูล', 'warning');
    return;
  }
  const modal = document.getElementById('profile-modal');
  const uInput = document.getElementById('profile-username');
  const nInput = document.getElementById('profile-name');
  const dInput = document.getElementById('profile-department');

  if (uInput) uInput.value = state.user.username || '';
  if (nInput) nInput.value = state.user.name || '';
  if (dInput) dInput.value = state.user.department || '';

  if (modal) modal.style.display = 'flex';
}
window.openProfileModal = openProfileModal;

async function handleProfileSubmit(e) {
  e.preventDefault();
  if (!state.user) return;

  const name = document.getElementById('profile-name')?.value.trim();
  const department = document.getElementById('profile-department')?.value.trim();

  if (!name) {
    showToast('กรุณาระบุชื่อ-นามสกุล', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, department })
    });

    if (res.ok) {
      const data = await res.json();
      state.user = { ...state.user, ...data.user };
      if (data.token) state.user.token = data.token;
      localStorage.setItem('claimit_user', JSON.stringify(state.user));
      showUserNavigation();
      const modal = document.getElementById('profile-modal');
      if (modal) modal.style.display = 'none';
      showToast('✅ อัปเดตข้อมูลส่วนตัวสำเร็จเรียบร้อย', 'success', 3000);
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถอัปเดตข้อมูลส่วนตัวได้', 'error');
    }
  } catch (err) {
    console.error('Update profile error:', err);
    showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูลส่วนตัว', 'error');
  }
}
window.handleProfileSubmit = handleProfileSubmit;

// ─── Change Password Modal & Policy Enforcement ────────────────────────────
let isPasswordChangeForced = false;

function openChangePasswordModal(isForced = false) {
  if (!state.user) {
    showToast('กรุณาเข้าสู่ระบบก่อนดำเนินการ', 'warning');
    return;
  }
  isPasswordChangeForced = Boolean(isForced);
  const modal = document.getElementById('change-password-modal');
  const notice = document.getElementById('change-password-notice');
  const closeBtn = document.getElementById('close-change-password-btn');
  const cancelBtn = document.getElementById('cp-cancel-btn');
  const form = document.getElementById('change-password-form');
  if (form) form.reset();

  if (notice) notice.style.display = isForced ? 'block' : 'none';
  if (closeBtn) closeBtn.style.display = 'block';
  if (cancelBtn) {
    cancelBtn.style.display = 'inline-block';
    cancelBtn.textContent = isForced ? 'ข้ามไปก่อน (Skip)' : 'ยกเลิก';
  }

  // If opening from profile modal, hide profile modal
  const profileModal = document.getElementById('profile-modal');
  if (profileModal && profileModal.style.display !== 'none') {
    profileModal.style.display = 'none';
  }

  if (modal) modal.style.display = 'flex';
}
window.openChangePasswordModal = openChangePasswordModal;

function closeChangePasswordModal() {
  const modal = document.getElementById('change-password-modal');
  if (modal) modal.style.display = 'none';
  if (isPasswordChangeForced) {
    isPasswordChangeForced = false;
    if (state.user?.role === 'admin') {
      switchView('it');
    } else {
      switchView('ward');
    }
  }
}
window.closeChangePasswordModal = closeChangePasswordModal;

async function handleChangePasswordSubmit(e) {
  e.preventDefault();
  if (!state.user) return;

  const currentPassword = document.getElementById('cp-current-password')?.value;
  const newPassword = document.getElementById('cp-new-password')?.value;
  const confirmPassword = document.getElementById('cp-confirm-password')?.value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    showToast('กรุณาระบุข้อมูลรหัสผ่านให้ครบถ้วน', 'warning');
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showToast('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
    return;
  }

  const submitBtn = document.getElementById('cp-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังบันทึก...';
  }

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        username: state.user.username,
        current_password: currentPassword,
        new_password: newPassword
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        state.user.token = data.token;
      }
      state.user.must_change_password = false;
      localStorage.setItem('claimit_user', JSON.stringify(state.user));

      const modal = document.getElementById('change-password-modal');
      if (modal) modal.style.display = 'none';
      showToast('✅ เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว', 'success', 3500);

      if (isPasswordChangeForced) {
        isPasswordChangeForced = false;
        if (state.user.role === 'admin') {
          switchView('it');
        } else {
          switchView('ward');
        }
      }
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้', 'error');
    }
  } catch (err) {
    console.error('Change password error:', err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'บันทึกรหัสผ่านใหม่';
    }
  }
}
window.handleChangePasswordSubmit = handleChangePasswordSubmit;

// ─── Session Expiry Grace & Monitoring Engine ──────────────────────────────
let sessionMonitorTimer = null;

function parseJwtExp(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function startSessionMonitor() {
  stopSessionMonitor();
  if (!state.user || !state.user.token) return;

  sessionMonitorTimer = setInterval(() => {
    if (!state.user || !state.user.token) {
      stopSessionMonitor();
      return;
    }

    const expTime = parseJwtExp(state.user.token);
    if (!expTime) return;

    const remainingMs = expTime - Date.now();
    const warningModal = document.getElementById('session-warning-modal');
    const countdownEl = document.getElementById('session-countdown');

    // T-15m warning threshold (15 minutes grace period)
    const WARNING_THRESHOLD_MS = 15 * 60 * 1000;
    if (remainingMs <= WARNING_THRESHOLD_MS && remainingMs > 0) {
      if (warningModal && warningModal.style.display !== 'flex') {
        warningModal.style.display = 'flex';
      }
      if (countdownEl) {
        const totalSecs = Math.max(1, Math.round(remainingMs / 1000));
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        countdownEl.textContent = `${mins} นาที ${secs < 10 ? '0' : ''}${secs} วินาที`;
      }
    } else if (remainingMs <= 0) {
      if (warningModal) warningModal.style.display = 'none';
      stopSessionMonitor();
      logout();
      showToast('⚠️ เซสชันการใช้งานหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่', 'warning', 8000);
    } else {
      if (warningModal && warningModal.style.display === 'flex') {
        warningModal.style.display = 'none';
      }
    }
  }, 5000);
}
window.startSessionMonitor = startSessionMonitor;

function stopSessionMonitor() {
  if (sessionMonitorTimer) {
    clearInterval(sessionMonitorTimer);
    sessionMonitorTimer = null;
  }
  const warningModal = document.getElementById('session-warning-modal');
  if (warningModal) warningModal.style.display = 'none';
}
window.stopSessionMonitor = stopSessionMonitor;

async function extendSession() {
  if (!state.user || !state.user.token) return;

  const btn = document.getElementById('btn-extend-session');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'กำลังต่ออายุ...';
  }

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        state.user.token = data.token;
        localStorage.setItem('claimit_user', JSON.stringify(state.user));
      }
      const warningModal = document.getElementById('session-warning-modal');
      if (warningModal) warningModal.style.display = 'none';
      showToast('✅ ต่ออายุเซสชันสำเร็จแล้ว (ใช้งานต่อได้อีก 8 ชั่วโมง)', 'success', 3000);
    } else {
      showToast('ไม่สามารถต่ออายุเซสชันได้ กรุณาเข้าสู่ระบบใหม่', 'error');
      logout();
    }
  } catch (err) {
    console.error('Session extend error:', err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔄 ต่ออายุเซสชัน (ทำงานต่อ)';
    }
  }
}
window.extendSession = extendSession;

// ─── Forgot Password / Emergency OTP Reset ─────────────────────────────────
let fpActiveUsername = '';

function openForgotPasswordModal() {
  const modal = document.getElementById('forgot-password-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  const step1 = document.getElementById('fp-step1-form');
  const step2 = document.getElementById('fp-step2-form');
  if (step1) step1.style.display = 'block';
  if (step2) step2.style.display = 'none';
  const usernameInput = document.getElementById('fp-username');
  if (usernameInput) {
    usernameInput.value = document.getElementById('login-username')?.value || '';
    usernameInput.focus();
  }
}
window.openForgotPasswordModal = openForgotPasswordModal;

