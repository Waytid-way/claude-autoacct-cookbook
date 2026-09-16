import type { ValidatedReceipt } from './contract.ts';

export interface VendorMappingRule {
  taxId?: string | null;
  vendorNamePattern?: string | null; // exact or normalized substring
  expenseAcct: string;
  cashAcct?: string;
}

export interface ClientKnowledge {
  clientName?: string;
  defaultCashAcct?: string;
  vendorMappings: VendorMappingRule[];
}

export interface ResolvedAccounts {
  expenseAcct: string;
  cashAcct: string;
}

// ponytail: string normalization only; fuzzy phonetic / LLM matching deferred to explicit review
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hasMappings(clientKb?: ClientKnowledge): clientKb is ClientKnowledge {
  return !!clientKb?.vendorMappings?.length;
}

// Tier 1 (Canonical Vendor Lookup): exact 13-digit Tax ID — deterministic, auto-pass.
export function matchTaxId(
  receipt: ValidatedReceipt,
  clientKb?: ClientKnowledge,
): VendorMappingRule | undefined {
  if (!hasMappings(clientKb) || !receipt.taxId) return undefined;
  const cleanTaxId = receipt.taxId.replace(/\D/g, '');
  if (cleanTaxId.length !== 13) return undefined;
  return clientKb.vendorMappings.find(
    (m) => m.taxId && m.taxId.replace(/\D/g, '') === cleanTaxId,
  );
}

// Tier 2: normalized vendor name substring — ALL matches (POSSIBLY-matched territory).
export function matchNameMappings(
  receipt: ValidatedReceipt,
  clientKb?: ClientKnowledge,
): VendorMappingRule[] {
  if (!hasMappings(clientKb) || !receipt.vendorName) return [];
  const normReceiptVendor = normalize(receipt.vendorName);
  return clientKb.vendorMappings.filter((m) => {
    if (!m.vendorNamePattern) return false;
    return normReceiptVendor.includes(normalize(m.vendorNamePattern));
  });
}

// Tiered hold (Conflict): TaxID exact wins outright; ≥2 DISTINCT Tier-2 accounts → hold.
// Same account twice is agreement, not conflict.
export function findConflictingAccounts(
  receipt: ValidatedReceipt,
  clientKb?: ClientKnowledge,
): string[] {
  if (matchTaxId(receipt, clientKb)) return [];
  const accts = [...new Set(matchNameMappings(receipt, clientKb).map((m) => m.expenseAcct))];
  return accts.length > 1 ? accts : [];
}

export function resolveAccounts(
  receipt: ValidatedReceipt,
  clientKb?: ClientKnowledge,
): ResolvedAccounts | null {
  if (!hasMappings(clientKb)) return null;
  const defaultCash = clientKb.defaultCashAcct ?? '1000-CASH';
  const match = matchTaxId(receipt, clientKb) ?? matchNameMappings(receipt, clientKb)[0];
  if (!match) return null;
  return {
    expenseAcct: match.expenseAcct,
    cashAcct: match.cashAcct ?? defaultCash,
  };
}
