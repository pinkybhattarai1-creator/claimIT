/**
 * ClaimIT Frontend - Admin Management Module
 * Handles user management (RBAC), configuration parameters,
 * vendor procedures, and dynamic dropdown options.
 */

function populateUserTable(users) {
  const tbody = document.getElementById('user-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  
  // Sort users so Admin is first
  const sortedUsers = [...users].sort((a, b) => a.role.localeCompare(b.role));
  
  let currentRole = null;
  sortedUsers.forEach(u => {
    if (currentRole !== u.role) {
      currentRole = u.role;
      const groupTr = document.createElement('tr');
      groupTr.style.background = 'rgba(255, 255, 255, 0.1)';
      groupTr.innerHTML = `<td colspan="6" style="font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${currentRole === 'admin' ? '🛡️ ผู้ดูแลระบบสารสนเทศ (IT Support Administrators)' : '👨‍💻 ช่างเทคนิคสารสนเทศ (IT Support Specialists)'}</td>`;
      tbody.appendChild(groupTr);
    }
    const tr = document.createElement('tr');
    const isSelf = state.user && state.user.id === u.id;
    const activeBadge = u.is_active === 0 ? '<span class="badge" style="background:#dc2626; color:#fff; font-size:10px;">ระงับใช้งาน</span>' : '';

    let actionButtons = `
      <div style="display:flex; gap:4px; flex-wrap:wrap;">
        <button class="btn btn-secondary" style="padding: 3px 6px; font-size: 10px;" onclick="openEditUserModal(${u.id}, '${escapeHtml(u.username)}', '${escapeHtml(u.name)}', '${escapeHtml(u.department)}', '${u.role}')">✏️ แก้ไข</button>
        <button class="btn btn-secondary" style="padding: 3px 6px; font-size: 10px;" onclick="adminResetPassword(${u.id}, '${escapeHtml(u.username)}')">🔑 รีเซ็ต</button>
    `;

    if (!isSelf && u.username !== 'admin') {
      if (u.is_active === 0) {
        actionButtons += `<button class="btn btn-success" style="padding: 3px 6px; font-size: 10px; background:#16a34a;" onclick="reactivateUser(${u.id})">🔄 เปิดใช้งาน</button>`;
      } else {
        actionButtons += `<button class="btn btn-danger" style="padding: 3px 6px; font-size: 10px;" onclick="deleteUser(${u.id})">⛔ ระงับ</button>`;
      }
    }
    actionButtons += `</div>`;

    tr.innerHTML = `
      <td>${u.id}</td>
      <td><strong>${escapeHtml(u.username)}</strong> ${activeBadge}</td>
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.department)}</td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-working' : 'badge-vendor'}">${u.role.toUpperCase()}</span></td>
      <td>${actionButtons}</td>
    `;
    tbody.appendChild(tr);
  });
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
  const tbody = document.getElementById('config-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const sortedConfigs = [...configs].sort((a, b) => a.type.localeCompare(b.type));
  let currentType = null;

  sortedConfigs.forEach(c => {
    if (currentType !== c.type) {
      currentType = c.type;
      const groupTr = document.createElement('tr');
      groupTr.style.background = 'rgba(255, 255, 255, 0.08)';
      const typeLabel = currentType === 'brand' ? '🏷️ แบรนด์และคู่มือศูนย์บริการ (Brands & RMA Guides)' : (currentType === 'category' ? '💻 หมวดหมู่อุปกรณ์ (Device Categories)' : '🏥 แผนกและสถานที่ติดตั้ง (Locations & Wards)');
      groupTr.innerHTML = `<td colspan="5" style="font-weight: 700; font-size: 12px; color: var(--primary); padding: 8px 12px;">${typeLabel}</td>`;
      tbody.appendChild(groupTr);
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
    tbody.appendChild(tr);
  });
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
