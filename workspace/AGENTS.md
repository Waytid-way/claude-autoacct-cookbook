# workspace/AGENTS.md — for agents working here

Pipeline slice: one receipt `inbox/` → `outbox/` or `needs-review/`, traced in `audit.log.jsonl`. Canonical language: `../CONTEXT.md`. Why things are this way: `../docs/decision-log.md`, `../docs/pi-harness.md`.

## Run

```bash
cp sample/receipt-001.jpg inbox/   # seed one receipt
APP_MODE=DEV node src/runner.ts    # mock, free, deterministic
APP_MODE=PROD node src/runner.ts   # real OCR (needs key for paid default)
npm test                           # black-box suite (must stay green; R-series pin the report)
node selfcheck.ts                  # gate checks (must stay 4/4)
npm run report -- --review needs-review --out review-report.html  # disposable read-only case sheet (no UI); delete after use
npm run typecheck                  # tsc (must stay green)
```

Done = outbox artifact exists with balanced journal + audit lines per receipt + all three checks green.

## Review loop (needs-review → human decision, no UI)

- Sheet: `npm run report -- --review needs-review --out review-report.html` (+ `--audit audit.log.jsonl` for sha/model). Zero-JS static HTML, gitignored — delete after use.
- Capture: Pi asks via `ask_user_question` (verdict first, then conditional follow-up; options only from the review JSON + KB refs). Never make the accountant copy-paste.
- Fallback for async/offline: `review-reply.template.md`.
- US13: acknowledge answers, never mutate review/KB files, never auto-post — posting happens in Dhanakom. See `../docs/decision-log.md` 2026-09-16 ×2.

## Modes (Builder vs Desk) + feedback

- **Builder** (code sessions): full tools, DEV only, never real client files. Session start = read `feedback/` for open `- [ ]`, tick `- [x]` + fix ref when done, never delete history.
- **Desk** (accountant sessions): run CLI + read + ask only. May write **`feedback/YYYY-MM-DD.md`** and nothing else. Never edit code/KB, never auto-post.
- Daily flow lives in `daily-routine.md` (morning queue → evening close + 3 quality questions).

## Reference (gotchas the env won't tell you)

- `node --test` takes a **file** (`test/runner.test.ts`); a directory arg crashes. `npm test` already points right.
- PROD default model is paid (`OCR_MODEL`, see `src/runner.ts`); override per run, never commit keys. `:free` models are DEV-only.
- Money is Satang ints end to end; `totalBaht` in artifacts is display-only.
- Gate threshold comes from `minConf` param (env `GATE_MIN_CONF` is the fallback; default lives in `src/gate.ts`) — prefer the param; never mutate env to pass values.
- Journal accounts come from `expenseAcct`/`cashAcct` params (env `EXPENSE_ACCT`/`CASH_ACCT` read at runtime in `src/runner.ts`; defaults `5000-MEALS`/`1000-CASH` live in `src/pipeline.ts`) — never read env at import time.
- Validate prefers exact triple (`total === base + vat`) when OCR returns `baseAmountSatang`; totals-only check is the fallback, not the rule.
- Conflict tiered hold: TaxID exact auto-passes; ≥2 distinct Tier-2 name matches hold as `needs-review` naming both accounts (`conflict: A vs B`) — same account twice is agreement, never hold. See `src/kb-resolver.ts` (`matchTaxId`/`matchNameMappings`/`findConflictingAccounts`).
- Thai dates normalize (`DD/MM/YYYY`, Buddhist year −543) or the receipt fails the gate; unparseable dates are data, not crashes.
- OCR fallback chain (`OCR_MODEL` + `OCR_FALLBACK`) tries in order; PROD warns and skips `:free` entries, continuing the chain.
- Reruns skip passed files only (sha256 in audit log → `dedup-skip`, counted in `summary.skipped`); review/error files stay rerunnable.
- Tests never touch network: inject mock `ocr()`. The only real-OCR path is `pi` CLI (skill `.pi/skills/receipt-ocr-node/`); run it by hand, not in tests.
- Real client files: paid/local path only, never `:free`; needs consent. See decision-log 2026-09-12.
- Type new code explicitly (`| null` + narrow after the gate) and verify with `npm run typecheck` (repo-local script, not global tsc).
- Ship in small PRs (one ticket = one PR); review feedback goes to the same PR, never a new one.
