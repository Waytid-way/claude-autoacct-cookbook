---
name: receipt-ocr-node
description: Run one Thai receipt image through a vision model and get Satang JSON back. Reach for it when wiring PROD OCR, benchmarking a model, or re-running a receipt by hand.
disable-model-invocation: true
---

# Receipt OCR node (by hand, never in tests)

## Before you begin

You need: a receipt image path, an OpenRouter-capable `pi` setup. Paid models need a key; `:free` models are DEV-only and rate-limit (429 = wait or BYOK).

## Run one receipt

```bash
pi -p --no-session --model "openrouter/<model-id>" --thinking low --no-tools @"<receipt.jpg>" \
"You are a receipt OCR node. Extract amountSatang, vatAmountSatang, baseAmountSatang, vendorName, issueDate (YYYY-MM-DD), confidence (0-1), notes. Satang integers. null when unreadable. Never fabricate. Reply 7-key JSON (6 fields + notes) code block only, then one line: how many of the 6 fields were read."
```

You should see: a 7-key JSON block (6 fields + notes) with Satang ints + a count line.

Proven defaults live in code (`workspace/src/runner.ts`: `OCR_MODEL`) and results in `docs/vision-benchmark.md` — don't copy model lists here. Free tiers 429 under load: wait or BYOK, never hammer.

## Rules

Output contract above is authoritative for this skill. Amounts, PII, and paid-vs-free rules: same as `workspace/AGENTS.md` — follow that file, nothing here overrides it.
