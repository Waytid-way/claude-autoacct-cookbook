# Glossary

> Domain-specific terminology used in AutoAcct and this cookbook.

---

## A

### Adapter Pattern
A software design pattern that wraps external services (APIs, databases) behind a common interface, allowing implementations to be swapped without changing business logic.

**Example:**
```typescript
interface ClaudeAdapter {
  extractReceipt(image): Promise<Receipt>;
}
// Can swap MockClaudeAdapter ↔ RealClaudeAdapter
```

### AutoAcct
The OCR-powered auto-accounting system that this cookbook supports. Converts receipt photos into accounting journal entries automatically.

---

## B

### Baht (฿)
Thai currency unit. 1 Baht = 100 Satang.

**Usage in AutoAcct:**
- User-facing amounts are displayed in Baht (e.g., "350.50 ฿")
- Internal storage uses Satang (35050)

---

## C

### Circuit Breaker
A reliability pattern that prevents cascading failures by "opening" (blocking requests) to a failing service after too many errors, then gradually "closing" (allowing requests) once the service recovers.

**States:**
- **Closed:** Normal operation
- **Open:** Blocking all requests (fast-fail)
- **Half-Open:** Testing if service recovered

### Claude
Anthropic's family of large language models. AutoAcct uses **Claude 3.5 Sonnet** for Vision OCR.

**Key capabilities:**
- Vision (image understanding)
- Tool use (function calling)
- JSON mode (structured output)

### Correlation ID
A unique identifier (e.g., `autoacct-1737556800-a3f2`) that tracks a single transaction through the entire pipeline.

**Purpose:**
- Debugging: "Where did this receipt fail?"
- Audit: "Show me all logs for this transaction"
- Observability: Trace across microservices

---

## D

### DEV Mode
Development mode where external APIs are replaced with mocks. Enables fast, free local development without real API keys.

**Controlled by:**
```bash
APP_MODE=DEV  # or PROD
```

### Dual Mode
Architectural pattern where every adapter supports both DEV (mock) and PROD (real) implementations, controlled by configuration.

---

## E

### Express Accounting
A Thai accounting software system that AutoAcct integrates with for exporting journal entries.

**API Endpoints:**
- POST `/journal-entries` - Create new entry
- GET `/accounts` - List chart of accounts

### Exponential Backoff
A retry strategy where wait time increases exponentially after each failure:
- 1st retry: wait 300ms
- 2nd retry: wait 600ms
- 3rd retry: wait 1200ms

---

## G

### Groq
AI inference platform known for fast LLM responses. AutoAcct uses Groq as a fallback OCR provider when Claude is unavailable or for cost-sensitive operations.

---

## J

### Journal Entry
Double-entry accounting record with at least two lines (one debit, one credit).

**Example:**
```
DR  5000-MEALS      350.50  (Expense)
CR  1000-CASH       350.50  (Asset)
```

---

## L

### Lego Architecture
Modular code organization where components are small, focused, and composable (like Lego blocks).

**Principles:**
- One file = one responsibility
- Small, reusable functions
- Clear interfaces between modules

---

## M

### Mock Server
A local server that mimics external API behavior for testing. AutoAcct includes mocks for Express API and Teable API.

**Location:** `./mock-servers/`

---

## O

### OCR (Optical Character Recognition)
Technology that extracts text from images. AutoAcct uses:
- **Claude Vision** (primary)
- **Groq** (fallback)
- **PaddleOCR** (self-hosted option)

---

## P

### PaddleOCR
Open-source OCR engine optimized for multilingual text (including Thai). Can be self-hosted for cost savings.

### PROD Mode
Production mode where adapters connect to real external APIs. Includes retry logic, error handling, and audit logging.

---

## R

### Receipt
A document (paper or digital) proving a transaction occurred. AutoAcct extracts:
- Total amount
- Vendor name
- Date
- VAT amount
- Line items

### Retry Logic
Automatically re-attempting failed operations (e.g., API calls) with exponential backoff and maximum retry limits.

---

## S

### Satang (สตางค์)
Smallest Thai currency unit. 100 Satang = 1 Baht.

**Why use Satang?**
- Avoid floating-point precision errors
- Match Thai banking standards
- Enable exact integer arithmetic

**Example:**
```typescript
// User input: 350.50 Baht
const satang = 35050;  // Stored internally
```

---

## T

### Teable
Open-source no-code database (like Airtable). AutoAcct optionally uses Teable for spreadsheet-like UI on top of MongoDB.

### Tool Use
Claude's ability to call external functions/APIs based on natural language instructions. Also called "Function Calling."

**Example:**
```
User: "Export this receipt to Express"
Claude: → Calls exportToExpress({...})
```

---

## V

### VAT (Value Added Tax / ภาษีมูลค่าเพิ่ม)
Thai tax on goods and services. Standard rate is **7%**.

**Calculation:**
```typescript
// From total (includes VAT)
const base = total / 1.07;
const vat = total - base;
```

### Vision API
Claude's capability to understand and analyze images. Used in AutoAcct for receipt OCR.

**Supported formats:**
- JPEG
- PNG
- GIF
- WebP

---

## Acronyms

| Acronym | Full Form | Meaning |
|---------|-----------|----------|
| API | Application Programming Interface | How software talks to software |
| CRUD | Create, Read, Update, Delete | Basic database operations |
| CSV | Comma-Separated Values | Simple data export format |
| DR | Debit | Left side of journal entry |
| CR | Credit | Right side of journal entry |
| ISO | International Organization for Standardization | Standards (e.g., ISO 8601 for dates) |
| JSON | JavaScript Object Notation | Data format |
| LLM | Large Language Model | AI models like Claude |
| OCR | Optical Character Recognition | Text extraction from images |
| REST | Representational State Transfer | API architectural style |
| SME | Small and Medium Enterprises | Small businesses |
| THB | Thai Baht | Currency code |
| VAT | Value Added Tax | Sales tax |

---

## Contributing to this Glossary

**Adding a new term:**

1. Place it in alphabetical order under the correct letter heading
2. Use this format:
   ```markdown
   ### Term Name
   Clear, concise definition in 1-2 sentences.
   
   **Example:** (if applicable)
   ```
3. Link to related recipes or documentation
4. Keep definitions non-technical where possible

---

*Last updated: 2026-01-22*