# 15 — ตั้งค่าระบบและขั้นตอนเคลม (System Configurations & Procedures)

> **กลุ่มผู้ใช้:** ผู้ดูแลระบบ (IT Administrator เท่านั้น) | **เวลาอ่าน:** ~5 นาที

---

## ภาพรวม

โมดูลการตั้งค่าระบบ (`routes/configurations.js` และ `public/js/admin.js`) เป็นศูนย์กลางกำหนดค่าพารามิเตอร์แบบพลวัต (Dynamic Configurations) ที่ขับเคลื่อนเมนูตัวเลือกทั่วทั้งระบบ ช่วยให้ผู้ดูแลระบบสามารถเพิ่มแบรนด์ใหม่ หมวดหมู่อุปกรณ์ใหม่ หรือจุดติดตั้งใหม่ได้ทันทีโดยไม่ต้องแก้ไขโค้ดโปรแกรม

---

## ประเภทของการตั้งค่าระบบ (Configuration Types)

ระบบรองรับ 3 ประเภทหลัก:

1. **`brand` (ยี่ห้อ / ศูนย์บริการคู่ค้า):** รายชื่อแบรนด์ผู้ผลิต เช่น Dell, HP, Apple, Lenovo, Zebra, Acer, Canon
   - *ฟังก์ชันพิเศษ:* สามารถระบุ **ขั้นตอนการเคลม (Brand Claim Procedures)** ลงในฟิลด์รายละเอียด ซึ่งจะไปแสดงในแผง RMA โดยอัตโนมัติเมื่อเลือกแบรนด์นั้น
2. **`category` (หมวดหมู่ครุภัณฑ์):** ประเภทของอุปกรณ์ เช่น Computer, Monitor, Tablet, Scanner, Printer, Network, Webcam
   - ใช้ในการคำนวณอายุขัยและค่าเสื่อมราคาสำหรับ Viability Score
3. **`location` (สถานที่ติดตั้ง / หอผู้ป่วย):** จุดประจำการของอุปกรณ์ เช่น Ward 20, ICU, ER, OPD, ห้องยา, ห้องผ่าตัด

---

## ตารางการตั้งค่าใน IT Portal

แสดงรายการค่าคอนฟิกทั้งหมดในระบบ พร้อมระบุ:
- **ID:** ลำดับ
- **ประเภท (Type):** `brand`, `category`, หรือ `location`
- **ค่าที่แสดง (Value):** ชื่อที่ปรากฏในดรอปดาวน์
- **รายละเอียด / ขั้นตอน (Details):** ข้อมูลเพิ่มเติมหรือคู่มือเคลม
- **ปุ่มจัดการ:**
  - `[✏️ แก้ไข]` — ปรับปรุงชื่อหรือขั้นตอน
  - `[🗑️ ลบ]` — ลบการตั้งค่าออกจากระบบ

---

## การเพิ่มและแก้ไขขั้นตอนการเคลมของแบรนด์ (Brand Procedures)

เมื่อเพิ่มหรือแก้ไขคอนฟิกประเภท `brand` ในช่อง *"รายละเอียด / ขั้นตอนการส่งเคลม"*:
- สามารถระบุคำแนะนำเฉพาะของแบรนด์นั้นๆ ได้ เช่น:
  ```html
  <div style="color: #38bdf8; font-weight: bold;">ขั้นตอนการเคลม Dell ProSupport:</div>
  1. โทร 02-670-7250 เพื่อขอ Case Number / Dispatch ID<br>
  2. ระบุ Service Tag (7 หลัก) และผลทดสอบ ePSA Diagnostics<br>
  3. แจ้งเจ้าหน้าที่เข้ารับเครื่อง ณ แผนก IT ชั้น 4
  ```

### ระบบตรวจสอบความปลอดภัยของเนื้อหา (Procedure Sanitization):
- ใน `state.js` มีฟังก์ชัน `sanitizeBrandProcedure()` คอยตรวจสอบและกรองโค้ดอันตราย (XSS) หรือแท็ก `<script>` ออกโดยอัตโนมัติก่อนแสดงผล เพื่อความปลอดภัยสูงสุดของเบราว์เซอร์

---

## การนำไปใช้งานแบบพลวัตทั่วทั้งระบบ (Dynamic Dropdowns)

เมื่อมีการเพิ่มหรือแก้ไขคอนฟิก ฟังก์ชัน `updateDynamicDropdowns()` จะอัปเดตตัวเลือกในทุกหน้าต่างทันที:
- ตัวเลือก **Brand** และ **Category** ในหน้าต่างเพิ่มครุภัณฑ์ใหม่ (`Add Asset Modal`)
- ตัวเลือก **Location** ในหน้าต่างเพิ่มครุภัณฑ์
- ตัวเลือก **Vendor** ในแบบฟอร์มส่งเคลม (`RMA Form`) และหน้าต่าง Multi-Asset Claims Modal
- รายการเบอร์โทรศัพท์และช่องทางติดต่อคู่ค้า

---

## การตั้งค่าเริ่มต้นของระบบ (Seed Data)

เมื่อติดตั้งระบบครั้งแรก สามารถรันคำสั่ง:
```bash
node seed_configs.js
```
เพื่อสร้างข้อมูลพื้นฐานเริ่มต้นทันที:
- **Brands:** Dell, HP, Lenovo, Apple, Zebra, Acer, IDA, TSC, Generic
- **Categories:** Computer, Monitor, Tablet, Scanner, Printer, Network, Webcam
- **Locations:** Ward 1–30, ICU, ER, OPD, ห้องยา, Technical Support, ฯลฯ

---

## การจัดการแผนกโรงพยาบาล (Hospital Departments Management)

นอกจากคอนฟิกทั่วไป ระบบยังมีเส้นทาง `routes/departments.js` สำหรับจัดการโครงสร้างอาคารและชั้นของโรงพยาบาล:
- `GET /api/departments` — ดูรายชื่อแผนกทั้งหมด
- `POST /api/departments` — เพิ่มแผนกใหม่ (ระบุ `building_name`, `floor`, `name`, และ `is_technical_area`)
- `PUT /api/departments/:id` — แก้ไขข้อมูลแผนก
- `DELETE /api/departments/:id` — Soft Delete แผนก

---

ถัดไป: [16_excel_csv_export.md](file:///d:/claimit/claimIT/walkthroughs/16_excel_csv_export.md)
