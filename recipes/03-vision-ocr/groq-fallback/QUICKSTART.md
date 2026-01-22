# ⚡ Quick Start: Groq OCR Fallback

> Get the hybrid OCR strategy running in 5 minutes

---

## Step 1: Install (1 min)

```bash
cd recipes/03-vision-ocr/groq-fallback
bun install
```

---

## Step 2: Configure (1 min)

```bash
# Copy env template
cp .env.example .env

# Edit .env:
APP_MODE=DEV  # Use mock adapters
CLAUDE_API_KEY=sk-ant-xxx  # Optional in DEV mode
GROQ_API_KEY=gsk-xxx       # Optional in DEV mode
```

---

## Step 3: Run Demo (1 min)

### DEV Mode (Mock - Free)
```bash
bun run example:dev
```

**Expected output:**
```
🚀 Running Hybrid OCR Strategy Demo
Mode: DEV

📄 Processing receipts...

[Hybrid] Classification: SIMPLE (confidence: 0.92)
[Hybrid] Using Groq for simple receipt
✅ Success: ฿85.60 (VAT: ฿5.60)

[Hybrid] Classification: COMPLEX (confidence: 0.45)
[Hybrid] Using Claude for complex receipt
✅ Success: ฿350.00 (VAT: ฿22.80)

📊 HYBRID OCR METRICS
════════════════════════════════════════════════
Total Receipts:     5
├─ Simple (Groq):   3 (60%)
└─ Complex (Claude): 2 (40%)

Total Cost:         ฿1.15
Avg Cost/Receipt:   ฿0.23
Savings vs Claude:  ฿1.35 (54%)
```

### PROD Mode (Real APIs)
```bash
# Add real API keys to .env
CLAUDE_API_KEY=sk-ant-real-key
GROQ_API_KEY=gsk-real-key

# Run
bun run example:prod
```

---

## Step 4: Run Tests (1 min)

```bash
bun test
```

---

## Step 5: Use in Your Code (1 min)

```typescript
import { HybridOcrStrategy } from './HybridOcrStrategy';
import { GroqTextAdapter } from './GroqTextAdapter';
import { createClaudeAdapter } from '../receipt-extraction/claudeAdapter';

// Setup
const claudeAdapter = createClaudeAdapter({ MODE: 'PROD', CLAUDE_API_KEY: 'xxx' });
const groqAdapter = new GroqTextAdapter({ apiKey: 'gsk-xxx' });

const strategy = new HybridOcrStrategy(claudeAdapter, groqAdapter);

// Use
const result = await strategy.extractReceipt({
  imageBase64: receiptImageData,
  correlationId: 'order-123',
});

console.log(`Amount: ฿${result.amountSatang / 100}`);

// Check metrics
strategy.printMetrics();
```

---

## 💰 Cost Comparison

**100 receipts/month:**

| Strategy | Cost | Savings |
|----------|------|----------|
| Claude only | ฿50 | - |
| **Hybrid** | **฿16** | **฿34 (68%)** |
| Groq only | ฿5 | ฿45 (but 25% error rate!) |

---

## 🎯 Next Steps

1. **Tune classification:** Adjust `simpleConfidenceThreshold` in config
2. **Monitor metrics:** Track `groqSuccessRate` and `claudeFallbackRate`
3. **Batch processing:** Process multiple receipts at once
4. **Add PaddleOCR:** Replace mock raw text extraction

---

## 🔧 Configuration Options

```typescript
const strategy = new HybridOcrStrategy(
  claudeAdapter,
  groqAdapter,
  {
    simpleConfidenceThreshold: 0.85,  // Min confidence for Groq
    enableFallback: true,              // Groq fail → Claude
    maxGroqRetries: 1,                 // Retry attempts
    enableMetrics: true,               // Track costs/accuracy
  }
);
```

---

## 🐛 Troubleshooting

### Groq success rate too low (<70%)
- Lower `simpleConfidenceThreshold` (route less to Groq)
- Improve SimpleReceiptDetector heuristics
- Check if receipts are actually simple

### High manual review rate (>20%)
- Increase confidence thresholds
- Add better quality checks
- Use Claude for more receipts

### No cost savings
- Most receipts may be complex
- Check classification accuracy
- Review SimpleReceiptDetector logic

---

**🎉 You're ready! Process receipts at 1/3 the cost!**
