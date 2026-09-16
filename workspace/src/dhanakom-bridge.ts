import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { ExportArtifact } from './contract.ts';

export interface DhanakomBatchOptions {
  outboxDir: string;
  auditFile: string;
  outputCsvPath: string;
  batchId?: string;
}

export interface DhanakomBatchResult {
  batchId: string;
  exportedCount: number;
  skippedCount: number;
  outputCsvPath?: string;
}

function loadExportedSha256s(auditFile: string): Set<string> {
  const exported = new Set<string>();
  if (!existsSync(auditFile)) return exported;
  const raw = readFileSync(auditFile, 'utf8');
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as { stage?: unknown; sha256s?: unknown };
      if (o.stage === 'bridge-export' && Array.isArray(o.sha256s)) {
        for (const h of o.sha256s) {
          if (typeof h === 'string' && /^[0-9a-f]{64}$/.test(h)) exported.add(h);
        }
      }
    } catch {
      // ignore corrupt lines
    }
  }
  return exported;
}

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ponytail: Express GL CSV batch format: Date, Voucher/Ref, AccountCode, Debit, Credit, Description
export function exportDhanakomBatch(opts: DhanakomBatchOptions): DhanakomBatchResult {
  const batchId = opts.batchId ?? `batch-dhanakom-${Date.now()}`;
  const alreadyExportedSha = loadExportedSha256s(opts.auditFile);

  if (!existsSync(opts.outboxDir)) {
    return { batchId, exportedCount: 0, skippedCount: 0 };
  }

  const files = readdirSync(opts.outboxDir).filter((f) => f.endsWith('.json'));
  const toExport: { sha256: string; artifact: ExportArtifact }[] = [];
  let skippedCount = 0;

  for (const f of files) {
    try {
      const buf = readFileSync(join(opts.outboxDir, f));
      const sha256 = createHash('sha256').update(buf).digest('hex');
      if (alreadyExportedSha.has(sha256)) {
        skippedCount++;
        continue;
      }
      const content = JSON.parse(buf.toString('utf8')) as ExportArtifact;
      if (content.journal && Array.isArray(content.journal.lines)) {
        toExport.push({ sha256, artifact: content });
      }
    } catch {
      // corrupt artifact file in outbox
    }
  }

  if (toExport.length === 0) {
    return { batchId, exportedCount: 0, skippedCount };
  }

  // Header row for Dhanakom / Express Journal Voucher Import
  const rows: string[] = ['Date,VoucherRef,AccountCode,Debit,Credit,Description,TaxId'];

  for (const item of toExport) {
    const art = item.artifact;
    const date = art.issueDate ?? '';
    const ref = art.correlationId;
    const desc = art.vendorName ?? 'Expense';
    const taxId = art.taxId ?? '';

    for (const line of art.journal.lines) {
      const debit = line.side === 'DEBIT' ? (line.amountSatang / 100).toFixed(2) : '0.00';
      const credit = line.side === 'CREDIT' ? (line.amountSatang / 100).toFixed(2) : '0.00';
      rows.push(
        [
          escapeCsv(date),
          escapeCsv(ref),
          escapeCsv(line.accountCode),
          debit,
          credit,
          escapeCsv(desc),
          escapeCsv(taxId),
        ].join(','),
      );
    }
  }

  writeFileSync(opts.outputCsvPath, rows.join('\r\n') + '\r\n', 'utf8');

  // Record audit trail event for idempotency
  const sha256s = toExport.map((x) => x.sha256);
  const auditEvent = {
    correlationId: batchId,
    stage: 'bridge-export',
    batchId,
    count: toExport.length,
    outputCsvPath: opts.outputCsvPath,
    sha256s,
    timestamp: new Date().toISOString(),
  };

  appendFileSync(opts.auditFile, JSON.stringify(auditEvent) + '\n', 'utf8');

  return {
    batchId,
    exportedCount: toExport.length,
    skippedCount,
    outputCsvPath: opts.outputCsvPath,
  };
}

