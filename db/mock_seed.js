/**
 * db/mock_seed.js
 * 100% Synthetic Mock Data Generator for ClaimIT
 * Designed specifically for testing and Render deployment:
 * - Zero real personal data / Zero hospital confidential data
 * - Realistic hospital workflow scenarios
 * - Dynamic warranty calculation (guarantees 1 asset expiring in 15 days for badge verification)
 * - Diverse asset lifecycles: Working, Broken, Pending Pickup, Pending Sell, Pending Donation, Loaner
 * - Realistic mock claims, claim assets, and audit move logs
 */

function seedRealisticMockData(db, callback) {
  db.serialize(() => {
    // 1. Ensure test users exist with must_change_password = 0
    db.run("UPDATE users SET must_change_password = 0 WHERE username IN ('admin', 'staff');", (err) => {
      if (err) console.warn('[Mock Seed User Warning]:', err.message);
    });

    // 2. Check if mains is empty or needs mock seeding
    db.get("SELECT COUNT(*) as count FROM mains", (err, row) => {
      if (err) {
        if (callback) callback(err);
        return;
      }

      // If we already have more than 8 assets, just ensure the near-expiry one is dynamic
      if (row && row.count >= 8) {
        db.run(
          "UPDATE mains SET warranty_end = date('now', '+15 days'), status = 'Working' WHERE asset_tag = 'CIT-2023-AIO-11';",
          (e) => {
            if (callback) callback(null, { seeded: false, count: row.count });
          }
        );
        return;
      }

      console.log('[Mock Seed] Seeding realistic synthetic hospital test data...');

      // Temporarily disable foreign keys during clean & seed to prevent constraint violations
      db.run("PRAGMA foreign_keys = OFF;", (fkOffErr) => {
        if (fkOffErr) console.warn('[Mock Seed PRAGMA OFF Warning]:', fkOffErr.message);
      });

      // Clear existing dummy data in safe child-first order with explicit callbacks
      db.run("DELETE FROM claim_assets;", (err) => { if (err) console.warn('[Mock Seed Clean claim_assets]:', err.message); });
      db.run("DELETE FROM evidence;", (err) => { if (err) console.warn('[Mock Seed Clean evidence]:', err.message); });
      db.run("DELETE FROM rma_claims;", (err) => { if (err) console.warn('[Mock Seed Clean rma_claims]:', err.message); });
      db.run("DELETE FROM move_log;", (err) => { if (err) console.warn('[Mock Seed Clean move_log]:', err.message); });
      db.run("DELETE FROM claims;", (err) => { if (err) console.warn('[Mock Seed Clean claims]:', err.message); });
      db.run("DELETE FROM mains;", (err) => { if (err) console.warn('[Mock Seed Clean mains]:', err.message); });

      // Insert 16 realistic synthetic hospital IT assets
      const mockAssets = [
        // 1. CRITICAL: The "1 almost to the date" asset (Dynamic 15 days ahead)
        {
          asset_tag: 'CIT-2023-AIO-11',
          category: 'Computer',
          brand: 'Dell',
          model: 'OptiPlex 7090 Micro',
          serial_no: 'MOCK-DL-OPT7090-LIS1',
          device_name: 'Dell OptiPlex 7090 Micro (LIS Lab Workstation)',
          location: 'ห้องปฏิบัติการทางการแพทย์ (Central Lab)',
          warranty_start: "date('now', '-715 days')",
          warranty_end: "date('now', '+15 days')", // Expiring in 15 days!
          sanitization_required: 1,
          status: 'Working',
          purchase_price: 24500,
          warranty_months: 24,
          expected_lifespan_months: 60,
          salvage_status: 'None'
        },
        // 2. Active Clinic PC
        {
          asset_tag: 'CIT-2024-AIO-02',
          category: 'Computer',
          brand: 'HP',
          model: 'ProOne 440 G9',
          serial_no: 'MOCK-HP-440G9-OPD1',
          device_name: 'HP ProOne 440 G9 (โต๊ะตรวจ 1)',
          location: 'ห้องตรวจผู้ป่วยนอก (OPD Clinic)',
          warranty_start: "date('now', '-90 days')",
          warranty_end: "date('now', '+640 days')",
          sanitization_required: 1,
          status: 'Working',
          purchase_price: 26000,
          warranty_months: 24,
          expected_lifespan_months: 60,
          salvage_status: 'None'
        },
        // 3. Pharmacy Label Printer
        {
          asset_tag: 'CIT-2023-PRN-01',
          category: 'Printer',
          brand: 'TSC',
          model: 'TTP-244 Pro',
          serial_no: 'MOCK-TSC-244P-PHAR1',
          device_name: 'TSC TTP-244 Pro เครื่องพิมพ์ฉลากยา 1',
          location: 'ห้องจ่ายยากลาง (Central Pharmacy)',
          warranty_start: "date('now', '-300 days')",
          warranty_end: "date('now', '+430 days')",
          sanitization_required: 0,
          status: 'Working',
          purchase_price: 9500,
          warranty_months: 24,
          expected_lifespan_months: 48,
          salvage_status: 'None'
        },
        // 4. OR Barcode Scanner
        {
          asset_tag: 'CIT-2023-SCN-01',
          category: 'Scanner',
          brand: 'Zebra',
          model: 'DS8108',
          serial_no: 'MOCK-ZB-8108-OR1',
          device_name: 'Zebra DS8108 Healthcare Barcode Scanner',
          location: 'ห้องผ่าตัดใหญ่ (Operating Theatre / OR)',
          warranty_start: "date('now', '-200 days')",
          warranty_end: "date('now', '+530 days')",
          sanitization_required: 0,
          status: 'Working',
          purchase_price: 7800,
          warranty_months: 24,
          expected_lifespan_months: 48,
          salvage_status: 'None'
        },
        // 5. Broken ICU Tablet (Expired warranty, swollen battery)
        {
          asset_tag: 'CIT-2022-TAB-03',
          category: 'Tablet',
          brand: 'Apple',
          model: 'iPad Air 5',
          serial_no: 'MOCK-APL-AIR5-ICU1',
          device_name: 'iPad Air 5 (รถเข็น ICU Cart 1)',
          location: 'หออภิบาลผู้ป่วยวิกฤต (Intensive Care Unit / ICU)',
          warranty_start: "date('now', '-500 days')",
          warranty_end: "date('now', '-135 days')",
          sanitization_required: 1,
          status: 'Broken',
          purchase_price: 22000,
          warranty_months: 12,
          expected_lifespan_months: 36,
          salvage_status: 'None'
        },
        // 6. Pending Pickup Printer
        {
          asset_tag: 'CIT-2023-PRN-02',
          category: 'Printer',
          brand: 'TSC',
          model: 'TDP-225W',
          serial_no: 'MOCK-TSC-225W-ADM1',
          device_name: 'TSC TDP-225W เครื่องพิมพ์สายรัดข้อมือผู้ป่วย',
          location: 'ห้องตรวจผู้ป่วยนอก (OPD Clinic)',
          warranty_start: "date('now', '-400 days')",
          warranty_end: "date('now', '+330 days')",
          sanitization_required: 0,
          status: 'Pending Pickup',
          purchase_price: 8900,
          warranty_months: 24,
          expected_lifespan_months: 48,
          salvage_status: 'None'
        },
        // 7. Core Network Switch
        {
          asset_tag: 'CIT-2024-NET-01',
          category: 'Network',
          brand: 'Cisco',
          model: 'Catalyst 2960-X',
          serial_no: 'MOCK-CS-2960X-IDF4',
          device_name: 'Cisco Catalyst 2960-X (Core IDF Fl 4)',
          location: 'Technical Support & Infrastructure',
          warranty_start: "date('now', '-100 days')",
          warranty_end: "date('now', '+995 days')",
          sanitization_required: 0,
          status: 'Working',
          purchase_price: 45000,
          warranty_months: 36,
          expected_lifespan_months: 72,
          salvage_status: 'None'
        },
        // 8. Clinical FHD Monitor
        {
          asset_tag: 'CIT-2023-MON-01',
          category: 'Monitor',
          brand: 'Dell',
          model: 'P2419H',
          serial_no: 'MOCK-DL-P2419H-OPD1',
          device_name: 'Dell P2419H IPS 24-inch Monitor',
          location: 'ห้องตรวจผู้ป่วยนอก (OPD Clinic)',
          warranty_start: "date('now', '-350 days')",
          warranty_end: "date('now', '+380 days')",
          sanitization_required: 0,
          status: 'Working',
          purchase_price: 5900,
          warranty_months: 24,
          expected_lifespan_months: 60,
          salvage_status: 'None'
        },
        // 9. Finance PC
        {
          asset_tag: 'CIT-2023-PC-05',
          category: 'Computer',
          brand: 'Acer',
          model: 'Veriton X4690G',
          serial_no: 'MOCK-AC-X4690G-FIN1',
          device_name: 'Acer Veriton X4690G i5 (เคาน์เตอร์การเงิน)',
          location: 'ฝ่ายการเงินและบัญชี (Finance & Billing)',
          warranty_start: "date('now', '-420 days')",
          warranty_end: "date('now', '+310 days')",
          sanitization_required: 1,
          status: 'Working',
          purchase_price: 19500,
          warranty_months: 24,
          expected_lifespan_months: 60,
          salvage_status: 'None'
        },
        // 10. EOL Laptop (Pending Sell)
        {
          asset_tag: '041309040002',
          category: 'Computer',
          brand: 'Acer',
          model: 'TravelMate Notebook',
          serial_no: 'MOCK-AC-TM-LEGACY02',
          device_name: 'Acer TravelMate Notebook Core i5 (เก่า)',
          location: 'Technical Support & Infrastructure',
          warranty_start: "'2013-08-30'",
          warranty_end: "'2016-08-30'",
          sanitization_required: 1,
          status: 'Pending Sell',
          purchase_price: 21900,
          warranty_months: 36,
          expected_lifespan_months: 48,
          salvage_status: 'Pending Sell'
        },
        // 11. Old Desktop (Pending Donation)
        {
          asset_tag: 'CIT-2021-AIO-01',
          category: 'Computer',
          brand: 'Dell',
          model: 'OptiPlex 7090 Micro',
          serial_no: 'MOCK-DL-OPT7090-DON1',
          device_name: 'Dell OptiPlex 7090 Micro (เครื่องปลดประจำการ)',
          location: 'Technical Support & Infrastructure',
          warranty_start: "'2018-06-01'",
          warranty_end: "'2021-06-01'",
          sanitization_required: 1,
          status: 'Pending Donation',
          purchase_price: 18500,
          warranty_months: 36,
          expected_lifespan_months: 48,
          salvage_status: 'Pending Donation'
        },
        // 12. Loaner AIO
        {
          asset_tag: 'LNR-AIO-01',
          category: 'Computer',
          brand: 'HP',
          model: 'ProOne 440 G9',
          serial_no: 'MOCK-LNR-HP440-01',
          device_name: 'HP ProOne 440 G9 (เครื่องสำรองฉุกเฉิน AIO #1)',
          location: 'Technical Support & Infrastructure',
          warranty_start: "date('now', '-180 days')",
          warranty_end: "date('now', '+550 days')",
          sanitization_required: 1,
          status: 'Working',
          purchase_price: 24500,
          warranty_months: 24,
          expected_lifespan_months: 60,
          salvage_status: 'None'
        },
        // 13. Loaner Scanner
        {
          asset_tag: 'LNR-SCN-01',
          category: 'Scanner',
          brand: 'Zebra',
          model: 'DS2208',
          serial_no: 'MOCK-LNR-ZB2208-01',
          device_name: 'Zebra DS2208 (เครื่องสำรองสแกนเนอร์ #1)',
          location: 'Technical Support & Infrastructure',
          warranty_start: "date('now', '-120 days')",
          warranty_end: "date('now', '+610 days')",
          sanitization_required: 0,
          status: 'Working',
          purchase_price: 6500,
          warranty_months: 24,
          expected_lifespan_months: 48,
          salvage_status: 'None'
        },
        // 14. Loaner Wristband Printer
        {
          asset_tag: 'LNR-PRN-01',
          category: 'Printer',
          brand: 'TSC',
          model: 'TDP-225W',
          serial_no: 'MOCK-LNR-TSC225-01',
          device_name: 'TSC TDP-225W (เครื่องสำรองพิมพ์สายรัดข้อมือ #1)',
          location: 'Technical Support & Infrastructure',
          warranty_start: "date('now', '-90 days')",
          warranty_end: "date('now', '+640 days')",
          sanitization_required: 0,
          status: 'Working',
          purchase_price: 8900,
          warranty_months: 24,
          expected_lifespan_months: 48,
          salvage_status: 'None'
        },
        // 15. Telemed Webcam
        {
          asset_tag: '032186040006',
          category: 'Webcam',
          brand: 'Logitech',
          model: 'C930E',
          serial_no: 'MOCK-LGT-C930-01',
          device_name: 'Logitech C930E Telemed HD',
          location: 'ห้องตรวจผู้ป่วยนอก (OPD Clinic)',
          warranty_start: "date('now', '-150 days')",
          warranty_end: "date('now', '+580 days')",
          sanitization_required: 0,
          status: 'Working',
          purchase_price: 4500,
          warranty_months: 24,
          expected_lifespan_months: 48,
          salvage_status: 'None'
        },
        // 16. Scrapped Monitor (Core baseline asset for scrap/disposal and claim testing)
        {
          asset_tag: '031709030031',
          category: 'Monitor',
          brand: 'Dell',
          model: 'E2318H',
          serial_no: 'MOCK-DL-E2318-CN01',
          device_name: 'Dell E2318H 23-inch FHD Monitor',
          location: 'Technical Support & Infrastructure',
          warranty_start: "date('now', '-1800 days')",
          warranty_end: "date('now', '-700 days')",
          sanitization_required: 0,
          status: 'Scrapped',
          purchase_price: 4800,
          warranty_months: 36,
          expected_lifespan_months: 48,
          salvage_status: 'Scrapped'
        }
      ];

      // Insert all mock assets in a single atomic statement using INSERT OR REPLACE
      const valuesSql = mockAssets.map(a => `(
        '${a.asset_tag}', '${a.category}', '${a.brand}', '${a.model}', '${a.serial_no}', '${a.device_name}', '${a.location}',
        ${a.warranty_start}, ${a.warranty_end}, ${a.sanitization_required}, '${a.status}',
        ${a.purchase_price}, ${a.warranty_months}, ${a.expected_lifespan_months}, '${a.salvage_status}'
      )`).join(',\n');

      db.run(`
        INSERT OR REPLACE INTO mains (
          asset_tag, category, brand, model, serial_no, device_name, location,
          warranty_start, warranty_end, sanitization_required, status,
          purchase_price, warranty_months, expected_lifespan_months, salvage_status
        ) VALUES 
        ${valuesSql}
      `, function(mainsErr) {
        if (mainsErr) {
          console.error('[Mock Seed] INSERT mains error:', mainsErr.message);
        }

        // Insert Initial Audit Move Logs safely
        db.run(`
          INSERT OR IGNORE INTO move_log (log_code, asset_tag, department_name, floor, status, moved_direction, action_by_username, details) VALUES
          ('CHG-2026-MOCK01', 'CIT-2023-AIO-11', 'ห้องปฏิบัติการทางการแพทย์ (Central Lab)', 'Fl 2', 'Working', 'IN', 'admin', 'ตรวจรับและติดตั้ง Workstation ประจำแล็บชันสูตร (รับประกันใกล้ครบกำหนด)'),
          ('CHG-2026-MOCK02', 'CIT-2024-AIO-02', 'ห้องตรวจผู้ป่วยนอก (OPD Clinic)', 'Fl 1', 'Working', 'IN', 'admin', 'ติดตั้ง All-in-One ประจำโต๊ะตรวจแพทย์ 1'),
          ('CHG-2026-MOCK03', 'CIT-2022-TAB-03', 'หออภิบาลผู้ป่วยวิกฤต (Intensive Care Unit / ICU)', 'Fl 3', 'Broken', 'OUT', 'staff', 'ส่งซ่อม: แบตบวมและจอไม่ตอบสนอง เปิดเคสเคลม CLM-2026-001'),
          ('CHG-2026-MOCK04', 'CIT-2023-PRN-02', 'ห้องตรวจผู้ป่วยนอก (OPD Clinic)', 'Fl 1', 'Pending Pickup', 'OUT', 'staff', 'เตรียมส่งซ่อม: เครื่องพิมพ์สายรัดข้อมือหัวพิมพ์ขาด รอขนส่งรับเครื่อง')
        `, (moveErr) => {
          if (moveErr) console.warn('[Mock Seed move_log warning]:', moveErr.message);
        });

        // Insert 3 Mock Claims only after all mains are guaranteed committed
        db.run(`
          INSERT OR REPLACE INTO claims (
            claim_number, vendor_name, vendor_rma_number, claim_type, viability_score, viability_status,
            status, claim_date, expected_return_date, notes, created_by, confirmed_by
          ) VALUES 
          (
            'CLM-2026-001', 'Apple Authorized Service Provider', 'RMA-APL-88214', 'REPAIR', 68.5, 'VIABLE',
            'IN_PROGRESS', date('now', '-5 days'), date('now', '+9 days'), 'หน้าจอสัมผัสไม่ตอบสนอง และแบตเตอรี่เริ่มบวม ส่งศูนย์ตรวจเช็กเปลี่ยนหน้าจอและแบตเตอรี่', 'staff', 'admin'
          ),
          (
            'CLM-2026-002', 'TSC Thailand Service Center', 'RMA-TSC-3091', 'WARRANTY', 85.0, 'VIABLE',
            'PENDING', date('now', '-1 days'), date('now', '+14 days'), 'หัวพิมพ์สึกหรอบาร์โค้ดขาดตอน อยู่ในระยะรับประกัน รอรถขนส่งเข้ารับอุปกรณ์', 'staff', 'admin'
          ),
          (
            'CLM-2026-003', 'Dell ProSupport Thailand', 'RMA-DELL-99412', 'WARRANTY', 92.0, 'VIABLE',
            'COMPLETED', date('now', '-30 days'), date('now', '-20 days'), 'เมนบอร์ดชำรุด ช่าง On-site เข้าเปลี่ยนบอร์ดใหม่เรียบร้อย ทดสอบ Diagnostics ผ่าน 100%', 'admin', 'admin'
          )
        `, function(claimsErr) {
          if (claimsErr) {
            console.error('[Mock Seed] INSERT claims error:', claimsErr.message);
          }

          // Link Claim Assets & Safely finalize
          db.get("SELECT id FROM claims WHERE claim_number = 'CLM-2026-001'", (e1, c1) => {
            if (e1) console.warn('[Mock Seed Claim 1 Error]:', e1.message);
            if (c1) {
              db.run(
                `INSERT OR IGNORE INTO claim_assets (claim_id, asset_tag, sanitization_note, item_status) VALUES (?, 'CIT-2022-TAB-03', 'ล้างข้อมูลเรียบร้อย (Factory Reset)', 'Pending Pickup')`,
                [c1.id],
                (caErr1) => { if (caErr1) console.warn('[Mock Seed claim_assets 1]:', caErr1.message); }
              );
            }
            db.get("SELECT id FROM claims WHERE claim_number = 'CLM-2026-002'", (e2, c2) => {
              if (e2) console.warn('[Mock Seed Claim 2 Error]:', e2.message);
              if (c2) {
                db.run(
                  `INSERT OR IGNORE INTO claim_assets (claim_id, asset_tag, sanitization_note, item_status) VALUES (?, 'CIT-2023-PRN-02', 'ไม่ต้องล้างข้อมูล (เครื่องพิมพ์)', 'Pending Pickup')`,
                  [c2.id],
                  (caErr2) => { if (caErr2) console.warn('[Mock Seed claim_assets 2]:', caErr2.message); }
                );
              }

              // Re-enable foreign keys after all tables and relationships are securely loaded
              db.run("PRAGMA foreign_keys = ON;", (fkOnErr) => {
                if (fkOnErr) console.warn('[Mock Seed PRAGMA ON Warning]:', fkOnErr.message);
                console.log(`[Mock Seed] Successfully seeded ${mockAssets.length} synthetic mock hospital assets, 3 mock claims, and audit logs.`);
                if (callback) callback(null, { seeded: true, count: mockAssets.length });
              });
            });
          });
        });
      });
    });
  });
}

module.exports = {
  seedRealisticMockData
};
