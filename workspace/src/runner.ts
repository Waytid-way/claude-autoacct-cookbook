import { readFileSync, readdirSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import type { ReceiptOcrResult } from '../../recipes/03-vision-ocr/receipt-extraction/types.ts';
import type { ValidatedReceipt, JournalEntry, ExportArtifact } from './contract.ts';
import { gate } from './gate.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INBOX = join(ROOT, 'inbox'), OUTBOX = join(ROOT, 'outbox'), REVIEW = join(ROOT, 'needs-review');
const APP_MODE = process.env.APP_MODE ?? 'DEV';
const OCR_MODEL = process.env.OCR_MODEL ?? 'thinkingmachines/inkling:free'; // benchmarked 6/6
const EXPENSE_ACCT = process.env.EXPENSE_ACCT ?? '5000-MEALS';
const CASH_ACCT = process.env.CASH_ACCT ?? '1000-CASH';

for (const d of [INBOX, OUTBOX, REVIEW]) if (!existsSync(d)) mkdirSync(d, { recursive: true });

const cid = () => `autoacct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// DEV: canned mock (free, deterministic). PROD: real OCR via pi CLI vision model.
async function ocr(imagePath: string, correlationId: string): Promise<{ result: ReceiptOcrResult; model: string }> {
  if (APP_MODE === 'DEV') {
    return { model: 'mock', result: {
      amountSatang: 35000, currency: 'THB', vatAmountSatang: 2290, vendorName: 'ร้านกาแฟทดสอบ (สาขาจำลอง)',
      issueDate: '2026-09-12', confidence: 0.99, rawText: 'DEV mock',
    } };
  }
  const out = execFileSync('pi', ['-p', '--no-session', '--model', `openrouter/${OCR_MODEL}`,
    '--thinking', 'low', '--no-tools', `@${imagePath}`,
    'Extract amountSatang, vatAmountSatang, baseAmountSatang, vendorName, issueDate (YYYY-MM-DD), confidence (0-1) as JSON only. Satang integers. null when unreadable. Never fabricate.'],
    { encoding: 'utf8', timeout: 180000 });
  const m = out.match(/```json\s*([\s\S]*?)```/) ?? out.match(/(\{[\s\S]*\})/);
  const j = JSON.parse(m![1]);
  return { model: OCR_MODEL, result: {
    amountSatang: j.amountSatang, currency: 'THB', vatAmountSatang: j.vatAmountSatang,
    vendorName: j.vendorName, issueDate: j.issueDate, confidence: j.confidence, rawText: j.notes,
  } };
}

function validate(r: ReceiptOcrResult, correlationId: string): ValidatedReceipt {
  // ponytail: totals-only check (total > vat >= 0); full base+vat reconciliation when OCR returns line items
  const vatCheckOk = r.amountSatang != null && r.amountSatang > 0 &&
    r.vatAmountSatang != null && r.vatAmountSatang >= 0 && r.amountSatang > r.vatAmountSatang;
  return { ...r, correlationId, vatCheckOk };
}

function mapToJournal(v: ValidatedReceipt): JournalEntry {
  const lines = [
    { accountCode: EXPENSE_ACCT, amountSatang: v.amountSatang!, side: 'DEBIT' as const },
    { accountCode: CASH_ACCT, amountSatang: v.amountSatang!, side: 'CREDIT' as const },
  ];
  return { correlationId: v.correlationId, txDate: v.issueDate!, lines };
}

for (const f of readdirSync(INBOX).filter(f => /\.(jpe?g|png|webp)$/i.test(f))) {
  const correlationId = cid();
  const log = (o: object) => appendFileSync(join(ROOT, 'audit.log.jsonl'), JSON.stringify({ correlationId, ...o }) + '\n');
  try {
    const { result, model } = await ocr(join(INBOX, f), correlationId);
    const v = validate(result, correlationId);
    const d = gate(v);
    log({ stage: 'ocr', model, amountSatang: v.amountSatang, confidence: v.confidence });
    if (d.verdict === 'needs-review') {
      writeFileSync(join(REVIEW, `${correlationId}.json`), JSON.stringify({ file: f, reasons: d.reasons, ocr: v, model }, null, 2));
      log({ stage: 'gate', verdict: 'needs-review', reasons: d.reasons });
      console.log(`${f} -> needs-review (${d.reasons.join('; ')})`);
      continue;
    }
    const journal = mapToJournal(v);
    const artifact: ExportArtifact = { correlationId, vendorName: v.vendorName, issueDate: v.issueDate,
      totalBaht: v.amountSatang! / 100, vatBaht: v.vatAmountSatang! / 100, journal, ocrModel: model };
    writeFileSync(join(OUTBOX, `${correlationId}.json`), JSON.stringify(artifact, null, 2));
    log({ stage: 'export', verdict: 'pass', outbox: `${correlationId}.json` });
    console.log(`${f} -> outbox/${correlationId}.json`);
  } catch (e: any) {
    log({ stage: 'error', error: String(e?.message ?? e).slice(0, 300) });
    console.log(`${f} -> ERROR ${String(e?.message ?? e).slice(0, 120)}`);
  }
}
console.log('done', { mode: APP_MODE, inbox: basename(INBOX) });
