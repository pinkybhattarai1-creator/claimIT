/**
 * ClaimIT Frontend - Admin Management Module
 * Handles user management (RBAC), configuration parameters,
 * vendor procedures, and dynamic dropdown options.
 */

function populateUserTable(users) {
  const adminTbody = document.getElementById('user-table-admin-body');
  const staffTbody = document.getElementById('user-table-staff-body');
  const legacyTbody = document.getElementById('user-table-body');

  if (adminTbody) adminTbody.innerHTML = '';
  if (staffTbody) staffTbody.innerHTML = '';
  if (legacyTbody) legacyTbody.innerHTML = '';

  const sortedUsers = [...users].sort((a, b) => a.role.localeCompare(b.role) || a.username.localeCompare(b.username));
  
  let adminCount = 0;
  let staffCount = 0;

  function createUserRow(u) {
    const tr = document.createElement('tr');
    const isSelf = state.user && state.user.id === u.id;
    const activeBadge = u.is_active === 0 ? '<span class="badge" style="background:#dc2626; color:#fff; font-size:10px; margin-left:4px;">ระงับใช้งาน</span>' : '';

    let actionButtons = `
      <div style="display:flex; gap:4px; flex-wrap:wrap;">
        <button class="btn btn-secondary" style="padding: 3px 7px; font-size: 11px;" onclick="openEditUserModal(${u.id}, '${escapeHtml(u.username)}', '${escapeHtml(u.name)}', '${escapeHtml(u.department)}', '${u.role}')">✏️ แก้ไข</button>
        <button class="btn btn-secondary" style="padding: 3px 7px; font-size: 11px;" onclick="adminResetPassword(${u.id}, '${escapeHtml(u.username)}')">🔑 รีเซ็ต</button>
    `;

    if (!isSelf && u.username !== 'admin') {
      if (u.is_active === 0) {
        actionButtons += `<button class="btn btn-success" style="padding: 3px 7px; font-size: 11px; background:#16a34a;" onclick="reactivateUser(${u.id})">🔄 เปิดใช้งาน</button>`;
      } else {
        actionButtons += `<button class="btn btn-danger" style="padding: 3px 7px; font-size: 11px;" onclick="deleteUser(${u.id})">⛔ ระงับ</button>`;
      }
    }
    actionButtons += `</div>`;

    tr.innerHTML = `
      <td>${u.id}</td>
      <td><strong>${escapeHtml(u.username)}</strong> ${activeBadge}</td>
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.department)}</td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-working' : 'badge-vendor'}">${u.role === 'admin' ? 'ADMIN' : 'STAFF'}</span></td>
      <td>${actionButtons}</td>
    `;
    return tr;
  }

  sortedUsers.forEach(u => {
    if (u.role === 'admin') {
      adminCount++;
      if (adminTbody) adminTbody.appendChild(createUserRow(u));
    } else {
      staffCount++;
      if (staffTbody) staffTbody.appendChild(createUserRow(u));
    }
  });

  if (adminTbody && adminCount === 0) {
    adminTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:12px;">ไม่พบข้อมูลผู้ดูแลระบบ</td></tr>';
  }
  if (staffTbody && staffCount === 0) {
    staffTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:12px;">ไม่พบข้อมูลช่างเทคนิคสารสนเทศ</td></tr>';
  }

  // Update counts
  const adminBadge = document.getElementById('user-admin-count');
  if (adminBadge) adminBadge.textContent = adminCount;
  const staffBadge = document.getElementById('user-staff-count');
  if (staffBadge) staffBadge.textContent = staffCount;
  const totalBadge = document.getElementById('user-total-count');
  if (totalBadge) totalBadge.textContent = users.length;
  const pillAllBadge = document.getElementById('user-pill-all-count');
  if (pillAllBadge) pillAllBadge.textContent = users.length;

  // Legacy table population for backwards compatibility
  if (legacyTbody) {
    let currentRole = null;
    sortedUsers.forEach(u => {
      if (currentRole !== u.role) {
        currentRole = u.role;
        const groupTr = document.createElement('tr');
        groupTr.style.background = 'var(--surface-subtle)';
        groupTr.innerHTML = `<td colspan="6" style="font-weight: 700; font-size: 12px; color: var(--primary); padding: 9px 12px; border-bottom: 1px solid var(--border-subtle); letter-spacing: 0.5px;">${currentRole === 'admin' ? '🛡️ ผู้ดูแลระบบสารสนเทศ (IT Support Administrators)' : '👨‍💻 ช่างเทคนิคสารสนเทศ (IT Support Specialists)'}</td>`;
        legacyTbody.appendChild(groupTr);
      }
      legacyTbody.appendChild(createUserRow(u));
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

window.openEditUserModal = function(id, username, name, department, role) {
  const modal = document.getElementById('edit-user-modal');
  if (!modal) return;
  document.getElementById('edit-user-id').value = id;
  document.getElementById('edit-user-username').value = username;
  document.getElementById('edit-user-fullname').value = name;
  document.getElementById('edit-user-department').value = department;
  document.getElementById('edit-user-role').value = role;
  modal.style.display = 'flex';
};

window.adminResetPassword = async function(id, username) {
  const newPass = prompt(`ระบุรหัสผ่านใหม่สำหรับผู้ใช้ [${username}] (ความยาวอย่างน้อย 6 ตัวอักษร):`);
  if (!newPass) return;
  if (newPass.length < 6) {
    showToast('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
    return;
  }
  try {
    const res = await fetch(`/api/users/${id}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ new_password: newPass })
    });
    if (res.ok) {
      showToast(`รีเซ็ตรหัสผ่านสำหรับ [${username}] เรียบร้อยแล้ว`, 'success');
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถรีเซ็ตรหัสผ่านได้', 'error');
    }
  } catch {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  }
};

window.reactivateUser = async function(id) {
  try {
    const res = await fetch(`/api/users/${id}/reactivate`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      showToast('เปิดใช้งานบัญชีผู้ใช้สำเร็จแล้ว', 'success');
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถเปิดใช้งานบัญชีได้', 'error');
    }
  } catch {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  }
};

window.deleteUser = async function(id) {
  if (!confirm('คุณต้องการระงับการใช้งานผู้ใช้นี้ใช่หรือไม่?')) return;
  try {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (res.ok) {
      showToast('ระงับการใช้งานผู้ใช้เรียบร้อยแล้ว', 'success');
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถระงับผู้ใช้ได้', 'error');
    }
  } catch (error) {
    console.error('Delete user error:', error);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  }
};

async function handleEditUserSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-user-id').value;
  const payload = {
    name: document.getElementById('edit-user-fullname').value.trim(),
    department: document.getElementById('edit-user-department').value.trim(),
    role: document.getElementById('edit-user-role').value
  };

  try {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('อัปเดตข้อมูลผู้ใช้งานสำเร็จแล้ว', 'success');
      document.getElementById('edit-user-modal').style.display = 'none';
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถอัปเดตข้อมูลได้', 'error');
    }
  } catch {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
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
      showToast('เพิ่มผู้ใช้งานใหม่เรียบร้อยแล้ว', 'success');
      document.getElementById('add-user-modal').style.display = 'none';
      document.getElementById('add-user-form').reset();
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถเพิ่มผู้ใช้งานได้', 'error');
    }
  } catch (error) {
    console.error('Add user error:', error);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  }
}

function populateConfigTable(configs) {
  const brandsTbody = document.getElementById('config-brands-table-body');
  const categoriesTbody = document.getElementById('config-categories-table-body');
  const locationsTbody = document.getElementById('config-locations-table-body');
  const legacyTbody = document.getElementById('config-table-body');

  if (brandsTbody) brandsTbody.innerHTML = '';
  if (categoriesTbody) categoriesTbody.innerHTML = '';
  if (locationsTbody) locationsTbody.innerHTML = '';
  if (legacyTbody) legacyTbody.innerHTML = '';

  let brandsCount = 0;
  let categoriesCount = 0;
  let locationsCount = 0;

  function createConfigRow(c) {
    const tr = document.createElement('tr');
    const tdId = `<td style="font-weight: 600; width: 60px;">${c.id}</td>`;
    const tdValue = `<td><strong style="color: var(--text-primary); font-size: 13px;">${escapeHtml(c.value)}</strong></td>`;
    const tdDetails = `<td><div style="max-height: 120px; overflow-y: auto; background: var(--surface-subtle); padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 12px; line-height: 1.5;">${c.details || '-'}</div></td>`;
    const tdActions = `
      <td style="width: 140px;">
        <div style="display: flex; gap: 4px;">
          <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="event.stopPropagation(); window.editConfig(${c.id}, '${escapeHtml(c.type)}', '${escapeHtml(c.value)}', '${escapeHtml(c.details || '')}')">✏️ แก้ไข</button>
          <button class="btn btn-danger btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="event.stopPropagation(); window.deleteConfig(${c.id})">🗑️ ลบ</button>
        </div>
      </td>
    `;
    tr.innerHTML = tdId + tdValue + tdDetails + tdActions;
    return tr;
  }

  const sortedConfigs = [...configs].sort((a, b) => a.type.localeCompare(b.type) || a.value.localeCompare(b.value));

  sortedConfigs.forEach(c => {
    if (c.type === 'brand') {
      brandsCount++;
      if (brandsTbody) brandsTbody.appendChild(createConfigRow(c));
    } else if (c.type === 'category') {
      categoriesCount++;
      if (categoriesTbody) categoriesTbody.appendChild(createConfigRow(c));
    } else if (c.type === 'location') {
      locationsCount++;
      if (locationsTbody) locationsTbody.appendChild(createConfigRow(c));
    }
  });

  // Empty states
  if (brandsTbody && brandsCount === 0) {
    brandsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:12px;">ไม่พบรายการแบรนด์และศูนย์บริการ</td></tr>';
  }
  if (categoriesTbody && categoriesCount === 0) {
    categoriesTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:12px;">ไม่พบรายการหมวดหมู่อุปกรณ์</td></tr>';
  }
  if (locationsTbody && locationsCount === 0) {
    locationsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:12px;">ยังไม่มีสถานที่เพิ่มเติมที่บันทึกไว้ในระบบ</td></tr>';
  }

  // Update count badges
  const bBadge = document.getElementById('config-brands-count');
  if (bBadge) bBadge.textContent = brandsCount;
  const cBadge = document.getElementById('config-categories-count');
  if (cBadge) cBadge.textContent = categoriesCount;
  const lBadge = document.getElementById('config-locations-count');
  if (lBadge) lBadge.textContent = locationsCount;

  // Legacy table population for backward compatibility
  if (legacyTbody) {
    let currentType = null;
    sortedConfigs.forEach(c => {
      if (currentType !== c.type) {
        currentType = c.type;
        const groupTr = document.createElement('tr');
        groupTr.style.background = 'var(--surface-subtle)';
        const typeLabel = currentType === 'brand' ? '🏷️ แบรนด์และคู่มือศูนย์บริการ (Brands & RMA Guides)' : (currentType === 'category' ? '💻 หมวดหมู่อุปกรณ์ (Device Categories)' : '🏥 แผนกและสถานที่ติดตั้ง (Locations & Wards)');
        groupTr.innerHTML = `<td colspan="5" style="font-weight: 700; font-size: 12px; color: var(--primary); padding: 9px 12px; border-bottom: 1px solid var(--border-subtle);">${typeLabel}</td>`;
        legacyTbody.appendChild(groupTr);
      }
      const tr = document.createElement('tr');
      const badgeClass = c.type === 'brand' ? 'badge-vendor' : (c.type === 'category' ? 'badge-working' : 'badge-donation');
      const tdId = `<td>${c.id}</td>`;
      const tdType = `<td><span class="badge ${badgeClass}" style="font-size: 10.5px; font-weight: 700;">${c.type.toUpperCase()}</span></td>`;
      const tdValue = `<td><strong style="color: var(--text-primary); font-size: 13px;">${escapeHtml(c.value)}</strong></td>`;
      const tdDetails = `<td><div style="max-height: 120px; overflow-y: auto; background: var(--surface-subtle); padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 12px; line-height: 1.5;">${c.details || '-'}</div></td>`;
      const tdActions = `
        <td>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="event.stopPropagation(); window.editConfig(${c.id}, '${escapeHtml(c.type)}', '${escapeHtml(c.value)}', '${escapeHtml(c.details || '')}')">✏️ แก้ไข</button>
            <button class="btn btn-danger btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="event.stopPropagation(); window.deleteConfig(${c.id})">🗑️ ลบ</button>
          </div>
        </td>
      `;
      tr.innerHTML = tdId + tdType + tdValue + tdDetails + tdActions;
      legacyTbody.appendChild(tr);
    });
  }

  // Update hospital layout datalist with custom locations
  if (typeof setupHospitalLayoutDatalist === 'function') {
    setupHospitalLayoutDatalist(configs);
  }
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

      const safeDetails = sanitizeBrandProcedure(b.details);
      if (safeDetails) {
        vendorProcedures[b.value] = safeDetails;
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

  // Extract hospital configuration if present
  const hospConfigs = configs.filter(c => c.type === 'hospital');
  if (hospConfigs.length > 0) {
    window.claimitHospitalConfig = window.claimitHospitalConfig || {};
    hospConfigs.forEach(hc => {
      try {
        if (hc.details && typeof hc.details === 'string' && hc.details.trim().startsWith('{')) {
          const parsed = JSON.parse(hc.details);
          window.claimitHospitalConfig = { ...window.claimitHospitalConfig, ...parsed };
        } else if (hc.value) {
          window.claimitHospitalConfig[hc.value] = hc.details || hc.value;
        }
      } catch (e) {
        if (hc.value) window.claimitHospitalConfig[hc.value] = hc.details || hc.value;
      }
    });
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
      showToast('ลบการตั้งค่าสำเร็จ', 'success');
      refreshData();
    }
  } catch (error) {
    console.error('Delete config error:', error);
    showToast('เกิดข้อผิดพลาดในการลบการตั้งค่า', 'error');
  }
};

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
      showToast('บันทึกการตั้งค่าสำเร็จ', 'success');
      document.getElementById('add-config-modal').style.display = 'none';
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'บันทึกข้อมูลล้มเหลว', 'error');
    }
  } catch (error) {
    console.error('Add config error:', error);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  }
}

// ─── Admin Feedback Management ─────────────────────────────────────────────
let adminFeedbackCache = [];
let currentFeedbackFilter = 'all';

async function loadAdminFeedback() {
  const tbody = document.getElementById('feedback-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:16px;">⏳ กำลังโหลดรายการข้อเสนอแนะ...</td></tr>';

  try {
    const res = await fetch('/api/feedback', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลได้');
    adminFeedbackCache = await res.json();
    renderAdminFeedbackTable();
    updateFeedbackBadge();
  } catch (err) {
    console.error('loadAdminFeedback error:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--danger); padding:16px;">❌ โหลดข้อมูลล้มเหลว: ${err.message}</td></tr>`;
  }
}
window.loadAdminFeedback = loadAdminFeedback;

function updateFeedbackBadge() {
  const badge = document.getElementById('feedback-count-badge');
  if (badge) {
    const openCount = adminFeedbackCache.filter(f => f.status === 'open').length;
    badge.textContent = openCount;
  }
}

function filterAdminFeedback(filter) {
  currentFeedbackFilter = filter;
  renderAdminFeedbackTable();
}
window.filterAdminFeedback = filterAdminFeedback;

function renderAdminFeedbackTable() {
  const tbody = document.getElementById('feedback-table-body');
  if (!tbody) return;

  let items = [...adminFeedbackCache];
  if (currentFeedbackFilter === 'open') {
    items = items.filter(f => f.status === 'open');
  } else if (['bug', 'suggestion', 'ux', 'other'].includes(currentFeedbackFilter)) {
    items = items.filter(f => f.category === currentFeedbackFilter);
  }

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:24px;">✨ ยังไม่มีรายการข้อเสนอแนะในหมวดนี้</td></tr>';
    return;
  }

  const catLabels = {
    bug: '<span class="badge" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5;">🐞 Bug</span>',
    suggestion: '<span class="badge" style="background:#dbeafe; color:#2563eb; border:1px solid #93c5fd;">💡 เสนอแนะ</span>',
    ux: '<span class="badge" style="background:#fef3c7; color:#d97706; border:1px solid #fde68a;">❓ UX</span>',
    other: '<span class="badge" style="background:#f1f5f9; color:#475569;">💬 อื่นๆ</span>'
  };

  const statusBadges = {
    open: '<span class="badge" style="background:#fef2f2; color:#ef4444;">⏳ รอตรวจ (Open)</span>',
    reviewed: '<span class="badge" style="background:#fef9c3; color:#ca8a04;">👀 รับทราบแล้ว</span>',
    resolved: '<span class="badge" style="background:#f0fdf4; color:#16a34a;">✅ แก้ไขแล้ว</span>'
  };

  tbody.innerHTML = items.map(item => {
    const dateStr = item.created_at ? new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '-';
    const stars = item.rating ? '★'.repeat(item.rating) : '-';
    const reporter = `${escapeHtml(item.reporter_name || 'ทั่วไป')} <br><small style="color:var(--text-muted);">${escapeHtml(item.department || '-')}</small>`;
    const location = `<strong style="font-size:11.5px;">${escapeHtml(item.page_url || '-')}</strong><br><small style="color:var(--text-muted);">${escapeHtml(item.device_info || '-')}</small>`;

    const adminNoteDisplay = item.admin_note 
      ? `<div style="margin-top:6px; padding:4px 8px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; font-size:11.5px; color:#166534;"><strong>💬 โน้ตแอดมิน:</strong> ${escapeHtml(item.admin_note)}</div>` 
      : '';

    let actions = `
      <div style="display:flex; gap:4px; flex-wrap:wrap;">
    `;
    actions += `<button class="btn btn-secondary" style="padding:2px 6px; font-size:10px;" onclick="openAdminNotePrompt(${item.id}, '${escapeHtml(item.admin_note || '')}')" title="เขียนบันทึก/คำตอบกลับจากแอดมิน">📝 โน้ต</button>`;
    if (item.status === 'open') {
      actions += `<button class="btn btn-secondary" style="padding:2px 6px; font-size:10px;" onclick="updateFeedbackStatus(${item.id}, 'reviewed')">👀 รับทราบ</button>`;
    }
    if (item.status !== 'resolved') {
      actions += `<button class="btn btn-success" style="padding:2px 6px; font-size:10px; background:#16a34a;" onclick="updateFeedbackStatus(${item.id}, 'resolved')">✓ เสร็จ</button>`;
    }
    actions += `<button class="btn btn-danger" style="padding:2px 6px; font-size:10px;" onclick="deleteFeedbackItem(${item.id})">🗑️</button>`;
    actions += `</div>`;

    return `
      <tr>
        <td style="font-size:11px; white-space:nowrap;">${dateStr}</td>
        <td>${catLabels[item.category] || item.category}</td>
        <td style="font-size:11px;">${location}</td>
        <td style="font-size:12.5px; line-height:1.4;">${escapeHtml(item.comment)}${adminNoteDisplay}</td>
        <td style="font-size:11.5px;">${reporter}</td>
        <td style="color:#f59e0b; font-size:12px;">${stars}</td>
        <td>${statusBadges[item.status] || item.status}</td>
        <td>${actions}</td>
      </tr>
    `;
  }).join('');
}

async function openAdminNotePrompt(id, currentNote) {
  const note = prompt('ระบุโน้ต/การตอบกลับของแอดมิน (จะแสดงให้ผู้แจ้งและบนกระดานเห็น):', currentNote || '');
  if (note === null) return;
  try {
    const res = await fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ admin_note: note.trim() })
    });
    if (res.ok) {
      showToast('บันทึกโน้ตของแอดมินเรียบร้อยแล้ว', 'success');
      loadAdminFeedback();
    } else {
      const d = await res.json();
      showToast(d.error || 'บันทึกล้มเหลว', 'error');
    }
  } catch (e) {
    showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
  }
}
window.openAdminNotePrompt = openAdminNotePrompt;

async function updateFeedbackStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`อัปเดตสถานะเป็น ${newStatus} สำเร็จ`, 'success');
      loadAdminFeedback();
    }
  } catch (e) {
    console.error('Update feedback status error:', e);
    showToast('เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
  }
}
window.updateFeedbackStatus = updateFeedbackStatus;

async function deleteFeedbackItem(id) {
  if (!confirm('ต้องการลบข้อเสนอแนะนี้ใช่หรือไม่?')) return;
  try {
    const res = await fetch(`/api/feedback/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      showToast('ลบรายการข้อเสนอแนะแล้ว', 'info');
      loadAdminFeedback();
    }
  } catch (e) {
    console.error('Delete feedback error:', e);
    showToast('เกิดข้อผิดพลาดในการลบ', 'error');
  }
}
window.deleteFeedbackItem = deleteFeedbackItem;

// ─── Role & Config View Helpers (Separated Layout) ──────────────────────────
window.filterUserRole = function(role) {
  const adminCard = document.getElementById('user-admin-section-card');
  const staffCard = document.getElementById('user-staff-section-card');
  const pills = document.querySelectorAll('.user-role-pill-btn');

  pills.forEach(p => {
    const isTarget = p.getAttribute('data-role') === role;
    p.classList.toggle('active', isTarget);
    p.classList.toggle('btn-primary', isTarget);
    p.classList.toggle('btn-secondary', !isTarget);
  });

  if (role === 'admin') {
    if (adminCard) adminCard.style.display = 'block';
    if (staffCard) staffCard.style.display = 'none';
  } else if (role === 'staff') {
    if (adminCard) adminCard.style.display = 'none';
    if (staffCard) staffCard.style.display = 'block';
  } else {
    // all
    if (adminCard) adminCard.style.display = 'block';
    if (staffCard) staffCard.style.display = 'block';
  }
};

window.openAddUserModalWithRole = function(role = 'staff') {
  const modal = document.getElementById('add-user-modal');
  if (!modal) return;
  const form = document.getElementById('add-user-form');
  if (form) form.reset();
  const roleSelect = document.getElementById('new-user-role');
  if (roleSelect && role) roleSelect.value = role;
  modal.style.display = 'flex';
};

window.openAddConfigModalWithType = function(type = 'brand') {
  const modal = document.getElementById('add-config-modal');
  if (!modal) return;
  const form = document.getElementById('add-config-form');
  if (form) form.reset();
  const idInput = document.getElementById('config-id');
  if (idInput) idInput.value = '';
  const typeSelect = document.getElementById('config-type');
  if (typeSelect && type) typeSelect.value = type;
  modal.style.display = 'flex';
};

