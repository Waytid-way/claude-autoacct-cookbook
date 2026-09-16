import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// ทางสายกลาง (decision-log 2026-09-16): ไม่มี UI ให้นักบัญชี — เคสยาก
// (conflict, Negative Example) เสก HTML read-only รายครั้งจาก needs-review/
// แล้วทิ้ง ไม่ maintain ไม่ post ไม่อ่าน key ใดๆ
export interface ReviewOcr {
  vendorName?: string | null;
  issueDate?: string | null;
  amountSatang?: number | null;
  vatAmountSatang?: number | null;
  baseAmountSatang?: number | null;
  confidence?: number | null;
  taxId?: string | null;
  rawText?: string;
}

export interface ReviewCase {
  file: string;
  reasons: string[];
  ocr: ReviewOcr;
  model: string;
  correlationId?: string;
  sha256?: string;
}

const esc = (s: unknown): string =>
  String(s ?? '—').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const fmtMoney = (n: number | null | undefined): string =>
  n == null ? '—' : `${n.toLocaleString('en-US')} st (฿${(n / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })})`;

function tripleLine(o: ReviewOcr): string {
  if (o.amountSatang == null || o.vatAmountSatang == null) return 'ยอดไม่ครบ — ตรวจไม่ได้';
  if (o.baseAmountSatang != null) {
    const ok = o.amountSatang === o.baseAmountSatang + o.vatAmountSatang;
    return `${o.amountSatang} ${ok ? '===' : '!=='} ${o.baseAmountSatang} + ${o.vatAmountSatang} (exact triple ${ok ? 'ผ่าน' : 'ไม่ผ่าน'})`;
  }
  const ok = o.amountSatang > 0 && o.vatAmountSatang >= 0 && o.amountSatang > o.vatAmountSatang;
  return `base ไม่มา — totals-only fallback ${ok ? 'ผ่าน' : 'ไม่ผ่าน'}`;
}

function renderCase(c: ReviewCase, i: number): string {
  const o = c.ocr;
  return `<section aria-label="เคส ${i + 1}: ${esc(c.file)}">
  <div class="casehead"><div><p class="eyebrow">เคส ${i + 1} · ${esc(c.file)}${c.correlationId ? ` · <span class="mono">${esc(c.correlationId)}</span>` : ''}</p>
  <h2>${esc(o.vendorName ?? '(ไม่รู้ vendor)')} — ${esc(o.amountSatang != null ? `฿${(o.amountSatang / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'ยอดไม่ชัด')}</h2></div>
  <div class="stamp" role="status">NEEDS-<br>REVIEW</div></div>
  <h3>ทำไมตกมา needs-review</h3>
  <ul>${c.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  <h3>หลักฐานที่มี</h3>
  <div class="scroll"><table>
    <thead><tr><th>เรื่อง</th><th>ค่า</th></tr></thead><tbody>
    <tr><td>vendor</td><td>${esc(o.vendorName)}${o.taxId ? ` · TaxID <span class="mono">${esc(o.taxId)}</span>` : ' · ไม่มี TaxID'}</td></tr>
    <tr><td>วันที่ (ISO หลัง normalize)</td><td>${esc(o.issueDate)}</td></tr>
    <tr><td>ยอด total</td><td>${esc(fmtMoney(o.amountSatang))} <span class="muted">— บาทแสดงผลเท่านั้น ตัวจริงคือ Satang</span></td></tr>
    <tr><td>VAT</td><td>${esc(fmtMoney(o.vatAmountSatang))}</td></tr>
    <tr><td>สูตร triple</td><td class="mono">${esc(tripleLine(o))}</td></tr>
    <tr><td>confidence / model</td><td class="mono">${esc(o.confidence ?? '—')} · ${esc(c.model)}</td></tr>
    ${c.sha256 ? `<tr><td>sha256</td><td class="mono">${esc(c.sha256)}</td></tr>` : ''}
    </tbody></table></div>
  <div class="decide"><strong>ให้นักบัญชีตัดสิน:</strong> ยอด/วันที่ถูกไหม → ควร map บัญชีไหน → เหตุผลสั้นๆ (จะกลายเป็น Candidate รอ senior ก่อนเข้า Edge Log).
  <strong>ห้าม:</strong> auto-post, เดารหัสบัญชีเอง, rename vendor เงียบ — GL เดี่ยวไม่มี Negative Example อย่าตัดสินจากยอดอย่างเดียว</div>
  <details><summary>แบบตอบ (หลัก: ตอบคำถาม Pi บนหน้าจอ — บล็อกนี้ทางสำรองสำหรับรีวิวนอก Pi)</summary><pre>เคส: ${esc(c.file)} / cid ${esc(c.correlationId ?? '—')}
ผู้ตรวจ: &lt;ชื่อ&gt; / วันที่ตรวจ: &lt;YYYY-MM-DD&gt;

ผลตรวจ: (คงไว้ข้อเดียว)
[ ] ยืนยันตามนี้ → Dr &lt;รหัส&gt; / Cr &lt;รหัส&gt;
[ ] แก้ไขตามนี้ → &lt;ฟิลด์: ค่าใหม่&gt;
[ ] ขอหลักฐานเพิ่ม → &lt;ขาดอะไร&gt;

เหตุผล (บังคับ → resolution note):
&lt;ทำไมถึงตัดสินแบบนี้&gt;</pre></details>
</section>`;
}

export function renderReviewReport(cases: ReviewCase[], generatedAt = new Date().toISOString()): string {
  const body = cases.length
    ? cases.map(renderCase).join('\n')
    : '<p>ไม่มีเคสใน needs-review/ — ไม่มีอะไรให้ตรวจ</p>';
  return `<!doctype html>
<html lang="th">
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review รายครั้ง — needs-review (${cases.length} เคส)</title>
<style>
:root{color-scheme:light;--paper:#fff;--wash:#f4f4f2;--ink:#171717;--muted:#666662;--line:#9b9b95;--fail:#a33c28;--fail-bg:#fae5dc}
*{box-sizing:border-box}html{min-width:320px;background:var(--wash)}
body{margin:0;color:var(--ink);font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55}
main{width:min(960px,calc(100% - 32px));margin:0 auto;padding:28px 0 48px}
.note{border:1px dashed var(--line);color:var(--muted);padding:6px 10px;font-size:12px;display:inline-block}
h1{font-size:clamp(24px,4vw,36px);margin:8px 0}section{background:var(--paper);border:1px solid var(--ink);margin-top:16px;padding:18px}
.casehead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.casehead h2{margin:4px 0 0;font-size:22px}.eyebrow{font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--muted);margin:0}
.stamp{flex:none;border:2px solid var(--fail);color:var(--fail);padding:6px 12px;font-weight:800;text-align:center;transform:rotate(2deg)}
h3{font-size:15px;margin:16px 0 6px}ul{margin:6px 0;padding-left:22px}table{width:100%;border-collapse:collapse;font-size:13px}
th,td{border:1px solid var(--line);padding:7px 9px;text-align:left;vertical-align:top}th{background:var(--wash)}
.mono{font-family:ui-monospace,Menlo,monospace;font-size:12.5px}.muted{color:var(--muted)}.scroll{overflow-x:auto}
.decide{border-left:3px solid var(--fail);background:var(--fail-bg);padding:10px 12px;margin-top:14px;font-size:14px}
footer{color:var(--muted);font-size:12px;margin-top:16px}
:focus-visible{outline:3px solid var(--ink);outline-offset:2px}
</style></head>
<body><main>
<p class="note">Read-only · ตัดสินบนกระดาษ/แชท ไม่ post จากไฟล์นี้ · เสกแล้วทิ้งได้</p>
<h1>Needs-review — ${cases.length} เคสที่ต้องมีคนตัดสิน</h1>
<p class="muted">เสก ${esc(generatedAt)} จาก needs-review/*.json — อ่านอย่างเดียว ห้ามแก้ไฟล์ review/KB จากรายงานนี้</p>
${body}
<footer>Artifact รายครั้งตามปรัชญา effective-html: ไม่ใช่แอป ไม่ maintain — เคสจบ = ทิ้งไฟล์นี้ได้ audit.log.jsonl คือร่องรอยจริง</footer>
</main></body></html>`;
}

export function loadReviewDir(reviewDir: string, auditFile?: string): ReviewCase[] {
  let files: string[];
  try {
    files = readdirSync(reviewDir).filter((f: string) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
  const shaByCid = new Map<string, string>();
  if (auditFile) {
    try {
      for (const line of readFileSync(auditFile, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try {
          const o = JSON.parse(line) as { correlationId?: unknown; sha256?: unknown };
          if (typeof o.correlationId === 'string' && typeof o.sha256 === 'string') shaByCid.set(o.correlationId, o.sha256);
        } catch { /* corrupt line: skip */ }
      }
    } catch { /* no audit file yet */ }
  }
  const cases: ReviewCase[] = [];
  for (const f of files) {
    try {
      const o = JSON.parse(readFileSync(join(reviewDir, f), 'utf8')) as {
        file?: unknown; reasons?: unknown; ocr?: ReviewOcr; model?: unknown;
      };
      const cid = basename(f, '.json');
      cases.push({
        file: typeof o.file === 'string' ? o.file : f,
        reasons: Array.isArray(o.reasons) ? o.reasons.map(String) : ['(ไม่มีเหตุผล)'],
        ocr: o.ocr ?? {},
        model: typeof o.model === 'string' ? o.model : '—',
        correlationId: cid,
        sha256: shaByCid.get(cid),
      });
    } catch { /* unreadable review file: skip, never crash the report */ }
  }
  return cases;
}

// CLI: node src/review-report.ts --review needs-review --out review-report.html [--audit audit.log.jsonl]
const args = process.argv.slice(2);
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const reviewDir = flag('--review') ?? 'needs-review';
  const out = flag('--out') ?? 'review-report.html';
  const cases = loadReviewDir(reviewDir, flag('--audit'));
  writeFileSync(out, renderReviewReport(cases));
  console.log(`review-report: ${cases.length} case(s) -> ${out}`);
}
