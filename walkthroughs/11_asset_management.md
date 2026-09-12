# 11 — จัดการครุภัณฑ์ (Asset Management)

กลุ่มผู้ใช้: IT Admin (เพิ่ม/แก้ไข/ลบ) | Staff (ดูอย่างเดียว)

---

## ภาพรวม

ส่วนนี้คือคลังครุภัณฑ์ IT ทั้งหมดของโรงพยาบาล
เจ้าหน้าที่ IT สามารถเพิ่ม แก้ไข และจัดการชีวิตของครุภัณฑ์

---

## ตารางรายการครุภัณฑ์ (Inventory Table)

แสดงในหน้า IT Portal:
- รหัสครุภัณฑ์ (Asset Tag)
- ชื่ออุปกรณ์
- แบรนด์ (Brand)
- ที่อยู่/จุดติดตั้ง
- วันหมดอายุรับประกัน
- มูลค่าประเมิน
- สถานะ (Working / Broken / Pending ฯลฯ)
- ปุ่ม [เอกสาร] — ดาวน์โหลด PDF ใบเคลม

### กรองข้อมูล:
เลือกสถานะจาก Dropdown:
- ทุกสถานะ
- ปกติ (Working)
- ⚠️ ใกล้หมดประกันใน 6 เดือน (Expiring in 6 Months)
- ชำรุด (Broken)
- รอศูนย์มารับ (Pending Pickup)
- รอขายทอดตลาด (Pending Sell)
- รอดำเนินการบริจาค (Pending Donation)
- แทงจำหน่าย (Scrapped)

### แถบกรองหมวดหมู่อุปกรณ์ (Frontend Category Tabs):
ด้านบนตารางทะเบียนครุภัณฑ์มีแท็บเลือกหมวดหมู่อุปกรณ์ที่แยกการแสดงผลอย่างชัดเจน:
- `🌐 ทั้งหมด`
- `💻 Computer`
- `🖥️ Clinical Workstation`
- `📺 Clinical IT Display` (อายุมาตรฐาน 84 เดือน)
- `📱 Tablet`
- `🏷️ Scanner / Barcode`
- `🖨️ Printer`
- `🌐 Network`
- `🛒 Mobile Nursing Cart`
- `📦 อื่นๆ`

### Pagination Slots & Page Jump:
- เลือกระดับการแสดงผลแถวต่อหน้า: 15, 25, 50, 100 รายการ
- ช่อง Jump-to-page เลือกหน้าได้โดยตรง
- ปุ่ม [ย้อนกลับ] / [ถัดไป] พร้อมตัวนับ: "แสดง X - Y จาก Z รายการ"

---

## เพิ่มครุภัณฑ์ใหม่ (Add New Asset)

กดปุ่ม [➕ เพิ่มครุภัณฑ์ใหม่] → เปิด Modal (รองรับทั้งการเพิ่มทีละชิ้น และการนำเข้าแบบกลุ่ม Batch Intake สูงสุด 50 รายการ)

### ระบบตรวจสอบยี่ห้อเดียว (Single-Brand Guardrail: ป้องกัน "Dell และ Acer ในชิ้นเดียวกัน"):
ระบบมีการควบคุมความถูกต้องของยี่ห้อ (Brand Integrity):
- **กฎเหล็ก:** ครุภัณฑ์หนึ่งชิ้นต้องระบุยี่ห้อเพียงยี่ห้อเดียวเท่านั้น **ห้ามระบุหลายยี่ห้อปนกัน** เช่น `Dell และ Acer`, `Dell, HP`, `HP / Lenovo`, `Dell and Acer`
- **Frontend Validation:** ตรวจสอบทันทีเมื่อเลื่อนโฟกัสออกจากช่องกรอก (onBlur) และก่อนส่งฟอร์ม หากพบหลายยี่ห้อ ระบบจะแสดงแถบเตือนสีแดงพร้อมข้อความภาษาไทยชัดเจน และไม่ล้างข้อมูลในฟอร์มทิ้งเพื่อให้ผู้ใช้แก้ไขได้ทันที
- **Backend Validation:** เซิร์ฟเวอร์ตรวจสอบซ้ำด้วยฟังก์ชัน `validateSingleBrand()` หากฝ่าฝืนจะส่งกลับรหัส `HTTP 400 Bad Request` เสมอ (ไม่ส่ง 404)

### การเลือกสถานที่ติดตั้งจากผังอาคารโรงพยาบาล (Hospital Layout Directory Picker):
ข้างช่องกรอกสถานที่ติดตั้ง (`#new-location` และ `#batch-location`) มีปุ่ม **[🏥 เลือกจากผังอาคาร]**:
- คลิกเพื่อเปิดหน้าต่างผังอาคารโรงพยาบาล (Hospital Layout Directory)
- แสดงโครงสร้างจริงของโรงพยาบาล: **Building 1** (ชั้น 21 ถึง ชั้น 1, ชั้น B และ D) และ **Call Center Buildings** (Old Building ชั้น 1–2, New Building ชั้น 1–4 + Mezzanine)
- คลิกที่ป้ายชื่อแผนก (Badge) เพื่อใส่ชื่อสถานที่ลงในฟอร์มอัตโนมัติ (เช่น `Building 1, Floor 4 — IT`)
- มีระบบช่องแนะนำอัตโนมัติ (HTML5 Datalist Autocomplete) ให้เลือกพิมพ์ได้อย่างรวดเร็ว

### ข้อมูลที่ต้องกรอก:

| ฟิลด์ | ตัวอย่าง | จำเป็น |
|---|---|---|
| รหัสครุภัณฑ์ (Asset Tag) | CIT-2026-MON-01 | ใช่ |
| ชื่ออุปกรณ์ (Device Name) | Dell Monitor 24-inch | ใช่ |
| หมวดหมู่ (Category) | Computer / Clinical IT Display / Tablet / Scanner / Printer ฯลฯ | ใช่ |
| ยี่ห้อ (Brand) | Dell หรือ HP (ระบุ 1 ยี่ห้อเท่านั้น) | ใช่ |
| รุ่น (Model) | OptiPlex 7090 | ใช่ |
| Serial No. | SN12345678 | ใช่ |
| สถานที่ติดตั้ง (Location) | Building 1, Floor 19 — ศูนย์หัวใจ (เลือกจากผังอาคารได้) | ใช่ |
| วันเริ่มรับประกัน | 2026-01-01 | ใช่ |
| ระยะเวลาประกัน | 1 ปี / 2 ปี / 3 ปี / 5 ปี | ใช่ |
| ต้องทำความสะอาดข้อมูล (PDPA) | checkbox (checked = ต้องล้างข้อมูลก่อนส่งเคลม) | ไม่ |

### ป้องกันรหัสซ้ำ (Anti-Duplicate):
ระบบตรวจสอบ Asset Tag และ Serial Number แบบ real-time
หากซ้ำ แสดงคำเตือน: "ตรวจพบข้อมูลซ้ำ"

### ป้องกันอุปกรณ์เครื่องมือแพทย์ (BME Guardrail):
หากผู้ใช้พยายามลงทะเบียนอุปกรณ์ที่เป็นเครื่องมือแพทย์ (เช่น Ventilator, Infusion Pump, Patient Monitor) ระบบจะบล็อกด้วย HTTP 400 ทันที พร้อมแนะนำให้ส่งต่อไปยังฝ่ายวิศวกรรมการแพทย์ (Biomedical Engineering: BME)

### สถานะเริ่มต้น:
ครุภัณฑ์ใหม่เริ่มที่สถานะ Working เสมอ

---

## API สำหรับการจัดการครุภัณฑ์

| Method | Endpoint | สิทธิ์ | คำอธิบาย |
|---|---|---|---|
| GET | /api/assets | Staff+ | ดูรายการทั้งหมด |
| GET | /api/assets/:tag | Staff+ | ดูครุภัณฑ์เดียว |
| POST | /api/assets | Admin | เพิ่มใหม่ |
| PUT | /api/assets/:tag | Admin | แก้ไข |
| DELETE | /api/assets/:tag | Admin | Soft delete |
| GET | /api/assets/check-tag/:tag | Staff+ | ตรวจสอบรหัสซ้ำ |
| GET | /api/assets/search/fuzzy | Staff+ | Fuzzy search |

---

## คัดลอกข้อมูล TSV

กดปุ่ม [คัดลอกข้อมูล (TSV)] เพื่อคัดลอกข้อมูลตารางปัจจุบัน
เป็น Tab-Separated Values → วางลง Excel ได้ทันที

---

ถัดไป: 12_eol_salvage.md
