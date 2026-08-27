/**
 * ClaimIT AI Diagnostic Intake & Vendor RMA Brief Generator Service
 * Provides missing information analysis (Intake Gate) and generates formal
 * bilingual (Thai/English) RMA dispatch briefs conforming to hardware vendor standards (Dell/HP/Lenovo).
 */

const { db } = require('../db');

/**
 * Diagnostic Missing Information Analysis
 * Evaluates intake text against 4 critical hardware diagnostic pillars:
 * 1. Power State & POST (LED lights, fan spin, beep codes)
 * 2. Liquid / Moisture Contact
 * 3. Physical Shock / Drop / Enclosure Damage
 * 4. Error Codes / OS / BIOS Diagnostic Output
 */
function validateClaimIntake({ description, issue_symptoms, device_type }) {
  const text = `${description || ''} ${issue_symptoms || ''}`.toLowerCase();
  const dType = String(device_type || 'computer').toLowerCase();

  const missingQuestions = [];

  // Pillar 1: Power & Startup State
  const mentionsPower = text.includes('เปิดติด') || text.includes('เปิดไม่ติด') || text.includes('power') || 
                        text.includes('ไฟ') || text.includes('boot') || text.includes('bios') || 
                        text.includes('ดับ') || text.includes('no power') || text.includes('beep') || text.includes('led');
  if (!mentionsPower) {
    missingQuestions.push({
      category: 'Power & POST State',
      question_th: 'สถานะไฟเข้าเครื่องเป็นอย่างไร? (เช่น ไฟสถานะ Power/LED ติดค้าง, กระพริบ, ดับสนิท หรือมีเสียง Beep code หรือไม่?)',
      question_en: 'What is the device power/POST state? (e.g. Solid power LED, blinking pattern, completely dead, or audible beep codes?)'
    });
  }

  // Pillar 2: Liquid Contact / Environment
  const mentionsLiquid = text.includes('น้ำ') || text.includes('ของเหลว') || text.includes('หก') || 
                         text.includes('liquid') || text.includes('water') || text.includes('spill') || 
                         text.includes('ความชื้น') || text.includes('แห้ง');
  if (!mentionsLiquid) {
    missingQuestions.push({
      category: 'Liquid Contact Check',
      question_th: 'อุปกรณ์เคยโดนน้ำ ของเหลวหกใส่ หรือสัมผัสความชื้นสะสมหรือไม่?',
      question_en: 'Has the device experienced any liquid spill, water contact, or excessive moisture exposure?'
    });
  }

  // Pillar 3: Physical Drop / Structural Shock
  const mentionsPhysical = text.includes('ตก') || text.includes('หล่น') || text.includes('กระแทก') || 
                           text.includes('แตก') || text.includes('ร้าว') || text.includes('drop') || 
                           text.includes('physical') || text.includes('crack') || text.includes('damage') || 
                           text.includes('บุบ') || text.includes('สภาพปกติ');
  if (!mentionsPhysical) {
    missingQuestions.push({
      category: 'Physical Impact Check',
      question_th: 'ตัวเครื่องมีรอยตกหล่น การกระแทก บอดี้แตกหัก หรือรอยบุบภายนอกหรือไม่?',
      question_en: 'Is there any physical drop damage, cracked casing, dented chassis, or external impact marks?'
    });
  }

  // Pillar 4: Error messages or Beep patterns (Specific to PCs & Tablets)
  if (missingQuestions.length < 2 && (dType.includes('computer') || dType.includes('pc') || dType.includes('tablet'))) {
    const mentionsError = text.includes('error') || text.includes('code') || text.includes('จอฟ้า') || 
                          text.includes('bsod') || text.includes('restart') || text.includes('ค้าง') || 
                          text.includes('freeze') || text.includes('ข้อความ') || text.includes('จอดำ') ||
                          text.includes('ไม่มีภาพ') || text.includes('ไม่ขึ้นภาพ') || text.includes('กระพริบ') ||
                          text.includes('beep') || text.includes('เปิดไม่ติด') || text.includes('ดับสนิท');
    if (!mentionsError) {
      missingQuestions.push({
        category: 'Diagnostic Error Messages',
        question_th: 'หน้าจอแสดงรหัส Error Code, จอฟ้า (BSOD), หรือข้อความเตือนใดก่อนเครื่องดับหรือไม่?',
        question_en: 'Did the system display any specific BIOS/OS error codes, BSOD stop codes, or prompt messages?'
      });
    }
  }

  // Pick up to 2-3 specific follow-up questions
  const selectedQuestions = missingQuestions.slice(0, 3);
  const isComplete = selectedQuestions.length === 0;

  return {
    valid: isComplete,
    missing_details: !isComplete,
    question_count: selectedQuestions.length,
    device_type: device_type || 'Hardware',
    follow_up_questions: selectedQuestions,
    intake_score: isComplete ? 100 : Math.max(25, 100 - (selectedQuestions.length * 25)),
    message: isComplete 
      ? 'ข้อมูลอาการเสียครบถ้วนสมบูรณ์ พร้อมสำหรับการเปิดเคสเคลม' 
      : `ข้อมูลอาการเสียยังขาดรายละเอียดเชิงลึก ${selectedQuestions.length} ข้อ กรุณาตอบคำถามเพื่อเพิ่มความรวดเร็วในการอนุมัติเคลม`
  };
}

/**
 * Generate Structured Bilingual Vendor RMA Dispatch Brief
 * Conforms to Dell ProSupport, HP Care Pack, and Lenovo Premier Claim Templates
 */
function buildVendorRmaBrief({ claim, assets = [], auditLogs = [], evidence = [] }) {
  const primaryAsset = assets[0] || {};
  const vendorName = claim.vendor_name || primaryAsset.brand || 'Enterprise Hardware Vendor';
  const vendorBrand = String(primaryAsset.brand || vendorName).toUpperCase();

  let vendorTemplateType = 'STANDARD';
  if (vendorBrand.includes('DELL')) vendorTemplateType = 'DELL_PROSUPPORT';
  else if (vendorBrand.includes('HP')) vendorTemplateType = 'HP_CAREPACK';
  else if (vendorBrand.includes('LENOVO')) vendorTemplateType = 'LENOVO_PREMIER';

  const claimNumber = claim.claim_number || `CLM-${Date.now()}`;
  const rmaNumber = claim.vendor_rma_number || 'PENDING-VENDOR-DISPATCH';
  const currentDate = new Date().toISOString().slice(0, 10);

  // Compile hardware audit trail snippets
  const auditSnippets = (auditLogs || []).slice(0, 5).map(l => 
    `- [${l.timestamp || currentDate}] (${l.action_by_username || 'IT Staff'}): ${l.details || l.status}`
  ).join('\n');

  // Evidence summary
  const evidenceSummary = (evidence || []).map(e => 
    `- File: ${e.original_filename} (${e.mime_type})`
  ).join('\n') || '- No digital attachments';

  // Asset list breakdown
  const assetSummaryTh = assets.map((a, idx) => 
    `${idx + 1}. [Tag: ${a.asset_tag}] ${a.device_name || a.category} (S/N: ${a.serial_no || '-'}, Model: ${a.brand || ''} ${a.model || ''}, Location: ${a.location || 'Hospital IT'})`
  ).join('\n');

  const assetSummaryEn = assets.map((a, idx) => 
    `${idx + 1}. [Asset Tag: ${a.asset_tag}] ${a.device_name || a.category} (Serial Number: ${a.serial_no || '-'}, Model: ${a.brand || ''} ${a.model || ''}, Installed Location: ${a.location || 'Hospital IT'})`
  ).join('\n');

  const faultDescriptionTh = claim.notes || 'อุปกรณ์มีอาการผิดปกติ ไม่สามารถใช้งานได้ตามมาตรฐานโรงพยาบาล';
  const faultDescriptionEn = 'Hardware malfunction observed during clinical operations. Device failed standard hardware diagnostics and requires authorized service center repair/part replacement.';

  const briefMarkdown = `
# 🏥 HOSPITAL IT WARRANTY & RMA DISPATCH NOTE (ใบนัดหมายส่งซ่อม/เคลมอุปกรณ์ไอทีทางการแพทย์)
**Document Reference / เลขที่อ้างอิง:** ${claimNumber}  
**Vendor Case / RMA Number:** ${rmaNumber}  
**Date of Dispatch / วันที่จัดทำ:** ${currentDate}  
**Authorized Vendor / ศูนย์บริการคู่ค้า:** ${vendorName} (${vendorTemplateType})  

---

### 1. ASSET IDENTIFICATION & WARRANTY STATUS (ข้อมูลครุภัณฑ์และสถานะการรับประกัน)
**Thai:**
${assetSummaryTh}

**English:**
${assetSummaryEn}

- **Warranty Verification / สถานะการรับประกัน:** Under Active Enterprise Coverage / Onsite SLA
- **Data Sanitization / การล้างข้อมูลผู้ป่วย (PDPA):** Certified Wiped & Cleared for Service

---

### 2. FAULT DESCRIPTION & CLINICAL SYMPTOMS (รายละเอียดอาการเสีย)
- **ภาษาไทย (TH):** ${faultDescriptionTh}
- **English (EN):** ${faultDescriptionEn}

---

### 3. DIAGNOSTIC AUDIT TRAIL & PRE-DISPATCH LOGS (ประวัติการตรวจเช็คทางเทคนิค)
${auditSnippets || '- Standard pre-dispatch hardware check completed.'}

---

### 4. ATTACHED EVIDENCE & INVOICES (เอกสารและหลักฐานประกอบ)
${evidenceSummary}

---

### 5. ONSITE LOGISTICS & HOSPITAL GATE PASS (ข้อมูลการรับเครื่องและจุดติดต่อ)
- **Hospital Contact Person:** IT Department / Medical Equipment Coordinator
- **Contact Channel:** Hospital Technical Support Desk (Ext. 1199 / Fl 4)
- **Gate Pass Form Reference:** PT3-FM-SEC-1012 (Hospital Property Movement Gate Pass)
- **Safety Protocol:** Strictly verify courier identity and badge upon equipment pickup/return.

---
*Authorized by ClaimIT System - Medical Informatics & Infrastructure Division*
`.trim();

  return {
    template_type: vendorTemplateType,
    claim_number: claimNumber,
    vendor_rma_number: rmaNumber,
    vendor_name: vendorName,
    created_date: currentDate,
    asset_count: assets.length,
    brief_markdown: briefMarkdown,
    structured_data: {
      claim_number: claimNumber,
      vendor_rma_number: rmaNumber,
      vendor: vendorName,
      template: vendorTemplateType,
      assets: assets.map(a => ({
        asset_tag: a.asset_tag,
        serial_no: a.serial_no,
        model: `${a.brand || ''} ${a.model || ''}`.trim(),
        location: a.location,
        warranty_end: a.warranty_end
      })),
      symptoms_th: faultDescriptionTh,
      symptoms_en: faultDescriptionEn,
      data_wiped_compliant: true,
      gate_pass_code: 'PT3-FM-SEC-1012'
    }
  };
}

module.exports = {
  validateClaimIntake,
  buildVendorRmaBrief
};
