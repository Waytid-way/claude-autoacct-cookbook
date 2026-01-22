# Contributing to Claude-AutoAcct Cookbook

Thank you for your interest in contributing! 🎉

This cookbook is a **community-driven learning resource** for integrating Claude AI with the AutoAcct accounting system. We welcome contributions from developers, accountants, and anyone interested in AI-powered automation.

---

## 📋 Table of Contents

1. [Ways to Contribute](#ways-to-contribute)
2. [Getting Started](#getting-started)
3. [Contribution Guidelines](#contribution-guidelines)
4. [Recipe Structure](#recipe-structure)
5. [Code Standards](#code-standards)
6. [Pull Request Process](#pull-request-process)

---

## 🤝 Ways to Contribute

### 1. Add New Recipes
- New Claude API use cases
- Integration patterns
- Performance optimizations
- Cost-saving techniques

### 2. Improve Existing Recipes
- Fix bugs or errors
- Add better examples
- Improve explanations
- Update for new Claude API versions

### 3. Documentation
- Fill in TODO sections in `docs/autoacct-context.md`
- Add to the decision log
- Update the glossary
- Translate recipes to other languages

### 4. Testing & Quality
- Add test cases
- Report bugs
- Improve mock servers
- Performance benchmarks

### 5. Share Knowledge
- Write blog posts
- Create video tutorials
- Answer questions in issues
- Share your AutoAcct success stories

---

## 🚀 Getting Started

### 1. Fork the Repository

```bash
git clone https://github.com/YOUR_USERNAME/claude-autoacct-cookbook.git
cd claude-autoacct-cookbook
```

### 2. Set Up Your Environment

```bash
# Install dependencies (if using Node/Bun runtime)
bun install  # or npm install

# Copy environment template
cp .env.example .env

# Add your API keys (for testing PROD mode)
# DEV mode works without any keys!
```

### 3. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 4. Make Your Changes

Follow the [Recipe Structure](#recipe-structure) and [Code Standards](#code-standards) below.

### 5. Test Your Changes

```bash
# Run in DEV mode first (no API calls)
APP_MODE=DEV bun run test

# If you have API keys, test PROD mode
APP_MODE=PROD bun run test
```

### 6. Submit a Pull Request

See [Pull Request Process](#pull-request-process) below.

---

## 📐 Contribution Guidelines

### Before You Start

1. **Check existing issues** to avoid duplicate work
2. **Open an issue first** for major changes (new recipes, architectural changes)
3. **Read the AutoAcct context** in `docs/autoacct-context.md`
4. **Follow the existing style** of similar recipes

### General Principles

✅ **DO:**
- Keep recipes focused (one concept per recipe)
- Include both DEV and PROD mode examples
- Add inline comments explaining "why," not just "what"
- Test your code before submitting
- Update related documentation
- Use TypeScript for type safety

❌ **DON'T:**
- Commit API keys or credentials
- Add large binary files (use Git LFS if needed)
- Break existing recipes without discussion
- Use offensive or non-inclusive language
- Copy code without attribution

---

## 📝 Recipe Structure

Each recipe should follow this format:

### Folder Structure

```
recipes/XX-category/recipe-name/
├── README.md              # Explanation & learning notes
├── recipe.ipynb           # Jupyter notebook (if applicable)
├── code.ts                # TypeScript implementation
├── test.ts                # Unit tests
└── example-output.json    # Sample output
```

### README Template

```markdown
# Recipe: [Title]

> 📍 **AutoAcct Context:** [How this relates to AutoAcct]

## What & Why

### What
[What does this recipe demonstrate?]

### Why
[Why is this approach useful?]

### When to Use
[When should you use this pattern?]

## Business Context

**Input:** [What goes in]
**Output:** [What comes out]
**Constraints:** [Limitations or requirements]

## Implementation

### DEV Mode
[Mock implementation]

### PROD Mode
[Real implementation]

## Best Practices

✅ **DO:**
- [Recommendation 1]
- [Recommendation 2]

❌ **DON'T:**
- [Anti-pattern 1]
- [Anti-pattern 2]

## Trade-offs

| Aspect | Pros | Cons |
|--------|------|------|
| Cost | ... | ... |
| Speed | ... | ... |
| Accuracy | ... | ... |

## Code Example

[Full working code]

## Testing

[How to test this recipe]

## Related Recipes

- [Link to related recipe 1]
- [Link to related recipe 2]

## References

- [External docs]
- [Blog posts]
```

---

## 💻 Code Standards

### TypeScript Style

```typescript
// ✅ Good: Explicit types, clear naming
interface ReceiptOcrParams {
  correlationId: string;
  imageBase64: string;
}

export async function extractReceipt(
  params: ReceiptOcrParams
): Promise<ReceiptOcrResult> {
  // Implementation
}

// ❌ Bad: Implicit types, vague naming
async function doOcr(data: any) {
  // ...
}
```

### Error Handling

```typescript
// ✅ Good: Specific error types, context
try {
  const result = await claudeApi.call(params);
  return result;
} catch (error) {
  logger.error('Claude API failed', {
    correlationId: params.correlationId,
    error: (error as Error).message,
  });
  throw new ClaudeApiError('OCR failed', { cause: error });
}

// ❌ Bad: Silent failures, generic errors
try {
  return await api.call();
} catch (e) {
  return null;  // Silent failure!
}
```

### Dual Mode Pattern

```typescript
// ✅ Always support both modes
export function createClaudeAdapter(config: AppConfig): ClaudeAdapter {
  if (isDev(config)) {
    return new MockClaudeAdapter();
  }
  return new RealClaudeAdapter(config);
}

// ❌ Don't hardcode to one mode
export function createClaudeAdapter() {
  return new RealClaudeAdapter();  // Can't test!
}
```

### Testing

```typescript
// ✅ Test both modes
import { describe, test, expect } from 'bun:test';

describe('ClaudeAdapter', () => {
  test('DEV mode returns mock data', async () => {
    const config = { MODE: 'DEV' };
    const adapter = createClaudeAdapter(config);
    const result = await adapter.extractReceipt({...});
    
    expect(result.amountSatang).toBe(35000);  // Known mock value
  });
  
  test('PROD mode calls real API', async () => {
    // Only run if API key is set
    if (!process.env.CLAUDE_API_KEY) {
      test.skip();
    }
    
    const config = { MODE: 'PROD', CLAUDE_API_KEY: process.env.CLAUDE_API_KEY };
    const adapter = createClaudeAdapter(config);
    const result = await adapter.extractReceipt({...});
    
    expect(result.amountSatang).toBeGreaterThan(0);
  });
});
```

---

## 🔄 Pull Request Process

### 1. Before Submitting

- ✅ Code passes all tests
- ✅ No linting errors (`bun run lint`)
- ✅ Documentation is updated
- ✅ Commit messages are clear
- ✅ No API keys or secrets committed

### 2. PR Title Format

Use conventional commits:

```
feat: Add retry logic to Express adapter
fix: Correct VAT calculation in receipt parser
docs: Update glossary with Circuit Breaker definition
test: Add integration tests for Claude Vision
chore: Update dependencies
```

### 3. PR Description Template

```markdown
## Description
[Brief summary of changes]

## Motivation
[Why is this change needed?]

## Changes
- [ ] Added/Updated recipe: [name]
- [ ] Updated documentation
- [ ] Added tests
- [ ] Updated dependencies

## Testing
[How did you test this?]

## Screenshots (if applicable)
[Add screenshots of new features]

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass in DEV mode
- [ ] Tests pass in PROD mode (if applicable)
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### 4. Review Process

1. **Automated checks** run (tests, linting)
2. **Maintainer review** (usually within 48 hours)
3. **Address feedback** if requested
4. **Merge** once approved ✅

---

## 🎓 Learning Resources

### For Contributors

- [Claude API Documentation](https://docs.anthropic.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Bun Documentation](https://bun.sh/docs)
- [AutoAcct Context](./docs/autoacct-context.md)

### Similar Cookbooks

- [Anthropic Claude Cookbooks](https://github.com/anthropics/claude-cookbooks)
- [Groq API Cookbook](https://github.com/groq/groq-api-cookbook)
- [OpenAI Cookbook](https://github.com/openai/openai-cookbook)

---

## 📞 Getting Help

- **Questions:** Open a [GitHub Discussion](https://github.com/Waytid-way/claude-autoacct-cookbook/discussions)
- **Bugs:** Open an [Issue](https://github.com/Waytid-way/claude-autoacct-cookbook/issues)
- **Chat:** Join our [Discord](#) (if applicable)

---

## 🙏 Thank You!

Every contribution, no matter how small, helps make this cookbook better for everyone. We appreciate your time and effort!

---

*Happy cooking!* 🧑‍🍳