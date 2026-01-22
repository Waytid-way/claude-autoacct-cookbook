# 🔗 Integration Guide: Claude OCR → AutoAcct Main Project

> **Goal:** นำ Claude OCR Recipe จาก Cookbook มาใช้ใน AutoAcct main project (Phase 1 architecture)

---

## 📋 Overview

**Cookbook Recipe:**
- Standalone TypeScript code สำหรับ Claude Vision OCR
- รองรับ DEV/PROD dual mode
- ทำงานแบบ independent (ไม่ผูกกับ AutoAcct)

**AutoAcct Main Project:**
- Bun + Express + MongoDB architecture
- Adapter Pattern สำหรับ external services
- Mongoose models + Service layer
- ConfigManager + Winston logger

**Integration Strategy:**
แปลง Claude OCR Recipe → `ClaudeOcrAdapter` ที่ implement `IOcrAdapter` interface

---

## 🏗️ Architecture Mapping

### Before (Cookbook)
```
claudeAdapter.ts (standalone)
    ↓
ReceiptOcrResult
```

### After (AutoAcct Integration)
```
AutoAcct Backend
├── src/adapters/IOcrAdapter.ts          ← Base interface
├── src/adapters/ClaudeOcrAdapter.ts     ← Real Claude API (PROD)
├── src/adapters/MockOcrAdapter.ts       ← Mock data (DEV)
└── src/services/OcrService.ts           ← Business logic
        ↓
    Receipt Model (Mongoose)
```

---

## 📝 Step-by-Step Integration

### Step 1: Create IOcrAdapter Interface

**File:** `backend/src/adapters/IOcrAdapter.ts`

```typescript
import { IAdapter } from './IAdapter';

/**
 * OCR ADAPTER INTERFACE
 * 
 * Supports multiple OCR providers:
 * - Claude Vision (primary)
 * - Groq (fallback)
 * - PaddleOCR (self-hosted)
 * - Mock (development)
 */

export interface OcrResult {
  /** Total amount in Satang */
  amountSatang: number;
  
  /** VAT amount in Satang (null if not present) */
  vatAmountSatang: number | null;
  
  /** Vendor/merchant name */
  vendorName: string | null;
  
  /** Issue date (ISO 8601) */
  issueDate: string | null;
  
  /** Raw OCR text for debugging */
  rawText?: string;
  
  /** Confidence score (0.0 - 1.0) */
  confidence?: number;
  
  /** Line items (optional) */
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPriceSatang: number;
    totalSatang: number;
  }>;
}

export interface OcrInput {
  /** Base64-encoded image */
  imageBase64: string;
  
  /** Image format */
  imageFormat?: 'jpeg' | 'png' | 'gif' | 'webp';
  
  /** Correlation ID for tracing */
  correlationId: string;
}

export interface IOcrAdapter extends IAdapter {
  /**
   * Extract structured data from receipt image
   */
  extractReceipt(input: OcrInput): Promise<OcrResult>;
  
  /**
   * Get provider name (claude, groq, paddle, mock)
   */
  getProvider(): 'claude' | 'groq' | 'paddle' | 'mock';
}
```

---

### Step 2: Port ClaudeOcrAdapter to AutoAcct

**File:** `backend/src/adapters/ClaudeOcrAdapter.ts`

```typescript
import { IOcrAdapter, OcrResult, OcrInput } from './IOcrAdapter';
import ConfigManager from '../config/ConfigManager';
import logger from '../config/logger';

/**
 * CLAUDE OCR ADAPTER (PRODUCTION)
 * 
 * Uses Claude 3.5 Sonnet Vision API for Thai receipt OCR.
 * Optimized for accuracy (90-95% for Thai text).
 * 
 * Cost: ~฿0.50 per receipt
 * Latency: 2-3 seconds
 */
export class ClaudeOcrAdapter implements IOcrAdapter {
  private apiKey: string;
  private apiUrl = 'https://api.anthropic.com/v1/messages';

  constructor() {
    this.apiKey = ConfigManager.get('CLAUDE_API_KEY');
    
    if (!this.apiKey) {
      throw new Error('CLAUDE_API_KEY is required for ClaudeOcrAdapter');
    }

    logger.info({
      action: 'claude_ocr_adapter_initialized',
      provider: this.getProvider(),
    });
  }

  getName(): string {
    return 'ClaudeOcrAdapter';
  }

  getMode(): 'mock' | 'staging' | 'production' {
    return 'production';
  }

  getProvider(): 'claude' | 'groq' | 'paddle' | 'mock' {
    return 'claude';
  }

  async health(): Promise<boolean> {
    try {
      // Simple ping to Claude API (minimal cost)
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      return response.ok || response.status === 400; // 400 = valid auth, bad request
    } catch (error) {
      logger.error({
        action: 'claude_health_check_failed',
        error: (error as Error).message,
      });
      return false;
    }
  }

  async extractReceipt(input: OcrInput): Promise<OcrResult> {
    const { imageBase64, imageFormat = 'jpeg', correlationId } = input;

    logger.info({
      correlationId,
      action: 'claude_ocr_extract_start',
      imageSize: imageBase64.length,
    });

    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt();
      const requestBody = this.buildRequest(imageBase64, imageFormat, prompt);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const result = this.parseResponse(data);
      const duration = Date.now() - startTime;

      logger.info({
        correlationId,
        action: 'claude_ocr_extract_success',
        duration,
        confidence: result.confidence,
        amountSatang: result.amountSatang,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error({
        correlationId,
        action: 'claude_ocr_extract_failed',
        duration,
        error: (error as Error).message,
      });
      
      throw error;
    }
  }

  private buildPrompt(): string {
    return `You are a Thai accounting OCR assistant. Extract structured data from this receipt image.

**Instructions:**
1. Extract the following fields and return as JSON:
   - total_amount_satang: Total amount in Satang (1 Baht = 100 Satang)
   - vat_amount_satang: VAT amount in Satang (null if not shown)
   - vendor_name: Merchant/shop name
   - issue_date: Date in YYYY-MM-DD format (convert Buddhist Era to Christian Era if needed)
   - line_items: Array of items (optional)

2. Thai context:
   - VAT is typically 7% in Thailand
   - Dates may be in Buddhist Era (BE) - convert to CE by subtracting 543
   - Common terms: รวม (total), ภาษี (tax), วันที่ (date)

3. Quality:
   - If a field is unclear, set to null
   - Include a confidence score (0.0-1.0) for overall extraction

**Output format (JSON only, no markdown):**
{
  "total_amount_satang": number,
  "vat_amount_satang": number | null,
  "vendor_name": string | null,
  "issue_date": "YYYY-MM-DD" | null,
  "confidence": number,
  "raw_text": "brief text summary",
  "line_items": [
    {
      "description": string,
      "quantity": number,
      "unit_price_satang": number,
      "total_satang": number
    }
  ]
}

Return ONLY the JSON, no other text.`;
  }

  private buildRequest(imageBase64: string, imageFormat: string, prompt: string) {
    return {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: `image/${imageFormat}`,
                data: imageBase64,
              },
            },
          ],
        },
      ],
    };
  }

  private parseResponse(data: any): OcrResult {
    const contentText = data.content?.[0]?.text || '{}';

    // Remove markdown code blocks if present
    const jsonText = contentText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      throw new Error('Claude returned invalid JSON');
    }

    return {
      amountSatang: parsed.total_amount_satang || 0,
      vatAmountSatang: parsed.vat_amount_satang ?? null,
      vendorName: parsed.vendor_name ?? null,
      issueDate: parsed.issue_date ?? null,
      rawText: parsed.raw_text,
      confidence: parsed.confidence ?? 0,
      lineItems: parsed.line_items || [],
    };
  }
}
```

---

### Step 3: Create MockOcrAdapter (DEV Mode)

**File:** `backend/src/adapters/MockOcrAdapter.ts`

```typescript
import { IOcrAdapter, OcrResult, OcrInput } from './IOcrAdapter';
import logger from '../config/logger';

/**
 * MOCK OCR ADAPTER (DEVELOPMENT)
 * 
 * Returns deterministic mock data for testing.
 * Zero cost, instant response.
 */
export class MockOcrAdapter implements IOcrAdapter {
  getName(): string {
    return 'MockOcrAdapter';
  }

  getMode(): 'mock' | 'staging' | 'production' {
    return 'mock';
  }

  getProvider(): 'claude' | 'groq' | 'paddle' | 'mock' {
    return 'mock';
  }

  async health(): Promise<boolean> {
    return true; // Always healthy in mock mode
  }

  async extractReceipt(input: OcrInput): Promise<OcrResult> {
    const { correlationId } = input;

    logger.debug({
      correlationId,
      action: 'mock_ocr_extract',
      provider: 'mock',
    });

    // Simulate latency (200ms)
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Return mock data
    return {
      amountSatang: 35000, // ฿350.00
      vatAmountSatang: 2280, // ฿22.80 (7%)
      vendorName: 'ร้านกาแฟดี (Mock)',
      issueDate: '2026-01-22',
      rawText: 'Mock receipt: Latte x2, Sandwich x1',
      confidence: 0.95,
      lineItems: [
        {
          description: 'Latte',
          quantity: 2,
          unitPriceSatang: 8000,
          totalSatang: 16000,
        },
        {
          description: 'Sandwich',
          quantity: 1,
          unitPriceSatang: 12000,
          totalSatang: 12000,
        },
      ],
    };
  }
}
```

---

### Step 4: Create OcrService (Business Logic)

**File:** `backend/src/services/OcrService.ts`

```typescript
import { IOcrAdapter, OcrResult } from '../adapters/IOcrAdapter';
import { Receipt, IReceipt } from '../models/Receipt';
import { SystemLog } from '../models/SystemLog';
import logger from '../config/logger';
import ConfigManager from '../config/ConfigManager';

/**
 * OCR SERVICE
 * 
 * Orchestrates OCR processing:
 * 1. Extract data via adapter
 * 2. Validate results
 * 3. Save to Receipt model
 * 4. Log to SystemLog
 */
export class OcrService {
  constructor(private ocrAdapter: IOcrAdapter) {}

  /**
   * Process receipt image and save to database
   */
  async processReceipt(
    receiptId: string,
    imageBase64: string,
    correlationId: string
  ): Promise<IReceipt> {
    logger.info({
      correlationId,
      action: 'ocr_process_start',
      receiptId,
      provider: this.ocrAdapter.getProvider(),
    });

    try {
      // Step 1: Extract via OCR
      const ocrResult = await this.ocrAdapter.extractReceipt({
        imageBase64,
        correlationId,
      });

      // Step 2: Validate
      const needsReview = this.shouldReview(ocrResult);

      // Step 3: Update Receipt model
      const receipt = await Receipt.findByIdAndUpdate(
        receiptId,
        {
          ocrText: ocrResult.rawText,
          ocrEngine: this.ocrAdapter.getProvider(),
          extractedFields: {
            vendor: ocrResult.vendorName,
            amount: ocrResult.amountSatang,
            date: ocrResult.issueDate ? new Date(ocrResult.issueDate) : undefined,
          },
          confidenceScores: {
            overall: ocrResult.confidence,
            amount: ocrResult.confidence, // Simplified
            vendor: ocrResult.confidence,
          },
          status: needsReview ? 'manual_review_required' : 'processed',
        },
        { new: true }
      );

      if (!receipt) {
        throw new Error(`Receipt ${receiptId} not found`);
      }

      // Step 4: Log to SystemLog
      await SystemLog.create({
        action: 'receipt_ocr_completed',
        actor: 'system',
        correlationId,
        status: needsReview ? 'warning' : 'success',
        details: {
          receiptId,
          provider: this.ocrAdapter.getProvider(),
          confidence: ocrResult.confidence,
          needsReview,
        },
      });

      logger.info({
        correlationId,
        action: 'ocr_process_complete',
        receiptId,
        needsReview,
      });

      return receipt;
    } catch (error) {
      logger.error({
        correlationId,
        action: 'ocr_process_failed',
        receiptId,
        error: (error as Error).message,
      });

      // Update receipt status to error
      await Receipt.findByIdAndUpdate(receiptId, {
        status: 'manual_review_required',
      });

      throw error;
    }
  }

  /**
   * Determine if result needs manual review
   */
  private shouldReview(result: OcrResult): boolean {
    const minConfidence = ConfigManager.get('OCR_MIN_CONFIDENCE') || 0.95;

    // Review if:
    // - Confidence too low
    // - VAT missing (critical for tax compliance)
    // - Amount is 0 or negative
    return (
      (result.confidence || 0) < minConfidence ||
      result.vatAmountSatang === null ||
      result.amountSatang <= 0
    );
  }
}
```

---

### Step 5: Factory Pattern (Adapter Selection)

**File:** `backend/src/adapters/OcrAdapterFactory.ts`

```typescript
import { IOcrAdapter } from './IOcrAdapter';
import { ClaudeOcrAdapter } from './ClaudeOcrAdapter';
import { MockOcrAdapter } from './MockOcrAdapter';
import ConfigManager from '../config/ConfigManager';

/**
 * OCR ADAPTER FACTORY
 * 
 * Creates the appropriate OCR adapter based on configuration.
 */
export class OcrAdapterFactory {
  static create(): IOcrAdapter {
    const mode = ConfigManager.get('APP_MODE');

    if (mode === 'dev' || mode === 'test') {
      return new MockOcrAdapter();
    }

    // Production: Use Claude by default
    // TODO: Add Groq fallback logic here
    return new ClaudeOcrAdapter();
  }
}
```

---

## 🔧 Configuration Updates

### Update `.env.example`

```bash
# Add to backend/.env.example

# OCR Configuration
CLAUDE_API_KEY=sk-ant-api03-xxxxx
OCR_MIN_CONFIDENCE=0.95  # Minimum confidence for auto-approval
```

### Update `ConfigManager` Schema

```typescript
// Add to backend/src/config/ConfigManager.ts

const configSchema = z.object({
  // ... existing fields ...
  
  // OCR
  CLAUDE_API_KEY: z.string().optional(),
  OCR_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.95),
});
```

---

## 🧪 Testing

### Unit Tests

**File:** `backend/tests/adapters/ClaudeOcrAdapter.test.ts`

```typescript
import { describe, test, expect, beforeAll } from 'bun:test';
import { ClaudeOcrAdapter } from '../../src/adapters/ClaudeOcrAdapter';
import ConfigManager from '../../src/config/ConfigManager';

describe('ClaudeOcrAdapter', () => {
  beforeAll(() => {
    // Set required env vars
    process.env.CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'test-key';
  });

  test('should initialize', () => {
    const adapter = new ClaudeOcrAdapter();
    expect(adapter.getName()).toBe('ClaudeOcrAdapter');
    expect(adapter.getProvider()).toBe('claude');
  });

  test('should extract receipt data', async () => {
    // Skip if no real API key
    if (!process.env.CLAUDE_API_KEY?.startsWith('sk-ant')) {
      test.skip('No Claude API key');
      return;
    }

    const adapter = new ClaudeOcrAdapter();
    
    // Use tiny 1x1 PNG for test
    const mockImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const result = await adapter.extractReceipt({
      imageBase64: mockImage,
      correlationId: 'test-001',
    });

    expect(result.amountSatang).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  }, 10000);
});
```

---

## 📊 Usage Example

### In Controller

```typescript
// backend/src/controllers/OcrController.ts

import { Request, Response } from 'express';
import { OcrService } from '../services/OcrService';
import { OcrAdapterFactory } from '../adapters/OcrAdapterFactory';
import { v4 as uuidv4 } from 'uuid';

export class OcrController {
  private ocrService: OcrService;

  constructor() {
    const ocrAdapter = OcrAdapterFactory.create();
    this.ocrService = new OcrService(ocrAdapter);
  }

  async processReceipt(req: Request, res: Response) {
    const correlationId = req.get('x-correlation-id') || uuidv4();
    const { receiptId, imageBase64 } = req.body;

    try {
      const receipt = await this.ocrService.processReceipt(
        receiptId,
        imageBase64,
        correlationId
      );

      res.json({
        success: true,
        receipt,
        needsReview: receipt.status === 'manual_review_required',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        correlationId,
      });
    }
  }
}
```

---

## ✅ Checklist

- [ ] Copy `IOcrAdapter.ts` to `backend/src/adapters/`
- [ ] Copy `ClaudeOcrAdapter.ts` to `backend/src/adapters/`
- [ ] Copy `MockOcrAdapter.ts` to `backend/src/adapters/`
- [ ] Copy `OcrAdapterFactory.ts` to `backend/src/adapters/`
- [ ] Copy `OcrService.ts` to `backend/src/services/`
- [ ] Update `.env.example` with `CLAUDE_API_KEY`
- [ ] Update `ConfigManager` schema
- [ ] Write unit tests
- [ ] Test in DEV mode (MockOcrAdapter)
- [ ] Test in PROD mode (ClaudeOcrAdapter)
- [ ] Document in README

---

## 🎯 Next Steps

1. **Groq Fallback:** Create `GroqOcrAdapter` for cost optimization
2. **Batch Processing:** Extend `OcrService` to process multiple receipts
3. **Retry Logic:** Add exponential backoff for API failures
4. **Monitoring:** Add metrics for OCR accuracy tracking

---

**🎉 Integration ใช้เวลา ~30 นาที ก็พร้อมใช้งานแล้ว!**
