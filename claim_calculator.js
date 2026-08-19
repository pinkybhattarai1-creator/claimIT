/**
 * ============================================================================
 * System Diagnostics & Claim Worthiness Calculator
 * ============================================================================
 * 
 * SECURITY NOTICE: 
 * All data processed here remains strictly local. 
 * Zero data is sent to external servers or the outside world.
 */

function evaluateClaimWorthiness(asset) {
    const purchaseDate = new Date(asset.purchaseDate || asset.warrantyStart || '2023-01-01');
    const warrantyMonths = parseInt(asset.warrantyMonths || 36, 10);
    const expectedLifespanMonths = parseInt(asset.expectedLifespanMonths || 60, 10);
    const purchasePrice = parseFloat(asset.purchasePrice || 10000);

    const today = new Date();
    
    // Calculate warranty expiration date
    const warrantyExpiry = new Date(purchaseDate);
    warrantyExpiry.setMonth(warrantyExpiry.getMonth() + warrantyMonths);

    // Calculate lifespan end date
    const lifespanExpiry = new Date(purchaseDate);
    lifespanExpiry.setMonth(lifespanExpiry.getMonth() + expectedLifespanMonths);

    const isUnderWarranty = today <= warrantyExpiry;
    const isWithinLifespan = today <= lifespanExpiry;

    // Calculate approximate depreciated value
    const totalAgeDays = Math.max(1, (today - purchaseDate) / (1000 * 60 * 60 * 24));
    const totalLifespanDays = expectedLifespanMonths * 30.4375;
    const depreciationRatio = Math.max(0, 1 - (totalAgeDays / totalLifespanDays));
    const estimatedCurrentValue = Math.max(0, Math.round(purchasePrice * depreciationRatio));

    let isWorthClaiming = false;
    let category = 'EXPIRED';
    let reason = '';
    let recommendedSalvage = 'None';

    if (isUnderWarranty) {
        isWorthClaiming = true;
        category = 'UNDER_WARRANTY';
        const remainingWarrantyDays = Math.ceil((warrantyExpiry - today) / (1000 * 60 * 60 * 24));
        reason = `คุ้มค่าที่จะส่งเคลม: ครุภัณฑ์ยังอยู่ในระยะเวลารับประกัน (เหลือ ${remainingWarrantyDays} วัน) เคลมได้ฟรีโดยไม่มีค่าใช้จ่ายอะไหล่`;
    } else if (isWithinLifespan && depreciationRatio >= 0.25) {
        isWorthClaiming = true;
        category = 'OUT_OF_WARRANTY_REPAIRABLE';
        reason = `หมดประกันแล้ว แต่ยังอยู่ในอายุการใช้งาน (มูลค่าประเมินคงเหลือประมาณ ฿${estimatedCurrentValue.toLocaleString()}) แนะนำส่งซ่อมแซมหากค่าซ่อมไม่เกิน 50% ของมูลค่าเครื่อง`;
    } else {
        isWorthClaiming = false;
        category = 'END_OF_LIFE';
        if (estimatedCurrentValue <= 0) {
            recommendedSalvage = 'Pending Sell';
            reason = `ไม่คุ้มค่าที่จะซ่อม: ครุภัณฑ์หมดมูลค่าทางบัญชี (฿0 / EOL) แนะนำส่งขายทอดตลาด (Pending Sell) หรือบริจาค (Pending Donation)`;
        } else {
            recommendedSalvage = 'Pending Donation';
            reason = `ไม่คุ้มค่าที่จะส่งเคลม/ซ่อม: มูลค่าคงเหลือต่ำกว่า 25% (฿${estimatedCurrentValue.toLocaleString()}) แนะนำพิจารณาขายทอดตลาดหรือส่งมอบบริจาค`;
        }
    }

    return {
        assetId: asset.assetId || asset.asset_tag,
        isWorthClaiming,
        category,
        estimatedCurrentValue,
        purchasePrice,
        isUnderWarranty,
        warrantyExpiry: warrantyExpiry.toISOString().split('T')[0],
        reason,
        recommendedSalvage
    };
}

module.exports = { evaluateClaimWorthiness };
