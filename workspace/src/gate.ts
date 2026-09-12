import type { GateDecision, ValidatedReceipt } from './contract.ts';

const MIN_CONF = Number(process.env.GATE_MIN_CONF ?? 0.85);

// ponytail: pure function, no I/O; thresholds via env, config file when >1 client needs differ
export function gate(r: ValidatedReceipt): GateDecision {
  const reasons: string[] = [];
  if (r.amountSatang == null) reasons.push('missing total');
  if (r.vatAmountSatang == null) reasons.push('missing vat');
  if (!r.issueDate) reasons.push('missing date');
  if (!r.vatCheckOk) reasons.push('vat cross-check failed (total != base + vat)');
  if ((r.confidence ?? 0) < MIN_CONF) reasons.push(`confidence ${(r.confidence ?? 0).toFixed(2)} < ${MIN_CONF}`);
  return { verdict: reasons.length ? 'needs-review' : 'pass', reasons };
}
