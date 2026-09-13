import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, basename } from 'node:path';
import type { ReceiptOcrResult } from '../../recipes/03-vision-ocr/receipt-extraction/types.ts';
import type { JournalEntry, ValidatedReceipt } from './contract.ts';
import { gate } from './gate.ts';

// Boundary seam: OCR ด้านนอกถูก inject ผ่าน OcrFn — test ใช้ mock เท่านั้น ห้ามยิง network/pi CLI
export type OcrFn = (
  imagePath: string,
  correlationId: string,
) => Promise<{ result: ReceiptOcrResult; model: string; baseAmountSatang?: number | null }>;

export interface RunPipelineOptions {
  inboxDir: string;
  outboxDir: string;
  reviewDir: string;
  auditFile: string;
  ocr: OcrFn;
  minConf?: number;
}

export interface PipelineSummary {
  passed: number;
  needsReview: number;
  errors: number;
  skipped: number;
}

const EXPENSE_ACCT = process.env.EXPENSE_ACCT ?? '5000-MEALS';
const CASH_ACCT = process.env.CASH_ACCT ?? '1000-CASH';

const cid = (): string => `autoacct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Thai dates: DD/MM/YYYY with Buddhist year (>2400 → -543) or Gregorian; ISO passes through.
// ponytail: regex + Date check only; full calendar libs when lunar/edge formats appear.
// Thai receipts are DD/MM — MM/DD sources would mis-parse silently; revisit if non-Thai sources appear.
export function normalizeThaiDate(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const y = Number(t.slice(0, 4));
    return roundTrip(y > 2400 ? `${y - 543}${t.slice(4)}` : t); // Buddhist-year ISO
  }
  const m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (!m) return null;
  const y = Number(m[3]) > 2400 ? Number(m[3]) - 543 : Number(m[3]);
  return roundTrip(`${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
}

// round-trip: reject overflow (2026-99-99, 2026-02-30) that Date.parse alone may forgive
function roundTrip(iso: string): string | null {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

function validate(r: ReceiptOcrResult, correlationId: string, base?: number | null): ValidatedReceipt {
  // exact triple when OCR returns base (total === base + vat); else totals-only fallback
  const exact = r.amountSatang != null && r.vatAmountSatang != null && base != null
    ? r.amountSatang === base + r.vatAmountSatang
    : null;
  const vatCheckOk = exact ?? (
    r.amountSatang != null && r.amountSatang > 0 &&
    r.vatAmountSatang != null && r.vatAmountSatang >= 0 && r.amountSatang > r.vatAmountSatang
  );
  return { ...r, correlationId, issueDate: normalizeThaiDate(r.issueDate), baseAmountSatang: base ?? null, vatCheckOk };
}

// hash store: JSON.parse per line, not regex — survives pretty-print/field reorder; corrupt lines skipped
function loadSeenHashes(auditFile: string): Set<string> {
  const seen = new Set<string>();
  let raw: string;
  try {
    raw = readFileSync(auditFile, 'utf8');
  } catch {
    return seen; // first run: no audit file yet
  }
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as { sha256?: unknown; stage?: unknown };
      if (o.stage !== 'export') continue; // pass-only: ocr/error/dedup-skip lines never count
      const h = o.sha256;
      if (typeof h === 'string' && /^[0-9a-f]{64}$/.test(h)) seen.add(h);
    } catch { /* corrupt line: skip, never crash dedup */ }
  }
  return seen;
}

function mapToJournal(v: ValidatedReceipt, totalSatang: number, txDate: string): JournalEntry {
  return {
    correlationId: v.correlationId,
    txDate,
    lines: [
      { accountCode: EXPENSE_ACCT, amountSatang: totalSatang, side: 'DEBIT' },
      { accountCode: CASH_ACCT, amountSatang: totalSatang, side: 'CREDIT' },
    ],
  };
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// OCR model chain: primary first, deduped; PROD drops :free (DEV-only rule) and reports refusals.
// ponytail: pure list surgery, no I/O — the only unit-testable slice of the OCR path
export function buildChain(
  primary: string,
  fallbacks: string[],
  prod: boolean,
): { models: string[]; refused: string[] } {
  const chain = [primary, ...fallbacks]
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((m, i, a) => a.indexOf(m) === i);
  if (!prod) return { models: chain, refused: [] };
  return {
    models: chain.filter((m) => !m.endsWith(':free')),
    refused: chain.filter((m) => m.endsWith(':free')),
  };
}

function writeReviewFile(reviewDir: string, correlationId: string, file: string, reasons: string[], v: ValidatedReceipt, model: string): void {
  writeFileSync(
    join(reviewDir, `${correlationId}.json`),
    JSON.stringify({ file, reasons, ocr: v, model }, null, 2),
  );
}

// Public seam: รันทั้ง pipeline (ocr → validate → gate → outbox/needs-review) พร้อม audit log
export async function runPipeline(opts: RunPipelineOptions): Promise<PipelineSummary> {
  for (const d of [opts.inboxDir, opts.outboxDir, opts.reviewDir]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
  const summary: PipelineSummary = { passed: 0, needsReview: 0, errors: 0, skipped: 0 };
  const seen = loadSeenHashes(opts.auditFile);
    const files = readdirSync(opts.inboxDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
    for (const f of files) {
      const correlationId = cid();
      const log = (o: object): void => {
        appendFileSync(opts.auditFile, JSON.stringify({ correlationId, ...o }) + '\n');
      };
      const sha256 = createHash('sha256').update(readFileSync(join(opts.inboxDir, f))).digest('hex');
      if (seen.has(sha256)) {
        log({ stage: 'dedup-skip', file: f, sha256 });
        summary.skipped++;
        continue;
      }
      try {
        const { result, model, baseAmountSatang } = await opts.ocr(join(opts.inboxDir, f), correlationId);
        const v = validate(result, correlationId, baseAmountSatang);
        const d = gate(v, opts.minConf);
        log({ stage: 'ocr', model, sha256, amountSatang: v.amountSatang, confidence: v.confidence });
        if (d.verdict === 'needs-review') {
          writeReviewFile(opts.reviewDir, correlationId, f, d.reasons, v, model);
          log({ stage: 'gate', verdict: 'needs-review', reasons: d.reasons });
          console.log(`${f} -> needs-review (${d.reasons.join('; ')})`);
          summary.needsReview++;
          continue;
        }
        const total = v.amountSatang;
        const vat = v.vatAmountSatang;
        const date = v.issueDate;
        if (total == null || vat == null || date == null) throw new Error('unreachable: gate passed with missing total/vat/date');
        const journal = mapToJournal(v, total, date);
        writeFileSync(
          join(opts.outboxDir, `${correlationId}.json`),
          JSON.stringify(
            {
              correlationId,
              vendorName: v.vendorName,
              issueDate: v.issueDate,
              totalSatang: total,
              vatSatang: vat,
              totalBaht: total / 100,
              vatBaht: vat / 100,
              journal,
              ocrModel: model,
            },
            null,
            2,
          ),
        );
        log({ stage: 'export', verdict: 'pass', sha256, outbox: `${correlationId}.json` });
        console.log(`${f} -> outbox/${correlationId}.json`);
        seen.add(sha256); // remembered only on pass — review/error files stay rerunnable
        summary.passed++;
      } catch (e: unknown) {
        const msg = errorMessage(e).slice(0, 300);
        log({ stage: 'error', error: msg });
        console.log(`${f} -> ERROR ${msg.slice(0, 120)}`);
        summary.errors++;
      }
    }
    console.log('done', { inbox: basename(opts.inboxDir), ...summary });
    return summary;
}
