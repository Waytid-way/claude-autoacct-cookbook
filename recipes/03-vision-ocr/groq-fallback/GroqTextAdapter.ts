/**
 * Groq Text Adapter
 * 
 * Parses raw OCR text into structured data using Groq's fast LLM.
 * Used for simple receipts where raw text is already extracted.
 * 
 * Flow:
 *   PaddleOCR/Google Vision → Raw text → Groq parsing → Structured JSON
 * 
 * Cost: ~฿0.05/receipt (vs Claude ฿0.50)
 */

import type { OcrResult, OcrInput } from './types';

export interface GroqConfig {
  apiKey: string;
  model?: string; // Default: mixtral-8x7b-32768
  temperature?: number;
}

export class GroqTextAdapter {
  private apiKey: string;
  private apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private model: string;
  private temperature: number;

  constructor(config: GroqConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'mixtral-8x7b-32768';
    this.temperature = config.temperature || 0.1; // Low temp for structured output
  }

  /**
   * Parse raw OCR text into structured receipt data
   */
  async parseReceiptText(rawText: string, correlationId: string): Promise<OcrResult> {
    const prompt = this.buildPrompt(rawText);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a Thai receipt parser. Extract structured data from OCR text.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: this.temperature,
          max_tokens: 512,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const result = this.parseResponse(data);

      return result;
    } catch (error) {
      throw new Error(`Groq parsing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Build parsing prompt
   */
  private buildPrompt(rawText: string): string {
    return `Parse this Thai receipt OCR text into structured JSON.

**OCR Text:**
${rawText}

**Instructions:**
1. Extract total amount (convert to Satang: 1 Baht = 100 Satang)
2. Extract VAT amount (if shown, typically 7%)
3. Extract vendor/shop name
4. Extract date (convert Buddhist Era to Christian Era: BE - 543)

**Output JSON format (no markdown, just JSON):**
{
  "total_amount_satang": number,
  "vat_amount_satang": number | null,
  "vendor_name": string | null,
  "issue_date": "YYYY-MM-DD" | null,
  "confidence": number (0.0-1.0)
}

Return ONLY valid JSON, no other text.`;
  }

  /**
   * Parse Groq response
   */
  private parseResponse(data: any): OcrResult {
    const content = data.choices?.[0]?.message?.content || '{}';

    // Remove markdown code blocks if present
    const jsonText = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      throw new Error('Groq returned invalid JSON');
    }

    return {
      amountSatang: parsed.total_amount_satang || 0,
      currency: 'THB',
      vatAmountSatang: parsed.vat_amount_satang ?? null,
      vendorName: parsed.vendor_name ?? null,
      issueDate: parsed.issue_date ?? null,
      rawText: content,
      confidence: parsed.confidence ?? 0.7, // Groq generally less confident
    };
  }
}
