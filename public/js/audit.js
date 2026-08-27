/**
 * ClaimIT Frontend - Audit Logs & System Statistics Module
 * Handles time-span presets (today, 7d, 30d), date-range filtering,
 * live search, daily case volume metrics, and tracking code table displays.
 */

// Audit Logs Time-Span & Volume Controls
function setupAuditToolbar() {
  const spanGroup = document.getElementById('audit-time-span-group');
  if (spanGroup) {
    spanGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.time-span-btn');
      if (!btn) return;
      const span = btn.getAttribute('data-span');
      filterAuditSpan(span);
    });
  }

  const btnFilterRange = document.getElementById('btn-filter-date-range');
  if (btnFilterRange) {
    btnFilterRange.addEventListener('click', () => {
      const start = document.getElementById('audit-start-date').value;
      const end = document.getElementById('audit-end-date').value;
      state.auditFilter.timeSpan = '';
      state.auditFilter.startDate = start;
      state.auditFilter.endDate = end;
      if (spanGroup) {
        spanGroup.querySelectorAll('.time-span-btn').forEach(b => b.classList.remove('active'));
      }
      fetchAuditLogs();
    });
  }

  const searchInput = document.getElementById('audit-search-input');
  let searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.auditFilter.search = e.target.value.trim();
        fetchAuditLogs();
      }, 300);
    });
  }
}

function filterAuditSpan(span) {
  state.auditFilter.timeSpan = span;
  state.auditFilter.startDate = '';
  state.auditFilter.endDate = '';
  const group = document.getElementById('audit-time-span-group');
  if (group) {
    group.querySelectorAll('.time-span-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-span') === span);
    });
  }
  fetchAuditLogs();
}

async function loadAuditSummary() {
  try {
    const res = await fetch('/api/audit-summary', { headers: getAuthHeaders() });
    if (!res.ok) return;
    const summary = await res.json();

    const badgeSidebar = document.getElementById('sidebar-volume-badge');
    const descSidebar = document.getElementById('sidebar-volume-desc');
    const badgeMain = document.getElementById('audit-volume-badge-main');
    const textMain = document.getElementById('audit-volume-text');
    const peakText = document.getElementById('audit-peak-text');

    const count = summary.today_cases || 0;
    const isBusy = summary.is_today_busy;

    if (badgeSidebar) {
      badgeSidebar.textContent = `${count} รายการ`;
      badgeSidebar.className = `audit-volume-badge ${isBusy ? 'audit-volume-busy' : 'audit-volume-normal'}`;
    }
    if (descSidebar) {
      descSidebar.innerHTML = isBusy 
        ? `⚡ <strong>กิจกรรมหนาแน่นเป็นพิเศษ!</strong> มีการดำเนินการถึง ${count} รายการในวันนี้`
        : `ระดับกิจกรรมปกติ มีการดำเนินการ ${count} รายการในวันนี้`;
    }
    if (badgeMain) {
      badgeMain.textContent = `${count} รายการวันนี้`;
      badgeMain.className = `audit-volume-badge ${isBusy ? 'audit-volume-busy' : 'audit-volume-normal'}`;
    }
    if (textMain) {
      textMain.innerHTML = isBusy
        ? `⚡ <strong>กิจกรรมหนาแน่นเป็นพิเศษ:</strong> วันนี้มีการดำเนินการรวม <span style="color:#f87171">${count}</span> รายการ`
        : `สถิติกิจกรรมวันนี้: มีการบันทึกการเปลี่ยนแปลง ${count} รายการ`;
    }
    if (peakText && summary.peak_day) {
      peakText.innerHTML = `สถิติ 30 วัน: วันที่มีกิจกรรมสูงสุดคือ <strong>${summary.peak_day.date}</strong> (${summary.peak_day.count} รายการ)`;
    }
  } catch (err) {
    console.error('Failed to load audit summary:', err);
  }
}

async function fetchAuditLogs() {
  try {
    const q = new URLSearchParams();
    if (state.auditFilter.timeSpan && state.auditFilter.timeSpan !== 'all') {
      q.append('timeSpan', state.auditFilter.timeSpan);
    }
    if (state.auditFilter.startDate) q.append('startDate', state.auditFilter.startDate);
    if (state.auditFilter.endDate) q.append('endDate', state.auditFilter.endDate);
    if (state.auditFilter.search) q.append('search', state.auditFilter.search);
    q.append('limit', state.auditFilter.limit || 100);

    const res = await fetch(`/api/audit-logs?${q.toString()}`, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const logs = data.logs || (Array.isArray(data) ? data : []);
    populateAuditTable(logs);
  } catch (err) {
    console.error('Failed to fetch audit logs:', err);
  }
}

function populateAuditTable(logs) {
  const tbody = document.getElementById('audit-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!logs || logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">ไม่พบรายการบันทึกประวัติตามเงื่อนไขที่ระบุ</td></tr>';
    return;
  }

  logs.forEach(log => {
    const d = new Date(log.timestamp);
    const ceYear = d.getFullYear();
    const beYear = ceYear + 543;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const time = `${day}/${month}/${beYear} (${ceYear}) ${hours}:${mins}`;
    
    let dirClass = 'badge-working';
    if (log.moved_direction === 'OUT') dirClass = 'badge-broken';
    else if (log.moved_direction === 'STATE_CHANGE') dirClass = 'badge-vendor';

    const logCodeHtml = log.log_code 
      ? `<span class="log-code-chip" onclick="copyTrackingCode('${log.log_code}')" title="คลิกเพื่อคัดลอกรหัสติดตาม">📋 ${log.log_code}</span>` 
      : '<span style="color:var(--text-muted); font-size:11px;">-</span>';
    
    tr.innerHTML = `
      <td>${logCodeHtml}</td>
      <td style="white-space: nowrap; font-size: 12px;">${time}</td>
      <td><strong>${log.asset_tag}</strong></td>
      <td>${log.department_name || '-'}</td>
      <td>${log.status || '-'}</td>
      <td><span class="badge ${dirClass}">${log.moved_direction}</span></td>
      <td>${log.action_by_username || '-'}</td>
      <td style="font-size: 12px; color: var(--text-muted);">${log.details || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function updateStatistics(fallbackAssets) {
  const totalEl = document.getElementById('stat-total-assets');
  const workEl = document.getElementById('stat-working-assets');
  const brokenEl = document.getElementById('stat-broken-assets');
  const vendorEl = document.getElementById('stat-vendor-claims');

  try {
    const res = await fetch('/api/assets/summary', { headers: getAuthHeaders() });
    if (res.ok) {
      const summary = await res.json();
      if (totalEl) totalEl.textContent = summary.total;
      if (workEl) workEl.textContent = summary.working;
      if (brokenEl) brokenEl.textContent = summary.broken;
      if (vendorEl) vendorEl.textContent = summary.pending_pickup;
      return;
    }
  } catch (e) {
    console.warn('Could not fetch asset summary, using fallback:', e);
  }

  // Fallback to local array
  const assets = fallbackAssets || [];
  const total = state.pagination.total || assets.length;
  const working = assets.filter(a => a.status === 'Working').length;
  const broken = assets.filter(a => a.status === 'Broken').length;
  const atVendor = assets.filter(a => a.status === 'Pending Pickup').length;
  
  if (totalEl) totalEl.textContent = total;
  if (workEl) workEl.textContent = working;
  if (brokenEl) brokenEl.textContent = broken;
  if (vendorEl) vendorEl.textContent = atVendor;
}
