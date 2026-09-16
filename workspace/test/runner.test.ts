import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { buildChain, normalizeThaiDate, runPipeline } from '../src/pipeline.ts';
import type { OcrFn } from '../src/pipeline.ts';
import type { ExportArtifact } from '../src/contract.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

interface Sandbox {
  dir: string;
  inboxDir: string;
  outboxDir: string;
  reviewDir: string;
  auditFile: string;
}

function sandbox(): Sandbox {
  const base = mkdtempSync(join(tmpdir(), 'autoacct-'));
  const sb: Sandbox = {
    dir: base,
    inboxDir: join(base, 'inbox'),
    outboxDir: join(base, 'outbox'),
    reviewDir: join(base, 'review'),
    auditFile: join(base, 'audit.log.jsonl'),
  };
  mkdirSync(sb.inboxDir, { recursive: true });
  writeFileSync(join(sb.inboxDir, 'low.jpg'), 'fake-bytes');
  return sb;
}

// (0) characterization ของ legacy CLI (src/runner.ts): ล็อกพฤติกรรม DEV mock ปัจจุบัน
// รันใน tmp sandbox ผ่าน INBOX_DIR/OUTBOX_DIR/REVIEW_DIR/AUDIT_FILE — ห้ามแตะ inbox/outbox จริงของ workspace
test('characterization (legacy CLI): DEV CLI ส่งใบ sample เข้า outbox พร้อม audit (tmp sandbox)', () => {
  const sb = sandbox();
  rmSync(join(sb.inboxDir, 'low.jpg'));
  copyFileSync(join(ROOT, 'sample', 'receipt-001.jpg'), join(sb.inboxDir, 'receipt-001.jpg'));
  execFileSync('node', ['src/runner.ts'], {
    cwd: ROOT,
    env: {
      ...process.env,
      APP_MODE: 'DEV',
      INBOX_DIR: sb.inboxDir,
      OUTBOX_DIR: sb.outboxDir,
      REVIEW_DIR: sb.reviewDir,
      AUDIT_FILE: sb.auditFile,
    },
    encoding: 'utf8',
    timeout: 60000,
  });
  const outFiles = readdirSync(sb.outboxDir).filter((f) => f.endsWith('.json'));
  assert.equal(outFiles.length, 1);
  const artifact = JSON.parse(readFileSync(join(sb.outboxDir, outFiles[0]), 'utf8')) as ExportArtifact;
  assert.equal(artifact.totalSatang, 35000);
  assert.ok(existsSync(sb.auditFile));
  const audit = readFileSync(sb.auditFile, 'utf8');
  assert.ok(audit.includes('"stage":"export"'));
});

// (1) ใบผ่าน gate → artifact ครบใน outbox + audit ocr/export + summary {passed:1}
test('ใบผ่าน gate → outbox artifact ครบ + audit ocr/export + passed:1', async () => {
  const sb = sandbox();
  const ocr: OcrFn = async () => ({
    model: 'mock-pass',
    result: {
      amountSatang: 41250, currency: 'THB', vatAmountSatang: 2700,
      vendorName: 'KHAO-TEST-VENDOR', issueDate: '2026-09-11', confidence: 0.99, rawText: 't',
    },
  });
  const summary = await runPipeline({ ...sb, ocr });
  assert.deepEqual(summary, { passed: 1, needsReview: 0, errors: 0, skipped: 0 });
  const outFiles = readdirSync(sb.outboxDir).filter((f) => f.endsWith('.json'));
  assert.equal(outFiles.length, 1);
  const artifact = JSON.parse(readFileSync(join(sb.outboxDir, outFiles[0]), 'utf8')) as ExportArtifact;
  assert.equal(artifact.totalSatang, 41250);
  assert.equal(artifact.vendorName, 'KHAO-TEST-VENDOR');
  assert.equal(artifact.issueDate, '2026-09-11');
  assert.equal(artifact.ocrModel, 'mock-pass');
  assert.equal(artifact.journal.lines.length, 2);
  const [debit, credit] = artifact.journal.lines;
  assert.equal(debit.side, 'DEBIT');
  assert.equal(credit.side, 'CREDIT');
  assert.equal(debit.amountSatang, 41250);
  assert.equal(credit.amountSatang, debit.amountSatang);
  assert.equal(artifact.journal.txDate, '2026-09-11');
  const audit = readFileSync(sb.auditFile, 'utf8');
  assert.ok(audit.includes('"stage":"ocr"'));
  assert.ok(audit.includes('"stage":"export"'));
});

// (2) ใบ conf ต่ำ → needs-review พร้อมเหตุผล (minConf จาก param ชนะ env)
test('conf ต่ำกว่า minConf → needs-review พร้อมเหตุผล', async () => {
  const prev = process.env.GATE_MIN_CONF;
  process.env.GATE_MIN_CONF = '0.10'; // หลอก env ให้หย่อน — ต้องใช้ minConf จาก param เท่านั้น
  try {
    const sb = sandbox();
    const ocr: OcrFn = async () => ({
      model: 'mock',
      result: {
        amountSatang: 35000, currency: 'THB', vatAmountSatang: 2290,
        vendorName: 'x', issueDate: '2026-09-12', confidence: 0.5, rawText: 't',
      },
    });
    const summary = await runPipeline({ ...sb, ocr, minConf: 0.85 });
    assert.equal(summary.needsReview, 1);
    assert.equal(summary.passed, 0);
    const files = readdirSync(sb.reviewDir).filter((f) => f.endsWith('.json'));
    assert.equal(files.length, 1);
    const body = JSON.parse(readFileSync(join(sb.reviewDir, files[0]), 'utf8')) as { reasons: string[] };
    assert.ok(body.reasons.join('; ').includes('confidence'));
    assert.equal(readdirSync(sb.outboxDir).length, 0);
  } finally {
    if (prev === undefined) delete process.env.GATE_MIN_CONF;
    else process.env.GATE_MIN_CONF = prev;
  }
});

// (3) base ตรงยอด (total === base + vat) → ผ่านด้วย exact triple
test('base ตรงยอด → exact triple ผ่าน', async () => {
  const sb = sandbox();
  const ocr: OcrFn = async () => ({
    model: 'mock',
    baseAmountSatang: 32710,
    result: {
      amountSatang: 35000, currency: 'THB', vatAmountSatang: 2290,
      vendorName: 'x', issueDate: '2026-09-12', confidence: 0.99, rawText: 't',
    },
  });
  const summary = await runPipeline({ ...sb, ocr });
  assert.equal(summary.passed, 1);
});

// (4) base ไม่ลงยอด → needs-review (exact เหนือ fallback)
test('base ไม่ลงยอด → needs-review เหตุผล vat', async () => {
  const sb = sandbox();
  const ocr: OcrFn = async () => ({
    model: 'mock',
    baseAmountSatang: 30000, // 30000+2290 != 35000
    result: {
      amountSatang: 35000, currency: 'THB', vatAmountSatang: 2290,
      vendorName: 'x', issueDate: '2026-09-12', confidence: 0.99, rawText: 't',
    },
  });
  const summary = await runPipeline({ ...sb, ocr });
  assert.equal(summary.needsReview, 1);
  const files = readdirSync(sb.reviewDir).filter((f) => f.endsWith('.json'));
  const body = JSON.parse(readFileSync(join(sb.reviewDir, files[0]), 'utf8')) as { reasons: string[] };
  assert.ok(body.reasons.join('; ').includes('vat cross-check'));
});

// (5) ocr โยน error → log error ไม่ crash
test('ocr พัง → ลง audit stage error ไม่ crash', async () => {
  const sb = sandbox();
  const ocr: OcrFn = async () => { throw new Error('boom-ocr'); };
  const summary = await runPipeline({ ...sb, ocr });
  assert.equal(summary.errors, 1);
  assert.equal(summary.passed, 0);
  assert.equal(readdirSync(sb.outboxDir).length, 0);
  assert.equal(readdirSync(sb.reviewDir).length, 0);
  const audit = readFileSync(sb.auditFile, 'utf8');
  assert.ok(audit.includes('"stage":"error"'));
  assert.ok(audit.includes('boom-ocr'));
});

// (6) วันที่ไทย: พ.ศ. และ DD/MM/ค.ศ. → ISO; ขยะ → needs-review
test('วันที่ไทย พ.ศ./ค.ศ. normalize ถูก, ขยะตก gate', async () => {
  assert.equal(normalizeThaiDate('12/09/2569'), '2026-09-12');
  assert.equal(normalizeThaiDate('12-09-2569'), '2026-09-12');
  assert.equal(normalizeThaiDate('12.09.2569'), '2026-09-12');
  assert.equal(normalizeThaiDate('2569-09-12'), '2026-09-12'); // Buddhist-year ISO
  assert.equal(normalizeThaiDate('12/09/2026'), '2026-09-12');
  assert.equal(normalizeThaiDate('2026-09-12'), '2026-09-12');
  assert.equal(normalizeThaiDate(' 12/09/2569 '), '2026-09-12');
  assert.equal(normalizeThaiDate('2026-99-99'), null);
  assert.equal(normalizeThaiDate('2026-02-30'), null);
  assert.equal(normalizeThaiDate('12/09/2569xyz'), null);
  const sb = sandbox();
  const ocr: OcrFn = async () => ({
    model: 'mock',
    result: {
      amountSatang: 35000, currency: 'THB', vatAmountSatang: 2290,
      vendorName: 'x', issueDate: 'เมื่อวาน', confidence: 0.99, rawText: 't',
    },
  });
  const summary = await runPipeline({ ...sb, ocr });
  assert.equal(summary.needsReview, 1);
});

// (7) รันซ้ำไฟล์เดิม → dedup-skip ไม่ประมวลผลซ้ำ
test('รันซ้ำ → skipped:1 ไม่มี outbox ใหม่', async () => {
  const sb = sandbox();
  const ocr: OcrFn = async () => ({
    model: 'mock',
    result: {
      amountSatang: 41250, currency: 'THB', vatAmountSatang: 2700,
      vendorName: 'KHAO-TEST-VENDOR', issueDate: '2026-09-11', confidence: 0.99, rawText: 't',
    },
  });
  const first = await runPipeline({ ...sb, ocr });
  assert.equal(first.passed, 1);
  const second = await runPipeline({ ...sb, ocr });
  assert.deepEqual(second, { passed: 0, needsReview: 0, errors: 0, skipped: 1 });
  const audit = readFileSync(sb.auditFile, 'utf8');
  assert.ok(audit.includes('"stage":"dedup-skip"'));
});

// (8) buildChain: order + dedup + PROD :free filter
test('buildChain เรียง ลบซ้ำ กรอง :free เฉพาะ PROD', () => {
  assert.deepEqual(buildChain('a', ['b', 'a', 'c'], false), { models: ['a', 'b', 'c'], refused: [] });
  assert.deepEqual(buildChain('a', ['x:free', 'b'], true), { models: ['a', 'b'], refused: ['x:free'] });
  assert.deepEqual(buildChain('x:free', [], true), { models: [], refused: ['x:free'] });
});

// (9) needs-review รันซ้ำต้องไม่ skip (pass-only dedup)
test('needs-review รันซ้ำ → ไม่ skip ทำใหม่ได้', async () => {
  const sb = sandbox();
  const ocr: OcrFn = async () => ({
    model: 'mock',
    result: {
      amountSatang: 35000, currency: 'THB', vatAmountSatang: 2290,
      vendorName: 'x', issueDate: '2026-09-12', confidence: 0.5, rawText: 't',
    },
  });
  const first = await runPipeline({ ...sb, ocr, minConf: 0.85 });
  assert.equal(first.needsReview, 1);
  const second = await runPipeline({ ...sb, ocr, minConf: 0.85 });
  assert.deepEqual(second, { passed: 0, needsReview: 1, errors: 0, skipped: 0 });
});

// (10) error รันซ้ำต้องไม่ skip
test('error รันซ้ำ → ไม่ skip ทำใหม่ได้', async () => {
  const sb = sandbox();
  const ocr: OcrFn = async () => { throw new Error('boom-ocr'); };
  const first = await runPipeline({ ...sb, ocr });
  assert.equal(first.errors, 1);
  const second = await runPipeline({ ...sb, ocr });
  assert.deepEqual(second, { passed: 0, needsReview: 0, errors: 1, skipped: 0 });
});

// (11) บัญชี custom → journal ลงตาม options (default เดิมเมื่อไม่ส่ง)
test('บัญชี custom → journal ลงตาม options', async () => {
  const passOcr: OcrFn = async () => ({
    model: 'mock',
    result: {
      amountSatang: 41250, currency: 'THB', vatAmountSatang: 2700,
      vendorName: 'KHAO-TEST-VENDOR', issueDate: '2026-09-11', confidence: 0.99, rawText: 't',
    },
  });
  const sbCustom = sandbox();
  const custom = await runPipeline({ ...sbCustom, ocr: passOcr, expenseAcct: '6000-TEST', cashAcct: '1100-TEST' });
  assert.equal(custom.passed, 1);
  const customFiles = readdirSync(sbCustom.outboxDir).filter((f) => f.endsWith('.json'));
  const customArtifact = JSON.parse(readFileSync(join(sbCustom.outboxDir, customFiles[0]), 'utf8')) as ExportArtifact;
  assert.deepEqual(customArtifact.journal.lines.map((l) => l.accountCode), ['6000-TEST', '1100-TEST']);
  const sbDefault = sandbox();
  const def = await runPipeline({ ...sbDefault, ocr: passOcr });
  assert.equal(def.passed, 1);
  const defFiles = readdirSync(sbDefault.outboxDir).filter((f) => f.endsWith('.json'));
  const defArtifact = JSON.parse(readFileSync(join(sbDefault.outboxDir, defFiles[0]), 'utf8')) as ExportArtifact;
  assert.deepEqual(defArtifact.journal.lines.map((l) => l.accountCode), ['5000-MEALS', '1000-CASH']);
});

// (12) Client KB: Tax ID match, normalized name match, และ unknown vendor ตก needs-review
test('Client KB: Tax ID match ตรงเป๊ะ → journal ลงบัญชีตาม KB', async () => {
  const sb = sandbox();
  const ocr: OcrFn = async () => ({
    model: 'mock',
    result: {
      amountSatang: 10700, currency: 'THB', vatAmountSatang: 700,
      vendorName: 'SOME UNKNOWN BRANCH NAME', taxId: '0-1055-58000-12-3',
      issueDate: '2026-09-14', confidence: 0.95, rawText: 't',
    },
    baseAmountSatang: 10000,
  });
  const clientKb = {
    clientName: 'Client Alpha',
    defaultCashAcct: '1111-PETTY-CASH',
    vendorMappings: [
      { taxId: '0105558000123', expenseAcct: '5100-OFFICE-SUPPLIES' },
    ],
  };
  const summary = await runPipeline({ ...sb, ocr, clientKb });
  assert.equal(summary.passed, 1);
  const files = readdirSync(sb.outboxDir).filter((f) => f.endsWith('.json'));
  const art = JSON.parse(readFileSync(join(sb.outboxDir, files[0]), 'utf8')) as ExportArtifact;
  assert.deepEqual(art.journal.lines.map((l) => l.accountCode), ['5100-OFFICE-SUPPLIES', '1111-PETTY-CASH']);
});

test('Client KB: Normalized vendor name match → journal ลงบัญชีตาม KB', async () => {
  const sb = sandbox();
  const ocr: OcrFn = async () => ({
    model: 'mock',
    result: {
      amountSatang: 50000, currency: 'THB', vatAmountSatang: 3271,
      vendorName: '  CP   ALL (Public) Co., Ltd.  ',
      issueDate: '2026-09-14', confidence: 0.95, rawText: 't',
    },
  });
  const clientKb = {
    vendorMappings: [
      { vendorNamePattern: 'cp all', expenseAcct: '5200-CONVENIENCE-EXP', cashAcct: '1000-CASH' },
    ],
  };
  const summary = await runPipeline({ ...sb, ocr, clientKb });
  assert.equal(summary.passed, 1);
  const files = readdirSync(sb.outboxDir).filter((f) => f.endsWith('.json'));
  const art = JSON.parse(readFileSync(join(sb.outboxDir, files[0]), 'utf8')) as ExportArtifact;
  assert.deepEqual(art.journal.lines.map((l) => l.accountCode), ['5200-CONVENIENCE-EXP', '1000-CASH']);
});

import { exportDhanakomBatch } from '../src/dhanakom-bridge.ts';

test('Client KB: Unknown vendor → gate needs-review (unknown vendor)', async () => {
  const sb = sandbox();
  const ocr: OcrFn = async () => ({
    model: 'mock',
    result: {
      amountSatang: 20000, currency: 'THB', vatAmountSatang: 1308,
      vendorName: 'MYSTERY VENDOR', taxId: '9999999999999',
      issueDate: '2026-09-14', confidence: 0.95, rawText: 't',
    },
  });
  const clientKb = {
    vendorMappings: [
      { taxId: '0105558000123', expenseAcct: '5100-OFFICE' },
    ],
  };
  const summary = await runPipeline({ ...sb, ocr, clientKb });
  assert.equal(summary.needsReview, 1);
  const reviewFiles = readdirSync(sb.reviewDir).filter((f) => f.endsWith('.json'));
  const review = JSON.parse(readFileSync(join(sb.reviewDir, reviewFiles[0]), 'utf8')) as { reasons: string[] };
  assert.ok(review.reasons.includes('unknown vendor'));
});

// (13) Dhanakom Bridge: Batch Export + Audit Idempotency
test('Dhanakom Bridge: export unexported outbox files to CSV with audit idempotency', async () => {
  const sb = sandbox();
  const ocr: OcrFn = async () => ({
    model: 'mock',
    result: {
      amountSatang: 10700, currency: 'THB', vatAmountSatang: 700,
      vendorName: 'Office Depot', taxId: '1234567890123',
      issueDate: '2026-09-14', confidence: 0.95, rawText: 't',
    },
    baseAmountSatang: 10000,
  });

  // 1. Run pipeline to produce 1 outbox entry
  const summary = await runPipeline({ ...sb, ocr });
  assert.equal(summary.passed, 1);

  const outboxFiles = readdirSync(sb.outboxDir).filter((f) => f.endsWith('.json'));
  assert.equal(outboxFiles.length, 1);

  // 2. Export first time -> 1 exported, 0 skipped
  const csvPath = join(sb.dir, 'dhanakom-batch-1.csv');
  const res1 = exportDhanakomBatch({
    outboxDir: sb.outboxDir,
    auditFile: sb.auditFile,
    outputCsvPath: csvPath,
    batchId: 'B001',
  });

  assert.equal(res1.exportedCount, 1);
  assert.equal(res1.skippedCount, 0);
  assert.ok(existsSync(csvPath));

  const csvContent = readFileSync(csvPath, 'utf8');
  assert.ok(csvContent.includes('Date,VoucherRef,AccountCode,Debit,Credit,Description,TaxId'));
  assert.ok(csvContent.includes('5000-MEALS,107.00,0.00'));
  assert.ok(csvContent.includes('1000-CASH,0.00,107.00'));
  assert.ok(csvContent.includes('1234567890123'));

  // 3. Re-run exporter on same outbox -> 0 exported, 1 skipped (Idempotent!)
  const csvPath2 = join(sb.dir, 'dhanakom-batch-2.csv');
  const res2 = exportDhanakomBatch({
    outboxDir: sb.outboxDir,
    auditFile: sb.auditFile,
    outputCsvPath: csvPath2,
    batchId: 'B002',
  });

  assert.equal(res2.exportedCount, 0);
  assert.equal(res2.skippedCount, 1);
  assert.ok(!existsSync(csvPath2)); // No file created when nothing to export

  // 4. Verify outbox files remained untouched (immutability)
  const outboxFilesAfter = readdirSync(sb.outboxDir).filter((f) => f.endsWith('.json'));
  assert.deepEqual(outboxFiles, outboxFilesAfter);
});

// ==========================================
// Slice 1: CLI Configuration Seam Tests
// ==========================================

// Helper to run runner.ts via process boundary
function runCli(args: string[], env: Record<string, string | undefined> = {}, cwd: string = ROOT) {
  try {
    const stdout = execFileSync('node', ['src/runner.ts', ...args], {
      cwd,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (e: any) {
    return {
      status: e.status ?? 1,
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? e.message,
    };
  }
}

// 1. Existing no-CLI behavior still works (tested in characterization, plus explicit check)
test('CLI 1: no-CLI args uses defaults/env normally', () => {
  const sb = sandbox();
  const res = runCli([], {
    APP_MODE: 'DEV',
    INBOX_DIR: sb.inboxDir,
    OUTBOX_DIR: sb.outboxDir,
    REVIEW_DIR: sb.reviewDir,
    AUDIT_FILE: sb.auditFile,
  });
  assert.equal(res.status, 0);
  assert.equal(readdirSync(sb.outboxDir).length, 1);
});

// 2. CLI override ENV
test('CLI 2: CLI directory flag overrides ENV variable', () => {
  const sb1 = sandbox();
  const sb2 = sandbox(); // override target
  mkdirSync(sb1.outboxDir, { recursive: true });
  mkdirSync(sb2.outboxDir, { recursive: true });
  const res = runCli(['--outbox', sb2.outboxDir], {
    APP_MODE: 'DEV',
    INBOX_DIR: sb1.inboxDir,
    OUTBOX_DIR: sb1.outboxDir, // Should be overridden!
    REVIEW_DIR: sb1.reviewDir,
    AUDIT_FILE: sb1.auditFile,
  });
  assert.equal(res.status, 0);
  assert.equal(readdirSync(sb1.outboxDir).length, 0);
  assert.equal(readdirSync(sb2.outboxDir).length, 1);
});

// 3. ENV used when CLI not specified
test('CLI 3: ENV used when CLI flag is absent', () => {
  const sb = sandbox();
  const res = runCli([], {
    APP_MODE: 'DEV',
    INBOX_DIR: sb.inboxDir,
    OUTBOX_DIR: sb.outboxDir,
    REVIEW_DIR: sb.reviewDir,
    AUDIT_FILE: sb.auditFile,
  });
  assert.equal(res.status, 0);
  assert.equal(readdirSync(sb.outboxDir).length, 1);
});

// 4. Default used when neither CLI nor ENV is provided (checked by runner config unit check)
test('CLI 4: default used when neither CLI nor ENV is provided', async () => {
  const { resolveRunnerConfig } = await import('../src/config.ts');
  const cfg = resolveRunnerConfig({ root: '/test-root', args: [], env: {} });
  assert.equal(cfg.inboxDir, '/test-root/inbox');
  assert.equal(cfg.outboxDir, '/test-root/outbox');
});

// 5. --client-kb valid -> pipeline receives client KB and matches vendor
test('CLI 5: --client-kb valid -> pipeline applies client vendor mapping', () => {
  const sb = sandbox();
  const kbFile = join(sb.dir, 'client-a.json');
  writeFileSync(
    kbFile,
    JSON.stringify({
      clientName: 'Client A',
      vendorMappings: [
        { vendorNamePattern: 'ร้านกาแฟ', expenseAcct: '5300-COFFEE', cashAcct: '1000-CASH' },
      ],
    }),
  );

  const res = runCli(['--client-kb', kbFile, '--inbox', sb.inboxDir, '--outbox', sb.outboxDir, '--review', sb.reviewDir, '--audit', sb.auditFile], {
    APP_MODE: 'DEV',
  });
  assert.equal(res.status, 0);
  const files = readdirSync(sb.outboxDir).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 1);
  const art = JSON.parse(readFileSync(join(sb.outboxDir, files[0]), 'utf8')) as ExportArtifact;
  assert.equal(art.journal.lines[0].accountCode, '5300-COFFEE');
});

// 6. --client-kb missing file -> non-zero exit code
test('CLI 6: --client-kb missing file -> non-zero exit', () => {
  const sb = sandbox();
  const missingPath = join(sb.dir, 'does-not-exist.json');
  const res = runCli(['--client-kb', missingPath], { APP_MODE: 'DEV' });
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('Client KB file not found'));
});

// 7. --client-kb invalid JSON -> non-zero exit code
test('CLI 7: --client-kb invalid JSON -> non-zero exit', () => {
  const sb = sandbox();
  const corruptFile = join(sb.dir, 'corrupt.json');
  writeFileSync(corruptFile, '{ invalid json');
  const res = runCli(['--client-kb', corruptFile], { APP_MODE: 'DEV' });
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('Invalid JSON in Client KB file'));
});

// 8. Invalid KB -> no output journal generated (pipeline MUST NOT run/fallback)
test('CLI 8: invalid KB -> pipeline does not execute, zero outbox artifacts', () => {
  const sb = sandbox();
  const corruptFile = join(sb.dir, 'corrupt.json');
  writeFileSync(corruptFile, '{"notValidKb": true}');
  const res = runCli(['--client-kb', corruptFile, '--inbox', sb.inboxDir, '--outbox', sb.outboxDir], { APP_MODE: 'DEV' });
  assert.notEqual(res.status, 0);
  // outbox directory should not even be created or should remain empty
  const count = existsSync(sb.outboxDir) ? readdirSync(sb.outboxDir).length : 0;
  assert.equal(count, 0);
});

// 9. Unknown CLI option -> non-zero descriptive failure
test('CLI 9: unknown CLI option -> non-zero exit', () => {
  const res = runCli(['--mystery-flag'], { APP_MODE: 'DEV' });
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('Unknown option') || res.stderr.includes('--mystery-flag'));
});

// ==========================================
// Slice 2: Dhanakom Bridge Integration Tests
// ==========================================

// TEST A: first export -> expected CSV generated & bridge-export audit record exists
test('Dhanakom CLI A: first export generates CSV and bridge-export audit record', () => {
  const sb = sandbox();
  const csvPath = join(sb.dir, 'export-a.csv');
  const res = runCli([
    '--export-dhanakom',
    '--dhanakom-out', csvPath,
    '--inbox', sb.inboxDir,
    '--outbox', sb.outboxDir,
    '--review', sb.reviewDir,
    '--audit', sb.auditFile,
  ], { APP_MODE: 'DEV' });

  assert.equal(res.status, 0);
  assert.ok(existsSync(csvPath));
  const content = readFileSync(csvPath, 'utf8');
  assert.ok(content.includes('Date,VoucherRef,AccountCode,Debit,Credit,Description,TaxId'));
  assert.ok(content.includes('5000-MEALS,350.00,0.00'));
  assert.ok(content.includes('1000-CASH,0.00,350.00'));

  const audit = readFileSync(sb.auditFile, 'utf8');
  assert.ok(audit.includes('"stage":"bridge-export"'));
});

// TEST B: same export again -> previously exported entries skipped, zero duplicate CSV entries
test('Dhanakom CLI B: second export skips previously exported entries (idempotent)', () => {
  const sb = sandbox();
  const csvPath1 = join(sb.dir, 'export-b1.csv');
  const csvPath2 = join(sb.dir, 'export-b2.csv');
  const runArgs = [
    '--export-dhanakom',
    '--inbox', sb.inboxDir,
    '--outbox', sb.outboxDir,
    '--review', sb.reviewDir,
    '--audit', sb.auditFile,
  ];

  const res1 = runCli([...runArgs, '--dhanakom-out', csvPath1], { APP_MODE: 'DEV' });
  assert.equal(res1.status, 0);
  assert.ok(existsSync(csvPath1));

  // Run again
  const res2 = runCli([...runArgs, '--dhanakom-out', csvPath2], { APP_MODE: 'DEV' });
  assert.equal(res2.status, 0);
  assert.ok(!existsSync(csvPath2)); // No new CSV created when everything is skipped
});

// TEST C: new outbox item after previous export -> only new item exported, old item skipped
test('Dhanakom CLI C: new outbox item exported while old item remains skipped', () => {
  const sb = sandbox();
  const csvPath1 = join(sb.dir, 'export-c1.csv');
  const csvPath2 = join(sb.dir, 'export-c2.csv');
  const runArgs = [
    '--export-dhanakom',
    '--inbox', sb.inboxDir,
    '--outbox', sb.outboxDir,
    '--review', sb.reviewDir,
    '--audit', sb.auditFile,
  ];

  // First run
  runCli([...runArgs, '--dhanakom-out', csvPath1], { APP_MODE: 'DEV' });
  assert.ok(existsSync(csvPath1));

  // Add a SECOND outbox artifact manually
  const secondArtifact: ExportArtifact = {
    correlationId: 'autoacct-test-2nd',
    vendorName: 'NEW VENDOR CO',
    issueDate: '2026-09-15',
    totalSatang: 12000,
    vatSatang: 0,
    totalBaht: 120,
    vatBaht: 0,
    taxId: '1111111111111',
    ocrModel: 'test',
    journal: {
      correlationId: 'autoacct-test-2nd',
      txDate: '2026-09-15',
      lines: [
        { accountCode: '5900-OTHER', amountSatang: 12000, side: 'DEBIT' },
        { accountCode: '1000-CASH', amountSatang: 12000, side: 'CREDIT' },
      ],
    },
  };
  writeFileSync(join(sb.outboxDir, 'second-outbox.json'), JSON.stringify(secondArtifact, null, 2));

  // Second run with second CSV path
  const res2 = runCli([...runArgs, '--dhanakom-out', csvPath2], { APP_MODE: 'DEV' });
  assert.equal(res2.status, 0);
  assert.ok(existsSync(csvPath2));
  const content2 = readFileSync(csvPath2, 'utf8');
  assert.ok(content2.includes('NEW VENDOR CO'));
  assert.ok(content2.includes('5900-OTHER,120.00,0.00'));
  // Old item (350.00) MUST NOT be in the new export
  assert.ok(!content2.includes('350.00'));
});

// TEST D: custom CSV path works via CLI
test('Dhanakom CLI D: custom --dhanakom-out path is respected', () => {
  const sb = sandbox();
  const customCsv = join(sb.dir, 'nested', 'custom-output.csv');
  mkdirSync(join(sb.dir, 'nested'), { recursive: true });

  const res = runCli([
    '--export-dhanakom',
    '--dhanakom-out', customCsv,
    '--inbox', sb.inboxDir,
    '--outbox', sb.outboxDir,
    '--review', sb.reviewDir,
    '--audit', sb.auditFile,
  ], { APP_MODE: 'DEV' });

  assert.equal(res.status, 0);
  assert.ok(existsSync(customCsv));
});

// TEST E: invalid --dhanakom-out without --export-dhanakom -> non-zero, no bridge execution
test('Dhanakom CLI E: --dhanakom-out without --export-dhanakom rejects with non-zero', () => {
  const sb = sandbox();
  const res = runCli(['--dhanakom-out', join(sb.dir, 'orphan.csv')], { APP_MODE: 'DEV' });
  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('--dhanakom-out specified without --export-dhanakom'));
  assert.ok(!existsSync(join(sb.dir, 'orphan.csv')));
});

// TEST F: audit record contains sha256 identity
test('Dhanakom CLI F: audit record logs sha256s correctly', () => {
  const sb = sandbox();
  const csvPath = join(sb.dir, 'audit-test.csv');
  runCli([
    '--export-dhanakom',
    '--dhanakom-out', csvPath,
    '--inbox', sb.inboxDir,
    '--outbox', sb.outboxDir,
    '--review', sb.reviewDir,
    '--audit', sb.auditFile,
  ], { APP_MODE: 'DEV' });

  const auditLines = readFileSync(sb.auditFile, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  const bridgeLine = auditLines.find((l) => l.stage === 'bridge-export');
  assert.ok(bridgeLine);
  assert.ok(Array.isArray(bridgeLine.sha256s));
  assert.equal(bridgeLine.sha256s.length, 1);
  assert.match(bridgeLine.sha256s[0], /^[0-9a-f]{64}$/);
});

// =======================================================
// Configuration Precedence Contract v1: Decision Table Tests
// =======================================================

// 1. Directory Matrix: per-field test (C4)
test('Precedence Matrix: C4 partial CLI override is strictly per-field', async () => {
  const { resolveRunnerConfig } = await import('../src/config.ts');
  const cfg = resolveRunnerConfig({
    root: '/root',
    args: ['--inbox', '/cli/inbox'],
    env: {
      INBOX_DIR: '/env/inbox',
      OUTBOX_DIR: '/env/outbox',
      REVIEW_DIR: '/env/review',
      AUDIT_FILE: '/env/audit.log',
    },
  });
  assert.equal(cfg.inboxDir, '/cli/inbox'); // CLI won
  assert.equal(cfg.outboxDir, '/env/outbox'); // ENV won
  assert.equal(cfg.reviewDir, '/env/review'); // ENV won
  assert.equal(cfg.auditFile, '/env/audit.log'); // ENV won
});

// 2. Client KB Matrix: K4 Invalid CLI does NOT fallback to valid ENV
test('Precedence Matrix: K4 invalid CLI KB does not fallback to valid ENV KB', () => {
  const sb = sandbox();
  const validEnvKb = join(sb.dir, 'valid-env.json');
  writeFileSync(validEnvKb, JSON.stringify({
    clientName: 'Env Client',
    vendorMappings: [{ vendorNamePattern: 'test', expenseAcct: '5001-ENV' }],
  }));
  const missingCliPath = join(sb.dir, 'missing-cli.json');

  const res = runCli(['--client-kb', missingCliPath], {
    APP_MODE: 'DEV',
    CLIENT_KB_PATH: validEnvKb,
  });

  assert.notEqual(res.status, 0);
  assert.ok(res.stderr.includes('Client KB file not found'));
});

// 3. Client KB Matrix: K2 Unset CLI + valid ENV KB -> load ENV KB
test('Precedence Matrix: K2 unset CLI with valid ENV KB loads successfully', () => {
  const sb = sandbox();
  const validEnvKb = join(sb.dir, 'valid-env.json');
  writeFileSync(validEnvKb, JSON.stringify({
    clientName: 'Env Client',
    vendorMappings: [{ vendorNamePattern: 'ร้านกาแฟ', expenseAcct: '5001-ENV', cashAcct: '1000-CASH' }],
  }));

  const res = runCli(['--inbox', sb.inboxDir, '--outbox', sb.outboxDir, '--review', sb.reviewDir, '--audit', sb.auditFile], {
    APP_MODE: 'DEV',
    CLIENT_KB_PATH: validEnvKb,
  });

  assert.equal(res.status, 0);
  const files = readdirSync(sb.outboxDir).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 1);
  const art = JSON.parse(readFileSync(join(sb.outboxDir, files[0]), 'utf8')) as ExportArtifact;
  assert.equal(art.journal.lines[0].accountCode, '5001-ENV');
});

// 4. Dhanakom Export Enablement Matrix: E1 - E5
test('Precedence Matrix: E1 unset CLI + unset ENV -> export false', async () => {
  const { resolveRunnerConfig } = await import('../src/config.ts');
  const cfg = resolveRunnerConfig({ root: '/root', args: [], env: {} });
  assert.equal(cfg.exportDhanakom, false);
});

test('Precedence Matrix: E2 unset CLI + ENV true -> export true', async () => {
  const { resolveRunnerConfig } = await import('../src/config.ts');
  const cfg = resolveRunnerConfig({ root: '/root', args: [], env: { EXPORT_DHANAKOM: 'true' } });
  assert.equal(cfg.exportDhanakom, true);
});

test('Precedence Matrix: E3 CLI present + ENV false -> export true (CLI wins)', async () => {
  const { resolveRunnerConfig } = await import('../src/config.ts');
  const cfg = resolveRunnerConfig({ root: '/root', args: ['--export-dhanakom'], env: { EXPORT_DHANAKOM: 'false' } });
  assert.equal(cfg.exportDhanakom, true);
});

test('Precedence Matrix: E4 absent CLI + invalid ENV -> ERROR', async () => {
  const { resolveRunnerConfig } = await import('../src/config.ts');
  assert.throws(
    () => resolveRunnerConfig({ root: '/root', args: [], env: { EXPORT_DHANAKOM: 'not-a-boolean' } }),
    /Invalid EXPORT_DHANAKOM value/,
  );
});

test('Precedence Matrix: E5 present CLI + invalid ENV -> export true (CLI precedence ignores unused ENV)', async () => {
  const { resolveRunnerConfig } = await import('../src/config.ts');
  const cfg = resolveRunnerConfig({
    root: '/root',
    args: ['--export-dhanakom'],
    env: { EXPORT_DHANAKOM: 'garbage-env' },
  });
  assert.equal(cfg.exportDhanakom, true);
});

// 5. Dhanakom Output Path Matrix: P1 - P6
test('Precedence Matrix: P2 unset CLI + DHANAKOM_OUT env -> env path used when enabled', async () => {
  const { resolveRunnerConfig } = await import('../src/config.ts');
  const cfg = resolveRunnerConfig({
    root: '/root',
    args: ['--export-dhanakom'],
    env: { DHANAKOM_OUT: '/custom/from-env.csv' },
  });
  assert.equal(cfg.dhanakomOutPath, '/custom/from-env.csv');
});

test('Precedence Matrix: P3 CLI output > ENV output', async () => {
  const { resolveRunnerConfig } = await import('../src/config.ts');
  const cfg = resolveRunnerConfig({
    root: '/root',
    args: ['--export-dhanakom', '--dhanakom-out', '/cli/path.csv'],
    env: { DHANAKOM_OUT: '/env/path.csv' },
  });
  assert.equal(cfg.dhanakomOutPath, '/cli/path.csv');
});

test('Precedence Matrix: P5/P6 DHANAKOM_OUT env without export enabled -> does not enable export', async () => {
  const { resolveRunnerConfig } = await import('../src/config.ts');
  const cfg = resolveRunnerConfig({
    root: '/root',
    args: [],
    env: { DHANAKOM_OUT: '/env/path.csv' }, // without EXPORT_DHANAKOM=true
  });
  assert.equal(cfg.exportDhanakom, false);
});
