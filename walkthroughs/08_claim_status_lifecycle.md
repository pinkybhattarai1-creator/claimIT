# 08 — สถานะใบเคลมและ State Machine

กลุ่มผู้ใช้: IT Staff / Admin

---

## สถานะของใบเคลม (Claim Status)

ใบเคลมแต่ละใบมีสถานะที่เปลี่ยนได้ตามขั้นตอน
(State Machine — Controlled Transitions Only)

---

## แผนภาพ State Machine

DRAFT → VIABLE หรือ NOT_VIABLE หรือ CANCELLED
VIABLE → CONFIRMED หรือ CANCELLED
NOT_VIABLE → CANCELLED
CONFIRMED → SUBMITTED หรือ CANCELLED
SUBMITTED → VENDOR_RESPONSE หรือ RETURNED หรือ REJECTED หรือ CANCELLED
VENDOR_RESPONSE → RETURNED หรือ REJECTED หรือ CANCELLED
RETURNED → CLOSED
REJECTED → CLOSED
CLOSED → (ไม่มีทางออก)
CANCELLED → (ไม่มีทางออก)

---

## คำอธิบายแต่ละสถานะ

| สถานะ | ความหมาย |
|---|---|
| DRAFT | ร่างใบเคลม ยังไม่ประเมิน |
| VIABLE | ผ่านการประเมิน คุ้มค่าส่งเคลม |
| NOT_VIABLE | ไม่คุ้มค่าส่งเคลม |
| CONFIRMED | ยืนยันแล้ว รอส่งศูนย์บริการ |
| SUBMITTED | ส่งให้ศูนย์บริการแล้ว (Pending Pickup) |
| VENDOR_RESPONSE | ศูนย์ตอบกลับมา รอผล |
| RETURNED | รับเครื่องคืนจากศูนย์แล้ว |
| REJECTED | ศูนย์ปฏิเสธการเคลม |
| CLOSED | ปิดใบเคลม (สำเร็จ) |
| CANCELLED | ยกเลิกใบเคลม |

---

## วิธีเปลี่ยนสถานะ

### 1. ผ่านหน้าต่างรายละเอียดใบเคลม (Claim Details Modal):
- ในแท็บ **📑 รายการใบส่งเคลม** กดปุ่ม **[📋 รายละเอียด]** ของใบเคลม
- แถบด้านล่างของหน้าต่างจะแสดงปุ่มเปลี่ยนสถานะตามขั้นตอนที่อนุญาตโดยอัตโนมัติ:
  - `✓ ผ่านการประเมิน (VIABLE)`
  - `✓ ยืนยันส่งศูนย์ (CONFIRMED)`
  - `📤 ส่งมอบศูนย์บริการ (SUBMITTED)`
  - `📥 รับเครื่องกลับคืน (RETURNED)`
  - `🏁 ปิดงานเสร็จสิ้น (CLOSED)`
  - `✕ ยกเลิกใบเคลม (CANCELLED)`

### 2. ผ่านแผงสแกนเนอร์ (IT Scanner):
- สแกนครุภัณฑ์ที่สถานะ Pending Pickup
- กดปุ่ม [ตรวจสอบเครื่องและนำเข้าคลังปกติ (Return to Stock)]
- → เปิด Modal "บันทึกรับเครื่องคืนจากศูนย์บริการ"

### 3. ผ่าน API:
PUT /api/claims/:id/status
Body: { "status": "RETURNED", "notes": "รับเครื่องคืนเรียบร้อย" }

---

## Modal: บันทึกรับเครื่องคืน (Resolve RMA)

เมื่อกด [Return to Stock] จะเปิด Modal ให้กรอก:

| ฟิลด์ | ตัวเลือก |
|---|---|
| ผลการซ่อม/เคลม | Repaired / Replaced / Scrapped |
| Serial Number ใหม่ | กรณีเปลี่ยนเครื่องใหม่ยกชุด |
| ค่าใช้จ่ายซ่อมแซม | ระบุ 0 หากอยู่ในประกัน (หน่วย: บาท) |

กด [บันทึกรับเครื่องคืนและนำเข้าคลังปกติ]
- สถานะครุภัณฑ์กลับเป็น Working
- อัปเดต Serial Number (ถ้าเปลี่ยน)
- บันทึก resolution_type และ repair_cost
- บันทึก Audit Log

---

## กฎสำคัญ

- ห้ามข้ามขั้นตอน (เช่น DRAFT → CLOSED โดยตรงไม่ได้)
- Backend ตรวจสอบทุก transition
- Transition ที่ไม่ถูกต้องได้รับ error 400 + คำอธิบาย

---

ถัดไป: 09_evidence_upload.md
