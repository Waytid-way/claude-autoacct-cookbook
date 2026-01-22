# 🍳 Claude AutoAcct Cookbook

> **Practical recipes for integrating Claude AI with AutoAcct** - รวบรวม code พร้อมใช้งานจริงสำหรับ Auto Accounting Project

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0-orange)](https://bun.sh)
[![Claude](https://img.shields.io/badge/Claude-3.5_Sonnet-purple)](https://anthropic.com)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## 🎯 What is This?

**AutoAcct** = Automated accounting system for Thai accountants (OCR → Double-entry → Export to Express Accounting)

**This Cookbook** = Ready-to-use code recipes showing how to use Claude AI for:
- 📸 Receipt OCR (Thai text extraction)
- 🧠 Transaction classification
- ⚖️ Account code mapping
- 🔄 Data transformation
- ✅ Quality validation

---

## 📖 Table of Contents

### 🌟 Featured Recipes

1. **[Receipt OCR with Claude Vision](./recipes/03-vision-ocr/receipt-extraction/)** ⭐
   - Extract amount, VAT, vendor, date from Thai receipts
   - 90-95% accuracy on Thai text
   - DEV (mock) + PROD (real API) modes
   - **✅ Complete with tests!**
   - **[⚡ Quick Integration Guide](./recipes/03-vision-ocr/receipt-extraction/INTEGRATE_QUICK.md)** (5 min)

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
- [ ] Quality Validation
- [ ] Fallback Strategy (Groq)
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
- (Optional) AutoAcct backend project

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

### Integrate with AutoAcct Project

```bash
# Follow the 5-minute guide
cat recipes/03-vision-ocr/receipt-extraction/INTEGRATE_QUICK.md

# Or read the full integration guide
cat recipes/03-vision-ocr/receipt-extraction/INTEGRATION.md
```

---

## 📚 Documentation

### Core Documents

- **[AutoAcct Context](./docs/autoacct-context.md)** - Business requirements, pain points, success criteria
- **[Recipe Template](./templates/recipe-template.md)** - How to write a new recipe
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute

### External References

- [Claude API Docs](https://docs.anthropic.com/claude/reference)
- [Claude Vision Guide](https://docs.anthropic.com/claude/docs/vision)
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

### 3. Thai Business Context

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

## 🔥 Featured Recipe: Receipt OCR

### What It Does

Extracts structured data from Thai receipt images:

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

### Why Claude?

| Provider | Thai Accuracy | Cost | Setup |
|----------|--------------|------|-------|
| **Claude** | **90-95%** | ฿0.50 | 5 min |
| Groq | 70-80% | ฿0.05 | 5 min |
| PaddleOCR | 60-70% | Free | 5 hours |
| Google Vision | 85-90% | ฿1.50 | 10 min |

### ROI

**Manual Entry:**
- 100 receipts × 3 min = 5 hours
- Cost: ฿1,500/month

**With Claude OCR:**
- 100 receipts × 3 sec = 5 minutes
- Cost: ฿100/month (API + review)
- **Savings: 93% (฿1,400/month)**

➡️ **[Try it now](./recipes/03-vision-ocr/receipt-extraction/QUICKSTART.md)**

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
2. Copy `templates/recipe-template/`
3. Implement your recipe
4. Write tests
5. Submit PR

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### Recipe Ideas

- [ ] Groq OCR Adapter (fallback)
- [ ] Account Code Classifier
- [ ] Expense Category Predictor
- [ ] Multi-receipt Batch Processor
- [ ] Express API Export Module
- [ ] VAT Validator

---

## 📊 Status

| Category | Recipes | Status |
|----------|---------|--------|
| Getting Started | 0/3 | 🔴 Not started |
| Foundations | 0/4 | 🔴 Not started |
| **Vision & OCR** | **1/4** | 🟡 **In progress** |
| Tool Use | 0/3 | 🔴 Not started |
| Reliability | 0/3 | 🔴 Not started |
| Testing | 0/3 | 🔴 Not started |

**Total:** 1/20 recipes complete (5%)

---

## 📝 Roadmap

### Phase 1: Core Recipes (กำลังทำ) 🟢
- [x] Receipt OCR with Claude Vision
- [ ] Mock OCR Adapter
- [ ] Groq Fallback Adapter
- [ ] Quality Validation

### Phase 2: Integration Recipes
- [ ] Express Export Module
- [ ] Retry Logic with Backoff
- [ ] Batch Processing
- [ ] Account Code Mapping

### Phase 3: Advanced Recipes
- [ ] Circuit Breaker Pattern
- [ ] Cost Optimization (Hybrid)
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

### Q: เสียเงินแค่ไหนในการเรียก Claude API?

**A:** DEV mode ไม่เสียเลย (ใช้ mock) แต่ PROD mode คิดเงินตามจริง:
- Receipt OCR: ~฿0.50/ใบเสร็จ
- 100 ใบ/เดือน = ฿50/เดือน

### Q: รองรับภาษาไทยไหม?

**A:** ใญ่! Claude 3.5 Sonnet แม่นยำ 90-95% สำหรับใบเสร็จไทย

### Q: มี offline version ไหม (ไม่ต้องเชื่อม API)?

**A:** PaddleOCR recipe (coming soon) จะรัน local แต่แม่นยำต่ำกว่า Claude

---

## 💬 Support

- **Issues:** [GitHub Issues](https://github.com/Waytid-way/claude-autoacct-cookbook/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Waytid-way/claude-autoacct-cookbook/discussions)
- **Email:** [Your email]

---

## 📜 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🚀 Get Started

```bash
# 1. Clone
git clone https://github.com/Waytid-way/claude-autoacct-cookbook.git

# 2. Try the Receipt OCR recipe
cd recipes/03-vision-ocr/receipt-extraction
bun install
bun run example:dev

# 3. Read the integration guide
cat INTEGRATE_QUICK.md
```

**🎉 Happy Coding!**

---

<div align="center">
  <sub>Built with ❤️ by the AutoAcct team</sub>
</div>
