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
      groupTr.innerHTML = `<td colspan="6" style="font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${currentRole === 'admin' ? '🛡️ Administrators' : '👨‍💻 Staff Members'}</td>`;
      tbody.appendChild(groupTr);
    }
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td><strong>${u.username}</strong></td>
      <td>${u.name}</td>
      <td>${u.department}</td>
      <td><span class="badge ${u.role === 'admin' ? 'badge-working' : 'badge-vendor'}">${u.role.toUpperCase()}</span></td>
      <td>
        ${u.username !== 'admin' ? `<button class="btn btn-danger" onclick="deleteUser(${u.id})" style="padding: 4px 8px; font-size: 11px;">ลบผู้ใช้</button>` : `<span style="font-size: 11px; color: var(--text-muted);">ระบบหลัก</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteUser = async function(id) {
  if (!confirm('คุณต้องการลบผู้ใช้นี้ออกจากระบบใช่หรือไม่?')) return;
  try {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (res.ok) {
      showToast('ลบผู้ใช้สำเร็จแล้ว', 'success');
      refreshData();
    } else {
      const err = await res.json();
      showToast(err.error || 'ไม่สามารถลบผู้ใช้ได้', 'error');
    }
  } catch (error) {
    console.error('Delete user error:', error);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  }
};

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
      groupTr.style.background = 'rgba(255, 255, 255, 0.1)';
      groupTr.innerHTML = `<td colspan="5" style="font-weight: bold; text-transform: uppercase; color: var(--primary);">${currentType}</td>`;
      tbody.appendChild(groupTr);
    }
    const tr = document.createElement('tr');
    const tdId = document.createElement('td');
    tdId.innerHTML = String(c.id);

    const tdType = document.createElement('td');
    tdType.innerHTML = `<strong>${c.type}</strong>`;

    const tdValue = document.createElement('td');
    tdValue.textContent = c.value;

    const tdDetails = document.createElement('td');
    tdDetails.innerHTML = `<div style="word-wrap: break-word; white-space: pre-wrap; max-width: 400px;">${c.details || '-'}</div>`;

    const tdActions = document.createElement('td');

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary';
    editBtn.style.padding = '4px 8px';
    editBtn.style.fontSize = '11px';
    editBtn.textContent = 'แก้ไข';
    editBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      window.editConfig(c.id, c.type, c.value, c.details || '');
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.style.padding = '4px 8px';
    deleteBtn.style.fontSize = '11px';
    deleteBtn.textContent = 'ลบ';
    deleteBtn.addEventListener('click', async (event) => {
      event.stopPropagation();
      await window.deleteConfig(c.id);
    });

    tdActions.appendChild(editBtn);
    tdActions.appendChild(deleteBtn);

    tr.appendChild(tdId);
    tr.appendChild(tdType);
    tr.appendChild(tdValue);
    tr.appendChild(tdDetails);
    tr.appendChild(tdActions);
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
