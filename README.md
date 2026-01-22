# Claude-AutoAcct Cookbook

> Production-ready recipes for integrating **Claude AI** with the **AutoAcct** OCR auto-accounting stack (Bun + MongoDB + OCR + Groq + Express Export).

<p align="center">
  <a href="#goals">Goals</a> •
  <a href="#structure">Structure</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#recipes">Recipes</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## 🎯 Goals

This cookbook serves three purposes:

1. **Learning Resource** 📚
   - Learn Claude API best practices (Vision, Tool Use, Prompt Engineering)
   - Understand trade-offs (Claude vs Groq, cost optimization, accuracy)
   - Master production patterns (retry logic, error handling, observability)

2. **Living Documentation** 📝
   - Document AutoAcct domain knowledge and business context
   - Track architectural decisions and their reasoning
   - Build institutional knowledge as the project evolves

3. **Copy-Paste Ready Code** 💻
   - Every recipe includes working code examples
   - Support **Dual Mode**: `DEV/DEBUG` (mock) and `PRODUCTION` (real APIs)
   - Modular "Lego blocks" architecture for easy integration

---

## 📁 Structure

```
claude-autoacct-cookbook/
├── README.md                          # You are here
├── CONTRIBUTING.md                    # Contribution guidelines
│
├── docs/
│   ├── autoacct-context.md           # ⭐ AutoAcct domain knowledge
│   ├── decision-log.md                # Architecture decisions
│   ├── glossary.md                    # Domain terminology
│   └── learning-path.md               # Recommended learning sequence
│
├── recipes/
│   ├── 01-getting-started/           # Setup & fundamentals
│   ├── 02-foundations/               # Config, logging, adapters
│   ├── 03-vision-ocr/                # Receipt/invoice OCR
│   ├── 04-tool-use/                  # Express export, Teable CRUD
│   ├── 05-reliability/               # Retry, circuit breaker, audit
│   ├── 06-testing/                   # Unit, integration, E2E tests
│   └── 07-scenarios/                 # Real-world end-to-end flows
│
├── mock-servers/                     # Mock APIs for local testing
│   ├── express-mock/
│   └── teable-mock/
│
└── templates/                        # Reusable prompt templates
    ├── receipt-ocr-prompt.txt
    └── journal-entry-prompt.txt
```

---

## 🚀 Getting Started

### Prerequisites

- **Runtime:** Node.js 18+ or [Bun](https://bun.sh) 1.0+
- **Python:** 3.10+ (for OCR workers / demo scripts)
- **API Keys:**
  - [Claude API key](https://console.anthropic.com) (free tier available)
  - [Groq API key](https://console.groq.com) (optional, for fallback OCR)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Waytid-way/claude-autoacct-cookbook.git
   cd claude-autoacct-cookbook
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Choose your learning path**
   - New to Claude? Start with [01-getting-started](./recipes/01-getting-started/)
   - Want OCR? Jump to [03-vision-ocr](./recipes/03-vision-ocr/)
   - Need production patterns? See [05-reliability](./recipes/05-reliability/)

---

## 📚 Recipes

### 01. Getting Started
- [Quickstart: Your First Claude Call](./recipes/01-getting-started/quickstart.md)
- [Dual Mode Setup](./recipes/01-getting-started/dual-mode-setup.md)
- [Chat History Management](./recipes/01-getting-started/chat-history.md)

### 02. Foundations
- [Config Management](./recipes/02-foundations/config-management/)
- [Structured Logging](./recipes/02-foundations/logging/)
- [Adapter Pattern](./recipes/02-foundations/adapter-pattern/)

### 03. Vision OCR
- [Receipt Extraction](./recipes/03-vision-ocr/receipt-extraction.ipynb) ⭐
- [Invoice Parsing](./recipes/03-vision-ocr/invoice-parsing.ipynb)
- [Quality Check & Validation](./recipes/03-vision-ocr/quality-check.ipynb)
- [Fallback Strategy (Claude → Groq)](./recipes/03-vision-ocr/fallback-strategy.ipynb)

### 04. Tool Use (Function Calling)
- [Express Accounting Export](./recipes/04-tool-use/express-export.ipynb)
- [Teable CRUD Operations](./recipes/04-tool-use/teable-crud.ipynb)
- [Multi-Step Workflow](./recipes/04-tool-use/multi-step-workflow.ipynb)

### 05. Reliability
- [Retry with Exponential Backoff](./recipes/05-reliability/retry-backoff.ipynb)
- [Circuit Breaker Pattern](./recipes/05-reliability/circuit-breaker.ipynb)
- [Audit Trail (ExportLog)](./recipes/05-reliability/audit-trail.ipynb)
- [Error Handling Best Practices](./recipes/05-reliability/error-handling.ipynb)

### 06. Testing
- [Unit Tests with Mock Adapters](./recipes/06-testing/unit-tests/)
- [Integration Tests](./recipes/06-testing/integration-tests/)
- [End-to-End Tests](./recipes/06-testing/e2e-tests/)

### 07. Real-World Scenarios
- [Scenario 1: Receipt OCR → Validation → Export](./recipes/07-scenarios/scenario-1-receipt-ocr.md)
- [Scenario 2: Batch Invoice Processing](./recipes/07-scenarios/scenario-2-batch-invoice.md)
- [Scenario 3: Error Recovery Flow](./recipes/07-scenarios/scenario-3-error-recovery.md)

---

## 🔑 Key Concepts

### Dual Mode Architecture

Every recipe supports two operational modes:

**🟢 DEV Mode** (Development / Testing)
- Uses mock servers and fixed responses
- Verbose logging with full request/response traces
- No charges to external APIs
- Perfect for learning and local development

**🔴 PROD Mode** (Production)
- Connects to real Claude, Express, Groq APIs
- Silent operation (logs only errors and audit trails)
- Includes retry logic, circuit breakers
- Cost-optimized with configurable limits

### Adapter Pattern

All external integrations (Claude, Express, Groq, Database) are wrapped in adapters:

```typescript
export interface ClaudeAdapter {
  extractReceiptFromImage(params: {
    correlationId: string;
    imageBase64: string;
  }): Promise<ReceiptOcrResult>;
}

// Switch implementations based on mode
export function createClaudeAdapter(config: AppConfig): ClaudeAdapter {
  if (isDev(config)) {
    return new MockClaudeAdapter();  // Fixed responses
  }
  return new RealClaudeAdapter();    // Actual API calls
}
```

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Ways to contribute:**
- ✨ Add new recipes or improve existing ones
- 🐛 Report bugs or issues
- 📝 Improve documentation
- 💡 Suggest new features or patterns
- 🌐 Translate recipes to other languages

---

## 📖 Related Resources

### Official Cookbooks
- [Anthropic Claude Cookbooks](https://github.com/anthropics/claude-cookbooks) - Official Claude examples
- [Groq API Cookbook](https://github.com/groq/groq-api-cookbook) - Groq integration patterns
- [OpenAI Cookbook](https://github.com/openai/openai-cookbook) - General LLM patterns

### AutoAcct Project
- [AutoAcct Main Repository](https://github.com/Waytid-way/AutoAcct)
- [AutoAcct Documentation](./docs/autoacct-context.md)

### Claude Documentation
- [Claude API Docs](https://docs.anthropic.com/)
- [Vision API Guide](https://docs.anthropic.com/claude/docs/vision)
- [Tool Use Guide](https://docs.anthropic.com/claude/docs/tool-use)

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

This cookbook is inspired by:
- [Anthropic Claude Cookbooks](https://github.com/anthropics/claude-cookbooks)
- [Groq API Cookbook](https://github.com/groq/groq-api-cookbook)
- [Prompt Engineering Interactive Tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial)

Built with ❤️ for the AutoAcct project.

---

**Ready to cook?** 🧑‍🍳 Start with [Getting Started](./recipes/01-getting-started/) →