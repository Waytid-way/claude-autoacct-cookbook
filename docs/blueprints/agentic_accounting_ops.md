# Agentic Accounting Ops Architecture & Conceptual Blueprint

## บทนำ

แนวคิด Agentic Accounting Ops ที่เราวางไว้ เดิมทีไม่ใช่ “AI ทำบัญชีแทนนักบัญชี” แต่คือการสร้าง **ระบบปฏิบัติการสำหรับสำนักงานบัญชีแบบ Agentic** ที่รับผิดชอบงานซ้ำ ๆ ของลูกค้าหลายบริษัท ตั้งแต่รับข้อมูล → ตรวจ → ประมวลผล → ลงบัญชี → กระทบยอด → เตรียมภาษี → ส่งให้คนอนุมัติ โดยทุกขั้นต้องมีหลักฐานและจุดควบคุมที่ตรวจสอบย้อนกลับได้

---

## 1. จุดตั้งต้นของปัญหา

ถ้ามองสำนักงานบัญชีแบบดั้งเดิม จะมีรูปแบบประมาณนี้:

- ลูกค้าหลายบริษัท → ส่ง Invoice / Receipt / Bank Statement / Payroll / เอกสารอื่น ๆ
- → พนักงานบัญชีเปิดเอกสาร
- → คีย์ข้อมูล
- → ตรวจความถูกต้อง
- → จัดหมวดบัญชี
- → บันทึกเข้าระบบ
- → กระทบยอด
- → ขอข้อมูลเพิ่มเมื่อผิดปกติ
- → ปิดงวด
- → เตรียม VAT / WHT / ภาษีเงินได้นิติบุคคล
- → ทำรายงานให้ลูกค้า

ปัญหาไม่ได้อยู่ที่ “คำนวณบัญชีไม่ได้” แต่คือ **จำนวนงาน operational ที่มหาศาลและซ้ำกัน**

เช่น บริษัทลูกค้า 100 บริษัท ไม่ได้แปลว่าเรามีงาน 100 เท่าแบบตรง ๆ เพราะแต่ละบริษัทมี transaction เป็นร้อยเป็นพันรายการต่อเดือน และรูปแบบเอกสาร/กฎภายในต่างกัน

> **Bottleneck จริง ๆ:** Human attention ถูกใช้ไปกับงานที่มีรูปแบบซ้ำ แต่ต้องการความระมัดระวังสูง

---

## 2. เราไม่ได้สร้าง “Accounting Chatbot”

นี่เป็นความแตกต่างสำคัญมาก:

- **Chatbot:** “นี่คือ Invoice 123 ช่วยบอกหน่อยว่าควรลงบัญชีอะไร”
- **Agentic Accounting Ops:** “Invoice 123 เข้ามาแล้ว ตรวจ vendor → ตรวจ duplicate → ตรวจ VAT → ตรวจ WHT → ตรวจ policy ของลูกค้ารายนี้ → วิเคราะห์ account → เทียบกับ historical pattern → ตรวจ confidence → post ถ้าผ่าน policy → ขอ human review ถ้าไม่ผ่าน → เก็บ evidence ทั้งหมด”

> Agent ไม่ได้เป็นแค่ answer engine แต่เป็น **workflow execution + decision engine** ที่สามารถทำงานต่อเนื่องเป็น state ได้

---

## 3. เรามองระบบเป็น “Digital Accounting Workforce”

ภาพใหญ่คือสำนักงานบัญชีหนึ่งแห่งที่ดูแลลูกค้าจำนวนมาก:

```text
Accounting Ops Platform
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
     Client A           Client B           Client C
        │                  │                  │
   transactions       transactions       transactions
        │                  │                  │
        └──────────────────┴──────────────────┘
                           │
                    Agentic Workflow
                           │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
   Ingestion          Validation         Accounting
       │                  │                  │
   Reconciliation      Exceptions          Tax
       │                  │                  │
       └──────────────────┼──────────────────┘
                           │
                    Human Review
                           │
                     Final Output
```

กำลังสร้างแรงงานดิจิทัลสำหรับ Accounting Operations ไม่ใช่ AI ตัวเดียว แต่เป็นระบบที่ประกอบด้วย agent/workflow หลายส่วน

---

## 4. หน่วยสำคัญที่สุดคือ “Accounting Case”

แทนที่จะคิดว่า “Agent ทำ task” เรามองว่า **Transaction / Document คือ Case ที่ต้องถูกดำเนินการจนจบ**

```text
Case #INV-2026-001928
Input
  ├─ Invoice.pdf
  ├─ Vendor: ABC Co.
  └─ Purchase Order
↓
Extraction
↓
Validation
↓
Classification
↓
Tax Determination
↓
Duplicate Check
↓
Accounting Decision
↓
Policy Check
↓
Approval
↓
Posting
↓
Reconciliation
↓
Closed
```

ข้อดีคือระบบรู้สถานะชัดเจนว่า:

1. ตอนนี้ Case อยู่ตรงไหน
2. อะไรเป็นเหตุผลที่มันยังไปต่อไม่ได้

---

## 5. Agent ไม่ควรมีอิสระเต็มที่

หลักสำคัญสำหรับงานบัญชี: ห้ามให้ `LLM → ทำอะไรก็ได้`
แต่ต้องเป็น: `LLM → Propose → Evidence → Rules → Policy → Decision → Action`

```text
Evidence:
  Vendor history
  Historical transactions
  Invoice description
  PO
  Tax information

Confidence: 0.94
Policy: Office expense auto-post allowed = YES
Risk: LOW
Decision: AUTO_POST

หรือ:
Confidence: 0.61
Policy: Low-confidence classification requires review
Decision: HUMAN_REVIEW
```

> **หลักการ:** AI proposes; control system decides.

---

## 6. เราแบ่งงานเป็นหลาย Accounting Agents

ไม่จำเป็นต้องเป็น multi-agent แบบแฟนซีทั้งหมด แต่แบ่ง capability ออกเป็น:

1. **Intake Agent:** รับข้อมูลจาก Email, Upload, ERP, Bank, API, OCR, Integration แล้วทำ document normalization
2. **Document Intelligence Agent:** สกัดข้อมูล Invoice (Vendor, Invoice Number, Date, Amount, VAT, WHT, PO, Payment Terms) พร้อม confidence และ source location
3. **Validation Agent:** ตรวจ required fields, arithmetic, VAT, vendor, invoice duplication, document consistency, PO matching
4. **Accounting Classification Agent:** เสนอ Account, Cost Center, Project, Department, Tax Treatment จาก chart of accounts, historical transactions, client-specific rules, vendor patterns, business context
5. **Reconciliation Agent:** จับคู่ Bank Statement + Accounting Ledger -> Matching -> จัดกลุ่ม MATCHED, LIKELY_MATCH, UNKNOWN, CONFLICT
6. **Exception Agent:** จัดการเคสผิดปกติ (Invoice duplicate, VAT mismatch, Vendor เปลี่ยนเลขบัญชี, ยอดผิดปกติ, ไม่มี PO) เปลี่ยนจาก “ทำทุกอย่างเอง” เป็น “รู้ว่าอะไรไม่ควรทำเอง”
7. **Tax Agent:** เตรียมข้อมูล VAT, WHT, Corporate Tax, Tax reconciliation, supporting schedules โดยแยก Tax Rules + Client Configuration + Evidence + Calculation Engine (Agent เป็น orchestration/analysis layer ไม่แต่งกฎหมายเอง)

---

## 7. ลูกค้าแต่ละบริษัทต้องมี “Accounting Memory”

rule ของลูกค้าแต่ละรายไม่เหมือนกัน เช่น:

- Client A: Vendor ABC -> Office Supplies (VAT 7%, WHT none, Cost Center: Admin)
- Client B: Vendor ABC -> Project Expense (VAT 7%, WHT 3%, Cost Center: Project-X)

ระบบต้องผสาน:

`Global Accounting Knowledge + Client-specific Knowledge + Client-specific Policies + Historical Transactions + Current Evidence`

ตอบจาก organizational memory ไม่ใช่ model knowledge อย่างเดียว

---

## 8. ระบบ 2 ชั้นของ Knowledge

- **Global Knowledge:** สิ่งที่ใช้ร่วมกัน (Accounting principles, Tax concepts, Document schemas, Generic validation, Common workflows, Industry patterns)
- **Client Knowledge:** สิ่งเฉพาะบริษัท (Chart of Accounts, Accounting policies, Vendor mappings, Approval matrix, Tax treatment, Cost center rules, Historical behavior, Exceptions)

ทำให้ scale ลูกค้าใหม่ได้โดยไม่ต้อง train model ใหม่

---

## 9. เราจะไม่ทำ Auto-Posting ทุกอย่าง (Risk-Based Approach)

```text
Transaction
     │
     ▼
  Evaluate
     │
┌────┼────┐
▼    ▼    ▼
LOW MEDIUM HIGH
│    │    │
Auto-process Review Block/Escalate
```

- ยอด ฿1,250, Vendor เดิม, PO ตรง, VAT ตรง, ไม่ซ้ำ, Conf 0.98 -> **Auto-process**
- ยอด ฿2,800,000, New vendor, เปลี่ยนเลขบัญชี, ไม่มี PO, Conf 0.52 -> **Human review / Block**

---

## 10. Agentic Accounting Ops จริง ๆ คือ Control Loop

```text
OBSERVE → UNDERSTAND → VALIDATE → DECIDE → ACT → VERIFY → LEARN → RECONCILE → CLOSE
```

เมื่อเจอปัญหา:

```text
ACT → VERIFY → FAIL → INVESTIGATE → REPAIR → VERIFY AGAIN
```

Harness Engineering คุม Agent ส่วน Accounting Ops คือ domain ที่ Agent ต้องทำงาน

---

## 11. จุดที่สำคัญมาก: Evidence

ระบบต้องเก็บ:

```text
Decision: Office Expense
Evidence:
  ├─ Invoice description
  ├─ Vendor history
  ├─ PO #12392
  ├─ Previous 28 transactions
  └─ Client policy #EXP-04
Confidence: 0.94
Rule Applied: EXP-04
Agent: ClassificationAgent-v3
Timestamp: ...
Human Approval: ...
```

> สร้าง Explainability + Auditability + Reproducibility สำคัญกว่า “AI ตอบเก่ง”

---

## 12. จุดแข็งของ Agentic Approach จะเกิดตอน Exception

Traditional automation เก่งกับ `IF A THEN B` แต่งานบัญชีมีข้อยกเว้นซับซ้อนหลายชั้น Agent ใช้ reasoning วิเคราะห์ context ได้ เช่น ยอดสูงกว่าเฉลี่ย 4.3 เท่า ไม่มี PO ขัดแย้ง policy -> สั่ง `ACTION = REVIEW_REQUIRED, REASON = POLICY + ANOMALY`

---

## 13. แต่มันไม่ควรเป็น “LLM-centric Architecture”

```text
┌─────────────┐
│     LLM     │
└──────┬──────┘
       │
Reasoning Layer
       │
┌──────┼──────┐
│      │      │
Rules Evidence Policy
│      │      │
└──────┼──────┘
       │
Decision Engine
       │
Workflow Engine
       │
 Action Layer
```

Accounting ต้องการ deterministic controls รอบ ๆ probabilistic intelligence

---

## 14. สำนักงานบัญชีเปลี่ยนจาก “คนทำรายการ” เป็น “คนจัดการ Exceptions”

จากเดิม 1,000 transactions พนักงานต้องแตะ 1,000 รายการ
สู่ระบบใหม่: 800 auto-processed, 150 low-risk review, 40 exception, 10 critical
ย้ายเวลาจาก Data Entry ไปสู่ Decision / Review / Exception Management

---

## 15. Portfolio-level Operations

Dashboard รายงานสุขภาพ operations ทั้ง portfolio:

- Accounts Payable: 1,824 processed, 137 pending, 21 exceptions, 4 critical
- VAT: 18 clients ready, 3 clients missing data
- Reconciliation: Client A (99.2%), Client B (87.4% ⚠️), Client C (100%)

---

## 16. Learning Loop

`Agent Suggestion → Human Decision → Accepted / Corrected → Store Evidence → Update Client Memory`

เมื่อคนตรวจแก้ account code ระบบจะบันทึก Client Rule Learned เพื่อให้รอบต่อไป Agent ฉลาดขึ้น เกิด organizational learning

---

## 17. 7-Layer Architecture

```text
┌──────────────────────────────────────────────┐
│ 1. INPUT / INGESTION                         │
│ Email / ERP / Bank / Upload / API            │
├──────────────────────────────────────────────┤
│ 2. DOCUMENT & DATA INTELLIGENCE              │
│ OCR / Extraction / Normalization              │
├──────────────────────────────────────────────┤
│ 3. ACCOUNTING REASONING                      │
│ Classification / Matching / Tax Analysis      │
├──────────────────────────────────────────────┤
│ 4. CONTROL                                   │
│ Rules / Policy / Risk / Confidence            │
├──────────────────────────────────────────────┤
│ 5. WORKFLOW                                  │
│ Approval / Exception / Escalation             │
├──────────────────────────────────────────────┤
│ 6. ACCOUNTING EXECUTION                      │
│ Journal / Reconciliation / Closing             │
├──────────────────────────────────────────────┤
│ 7. MEMORY & AUDIT                            │
│ Evidence / History / Decisions / Learning     │
└──────────────────────────────────────────────┘
```

LLM/Agents อยู่ชั้น 2–4 เป็นหลัก และไม่ได้ควบคุมทั้งระบบโดยตรง

---

## 18. เริ่มจาก MVP: AP Invoice Processing

ไม่ควรสร้าง Agent ยักษ์ตัวเดียว ควรเริ่มจาก workflow ที่ volume สูง + repetitive + rules ชัด + มี human fallback:

`Email → Invoice extraction → Duplicate detection → Vendor ID → PO matching → VAT/WHT → Account suggestion → Policy check → Auto-post / Human Review → Evidence package`

---

## 19. การเชื่อมโยงกับ Agent Harness Pattern

| Agent Harness | Accounting Ops |
|---|---|
| Observation | Transaction / Document |
| Evidence | Invoice / PO / History |
| Agent Reasoning | Accounting Classification |
| Policy Gate | Accounting Policy |
| Risk | Financial / Tax Risk |
| Decision | Auto-process / Review / Block |
| Intervention | Human Approval |
| Recovery | Correct / Reprocess |
| Memory | Client Accounting Knowledge |
| Verification | Reconciliation / Audit |

Agentic Accounting Ops คือ domain จริงที่ทดสอบแนวคิด Agent Control Architecture ที่สมบูรณ์แบบ ทั้งเรื่อง uncertainty, evidence, risk, policy และ human-in-the-loop กลายเป็น Accounting Operations Control Plane ที่รองรับหลายบริษัทและขยายขีดความสามารถได้มหาศาล
