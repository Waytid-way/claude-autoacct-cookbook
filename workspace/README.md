# workspace — vertical slice (T2–T6)

```bash
cp sample/receipt-001.jpg inbox/   # ใส่ใบเสร็จ
APP_MODE=DEV node src/runner.ts    # mock ฟรี
APP_MODE=PROD node src/runner.ts   # OCR จริง (OCR_MODEL, default gemini-2.5-flash-lite แบบเสียเงิน)
node selfcheck.ts                  # เช็ค gate
```

`outbox/` = พร้อมใช้ · `needs-review/` = ตกเกณฑ์พร้อมเหตุผล · `audit.log.jsonl` = trace ตาม correlationId
