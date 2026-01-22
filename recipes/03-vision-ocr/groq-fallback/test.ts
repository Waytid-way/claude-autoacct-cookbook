/**
 * Unit tests for Groq OCR Fallback & Hybrid Strategy
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { SimpleReceiptDetector } from './SimpleReceiptDetector';
import { GroqTextAdapter } from './GroqTextAdapter';
import { HybridOcrStrategy } from './HybridOcrStrategy';
import { MockClaudeAdapter } from '../receipt-extraction/claudeAdapter';

// ============================================================================
// SimpleReceiptDetector Tests
// ============================================================================

describe('SimpleReceiptDetector', () => {
  let detector: SimpleReceiptDetector;

  beforeEach(() => {
    detector = new SimpleReceiptDetector();
  });

  test('should classify clear receipt as simple', async () => {
    const mockClearImage = 'base64-clear-receipt-data-here';
    const result = await detector.classify(mockClearImage);

    expect(result.isSimple).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('should include classification features', async () => {
    const mockImage = 'base64-data';
    const result = await detector.classify(mockImage);

    expect(result.features).toBeDefined();
    expect(result.features?.brightness).toBeGreaterThanOrEqual(0);
    expect(result.features?.textDensity).toBeGreaterThanOrEqual(0);
    expect(typeof result.features?.hasStandardFormat).toBe('boolean');
  });

  test('should provide reasoning', async () => {
    const mockImage = 'base64-data';
    const result = await detector.classify(mockImage);

    expect(result.reason).toBeDefined();
    expect(typeof result.reason).toBe('string');
  });
});

// ============================================================================
// GroqTextAdapter Tests
// ============================================================================

describe('GroqTextAdapter', () => {
  test('should initialize with config', () => {
    const adapter = new GroqTextAdapter({
      apiKey: 'test-key',
      model: 'mixtral-8x7b-32768',
    });

    expect(adapter).toBeDefined();
  });

  // Note: Real API tests would require GROQ_API_KEY
  test.skip('should parse receipt text (requires API key)', async () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return;

    const adapter = new GroqTextAdapter({ apiKey });
    const rawText = `7-ELEVEN
กาแฟ 45.00
รวม 45.00`;

    const result = await adapter.parseReceiptText(rawText, 'test-001');

    expect(result.amountSatang).toBeGreaterThan(0);
    expect(result.currency).toBe('THB');
  });
});

// ============================================================================
// HybridOcrStrategy Tests
// ============================================================================

describe('HybridOcrStrategy', () => {
  let strategy: HybridOcrStrategy;
  let mockClaudeAdapter: MockClaudeAdapter;
  let mockGroqAdapter: GroqTextAdapter;

  beforeEach(() => {
    mockClaudeAdapter = new MockClaudeAdapter({ MODE: 'DEV', LOG_LEVEL: 'error' });
    mockGroqAdapter = new GroqTextAdapter({ apiKey: 'mock-key' });
    
    strategy = new HybridOcrStrategy(
      mockClaudeAdapter as any,
      mockGroqAdapter,
      {
        simpleConfidenceThreshold: 0.85,
        enableFallback: true,
        enableMetrics: true,
      }
    );
  });

  test('should initialize with default config', () => {
    expect(strategy).toBeDefined();
    const metrics = strategy.getMetrics();
    expect(metrics.totalReceipts).toBe(0);
  });

  test('should track metrics after extraction', async () => {
    const mockImage = 'base64-data';
    
    await strategy.extractReceipt({
      imageBase64: mockImage,
      correlationId: 'test-001',
    });

    const metrics = strategy.getMetrics();
    expect(metrics.totalReceipts).toBe(1);
    expect(metrics.totalCost).toBeGreaterThan(0);
  });

  test('should reset metrics', () => {
    strategy.resetMetrics();
    const metrics = strategy.getMetrics();
    
    expect(metrics.totalReceipts).toBe(0);
    expect(metrics.totalCost).toBe(0);
  });

  test('should provide attempt history', async () => {
    const mockImage = 'base64-data';
    
    await strategy.extractReceipt({
      imageBase64: mockImage,
      correlationId: 'test-001',
    });

    const attempts = strategy.getAttempts();
    expect(attempts.length).toBeGreaterThan(0);
    expect(attempts[0]).toHaveProperty('provider');
    expect(attempts[0]).toHaveProperty('success');
    expect(attempts[0]).toHaveProperty('cost');
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Hybrid Strategy Integration', () => {
  test('should process multiple receipts and show savings', async () => {
    const mockClaudeAdapter = new MockClaudeAdapter({ MODE: 'DEV', LOG_LEVEL: 'error' });
    const mockGroqAdapter = new GroqTextAdapter({ apiKey: 'mock-key' });
    
    const strategy = new HybridOcrStrategy(
      mockClaudeAdapter as any,
      mockGroqAdapter
    );

    // Process 10 receipts
    for (let i = 0; i < 10; i++) {
      await strategy.extractReceipt({
        imageBase64: `mock-image-${i}`,
        correlationId: `test-${i}`,
      });
    }

    const metrics = strategy.getMetrics();
    
    expect(metrics.totalReceipts).toBe(10);
    expect(metrics.avgCostPerReceipt).toBeLessThan(0.50); // Should be cheaper than Claude-only
    expect(metrics.savingsVsClaudeOnly).toBeGreaterThan(0);
  });
});
