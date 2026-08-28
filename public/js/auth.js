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
  if (!state.user) return;
  const isAdmin = state.user && state.user.role === 'admin';

  if (userNameEl) userNameEl.textContent = state.user.name;
  if (userRoleEl) userRoleEl.textContent = `${isAdmin ? 'IT Admin' : 'Staff'} (${state.user.department || 'General'})`;
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
  localStorage.removeItem('claimit_user');
  state.user = null;
  const appSidebar = document.getElementById('app-sidebar');
  if (appSidebar) appSidebar.style.display = 'none';
  if (userBadge) userBadge.style.display = 'none';

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
