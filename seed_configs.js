const { db } = require('./db');

const defaultConfigs = [
  {
    type: 'brand',
    value: 'IDA',
    details: `<div class="brand-guide">
  <div style="font-weight: bold; color: #38bdf8; margin-bottom: 6px;">📋 ขั้นตอนการส่งเคลมประกันศูนย์ IDA:</div>
  <ol style="margin: 0 0 10px 18px; padding: 0; line-height: 1.6; font-size: 13px;">
    <li>ส่ง Email แจ้งเคลมไปที่ <strong>support@idagroup.co.th</strong></li>
    <li>ระบุข้อมูลจำเป็น: <strong>หมายเลขซีเรียล (S/N), อาการเสียอย่างละเอียด, จุดติดตั้ง/แผนก, ชื่อและเบอร์โทรผู้ติดต่อ</strong></li>
    <li>รอรับการตอบกลับยืนยันและหมายเลข RMA / Case Number จากเจ้าหน้าที่</li>
    <li>จัดเตรียมอุปกรณ์และรอรถขนส่งเข้ามารับเครื่องที่โรงพยาบาล</li>
  </ol>
  <div style="font-size: 12px; color: #94a3b8; background: rgba(56, 189, 248, 0.1); padding: 8px; border-radius: 6px; border-left: 3px solid #38bdf8;">
    💡 <strong>ข้อแนะนำ:</strong> บันทึกหมายเลข Case No. หรือ RMA No. ที่ได้รับลงในระบบ ClaimIT ทันทีเพื่อความสะดวกในการติดตามสถานะ
  </div>
</div>`
  },
  {
    type: 'brand',
    value: 'Dell',
    details: `<div class="brand-guide">
  <div style="font-weight: bold; color: #38bdf8; margin-bottom: 6px;">📋 ขั้นตอนการส่งเคลมประกันศูนย์ Dell (ProSupport):</div>
  <ol style="margin: 0 0 10px 18px; padding: 0; line-height: 1.6; font-size: 13px;">
    <li>ถ่ายรูปภาพตัวเครื่องให้เห็นป้าย <strong>Service Tag / Express Service Code</strong> ชัดเจน และรูปภาพแสดงอาการเสีย</li>
    <li>โทรติดต่อ Call Center Dell Support (02-670-7250) หรือเปิดเคสออนไลน์</li>
    <li>ส่งรูปภาพ Service Tag และข้อมูลประกอบตามที่ฝ่ายบริการส่งคำขอมาทาง Email</li>
    <li><strong style="color: #f59e0b;">ข้อควรจำ:</strong> หากเป็นชิ้นส่วนหรือเครื่องทดแทน ให้ลอก/เก็บป้าย Tag เดิมไว้ติดกับอุปกรณ์ชิ้นใหม่</li>
    <li>เมื่อช่าง Dell เข้าเปลี่ยนอะไหล่ ให้ทดสอบระบบ (Diagnostics) ให้เรียบร้อยก่อนเซ็นรับมอบงาน</li>
  </ol>
</div>`
  },
  {
    type: 'brand',
    value: 'Lenovo',
    details: `<div class="brand-guide">
  <div style="font-weight: bold; color: #38bdf8; margin-bottom: 6px;">📋 ขั้นตอนการส่งเคลมประกันศูนย์ Lenovo:</div>
  <ol style="margin: 0 0 10px 18px; padding: 0; line-height: 1.6; font-size: 13px;">
    <li>เข้าสู่ระบบตรวจสอบประกันที่เว็บไซต์ <a href="https://support.lenovo.com/warrantylookup" target="_blank" style="color: #38bdf8; text-decoration: underline;">Lenovo Warranty Lookup</a></li>
    <li>กรอกหมายเลข Serial Number (S/N) ของเครื่องเพื่อตรวจสอบระดับการรับประกัน (Onsite / Premier Support)</li>
    <li>เลือกช่องทางเปิดเคส: โทร 1800-011-936 หรือส่ง e-Ticket ผ่านระบบเว็บไซต์</li>
    <li>นัดหมายวันเวลาให้ช่างผู้ชำนาญการ On-site เข้ามาให้บริการที่โรงพยาบาล หรือเตรียมส่งเครื่องเข้าศูนย์บริการ</li>
  </ol>
</div>`
  },
  {
    type: 'brand',
    value: 'TSC',
    details: `<div class="brand-guide">
  <div style="font-weight: bold; color: #38bdf8; margin-bottom: 6px;">📋 ขั้นตอนการส่งเคลมเครื่องพิมพ์บาร์โค้ด TSC:</div>
  <ol style="margin: 0 0 10px 18px; padding: 0; line-height: 1.6; font-size: 13px;">
    <li>ติดต่อตัวแทนจำหน่าย/ศูนย์บริการ TSC ผ่านโทรศัพท์หรือ Line Official Service</li>
    <li>ถ่ายรูปป้าย Serial Number และถ่ายคลิปวิดีโอสั้นแสดงอาการผิดปกติ (เช่น หัวพิมพ์ขาด, มอเตอร์ไม่หมุน, ฟีดกระดาษติด)</li>
    <li><strong style="color: #f59e0b;">เอกสารนำออก:</strong> ทำหนังสือขออนุญาตนำทรัพย์สินออกนอกโรงพยาบาล (Gate Pass) พร้อมให้ผู้มีอำนาจลงนาม</li>
    <li>เมื่อเจ้าหน้าที่นำเครื่องมาส่งคืน ให้ขอสำเนาบัตรประชาชนผู้ส่งและเอกสารใบส่งมอบคืนเครื่องไว้เป็นหลักฐาน</li>
  </ol>
</div>`
  },
  {
    type: 'brand',
    value: 'Acer',
    details: `<div class="brand-guide">
  <div style="font-weight: bold; color: #38bdf8; margin-bottom: 6px;">📋 ขั้นตอนการส่งเคลมประกันศูนย์ Acer:</div>
  <ol style="margin: 0 0 10px 18px; padding: 0; line-height: 1.6; font-size: 13px;">
    <li>ส่ง Email แจ้งเคลมไปที่ <strong>acerthai@acer.com</strong> หรือติดต่อ Call Center 02-153-9600</li>
    <li><strong style="color: #ef4444;">⚠️ กฎสำคัญ:</strong> หากเป็นการเคลมอุปกรณ์ต่อพ่วง (เมาส์ / คีย์บอร์ด / Adapter) <strong>ต้องระบุหมายเลข S/N ของเครื่อง PC/AIO ตัวแม่ที่ซื้อมาคู่กันเสมอ</strong></li>
    <li>ระบุอาการเสีย สถานที่ตั้งเครื่อง และเบอร์โทรศัพท์ผู้ประสานงาน</li>
    <li>รอรับใบงาน RMA เพื่อส่งเครื่องหรือรอขนส่งเข้ารับอุปกรณ์</li>
  </ol>
</div>`
  },
  { type: 'category', value: 'Computer', details: '' },
  { type: 'category', value: 'Scanner', details: '' },
  { type: 'category', value: 'Tablet', details: '' },
  { type: 'category', value: 'Webcam', details: '' },
  { type: 'category', value: 'Monitor', details: '' },
  { type: 'location', value: 'Ward 20', details: 'Floor 2' },
  { type: 'location', value: 'ICU', details: 'Floor 3' },
  { type: 'location', value: 'ฉุกเฉิน (ER)', details: 'Floor 1' },
  { type: 'location', value: 'Technical Support & Infrastructure', details: 'Floor 4' }
];

db.serialize(() => {
  db.run('DELETE FROM configurations');
  const stmt = db.prepare('INSERT INTO configurations (type, value, details) VALUES (?, ?, ?)');
  defaultConfigs.forEach(c => stmt.run([c.type, c.value, c.details]));
  stmt.finalize(() => {
    db.all('SELECT id, type, value FROM configurations', (e, rows) => {
      console.log('Seeded configurations count:', rows.length);
      process.exit(0);
    });
  });
});
