# Architecture Decision Log

> This document tracks significant architectural decisions made during the development of AutoAcct's Claude integration. Each decision includes context, rationale, and trade-offs.

---

## Decision Format

Each decision uses this template:

```markdown
## [DATE] Decision Title

**Status:** [Proposed | Accepted | Deprecated | Superseded]

**Context:**
What is the situation and problem we're trying to solve?

**Decision:**
What did we decide to do?

**Rationale:**
Why did we make this decision? What alternatives did we consider?

**Consequences:**
- Positive: Benefits of this decision
- Negative: Trade-offs or downsides
- Risks: What could go wrong?

**Related:**
- Links to relevant recipes or documentation
```

---

## 2026-09-13: Thermo hardening round (3 blockers)

**Status:** Accepted

**Context:**
Thermo review สแกน `workspace/` (582 บรรทัด) เจอ structural blockers 3 ตัวใน `pipeline.ts` เส้นเดียว: dedup จำผิดไฟล์, review-write ซ้ำ + เช็กตาย, บัญชี freeze ตอน import (#26, #30)

**Decision:**
ซ่อมทั้งสามด้วย root-cause fix จุดเดียวต่อตัว: กรอง `stage==='export'`; `writeReviewFile` เดียว + เช็กตายเป็น throw invariant; บัญชีย้ายเข้า `RunPipelineOptions` ลายเดียวกับ `minConf`

**Rationale:**
- ทุกตัวเป็น shared-function guard เดียว ไม่กระจาย caller (ponytail root-cause rule)
- ไม่แยกไฟล์ seen/config ใหม่ — YAGNI จนกว่า scale บังคับ
- ไม่ migrate audit เก่า — rerun หนึ่งรอบล้างเอง ถูกกว่า migration

**Consequences:**
- ✅ Positive: rerun ถูก semantics, review path เดียว, บัญชี inject ได้; suite 9/9 → 12/12 + typecheck + selfcheck เขียวตลอด
- ❌ Negative: throw invariant แทน review-write เดิม — ถ้า gate logic ผิดจริงจะนับเป็น error แทน needs-review (gate พิสูจน์แล้วว่าไปไม่ถึง)
- ⚠️ Risk: ต่ำ — ทุก PR ผ่าน pr-review สองแกนก่อน merge

**Related:**
- #26, #27, PR #28 (Blocker 1) · PR #29 (Blocker 2) · #30, #31, PR #32 (Blocker 3)

---

## 2026-09-13: Dedup-skip pass-only (filter export)

**Status:** Accepted

**Context:**
`loadSeenHashes` จำ sha256 จากทุก audit line รวม `ocr` line ทำให้ rerun ข้ามไฟล์ needs-review/error ผิด (#26)

**Decision:**
กรอง `stage==='export'` เท่านั้น; audit เก่าปล่อยไหล ไม่ migrate

**Rationale:**
`ocr` line ไม่มี verdict ใช้กรองไม่ได้ ส่วน `export` line เกิดเฉพาะ pass จึงเป็นตัวกรองตรงจุดเดียว ไม่แยกไฟล์ seen ใหม่ (YAGNI)

**Consequences:**
- ✅ Positive: rerun ข้ามเฉพาะ pass; review/error ทำใหม่ได้เสมอ
- ❌ Negative: audit เก่ามี ocr sha256 ค้าง rerun หนึ่งรอบอาจ skip ผิดครั้งเดียวแล้วหายเอง
- ⚠️ Risk: ต่ำ — local rerun อย่างเดียว ไม่แตะ PROD

**Related:**
- #26 (spec), #27 (ticket), PR #28

---

## 2026-09-12: Pi as Harness for AutoAcct

**Status:** Accepted

**Context:**
Cookbook มี code พร้อมใช้แต่ไม่มีตัวกดรัน — ต้องการ harness ที่รับคำสั่งภาษาคนแล้วเรียก recipe จริง

**Decision:**
ใช้ **pi** (coding agent harness) สั่งงาน AutoAcct ผ่าน cookbook นี้: อ่าน `docs/` → เลือก recipe → รัน DEV (mock ฟรี) → ยืนยันกับคน → รัน PROD → export Express รายละเอียดใน [docs/pi-harness.md](./pi-harness.md)

**Rationale:**
- pi อยู่ใน Termux อยู่แล้ว เรียก `bun`/git ได้ตรง ไม่ต้องสร้าง runner ใหม่
- กฎ DEV-ก่อน-PROD + correlationId + Satang บังคับที่ harness จุดเดียว

**Consequences:**
- ✅ Positive: สั่งด้วยภาษาไทยได้ ไม่ต้องจำคำสั่ง
- ❌ Negative: pi ต้องอ่าน decision-log ก่อนทุกครั้ง ไม่งั้นกฎหลุด
- ⚠️ Risk: สั่ง PROD พลาดเสียเงิน/ข้อมูลจริง — ต้องยืนยันกับคนก่อนเสมอ

**Related:**
- [docs/pi-harness.md](./pi-harness.md)
- [docs/autoacct-context.md](./autoacct-context.md)

---

## 2026-09-13: pr-review skill + CDE batch semantics

**Status:** Accepted

**Context:**
Eval of the new `pr-review` skill (with-skill vs baseline, 3 cases) surfaced real defects: dedup remembered needs-review/error files, fallback chain untested, Buddhist-year ISO slipped through.

**Decision:**
Remember hashes on pass only; extract testable `buildChain()`; normalize Buddhist-year ISO. Suite now 9/9. Skill reviewers must also run file-level checks (newline/refs/secrets) — baseline beat the team there.

**Related:**
- `.pi/skills/pr-review/`

---

## 2026-09-13: Harden slice from scout lessons + CDE stress

**Status:** Accepted

**Context:**
Old-system scout found single-provider OCR, Thai-incompatible scorer, no dedup. Pre-push review (CDE stress pass) found real holes (unvalidated ISO dates, `:free` fallback in PROD, regex dedup store).

**Decision:**
Thai date normalize with round-trip check; OCR fallback chain that refuses `:free` in PROD with AggregateError; sha256 dedup via parsed audit log. Suite now 8/8.

**Related:**
- `workspace/AGENTS.md` (run/gotchas)

---

## 2026-09-12: Express = Dhanakom desktop, mock :9000 is placeholder

**Status:** Accepted

**Context:**
"Express" meant three things at once: Dhanakom desktop (firm's real books), a fictional API mock on port 9000 in AutoAcct's backend, and Express.js itself.

**Decision:**
Target is Dhanakom desktop (confirmed by owner). The :9000 mock is a placeholder, not a contract. E5 must bridge AutoAcct → Dhanakom via whatever import the program really accepts (file-based most likely — #3 spike decides). Cookbook's role is recipe/validation harness + spare `IOcrAdapter` implementations for the AutoAcct backend, not a parallel pipeline.

**Related:**
- [Ticket #23 (E9: cookbook as validator/adapter)](https://github.com/Waytid-way/claude-autoacct-cookbook/issues/23)
- [Ticket #15 (E5)](https://github.com/Waytid-way/claude-autoacct-cookbook/issues/15)
- [Ticket #3 (spike)](https://github.com/Waytid-way/claude-autoacct-cookbook/issues/3)

---

## 2026-09-12: OpenRouter Free Vision for DEV (แทน OCR)

**Status:** Accepted

**Context:**
แทนที่จะใช้ OCR เดิม ต้องการใช้ AI model ที่มี Vision และราคาถูก เจอจาก `https://pi.dev/models` ว่ามีรุ่นฟรีบน OpenRouter 21 ตัว (Vision 11 + Text 10)

**Decision:**
- DEV/test ให้ใช้ OpenRouter `:free` Vision ก่อน โดยเริ่มที่ `google/gemma-4-26b-a4b-it:free` เทียบกับ `ling-3.0-flash-vl:free` และ `inkling:free`
- PROD ใช้ตัวเสียเงินถูกเป็นหลัก (`gemini-2.5-flash-lite` $0.10/$0.40) + fallback ถูกสุด (`qwen3.7-flash` $0.03) ไม่ใช้ของฟรีตรงใน PROD
- ข้อยกเว้น privacy: ใบเสร็จ/ข้อมูลลูกค้าจริงห้ามผ่าน `:free` ทุกกรณี (ดู K1 #19) — ข้อนี้เหนือความประหยัด
- เก็บรายการทั้งหมดใน [docs/openrouter-vision-free.md](./openrouter-vision-free.md)

**Rationale:**
- ของฟรีเหมาะทดลอง/วัดคุณภาพภาษาไทยก่อนเสียเงิน
- Gemini Flash-Lite แม่นไทยสุดในกลุ่มถูก (~฿0.005–0.008/ใบ) ถูกกว่า Claude 20–70x
- Qwen3.7 Flash ถูกสุด (~฿0.002/ใบ) เหมาะเป็น fallback

Alternatives considered:
- ❌ ฟรีใน PROD → rate limit + รุ่นหายได้ + เสี่ยงข้อมูลลูกค้า
- ❌ OCR เดิมอย่างเดียว → แม่นน้อยกว่า Vision model
- ✅ ฟรี(DEV) + ถูก(PROD) → ทดลองฟรี ใช้จริงคุมต้นทุนได้

**Consequences:**
- ✅ Positive: ทดลองฟรี ไม่เสียเงินช่วงวัดคุณภาพ
- ✅ Positive: PROD ต้นทุน/ใบต่ำลงมาก
- ❌ Negative: ต้องมี retry + fallback เพราะโควต้าฟรีไม่แน่นอน
- ⚠️ Risk: รุ่น `:free` เปลี่ยน/หายได้ — ต้องปัก model ใน config + log ทุกรอบ

**Related:**
- [docs/openrouter-vision-free.md](./openrouter-vision-free.md)
- [Recipe: Receipt Extraction](../recipes/03-vision-ocr/receipt-extraction/)
- [Recipe: Groq Fallback](../recipes/03-vision-ocr/groq-fallback/)

---

## 2026-01-22: Dual Mode Architecture (DEV/PROD)

**Status:** Accepted

**Context:**
Developing and testing Claude integrations requires frequent API calls, which:
- Costs money during development
- Slows down iteration (network latency)
- Makes debugging harder (can't inspect external API responses easily)
- Blocks development when APIs are down

**Decision:**
Implement a dual-mode architecture where every adapter supports both DEV (mock) and PROD (real) implementations, controlled by an `APP_MODE` environment variable.

**Rationale:**
- **Faster Development:** Mock responses are instant and free
- **Better Testing:** Deterministic responses make tests reliable
- **Cost Control:** Developers don't accidentally rack up API bills
- **Observability:** DEV mode includes verbose logging for learning

Alternatives considered:
- ❌ Always use real APIs → Too expensive and slow
- ❌ Separate test and prod codebases → Maintenance nightmare
- ❌ VCR/Cassette recording → Complex setup, stale recordings

**Consequences:**
- ✅ Positive: Fast, free local development
- ✅ Positive: New developers can run the entire stack without API keys
- ❌ Negative: More code to maintain (2x adapters)
- ⚠️ Risk: Mocks diverge from real API behavior over time

**Mitigation:**
- Keep mocks simple (minimal logic)
- Add integration tests that run against real APIs in CI
- Document API response schemas

**Related:**
- [Recipe: Dual Mode Setup](../recipes/01-getting-started/dual-mode-setup.md)
- [Recipe: Adapter Pattern](../recipes/02-foundations/adapter-pattern/)

---

## 2026-01-22: Claude as Primary OCR, Groq as Fallback

**Status:** Accepted

**Context:**
AutoAcct needs reliable OCR for Thai receipts. Current options:
- **Groq:** Currently in use, fast but less accurate (~70% for Thai)
- **Claude Vision:** More accurate (~90%+ for Thai) but more expensive
- **PaddleOCR:** Free, self-hosted, but requires maintenance

**Decision:**
Use Claude Vision API as the primary OCR provider, with Groq as a fallback for:
- Cost-sensitive operations (low-value receipts)
- When Claude API is unavailable
- Batch processing where speed > accuracy

**Rationale:**
- **Accuracy:** Claude excels at structured extraction from images
- **Thai Language:** Claude handles Thai text better than Groq
- **JSON Mode:** Claude natively supports structured output
- **Cost Justification:** Better accuracy = less manual verification time

Alternatives considered:
- ❌ Groq only → Accuracy too low (requires too much manual verification)
- ❌ PaddleOCR only → Maintenance burden, still needs tuning for Thai
- ✅ Hybrid approach → Best of both worlds

**Consequences:**
- ✅ Positive: Higher OCR accuracy reduces manual work
- ✅ Positive: Fallback ensures resilience
- ❌ Negative: Higher API costs (~$0.03 per receipt vs $0.005 for Groq)
- ⚠️ Risk: Over-reliance on Anthropic's service availability

**Cost Analysis:**
```
Scenario: 1,000 receipts/month
- Claude only: $30/month
- Groq only: $5/month
- Hybrid (80% Claude): $24/month
- Manual verification saved: ~10 hours/month × $20/hour = $200

ROI: $200 - $24 = $176 saved per month
```

**Related:**
- [Recipe: Receipt Extraction with Claude](../recipes/03-vision-ocr/receipt-extraction.ipynb)
- [Recipe: Fallback Strategy](../recipes/03-vision-ocr/fallback-strategy.ipynb)

---

## 2026-01-22: Adapter Pattern for All External Integrations

**Status:** Accepted

**Context:**
AutoAcct integrates with multiple external services:
- Claude API (OCR)
- Groq API (fallback OCR)
- Express Accounting API (export)
- Teable API (optional spreadsheet UI)
- MongoDB (database)

Direct coupling to these services makes:
- Testing difficult (requires real credentials)
- Swapping providers hard (tightly coupled code)
- Local development painful (need all services running)

**Decision:**
Wrap every external integration in an Adapter interface:

```typescript
interface ClaudeAdapter {
  extractReceiptFromImage(params): Promise<ReceiptOcrResult>;
}

function createClaudeAdapter(config: AppConfig): ClaudeAdapter {
  return isDev(config) ? new MockClaudeAdapter() : new RealClaudeAdapter();
}
```

**Rationale:**
- **Testability:** Easy to inject mocks in tests
- **Flexibility:** Swap implementations without changing business logic
- **Dependency Inversion:** High-level code doesn't depend on API details

Alternatives considered:
- ❌ Direct API calls → Hard to test, tightly coupled
- ❌ Generic HTTP client wrapper → Too low-level, loses type safety
- ✅ Adapter pattern → Clean separation, type-safe, swappable

**Consequences:**
- ✅ Positive: Business logic is independent of external APIs
- ✅ Positive: Can switch from Claude to GPT-4V with minimal changes
- ❌ Negative: More boilerplate code
- ❌ Negative: Learning curve for new developers

**Related:**
- [Recipe: Adapter Pattern](../recipes/02-foundations/adapter-pattern/)
- [Code: ClaudeAdapter](../recipes/03-vision-ocr/claudeAdapter.ts)

---

## 2026-01-22: Satang as Internal Currency Unit

**Status:** Accepted

**Context:**
Financial calculations in JavaScript suffer from floating-point precision errors:
```javascript
0.1 + 0.2 === 0.30000000000000004  // true (not 0.3!)
```

This causes issues in accounting where precision is critical.

**Decision:**
Store all monetary amounts as **integers in Satang** (1 Baht = 100 Satang), never as floating-point Baht.

**Rationale:**
- **Precision:** Integer arithmetic is exact
- **Standards:** Thai banking systems use Satang internally
- **Performance:** Integer math is faster than float
- **Compatibility:** MongoDB handles 64-bit integers natively

Alternatives considered:
- ❌ Decimal.js / BigNumber.js → Adds dependency, slower
- ❌ Fixed-point libraries → Overkill for this use case
- ❌ Floating-point with rounding → Still prone to accumulation errors
- ✅ Integer Satang → Simple, fast, standard

**Consequences:**
- ✅ Positive: No rounding errors
- ✅ Positive: Matches Thai banking standards
- ❌ Negative: Requires conversion when displaying to users
- ⚠️ Risk: Developers might forget to convert (must enforce via types)

**Implementation:**
```typescript
type Satang = number & { __brand: 'Satang' };  // Branded type
type Baht = number;  // Regular number

function bahtToSatang(baht: Baht): Satang {
  return Math.round(baht * 100) as Satang;
}

function satangToBaht(satang: Satang): Baht {
  return satang / 100;
}
```

**Related:**
- [AutoAcct Context: Amount Handling](./autoacct-context.md#amount-handling)

---

## Template for Future Decisions

```markdown
## YYYY-MM-DD: Decision Title

**Status:** Proposed

**Context:**
[Describe the situation]

**Decision:**
[What are we deciding?]

**Rationale:**
[Why this choice?]

**Consequences:**
- ✅ Positive:
- ❌ Negative:
- ⚠️ Risk:

**Related:**
- [Links]
```

---

*This log is maintained by the AutoAcct team. Add new decisions at the top (reverse chronological).*