import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import type { ReceiptOcrResult } from '../../recipes/03-vision-ocr/receipt-extraction/types.ts';
import { runPipeline } from './pipeline.ts';

// Thin wrapper: CLI เดิม — config + default OCR แล้วมอบงานให้ runPipeline
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_MODE = process.env.APP_MODE ?? 'DEV';
const OCR_MODEL = process.env.OCR_MODEL ?? 'google/gemini-2.5-flash-lite'; // PROD ใช้ตัวเสียเงิน (decision-log); :free แค่ DEV

interface OcrJson {
  amountSatang: number;
  vatAmountSatang: number | null;
  vendorName: string | null;
  issueDate: string | null;
  confidence?: number;
  notes?: string;
}

// DEV: canned mock (free, deterministic). PROD: real OCR via pi CLI vision model.
async function defaultOcr(
  imagePath: string,
  _correlationId: string,
): Promise<{ result: ReceiptOcrResult; model: string }> {
  if (APP_MODE === 'DEV') {
    return {
      model: 'mock',
      result: {
        amountSatang: 35000,
        currency: 'THB',
        vatAmountSatang: 2290,
        vendorName: 'ร้านกาแฟทดสอบ (สาขาจำลอง)',
        issueDate: '2026-09-12',
        confidence: 0.99,
        rawText: 'DEV mock',
      },
    };
  }
  const out = execFileSync(
    'pi',
    [
      '-p', '--no-session', '--model', `openrouter/${OCR_MODEL}`,
      '--thinking', 'low', '--no-tools', `@${imagePath}`,
      'Extract amountSatang, vatAmountSatang, baseAmountSatang, vendorName, issueDate (YYYY-MM-DD), confidence (0-1) as JSON only. Satang integers. null when unreadable. Never fabricate.',
    ],
    { encoding: 'utf8', timeout: 180000 },
  );
  const m = out.match(/```json\s*([\s\S]*?)```/) ?? out.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error(`OCR returned no JSON (model ${OCR_MODEL}, ${out.slice(0, 120)})`);
  const j: OcrJson = JSON.parse(m[1]);
  return {
    model: OCR_MODEL,
    result: {
      amountSatang: j.amountSatang,
      currency: 'THB',
      vatAmountSatang: j.vatAmountSatang,
      vendorName: j.vendorName,
      issueDate: j.issueDate,
      confidence: j.confidence,
      rawText: j.notes,
    },
  };
}

await runPipeline({
  inboxDir: process.env.INBOX_DIR ?? join(ROOT, 'inbox'),
  outboxDir: process.env.OUTBOX_DIR ?? join(ROOT, 'outbox'),
  reviewDir: process.env.REVIEW_DIR ?? join(ROOT, 'needs-review'),
  auditFile: process.env.AUDIT_FILE ?? join(ROOT, 'audit.log.jsonl'),
  ocr: defaultOcr,
});
