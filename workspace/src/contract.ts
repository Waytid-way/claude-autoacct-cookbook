import type { ReceiptOcrResult } from '../../recipes/03-vision-ocr/receipt-extraction/types.ts';

export type Stage = 'ocr' | 'validated' | 'mapped' | 'exported';
export type GateVerdict = 'pass' | 'needs-review';

export interface ValidatedReceipt extends ReceiptOcrResult {
  correlationId: string;
  vatCheckOk: boolean;
}

export interface JournalLine {
  accountCode: string;
  amountSatang: number;
  side: 'DEBIT' | 'CREDIT';
}

export interface JournalEntry {
  correlationId: string;
  txDate: string;
  lines: JournalLine[];
}

export interface GateDecision {
  verdict: GateVerdict;
  reasons: string[];
}

export interface ExportArtifact {
  correlationId: string;
  vendorName: string | null;
  issueDate: string | null;
  totalBaht: number;
  vatBaht: number | null;
  journal: JournalEntry;
  ocrModel: string;
}
