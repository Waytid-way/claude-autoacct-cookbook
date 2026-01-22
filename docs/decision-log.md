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