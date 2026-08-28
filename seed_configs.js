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
  {
    type: 'brand',
    value: 'Zebra',
    details: `<div class="brand-guide">
  <div style="font-weight: bold; color: #38bdf8; margin-bottom: 6px;">📋 ขั้นตอนการส่งเคลมอุปกรณ์ Zebra (ZebraCare):</div>
  <ol style="margin: 0 0 10px 18px; padding: 0; line-height: 1.6; font-size: 13px;">
    <li>เปิด Portal เว็บไซต์ Zebra Support Community หรือติดต่อศูนย์บริการตัวแทนจำหน่ายที่ได้รับการแต่งตั้ง</li>
    <li>ระบุ Serial Number และอัปโหลดไฟล์วิดีโอแสดงอาการสแกนบาร์โค้ดไม่ติด หรือหัวอ่านชำรุด</li>
    <li>รับเอกสาร RMA Return Voucher และจัดส่งพัสดุไปยังศูนย์ซ่อม</li>
  </ol>
</div>`
  },
  {
    type: 'brand',
    value: 'HP',
    details: `<div class="brand-guide">
  <div style="font-weight: bold; color: #38bdf8; margin-bottom: 6px;">📋 ขั้นตอนการส่งเคลมศูนย์บริการ HP (HP Care Pack):</div>
  <ol style="margin: 0 0 10px 18px; padding: 0; line-height: 1.6; font-size: 13px;">
    <li>ตรวจสอบระยะเวลารับประกันผ่าน HP Warranty Lookup ด้วย Serial Number</li>
    <li>ติดต่อ HP Call Center 02-787-3344 เพื่อทำการแจ้งซ่อมแบบ Onsite Service</li>
    <li>แจ้งหมายเลขเครื่อง และนัดหมายวันเข้าบริการของทีมช่าง HP Service</li>
  </ol>
</div>`
  },
  {
    type: 'brand',
    value: 'Apple',
    details: `<div class="brand-guide">
  <div style="font-weight: bold; color: #38bdf8; margin-bottom: 6px;">📋 ขั้นตอนการส่งเคลมอุปกรณ์ Apple (iPad / Mac):</div>
  <ol style="margin: 0 0 10px 18px; padding: 0; line-height: 1.6; font-size: 13px;">
    <li><strong>บังคับ:</strong> ต้องทำการล้างข้อมูล (Erase All Content and Settings) และ Sign out จาก Apple ID / Find My ก่อนส่งมอบ</li>
    <li>นำเครื่องเข้าศูนย์บริการ Apple Authorized Service Provider (AASP) หรือนัดหมายช่างรับเครื่อง</li>
    <li>เก็บสำเนาใบรับงานซ่อมเพื่อติดตามสถานะการเปลี่ยนเครื่องหรือซ่อมบำรุง</li>
  </ol>
</div>`
  },
  { type: 'brand', value: 'Canon', details: 'ศูนย์บริการ Canon Call Center 02-344-9988' },
  { type: 'brand', value: 'Epson', details: 'ศูนย์บริการ Epson Customer Care 02-685-9888' },
  { type: 'category', value: 'Computer', details: 'เครื่องคอมพิวเตอร์ตั้งโต๊ะ, All-in-One, Mobile Cart PC' },
  { type: 'category', value: 'Monitor', details: 'จอแสดงผลทางคลินิก, จอภาพประจำห้องตรวจ' },
  { type: 'category', value: 'Tablet', details: 'แท็บเล็ตประจำรถเข็นพยาบาลและห้องผู้ป่วย' },
  { type: 'category', value: 'Scanner', details: 'เครื่องสแกนบาร์โค้ดสายและไร้สาย 2D สำหรับยาและเวชภัณฑ์' },
  { type: 'category', value: 'Printer', details: 'เครื่องพิมพ์ใบเสร็จ, เครื่องพิมพ์สติกเกอร์ยา และเครื่องพิมพ์เลเซอร์' },
  { type: 'category', value: 'Network', details: 'สวิตช์เครือข่ายและจุดกระจายสัญญาณไร้สาย' },
  { type: 'category', value: 'Webcam', details: 'กล้องสำหรับการประชุมทางไกลและการแพทย์ทางไกล (Telemedicine)' },
  { type: 'location', value: 'ฉุกเฉิน (Emergency Room / ER)', details: 'Building 1, Floor 1' },
  { type: 'location', value: 'ห้องตรวจผู้ป่วยนอก (OPD Clinic)', details: 'Building 1, Floor 1' },
  { type: 'location', value: 'ห้องจ่ายยากลาง (Central Pharmacy)', details: 'Building 1, Floor 1' },
  { type: 'location', value: 'ศูนย์เอกซเรย์และรังสีวิทยา (Radiology & Imaging)', details: 'Building 1, Floor 2' },
  { type: 'location', value: 'ห้องปฏิบัติการทางการแพทย์ (Central Lab)', details: 'Building 1, Floor 2' },
  { type: 'location', value: 'ศูนย์ส่องกล้องระบบทางเดินอาหาร (GI Endoscopy Center)', details: 'Building 1, Floor 2' },
  { type: 'location', value: 'หอผู้ป่วยอายุรกรรม (Inpatient Ward 20)', details: 'Building 1, Floor 2' },
  { type: 'location', value: 'หอผู้ป่วยกุมารเวชกรรม (Pediatric Ward 12)', details: 'Building 1, Floor 2' },
  { type: 'location', value: 'หอผู้ป่วยศัลยกรรม (Surgical Ward 16)', details: 'Building 1, Floor 3' },
  { type: 'location', value: 'หออภิบาลผู้ป่วยวิกฤต (Intensive Care Unit / ICU)', details: 'Building 1, Floor 3' },
  { type: 'location', value: 'ห้องผ่าตัดใหญ่ (Operating Theatre / OR)', details: 'Building 1, Floor 3' },
  { type: 'location', value: 'เวชระเบียนและสถิติ (Medical Records)', details: 'Building 1, Floor 4' },
  { type: 'location', value: 'ฝ่ายการเงินและบัญชี (Finance & Billing)', details: 'Building 1, Floor 4' },
  { type: 'location', value: 'Technical Support & Infrastructure', details: 'Building 1, Floor 4' },
  { type: 'location', value: 'สำนักงานผู้อำนวยการ (Executive Administration)', details: 'Building 1, Floor 5' },
  { type: 'location', value: 'ศูนย์รับเรื่องคอลเซ็นเตอร์ (Call Center Workspace)', details: 'Building 2, Floor 2' }
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
