export class MockGroqAdapter {
  async parseReceiptText(rawText: string, correlationId: string) {
    // Simulate Groq parsing (lower confidence than Claude)
    await new Promise(r => setTimeout(r, 100)); // Faster than Claude
    
    return {
      amountSatang: 8560,
      currency: 'THB',
      vatAmountSatang: 560,
      vendorName: '7-Eleven Mock',
      issueDate: '2026-01-22',
      rawText,
      confidence: 0.88, // Lower than Claude (0.95)
    };
  }
}