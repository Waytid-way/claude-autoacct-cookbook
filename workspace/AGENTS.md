# workspace/AGENTS.md — for agents working here

Pipeline slice: one receipt `inbox/` → `outbox/` or `needs-review/`, traced in `audit.log.jsonl`. Canonical language: `../CONTEXT.md`. Why things are this way: `../docs/decision-log.md`, `../docs/pi-harness.md`.

## Run

```bash
cp sample/receipt-001.jpg inbox/   # seed one receipt
APP_MODE=DEV node src/runner.ts    # mock, free, deterministic
APP_MODE=PROD node src/runner.ts   # real OCR (needs key for paid default)
npm test                           # black-box suite (must stay 9/9)
node selfcheck.ts                  # gate checks (must stay 4/4)
npm run typecheck                  # tsc (must stay green)
```

Done = outbox artifact exists with balanced journal + audit lines per receipt + all three checks green.

## Reference (gotchas the env won't tell you)

- `node --test` takes a **file** (`test/runner.test.ts`); a directory arg crashes. `npm test` already points right.
- PROD default model is paid (`OCR_MODEL`, see `src/runner.ts`); override per run, never commit keys. `:free` models are DEV-only.
- Money is Satang ints end to end; `totalBaht` in artifacts is display-only.
- Gate threshold comes from `minConf` param (env `GATE_MIN_CONF` is the fallback; default lives in `src/gate.ts`) — prefer the param; never mutate env to pass values.
- Journal accounts come from `expenseAcct`/`cashAcct` params (env `EXPENSE_ACCT`/`CASH_ACCT` read at runtime in `src/runner.ts`; defaults `5000-MEALS`/`1000-CASH` live in `src/pipeline.ts`) — never read env at import time.
- Validate prefers exact triple (`total === base + vat`) when OCR returns `baseAmountSatang`; totals-only check is the fallback, not the rule.
- Thai dates normalize (`DD/MM/YYYY`, Buddhist year −543) or the receipt fails the gate; unparseable dates are data, not crashes.
- OCR fallback chain (`OCR_MODEL` + `OCR_FALLBACK`) tries in order; PROD warns and skips `:free` entries, continuing the chain.
- Reruns skip passed files only (sha256 in audit log → `dedup-skip`, counted in `summary.skipped`); review/error files stay rerunnable.
- Tests never touch network: inject mock `ocr()`. The only real-OCR path is `pi` CLI (skill `.pi/skills/receipt-ocr-node/`); run it by hand, not in tests.
- Real client files: paid/local path only, never `:free`; needs consent. See decision-log 2026-09-12.
- Type new code explicitly (`| null` + narrow after the gate) and verify with `npm run typecheck` (repo-local script, not global tsc).
- Ship in small PRs (one ticket = one PR); review feedback goes to the same PR, never a new one.
