import type { ReceiptOcrResult } from '../../recipes/03-vision-ocr/receipt-extraction/types.ts';

export type Stage = 'ocr' | 'validated' | 'mapped' | 'exported';
export type GateVerdict = 'pass' | 'needs-review';

export interface ValidatedReceipt extends ReceiptOcrResult {
  correlationId: string;
  baseAmountSatang?: number | null; // pre-VAT base when OCR returns it
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
  totalSatang: number; // authoritative — Baht below is display-only
  vatSatang: number | null; // authoritative
  totalBaht: number; // display-only, derived
  vatBaht: number | null; // display-only, derived
  journal: JournalEntry;
  ocrModel: string;
}
