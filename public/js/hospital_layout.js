/**
 * ClaimIT Hospital Building & Floor Directory (Client-Side Layout Engine)
 * Defines the hospital towers, floors, service zones, and department points
 * WITHOUT altering any database rows.
 */

const HOSPITAL_LAYOUT = [
  {
    building: 'Building 1: Main Hospital Tower',
    buildingCode: 'B1',
    floors: [
      {
        floor: 'Floor 21',
        floorCode: '21',
        zone: 'หอสังเกตอาการ',
        departments: ['Observation Ward (Observ)']
      },
      {
        floor: 'Floor 20',
        floorCode: '20',
        zone: 'หอผู้ป่วยใน',
        departments: ['Ward 20']
      },
      {
        floor: 'Floor 19',
        floorCode: '19',
        zone: 'ศูนย์เฉพาะทาง (หัวใจ, URO, เบาหวาน)',
        departments: ['ศูนย์หัวใจ', 'ศูนย์เบาหวาน', 'URO', 'ต้อนรับ URO DM', 'เจาะเลือด DM', 'เภสัชกรรม', 'การเงิน OPD']
      },
      {
        floor: 'Floor 18',
        floorCode: '18',
        zone: 'ศูนย์ตรวจสุขภาพ & เต้านม',
        departments: ['Check Up', 'Check Up Corporate', 'ศูนย์เต้านม', 'ต้อนรับ Check Up', 'เจาะเลือด ทั่วไป', 'เจาะเลือด Corporate', 'พิมพ์ผล', 'X-Ray', 'X-Ray Corporate', 'เภสัชกรรม', 'การเงิน OPD']
      },
      {
        floor: 'Floor 17',
        floorCode: '17',
        zone: 'หอผู้ป่วยใน & มะเร็ง',
        departments: ['Ward 17 (AP Ward)', 'ศูนย์มะเร็ง']
      },
      {
        floor: 'Floor 16',
        floorCode: '16',
        zone: 'เวชศาสตร์ฟื้นฟู & ไตเทียม',
        departments: ['กายภาพบำบัด', 'ไตเทียม']
      },
      {
        floor: 'Floor 15',
        floorCode: '15',
        zone: 'หอผู้ป่วยใน',
        departments: ['Ward 15 (AP Ward)']
      },
      {
        floor: 'Floor 14',
        floorCode: '14',
        zone: 'ตา เลสิก & ศูนย์ความงาม',
        departments: ['ศูนย์ตาและเลสิก', 'ศูนย์ความงาม', 'ศูนย์สุขภาพเพศ (Look Like Love / Love Live Center)', 'PWA', 'ต้อนรับ PWA', 'Nurse Case', 'เภสัชกรรม', 'การเงิน OPD']
      },
      {
        floor: 'Floor 12',
        floorCode: '12',
        zone: 'หอผู้ป่วยใน',
        departments: ['Ward 12 (AP Ward)']
      },
      {
        floor: 'Floor 11',
        floorCode: '11',
        zone: 'หอผู้ป่วยใน',
        departments: ['Ward 11 (AP Ward)']
      },
      {
        floor: 'Floor 10',
        floorCode: '10',
        zone: 'หอผู้ป่วยใน',
        departments: ['Ward 10 (AP Ward)']
      },
      {
        floor: 'Floor 9',
        floorCode: '9',
        zone: 'หอผู้ป่วยใน',
        departments: ['Ward 9 (AP Ward)']
      },
      {
        floor: 'Floor 8',
        floorCode: '8',
        zone: 'หอผู้ป่วยใน',
        departments: ['Ward 8 (AP Ward)']
      },
      {
        floor: 'Floor 7',
        floorCode: '7',
        zone: 'หอผู้ป่วยใน & เด็กสุขภาพดี',
        departments: ['Ward 7 (AP Ward)', 'Well Baby']
      },
      {
        floor: 'Floor 6',
        floorCode: '6',
        zone: 'สูติ-นรีเวชกรรม & สำนักงานสนับสนุน',
        departments: ['ห้องคลอด', 'Nursery', 'ART', 'การตลาด', 'บริหารธุรกิจ (Biz Admin)', 'บัญชี', 'สนับสนุนการเงิน']
      },
      {
        floor: 'Floor 5',
        floorCode: '5',
        zone: 'ฝ่ายบริหาร & การพยาบาล',
        departments: [
          'สำนักงาน ผอ.รพ.', 'ห้องรับรอง ผอ.รพ.', 'สำนักงาน ผอ.แพทย์', 'ห้อง ผอ.แพทย์', 'สำนักงาน ผอ.บริหาร', 'ห้อง ผอ.การตลาด', 'ห้องพักแพทย์', 'ฝ่ายการพยาบาล', 'บุคคล', 'ธุรการ', 'เวชสถิติ', 'ประกันสัมพันธ์', 'บริหารลูกค้าองค์กร',
          'QMS', 'QMS สำนักงาน ผอ.รพ.', 'QMS (UR OPD)', 'UR OPD', 'Nurse Case', 'IC', 'IMC', 'New Normal', 'Tele Care',
          'Training Room (Design Thinking)', 'We Before Me', 'We Can'
        ]
      },
      {
        floor: 'Floor 4',
        floorCode: '4',
        zone: 'อายุรกรรม, เด็ก & ARI',
        departments: [
          'ศูนย์สุขภาพเด็ก', 'ต้อนรับศูนย์สุขภาพเด็ก', 'ต้อนรับห้องเด็ก', 'คลินิกนมแม่', 'เภสัชกรรมเด็ก',
          'ARI', 'ต้อนรับ ARI', 'ห้องยา ARI', 'การเงิน ARI', 'อายุรกรรม', 'EENT', 'ต้อนรับ EENT', 'เจาะเลือด', 'รับ-ส่ง',
          'IT', 'Fax Claim', 'UR Nurse', 'การเงิน OPD', 'การเงิน IPD'
        ]
      },
      {
        floor: 'Floor 3',
        floorCode: '3',
        zone: 'วิกฤต & หัตถการขั้นสูง',
        departments: ['ห้องผ่าตัด', 'ห้องพักแพทย์ ICU', 'ICU 1', 'ICU 3', 'PICU', 'Cath Lab', 'ไตเทียม', 'วิสัญญี', 'CSSD', 'N-Health']
      },
      {
        floor: 'Floor 2',
        floorCode: '2',
        zone: 'ผู้ป่วยนอกเฉพาะทาง',
        departments: [
          'ศูนย์ระบบทางเดินอาหาร', 'ต้อนรับ GI', 'ศูนย์สุขภาพหญิง', 'ต้อนรับศูนย์สุขภาพหญิง', 'ห้องปฏิบัติการหญิง', 'ศูนย์ผู้มีบุตรยาก', 'ศูนย์สมองและระบบประสาท', 'ทันตกรรม', 'คลังสุขภาพ', 'เวชระเบียน (ขอประวัติ)', 'เจาะเลือด', 'เภสัชกรรม (Current)', 'การเงิน'
        ]
      },
      {
        floor: 'Floor 1',
        floorCode: '1',
        zone: 'ฉุกเฉิน, คัดกรอง & จุดแรกรับ',
        departments: [
          'ฉุกเฉิน (ER)', 'รับ-ส่ง ER', 'EMTB', 'รักษาความปลอดภัย', 'ยานพาหนะ',
          'ต้อนรับหน้ารพ.', 'คัดกรองอาการ', 'ต้อนรับฉุกเฉิน', 'ต้อนรับจองห้อง', 'เวชระเบียน', 'Operator', 'บูธการตลาด',
          'ศัลยกรรม', 'MSK', 'X-Ray', 'เจาะเลือด (62)', 'เภสัชกรรม (2 จุด)',
          'Food House', 'โภชนาการ', 'การเงิน OPD'
        ]
      },
      {
        floor: 'Floor B',
        floorCode: 'B',
        zone: 'สนับสนุน & โครงสร้างพื้นฐาน',
        departments: ['วิศวกรรม', 'พัสดุ', 'เวชระเบียน', 'รักษาความปลอดภัย']
      },
      {
        floor: 'Floor D',
        floorCode: 'D',
        zone: 'ซ่อมบำรุง & บริการทั่วไป',
        departments: ['คลังยา', 'บริหารทรัพย์สิน', 'ช่างศิลป์', 'แม่บ้าน']
      }
    ]
  },
  {
    building: 'Call Center Buildings',
    buildingCode: 'CC',
    subBuildings: [
      {
        name: 'Call Center (Old Building)',
        code: 'CC-OLD',
        floors: [
          {
            floor: 'Floor 1',
            departments: ['Foreigner Customer Service', 'Product Receive & Send']
          },
          {
            floor: 'Floor 2',
            departments: ['Translators']
          }
        ]
      },
      {
        name: 'Call Center (New Building)',
        code: 'CC-NEW',
        floors: [
          {
            floor: 'Mezzanine / Float Floor',
            departments: ['Manager']
          },
          {
            floor: 'Floor 4',
            departments: ['Employees']
          },
          {
            floor: 'Floor 3',
            departments: ['Employees']
          },
          {
            floor: 'Floor 2',
            departments: ['Employees']
          },
          {
            floor: 'Floor 1',
            departments: ['Executive / Boss Office']
          }
        ]
      }
    ]
  }
];

window.HOSPITAL_LAYOUT = HOSPITAL_LAYOUT;

// Target input ID when picking department from layout modal
let hospitalPickerTargetInputId = null;

/**
 * Injects datalist options into the DOM for input autocompletion
 */
function setupHospitalLayoutDatalist(passedConfigs = null) {
  let datalist = document.getElementById('hospital-locations-datalist');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'hospital-locations-datalist';
    document.body.appendChild(datalist);
  }
  
  const options = [];
  HOSPITAL_LAYOUT.forEach(b => {
    if (b.floors) {
      b.floors.forEach(f => {
        f.departments.forEach(d => {
          options.push(`Building 1, ${f.floor} — ${d}`);
        });
      });
    }
    if (b.subBuildings) {
      b.subBuildings.forEach(sb => {
        sb.floors.forEach(f => {
          f.departments.forEach(d => {
            options.push(`${sb.name}, ${f.floor} — ${d}`);
          });
        });
      });
    }
  });

  // Merge custom registered locations from configs (or state.configs)
  const configsToUse = passedConfigs || (window.state && window.state.configs) || [];
  if (Array.isArray(configsToUse)) {
    configsToUse.filter(c => c.type === 'location').forEach(loc => {
      if (loc.value && !options.includes(loc.value)) {
        options.push(loc.value);
      }
    });
  }

  // Merge custom departments from localStorage if present
  try {
    const customDepts = JSON.parse(localStorage.getItem('claimit_custom_departments') || '[]');
    if (Array.isArray(customDepts)) {
      customDepts.forEach(cd => {
        if (cd && !options.includes(cd)) {
          options.push(cd);
        }
      });
    }
  } catch (e) {}

  datalist.innerHTML = options.map(opt => `<option value="${escapeHtml(opt)}"></option>`).join('');

  // Auto-connect datalist to location inputs across forms
  const inputsToWire = ['new-location', 'batch-location', 'profile-department', 'new-user-dept', 'edit-user-department'];
  inputsToWire.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.getAttribute('list')) {
      el.setAttribute('list', 'hospital-locations-datalist');
    }
  });
}
window.setupHospitalLayoutDatalist = setupHospitalLayoutDatalist;

/**
 * Renders the full directory table into a container
 */
function renderHospitalLayoutView(containerId = 'hospital-layout-content-area', searchQuery = '') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const query = (searchQuery || '').trim().toLowerCase();

  let html = `
    <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div style="font-size: 13px; color: var(--text-muted);">
        📋 คลิกที่ป้ายชื่อแผนก/จุดบริการเพื่อนำไปใช้ในแบบฟอร์ม หรือคัดลอกลงคลิปบอร์ด
      </div>
      <div style="display: flex; gap: 6px; align-items: center;">
        <input type="text" id="hospital-layout-search-input" class="form-control" placeholder="🔍 ค้นหาชั้น, แผนก หรือโซน..." value="${escapeHtml(searchQuery)}" oninput="filterHospitalLayout(this.value, '${containerId}')" style="font-size: 12px; padding: 4px 10px; width: 220px;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="filterHospitalLayout('', '${containerId}')">ล้างค้นหา</button>
      </div>
    </div>
  `;

  // 1. Building 1: Main Hospital Tower
  const b1 = HOSPITAL_LAYOUT[0];
  let b1Rows = '';
  b1.floors.forEach(f => {
    const matchedDepts = query ? f.departments.filter(d => 
      d.toLowerCase().includes(query) || 
      f.floor.toLowerCase().includes(query) || 
      (f.zone && f.zone.toLowerCase().includes(query))
    ) : f.departments;

    if (query && matchedDepts.length === 0 && !f.floor.toLowerCase().includes(query) && (!f.zone || !f.zone.toLowerCase().includes(query))) {
      return; // Skip non-matching row during search
    }

    const deptBadges = (query && matchedDepts.length > 0 ? matchedDepts : f.departments).map(d => {
      const locString = `Building 1, ${f.floor} — ${d}`;
      return `<button type="button" class="dept-picker-badge" onclick="selectDepartmentLocation('${escapeHtml(locString)}')" title="คลิกเพื่อเลือก: ${escapeHtml(locString)}" style="display: inline-block; margin: 2px 4px 2px 0; padding: 2px 7px; background: rgba(59, 130, 246, 0.12); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 4px; font-size: 11.5px; cursor: pointer; text-align: left; transition: all 0.15s ease;">📍 ${escapeHtml(d)}</button>`;
    }).join(' ');

    b1Rows += `
      <tr>
        <td style="white-space: nowrap; font-weight: 700; color: var(--primary);"><span style="display: inline-block; padding: 2px 6px; background: rgba(37,99,235,0.08); border-radius: 4px;">${escapeHtml(f.floor)}</span></td>
        <td style="font-size: 12px; font-weight: 600; color: var(--text); min-width: 180px;">${escapeHtml(f.zone || '-')}</td>
        <td style="font-size: 12px; line-height: 1.6;">${deptBadges}</td>
      </tr>
    `;
  });

  html += `
    <div class="card" style="margin-bottom: 16px; border: 1px solid var(--border-subtle);">
      <div class="card-header" style="background: rgba(37,99,235,0.04); padding: 10px 14px;">
        <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #1d4ed8;">🏢 ${escapeHtml(b1.building)} (21 ชั้น + ชั้น B, D)</h4>
      </div>
      <div class="table-container" style="max-height: 480px; overflow-y: auto;">
        <table style="width: 100%; font-size: 12.5px;">
          <thead>
            <tr>
              <th style="width: 110px;">ชั้น (Floor)</th>
              <th style="width: 220px;">โซนบริการหลัก</th>
              <th>แผนก / จุดบริการ</th>
            </tr>
          </thead>
          <tbody>
            ${b1Rows || '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 14px;">ไม่พบแผนกที่ตรงกับคำค้นหา</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // 2. Call Center Buildings
  const cc = HOSPITAL_LAYOUT[1];
  let ccHtml = `
    <div class="card" style="margin-bottom: 16px; border: 1px solid var(--border-subtle);">
      <div class="card-header" style="background: rgba(16,185,129,0.04); padding: 10px 14px;">
        <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #047857;">📞 ${escapeHtml(cc.building)}</h4>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 12px 14px;">
  `;

  cc.subBuildings.forEach(sb => {
    let sbRows = '';
    sb.floors.forEach(f => {
      const matchedDepts = query ? f.departments.filter(d => 
        d.toLowerCase().includes(query) || 
        f.floor.toLowerCase().includes(query) || 
        sb.name.toLowerCase().includes(query)
      ) : f.departments;

      if (query && matchedDepts.length === 0 && !f.floor.toLowerCase().includes(query) && !sb.name.toLowerCase().includes(query)) {
        return;
      }

      const badges = (query && matchedDepts.length > 0 ? matchedDepts : f.departments).map(d => {
        const locString = `${sb.name}, ${f.floor} — ${d}`;
        return `<button type="button" class="dept-picker-badge" onclick="selectDepartmentLocation('${escapeHtml(locString)}')" title="คลิกเพื่อเลือก: ${escapeHtml(locString)}" style="display: inline-block; margin: 2px 4px 2px 0; padding: 2px 7px; background: rgba(16, 185, 129, 0.12); color: #065f46; border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 4px; font-size: 11.5px; cursor: pointer; transition: all 0.15s ease;">📍 ${escapeHtml(d)}</button>`;
      }).join(' ');

      sbRows += `
        <tr>
          <td style="white-space: nowrap; font-weight: 700; color: #047857; width: 140px;"><span style="display: inline-block; padding: 2px 6px; background: rgba(16,185,129,0.08); border-radius: 4px;">${escapeHtml(f.floor)}</span></td>
          <td style="font-size: 12px; line-height: 1.6;">${badges}</td>
        </tr>
      `;
    });

    ccHtml += `
      <div style="border: 1px solid var(--border-subtle); border-radius: 6px; overflow: hidden;">
        <div style="padding: 8px 12px; background: var(--surface-subtle); font-weight: 700; font-size: 13px; color: var(--text);">
          🏬 ${escapeHtml(sb.name)}
        </div>
        <table style="width: 100%; font-size: 12px; margin-bottom: 0;">
          <tbody>
            ${sbRows || '<tr><td colspan="2" style="text-align: center; color: var(--text-muted); padding: 10px;">ไม่พบข้อมูลที่ตรงกับคำค้นหา</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  });

  ccHtml += `</div></div>`;
  html += ccHtml;

  // 3. Registered & Custom Locations
  const customLocations = (window.state && Array.isArray(window.state.configs)) ? window.state.configs.filter(c => c.type === 'location') : [];
  if (customLocations.length > 0) {
    let customBadges = customLocations
      .filter(cl => !query || cl.value.toLowerCase().includes(query) || (cl.details && cl.details.toLowerCase().includes(query)))
      .map(cl => {
        const titleText = cl.details ? `${cl.value} (${cl.details})` : cl.value;
        return `<button type="button" class="dept-picker-badge" onclick="selectDepartmentLocation('${escapeHtml(cl.value)}')" title="คลิกเพื่อเลือก: ${escapeHtml(titleText)}" style="display: inline-block; margin: 2px 4px 2px 0; padding: 2px 7px; background: rgba(139, 92, 246, 0.12); color: #6d28d9; border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 4px; font-size: 11.5px; cursor: pointer; transition: all 0.15s ease;">📍 ${escapeHtml(cl.value)}</button>`;
      }).join(' ');

    if (customBadges) {
      html += `
        <div class="card" style="margin-bottom: 16px; border: 1px solid var(--border-subtle);">
          <div class="card-header" style="background: rgba(139, 92, 246, 0.04); padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: #6d28d9;">📍 แผนกและสถานที่เพิ่มเติมที่ลงทะเบียนในระบบ (Custom & Registered Wards)</h4>
            <button type="button" class="btn btn-sm btn-secondary" onclick="openAddConfigModalWithType('location')" style="font-size: 11.5px; padding: 2px 8px;">➕ เพิ่มแผนกใหม่</button>
          </div>
          <div style="padding: 12px 14px; line-height: 1.6;">
            ${customBadges}
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}

/**
 * Filter layout during search input
 */
function filterHospitalLayout(val, containerId) {
  renderHospitalLayoutView(containerId, val);
}
window.filterHospitalLayout = filterHospitalLayout;

/**
 * Handles clicking a department badge
 */
function selectDepartmentLocation(locString) {
  if (hospitalPickerTargetInputId) {
    const targetInput = document.getElementById(hospitalPickerTargetInputId);
    if (targetInput) {
      targetInput.value = locString;
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      targetInput.dispatchEvent(new Event('change', { bubbles: true }));
      showToast(`เลือกสถานที่ติดตั้ง: ${locString}`, 'success', 2500);
    }
    closeHospitalLayoutModal();
  } else {
    // Copy to clipboard if not in picker mode
    navigator.clipboard.writeText(locString).then(() => {
      showToast(`คัดลอกสถานที่: ${locString}`, 'info', 2000);
    }).catch(() => {
      showToast(`สถานที่: ${locString}`, 'info', 2000);
    });
  }
}
window.selectDepartmentLocation = selectDepartmentLocation;

/**
 * Opens the Hospital Layout Modal
 */
function openHospitalLayoutModal(targetInputId = null) {
  hospitalPickerTargetInputId = targetInputId;
  const modal = document.getElementById('hospital-layout-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  renderHospitalLayoutView('hospital-modal-layout-content', '');
  
  const searchInput = document.getElementById('hospital-layout-search-input');
  if (searchInput) {
    searchInput.focus();
  }
}
window.openHospitalLayoutModal = openHospitalLayoutModal;

/**
 * Closes the Hospital Layout Modal
 */
function closeHospitalLayoutModal() {
  const modal = document.getElementById('hospital-layout-modal');
  if (modal) modal.style.display = 'none';
  hospitalPickerTargetInputId = null;
}
window.closeHospitalLayoutModal = closeHospitalLayoutModal;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupHospitalLayoutDatalist();
    const configLayoutArea = document.getElementById('hospital-layout-content-area');
    if (configLayoutArea) renderHospitalLayoutView('hospital-layout-content-area');
  });
} else {
  setupHospitalLayoutDatalist();
  const configLayoutArea = document.getElementById('hospital-layout-content-area');
  if (configLayoutArea) renderHospitalLayoutView('hospital-layout-content-area');
}
