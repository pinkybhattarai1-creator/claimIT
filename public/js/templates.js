/**
 * ClaimIT Frontend - Official Print & PDF Template Center
 * Handles document rendering, multi-template switching, live preview,
 * and client-side PDF document downloads.
 */

let currentTemplateAsset = null;

// HTML Sanitizer for Document Templates
function esc(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Dynamic Hospital Configuration Provider with Safe Defaults
function getHospitalConfig() {
  const fallback = {
    fullName: 'โรงพยาบาล (Hospital IT Department)',
    shortName: 'หน่วยงานโรงพยาบาล',
    address: 'แผนกสนับสนุนเทคโนโลยีสารสนเทศ',
    fullAddress: 'แผนกสนับสนุนเทคโนโลยีสารสนเทศ โรงพยาบาล',
    phone: '02-xxx-xxxx ต่อ 1234',
    contactPerson: 'แผนกเทคโนโลยีสารสนเทศ',
    email: 'it_support@hospital.local'
  };
  if (window.claimitHospitalConfig) {
    return { ...fallback, ...window.claimitHospitalConfig };
  }
  return fallback;
}

function getVendorConfig(asset) {
  const vendorName = (asset && asset.vendor_name) ? asset.vendor_name : 'ศูนย์บริการคู่ค้าที่ได้รับอนุญาต (Authorized Service Center)';
  return {
    name: vendorName,
    branch: 'สำนักงานใหญ่ / ศูนย์บริการมาตรฐาน',
    department: 'ฝ่ายบริการและเคลมสินค้า (Claim & Technical Support)',
    address: 'อาคารศูนย์บริการและวิศวกรรมคอมพิวเตอร์ กรุงเทพมหานคร',
    phone: '02-xxx-xxxx',
    email: 'service@authorized-vendor.local',
    website: 'www.authorized-vendor.local'
  };
}

// PDF Download
window.downloadPDF = async function(assetTag) {
  if (!state.user || !state.user.token) {
    showToast('กรุณาเข้าสู่ระบบก่อนดาวน์โหลด PDF', 'warning');
    return;
  }
  try {
    const res = await fetch(`/api/assets/${encodeURIComponent(assetTag)}/pdf`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('PDF generation failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claim_${assetTag}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`ดาวน์โหลดเอกสาร PDF สำเร็จ (${assetTag})`, 'success');
  } catch (err) {
    console.error('PDF download error:', err);
    showToast('ไม่สามารถดาวน์โหลด PDF ได้', 'error');
  }
};

// ============================================================================
// OFFICIAL PRINT TEMPLATES ENGINE (Hospital Work Orders & RMA Vouchers)
// Pixel-Perfect Clean Thai Layouts
// ============================================================================

window.openTemplateCenter = function(assetTag) {
  const tag = (assetTag || (state.selectedAsset ? state.selectedAsset.asset_tag : '')).trim();
  if (!tag) {
    showToast('กรุณาระบุหรือเลือกครุภัณฑ์ก่อนเปิดแบบฟอร์ม', 'warning');
    return;
  }

  if (state.selectedAsset && state.selectedAsset.asset_tag.toUpperCase() === tag.toUpperCase()) {
    currentTemplateAsset = state.selectedAsset;
    initAndShowTemplateModal();
  } else {
    // Fetch asset details first
    fetch(`/api/assets/${encodeURIComponent(tag)}`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(asset => {
        currentTemplateAsset = asset;
        initAndShowTemplateModal();
      })
      .catch(err => {
        console.error('Failed to load asset for template:', err);
        showToast('ไม่สามารถโหลดข้อมูลครุภัณฑ์สำหรับสร้างแบบฟอร์มได้', 'error');
      });
  }
};

function initAndShowTemplateModal() {
  if (!currentTemplateAsset) return;
  const modal = document.getElementById('print-template-modal');
  if (!modal) return;

  // Pre-fill quick edit fields with clean Thai data
  const editJobNo = document.getElementById('edit-job-no');
  if (editJobNo) {
    editJobNo.value = currentTemplateAsset.vendor_rma_number || `RMA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const editContact = document.getElementById('edit-contact-name');
  if (editContact) {
    editContact.value = (state.user && state.user.name) ? state.user.name : 'เจ้าหน้าที่ไอที ประจำโรงพยาบาล';
  }

  const editPhone = document.getElementById('edit-contact-phone');
  if (editPhone) {
    const hosp = getHospitalConfig();
    editPhone.value = hosp.phone || '02-xxx-xxxx ต่อ 1234';
  }

  const editProb = document.getElementById('edit-problem-desc');
  if (editProb) {
    if (currentTemplateAsset.category === 'Printer' || (currentTemplateAsset.device_name || '').toLowerCase().includes('printer')) {
      editProb.value = 'พิมพ์เป็นเส้น / หัวพิมพ์ติดขัด (TM-Bit missing)';
    } else if (currentTemplateAsset.category === 'Scanner') {
      editProb.value = 'หัวอ่านสแกนเนอร์ไม่อ่านบาร์โค้ด / การเชื่อมต่อขาดหาย';
    } else {
      editProb.value = 'เครื่องเปิดไม่ติด / อุปกรณ์ฮาร์ดแวร์ทำงานผิดปกติ';
    }
  }

  const editTech = document.getElementById('edit-tech-name');
  if (editTech) {
    editTech.value = state.user ? state.user.name : 'ช่างเทคนิคไอที ประจำ รพ.';
  }

  modal.style.display = 'flex';
  renderActiveTemplate();
}

window.renderActiveTemplate = function() {
  const container = document.getElementById('printable-template-paper');
  const selector = document.getElementById('template-selector');
  if (!container || !selector || !currentTemplateAsset) return;

  const templateType = selector.value;
  const asset = currentTemplateAsset;

  const hosp = getHospitalConfig();
  const customData = {
    jobNo: (document.getElementById('edit-job-no')?.value || (`RMA-${new Date().getFullYear()}01-0001`)).trim(),
    contactName: (document.getElementById('edit-contact-name')?.value || (state.user?.name || 'เจ้าหน้าที่เทคโนโลยีสารสนเทศ')).trim(),
    contactPhone: (document.getElementById('edit-contact-phone')?.value || (hosp.phone || '02-xxx-xxxx')).trim(),
    problemDesc: (document.getElementById('edit-problem-desc')?.value || 'ฮาร์ดแวร์ทำงานผิดปกติ').trim(),
    techName: (document.getElementById('edit-tech-name')?.value || (state.user?.name || 'ช่างเทคนิคไอที')).trim(),
    solution: (document.getElementById('edit-solution')?.value || 'ตรวจสอบและส่งซ่อมตามขั้นตอนมาตรฐาน').trim(),
    todayFormatted: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    thaiYearDate: `${new Date().getDate()} / ${new Date().getMonth() + 1} / ${new Date().getFullYear() + 543}`
  };

  let html = '';
  switch (templateType) {
    case 'repair_order':
      html = renderRepairOrderHTML(asset, customData);
      break;
    case 'claim_888':
      html = render888ClaimHTML(asset, customData);
      break;
    case 'warranty_888':
      html = render888WarrantyHTML(asset, customData);
      break;
    case 'talent_delivery':
      html = renderTalentDeliveryHTML(asset, customData);
      break;
    case 'claimit_audit':
      html = renderClaimITComplianceHTML(asset, customData);
      break;
    default:
      html = renderRepairOrderHTML(asset, customData);
  }

  container.innerHTML = html;
};

// 1. TEMPLATE: ใบรับงานซ่อม / ใบรับเคลมสินค้า
function renderRepairOrderHTML(asset, data) {
  const isUnderWarranty = new Date(asset.warranty_end) >= new Date();
  const warrantyText = isUnderWarranty ? 'อยู่ในประกัน' : 'นอกประกัน';
  const hosp = getHospitalConfig();

  return `
    <div style="position:relative; width:100%;">
      <!-- Header Bar -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:6px;">
        <tr>
          <td style="vertical-align:bottom; width:55%;">
            <div style="font-size:18px; font-weight:800; color:#000; letter-spacing:-0.02em;">ใบรับงานซ่อม / ใบรับเคลมสินค้า</div>
          </td>
          <td style="vertical-align:top; width:45%; font-size:11px; text-align:right; line-height:1.4;">
            <div><strong>ประเภทการรับประกัน :</strong> <span style="border-bottom:1px dotted #000; padding:0 8px;">${esc(warrantyText)}</span></div>
            <div><strong>อ้างอิงเลขที่ Job . :</strong> <span style="border-bottom:1px dotted #000; padding:0 8px; font-weight:bold;">${esc(data.jobNo)}</span></div>
            <div><strong>วันที่รับแจ้งปัญหา :</strong> <span style="border-bottom:1px dotted #000; padding:0 8px;">${esc(data.todayFormatted)}</span></div>
          </td>
        </tr>
      </table>

      <!-- 1. รายละเอียดลูกค้า -->
      <div style="font-size:11.5px; font-weight:700; margin:4px 0 2px 0;">1. รายละเอียดลูกค้า</div>
      <div style="border:1px solid #000; padding:5px 8px; font-size:10.5px; line-height:1.45; margin-bottom:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:55%;"><strong>ชื่อลูกค้า/บริษัท</strong> <span style="margin-left:6px;">${esc(hosp.fullName)}</span></td>
            <td style="width:45%; text-align:right;"><strong>อ้างอิงเลขที่สัญญา</strong> <span style="margin-left:6px; font-family:monospace;">${esc(data.contractNo || asset.contract_no || 'CTR-YYYY-XXXX')}</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>ที่อยู่</strong> <span style="margin-left:6px;">${esc(hosp.fullAddress)}</span></td>
          </tr>
          <tr>
            <td><strong>ข้อมูลผู้ติดต่อ</strong></td>
            <td style="text-align:right;"><strong>อ้างอิงเลขที่โครงการ</strong> <span style="margin-left:6px; font-family:monospace;">${esc(data.projectNo || 'PRJ-YYYY-XXXX')}</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>ชื่อ</strong> <span style="margin-left:6px;">${esc(data.contactName)}</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>สถานที่ติดต่อ</strong> <span style="margin-left:6px;">${esc(hosp.shortName)} แผนก${esc(asset.location || 'เทคโนโลยีสารสนเทศ')} ${esc(hosp.address)}</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>เบอร์โทร/มือถือ</strong> <span style="margin-left:6px;">${esc(data.contactPhone)}</span> <strong style="margin-left:24px;">Email</strong> <span style="margin-left:6px;">${esc(state.user?.email || hosp.email)}</span></td>
          </tr>
        </table>
      </div>

      <!-- 2. รายละเอียดผลิตภัณฑ์ -->
      <div style="font-size:11.5px; font-weight:700; margin:4px 0 2px 0;">2. รายละเอียดผลิตภัณฑ์</div>
      <div style="border:1px solid #000; padding:5px 8px; font-size:10.5px; line-height:1.45; margin-bottom:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td colspan="2"><strong>ประเภท</strong> <span style="margin-left:6px;">${esc(asset.category || 'Thermal Printer')}</span></td>
          </tr>
          <tr>
            <td style="width:50%;"><strong>หมายเลขเครื่อง</strong> <span style="margin-left:6px; font-weight:bold; font-family:monospace;">${esc(asset.serial_no)}</span></td>
            <td style="width:50%;"><strong>รายละเอียดปัญหา</strong> <span style="margin-left:6px;">${esc(data.problemDesc)}</span></td>
          </tr>
          <tr>
            <td><strong>ยี่ห้อ</strong> <span style="margin-left:6px;">${esc(asset.brand || '-')}</span> <strong style="margin-left:20px;">รุ่น</strong> <span style="margin-left:6px;">${esc(asset.model || '-')}</span></td>
            <td></td>
          </tr>
          <tr>
            <td colspan="2"><strong>ประเภทปัญหาแจ้งซ่อม</strong> <span style="margin-left:6px;">${esc(asset.category === 'Printer' ? 'TM-Bit missing / TM-Have Noisy' : 'ฮาร์ดแวร์ทำงานผิดปกติ')}</span></td>
          </tr>
        </table>
      </div>

      <!-- 3. การดำเนินการ -->
      <div style="font-size:11.5px; font-weight:700; margin:4px 0 2px 0; display:flex; justify-content:space-between;">
        <span>3. การดำเนินการ</span>
        <span style="font-weight:normal; font-size:10.5px;"><span class="doc-chk"></span> Non &nbsp;&nbsp; <span class="doc-chk"></span> Inv</span>
      </div>
      <div style="border:1px solid #000; padding:5px 8px; font-size:10.5px; line-height:1.45; margin-bottom:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:55%;"><strong>ชื่อช่าง</strong> <span style="margin-left:6px;">${esc(data.techName)}</span></td>
            <td style="width:45%; text-align:right;"><strong>เบอร์ติดต่อ</strong> <span style="margin-left:6px;">${esc(hosp.phone || '02-xxx-xxxx')}</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>วันที่ดำเนินการ</strong> <span style="margin-left:6px;">${esc(data.todayFormatted)}</span> <strong style="margin-left:20px;">เวลาเข้า</strong> <span class="doc-dotted-line" style="min-width:60px;"></span> <strong style="margin-left:12px;">เวลาออก</strong> <span class="doc-dotted-line" style="min-width:60px;"></span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>วิธีการแก้ไข</strong> <span style="margin-left:6px;">${esc(data.solution)}</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>รายการอะไหล่</strong> <span style="margin-left:6px;">-</span></td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:4px;">
              <strong>สถานะงาน</strong> &nbsp;
              <span class="doc-chk"></span> รออะไหล่ &nbsp;&nbsp;
              <span class="doc-chk"></span> ส่งศูนย์บริการ &nbsp;&nbsp;
              <span class="doc-chk checked"></span> เสร็จเรียบร้อย &nbsp;&nbsp;
              <strong>วันที่</strong> <span style="border-bottom:1px dotted #000; padding:0 8px;">${esc(data.todayFormatted)}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="text-align:right; padding-top:10px;">
              <strong>ลงชื่อผู้แจ้งซ่อม (ลูกค้า) พร้อมประทับตราสาขา</strong> <span class="doc-dotted-line" style="min-width:140px;"></span>
            </td>
          </tr>
        </table>
      </div>

      <!-- 4. รายละเอียดเครื่องสำรอง -->
      <div style="font-size:11.5px; font-weight:700; margin:4px 0 2px 0;">4. รายละเอียดเครื่องสำรอง (สำหรับเจ้าหน้าที่บริษัท)</div>
      <div style="border:1px solid #000; padding:5px 8px; font-size:10.5px; line-height:1.45; margin-bottom:8px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td colspan="2">
              <span class="doc-chk checked"></span> ไม่ประสงค์รับเครื่องสำรอง &nbsp;&nbsp;&nbsp;&nbsp;
              <span class="doc-chk"></span> ประสงค์รับเครื่องสำรอง
            </td>
          </tr>
          <tr>
            <td style="width:50%;"><strong>หมายเลขเครื่อง</strong> <span class="doc-dotted-line" style="min-width:120px;"></span></td>
            <td style="width:50%;"><strong>รุ่น</strong> <span class="doc-dotted-line" style="min-width:120px;"></span></td>
          </tr>
          <tr>
            <td><strong>ยี่ห้อ</strong> <span class="doc-dotted-line" style="min-width:120px;"></span></td>
            <td><strong>ลงชื่อ</strong> <span class="doc-dotted-line" style="min-width:120px;"></span></td>
          </tr>
          <tr>
            <td><strong>วันที่รับเครื่อง</strong> <span class="doc-dotted-line" style="min-width:120px;"></span> <strong>ลงชื่อ</strong> <span class="doc-dotted-line" style="min-width:80px;"></span></td>
            <td><strong>วันที่ส่งเครื่อง</strong> <span class="doc-dotted-line" style="min-width:120px;"></span> <strong>ลงชื่อ</strong> <span class="doc-dotted-line" style="min-width:80px;"></span></td>
          </tr>
        </table>
      </div>

      <!-- Bottom Signature Columns -->
      <div class="doc-grid-2" style="gap:10px;">
        <div style="border:1px solid #000; padding:6px; text-align:center;">
          <div style="font-weight:700; font-size:11px; margin-bottom:12px; text-align:center; border-bottom:1px solid #e5e7eb; padding-bottom:3px;">ลูกค้าส่งเครื่องซ่อม</div>
          <div style="font-size:10px; line-height:1.8; text-align:center;">
            <div>........................................................ <strong>ลูกค้า</strong> &nbsp;&nbsp;&nbsp;&nbsp; ${esc(data.todayFormatted)} <strong>วันที่</strong></div>
            <div style="font-size:9.5px; color:#4b5563;">ผู้ส่งซ่อม (ลูกค้า)</div>
            <div style="margin-top:8px;">........................................................ <strong>ช่าง</strong> &nbsp;&nbsp;&nbsp;&nbsp; ${esc(data.todayFormatted)} <strong>วันที่</strong></div>
            <div style="font-size:9.5px; color:#4b5563;">ผู้รับซ่อม (ช่าง)</div>
          </div>
        </div>

        <div style="border:1px solid #000; padding:6px; text-align:center;">
          <div style="font-weight:700; font-size:11px; margin-bottom:12px; text-align:center; border-bottom:1px solid #e5e7eb; padding-bottom:3px;">ลูกค้ารับเครื่องคืน</div>
          <div style="font-size:10px; line-height:1.8; text-align:center;">
            <div>........................................................ <strong>ช่าง</strong> &nbsp;&nbsp;&nbsp;&nbsp; ${esc(data.todayFormatted)} <strong>วันที่</strong></div>
            <div style="font-size:9.5px; color:#4b5563;">ผู้ส่งคืน (ช่าง)</div>
            <div style="margin-top:8px;">........................................................ <strong>ลูกค้า</strong> &nbsp;&nbsp;&nbsp;&nbsp; ${esc(data.todayFormatted)} <strong>วันที่</strong></div>
            <div style="font-size:9.5px; color:#4b5563;">ผู้รับคืน (ลูกค้า)</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 2. TEMPLATE: ใบรับเคลม / นำส่งสินค้า (Vendor Claim Form)
function render888ClaimHTML(asset, data) {
  const hosp = getHospitalConfig();
  const vendor = getVendorConfig(asset);
  return `
    <div style="position:relative; width:100%; font-size:11px;">
      <!-- Vendor Header -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
        <tr>
          <td style="vertical-align:top; width:80%;">
            <div style="font-size:14.5px; font-weight:800; color:#000;">${esc(vendor.name)}</div>
            <div style="font-size:11px; font-weight:700; color:#1e40af; margin-top:1px;">${esc(vendor.department)}</div>
            <div style="font-size:10px; color:#374151;">${esc(vendor.address)}</div>
            <div style="font-size:10px; color:#374151;">
              <strong>เบอร์โทรติดต่อ</strong> ${esc(vendor.phone)} &nbsp;&nbsp;
              <strong>Email :</strong> <span style="color:#2563eb; text-decoration:underline;">${esc(vendor.email)}</span>
            </div>
          </td>
          <td style="vertical-align:middle; text-align:right; width:20%;">
            <div style="font-size:28px; line-height:1;">🛡️⚙️</div>
          </td>
        </tr>
      </table>

      <!-- Title Bar -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:6px; border:1.5px solid #000;">
        <tr style="background:#52525b; color:#fff; text-align:center; font-weight:bold;">
          <td style="padding:4px 10px; font-size:13px; width:55%;">ใบรับเคลม/นำส่งสินค้า</td>
          <td style="padding:4px 10px; font-size:12px; width:20%; background:#71717a;">วันที่แจ้งงาน:</td>
          <td style="padding:4px 10px; font-size:12px; width:25%; background:#fff; color:#000; font-weight:bold;">${esc(data.thaiYearDate)}</td>
        </tr>
      </table>

      <!-- Customer Address Section -->
      <div style="background:#71717a; color:#fff; font-weight:bold; padding:2px 8px; font-size:10.5px; text-align:center;">
        ลูกค้ากรอก : รายละเอียดที่อยู่รับสินค้าเคลม
      </div>
      <div style="border:1px solid #000; border-top:none; padding:5px 8px; font-size:10.5px; line-height:1.4; margin-bottom:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:12%;"><strong>ลูกค้า :</strong></td>
            <td style="width:88%;">${esc(hosp.contactPerson || 'หน่วยสนับสนุนเทคโนโลยีสารสนเทศ')} ${esc(hosp.shortName)}</td>
          </tr>
          <tr>
            <td><strong>ที่อยู่ :</strong></td>
            <td>${esc(hosp.fullAddress || hosp.address)}</td>
          </tr>
          <tr>
            <td><strong>ชื่อผู้ติดต่อ :</strong></td>
            <td>${esc(data.contactName)} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>โทร.</strong> ${esc(data.contactPhone || hosp.phone)}</td>
          </tr>
          <tr>
            <td><strong>อีเมล :</strong></td>
            <td><span style="color:#2563eb;">${esc(hosp.email)}</span></td>
          </tr>
          <tr>
            <td><strong>หมายเหตุ :</strong></td>
            <td>รหัสครุภัณฑ์ ${esc(asset.asset_tag)} (${esc(asset.location)})</td>
          </tr>
        </table>
      </div>

      <!-- Item Claim Table Section -->
      <div style="background:#71717a; color:#fff; font-weight:bold; padding:2px 8px; font-size:10.5px; text-align:center;">
        ลูกค้ากรอก : รายละเอียดสินค้าที่ต้องการแจ้งเคลม
      </div>
      <table class="doc-table" style="margin-top:0; margin-bottom:4px;">
        <thead>
          <tr style="background:#52525b; color:#fff;">
            <th style="width:8%; color:#fff; background:#52525b;">ลำดับที่</th>
            <th style="width:32%; color:#fff; background:#52525b;">ยี่ห้อ/รุ่น/SKU No.</th>
            <th style="width:25%; color:#fff; background:#52525b;">อาการเสียต่างๆ</th>
            <th style="width:15%; color:#fff; background:#52525b;">อุปกรณ์ที่นำส่ง</th>
            <th style="width:20%; color:#fff; background:#52525b;">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center;">1</td>
            <td><strong>${esc((asset.brand || '-').toUpperCase())} / ${esc(asset.model || asset.device_name || '-')}</strong></td>
            <td>${esc(data.problemDesc)}</td>
            <td style="text-align:center;">1 ชุด</td>
            <td style="font-family:monospace; font-size:10px;">S/N : ${esc(asset.serial_no)}</td>
          </tr>
          ${[2,3,4,5,6,7,8,9,10].map(i => `
            <tr style="height:17px;">
              <td style="text-align:center; color:#9ca3af;">${i}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          `).join('')}
          <tr style="font-weight:bold; background:#f9fafb;">
            <td colspan="2" style="text-align:center;">รวมทั้งสิ้น</td>
            <td style="text-align:center;">1 unit</td>
            <td colspan="2" style="text-align:center;">จำนวน/กล่อง : 1 กล่อง</td>
          </tr>
        </tbody>
      </table>

      <!-- Reason Section -->
      <table style="width:100%; border:1px solid #000; border-collapse:collapse; margin-bottom:6px; font-size:10px;">
        <tr>
          <td style="width:25%; padding:4px 6px; font-weight:bold; border-right:1px solid #000; vertical-align:middle;">
            เหตุผลในการส่งเคลม :
          </td>
          <td style="width:40%; padding:4px 6px; line-height:1.5;">
            <div><span class="doc-chk"></span> เปลี่ยนสินค้าใหม่ [DOA - Invoice Vendor 30 Days]</div>
            <div><span class="doc-chk"></span> เปลี่ยนสินค้าใหม่ [DOA - Invoice User 7 Days]</div>
            <div><span class="doc-chk"></span> DOA WITH คืน [C/N]</div>
          </td>
          <td style="width:35%; padding:4px 6px; line-height:1.5;">
            <div><span class="doc-chk checked"></span> ซ่อม [REPAIR]</div>
            <div><span class="doc-chk"></span> คืนสินค้า GR (GOOD RETURN)</div>
          </td>
        </tr>
      </table>

      <!-- Terms Box -->
      <div style="background:#52525b; color:#fff; font-weight:bold; padding:2px 8px; font-size:10px; text-align:center;">
        เงื่อนไขการบริการรับสินค้าเคลม
      </div>
      <div style="border:1px solid #000; border-top:none; padding:4px 8px; font-size:9.5px; color:#374151; line-height:1.35; margin-bottom:6px;">
        <p>• เอกสารฉบับนี้เป็นเอกสารแสดงว่าทาง ${esc(asset.vendor_name || 'ศูนย์บริการคู่ค้าที่ได้รับอนุญาต')} ได้รับสินค้าจากผู้ส่งสินค้า ตามรายการข้างต้น</p>
        <p>• <strong>กรณีสินค้าไม่ได้บรรจุใส่กล่อง</strong> เพื่อป้องกันความเสียหายระหว่างขนส่ง แต่ลูกค้ายืนยันที่จะส่งมอบสินค้า โดยไม่ทำการห่อหุ้มเพื่อกันกระแทกและป้องกันความชำรุดระหว่างขนส่งที่อาจเกิดขึ้น บริษัทฯ ขอไม่รับผิดชอบหากเกิดความเสียหายแตกหักและชำรุดระหว่างการขนส่ง</p>
        <p>• ข้าพเจ้าผู้ส่งมอบสินค้าเคลมได้อ่านและรับทราบเงื่อนไขการบริการรับสินค้าเคลมเป็นที่เรียบร้อยแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐาน</p>
      </div>

      <!-- Signatures Footer -->
      <table style="width:100%; border-collapse:collapse; font-size:10px; line-height:1.7;">
        <tr>
          <td style="width:50%; vertical-align:top;">
            <div>ได้รับทราบและตกลงตาม "เงื่อนไขการบริการรับสินค้าเคลม" &nbsp;&nbsp; <span class="doc-dotted-line" style="min-width:140px;"></span> <strong>ลงชื่อผู้ส่งมอบสินค้าเคลม</strong></div>
            <div style="margin-left:230px;"><span class="doc-dotted-line" style="min-width:140px;"></span> <strong>วันที่ส่งมอบสินค้า</strong></div>
          </td>
          <td style="width:50%; vertical-align:top;">
            <div>พนักงานผู้รับสินค้า ได้รับมอบสินค้าจากลูกค้าเรียบร้อยแล้ว &nbsp;&nbsp; <span class="doc-dotted-line" style="min-width:140px;"></span> <strong>ลงชื่อ พนักงานผู้รับสินค้า</strong></div>
            <div style="margin-left:230px;"><span class="doc-dotted-line" style="min-width:140px;"></span> <strong>วันที่รับมอบสินค้า</strong></div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// 3. TEMPLATE: ใบรับประกันสินค้า (Authorized Vendor Warranty)
function render888WarrantyHTML(asset, data) {
  const hosp = getHospitalConfig();
  const vendor = getVendorConfig(asset);
  return `
    <div style="position:relative; width:100%; font-size:11px;">
      <!-- Vendor Header -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
        <tr>
          <td style="vertical-align:top; width:80%;">
            <div style="font-size:14.5px; font-weight:800; color:#000;">${esc(vendor.name)} (${esc(vendor.branch)})</div>
            <div style="font-size:10px; color:#374151; margin-top:2px;">${esc(vendor.address)}</div>
            <div style="font-size:10px; color:#374151;">
              <strong>เบอร์โทรติดต่อ</strong> ${esc(vendor.phone)} &nbsp;&nbsp;
              <strong>Email :</strong> <span style="color:#2563eb; text-decoration:underline;">${esc(vendor.email)}</span>
            </div>
          </td>
          <td style="vertical-align:middle; text-align:right; width:20%;">
            <div style="font-size:28px; line-height:1;">🛡️⚙️</div>
          </td>
        </tr>
      </table>

      <!-- Title Bar -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:6px; border:1.5px solid #000;">
        <tr style="background:#52525b; color:#fff; text-align:center; font-weight:bold;">
          <td style="padding:4px 10px; font-size:13px; width:55%;">ใบรับประกันสินค้า</td>
          <td style="padding:4px 10px; font-size:12px; width:20%; background:#71717a;">วัน/เดือน/ปี</td>
          <td style="padding:4px 10px; font-size:12px; width:25%; background:#fff; color:#000; font-weight:bold;">${esc(data.thaiYearDate)}</td>
        </tr>
      </table>

      <!-- Customer Section -->
      <div style="background:#52525b; color:#fff; font-weight:bold; padding:2px 8px; font-size:10.5px; text-align:center;">
        ลูกค้า
      </div>
      <div style="border:1px solid #000; border-top:none; padding:5px 8px; font-size:10.5px; line-height:1.45; margin-bottom:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:12%;"><strong>ลูกค้า :</strong></td>
            <td style="width:88%;">${esc(hosp.shortName)} (แผนก IT)</td>
          </tr>
          <tr>
            <td><strong>ที่อยู่ :</strong></td>
            <td>${esc(hosp.fullAddress || hosp.address)}</td>
          </tr>
          <tr>
            <td><strong>ชื่อผู้ติดต่อ :</strong></td>
            <td>${esc(data.contactName || hosp.contactPerson || 'เจ้าหน้าที่ฝ่ายเทคโนโลยีสารสนเทศ')} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>โทรศัพท์</strong> ${esc(hosp.phone)}</td>
          </tr>
          <tr>
            <td><strong>อีเมล์:</strong></td>
            <td><span style="color:#2563eb;">${esc(hosp.email)}</span></td>
          </tr>
          <tr>
            <td><strong>หมายเหตุ:</strong></td>
            <td>อ้างอิงเลขที่ใบสั่งซื้อ ${esc(asset.po_number || data.po_number || '-')} / รหัสครุภัณฑ์ ${esc(asset.asset_tag)}</td>
          </tr>
        </table>
      </div>

      <!-- Itemized Table -->
      <div style="background:#52525b; color:#fff; font-weight:bold; padding:2px 8px; font-size:10.5px; text-align:center;">
        รายละเอียดสินค้า
      </div>
      <table class="doc-table" style="margin-top:0; margin-bottom:4px;">
        <thead>
          <tr style="background:#52525b; color:#fff;">
            <th style="width:8%; color:#fff; background:#52525b;">ลำดับที่</th>
            <th style="width:30%; color:#fff; background:#52525b;">ยี่ห้อ/รุ่น/SKU No.</th>
            <th style="width:25%; color:#fff; background:#52525b;">S/N</th>
            <th style="width:15%; color:#fff; background:#52525b;">อุปกรณ์ที่นำส่ง</th>
            <th style="width:22%; color:#fff; background:#52525b;">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center;">1</td>
            <td><strong>${esc(asset.brand || '-')}-${esc(asset.model || asset.device_name || '-')}</strong></td>
            <td style="font-family:monospace; font-size:10px; font-weight:bold; color:#0284c7;">${esc(asset.serial_no)}</td>
            <td style="text-align:center;">1 unit</td>
            <td style="color:#dc2626; font-size:9.5px; font-weight:bold;">${esc(asset.warranty_terms || 'Standard Vendor Warranty')}</td>
          </tr>
          <tr style="font-weight:bold; background:#f9fafb;">
            <td colspan="3" style="text-align:center;">รวมทั้งสิ้น</td>
            <td style="text-align:center;">1 unit</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <!-- Terms & Signatures -->
      <div style="background:#52525b; color:#fff; font-weight:bold; padding:2px 8px; font-size:10px; text-align:center;">
        เงื่อนไขการรับประกันสินค้า
      </div>
      <div style="border:1px solid #000; border-top:none; padding:5px 8px; font-size:9.5px; line-height:1.4; margin-bottom:8px;">
        <p>• เอกสารฉบับนี้เป็นเอกสารแสดงว่าทาง <strong>${esc(vendor.name)}</strong> ได้ส่งมอบสินค้าพร้อมกับการรับประกันสินค้าตามรายการข้างต้น</p>
        <p>• เพื่อป้องกันความเสียหาย ลูกค้ากรุณาตรวจเช็คสินค้าก่อนส่งมอบสินค้า</p>
        <p>• ข้าพเจ้าผู้รับมอบสินค้าได้อ่านและรับทราบเงื่อนไขการส่งมอบสินค้าและการรับประกันสินค้าเป็นที่เรียบร้อยแล้ว</p>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:10px; line-height:1.7;">
        <tr>
          <td style="width:50%; vertical-align:top;">
            <div><span class="doc-dotted-line" style="min-width:150px;"></span> <strong>ลงชื่อผู้รับมอบสินค้า</strong></div>
            <div><span class="doc-dotted-line" style="min-width:150px;"></span> <strong>วันที่รับสินค้า</strong></div>
          </td>
          <td style="width:50%; vertical-align:top; text-align:right;">
            <div><span class="doc-dotted-line" style="min-width:150px;"></span> <strong>ลงชื่อพนักงานผู้ส่งสินค้า</strong></div>
            <div><span class="doc-dotted-line" style="min-width:150px;"></span> <strong>วันที่ส่งสินค้า</strong></div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// 4. TEMPLATE: ใบส่งมอบ / ใบรับประกันสินค้า (Authorized IT Vendor Delivery & Warranty)
function renderTalentDeliveryHTML(asset, data) {
  const hosp = getHospitalConfig();
  const vendor = getVendorConfig(asset);
  return `
    <div style="position:relative; width:100%; font-size:11px;">
      <!-- Vendor Header -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <tr>
          <td style="vertical-align:middle; width:75%;">
            <div style="font-size:16px; font-weight:800; color:#000;">${esc(vendor.name)}</div>
            <div style="font-size:12px; font-weight:700; color:#374151;">${esc(vendor.department || 'AUTHORIZED IT HARDWARE PARTNER')}</div>
            <div style="font-size:9.5px; color:#4b5563; margin-top:2px;">${esc(vendor.address)}</div>
            <div style="font-size:9.5px; color:#4b5563;">Tel. ${esc(vendor.phone)} Web: ${esc(vendor.website)}</div>
          </td>
          <td style="vertical-align:middle; text-align:right; width:25%;">
            <div style="font-size:20px; font-weight:900; color:#2563eb; border:2px solid #2563eb; padding:4px 8px; display:inline-block;">PARTNER</div>
          </td>
        </tr>
      </table>

      <!-- Customer Info Card -->
      <div style="border:1px solid #000; padding:10px 12px; margin-bottom:16px; line-height:1.6; font-size:11px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:15%; font-weight:bold;">ลูกค้า</td>
            <td style="width:85%;"><strong>${esc(hosp.fullName || hosp.shortName)}</strong></td>
          </tr>
          <tr>
            <td style="font-weight:bold;">ที่อยู่</td>
            <td>${esc(hosp.fullAddress || hosp.address)}</td>
          </tr>
          <tr>
            <td style="font-weight:bold;">โทร.</td>
            <td>${esc(hosp.phone)}</td>
          </tr>
          <tr>
            <td style="font-weight:bold;">ติดต่อ</td>
            <td>${esc(hosp.contactPerson)}</td>
          </tr>
          <tr>
            <td style="font-weight:bold;">อ้างอิง</td>
            <td>SO: ${esc(asset.so_number || data.so_number || '-')} &nbsp;&nbsp;&nbsp;&nbsp; PO: ${esc(asset.po_number || data.po_number || '-')}</td>
          </tr>
        </table>
      </div>

      <!-- Main Asset Voucher -->
      <div style="border:1.5px solid #000; padding:14px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e5e7eb; padding-bottom:8px; margin-bottom:10px;">
          <div style="font-size:15px; font-weight:bold; color:#000;">${esc(asset.brand || '')} ${esc(asset.model || asset.device_name || 'IT Equipment')}</div>
          <div style="font-size:13px; font-weight:bold;">1 Unit</div>
        </div>

        <div style="font-size:12px; font-weight:bold; color:#1e40af; font-family:monospace; margin-bottom:10px;">
          S/N: ${esc(asset.serial_no || '-')}
        </div>

        <div style="font-size:10.5px; color:#374151; line-height:1.6; background:#f9fafb; padding:8px; border-radius:4px;">
          <div>• อุปกรณ์: ${esc(asset.device_name || '-')}</div>
          <div>• หมวดหมู่: ${esc(asset.category || '-')} | รหัสครุภัณฑ์: ${esc(asset.asset_tag || '-')}</div>
          <div>• จุดติดตั้ง / แผนก: ${esc(asset.location || '-')}</div>
          <div>• สถานะ: ${esc(asset.status || '-')}</div>
          <div style="color:#dc2626; font-weight:bold; margin-top:4px;">• ระยะเวลารับประกัน: ${esc(asset.warranty_start || '-')} ถึง ${esc(asset.warranty_end || '-')}</div>
        </div>
      </div>

      <!-- Warning Banner -->
      <div style="text-align:center; font-weight:bold; font-size:12px; color:#b91c1c; margin-bottom:30px;">
        *** โปรดเก็บเอกสารนี้ไว้ใช้เป็นหลักฐานสำคัญในการรับประกันสินค้า ***
      </div>

      <!-- Signatures Footer -->
      <table style="width:100%; border-collapse:collapse; margin-top:20px; font-size:11px;">
        <tr>
          <td style="width:50%; text-align:left;">
            <div>Customer ....................................................</div>
            <div style="margin-top:10px;">Date ...... / ...... / ${esc(data.thaiYearDate ? data.thaiYearDate.slice(-4) : '2568')}</div>
          </td>
          <td style="width:50%; text-align:right;">
            <div>Delivery by ....................................................</div>
            <div style="margin-top:10px;">Date ...... / ...... / ${esc(data.thaiYearDate ? data.thaiYearDate.slice(-4) : '2568')}</div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// 5. TEMPLATE: ClaimIT Comprehensive Multi-Asset & PDPA Audit Report
function renderClaimITComplianceHTML(asset, data) {
  const isWiped = asset.rma_data_wiped_confirmed || asset.status === 'Sanitized';
  const hosp = getHospitalConfig();

  return `
    <div style="position:relative; width:100%; font-size:11px; line-height:1.45;">
      <div style="border-bottom:2px solid #0284c7; padding-bottom:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div style="font-size:18px; font-weight:800; color:#0284c7;">ClaimIT — Hospital Asset Warranty & Compliance Report</div>
          <div style="font-size:11px; color:#64748b;">ระบบติดตามรับประกันและส่งเคลมครุภัณฑ์ไอที ${esc(hosp.shortName || hosp.fullName)}</div>
        </div>
        <div style="text-align:right; font-size:10.5px; color:#64748b;">
          <div><strong>Report Date:</strong> ${esc(data.todayFormatted)}</div>
          <div><strong>Ref:</strong> ${esc(asset.asset_tag)}</div>
        </div>
      </div>

      <!-- Section 1: Specifications -->
      <div style="font-size:12px; font-weight:bold; color:#0f172a; margin-bottom:4px; text-decoration:underline;">1. ข้อมูลจำเพาะของครุภัณฑ์ (Asset Specifications)</div>
      <div style="border:1px solid #cbd5e1; padding:8px; margin-bottom:10px; font-size:11px; line-height:1.5;">
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="width:30%;"><strong>รหัสครุภัณฑ์ (Asset Tag):</strong></td><td><strong>${esc(asset.asset_tag)}</strong></td></tr>
          <tr><td><strong>ชื่ออุปกรณ์:</strong></td><td>${esc(asset.device_name)}</td></tr>
          <tr><td><strong>หมวดหมู่ / แบรนด์ / รุ่น:</strong></td><td>${esc(asset.category)} | ${esc(asset.brand)} ${esc(asset.model)}</td></tr>
          <tr><td><strong>หมายเลขซีเรียล (S/N):</strong></td><td style="font-family:monospace; font-weight:bold;">${esc(asset.serial_no)}</td></tr>
          <tr><td><strong>จุดติดตั้ง / แผนก:</strong></td><td>${esc(asset.location)}</td></tr>
          <tr><td><strong>ระยะเวลารับประกัน:</strong></td><td>${esc(asset.warranty_start)} ถึง ${esc(asset.warranty_end)}</td></tr>
          <tr><td><strong>สถานะปัจจุบัน:</strong></td><td><strong>${esc(asset.status)}</strong> (Salvage Status: ${esc(asset.salvage_status || 'None')})</td></tr>
        </table>
      </div>

      <!-- Section 2: PDPA Sanitization -->
      <div style="font-size:12px; font-weight:bold; color:#0f172a; margin-bottom:4px; text-decoration:underline;">2. การตรวจสอบความปลอดภัยข้อมูลผู้ป่วย (PDPA Security & Sanitization Audit)</div>
      <div style="border:1px solid #cbd5e1; padding:8px; margin-bottom:10px; font-size:11px; line-height:1.5; background:${isWiped ? '#f0fdf4' : '#fff'};">
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="width:40%;"><strong>อุปกรณ์บันทึกข้อมูลหลัก (Storage):</strong></td><td>${asset.sanitization_required ? 'ใช่ (ต้องทำการ Sanitization)' : 'ไม่ใช่ (Non-Storage Device)'}</td></tr>
          <tr><td><strong>สถานะการล้างข้อมูล (Wipe Status):</strong></td><td><strong style="color:${isWiped ? '#16a34a' : '#dc2626'};">${isWiped ? '✓ ยืนยันการล้างข้อมูลแล้ว (CONFIRMED WIPED)' : 'ยังไม่ได้ดำเนินการล้างข้อมูล'}</strong></td></tr>
          <tr><td><strong>ผู้ตรวจสอบความปลอดภัย:</strong></td><td>${esc(asset.data_wiped_by || state.user?.name || 'IT Security Officer')}</td></tr>
          <tr><td><strong>บันทึกความปลอดภัย:</strong></td><td>${esc(asset.sanitization_note || 'Verified data wipe and security protocol compliance.')}</td></tr>
        </table>
      </div>

      <!-- Section 3: RMA Details -->
      <div style="font-size:12px; font-weight:bold; color:#0f172a; margin-bottom:4px; text-decoration:underline;">3. ประวัติการส่งเคลมและศูนย์บริการ (Vendor RMA Service Record)</div>
      <div style="border:1px solid #cbd5e1; padding:8px; margin-bottom:12px; font-size:11px; line-height:1.5;">
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="width:40%;"><strong>ศูนย์บริการ / ผู้จัดจำหน่าย:</strong></td><td>${esc(asset.vendor_name || 'ศูนย์บริการคู่ค้าที่ได้รับอนุญาต')}</td></tr>
          <tr><td><strong>หมายเลขใบเคลม (RMA No.):</strong></td><td>${esc(asset.vendor_rma_number || data.jobNo)}</td></tr>
          <tr><td><strong>วันที่ส่งเคลม:</strong></td><td>${esc(asset.claim_date || data.todayFormatted)}</td></tr>
          <tr><td><strong>กำหนดส่งคืนโดยประมาณ:</strong></td><td>${esc(asset.expected_return_date || '-')}</td></tr>
        </table>
      </div>

      <!-- Authorization Signatures -->
      <table style="width:100%; border-collapse:collapse; margin-top:20px; font-size:10.5px;">
        <tr>
          <td style="width:50%; text-align:center; padding:10px;">
            <div>....................................................................</div>
            <div style="margin-top:4px;">( ${esc(state.user?.name || 'เจ้าหน้าที่ฝ่ายเทคโนโลยีสารสนเทศ')} )</div>
            <div style="color:#64748b; font-size:10px;">ผู้รายงาน / เจ้าหน้าที่ไอทีระบบ</div>
          </td>
          <td style="width:50%; text-align:center; padding:10px;">
            <div>....................................................................</div>
            <div style="margin-top:4px;">( .................................................................... )</div>
            <div style="color:#64748b; font-size:10px;">หัวหน้าแผนกสนับสนุนเทคโนโลยีสารสนเทศ</div>
          </td>
        </tr>
      </table>
    </div>
  `;
}
