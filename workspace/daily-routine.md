# Daily Routine — โต๊ะบัญชี (Desk mode)

รันบุ๊ค 1 หน้าสำหรับงานประจำวัน แยกขาดจากงานสร้างของ Builder หน้าที่ Pi มีแค่พาทำ + ถาม + จด — ตัดสินใจเป็นของคนเสมอ

## 2 Modes (แยกที่ session/tools ไม่ใช่บทละคร)

| | Builder | Desk |
|---|---|---|
| งาน | แก้โค้ด/เทส/pipeline | รับใบเสร็จ → รีวิว → export |
| tools | ครบ (read/write/bash) | รัน CLI + อ่านไฟล์ + ถามคำถามเท่านั้น |
| ข้อมูล | ห้ามแตะไฟล์ลูกค้าจริง | ใช้ไฟล์ลูกค้าได้ แต่ห้ามแก้โค้ด |
| เขียนไฟล์ได้ | โค้ด/เทส/docs | **`feedback/*.md` เท่านั้น** (+ รัน CLI ที่เขียน outbox/audit ตามปกติ) |
| ห้าม | PROD โดยไม่ยืนยัน, เดา path/รหัส | แก้โค้ด, เขียน KB/Edge Log, auto-post (US13) |

Builder เปิด session ใหม่ทุกครั้งที่รับงานจาก feedback — ไม่ปนกับ session Desk ที่คุยกับนักบัญชี

## เช้า — รับของ + เคลียร์คิว (Desk)

1. `cp sample/receipt-*.jpg inbox/` (หรือไฟล์จริงผ่าน paid/local path + consent)
2. `APP_MODE=DEV node src/runner.ts` — Pi สรุป Passed / Needs Review / Skipped
3. มี needs-review → `npm run report -- --review needs-review --out review-report.html` เปิดดู แล้ว Pi ถามทีละเคส (`ask_user_question`: ผลตรวจก่อน แล้วถามต่อตามคำตอบ)
4. เคสพร้อม → export ต้องยืนยันชัดก่อน: `node src/runner.ts --export-dhanakom`
5. เอา CSV/Excel ไป import Dhanakom ด้วยมือ (manual — ไม่มี auto-post)

## เย็น — ปิดวัน + 3 คำถามคุณภาพ (Desk)

1. เช็ค `summary.skipped/errors` + audit lines ครบทุกใบ
2. Pi ถามปิดวัน **ครั้งเดียว ไม่เกิน 3 ข้อ** (`ask_user_question`):
   - วันนี้โดยรวม: ราบรื่น / ติดขัดเล็กน้อย / ติดขัดมาก
   - สะดุดที่สุดตรงไหน: สรุปผล / คำถามตัดสิน / รายงาน HTML / export / (พิมพ์เอง)
   - อยากให้แก้ 1 อย่าง (พิมพ์เองได้; ตัวเลือก `ไม่มี — วันนี้โอเค`)
3. Pi จดลง `feedback/YYYY-MM-DD.md` (มีแล้ว append ไม่มีสร้างใหม่) แล้วทวนให้ฟัง — จบ ไม่แก้โค้ดใน session นี้

## Feedback → Builder (รับงานภายหลัง)

- Builder เริ่มงานทุกครั้งด้วยการอ่าน `feedback/` หา `- [ ]` ที่ยังว่าง
- แก้เสร็จติ๊ก `- [x]` + ใส่ ref (commit/PR) ต่อท้ายข้อนั้น — ไม่ลบของเก่า
- งานไหนใหญ่เกิน 1 PR แตก ticket ก่อนทำ
