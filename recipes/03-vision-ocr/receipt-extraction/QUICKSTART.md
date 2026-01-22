# 🚀 Quick Start: Receipt OCR with Claude

**Goal:** Extract data from a Thai receipt image in under 5 minutes.

---

## Prerequisites

- [Bun](https://bun.sh) installed (`curl -fsSL https://bun.sh/install | bash`)
- (Optional) Claude API key from [console.anthropic.com](https://console.anthropic.com/)

---

## Step 1: Install Dependencies

```bash
cd recipes/03-vision-ocr/receipt-extraction
bun install
```

---

## Step 2: Choose Your Mode

### Option A: DEV Mode (No API Key Needed) ✅

**Best for:** Learning, testing business logic, development

```bash
# Copy env file
cp .env.example .env

# Edit .env to set:
# APP_MODE=DEV

# Run example
bun run example:dev
```

**Output:** Instant mock data (free, deterministic)

```json
{
  "amountSatang": 35000,
  "vatAmountSatang": 2280,
  "vendorName": "ร้านกาแฟดี (Mock Cafe)",
  "issueDate": "2026-01-22",
  "confidence": 0.95
}
```

### Option B: PROD Mode (Real OCR) 🔥

**Best for:** Production use, real receipt processing

```bash
# Get API key from https://console.anthropic.com/settings/keys

# Edit .env:
# APP_MODE=PROD
# CLAUDE_API_KEY=sk-ant-api03-xxxxx

# Add a receipt image (see example-receipt.jpg.md)

# Run example
bun run example:prod
```

**Cost:** ~฿0.50 per receipt

---

## Step 3: Run Tests

### DEV Mode Tests (Free)

```bash
bun run test:dev
```

**Output:**
```
✅ ClaudeAdapter - DEV Mode
  ✅ should return mock data
  ✅ should return consistent data
  ✅ should include line items
  ✅ should simulate latency
```

### PROD Mode Tests (Requires API Key)

```bash
CLAUDE_API_KEY=sk-xxx bun run test:prod
```

---

## Step 4: Use in Your Code

```typescript
import { createClaudeAdapter } from './claudeAdapter';
import { readFileSync } from 'fs';

// Config
const config = {
  MODE: 'PROD',  // or 'DEV'
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
  LOG_LEVEL: 'info',
};

// Create adapter
const adapter = createClaudeAdapter(config);

// Load receipt image
const imageBuffer = readFileSync('receipt.jpg');
const imageBase64 = imageBuffer.toString('base64');

// Extract data
const result = await adapter.extractReceiptFromImage({
  correlationId: 'order-12345',
  imageBase64,
});

console.log(`Total: ฿${result.amountSatang / 100}`);
console.log(`VAT: ฿${result.vatAmountSatang! / 100}`);
console.log(`Vendor: ${result.vendorName}`);
```

---

## Step 5: Validate Results

### Manual Review Queue

If confidence < 95% or VAT is missing, flag for review:

```typescript
const needsReview = 
  (result.confidence || 0) < 0.95 || 
  result.vatAmountSatang === null;

if (needsReview) {
  await queueForManualReview(result);
} else {
  await exportToExpress(result);
}
```

### Accuracy Targets

| Field | Target | Action if Below |
|-------|--------|----------------|
| VAT | 100% | 🔴 Manual review |
| Amount | >95% | 🔴 Manual review |
| Date | >90% | 🟡 Auto-fix or review |
| Vendor | >80% | 🟢 Auto-approve |

---

## Troubleshooting

### Issue: "CLAUDE_API_KEY is required"

**Solution:** Either:
1. Set `APP_MODE=DEV` in `.env` (no API key needed)
2. Get API key from https://console.anthropic.com/settings/keys

### Issue: "Failed to load image"

**Solution:**
1. Check file path is correct
2. Check file format (JPEG, PNG, GIF, WebP supported)
3. Check file size < 5MB

### Issue: "Claude returned invalid JSON"

**Solution:**
1. Check image quality (not too blurry/dark)
2. Try a different receipt (simpler format)
3. Check API response in logs (set `LOG_LEVEL=debug`)

### Issue: Low accuracy (<80%)

**Common causes:**
- Handwritten receipts (try PaddleOCR instead)
- Very faded thermal paper
- Poor photo quality (dark, blurry, angled)
- Non-standard receipt format

**Solutions:**
1. Retake photo with better lighting
2. Use scanner instead of phone camera
3. Fall back to manual entry

---

## Next Steps

1. **Integrate with Express Accounting**
   - See: `recipes/04-tool-use/express-export/`

2. **Add Retry Logic**
   - See: `recipes/05-reliability/retry-backoff/`

3. **Batch Processing**
   - See: `recipes/04-tool-use/multi-step-workflow/`

4. **Add Fallback OCR (Groq)**
   - See: `recipes/03-vision-ocr/fallback-strategy/`

---

## Cost Optimization

### Hybrid Strategy (Best ROI)

```typescript
// Use Groq for simple receipts, Claude for complex ones
const isSimpleReceipt = detectSimpleReceipt(image);

const adapter = isSimpleReceipt 
  ? createGroqAdapter(config)   // ฿0.05/receipt
  : createClaudeAdapter(config); // ฿0.50/receipt
```

**Savings:** 80% simple + 20% complex = **฿0.14/receipt average**

---

## Questions?

Check:
- [README.md](./README.md) - Full documentation
- [AutoAcct Context](../../../docs/autoacct-context.md) - Business requirements
- [Claude Vision Docs](https://docs.anthropic.com/claude/docs/vision) - API reference
