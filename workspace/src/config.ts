import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import type { ClientKnowledge } from './kb-resolver.ts';

export interface RunnerConfig {
  inboxDir: string;
  outboxDir: string;
  reviewDir: string;
  auditFile: string;
  clientKb?: ClientKnowledge;
  exportDhanakom: boolean;
  dhanakomOutPath?: string;
  expenseAcct?: string;
  cashAcct?: string;
  appMode: string;
  ocrModel: string;
  ocrFallback: string[];
}

export interface ResolveConfigOptions {
  args?: string[];
  env?: Record<string, string | undefined>;
  root: string;
}

export function validateClientKnowledge(raw: unknown): ClientKnowledge {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Client Knowledge must be an object');
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.vendorMappings)) {
    throw new Error('Client Knowledge missing vendorMappings array');
  }
  for (const m of obj.vendorMappings) {
    if (typeof m !== 'object' || m === null) {
      throw new Error('Vendor mapping entry must be an object');
    }
    const vm = m as Record<string, unknown>;
    if (typeof vm.expenseAcct !== 'string' || !vm.expenseAcct.trim()) {
      throw new Error('Vendor mapping requires valid expenseAcct');
    }
  }
  return raw as ClientKnowledge;
}

export function loadClientKbFile(filePath: string): ClientKnowledge {
  if (!existsSync(filePath)) {
    throw new Error(`Client KB file not found: ${filePath}`);
  }
  let content: string;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (e) {
    throw new Error(`Failed to read Client KB file: ${filePath} (${e instanceof Error ? e.message : e})`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid JSON in Client KB file: ${filePath} (${e instanceof Error ? e.message : e})`);
  }
  return validateClientKnowledge(parsed);
}

export function resolveRunnerConfig(opts: ResolveConfigOptions): RunnerConfig {
  const env = opts.env ?? process.env;
  const rawArgs = opts.args ?? process.argv.slice(2);

  const { values } = parseArgs({
    args: rawArgs,
    options: {
      'client-kb': { type: 'string' },
      'inbox': { type: 'string' },
      'outbox': { type: 'string' },
      'review': { type: 'string' },
      'audit': { type: 'string' },
      'export-dhanakom': { type: 'boolean' },
      'dhanakom-out': { type: 'string' },
    },
    strict: true,
  });

  // Precedence: CLI > ENV > Default
  const inboxDir = values.inbox ?? env.INBOX_DIR ?? `${opts.root}/inbox`;
  const outboxDir = values.outbox ?? env.OUTBOX_DIR ?? `${opts.root}/outbox`;
  const reviewDir = values.review ?? env.REVIEW_DIR ?? `${opts.root}/needs-review`;
  const auditFile = values.audit ?? env.AUDIT_FILE ?? `${opts.root}/audit.log.jsonl`;

  // Dhanakom flags
  // E1-E5: Canonical parse for EXPORT_DHANAKOM
  let exportDhanakomEnv: boolean | undefined;
  if (env.EXPORT_DHANAKOM !== undefined) {
    const rawEnv = env.EXPORT_DHANAKOM.trim().toLowerCase();
    if (rawEnv === 'true' || rawEnv === '1') {
      exportDhanakomEnv = true;
    } else if (rawEnv === 'false' || rawEnv === '0') {
      exportDhanakomEnv = false;
    } else {
      exportDhanakomEnv = undefined; // marks invalid env
    }
  }

  const exportDhanakomCli = values['export-dhanakom'];
  let exportDhanakom: boolean;

  if (exportDhanakomCli !== undefined) {
    exportDhanakom = exportDhanakomCli;
  } else if (env.EXPORT_DHANAKOM !== undefined) {
    if (exportDhanakomEnv === undefined) {
      throw new Error(`Invalid EXPORT_DHANAKOM value: "${env.EXPORT_DHANAKOM}" (must be true/false/1/0)`);
    }
    exportDhanakom = exportDhanakomEnv;
  } else {
    exportDhanakom = false;
  }

  // P1-P6: Dhanakom output path (CLI > DHANAKOM_OUT / DHANAKOM_OUT_PATH > Default)
  const dhanakomOutCli = values['dhanakom-out'];
  const dhanakomOutPath = dhanakomOutCli ?? env.DHANAKOM_OUT ?? env.DHANAKOM_OUT_PATH;

  // P5: CLI --dhanakom-out without export enabled must error
  if (dhanakomOutCli && !exportDhanakom) {
    throw new Error('--dhanakom-out specified without --export-dhanakom');
  }

  // Client KB resolution with fail-fast invariants
  const clientKbPath = values['client-kb'] ?? env.CLIENT_KB_PATH;
  let clientKb: ClientKnowledge | undefined;
  if (clientKbPath) {
    clientKb = loadClientKbFile(clientKbPath);
  }

  const appMode = env.APP_MODE ?? 'DEV';
  const ocrModel = env.OCR_MODEL ?? 'google/gemini-2.5-flash-lite';
  const ocrFallback = (env.OCR_FALLBACK ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  return {
    inboxDir,
    outboxDir,
    reviewDir,
    auditFile,
    clientKb,
    exportDhanakom,
    dhanakomOutPath,
    expenseAcct: env.EXPENSE_ACCT,
    cashAcct: env.CASH_ACCT,
    appMode,
    ocrModel,
    ocrFallback,
  };
}
