/**
 * Example: Hybrid OCR Strategy
 * 
 * Demonstrates cost optimization with Groq + Claude
 */

import { HybridOcrStrategy } from './HybridOcrStrategy';
import { GroqTextAdapter } from './GroqTextAdapter';
import { createClaudeAdapter } from '../receipt-extraction/claudeAdapter';
import type { AppConfig } from '../receipt-extraction/types';

// ============================================================================
// Configuration
// ============================================================================

const config: AppConfig = {
  MODE: (process.env.APP_MODE as 'DEV' | 'PROD') || 'DEV',
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
  LOG_LEVEL: 'info',
};

const groqConfig = {
  apiKey: process.env.GROQ_API_KEY || 'mock-key',
};

console.log(`\n🚀 Running Hybrid OCR Strategy Demo`);
console.log(`Mode: ${config.MODE}`);
console.log(`Claude: ${config.MODE === 'DEV' ? 'Mock' : 'Real API'}`);
console.log(`Groq: ${groqConfig.apiKey === 'mock-key' ? 'Mock' : 'Real API'}\n`);

// ============================================================================
// Setup Adapters
// ============================================================================

const claudeAdapter = createClaudeAdapter(config);
const groqAdapter = new GroqTextAdapter(groqConfig);

const strategy = new HybridOcrStrategy(
  claudeAdapter as any,
  groqAdapter,
  {
    simpleConfidenceThreshold: 0.85,
    enableFallback: true,
    enableMetrics: true,
  }
);

// ============================================================================
// Demo Receipts
// ============================================================================

const mockReceipts = [
  {
    id: '001',
    name: '7-Eleven (Simple)',
    imageBase64: 'mock-7eleven-receipt',
  },
  {
    id: '002',
    name: 'Tesco Lotus (Simple)',
    imageBase64: 'mock-tesco-receipt',
  },
  {
    id: '003',
    name: 'Local Restaurant (Complex)',
    imageBase64: 'mock-restaurant-receipt',
  },
  {
    id: '004',
    name: 'Handwritten (Complex)',
    imageBase64: 'mock-handwritten-receipt',
  },
  {
    id: '005',
    name: 'Faded Receipt (Complex)',
    imageBase64: 'mock-faded-receipt',
  },
];

// ============================================================================
// Main Demo
// ============================================================================

async function main() {
  console.log('📄 Processing receipts...\n');

  for (const receipt of mockReceipts) {
    console.log(`Processing: ${receipt.name} (ID: ${receipt.id})`);
    
    try {
      const result = await strategy.extractReceipt({
        imageBase64: receipt.imageBase64,
        correlationId: receipt.id,
      });

      console.log(`  ✅ Success:`);
      console.log(`     Amount: ฿${(result.amountSatang / 100).toFixed(2)}`);
      console.log(`     VAT: ฿${result.vatAmountSatang ? (result.vatAmountSatang / 100).toFixed(2) : 'N/A'}`);
      console.log(`     Vendor: ${result.vendorName || 'Unknown'}`);
      console.log(`     Confidence: ${((result.confidence || 0) * 100).toFixed(0)}%`);
    } catch (error) {
      console.log(`  ❌ Error: ${(error as Error).message}`);
    }
    
    console.log('');
  }

  // ============================================================================
  // Show Metrics
  // ============================================================================

  strategy.printMetrics();

  // ============================================================================
  // Detailed Analysis
  // ============================================================================

  const attempts = strategy.getAttempts();
  
  console.log('📋 Detailed Attempt Log:');
  console.log('─'.repeat(80));
  console.log('Provider    | Success | Cost    | Duration | Confidence');
  console.log('─'.repeat(80));
  
  attempts.forEach((attempt, idx) => {
    const provider = attempt.provider.padEnd(11);
    const success = (attempt.success ? '✅' : '❌').padEnd(8);
    const cost = `฿${attempt.cost.toFixed(2)}`.padEnd(8);
    const duration = `${attempt.duration}ms`.padEnd(9);
    const confidence = attempt.result 
      ? `${((attempt.result.confidence || 0) * 100).toFixed(0)}%`
      : 'N/A';
    
    console.log(`${provider} | ${success} | ${cost} | ${duration} | ${confidence}`);
  });
  console.log('─'.repeat(80) + '\n');

  // ============================================================================
  // Cost Comparison
  // ============================================================================

  const metrics = strategy.getMetrics();
  const claudeOnlyCost = metrics.totalReceipts * 0.50;
  const hybridCost = metrics.totalCost;
  const savings = metrics.savingsVsClaudeOnly;
  const savingsPercent = (savings / claudeOnlyCost) * 100;

  console.log('💰 Cost Comparison:');
  console.log('─'.repeat(50));
  console.log(`Claude-only (${metrics.totalReceipts} receipts):`);
  console.log(`  ${metrics.totalReceipts} × ฿0.50 = ฿${claudeOnlyCost.toFixed(2)}`);
  console.log('');
  console.log(`Hybrid strategy:`);
  console.log(`  ${metrics.simpleCount} simple × ฿0.05 = ฿${(metrics.simpleCount * 0.05).toFixed(2)}`);
  console.log(`  ${metrics.complexCount} complex × ฿0.50 = ฿${(metrics.complexCount * 0.50).toFixed(2)}`);
  console.log(`  Total: ฿${hybridCost.toFixed(2)}`);
  console.log('');
  console.log(`💚 Savings: ฿${savings.toFixed(2)} (${savingsPercent.toFixed(0)}%)`);
  console.log('─'.repeat(50) + '\n');

  // ============================================================================
  // Recommendations
  // ============================================================================

  console.log('💡 Recommendations:');
  
  if (metrics.groqSuccessRate < 0.85) {
    console.log('  ⚠️  Groq success rate is low (<85%)');
    console.log('     Consider routing more receipts to Claude');
  } else {
    console.log('  ✅ Groq success rate is good (>85%)');
  }

  if (metrics.manualReviewRate > 0.15) {
    console.log('  ⚠️  Manual review rate is high (>15%)');
    console.log('     Consider lowering confidence threshold');
  } else {
    console.log('  ✅ Manual review rate is acceptable (<15%)');
  }

  if (savingsPercent < 50) {
    console.log('  ⚠️  Savings are lower than expected (<50%)');
    console.log('     Most receipts may be complex - review classification');
  } else {
    console.log('  ✅ Good cost savings achieved!');
  }

  console.log('');
}

// ============================================================================
// Run
// ============================================================================

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
