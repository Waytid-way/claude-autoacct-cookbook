# Integration Guide: Groq OCR Fallback into AutoAcct

> 🎯 **Goal:** Integrate the hybrid OCR strategy into AutoAcct main project to save 70% on OCR costs

---

## 📁 Table of Contents

1. [Prerequisites](#prerequisites)
2. [File Structure](#file-structure)
3. [Step-by-Step Integration](#step-by-step-integration)
4. [Configuration](#configuration)
5. [Usage Examples](#usage-examples)
6. [Testing](#testing)
7. [Monitoring](#monitoring)

---

## ✅ Prerequisites

Before integrating, ensure you have:

1. **Completed Recipe 1:** [Receipt OCR with Claude](../receipt-extraction/INTEGRATION.md)
   - `IOcrAdapter.ts` interface
   - `ClaudeOcrAdapter.ts` implementation
   - `OcrService.ts` service layer

2. **API Keys:**
   - Claude API key (from console.anthropic.com)
   - Groq API key (from console.groq.com)

3. **AutoAcct Project Structure:**
   ```
   autoacct-backend/
   ├── src/
   │   ├── adapters/
   │   │   ├── IOcrAdapter.ts      ← Exists from Recipe 1
   │   │   └── ClaudeOcrAdapter.ts ← Exists from Recipe 1
   │   ├── services/
   │   │   └── OcrService.ts       ← Exists from Recipe 1
   │   └── config/
   │       └── ConfigManager.ts    ← Exists
   └── .env
   ```

---

## 📂 File Structure

After integration:

```
autoacct-backend/
├── src/
│   ├── adapters/
│   │   ├── ocr/
│   │   │   ├── IOcrAdapter.ts              ← Interface
│   │   │   ├── ClaudeOcrAdapter.ts         ← Existing
│   │   │   ├── GroqTextAdapter.ts          ← NEW
│   │   │   ├── SimpleReceiptDetector.ts    ← NEW
│   │   │   ├── HybridOcrStrategy.ts        ← NEW
│   │   │   └── OcrAdapterFactory.ts        ← UPDATE
│   │   └── types.ts                        ← UPDATE
│   ├── services/
│   │   └── OcrService.ts                   ← UPDATE (optional)
│   └── config/
│       └── ConfigManager.ts                ← UPDATE
└── .env                                    ← UPDATE
```

---

## 🛠️ Step-by-Step Integration

### Step 1: Copy New Files (5 min)

```bash
# From cookbook to AutoAcct project
cd /path/to/claude-autoacct-cookbook

# Copy new adapters
cp recipes/03-vision-ocr/groq-fallback/GroqTextAdapter.ts \
   /path/to/autoacct-backend/src/adapters/ocr/

cp recipes/03-vision-ocr/groq-fallback/SimpleReceiptDetector.ts \
   /path/to/autoacct-backend/src/adapters/ocr/

cp recipes/03-vision-ocr/groq-fallback/HybridOcrStrategy.ts \
   /path/to/autoacct-backend/src/adapters/ocr/
```

### Step 2: Update ConfigManager (5 min)

**File:** `src/config/ConfigManager.ts`

```typescript
import { z } from 'zod';

const configSchema = z.object({
  // ... existing config ...
  
  // OCR Config
  CLAUDE_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),      // ← NEW
  OCR_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.95),
  
  // Hybrid Strategy Config
  OCR_STRATEGY: z.enum(['claude', 'groq', 'hybrid']).default('hybrid'), // ← NEW
  SIMPLE_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85), // ← NEW
  ENABLE_OCR_FALLBACK: z.coerce.boolean().default(true), // ← NEW
});

export type AppConfig = z.infer<typeof configSchema>;

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = configSchema.parse(process.env);
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }
}

export default new ConfigManager();
```

### Step 3: Update .env (2 min)

**File:** `.env`

```bash
# OCR Configuration
CLAUDE_API_KEY=sk-ant-api03-xxxxx
GROQ_API_KEY=gsk-xxxxx              # ← NEW

# OCR Strategy
OCR_STRATEGY=hybrid                 # ← NEW: 'claude' | 'groq' | 'hybrid'
SIMPLE_CONFIDENCE_THRESHOLD=0.85    # ← NEW
ENABLE_OCR_FALLBACK=true            # ← NEW
```

### Step 4: Update OcrAdapterFactory (10 min)

**File:** `src/adapters/ocr/OcrAdapterFactory.ts`

```typescript
import { IOcrAdapter } from './IOcrAdapter';
import { ClaudeOcrAdapter } from './ClaudeOcrAdapter';
import { GroqTextAdapter } from './GroqTextAdapter';
import { HybridOcrStrategy } from './HybridOcrStrategy';
import { MockOcrAdapter } from './MockOcrAdapter';
import ConfigManager from '../../config/ConfigManager';
import Logger from '../../utils/Logger';

export class OcrAdapterFactory {
  /**
   * Create OCR adapter based on config
   */
  static create(): IOcrAdapter | HybridOcrStrategy {
    const mode = ConfigManager.get('APP_MODE');
    const strategy = ConfigManager.get('OCR_STRATEGY');

    // DEV mode always uses mock
    if (mode === 'dev') {
      Logger.info('[OcrFactory] Using MockOcrAdapter (DEV mode)');
      return new MockOcrAdapter();
    }

    // PROD mode - choose strategy
    switch (strategy) {
      case 'claude':
        return this.createClaudeAdapter();
      
      case 'groq':
        return this.createGroqAdapter();
      
      case 'hybrid':
      default:
        return this.createHybridStrategy();
    }
  }

  /**
   * Create Claude-only adapter
   */
  private static createClaudeAdapter(): ClaudeOcrAdapter {
    const apiKey = ConfigManager.get('CLAUDE_API_KEY');
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is required for Claude adapter');
    }

    Logger.info('[OcrFactory] Using ClaudeOcrAdapter');
    return new ClaudeOcrAdapter({ apiKey });
  }

  /**
   * Create Groq-only adapter
   */
  private static createGroqAdapter(): GroqTextAdapter {
    const apiKey = ConfigManager.get('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is required for Groq adapter');
    }

    Logger.info('[OcrFactory] Using GroqTextAdapter');
    return new GroqTextAdapter({ apiKey });
  }

  /**
   * Create hybrid strategy (Claude + Groq)
   */
  private static createHybridStrategy(): HybridOcrStrategy {
    const claudeKey = ConfigManager.get('CLAUDE_API_KEY');
    const groqKey = ConfigManager.get('GROQ_API_KEY');

    if (!claudeKey || !groqKey) {
      throw new Error('Both CLAUDE_API_KEY and GROQ_API_KEY are required for hybrid strategy');
    }

    const claudeAdapter = new ClaudeOcrAdapter({ apiKey: claudeKey });
    const groqAdapter = new GroqTextAdapter({ apiKey: groqKey });

    const config = {
      simpleConfidenceThreshold: ConfigManager.get('SIMPLE_CONFIDENCE_THRESHOLD'),
      enableFallback: ConfigManager.get('ENABLE_OCR_FALLBACK'),
      enableMetrics: true,
    };

    Logger.info('[OcrFactory] Using HybridOcrStrategy', config);
    return new HybridOcrStrategy(claudeAdapter as any, groqAdapter, config);
  }
}
```

### Step 5: Update OcrService (Optional - 5 min)

**File:** `src/services/OcrService.ts`

If you want to expose metrics:

```typescript
import { OcrAdapterFactory } from '../adapters/ocr/OcrAdapterFactory';
import { HybridOcrStrategy } from '../adapters/ocr/HybridOcrStrategy';
import type { OcrInput, OcrResult } from '../adapters/ocr/types';

export class OcrService {
  private adapter: any; // IOcrAdapter | HybridOcrStrategy

  constructor() {
    this.adapter = OcrAdapterFactory.create();
  }

  /**
   * Extract receipt data
   */
  async extractReceipt(input: OcrInput): Promise<OcrResult> {
    return await this.adapter.extractReceipt(input);
  }

  /**
   * Get OCR metrics (only available for HybridOcrStrategy)
   */
  getMetrics() {
    if (this.adapter instanceof HybridOcrStrategy) {
      return this.adapter.getMetrics();
    }
    return null;
  }

  /**
   * Print metrics to console
   */
  printMetrics() {
    if (this.adapter instanceof HybridOcrStrategy) {
      this.adapter.printMetrics();
    }
  }
}
```

---

## 🚀 Usage Examples

### Example 1: Basic Usage

```typescript
import { OcrService } from './services/OcrService';

const ocrService = new OcrService();

const result = await ocrService.extractReceipt({
  imageBase64: receiptImageData,
  correlationId: 'txn-12345',
});

console.log(`Amount: ฿${result.amountSatang / 100}`);
console.log(`VAT: ฿${result.vatAmountSatang! / 100}`);
console.log(`Vendor: ${result.vendorName}`);
```

### Example 2: Check Metrics

```typescript
import { OcrService } from './services/OcrService';

const ocrService = new OcrService();

// Process receipts
for (const receipt of receipts) {
  await ocrService.extractReceipt(receipt);
}

// Print metrics
ocrService.printMetrics();

// Get metrics object
const metrics = ocrService.getMetrics();
if (metrics) {
  console.log(`Total cost: ฿${metrics.totalCost}`);
  console.log(`Savings: ฿${metrics.savingsVsClaudeOnly}`);
}
```

### Example 3: API Endpoint

```typescript
// src/routes/ocr.route.ts
import { Router } from 'express';
import { OcrService } from '../services/OcrService';

const router = Router();
const ocrService = new OcrService();

router.post('/extract', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    
    const result = await ocrService.extractReceipt({
      imageBase64,
      correlationId: req.id, // From request ID middleware
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// Metrics endpoint (admin only)
router.get('/metrics', (req, res) => {
  const metrics = ocrService.getMetrics();
  res.json({ success: true, data: metrics });
});

export default router;
```

---

## 🧪 Testing

### Unit Tests

```typescript
// src/adapters/ocr/__tests__/HybridOcrStrategy.test.ts
import { describe, test, expect } from 'bun:test';
import { OcrAdapterFactory } from '../OcrAdapterFactory';

describe('HybridOcrStrategy', () => {
  test('should create hybrid adapter in PROD mode', () => {
    process.env.APP_MODE = 'prod';
    process.env.OCR_STRATEGY = 'hybrid';
    process.env.CLAUDE_API_KEY = 'test-key';
    process.env.GROQ_API_KEY = 'test-key';

    const adapter = OcrAdapterFactory.create();
    expect(adapter).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// src/services/__tests__/OcrService.integration.test.ts
import { describe, test, expect } from 'bun:test';
import { OcrService } from '../OcrService';

describe('OcrService Integration', () => {
  test('should extract receipt and track metrics', async () => {
    const service = new OcrService();
    
    const result = await service.extractReceipt({
      imageBase64: mockReceiptImage,
      correlationId: 'test-001',
    });

    expect(result.amountSatang).toBeGreaterThan(0);

    const metrics = service.getMetrics();
    if (metrics) {
      expect(metrics.totalReceipts).toBe(1);
    }
  });
});
```

---

## 📊 Monitoring

### Dashboard Metrics

Create a metrics endpoint to track performance:

```typescript
// src/routes/admin.route.ts
router.get('/ocr-metrics', async (req, res) => {
  const ocrService = new OcrService();
  const metrics = ocrService.getMetrics();

  if (!metrics) {
    return res.json({ strategy: 'non-hybrid', metrics: null });
  }

  const dashboard = {
    period: 'last_30_days',
    totalReceipts: metrics.totalReceipts,
    routing: {
      simple: metrics.simpleCount,
      complex: metrics.complexCount,
      simplePercentage: (metrics.simpleCount / metrics.totalReceipts * 100).toFixed(1),
    },
    performance: {
      groqSuccessRate: (metrics.groqSuccessRate * 100).toFixed(1),
      claudeFallbackRate: metrics.claudeFallbackRate,
      manualReviewRate: (metrics.manualReviewRate * 100).toFixed(1),
    },
    cost: {
      total: metrics.totalCost.toFixed(2),
      average: metrics.avgCostPerReceipt.toFixed(2),
      savings: metrics.savingsVsClaudeOnly.toFixed(2),
      savingsPercentage: (
        (metrics.savingsVsClaudeOnly / (metrics.totalReceipts * 0.50)) * 100
      ).toFixed(1),
    },
  };

  res.json({ success: true, data: dashboard });
});
```

### Logging

Add structured logging:

```typescript
// In HybridOcrStrategy.ts
private async processSimpleReceipt(...) {
  Logger.info('[HybridOCR] Processing simple receipt', {
    correlationId,
    route: 'groq',
    confidence: classification.confidence,
  });

  // ... processing ...

  Logger.info('[HybridOCR] Groq success', {
    correlationId,
    duration,
    cost: 0.05,
    confidence: result.confidence,
  });
}
```

---

## ⚙️ Configuration Strategies

### Strategy 1: Hybrid (Recommended)
```bash
OCR_STRATEGY=hybrid
SIMPLE_CONFIDENCE_THRESHOLD=0.85
ENABLE_OCR_FALLBACK=true
```
- **Use case:** High volume, mixed receipt types
- **Cost:** ~฿0.15/receipt
- **Accuracy:** 92%

### Strategy 2: Claude Only (High Accuracy)
```bash
OCR_STRATEGY=claude
```
- **Use case:** Low volume, critical accuracy
- **Cost:** ฿0.50/receipt
- **Accuracy:** 95%

### Strategy 3: Groq Only (Budget)
```bash
OCR_STRATEGY=groq
```
- **Use case:** Very high volume, simple receipts
- **Cost:** ฿0.05/receipt
- **Accuracy:** 75% (needs more manual review)

---

## 🐛 Troubleshooting

### Issue 1: "GROQ_API_KEY is required"

**Solution:**
```bash
# Get API key from console.groq.com
echo "GROQ_API_KEY=gsk-xxxxx" >> .env
```

### Issue 2: High Groq Failure Rate

**Solution:**
```bash
# Lower threshold to route more to Claude
SIMPLE_CONFIDENCE_THRESHOLD=0.90
```

### Issue 3: No Cost Savings

**Check:**
- Are most receipts being routed to Claude?
- Review `simpleCount` vs `complexCount` in metrics
- Adjust `SimpleReceiptDetector` heuristics

---

## 📝 Summary

**What you integrated:**
1. ✅ Groq text parser (`GroqTextAdapter`)
2. ✅ Receipt classifier (`SimpleReceiptDetector`)
3. ✅ Hybrid orchestrator (`HybridOcrStrategy`)
4. ✅ Updated factory (`OcrAdapterFactory`)
5. ✅ Config management

**Benefits:**
- 💰 70% cost reduction
- 🚀 Same accuracy for simple receipts
- 🔄 Automatic fallback
- 📊 Built-in metrics

**Next steps:**
1. Monitor metrics dashboard
2. Tune `simpleConfidenceThreshold`
3. Add PaddleOCR for raw text extraction
4. Implement batch processing

---

**🎉 Integration complete! You're saving money!**
