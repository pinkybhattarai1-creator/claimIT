/**
 * ClaimIT Frontend - Authentication Module
 * Handles entry security gate (passcode: 1), login, session caching,
 * RBAC navigation display, and logout.
 */

// ─── Entry Gate Passcode (Default: 1) ───────────────────────────────────────
function checkSecurityGate() {
  const gateModal = document.getElementById('security-gate-modal');
  if (!gateModal) return true;

  const isUnlocked = localStorage.getItem('claimit_gate_passed') === 'true' ||
                     document.cookie.includes('claimit_gate=1');

  if (!isUnlocked) {
    gateModal.style.display = 'flex';
    setTimeout(() => {
      const input = document.getElementById('gate-passcode-input');
      if (input) input.focus();
    }, 100);
    return false;
  } else {
    gateModal.style.display = 'none';
    return true;
  }
}

async function handleGateSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('gate-passcode-input');
  const passcode = input ? input.value.trim() : '';

  try {
    const res = await fetch('/api/verify-gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });

    if (res.ok || passcode === '1') {
      localStorage.setItem('claimit_gate_passed', 'true');
      document.cookie = 'claimit_gate=1; Path=/; Max-Age=2592000';
      const gateModal = document.getElementById('security-gate-modal');
      if (gateModal) gateModal.style.display = 'none';
      showToast('🔓 ปลดล็อกเข้าใช้งานระบบสำเร็จ ยินดีต้อนรับ!', 'success', 3000);
    } else {
      const err = await res.json();
      showToast(err.error || 'รหัสผ่านไม่ถูกต้อง (รหัสผ่านเริ่มต้นคือ 1)', 'error', 4000);
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  } catch {
    // Client-side fallback if offline
    if (passcode === '1') {
      localStorage.setItem('claimit_gate_passed', 'true');
      const gateModal = document.getElementById('security-gate-modal');
      if (gateModal) gateModal.style.display = 'none';
      showToast('🔓 ปลดล็อกเข้าใช้งานระบบสำเร็จ!', 'success', 3000);
    } else {
      showToast('รหัสผ่านไม่ถูกต้อง (รหัสผ่านเริ่มต้นคือ 1)', 'error', 4000);
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  }
}

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
      
      if (user.role === 'admin') {
        switchView('it');
      } else {
        switchView('ward');
      }
      showToast(`ยินดีต้อนรับ, ${user.name}!`, 'success', 3000);
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
  userNameEl.textContent = state.user.name;
  userRoleEl.textContent = `${state.user.role === 'admin' ? 'IT Admin' : 'Staff'} (${state.user.department || 'General'})`;
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
  showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
}

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
