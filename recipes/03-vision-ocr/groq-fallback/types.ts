/**
 * Type definitions for Groq OCR Fallback & Hybrid Strategy
 */

import { OcrResult, OcrInput } from '../receipt-extraction/types';

/**
 * Receipt classification result
 */
export interface ReceiptClassification {
  /** Is this a simple receipt? */
  isSimple: boolean;
  
  /** Confidence in classification (0.0 - 1.0) */
  confidence: number;
  
  /** Reasoning (for debugging) */
  reason?: string;
  
  /** Features detected */
  features?: {
    brightness: number;      // 0-1, higher = clearer
    textDensity: number;     // 0-1, higher = more text
    hasStandardFormat: boolean; // Matches known templates
    hasHandwriting: boolean;
    hasFading: boolean;
  };
}

/**
 * OCR attempt result (for tracking)
 */
export interface OcrAttempt {
  provider: 'claude' | 'groq' | 'paddle';
  success: boolean;
  cost: number;              // in Baht
  duration: number;          // in milliseconds
  result?: OcrResult;
  error?: string;
}

/**
 * Hybrid OCR metrics
 */
export interface HybridMetrics {
  totalReceipts: number;
  simpleCount: number;
  complexCount: number;
  groqSuccessRate: number;
  claudeFallbackRate: number;
  totalCost: number;
  avgCostPerReceipt: number;
  savingsVsClaudeOnly: number;
  manualReviewRate: number;
}

/**
 * Strategy configuration
 */
export interface HybridStrategyConfig {
  /** Minimum confidence to classify as simple */
  simpleConfidenceThreshold: number; // default: 0.85
  
  /** Enable Groq fallback to Claude */
  enableFallback: boolean; // default: true
  
  /** Maximum Groq retries before fallback */
  maxGroqRetries: number; // default: 1
  
  /** Track metrics */
  enableMetrics: boolean; // default: true
}

/**
 * Re-export from receipt-extraction
 */
export type { OcrResult, OcrInput };
