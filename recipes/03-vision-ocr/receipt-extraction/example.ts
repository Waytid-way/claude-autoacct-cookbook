/**
 * Example: Using Claude Adapter for Receipt OCR
 * 
 * This demonstrates how to use the adapter in both DEV and PROD modes.
 * 
 * Run:
 *   DEV:  APP_MODE=DEV bun run example.ts
 *   PROD: CLAUDE_API_KEY=sk-xxx APP_MODE=PROD bun run example.ts
 */

import { createClaudeAdapter } from './claudeAdapter';
import type { AppConfig } from './types';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Configuration
// ============================================================================

const config: AppConfig = {
  MODE: (process.env.APP_MODE as 'DEV' | 'PROD') || 'DEV',
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
  LOG_LEVEL: 'info',
};

console.log(`Running in ${config.MODE} mode...\n`);

// ============================================================================
// Helper: Load Image as Base64
// ============================================================================

function loadImageAsBase64(filename: string): string {
  const filepath = join(__dirname, filename);
  try {
    const buffer = readFileSync(filepath);
    return buffer.toString('base64');
  } catch (err) {
    console.error(`Failed to load image: ${filename}`);
    console.error(err);
    // Return a tiny 1x1 PNG as fallback
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

// ============================================================================
// Main Example
// ============================================================================

async function main() {
  const adapter = createClaudeAdapter(config);

  console.log('📸 Loading receipt image...');
  const imageBase64 = loadImageAsBase64('example-receipt.jpg');
  console.log(`Image loaded: ${imageBase64.length} bytes\n`);

  console.log('🔍 Extracting data with Claude Vision...');
  const startTime = Date.now();

  const result = await adapter.extractReceiptFromImage({
    correlationId: `example-${Date.now()}`,
    imageBase64,
  });

  const duration = Date.now() - startTime;
  console.log(`✅ Extraction completed in ${duration}ms\n`);

  // ============================================================================
  // Display Results
  // ============================================================================

  console.log('📊 OCR Results:');
  console.log('─'.repeat(50));
  console.log(`Vendor:      ${result.vendorName || 'N/A'}`);
  console.log(`Date:        ${result.issueDate || 'N/A'}`);
  console.log(`Total:       ฿${(result.amountSatang / 100).toFixed(2)} (${result.amountSatang} satang)`);
  
  if (result.vatAmountSatang !== null) {
    console.log(`VAT (7%):    ฿${(result.vatAmountSatang / 100).toFixed(2)} (${result.vatAmountSatang} satang)`);
  } else {
    console.log(`VAT:         Not shown`);
  }

  console.log(`Confidence:  ${((result.confidence || 0) * 100).toFixed(1)}%`);
  console.log('─'.repeat(50));

  if (result.lineItems && result.lineItems.length > 0) {
    console.log('\n🧾 Line Items:');
    result.lineItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.description}`);
      console.log(`     Qty: ${item.quantity} × ฿${(item.unitPriceSatang / 100).toFixed(2)} = ฿${(item.totalSatang / 100).toFixed(2)}`);
    });
  }

  if (result.rawText) {
    console.log('\n📝 Raw Text:');
    console.log(result.rawText);
  }

  // ============================================================================
  // Validation Check
  // ============================================================================

  console.log('\n🔎 Validation:');
  const needsReview = (result.confidence || 0) < 0.95 || result.vatAmountSatang === null;
  
  if (needsReview) {
    console.log('⚠️  Manual review recommended:');
    if ((result.confidence || 0) < 0.95) {
      console.log('   - Low confidence score');
    }
    if (result.vatAmountSatang === null) {
      console.log('   - Missing VAT data');
    }
  } else {
    console.log('✅ Data quality looks good, ready for export');
  }
}

// ============================================================================
// Run
// ============================================================================

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
