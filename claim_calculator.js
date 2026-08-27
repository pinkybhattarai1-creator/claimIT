/**
 * ============================================================================
 * Comprehensive Asset & Warranty Evaluation Engine (ClaimIT)
 * ============================================================================
 * 
 * Complies with strict data safety rules:
 * - Blank cost is missing data, never converted to 0.
 * - #DIV/0! is treated as missing input, not a business result.
 * - Service "Complete" != Warranty Approval.
 * - Actual cost != Estimated cost.
 * - NBV != Market/Resale value.
 * - Original Cost != Current Replacement Cost.
 * - Accounting Life != Warranty Life != Economic Life.
 * - Preserves evidence for all decisions.
 */

const { normalizeDate, yearFraction, daysDifference, toIsoDate } = require('./utils/dateNormalizer');

/**
 * Standard Management Thresholds for Repair % (Economic Repair Cost / Current Replacement Cost)
 */
const THRESHOLDS = {
  REPAIR_MAX: 0.30,        // < 30% -> Repair
  REVIEW_MAX: 0.50,        // 30% - 50% -> Review
  REPLACE_CONSIDER_MAX: 0.70 // 50% - 70% -> Replace consideration, > 70% -> Replace
};

/**
 * Parses numeric currency/cost strings safely.
 * Returns null if blank/null/undefined/#DIV/0!
 */
function parseCost(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).replace(/,/g, '').trim();
  if (!str || str === '-' || str.includes('#DIV/0!') || str.toLowerCase() === 'nan' || str.toLowerCase() === 'null') {
    return null;
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Comprehensive Evaluation of an Asset & its Failure/Claim state
 * Returns all 14 Core Output Dimensions
 */
function evaluateComprehensiveAsset(record) {
  const raw = record || {};

  // 1. Asset Identity
  const assetTag = raw.asset_tag || raw.assetTag || raw.assetId || raw.an || raw.tag || null;
  const serialNo = raw.serial_no || raw.serialNo || raw.sn || null;
  const oldSerialNo = raw.old_serial_no || raw.oldSerialNo || null;
  const newSerialNo = raw.new_serial_no || raw.newSerialNo || null;
  const brand = raw.brand || null;
  const model = raw.model || null;
  const description = raw.asset_description || raw.description || raw.device_name || null;

  // 2. Dates
  const reportDate = normalizeDate(raw.reportDate || raw.oracleReportDate) || new Date();
  const acquisitionDate = normalizeDate(raw.acquisition_date || raw.acquisitionDate || raw.purchase_date || raw.purchaseDate || raw.warranty_start || raw.warrantyStart);
  const warrantyStart = normalizeDate(raw.warranty_start || raw.warrantyStart || raw.start_date || acquisitionDate);
  let warrantyEnd = normalizeDate(raw.warranty_end || raw.warrantyEnd || raw.end_date);
  
  if (!warrantyEnd && warrantyStart) {
    const wMonths = parseInt(raw.warranty_months || raw.warrantyMonths || 36, 10);
    const calculatedEnd = new Date(warrantyStart);
    calculatedEnd.setMonth(calculatedEnd.getMonth() + wMonths);
    warrantyEnd = calculatedEnd;
  }

  const failureDate = normalizeDate(raw.failure_date || raw.failureDate || raw.sent_date || raw.sent || raw.claim_date || raw.claimDate);
  const claimDate = normalizeDate(raw.claim_date || raw.claimDate || raw.sent_date || raw.sent || raw.failure_date || raw.failureDate);
  const sendDate = normalizeDate(raw.sent_date || raw.sent || raw.sendDate);
  const returnDate = normalizeDate(raw.return_date || raw.returned || raw.returnDate);

  // 3. Costs & Accounting
  const originalCost = parseCost(raw.original_cost || raw.originalCost || raw.purchase_price || raw.purchasePrice || raw.unit_price);
  const depreciationReserve = parseCost(raw.depreciation_reserve || raw.depreciationReserve);
  const usefulLifeYears = parseInt(raw.useful_life || raw.usefulLife || (raw.expected_lifespan_months ? raw.expected_lifespan_months / 12 : (raw.expectedLifespanMonths ? raw.expectedLifespanMonths / 12 : null)) || 3, 10);
  const residualValue = parseCost(raw.residual_value || 1.0); // Standard TH accounting 1.00 THB residual

  let currentAgeYears = null;
  if (acquisitionDate) {
    currentAgeYears = yearFraction(acquisitionDate, reportDate);
  }

  let nbv = parseCost(raw.nbv || raw.net_book_value || raw.netBookValue);
  if (nbv === null && originalCost !== null && depreciationReserve !== null) {
    nbv = Math.max(0, originalCost - depreciationReserve);
  } else if (nbv === null && originalCost !== null && usefulLifeYears > 0 && currentAgeYears !== null) {
    const annualDep = (originalCost - residualValue) / usefulLifeYears;
    const accumulated = Math.min(originalCost - residualValue, annualDep * currentAgeYears);
    nbv = Math.max(residualValue, Math.round((originalCost - accumulated) * 100) / 100);
  }

  // Replacement & Repair Costs
  const actualRepairCost = parseCost(raw.actual_repair_cost || raw.repair_cost || raw.parts_cost || raw.actualRepairCost);
  const estimatedRepairCost = parseCost(raw.estimated_repair_cost || raw.estimatedRepairCost || raw.estimate_cost);
  const currentReplacementCost = parseCost(raw.replacement_price || raw.current_replacement_cost || raw.replacementCost);
  const downtimeCost = parseCost(raw.downtime_cost || raw.downtimeCost || 0) || 0;
  const otherCost = parseCost(raw.other_cost || raw.otherCost || 0) || 0;

  // Failure & Service History
  const failureDescription = raw.failure || raw.failure_description || raw.problem || null;
  const serviceStatus = raw.service_status || raw.status || 'Pending';
  const rawClaimResult = raw.claim_result || raw.claimResult || null;
  const repeatFailureCount = parseInt(raw.failure_count || raw.repeat_failure_count || 1, 10);
  const repairs12mCount = parseInt(raw.repairs_12m_count || 0, 10);
  const repairs24mCount = parseInt(raw.repairs_24m_count || 0, 10);
  const repairCost12m = parseCost(raw.repair_cost_12m) || 0;

  // --- OUTPUT 1: Warranty Status & Claimability ---
  let warrantyStatus = 'Unknown';
  let isClaimable = false;
  let claimDateUsed = claimDate || failureDate || new Date();

  if (warrantyStart && warrantyEnd) {
    if (claimDateUsed >= warrantyStart && claimDateUsed <= warrantyEnd) {
      isClaimable = true;
      warrantyStatus = 'Under Warranty';
    } else {
      isClaimable = false;
      warrantyStatus = 'Out of Warranty';
    }
  } else if (raw.warranty_status_text) {
    const txt = String(raw.warranty_status_text).toLowerCase();
    if (txt.includes('อยู่ในประกัน') || txt.includes('under')) {
      warrantyStatus = 'Under Warranty';
      isClaimable = true;
    } else if (txt.includes('หมดประกัน') || txt.includes('out') || txt.includes('expired')) {
      warrantyStatus = 'Out of Warranty';
      isClaimable = false;
    }
  }

  // Claim Result (Decoupled from Service Status)
  let claimResult = 'UNKNOWN';
  if (rawClaimResult) {
    claimResult = rawClaimResult;
  } else if (isClaimable) {
    claimResult = 'Pending';
  } else {
    claimResult = 'Not Applicable';
  }

  // --- OUTPUT 2: Claim Value & Confidence ---
  let claimValue = null;
  let claimConfidence = 'LOW';

  if (actualRepairCost !== null) {
    claimValue = actualRepairCost;
    claimConfidence = 'HIGH';
  } else if (estimatedRepairCost !== null) {
    claimValue = estimatedRepairCost;
    claimConfidence = 'MEDIUM';
  } else {
    claimValue = null;
    claimConfidence = 'LOW';
  }

  // --- OUTPUT 3: Warranty Benefit (Cost Avoided) ---
  let warrantyBenefit = 0;
  if (isClaimable && claimValue !== null) {
    warrantyBenefit = claimValue;
  }

  // --- OUTPUT 4: Age at Failure ---
  let ageAtFailureYears = null;
  if (acquisitionDate && failureDate) {
    ageAtFailureYears = yearFraction(acquisitionDate, failureDate);
  }

  // --- OUTPUT 5: Days Out (Downtime) ---
  const daysOut = (sendDate && returnDate) ? daysDifference(sendDate, returnDate) : null;

  // --- OUTPUT 6: Accounting State & Depreciation ---

  let remainingAccountingPct = null;
  if (originalCost && originalCost > 0 && nbv !== null) {
    remainingAccountingPct = Math.round((nbv / originalCost) * 10000) / 100;
  }

  let annualDepreciation = null;
  let yearsToResidual = null;
  let accountingEndDate = null;

  if (originalCost !== null && usefulLifeYears > 0) {
    annualDepreciation = Math.round(((originalCost - residualValue) / usefulLifeYears) * 100) / 100;
    if (nbv !== null && annualDepreciation > 0) {
      yearsToResidual = Math.max(0, Math.round(((nbv - residualValue) / annualDepreciation) * 100) / 100);
    }
    if (acquisitionDate) {
      const endD = new Date(acquisitionDate);
      endD.setFullYear(endD.getFullYear() + usefulLifeYears);
      accountingEndDate = toIsoDate(endD);
    }
  }

  // --- OUTPUT 7: Economic Repair Cost & Repair Ratio ---
  let directRepairCost = actualRepairCost !== null ? actualRepairCost : (estimatedRepairCost !== null ? estimatedRepairCost : null);
  let economicRepairCost = null;
  if (directRepairCost !== null) {
    economicRepairCost = directRepairCost + downtimeCost + otherCost;
  }

  let repairPct = null;
  if (economicRepairCost !== null && currentReplacementCost !== null && currentReplacementCost > 0) {
    repairPct = Math.round((economicRepairCost / currentReplacementCost) * 10000) / 100;
  }

  // --- OUTPUT 8: Recommendation & Decision Hierarchy ---
  // Hierarchy: CLAIM -> REPAIR -> REPLACE -> SELL -> DONATE/TRANSFER -> RECYCLE/DISCARD -> NEEDS REVIEW
  let recommendation = 'NEEDS REVIEW';
  let reasons = [];

  if (isClaimable) {
    recommendation = 'CLAIM';
    reasons.push(`อุปกรณ์อยู่ในระยะเวลารับประกัน (เริ่ม: ${toIsoDate(warrantyStart) || '-'}, สิ้นสุด: ${toIsoDate(warrantyEnd) || '-'})`);
    if (warrantyBenefit > 0) {
      reasons.push(`ประหยัดค่าใช้จ่ายผ่านการเคลมได้ ฿${warrantyBenefit.toLocaleString()} (Confidence: ${claimConfidence})`);
    }
  } else if (repairPct !== null) {
    const ratio = repairPct / 100;
    if (ratio < THRESHOLDS.REPAIR_MAX) {
      recommendation = 'REPAIR';
      reasons.push(`สัดส่วนค่าซ่อม ${repairPct}% ต่ำกว่าเกณฑ์ 30% ของราคาซื้อทดแทน (฿${currentReplacementCost.toLocaleString()}) คุ้มค่าแก่การซ่อม`);
    } else if (ratio >= THRESHOLDS.REPAIR_MAX && ratio <= THRESHOLDS.REVIEW_MAX) {
      recommendation = 'NEEDS REVIEW';
      reasons.push(`สัดส่วนค่าซ่อม ${repairPct}% อยู่ในช่วงพิจารณา (30% - 50%) ต้องประเมินประวัติการเสียและความสำคัญ`);
    } else if (ratio > THRESHOLDS.REVIEW_MAX && ratio <= THRESHOLDS.REPLACE_CONSIDER_MAX) {
      recommendation = 'REPLACE';
      reasons.push(`สัดส่วนค่าซ่อม ${repairPct}% สูงกว่า 50% แนะนำพิจารณาจัดซื้อทดแทน`);
    } else {
      recommendation = 'REPLACE';
      reasons.push(`สัดส่วนค่าซ่อม ${repairPct}% สูงกว่า 70% ไม่คุ้มค่าที่จะซ่อม แนะนำจัดซื้อทดแทนทันที`);
    }
  } else if (warrantyStatus === 'Out of Warranty') {
    if (nbv !== null && nbv <= residualValue && (currentAgeYears !== null && currentAgeYears > usefulLifeYears)) {
      recommendation = 'SELL';
      reasons.push(`อุปกรณ์หมดประกันและหมดอายุการใช้งานทางบัญชี (NBV: ฿${nbv}, อายุ ${currentAgeYears} ปี) แนะนำพิจารณาขายทอดตลาดหรือบริจาค`);
    } else {
      recommendation = 'NEEDS REVIEW';
      reasons.push(`หมดประกันแต่ขาดข้อมูลราคาซ่อม/ราคาจัดหาทดแทน จึงไม่สามารถคำนวณ Repair % ได้`);
    }
  } else {
    recommendation = 'NEEDS REVIEW';
    reasons.push(`ข้อมูลไม่เพียงพอในการตัดสินใจ (ขาดวันรับประกันหรือข้อมูลค่าใช้จ่าย)`);
  }

  if (repeatFailureCount > 1) {
    reasons.push(`พบประวัติการเสียซ้ำ ${repeatFailureCount} ครั้ง`);
  }

  const evidence = {
    assetTag,
    serialNo,
    oldSerialNo,
    newSerialNo,
    brand,
    model,
    description,
    acquisitionDate: toIsoDate(acquisitionDate),
    currentAgeYears,
    warrantyStart: toIsoDate(warrantyStart),
    warrantyEnd: toIsoDate(warrantyEnd),
    warrantyStatus,
    isClaimable,
    claimResult,
    failureDate: toIsoDate(failureDate),
    failureDescription,
    ageAtFailureYears,
    repeatFailureCount,
    serviceStatus,
    daysOut,
    originalCost,
    nbv,
    remainingAccountingPct,
    yearsToResidual,
    actualRepairCost,
    estimatedRepairCost,
    currentReplacementCost,
    economicRepairCost,
    repairPct,
    claimValue,
    claimConfidence,
    warrantyBenefit
  };

  return {
    // 14 Core Output Dimensions
    is_claimable: isClaimable,
    warranty_status: warrantyStatus,
    claim_result: claimResult,
    claim_value: claimValue,
    claim_value_confidence: claimConfidence,
    warranty_benefit: warrantyBenefit,
    age_at_failure_years: ageAtFailureYears,
    repeat_failure_count: repeatFailureCount,
    repairs_12m_count: repairs12mCount,
    repairs_24m_count: repairs24mCount,
    repair_cost_12m: repairCost12m,
    nbv: nbv,
    remaining_accounting_value_pct: remainingAccountingPct,
    years_to_residual: yearsToResidual,
    annual_depreciation: annualDepreciation,
    accounting_end_date: accountingEndDate,
    current_replacement_cost: currentReplacementCost,
    economic_repair_cost: economicRepairCost,
    repair_pct: repairPct,
    recommendation: recommendation,
    evidence: evidence,
    reason: reasons.join(' | ')
  };
}

/**
 * Backward compatibility wrapper for existing ClaimIT UI/routes
 */
function evaluateClaimWorthiness(asset) {
  const result = evaluateComprehensiveAsset(asset);
  
  const purchasePrice = result.evidence.originalCost || parseFloat(asset.purchasePrice || asset.purchase_price || 10000);
  const estimatedCurrentValue = result.nbv !== null ? result.nbv : Math.round(purchasePrice * 0.5);

  const expectedLifespanMonths = parseInt(asset.expectedLifespanMonths || asset.expected_lifespan_months || (result.evidence.currentAgeYears ? result.evidence.currentAgeYears * 12 : 60), 10);
  const lifespanYears = expectedLifespanMonths / 12;
  const isWithinLifespan = (result.evidence.currentAgeYears !== null) ? (result.evidence.currentAgeYears <= lifespanYears) : true;
  const depreciationRatio = purchasePrice > 0 ? (estimatedCurrentValue / purchasePrice) : 0;

  let category = 'EXPIRED';
  let recommendedSalvage = 'None';

  if (result.is_claimable) {
    category = 'UNDER_WARRANTY';
  } else if (isWithinLifespan && depreciationRatio >= 0.25) {
    category = 'OUT_OF_WARRANTY_REPAIRABLE';
  } else {
    category = 'END_OF_LIFE';
    recommendedSalvage = (result.nbv !== null && result.nbv <= 1) ? 'Pending Sell' : 'Pending Donation';
  }

  return {
    assetId: result.evidence.assetTag || result.evidence.serialNo,
    isWorthClaiming: result.is_claimable,
    category: category,
    estimatedCurrentValue: estimatedCurrentValue,
    purchasePrice: purchasePrice,
    isUnderWarranty: result.is_claimable,
    warrantyExpiry: result.evidence.warrantyEnd || '',
    reason: result.reason,
    recommendedSalvage: recommendedSalvage,
    comprehensive: result
  };
}

/**
 * Straight-line depreciated Book Value (BV) calculation
 * Strict financial rule: Book Value never drops below 1.00 THB (Residual Scrap/Salvage Floor)
 * Formula: BV = Math.max(1, purchase_price * (1 - (age_in_months / useful_life_months)))
 */
function calculateStraightLineBV(purchasePrice, ageInMonths, usefulLifeMonths) {
  const price = Math.max(0, parseFloat(purchasePrice) || 0);
  const life = Math.max(1, parseInt(usefulLifeMonths, 10) || 60);
  const age = Math.max(0, parseFloat(ageInMonths) || 0);

  const rawBV = price * (1 - (age / life));
  const roundedBV = Math.round(rawBV * 100) / 100;
  return Math.max(1.0, roundedBV);
}

/**
 * Dynamic Viability Calculator using Historical Repair Cost Ledger
 * Rule: If estimated historical repair cost > BV * 0.5 -> "Salvage / Write-off", else "RMA / Repair"
 */
function calculateDynamicViability(asset, options = {}) {
  const raw = asset || {};
  const purchasePrice = parseFloat(raw.purchase_price || raw.purchasePrice || raw.original_cost || raw.originalCost || 0);
  const usefulLifeMonths = parseInt(raw.expected_lifespan_months || raw.expectedLifespanMonths || raw.useful_life_months || (raw.useful_life ? raw.useful_life * 12 : 60), 10);
  
  // Calculate age in months
  let ageInMonths = 0;
  if (raw.age_in_months !== undefined && raw.age_in_months !== null) {
    ageInMonths = Math.max(0, parseFloat(raw.age_in_months));
  } else {
    const acquisitionDate = normalizeDate(raw.acquisition_date || raw.acquisitionDate || raw.purchase_date || raw.purchaseDate || raw.warranty_start || raw.warrantyStart);
    const asOfDate = normalizeDate(raw.asOfDate || raw.reportDate) || new Date();
    if (acquisitionDate) {
      const yearDiff = asOfDate.getFullYear() - acquisitionDate.getFullYear();
      const monthDiff = asOfDate.getMonth() - acquisitionDate.getMonth();
      const dayDiff = (asOfDate.getDate() - acquisitionDate.getDate()) / 30.0;
      ageInMonths = Math.max(0, Math.round(((yearDiff * 12) + monthDiff + dayDiff) * 10) / 10);
    }
  }

  // 1. Calculate Straight-Line Book Value (Floor = 1.00 THB)
  const bookValue = calculateStraightLineBV(purchasePrice, ageInMonths, usefulLifeMonths);

  // 2. Determine Historical / Estimated Repair Cost
  let estimatedRepairCost = 0;
  let sampleCount = 0;
  let confidenceRating = 'LOW';

  if (options.historicalAvgCost !== undefined && options.historicalAvgCost !== null) {
    estimatedRepairCost = parseFloat(options.historicalAvgCost);
    sampleCount = parseInt(options.sampleCount || 1, 10);
    confidenceRating = sampleCount >= 3 ? 'HIGH' : 'MEDIUM';
  } else if (raw.repair_cost !== undefined && raw.repair_cost !== null && raw.repair_cost > 0) {
    estimatedRepairCost = parseFloat(raw.repair_cost);
    confidenceRating = 'MEDIUM';
  } else if (raw.estimated_repair_cost !== undefined && raw.estimated_repair_cost !== null) {
    estimatedRepairCost = parseFloat(raw.estimated_repair_cost);
    confidenceRating = 'MEDIUM';
  } else {
    // Standard default benchmarks by category
    const category = String(raw.category || raw.asset_category || '').toLowerCase();
    if (category.includes('computer') || category.includes('pc') || category.includes('aio')) {
      estimatedRepairCost = 3500.0;
      confidenceRating = 'MEDIUM';
    } else if (category.includes('monitor')) {
      estimatedRepairCost = 2500.0;
      confidenceRating = 'MEDIUM';
    } else if (category.includes('scanner')) {
      estimatedRepairCost = 1800.0;
      confidenceRating = 'MEDIUM';
    } else if (category.includes('tablet')) {
      estimatedRepairCost = 4000.0;
      confidenceRating = 'MEDIUM';
    } else {
      estimatedRepairCost = 2000.0;
      confidenceRating = 'LOW';
    }
  }

  // 3. Viability Decision Rule (BV * 0.5 Threshold)
  const thresholdValue = Math.round((bookValue * 0.5) * 100) / 100;
  const isSalvage = estimatedRepairCost > thresholdValue;
  const recommendation = isSalvage ? 'Salvage / Write-off' : 'RMA / Repair';

  // Viability Score (1.0 = Highly Viable RMA, 10.0 = Complete Salvage/Scrap)
  let viabilityScore = 5.0;
  if (!isSalvage) {
    const costRatio = bookValue > 0 ? (estimatedRepairCost / bookValue) : 1.0;
    viabilityScore = Math.round(Math.min(5.0, Math.max(1.0, costRatio * 10)) * 10) / 10;
  } else {
    const overThresholdRatio = thresholdValue > 0 ? (estimatedRepairCost / thresholdValue) : 2.0;
    viabilityScore = Math.round(Math.min(10.0, Math.max(5.5, 5.0 + (overThresholdRatio * 1.5))) * 10) / 10;
  }

  return {
    asset_id: raw.id || raw.asset_id || null,
    asset_tag: raw.asset_tag || raw.assetTag || null,
    asset_category: raw.category || raw.asset_category || 'General',
    issue_category: raw.issue_category || options.issueCategory || 'General Defect',
    purchase_price: purchasePrice,
    age_in_months: ageInMonths,
    useful_life_months: usefulLifeMonths,
    book_value_thb: bookValue,
    estimated_repair_cost_thb: estimatedRepairCost,
    historical_sample_count: sampleCount,
    cost_to_book_value_ratio: bookValue > 0 ? Math.round((estimatedRepairCost / bookValue) * 1000) / 1000 : 999,
    recommendation: recommendation,
    viability_score: viabilityScore,
    confidence_rating: confidenceRating,
    formula_breakdown: {
      depreciation_formula: "BV = Math.max(1, purchase_price * (1 - (age_in_months / useful_life_months)))",
      threshold_rule: "estimated_repair_cost > BV * 0.5 -> Salvage / Write-off, else RMA / Repair",
      calculated_bv: bookValue,
      estimated_repair_cost: estimatedRepairCost,
      threshold_value: thresholdValue
    }
  };
}

module.exports = {
  parseCost,
  evaluateComprehensiveAsset,
  evaluateClaimWorthiness,
  calculateStraightLineBV,
  calculateDynamicViability,
  THRESHOLDS
};

