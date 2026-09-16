---
name: autoacct-ops
description: Conversational operational interface for AutoAcct. Translates accountant intents into deterministic CLI commands, executes pipeline and Dhanakom export, and provides accounting summaries and read-only exception reviews.
disable-model-invocation: true
---

# AutoAcct Operations (Pi Harness Skill)

Use this skill when an accountant or operator asks to process receipts, load a specific client's Knowledge Base, export batches to Dhanakom (Express Accounting), or review pending exception items.

## Operating Principles

- **AI proposes; control system decides:** Pi acts strictly as the conversational orchestration and presentation layer. Pi is NEVER an accounting authority.
- **Deterministic CLI Execution:** All pipeline and export operations must invoke `workspace/src/runner.ts` via shell. Never attempt direct TypeScript function imports or bypass the CLI seam.
- **Read-Only Review:** When reviewing items in `needs-review/`, Pi presents vendor, amount, and reasons in plain language for human inspection. Pi MUST NOT mutate review files, MUST NOT write to Client KB, and MUST NOT infer or auto-post account codes. The ONLY files Desk mode may write are `workspace/feedback/YYYY-MM-DD.md` (EOD quality notes, append-only).
- **US13 Hard Boundary (Out of Scope):** Candidate mapping, Edge Log mutation, and knowledge write-back are NOT implemented in this version.
- **Safety First:** Always run in `APP_MODE=DEV` unless the human operator explicitly requests and confirms `PROD` execution. Never invent client paths or account codes.

---

## Intent-to-CLI Mapping

Translate accountant natural language requests into deterministic commands executed from the repository root:

### 1. Process Default Inbox
When the user asks to process incoming receipts without specifying a client:
```bash
node workspace/src/runner.ts
```

### 2. Process Client with Knowledge Base
When the user specifies a client name/company:
1. Locate the client's KB file (e.g. under `clients/<client-id>/kb.json` or path supplied by user).
2. If the path cannot be found or is ambiguous, STOP and ask the user to provide the exact path. DO NOT guess or invent paths.
3. Execute:
```bash
node workspace/src/runner.ts --client-kb <path-to-kb.json>
```

### 3. Export to Dhanakom (Express Accounting)
When the user asks to export validated transactions into Dhanakom / Express:
```bash
node workspace/src/runner.ts --export-dhanakom
```
Or with custom destination CSV path:
```bash
node workspace/src/runner.ts --export-dhanakom --dhanakom-out <path-to-file.csv>
```

### 4. Process + Export in One Operation
When the user asks to process and export in a single step:
```bash
node workspace/src/runner.ts --client-kb <path-to-kb.json> --export-dhanakom
```

---

## Reporting & Output Contract

After executing the CLI runner, parse the CLI stdout/stderr and observable filesystem artifacts (e.g. `audit.log.jsonl`, `outbox/`, `needs-review/`) to present a clear executive summary in Thai:

### Success Summary Format
```text
สรุปผลการประมวลผลบัญชี:
- ใบเสร็จที่ผ่านเกณฑ์ (Passed): [N] รายการ
- ใบเสร็จที่ต้องตรวจสอบ (Needs Review): [M] รายการ
- ข้ามรายการซ้ำ (Dedup Skipped): [S] รายการ
- สถานะ Dhanakom Export: [ส่งออกสำเร็จ N รายการ -> <csvPath> / ไม่ได้เปิดใช้งาน / ข้ามรายการที่เคยส่งออกแล้ว]
```

### Failure Summary Format
When the CLI runner exits with a non-zero exit code:
```text
การประมวลผลล้มเหลว:
- ข้อผิดพลาด: [คัดลอกข้อความจาก stderr เช่น Client KB file not found หรือ Invalid JSON]
- สถานะ: ไปป์ไลน์หยุดทำงานอย่างปลอดภัย ไม่มีการสร้างรายการลงบัญชี
```

---

## Needs-Review Inspection (Read-Only)

When `needs-review` count > 0, inspect the `.json` files in the review directory (`workspace/needs-review/*.json`) and present them clearly to the accountant:

### Read/Present Template
```text
รายการที่ต้องการให้นักบัญชีตรวจสอบ ([File Name]):
- ผู้ขาย (Vendor): [ocr.vendorName หรือ "ไม่พบชื่อ"]
- เลขประจำตัวผู้เสียภาษี (Tax ID): [ocr.taxId หรือ "ไม่มี"]
- ยอดเงินรวม (Total): [ocr.amountSatang / 100] บาท
- วันที่ (Date): [ocr.issueDate หรือ "ไม่มี"]
- สาเหตุที่ติดตรวจ (Reasons): [d.reasons หรือ "unknown vendor", "vat cross-check failed"]
```

### Decision Capture (ask_user_question — primary channel)

After presenting a case, capture the accountant's decision with the `ask_user_question` tool — do NOT ask them to copy-paste a text template. One case per call (options differ per case). Rules:

- Ask verdict first (single question, 2–3 options): `ยืนยันตามนี้` / `แก้ไข` / `ขอหลักฐานเพิ่ม`. Follow up conditionally in a second call: conflict → side pick; แก้ไข → corrected values; any verdict → reason.
- Conflict side-pick options MUST come only from the review JSON / KB refs with support counts (e.g. `5000-MEALS — 14 ครั้ง edge-009/011`). Never invent an account code as an option.
- Reason question: offer at most 1 neutral preset (e.g. `ยืนตามหลักฐานในรายงาน`) and rely on the built-in `Type something.` row for the real reason — never author reason options that put words in the accountant's mouth.
- Tool limits (hard): header ≤ 16 chars, option label ≤ 60 chars, 2–4 options per question, ≤ 4 questions per call, first option + `(Recommended)` when evidence supports one. Never author `Other`/`Type something.` labels (reserved).
- After answers: echo the captured decision back in Thai, remind that posting happens manually in Dhanakom (US13: no write-back yet), and never mutate review/KB files.
- The markdown template (`workspace/review-reply.template.md`) is fallback only — async/offline review where the harness tool is unavailable.

### End-of-Day Quality Review (3 questions, then log)

After the evening close (skipped/errors checked, audit complete), run ONE `ask_user_question` call (≤ 3 questions) so the accountant rates the day. Small and fixed — never improvise extra questions:

1. Header `ภาพรวมวันนี้`: `ราบรื่น` / `ติดขัดเล็กน้อย` / `ติดขัดมาก`.
2. Header `สะดุดตรงไหน`: `สรุปผล` / `คำถามตัดสิน` / `รายงาน HTML` / `export` (4th slot left for the built-in `Type something.` row — never add a 5th option).
3. Header `แก้1อย่าง`: single option `ไม่มี — วันนี้โอเค`, real answer expected via `Type something.`.

Then append to `workspace/feedback/YYYY-MM-DD.md` (create with `mkdir -p` if missing):

```markdown
# Feedback YYYY-MM-DD (Desk → Builder)
- ภาพรวม: <answer 1> / สะดุด: <answer 2> — <reviewer>
- [ ] <answer 3 verbatim> (skip checkbox when answer is "ไม่มี — วันนี้โอเค": write "- ไม่มีงานค้าง" instead)
```

Echo back what was saved and end the session's work — never fix code in a Desk session, even a one-line fix. Builder triages `- [ ]` items next session (tick `- [x]` + fix ref, never delete).

### Strict Prohibition
- DO NOT edit the review JSON files.
- DO NOT attempt to write Candidate mappings or update `ClientKnowledge` files.
- DO NOT infer or assign GL account codes on behalf of the accountant.
- If the accountant provides an account code in chat, acknowledge it and explain that automatic write-back is scheduled for a future release (US13), and manual review in the accounting system is required for now.
