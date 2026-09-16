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

export function resolveAccounts(
  receipt: ValidatedReceipt,
  clientKb?: ClientKnowledge,
): ResolvedAccounts | null {
  if (!clientKb || !clientKb.vendorMappings || clientKb.vendorMappings.length === 0) {
    return null;
  }

  const defaultCash = clientKb.defaultCashAcct ?? '1000-CASH';

  // 1. Primary: exact 13-digit Tax ID lookup
  if (receipt.taxId) {
    const cleanTaxId = receipt.taxId.replace(/\D/g, '');
    if (cleanTaxId.length === 13) {
      const match = clientKb.vendorMappings.find(
        (m) => m.taxId && m.taxId.replace(/\D/g, '') === cleanTaxId,
      );
      if (match) {
        return {
          expenseAcct: match.expenseAcct,
          cashAcct: match.cashAcct ?? defaultCash,
        };
      }
    }
  }

  // 2. Fallback: normalized vendor name match
  if (receipt.vendorName) {
    const normReceiptVendor = normalize(receipt.vendorName);
    const match = clientKb.vendorMappings.find((m) => {
      if (!m.vendorNamePattern) return false;
      const normPattern = normalize(m.vendorNamePattern);
      return normReceiptVendor.includes(normPattern);
    });
    if (match) {
      return {
        expenseAcct: match.expenseAcct,
        cashAcct: match.cashAcct ?? defaultCash,
      };
    }
  }

  return null;
}
