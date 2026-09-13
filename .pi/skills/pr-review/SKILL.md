---
name: pr-review
description: "สั่งรีวิว GitHub PR (เช่น 'รีวิว PR #123'): รีวิวสองแกนด้วย child teams แล้วโพสต์คอมเมนต์กลับ PR"
disable-model-invocation: true
---

# PR Review (สั่งทีมรีวิว แล้วโพสต์กลับ PR)

## Before you begin

You need: `gh` authed, a PR number in the current repo. Never merge/close from this skill (approval boundary). Tests always run with `PR_REVIEW_DRY_RUN=1` (write comment to file, never post).

## Inputs

- PR number (required), e.g. `รีวิว PR #25`. Optional override for tests: `base...head` range instead of a PR.
- Output mode B always: report in chat + post one comment to the PR (`gh pr comment`), unless dry-run.

## Steps

1. **Pin the PR.** `gh pr view <n> --json number,title,baseRefName,headRefName,state` + `gh pr diff <n>`. Done = non-empty diff and resolvable refs; else fail cleanly with the exact error, spawn nothing, post nothing.
2. **Identify spec source** (in order): issue refs in commit messages (`gh issue view`), user-supplied path, spec file under `docs/`/`specs/` matching the branch. None = Spec child reports "no spec available".
3. **Identify standards sources**: `CONTRIBUTING.md`, `CONTEXT.md`, repo `AGENTS.md`.
4. **Spawn two review children in the same turn (top-level only).** Children must not spawn. Cap each report at 400 words. Give each child the diff command, commit list, and evidence pointers (issue bodies, benchmark docs, tsc results) — reviewers see diff only, so pointers prevent false "no evidence" verdicts.
   - Standards child: every diff breach of a documented standard (cite file + rule) + code smells (name + quote hunk). Also run cheap file-level checks on new files: missing EOF newline, bare/unverifiable references, mode-only noise, secrets/keys.
   - Spec child: missing/partial requirements (quote spec), scope creep, implemented-but-wrong. Quote the spec line per finding.
5. **Aggregate.** Report `## Standards` and `## Spec` separately, verbatim or lightly cleaned. Never merge or rerank across axes. End each axis with: finding count + worst issue within that axis.
6. **CDE gate.** If either axis found material defects, bugs, or bad logic: invoke the `critical-decision-execution` skill on the findings (mode + executable plan) before the verdict. If clean, say so in one line and skip.
7. **Publish.** Chat report first, then `gh pr comment <n> --body-file <file>` with the same report. Dry-run: write the file, print its path, do not post.

Done = chat report posted in-conversation + (comment URL from `gh`, or dry-run file path). A finding without file/line evidence is not a finding — drop it.
