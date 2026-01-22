/**
 * Type definitions for Receipt OCR with Claude Vision
 * 
 * These types ensure type safety across DEV and PROD modes.
 */

/**
 * Configuration for the Claude adapter
 */
export interface AppConfig {
  MODE: 'DEV' | 'PROD';
  CLAUDE_API_KEY?: string;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * OCR result from receipt image
 * 
 * All monetary amounts are in Satang (1 Baht = 100 Satang)
 * to avoid floating-point precision issues.
 */
export interface ReceiptOcrResult {
  /** Total amount in Satang (integer) */
  amountSatang: number;
  
  /** Currency code (always THB for Thai receipts) */
  currency: 'THB';
  
  /** VAT amount in Satang, null if not present */
  vatAmountSatang: number | null;
  
  /** Merchant/vendor name */
  vendorName: string | null;
  
  /** Issue date in ISO 8601 format (YYYY-MM-DD) */
  issueDate: string | null;
  
  /** Raw OCR text (for debugging) */
  rawText?: string;
  
  /** OCR confidence score (0.0 - 1.0) */
  confidence?: number;
  
  /** Line items (optional, if extracted) */
  lineItems?: ReceiptLineItem[];
}

/**
 * Individual line item from receipt
 */
export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unitPriceSatang: number;
  totalSatang: number;
}

/**
 * Parameters for OCR extraction
 */
export interface ExtractReceiptParams {
  /** Unique correlation ID for tracking */
  correlationId: string;
  
  /** Base64-encoded image data */
  imageBase64: string;
  
  /** Image format (default: jpeg) */
  imageFormat?: 'jpeg' | 'png' | 'gif' | 'webp';
}

/**
 * Claude adapter interface
 * 
 * Implementations:
 * - MockClaudeAdapter (DEV mode)
 * - RealClaudeAdapter (PROD mode)
 */
export interface ClaudeAdapter {
  extractReceiptFromImage(params: ExtractReceiptParams): Promise<ReceiptOcrResult>;
}

/**
 * Logger context for structured logging
 */
export interface LogContext {
  correlationId?: string;
  scope?: string;
  [key: string]: any;
}

/**
 * Custom error for OCR failures
 */
export class OcrError extends Error {
  constructor(
    message: string,
    public context: { correlationId?: string; cause?: Error }
  ) {
    super(message);
    this.name = 'OcrError';
  }
}
