# Vision Benchmark — ใบเสร็จไทย (n=1)

> Reference — ผลเทียบรุ่น Vision ฟรีบนใบเสร็จจำลอง 1 ใบ รันเมื่อ **2026-09-12**
> วิธีรันซ้ำ: `pi -p --no-session --model "openrouter/<id>" --thinking low --no-tools @<receipt.jpg> "<prompt>"`
> prompt: สกัด `amountSatang, vatAmountSatang, baseAmountSatang, vendorName, issueDate, confidence, notes` หน่วย Satang ห้าม fabricate

## Test image

ใบเสร็จจำลองภาษาไทย (สร้างด้วย PIL + Noto Sans Thai, ไม่มี PII):
`ร้านกาแฟทดสอบ (สาขาจำลอง)` · เลขที่ RC-2026-0912-001 · 12/09/2026 ·
เอสเพรสโซเย็น x2 130.00 + ชาเขียวนม x1 45.00 + เค้กช็อกโกแลต x1 175.00 ·
รวม 350.00 / ก่อนภาษี 327.10 / VAT 7% 22.90 / เงินสด

## Ground truth

| ฟิลด์ | ค่า |
|---|---|
| amountSatang | 35000 |
| vatAmountSatang | 2290 |
| baseAmountSatang | 32710 |
| vendorName | ร้านกาแฟทดสอบ (สาขาจำลอง) |
| issueDate | 2026-09-12 |

## Results

| โมเดล | ยอดรวม | VAT | ก่อนภาษี | ร้าน | วันที่ | สรุป |
|---|---|---|---|---|---|---|
| `muse-spark-1.3-contributor-free` (opencode, โมเดลหลัก Pi) | ✅ | ✅ | ✅ | ✅ ตรง | ✅ | **6/6** |
| `thinkingmachines/inkling:free` | ✅ | ✅ | ✅ | ✅ ตรง | ✅ | **6/6** |
| `inclusionai/ling-3.0-flash-vl:free` | ✅ | ✅ | ✅ | ❌ "ร้านค้าแฟชั่นสด" (หลอน) | ✅ | **5/6** |
| `nex-agi/nex-n2.5-mini:free` | — | — | — | — | — | ❌ provider 400 ไม่รับ request |
| `google/gemma-4-26b-a4b-it:free` | — | — | — | — | — | ⏳ 429 shared pool เต็ม (ลอง 3 รอบ) |
| `google/gemma-4-31b-it:free` | — | — | — | — | — | ⏳ 429 shared pool เต็ม |

## Observations

- Inkling สูสีโมเดลหลัก Pi — ใช้เป็นตัวเทียบ Gemma ได้ระหว่างรอโควต้า
- Ling-VL ตัวเลขถูกหมดแต่**หลอนชื่อร้าน** — ยืนยันว่าต้องมี confidence threshold + manual review queue (ตาม `autoacct-context.md`) ห้าม auto-approve จากตัวเลขอย่างเดียว
- ของฟรีพังได้ 2 แบบ: rate limit (Gemma) และ provider ไม่รับรูป (Nex) — pipeline ต้องมี fallback ไปรุ่นเสียเงินเสมอ
- คำสั่งเทียบ Gemma ที่ใช้ (รันใหม่เมื่อโควต้าว่าง):
  `pi -p --no-session --model "openrouter/google/gemma-4-26b-a4b-it:free" --thinking low --no-tools @receipt.jpg "<prompt>"`

## Limitations

- n=1 ใบเดียว ภาพคมชัด — ยังไม่ครอบคลุม thermal ซีด / ลายมือ / รูปเอียงมืด
- อย่าตัดสินรุ่นจากผลนี้อย่างเดียว ต้องมีชุดเทส 20–50 ใบก่อนใช้ PROD

## See also

- [OpenRouter Vision Free](./openrouter-vision-free.md)
- [Pi as Harness](./pi-harness.md)
- [AutoAcct Context](./autoacct-context.md)
