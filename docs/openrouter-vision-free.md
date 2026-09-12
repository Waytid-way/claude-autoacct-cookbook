# OpenRouter Vision Free Models

> Reference — รายการรุ่นฟรีสำหรับเลือกใช้ตอนทำงาน (สำรวจ `https://pi.dev/models` ผ่าน `https://pi.dev/api/models` เมื่อ **2026-09-12**, เงื่อนไข: `input` มี `image` + `cost == 0` + `provider == openrouter` → Vision 11 + Text-only 10)

## Models

| Model ID | Name | Context window |
|---|---|---:|
| `google/gemma-4-26b-a4b-it:free` | Gemma 4 26B A4B | 262,144 |
| `google/gemma-4-31b-it:free` | Gemma 4 31B | 262,144 |
| `inclusionai/ling-3.0-flash-vl:free` | Ling 3.0 Flash VL | 262,144 |
| `thinkingmachines/inkling:free` | Inkling | 1,048,576 |
| `thinkingmachines/inkling-small:free` | Inkling Small | 1,048,576 |
| `nex-agi/nex-n2.5-mini:free` | Nex-N2.5-Mini | 262,144 |
| `nex-agi/nex-n2.5-pro:free` | Nex-N2.5-Pro | 262,144 |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | Nemotron 3 Nano Omni | 256,000 |
| `dots-studio/dots-3-note-preview:free` | Dots3-Note Preview | 512,000 |
| `openrouter/auto` | Auto Router | 2,000,000 |
| `openrouter/free` | Free Models Router | 200,000 |

Text-only ฟรี (ใช้ต่อหลังสกัดข้อความแล้ว): `nvidia/nemotron-3-ultra-550b-a55b:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `nvidia/nemotron-3.5-lightning:free`, `cohere/north-mini-code:free`, `poolside/laguna-s-2.1:free`, `poolside/laguna-xs-2.1:free`, `liquid/lfm-2.5-2.6b:free`, `inclusionai/ling-3.0-flash-fin:free`, `inclusionai/ling-3.0-flash-sante:free`, `openrouter/fusion`

## Behavior and constraints

- ฟรีมี **rate limit / daily quota** — ต้องมี retry + fallback ไปรุ่นเสียเงินเสมอ
- รุ่น `:free` อาจเปลี่ยน/หายได้โดยไม่แจ้ง — ปัก `model` ไว้ใน config และ log รุ่นที่ใช้ทุกครั้ง
- อย่าส่งข้อมูลลูกค้าจริงขึ้น endpoint ฟรีโดยไม่มี consent / DPA
- ของฟรีใช้สำหรับ DEV/test เท่านั้น ห้ามใช้ตรงใน PROD (ดู decision-log ประกอบ)

## How to call a free vision model

คู่มือสั้นสำหรับยิงใบเสร็จ 1 ใบผ่าน OpenRouter (ต้องมี `OPENROUTER_API_KEY` ก่อน)

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-4-26b-a4b-it:free",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "สกัดยอดรวม, VAT 7%, ชื่อร้าน, วันที่ จากใบเสร็จนี้ ตอบเป็น JSON"},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
      ]
    }]
  }'
```

ตรวจผล: response 200 + `choices[0].message.content` เป็น JSON ที่มี `amountSatang`, `vatAmountSatang`, `vendorName`, `issueDate` ถ้าไม่ใช่ให้ลองใหม่อีกครั้งแล้ว fallback ไปรุ่นเสียเงิน

## About this shortlist

ทำไมเริ่มที่ 3 ตัวนี้ (ความเห็น ไม่ใช่ข้อเท็จจริง): `gemma-4-26b-a4b-it:free` มีแนวโน้มภาษาไทยดีสุดในกลุ่มฟรี จึงเป็นตัวแรกที่ควรลอง; `ling-3.0-flash-vl:free` เป็นสาย vision โดยเฉพาะ เหมาะเทียบความแม่นการอ่านตัวเลข; `inkling:free` มี context ยาวสุด (1M) เหมาะใบเสร็จยาว/หลายหน้า วัดจริงด้วยชุดใบเสร็จไทยก่อนตัดสินใจ (harness ใน `../recipes/03-vision-ocr/receipt-extraction/test.ts`)

Baseline แบบเสียเงินสำหรับเทียบ: `google/gemini-2.5-flash-lite` (`$0.10/$0.40`) ≈ ฿0.005–0.008/ใบ ถูกกว่า Claude 3.5 Sonnet 20–70x; fallback ถูกสุด `qwen3.7-flash` (`$0.03`) ≈ ฿0.002/ใบ

## See also

- [Decision: OpenRouter Free Vision for DEV](./decision-log.md) (2026-09-12)
- [Recipe: Receipt Extraction](../recipes/03-vision-ocr/receipt-extraction/)
- [Recipe: Groq Fallback & Hybrid](../recipes/03-vision-ocr/groq-fallback/)
- Catalog: https://pi.dev/models
