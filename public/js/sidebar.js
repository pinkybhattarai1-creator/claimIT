/**
 * ClaimIT Frontend - Quick-Check Sidebar Controller
 * Handles the slide-out drawer, today's case volume trigger,
 * recent scans caching, vendor hotlines, and instant Excel/CSV downloads.
 */

function setupQuickSidebar() {
  const sidebar = document.getElementById('quick-sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const closeBtn = document.getElementById('close-sidebar-btn');
  const viewTodayBtn = document.getElementById('btn-sidebar-view-today');
  const exportExcelBtn = document.getElementById('btn-sidebar-export-excel');
  const exportExcelHeader = document.getElementById('btn-export-excel-header');
  const exportExcelMain = document.getElementById('btn-export-excel-main');
  const exportCsvBtn = document.getElementById('btn-sidebar-export-csv');
  const exportAuditCsvBtn = document.getElementById('btn-export-audit-csv');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      loadAuditSummary();
    });
  }
  if (closeBtn && sidebar) {
    closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));
  }

  function downloadExcel() {
    showToast('กำลังส่งออก Microsoft Excel ทั้งระบบ (.xls)...', 'info');
    window.location.href = '/api/export/excel';
  }

  if (exportExcelBtn) exportExcelBtn.addEventListener('click', downloadExcel);
  if (exportExcelHeader) exportExcelHeader.addEventListener('click', downloadExcel);
  if (exportExcelMain) exportExcelMain.addEventListener('click', downloadExcel);

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      showToast('กำลังดาวน์โหลด CSV ข้อมูลครุภัณฑ์...', 'info');
      window.location.href = '/api/export/assets.csv';
    });
  }

  if (exportAuditCsvBtn) {
    exportAuditCsvBtn.addEventListener('click', () => {
      showToast('กำลังดาวน์โหลดรายงานบันทึกประวัติ...', 'info');
      window.location.href = '/api/export/excel';
    });
  }

  if (viewTodayBtn) {
    viewTodayBtn.addEventListener('click', () => {
      if (state.user && state.user.role === 'admin') {
        switchView('it');
      }
      if (sidebar) sidebar.classList.remove('open');
      filterAuditSpan('today');
      const auditTable = document.getElementById('audit-table-body');
      if (auditTable) auditTable.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

function addRecentScan(asset) {
  if (!asset || !asset.asset_tag) return;
  state.recentScans = [asset, ...state.recentScans.filter(a => a.asset_tag !== asset.asset_tag)].slice(0, 5);
  renderSidebarRecentScans();
}

function renderSidebarRecentScans() {
  const container = document.getElementById('sidebar-recent-scans');
  if (!container) return;
  if (!state.recentScans || state.recentScans.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">ยังไม่มีประวัติการสแกนในเซสชันนี้</div>';
    return;
  }
  container.innerHTML = '';
  state.recentScans.forEach(a => {
    const item = document.createElement('div');
    item.style.cssText = 'padding: 6px 10px; background: rgba(255,255,255,0.05); border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;';
    item.innerHTML = `
      <div>
        <div style="font-weight: 700; color: #38bdf8;">${a.asset_tag}</div>
        <div style="font-size: 10px; color: var(--text-muted);">${a.device_name || ''}</div>
      </div>
      <span style="font-size: 10px;">${getStatusBadgeHTML(a)}</span>
    `;
    item.addEventListener('click', () => {
      const prefix = state.activeView === 'ward' ? 'ward' : 'it';
      const input = document.getElementById(`${prefix}-search-input`);
      if (input) input.value = a.asset_tag;
      lookupAsset(a.asset_tag);
    });
    container.appendChild(item);
  });
}
