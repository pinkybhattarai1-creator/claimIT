/**
 * ClaimIT Microsoft Excel & CSV Export Route
 * Generates native multi-sheet Microsoft Excel SpreadsheetML (.xls)
 * and UTF-8 BOM CSV files for all tables in the program.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { verifyToken, staffOnly } = require('../middleware/auth');

// XML escape helper for Excel SpreadsheetML
function xmlEscape(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Convert table data to SpreadsheetML Worksheet XML
function createWorksheetXml(sheetName, headers, rows) {
  let xml = `  <Worksheet ss:Name="${xmlEscape(sheetName)}">\n`;
  xml += '    <Table>\n';
  
  // Header Row
  xml += '      <Row ss:StyleID="HeaderStyle">\n';
  headers.forEach(h => {
    xml += `        <Cell><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>\n`;
  });
  xml += '      </Row>\n';

  // Data Rows
  rows.forEach(r => {
    xml += '      <Row>\n';
    r.forEach(val => {
      const type = (typeof val === 'number') ? 'Number' : 'String';
      xml += `        <Cell><Data ss:Type="${type}">${xmlEscape(val)}</Data></Cell>\n`;
    });
    xml += '      </Row>\n';
  });

  xml += '    </Table>\n';
  xml += '  </Worksheet>\n';
  return xml;
}

// GET /api/export/excel - Native Multi-Sheet Excel Workbook
router.get('/excel', verifyToken, staffOnly, (req, res) => {
  const nowStr = new Date().toISOString().slice(0, 10);
  const filename = `claimit_full_database_${nowStr}.xls`;

  // Fetch all 5 key datasets concurrently
  const queryAssets = "SELECT asset_tag, device_name, category, brand, model, serial_no, location, warranty_start, warranty_end, status, salvage_status, purchase_price, warranty_months, po_number, invoice_no, sanitization_required FROM mains WHERE is_deleted = 0 ORDER BY id DESC";
  const queryClaims = "SELECT c.claim_number, c.vendor_name, c.vendor_rma_number, c.claim_type, c.status, c.viability_score, c.viability_status, c.claim_date, c.expected_return_date, c.resolved_date, c.resolution_type, c.repair_cost, c.created_by, c.confirmed_by, c.notes FROM claims c WHERE c.is_deleted = 0 ORDER BY c.id DESC";
  const queryLogs = "SELECT log_code, timestamp, asset_tag, department_name, floor, status, moved_direction, action_by_username, details FROM move_log ORDER BY timestamp DESC LIMIT 2000";
  const queryUsers = "SELECT id, username, name, department, role, is_active, created_at FROM users WHERE is_deleted = 0 ORDER BY id ASC";
  const queryConfigs = "SELECT id, type, value, details, created_at FROM configurations WHERE is_deleted = 0 ORDER BY type ASC, value ASC";

  db.all(queryAssets, [], (errA, assets) => {
    if (errA) return res.status(500).json({ error: errA.message });

    db.all(queryClaims, [], (errC, claims) => {
      if (errC) return res.status(500).json({ error: errC.message });

      db.all(queryLogs, [], (errL, logs) => {
        if (errL) return res.status(500).json({ error: errL.message });

        db.all(queryUsers, [], (errU, users) => {
          if (errU) return res.status(500).json({ error: errU.message });

          db.all(queryConfigs, [], (errCfg, configs) => {
            if (errCfg) return res.status(500).json({ error: errCfg.message });

            // Assemble SpreadsheetML Workbook
            let excelXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            excelXml += '<?mso-application progid="Excel.Sheet"?>\n';
            excelXml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
            excelXml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
            excelXml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
            excelXml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
            excelXml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';
            
            // Excel Styling
            excelXml += '  <Styles>\n';
            excelXml += '    <Style ss:ID="Default" ss:Name="Normal">\n';
            excelXml += '      <Alignment ss:Vertical="Center"/>\n';
            excelXml += '      <Font ss:FontName="Tahoma" ss:Size="10"/>\n';
            excelXml += '    </Style>\n';
            excelXml += '    <Style ss:ID="HeaderStyle">\n';
            excelXml += '      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>\n';
            excelXml += '      <Font ss:FontName="Tahoma" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>\n';
            excelXml += '      <Interior ss:Color="#0284C7" ss:Pattern="Solid"/>\n';
            excelXml += '    </Style>\n';
            excelXml += '  </Styles>\n';

            // Sheet 1: Assets
            const assetHeaders = ['รหัสครุภัณฑ์ (Asset Tag)', 'ชื่ออุปกรณ์ (Device Name)', 'หมวดหมู่ (Category)', 'แบรนด์ (Brand)', 'รุ่น (Model)', 'Serial Number', 'จุดติดตั้ง (Location)', 'วันเริ่มประกัน', 'วันหมดอายุประกัน', 'สถานะ (Status)', 'สถานะจำหน่าย (Salvage)', 'ราคาจัดซื้อ (บาท)', 'อายุประกัน (เดือน)', 'PO Number', 'Invoice No', 'PDPA Sanitization'];
            const assetRows = (assets || []).map(a => [
              a.asset_tag, a.device_name, a.category, a.brand, a.model, a.serial_no, a.location, a.warranty_start, a.warranty_end, a.status, a.salvage_status || 'None', a.purchase_price || 0, a.warranty_months || 36, a.po_number || '-', a.invoice_no || '-', a.sanitization_required ? 'YES' : 'NO'
            ]);
            excelXml += createWorksheetXml('ครุภัณฑ์ไอที (Assets)', assetHeaders, assetRows);

            // Sheet 2: Claims
            const claimHeaders = ['หมายเลขใบเคลม (Claim No)', 'ศูนย์บริการ (Vendor)', 'หมายเลข RMA', 'ประเภทเคลม', 'สถานะ (Status)', 'คะแนนความคุ้มค่า (Score)', 'ผลประเมิน', 'วันที่ส่งเคลม', 'กำหนดรับคืน', 'วันที่รับคืน', 'ผลการซ่อม/เปลี่ยน', 'ค่าซ่อม (บาท)', 'ผู้สร้างรายการ', 'ผู้ยืนยัน', 'บันทึกเพิ่มเติม'];
            const claimRows = (claims || []).map(c => [
              c.claim_number, c.vendor_name, c.vendor_rma_number || '-', c.claim_type, c.status, c.viability_score, c.viability_status, c.claim_date || '-', c.expected_return_date || '-', c.resolved_date || '-', c.resolution_type || '-', c.repair_cost || 0, c.created_by, c.confirmed_by || '-', c.notes || '-'
            ]);
            excelXml += createWorksheetXml('รายการส่งเคลม (Claims)', claimHeaders, claimRows);

            // Sheet 3: Audit Logs
            const logHeaders = ['รหัสติดตาม (Log Code)', 'วัน-เวลาบันทึก (Timestamp)', 'รหัสครุภัณฑ์ (Asset Tag)', 'แผนก/ศูนย์ (Location)', 'ชั้น (Floor)', 'สถานะครุภัณฑ์', 'การเคลื่อนย้าย (Direction)', 'ผู้ดำเนินการ (User)', 'รายละเอียด (Details)'];
            const logRows = (logs || []).map(l => [
              l.log_code || '-', l.timestamp, l.asset_tag, l.department_name, l.floor, l.status, l.moved_direction, l.action_by_username, l.details || '-'
            ]);
            excelXml += createWorksheetXml('บันทึกการเปลี่ยนแปลง (Audit)', logHeaders, logRows);

            // Sheet 4: Users
            const userHeaders = ['ID', 'Username', 'ชื่อ-นามสกุล', 'แผนก (Department)', 'สิทธิ์ (Role)', 'สถานะเปิดใช้งาน', 'วันที่สร้าง'];
            const userRows = (users || []).map(u => [
              u.id, u.username, u.name, u.department, u.role, u.is_active ? 'Active' : 'Disabled', u.created_at
            ]);
            excelXml += createWorksheetXml('ผู้ใช้งาน (Users)', userHeaders, userRows);

            // Sheet 5: Configurations
            const configHeaders = ['ID', 'ประเภท (Type)', 'ค่า (Value)', 'รายละเอียด / ขั้นตอน', 'วันที่สร้าง'];
            const configRows = (configs || []).map(cfg => [
              cfg.id, cfg.type, cfg.value, (cfg.details || '').replace(/<[^>]*>?/gm, ' '), cfg.created_at
            ]);
            excelXml += createWorksheetXml('การตั้งค่า (Configurations)', configHeaders, configRows);

            excelXml += '</Workbook>';

            res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(excelXml);
          });
        });
      });
    });
  });
});

// GET /api/export/assets.csv - CSV Download with UTF-8 BOM
router.get('/assets.csv', verifyToken, staffOnly, (req, res) => {
  db.all("SELECT * FROM mains WHERE is_deleted = 0 ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
    csv += 'Asset Tag,Device Name,Category,Brand,Model,Serial No,Location,Warranty Start,Warranty End,Status,Salvage Status,Purchase Price\r\n';
    
    (rows || []).forEach(r => {
      const line = [
        `"${r.asset_tag}"`,
        `"${(r.device_name || '').replace(/"/g, '""')}"`,
        `"${r.category}"`,
        `"${r.brand}"`,
        `"${r.model}"`,
        `"${r.serial_no}"`,
        `"${(r.location || '').replace(/"/g, '""')}"`,
        `"${r.warranty_start}"`,
        `"${r.warranty_end}"`,
        `"${r.status}"`,
        `"${r.salvage_status || 'None'}"`,
        r.purchase_price || 0
      ].join(',');
      csv += line + '\r\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="claimit_assets.csv"');
    res.send(csv);
  });
});

module.exports = router;
