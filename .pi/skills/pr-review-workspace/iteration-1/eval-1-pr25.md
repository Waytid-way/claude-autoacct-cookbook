# DRY-RUN — PR #25 review comment (NOT POSTED)

## Standards (5: 2 hard + 3 judgement)

- H1 PR title lacks conventional-commit prefix (CONTRIBUTING "PR Title Format").
- H2 Silent catch in loadSeenHashes swallows JSON errors without file/line log.
- J1 Sliced warn messages (observability only; AggregateError keeps causes).
- J2 `dedup-skip` reuses CONTEXT-banned word "dedup" — define it or rename.
- J3 OCR_FALLBACK read at module load — hurts testability, not correctness.

## Spec (4)

1. Body says "JSON store", code parses audit log per line — wording wrong.
2. Fallback chain untested (no suite coverage of order/:free-skip/AggregateError).
3. CONTEXT Dual-run/Dhanakom Bridge undocumented in body (minor creep).
4. seen.add before success: needs-review/error files get remembered → rerun skips instead of allowing re-review. Fix: remember only on pass.

## CDE gate — mode: execute_now (local, reversible, evidence strong)

Fix batch: (1) remember hash only on pass, (2) unit-test fallback chain via extracted buildChain(), (3) CONTEXT note for dedup-skip, (4) Buddhist-year ISO handling. Then green suite → fix PR. Follow-ups: PR title process, empty-chain message.

## Summary

Standards: 5 findings, worst = H2 silent catch. Spec: 4 findings, worst = #4 dedup semantics. No merge-blockers (post-merge); fix batch recommended.
