/**
 * ClaimIT Frontend - Official Hospital Forms & Print Center
 * Exclusively provides the two official Phyathai 3 Hospital forms:
 * 1. ใบตรวจเช็คอุปกรณ์ เสีย (Hospital Defective Equipment Inspection Form)
 * 2. ใบนําอุปกรณ์ ทรัพย์สิน ออกนอกพื้นที่ (PT3-FM-SEC-1012 Asset Gate Pass)
 */

let currentTemplateAsset = null;

// Direct PDF Download with template selection
window.downloadPDF = async function(assetTag, formType = 'inspection') {
  if (!state.user || !state.user.token) {
    showToast('กรุณาเข้าสู่ระบบก่อนดาวน์โหลด PDF', 'warning');
    return;
  }
  try {
    const res = await fetch(`/api/assets/${encodeURIComponent(assetTag)}/pdf?form=${encodeURIComponent(formType)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('PDF generation failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const formPrefix = formType === 'gatepass' ? 'PT3-FM-SEC-1012' : 'Inspection';
    a.download = `${formPrefix}_${assetTag}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`ดาวน์โหลดเอกสาร PDF สำเร็จ (${formPrefix} - ${assetTag})`, 'success');
  } catch (err) {
    console.error('PDF download error:', err);
    showToast('ไม่สามารถดาวน์โหลด PDF ได้', 'error');
  }
};

// Open Template Center
window.openTemplateCenter = function(assetTag, preferredForm = 'inspection') {
  const tag = (assetTag || (state.selectedAsset ? state.selectedAsset.asset_tag : '')).trim();
  if (!tag) {
    showToast('กรุณาระบุหรือเลือกครุภัณฑ์ก่อนเปิดแบบฟอร์ม', 'warning');
    return;
  }

  const selector = document.getElementById('template-selector');
  if (selector && preferredForm) {
    selector.value = preferredForm;
  }

  if (state.selectedAsset && state.selectedAsset.asset_tag.toUpperCase() === tag.toUpperCase()) {
    currentTemplateAsset = state.selectedAsset;
    initAndShowTemplateModal();
  } else {
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

// Batch Multi-Asset Gate Pass (PT3-FM-SEC-1012) for Claim Bundles
window.openClaimGatePassTemplate = function(claim) {
  if (!claim || !claim.assets || claim.assets.length === 0) {
    showToast('ไม่พบรายการครุภัณฑ์ในใบเคลมนี้', 'warning');
    return;
  }
  currentTemplateAsset = {
    ...claim.assets[0],
    assets: claim.assets,
    vendor_name: claim.vendor_name,
    vendor_rma_number: claim.vendor_rma_number
  };
  const selector = document.getElementById('template-selector');
  if (selector) selector.value = 'gatepass';
  initAndShowTemplateModal();
};

function initAndShowTemplateModal() {
  if (!currentTemplateAsset) return;
  const modal = document.getElementById('print-template-modal');
  if (!modal) return;

  const now = new Date();
  const shortThaiDate = `${now.getDate().toString().padStart(2, '0')} / ${(now.getMonth() + 1).toString().padStart(2, '0')} / ${now.getFullYear() + 543}`;

  // Pre-fill quick edit inputs
  const editDocDate = document.getElementById('edit-doc-date');
  if (editDocDate) editDocDate.value = shortThaiDate;

  const editInspector = document.getElementById('edit-inspector-name');
  if (editInspector) editInspector.value = (state.user && state.user.name) ? state.user.name : 'เจ้าหน้าที่ไอที ประจำโรงพยาบาล';

  const editDept = document.getElementById('edit-department');
  if (editDept) editDept.value = currentTemplateAsset.location || (state.user?.department) || 'เทคโนโลยีสารสนเทศ';

  const editFloor = document.getElementById('edit-floor');
  if (editFloor) editFloor.value = (currentTemplateAsset.location?.match(/Fl(oor)?\s*(\d+)/i)?.[2]) || '2';

  const editProblem = document.getElementById('edit-problem-desc');
  if (editProblem) {
    if (currentTemplateAsset.category === 'Printer' || (currentTemplateAsset.device_name || '').toLowerCase().includes('printer')) {
      editProblem.value = 'ปริ้นเป็นเส้น / หัวพิมพ์ติดขัด (TM-Bit missing)';
    } else if (currentTemplateAsset.category === 'Scanner') {
      editProblem.value = 'สแกนเนอร์ไม่อ่านบาร์โค้ด / สัญญาณขาดหาย';
    } else {
      editProblem.value = 'เครื่องเปิดไม่ติด / อุปกรณ์ฮาร์ดแวร์ทำงานผิดปกติ';
    }
  }

  const editVendor = document.getElementById('edit-vendor-name');
  if (editVendor) {
    editVendor.value = currentTemplateAsset.vendor_name || `${currentTemplateAsset.brand || 'Acer'} Service Center`;
  }

  const editSender = document.getElementById('edit-sender-name');
  if (editSender) editSender.value = state.user?.name || 'นายพิพัฒน์ วงศ์สวัสดิ์';

  const editRequester = document.getElementById('edit-requester-name');
  if (editRequester) editRequester.value = state.user?.name || 'นายพิพัฒน์ วงศ์สวัสดิ์';

  const editPosition = document.getElementById('edit-position');
  if (editPosition) editPosition.value = state.user?.role === 'admin' ? 'หัวหน้างานเทคโนโลยีสารสนเทศ' : 'เจ้าหน้าที่เทคโนโลยีสารสนเทศ';

  const editVehiclePlate = document.getElementById('edit-vehicle-plate');
  if (editVehiclePlate) editVehiclePlate.value = '1กข-5542 กทม.';

  const editVehicleBrand = document.getElementById('edit-vehicle-brand');
  if (editVehicleBrand) editVehicleBrand.value = 'Toyota สีขาว / ขนส่งศูนย์บริการ';

  const editExitTime = document.getElementById('edit-exit-time');
  if (editExitTime) editExitTime.value = `${shortThaiDate} เวลา 14:00 น.`;

  modal.style.display = 'flex';
  renderActiveTemplate();
}

window.renderActiveTemplate = function() {
  const container = document.getElementById('printable-template-paper');
  const selector = document.getElementById('template-selector');
  if (!container || !selector || !currentTemplateAsset) return;

  const templateType = selector.value;
  const asset = currentTemplateAsset;

  const now = new Date();
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const customData = {
    docDate: (document.getElementById('edit-doc-date')?.value || `${now.getDate()} / ${now.getMonth() + 1} / ${now.getFullYear() + 543}`).trim(),
    day: now.getDate().toString(),
    month: thaiMonths[now.getMonth()],
    year: (now.getFullYear() + 543).toString(),
    inspectorName: (document.getElementById('edit-inspector-name')?.value || state.user?.name || 'เจ้าหน้าที่ไอที ประจำโรงพยาบาล').trim(),
    department: (document.getElementById('edit-department')?.value || asset.location || 'เทคโนโลยีสารสนเทศ').trim(),
    floor: (document.getElementById('edit-floor')?.value || '2').trim(),
    problemDesc: (document.getElementById('edit-problem-desc')?.value || 'เปิดไม่ติด / ฮาร์ดแวร์ทำงานผิดปกติ').trim(),
    nextAction: (document.getElementById('edit-next-action')?.value || 'claim'),
    vendorName: (document.getElementById('edit-vendor-name')?.value || asset.vendor_name || `${asset.brand || 'Acer'} Service Center`).trim(),
    senderName: (document.getElementById('edit-sender-name')?.value || state.user?.name || 'นายพิพัฒน์ วงศ์สวัสดิ์').trim(),
    requesterName: (document.getElementById('edit-requester-name')?.value || state.user?.name || 'นายพิพัฒน์ วงศ์สวัสดิ์').trim(),
    position: (document.getElementById('edit-position')?.value || 'เจ้าหน้าที่เทคโนโลยีสารสนเทศ').trim(),
    reason: (document.getElementById('edit-reason')?.value || 'repair'),
    vehiclePlate: (document.getElementById('edit-vehicle-plate')?.value || '1กข-5542 กทม.').trim(),
    vehicleBrand: (document.getElementById('edit-vehicle-brand')?.value || 'Toyota สีขาว / ขนส่งศูนย์บริการ').trim(),
    exitTime: (document.getElementById('edit-exit-time')?.value || `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543} เวลา 14:00 น.`).trim()
  };

  let html = '';
  if (templateType === 'gatepass') {
    html = renderGatePassFormHTML(asset, customData);
  } else {
    html = renderInspectionFormHTML(asset, customData);
  }

  container.innerHTML = html;
};

// ============================================================================
// 1. FORM 1: ใบตรวจเช็คอุปกรณ์ เสีย (Hospital Defective Equipment Inspection Form)
// Exact match with PDF 2
// ============================================================================
function renderInspectionFormHTML(asset, data) {
  const isClaim = data.nextAction === 'claim';
  const isRepair = data.nextAction === 'repair';
  const isReplace = data.nextAction === 'replace';
  const isScrap = data.nextAction === 'scrap';
  const isStock = data.nextAction === 'stock';

  return `
    <div style="font-family:'Sarabun', 'Tahoma', sans-serif; color:#000; width:100%; box-sizing:border-box; line-height:1.6;">
      <!-- Header Bar with Logo and Title -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <tr>
          <td style="width:30%; vertical-align:middle;">
            <div style="display:flex; align-items:center; gap:8px;">
              <!-- Phyathai 3 Logo Graphic -->
              <svg width="38" height="38" viewBox="0 0 100 100" style="flex-shrink:0;">
                <circle cx="50" cy="20" r="14" fill="#059669" />
                <circle cx="78" cy="35" r="14" fill="#059669" />
                <circle cx="78" cy="65" r="14" fill="#059669" />
                <circle cx="50" cy="80" r="14" fill="#059669" />
                <circle cx="22" cy="65" r="14" fill="#059669" />
                <circle cx="22" cy="35" r="14" fill="#059669" />
                <circle cx="50" cy="50" r="10" fill="#10b981" />
              </svg>
              <div>
                <div style="font-size:18px; font-weight:800; color:#047857; line-height:1.1;">พญาไท 3</div>
                <div style="font-size:13px; font-weight:700; color:#065f46; letter-spacing:0.5px;">PHYATHAI 3</div>
                <div style="font-size:9.5px; color:#4b5563;">เพชรเกษม 19</div>
              </div>
            </div>
          </td>
          <td style="width:70%; vertical-align:middle; text-align:right;">
            <table style="width:100%; border:1.5px solid #000; border-collapse:collapse;">
              <tr>
                <td style="width:55%; font-size:17px; font-weight:bold; padding:8px 12px; text-align:left; border-right:1.5px solid #000;">
                  ใบตรวจเช็คอุปกรณ์ เสีย
                </td>
                <td style="width:45%; font-size:13px; padding:8px 12px; text-align:left;">
                  วันที่ <span style="font-weight:bold;">${data.docDate}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Equipment Details Block -->
      <div style="line-height:2.3; font-size:13px; margin-bottom:16px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:60%;">
              ประเภทอุปกรณ์ : <span style="border-bottom:1px dotted #000; display:inline-block; min-width:240px; font-weight:600; padding:0 6px;">${asset.category || asset.device_name || 'คอมพิวเตอร์'}</span>
            </td>
            <td style="width:40%; text-align:right;">
              <span style="color:#dc2626; font-weight:bold;">ผู้เก็บอุปกรณ์</span> <span style="border-bottom:1px dotted #dc2626; display:inline-block; min-width:180px; text-align:left; font-weight:600; padding:0 6px; color:#000;">${data.inspectorName}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2">
              Tag / Serial : <span style="border-bottom:1px dotted #000; display:inline-block; min-width:450px; font-family:monospace; font-weight:bold; font-size:13.5px; color:#0284c7; padding:0 6px;">${asset.asset_tag} / ${asset.serial_no}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2">
              แผนก : <span style="border-bottom:1px dotted #000; display:inline-block; min-width:320px; font-weight:600; padding:0 6px;">${data.department}</span>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              ชั้น : <span style="border-bottom:1px dotted #000; display:inline-block; min-width:80px; text-align:center; font-weight:600; padding:0 6px;">${data.floor}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Equipment Status Section -->
      <div style="margin-bottom:16px; font-size:13px; line-height:2.2;">
        <div style="font-weight:bold; text-decoration:underline; margin-bottom:4px;">สถานะอุปกรณ์</div>
        <div style="padding-left:18px;">
          <span class="doc-chk"></span> ใช้งานได้ <span style="color:#dc2626;">หมายเหตุ ( ถ้ามี )</span><span style="border-bottom:1px dotted #000; display:inline-block; min-width:440px;"></span>
        </div>
        <div style="padding-left:18px;">
          <span class="doc-chk checked"></span> เสีย อาการเสีย <span style="border-bottom:1px dotted #000; display:inline-block; min-width:510px; font-weight:600; color:#b91c1c; padding:0 6px;">${data.problemDesc}</span>
        </div>
      </div>

      <!-- Action Next Steps Section -->
      <div style="margin-bottom:28px; font-size:13px; line-height:2.2;">
        <div style="font-weight:bold; text-decoration:underline; margin-bottom:4px;">สถานะดำเนินการต่อ</div>
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; padding-left:18px; padding-right:10px;">
          <span><span class="doc-chk ${isClaim ? 'checked' : ''}"></span> ส่งเครม</span>
          <span><span class="doc-chk ${isRepair ? 'checked' : ''}"></span> ส่งซ่อม<span style="color:#dc2626;">*มีค่าใช่จ่าย</span></span>
          <span><span class="doc-chk ${isReplace ? 'checked' : ''}"></span> สั่งซื้อทดแทน</span>
          <span><span class="doc-chk ${isScrap ? 'checked' : ''}"></span> ตัดขาย</span>
          <span><span class="doc-chk ${isStock ? 'checked' : ''}"></span> เก็บเข้า Stock</span>
        </div>
      </div>

      <!-- 3 Signature Columns Block (Strict match to PDF 2) -->
      <table style="width:100%; border:1.5px solid #000; border-collapse:collapse; font-size:12px;">
        <tr>
          <!-- Column 1: ผู้ตรวจสอบอุปกรณ์ -->
          <td style="width:33.33%; border:1.5px solid #000; padding:14px 10px; vertical-align:top; height:200px; box-sizing:border-box;">
            <div style="text-align:center; font-weight:bold; font-size:13px; text-decoration:underline; margin-bottom:30px;">
              ผู้ตรวจสอบอุปกรณ์
            </div>
            <div style="margin-bottom:14px;">ลงชื่อ <span style="border-bottom:1px dotted #000; display:inline-block; min-width:145px; text-align:center;">${data.inspectorName}</span></div>
            <div style="margin-bottom:14px; text-align:left;">วันที่ <span style="border-bottom:1px dotted #000; display:inline-block; min-width:150px; text-align:center;">${data.docDate}</span></div>
            <div>หมายเหตุ <span style="border-bottom:1px dotted #000; display:inline-block; min-width:125px;">ตรวจสอบเงื่อนไขรับประกันแล้ว</span></div>
          </td>

          <!-- Column 2: ผู้ดำเนินการต่อ -->
          <td style="width:33.33%; border:1.5px solid #000; padding:14px 10px; vertical-align:top; height:200px; box-sizing:border-box;">
            <div style="text-align:center; font-weight:bold; font-size:13px; text-decoration:underline; margin-bottom:30px;">
              ผู้ดำเนินการต่อ
            </div>
            <div style="margin-bottom:14px;">ลงชื่อ <span style="border-bottom:1px dotted #000; display:inline-block; min-width:145px; text-align:center;">${data.senderName}</span></div>
            <div style="margin-bottom:14px; text-align:left;">วันที่ <span style="border-bottom:1px dotted #000; display:inline-block; min-width:150px; text-align:center;">${data.docDate}</span></div>
            <div>หมายเหตุ <span style="border-bottom:1px dotted #000; display:inline-block; min-width:125px;">ส่งเคลมศูนย์บริการ</span></div>
          </td>

          <!-- Column 3: เฉพาะกรณีส่งเครม , ส่งซ่อม (Red highlighted text) -->
          <td style="width:33.33%; border:1.5px solid #000; padding:14px 10px; vertical-align:top; height:200px; box-sizing:border-box;">
            <div style="text-align:center; font-weight:bold; font-size:13px; text-decoration:underline; color:#dc2626; margin-bottom:24px;">
              เฉพาะกรณีส่งเครม , ส่งซ่อม
            </div>
            <div style="color:#dc2626; margin-bottom:12px;">
              วันที่ส่งเครม / ส่งซ่อม : วันที่ <span style="border-bottom:1px dotted #dc2626; display:inline-block; min-width:70px; text-align:center; color:#000; font-weight:600;">${data.docDate}</span>
            </div>
            <div style="color:#dc2626; margin-bottom:28px;">
              ชื่อ บริษัท <span style="border-bottom:1px dotted #dc2626; display:inline-block; min-width:140px; color:#000; font-weight:600;">${data.vendorName}</span>
            </div>
            <div style="margin-bottom:4px;">ลงชื่อ <span style="border-bottom:1px dotted #000; display:inline-block; min-width:155px; text-align:center;">${data.senderName}</span></div>
            <div style="text-align:center; font-size:11px; color:#374151;">(ชื่อผู้ส่งอุปกรณ์)</div>
          </td>
        </tr>
      </table>
    </div>
  `;
}


// ============================================================================
// 2. FORM 2: ใบนําอุปกรณ์ ทรัพย์สิน ออกนอกพื้นที่ (PT3-FM-SEC-1012)
// Exact match with PDF 1
// ============================================================================
function renderGatePassFormHTML(asset, data) {
  const isRepairReason = data.reason === 'repair';
  const isSellReason = data.reason === 'sell';
  const isOutsideReason = data.reason === 'outside';
  const isBorrowReason = data.reason === 'borrow';
  const isDormReason = data.reason === 'dorm';
  const isOtherReason = data.reason === 'other';

  // Support single asset or multi-asset list
  const assetList = (asset.assets && Array.isArray(asset.assets) && asset.assets.length > 0)
    ? asset.assets
    : [asset];

  const tableRows = [];
  for (let i = 1; i <= 10; i++) {
    const item = assetList[i - 1];
    if (item) {
      tableRows.push(`
        <tr style="height:20px;">
          <td style="border:1px solid #000; text-align:center; font-weight:bold;">${i}</td>
          <td style="border:1px solid #000; padding:2px 6px;">
            <strong>${item.device_name || item.category || 'คอมพิวเตอร์'}</strong> (${item.brand || ''} ${item.model || ''}) S/N: ${item.serial_no || '-'}
          </td>
          <td style="border:1px solid #000; text-align:center;">1 เครื่อง</td>
          <td style="border:1px solid #000; padding:2px 6px; font-family:monospace; font-size:9px;">Tag: ${item.asset_tag || '-'}</td>
        </tr>
      `);
    } else {
      tableRows.push(`
        <tr style="height:19px;">
          <td style="border:1px solid #000; text-align:center; color:#9ca3af;">${i}</td>
          <td style="border:1px solid #000;"></td>
          <td style="border:1px solid #000;"></td>
          <td style="border:1px solid #000;"></td>
        </tr>
      `);
    }
  }

  return `
    <div style="font-family:'Sarabun', 'Tahoma', sans-serif; color:#000; width:100%; box-sizing:border-box; font-size:10.5px; line-height:1.45;">
      <!-- Top Reference Header -->
      <div style="display:flex; justify-content:space-between; font-size:8.5px; color:#374151; margin-bottom:3px;">
        <span></span>
        <span>PT3-FM-SEC-1012; แก้ไขครั้งที่ 07; วันที่มีผลบังคับใช้ 01/12/2563; หน้า 1 / 1</span>
      </div>

      <!-- Main Header: Logo, Title, Doc Number -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
        <tr>
          <td style="width:25%; vertical-align:middle;">
            <div style="display:flex; align-items:center; gap:6px;">
              <svg width="32" height="32" viewBox="0 0 100 100" style="flex-shrink:0;">
                <circle cx="50" cy="20" r="14" fill="#059669" />
                <circle cx="78" cy="35" r="14" fill="#059669" />
                <circle cx="78" cy="65" r="14" fill="#059669" />
                <circle cx="50" cy="80" r="14" fill="#059669" />
                <circle cx="22" cy="65" r="14" fill="#059669" />
                <circle cx="22" cy="35" r="14" fill="#059669" />
                <circle cx="50" cy="50" r="10" fill="#10b981" />
              </svg>
              <div>
                <div style="font-size:11.5px; font-weight:bold; color:#047857; line-height:1.1;">PHYATHAI 3 HOSPITAL</div>
                <div style="font-size:9.5px; color:#065f46; font-weight:bold;">โรงพยาบาลพญาไท 3</div>
                <div style="font-size:7px; color:#6b7280;">PETCHKASEM 19 • เพชรเกษม 19</div>
              </div>
            </div>
          </td>
          <td style="width:50%; text-align:center; vertical-align:middle;">
            <div style="font-size:15.5px; font-weight:800; letter-spacing:0.5px;">ใบนําอุปกรณ์ ทรัพย์สิน ออกนอกพื้นที่</div>
          </td>
          <td style="width:25%; text-align:right; vertical-align:top; font-weight:bold; font-size:11px;">
            PT3-FM-SEC-1012
          </td>
        </tr>
      </table>

      <!-- Date Line -->
      <div style="text-align:right; font-size:10.5px; margin-bottom:4px;">
        วันที่ <span style="border-bottom:1px dotted #000; padding:0 6px; font-weight:600;">${data.day}</span>
        เดือน <span style="border-bottom:1px dotted #000; padding:0 8px; font-weight:600;">${data.month}</span>
        ปี <span style="border-bottom:1px dotted #000; padding:0 8px; font-weight:600;">${data.year}</span>
      </div>

      <!-- Requester Information -->
      <div style="font-size:10.5px; line-height:1.8; margin-bottom:4px;">
        ชื่อ-สกุล <span style="border-bottom:1px dotted #000; display:inline-block; min-width:180px; padding:0 4px; font-weight:600;">${data.requesterName}</span>
        ตำแหน่ง <span style="border-bottom:1px dotted #000; display:inline-block; min-width:140px; padding:0 4px; font-weight:600;">${data.position}</span>
        แผนก/หน่วย <span style="border-bottom:1px dotted #000; display:inline-block; min-width:140px; padding:0 4px; font-weight:600;">${data.department}</span>
      </div>

      <!-- Ownership and Method -->
      <div style="font-size:10.5px; line-height:1.6; margin-bottom:3px;">
        ขอนำรายการทรัพย์สินของ &nbsp;&nbsp;
        <span class="doc-chk checked"></span> โรงพยาบาลออก &nbsp;&nbsp;&nbsp;&nbsp;
        <span class="doc-chk"></span> ส่วนตัว &nbsp;&nbsp;&nbsp;&nbsp;
        ออกจากพื้นที่ของโรงพยาบาล ด้วยวิธีการ
      </div>
      <div style="font-size:10.5px; line-height:1.6; margin-bottom:6px;">
        <span class="doc-chk"></span> นำออกด้วยตนเอง &nbsp;&nbsp;&nbsp;&nbsp;
        <span class="doc-chk checked"></span> อนุญาตให้ ชื่อ/บริษัท <span style="border-bottom:1px dotted #000; display:inline-block; min-width:240px; padding:0 4px; font-weight:bold;">${data.vendorName}</span> เป็นตัวแทนนำออก
      </div>

      <!-- Item Table Section (10 Rows) -->
      <div style="font-size:10.5px; margin-bottom:2px; font-weight:600;">ดังรายการต่อไป</div>
      <table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-bottom:6px; font-size:9.5px;">
        <thead>
          <tr style="background:#f9fafb; text-align:center; height:20px;">
            <th style="border:1px solid #000; width:8%; font-weight:bold;">ลำดับ</th>
            <th style="border:1px solid #000; width:52%; font-weight:bold;">รายการ</th>
            <th style="border:1px solid #000; width:15%; font-weight:bold;">จำนวน</th>
            <th style="border:1px solid #000; width:25%; font-weight:bold;">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.join('')}
        </tbody>
      </table>

      <!-- Bottom Split Section: Left & Right Boxes -->
      <table style="width:100%; border-collapse:collapse; border:1px solid #000; font-size:9.5px; margin-bottom:5px;">
        <tr>
          <!-- Left Column: Reasons, Vehicle, Box 1 -->
          <td style="width:50%; border-right:1px solid #000; padding:6px 8px; vertical-align:top; box-sizing:border-box;">
            <div style="font-weight:bold; margin-bottom:3px;">เหตุผลในการนำออก</div>
            <div style="line-height:1.5; margin-left:6px;">
              <div><span class="doc-chk ${isRepairReason ? 'checked' : ''}"></span> เพื่อซ่อม</div>
              <div><span class="doc-chk ${isSellReason ? 'checked' : ''}"></span> จำหน่าย</div>
              <div><span class="doc-chk ${isOutsideReason ? 'checked' : ''}"></span> ใช้งานภายนอกโรงพยาบาล</div>
              <div><span class="doc-chk ${isBorrowReason ? 'checked' : ''}"></span> ยืมระหว่างโรงพยาบาล</div>
              <div><span class="doc-chk ${isDormReason ? 'checked' : ''}"></span> ย้ายออกจากหอพัก ห้อง.............................</div>
              <div><span class="doc-chk ${isOtherReason ? 'checked' : ''}"></span> อื่น............................................................</div>
            </div>

            <div style="margin-top:5px; line-height:1.6;">
              <div>วันที่จะนำทรัพย์สินออก <span style="border-bottom:1px dotted #000; display:inline-block; min-width:115px; padding:0 4px; font-weight:600;">${data.docDate}</span> เวลา <span style="border-bottom:1px dotted #000; display:inline-block; min-width:55px; padding:0 4px; font-weight:600;">14:00 น.</span></div>
              <div style="font-weight:bold; margin-top:2px;">ยานพาหนะที่นำทรัพย์สินออก</div>
              <div>ทะเบียน <span style="border-bottom:1px dotted #000; display:inline-block; min-width:105px; padding:0 4px; font-weight:600;">${data.vehiclePlate}</span> สี <span style="border-bottom:1px dotted #000; display:inline-block; min-width:60px; padding:0 4px; font-weight:600;">ขาว</span></div>
              <div>ยี่ห้อ <span style="border-bottom:1px dotted #000; display:inline-block; min-width:170px; padding:0 4px; font-weight:600;">${data.vehicleBrand}</span></div>
            </div>

            <!-- 1. เจ้าของทรัพย์สิน (กรณีทรัพย์สินส่วนตัว) -->
            <div style="border-top:1px solid #000; margin-top:6px; padding-top:4px; line-height:1.5;">
              <div style="font-weight:bold;">1. เจ้าของทรัพย์สิน (กรณีทรัพย์สินส่วนตัว)</div>
              <div style="margin-top:2px;">ลงชื่อ.......................................................................</div>
              <div>(............................................................................)</div>
              <div>วันที่...........................เวลา.....................................</div>
            </div>
          </td>

          <!-- Right Column: Boxes 2, 3, 4, 5 -->
          <td style="width:50%; padding:0; vertical-align:top; box-sizing:border-box;">
            <!-- 2. หน่วยงานเจ้าของทรัพย์สิน -->
            <div style="padding:4px 8px; border-bottom:1px solid #000; line-height:1.45;">
              <div style="font-weight:bold;">2. หน่วยงานเจ้าของทรัพย์สิน (กรณีทรัพย์สินของหน่วยงาน)</div>
              <div style="margin-top:2px;">ลงชื่อ <span style="border-bottom:1px dotted #000; display:inline-block; min-width:160px; text-align:center;">${data.inspectorName}</span></div>
              <div>( <span style="border-bottom:1px dotted #000; display:inline-block; min-width:145px; text-align:center;">${data.inspectorName}</span> )</div>
              <div style="text-align:center; font-size:9px; color:#374151;">ผู้จัดการแผนก/หัวหน้าหน่วย</div>
            </div>

            <!-- 3. ผู้อำนวยการโรงพยาบาล/ฝ่าย/ส่วน -->
            <div style="padding:4px 8px; border-bottom:1px solid #000; line-height:1.45;">
              <div style="font-weight:bold;">3. ผู้อำนวยการโรงพยาบาล/ผู้อำนวยการฝ่าย/ผู้จัดการส่วน</div>
              <div style="font-size:8.5px; color:#4b5563;">พิจารณาอนุมัติ/รับทราบ (กรณีทรัพย์สินของหน่วยงาน)</div>
              <div style="margin-top:2px;">ลงชื่อ.................................................................</div>
              <div>(.........................................................................)</div>
              <div>ตำแหน่ง..............................................................</div>
            </div>

            <!-- 4. รปภ.จุดทางออก -->
            <div style="padding:4px 8px; border-bottom:1px solid #000; line-height:1.45;">
              <div style="font-weight:bold;">4. รปภ.จุดทางออกตรวจสอบทรัพย์สินตามรายการ</div>
              <div style="margin-top:2px;">ลงชื่อ................................................................</div>
              <div>(.......................................................................)</div>
              <div>วันที่................................เวลา...........................</div>
            </div>

            <!-- 5. หน่วยรักษาความปลอดภัย -->
            <div style="padding:4px 8px; line-height:1.45;">
              <div style="font-weight:bold;">5. หน่วยรักษาความปลอดภัย</div>
              <div style="margin-top:2px;">ลงชื่อ................................................................</div>
              <div>(......................................................................)</div>
              <div>วันที่...............................เวลา............................</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Usage Instructions Box -->
      <div style="border:1px solid #000; padding:4px 6px; font-size:8px; line-height:1.35; background:#f9fafb;">
        <div style="font-weight:bold; text-decoration:underline; margin-bottom:1px;">ขั้นตอนการใช้แบบฟอร์ม</div>
        <div>กรอกข้อมูลในแบบฟอร์มและรายละเอียดทรัพย์สิน ➔ ระบุเหตุผลการนำออก วันที่ เวลาและพาหนะที่จะนำทรัพย์สินออกพร้อมลงชื่อผู้นำออก ➔ ลงนามผู้จัดการ/หัวหน้าหน่วยในช่อง 1 ➔ ผู้อำนวยการโรงพยาบาล/ผู้อำนวยการฝ่ายลงนามอนุมัติในช่อง 2 ➔ รปภ.ทางออกตรวจสอบทรัพย์สินพร้อมลงชื่อในช่อง 3 ➔ รปภ.ทางออกนำส่งแบบฟอร์มที่หน่วยรักษาความปลอดภัยเพื่อเก็บเป็นหลักฐาน</div>
      </div>

      <div style="font-size:8px; color:#4b5563; text-align:left; margin-top:2px;">
        PT3-FM-SEC-1012; แก้ไขครั้งที่ 07; วันที่มีผลบังคับใช้ 01/12/2563; หน้า 1 / 1
      </div>
    </div>
  `;
}
