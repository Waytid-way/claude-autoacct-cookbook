import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import type { ReceiptOcrResult } from '../../recipes/03-vision-ocr/receipt-extraction/types.ts';
import { buildChain, runPipeline } from './pipeline.ts';
import { resolveRunnerConfig } from './config.ts';

import { exportDhanakomBatch } from './dhanakom-bridge.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

interface OcrJson {
  amountSatang: number;
  vatAmountSatang: number | null;
  baseAmountSatang?: number | null;
  vendorName: string | null;
  issueDate: string | null;
  confidence?: number;
  notes?: string;
}

function createOcrFn(appMode: string, ocrModel: string, ocrFallback: string[]) {
  return async function defaultOcr(
    imagePath: string,
    _correlationId: string,
  ): Promise<{ result: ReceiptOcrResult; model: string; baseAmountSatang?: number | null }> {
    if (appMode === 'DEV') {
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
    const { models, refused } = buildChain(ocrModel, ocrFallback, appMode === 'PROD');
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
  };
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

try {
  const config = resolveRunnerConfig({ root: ROOT });

  const summary = await runPipeline({
    inboxDir: config.inboxDir,
    outboxDir: config.outboxDir,
    reviewDir: config.reviewDir,
    auditFile: config.auditFile,
    ocr: createOcrFn(config.appMode, config.ocrModel, config.ocrFallback),
    clientKb: config.clientKb,
    expenseAcct: config.expenseAcct,
    cashAcct: config.cashAcct,
  });

  if (config.exportDhanakom) {
    const csvPath = config.dhanakomOutPath ?? join(ROOT, 'dhanakom-batch.csv');
    const result = exportDhanakomBatch({
      outboxDir: config.outboxDir,
      auditFile: config.auditFile,
      outputCsvPath: csvPath,
    });
    console.log(`Dhanakom export: ${result.exportedCount} exported, ${result.skippedCount} skipped -> ${csvPath}`);
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`Runner Error: ${msg}`);
  process.exit(1);
}
