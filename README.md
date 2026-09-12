# 🍳 Claude AutoAcct Cookbook

> **Practical recipes for integrating Claude AI with AutoAcct** - รวบรวม code พร้อมใช้งานจริงสำหรับ Auto Accounting Project
>
> **2026-09: `workspace/` รันได้จริงแล้ว** — pipeline ใบเดียวจบ (inbox → OCR → gate → outbox/needs-review) ด้วย pi เป็น harness ดู `AGENTS.md`

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-26-green)](https://nodejs.org/)

---

## 🎯 What is This?

**AutoAcct** = Automated accounting system for Thai accountants (OCR → Double-entry → Export to Express Accounting)

**This Cookbook** = Ready-to-use code recipes showing how to use Claude AI for:
- 📸 Receipt OCR (Thai text extraction)
- 💰 Cost optimization (Hybrid Groq + Claude)
- 🧠 Transaction classification
- ⚖️ Account code mapping
- 🔄 Data transformation
- ✅ Quality validation

**`workspace/`** = Running pipeline slice (not a recipe): one receipt in, journal file out, bad receipts to `needs-review/` with reasons.

---

## 📖 Table of Contents

### 🌟 Featured Recipes

1. **[Receipt OCR with Claude Vision](./recipes/03-vision-ocr/receipt-extraction/)** ⭐
   - Extract amount, VAT, vendor, date from Thai receipts
   - 90-95% accuracy on Thai text
   - DEV (mock) + PROD (real API) modes
   - **✅ Complete with tests!**
   - **[⚡ Quick Integration](./recipes/03-vision-ocr/receipt-extraction/INTEGRATE_QUICK.md)** (5 min)

2. **[Groq OCR Fallback & Hybrid Strategy](./recipes/03-vision-ocr/groq-fallback/)** 🆕
   - **Save 70% on OCR costs** (฿0.15 vs ฿0.50/receipt)
   - Auto-route simple receipts to cheap Groq
   - Complex receipts still use Claude
   - Automatic fallback on failures
   - **✅ Complete with metrics!**
   - **[⚡ Quick Start](./recipes/03-vision-ocr/groq-fallback/QUICKSTART.md)** (5 min)

### 📁 Recipe Categories

#### 01. Getting Started
- [ ] Introduction to Claude API
- [ ] Authentication & Setup
- [ ] Best Practices

#### 02. Foundations
- [ ] Config Management (Dual Mode)
- [ ] Adapter Pattern
- [ ] Error Handling
- [ ] Logging & Tracing

#### 03. Vision & OCR
- [x] **Receipt Extraction** (Complete!) 🎉
- [x] **Groq Fallback & Hybrid Strategy** (Complete!) 🎉
- [ ] Quality Validation
- [ ] Batch Processing

#### 04. Tool Use
- [ ] Multi-step Workflows
- [ ] Express Export Integration
- [ ] Account Code Mapping

#### 05. Reliability
- [ ] Retry Logic (Exponential Backoff)
- [ ] Circuit Breakers
- [ ] Rate Limiting

#### 06. Testing
- [ ] Unit Tests
- [ ] Integration Tests
- [ ] Mock Strategies

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- Claude API key from [console.anthropic.com](https://console.anthropic.com)
- (Optional) Groq API key from [console.groq.com](https://console.groq.com)
- (Optional) AutoAcct backend project

### Run the Pipeline Slice

```bash
cd workspace && cp sample/receipt-001.jpg inbox/
APP_MODE=DEV node src/runner.ts   # mock, free
APP_MODE=PROD node src/runner.ts  # real OCR (paid default, needs key)
npm test                           # 6/6 green
```

Outbox = ready files · `needs-review/` = rejected with reasons · `audit.log.jsonl` = trace. Details: [`workspace/AGENTS.md`](./workspace/AGENTS.md).

### Try a Recipe (Standalone)

```bash
# Clone this cookbook
git clone https://github.com/Waytid-way/claude-autoacct-cookbook.git
cd claude-autoacct-cookbook

# Try the Receipt OCR recipe
cd recipes/03-vision-ocr/receipt-extraction
bun install

# DEV mode (no API key needed)
APP_MODE=DEV bun run example.ts

# PROD mode (real Claude API)
cp .env.example .env
# Edit .env: Add your CLAUDE_API_KEY
APP_MODE=PROD bun run example.ts
```

### Try the Hybrid Strategy (Cost Optimization)

```bash
# Cost-optimized OCR with Groq fallback
cd recipes/03-vision-ocr/groq-fallback
bun install

# Run demo (DEV mode - free)
bun run example:dev

# See cost savings in action!
```

### Integrate with AutoAcct Project

```bash
# Recipe 1: Basic OCR (5 min)
cat recipes/03-vision-ocr/receipt-extraction/INTEGRATE_QUICK.md

# Recipe 2: Hybrid Strategy (10 min)
cat recipes/03-vision-ocr/groq-fallback/INTEGRATION.md
```

---

## 📚 Documentation

### Core Documents

- **[CONTEXT](./CONTEXT.md)** - Ubiquitous language (wins on conflicts)
- **[Decision Log](./docs/decision-log.md)** - Architectural decisions
- **[Blueprints](./docs/blueprints/)** - Long-term direction (conceptual + Phase 0 knowledge architecture, not MVP scope)
- **[AutoAcct Context](./docs/autoacct-context.md)** - Business requirements, pain points, success criteria
- **[OpenRouter Vision Free](./docs/openrouter-vision-free.md)** - 11 vision ฟรี + วิธีใช้แทน OCR (2026-09-12)
- **[Pi as Harness](./docs/pi-harness.md)** - pi สั่งงาน AutoAcct ผ่าน cookbook นี้
- **[Vision Benchmark](./docs/vision-benchmark.md)** - ผลเทียบรุ่นฟรีบนใบเสร็จไทย (2026-09-12)
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute

### External References

- [Claude API Docs](https://docs.anthropic.com/claude/reference)
- [Claude Vision Guide](https://docs.anthropic.com/claude/docs/vision)
- [Groq API Docs](https://console.groq.com/docs)
- [Anthropic Prompt Library](https://docs.anthropic.com/claude/page/prompts)
- [AutoAcct Main Project](https://github.com/Waytid-way/AutoAcct) (coming soon)

---

## 💡 Philosophy

### 1. Production-Ready Code

❌ **Not this:**
```typescript
const result = await claude.ask("Extract receipt data");
```

✅ **This:**
```typescript
const adapter = OcrAdapterFactory.create(); // Mock or Real
const result = await adapter.extractReceipt({
  imageBase64,
  correlationId,
});
// + Error handling
// + Logging
// + Validation
// + Tests
// + Metrics
```

### 2. Dual Mode Always

Every recipe supports:
- **DEV mode:** Mock data, instant, free, deterministic
- **PROD mode:** Real Claude API, paid, variable latency

Switch via config:
```typescript
APP_MODE=dev  // Uses MockAdapter
APP_MODE=prod // Uses ClaudeAdapter
```

### 3. Cost Optimization

Don't just use the most expensive API for everything:
- **Simple tasks** → Groq (฿0.05/request)
- **Complex tasks** → Claude (฿0.50/request)
- **Hybrid** → Auto-route based on complexity (฿0.15/request average)

### 4. Thai Business Context

All recipes are optimized for:
- 🇹🇭 Thai language (receipts, invoices)
- 💰 Thai accounting rules (VAT 7%, Chart of Accounts)
- 🏢 Thai accounting firms (Express Accounting integration)

---

## 🧱 Recipe Structure

Each recipe follows this pattern:

```
recipes/XX-category/recipe-name/
├── README.md              # What, Why, When, How
├── QUICKSTART.md          # Get running in 5 minutes
├── INTEGRATION.md         # Integrate with main project
├── code.ts                # Main implementation
├── types.ts               # TypeScript types
├── test.ts                # Unit tests
├── example.ts             # Runnable example
├── .env.example           # Config template
└── package.json           # Dependencies
```

---

## 🔥 Featured Recipes

### Recipe 1: Receipt OCR with Claude Vision ⭐

**What It Does:**
Extracts structured data from Thai receipt images with 90-95% accuracy.

**Input:** JPEG/PNG image  
**Output:** JSON
```json
{
  "amountSatang": 35000,
  "vatAmountSatang": 2280,
  "vendorName": "ร้านกาแฟดี",
  "issueDate": "2026-01-22",
  "confidence": 0.96
}
```

**ROI:**
- Manual entry: 100 receipts × 3 min = 5 hours (฿1,500/month)
- With Claude: 100 receipts × 3 sec = 5 min (฿50/month)
- **Savings: 93% (฿1,450/month)**

➡️ **[Try it now](./recipes/03-vision-ocr/receipt-extraction/QUICKSTART.md)**

---

### Recipe 2: Groq Fallback & Hybrid Strategy 🆕

**What It Does:**
Reduces OCR cost by 70% by routing simple receipts to cheap Groq, complex ones to Claude.

**Architecture:**
```
Receipt → Classifier → Simple (80%) → Groq (฿0.05)
                    └─ Complex (20%) → Claude (฿0.50)
```

**Cost Comparison (100 receipts):**

| Strategy | Cost | Savings |
|----------|------|----------|
| Claude only | ฿50 | - |
| **Hybrid** | **฿16** | **฿34 (68%)** |
| Groq only | ฿5 | ฿45 (but 25% error rate!) |

**ROI at Scale:**
- 1,000 receipts/month: Save ฿340/month
- 5,000 receipts/month: Save ฿1,700/month

➡️ **[Try it now](./recipes/03-vision-ocr/groq-fallback/QUICKSTART.md)**

---

## 🧪 Testing

All recipes include tests:

```bash
# DEV mode tests (mock, instant, free)
bun test --env APP_MODE=dev

# PROD mode tests (real API, requires key)
CLAUDE_API_KEY=sk-xxx bun test --env APP_MODE=prod
```

---

## 👥 Contributing

We welcome contributions!

### Adding a Recipe

1. Fork this repo
2. Implement your recipe
3. Write tests
4. Submit PR

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### Recipe Ideas

- [ ] PaddleOCR Integration (offline OCR)
- [ ] Account Code Classifier
- [ ] Expense Category Predictor
- [ ] Multi-receipt Batch Processor
- [ ] Express API Export Module
- [ ] VAT Validator
- [ ] Retry Logic with Exponential Backoff

---

## 📊 Status

| Category | Recipes | Status |
|----------|---------|--------|
| Getting Started | 0/3 | 🔴 Not started |
| Foundations | 0/4 | 🔴 Not started |
| **Vision & OCR** | **2/4** | 🟡 **In progress** |
| **Workspace slice** | **done** | 🟢 **Runs (DEV+PROD)** |
| Tool Use | 0/3 | 🔴 Not started |
| Reliability | 0/3 | 🔴 Not started |
| Testing | 0/3 | 🔴 Not started |

**Total:** 2/20 recipes complete (10%) + workspace slice runs end to end

---

## 📝 Roadmap

### Phase 1: Core Recipes 🟢
- [x] Receipt OCR with Claude Vision
- [x] Groq Fallback & Hybrid Strategy
- [x] Workspace slice (OCR→gate→outbox, DEV+PROD) — validation gate + sequential batch loop included
- [ ] Express Export Module (blocked: #3 spike, see epic #11)
- [ ] Benchmark 20–50 ใบจริง (#14) + KB ลูกค้า A (#19→#21)

### Phase 2: Integration Recipes
- [ ] Express Export Module
- [ ] Retry Logic with Backoff
- [ ] Account Code Mapping
- [ ] PaddleOCR Integration

### Phase 3: Advanced Recipes
- [ ] Circuit Breaker Pattern
- [ ] Cost Optimization (ML-based)
- [ ] Performance Monitoring
- [ ] E2E Testing

---

## 🔗 Related Projects

- **[AutoAcct Main](https://github.com/Waytid-way/AutoAcct)** - Full accounting automation system
- **[Groq Cookbook](https://github.com/groq/groq-api-cookbook)** - Groq AI recipes
- **[Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook)** - Official Claude recipes

---

## ❓ FAQ

### Q: ใช้ Cookbook นี้ต้องมี AutoAcct project หรือเปล่า?

**A:** ไม่จำเป็น! Recipes เป็น standalone code ที่รันได้เลย หรือจะ copy ไปใช้ใน project ของคุณก็ได้

### Q: เสียเงินแค่ไหนในการเรียก API?

**A:** ขึ้นกับ strategy:
- **DEV mode:** ไม่เสียเลย (ใช้ mock)
- **Claude only:** ~฿0.50/receipt
- **Hybrid:** ~฿0.15/receipt (70% savings!)
- **Groq only:** ~฿0.05/receipt (but lower accuracy)

### Q: รองรับภาษาไทยไหม?

**A:** ใญ่! Claude 3.5 Sonnet แม่นยำ 90-95% สำหรับใบเสร็จไทย

### Q: Hybrid strategy ช่วยประหยัดเงินจริงหรือเปล่า?

**A:** ใช่! ประหยัด 68-70% จริง ๆ และเกิด auto-fallback เวลา Groq ล้ม

---

## 💬 Support

- **Issues:** [GitHub Issues](https://github.com/Waytid-way/claude-autoacct-cookbook/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Waytid-way/claude-autoacct-cookbook/discussions)
- **Email:** [Your email]

---

## 📜 License

MIT (no LICENSE file in repo yet — see issue tracker if you need one).

---

## 🚀 Get Started

```bash
# 1. Clone
git clone https://github.com/Waytid-way/claude-autoacct-cookbook.git

# 2. Try Recipe 1: Basic OCR
cd recipes/03-vision-ocr/receipt-extraction
bun install && bun run example:dev

# 3. Try Recipe 2: Hybrid Strategy (Cost Optimization)
cd ../groq-fallback
bun install && bun run example:dev

# 4. See the cost savings!
```

**🎉 Happy Coding!**

---

<div align="center">
  <sub>Built with ❤️ by the AutoAcct team</sub>
</div>
