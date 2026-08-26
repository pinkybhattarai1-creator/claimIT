# 07 — คะแนนความคุ้มค่า (Viability Score Engine)

กลุ่มผู้ใช้: IT Staff / Admin

---

## Viability Score คืออะไร?

คะแนนที่คำนวณโดย Backend เพื่อประเมินว่าครุภัณฑ์
"คุ้มค่า" ที่จะส่งเคลม/ซ่อมหรือไม่

คะแนน: 0.0 – 10.0
- Score <= 5.0 → VIABLE (คุ้มค่า) → ส่งเคลมได้
- Score > 5.0  → NOT_VIABLE (ไม่คุ้มค่า) → พิจารณาทิ้ง/ขาย

---

## สูตรการคำนวณ (Server-Authoritative)

คำนวณโดย Backend เท่านั้น (ป้องกันการ manipulate จาก Client)

สำหรับแต่ละครุภัณฑ์ในใบเคลม:

1. ยังอยู่ในรับประกัน (isUnderWarranty = true):
   → itemScore = 1.0 (คุ้มมากที่สุด)

2. หมดประกันแต่ยังมีมูลค่า (OUT_OF_WARRANTY_REPAIRABLE):
   depreciationRatio = estimatedCurrentValue / purchasePrice
   itemScore = min(5.0, max(2.0, 5.0 - (depreciationRatio * 3.0)))
   → ได้คะแนน 2.0–5.0

3. หมดอายุ / EOL:
   → itemScore = 8.5 (ไม่คุ้มค่า)

averageScore = sum(itemScores) / จำนวนครุภัณฑ์
isViable = (averageScore <= 5.0)

---

## ตัวอย่างการคำนวณ

กรณี: iPad Air ราคา 30,000 บาท อายุ 4 ปี หมดประกัน
- มูลค่าปัจจุบันประเมิน: ~15,000 บาท
- depreciationRatio = 15000/30000 = 0.5
- itemScore = 5.0 - (0.5 * 3.0) = 3.5
- averageScore = 3.5 → VIABLE

กรณี: Computer อายุ 8 ปี เกิน lifespan
- itemScore = 8.5 → NOT_VIABLE

---

## แสดงผลใน UI

แถบ Viability Banner ปรากฏเมื่อสแกนครุภัณฑ์:
- สีเขียว: "คุ้มค่าที่จะส่งเคลม"
- สีแดง: "ไม่คุ้มค่า / หมดอายุการใช้งาน"
- บอก: score, สถานะ, คำอธิบาย

---

## แสดงใน PDF Report

ในใบเคลม PDF จะระบุ:
"คะแนนความคุ้มค่า (Viability Score): X.X / 10.0 (VIABLE/NOT_VIABLE)"

---

## State Machine ที่เกี่ยวข้อง

หลังสร้างใบเคลม สถานะเริ่มต้นจะเป็น:
- VIABLE (ถ้า score <= 5.0)
- NOT_VIABLE (ถ้า score > 5.0)

ดู State Machine ทั้งหมดที่ 08_claim_status_lifecycle.md

---

ถัดไป: 08_claim_status_lifecycle.md
