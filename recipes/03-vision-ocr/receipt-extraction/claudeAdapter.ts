/**
 * Claude Vision Adapter for Receipt OCR
 * 
 * Supports dual mode:
 * - DEV: Returns mock data (fast, free, deterministic)
 * - PROD: Calls Claude API (real OCR)
 * 
 * Usage:
 *   const adapter = createClaudeAdapter(config);
 *   const result = await adapter.extractReceiptFromImage({...});
 */

import type {
  AppConfig,
  ClaudeAdapter,
  ExtractReceiptParams,
  ReceiptOcrResult,
  OcrError,
} from './types';

// ============================================================================
// Helper: Simple Logger
// ============================================================================

function createLogger(config: AppConfig) {
  const minLevel = config.LOG_LEVEL;
  const levels = ['debug', 'info', 'warn', 'error'] as const;
  const minIndex = levels.indexOf(minLevel);

  function log(level: typeof levels[number], msg: string, ctx: any = {}) {
    if (levels.indexOf(level) < minIndex) return;
    
    const payload = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...ctx,
    };

    if (config.MODE === 'DEV') {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log(JSON.stringify(payload));
    }
  }

  return {
    debug: (msg: string, ctx?: any) => log('debug', msg, ctx),
    info: (msg: string, ctx?: any) => log('info', msg, ctx),
    warn: (msg: string, ctx?: any) => log('warn', msg, ctx),
    error: (msg: string, ctx?: any) => log('error', msg, ctx),
  };
}

// ============================================================================
// DEV Mode: Mock Adapter
// ============================================================================

class MockClaudeAdapter implements ClaudeAdapter {
  private logger: ReturnType<typeof createLogger>;

  constructor(config: AppConfig) {
    this.logger = createLogger(config);
  }

  async extractReceiptFromImage(
    params: ExtractReceiptParams
  ): Promise<ReceiptOcrResult> {
    this.logger.debug('MockClaudeAdapter.extractReceiptFromImage called', {
      correlationId: params.correlationId,
      imageLength: params.imageBase64.length,
    });

    // Simulate API latency (200ms)
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Return deterministic mock data
    const mockResult: ReceiptOcrResult = {
      amountSatang: 35000, // 350.00 Baht
      currency: 'THB',
      vatAmountSatang: 2280, // 22.80 Baht (7% VAT)
      vendorName: 'ร้านกาแฟดี (Mock Cafe)',
      issueDate: '2026-01-22',
      rawText: 'Mock receipt text: Latte x2, Sandwich x1',
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

    this.logger.info('MockClaudeAdapter.extractReceiptFromImage success', {
      correlationId: params.correlationId,
      amountSatang: mockResult.amountSatang,
    });

    return mockResult;
  }
}

// ============================================================================
// PROD Mode: Real Claude API Adapter
// ============================================================================

class RealClaudeAdapter implements ClaudeAdapter {
  private logger: ReturnType<typeof createLogger>;
  private apiKey: string;

  constructor(config: AppConfig) {
    this.logger = createLogger(config);

    if (!config.CLAUDE_API_KEY) {
      throw new Error(
        'CLAUDE_API_KEY is required in PROD mode. Set it in .env or pass via config.'
      );
    }

    this.apiKey = config.CLAUDE_API_KEY;
  }

  async extractReceiptFromImage(
    params: ExtractReceiptParams
  ): Promise<ReceiptOcrResult> {
    this.logger.info('RealClaudeAdapter.extractReceiptFromImage request', {
      correlationId: params.correlationId,
    });

    const prompt = this.buildPrompt();
    const requestBody = this.buildRequest(params, prompt);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
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
        this.logger.error('Claude API error', {
          correlationId: params.correlationId,
          status: response.status,
          error: errorText,
        });
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const result = this.parseResponse(data, params.correlationId);

      this.logger.info('RealClaudeAdapter.extractReceiptFromImage success', {
        correlationId: params.correlationId,
        amountSatang: result.amountSatang,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      this.logger.error('RealClaudeAdapter.extractReceiptFromImage failed', {
        correlationId: params.correlationId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Build the prompt for Claude
   * 
   * Best practices:
   * - Be specific about output format (JSON)
   * - Request amounts in Satang (avoid decimals)
   * - Provide Thai context (VAT, date formats)
   * - Ask for confidence scores
   */
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

  /**
   * Build Claude API request body
   */
  private buildRequest(params: ExtractReceiptParams, prompt: string) {
    return {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: `image/${params.imageFormat || 'jpeg'}`,
                data: params.imageBase64,
              },
            },
          ],
        },
      ],
    };
  }

  /**
   * Parse Claude's response into ReceiptOcrResult
   */
  private parseResponse(data: any, correlationId: string): ReceiptOcrResult {
    const contentText = data.content?.[0]?.text || '{}';

    // Claude may wrap JSON in markdown code blocks, remove them
    const jsonText = contentText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      this.logger.error('Failed to parse Claude JSON', {
        correlationId,
        contentText,
      });
      throw new Error('Claude returned invalid JSON');
    }

    return {
      amountSatang: parsed.total_amount_satang || 0,
      currency: 'THB',
      vatAmountSatang: parsed.vat_amount_satang ?? null,
      vendorName: parsed.vendor_name ?? null,
      issueDate: parsed.issue_date ?? null,
      rawText: parsed.raw_text,
      confidence: parsed.confidence ?? 0,
      lineItems: parsed.line_items || [],
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Claude adapter based on configuration
 * 
 * @param config - App configuration with MODE = 'DEV' | 'PROD'
 * @returns ClaudeAdapter instance
 * 
 * @example
 * ```typescript
 * const config = { MODE: 'DEV', LOG_LEVEL: 'debug' };
 * const adapter = createClaudeAdapter(config);
 * const result = await adapter.extractReceiptFromImage({...});
 * ```
 */
export function createClaudeAdapter(config: AppConfig): ClaudeAdapter {
  if (config.MODE === 'DEV') {
    return new MockClaudeAdapter(config);
  }
  return new RealClaudeAdapter(config);
}

// ============================================================================
// Exports
// ============================================================================

export { MockClaudeAdapter, RealClaudeAdapter };
export type { ClaudeAdapter, ReceiptOcrResult, ExtractReceiptParams };
