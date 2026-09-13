import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import type { ReceiptOcrResult } from '../../recipes/03-vision-ocr/receipt-extraction/types.ts';
import { buildChain, runPipeline } from './pipeline.ts';

// Thin wrapper: CLI เดิม — config + default OCR แล้วมอบงานให้ runPipeline
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_MODE = process.env.APP_MODE ?? 'DEV';
const OCR_MODEL = process.env.OCR_MODEL ?? 'google/gemini-2.5-flash-lite'; // PROD ใช้ตัวเสียเงิน (decision-log); :free แค่ DEV

interface OcrJson {
  amountSatang: number;
  vatAmountSatang: number | null;
  baseAmountSatang?: number | null;
  vendorName: string | null;
  issueDate: string | null;
  confidence?: number;
  notes?: string;
}

const OCR_FALLBACK = (process.env.OCR_FALLBACK ?? '').split(',').map((s) => s.trim()).filter(Boolean);

// DEV: canned mock (free, deterministic). PROD: real OCR via pi CLI, primary → fallbacks in order.
// ponytail: dumb for-loop; retry/backoff libraries when flakiness data says so
async function defaultOcr(
  imagePath: string,
  _correlationId: string,
): Promise<{ result: ReceiptOcrResult; model: string; baseAmountSatang?: number | null }> {
  if (APP_MODE === 'DEV') {
    return {
      model: 'mock',
      baseAmountSatang: 32710,
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
  const { models, refused } = buildChain(OCR_MODEL, OCR_FALLBACK, APP_MODE === 'PROD');
  if (refused.length) console.warn(`PROD: refusing :free models (${refused.join(',')}) — :free is DEV-only`);
  if (!models.length) throw new Error('No usable OCR models in PROD (all :free refused)');
  const attempts: unknown[] = [];
  for (const model of models) {
    try {
      return await runOcr(model, imagePath);
    } catch (e) {
      console.warn(`OCR attempt failed (${model}): ${e instanceof Error ? e.message : e}`.slice(0, 160));
      attempts.push(e);
    }
  }
  throw new AggregateError(attempts, `OCR failed on all models (${models.join(',')})`);
}

async function runOcr(
  model: string,
  imagePath: string,
): Promise<{ result: ReceiptOcrResult; model: string; baseAmountSatang?: number | null }> {
  const out = execFileSync(
    'pi',
    [
      '-p', '--no-session', '--model', `openrouter/${model}`,
      '--thinking', 'low', '--no-tools', `@${imagePath}`,
      'Extract amountSatang, vatAmountSatang, baseAmountSatang, vendorName, issueDate (YYYY-MM-DD), confidence (0-1) as JSON only. Satang integers. null when unreadable. Never fabricate.',
    ],
    { encoding: 'utf8', timeout: 180000 },
  );
  const m = out.match(/```json\s*([\s\S]*?)```/) ?? out.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error(`OCR returned no JSON (model ${model}, ${out.slice(0, 120)})`);
  const j: OcrJson = JSON.parse(m[1]);
  return {
    model,
    baseAmountSatang: j.baseAmountSatang ?? null,
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
  expenseAcct: process.env.EXPENSE_ACCT,
  cashAcct: process.env.CASH_ACCT,
});
