# Iteration 1 grades (inline, headless — no browser viewer on Termux)

## Eval 1 — PR #25 dry-run
- with-skill: 2 axes, 9 findings (STD 5 + SPEC 4), evidence-quoted, CDE mode+plan, dry-run file, zero posts. PASS (all assertions: sections present, counts present, file exists, no gh post).
- baseline: 5 findings inline, strong on code paths (seen.add, empty chain, BE-ISO, load-time env). Overlapping 3/5 with skill team; missed spec-fidelity items (title format, body-vs-code wording, CONTEXT collision).
- delta: skill adds structure + spec-fidelity + publish discipline; costs 2 extra child calls.

## Eval 2 — PR #24 dry-run
- with-skill: STD 2 (title format, description template) + SPEC 2 (unlisted blueprint file, mode-only noise), clean verdict otherwise. PASS.
- baseline: 3 findings + positives, caught unverifiable vendor refs + missing EOF newline (skill team missed both).
- delta: baseline sharper on file-level nits; skill team better on process/spec structure.

## Eval 3 — invalid PR #9999
- with-skill path (bash): clean GraphQL error, nothing spawned/posted/written. PASS.
- baseline: identical clean failure. PASS. No delta (correct — failure path needs no skill).

## Skill verdict
pr-review works: child orchestration fires, two axes stay separate, dry-run respected, CDE gate engages on defects. Gaps to improve: (1) reviewers should also run cheap file-level checks (EOF newline, bare refs) — baseline beat them there; (2) eval-1 CDE fix batch is unimplemented (awaiting owner).
