# Skill Quality Guidelines

## Core Quality Principles

### 1. Context Window Efficiency

**Good:**
- Concise, essential instructions only
- Assumes Claude's intelligence
- Progressive disclosure (core in SKILL.md, details in references)

**Bad:**
- Over-explaining basic concepts
- Redundant information
- Everything in SKILL.md instead of references

**Example:**

❌ Bad:
```markdown
To use Python, you'll need to import libraries. Libraries are collections of pre-written code that provide functionality. The requests library, which is a popular HTTP library, allows you to make HTTP requests to APIs. You can install it using pip, which is Python's package manager...
```

✅ Good:
```markdown
Import required libraries and make API request using `scripts/api_call.py`.
```

### 2. Appropriate Freedom Levels

**High Freedom - Use text instructions:**
```markdown
Analyze the document and extract key themes. Consider:
- Recurring concepts
- Stakeholder priorities
- Action items

Organize findings by relevance.
```

**Medium Freedom - Use pseudocode/patterns:**
```markdown
Process workflow:
1. Load config from JSON
2. For each item in queue:
   - Validate format
   - Transform according to config
   - Store result
3. Generate summary report
```

**Low Freedom - Use specific scripts:**
```markdown
ALWAYS use this exact sequence:
1. Run: `scripts/validate_input.py input.json`
2. Run: `scripts/process.py --config config.json input.json`
3. Run: `scripts/verify_output.py output.json`

Do not modify the order or parameters.
```

### 3. Progressive Disclosure

**Metadata (always loaded):**
```yaml
name: api-client
description: REST API client for Acme Corp internal services. Use when user needs to query employee data, fetch department metrics, or access internal analytics. Handles authentication, rate limiting, and response parsing.
```

**SKILL.md body (loaded when triggered):**
```markdown
# Quick Start
Basic auth + request pattern

# Common Operations
[Essential workflows]

# Advanced
See references/advanced.md for:
- Custom endpoints
- Batch operations
- Error recovery
```

**References (loaded as needed):**
- `references/advanced.md` - Advanced features
- `references/schemas.md` - All API schemas
- `references/examples.md` - Complete examples

## Common Anti-Patterns

### Anti-Pattern 1: Over-Documentation

❌ **Bad:**
```
skill-name/
├── SKILL.md
├── README.md           ← Unnecessary
├── INSTALLATION.md     ← Unnecessary
├── QUICK_START.md      ← Should be in SKILL.md
├── CHANGELOG.md        ← Unnecessary
└── CONTRIBUTING.md     ← Unnecessary
```

✅ **Good:**
```
skill-name/
├── SKILL.md           ← All instructions here
├── scripts/
├── references/        ← Details here
└── assets/
```

### Anti-Pattern 2: Duplicated Content

❌ **Bad:**

SKILL.md:
```markdown
## Database Schema
Users table:
- id: primary key
- name: string
- email: unique string
- created_at: timestamp
...
[20 more tables]
```

references/schema.md:
```markdown
[Same schema repeated]
```

✅ **Good:**

SKILL.md:
```markdown
## Database Schema
See `references/schema.md` for complete table definitions.

Key relationships:
- Users have many Orders
- Orders belong to Users and Products
```

references/schema.md:
```markdown
[Complete detailed schema]
```

### Anti-Pattern 3: Unclear Triggers

❌ **Bad:**
```yaml
description: Helps with financial stuff
```

❌ **Bad:**
```yaml
description: Analyzes financial reports
```

✅ **Good:**
```yaml
description: Analyze financial reports (10-K, 10-Q, earnings) to calculate ratios, identify trends, and generate investment insights. Use when user asks to "analyze this financial report", "calculate financial ratios", "compare financial performance", or uploads financial documents for analysis.
```

### Anti-Pattern 4: Missing Scripts for Repeated Code

❌ **Bad:**
User asks to rotate PDFs three times, Claude writes rotation code each time.

✅ **Good:**
Create `scripts/rotate_pdf.py`, use it repeatedly.

**When to create scripts:**
- Same code written 2+ times
- Complex algorithms
- Fragile operations
- Performance-critical tasks

### Anti-Pattern 5: Monolithic SKILL.md

❌ **Bad:**
```markdown
# Skill Name
[800 lines covering everything in detail]
```

✅ **Good:**
```markdown
# Skill Name
[Core workflow - 200 lines]

## Advanced Features
See references/advanced.md

## API Reference
See references/api.md

## Examples
See references/examples.md
```

### Anti-Pattern 6: Vague Instructions

❌ **Bad:**
```markdown
Process the data appropriately and generate a good report.
```

✅ **Good:**
```markdown
Process data:
1. Validate schema (scripts/validate.py)
2. Calculate metrics (see references/metrics.md)
3. Generate report using template (assets/report-template.md)

Report must include:
- Executive summary (3-5 sentences)
- Key metrics table
- Trend analysis
- Recommendations (3-5 actionable items)
```

### Anti-Pattern 7: Ignoring User Expertise

❌ **Bad (explaining to expert):**
```markdown
Python is a programming language. To write a function, you use the 'def' keyword...
```

✅ **Good:**
```markdown
Implement data pipeline using pattern from references/pipeline.md
```

❌ **Bad (too technical for novice):**
```markdown
Implement OAuth 2.0 PKCE flow with S256 challenge method
```

✅ **Good:**
```markdown
Authenticate using script: `scripts/auth.py --user USERNAME`
```

### Anti-Pattern 8: Wrong Resource Type

❌ **Bad:**
Storing executable code in `references/` instead of `scripts/`

❌ **Bad:**
Storing templates in `references/` instead of `assets/`

❌ **Bad:**
Storing API docs in `scripts/` instead of `references/`

✅ **Good:**
- `scripts/` = Executable code
- `references/` = Documentation to load into context
- `assets/` = Files used in output (not loaded into context)

## Quality Checklist

Before finalizing any skill:

### Metadata Quality
- [ ] Name is descriptive and follows conventions
- [ ] Description includes WHAT the skill does
- [ ] Description includes WHEN to use it (all triggers)
- [ ] Description includes key capabilities
- [ ] Description is 2-4 sentences

### Structure Quality
- [ ] SKILL.md is under 500 lines
- [ ] No README.md or auxiliary docs
- [ ] Scripts are in `scripts/`
- [ ] Docs are in `references/`
- [ ] Templates are in `assets/`
- [ ] Directory structure is clean

### Content Quality
- [ ] Instructions are concise
- [ ] Examples are included where helpful
- [ ] Appropriate freedom level used
- [ ] Progressive disclosure applied
- [ ] No duplication between files
- [ ] Assumes Claude's intelligence

### Resource Quality
- [ ] All scripts are tested
- [ ] References are well-structured
- [ ] Assets are ready to use
- [ ] Resources are referenced from SKILL.md
- [ ] No unused files

### Usability Quality
- [ ] Clear workflow or process
- [ ] Concrete examples provided
- [ ] Error handling covered
- [ ] Validation steps included
- [ ] Success criteria defined

## Testing Guidelines

### Test Your Skill

**Manual testing:**
1. Use skill for 3-5 concrete examples
2. Note any friction points
3. Verify all scripts work
4. Check if references are helpful
5. Ensure assets are usable

**Common issues:**
- Missing information in SKILL.md
- Unclear instructions
- Broken script references
- Overly verbose documentation
- Missing error handling

**Iteration:**
1. Identify problem
2. Determine root cause
3. Fix in appropriate file
4. Test again
5. Validate and repackage

### Validation Checks

Run before packaging:
```bash
scripts/quick_validate.py /path/to/skill
```

Checks:
- YAML frontmatter format
- Required fields present
- Description quality
- File organization
- Resource references

### Package Only When Ready

Don't package until:
- All tests pass
- Scripts work correctly
- Documentation is complete
- No extraneous files
- Validation passes

## Skill Generation Maturity Model

### Level 1: Basic (Beginner)
- Creates SKILL.md with frontmatter
- Includes basic instructions
- No bundled resources
- Generic descriptions

### Level 2: Functional (Intermediate)
- Clear triggers in description
- Structured workflow in SKILL.md
- Some scripts or references
- Tested and working

### Level 3: Professional (Advanced)
- Comprehensive description with all triggers
- Concise, focused SKILL.md (<500 lines)
- Appropriate scripts/references/assets
- Progressive disclosure used
- All resources tested
- Ready for production

### Level 4: Exceptional (Expert)
- Optimal context efficiency
- Perfect freedom level matching
- Domain-specific patterns applied
- Self-improving through iteration
- Seamless user experience
- Validates and packages automatically

## Skill Forge Standards

All skills generated by Skill Forge should achieve **Level 3: Professional** minimum.

Strive for **Level 4: Exceptional** when:
- Complex domain (finance, legal, medical)
- Multi-framework support needed
- High-stakes use cases
- Frequent use expected
- User requests premium quality

## Common Skill Improvements

### Improvement 1: Split Large SKILL.md

**Before (650 lines):**
```markdown
# Skill Name
[All details in one file]
```

**After (250 lines SKILL.md + references):**
```markdown
# Skill Name
[Core workflow]

## Advanced
See references/advanced.md

## Examples
See references/examples.md

## API Reference
See references/api.md
```

### Improvement 2: Add Scripts for Repetition

**Before:**
Claude rewrites PDF rotation code on every use.

**After:**
```markdown
Rotate PDF:
```bash
scripts/rotate_pdf.py input.pdf --angle 90 --output rotated.pdf
```
```

### Improvement 3: Better Triggers

**Before:**
```yaml
description: Email helper
```

**After:**
```yaml
description: Draft and send professional emails following company templates. Use when user asks to "write an email", "draft a message", "send to [person]", or needs help with email communication. Supports thank you notes, meeting requests, follow-ups, and announcements.
```

### Improvement 4: Add Examples

**Before:**
```markdown
Process the document and generate output.
```

**After:**
```markdown
## Examples

**Input:** Q3 Financial Report (10-Q)
**Output:**
- Revenue growth: +15% YoY
- Profit margin: 22% (down from 25%)
- Key risk: Supply chain disruption
- Recommendation: Diversify suppliers

See references/examples.md for more.
```

### Improvement 5: Appropriate Freedom

**Before (too restrictive):**
```markdown
ALWAYS write exactly 3 paragraphs. First paragraph must be 4 sentences...
```

**After (appropriate):**
```markdown
Structure report as:
- Executive summary (2-4 sentences)
- Key findings (3-5 points)
- Recommendations (prioritized list)

Adjust length based on content complexity.
```

## Summary

High-quality skills:
- Are concise and context-efficient
- Use appropriate freedom levels
- Apply progressive disclosure
- Include tested resources
- Have clear triggers
- Avoid anti-patterns
- Meet Level 3+ standards

Always validate, test, and iterate before finalizing.
