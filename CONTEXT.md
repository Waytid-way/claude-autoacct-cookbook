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
Linking one receipt to its GL entries (one-to-many allowed: a split receipt books to several entries sharing one document number). Exact join uses document number/date/amount; fuzzy join uses date+amount+vendor and needs accountant confirmation. KB v1 learns only from exact joins; aggregated entries stay out until matched line by line.
_Avoid_: Match (vague), auto-link

**Edge Log**:
Resolved accounting oddities for a client (what was weird, how it was booked). A lookup, not training data.
_Avoid_: Training set

**Negative Example**:
A receipt the gate rejected or an entry later corrected. What the gate must learn to catch; GL alone never contains these.
_Avoid_: Error log, failed OCR

**Evidence**:
Per-decision package (confidence, rule applied, model version, timestamp) proving why something passed. Thicker than an audit trace.
_Avoid_: Audit log (that's the trace, not the proof)

**Sufficient**:
Unresolved — K1 sets the join-coverage threshold before anyone may claim data is "enough". Do not use without a number.
_Avoid_: พอ, enough (bare)
