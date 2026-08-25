/**
 * Test Validation for 05_MINI_RAW_SAMPLES.txt
 */

const assert = require('assert');
const { normalizeDate, yearFraction, daysDifference, toIsoDate } = require('./utils/dateNormalizer');
const { evaluateComprehensiveAsset, evaluateClaimWorthiness, parseCost } = require('./claim_calculator');

console.log('=== RUNNING TESTS AGAINST 05_MINI_RAW_SAMPLES.txt ===\n');

// 1. Date Normalization Tests
console.log('Test Group 1: Date Normalization (Thai BE, Oracle, Slash, ISO)');
const dThaiBE4 = normalizeDate('21/8/2566');
assert.strictEqual(toIsoDate(dThaiBE4), '2023-08-21', 'BE 2566 should map to 2023-08-21');

const dThaiBE2 = normalizeDate('12/1/67');
assert.strictEqual(toIsoDate(dThaiBE2), '2024-01-12', 'BE 67 should map to 2024-01-12');

const dThaiBE2_2 = normalizeDate('14/12/66');
assert.strictEqual(toIsoDate(dThaiBE2_2), '2023-12-14', 'BE 66 should map to 2023-12-14');

const dOracle1 = normalizeDate('9-Dec-22');
assert.strictEqual(toIsoDate(dOracle1), '2022-12-09', '9-Dec-22 should map to 2022-12-09');

const dOracle2 = normalizeDate('30-Aug-13');
assert.strictEqual(toIsoDate(dOracle2), '2013-08-30', '30-Aug-13 should map to 2013-08-30');

console.log('  Passed Date Normalization tests.\n');

// 2. Real Cross-Link Test: CABL0699 Barcode Reader
console.log('Test Group 2: Cross-Link CABL0699 (Repair + Warranty Master)');
const cabl0699Record = {
  asset_tag: '032209140019',
  serial_no: 'CABL0699',
  brand: 'Newland',
  model: 'BS80602T',
  failure: 'charging does not enter',
  vendor: 'Planet Barcode',
  claim_date: '12/1/67', // BE 2567 -> 2024-01-12
  warranty_start: '10/11/2022',
  warranty_end: '9/11/2024',
  service_status: 'Complete'
};

const cablEval = evaluateComprehensiveAsset(cabl0699Record);
assert.strictEqual(cablEval.is_claimable, true, 'CABL0699 must be claimable on 2024-01-12 within 2022-11-10 to 2024-11-09');
assert.strictEqual(cablEval.warranty_status, 'Under Warranty');
assert.strictEqual(cablEval.recommendation, 'CLAIM');
assert.strictEqual(cablEval.evidence.serviceStatus, 'Complete');
console.log('  CABL0699 Claimable:', cablEval.is_claimable, '| Recommendation:', cablEval.recommendation);
console.log('  Passed Cross-Link CABL0699 test.\n');

// 3. Repeat Failure Test: UBBY130597 Printer
console.log('Test Group 3: Repeat Failure Handling');
const printerRepeat = {
  asset_tag: '32209060003',
  serial_no: 'UBBY130597',
  brand: 'Epson',
  model: 'L1300',
  failure: 'print then color distorted',
  failure_count: 2,
  actual_repair_cost: 1500,
  current_replacement_cost: 12000,
  warranty_status_text: 'หมดประกัน'
};
const printerEval = evaluateComprehensiveAsset(printerRepeat);
assert.strictEqual(printerEval.repeat_failure_count, 2, 'Should track repeat failure count = 2');
assert.strictEqual(printerEval.repair_pct, 12.5, 'Repair % should be (1500 / 12000) * 100 = 12.5%');
assert.strictEqual(printerEval.recommendation, 'REPAIR', '< 30% repair ratio should recommend REPAIR');
console.log('  Printer Repeat Count:', printerEval.repeat_failure_count, '| Repair %:', printerEval.repair_pct, '% | Recommendation:', printerEval.recommendation);
console.log('  Passed Repeat Failure test.\n');

// 4. Days Out / Downtime: Computer UDVWRST0053010007E0501
console.log('Test Group 4: Days Out / Downtime Calculation');
const computerRecord = {
  serial_no: 'UDVWRST0053010007E0501',
  asset_tag: '32309020065',
  sent_date: '1/3/2567', // 2024-03-01
  return_date: '5/3/67',   // 2024-03-05
  failure: 'M.2 failed',
  vendor: 'Acer',
  service_status: 'Complete'
};
const compEval = evaluateComprehensiveAsset(computerRecord);
assert.strictEqual(compEval.evidence.daysOut, 4, 'Days out should be 4 days (1 Mar 2024 to 5 Mar 2024)');
console.log('  Computer Days Out:', compEval.evidence.daysOut);
console.log('  Passed Days Out test.\n');

// 5. Oracle Asset Accounting & #DIV/0! Handling
console.log('Test Group 5: Oracle Asset Accounting & Missing Data Safety');
const oracleAsset1 = {
  asset_tag: '042209020066',
  description: 'ACER VERITON X4690G I5-12400',
  original_cost: '21,800.00',
  depreciation_reserve: '6,509.82',
  nbv: '15,290.18',
  useful_life: 3,
  acquisition_date: '9-Dec-22',
  repair_percent_raw: '#DIV/0!'
};
const oracleEval1 = evaluateComprehensiveAsset(oracleAsset1);
assert.strictEqual(oracleEval1.nbv, 15290.18, 'NBV should match 15290.18');
assert.strictEqual(oracleEval1.economic_repair_cost, null, 'Blank repair cost must be null, never 0');
assert.strictEqual(oracleEval1.repair_pct, null, '#DIV/0! must be null, never 0 or error');
assert.strictEqual(oracleEval1.remaining_accounting_value_pct, 70.14, 'Remaining accounting value should be 70.14%');
console.log('  Oracle Asset 1 Remaining Accounting %:', oracleEval1.remaining_accounting_value_pct, '% | Repair %:', oracleEval1.repair_pct);

const oracleAsset2 = {
  asset_tag: '041309040002',
  description: 'Notebook-ACER',
  original_cost: '53,271.03',
  depreciation_reserve: '53,270.03',
  nbv: '1.00',
  useful_life: 3,
  acquisition_date: '30-Aug-13',
  reportDate: '2026-08-26',
  warranty_status_text: 'หมดประกัน'
};
const oracleEval2 = evaluateComprehensiveAsset(oracleAsset2);
assert.strictEqual(oracleEval2.nbv, 1.0, 'NBV should be 1.00');
assert.strictEqual(oracleEval2.recommendation, 'SELL', 'Depreciated asset to residual 1 THB past useful life should recommend SELL/salvage');
console.log('  Oracle Fully Depreciated Asset Recommendation:', oracleEval2.recommendation);
console.log('  Passed Oracle Accounting tests.\n');

console.log('=============================================');
console.log('ALL TESTS PASSED WITH 100% SPEC COMPLIANCE!');
console.log('=============================================');
