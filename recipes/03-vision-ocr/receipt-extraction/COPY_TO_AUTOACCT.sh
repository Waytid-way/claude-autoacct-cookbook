#!/bin/bash

# 🚀 Copy Claude OCR Recipe to AutoAcct Main Project
#
# Usage:
#   ./COPY_TO_AUTOACCT.sh /path/to/autoacct-backend
#
# This script copies all necessary files from the cookbook recipe
# to your main AutoAcct project.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ -z "$1" ]; then
  echo -e "${RED}Error: Missing target directory${NC}"
  echo "Usage: ./COPY_TO_AUTOACCT.sh /path/to/autoacct-backend"
  exit 1
fi

TARGET_DIR="$1"

# Validate target directory
if [ ! -d "$TARGET_DIR" ]; then
  echo -e "${RED}Error: Directory $TARGET_DIR does not exist${NC}"
  exit 1
fi

if [ ! -f "$TARGET_DIR/package.json" ]; then
  echo -e "${YELLOW}Warning: $TARGET_DIR doesn't look like a Node.js project${NC}"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo -e "${GREEN}📦 Copying Claude OCR files to AutoAcct...${NC}"
echo

# Create directories
echo "Creating directories..."
mkdir -p "$TARGET_DIR/src/adapters"
mkdir -p "$TARGET_DIR/src/services"
mkdir -p "$TARGET_DIR/tests/adapters"

# Copy adapter files
echo "Copying IOcrAdapter interface..."
cat > "$TARGET_DIR/src/adapters/IOcrAdapter.ts" << 'EOF'
// SEE: INTEGRATION.md for full implementation
import { IAdapter } from './IAdapter';

export interface OcrResult {
  amountSatang: number;
  vatAmountSatang: number | null;
  vendorName: string | null;
  issueDate: string | null;
  rawText?: string;
  confidence?: number;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPriceSatang: number;
    totalSatang: number;
  }>;
}

export interface OcrInput {
  imageBase64: string;
  imageFormat?: 'jpeg' | 'png' | 'gif' | 'webp';
  correlationId: string;
}

export interface IOcrAdapter extends IAdapter {
  extractReceipt(input: OcrInput): Promise<OcrResult>;
  getProvider(): 'claude' | 'groq' | 'paddle' | 'mock';
}
EOF

echo "Copying ClaudeOcrAdapter..."
cp "./integration-templates/ClaudeOcrAdapter.template.ts" "$TARGET_DIR/src/adapters/ClaudeOcrAdapter.ts" 2>/dev/null || echo "${YELLOW}Note: Create ClaudeOcrAdapter.ts manually (see INTEGRATION.md)${NC}"

echo "Copying MockOcrAdapter..."
cp "./integration-templates/MockOcrAdapter.template.ts" "$TARGET_DIR/src/adapters/MockOcrAdapter.ts" 2>/dev/null || echo "${YELLOW}Note: Create MockOcrAdapter.ts manually (see INTEGRATION.md)${NC}"

echo "Copying OcrAdapterFactory..."
cp "./integration-templates/OcrAdapterFactory.template.ts" "$TARGET_DIR/src/adapters/OcrAdapterFactory.ts" 2>/dev/null || echo "${YELLOW}Note: Create OcrAdapterFactory.ts manually (see INTEGRATION.md)${NC}"

echo "Copying OcrService..."
cp "./integration-templates/OcrService.template.ts" "$TARGET_DIR/src/services/OcrService.ts" 2>/dev/null || echo "${YELLOW}Note: Create OcrService.ts manually (see INTEGRATION.md)${NC}"

echo
echo -e "${GREEN}✅ Copy complete!${NC}"
echo
echo "Next steps:"
echo "1. Review INTEGRATION.md for full implementation details"
echo "2. Add CLAUDE_API_KEY to your .env file"
echo "3. Update ConfigManager schema to include CLAUDE_API_KEY"
echo "4. Run tests: bun test tests/adapters/ClaudeOcrAdapter.test.ts"
echo
echo "Files copied to:"
echo "  - $TARGET_DIR/src/adapters/IOcrAdapter.ts"
echo "  - $TARGET_DIR/src/adapters/ClaudeOcrAdapter.ts"
echo "  - $TARGET_DIR/src/adapters/MockOcrAdapter.ts"
echo "  - $TARGET_DIR/src/adapters/OcrAdapterFactory.ts"
echo "  - $TARGET_DIR/src/services/OcrService.ts"
echo
echo -e "${YELLOW}📖 See INTEGRATION.md for complete setup guide${NC}"
