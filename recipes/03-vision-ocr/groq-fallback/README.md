# Recipe: Groq OCR Fallback & Hybrid Strategy

> 🎯 **AutoAcct Context:** Cost optimization - Use cheap Groq text parsing for simple receipts, save Claude for complex ones.

---

## 📋 Table of Contents

1. [What & Why](#what--why)
2. [Architecture](#architecture)
3. [Cost Analysis](#cost-analysis)
4. [Implementation](#implementation)
5. [Best Practices](#best-practices)
6. [Code Examples](#code-examples)
7. [Testing](#testing)
8. [Related Recipes](#related-recipes)

---

## 🎯 What & Why

### What

A **hybrid OCR strategy** that:
1. Classifies receipts as "simple" or "complex"
2. Routes simple receipts → Groq (cheap text parsing)
3. Routes complex receipts → Claude Vision (accurate)
4. Falls back to Claude if Groq fails

**Goal:** Reduce OCR cost by 70% while maintaining accuracy.

### Why Hybrid?

**Single Provider Problem:**

| Provider | Cost/receipt | Accuracy | Issue |
|----------|-------------|----------|-------|
| Claude only | ฿0.50 | 95% | 💰 Expensive for high volume |
| Groq only | ฿0.05 | 75% | ⚠️ Too many errors |
| PaddleOCR only | ฿0 | 60% | ❌ Needs extensive tuning |

**Hybrid Solution:**
- 80% simple receipts → Groq text parsing (฿0.05)
- 20% complex receipts → Claude Vision (฿0.50)
- **Average cost:** ฿0.14/receipt (**72% savings!**)
- **Average accuracy:** 92% (good enough with manual review for edge cases)

### When to Use

✅ **Use this recipe when:**
- Processing high volume (>100 receipts/month)
- Budget constrained
- Most receipts are standard formats (7-Eleven, Tesco, etc.)
- Acceptable to have 5-10% manual review rate

⚠️ **Don't use when:**
- Volume is low (<50 receipts/month) - not worth complexity
- 100% accuracy required (use Claude only)
- All receipts are handwritten or unusual formats

---

## 🏗️ Architecture

### Overview

```
┌─────────────────┐
│  Receipt Image  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ SimpleReceiptDetector│  ← Fast heuristic check
│ (image analysis)    │
└────────┬────────────┘
         │
    ┌────┴────────────────┐
    │                     │
    ▼                     ▼
┌──────────┐      ┌──────────────┐
│  SIMPLE  │      │   COMPLEX    │
│  (80%)   │      │   (20%)      │
└────┬─────┘      └──────┬───────┘
     │                   │
     ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ PaddleOCR    │  │ Claude Vision    │
│ (raw text)   │  │ (structured JSON)│
└──────┬───────┘  └────────┬─────────┘
       │                   │
       ▼                   │
┌──────────────┐           │
│ Groq Text    │           │
│ Parser       │           │
│ (฿0.05)      │           │
└──────┬───────┘           │
       │                   │
       ├──── Success ──────┤
       │                   │
       └──── Fail ──────────┤
                           │
                           ▼
                    ┌──────────────┐
                    │ Claude Vision│
                    │ (fallback)   │
                    └──────────────┘
```

### Components

**1. SimpleReceiptDetector**
- Input: Receipt image (base64)
- Output: `{ isSimple: boolean, confidence: number }`
- Logic: Heuristic analysis (brightness, text density, standard format detection)

**2. GroqTextAdapter**
- Input: Raw OCR text (from PaddleOCR or Google Vision)
- Output: Structured `OcrResult`
- Uses: Groq's fast text models (Mixtral, LLaMA)
- Cost: ~฿0.05/receipt

**3. HybridOcrStrategy**
- Orchestrates the decision flow
- Handles fallback logic
- Tracks cost/accuracy metrics

---

## 💰 Cost Analysis

### Breakdown (100 receipts/month)

**Scenario A: Claude Only**
```
100 receipts × ฿0.50 = ฿50/month
```

**Scenario B: Groq Only**
```
100 receipts × ฿0.05 = ฿5/month
But: 25% failure rate
→ 25 receipts need manual review (฿375 labor cost)
Total: ฿5 + ฿375 = ฿380/month ❌ WORSE!
```

**Scenario C: Hybrid (This Recipe)**
```
Simple (80 receipts):
  - PaddleOCR: Free
  - Groq parsing: 80 × ฿0.05 = ฿4
  - 5% fail → Claude fallback: 4 × ฿0.50 = ฿2

Complex (20 receipts):
  - Claude Vision: 20 × ฿0.50 = ฿10

Total: ฿4 + ฿2 + ฿10 = ฿16/month ✅
Savings: ฿50 - ฿16 = ฿34/month (68% reduction)
```

### ROI Table

| Volume | Claude Only | Hybrid | Savings | % Saved |
|--------|------------|--------|---------|----------|
| 100/mo | ฿50 | ฿16 | ฿34 | 68% |
| 500/mo | ฿250 | ฿80 | ฿170 | 68% |
| 1000/mo | ฿500 | ฿160 | ฿340 | 68% |
| 5000/mo | ฿2,500 | ฿800 | ฿1,700 | 68% |

---

## 🛠️ Implementation

See the code files:
- [SimpleReceiptDetector.ts](./SimpleReceiptDetector.ts) - Classifier
- [GroqTextAdapter.ts](./GroqTextAdapter.ts) - Groq text parser
- [HybridOcrStrategy.ts](./HybridOcrStrategy.ts) - Orchestrator
- [types.ts](./types.ts) - TypeScript types
- [test.ts](./test.ts) - Unit tests

---

## ✅ Best Practices

### DO ✅

1. **Monitor Classification Accuracy**
   ```typescript
   // Track false positives/negatives
   if (markedAsSimple && actuallyComplex) {
     logger.warn('Misclassification', { receiptId });
     // Adjust SimpleReceiptDetector thresholds
   }
   ```

2. **Set Confidence Thresholds**
   ```typescript
   // If detector is uncertain, use Claude
   if (detection.confidence < 0.85) {
     return claudeAdapter.extractReceipt(input);
   }
   ```

3. **Track Cost Metrics**
   ```typescript
   await metrics.record({
     provider: 'groq',
     cost: 0.05,
     accuracy: result.confidence,
   });
   ```

4. **Implement Feedback Loop**
   ```typescript
   // When user corrects Groq result
   await feedbackStore.save({
     receiptId,
     predictedSimple: true,
     actuallySimple: false, // User had to correct
   });
   // Use this to retrain SimpleReceiptDetector
   ```

### DON'T ❌

1. **Don't Over-Optimize Too Early**
   - Start with 50/50 split
   - Measure actual accuracy
   - Adjust thresholds based on data

2. **Don't Sacrifice Accuracy for Cost**
   - If Groq failure rate > 15%, route more to Claude
   - Critical field (VAT) must be 100% accurate

3. **Don't Ignore Fallback Metrics**
   - Track: "Groq attempted → Claude fallback" rate
   - High rate = SimpleReceiptDetector needs tuning

---

## ⚖️ Trade-offs

### Complexity vs Cost

| Strategy | Complexity | Cost/100 | Accuracy | Manual Review |
|----------|-----------|----------|----------|---------------|
| **Claude Only** | Low | ฿50 | 95% | 5% |
| **Groq Only** | Low | ฿5 | 75% | 25% |
| **Hybrid** | **Medium** | **฿16** | **92%** | **8%** |
| **ML Classifier** | High | ฿12 | 96% | 4% |

**Recommendation:** Start with Hybrid (this recipe), upgrade to ML classifier if volume > 5,000/month.

### Maintenance

**Simple Receipts (80%):**
- 7-Eleven, Tesco, Lotus's, etc.
- Printed, standard format
- Clear text, high contrast
- → Groq parsing works well

**Complex Receipts (20%):**
- Handwritten receipts
- Faded thermal paper
- Non-standard formats
- Mixed Thai/English/numbers
- → Need Claude Vision

**Edge Cases:**
- New receipt formats: May be misclassified initially
- Solution: Feedback loop updates classifier

---

## 📊 Monitoring

### Key Metrics

```typescript
interface OcrMetrics {
  // Volume
  totalReceipts: number;
  simpleCount: number;      // Routed to Groq
  complexCount: number;     // Routed to Claude
  
  // Accuracy
  groqSuccessRate: number;  // Groq parsed successfully
  claudeFallbackRate: number; // Groq failed → Claude
  
  // Cost
  totalCost: number;
  avgCostPerReceipt: number;
  savingsVsClaudeOnly: number;
  
  // Quality
  manualReviewRate: number; // Low confidence → human review
}
```

### Dashboard Example

```
📊 OCR Performance (Last 30 Days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Receipts:     487
├─ Simple (Groq):   389 (80%)
└─ Complex (Claude): 98 (20%)

Groq Success:       372/389 (96%) ✅
Claude Fallback:     17/389 (4%)

Avg Cost/Receipt:   ฿0.15
Total Cost:         ฿73
Savings vs Claude:  ฿170 (70%)

Manual Review:      39/487 (8%)
```

---

## 🧪 Testing

### Test Cases

1. **Simple receipt → Groq → Success**
2. **Simple receipt → Groq → Fail → Claude fallback**
3. **Complex receipt → Claude directly**
4. **Uncertain classification → Claude (safe choice)**
5. **Groq API down → Claude fallback**

See [test.ts](./test.ts) for full test suite.

---

## 🔗 Related Recipes

**Prerequisites:**
- [Receipt OCR with Claude](../receipt-extraction/) - Main OCR implementation
- [Adapter Pattern](../../02-foundations/adapter-pattern/) - Interface design

**Next Steps:**
- [Batch Processing](../batch-processing/) - Process 100+ receipts
- [Quality Validation](../quality-check/) - Validate OCR results
- [Cost Tracking](../../06-monitoring/cost-tracking/) - Monitor expenses

**Advanced:**
- [ML-based Classifier](../ml-classifier/) - Replace heuristic detector
- [A/B Testing](../../06-testing/ab-testing/) - Compare strategies

---

## 📝 Summary

**Problem:** Claude OCR is accurate but expensive at scale.

**Solution:** Hybrid strategy routes simple receipts to cheap Groq parsing, complex ones to Claude.

**Result:**
- ✅ 68% cost reduction
- ✅ 92% average accuracy (vs 95% Claude-only)
- ✅ Automatic fallback for failures
- ✅ Scales to high volume

**Trade-off:** Slightly more complexity (3 components vs 1), but massive cost savings.

---

**Ready to implement?** Start with [QUICKSTART.md](./QUICKSTART.md) 🚀
