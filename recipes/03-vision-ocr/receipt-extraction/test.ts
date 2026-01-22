/**
 * Unit tests for Claude Receipt OCR Adapter
 * 
 * Run:
 *   DEV mode:  APP_MODE=DEV bun test test.ts
 *   PROD mode: CLAUDE_API_KEY=sk-xxx APP_MODE=PROD bun test test.ts
 */

import { describe, test, expect } from 'bun:test';
import { createClaudeAdapter } from './claudeAdapter';
import type { AppConfig } from './types';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockImage(): string {
  // Return a tiny 1x1 transparent PNG as base64
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

// ============================================================================
// DEV Mode Tests
// ============================================================================

describe('ClaudeAdapter - DEV Mode', () => {
  const config: AppConfig = {
    MODE: 'DEV',
    LOG_LEVEL: 'error', // Suppress logs during tests
  };

  test('should return mock data', async () => {
    const adapter = createClaudeAdapter(config);
    const result = await adapter.extractReceiptFromImage({
      correlationId: 'test-001',
      imageBase64: createMockImage(),
    });

    expect(result.amountSatang).toBe(35000);
    expect(result.currency).toBe('THB');
    expect(result.vatAmountSatang).toBe(2280);
    expect(result.vendorName).toContain('Mock');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  test('should return consistent data (deterministic)', async () => {
    const adapter = createClaudeAdapter(config);
    
    const result1 = await adapter.extractReceiptFromImage({
      correlationId: 'test-002',
      imageBase64: createMockImage(),
    });

    const result2 = await adapter.extractReceiptFromImage({
      correlationId: 'test-003',
      imageBase64: createMockImage(),
    });

    expect(result1.amountSatang).toBe(result2.amountSatang);
    expect(result1.vatAmountSatang).toBe(result2.vatAmountSatang);
  });

  test('should include line items', async () => {
    const adapter = createClaudeAdapter(config);
    const result = await adapter.extractReceiptFromImage({
      correlationId: 'test-004',
      imageBase64: createMockImage(),
    });

    expect(result.lineItems).toBeDefined();
    expect(result.lineItems!.length).toBeGreaterThan(0);
    expect(result.lineItems![0].description).toBeDefined();
  });

  test('should simulate latency', async () => {
    const adapter = createClaudeAdapter(config);
    const start = Date.now();
    
    await adapter.extractReceiptFromImage({
      correlationId: 'test-005',
      imageBase64: createMockImage(),
    });

    const duration = Date.now() - start;
    expect(duration).toBeGreaterThanOrEqual(200); // Mock has 200ms delay
  });
});

// ============================================================================
// PROD Mode Tests (requires API key)
// ============================================================================

describe('ClaudeAdapter - PROD Mode', () => {
  const apiKey = process.env.CLAUDE_API_KEY;

  // Skip if no API key
  if (!apiKey) {
    test.skip('Skipping PROD tests (no CLAUDE_API_KEY)', () => {});
    return;
  }

  const config: AppConfig = {
    MODE: 'PROD',
    CLAUDE_API_KEY: apiKey,
    LOG_LEVEL: 'error',
  };

  test('should call real Claude API', async () => {
    const adapter = createClaudeAdapter(config);
    const result = await adapter.extractReceiptFromImage({
      correlationId: 'prod-test-001',
      imageBase64: createMockImage(),
    });

    // Should return data (even if low quality from 1x1 image)
    expect(result.amountSatang).toBeGreaterThanOrEqual(0);
    expect(result.currency).toBe('THB');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  }, 10000); // 10s timeout for API call

  test('should handle missing API key', () => {
    const badConfig: AppConfig = {
      MODE: 'PROD',
      // No API key!
      LOG_LEVEL: 'error',
    };

    expect(() => createClaudeAdapter(badConfig)).toThrow('CLAUDE_API_KEY');
  });
});

// ============================================================================
// Data Validation Tests
// ============================================================================

describe('ReceiptOcrResult Validation', () => {
  const config: AppConfig = {
    MODE: 'DEV',
    LOG_LEVEL: 'error',
  };

  test('amounts should be in Satang (integers)', async () => {
    const adapter = createClaudeAdapter(config);
    const result = await adapter.extractReceiptFromImage({
      correlationId: 'test-validation-001',
      imageBase64: createMockImage(),
    });

    expect(Number.isInteger(result.amountSatang)).toBe(true);
    if (result.vatAmountSatang !== null) {
      expect(Number.isInteger(result.vatAmountSatang)).toBe(true);
    }
  });

  test('VAT can be null', async () => {
    const adapter = createClaudeAdapter(config);
    const result = await adapter.extractReceiptFromImage({
      correlationId: 'test-validation-002',
      imageBase64: createMockImage(),
    });

    // Mock has VAT, but null should be allowed
    expect(typeof result.vatAmountSatang === 'number' || result.vatAmountSatang === null).toBe(true);
  });

  test('date should be ISO 8601 format', async () => {
    const adapter = createClaudeAdapter(config);
    const result = await adapter.extractReceiptFromImage({
      correlationId: 'test-validation-003',
      imageBase64: createMockImage(),
    });

    if (result.issueDate) {
      expect(result.issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
