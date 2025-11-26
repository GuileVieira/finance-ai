# Skill Generation Templates

Quick-start templates for common skill types. Customize based on specific requirements.

## API Integration Skill Template

```markdown
---
name: api-name
description: [API name] integration for [key use cases]. Use when user needs to [trigger 1], [trigger 2], or [trigger 3]. Handles [functionality] with support for [features].
---

# [API Name] Integration

## Quick Start

Basic workflow:
1. Authenticate using credentials
2. Make API request
3. Process response
4. Handle errors

## Authentication

[Auth method - see scripts/auth.py or references/auth.md]

## Common Operations

### [Operation 1]
[Brief description]
Use: `scripts/operation1.py --param value`

### [Operation 2]
[Brief description]
See: `references/operation2.md` for details

## Response Handling

[How to process API responses]
Schema: See `references/schema.md`

## Error Handling

Common errors and solutions:
- [Error type]: [Solution]
- [Error type]: [Solution]

## Rate Limits

[Rate limit info and handling strategy]

## Examples

See `references/examples.md` for complete usage examples.
```

**Resources:**
- `scripts/auth.py` - Authentication wrapper
- `scripts/[operation].py` - For each major operation
- `references/schema.md` - API response schemas
- `references/examples.md` - Usage examples
- `references/endpoints.md` - Full endpoint documentation

---

## Document Processing Skill Template

```markdown
---
name: doc-processor
description: Process [document type] for [use cases]. Use when user needs to [trigger 1], [trigger 2], or [trigger 3]. Supports [features] with [format] output.
---

# [Document Type] Processing

## Workflow

1. Load document (scripts/load.py)
2. Extract data (scripts/extract.py)
3. Transform format (scripts/transform.py)
4. Validate output (scripts/validate.py)

## Loading Documents

```bash
python scripts/load.py input.pdf
```

Supports: [formats]

## Extraction

[What gets extracted and how]
See: `references/extraction-patterns.md`

## Transformation

[How data is transformed]
Templates: `assets/templates/`

## Validation

Quality checks:
- [Check 1]
- [Check 2]

Run: `scripts/validate.py output.json`

## Examples

**Input:** [Example input]
**Output:** [Example output]

See `references/examples.md` for more.
```

**Resources:**
- `scripts/load.py` - Document loader
- `scripts/extract.py` - Data extraction
- `scripts/transform.py` - Format transformation
- `scripts/validate.py` - Output validation
- `references/extraction-patterns.md` - Extraction rules
- `references/examples.md` - Input/output examples
- `assets/templates/` - Output templates

---

## Data Analysis Skill Template

```markdown
---
name: data-analyzer
description: Analyze [data type] to generate [insights]. Use when user needs to [trigger 1], [trigger 2], or [trigger 3]. Provides [analysis types] with [output format].
---

# [Data Type] Analysis

## Analysis Workflow

1. Load data sources
2. Clean and validate
3. Perform analysis
4. Generate insights
5. Create report

## Data Sources

Supported formats:
- [Format 1]: [Description]
- [Format 2]: [Description]

Loading: See `references/data-loading.md`

## Analysis Methods

### [Method 1]
[When to use]
[How it works]

### [Method 2]
[When to use]
[How it works]

Detailed methodology: `references/methods.md`

## Insight Generation

Framework for deriving insights:
1. [Step]
2. [Step]
3. [Step]

See: `references/insight-framework.md`

## Report Format

Output structure (see `assets/report-template.md`):
- Executive summary
- Key findings
- Detailed analysis
- Recommendations

## Examples

See `references/examples.md` for complete analyses.
```

**Resources:**
- `references/data-loading.md` - Data source setup
- `references/methods.md` - Analysis methodologies
- `references/insight-framework.md` - Insight generation guide
- `references/examples.md` - Sample analyses
- `assets/report-template.md` - Output template

---

## Domain Expertise Skill Template

```markdown
---
name: domain-expert
description: [Domain] expertise for [use cases]. Use when user needs [trigger 1], [trigger 2], or [trigger 3]. Provides [capabilities] following [standards/frameworks].
---

# [Domain] Expertise

## Domain Overview

[Brief context about the domain]

## Core Capabilities

1. [Capability 1]: [Description]
2. [Capability 2]: [Description]
3. [Capability 3]: [Description]

## Workflows by Task Type

### [Task Type 1]
**When:** [Trigger conditions]
**Process:**
1. [Step]
2. [Step]
3. [Step]

Details: `references/[task-type-1].md`

### [Task Type 2]
**When:** [Trigger conditions]
**Process:**
1. [Step]
2. [Step]
3. [Step]

Details: `references/[task-type-2].md`

## Frameworks & Standards

[Key frameworks used in this domain]
See: `references/frameworks.md`

## Terminology

See: `references/terminology.md`

## Templates

Common output templates:
- `assets/template1.md`
- `assets/template2.md`

## Quality Standards

[What defines good output in this domain]
Checklist: `references/quality-checklist.md`

## Examples

See `references/examples.md` for domain-specific examples.
```

**Resources:**
- `references/[task-type].md` - For each major task type
- `references/frameworks.md` - Domain frameworks
- `references/terminology.md` - Domain vocabulary
- `references/quality-checklist.md` - Quality standards
- `references/examples.md` - Domain examples
- `assets/[template].md` - Output templates

---

## Content Creation Skill Template

```markdown
---
name: content-creator
description: Create [content type] for [audience]. Use when user needs [trigger 1], [trigger 2], or [trigger 3]. Follows [brand/style] guidelines with [tone].
---

# [Content Type] Creation

## Content Workflow

1. Understand requirements
2. Research topic (if needed)
3. Generate outline
4. Write content
5. Review against guidelines

## Brand Guidelines

Voice & tone: See `references/brand-voice.md`
Style rules: See `references/style-guide.md`

## Content Structure

Template structure (see `assets/template.md`):
[Structure description]

## Research Process

When research is needed:
1. [Research step]
2. [Research step]

Sources: `references/research-sources.md`

## Writing Process

1. **Opening:** [Guidance]
2. **Body:** [Guidance]
3. **Closing:** [Guidance]

## Quality Checklist

Before finalizing:
- [ ] [Quality criteria]
- [ ] [Quality criteria]
- [ ] [Quality criteria]

See: `references/quality-standards.md`

## Examples

Good examples: `references/examples.md`

Bad examples (avoid): `references/anti-examples.md`
```

**Resources:**
- `references/brand-voice.md` - Voice & tone guidelines
- `references/style-guide.md` - Writing style rules
- `references/research-sources.md` - Research guidelines
- `references/quality-standards.md` - Quality criteria
- `references/examples.md` - Good examples
- `references/anti-examples.md` - What to avoid
- `assets/template.md` - Content template

---

## Multi-Step Workflow Skill Template

```markdown
---
name: workflow-executor
description: Execute [workflow name] for [use case]. Use when user needs [trigger 1], [trigger 2], or [trigger 3]. Automates [process] with [steps].
---

# [Workflow Name]

## Workflow Overview

Complete process:
1. [High-level step 1]
2. [High-level step 2]
3. [High-level step 3]
4. [High-level step 4]

## Step-by-Step Execution

### Step 1: [Name]
**Purpose:** [Why this step]
**Actions:**
1. [Action]
2. [Action]

**Script:** `scripts/step1.py`
**Validation:** [How to verify success]

### Step 2: [Name]
**Purpose:** [Why this step]
**Actions:**
1. [Action]
2. [Action]

**Script:** `scripts/step2.py`
**Validation:** [How to verify success]

### Step 3: [Name]
[Continue pattern]

## Checkpoints

After each step, verify:
- [Checkpoint criteria]

## Error Recovery

If step fails:
1. [Recovery action]
2. [Recovery action]

## Output

Final output format: `assets/output-template.md`

## Examples

End-to-end example: `references/walkthrough.md`
```

**Resources:**
- `scripts/step[N].py` - For each workflow step
- `references/walkthrough.md` - Complete example
- `references/troubleshooting.md` - Error solutions
- `assets/output-template.md` - Final output format

---

## Usage Notes

**Selecting a template:**
1. Match user request to template category
2. Customize template sections based on specific needs
3. Add/remove sections as appropriate
4. Generate all referenced resources

**Template adaptation:**
- Templates are starting points, not constraints
- Combine elements from multiple templates if needed
- Add domain-specific sections
- Remove irrelevant sections

**Resource generation:**
- Create ALL resources referenced in template
- Test scripts before including
- Ensure references are comprehensive
- Validate assets are ready to use
