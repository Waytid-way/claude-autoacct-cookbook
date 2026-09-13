# .pi — repo-local skills, agents, tools

Local extensions for this repo. Global skills live in `~/.pi/agent/skills/` and `~/.agents/skills/` — put something here only when it is specific to this repo's workflow.

## Layout

- `skills/` — user-invoked skills (you type the name; zero context load). Each skill: one folder, one `SKILL.md`.
- `agents/` — agent definitions (role prompts for spawned teammates). Created lazily on first use.
- `tools/` — runnable helpers (scripts, CLIs) this repo's agents may call. Created lazily on first use.

## Skills

- `receipt-ocr-node` — run one Thai receipt through a vision model via `pi` CLI and get Satang JSON back. Reach for it when: wiring PROD OCR, benchmarking a model, or re-running a receipt by hand.
- `pr-review` — order a two-axis PR review (child teams) with CDE gate and post-back to the PR. Reach for it when: reviewing a GitHub PR, or validating a branch before merge.
