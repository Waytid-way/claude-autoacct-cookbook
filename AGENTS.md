# claude-autoacct-cookbook — AGENTS.md

Cookbook + workspace: Thai receipt OCR recipes and a running pipeline slice that turns receipts into Express-ready journal files. Pi is the harness.

## Map (one trigger per branch — open only the doc your branch needs)

- Naming things, term conflicts, or KB/join/evidence questions → `CONTEXT.md` (wins on conflicts)
- Asking why the code is shaped this way, or logging a new architectural call → `docs/decision-log.md`
- Running, checking, or shipping the pipeline slice → `workspace/AGENTS.md`
- Running OCR by hand or benchmarking a model → `.pi/skills/receipt-ocr-node/`
- Choosing a model (free list, measured results) → `docs/openrouter-vision-free.md`, `docs/vision-benchmark.md`
- Writing a new recipe → `CONTRIBUTING.md`
- Long-term direction (never MVP scope) → owner's blueprint file, kept outside this repo

## Run

```bash
cd workspace && cp sample/receipt-001.jpg inbox/ && APP_MODE=DEV node src/runner.ts
npm --prefix workspace test && node workspace/selfcheck.ts
```

Done = outbox artifact with balanced journal + audit lines per receipt + tests 6/6, selfcheck 4/4, typecheck green (commands in `workspace/AGENTS.md`).

## Guardrails

- Route real client data through the paid/local path with consent; the `:free` path is DEV/test only.
- Keep money in Satang ints (see `docs/glossary.md`).
- Open PRs for review; merging to main needs explicit approval.
