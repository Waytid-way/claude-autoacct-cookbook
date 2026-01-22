# Example Receipt Image Placeholder

**This file should be replaced with an actual Thai receipt image.**

## How to add your own receipt:

1. Take a photo of a Thai receipt (or scan it)
2. Save as `example-receipt.jpg` in this folder
3. Delete this `.md` file

## What makes a good test receipt?

✅ **Good:**
- Printed text (not handwritten)
- Clear photo (well-lit, straight angle)
- Shows total amount clearly
- Shows VAT (7%) clearly
- Vendor name visible
- Date visible

❌ **Avoid:**
- Very faded thermal receipts
- Handwritten receipts (harder to OCR)
- Blurry or dark photos
- Receipts with sensitive information (use dummy receipts)

## Privacy Note

**Do NOT commit receipts with:**
- Credit card numbers
- Personal addresses
- Tax ID numbers
- Any PII (Personally Identifiable Information)

Use a sample/dummy receipt for testing only.

## Alternative: Use Mock Mode

If you don't have a receipt image, run in **DEV mode**:

```bash
APP_MODE=DEV bun run example.ts
```

This will use mock data without needing a real image.
