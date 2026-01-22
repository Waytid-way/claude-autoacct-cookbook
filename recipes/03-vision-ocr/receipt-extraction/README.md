# Recipe: Receipt OCR with Claude Vision

> 📍 **AutoAcct Context:** Core feature - Extract structured data from Thai receipts/invoices to eliminate manual data entry into Express Accounting.

---

## 📋 Table of Contents

1. [What & Why](#what--why)
2. [Business Context](#business-context)
3. [Implementation](#implementation)
4. [Best Practices](#best-practices)
5. [Trade-offs](#trade-offs)
6. [Code Examples](#code-examples)
7. [Testing](#testing)
8. [Related Recipes](#related-recipes)

---

## 🎯 What & Why

### What

This recipe demonstrates how to use **Claude 3.5 Sonnet's Vision API** to extract structured accounting data from Thai receipt images.

**Input:** JPEG/PNG image of a receipt  
**Output:** JSON with `{ amountSatang, vatSatang, vendorName, issueDate, lineItems }`

### Why Claude over Other OCR?

| Feature | Claude Vision | Groq | PaddleOCR | Google Vision |
|---------|---------------|------|-----------|---------------|
| **Thai Text Accuracy** | 90-95% | 70-80% | 60-70% (needs tuning) | 85-90% |
| **Structured Output** | ✅ Native JSON | ⚠️ Requires parsing | ❌ Raw text only | ⚠️ Requires parsing |
| **VAT Extraction** | ✅ Excellent | ⚠️ Fair | ❌ Poor | ✅ Good |
| **Cost per Receipt** | ~฿0.50 | ~฿0.05 | Free (self-hosted) | ~฿1.50 |
| **Setup Complexity** | ✅ Simple API | ✅ Simple API | ❌ Complex tuning | ✅ Simple API |

**Decision:** Use Claude as **primary**, Groq as **fallback** (for cost-sensitive operations).

### When to Use

✅ **Use Claude Vision when:**
- Receipt contains critical tax data (VAT)
- Image quality is poor (handwritten, faded, angled)
- Mixed Thai/English text
- Need high accuracy (>90%)

⚠️ **Consider Groq fallback when:**
- Low-value receipts (<฿100)
- Batch processing large volumes (cost optimization)
- Simple, printed receipts with clear text

---

## 💼 Business Context

### Problem

Accountants manually key 50-100 receipts per client per month. Each receipt takes 2-5 minutes:
- Read total amount
- Read VAT (critical for tax filing)
- Read vendor name
- Read date
- Type into Express Accounting

**Time cost:** 100 receipts × 3 min = 5 hours/month  
**Labor cost:** 5 hours × ฿300/hour = **฿1,500/month**

### Solution

Claude Vision extracts all data in <3 seconds:
- **Time saved:** 97% (3 min → 5 sec)
- **Cost:** ฿0.50/receipt × 100 = ฿50/month
- **ROI:** ฿1,500 saved - ฿50 spent = **฿1,450 profit/month**

### Requirements

**Accuracy Targets:**
- VAT Amount: **100%** ❗ (tax compliance)
- Total Amount: >95%
- Date: >90%
- Vendor Name: >80%

**If accuracy < 95% on VAT/Amount:** Flag for manual review

---

## 🛠️ Implementation

### Architecture

```
┌─────────────────┐
│  Receipt Image  │
│  (JPEG/PNG)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Base64 Encode  │
└────────┬────────┘
         │
         ▼
    ┌────┴────┐
    │ Mode?   │
    └────┬────┘
         │
    ┌────┴────────────┐
    │                 │
    ▼                 ▼
┌────────┐      ┌──────────┐
│  DEV   │      │   PROD   │
│ (Mock) │      │ (Claude) │
└───┬────┘      └────┬─────┘
    │                │
    └────┬───────────┘
         ▼
┌─────────────────┐
│  ReceiptOcrResult
│  {
│    amountSatang,
│    vatSatang,
│    vendorName,
│    issueDate
│  }
└─────────────────┘
```

### Dual Mode Pattern

**DEV Mode:**
- Returns fixed mock data
- No API calls (instant, free)
- Perfect for testing business logic

**PROD Mode:**
- Calls Claude Vision API
- Real OCR processing
- Includes retry logic and error handling

---

## ✅ Best Practices

### DO ✅

1. **Specify Output Format Upfront**
   ```typescript
   const prompt = `Extract receipt data and return JSON with these exact fields:
   {
     "amount_satang": number,
     "vat_satang": number,
     "vendor_name": string,
     "issue_date": "YYYY-MM-DD"
   }`;
   ```

2. **Request Amounts in Satang**
   - Avoids decimal issues
   - "Convert all Baht amounts to Satang (1 Baht = 100 Satang)"

3. **Ask for Confidence Scores**
   - "Include confidence (0-1) for each field"
   - Use to trigger manual review

4. **Provide Thai Context**
   - "This is a Thai receipt. VAT is typically 7%."
   - "Date format may be Buddhist Era (BE) - convert to CE (Christian Era)"

5. **Handle Missing Data Gracefully**
   ```typescript
   {
     "vat_satang": null,  // Not "N/A" or ""
     "confidence": 0      // Low confidence if missing
   }
   ```

### DON'T ❌

1. **Don't Ask Claude to Calculate**
   - ❌ "Calculate the VAT from the total"
   - ✅ "Extract the VAT amount shown on the receipt"
   - *Reason:* OCR should read, not compute

2. **Don't Mix Concerns**
   - ❌ "Extract data AND validate AND map to account codes"
   - ✅ "Extract data only" → Validate separately → Map separately

3. **Don't Use Vague Instructions**
   - ❌ "Get the important information"
   - ✅ "Extract: amount, VAT, vendor, date in JSON format"

4. **Don't Ignore Errors**
   ```typescript
   // ❌ Bad
   try { return await claude.ocr(); } 
   catch { return null; }  // Silent failure!
   
   // ✅ Good
   try { return await claude.ocr(); }
   catch (err) {
     logger.error('OCR failed', { correlationId, error: err });
     throw new OcrError('Claude Vision failed', { cause: err });
   }
   ```

---

## ⚖️ Trade-offs

### Cost vs Accuracy

| Approach | Cost per 100 | Accuracy | Manual Review | Net Cost |
|----------|-------------|----------|---------------|----------|
| **Manual Entry** | ฿1,500 | 100% | 0% | ฿1,500 |
| **Claude Only** | ฿50 | 95% | 5% | ฿50 + ฿75 = **฿125** |
| **Groq Only** | ฿5 | 75% | 25% | ฿5 + ฿375 = **฿380** |
| **Hybrid** | ฿40 | 92% | 8% | ฿40 + ฿120 = **฿160** |

**Hybrid = 80% Claude + 20% Groq (for simple receipts)**

### Speed vs Cost

| Metric | Claude | Groq | PaddleOCR |
|--------|--------|------|-----------|
| Latency | 2-3s | <1s | 1-2s |
| Cost/receipt | ฿0.50 | ฿0.05 | ฿0 |
| Accuracy (Thai) | 95% | 75% | 60% |
| Setup Time | 5 min | 5 min | 5 hours |

**Recommendation:** Start with Claude, optimize later if volume justifies it.

---

## 💻 Code Examples

See the complete implementation:
- [claudeAdapter.ts](./claudeAdapter.ts) - Main adapter with DEV/PROD modes
- [types.ts](./types.ts) - TypeScript interfaces
- [test.ts](./test.ts) - Unit tests
- [example-receipt.jpg](./example-receipt.jpg) - Sample Thai receipt

### Quick Usage

```typescript
import { createClaudeAdapter } from './claudeAdapter';
import { loadConfig } from '../../02-foundations/config';

const config = loadConfig();
const claude = createClaudeAdapter(config);

const result = await claude.extractReceiptFromImage({
  correlationId: 'test-001',
  imageBase64: readFileAsBase64('receipt.jpg')
});

console.log(result);
// {
//   amountSatang: 35000,  // 350.00 Baht
//   vatSatang: 2280,      // 22.80 Baht (7%)
//   vendorName: "ร้านกาแฟดี",
//   issueDate: "2026-01-22",
//   confidence: 0.96
// }
```

---

## 🧪 Testing

### DEV Mode (No API Key Required)

```bash
APP_MODE=DEV bun test test.ts
```

Tests use mocked responses - instant and free.

### PROD Mode (Requires Claude API Key)

```bash
CLAUDE_API_KEY=sk-xxx APP_MODE=PROD bun test test.ts
```

Tests call real Claude API - costs ~฿0.50 per test run.

### Test Cases

- ✅ DEV mode returns mock data
- ✅ PROD mode calls Claude API
- ✅ Parses JSON response correctly
- ✅ Handles missing VAT (null)
- ✅ Handles API errors (retry logic)
- ✅ Validates Satang conversion

---

## 🔗 Related Recipes

**Prerequisites:**
- [02-foundations/config-management](../../02-foundations/config-management/) - Understand dual mode setup
- [02-foundations/adapter-pattern](../../02-foundations/adapter-pattern/) - Learn the pattern

**Next Steps:**
- [03-vision-ocr/quality-check](../quality-check/) - Validate OCR results
- [03-vision-ocr/fallback-strategy](../fallback-strategy/) - Groq fallback
- [04-tool-use/multi-step-workflow](../../04-tool-use/multi-step-workflow/) - OCR → Validate → Export

**Advanced:**
- [05-reliability/retry-backoff](../../05-reliability/retry-backoff/) - Handle API failures
- [06-testing/integration-tests](../../06-testing/integration-tests/) - E2E testing

---

## 📚 References

### Documentation
- [Claude Vision Guide](https://docs.anthropic.com/claude/docs/vision)
- [Claude API Reference](https://docs.anthropic.com/claude/reference/messages_post)
- [AutoAcct Context](../../../docs/autoacct-context.md)

### Example Prompts
- [receipt-ocr-prompt.txt](../../../templates/receipt-ocr-prompt.txt)
- [Anthropic Prompt Library](https://docs.anthropic.com/claude/page/prompts)

---

**Ready to try it?** Run the code in [claudeAdapter.ts](./claudeAdapter.ts) or open [example.ipynb](./example.ipynb) for an interactive notebook! 🚀