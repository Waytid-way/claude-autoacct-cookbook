# Definition of Done (DoD) & Production Readiness Policy

> **Canonical Source of Truth** for AutoAcct / Agentic Accounting Ops deployment lifecycle and readiness classification.
>
> **Core Principle:**
> `Automated Tests Passed ≠ Production Ready`
> `Implementation Verified ≠ Live Ready`

---

## 1. Lifecycle Status Model

All AutoAcct components, pipelines, and slices move through a strictly ordered progression:

```text
[ IMPLEMENTATION_VERIFIED ]
            ↓
    [ PILOT_PENDING ]
            ↓
    [ PILOT_VERIFIED ]
            ↓
[ PROD_READINESS_PENDING ]
            ↓
      [ PROD_READY ]
            ↓
         [ LIVE ]
```

### Transition Invariants
1. A slice **MUST NOT** be termed or labeled `PROD_READY`, `Live Ready`, or `Production Ready` merely because automated test suites or implementation verifications pass.
2. `PROD_READY` can only be achieved **AFTER**:
   - `IMPLEMENTATION_VERIFIED` is formally recorded.
   - `PILOT_VERIFIED` is formally proven with real external software and real receipt evidence.
   - All Operational, Security, PII, and Human Acceptance gates are signed off.

---

## 2. The Three Quality Gates

### Gate A: IMPLEMENTATION_VERIFIED
*Scope: Technical and deterministic correctness within the isolated codebase environment.*

To pass Gate A, all of the following must be evidenced:
- [ ] Code implementation complete and clean (no dead code, no speculative scaffolding).
- [ ] Automated unit and integration test suites pass 100% (`npm test`).
- [ ] Behavioral & process-boundary tests verify CLI execution, exit codes, and output artifacts.
- [ ] Configuration Precedence Contract verified: `CLI > ENV > Defaults` per-field.
- [ ] Safety Invariants enforced: Selected invalid CLI/ENV options fail fast; **no silent fallback** to default accounts.
- [ ] Accounting control integrity: AI never makes GL classification or financial mutation decisions autonomously.
- [ ] Audit & Idempotency: Append-only audit records exist with SHA-256 hashes; deduplication suppression proven.

> **Status upon Gate A completion:** `IMPLEMENTATION_VERIFIED` (Move to `PILOT_PENDING`).
> **Prohibition:** Strictly forbidden from claiming production readiness at this gate.

---

### Gate B: REAL-WORLD PILOT VERIFIED
*Scope: Field verification with actual accounting software, real Thai receipts, and practicing accountants.*

To pass Gate B, all of the following real-world evidence must be documented:

#### 1. Dhanakom / Express Accounting Software
- [ ] Export batch CSV generated from `outbox/` imported directly into Express on Windows.
- [ ] File encoding verified (e.g. TIS-620 / CP874 / UTF-8 with BOM compatibility in Express).
- [ ] Column headers, date formats, voucher references, and accounts mapped without import errors.
- [ ] Debit/Credit balance verified inside Express GL ledger.
- [ ] Repeat import attempts blocked by operator procedure matching AutoAcct idempotency.
- *Evidence Required:* Express screenshot, batch import log, or pilot confirmation report.

#### 2. OCR & Receipt Processing (Benchmark 20–50 Real Receipts)
- [ ] Real-world benchmark run across 20–50 diverse Thai receipts (folded, faded, thermal, varied formats).
- [ ] Field-level accuracy metrics documented (Vendor Name, Tax ID, Total Satang, VAT Satang, Date).
- [ ] Confidence threshold calibration documented (false pass rate vs false rejection rate).
- [ ] Needs-Review routing rate documented and verified within operational capacity.
- [ ] Failure patterns and edge cases logged into documentation.
- *Evidence Required:* Link to benchmark run results (e.g. `docs/vision-benchmark.md` or dedicated benchmark report).

#### 3. Human Workflow & Accountant Feedback
- [ ] Practicing accountant or firm operator executes the end-to-end workflow (Intake → Pi/CLI run → Review → Export).
- [ ] Read-only exception inspection tested on actual `needs-review/*.json` cases.
- [ ] Feedback on operational friction, clarity of summaries, and missing metadata documented.
- [ ] Known limitations explicitly acknowledged by the accounting team.
- *Evidence Required:* Accountant acceptance notes or documented pilot feedback.

> **Status upon Gate B completion:** `PILOT_VERIFIED` (Move to `PROD_READINESS_PENDING`).

---

### Gate C: PROD / LIVE READY
*Scope: Complete operational readiness, security governance, and formal sign-off.*

To achieve `PROD_READY` or deploy to `LIVE`, every criterion below must be satisfied and backed by verifiable evidence:

#### A. Code & Test Integrity
- [ ] Automated regression suite green with zero flakes (`npm test`).
- [ ] Zero unreviewed diffs or untracked operational scripts.
- [ ] Release artifact pinned to an immutable git commit hash and semantic version.

#### B. Accounting Safety & Control Boundaries
- [ ] "AI proposes; control system decides" architecture strictly adhered to.
- [ ] Safe-by-default behavior confirmed: unmapped vendors halt in `needs-review/`.
- [ ] Audit trail verified as immutable, append-only, and comprehensive.

#### C. Dhanakom Bridge Production Readiness
- [ ] File-based import SOP documented for desktop workstations.
- [ ] Field-level reconciliations signed off by senior accountant.
- [ ] Error handling and corruption recovery documented for export CSV files.

#### D. Vision / OCR Production Governance
- [ ] PROD vision model configured (using paid tier, no `:free` models per AGENTS.md policy).
- [ ] API keys securely provisioned via environment variables (never committed).
- [ ] Fallback chain verified and rate-limit backoff policy in place.

#### E. Operations & Runbooks
- [ ] Production execution guide documented (inbox drop, schedule, audit rotation).
- [ ] Rollback procedure documented (how to handle erroneous exports before GL posting).
- [ ] Backup and disaster recovery procedures documented for audit logs and outbox files.
- [ ] Operational ownership and escalation paths clearly assigned.

#### F. Security, PII & Tool Authority
- [ ] PII and financial confidentiality policy enforced (no raw client data sent to public endpoints without consent).
- [ ] Pi skill boundaries strictly read/present only; no arbitrary mutation or code execution access.
- [ ] Operating directory permissions on local workstation restricted.

#### G. Human Authority & Formal Sign-Off
- [ ] Lead/Senior Accountant formal sign-off recorded.
- [ ] Residual operational risks documented with designated risk owners.
- [ ] Go-Live authorization formally granted.

---

## 3. Current AutoAcct System Status (Source of Truth)

| Dimension | Current Status | Notes & Evidence |
| :--- | :--- | :--- |
| **Technical Implementation** | **`IMPLEMENTATION_VERIFIED`** | 42/42 tests pass; CLI Seam, Precedence, and Dhanakom Bridge verified. |
| **Real-World Pilot** | **`PILOT_PENDING`** | Express import & 20–50 real receipt benchmark (#14) not yet performed. |
| **PROD / Live State** | **`NOT READY`** | Cannot be considered PROD_READY until Gates B and C are passed. |
| **US13 (Knowledge Write-Back)** | **`DEFERRED`** | Candidate mapping / Edge Log mutation out of scope for v1. |
| **Next Target Gate** | **`REAL-WORLD PILOT (Gate B)`** | Express manual import test + benchmark real receipts. |

---

## 4. Operational Rule for AI Agents

1. **Never claim `PROD_READY` or `Live Ready`** in any output, pull request, commit message, or conversation unless Gate B and Gate C are evidenced and documented in this file.
2. Any user prompt asking to "deploy to production" or "go live" must be checked against this document. If status is `PILOT_PENDING` or `PROD_READINESS_PENDING`, the agent must decline with reference to the specific missing criteria.
