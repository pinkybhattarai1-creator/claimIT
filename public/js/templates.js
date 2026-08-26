/**
 * ClaimIT Frontend - Official Print & PDF Template Center
 * Handles document rendering, multi-template switching, live preview,
 * and client-side PDF document downloads.
 */

let currentTemplateAsset = null;

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
    editJobNo.value = currentTemplateAsset.vendor_rma_number || `PYT68${Math.floor(100000 + Math.random() * 900000)}`;
  }

  const editContact = document.getElementById('edit-contact-name');
  if (editContact) {
    editContact.value = (state.user && state.user.name) ? state.user.name : 'เจ้าหน้าที่ไอที ประจำโรงพยาบาล';
  }

  const editPhone = document.getElementById('edit-contact-phone');
  if (editPhone) {
    editPhone.value = '02-467-1111 ต่อ 1234';
  }

  const editProb = document.getElementById('edit-problem-desc');
  if (editProb) {
    if (currentTemplateAsset.category === 'Printer' || (currentTemplateAsset.device_name || '').toLowerCase().includes('printer')) {
      editProb.value = 'ปริ้นเป็นเส้น / หัวพิมพ์ติดขัด (TM-Bit missing)';
    } else if (currentTemplateAsset.category === 'Scanner') {
      editProb.value = 'สแกนเนอร์ไม่อ่านบาร์โค้ด / สัญญาณขาดหาย';
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

  // Gather live edit values
  const customData = {
    jobNo: (document.getElementById('edit-job-no')?.value || 'PYT68100232').trim(),
    contactName: (document.getElementById('edit-contact-name')?.value || 'คุณรมิตา ภูมิแสง').trim(),
    contactPhone: (document.getElementById('edit-contact-phone')?.value || '097-160-9630').trim(),
    problemDesc: (document.getElementById('edit-problem-desc')?.value || 'ปริ้นเป็นเส้น').trim(),
    techName: (document.getElementById('edit-tech-name')?.value || 'ช่างเทคนิคไอที').trim(),
    solution: (document.getElementById('edit-solution')?.value || 'ทำความสะอาด และเปลี่ยนลูกรอก ให้กับตัวเครื่อง ใช้งานได้ปกติ').trim(),
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

  return `
    <div style="position:relative; width:100%;">
      <!-- Header Bar -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:6px;">
        <tr>
          <td style="vertical-align:bottom; width:55%;">
            <div style="font-size:18px; font-weight:800; color:#000; letter-spacing:-0.02em;">ใบรับงานซ่อม / ใบรับเคลมสินค้า</div>
          </td>
          <td style="vertical-align:top; width:45%; font-size:11px; text-align:right; line-height:1.4;">
            <div><strong>ประเภทการรับประกัน :</strong> <span style="border-bottom:1px dotted #000; padding:0 8px;">${warrantyText}</span></div>
            <div><strong>อ้างอิงเลขที่ Job . :</strong> <span style="border-bottom:1px dotted #000; padding:0 8px; font-weight:bold;">${data.jobNo}</span></div>
            <div><strong>วันที่รับแจ้งปัญหา :</strong> <span style="border-bottom:1px dotted #000; padding:0 8px;">${data.todayFormatted}</span></div>
          </td>
        </tr>
      </table>

      <!-- 1. รายละเอียดลูกค้า -->
      <div style="font-size:11.5px; font-weight:700; margin:4px 0 2px 0;">1. รายละเอียดลูกค้า</div>
      <div style="border:1px solid #000; padding:5px 8px; font-size:10.5px; line-height:1.45; margin-bottom:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:55%;"><strong>ชื่อลูกค้า/บริษัท</strong> <span style="margin-left:6px;">บริษัท โรงพยาบาลพญาไท 3 จำกัด</span></td>
            <td style="width:45%; text-align:right;"><strong>อ้างอิงเลขที่สัญญา</strong> <span style="margin-left:6px; font-family:monospace;">IV6803002</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>ที่อยู่</strong> <span style="margin-left:6px;">111 ถนนเพชรเกษม แขวงปากคลองภาษีเจริญ เขตภาษีเจริญ กรุงเทพมหานคร 10160</span></td>
          </tr>
          <tr>
            <td><strong>ข้อมูลผู้ติดต่อ</strong></td>
            <td style="text-align:right;"><strong>อ้างอิงเลขที่โครงการ</strong> <span style="margin-left:6px; font-family:monospace;">PJS0968001</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>ชื่อ</strong> <span style="margin-left:6px;">${data.contactName}</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>สถานที่ติดต่อ</strong> <span style="margin-left:6px;">โรงพยาบาลพญาไท 3 แผนก${asset.location || 'เทคโนโลยีสารสนเทศ'} 111 ถ.เพชรเกษม แขวงปากคลองภาษีเจริญ เขตภาษีเจริญ กทม. 10160</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>เบอร์โทร/มือถือ</strong> <span style="margin-left:6px;">${data.contactPhone}</span> <strong style="margin-left:24px;">Email</strong> <span style="margin-left:6px;">${state.user?.email || 'it_support@phyathai.com'}</span></td>
          </tr>
        </table>
      </div>

      <!-- 2. รายละเอียดผลิตภัณฑ์ -->
      <div style="font-size:11.5px; font-weight:700; margin:4px 0 2px 0;">2. รายละเอียดผลิตภัณฑ์</div>
      <div style="border:1px solid #000; padding:5px 8px; font-size:10.5px; line-height:1.45; margin-bottom:6px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td colspan="2"><strong>ประเภท</strong> <span style="margin-left:6px;">${asset.category || 'Thermal Printer'}</span></td>
          </tr>
          <tr>
            <td style="width:50%;"><strong>หมายเลขเครื่อง</strong> <span style="margin-left:6px; font-weight:bold; font-family:monospace;">${asset.serial_no}</span></td>
            <td style="width:50%;"><strong>รายละเอียดปัญหา</strong> <span style="margin-left:6px;">${data.problemDesc}</span></td>
          </tr>
          <tr>
            <td><strong>ยี่ห้อ</strong> <span style="margin-left:6px;">${asset.brand || 'TSC'}</span> <strong style="margin-left:20px;">รุ่น</strong> <span style="margin-left:6px;">${asset.model || 'TTP-345'}</span></td>
            <td></td>
          </tr>
          <tr>
            <td colspan="2"><strong>ประเภทปัญหาแจ้งซ่อม</strong> <span style="margin-left:6px;">${asset.category === 'Printer' ? 'TM-Bit missing / TM-Have Noisy' : 'ฮาร์ดแวร์ทำงานผิดปกติ'}</span></td>
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
            <td style="width:55%;"><strong>ชื่อช่าง</strong> <span style="margin-left:6px;">${data.techName}</span></td>
            <td style="width:45%; text-align:right;"><strong>เบอร์ติดต่อ</strong> <span style="margin-left:6px;">082-221-9211</span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>วันที่ดำเนินการ</strong> <span style="margin-left:6px;">${data.todayFormatted}</span> <strong style="margin-left:20px;">เวลาเข้า</strong> <span class="doc-dotted-line" style="min-width:60px;"></span> <strong style="margin-left:12px;">เวลาออก</strong> <span class="doc-dotted-line" style="min-width:60px;"></span></td>
          </tr>
          <tr>
            <td colspan="2"><strong>วิธีการแก้ไข</strong> <span style="margin-left:6px;">${data.solution}</span></td>
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
              <strong>วันที่</strong> <span style="border-bottom:1px dotted #000; padding:0 8px;">${data.todayFormatted}</span>
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
            <div>........................................................ <strong>ลูกค้า</strong> &nbsp;&nbsp;&nbsp;&nbsp; ${data.todayFormatted} <strong>วันที่</strong></div>
            <div style="font-size:9.5px; color:#4b5563;">ผู้ส่งซ่อม (ลูกค้า)</div>
            <div style="margin-top:8px;">........................................................ <strong>ช่าง</strong> &nbsp;&nbsp;&nbsp;&nbsp; ${data.todayFormatted} <strong>วันที่</strong></div>
            <div style="font-size:9.5px; color:#4b5563;">ผู้รับซ่อม (ช่าง)</div>
          </div>
        </div>

        <div style="border:1px solid #000; padding:6px; text-align:center;">
          <div style="font-weight:700; font-size:11px; margin-bottom:12px; text-align:center; border-bottom:1px solid #e5e7eb; padding-bottom:3px;">ลูกค้ารับเครื่องคืน</div>
          <div style="font-size:10px; line-height:1.8; text-align:center;">
            <div>........................................................ <strong>ช่าง</strong> &nbsp;&nbsp;&nbsp;&nbsp; ${data.todayFormatted} <strong>วันที่</strong></div>
            <div style="font-size:9.5px; color:#4b5563;">ผู้ส่งคืน (ช่าง)</div>
            <div style="margin-top:8px;">........................................................ <strong>ลูกค้า</strong> &nbsp;&nbsp;&nbsp;&nbsp; ${data.todayFormatted} <strong>วันที่</strong></div>
            <div style="font-size:9.5px; color:#4b5563;">ผู้รับคืน (ลูกค้า)</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 2. TEMPLATE: ใบรับเคลม / นำส่งสินค้า (888 Technology)
function render888ClaimHTML(asset, data) {
  return `
    <div style="position:relative; width:100%; font-size:11px;">
      <!-- Vendor Header -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
        <tr>
          <td style="vertical-align:top; width:80%;">
            <div style="font-size:14.5px; font-weight:800; color:#000;">บริษัท 888 เทคโนโลยี จำกัด (สำนักงานใหญ่)/888 Technology Co.Ltd</div>
            <div style="font-size:11px; font-weight:700; color:#1e40af; margin-top:1px;">แผนก Claim & Service</div>
            <div style="font-size:10px; color:#374151;">199/5 ซอยนพเก้า แขวงวงศ์สว่าง เขตบางซื่อ กรุงเทพมหานคร 10800</div>
            <div style="font-size:10px; color:#374151;">
              <strong>เบอร์โทรติดต่อ</strong> 091-894-1657 &nbsp;&nbsp;
              <strong>Email :</strong> <span style="color:#2563eb; text-decoration:underline;">Service@888technology.co.th</span>
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
          <td style="padding:4px 10px; font-size:12px; width:25%; background:#fff; color:#000; font-weight:bold;">${data.thaiYearDate}</td>
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
            <td style="width:88%;">หน่วยสนับสนุนเทคโนโลยีสารสนเทศ รพ.พญาไท3</td>
          </tr>
          <tr>
            <td><strong>ที่อยู่ :</strong></td>
            <td>111 ถ.เพชรเกษม แขวงปากคลองภาษีเจริญ เขตภาษีเจริญ กรุงเทพมหานคร 10160</td>
          </tr>
          <tr>
            <td><strong>ชื่อผู้ติดต่อ :</strong></td>
            <td>${data.contactName} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>โทร.</strong> ${data.contactPhone}</td>
          </tr>
          <tr>
            <td><strong>อีเมล :</strong></td>
            <td><span style="color:#2563eb;">ramita_phu@phyathai.com</span></td>
          </tr>
          <tr>
            <td><strong>หมายเหตุ :</strong></td>
            <td>รหัสครุภัณฑ์ ${asset.asset_tag} (${asset.location})</td>
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
            <td><strong>${(asset.brand || 'ZEBRA').toUpperCase()} / ${asset.model || 'ZD421'}</strong></td>
            <td>${data.problemDesc}</td>
            <td style="text-align:center;">1 ชุด</td>
            <td style="font-family:monospace; font-size:10px;">S/N : ${asset.serial_no}</td>
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
            <div><span class="doc-chk"></span> เปลี่ยนสินค้าใหม่ [DOA - Invoice Ingram 30 Days]</div>
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
        <p>• เอกสารฉบับนี้เป็นเอกสารแสดงว่าทาง บริษัท 888 เทคโนโลยี จำกัด ได้รับสินค้าจากผู้ส่งสินค้า ตามรายการข้างต้น</p>
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

// 3. TEMPLATE: ใบรับประกันสินค้า (888 Technology)
function render888WarrantyHTML(asset, data) {
  return `
    <div style="position:relative; width:100%; font-size:11px;">
      <!-- Vendor Header -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
        <tr>
          <td style="vertical-align:top; width:80%;">
            <div style="font-size:14.5px; font-weight:800; color:#000;">บริษัท 888 เทคโนโลยี จำกัด (สำนักงานใหญ่)/888 Technology Co.Ltd</div>
            <div style="font-size:10px; color:#374151; margin-top:2px;">199/5 ซอยนพเก้า แขวงวงศ์สว่าง เขตบางซื่อ กรุงเทพมหานคร 10800</div>
            <div style="font-size:10px; color:#374151;">
              <strong>เบอร์โทรติดต่อ</strong> 091-894-1657 &nbsp;&nbsp;
              <strong>Email :</strong> <span style="color:#2563eb; text-decoration:underline;">Service@888technology.co.th</span>
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
          <td style="padding:4px 10px; font-size:12px; width:25%; background:#fff; color:#000; font-weight:bold;">${data.thaiYearDate}</td>
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
            <td style="width:88%;">โรงพยาบาลพญาไท 3 (แผนก IT)</td>
          </tr>
          <tr>
            <td><strong>ที่อยู่ :</strong></td>
            <td>เลขที่ 111 เพชรเกษม 19 แขวงปากคลองภาษีเจริญ เขตภาษีเจริญ กทม 10160</td>
          </tr>
          <tr>
            <td><strong>ชื่อผู้ติดต่อ :</strong></td>
            <td>คุณ คล่อง ชุมคล้าย &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>โทรศัพท์</strong> 082-6678955</td>
          </tr>
          <tr>
            <td><strong>อีเมล์:</strong></td>
            <td><span style="color:#2563eb;">klong_chu@phyathai.com</span></td>
          </tr>
          <tr>
            <td><strong>หมายเหตุ:</strong></td>
            <td>อ้างอิงเลขที่ใบสั่งซื้อ 23022020556 / รหัสครุภัณฑ์ ${asset.asset_tag}</td>
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
            <td><strong>${asset.brand || 'Zebra'}-${asset.model || 'ZD4A043-30PM00EZ'}</strong></td>
            <td style="font-family:monospace; font-size:10px; font-weight:bold; color:#0284c7;">${asset.serial_no}</td>
            <td style="text-align:center;">1 unit</td>
            <td style="color:#dc2626; font-size:9.5px; font-weight:bold;">Warranty 2 Yrs./Printerhead 6 Mth</td>
          </tr>
          ${[2,3,4,5,6,7,8,9,10,11,12,13].map(i => `
            <tr style="height:16px;">
              <td style="text-align:center; color:#9ca3af;">${i}</td>
              <td style="color:#6b7280;">Zebra-ZD4A043-30PM00EZ</td>
              <td style="font-family:monospace; font-size:10px; color:#6b7280;">D6J224010${280 + i}</td>
              <td style="text-align:center; color:#6b7280;">1 unit</td>
              <td style="color:#dc2626; font-size:9.5px;">Warranty 2 Yrs./Printerhead 6 Mth</td>
            </tr>
          `).join('')}
          <tr style="font-weight:bold; background:#f9fafb;">
            <td colspan="3" style="text-align:center;">รวมทั้งสิ้น</td>
            <td style="text-align:center;">13 units</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <!-- Terms & Signatures -->
      <div style="background:#52525b; color:#fff; font-weight:bold; padding:2px 8px; font-size:10px; text-align:center;">
        เงื่อนไขการรับประกันสินค้า
      </div>
      <div style="border:1px solid #000; border-top:none; padding:5px 8px; font-size:9.5px; line-height:1.4; margin-bottom:8px;">
        <p>• เอกสารฉบับนี้เป็นเอกสารแสดงว่าทาง <strong>บริษัท 888 เทคโนโลยี จำกัด</strong> ได้ส่งมอบสินค้าพร้อมกับการรับประกันสินค้าเป็นระยะเวลา <strong>2 ปี</strong> นับจากวันที่ลูกค้ารับสินค้า ตามรายการข้างต้น</p>
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

// 4. TEMPLATE: ใบส่งมอบ / ใบรับประกันสินค้า (Talent Technology)
function renderTalentDeliveryHTML(asset, data) {
  return `
    <div style="position:relative; width:100%; font-size:11px;">
      <!-- Talent Header -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
        <tr>
          <td style="vertical-align:middle; width:75%;">
            <div style="font-size:16px; font-weight:800; color:#000;">บริษัท ทาร์เล้นท์ เทคโนโลยี จำกัด</div>
            <div style="font-size:12px; font-weight:700; color:#374151;">TALENT TECHNOLOGY CO.,LTD.</div>
            <div style="font-size:9.5px; color:#4b5563; margin-top:2px;">40/61 ซอยเพชรเกษม 77/4 แขวงหนองค้างพลู เขตหนองแขม กรุงเทพฯ 10160</div>
            <div style="font-size:9.5px; color:#4b5563;">Tel. 02-809-7017 Fax. 02-421-7762 www.tl.co.th</div>
          </td>
          <td style="vertical-align:middle; text-align:right; width:25%;">
            <div style="font-size:24px; font-weight:900; color:#2563eb; border:2px solid #2563eb; padding:4px 8px; display:inline-block;">TL TECH</div>
          </td>
        </tr>
      </table>

      <!-- Customer Info Card -->
      <div style="border:1px solid #000; padding:10px 12px; margin-bottom:16px; line-height:1.6; font-size:11px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:15%; font-weight:bold;">ลูกค้า</td>
            <td style="width:85%;"><strong>โรงพยาบาลพญาไท 3 จำกัด</strong></td>
          </tr>
          <tr>
            <td style="font-weight:bold;">ที่อยู่</td>
            <td>111 ถ.เพชรเกษม แขวงปากคลองภาษีเจริญ เขตภาษีเจริญ กทม. 10160</td>
          </tr>
          <tr>
            <td style="font-weight:bold;">โทร.</td>
            <td>02-4671111 ต่อ 3456</td>
          </tr>
          <tr>
            <td style="font-weight:bold;">ติดต่อ</td>
            <td>คุณเอก 082-6678955 ชั้น 4</td>
          </tr>
          <tr>
            <td style="font-weight:bold;">อ้างอิง</td>
            <td>SO: 6608-0029 &nbsp;&nbsp;&nbsp;&nbsp; PO: 23023013066</td>
          </tr>
        </table>
      </div>

      <!-- Main Asset Voucher -->
      <div style="border:1.5px solid #000; padding:14px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e5e7eb; padding-bottom:8px; margin-bottom:10px;">
          <div style="font-size:15px; font-weight:bold; color:#000;">${asset.brand || 'Acer'} ${asset.model || 'Veriton M4690G'}</div>
          <div style="font-size:13px; font-weight:bold;">1 Unit</div>
        </div>

        <div style="font-size:12px; font-weight:bold; color:#1e40af; font-family:monospace; margin-bottom:10px;">
          S/N: ${asset.serial_no}
        </div>

        <div style="font-size:10.5px; color:#374151; line-height:1.6; background:#f9fafb; padding:8px; border-radius:4px;">
          <div>• CPU Intel Core i7 12700 LGA 2.1G 25M</div>
          <div>• Intel B660 Chipset | MEM UNB-DIMM 16GB DDR4</div>
          <div>• SSD M.2 NVMe 512GB | HDD 3.5" 2TB SATA3 (7200rpm)</div>
          <div>• Windows 11 Pro 64bit | Acer USB Keyboard & USB Mouse</div>
          <div style="color:#dc2626; font-weight:bold; margin-top:4px;">• Warranty 3Yrs. Onsite Service</div>
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
            <div style="margin-top:10px;">Date ...... / ...... / 2568</div>
          </td>
          <td style="width:50%; text-align:right;">
            <div>Delivery by ....................................................</div>
            <div style="margin-top:10px;">Date ...... / ...... / 2568</div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// 5. TEMPLATE: ClaimIT Comprehensive Multi-Asset & PDPA Audit Report
function renderClaimITComplianceHTML(asset, data) {
  const isWiped = asset.rma_data_wiped_confirmed || asset.status === 'Sanitized';

  return `
    <div style="position:relative; width:100%; font-size:11px; line-height:1.45;">
      <div style="border-bottom:2px solid #0284c7; padding-bottom:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div style="font-size:18px; font-weight:800; color:#0284c7;">ClaimIT — Hospital Asset Warranty & Compliance Report</div>
          <div style="font-size:11px; color:#64748b;">ระบบติดตามรับประกันและส่งเคลมครุภัณฑ์ไอที โรงพยาบาลพญาไท 3</div>
        </div>
        <div style="text-align:right; font-size:10.5px; color:#64748b;">
          <div><strong>Report Date:</strong> ${data.todayFormatted}</div>
          <div><strong>Ref:</strong> ${asset.asset_tag}</div>
        </div>
      </div>

      <!-- Section 1: Specifications -->
      <div style="font-size:12px; font-weight:bold; color:#0f172a; margin-bottom:4px; text-decoration:underline;">1. ข้อมูลจำเพาะของครุภัณฑ์ (Asset Specifications)</div>
      <div style="border:1px solid #cbd5e1; padding:8px; margin-bottom:10px; font-size:11px; line-height:1.5;">
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="width:30%;"><strong>รหัสครุภัณฑ์ (Asset Tag):</strong></td><td><strong>${asset.asset_tag}</strong></td></tr>
          <tr><td><strong>ชื่ออุปกรณ์:</strong></td><td>${asset.device_name}</td></tr>
          <tr><td><strong>หมวดหมู่ / แบรนด์ / รุ่น:</strong></td><td>${asset.category} | ${asset.brand} ${asset.model}</td></tr>
          <tr><td><strong>หมายเลขซีเรียล (S/N):</strong></td><td style="font-family:monospace; font-weight:bold;">${asset.serial_no}</td></tr>
          <tr><td><strong>จุดติดตั้ง / แผนก:</strong></td><td>${asset.location}</td></tr>
          <tr><td><strong>ระยะเวลารับประกัน:</strong></td><td>${asset.warranty_start} ถึง ${asset.warranty_end}</td></tr>
          <tr><td><strong>สถานะปัจจุบัน:</strong></td><td><strong>${asset.status}</strong> (Salvage Status: ${asset.salvage_status || 'None'})</td></tr>
        </table>
      </div>

      <!-- Section 2: PDPA Sanitization -->
      <div style="font-size:12px; font-weight:bold; color:#0f172a; margin-bottom:4px; text-decoration:underline;">2. การตรวจสอบความปลอดภัยข้อมูลผู้ป่วย (PDPA Security & Sanitization Audit)</div>
      <div style="border:1px solid #cbd5e1; padding:8px; margin-bottom:10px; font-size:11px; line-height:1.5; background:${isWiped ? '#f0fdf4' : '#fff'};">
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="width:40%;"><strong>อุปกรณ์บันทึกข้อมูลหลัก (Storage):</strong></td><td>${asset.sanitization_required ? 'ใช่ (ต้องทำการ Sanitization)' : 'ไม่ใช่ (Non-Storage Device)'}</td></tr>
          <tr><td><strong>สถานะการล้างข้อมูล (Wipe Status):</strong></td><td><strong style="color:${isWiped ? '#16a34a' : '#dc2626'};">${isWiped ? '✓ ยืนยันการล้างข้อมูลแล้ว (CONFIRMED WIPED)' : 'ยังไม่ได้ดำเนินการล้างข้อมูล'}</strong></td></tr>
          <tr><td><strong>ผู้ตรวจสอบความปลอดภัย:</strong></td><td>${asset.data_wiped_by || state.user?.name || 'IT Security Officer'}</td></tr>
          <tr><td><strong>บันทึกความปลอดภัย:</strong></td><td>${asset.sanitization_note || 'Verified data wipe and security protocol compliance.'}</td></tr>
        </table>
      </div>

      <!-- Section 3: RMA Details -->
      <div style="font-size:12px; font-weight:bold; color:#0f172a; margin-bottom:4px; text-decoration:underline;">3. ประวัติการส่งเคลมและศูนย์บริการ (Vendor RMA Service Record)</div>
      <div style="border:1px solid #cbd5e1; padding:8px; margin-bottom:12px; font-size:11px; line-height:1.5;">
        <table style="width:100%; border-collapse:collapse;">
          <tr><td style="width:40%;"><strong>ศูนย์บริการ / ผู้จัดจำหน่าย:</strong></td><td>${asset.vendor_name || '888 Technology Co.,Ltd. / Talent Tech'}</td></tr>
          <tr><td><strong>หมายเลขใบเคลม (RMA No.):</strong></td><td>${asset.vendor_rma_number || data.jobNo}</td></tr>
          <tr><td><strong>วันที่ส่งเคลม:</strong></td><td>${asset.claim_date || data.todayFormatted}</td></tr>
          <tr><td><strong>กำหนดส่งคืนโดยประมาณ:</strong></td><td>${asset.expected_return_date || '-'}</td></tr>
        </table>
      </div>

      <!-- Authorization Signatures -->
      <table style="width:100%; border-collapse:collapse; margin-top:20px; font-size:10.5px;">
        <tr>
          <td style="width:50%; text-align:center; padding:10px;">
            <div>....................................................................</div>
            <div style="margin-top:4px;">( ${state.user?.name || 'เจ้าหน้าที่ฝ่ายเทคโนโลยีสารสนเทศ'} )</div>
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
