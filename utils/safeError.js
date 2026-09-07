/**
 * Centralized Database & Server Error Sanitizer
 * Protects database schema internals from leaking to API clients
 * while providing actionable, human-friendly Thai error messages.
 */

function handleDbError(res, err, defaultMessage = 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล กรุณาลองใหม่อีกครั้ง') {
  const rawMsg = String((err && err.message) ? err.message : (err || 'Unknown error'));
  console.error('[DB Error Log]:', rawMsg);

  if (rawMsg.includes('UNIQUE constraint failed: mains.asset_tag')) {
    return res.status(400).json({ error: 'รหัสครุภัณฑ์นี้ (Asset Tag) มีอยู่ในระบบแล้ว' });
  }
  if (rawMsg.includes('UNIQUE constraint failed: users.username')) {
    return res.status(400).json({ error: 'ชื่อผู้ใช้งาน (Username) นี้มีอยู่ในระบบแล้ว' });
  }
  if (rawMsg.includes('UNIQUE constraint failed: claims.claim_number')) {
    return res.status(400).json({ error: 'เลขที่ใบเคลมนี้มีอยู่ในระบบแล้ว' });
  }
  if (rawMsg.includes('UNIQUE constraint failed')) {
    return res.status(400).json({ error: 'ข้อมูลนี้มีอยู่ในระบบแล้ว ไม่สามารถบันทึกซ้ำได้' });
  }
  if (rawMsg.includes('FOREIGN KEY constraint failed')) {
    return res.status(400).json({ error: 'ข้อมูลอ้างอิงไม่ถูกต้อง หรือถูกลบไปแล้ว' });
  }

  return res.status(500).json({ error: defaultMessage });
}

module.exports = { handleDbError };
