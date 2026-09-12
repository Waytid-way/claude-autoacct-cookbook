import { gate } from './src/gate.ts';

let n = 0;
const eq = (a: unknown, b: unknown, name: string) => {
  n++;
  if (JSON.stringify(a) !== JSON.stringify(b)) { console.error(`FAIL ${name}:`, a, '!==', b); process.exit(1); }
  console.log(`ok ${n} ${name}`);
};

// good receipt passes
eq(gate({ amountSatang: 35000, currency: 'THB', vatAmountSatang: 2290, vendorName: 'x', issueDate: '2026-09-12', confidence: 0.99, correlationId: 't', vatCheckOk: true }).verdict, 'pass', 'good passes');
// Ling-VL hallucination shape still passes numbers but low confidence gets caught
eq(gate({ amountSatang: 35000, currency: 'THB', vatAmountSatang: 2290, vendorName: 'ร้านค้าแฟชั่นสด', issueDate: '2026-09-12', confidence: 0.5, correlationId: 't', vatCheckOk: true }).verdict, 'needs-review', 'low conf caught');
// broken totals caught
eq(gate({ amountSatang: 100, currency: 'THB', vatAmountSatang: 200, vendorName: 'x', issueDate: '2026-09-12', confidence: 0.99, correlationId: 't', vatCheckOk: false }).reasons.join('|').includes('vat cross-check'), true, 'bad vat caught');
// missing fields caught
eq(gate({ amountSatang: null as any, currency: 'THB', vatAmountSatang: null, vendorName: null, issueDate: null, confidence: 0.99, correlationId: 't', vatCheckOk: false }).verdict, 'needs-review', 'missing caught');
console.log('selfcheck green');
