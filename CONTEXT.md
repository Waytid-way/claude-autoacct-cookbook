# AutoAcct Language

Ubiquitous language for the AutoAcct workspace: receipts become journal entries under accountant control. If a word isn't here, `docs/glossary.md` may define it — this file wins on conflicts.

## Language

**Client**:
A company whose books the firm keeps (e.g. "ลูกค้า A"). The unit a KB belongs to.
_Avoid_: Customer, account

**Accounting Behavior**:
The mapping decisions for a client — which receipt goes to which accounts under which rules. Not extraction accuracy.
_Avoid_: OCR behavior, "AI understands accounting"

**Knowledge Base (KB)**:
Versioned, client-specific tables (vendor map, VAT pattern, edge log) that constrain mapping. v1 is tables, not embeddings.
_Avoid_: RAG, model training, "AI knowledge"

**Join**:
The act of linking one receipt to its GL entries (one-to-many allowed). A join produces an Evidence Link; it is not knowledge by itself.
_Avoid_: Match (vague), auto-link

**Evidence Link**:
The record of one join: method (exact-reference, normalized, probabilistic), confidence, and the evidence used. Exact (confidence ≥0.95) is MATCHED_TO; below that is POSSIBLY_MATCHED_TO, never a pass.
_Avoid_: join result, match score

**Edge Log**:
Resolved accounting oddities for a client (what was weird, how it was booked). A lookup, not training data.
_Avoid_: Training set

**Entity Resolution**:
Deciding two differently-named records are the same entity (e.g. invoice says "ABC Co." but GL says "ABC TH"). Recorded as a resolution note on the Evidence Link, never by silent rename.
_Avoid_: name matching, dedup

**Negative Example**:
A receipt the gate rejected or an entry later corrected. What the gate must learn to catch; GL alone never contains these.
_Avoid_: Error log, failed OCR

**Conflict**:
Two trusted-looking claims that disagree (e.g. same vendor+type mapping to two accounts). Surfaced with both support counts, never silently picked.
_Avoid_: data error

**Evidence**:
Per-decision package (confidence, rule applied, model version, timestamp) proving why something passed. Thicker than an audit trace.
_Avoid_: Audit log (that's the trace, not the proof)

**Sufficient**:
Unresolved — K1 sets the join-coverage threshold before anyone may claim data is "enough". Do not use without a number.
_Avoid_: พอ, enough (bare)

**Trusted**:
Knowledge that passed validation gates plus human authority, with valid period and evidence refs. Anything below is OBSERVED or VALIDATED at best — never cited as truth.
_Avoid_: verified (vague), approved (that's a decision event, not knowledge state)
