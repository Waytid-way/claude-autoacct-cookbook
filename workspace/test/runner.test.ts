import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { runPipeline } from '../src/pipeline.ts';
import { normalizeThaiDate } from '../src/pipeline.ts';
import type { OcrFn } from '../src/pipeline.ts';
import type { ExportArtifact } from '../src/contract.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

interface Sandbox {
  inboxDir: string;
  outboxDir: string;
  reviewDir: string;
  auditFile: string;
}

function sandbox(): Sandbox {
  const base = mkdtempSync(join(tmpdir(), 'autoacct-'));
  const sb: Sandbox = {
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
