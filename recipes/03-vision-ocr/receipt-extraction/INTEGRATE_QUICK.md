# ⚡ Quick Integration: 5 Minutes

> เอา Claude OCR Recipe มาใช้ใน AutoAcct main project ใน 5 นาที

---

## Step 1: Copy Core Files (2 min)

```bash
# Clone cookbook (if not done)
git clone https://github.com/Waytid-way/claude-autoacct-cookbook.git

# Go to your AutoAcct backend
cd /path/to/autoacct-backend

# Create adapter directory
mkdir -p src/adapters
```

**Copy these 3 files manually:**

1. **IOcrAdapter.ts** → `src/adapters/IOcrAdapter.ts`
2. **ClaudeOcrAdapter.ts** → `src/adapters/ClaudeOcrAdapter.ts`  
3. **MockOcrAdapter.ts** → `src/adapters/MockOcrAdapter.ts`

ดูไฟล์เต็มใน [INTEGRATION.md](./INTEGRATION.md)

---

## Step 2: Add to ConfigManager (1 min)

**File:** `src/config/ConfigManager.ts`

```typescript
const configSchema = z.object({
  // ... existing ...
  
  CLAUDE_API_KEY: z.string().optional(),
  OCR_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.95),
});
```

---

## Step 3: Update .env (30 sec)

```bash
# Add to .env.local
CLAUDE_API_KEY=sk-ant-api03-xxxxx  # Get from console.anthropic.com
OCR_MIN_CONFIDENCE=0.95
```

---

## Step 4: Create Factory (1 min)

**File:** `src/adapters/OcrAdapterFactory.ts`

```typescript
import { IOcrAdapter } from './IOcrAdapter';
import { ClaudeOcrAdapter } from './ClaudeOcrAdapter';
import { MockOcrAdapter } from './MockOcrAdapter';
import ConfigManager from '../config/ConfigManager';

export class OcrAdapterFactory {
  static create(): IOcrAdapter {
    const mode = ConfigManager.get('APP_MODE');
    return mode === 'dev' ? new MockOcrAdapter() : new ClaudeOcrAdapter();
  }
}
```

---

## Step 5: Test (30 sec)

### DEV Mode (Mock)
```bash
APP_MODE=dev bun test src/adapters/MockOcrAdapter.ts
```

### PROD Mode (Real Claude)
```bash
CLAUDE_API_KEY=sk-xxx APP_MODE=prod bun test src/adapters/ClaudeOcrAdapter.ts
```

---

## 🎯 Usage in Your Code

```typescript
import { OcrAdapterFactory } from './adapters/OcrAdapterFactory';

const ocrAdapter = OcrAdapterFactory.create();

const result = await ocrAdapter.extractReceipt({
  imageBase64: imageData,
  correlationId: 'order-123',
});

console.log(`Amount: ฿${result.amountSatang / 100}`);
console.log(`VAT: ฿${result.vatAmountSatang! / 100}`);
```

---

## ✅ Done!

Claude OCR พร้อมใช้งานแล้ว! 🎉

**Next:** อ่าน [INTEGRATION.md](./INTEGRATION.md) สำหรับรายละเอียดแบบ advanced
