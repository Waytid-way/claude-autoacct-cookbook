# Agentic Accounting Ops --- Phase 0 Knowledge Building

## First-Principles Architecture & Data Model

**Status:** Architecture Working Baseline\
**Scope:** Pi Agent → Agentic Accounting Ops, starting with AP
Automation\
**Phase:** 0 --- Historical Accounting Knowledge Building\
**Primary sources:** General Ledger, Invoice, Accounting Books, and
related historical accounting evidence

------------------------------------------------------------------------

# 0. Executive Summary

The goal is not merely to build a document repository or RAG system.

The goal is to transform historical accounting evidence into
**machine-usable institutional accounting knowledge** that:

-   has explicit provenance;
-   distinguishes facts from observations and inferences;
-   understands temporal scope;
-   records contradictions and exceptions;
-   can be revalidated when evidence or policy changes;
-   can support accounting decisions for new invoices;
-   remains auditable by humans.

The core principle is:

> **Historical accounting data is evidence, not truth by default.**

The system must therefore follow:

``` text
RAW DATA
   ↓
EVIDENCE
   ↓
RELATIONSHIPS
   ↓
OBSERVATIONS
   ↓
HYPOTHESES
   ↓
VALIDATION
   ↓
KNOWLEDGE
   ↓
DECISION SUPPORT
   ↓
HUMAN DECISION
   ↓
NEW EVIDENCE
   ↺
```

The architecture deliberately separates:

``` text
Structured evidence = truth substrate
Semantic retrieval  = retrieval mechanism
LLM                 = reasoning / interpretation
Policy              = constraint
Human               = authority where required
Audit trail         = accountability
```

This prevents the system from becoming a generic Accounting RAG where
retrieved text or LLM confidence is incorrectly treated as accounting
truth.

------------------------------------------------------------------------

# 1. Define the Problem

## 1.1 The real problem

The real problem is not:

> "There are too many accounting documents for a human to read."

The deeper problem is:

> When a new invoice arrives, the Agent does not inherently know how
> this organization historically treated similar transactions, why that
> treatment was used, what evidence supports it, whether the historical
> behavior is still valid, and where exceptions exist.

Therefore Phase 0 must establish a reusable institutional knowledge
substrate.

``` text
Historical Accounting Evidence
        ↓
Understand what happened
        ↓
Understand recurring organizational behavior
        ↓
Identify possible accounting rules / patterns
        ↓
Validate them
        ↓
Make validated knowledge reusable
        ↓
Apply it to new transactions
```

## 1.2 The three questions Phase 0 must answer

For a future accounting decision:

1.  **What happened historically?**
2.  **What pattern or policy can reasonably be inferred from that
    history?**
3.  **What evidence supports the recommendation, and what remains
    uncertain?**

------------------------------------------------------------------------

# 2. Strip Assumptions

A major part of First-Principles analysis is identifying assumptions
that are often accepted without examination.

  -----------------------------------------------------------------------
  Assumption              Status                  Reason
  ----------------------- ----------------------- -----------------------
  Putting all documents   False                   Retrieval is not
  into a Vector DB                                knowledge
  creates a KB                                    

  Historical GL entries   Unproven                Historical records can
  are all correct                                 contain corrections,
                                                  errors, or exceptions

  Most frequent treatment False                   Frequency may represent
  equals accounting rule                          habit, not policy

  LLM-generated summaries False                   They are
  are facts                                       interpretations unless
                                                  grounded in source
                                                  evidence

  A single invoice        Usually false           Accounting treatment
  contains enough context                         may depend on vendor,
  to determine treatment                          entity, period, policy,
                                                  tax, etc.

  LLM confidence equals   False                   Model confidence and
  accounting correctness                          accounting validity are
                                                  different properties

  Historical behavior     False                   Policies, accounts, tax
  remains valid forever                           treatment, and business
                                                  context can change

  Similarity search       False                   Semantic similarity
  always finds the best                           does not guarantee
  evidence                                        decision relevance

  Human approval solves   False                   Humans can approve bad
  all risk                                        or poorly presented
                                                  evidence

  Every invoice maps to   False assumption        Real accounting flows
  exactly one JE                                  can be 1:N or N:1

  Exceptions are noise    False assumption        Exceptions may reveal
                                                  hidden business rules

  LLM should read and     False                   Deterministic facts
  decide everything                               should remain
                                                  deterministic
  -----------------------------------------------------------------------

## 2.1 Most dangerous assumption

The most dangerous assumption is:

``` text
historical behavior = accounting truth
```

The correct relationship is:

``` text
Historical behavior
        ↓
Evidence of organizational behavior
        ↓
Candidate observation / hypothesis
        ↓
Validate against evidence, policy, context
        ↓
Potentially trusted knowledge
```

------------------------------------------------------------------------

# 3. Identify Facts

The system must distinguish what is directly recorded from what is
derived or inferred.

## 3.1 Layer A --- Raw Facts

Examples:

``` text
Invoice #INV-8821
Vendor = ABC Co.
Subtotal = 120,000
VAT = 8,400
Total = 128,400
Date = 2026-09-12
```

GL:

``` text
JE #123456
Account = 521204
Debit = 120,000
VAT Account = 117001
Credit = 128,400
```

These are source facts.

## 3.2 Layer B --- Derived Facts

Examples:

``` text
Invoice #INV-8821
        ↕
JE #123456
```

or:

``` text
Vendor ABC
→ 127 historical invoices
→ 119 matching postings to Account 521204
```

Derived facts must record how they were derived.

## 3.3 Layer C --- Inference

Example:

> "ABC cloud-service invoices usually use account 521204."

This is not a raw fact.

It is an inference from historical evidence.

``` text
127 historical records
        ↓
Observed distribution
        ↓
Inference
```

## 3.4 Layer D --- Policy / Decision

A statement such as:

> "Cloud service expenses must be posted to account X."

may originate from an accounting policy or an explicitly approved
organizational rule.

It must not be confused with historical frequency.

## 3.5 Canonical epistemic categories

The system should distinguish at least:

``` text
FACT
OBSERVATION
INFERENCE
POLICY
DECISION
```

------------------------------------------------------------------------

# 4. Decompose the Problem

At the most fundamental level, Phase 0 consists of six core
transformations:

``` text
1. INGEST
   Bring source data into the system.

2. NORMALIZE
   Convert different formats into a common representation.

3. LINK
   Connect Invoice ↔ Vendor ↔ JE ↔ Account ↔ Tax ↔ Period ↔ Document.

4. OBSERVE
   Identify historical behavior and distributions.

5. VALIDATE
   Determine whether a candidate pattern is sufficiently supported.

6. PUBLISH
   Make validated knowledge reusable by the Agent.
```

The key principle:

> **Do not begin with the LLM. Begin with the evidence model.**

------------------------------------------------------------------------

# 5. Challenge Causes

## 5.1 Is a Vector DB necessary?

No.

The real requirement is:

> Find evidence relevant to a specific decision.

Vector search is one possible implementation technique.

## 5.2 Is a Knowledge Graph necessary?

Not necessarily.

The real requirement is:

> Represent entities, relationships, and provenance well enough to
> answer accounting questions.

A relational model, graph model, or hybrid can satisfy this.

## 5.3 Must every document be interpreted by an LLM?

No.

Deterministic information should be extracted deterministically where
possible:

``` text
Amount
Date
VAT
Invoice number
Vendor ID
JE number
Account code
Debit
Credit
```

LLM reasoning is more appropriate for:

``` text
Semantic classification
Description interpretation
Ambiguous transaction meaning
Exception explanation
Pattern interpretation
Hypothesis generation
```

------------------------------------------------------------------------

# 6. Find Constraints

Accounting introduces constraints that generic RAG systems do not
adequately address.

## 6.1 Traceability

Every material knowledge claim must answer:

> Where did this come from?

Example:

``` text
Pattern:
Vendor ABC → Account 521204

Evidence:
119 matching invoices
127 total invoices

Period:
2025-01 → 2026-08

Exceptions:
8
```

## 6.2 Temporal context

Accounting knowledge is time-dependent.

A simple:

``` text
Vendor → Account
```

is insufficient.

The relevant context may be:

``` text
Vendor
+ Organization
+ Entity
+ Transaction Type
+ Accounting Period
+ Policy Version
+ Tax Context
```

## 6.3 Exceptions matter

If:

``` text
119 / 127 → Account 521204
8 / 127   → other treatments
```

the 8 exceptions must not automatically be treated as noise.

They may reveal:

-   another transaction type;
-   another entity;
-   a policy change;
-   a correction;
-   a tax difference;
-   a special business case;
-   an unknown condition.

## 6.4 False positives are expensive

An incorrect accounting recommendation can propagate:

``` text
Wrong account
   ↓
Wrong tax treatment
   ↓
Wrong posting
   ↓
Wrong reporting
   ↓
Potential tax / compliance impact
```

Therefore the objective is not:

> Maximize the amount of knowledge.

It is:

> **Maximize decision usefulness subject to evidence, policy, and risk
> constraints.**

------------------------------------------------------------------------

# 7. Rebuild from Basics

Do not build "one big Accounting KB."

Build distinct knowledge planes.

``` text
┌─────────────────────────────────────────┐
│          ACCOUNTING KNOWLEDGE            │
├─────────────────────────────────────────┤
│ FACTS                                   │
│ What source directly states             │
├─────────────────────────────────────────┤
│ OBSERVATIONS                            │
│ What historical data shows              │
├─────────────────────────────────────────┤
│ INFERENCES                              │
│ What the Agent concludes                │
├─────────────────────────────────────────┤
│ TRUSTED KNOWLEDGE                       │
│ What passed validation / authority      │
└─────────────────────────────────────────┘
```

This prevents:

``` text
Agent inference
      ↓
treated as fact
      ↓
retrieved later
      ↓
reinforced by another Agent inference
      ↓
false "institutional memory"
```

------------------------------------------------------------------------

# 8. Verify

Every knowledge claim that is intended to support an accounting decision
should be able to answer:

``` text
What?
  What exactly is being claimed?

Why?
  Why was this conclusion formed?

Evidence?
  Which source records support it?

Scope?
  Under what conditions does it apply?

Time?
  During what period is it valid?

Exceptions?
  What contradicts or limits the claim?

Confidence?
  How strong is the evidence?

Provenance?
  Can the claim be traced to source records?
```

A knowledge object should therefore contain both a conclusion and its
evidence.

------------------------------------------------------------------------

# 9. Compare Alternatives

## A --- RAG First

``` text
Documents
 → Chunk
 → Embeddings
 → Vector DB
 → LLM
```

Advantages:

-   Fast to prototype
-   Simple retrieval
-   Familiar technology

Disadvantages:

-   Weak accounting semantics
-   Weak provenance
-   Weak temporal reasoning
-   Weak contradiction handling
-   Weak exception modeling
-   High risk of treating text as truth

Verdict:

> Useful as a retrieval component, but insufficient as the accounting
> knowledge core.

## B --- Structured Accounting Intelligence

``` text
Raw Data
 → Normalize
 → Link
 → Aggregate
 → Pattern Discovery
 → Evidence
 → Knowledge
```

Advantages:

-   Deterministic foundation
-   Stronger explainability
-   Better auditability
-   Better statistical analysis
-   Better temporal modeling

Disadvantages:

-   Higher initial engineering cost
-   Requires explicit domain model

Verdict:

> Strong foundation.

## C --- Hybrid

``` text
Structured Knowledge
        +
Semantic Retrieval
        +
LLM Reasoning
        +
Human / Policy Validation
```

Recommended.

The responsibility split is:

``` text
Structured layer = truth substrate
Semantic layer   = retrieval
LLM              = reasoning
Policy           = constraints
Human            = authority
Audit            = accountability
```

------------------------------------------------------------------------

# 10. Residual Uncertainty

The system must explicitly represent what remains unknown.

Examples:

``` text
Historical postings may contain errors.
Historical policy may differ from current policy.
Historical source data may be incomplete.
An exception may be either a special case or an error.
The same vendor may have multiple accounting treatments.
Business semantics may be ambiguous.
```

Therefore knowledge should support states such as:

``` text
UNKNOWN
OBSERVED
INFERRED
VALIDATED
TRUSTED
CONFLICTED
STALE
```

Important distinction:

``` text
UNKNOWN ≠ FALSE
```

Lack of evidence is not evidence of a negative.

------------------------------------------------------------------------

# 11. Phase 0 Architecture

The complete conceptual pipeline is:

``` text
                    HISTORICAL SOURCES
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   General Ledger       Invoice          Accounting Book
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                    1. INGESTION
                           │
                           ▼
                    2. NORMALIZATION
                           │
                           ▼
                    3. ENTITY LINKING
                           │
                           ▼
                  4. EVIDENCE STORE
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
          Facts       Relationships   Transactions
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                 5. PATTERN DISCOVERY
                           │
                           ▼
                 6. KNOWLEDGE INFERENCE
                           │
                           ▼
                 7. KNOWLEDGE VALIDATION
                           │
                  ┌────────┴────────┐
                  │                 │
             Accepted            Conflict
                  │                 │
                  ▼                 ▼
          TRUSTED KNOWLEDGE    INVESTIGATION
                  │
                  └────────┬────────┘
                           ▼
                    8. KNOWLEDGE KB
                           │
                           ▼
                    PI ACCOUNTING
                    DECISION ENGINE
```

------------------------------------------------------------------------

# 12. Source Roles

The three primary historical sources answer different questions.

``` text
Invoice
→ What did the supplier/customer document say happened?

General Ledger
→ What did the organization actually record?

Accounting Book
→ How did the organization classify / present the accounting information?
```

No single source should automatically dominate all questions.

Knowledge emerges from their intersection.

``` text
               Invoice
                  │
             Transaction
               Meaning
                  │
          ┌───────┴────────┐
          │                │
         GL          Accounting Book
          │                │
          └───────┬────────┘
                  ▼
          Accounting Context
```

------------------------------------------------------------------------

# 13. Evidence Graph

Accounting evidence should be modeled as connected entities, not
isolated documents.

``` text
                Vendor
                  │
              Invoice
             /   │   \
            /    │    \
       Amount   VAT   Date
           │
           ▼
      Journal Entry
       /    │    \
      ▼     ▼     ▼
   Account  Tax  Cost Center
      │
      ▼
Accounting Book / Ledger
```

## 13.1 Core entities for MVP

Start with:

``` text
Vendor
Invoice
InvoiceLine
JournalEntry
JournalLine
Account
Tax
AccountingPeriod
Document
```

Do not build every possible accounting entity before evidence requires
it.

Potential later entities:

``` text
Organization
LegalEntity
Customer
Payment
TaxTransaction
CostCenter
AccountingPolicy
```

------------------------------------------------------------------------

# 14. Source Model

Source documents should be immutable.

``` text
SourceDocument
────────────────────────────
id
source_type
external_id
file_hash
source_uri
ingested_at
period
metadata
```

Example:

``` text
source_type = INVOICE
external_id = INV-8821
file_hash = ...
period = 2026-09
```

If the source changes:

> Create a new version rather than modifying the historical source
> silently.

This preserves provenance.

------------------------------------------------------------------------

# 15. Accounting Fact Model

## Invoice

``` text
Invoice
────────────────────────
id
source_id
vendor_id
invoice_number
invoice_date
currency
subtotal
vat_amount
total_amount
status
```

## InvoiceLine

``` text
InvoiceLine
────────────────────────
id
invoice_id
description
quantity
unit_price
net_amount
tax_code
```

## JournalEntry

``` text
JournalEntry
────────────────────────
id
source_id
entry_number
posting_date
period
description
```

## JournalLine

``` text
JournalLine
────────────────────────
id
journal_entry_id
account_id
debit
credit
tax_code
cost_center_id
```

## Account

``` text
Account
────────────────────────
id
code
name
account_type
```

These are structured facts. Pi should not invent or overwrite them.

------------------------------------------------------------------------

# 16. Relationship Model

Relationships themselves should be first-class evidence.

``` text
EvidenceLink
────────────────────────
id
from_entity
from_id
to_entity
to_id
relationship_type
method
confidence
evidence_refs[]
created_at
```

Example:

``` text
Invoice INV-8821
        │
        └── MATCHED_TO ──→ JE-19382

method:
exact-reference

confidence:
0.99

evidence:
invoice_number
vendor_id
amount
date
```

Another example:

``` text
Invoice INV-9001
        │
        └── POSSIBLY_MATCHED_TO ──→ JE-20018

method:
probabilistic

confidence:
0.73
```

Important:

``` text
Entity match confidence
≠
Accounting treatment confidence
```

------------------------------------------------------------------------

# 17. Entity Resolution

Historical data will frequently use inconsistent names.

Example:

``` text
Invoice:
Amazon Web Services (Thailand) Co., Ltd.

GL:
AMAZON WEB SERVICES TH
```

The system needs to resolve them to the same vendor entity.

Recommended resolution ladder:

``` text
Exact Match
   ↓
Normalized Match
   ↓
Identifier Match
   ↓
Historical Relationship
   ↓
Semantic Match
   ↓
LLM Arbitration
```

Example scoring:

``` text
Name similarity        0.82
Tax ID match            1.00
Bank account match      1.00
Historical link         0.97
Address match           0.76
```

A high-confidence identity match means:

> "These records probably refer to the same entity."

It does not mean:

> "We know the accounting treatment."

------------------------------------------------------------------------

# 18. Transaction Linking

The system must link:

``` text
Invoice
   │
   ├── Vendor
   ├── Invoice Lines
   ├── Tax
   └── Payment
          │
          ▼
      Journal Entry
          │
      ┌───┴────────┐
      ▼            ▼
   Expense        VAT
   Account       Account
```

Relationships must support:

``` text
1 Invoice → many Journal Entries
many Invoices → 1 Journal Entry
```

Do not hard-code:

``` text
1 Invoice = 1 JE
```

unless the actual accounting system proves that constraint.

------------------------------------------------------------------------

# 19. Evidence Object

Evidence is what the Agent is allowed to cite as support.

``` text
Evidence
────────────────────────
id
evidence_type
source_refs[]
entity_refs[]
fact_refs[]
observed_at
valid_from
valid_to
extraction_method
reliability
```

Example:

``` text
Evidence #E-10291

Type:
HISTORICAL_TRANSACTION

Entities:
Vendor ABC
Invoice INV-8821
Account 521204
JE-19382

Facts:
Invoice amount = 120,000
Posted account = 521204

Sources:
INV-8821.pdf
GL-2026-09.csv
```

Key principle:

> **Evidence is not an Agent opinion.**

------------------------------------------------------------------------

# 20. Pattern Discovery

Pattern discovery should begin with structured observation.

Example:

``` text
Vendor = AWS

Account distribution:

521204 → 119
521205 →   5
529999 →   3
```

The system can produce:

``` text
Most observed:
521204

Coverage:
119 / 127 = 93.7%

Exceptions:
8
```

This should initially become:

``` text
OBSERVATION
```

not automatically:

``` text
RULE
```

------------------------------------------------------------------------

# 21. Contextual Patterns

Avoid overly broad knowledge:

``` text
AWS → 521204
```

Prefer:

``` text
Vendor:
AWS

Transaction Type:
Cloud Subscription

Entity:
Company A

Account:
521204

Tax:
VAT 7%

Cost Center:
IT

Period:
2025-01 → 2026-08

Support:
119 / 127

Exceptions:
8
```

The general pattern is:

``` text
Context
+
Behavior
+
Evidence
```

not simply:

``` text
Entity → Value
```

------------------------------------------------------------------------

# 22. Exception Mining

Exceptions should be first-class data.

Given:

``` text
119 → Account 521204
8   → Other
```

the system should ask:

``` text
Why are the 8 different?
```

Potential explanations:

``` text
Different Invoice Type
Different Business Unit
Different Period
Different Tax Treatment
Manual Correction
Year-end Adjustment
Policy Change
Unknown
```

An exception can reveal a hidden rule.

Example:

``` text
AWS subscription
→ 521204

AWS one-time setup fee
→ 521205
```

Therefore:

> Exceptions are not automatically noise; they may be the most
> informative evidence in the dataset.

------------------------------------------------------------------------

# 23. LLM Boundary

The system should deliberately divide responsibilities.

``` text
             DETERMINISTIC
                  │
       ┌──────────┼──────────┐
       │          │          │
    Parsing    Matching   Aggregation
       │          │          │
       └──────────┼──────────┘
                  ▼
              Evidence
                  │
                  ▼
           PATTERN ENGINE
                  │
                  ▼
             ┌────┴────┐
             │         │
        Structured    LLM
         Analysis  Interpretation
             │         │
             └────┬────┘
                  ▼
             Knowledge
```

## LLM is appropriate for

``` text
"What does this invoice represent?"
"Are these descriptions semantically equivalent?"
"Why might these transactions differ?"
"Can this observed pattern be generalized?"
"What additional evidence would resolve this ambiguity?"
```

## LLM should not be the authority for

``` text
"What is the invoice amount?"
"What is the VAT amount?"
"What is the JE number?"
"What account code is recorded in this GL?"
"Which source document contains this value?"
```

When a source can answer deterministically, use the source.

------------------------------------------------------------------------

# 24. Knowledge Compiler

A useful conceptual component is a Knowledge Compiler.

``` text
Evidence
    ↓
Observations
    ↓
Hypotheses
    ↓
Validation
    ↓
Knowledge
```

Example:

``` text
Evidence:
127 invoices

Observation:
119 posted to 521204

Hypothesis:
AWS cloud subscription normally maps to 521204

Validation:
- Historical consistency ✓
- Entity consistency ✓
- Period consistency ✓
- Policy compatibility ✓
- Exceptions identified ✓

Result:
TRUSTED KNOWLEDGE
```

The "compiler" metaphor is deliberate:

> The Agent does not invent knowledge. It compiles evidence +
> observations + validation into a reusable knowledge object.

------------------------------------------------------------------------

# 25. Knowledge Object Model

A knowledge object should contain both the structured claim and its
epistemic metadata.

``` text
KnowledgeObject
────────────────────────────────
id
knowledge_type
claim

scope
conditions

status
confidence

support_count
contradiction_count

evidence_refs[]
derived_from_refs[]

valid_from
valid_to

created_at
validated_at
validated_by
```

Example:

``` text
K-00482

Type:
OBSERVED_ACCOUNTING_PATTERN

Claim:
ABC cloud-service invoices are usually
posted to account 521204.

Scope:
Vendor = ABC
TransactionType = CloudSubscription
Entity = CompanyA

Support:
119 / 127 transactions

Contradictions:
8

Status:
OBSERVED

Valid:
2025-01 → 2026-08

Evidence:
E-1001
E-1002
...
```

------------------------------------------------------------------------

# 26. Structured Knowledge Claim

Do not store knowledge only as natural language.

Weak:

``` text
"ABC usually uses account 521204."
```

Preferred:

``` text
Pattern
──────────────────────────
subject:
  Vendor: ABC

predicate:
  POST_TO_ACCOUNT

object:
  Account: 521204

conditions:
  TransactionType = CloudSubscription
  Entity = CompanyA

statistics:
  support = 119
  total = 127
  support_rate = 93.7%
```

The natural-language explanation should be a rendered view, not the
canonical representation.

Benefits:

-   Queryability
-   Contradiction detection
-   Statistical validation
-   Rule evaluation
-   Temporal filtering
-   Automation
-   Explainability

------------------------------------------------------------------------

# 27. Knowledge Lifecycle

Knowledge must be versioned.

Example:

``` text
K-00482 v1
OBSERVED

K-00482 v2
VALIDATED

K-00482 v3
TRUSTED

K-00482 v4
SUPERSEDED
```

Never silently overwrite historical knowledge.

Possible lifecycle:

``` text
RAW
 ↓
OBSERVED
 ↓
INFERRED
 ↓
VALIDATED
 ↓
TRUSTED
```

and:

``` text
TRUSTED
   ↓
STALE
   ↓
REVALIDATION
```

or:

``` text
VALIDATED
   ↓
CONFLICTED
   ↓
INVESTIGATION
```

------------------------------------------------------------------------

# 28. Contradiction Model

Knowledge conflicts must be explicit.

Example:

``` text
K1:
ABC cloud → 521204

K2:
ABC cloud → 521205
```

Create a conflict object:

``` text
KnowledgeConflict
────────────────────────
id
knowledge_a
knowledge_b
conflict_type
detected_at
resolution_status
resolution_evidence[]
```

The Agent should not silently select one.

It should surface:

``` text
CONFLICT

K1 support = 93.7%
K2 support = 4.0%

Possible explanation:
Different transaction type / period / entity
```

------------------------------------------------------------------------

# 29. Temporal Knowledge

Accounting knowledge must be time-aware.

Weak:

``` text
Vendor ABC → 521204
```

Better:

``` text
Vendor ABC
    │
    ├── 521204
    │     └── 2025-01 → 2026-06
    │
    └── 521205
          └── 2026-07 → present
```

The AP Agent should query by context:

``` text
FindKnowledge(
    entity = CompanyA,
    vendor = ABC,
    transaction_type = CloudSubscription,
    transaction_date = 2026-09-12
)
```

not:

``` text
FindKnowledge("ABC")
```

Temporal dimensions may include:

``` text
effective period
accounting period
policy version
knowledge validation date
source observation date
```

------------------------------------------------------------------------

# 30. Knowledge Quality Gate

Candidate knowledge should pass multiple gates.

``` text
                    Candidate Knowledge
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
          Evidence      Consistency    Scope
          Sufficient?     Check?       Clear?
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                       Freshness
                         Check
                           │
                           ▼
                    Contradiction
                       Check
                           │
                     ┌─────┴─────┐
                     ▼           ▼
                   TRUSTED     CONFLICTED
```

Suggested validation dimensions:

``` text
Evidence sufficiency
Entity consistency
Temporal consistency
Context consistency
Policy compatibility
Exception coverage
Contradiction detection
Freshness
Provenance completeness
```

------------------------------------------------------------------------

# 31. Pi's Role

Pi should not own the accounting facts.

Pi is the:

``` text
Reasoning + Orchestration + Explanation layer
```

Architecture:

``` text
              Pi Agent
                 │
        ┌────────┼────────┐
        │        │        │
     Retrieve  Reason   Explain
        │        │        │
        └────────┼────────┘
                 ▼
          Decision Candidate
                 │
                 ▼
             Validation
                 │
                 ▼
          Human / Policy
```

The responsibilities become:

``` text
Evidence Store
→ remembers what happened

Validators / Rules
→ check constraints

Pi
→ reasons over evidence and orchestrates work

Human
→ provides authority where automation is not sufficient
```

------------------------------------------------------------------------

# 32. Pi Query Contract

Pi should not have arbitrary direct database access.

Expose domain-level capabilities such as:

``` text
get_vendor_profile()

find_similar_transactions()

get_accounting_patterns()

get_relevant_evidence()

get_conflicting_knowledge()

validate_candidate_treatment()
```

Example response:

``` json
{
  "candidate": {
    "account": "521204",
    "tax_code": "VAT7"
  },
  "support": {
    "matching_transactions": 119,
    "total_transactions": 127
  },
  "status": "OBSERVED",
  "conflicts": 1,
  "evidence": [
    "E-1001",
    "E-1002"
  ]
}
```

Pi reasons over this structured result rather than hallucinating
directly from unstructured documents.

------------------------------------------------------------------------

# 33. AP Agent Flow After Phase 0

Once the historical knowledge layer exists:

``` text
New Invoice
     ↓
Entity Resolution
     ↓
Retrieve Relevant Knowledge
     ↓
Retrieve Relevant Evidence
     ↓
Generate Candidate Accounting Treatment
     ↓
Validate
     ↓
Risk / Policy Gate
     ↓
Human Approval
     ↓
Posting
     ↓
New Evidence
     ↓
Knowledge Re-evaluation
```

------------------------------------------------------------------------

# 34. Approval UI

Approval should not be implemented as generic task management.

The accountant is not primarily answering:

> "Which issue should I work on?"

They are answering:

> "Is this accounting treatment sufficiently supported to authorize the
> next action?"

Therefore the core UI should be an **Accounting Approval Workspace**.

Example:

``` text
┌─────────────────────────────────────────┐
│ ACCOUNTING RECOMMENDATION               │
│                                         │
│ Account       521204                    │
│ Tax           VAT 7%                    │
│                                         │
│ Historical evidence                     │
│ 119 / 127 transactions                  │
│                                         │
│ Status        OBSERVED                  │
│                                         │
│ ⚠ 8 exceptions found                    │
│                                         │
│ [View Evidence] [View Exceptions]       │
│                                         │
│ [Approve] [Change] [Reject]             │
└─────────────────────────────────────────┘
```

The UI should make evidence inspection and decision-making fast.

------------------------------------------------------------------------

# 35. Linear's Role

Linear should not become the accounting approval database.

Use a dedicated accounting approval state machine:

``` text
EXTRACTED
    ↓
VALIDATING
    ↓
READY_FOR_APPROVAL
    ↓
┌──────────────┬───────────────┐
│              │               │
APPROVED     REJECTED       NEEDS_FIX
│                              │
▼                              ▼
POSTED                    REVALIDATING
```

Linear can be an optional work orchestration integration for:

``` text
Exception
Investigation
Missing document
Vendor issue
Policy issue
Cross-team task
Engineering issue
```

Conceptually:

``` text
Accounting Ops Platform
│
├── Pi Agent Runtime
├── Accounting Workflow
├── Evidence / Validation
├── Approval UI
├── Audit / Knowledge Ledger
└── Linear Integration
```

Linear is a work-management layer, not the accounting source of truth.

------------------------------------------------------------------------

# 36. Human Decision as Evidence

When an accountant approves a candidate, do not merely mutate a status.

Create an immutable decision event:

``` text
HumanDecision
────────────────────────
decision
knowledge_refs[]
evidence_refs[]
actor
timestamp
reason
```

This becomes new evidence.

However:

``` text
Human approval
≠
Universal accounting rule
```

The decision is evidence that a human authorized a specific treatment in
a specific context.

------------------------------------------------------------------------

# 37. Knowledge Feedback Loop

The system should learn from operation without blindly self-reinforcing.

``` text
Evidence
   ↓
Knowledge
   ↓
Decision
   ↓
Human Decision
   ↓
New Evidence
   ↓
Re-evaluation
   ↓
Knowledge update
```

This produces institutional memory over time.

The critical safety property is:

> New knowledge must enter through the same evidence and validation
> gates rather than automatically becoming trusted knowledge.

------------------------------------------------------------------------

# 38. Phase 0 Output

The end product should not simply be:

``` text
kb/
```

containing markdown and embeddings.

It should produce four major artifacts:

## 38.1 Evidence Graph

> What happened?

## 38.2 Accounting Knowledge

> What have we learned?

## 38.3 Exceptions / Conflicts

> What remains unexplained or contradictory?

## 38.4 Provenance

> Where did every material conclusion come from?

------------------------------------------------------------------------

# 39. Phase 0 Success Criteria

Do not measure success primarily by:

``` text
Documents indexed
Embeddings created
Vector search latency
```

Those are infrastructure metrics.

Measure:

``` text
Traceability
Can claims trace to source evidence?

Coverage
How much relevant historical behavior is represented?

Consistency
Are contradictions detected?

Freshness
Can stale knowledge be identified?

Precision
Does retrieved knowledge actually apply?

Decision Utility
Does knowledge improve accounting classification / validation?

Human Effort
How much review time is reduced?

Exception Quality
Does the system identify meaningful exceptions?
```

The fundamental success test is:

> When a new invoice arrives, can Pi generate a defensible accounting
> hypothesis with evidence, scope, exceptions, and uncertainty --- and
> know when it should not trust its own hypothesis?

------------------------------------------------------------------------

# 40. Canonical Architecture

The architecture can now be summarized as:

``` text
                SOURCES
                   │
                   ▼
              INGESTION
                   │
                   ▼
            RAW / IMMUTABLE
                   │
                   ▼
              NORMALIZE
                   │
                   ▼
           ENTITY RESOLUTION
                   │
                   ▼
             EVIDENCE GRAPH
                   │
                   ▼
          PATTERN DISCOVERY
                   │
                   ▼
              HYPOTHESIS
                   │
                   ▼
             VALIDATION
              /         \
             /           \
          TRUSTED      CONFLICTED
             │             │
             │         INVESTIGATION
             │
             ▼
        KNOWLEDGE STORE
             │
             ▼
          PI AGENT
             │
             ▼
      ACCOUNTING DECISION
             │
             ▼
        HUMAN APPROVAL
             │
             ▼
        ACCOUNTING ACTION
             │
             ▼
        NEW ACCOUNTING
          EVIDENCE
             │
             └──────────→ KNOWLEDGE LOOP
```

------------------------------------------------------------------------

# 41. Technology Direction

Technology should follow the accounting model, not define it.

For the first implementation:

``` text
Pi
+
TypeScript / Bun
+
Structured database
+
Semantic index
+
Domain APIs
+
Accounting Approval UI
```

Rust should not be introduced merely because it is fast.

Introduce Rust later only if actual constraints justify it, such as:

``` text
High-concurrency infrastructure
Secure process isolation
Sandboxing
Resource enforcement
Deterministic low-level execution
Process supervision
```

The current Phase 0 bottleneck is more likely:

``` text
Semantic correctness
Evidence quality
Entity resolution
Provenance
Knowledge lifecycle
Accounting validation
```

not raw CPU performance.

------------------------------------------------------------------------

# 42. Fundamental Invariants

These should become architecture-level rules.

## Invariant 1

``` text
Historical Data ≠ Accounting Truth
```

Historical data is evidence until validated.

## Invariant 2

``` text
LLM Confidence ≠ Accounting Correctness
```

Model confidence cannot substitute for evidence or policy.

## Invariant 3

``` text
Retrieved Document ≠ Sufficient Evidence
```

Retrieval relevance must not be confused with decision sufficiency.

## Invariant 4

``` text
Unknown ≠ False
```

Missing evidence should not automatically become a negative conclusion.

## Invariant 5

``` text
Exception ≠ Noise
```

Exceptions must be investigated before being discarded.

## Invariant 6

``` text
Inference must never silently overwrite Source Fact
```

Source truth and Agent interpretation must remain separate.

## Invariant 7

``` text
Knowledge must have provenance
```

Every material claim must be traceable.

## Invariant 8

``` text
Knowledge is contextual and temporal
```

A rule without scope and time is potentially unsafe.

## Invariant 9

``` text
Human approval creates evidence, not universal truth
```

A human decision is contextual authorization.

## Invariant 10

``` text
New knowledge must pass validation
```

The feedback loop must not become self-reinforcing hallucination.

------------------------------------------------------------------------

# 43. First-Principles Final Synthesis

The entire architecture reduces to:

``` text
Problem
↓
We need reliable accounting decisions from historical organizational behavior.

Assumptions
↓
Historical behavior is not automatically truth.
RAG is not automatically knowledge.
LLM confidence is not accounting correctness.

Facts
↓
Invoices, GL, accounting books, transactions, relationships, and policies
are evidence with different roles.

Components
↓
Ingest
Normalize
Resolve
Link
Observe
Infer
Validate
Publish
Decide
Audit

Constraints
↓
Traceability
Temporal validity
Exceptions
Policy
Risk
Human accountability
Cost

Rebuild
↓
Evidence substrate
+
Structured knowledge
+
Semantic retrieval
+
LLM reasoning
+
Validation
+
Human authority

Verify
↓
Every material conclusion must expose evidence,
scope, temporal validity, contradictions, and uncertainty.

Residual uncertainty
↓
Unknown, stale, conflicted, incomplete, and ambiguous states remain explicit.
```

The resulting system is therefore not:

``` text
Pi + RAG + Accounting Documents
```

It is:

``` text
Pi
+
Accounting Evidence System
+
Knowledge Compiler
+
Decision / Policy Engine
+
Human Approval
+
Audit / Provenance
+
Continuous Evidence Loop
```

That is the architectural foundation for turning **Pi Agent → Agentic
Accounting Ops**.
