# Pi as Harness for AutoAcct

> Explanation — pi เป็น harness สั่งงาน AutoAcct ผ่าน cookbook นี้ (accepted 2026-09-12)

## Context

Cookbook เก็บ code พร้อมใช้ แต่ไม่มีคนกดรันเอง — **pi** (coding agent harness)
เป็นตัวอ่านคำสั่งคน แล้วเรียก recipe จริง: `bun install` → `APP_MODE=DEV/PROD bun run example.ts`
→ `bun test` → ส่งผลกลับ

## How pi commands AutoAcct

```
คนสั่ง (TH) → pi → อ่าน docs/ + decision-log → เลือก recipe →
รัน DEV (mock, ฟรี) → ยืนยันกับคน → รัน PROD (API จริง) → ส่งออก Express
```

คำสั่งที่ pi ใช้บ่อย:

```bash
# 1. OCR ใบเสร็จ (DEV ไม่เสียเงิน)
cd recipes/03-vision-ocr/receipt-extraction && bun install && APP_MODE=DEV bun run example.ts

# 2. Hybrid ประหยัด (DEV)
cd ../groq-fallback && bun install && bun run example:dev

# 3. เทสก่อน PROD
bun test --env APP_MODE=dev
```

## Rules for pi

- DEV ก่อนเสมอ ห้ามยิง PROD โดยไม่ยืนยันกับคน (เสียเงิน + ข้อมูลจริง)
- ทุกงานต้องมี `correlationId` (`autoacct-{timestamp}-{random}`) ตั้งแต่ OCR → export
- เงินเก็บเป็น **Satang** (int) ห้ามใช้ float
- รุ่น `:free` ใช้แค่ DEV/test; PROD ใช้รุ่นเสียเงินที่ปักไว้ใน config + log รุ่นทุกครั้ง
- อย่าส่งข้อมูลลูกค้าจริงขึ้น endpoint ฟรีโดยไม่มี consent
- อ่าน `docs/decision-log.md` ก่อนเปลี่ยนสถาปัตยกรรม แล้วจด decision ใหม่ทุกครั้ง

## See also

- [Decision: Pi as Harness](./decision-log.md) (2026-09-12)
- [AutoAcct Context](./autoacct-context.md)
- [OpenRouter Vision Free](./openrouter-vision-free.md)
- [Receipt Extraction](../recipes/03-vision-ocr/receipt-extraction/)
