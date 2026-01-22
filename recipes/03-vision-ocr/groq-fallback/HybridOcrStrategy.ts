/**
 * Hybrid OCR Strategy
 * 
 * Orchestrates the decision flow:
 * 1. Classify receipt (simple vs complex)
 * 2. Route to appropriate adapter
 * 3. Handle fallback if needed
 * 4. Track metrics
 */

import { SimpleReceiptDetector } from './SimpleReceiptDetector';
import { GroqTextAdapter } from './GroqTextAdapter';
import type { ClaudeAdapter } from '../receipt-extraction/claudeAdapter';
import type { 
  OcrResult, 
  OcrInput, 
  ReceiptClassification,
  OcrAttempt,
  HybridMetrics,
  HybridStrategyConfig,
} from './types';

/**
 * Hybrid OCR Strategy
 * 
 * Combines multiple OCR providers for cost optimization:
 * - Simple receipts → Groq text parsing (cheap)
 * - Complex receipts → Claude Vision (accurate)
 * - Automatic fallback on failures
 */
export class HybridOcrStrategy {
  private detector: SimpleReceiptDetector;
  private groqAdapter: GroqTextAdapter;
  private claudeAdapter: ClaudeAdapter;
  private config: HybridStrategyConfig;
  private metrics: HybridMetrics;
  private attempts: OcrAttempt[] = [];

  constructor(
    claudeAdapter: ClaudeAdapter,
    groqAdapter: GroqTextAdapter,
    config?: Partial<HybridStrategyConfig>
  ) {
    this.claudeAdapter = claudeAdapter;
    this.groqAdapter = groqAdapter;
    this.detector = new SimpleReceiptDetector();
    
    this.config = {
      simpleConfidenceThreshold: 0.85,
      enableFallback: true,
      maxGroqRetries: 1,
      enableMetrics: true,
      ...config,
    };

    this.metrics = this.initMetrics();
  }

  /**
   * Extract receipt data using hybrid strategy
   */
  async extractReceipt(input: OcrInput): Promise<OcrResult> {
    const { imageBase64, correlationId } = input;

    console.log(`[Hybrid] Starting OCR for ${correlationId}`);

    // Step 1: Classify receipt
    const classification = await this.classifyReceipt(imageBase64);
    console.log(`[Hybrid] Classification: ${classification.isSimple ? 'SIMPLE' : 'COMPLEX'} (confidence: ${classification.confidence.toFixed(2)})`);

    // Step 2: Route to appropriate adapter
    if (classification.isSimple && classification.confidence >= this.config.simpleConfidenceThreshold) {
      return await this.processSimpleReceipt(input, classification);
    } else {
      return await this.processComplexReceipt(input, classification);
    }
  }

  /**
   * Process simple receipt (Groq path)
   */
  private async processSimpleReceipt(
    input: OcrInput,
    classification: ReceiptClassification
  ): Promise<OcrResult> {
    const { imageBase64, correlationId } = input;
    this.metrics.simpleCount++;

    console.log(`[Hybrid] Using Groq for simple receipt`);

    try {
      // Step 1: Extract raw text with PaddleOCR (or Google Vision)
      // For this example, we'll simulate with a mock extractor
      const rawText = await this.extractRawText(imageBase64);

      // Step 2: Parse with Groq
      const startTime = Date.now();
      const result = await this.groqAdapter.parseReceiptText(rawText, correlationId);
      const duration = Date.now() - startTime;

      this.recordAttempt({
        provider: 'groq',
        success: true,
        cost: 0.05,
        duration,
        result,
      });

      console.log(`[Hybrid] Groq success in ${duration}ms`);
      return result;

    } catch (error) {
      console.warn(`[Hybrid] Groq failed: ${(error as Error).message}`);

      this.recordAttempt({
        provider: 'groq',
        success: false,
        cost: 0,
        duration: 0,
        error: (error as Error).message,
      });

      // Fallback to Claude
      if (this.config.enableFallback) {
        console.log(`[Hybrid] Falling back to Claude...`);
        this.metrics.claudeFallbackRate++;
        return await this.processComplexReceipt(input, classification);
      } else {
        throw error;
      }
    }
  }

  /**
   * Process complex receipt (Claude path)
   */
  private async processComplexReceipt(
    input: OcrInput,
    classification: ReceiptClassification
  ): Promise<OcrResult> {
    this.metrics.complexCount++;

    console.log(`[Hybrid] Using Claude for complex receipt`);

    const startTime = Date.now();
    const result = await this.claudeAdapter.extractReceiptFromImage(input);
    const duration = Date.now() - startTime;

    this.recordAttempt({
      provider: 'claude',
      success: true,
      cost: 0.50,
      duration,
      result,
    });

    console.log(`[Hybrid] Claude success in ${duration}ms`);
    return result;
  }

  /**
   * Classify receipt as simple or complex
   */
  private async classifyReceipt(imageBase64: string): Promise<ReceiptClassification> {
    return await this.detector.classify(imageBase64);
  }

  /**
   * Extract raw text from image
   * (In production: use PaddleOCR or Google Vision)
   */
  private async extractRawText(imageBase64: string): Promise<string> {
    // Mock implementation
    // In production: call PaddleOCR or Google Vision API
    return `7-ELEVEN
สาขา 12345
กรุงเทพฯ

กาแฟ            45.00
ขนมปัง          35.00
────────────────
รวม             80.00
ภาษี 7%          5.60
────────────────
รวมทั้งสิ้น      85.60

วันที่ 22/01/2569
เวลา 14:35`;
  }

  /**
   * Record OCR attempt for metrics
   */
  private recordAttempt(attempt: OcrAttempt): void {
    if (!this.config.enableMetrics) return;

    this.attempts.push(attempt);
    this.metrics.totalReceipts++;
    this.metrics.totalCost += attempt.cost;
    this.updateMetrics();
  }

  /**
   * Update calculated metrics
   */
  private updateMetrics(): void {
    const groqAttempts = this.attempts.filter(a => a.provider === 'groq');
    const groqSuccess = groqAttempts.filter(a => a.success).length;
    
    this.metrics.groqSuccessRate = groqAttempts.length > 0 
      ? groqSuccess / groqAttempts.length 
      : 0;

    this.metrics.avgCostPerReceipt = this.metrics.totalReceipts > 0
      ? this.metrics.totalCost / this.metrics.totalReceipts
      : 0;

    // Calculate savings vs Claude-only
    const claudeOnlyCost = this.metrics.totalReceipts * 0.50;
    this.metrics.savingsVsClaudeOnly = claudeOnlyCost - this.metrics.totalCost;

    // Manual review rate (low confidence results)
    const lowConfidenceCount = this.attempts.filter(
      a => a.result && (a.result.confidence || 0) < 0.95
    ).length;
    this.metrics.manualReviewRate = this.metrics.totalReceipts > 0
      ? lowConfidenceCount / this.metrics.totalReceipts
      : 0;
  }

  /**
   * Get current metrics
   */
  getMetrics(): HybridMetrics {
    return { ...this.metrics };
  }

  /**
   * Get detailed attempt history
   */
  getAttempts(): OcrAttempt[] {
    return [...this.attempts];
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = this.initMetrics();
    this.attempts = [];
  }

  /**
   * Initialize metrics object
   */
  private initMetrics(): HybridMetrics {
    return {
      totalReceipts: 0,
      simpleCount: 0,
      complexCount: 0,
      groqSuccessRate: 0,
      claudeFallbackRate: 0,
      totalCost: 0,
      avgCostPerReceipt: 0,
      savingsVsClaudeOnly: 0,
      manualReviewRate: 0,
    };
  }

  /**
   * Print metrics summary
   */
  printMetrics(): void {
    const m = this.metrics;
    
    console.log('\n' + '═'.repeat(50));
    console.log('📊 HYBRID OCR METRICS');
    console.log('═'.repeat(50));
    console.log(`Total Receipts:     ${m.totalReceipts}`);
    console.log(`├─ Simple (Groq):   ${m.simpleCount} (${(m.simpleCount/m.totalReceipts*100).toFixed(0)}%)`);
    console.log(`└─ Complex (Claude): ${m.complexCount} (${(m.complexCount/m.totalReceipts*100).toFixed(0)}%)`);
    console.log('');
    console.log(`Groq Success Rate:  ${(m.groqSuccessRate * 100).toFixed(0)}%`);
    console.log(`Claude Fallback:    ${m.claudeFallbackRate} times`);
    console.log('');
    console.log(`Total Cost:         ฿${m.totalCost.toFixed(2)}`);
    console.log(`Avg Cost/Receipt:   ฿${m.avgCostPerReceipt.toFixed(2)}`);
    console.log(`Savings vs Claude:  ฿${m.savingsVsClaudeOnly.toFixed(2)} (${(m.savingsVsClaudeOnly/(m.totalReceipts*0.50)*100).toFixed(0)}%)`);
    console.log('');
    console.log(`Manual Review Rate: ${(m.manualReviewRate * 100).toFixed(0)}%`);
    console.log('═'.repeat(50) + '\n');
  }
}
