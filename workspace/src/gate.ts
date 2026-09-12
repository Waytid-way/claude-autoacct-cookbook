import type { GateDecision, ValidatedReceipt } from './contract.ts';

// ponytail: pure function, no I/O; minConf รับตรงเป็น param, env เป็นแค่ default
const DEFAULT_MIN_CONF = 0.85;
export function gate(r: ValidatedReceipt, minConf: number = Number(process.env.GATE_MIN_CONF ?? DEFAULT_MIN_CONF)): GateDecision {
  const reasons: string[] = [];
  if (r.amountSatang == null) reasons.push('missing total');
  if (r.vatAmountSatang == null) reasons.push('missing vat');
  if (!r.issueDate) reasons.push('missing date');
  if (!r.vatCheckOk) reasons.push('vat cross-check failed (total != base + vat)');
  if ((r.confidence ?? 0) < minConf) reasons.push(`confidence ${(r.confidence ?? 0).toFixed(2)} < ${minConf}`);
  return { verdict: reasons.length ? 'needs-review' : 'pass', reasons };
}
