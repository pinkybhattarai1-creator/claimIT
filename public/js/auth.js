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
  showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
}
